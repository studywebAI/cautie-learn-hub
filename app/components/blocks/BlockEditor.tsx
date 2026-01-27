'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, X, GripVertical, Save, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sparkles, ChevronRight as ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Block = {
  id?: string;
  type: string;
  position: number;
  x?: number;
  y?: number;
  data: any;
};

type BlockEditorProps = {
  assignmentId: string;
  subjectId: string;
  chapterId: string;
  paragraphId: string;
  initialBlocks?: Block[];
  onSave?: (blocks: Block[]) => void;
};

const BLOCK_TYPES = [
  { value: 'TextBlock', label: 'Text', icon: '📝' },
  { value: 'ImageBlock', label: 'Image', icon: '🖼️' },
  { value: 'VideoBlock', label: 'Video', icon: '🎥' },
  { value: 'MultipleChoiceBlock', label: 'Multiple Choice', icon: '☑️' },
  { value: 'OpenQuestionBlock', label: 'Open Question', icon: '❓' },
  { value: 'FillInBlankBlock', label: 'Fill in Blank', icon: '📝' },
  { value: 'DragDropBlock', label: 'Drag & Drop', icon: '🎯' },
  { value: 'OrderingBlock', label: 'Ordering', icon: '🔢' },
  { value: 'MediaEmbedBlock', label: 'Media Embed', icon: '🔗' },
];

export function BlockEditor({
  assignmentId,
  subjectId,
  chapterId,
  paragraphId,
  initialBlocks = [],
  onSave
}: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const { toast } = useToast();

  // Load existing blocks on mount
  useEffect(() => {
    loadBlocks();
  }, [assignmentId]);

  // Load from localStorage first for fast loading
  useEffect(() => {
    const saved = localStorage.getItem(`blocks-${assignmentId}`);
    if (saved) {
      try {
        const parsedBlocks = JSON.parse(saved);
        setBlocks(parsedBlocks);
      } catch (error) {
        console.error('Error loading blocks from localStorage:', error);
      }
    }
    // Then load from API
    loadBlocks();
  }, [assignmentId]);

  const loadBlocks = async () => {
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
    setIsLoading(true);
    try {
      // First, clear existing blocks and then save new ones
      // This is a simplified approach - in production you'd want to do proper updates

      // Delete existing blocks
      const existingResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks`);
      if (existingResponse.ok) {
        const existingBlocks = await existingResponse.json();
        // In a real implementation, you'd delete blocks that are no longer present
      }

      // Save new blocks
      for (const block of blocks) {
        await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: block.type,
            data: block.data,
            position: block.position
          })
        });
      }

      toast({
        title: 'Success',
        description: 'Assignment content saved successfully.',
      });

      onSave?.(blocks);
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

  const addBlock = (type: string, x = 100, y = 100) => {
    const newBlock: Block = {
      type,
      position: blocks.length,
      x,
      y,
      data: getDefaultDataForType(type)
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (index: number, data: any) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[index] = { ...updatedBlocks[index], data };
    setBlocks(updatedBlocks);
    localStorage.setItem(`blocks-${assignmentId}`, JSON.stringify(updatedBlocks));
  };

  const removeBlock = (index: number) => {
    const updatedBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(updatedBlocks);
    localStorage.setItem(`blocks-${assignmentId}`, JSON.stringify(updatedBlocks));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent, index: number) => {
    if (draggedIndex !== null) {
      const canvas = e.currentTarget.closest('.flex-1');
      const rect = canvas?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const updatedBlocks = [...blocks];
        updatedBlocks[index] = { ...updatedBlocks[index], x: Math.max(0, x), y: Math.max(0, y) };
        setBlocks(updatedBlocks);
      }
    }
    setDraggedIndex(null);
  };

  const getDefaultDataForType = (type: string) => {
    switch (type) {
      case 'TextBlock':
        return { content: '', style: 'normal' };
      case 'ImageBlock':
        return { url: '', caption: '', transform: { x: 0, y: 0, scale: 1, rotation: 0 } };
      case 'VideoBlock':
        return { url: '', provider: 'youtube', start_seconds: 0, end_seconds: null };
      case 'MultipleChoiceBlock':
        return { question: '', options: [{ id: 'a', text: '', correct: false }], multiple_correct: false, shuffle: true };
      case 'OpenQuestionBlock':
        return { question: '', ai_grading: true, grading_criteria: '', max_length: 1000 };
      case 'FillInBlankBlock':
        return { text: '', answers: [''], case_sensitive: false };
      case 'DragDropBlock':
        return { prompt: '', pairs: [{ left: '', right: '' }] };
      case 'OrderingBlock':
        return { prompt: '', items: ['', '', ''], correct_order: [0, 1, 2] };
      case 'MediaEmbedBlock':
        return { embed_url: '', description: '' };
      case 'DividerBlock':
        return { style: 'line' };
      default:
        return {};
    }
  };

  const renderBlockEditor = (block: Block, index: number) => {
    switch (block.type) {
      case 'TextBlock':
        return (
          <div className="space-y-4">
            <div>
              <Label>Content</Label>
              <Textarea
                value={block.data.content}
                onChange={(e) => updateBlock(index, { ...block.data, content: e.target.value })}
                placeholder="Enter text content..."
                rows={4}
              />
            </div>
            <div>
              <Label>Style</Label>
              <Select
                value={block.data.style}
                onValueChange={(value) => updateBlock(index, { ...block.data, style: value })}
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

      case 'MultipleChoiceBlock':
        return (
          <div className="space-y-4">
            <div>
              <Label>Question</Label>
              <Input
                value={block.data.question}
                onChange={(e) => updateBlock(index, { ...block.data, question: e.target.value })}
                placeholder="Enter your question..."
              />
            </div>
            <div>
              <Label>Options</Label>
              <div className="space-y-2">
                {block.data.options?.map((option: any, optIndex: number) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={option.correct}
                      onChange={(e) => {
                        const newOptions = [...block.data.options];
                        newOptions[optIndex] = { ...option, correct: e.target.checked };
                        updateBlock(index, { ...block.data, options: newOptions });
                      }}
                    />
                    <Input
                      value={option.text}
                      onChange={(e) => {
                        const newOptions = [...block.data.options];
                        newOptions[optIndex] = { ...option, text: e.target.value };
                        updateBlock(index, { ...block.data, options: newOptions });
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
                    updateBlock(index, { ...block.data, options: newOptions });
                  }}
                >
                  Add Option
                </Button>
              </div>
            </div>
          </div>
        );

      case 'OpenQuestionBlock':
        return (
          <div className="space-y-4">
            <div>
              <Label>Question</Label>
              <Textarea
                value={block.data.question}
                onChange={(e) => updateBlock(index, { ...block.data, question: e.target.value })}
                placeholder="Enter your question..."
                rows={3}
              />
            </div>
            <div>
              <Label>Grading Criteria</Label>
              <Textarea
                value={block.data.grading_criteria}
                onChange={(e) => updateBlock(index, { ...block.data, grading_criteria: e.target.value })}
                placeholder="Describe how to grade this question..."
                rows={2}
              />
            </div>
            <div>
              <Label>Max Length</Label>
              <Input
                type="number"
                value={block.data.max_length}
                onChange={(e) => updateBlock(index, { ...block.data, max_length: parseInt(e.target.value) })}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 text-center text-muted-foreground">
            Editor for {block.type} not implemented yet.
            <pre className="mt-2 text-xs text-left bg-muted p-2 rounded">
              {JSON.stringify(block.data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen">
      {/* Canvas */}
      <div
        className="flex-1 relative bg-gray-50 overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const blockType = e.dataTransfer.getData('blockType');
          if (blockType) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            addBlock(blockType, x, y);
          }
        }}
      >
        <div className="absolute inset-0">
          {blocks.map((block, index) => (
            <div
              key={index}
              className="absolute cursor-move select-none"
              style={{
                left: block.x || (50 + (index % 3) * 250),
                top: block.y || (50 + Math.floor(index / 3) * 200)
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={(e) => handleDragEnd(e, index)}
            >
              <Card className="shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {BLOCK_TYPES.find(bt => bt.value === block.type)?.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBlock(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderBlockEditor(block, index)}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>


      </div>

      {/* Collapsible Block Palette */}
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
          </div>
        )}
      </div>
    </div>
  );
}