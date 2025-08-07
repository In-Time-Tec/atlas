'use client';

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon, BinocularsIcon, RefreshIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useUserData } from '@/hooks/use-user-data';
import { useTasks } from '@/hooks/use-tasks';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { TaskDetailsSidebar } from './components/task-details-sidebar';
import { toast } from 'sonner';

import { LoadingSkeletons } from './components/loading-skeleton';
import { NoActiveTasksEmpty, NoArchivedTasksEmpty } from './components/empty-state';
import { TotalLimitWarning, DailyLimitWarning } from './components/warning-card';
import { TaskCard } from './components/task-card';
import { ProUpgradeScreen } from './components/pro-upgrade-screen';
import { TaskForm } from './components/task-form';
import { useTaskForm } from './hooks/use-task-form';
import { getRandomExamples, TASK_LIMITS, timezoneOptions } from './constants';
import { formatFrequency } from './utils/time-utils';

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

export default function TaskPage() {
  const [activeTab, setActiveTab] = React.useState('active');

  const [randomExamples, setRandomExamples] = React.useState(() => getRandomExamples(3));
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [taskToDelete, setTaskToDelete] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const { user, subscriptionData, isProUser, isLoading: isProStatusLoading } = useUserData();
  const router = useRouter();
  const {
    tasks: allTasks,
    isLoading,
    error,
    createTask,
    updateStatus,
    updateTask,
    deleteTask,
    testTask,
    manualRefresh,
    isPending: isMutating,
  } = useTasks();
  const [detectedTimezone, setDetectedTimezone] = React.useState<string>('UTC');

  React.useEffect(() => {
    try {
      const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('🌍 Detected system timezone:', systemTimezone);

      const matchingOption = timezoneOptions.find((option) => option.value === systemTimezone);
      console.log('📍 Found matching option:', matchingOption);

      if (matchingOption) {
        console.log('✅ Using exact match:', systemTimezone);
        setDetectedTimezone(systemTimezone);
      } else {
        let fallbackTimezone = 'UTC';

        if (systemTimezone.includes('America/')) {
          if (
            systemTimezone.includes('New_York') ||
            systemTimezone.includes('Montreal') ||
            systemTimezone.includes('Toronto')
          ) {
            fallbackTimezone = 'America/New_York';
          } else if (systemTimezone.includes('Chicago') || systemTimezone.includes('Winnipeg')) {
            fallbackTimezone = 'America/Chicago';
          } else if (systemTimezone.includes('Denver') || systemTimezone.includes('Edmonton')) {
            fallbackTimezone = 'America/Denver';
          } else if (systemTimezone.includes('Los_Angeles') || systemTimezone.includes('Vancouver')) {
            fallbackTimezone = 'America/Los_Angeles';
          }
        } else if (systemTimezone.includes('Europe/')) {
          if (systemTimezone.includes('London')) {
            fallbackTimezone = 'Europe/London';
          } else if (
            systemTimezone.includes('Paris') ||
            systemTimezone.includes('Berlin') ||
            systemTimezone.includes('Rome')
          ) {
            fallbackTimezone = 'Europe/Paris';
          }
        } else if (systemTimezone.includes('Asia/')) {
          if (systemTimezone.includes('Tokyo')) {
            fallbackTimezone = 'Asia/Tokyo';
          } else if (systemTimezone.includes('Shanghai') || systemTimezone.includes('Beijing')) {
            fallbackTimezone = 'Asia/Shanghai';
          } else if (systemTimezone.includes('Singapore')) {
            fallbackTimezone = 'Asia/Singapore';
          } else if (systemTimezone.includes('Kolkata') || systemTimezone.includes('Mumbai')) {
            fallbackTimezone = 'Asia/Kolkata';
          }
        } else if (systemTimezone.includes('Australia/')) {
          if (systemTimezone.includes('Sydney') || systemTimezone.includes('Melbourne')) {
            fallbackTimezone = 'Australia/Sydney';
          } else if (systemTimezone.includes('Perth')) {
            fallbackTimezone = 'Australia/Perth';
          }
        }

        console.log('🔄 Using fallback timezone:', fallbackTimezone);
        setDetectedTimezone(fallbackTimezone);
      }
    } catch {
      console.log('❌ Timezone detection failed, using UTC');
      setDetectedTimezone('UTC');
    }
  }, []);
  const formHook = useTaskForm(detectedTimezone);
  React.useEffect(() => {
    if (!isProStatusLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, isProStatusLoading, router]);
  React.useEffect(() => {
    if (error) {
      toast.error('Failed to load tasks');
    }
  }, [error]);
  const activeDailyTasks = allTasks.filter((t: Task) => t.frequency === 'daily' && t.status === 'active').length;
  const totalTasks = allTasks.filter((t: Task) => t.status !== 'archived').length;
  const canCreateMore = totalTasks < TASK_LIMITS.TOTAL_TASKS;
  const canCreateDailyMore = activeDailyTasks < TASK_LIMITS.DAILY_TASKS;
  const filteredTasks = allTasks.filter((task: Task) => {
    if (activeTab === 'active')
      return task.status === 'active' || task.status === 'paused' || task.status === 'running';
    if (activeTab === 'archived') return task.status === 'archived';
    return true;
  });
  const handleStatusChange = async (id: string, status: 'active' | 'paused' | 'archived' | 'running') => {
    updateStatus({ id, status });
  };

  const handleDelete = (id: string) => {
    setTaskToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleTest = (id: string) => {
    testTask({ id });
  };

  const handleManualRefresh = async () => {
    await manualRefresh();
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteTask({ id: taskToDelete });
      setTaskToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleOpenTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setIsSidebarOpen(true);
  };

  const handleEditTask = (task: Task) => {
    formHook.populateFormForEdit(task);
    setIsSidebarOpen(false);
  };

  const handleTaskChange = (newTask: Task) => {
    setSelectedTask(newTask);
  };
  if (isProStatusLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full">
          <PageHeader
            title="Tasks"
            user={user}
            subscriptionData={subscriptionData}
            isProUser={isProUser}
            isProStatusLoading={isProStatusLoading}
            showOrganizationContext={false}
          />
          <div className="flex-1 flex flex-col justify-center py-8">
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
              <LoadingSkeletons count={3} />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }
  // Tasks are no longer gated behind Pro. Always render the Tasks UI for authenticated users.

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-full">
        <PageHeader
          title="Tasks"
          user={user}
          subscriptionData={subscriptionData}
          isProUser={isProUser}
          isProStatusLoading={isProStatusLoading}
        />

        {selectedTask && (
          <>
            <div
              className={`fixed inset-0 z-40 transition-all duration-300 ease-out ${
                isSidebarOpen
                  ? 'bg-black/20 backdrop-blur-sm opacity-100'
                  : 'bg-black/0 backdrop-blur-0 opacity-0 pointer-events-none'
              }`}
              onClick={() => setIsSidebarOpen(false)}
            />

            <div
              className={`fixed right-0 top-0 h-screen max-w-xl w-full bg-background border-l z-50 shadow-xl transform transition-all duration-500 ease-out ${
                isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <TaskDetailsSidebar
                task={selectedTask as any}
                allTasks={allTasks as any}
                isOpen={isSidebarOpen}
                onOpenChange={setIsSidebarOpen}
                onTaskChange={handleTaskChange as any}
                onEditTask={handleEditTask as any}
                onTest={handleTest}
              />
            </div>
          </>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-muted">
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualRefresh}
                  disabled={isMutating}
                  title="Refresh tasks"
                >
                  <HugeiconsIcon
                    icon={RefreshIcon}
                    size={16}
                    color="currentColor"
                    strokeWidth={1.5}
                    className={isMutating ? 'animate-spin' : ''}
                  />
                </Button>
                <Dialog open={formHook.isCreateDialogOpen} onOpenChange={formHook.handleDialogOpenChange}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={!canCreateMore}>
                      <HugeiconsIcon
                        icon={PlusSignIcon}
                        size={16}
                        color="currentColor"
                        strokeWidth={1.5}
                        className="mr-1"
                      />
                      Add new
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-4">
                      <DialogTitle className="text-lg">
                        {formHook.editingTask ? 'Edit Task' : 'Create New Task'}
                      </DialogTitle>
                    </DialogHeader>

                    <TaskForm
                      formHook={formHook}
                      isMutating={isMutating}
                      activeDailyTasks={activeDailyTasks}
                      totalTasks={totalTasks}
                      canCreateMore={canCreateMore}
                      canCreateDailyMore={canCreateDailyMore}
                      createTask={createTask}
                      updateTask={updateTask}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {!canCreateMore && <TotalLimitWarning />}
            {canCreateMore && !canCreateDailyMore && <DailyLimitWarning />}

            <Tabs value={activeTab} defaultValue="active" className="space-y-6">
              <TabsContent value="active" className="space-y-6">
                {isLoading ? (
                  <LoadingSkeletons count={3} />
                ) : filteredTasks.length === 0 ? (
                  <NoActiveTasksEmpty />
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isMutating={isMutating}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onTest={handleTest}
                        onOpenDetails={handleOpenTaskDetails}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="archived">
                {isLoading ? (
                  <LoadingSkeletons count={2} showActions={false} />
                ) : filteredTasks.length === 0 ? (
                  <NoArchivedTasksEmpty />
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isMutating={isMutating}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onTest={handleTest}
                        onOpenDetails={handleOpenTaskDetails}
                        showActions={false}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-12">
              <h2 className="text-lg font-semibold mb-4">Example Tasks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-hidden">
                {randomExamples.map((example, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer transition-all duration-200 group !pb-0 !mb-0 max-h-96 h-full border hover:border-primary/30 shadow-none"
                    onClick={() => formHook.handleUseExample(example)}
                  >
                    <CardHeader>
                      <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">
                        {example.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="bg-accent/50 border !-mb-1 border-accent rounded-t-lg mx-3 p-4 grow h-28 group-hover:bg-accent/70 group-hover:border-primary/20 transition-all duration-200">
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {example.prompt.slice(0, 100)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFrequency(example.frequency, example.time)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this task? This action cannot be undone and will permanently remove all
                run history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
