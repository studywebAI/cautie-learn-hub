'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  width: 'full' | 'half';
  column?: 'left' | 'right';
  rowId: string; // Group blocks in same row
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

const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateRowId = () => `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function AssignmentEditor({
  assignmentId,
  subjectId,
  chapterId,
  paragraphId,
  initialBlocks = [],
  onSave,
  onPreview
}: AssignmentEditorProps) {
  // Normalize initialBlocks to have rowId
  const normalizedInitialBlocks = initialBlocks.map((b, i) => ({
    ...b,
    rowId: b.rowId || generateRowId(),
    width: b.width || 'full' as const,
    position: b.position ?? i
  }));

  const [blocks, setBlocks] = useState<AssignmentBlock[]>(normalizedInitialBlocks);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [history, setHistory] = useState<AssignmentBlock[][]>([normalizedInitialBlocks]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragSource, setDragSource] = useState<{ type: 'template' | 'block'; id: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ rowIndex: number; column?: 'left' | 'right' } | null>(null);
  
  const paperRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Group blocks by row
  const getRows = useCallback(() => {
    const rowMap = new Map<string, AssignmentBlock[]>();
    const rowOrder: string[] = [];
    
    // Sort blocks by position first
    const sortedBlocks = [...blocks].sort((a, b) => a.position - b.position);
    
    sortedBlocks.forEach(block => {
      if (!rowMap.has(block.rowId)) {
        rowMap.set(block.rowId, []);
        rowOrder.push(block.rowId);
      }
      rowMap.get(block.rowId)!.push(block);
    });
    
    return rowOrder.map(rowId => ({
      rowId,
      blocks: rowMap.get(rowId)!.sort((a, b) => 
        a.column === 'left' ? -1 : b.column === 'left' ? 1 : 0
      )
    }));
  }, [blocks]);

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
      const blockToDelete = prev.find(b => b.id === blockId);
      if (!blockToDelete) return prev;
      
      // If block is half-width, check if partner exists
      const sameRowBlocks = prev.filter(b => b.rowId === blockToDelete.rowId);
      let newBlocks = prev.filter(block => block.id !== blockId);
      
      // If partner exists, make it full width
      if (sameRowBlocks.length === 2) {
        newBlocks = newBlocks.map(b => 
          b.rowId === blockToDelete.rowId 
            ? { ...b, width: 'full' as const, column: undefined }
            : b
        );
      }
      
      // Recalculate positions
      newBlocks = newBlocks.map((block, index) => ({ ...block, position: index }));
      saveToHistory(newBlocks);
      return newBlocks;
    });
    setSelectedBlock(null);
  };

  const addBlock = (template: BlockTemplate, rowIndex: number, column?: 'left' | 'right') => {
    const rows = getRows();
    
    setBlocks(prev => {
      let newBlocks = [...prev];
      const newBlockId = generateId();
      
      if (column && rowIndex < rows.length) {
        // Dropping onto a specific column in an existing row
        const targetRow = rows[rowIndex];
        const existingBlockInColumn = targetRow.blocks.find(b => b.column === column);
        
        if (existingBlockInColumn) {
          // Replace side: existing block becomes new full-width row below
          const replacedBlock = { 
            ...existingBlockInColumn, 
            rowId: generateRowId(), 
            width: 'full' as const, 
            column: undefined 
          };
          
          // Remove the old block from its position
          newBlocks = newBlocks.filter(b => b.id !== existingBlockInColumn.id);
          
          // Add new block to the column
          const newBlock: AssignmentBlock = {
            id: newBlockId,
            type: template.type,
            position: 0,
            width: 'half',
            column,
            rowId: targetRow.rowId,
            data: { ...template.defaultData }
          };
          
          // Find insert position for replaced block (after current row)
          const insertAfterIndex = newBlocks.findIndex(b => b.rowId === targetRow.rowId);
          newBlocks.push(newBlock);
          
          // Insert replaced block after the row
          if (insertAfterIndex !== -1) {
            const rowBlocks = newBlocks.filter(b => b.rowId === targetRow.rowId);
            const afterRowIndex = Math.max(...rowBlocks.map(b => newBlocks.indexOf(b))) + 1;
            newBlocks.splice(afterRowIndex, 0, replacedBlock);
          } else {
            newBlocks.push(replacedBlock);
          }
        } else {
          // No block in column - check if row has a full-width block
          const fullWidthBlock = targetRow.blocks.find(b => b.width === 'full');
          
          if (fullWidthBlock) {
            // Convert full-width to half, add new block
            newBlocks = newBlocks.map(b => 
              b.id === fullWidthBlock.id 
                ? { ...b, width: 'half' as const, column: column === 'left' ? 'right' : 'left' as const }
                : b
            );
            
            const newBlock: AssignmentBlock = {
              id: newBlockId,
              type: template.type,
              position: 0,
              width: 'half',
              column,
              rowId: targetRow.rowId,
              data: { ...template.defaultData }
            };
            newBlocks.push(newBlock);
          } else {
            // Has half-width block on other side, just add to this column
            const newBlock: AssignmentBlock = {
              id: newBlockId,
              type: template.type,
              position: 0,
              width: 'half',
              column,
              rowId: targetRow.rowId,
              data: { ...template.defaultData }
            };
            newBlocks.push(newBlock);
          }
        }
      } else {
        // New full-width row
        const newRowId = generateRowId();
        const newBlock: AssignmentBlock = {
          id: newBlockId,
          type: template.type,
          position: rowIndex,
          width: 'full',
          rowId: newRowId,
          data: { ...template.defaultData }
        };
        
        // Insert at correct position
        const targetPosition = rowIndex < rows.length 
          ? prev.findIndex(b => b.rowId === rows[rowIndex].rowId)
          : prev.length;
        
        if (targetPosition === -1) {
          newBlocks.push(newBlock);
        } else {
          newBlocks.splice(targetPosition, 0, newBlock);
        }
      }
      
      // Recalculate positions
      newBlocks = newBlocks.map((block, index) => ({ ...block, position: index }));
      saveToHistory(newBlocks);
      return newBlocks;
    });
  };

  const moveBlock = (blockId: string, targetRowIndex: number, column?: 'left' | 'right') => {
    const rows = getRows();
    const sourceBlock = blocks.find(b => b.id === blockId);
    if (!sourceBlock) return;
    
    setBlocks(prev => {
      let newBlocks = [...prev];
      
      // First, handle the source row
      const sourceRowBlocks = prev.filter(b => b.rowId === sourceBlock.rowId && b.id !== blockId);
      if (sourceRowBlocks.length === 1) {
        // Partner becomes full width
        newBlocks = newBlocks.map(b => 
          b.id === sourceRowBlocks[0].id 
            ? { ...b, width: 'full' as const, column: undefined }
            : b
        );
      }
      
      // Remove source block temporarily
      newBlocks = newBlocks.filter(b => b.id !== blockId);
      
      if (column && targetRowIndex < rows.length) {
        const targetRow = rows[targetRowIndex];
        const existingBlockInColumn = targetRow.blocks.find(b => b.column === column && b.id !== blockId);
        
        if (existingBlockInColumn) {
          // Replace: existing becomes new row below
          const replacedBlock = { 
            ...existingBlockInColumn, 
            rowId: generateRowId(), 
            width: 'full' as const, 
            column: undefined 
          };
          
          newBlocks = newBlocks.filter(b => b.id !== existingBlockInColumn.id);
          
          const movedBlock: AssignmentBlock = {
            ...sourceBlock,
            width: 'half',
            column,
            rowId: targetRow.rowId
          };
          
          newBlocks.push(movedBlock);
          
          // Insert replaced after
          const insertPos = newBlocks.filter(b => b.rowId === targetRow.rowId).length > 0
            ? Math.max(...newBlocks.map((b, i) => b.rowId === targetRow.rowId ? i : -1)) + 1
            : newBlocks.length;
          newBlocks.splice(insertPos, 0, replacedBlock);
        } else {
          // Check for full-width block
          const fullWidthBlock = targetRow.blocks.find(b => b.width === 'full' && b.id !== blockId);
          
          if (fullWidthBlock) {
            newBlocks = newBlocks.map(b => 
              b.id === fullWidthBlock.id 
                ? { ...b, width: 'half' as const, column: column === 'left' ? 'right' : 'left' as const }
                : b
            );
          }
          
          const movedBlock: AssignmentBlock = {
            ...sourceBlock,
            width: 'half',
            column,
            rowId: targetRow.rowId
          };
          newBlocks.push(movedBlock);
        }
      } else {
        // New full-width row
        const newRowId = generateRowId();
        const movedBlock: AssignmentBlock = {
          ...sourceBlock,
          width: 'full',
          column: undefined,
          rowId: newRowId
        };
        
        const targetPosition = targetRowIndex < rows.length 
          ? newBlocks.findIndex(b => b.rowId === rows[targetRowIndex].rowId)
          : newBlocks.length;
        
        if (targetPosition === -1) {
          newBlocks.push(movedBlock);
        } else {
          newBlocks.splice(targetPosition, 0, movedBlock);
        }
      }
      
      // Recalculate positions
      newBlocks = newBlocks.map((block, index) => ({ ...block, position: index }));
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

  // Drag handlers for grip
  const handleGripMouseDown = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    setIsDragging(true);
    setDragSource({ type: 'block', id: blockId });
  };

  const handleTemplateMouseDown = (e: React.MouseEvent, templateId: string) => {
    e.preventDefault();
    setIsDragging(true);
    setDragSource({ type: 'template', id: templateId });
  };

  const handleMouseUp = () => {
    if (isDragging && dragSource && dropTarget !== null) {
      if (dragSource.type === 'template') {
        const template = BLOCK_TEMPLATES.find(t => t.id === dragSource.id);
        if (template) {
          addBlock(template, dropTarget.rowIndex, dropTarget.column);
        }
      } else {
        moveBlock(dragSource.id, dropTarget.rowIndex, dropTarget.column);
      }
    }
    setIsDragging(false);
    setDragSource(null);
    setDropTarget(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !paperRef.current) return;
    
    const paperRect = paperRef.current.getBoundingClientRect();
    const y = e.clientY - paperRect.top;
    const x = e.clientX - paperRect.left;
    
    const rows = getRows();
    
    // Calculate which row we're over
    let rowIndex = 0;
    let accumulatedHeight = 0;
    const rowHeight = 80; // Approximate row height
    
    rowIndex = Math.floor(y / rowHeight);
    rowIndex = Math.max(0, Math.min(rowIndex, rows.length));
    
    // Check if we're on left or right side
    const paperWidth = paperRect.width;
    let column: 'left' | 'right' | undefined = undefined;
    
    if (x < paperWidth * 0.4) {
      column = 'left';
    } else if (x > paperWidth * 0.6) {
      column = 'right';
    }
    
    setDropTarget({ rowIndex, column });
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, dragSource, dropTarget]);

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
              data: { ...block.data, width: block.width, column: block.column, rowId: block.rowId }
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
        rowId: b.rowId,
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
          const importedBlocks: AssignmentBlock[] = data.blocks.map((b: any, index: number) => ({
            id: generateId(),
            type: b.type,
            position: index,
            width: b.width || 'full',
            column: b.column,
            rowId: b.rowId || generateRowId(),
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
            className="min-h-[60px] border-0 shadow-none resize-none focus-visible:ring-0 bg-transparent"
          />
        );

      case 'multiple_choice':
        return (
          <div className="space-y-2">
            <Input
              value={block.data.question}
              onChange={(e) => updateBlock(block.id, { ...block.data, question: e.target.value })}
              placeholder="Enter question..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent font-medium"
            />
            <div className="space-y-1 pl-2">
              {block.data.options?.map((option: any, idx: number) => (
                <div key={option.id} className="flex items-center gap-2 group">
                  <Checkbox
                    checked={option.correct}
                    onCheckedChange={(checked) => {
                      const newOptions = [...block.data.options];
                      newOptions[idx] = { ...newOptions[idx], correct: checked };
                      updateBlock(block.id, { ...block.data, options: newOptions });
                    }}
                    className="h-3 w-3"
                  />
                  <span className="text-xs text-muted-foreground w-3">{String.fromCharCode(65 + idx)}.</span>
                  <Input
                    value={option.text}
                    onChange={(e) => {
                      const newOptions = [...block.data.options];
                      newOptions[idx] = { ...newOptions[idx], text: e.target.value };
                      updateBlock(block.id, { ...block.data, options: newOptions });
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    className="flex-1 border-0 shadow-none h-7 text-sm focus-visible:ring-0 bg-transparent"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(block.id, idx)}
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 text-muted-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addOption(block.id)}
                className="text-xs text-muted-foreground h-6"
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </div>
        );

      case 'open_question':
        return (
          <div className="space-y-2">
            <Input
              value={block.data.question}
              onChange={(e) => updateBlock(block.id, { ...block.data, question: e.target.value })}
              placeholder="Enter question..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent font-medium"
            />
            <div className="border-b border-dashed border-border min-h-[40px] flex items-end pb-1">
              <span className="text-xs text-muted-foreground">({block.data.max_score} pts)</span>
            </div>
          </div>
        );

      case 'fill_in_blank':
        return (
          <Textarea
            value={block.data.text}
            onChange={(e) => updateBlock(block.id, { ...block.data, text: e.target.value })}
            placeholder="Use ___ for blanks"
            className="min-h-[40px] border-0 shadow-none resize-none focus-visible:ring-0 bg-transparent text-sm"
          />
        );

      case 'drag_drop':
        return (
          <div className="space-y-2">
            <Input
              value={block.data.prompt}
              onChange={(e) => updateBlock(block.id, { ...block.data, prompt: e.target.value })}
              placeholder="Match the items..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent font-medium text-sm"
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {block.data.pairs?.slice(0, 3).map((pair: any, idx: number) => (
                <React.Fragment key={idx}>
                  <div className="p-1 bg-muted/50 rounded text-center">{pair.left || '...'}</div>
                  <div className="p-1 bg-muted/50 rounded text-center">{pair.right || '...'}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        );

      case 'ordering':
        return (
          <div className="space-y-2">
            <Input
              value={block.data.prompt}
              onChange={(e) => updateBlock(block.id, { ...block.data, prompt: e.target.value })}
              placeholder="Put in order..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent font-medium text-sm"
            />
            <div className="space-y-1">
              {block.data.items?.slice(0, 3).map((item: string, idx: number) => (
                <div key={idx} className="text-xs text-muted-foreground">{idx + 1}. {item || '...'}</div>
              ))}
            </div>
          </div>
        );

      case 'media_embed':
        return (
          <Input
            value={block.data.embed_url}
            onChange={(e) => updateBlock(block.id, { ...block.data, embed_url: e.target.value })}
            placeholder="Enter media URL..."
            className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm"
          />
        );

      default:
        return <div className="text-sm text-muted-foreground">{block.type}</div>;
    }
  };

  const rows = getRows();

  return (
    <div 
      className="h-screen flex flex-col bg-background select-none"
      onMouseMove={handleMouseMove}
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex === 0} className="h-8 px-2" title="Undo">
            ↶
          </Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1} className="h-8 px-2" title="Redo">
            ↷
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={handleExport} className="h-8 px-2" title="Export">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleImport} className="h-8 px-2" title="Import">
            <Upload className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && <span className="text-xs text-orange-500">Unsaved</span>}
          <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving} className="h-8">
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Block sidebar */}
        <div className={`border-r bg-muted/30 transition-all duration-200 flex flex-col ${isSidebarOpen ? 'w-44' : 'w-12'}`}>
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
                    onMouseDown={(e) => handleTemplateMouseDown(e, template.id)}
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
                    onMouseDown={(e) => handleTemplateMouseDown(e, template.id)}
                    title={template.label}
                  >
                    {template.icon}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Paper area */}
        <div className="flex-1 overflow-auto p-4 bg-muted/20">
          <div
            ref={paperRef}
            className="bg-background border border-border rounded shadow-sm min-h-[calc(100vh-120px)] max-w-5xl p-6 relative"
          >
            {rows.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <p className="mb-2">No content yet</p>
                  <p className="text-sm">Drag blocks from the sidebar</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((row, rowIndex) => (
                  <React.Fragment key={row.rowId}>
                    {/* Drop indicator before row */}
                    {isDragging && dropTarget?.rowIndex === rowIndex && !dropTarget.column && (
                      <div className="h-2 flex items-center justify-center">
                      <div className="w-4 h-4 bg-primary rounded-sm" />
                      </div>
                    )}
                    
                    {/* Row */}
                    <div className={`flex gap-2 ${row.blocks.some(b => b.width === 'half') ? '' : ''}`}>
                      {row.blocks[0]?.width === 'full' ? (
                        // Full width block
                        <div className="flex-1 relative group">
                          {/* Left drop zone */}
                          {isDragging && dropTarget?.rowIndex === rowIndex && dropTarget.column === 'left' && (
                            <div className="absolute left-0 top-0 bottom-0 w-1/2 flex items-center justify-center pointer-events-none z-10">
                            <div className="w-4 h-4 bg-primary rounded-sm" />
                            </div>
                          )}
                          {/* Right drop zone */}
                          {isDragging && dropTarget?.rowIndex === rowIndex && dropTarget.column === 'right' && (
                            <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-center pointer-events-none z-10">
                            <div className="w-4 h-4 bg-primary rounded-sm" />
                            </div>
                          )}
                          
                          <div
                            className={`p-3 border rounded transition-all ${
                              selectedBlock === row.blocks[0].id 
                                ? 'border-primary bg-primary/5' 
                                : 'border-transparent hover:border-border'
                            }`}
                            onClick={() => setSelectedBlock(selectedBlock === row.blocks[0].id ? null : row.blocks[0].id)}
                          >
                            {/* Controls */}
                            <div className={`absolute -top-2 right-2 flex gap-1 bg-background border rounded-full px-1 py-0.5 shadow-sm transition-opacity ${
                              selectedBlock === row.blocks[0].id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}>
                              <div 
                                className="h-5 w-5 p-0 flex items-center justify-center cursor-grab hover:bg-muted rounded"
                                onMouseDown={(e) => handleGripMouseDown(e, row.blocks[0].id)}
                              >
                                <GripVertical className="h-3 w-3" />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setEditingBlock(row.blocks[0].id); }}
                                className="h-5 w-5 p-0"
                              >
                                <PenTool className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); deleteBlock(row.blocks[0].id); }}
                                className="h-5 w-5 p-0 text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            {renderBlockContent(row.blocks[0])}
                          </div>
                        </div>
                      ) : (
                        // Half width blocks
                        <>
                          {['left', 'right'].map((col) => {
                            const block = row.blocks.find(b => b.column === col);
                            return (
                              <div key={col} className="flex-1 relative group min-h-[60px]">
                                {/* Drop indicator */}
                                {isDragging && dropTarget?.rowIndex === rowIndex && dropTarget.column === col && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="w-4 h-4 bg-primary rounded-sm" />
                                  </div>
                                )}
                                
                                {block ? (
                                  <div
                                    className={`h-full p-3 border rounded transition-all ${
                                      selectedBlock === block.id 
                                        ? 'border-primary bg-primary/5' 
                                        : 'border-transparent hover:border-border'
                                    }`}
                                    onClick={() => setSelectedBlock(selectedBlock === block.id ? null : block.id)}
                                  >
                                    {/* Controls */}
                                    <div className={`absolute -top-2 right-2 flex gap-1 bg-background border rounded-full px-1 py-0.5 shadow-sm transition-opacity ${
                                      selectedBlock === block.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    }`}>
                                      <div 
                                        className="h-5 w-5 p-0 flex items-center justify-center cursor-grab hover:bg-muted rounded"
                                        onMouseDown={(e) => handleGripMouseDown(e, block.id)}
                                      >
                                        <GripVertical className="h-3 w-3" />
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); setEditingBlock(block.id); }}
                                        className="h-5 w-5 p-0"
                                      >
                                        <PenTool className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                        className="h-5 w-5 p-0 text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    
                                    {renderBlockContent(block)}
                                  </div>
                                ) : (
                                  <div className="h-full border border-dashed border-muted-foreground/30 rounded flex items-center justify-center text-xs text-muted-foreground">
                                    Drop here
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </React.Fragment>
                ))}
                
                {/* Drop indicator after last row */}
                {isDragging && dropTarget?.rowIndex === rows.length && !dropTarget.column && (
                  <div className="h-2 flex items-center justify-center">
                    <div className="w-4 h-4 bg-primary rounded-sm" />
                  </div>
                )}
              </div>
            )}
            
            {/* Empty drop zone at bottom */}
            {isDragging && rows.length > 0 && (
              <div className="h-16 mt-4 border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center text-sm text-muted-foreground">
                Drop here for new row
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
                          <Label>Options</Label>
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
                              <Button variant="ghost" size="sm" onClick={() => removeOption(block.id, idx)} className="h-8 w-8 p-0">
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
                          <Label>Answers</Label>
                          {(block.data.text.match(/___/g) || []).map((_: string, idx: number) => (
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
                          <Label>Pairs</Label>
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
                            onClick={() => updateBlock(block.id, { ...block.data, pairs: [...block.data.pairs, { left: '', right: '' }] })}
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
                            onClick={() => updateBlock(block.id, { ...block.data, items: [...block.data.items, ''] })}
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
                    return <p className="text-muted-foreground">No editor available</p>;
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
