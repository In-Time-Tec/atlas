export { FileUploadDialog } from './file-upload-dialog';

export interface FileLibraryFile {
  id: string;
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileLibraryDialogProps {
  onFileSelect?: (file: FileLibraryFile) => void;
  onClose?: () => void;
}

export const FileLibraryDialog = ({ onFileSelect, onClose }: FileLibraryDialogProps) => null;
