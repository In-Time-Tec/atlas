'use client';

import React from 'react';
import { toast } from 'sonner';
import { DEFAULT_FORM_VALUES } from '../constants';
import { isTimeInPast } from '../utils/time-utils';

export interface TaskFormData {
  title: string;
  prompt: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  time: string;
  timezone: string;
  date?: string;
  dayOfWeek?: string;
}

export interface TaskFormHookReturn {
  // Form state
  selectedFrequency: string;
  selectedTime: string;
  selectedTimezone: string;
  selectedDate: Date | undefined;
  selectedDayOfWeek: string;
  selectedExample: any | null;
  isCreateDialogOpen: boolean;
  editingTask: any | null;

  // Form actions
  setSelectedFrequency: (frequency: string) => void;
  setSelectedTime: (time: string) => void;
  setSelectedTimezone: (timezone: string) => void;
  setSelectedDate: (date: Date | undefined) => void;
  setSelectedDayOfWeek: (day: string) => void;
  setSelectedExample: (example: any | null) => void;
  setIsCreateDialogOpen: (open: boolean) => void;
  setEditingTask: (task: any | null) => void;

  // Form handlers
  handleDialogOpenChange: (open: boolean) => void;
  handleUseExample: (example: any) => void;
  populateFormForEdit: (task: any) => void;
  resetForm: () => void;

  // Form submission
  createTaskFromForm: (formData: FormData, createTask: any) => void;
  updateTaskFromForm: (formData: FormData, updateTask: any) => void;

  // Validation
  validateForm: (formData: FormData) => boolean;
}

export function useTaskForm(detectedTimezone: string = DEFAULT_FORM_VALUES.TIMEZONE): TaskFormHookReturn {
  console.log('🎯 Form hook received detectedTimezone:', detectedTimezone);

  // Form state
  const [selectedFrequency, setSelectedFrequency] = React.useState<string>(DEFAULT_FORM_VALUES.FREQUENCY);
  const [selectedTime, setSelectedTime] = React.useState<string>(DEFAULT_FORM_VALUES.TIME);
  const [selectedTimezone, setSelectedTimezone] = React.useState<string>(detectedTimezone);
  console.log('🔧 Initial selectedTimezone state:', detectedTimezone);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [selectedDayOfWeek, setSelectedDayOfWeek] = React.useState<string>(DEFAULT_FORM_VALUES.DAY_OF_WEEK);
  const [selectedExample, setSelectedExample] = React.useState<any | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<any | null>(null);

  // Update timezone when detected timezone changes
  React.useEffect(() => {
    console.log('⚡ useEffect triggered - detectedTimezone:', detectedTimezone, 'editingTask:', !!editingTask);
    if (!editingTask) {
      console.log('📝 Setting selectedTimezone to:', detectedTimezone);
      setSelectedTimezone(detectedTimezone);
    }
  }, [detectedTimezone, editingTask]);

  // Reset form to default values
  const resetForm = React.useCallback(() => {
    setSelectedFrequency(DEFAULT_FORM_VALUES.FREQUENCY as string);
    setSelectedTime(DEFAULT_FORM_VALUES.TIME as string);
    setSelectedTimezone(detectedTimezone);
    setSelectedDate(undefined);
    setSelectedDayOfWeek(DEFAULT_FORM_VALUES.DAY_OF_WEEK as string);
    setSelectedExample(null);
    setEditingTask(null);
  }, [detectedTimezone]);

  // Handle dialog open/close with form reset
  const handleDialogOpenChange = React.useCallback(
    (open: boolean) => {
      setIsCreateDialogOpen(open);
      if (open && !editingTask) {
        // Use detected timezone when opening dialog for new task
        setSelectedTimezone(detectedTimezone);
      } else if (!open) {
        resetForm();
      }
    },
    [resetForm, editingTask, detectedTimezone],
  );

  // Handle using an example task
  const handleUseExample = React.useCallback((example: any) => {
    setSelectedExample(example);
    setSelectedFrequency(example.frequency);
    setSelectedTime(example.time);
    setSelectedTimezone(example.timezone || (DEFAULT_FORM_VALUES.TIMEZONE as string));
    setSelectedDayOfWeek(example.dayOfWeek || (DEFAULT_FORM_VALUES.DAY_OF_WEEK as string));
    setIsCreateDialogOpen(true);
  }, []);

  // Populate form for editing an existing task
  const populateFormForEdit = React.useCallback((task: any) => {
    setEditingTask(task);
    setSelectedFrequency(task.frequency);
    setSelectedTimezone(task.timezone);

    // Parse time from existing data or use default
    if (task.cronSchedule) {
      // Parse time from cron schedule if available
      const parts = task.cronSchedule.split(' ');
      const cronParts = parts[0]?.startsWith('CRON_TZ=') ? parts.slice(1) : parts;

      if (cronParts.length >= 2) {
        const minutes = cronParts[0];
        const hours = cronParts[1];
        setSelectedTime(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}` as string);
      }

      // Parse day of week for weekly frequency
      if (task.frequency === 'weekly' && cronParts.length >= 5) {
        const dayOfWeek = cronParts[4]; // Day of week is the 5th field in cron
        setSelectedDayOfWeek(dayOfWeek);
      }
    }

    setIsCreateDialogOpen(true);
  }, []);

  // Form validation
  const validateForm = React.useCallback((formData: FormData): boolean => {
    const title = formData.get('title') as string;
    const prompt = formData.get('prompt') as string;
    const frequency = formData.get('frequency') as string;
    const time = formData.get('time') as string;
    const date = formData.get('date') as string;

    if (!title?.trim() || !prompt?.trim()) {
      toast.error('Please fill in all required fields');
      return false;
    }

    // For once frequency, validate date and time
    if (frequency === 'once') {
      if (!date) {
        toast.error('Please select a date for one-time tasks');
        return false;
      }

      if (!time) {
        toast.error('Please select a time');
        return false;
      }

      // Check if the selected date and time is in the past
      const selectedDateTime = new Date(date);
      if (isTimeInPast(time, selectedDateTime)) {
        toast.error('Cannot schedule task in the past');
        return false;
      }
    }

    return true;
  }, []);

  // Create task from form data
  const createTaskFromForm = React.useCallback(
    (formData: FormData, createTask: any) => {
      if (!validateForm(formData)) return;

      const title = formData.get('title') as string;
      const prompt = formData.get('prompt') as string;
      const frequency = formData.get('frequency') as string;
      const time = formData.get('time') as string;
      const timezone = (formData.get('timezone') as string) || DEFAULT_FORM_VALUES.TIMEZONE;
      const date = formData.get('date') as string;
      const dayOfWeek = formData.get('dayOfWeek') as string;

      // Handle weekly day selection
      let adjustedTime = time;
      if (frequency === 'weekly' && dayOfWeek) {
        adjustedTime = `${time}:${dayOfWeek}`;
      }

      createTask({
        title: title.trim(),
        prompt: prompt.trim(),
        frequency: frequency as 'once' | 'daily' | 'weekly' | 'monthly',
        time: adjustedTime,
        timezone,
        date: frequency === 'once' ? date : undefined,
        onSuccess: () => handleDialogOpenChange(false),
      });
    },
    [validateForm, handleDialogOpenChange],
  );

  // Update task from form data
  const updateTaskFromForm = React.useCallback(
    (formData: FormData, updateTask: any) => {
      if (!editingTask || !validateForm(formData)) return;

      const title = formData.get('title') as string;
      const prompt = formData.get('prompt') as string;
      const frequency = formData.get('frequency') as string;
      const time = formData.get('time') as string;
      const timezone = formData.get('timezone') as string;
      const dayOfWeek = formData.get('dayOfWeek') as string;

      updateTask({
        id: editingTask.id,
        title: title.trim(),
        prompt: prompt.trim(),
        frequency: frequency as 'once' | 'daily' | 'weekly' | 'monthly',
        time: frequency === 'weekly' && dayOfWeek ? `${time}:${dayOfWeek}` : time,
        timezone,
        onSuccess: () => handleDialogOpenChange(false),
      });
    },
    [editingTask, validateForm, handleDialogOpenChange],
  );

  return {
    // State
    selectedFrequency,
    selectedTime,
    selectedTimezone,
    selectedDate,
    selectedDayOfWeek,
    selectedExample,
    isCreateDialogOpen,
    editingTask,

    // Setters
    setSelectedFrequency,
    setSelectedTime,
    setSelectedTimezone,
    setSelectedDate,
    setSelectedDayOfWeek,
    setSelectedExample,
    setIsCreateDialogOpen,
    setEditingTask,

    // Handlers
    handleDialogOpenChange,
    handleUseExample,
    populateFormForEdit,
    resetForm,

    // Form submission
    createTaskFromForm,
    updateTaskFromForm,

    // Validation
    validateForm,
  };
}
