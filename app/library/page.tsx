'use client';

import * as React from 'react';
import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Grid3X3, List, Upload, FolderPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUserData } from '@/hooks/use-user-data';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { FileGrid } from '@/components/file-library/FileGrid';
import { FileList } from '@/components/file-library/FileList';
import { FileUploadZone } from '@/components/file-library/FileUploadZone';
import { FileLibraryFile, FileLibraryFolder } from '@/components/file-library/FileLibraryDialog';

const FILES_PER_PAGE = 50;
const FILES_CACHE_TIME_MS = 300000;
const FOLDERS_CACHE_TIME_MS = 600000;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function LibraryPageContent() {
  const { user, subscriptionData, isProUser, isLoading: userLoading, isLoading: isProStatusLoading } = useUserData();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, userLoading, router]);

  const buildFilesQueryParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (selectedFolderId) params.append('folderId', selectedFolderId);
    params.append('limit', FILES_PER_PAGE.toString());
    params.append('sortBy', 'createdAt');
    params.append('sortOrder', 'desc');
    return params;
  };

  const fetchFiles = async () => {
    const params = buildFilesQueryParams();
    const response = await fetch(`/api/files?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }
    return response.json();
  };

  const fetchFolders = async () => {
    const response = await fetch('/api/folders');
    if (!response.ok) {
      throw new Error('Failed to fetch folders');
    }
    return response.json();
  };

  const {
    data: filesData,
    isLoading: filesLoading,
    refetch: refetchFiles,
  } = useQuery({
    queryKey: ['files', searchQuery, selectedFolderId],
    queryFn: fetchFiles,
    enabled: !!user,
    staleTime: FILES_CACHE_TIME_MS,
  });

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: fetchFolders,
    enabled: !!user,
    staleTime: FOLDERS_CACHE_TIME_MS,
  });

  const files = filesData?.files || [];
  const folders = foldersData?.folders || [];

  const handleFileSelect = (file: FileLibraryFile) => {
    console.log('File selected:', file);
  };

  const handleUploadComplete = () => {
    refetchFiles();
    setShowUpload(false);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  const toggleUploadZone = () => {
    setShowUpload(!showUpload);
  };

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <PageHeader
        title="File Library"
        user={user}
        subscriptionData={subscriptionData}
        isProUser={isProUser}
        isProStatusLoading={isProStatusLoading}
      />
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="flex flex-col h-full">
          <div className="px-6 py-5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Manage and organize your files</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleUploadZone} 
                  className={cn(
                    "h-8 px-3 text-sm font-medium transition-all",
                    showUpload && "bg-accent text-accent-foreground"
                  )}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  Upload
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleViewMode}
                  className="h-8 w-8"
                >
                  {viewMode === 'grid' ? 
                    <List className="w-4 h-4" /> : 
                    <Grid3X3 className="w-4 h-4" />
                  }
                </Button>
              </div>
            </div>
          </div>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 border-b border-border/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search files by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 bg-muted/50 border-transparent hover:bg-muted/70 focus:bg-background focus:border-border"
              />
            </div>
          </div>

          {showUpload && (
            <div className="mx-6 mt-4 border border-border/50 rounded-lg p-4 bg-muted/30">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-sm">Upload Files</h3>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-6 w-6" 
                  onClick={() => setShowUpload(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <FileUploadZone folderId={selectedFolderId} onUploadComplete={handleUploadComplete} />
            </div>
          )}

          <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 py-3 border-b border-border/50">
              <TabsList className="h-9 p-1 bg-muted/50">
                <TabsTrigger value="all" className="text-sm px-3 py-1">All Files</TabsTrigger>
                <TabsTrigger value="folders" className="text-sm px-3 py-1">Folders</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="flex-1 min-h-0 p-6">
              <div className="h-full overflow-hidden">
                {viewMode === 'grid' ? (
                  <FileGrid
                    files={files}
                    selectedFiles={[]}
                    onFileSelect={handleFileSelect}
                    loading={filesLoading}
                    multiple={false}
                    mode="manage"
                  />
                ) : (
                  <FileList
                    files={files}
                    selectedFiles={[]}
                    onFileSelect={handleFileSelect}
                    loading={filesLoading}
                    multiple={false}
                    mode="manage"
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="folders" className="flex-1 min-h-0 p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-auto">
                {folders.map((folder: FileLibraryFolder) => (
                  <Button
                    key={folder.id}
                    variant="outline"
                    className="h-24 flex flex-col gap-2 p-4 border-border/50 hover:border-border hover:bg-muted/50 transition-all"
                    onClick={() => handleFolderSelect(folder.id)}
                  >
                    <FolderPlus className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm font-medium truncate w-full">{folder.name}</span>
                  </Button>
                ))}
                {foldersLoading && (
                  <div className="col-span-full text-center py-16 text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      Loading folders...
                    </div>
                  </div>
                )}
                {!foldersLoading && folders.length === 0 && (
                  <div className="col-span-full text-center py-16 text-muted-foreground">
                    <FolderPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No folders found</p>
                    <p className="text-sm mt-1">Create folders to organize your files</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
    </>
  );
}

export default function LibraryPage() {
  return (
    <Suspense>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full">
          <LibraryPageContent />
        </SidebarInset>
      </SidebarProvider>
    </Suspense>
  );
}