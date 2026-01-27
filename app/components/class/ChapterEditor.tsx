'use client';

import { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { BaseBlock, BlockContent } from '@/components/blocks/types';
import { Plus, Save, Edit, Trash2, BookOpen, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/app-context';

interface Chapter {
  id: string;
  title: string;
  description?: string;
  order_index: number;
}

interface Block extends BaseBlock {
  chapter_id: string;
}

interface ChapterEditorProps {
  classId: string;
  chapterId: string;
  onChapterUpdated?: () => void;
  className?: string;
}

export function ChapterEditor({
  classId,
  chapterId,
  onChapterUpdated,
  className
}: ChapterEditorProps) {
  const { toast } = useToast();
  const { assignments } = useContext(AppContext) || {};
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterDescription, setNewChapterDescription] = useState('');
  const [editingChapter, setEditingChapter] = useState(false);

  useEffect(() => {
    if (chapterId === 'new') {
      setIsLoading(false);
      setChapter(null);
      setBlocks([]);
      return;
    }

    const fetchChapterAndBlocks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch chapter details
        const chapterResponse = await fetch(`/api/classes/${classId}/chapters/${chapterId}`);
        if (!chapterResponse.ok) {
          throw new Error('Failed to fetch chapter');
        }
        const chapterData = await chapterResponse.json();
        setChapter(chapterData);

        // Fetch blocks
        const blocksResponse = await fetch(`/api/classes/${classId}/chapters/${chapterId}/blocks`);
        if (!blocksResponse.ok) {
          throw new Error('Failed to fetch blocks');
        }
        const blocksData = await blocksResponse.json();
        setBlocks(blocksData.blocks || []);
      } catch (err) {
        console.error('Error fetching chapter:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapterAndBlocks();
  }, [classId, chapterId]);

  const handleCreateChapter = async () => {
    if (!newChapterTitle.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newChapterTitle.trim(),
          description: newChapterDescription.trim() || null,
          order_index: 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create chapter');
      }

      const { chapter: newChapter } = await response.json();
      toast({ title: 'Success', description: 'Chapter created successfully' });
      setIsCreateDialogOpen(false);
      setNewChapterTitle('');
      setNewChapterDescription('');
      onChapterUpdated?.();
    } catch (err) {
      console.error('Error creating chapter:', err);
      toast({ title: 'Error', description: 'Failed to create chapter', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateChapter = async () => {
    if (!chapter || !chapter.title.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/chapters/${chapter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: chapter.title,
          description: chapter.description || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update chapter');
      }

      toast({ title: 'Success', description: 'Chapter updated successfully' });
      setEditingChapter(false);
      onChapterUpdated?.();
    } catch (err) {
      console.error('Error updating chapter:', err);
      toast({ title: 'Error', description: 'Failed to update chapter', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBlock = async (type: string) => {
    if (!chapter) return;

    setIsSaving(true);
    try {
      const defaultContent: BlockContent = getDefaultContentForType(type);
      const response = await fetch(`/api/classes/${classId}/chapters/${chapter.id}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          content: defaultContent,
          order_index: blocks.length,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add block');
      }

      const { block } = await response.json();
      setBlocks([...blocks, block]);
      toast({ title: 'Success', description: 'Block added successfully' });
    } catch (err) {
      console.error('Error adding block:', err);
      toast({ title: 'Error', description: 'Failed to add block', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBlock = async (blockId: string, content: BlockContent) => {
    setBlocks(blocks.map(block =>
      block.id === blockId ? { ...block, content } : block
    ));
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}/chapters/${chapterId}/blocks/${blockId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete block');
      }

      setBlocks(blocks.filter(block => block.id !== blockId));
      toast({ title: 'Success', description: 'Block deleted successfully' });
    } catch (err) {
      console.error('Error deleting block:', err);
      toast({ title: 'Error', description: 'Failed to delete block', variant: 'destructive' });
    }
  };

  const getDefaultContentForType = (type: string): BlockContent => {
    switch (type) {
      case 'text':
        return { type: 'paragraph', text: '' };
      case 'list':
        return { type: 'bulleted', items: [] };
      case 'media':
        return { type: 'image', url: '', alt: '' };
      case 'code':
        return { language: 'javascript', code: '' };
      case 'quote':
        return { text: '' };
      case 'layout':
        return { type: 'divider' };
      case 'complex':
        return { type: 'other', data: {}, viewerType: '' };
      default:
        return { type: 'paragraph', text: '' };
    }
  };

  if (chapterId === 'new') {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Create Your First Chapter</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start building learning content by creating a chapter.
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Chapter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Chapter</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      placeholder="Chapter title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (optional)</label>
                    <Textarea
                      value={newChapterDescription}
                      onChange={(e) => setNewChapterDescription(e.target.value)}
                      placeholder="Chapter description"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateChapter} disabled={isSaving}>
                      {isSaving ? 'Creating...' : 'Create Chapter'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !chapter) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            {editingChapter ? (
              <div className="flex-1 space-y-4">
                <Input
                  value={chapter.title}
                  onChange={(e) => setChapter({ ...chapter, title: e.target.value })}
                  className="text-xl font-bold"
                />
                <Textarea
                  value={chapter.description || ''}
                  onChange={(e) => setChapter({ ...chapter, description: e.target.value })}
                  placeholder="Chapter description"
                />
                <div className="flex gap-2">
                  <Button onClick={handleUpdateChapter} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingChapter(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {chapter.title}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingChapter(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </CardTitle>
                {chapter.description && (
                  <p className="text-muted-foreground mt-2">{chapter.description}</p>
                )}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Content Blocks</CardTitle>
            <div className="flex gap-2">
              {['text', 'list', 'media', 'code', 'quote'].map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddBlock(type)}
                  disabled={isSaving}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No content blocks yet. Add your first block to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {blocks.map((block) => {
                const linkedAssignment = assignments?.find((a: any) => a.block_id === block.id);
                return (
                  <div key={block.id} className="relative group">
                    {linkedAssignment && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium">
                          <FileText className="h-3 w-3" />
                          Assignment
                        </div>
                      </div>
                    )}
                    <BlockRenderer
                      block={block}
                      onUpdate={(content) => handleUpdateBlock(block.id, content)}
                      onDelete={() => handleDeleteBlock(block.id)}
                      isEditing={true}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}