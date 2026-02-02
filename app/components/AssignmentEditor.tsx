'use client';

import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  CheckSquare,
  MessageSquare,
  Type,
  Move,
  ListOrdered,
  Link,
  Save,
  Plus,
  GripVertical,
  PenTool,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Sparkles,
  Send,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/app-context';
import { useRouter } from 'next/navigation';

interface BlockTemplate {
  id: string;
  type: string;
  icon: React.ReactNode;
  label: string;
  defaultData: any;
}

interface AssignmentBlock {
  id: string;
  type: string;
  position: number;
  width?: 'full' | 'half';
  column?: 'left' | 'right';
  data: any;
}

interface AssignmentEditorProps {
  assignmentId: string;
  subjectId: string;
  chapterId: string;
  paragraphId: string;
  initialBlocks?: AssignmentBlock[];
  onSave?: (blocks: AssignmentBlock[]) => void;
  onPreview?: () => void;
}

const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    id: 'text',
    type: 'text',
    icon: <Type className="h-4 w-4" />,
    label: 'Text',
    defaultData: { content: '', style: 'normal' }
  },
  {
    id: 'multiple_choice',
    type: 'multiple_choice',
    icon: <CheckSquare className="h-4 w-4" />,
    label: 'Multiple Choice',
    defaultData: {
      question: '',
      options: [
        { id: 'a', text: '', correct: false },
        { id: 'b', text: '', correct: false },
        { id: 'c', text: '', correct: true },
        { id: 'd', text: '', correct: false }
      ],
      multiple_correct: false,
      shuffle: true
    }
  },
  {
    id: 'open_question',
    type: 'open_question',
    icon: <MessageSquare className="h-4 w-4" />,
    label: 'Open Question',
    defaultData: {
      question: '',
      ai_grading: true,
      grading_criteria: '',
      max_score: 5
    }
  },
  {
    id: 'fill_in_blank',
    type: 'fill_in_blank',
    icon: <FileText className="h-4 w-4" />,
    label: 'Fill Blank',
    defaultData: {
      text: 'The answer is ___.',
      answers: [''],
      case_sensitive: false
    }
  },
  {
    id: 'drag_drop',
    type: 'drag_drop',
    icon: <Move className="h-4 w-4" />,
    label: 'Drag & Drop',
    defaultData: {
      prompt: '',
      pairs: [
        { left: '', right: '' },
        { left: '', right: '' }
      ]
    }
  },
  {
    id: 'ordering',
    type: 'ordering',
    icon: <ListOrdered className="h-4 w-4" />,
    label: 'Ordering',
    defaultData: {
      prompt: '',
      items: ['', '', ''],
      correct_order: [0, 1, 2]
    }
  },
  {
    id: 'media_embed',
    type: 'media_embed',
    icon: <Link className="h-4 w-4" />,
    label: 'Media',
    defaultData: {
      embed_url: '',
      description: ''
    }
  }
];

export function AssignmentEditor({
  assignmentId,
  subjectId,
  chapterId,
  paragraphId,
  initialBlocks = [],
  onSave,
  onPreview
}: AssignmentEditorProps) {
  const [blocks, setBlocks] = useState<AssignmentBlock[]>(initialBlocks);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);
  const [draggedTemplate, setDraggedTemplate] = useState<BlockTemplate | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ index: number; column?: 'left' | 'right' } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [history, setHistory] = useState<AssignmentBlock[][]>([initialBlocks]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const paperRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Save to history
  const saveToHistory = useCallback((newBlocks: AssignmentBlock[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newBlocks]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setHasUnsavedChanges(true);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setBlocks(history[historyIndex - 1]);
      setHasUnsavedChanges(true);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setBlocks(history[historyIndex + 1]);
      setHasUnsavedChanges(true);
    }
  }, [historyIndex, history]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              redo();
            } else {
              e.preventDefault();
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Auto-save
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => handleSave(), 5000);
      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, blocks]);

  const updateBlock = (blockId: string, newData: any) => {
    setBlocks(prev => {
      const newBlocks = prev.map(block =>
        block.id === blockId ? { ...block, data: newData } : block
      );
      saveToHistory(newBlocks);
      return newBlocks;
    });
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(prev => {
      const newBlocks = prev.filter(block => block.id !== blockId)
        .map((block, index) => ({ ...block, position: index }));
      saveToHistory(newBlocks);
      return newBlocks;
    });
    setSelectedBlock(null);
  };

  const addBlock = (template: BlockTemplate, insertIndex?: number, column?: 'left' | 'right') => {
    const position = insertIndex !== undefined ? insertIndex : blocks.length;
    const newBlock: AssignmentBlock = {
      id: `block-${Date.now()}`,
      type: template.type,
      position,
      width: column ? 'half' : 'full',
      column,
      data: { ...template.defaultData }
    };
    
    setBlocks(prev => {
      let newBlocks = [...prev];
      if (insertIndex !== undefined) {
        newBlocks.splice(insertIndex, 0, newBlock);
        newBlocks = newBlocks.map((block, index) => ({ ...block, position: index }));
      } else {
        newBlocks.push(newBlock);
      }
      saveToHistory(newBlocks);
      return newBlocks;
    });
  };

  const addOption = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (block && block.type === 'multiple_choice') {
      const newOptionId = String.fromCharCode(97 + block.data.options.length);
      const newOptions = [...block.data.options, { id: newOptionId, text: '', correct: false }];
      updateBlock(blockId, { ...block.data, options: newOptions });
    }
  };

  const removeOption = (blockId: string, optionIndex: number) => {
    const block = blocks.find(b => b.id === blockId);
    if (block && block.type === 'multiple_choice' && block.data.options.length > 2) {
      const newOptions = block.data.options.filter((_: any, i: number) => i !== optionIndex);
      updateBlock(blockId, { ...block.data, options: newOptions });
    }
  };

  const handleDragStart = (e: React.DragEvent, blockId?: string, template?: BlockTemplate) => {
    if (blockId) {
      setDraggedBlock(blockId);
    } else if (template) {
      setDraggedTemplate(template);
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number, column?: 'left' | 'right') => {
    e.preventDefault();
    setDropIndicator({ index, column });
  };

  const handleDrop = (e: React.DragEvent, index: number, column?: 'left' | 'right') => {
    e.preventDefault();
    
    if (draggedTemplate) {
      addBlock(draggedTemplate, index, column);
    } else if (draggedBlock) {
      // Move existing block
      setBlocks(prev => {
        const blockToMove = prev.find(b => b.id === draggedBlock);
        if (!blockToMove) return prev;
        
        const filtered = prev.filter(b => b.id !== draggedBlock);
        const updatedBlock = { 
          ...blockToMove, 
          width: column ? 'half' as const : 'full' as const,
          column 
        };
        
        filtered.splice(index, 0, updatedBlock);
        const newBlocks = filtered.map((block, i) => ({ ...block, position: i }));
        saveToHistory(newBlocks);
        return newBlocks;
      });
    }
    
    setDraggedBlock(null);
    setDraggedTemplate(null);
    setDropIndicator(null);
  };

  const handleDragEnd = () => {
    setDraggedBlock(null);
    setDraggedTemplate(null);
    setDropIndicator(null);
  };

  const handleSave = async () => {
    if (!assignmentId || assignmentId === 'undefined') {
      toast({
        title: 'Cannot Save',
        description: 'Assignment ID is missing.',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      for (const block of blocks) {
        const response = await fetch(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: block.type,
              position: block.position,
              data: block.data
            })
          }
        );
        if (!response.ok) throw new Error(`Failed to save block ${block.id}`);
      }

      setHasUnsavedChanges(false);
      toast({ title: 'Saved' });
      if (onSave) onSave(blocks);
    } catch (error) {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      version: '1.0',
      blocks: blocks.map(b => ({
        type: b.type,
        width: b.width,
        column: b.column,
        data: b.data
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assignment-${assignmentId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Exported successfully' });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.blocks && Array.isArray(data.blocks)) {
          const importedBlocks = data.blocks.map((b: any, index: number) => ({
            id: `block-${Date.now()}-${index}`,
            type: b.type,
            position: index,
            width: b.width || 'full',
            column: b.column,
            data: b.data
          }));
          
          setBlocks(importedBlocks);
          saveToHistory(importedBlocks);
          toast({ title: 'Imported successfully' });
        }
      } catch (error) {
        toast({ title: 'Invalid file format', variant: 'destructive' });
      }
    };
    input.click();
  };

  const renderBlockContent = (block: AssignmentBlock) => {
    switch (block.type) {
      case 'text':
        return (
          <Textarea
            value={block.data.content}
            onChange={(e) => updateBlock(block.id, { ...block.data, content: e.target.value })}
            placeholder="Enter text..."
            className="min-h-[80px] border-0 shadow-none resize-none focus-visible:ring-0 bg-transparent"
          />
        );

      case 'multiple_choice':
        return (
          <div className="space-y-3">
            <Input
              value={block.data.question}
              onChange={(e) => updateBlock(block.id, { ...block.data, question: e.target.value })}
              placeholder="Enter question..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent font-medium"
            />
            <div className="space-y-2 pl-2">
              {block.data.options?.map((option: any, idx: number) => (
                <div key={option.id} className="flex items-center gap-2 group">
                  <Checkbox
                    checked={option.correct}
                    onCheckedChange={(checked) => {
                      const newOptions = [...block.data.options];
                      newOptions[idx] = { ...newOptions[idx], correct: checked };
                      updateBlock(block.id, { ...block.data, options: newOptions });
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-muted-foreground w-4">{String.fromCharCode(65 + idx)}.</span>
                  <Input
                    value={option.text}
                    onChange={(e) => {
                      const newOptions = [...block.data.options];
                      newOptions[idx] = { ...newOptions[idx], text: e.target.value };
                      updateBlock(block.id, { ...block.data, options: newOptions });
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    className="flex-1 border-0 shadow-none h-8 focus-visible:ring-0 bg-transparent"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(block.id, idx)}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addOption(block.id)}
                className="text-xs text-muted-foreground h-7"
              >
                <Plus className="h-3 w-3 mr-1" /> Add option
              </Button>
            </div>
          </div>
        );

      case 'open_question':
        return (
          <div className="space-y-3">
            <Input
              value={block.data.question}
              onChange={(e) => updateBlock(block.id, { ...block.data, question: e.target.value })}
              placeholder="Enter question..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent font-medium"
            />
            <div className="border-b border-dashed border-border min-h-[60px] flex items-end pb-1">
              <span className="text-xs text-muted-foreground">Answer space ({block.data.max_score} pts)</span>
            </div>
          </div>
        );

      case 'fill_in_blank':
        return (
          <div className="space-y-2">
            <Textarea
              value={block.data.text}
              onChange={(e) => updateBlock(block.id, { ...block.data, text: e.target.value })}
              placeholder="Use ___ for blanks (e.g., The capital of France is ___.)"
              className="min-h-[60px] border-0 shadow-none resize-none focus-visible:ring-0 bg-transparent"
            />
            <div className="text-xs text-muted-foreground">
              Answers: {block.data.answers?.join(', ') || 'Not set'}
            </div>
          </div>
        );

      case 'drag_drop':
        return (
          <div className="space-y-3">
            <Input
              value={block.data.prompt}
              onChange={(e) => updateBlock(block.id, { ...block.data, prompt: e.target.value })}
              placeholder="Match the items..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent font-medium"
            />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                {block.data.pairs?.map((pair: any, idx: number) => (
                  <div key={idx} className="p-2 bg-muted/50 rounded">{pair.left || `Item ${idx + 1}`}</div>
                ))}
              </div>
              <div className="space-y-1">
                {block.data.pairs?.map((pair: any, idx: number) => (
                  <div key={idx} className="p-2 bg-muted/50 rounded">{pair.right || `Match ${idx + 1}`}</div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'ordering':
        return (
          <div className="space-y-3">
            <Input
              value={block.data.prompt}
              onChange={(e) => updateBlock(block.id, { ...block.data, prompt: e.target.value })}
              placeholder="Put these in order..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent font-medium"
            />
            <div className="space-y-1">
              {block.data.items?.map((item: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-4">{idx + 1}.</span>
                  <Input
                    value={item}
                    onChange={(e) => {
                      const newItems = [...block.data.items];
                      newItems[idx] = e.target.value;
                      updateBlock(block.id, { ...block.data, items: newItems });
                    }}
                    placeholder={`Item ${idx + 1}`}
                    className="flex-1 border-0 shadow-none h-8 focus-visible:ring-0 bg-transparent"
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'media_embed':
        return (
          <div className="space-y-2">
            <Input
              value={block.data.embed_url}
              onChange={(e) => updateBlock(block.id, { ...block.data, embed_url: e.target.value })}
              placeholder="Enter video URL..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent"
            />
            <Input
              value={block.data.description}
              onChange={(e) => updateBlock(block.id, { ...block.data, description: e.target.value })}
              placeholder="Description..."
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm"
            />
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            {block.type} block
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top toolbar - minimal */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-8 px-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={historyIndex === 0}
            className="h-8 px-2"
            title="Undo"
          >
            ↶
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="h-8 px-2"
            title="Redo"
          >
            ↷
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="h-8 px-2"
            title="Export"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleImport}
            className="h-8 px-2"
            title="Import"
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-orange-500">Unsaved</span>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8"
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Block sidebar - collapsed by default */}
        <div className={`border-r bg-muted/30 transition-all duration-200 flex flex-col ${isSidebarOpen ? 'w-48' : 'w-12'}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="h-10 w-full rounded-none border-b"
          >
            {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          
          <div className="flex-1 overflow-y-auto p-2">
            {isSidebarOpen ? (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">Blocks</div>
                {BLOCK_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center gap-2 p-2 rounded cursor-grab hover:bg-muted border border-transparent hover:border-border"
                    draggable
                    onDragStart={(e) => handleDragStart(e, undefined, template)}
                    onDragEnd={handleDragEnd}
                  >
                    {template.icon}
                    <span className="text-sm">{template.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                {BLOCK_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className="p-2 rounded cursor-grab hover:bg-muted"
                    draggable
                    onDragStart={(e) => handleDragStart(e, undefined, template)}
                    onDragEnd={handleDragEnd}
                    title={template.label}
                  >
                    {template.icon}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Paper area - wide and left-aligned */}
        <div className="flex-1 overflow-auto p-4 bg-muted/20">
          <div
            ref={paperRef}
            className="bg-background border border-border rounded shadow-sm min-h-[calc(100vh-120px)] max-w-5xl p-8"
            onDragOver={(e) => {
              e.preventDefault();
              if (blocks.length === 0) {
                setDropIndicator({ index: 0 });
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (blocks.length === 0 && (draggedTemplate || draggedBlock)) {
                if (draggedTemplate) {
                  addBlock(draggedTemplate, 0);
                }
              }
              setDropIndicator(null);
            }}
          >
            {blocks.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <p className="mb-2">No content yet</p>
                  <p className="text-sm">Drag blocks from the sidebar</p>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {blocks.map((block, index) => (
                  <React.Fragment key={block.id}>
                    {/* Drop indicator before block */}
                    <div
                      className={`h-1 -mx-2 transition-all ${
                        dropIndicator?.index === index 
                          ? 'bg-primary/50' 
                          : 'bg-transparent hover:bg-muted'
                      }`}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                    />
                    
                    {/* Block */}
                    <div
                      className={`group relative p-4 border rounded transition-all ${
                        selectedBlock === block.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-transparent hover:border-border'
                      } ${draggedBlock === block.id ? 'opacity-50' : ''}`}
                      onClick={() => setSelectedBlock(selectedBlock === block.id ? null : block.id)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, block.id)}
                      onDragEnd={handleDragEnd}
                    >
                      {/* Block controls */}
                      <div className={`absolute -top-3 right-2 flex gap-1 bg-background border rounded-full px-1 py-0.5 shadow-sm transition-opacity ${
                        selectedBlock === block.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          title="Move"
                        >
                          <GripVertical className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setEditingBlock(block.id); }}
                          className="h-5 w-5 p-0"
                          title="Edit"
                        >
                          <PenTool className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                          className="h-5 w-5 p-0 text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* Block content */}
                      {renderBlockContent(block)}
                    </div>
                  </React.Fragment>
                ))}
                
                {/* Drop indicator after last block */}
                <div
                  className={`h-1 -mx-2 transition-all ${
                    dropIndicator?.index === blocks.length 
                      ? 'bg-primary/50' 
                      : 'bg-transparent hover:bg-muted'
                  }`}
                  onDragOver={(e) => handleDragOver(e, blocks.length)}
                  onDrop={(e) => handleDrop(e, blocks.length)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editingBlock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingBlock(null)}>
          <div className="bg-background rounded-lg shadow-xl border max-w-xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-medium">Edit Block</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingBlock(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              {(() => {
                const block = blocks.find(b => b.id === editingBlock);
                if (!block) return null;

                switch (block.type) {
                  case 'text':
                    return (
                      <div className="space-y-3">
                        <Label>Content</Label>
                        <Textarea
                          value={block.data.content}
                          onChange={(e) => updateBlock(block.id, { ...block.data, content: e.target.value })}
                          rows={6}
                        />
                      </div>
                    );

                  case 'multiple_choice':
                    return (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Question</Label>
                          <Input
                            value={block.data.question}
                            onChange={(e) => updateBlock(block.id, { ...block.data, question: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Options (check correct answer)</Label>
                          {block.data.options?.map((option: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Checkbox
                                checked={option.correct}
                                onCheckedChange={(checked) => {
                                  const newOptions = [...block.data.options];
                                  newOptions[idx] = { ...newOptions[idx], correct: checked };
                                  updateBlock(block.id, { ...block.data, options: newOptions });
                                }}
                              />
                              <Input
                                value={option.text}
                                onChange={(e) => {
                                  const newOptions = [...block.data.options];
                                  newOptions[idx] = { ...newOptions[idx], text: e.target.value };
                                  updateBlock(block.id, { ...block.data, options: newOptions });
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(block.id, idx)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => addOption(block.id)}>
                            <Plus className="h-4 w-4 mr-1" /> Add Option
                          </Button>
                        </div>
                      </div>
                    );

                  case 'open_question':
                    return (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Question</Label>
                          <Textarea
                            value={block.data.question}
                            onChange={(e) => updateBlock(block.id, { ...block.data, question: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Score</Label>
                          <Input
                            type="number"
                            min="1"
                            value={block.data.max_score}
                            onChange={(e) => updateBlock(block.id, { ...block.data, max_score: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Grading Criteria</Label>
                          <Textarea
                            value={block.data.grading_criteria}
                            onChange={(e) => updateBlock(block.id, { ...block.data, grading_criteria: e.target.value })}
                            placeholder="What makes a good answer?"
                            rows={2}
                          />
                        </div>
                      </div>
                    );

                  case 'fill_in_blank':
                    return (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Text (use ___ for blanks)</Label>
                          <Textarea
                            value={block.data.text}
                            onChange={(e) => updateBlock(block.id, { ...block.data, text: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Correct Answers</Label>
                          {block.data.text.split('___').slice(0, -1).map((_: string, idx: number) => (
                            <Input
                              key={idx}
                              value={block.data.answers?.[idx] || ''}
                              onChange={(e) => {
                                const newAnswers = [...(block.data.answers || [])];
                                newAnswers[idx] = e.target.value;
                                updateBlock(block.id, { ...block.data, answers: newAnswers });
                              }}
                              placeholder={`Answer ${idx + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    );

                  case 'drag_drop':
                    return (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Prompt</Label>
                          <Input
                            value={block.data.prompt}
                            onChange={(e) => updateBlock(block.id, { ...block.data, prompt: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Matching Pairs</Label>
                          {block.data.pairs?.map((pair: any, idx: number) => (
                            <div key={idx} className="grid grid-cols-2 gap-2">
                              <Input
                                value={pair.left}
                                onChange={(e) => {
                                  const newPairs = [...block.data.pairs];
                                  newPairs[idx] = { ...newPairs[idx], left: e.target.value };
                                  updateBlock(block.id, { ...block.data, pairs: newPairs });
                                }}
                                placeholder={`Item ${idx + 1}`}
                              />
                              <Input
                                value={pair.right}
                                onChange={(e) => {
                                  const newPairs = [...block.data.pairs];
                                  newPairs[idx] = { ...newPairs[idx], right: e.target.value };
                                  updateBlock(block.id, { ...block.data, pairs: newPairs });
                                }}
                                placeholder={`Match ${idx + 1}`}
                              />
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPairs = [...(block.data.pairs || []), { left: '', right: '' }];
                              updateBlock(block.id, { ...block.data, pairs: newPairs });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Pair
                          </Button>
                        </div>
                      </div>
                    );

                  case 'ordering':
                    return (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Prompt</Label>
                          <Input
                            value={block.data.prompt}
                            onChange={(e) => updateBlock(block.id, { ...block.data, prompt: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Items (in correct order)</Label>
                          {block.data.items?.map((item: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                              <Input
                                value={item}
                                onChange={(e) => {
                                  const newItems = [...block.data.items];
                                  newItems[idx] = e.target.value;
                                  updateBlock(block.id, { ...block.data, items: newItems });
                                }}
                              />
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newItems = [...(block.data.items || []), ''];
                              updateBlock(block.id, { ...block.data, items: newItems });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Item
                          </Button>
                        </div>
                      </div>
                    );

                  case 'media_embed':
                    return (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>URL</Label>
                          <Input
                            value={block.data.embed_url}
                            onChange={(e) => updateBlock(block.id, { ...block.data, embed_url: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={block.data.description}
                            onChange={(e) => updateBlock(block.id, { ...block.data, description: e.target.value })}
                          />
                        </div>
                      </div>
                    );

                  default:
                    return <p className="text-muted-foreground">No editor for this block type</p>;
                }
              })()}
            </div>
            <div className="p-4 border-t flex justify-end">
              <Button onClick={() => setEditingBlock(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
