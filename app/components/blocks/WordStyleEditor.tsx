'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Type,
  Image,
  HelpCircle,
  Eye,
  EyeOff,
  FileQuestion,
  ListChecks,
  Target,
  Move,
  Trash2,
  Settings
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { BlockRenderer } from './BlockRenderer';
import { BaseBlock, BlockType, BlockContent } from './types';

interface WordStyleEditorProps {
  assignmentId: string;
  isTeacher?: boolean;
  className?: string;
}

type TemplateType =
  | 'multiple_choice'
  | 'open_question'
  | 'fill_in_blank'
  | 'drag_drop'
  | 'ordering'
  | 'image'
  | 'text'
  | 'video';

interface Template {
  id: TemplateType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'question' | 'media' | 'content';
}

const templates: Template[] = [
  {
    id: 'multiple_choice',
    name: 'Multiple Choice',
    description: 'Question with selectable answers',
    icon: ListChecks,
    category: 'question'
  },
  {
    id: 'open_question',
    name: 'Open Question',
    description: 'Free-form text answer',
    icon: FileQuestion,
    category: 'question'
  },
  {
    id: 'fill_in_blank',
    name: 'Fill in Blank',
    description: 'Complete the missing words',
    icon: Target,
    category: 'question'
  },
  {
    id: 'drag_drop',
    name: 'Drag & Drop',
    description: 'Match items by dragging',
    icon: Move,
    category: 'question'
  },
  {
    id: 'ordering',
    name: 'Ordering',
    description: 'Arrange items in correct order',
    icon: ListChecks,
    category: 'question'
  },
  {
    id: 'image',
    name: 'Image',
    description: 'Add an image to the assignment',
    icon: Image,
    category: 'media'
  },
  {
    id: 'text',
    name: 'Text Block',
    description: 'Add explanatory text',
    icon: Type,
    category: 'content'
  }
];

export const WordStyleEditor: React.FC<WordStyleEditorProps> = ({
  assignmentId,
  isTeacher = true,
  className
}) => {
  const [blocks, setBlocks] = useState<BaseBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStudentView, setShowStudentView] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [templateInsertIndex, setTemplateInsertIndex] = useState<number | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch blocks on mount
  useEffect(() => {
    fetchBlocks();
  }, [assignmentId]);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      // For now, simulate fetching - this would be replaced with actual API call
      setBlocks([]);
    } catch (error) {
      console.error('Failed to fetch blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBlock = async (type: BlockType, content: BlockContent, orderIndex: number) => {
    try {
      // Simulate API call
      const newBlock: BaseBlock = {
        id: `block-${Date.now()}`,
        type,
        content,
        order_index: orderIndex,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setBlocks(prev => {
        const newBlocks = [...prev];
        newBlocks.splice(orderIndex, 0, newBlock);
        return newBlocks;
      });

      return newBlock;
    } catch (error) {
      console.error('Failed to create block:', error);
      return null;
    }
  };

  const updateBlock = async (blockId: string, updates: Partial<BaseBlock>) => {
    try {
      setBlocks(prev => prev.map(block =>
        block.id === blockId ? { ...block, ...updates } : block
      ));
      return true;
    } catch (error) {
      console.error('Failed to update block:', error);
      return false;
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      setBlocks(prev => prev.filter(block => block.id !== blockId));
    } catch (error) {
      console.error('Failed to delete block:', error);
    }
  };

  const reorderBlocks = async (blockIds: string[]) => {
    try {
      // Simulate API call
      console.log('Reordering blocks:', blockIds);
    } catch (error) {
      console.error('Failed to reorder blocks:', error);
    }
  };

  const getDefaultContent = (type: BlockType): BlockContent => {
    switch (type) {
      case 'multiple_choice':
        return {
          question: 'Enter your question here...',
          options: [
            { id: 'a', text: 'Option A', correct: false },
            { id: 'b', text: 'Option B', correct: false },
            { id: 'c', text: 'Option C', correct: false },
            { id: 'd', text: 'Option D', correct: false }
          ],
          multiple_correct: false,
          shuffle: false
        };
      case 'open_question':
        return {
          question: 'Enter your question here...',
          ai_grading: true,
          grading_criteria: 'Evaluate based on accuracy, clarity, and completeness.',
          max_score: 10
        };
      case 'fill_in_blank':
        return {
          text: 'Complete this sentence: The capital of France is ___',
          answers: ['Paris'],
          case_sensitive: false
        };
      case 'drag_drop':
        return {
          prompt: 'Match the following items:',
          pairs: [
            { left: 'Word 1', right: 'Definition 1' },
            { left: 'Word 2', right: 'Definition 2' }
          ]
        };
      case 'ordering':
        return {
          prompt: 'Arrange these events in chronological order:',
          items: ['Event A', 'Event B', 'Event C'],
          correct_order: [0, 1, 2]
        };
      case 'image':
        return {
          url: '',
          caption: 'Add a caption...',
          transform: { x: 0, y: 0, scale: 1, rotation: 0 }
        };
      case 'text':
        return {
          content: 'Click here to start typing...',
          style: 'normal'
        };
      default:
        return { content: '', style: 'normal' };
    }
  };

  const handleTemplateSelect = (templateId: TemplateType, insertIndex: number) => {
    const content = getDefaultContent(templateId);
    createBlock(templateId, content, insertIndex);
    setShowTemplateMenu(false);
    setTemplateInsertIndex(null);
  };

  const handleBlockClick = (index: number) => {
    if (isTeacher) {
      setTemplateInsertIndex(index);
      setShowTemplateMenu(true);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedBlockId) return;

    const draggedIndex = blocks.findIndex(block => block.id === draggedBlockId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) return;

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(dropIndex, 0, draggedBlock);

    setBlocks(newBlocks);
    setDraggedBlockId(null);
    setDragOverIndex(null);

    const blockIds = newBlocks.map(block => block.id);
    reorderBlocks(blockIds);
  };

  const handleDragEnd = () => {
    setDraggedBlockId(null);
    setDragOverIndex(null);
  };

  const renderStudentView = () => (
    <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold">Student View Preview</h3>
      </div>
      {blocks.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          This assignment has no content yet. Add some blocks to see the preview.
        </p>
      ) : (
        <div className="space-y-4">
          {blocks.map((block, index) => (
            <Card key={block.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <BlockRenderer
                  block={block}
                  onUpdate={() => {}} // Read-only in student view
                  onDelete={() => {}}
                  isEditing={false}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  return (
    <div className={`word-style-editor ${className}`}>
      {/* Header with student view toggle */}
      {isTeacher && (
        <div className="flex items-center justify-between mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Assignment Editor</h2>
            <Badge variant="outline" className="flex items-center gap-1">
              {showStudentView ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {showStudentView ? 'Student View' : 'Teacher View'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Student View</span>
            <Switch
              checked={showStudentView}
              onCheckedChange={setShowStudentView}
            />
          </div>
        </div>
      )}

      {showStudentView ? (
        renderStudentView()
      ) : (
        <div className="space-y-4">
          {/* Template insertion menu */}
          {showTemplateMenu && templateInsertIndex !== null && (
            <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Choose a template to insert:</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowTemplateMenu(false);
                      setTemplateInsertIndex(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground capitalize">
                        {category}
                      </h4>
                      {categoryTemplates.map((template) => {
                        const Icon = template.icon;
                        return (
                          <Button
                            key={template.id}
                            variant="outline"
                            className="w-full justify-start h-auto p-3"
                            onClick={() => handleTemplateSelect(template.id, templateInsertIndex)}
                          >
                            <div className="flex items-start gap-3 w-full">
                              <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                              <div className="text-left">
                                <div className="font-medium">{template.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {template.description}
                                </div>
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blocks area */}
          <div className="min-h-[400px] space-y-2">
            {blocks.length === 0 ? (
              <Card
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => handleBlockClick(0)}
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Plus className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Start creating your assignment
                  </h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Click here to add your first question or content block
                  </p>
                </CardContent>
              </Card>
            ) : (
              blocks.map((block, index) => (
                <div key={block.id}>
                  {/* Insertion point */}
                  <div
                    className="h-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center"
                    onClick={() => handleBlockClick(index)}
                  >
                    <Plus className="h-4 w-4 text-gray-400 opacity-0 hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Block */}
                  <Card
                    className={`relative group ${dragOverIndex === index ? 'ring-2 ring-blue-500' : ''}`}
                    draggable={isTeacher}
                    onDragStart={(e) => handleDragStart(e, block.id)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <CardContent className="p-4">
                      <BlockRenderer
                        block={block}
                        onUpdate={(content) => updateBlock(block.id, { content })}
                        onDelete={() => deleteBlock(block.id)}
                        isEditing={true}
                      />

                      {/* Block controls */}
                      {isTeacher && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBlock(block.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))
            )}

            {/* Final insertion point */}
            {blocks.length > 0 && (
              <div
                className="h-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center"
                onClick={() => handleBlockClick(blocks.length)}
              >
                <Plus className="h-4 w-4 text-gray-400 opacity-0 hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};