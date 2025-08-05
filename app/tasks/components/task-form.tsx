'use client';

import React from 'react';
import { format } from 'date-fns';
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar01Icon, AlarmClockIcon } from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ProgressRing } from '@/components/ui/progress-ring';
import { cn } from '@/lib/utils';
import { TimezoneSelector } from './timezone-selector';
import { TimePicker } from './time-picker';
import { frequencyOptions, dayOfWeekOptions, TASK_LIMITS } from '../constants';
import { TaskFormHookReturn } from '../hooks/use-task-form';

interface TaskFormProps {
  formHook: TaskFormHookReturn;
  isMutating: boolean;
  activeDailyTasks: number;
  totalTasks: number;
  canCreateMore: boolean;
  canCreateDailyMore: boolean;
  createTask: any;
  updateTask: any;
}

export function TaskForm({
  formHook,
  isMutating,
  activeDailyTasks,
  totalTasks,
  canCreateMore,
  canCreateDailyMore,
  createTask,
  updateTask,
}: TaskFormProps) {
  const {
    selectedFrequency,
    selectedTime,
    selectedTimezone,
    selectedDate,
    selectedDayOfWeek,
    selectedExample,
    editingTask,
    setSelectedFrequency,
    setSelectedTime,
    setSelectedTimezone,
    setSelectedDate,
    setSelectedDayOfWeek,
    createTaskFromForm,
    updateTaskFromForm,
  } = formHook;

  const handleSubmit = (formData: FormData) => {
    if (editingTask) {
      updateTaskFromForm(formData, updateTask);
    } else {
      createTaskFromForm(formData, createTask);
    }
  };

  const isSubmitDisabled =
    isMutating ||
    (!editingTask && selectedFrequency === 'daily' && !canCreateDailyMore) ||
    (!editingTask && !canCreateMore);

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <Input
          name="title"
          placeholder="Enter task name"
          className="h-9"
          defaultValue={editingTask?.title || selectedExample?.title || ''}
          required
        />
      </div>

      {/* Frequency Selection */}
      <div className="flex items-start gap-4">
        <Label className="text-sm font-medium pt-2 w-20 flex-shrink-0">Frequency</Label>
        <div className="flex-1">
          <div className="grid grid-cols-4 gap-1">
            {frequencyOptions.map((option) => (
              <div key={option.value} className="relative">
                <input
                  type="radio"
                  id={`frequency-${option.value}`}
                  name="frequency"
                  value={option.value}
                  checked={selectedFrequency === option.value}
                  onChange={(e) => setSelectedFrequency(e.target.value)}
                  className="sr-only peer"
                />
                <label
                  htmlFor={`frequency-${option.value}`}
                  className="block text-center py-2 px-2 text-xs rounded-md border cursor-pointer peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary transition-colors hover:bg-accent hover:peer-checked:bg-primary/90"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scheduling Section */}
      <div className="space-y-4">
        {/* On/Time/Date row */}
        <div className="flex items-start gap-4">
          <Label className="text-sm font-medium pt-2 w-20 flex-shrink-0">On</Label>
          <div className="flex-1">
            <div className="flex gap-3">
              {/* Time Picker */}
              <div className="flex-1">
                <TimePicker
                  name="time"
                  value={selectedTime}
                  onChange={setSelectedTime}
                  selectedDate={selectedFrequency === 'once' ? selectedDate : undefined}
                  filterPastTimes={selectedFrequency === 'once'}
                />
              </div>

              {/* Date selection for 'once' frequency */}
              {selectedFrequency === 'once' && (
                <div className="flex-1">
                  <input type="hidden" name="date" value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''} />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn('w-full text-left font-normal h-9', !selectedDate && 'text-muted-foreground')}
                      >
                        {selectedDate ? format(selectedDate, 'MMM d, yyyy') : <span>Pick date</span>}
                        <HugeiconsIcon
                          icon={Calendar01Icon}
                          size={12}
                          color="currentColor"
                          strokeWidth={1.5}
                          className="ml-auto opacity-50"
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        autoFocus
                        className="rounded-md"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Day selection for 'weekly' frequency */}
              {selectedFrequency === 'weekly' && (
                <div className="flex-1">
                  <input type="hidden" name="dayOfWeek" value={selectedDayOfWeek} />
                  <Select value={selectedDayOfWeek} onValueChange={setSelectedDayOfWeek}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOfWeekOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timezone row */}
        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium w-20 flex-shrink-0">Timezone</Label>
          <div className="flex-1">
            <TimezoneSelector value={selectedTimezone} onChange={setSelectedTimezone} />
          </div>
        </div>

        {/* Single hidden input for timezone form submission */}
        <input type="hidden" name="timezone" value={selectedTimezone} />
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-4">
        <Label className="text-sm font-medium pt-2 w-20 flex-shrink-0">Instructions</Label>
        <div className="flex-1">
          <Textarea
            name="prompt"
            placeholder="Enter detailed instructions for what you want the task to search for and analyze..."
            rows={6}
            className="resize-none text-sm h-40"
            defaultValue={editingTask?.prompt || selectedExample?.prompt || ''}
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 rounded-md p-2">
        <HugeiconsIcon icon={AlarmClockIcon} size={12} color="currentColor" strokeWidth={1.5} />
        <span>Email notifications enabled</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-3">
          {!editingTask && activeDailyTasks !== undefined && totalTasks !== undefined && (
            <div className="flex items-center gap-2">
              {selectedFrequency === 'daily' ? (
                <ProgressRing
                  value={activeDailyTasks}
                  max={TASK_LIMITS.DAILY_TASKS}
                  size={24}
                  strokeWidth={2}
                  color={
                    activeDailyTasks >= TASK_LIMITS.DAILY_TASKS
                      ? 'danger'
                      : activeDailyTasks >= 4
                        ? 'warning'
                        : 'success'
                  }
                  showLabel={false}
                />
              ) : (
                <ProgressRing
                  value={totalTasks}
                  max={TASK_LIMITS.TOTAL_TASKS}
                  size={24}
                  strokeWidth={2}
                  color={
                    totalTasks >= TASK_LIMITS.TOTAL_TASKS
                      ? 'danger'
                      : totalTasks >= 8
                        ? 'warning'
                        : 'primary'
                  }
                  showLabel={false}
                />
              )}
              <div className="text-xs text-muted-foreground">
                {selectedFrequency === 'daily'
                  ? `${Math.max(0, TASK_LIMITS.DAILY_TASKS - activeDailyTasks)} daily remaining`
                  : `${TASK_LIMITS.TOTAL_TASKS - totalTasks} remaining`}
              </div>
            </div>
          )}
        </div>

        <Button type="submit" size="sm" disabled={isSubmitDisabled}>
          {editingTask
            ? isMutating
              ? 'Updating...'
              : 'Update'
            : selectedFrequency === 'once'
              ? 'Create Task'
              : 'Create'}
        </Button>
      </div>
    </form>
  );
}
