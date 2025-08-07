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
import { useCurrentOrganization } from './use-organization';

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

const STALE_TIME_MS = 2000;
const REFETCH_INTERVAL_MS = 5000;
const CACHE_TIME_MS = 30000;
const MAX_RETRY_COUNT = 3;
const COMPLETION_CLEANUP_DELAY_MS = 30000;
const RUNNING_TASK_CHECK_INTERVAL_MS = 3000;

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: string) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  withOrganization: (organizationId: string | null) => [...taskKeys.all, 'org', organizationId] as const,
};

function createTaskCompletionKey(taskId: string, lastRunAt?: Date | null): string {
  return `${taskId}-${lastRunAt?.getTime()}`;
}

function isTaskCompleted(currentTask: Task, previousTask: Task | undefined): boolean {
  if (!previousTask) return false;
  
  const wasRunning = previousTask.status === 'running';
  const isNowStopped = currentTask.status === 'active' || currentTask.status === 'paused';
  const hasNewRunTime = currentTask.lastRunAt !== previousTask.lastRunAt;
  
  return wasRunning && isNowStopped && hasNewRunTime;
}

function getTaskStatusMessage(task: Task): string {
  return task.frequency === 'once' ? 'completed' : 'run finished';
}

function getStatusDisplayText(status: string): string {
  switch (status) {
    case 'active': return 'activated';
    case 'paused': return 'paused';
    case 'archived': return 'archived';
    default: return 'updated';
  }
}

export function useTasks() {
  const queryClient = useQueryClient();
  const { organization } = useCurrentOrganization();
  const organizationId = organization?.id || null;

  const previousTasksRef = React.useRef<Task[]>([]);
  const isActualCreateRef = React.useRef<boolean>(false);
  const recentCompletionsRef = React.useRef<Set<string>>(new Set());

  const {
    data: tasks = [],
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: taskKeys.withOrganization(organizationId),
    queryFn: async () => {
      const result = await getUserTasks(organizationId);
      if (result.success) {
        return (result.tasks || []) as Task[];
      }
      throw new Error(result.error || 'Failed to load tasks');
    },
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    gcTime: CACHE_TIME_MS,
    networkMode: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      return failureCount < MAX_RETRY_COUNT;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    structuralSharing: true,
    notifyOnChangeProps: ['data', 'error', 'isLoading'],
  });

  React.useEffect(() => {
    if (!tasks.length || !previousTasksRef.current.length) {
      previousTasksRef.current = tasks;
      return;
    }

    const completedTasks = tasks.filter((current) => {
      const previous = previousTasksRef.current.find((prev) => prev.id === current.id);
      const completionKey = createTaskCompletionKey(current.id, current.lastRunAt);

      return (
        isTaskCompleted(current, previous) &&
        !recentCompletionsRef.current.has(completionKey)
      );
    });

    completedTasks.forEach((task) => {
      const completionKey = createTaskCompletionKey(task.id, task.lastRunAt);
      recentCompletionsRef.current.add(completionKey);

      const statusText = getTaskStatusMessage(task);
      toast.success(`Task "${task.title}" ${statusText} successfully!`);

      setTimeout(() => {
        recentCompletionsRef.current.delete(completionKey);
      }, COMPLETION_CLEANUP_DELAY_MS);
    });

    previousTasksRef.current = tasks;
  }, [tasks]);

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
      if (isActualCreateRef.current) {
        toast.success('Task created successfully!');
        isActualCreateRef.current = false;
      }
      queryClient.invalidateQueries({ queryKey: taskKeys.withOrganization(organizationId) });
      queryClient.refetchQueries({ queryKey: taskKeys.withOrganization(organizationId) });
      if (data.onSuccess) {
        data.onSuccess();
      }
    },
    onError: (error: Error) => {
      isActualCreateRef.current = false;
      toast.error(error.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (params: { id: string; status: 'active' | 'paused' | 'archived' | 'running' }) => {
      const result = await updateTaskStatusAction(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task');
      }
      return { ...params, result };
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.withOrganization(organizationId) });

      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.withOrganization(organizationId));

      queryClient.setQueryData<Task[]>(taskKeys.withOrganization(organizationId), (old = []) =>
        old.map((task) => (task.id === id ? { ...task, status } : task)),
      );

      return { previousTasks };
    },
    onSuccess: (data) => {
      const statusText = getStatusDisplayText(data.status);
      toast.success(`Task ${statusText}`);
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.withOrganization(organizationId), context.previousTasks);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.withOrganization(organizationId) });
      queryClient.refetchQueries({ queryKey: taskKeys.withOrganization(organizationId) });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: taskKeys.withOrganization(organizationId) });
      queryClient.refetchQueries({ queryKey: taskKeys.withOrganization(organizationId) });
      if (data.onSuccess) {
        data.onSuccess();
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (params: { id: string }) => {
      const result = await deleteTaskAction(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete task');
      }
      return params;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.withOrganization(organizationId) });

      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.withOrganization(organizationId));

      queryClient.setQueryData<Task[]>(taskKeys.withOrganization(organizationId), (old = []) => 
        old.filter((task) => task.id !== id)
      );

      return { previousTasks };
    },
    onSuccess: () => {
      toast.success('Task deleted successfully');
      queryClient.refetchQueries({ queryKey: taskKeys.withOrganization(organizationId) });
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.withOrganization(organizationId), context.previousTasks);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.withOrganization(organizationId) });
      queryClient.refetchQueries({ queryKey: taskKeys.withOrganization(organizationId) });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (params: { id: string }) => {
      const result = await testTaskAction(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to test task');
      }
      return params;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.withOrganization(organizationId) });

      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.withOrganization(organizationId));

      queryClient.setQueryData<Task[]>(taskKeys.withOrganization(organizationId), (old = []) =>
        old.map((task) => (task.id === id ? { ...task, status: 'running' as const } : task)),
      );

      return { previousTasks };
    },
    onSuccess: () => {
      toast.success("Test run started - you'll be notified when complete!");
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.withOrganization(organizationId), context.previousTasks);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.withOrganization(organizationId) });
      queryClient.refetchQueries({ queryKey: taskKeys.withOrganization(organizationId) });
    },
  });

  const manualRefresh = async () => {
    await queryClient.cancelQueries({ queryKey: taskKeys.withOrganization(organizationId) });
    await queryClient.invalidateQueries({ queryKey: taskKeys.withOrganization(organizationId) });
    return queryClient.refetchQueries({
      queryKey: taskKeys.withOrganization(organizationId),
      type: 'active',
    });
  };

  React.useEffect(() => {
    const hasRunningTasks = tasks.some((task) => task.status === 'running');

    if (!hasRunningTasks) return;

    const interval = setInterval(() => {
      const currentRunning = tasks.some((task) => task.status === 'running');
      if (currentRunning) {
        queryClient.invalidateQueries({ queryKey: taskKeys.withOrganization(organizationId) });
      }
    }, RUNNING_TASK_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [tasks, queryClient, organizationId]);

  return {
    tasks,
    isLoading,
    error,

    refetch,
    manualRefresh,

    lastUpdated: dataUpdatedAt,
    createTask: (params: any) => {
      isActualCreateRef.current = true;
      createMutation.mutate(params);
    },
    updateStatus: updateStatusMutation.mutate,
    updateTask: updateMutation.mutate,
    deleteTask: deleteMutation.mutate,
    testTask: testMutation.mutate,

    isCreating: createMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTesting: testMutation.isPending,

    isPending:
      createMutation.isPending ||
      updateStatusMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      testMutation.isPending,
  };
}

export function useFilteredTasks(filter: 'active' | 'archived' | 'all' = 'all') {
  const { tasks, ...rest } = useTasks();

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return task.status === 'active' || task.status === 'paused' || task.status === 'running';
    if (filter === 'archived') return task.status === 'archived';
    return true;
  });

  return {
    tasks: filteredTasks,
    ...rest,
  };
}