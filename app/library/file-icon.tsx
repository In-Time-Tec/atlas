'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  Image01Icon,
  FileIcon as DefaultFileIcon,
  CodeIcon,
} from '@hugeicons/core-free-icons';

interface FileIconProps {
  contentType: string | null;
  className?: string;
}

export function FileIcon({ contentType, className = "w-4 h-4" }: FileIconProps) {
  const getIconByContentType = (type: string | null) => {
    if (!type) {
      return DefaultFileIcon;
    }
    if (type.startsWith('image/')) {
      return Image01Icon;
    }
    if (type.includes('json') || type.includes('javascript') || type.includes('typescript') || type.startsWith('text/')) {
      return CodeIcon;
    }
    return DefaultFileIcon;
  };

  const icon = getIconByContentType(contentType);
  
  return (
    <div className="flex-shrink-0">
      <HugeiconsIcon
        icon={icon}
        size={16}
        className={`text-muted-foreground ${className}`}
      />
    </div>
  );
}