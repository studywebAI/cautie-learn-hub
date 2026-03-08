'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Block = {
  id?: string;
  type: 'text' | 'image' | 'video' | 'multiple_choice' | 'open_question' | 'fill_in_blank' | 'drag_drop' | 'ordering' | 'media_embed' | 'divider' | 'rich_text' | 'executable_code' | 'code' | 'list' | 'quote' | 'layout' | 'complex';
  position: number;
  data: any;
  locked?: boolean;
  show_feedback?: boolean;
  ai_grading_override?: any;
};

type BlockEditorProps = {
  assignmentId?: string;
  subjectId?: string;
  chapterId?: string;
  paragraphId?: string;
  materialId?: string;
  initialBlocks?: Block[];
  onSave?: (blocks: Block[]) => void;
};

const BLOCK_TYPES = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'image', label: 'Image', icon: '🖼️' },
  { value: 'video', label: 'Video', icon: '🎥' },
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '☑️' },
  { value: 'open_question', label: 'Open Question', icon: '❓' },
  { value: 'fill_in_blank', label: 'Fill in Blank', icon: '📝' },
  { value: 'drag_drop', label: 'Drag & Drop', icon: '🎯' },
  { value: 'ordering', label: 'Ordering', icon: '🔢' },
  { value: 'media_embed', label: 'Media Embed', icon: '🔗' },
  { value: 'divider', label: 'Divider', icon: '➖' },
  { value: 'rich_text', label: 'Rich Text', icon: '📄' },
  { value: 'executable_code', label: 'Executable Code', icon: '💻' },
  { value: 'code', label: 'Code', icon: '📝' },
  { value: 'list', label: 'List', icon: '📋' },
  { value: 'quote', label: 'Quote', icon: '💬' },
  { value: 'layout', label: 'Layout', icon: '⊞' },
  { value: 'complex', label: 'Complex', icon: '⚡' },
];

export function BlockEditor({
  assignmentId,
  subjectId,
  chapterId,
  paragraphId,
  materialId,
  initialBlocks = [],
  onSave
}: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const { toast } = useToast();

  // Load blocks on mount if assignment context is provided
  useEffect(() => {
    if (assignmentId && subjectId && chapterId && paragraphId) {
      loadBlocks();
    }
  }, [assignmentId, subjectId, chapterId, paragraphId]);

  const loadBlocks = async () => {
    if (!subjectId || !chapterId || !paragraphId || !assignmentId) return;
    
    try {
      const response = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks`);
      if (response.ok) {
        const data = await response.json();
        setBlocks(data);
      }
    } catch (error) {
      console.error('Error loading blocks:', error);
    }
  };

  const saveBlocks = async () => {
    if (!assignmentId || !subjectId || !chapterId || !paragraphId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Missing required IDs for saving',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get existing blocks to determine which to update vs create
      const existingResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks`);
      const existingBlocks = existingResponse.ok ? await existingResponse.json() : [];
      
      const existingMap = new Map(existingBlocks.map((b: Block) => [b.id, b]));
      const currentIds = new Set(blocks.map(b => b.id).filter(id => id !== undefined));

      // Delete blocks that are no longer present
      const blocksToDelete = existingBlocks.filter((b: Block) => !b.id || !currentIds.has(b.id));
      await Promise.all(
        blocksToDelete.map((b: Block) =>
          fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks/${b.id}`, {
            method: 'DELETE',
          })
        )
      );

      // Create or update blocks
      await Promise.all(
        blocks.map(async (block) => {
          const payload = {
            type: block.type,
            data: block.data,
            position: block.position,
            locked: block.locked || false,
            show_feedback: block.show_feedback || false,
            ai_grading_override: block.ai_grading_override || null,
          };

          if (block.id) {
            // Update existing block
            await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks/${block.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          } else {
            // Create new block
            await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          }
        })
      );

      toast({
        title: 'Success',
        description: 'Assignment content saved successfully.',
      });

      onSave?.(blocks);
      
      // Reload blocks to get IDs and updated positions
      await loadBlocks();
    } catch (error) {
      console.error('Error saving blocks:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save assignment content.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addBlock = (type: string) => {
    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      position: blocks.length,
      data: getDefaultDataForType(type)
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (index: number, updates: Partial<Block>) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[index] = { ...updatedBlocks[index], ...updates };
    setBlocks(updatedBlocks);
  };

  const removeBlock = (index: number) => {
    const updatedBlocks = blocks.filter((_, i) => i !== index);
    // Re-normalize positions
    const renormalized = updatedBlocks.map((block, idx) => ({
      ...block,
      position: idx
    }));
    setBlocks(renormalized);
  };

  const moveBlock = (fromIndex: number, toIndex: number) => {
    const updatedBlocks = [...blocks];
    const [movedBlock] = updatedBlocks.splice(fromIndex, 1);
    if (!movedBlock) return;
    updatedBlocks.splice(toIndex, 0, movedBlock);
    // Re-normalize positions
    const renormalized = updatedBlocks.map((block, idx) => ({
      ...block,
      position: idx
    }));
    setBlocks(renormalized);
  };

  const getDefaultDataForType = (type: string) => {
    switch (type) {
      case 'text':
        return { content: '', style: 'normal' };
      case 'image':
        return { url: '', caption: '' };
      case 'video':
        return { url: '', provider: 'youtube', start_seconds: 0, end_seconds: null };
      case 'multiple_choice':
        return { question: '', options: [{ id: 'a', text: '', correct: false }], multiple_correct: false, shuffle: true };
      case 'open_question':
        return { question: '', ai_grading: true, grading_criteria: '', max_length: 1000 };
      case 'fill_in_blank':
        return { text: 'My shoes ___ 100 euros.', answers: [''], case_sensitive: false };
      case 'drag_drop':
        return { prompt: '', pairs: [{ left: '', right: '' }] };
      case 'ordering':
        return { prompt: '', items: ['', '', ''], correct_order: [0, 1, 2] };
      case 'media_embed':
        return { embed_url: '', description: '' };
      case 'divider':
        return { style: 'line' };
      default:
        return {};
    }
  };

  const renderBlockEditor = (block: Block, index: number) => {
    const updateData = (data: any) => updateBlock(index, { data });

    switch (block.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <Label>Content</Label>
              <Textarea
                value={block.data.content || ''}
                onChange={(e) => updateData({ ...block.data, content: e.target.value })}
                placeholder="Enter text content..."
                rows={4}
              />
            </div>
            <div>
              <Label>Style</Label>
              <Select
                value={block.data.style || 'normal'}
                onValueChange={(value) => updateData({ ...block.data, style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="heading">Heading</SelectItem>
                  <SelectItem value="subheading">Subheading</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="space-y-4">
            <div>
              <Label>Question</Label>
              <Input
                value={block.data.question || ''}
                onChange={(e) => updateData({ ...block.data, question: e.target.value })}
                placeholder="Enter your question..."
              />
            </div>
            <div>
              <Label>Options</Label>
              <div className="space-y-2">
                {(block.data.options || []).map((option: any, optIndex: number) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={option.correct || false}
                      onChange={(e) => {
                        const newOptions = [...(block.data.options || [])];
                        newOptions[optIndex] = { ...option, correct: e.target.checked };
                        updateData({ ...block.data, options: newOptions });
                      }}
                    />
                    <Input
                      value={option.text || ''}
                      onChange={(e) => {
                        const newOptions = [...(block.data.options || [])];
                        newOptions[optIndex] = { ...option, text: e.target.value };
                        updateData({ ...block.data, options: newOptions });
                      }}
                      placeholder={`Option ${optIndex + 1}`}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newOptions = [...(block.data.options || []), { id: `opt${Date.now()}`, text: '', correct: false }];
                    updateData({ ...block.data, options: newOptions });
                  }}
                >
                  Add Option
                </Button>
              </div>
            </div>
          </div>
        );

      case 'open_question':
        return (
          <div className="space-y-4">
            <div>
              <Label>Question</Label>
              <Textarea
                value={block.data.question || ''}
                onChange={(e) => updateData({ ...block.data, question: e.target.value })}
                placeholder="Enter your question..."
                rows={3}
              />
            </div>
            <div>
              <Label>Grading Criteria</Label>
              <Textarea
                value={block.data.grading_criteria || ''}
                onChange={(e) => updateData({ ...block.data, grading_criteria: e.target.value })}
                placeholder="Describe how to grade this question..."
                rows={2}
              />
            </div>
            <div>
              <Label>Max Length</Label>
              <Input
                type="number"
                value={block.data.max_length || 1000}
                onChange={(e) => updateData({ ...block.data, max_length: parseInt(e.target.value) || 1000 })}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Edit raw data for "{block.type}" block:
            </p>
            <textarea
              className="w-full min-h-[200px] font-mono text-xs p-3 rounded-md border bg-muted/30 resize-y"
              value={JSON.stringify(block.data, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  updateData(parsed);
                } catch {
                  // Invalid JSON, don't update
                }
              }}
            />
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen">
      {/* Canvas */}
      <div className="flex-1 relative bg-gray-50 overflow-y-auto p-4">
        <div className="space-y-4">
          {blocks.map((block, index) => (
            <Card key={block.id || index} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {BLOCK_TYPES.find(bt => bt.value === block.type)?.label}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveBlock(index, index - 1)}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveBlock(index, index + 1)}
                      disabled={index === blocks.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBlock(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {renderBlockEditor(block, index)}
              </CardContent>
            </Card>
          ))}
        </div>

        {blocks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No blocks yet. Add blocks from the palette on the right.</p>
          </div>
        )}
      </div>

      {/* Block Palette */}
      <div className={`bg-white border-l shadow-lg transition-all duration-300 ${isPaletteOpen ? 'w-64' : 'w-12'}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPaletteOpen(!isPaletteOpen)}
          className="w-full h-12 flex items-center justify-center"
        >
          <ArrowRight className={`h-4 w-4 transition-transform ${isPaletteOpen ? 'rotate-180' : ''}`} />
        </Button>
        {isPaletteOpen && (
          <div className="p-4">
            <h3 className="text-sm font-medium mb-4">Blocks</h3>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_TYPES.map((blockType) => (
                <div
                  key={blockType.value}
                  className="cursor-grab border rounded p-2 text-center hover:bg-gray-50"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('blockType', blockType.value);
                  }}
                >
                  <div className="text-xs">{blockType.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button onClick={saveBlocks} disabled={isLoading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
