'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { useUpdateFile } from '@/hooks/use-files';
import { toast } from 'sonner';
import type { FileData } from './columns';

interface EditableFilenameProps {
  file: FileData;
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
}

export function EditableFilename({ file, isEditing, onEditingChange }: EditableFilenameProps) {
  const [value, setValue] = useState(file.filename || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const updateMutation = useUpdateFile();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setValue(file.filename || '');
  }, [file.filename]);

  const handleSave = async () => {
    const trimmedValue = value.trim();
    
    if (!trimmedValue) {
      toast.error('Filename cannot be empty');
      setValue(file.filename || '');
      onEditingChange(false);
      return;
    }

    if (trimmedValue === file.filename) {
      onEditingChange(false);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: file.id,
        filename: trimmedValue,
      });
      onEditingChange(false);
    } catch (error) {
      console.error('Failed to rename file:', error);
      setValue(file.filename || '');
      onEditingChange(false);
    }
  };

  const handleCancel = () => {
    setValue(file.filename || '');
    onEditingChange(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const handleClick = () => {
    if (!isEditing && !updateMutation.isPending) {
      onEditingChange(true);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={updateMutation.isPending}
        className="h-5 text-xs font-medium px-1 py-0 border-none shadow-none bg-transparent focus-visible:ring-1 focus-visible:ring-ring"
        autoComplete="off"
      />
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={updateMutation.isPending}
      className="text-left w-full text-xs font-medium truncate hover:bg-muted/50 px-1 py-0 rounded transition-colors disabled:opacity-50"
      title="Click to rename"
    >
      {updateMutation.isPending ? (
        <span className="flex items-center gap-2">
          <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
          {file.filename || 'Unknown'}
        </span>
      ) : (
        file.filename || 'Unknown'
      )}
    </button>
  );
}