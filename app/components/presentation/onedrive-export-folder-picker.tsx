'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Folder, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type FolderItem = {
  id: string;
  name: string;
  driveId?: string;
};

type OneDriveExportFolderPickerProps = {
  value: { folderId: string; folderName: string; driveId?: string } | null;
  onChange: (next: { folderId: string; folderName: string; driveId?: string } | null) => void;
};

export function OneDriveExportFolderPicker({ value, onChange }: OneDriveExportFolderPickerProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(value?.folderId || '');

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedId) || null,
    [folders, selectedId]
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusRes = await fetch('/api/integrations/microsoft/status', { cache: 'no-store' });
      if (!statusRes.ok) {
        setIsConnected(false);
        setFolders([]);
        return;
      }
      const statusJson = await statusRes.json().catch(() => ({}));
      const connected = Boolean(statusJson?.connected);
      setIsConnected(connected);
      if (!connected) {
        setFolders([]);
        return;
      }

      const filesRes = await fetch('/api/integrations/microsoft/files?kind=onedrive&source=files', {
        cache: 'no-store',
      });
      if (!filesRes.ok) {
        setFolders([]);
        return;
      }
      const filesJson = await filesRes.json().catch(() => ({}));
      const items = Array.isArray(filesJson?.items) ? filesJson.items : [];
      const nextFolders: FolderItem[] = items
        .filter((item: any) => Boolean(item?.isFolder))
        .map((item: any) => ({
          id: String(item.id || ''),
          name: String(item.name || 'Untitled folder'),
          driveId: typeof item?.driveId === 'string' ? item.driveId : undefined,
        }))
        .filter((item: FolderItem) => item.id);
      setFolders(nextFolders);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [load, open]);

  useEffect(() => {
    setSelectedId(value?.folderId || '');
  }, [value?.folderId]);

  const apply = () => {
    if (!selectedFolder) {
      onChange(null);
      setOpen(false);
      return;
    }
    onChange({
      folderId: selectedFolder.id,
      folderName: selectedFolder.name,
      driveId: selectedFolder.driveId,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Folder className="mr-2 h-4 w-4" />
          {value?.folderName ? `Export folder: ${value.folderName}` : 'Choose OneDrive folder'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose OneDrive export folder</DialogTitle>
          <DialogDescription>
            This folder is used as destination for PowerPoint cloud export.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[340px] overflow-auto space-y-2">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading OneDrive folders...
            </div>
          )}

          {!isLoading && isConnected === false && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Microsoft account is not connected.</p>
              <Button
                size="sm"
                onClick={() => {
                  window.location.href = `/api/integrations/microsoft/connect?returnTo=${encodeURIComponent('/tools/presentation')}`;
                }}
              >
                Connect Microsoft
              </Button>
            </div>
          )}

          {!isLoading && isConnected && folders.length === 0 && (
            <p className="text-sm text-muted-foreground">No folders found in root.</p>
          )}

          {!isLoading && isConnected && folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setSelectedId(folder.id)}
              className={`w-full rounded-lg border p-2 text-left text-sm ${selectedId === folder.id ? 'border-foreground/50 bg-muted/50' : 'border-border hover:bg-muted/30'}`}
            >
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span>{folder.name}</span>
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onChange(null)}>
            Clear
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!selectedFolder}>
            Use folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
