'use client';

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createScheduledTask,
  getUserTasks,
  updateTaskStatusAction,
  updateTaskAction,
  deleteTaskAction,
  testTaskAction,
} from '@/app/actions';

interface Task {
  id: string;
  title: string;
  prompt: string;
  frequency: string;
  timezone: string;
  nextRunAt: Date;
  status: 'active' | 'paused' | 'archived' | 'running';
  lastRunAt?: Date | null;
  lastRunChatId?: string | null;
  createdAt: Date;
  cronSchedule?: string;
}

// Query key factory
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: string) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

// Custom hook for tasks
export function useTasks() {
  const queryClient = useQueryClient();

  // Track previous tasks state to detect completion
  const previousTasksRef = React.useRef<Task[]>([]);

  // Track if create mutation was actually triggered by user
  const isActualCreateRef = React.useRef<boolean>(false);

  // Track recent completions to prevent duplicate toasts
  const recentCompletionsRef = React.useRef<Set<string>>(new Set());

  // Query for fetching tasks
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: taskKeys.lists(),
    queryFn: async () => {
      const result = await getUserTasks();
      if (result.success) {
        return (result.tasks || []) as Task[];
      }
      throw new Error(result.error || 'Failed to load tasks');
    },
    staleTime: 1000 * 2, // Consider data fresh for 2 seconds
    refetchInterval: 1000 * 5, // Refetch every 5 seconds for real-time updates
    refetchIntervalInBackground: false, // Don't poll when tab is not focused
    gcTime: 1000 * 30, // Keep in cache for 30 seconds
    networkMode: 'always', // Always try to refetch
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true, // Always refetch when component mounts
    retry: (failureCount, error) => {
      // Retry up to 3 times with exponential backoff
      if (failureCount < 3) return true;
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Enable query deduplication for performance
    structuralSharing: true,

    // Prevent unnecessary re-renders
    notifyOnChangeProps: ['data', 'error', 'isLoading'],
  });

  // Detect task completions and show appropriate toast
  React.useEffect(() => {
    if (!tasks.length || !previousTasksRef.current.length) {
      previousTasksRef.current = tasks;
      return;
    }

    // Check for tasks that transitioned from 'running' to 'active' or 'paused'
    const completedTasks = tasks.filter((current) => {
      const previous = previousTasksRef.current.find((prev) => prev.id === current.id);
      const completionKey = `${current.id}-${current.lastRunAt?.getTime()}`;

      return (
        previous?.status === 'running' &&
        (current.status === 'active' || current.status === 'paused') &&
        current.lastRunAt !== previous.lastRunAt && // Ensure it's a new completion
        !recentCompletionsRef.current.has(completionKey) // Prevent duplicate toasts
      );
    });

    // Show completion toast for each completed task with debouncing
    completedTasks.forEach((task) => {
      const completionKey = `${task.id}-${task.lastRunAt?.getTime()}`;
      recentCompletionsRef.current.add(completionKey);

      const statusText = task.frequency === 'once' ? 'completed' : 'run finished';
      toast.success(`Task "${task.title}" ${statusText} successfully!`);

      // Clear completion key after 30 seconds to allow future notifications
      setTimeout(() => {
        recentCompletionsRef.current.delete(completionKey);
      }, 30000);
    });

    previousTasksRef.current = tasks;
  }, [tasks]);

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: async (params: {
      title: string;
      prompt: string;
      frequency: 'once' | 'daily' | 'weekly' | 'monthly';
      time: string;
      timezone: string;
      date?: string;
      onSuccess?: () => void;
    }) => {
      const { onSuccess: successCallback, ...mutationParams } = params;
      const result = await createScheduledTask(mutationParams);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create task');
      }
      return { result, onSuccess: successCallback };
    },
    onSuccess: (data) => {
      // Only show create toast for actual user-initiated creation
      if (isActualCreateRef.current) {
        toast.success('Task created successfully!');
        isActualCreateRef.current = false; // Reset flag
      }
      // Immediate cache invalidation for real-time updates
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
      if (data.onSuccess) {
        data.onSuccess();
      }
    },
    onError: (error: Error) => {
      isActualCreateRef.current = false; // Reset flag on error
      toast.error(error.message);
    },
  });

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (params: { id: string; status: 'active' | 'paused' | 'archived' | 'running' }) => {
      const result = await updateTaskStatusAction(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task');
      }
      return { ...params, result };
    },
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.lists());

      // Optimistically update
      queryClient.setQueryData<Task[]>(taskKeys.lists(), (old = []) =>
        old.map((task) => (task.id === id ? { ...task, status } : task)),
      );

      return { previousTasks };
    },
    onSuccess: (data) => {
      const statusText =
        data.status === 'active'
          ? 'activated'
          : data.status === 'paused'
            ? 'paused'
            : data.status === 'archived'
              ? 'archived'
              : 'updated';
      toast.success(`Task ${statusText}`);
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.lists(), context.previousTasks);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      // Always refetch after error or success for real-time updates
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
  });

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      title: string;
      prompt: string;
      frequency: 'once' | 'daily' | 'weekly' | 'monthly';
      time: string;
      timezone: string;
      onSuccess?: () => void;
    }) => {
      const { onSuccess: successCallback, ...mutationParams } = params;
      const result = await updateTaskAction(mutationParams);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task');
      }
      return { result, onSuccess: successCallback };
    },
    onSuccess: (data) => {
      toast.success('Task updated successfully!');
      // Immediate cache invalidation and refetch for real-time updates
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
      if (data.onSuccess) {
        data.onSuccess();
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: async (params: { id: string }) => {
      const result = await deleteTaskAction(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete task');
      }
      return params;
    },
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.lists());

      // Optimistically update
      queryClient.setQueryData<Task[]>(taskKeys.lists(), (old = []) =>
        old.filter((task) => task.id !== id),
      );

      return { previousTasks };
    },
    onSuccess: () => {
      toast.success('Task deleted successfully');
      // Force immediate refetch after delete
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.lists(), context.previousTasks);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      // Always refetch after error or success for real-time updates
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
  });

  // Test task mutation
  const testMutation = useMutation({
    mutationFn: async (params: { id: string }) => {
      const result = await testTaskAction(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to test task');
      }
      return params;
    },
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.lists());

      // Optimistically update to 'running' status
      queryClient.setQueryData<Task[]>(taskKeys.lists(), (old = []) =>
        old.map((task) => (task.id === id ? { ...task, status: 'running' as const } : task)),
      );

      return { previousTasks };
    },
    onSuccess: () => {
      toast.success("Test run started - you'll be notified when complete!");
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.lists(), context.previousTasks);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      // Always refetch after error or success to get real status
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
  });

  // Manual refresh function for immediate updates
  const manualRefresh = async () => {
    // Cancel any in-flight queries first
    await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
    // Invalidate and refetch with fresh data
    await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    return queryClient.refetchQueries({
      queryKey: taskKeys.lists(),
      type: 'active', // Only refetch active queries
    });
  };

  // Optimized cache invalidation for running tasks
  React.useEffect(() => {
    const hasRunningTasks = tasks.some((task) => task.status === 'running');

    if (!hasRunningTasks) return;

    const interval = setInterval(() => {
      // Only invalidate if there are still running tasks
      const currentRunning = tasks.some((task) => task.status === 'running');
      if (currentRunning) {
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      }
    }, 3000); // Check every 3 seconds when there are running tasks

    return () => clearInterval(interval);
  }, [tasks, queryClient]);

  return {
    // Data
    tasks,
    isLoading,
    error,

    // Actions
    refetch,
    manualRefresh,

    // Metadata
    lastUpdated: dataUpdatedAt,
    createTask: (params: any) => {
      isActualCreateRef.current = true; // Mark as actual create
      createMutation.mutate(params);
    },
    updateStatus: updateStatusMutation.mutate,
    updateTask: updateMutation.mutate,
    deleteTask: deleteMutation.mutate,
    testTask: testMutation.mutate,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTesting: testMutation.isPending,

    // For backwards compatibility with existing optimistic update patterns
    isPending:
      createMutation.isPending ||
      updateStatusMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      testMutation.isPending,
  };
}

// Helper hook for filtered tasks
export function useFilteredTasks(filter: 'active' | 'archived' | 'all' = 'all') {
  const { tasks, ...rest } = useTasks();

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active')
      return task.status === 'active' || task.status === 'paused' || task.status === 'running';
    if (filter === 'archived') return task.status === 'archived';
    return true;
  });

  return {
    tasks: filteredTasks,
    ...rest,
  };
}