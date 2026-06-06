'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Link as LinkIcon, Trash2, Plus, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Material = {
  id: string;
  kind: 'text' | 'file' | 'url' | 'onedrive';
  title: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  extraction_status: string | null;
  created_at: string;
};

interface MaterialsPanelProps {
  studysetId: string;
  editable?: boolean;
  onMaterialAdded?: () => void;
}

export function MaterialsPanel({ studysetId, editable = true, onMaterialAdded }: MaterialsPanelProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const response = await fetch(`/api/studysets/${studysetId}/materials`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load materials');
        const data = await response.json();
        setMaterials(data.materials || []);
      } catch (error: any) {
        toast({
          title: 'Could not load materials',
          description: error?.message || 'Try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    void loadMaterials();
  }, [studysetId, toast]);

  const handleDeleteMaterial = async (materialId: string) => {
    setDeleting(materialId);
    try {
      const response = await fetch(`/api/studysets/${studysetId}/materials`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: materialId }),
      });
      if (!response.ok) throw new Error('Failed to delete material');
      setMaterials(materials.filter((m) => m.id !== materialId));
      toast({ title: 'Material deleted' });
    } catch (error: any) {
      toast({
        title: 'Could not delete material',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const getIconForKind = (kind: Material['kind']) => {
    switch (kind) {
      case 'file':
        return <FileText className="h-4 w-4" />;
      case 'url':
        return <LinkIcon className="h-4 w-4" />;
      case 'onedrive':
        return <Lock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getKindLabel = (kind: Material['kind']) => {
    switch (kind) {
      case 'file':
        return 'File';
      case 'url':
        return 'Link';
      case 'onedrive':
        return 'OneDrive';
      case 'text':
        return 'Text';
      default:
        return 'Material';
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Loading materials…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Materials</h3>
        {editable && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              toast({
                title: 'Coming soon',
                description: 'Material upload feature will be available soon.',
              });
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        )}
      </div>

      {materials.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No materials added yet
          </p>
          {editable && (
            <p className="text-xs text-muted-foreground mt-1">
              Add study materials to help with your preparation
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0 text-muted-foreground">
                {getIconForKind(material.kind)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {material.title || material.file_name || `${getKindLabel(material.kind)} material`}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{getKindLabel(material.kind)}</span>
                  {material.file_size && (
                    <>
                      <span>•</span>
                      <span>
                        {material.file_size < 1024 * 1024
                          ? `${Math.round(material.file_size / 1024)}KB`
                          : `${Math.round(material.file_size / (1024 * 1024))}MB`}
                      </span>
                    </>
                  )}
                  {material.extraction_status && material.extraction_status !== 'ready' && (
                    <>
                      <span>•</span>
                      <span>{material.extraction_status}</span>
                    </>
                  )}
                </div>
              </div>

              {editable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 text-destructive"
                  onClick={() => void handleDeleteMaterial(material.id)}
                  disabled={deleting === material.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
