'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
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
  Plus,
  GripVertical,
  ArrowLeft,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Upload,
  X,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { AssignmentSettingsOverlay } from '@/components/AssignmentSettingsOverlay';
import { AIGradingPresets, GradingPreset, GradingPresetSettings } from '@/components/AIGradingPresets';
import { AssignmentSettings, DEFAULT_ASSIGNMENT_SETTINGS, DEFAULT_BLOCK_SETTINGS, normalizeAssignmentSettings, normalizeBlockSettings } from '@/lib/assignments/settings';

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
  size?: 1 | 2 | 3; // Visual width preset inside its slot (1=small, 2=medium, 3=full)
  column?: 'left' | 'right';
  rowId: string; // Group blocks in same row
  data: any;
  showFeedback?: boolean; // Whether to show correct/incorrect feedback
  aiGradingOverride?: Partial<GradingPresetSettings>; // Per-block AI grading settings
  settings?: any;
}

interface AssignmentEditorProps {
  assignmentId: string;
  subjectId: string;
  chapterId: string;
  paragraphId: string;
  initialBlocks?: AssignmentBlock[];
  answersEnabled?: boolean;
  isVisible?: boolean;
  answerMode?: 'view_only' | 'editable' | 'self_grade';
  aiGradingEnabled?: boolean;
  initialSettings?: AssignmentSettings | null;
  onSave?: (blocks: AssignmentBlock[]) => void;
  onPreview?: () => void;
  onSettingsChange?: (settings: { answersEnabled: boolean; isVisible: boolean; settings: AssignmentSettings }) => void;
  isTeacher?: boolean;
}

const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    id: 'text',
    type: 'text',
    icon: <Type className="h-4 w-4" />,
    label: 'Text',
    defaultData: { header: '', content: '', style: 'normal' }
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
      correct_answer: '',
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
      text: 'My shoes ___ 100 euros.',
      answers: ['cost'],
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
    id: 'matching',
    type: 'matching',
    icon: <Move className="h-4 w-4" />,
    label: 'Matching',
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
  answersEnabled = false,
  isVisible = true,
  answerMode = 'view_only',
  aiGradingEnabled = false,
  initialSettings = null,
  onSave,
  onPreview,
  onSettingsChange,
  isTeacher = true
}: AssignmentEditorProps) {
  const appContext = useContext(AppContext) as AppContextType | null;
  const isDutch = appContext?.language === 'nl';
  const t = {
    back: isDutch ? 'Terug' : 'Back',
    undo: isDutch ? 'Ongedaan' : 'Undo',
    redo: isDutch ? 'Opnieuw' : 'Redo',
    export: isDutch ? 'Download' : 'Export',
    import: isDutch ? 'Importeer' : 'Import',
    size: isDutch ? 'Grootte' : 'Size',
    edit: isDutch ? 'Bewerken' : 'Edit',
    on: isDutch ? 'Aan' : 'On',
    off: isDutch ? 'Uit' : 'Off',
    saving: isDutch ? 'opslaan...' : 'saving...',
    studentView: isDutch ? 'Leerlingweergave' : 'Student View',
    exitStudentView: isDutch ? 'Stop leerlingweergave' : 'Exit Student View',
    widthFor: isDutch ? 'Breedte voor' : 'Width for',
    selectBlockFirst: isDutch ? 'Selecteer eerst een blok' : 'Select a block first',
    noContentTitle: isDutch ? 'Nog geen inhoud' : 'No content yet',
    noContentHint: isDutch ? 'Gebruik het rechterpaneel om blokken toe te voegen' : 'Use the right panel to add blocks',
  };
  const getTemplateDefaults = (type: string) => {
    const template = BLOCK_TEMPLATES.find((item) => item.type === type);
    if (!template || typeof template.defaultData !== 'object' || template.defaultData === null) {
      return {};
    }
    return template.defaultData;
  };

  // Normalize initialBlocks to have rowId
  const normalizedInitialBlocks = useMemo(() => initialBlocks.map((b, i) => ({
    ...b,
    rowId: b.rowId || generateRowId(),
    width: b.width || 'full' as const,
    size: b.size || 3,
    position: b.position ?? i,
    showFeedback: b.showFeedback ?? false,
    settings: normalizeBlockSettings((b as any).settings || (b as any).data?.settings || {}),
    data: {
      ...getTemplateDefaults(b.type),
      ...(typeof b.data === 'object' && b.data !== null ? b.data : {}),
    },
  })), [initialBlocks]);

  const [blocks, setBlocks] = useState<AssignmentBlock[]>(normalizedInitialBlocks);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [history, setHistory] = useState<AssignmentBlock[][]>([normalizedInitialBlocks]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragSource, setDragSource] = useState<{ type: 'template' | 'block'; id: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ rowIndex: number; column?: 'left' | 'right' } | null>(null);
  
  // Settings state
  const [aiSettingsBlockId, setAiSettingsBlockId] = useState<string | null>(null);
  const [isStudentPreview, setIsStudentPreview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  const [localAnswersEnabled, setLocalAnswersEnabled] = useState(answersEnabled);
  const [localIsVisible, setLocalIsVisible] = useState(isVisible);
  const [localAnswerMode, setLocalAnswerMode] = useState<'view_only' | 'editable' | 'self_grade'>(answerMode);
  const [localAiGradingEnabled, setLocalAiGradingEnabled] = useState(aiGradingEnabled);
  const [localSettings, setLocalSettings] = useState<AssignmentSettings>(
    normalizeAssignmentSettings(initialSettings || DEFAULT_ASSIGNMENT_SETTINGS)
  );
  const blocksRef = useRef<AssignmentBlock[]>(normalizedInitialBlocks);
  const isSavingRef = useRef(false);
  const answersEnabledRef = useRef(localAnswersEnabled);
  const isVisibleRef = useRef(localIsVisible);
  const answerModeRef = useRef(localAnswerMode);
  const aiGradingEnabledRef = useRef(localAiGradingEnabled);
  const settingsRef = useRef(localSettings);

  useEffect(() => {
    setBlocks(normalizedInitialBlocks);
    setHistory([normalizedInitialBlocks]);
    setHistoryIndex(0);
    setSelectedBlock(null);
    setHoveredBlock(null);
    setHasUnsavedChanges(false);
  }, [normalizedInitialBlocks]);
  
  // AI Grading presets (stored locally for now - would come from API)
  const [gradingPresets, setGradingPresets] = useState<GradingPreset[]>([
    {
      id: 'default',
      name: 'Standard',
      is_default: true,
      settings: {
        strictness: 5,
        partial_credit: true,
        spelling_matters: false,
        grammar_matters: false,
        case_sensitive: false,
        custom_instructions: '',
        ai_enabled: true,
      }
    }
  ]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('default');
  
  const paperRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const showTeacherControls = isTeacher && !isStudentPreview && isEditMode;
  const selectedBlockRecord = selectedBlock ? blocks.find((b) => b.id === selectedBlock) || null : null;
  const handleEditModeToggle = () => {
    setIsEditMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedBlock(null);
        setHoveredBlock(null);
        setAiSettingsBlockId(null);
        setIsDragging(false);
        setDragSource(null);
        setDropTarget(null);
      }
      return next;
    });
  };

  useEffect(() => {
    setLocalAnswersEnabled(answersEnabled);
  }, [answersEnabled]);

  useEffect(() => {
    setLocalIsVisible(isVisible);
  }, [isVisible]);

  useEffect(() => {
    setLocalAnswerMode(answerMode);
  }, [answerMode]);

  useEffect(() => {
    setLocalAiGradingEnabled(aiGradingEnabled);
  }, [aiGradingEnabled]);

  useEffect(() => {
    setLocalSettings(normalizeAssignmentSettings(initialSettings || DEFAULT_ASSIGNMENT_SETTINGS));
  }, [initialSettings]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  useEffect(() => {
    answersEnabledRef.current = localAnswersEnabled;
  }, [localAnswersEnabled]);

  useEffect(() => {
    isVisibleRef.current = localIsVisible;
  }, [localIsVisible]);

  useEffect(() => {
    answerModeRef.current = localAnswerMode;
  }, [localAnswerMode]);

  useEffect(() => {
    aiGradingEnabledRef.current = localAiGradingEnabled;
  }, [localAiGradingEnabled]);

  useEffect(() => {
    settingsRef.current = localSettings;
  }, [localSettings]);

  // Toggle feedback visibility for a block
  const toggleBlockFeedback = (blockId: string) => {
    setBlocks(prev => {
      const newBlocks = prev.map(block =>
        block.id === blockId ? { ...block, showFeedback: !block.showFeedback } : block
      );
      saveToHistory(newBlocks);
      return newBlocks;
    });
  };

  // Update AI grading override for a block
  const updateBlockAiOverride = (blockId: string, override: Partial<GradingPresetSettings> | null) => {
    setBlocks(prev => {
      const newBlocks = prev.map(block =>
        block.id === blockId ? { ...block, aiGradingOverride: override || undefined } : block
      );
      saveToHistory(newBlocks);
      return newBlocks;
    });
  };

  // Handle settings change
  const handleSettingsChange = (updates: {
    answersEnabled?: boolean;
    isVisible?: boolean;
    answerMode?: 'view_only' | 'editable' | 'self_grade';
    aiGradingEnabled?: boolean;
  }) => {
    if (updates.answersEnabled !== undefined) setLocalAnswersEnabled(updates.answersEnabled);
    if (updates.isVisible !== undefined) setLocalIsVisible(updates.isVisible);
    if (updates.answerMode !== undefined) setLocalAnswerMode(updates.answerMode);
    if (updates.aiGradingEnabled !== undefined) setLocalAiGradingEnabled(updates.aiGradingEnabled);
    setHasUnsavedChanges(true);
    onSettingsChange?.({
      answersEnabled: updates.answersEnabled ?? localAnswersEnabled,
      isVisible: updates.isVisible ?? localIsVisible,
      settings: localSettings,
    });
  };

  const handleAdvancedSettingsChange = (next: AssignmentSettings) => {
    const normalized = normalizeAssignmentSettings(next);
    setLocalSettings(normalized);
    setHasUnsavedChanges(true);
    onSettingsChange?.({
      answersEnabled: localAnswersEnabled,
      isVisible: localIsVisible,
      settings: normalized,
    });
  };

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

  // Auto-save silently (no toast)
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => handleSilentSave(), 3000);
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

  const updateBlockSettings = (blockId: string, updater: (prev: any) => any) => {
    setBlocks((prev) => {
      const newBlocks = prev.map((block) => {
        if (block.id !== blockId) return block;
        const nextSettings = normalizeBlockSettings(updater(block.settings || DEFAULT_BLOCK_SETTINGS));
        return { ...block, settings: nextSettings };
      });
      saveToHistory(newBlocks);
      return newBlocks;
    });
  };

  const setBlockSize = (blockId: string, size: 1 | 2 | 3) => {
    setBlocks(prev => {
      const newBlocks = prev.map(block =>
        block.id === blockId ? { ...block, size } : block
      );
      saveToHistory(newBlocks);
      return newBlocks;
    });
  };

  const cycleBlockSize = (blockId: string) => {
    const currentSize = blocks.find((block) => block.id === blockId)?.size ?? 3;
    const nextSize = currentSize === 3 ? 2 : currentSize === 2 ? 1 : 3;
    setBlockSize(blockId, nextSize);
  };

  const getBlockWidthPercent = (block: AssignmentBlock) => {
    const size = block.size ?? 3;
    if (size === 1) return 38;
    if (size === 2) return 68;
    return 100;
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
    const newBlockId = generateId();
    
    setBlocks(prev => {
      let newBlocks = [...prev];
      
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
            data: { ...template.defaultData },
            settings: normalizeBlockSettings(DEFAULT_BLOCK_SETTINGS),
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
              data: { ...template.defaultData },
              settings: normalizeBlockSettings(DEFAULT_BLOCK_SETTINGS),
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
              data: { ...template.defaultData },
              settings: normalizeBlockSettings(DEFAULT_BLOCK_SETTINGS),
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
          data: { ...template.defaultData },
          settings: normalizeBlockSettings(DEFAULT_BLOCK_SETTINGS),
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
    setSelectedBlock(newBlockId);
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
  const startDragBlock = (blockId: string) => {
    setIsDragging(true);
    setDragSource({ type: 'block', id: blockId });
  };

  const startDragTemplate = (templateId: string) => {
    setIsDragging(true);
    setDragSource({ type: 'template', id: templateId });
  };

  const handleGripPointerDown = (e: React.PointerEvent, blockId: string) => {
    e.preventDefault();
    startDragBlock(blockId);
  };

  const handleTemplatePointerDown = (e: React.PointerEvent, templateId: string) => {
    e.preventDefault();
    startDragTemplate(templateId);
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

  const updateDropTargetFromPoint = (clientX: number, clientY: number) => {
    if (!isDragging || !paperRef.current) return;
    
    const paperRect = paperRef.current.getBoundingClientRect();
    const y = clientY - paperRect.top;
    const x = clientX - paperRect.left;
    
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

  const handlePointerMove = (e: React.PointerEvent) => {
    updateDropTargetFromPoint(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalPointerUp);
    };
  }, [isDragging, dragSource, dropTarget]);

  const handleSilentSave = useCallback(async () => {
    if (!assignmentId || assignmentId === 'undefined') return;
    if (isSavingRef.current) return;
    const blocksToPersist = blocksRef.current;

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      // Get existing blocks to determine which to update vs delete
      const existingResponse = await fetch(
        `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks`
      );
      if (!existingResponse.ok) {
        throw new Error('Failed to load existing assignment blocks');
      }
      const existingBlocks = existingResponse.ok ? await existingResponse.json() : [];
      const currentIds = new Set(blocksToPersist.map(b => b.id).filter(id => id !== undefined));

      // Delete blocks that are no longer present
      const blocksToDelete = existingBlocks.filter((b: any) => !currentIds.has(b.id));
      for (const blockToDelete of blocksToDelete) {
        const res = await fetch(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks/${blockToDelete.id}`,
          { method: 'DELETE' }
        );
        if (!res.ok) {
          throw new Error(`Failed to delete block ${blockToDelete.id}`);
        }
      }

      // Create or update blocks
      for (const block of blocksToPersist) {
        const payload = {
          type: block.type,
          position: block.position,
          data: block.data,
          settings: block.settings || DEFAULT_BLOCK_SETTINGS,
          locked: block.data?.locked ?? false,
          show_feedback: block.showFeedback || false,
          ai_grading_override: block.aiGradingOverride || null,
        };

        const isLocalId = String(block.id || '').startsWith('block-');
        if (block.id && !isLocalId) {
          const updateRes = await fetch(
            `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks/${block.id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }
          );
          if (!updateRes.ok) {
            throw new Error(`Failed to update block ${block.id}`);
          }
        } else {
          const createRes = await fetch(
            `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }
          );
          if (!createRes.ok) {
            throw new Error('Failed to create block');
          }
          const created = await createRes.json();
          setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, id: created.id } : b)));
        }
      }

      const assignmentSettingsRes = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_visible: isVisibleRef.current,
          answers_enabled: answersEnabledRef.current,
          answer_mode: answerModeRef.current,
          ai_grading_enabled: aiGradingEnabledRef.current,
          settings: settingsRef.current,
        }),
      });
      if (!assignmentSettingsRes.ok) {
        throw new Error('Failed to save assignment settings');
      }

      setHasUnsavedChanges(false);
      if (onSave) onSave(blocksToPersist);
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast({ title: 'Save failed', description: 'Changes could not be saved to server.', variant: 'destructive' });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [assignmentId, chapterId, onSave, paragraphId, subjectId, toast]);

  // Keep handleSave for keyboard shortcut (Ctrl+S) - also silent
  const handleSave = handleSilentSave;

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
    const canEditBlock = showTeacherControls && selectedBlock === block.id;

    switch (block.type) {
      case 'text':
        return (
          <div className="space-y-2">
            <Input
              data-testid={`assignment-text-header-${block.id}`}
              value={block.data.header || ''}
              onChange={(e) => updateBlock(block.id, { ...block.data, header: e.target.value })}
              placeholder="Header..."
              className="h-8 border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent font-medium"
              onClick={(e) => e.stopPropagation()}
              readOnly={!canEditBlock}
              disabled={!canEditBlock}
              autoFocus={canEditBlock && selectedBlock === block.id}
            />
            <Textarea
              value={block.data.content}
              onChange={(e) => updateBlock(block.id, { ...block.data, content: e.target.value })}
              placeholder="Enter text..."
              className="min-h-[60px] border-0 shadow-none resize-none focus-visible:ring-0 bg-transparent"
              onClick={(e) => e.stopPropagation()}
              readOnly={!canEditBlock}
              disabled={!canEditBlock}
            />
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="space-y-2">
            <Input
              value={block.data.question}
              onChange={(e) => updateBlock(block.id, { ...block.data, question: e.target.value })}
              placeholder="Enter question..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent font-medium"
              onClick={(e) => e.stopPropagation()}
              readOnly={!canEditBlock}
              disabled={!canEditBlock}
              autoFocus={canEditBlock && selectedBlock === block.id}
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
                    onClick={(e) => e.stopPropagation()}
                    className="h-3 w-3"
                    disabled={!canEditBlock}
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
                    onClick={(e) => e.stopPropagation()}
                    readOnly={!canEditBlock}
                    disabled={!canEditBlock}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); removeOption(block.id, idx); }}
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 text-muted-foreground"
                    disabled={!canEditBlock}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); addOption(block.id); }}
                className="text-xs text-muted-foreground h-6"
                disabled={!canEditBlock}
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
              onClick={(e) => e.stopPropagation()}
              readOnly={!canEditBlock}
              disabled={!canEditBlock}
              autoFocus={canEditBlock && selectedBlock === block.id}
            />
            <Textarea
              value={block.data.correct_answer || ''}
              onChange={(e) => updateBlock(block.id, { ...block.data, correct_answer: e.target.value })}
              placeholder="Correct answer (for grading)..."
              className="min-h-[40px] border-0 border-b border-dashed border-border rounded-none shadow-none resize-none focus-visible:ring-0 bg-transparent text-sm text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
              readOnly={!canEditBlock}
              disabled={!canEditBlock}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">({block.data.max_score} pts)</span>
            </div>
          </div>
        );

      case 'fill_in_blank': {
        // Parse text and count blanks (... becomes visual underline)
        const parts = block.data.text.split('...');
        const blankCount = parts.length - 1;
        
        return (
          <div className="space-y-3">
            {/* Rendered preview with clean underline inputs */}
            <div className="text-sm leading-relaxed">
              {parts.map((part: string, idx: number) => (
                <React.Fragment key={idx}>
                  <span>{part}</span>
                  {idx < parts.length - 1 && (
                    <span className="inline-flex items-center mx-1">
                      <span className="relative inline-block min-w-[100px]">
                        <Input
                          value={block.data.answers?.[idx] || ''}
                          onChange={(e) => {
                            const newAnswers = [...(block.data.answers || Array(blankCount).fill(''))];
                            newAnswers[idx] = e.target.value;
                            updateBlock(block.id, { ...block.data, answers: newAnswers });
                          }}
                          placeholder=""
                          className="h-6 px-1 text-sm border-0 border-b-2 border-foreground/40 rounded-none shadow-none focus-visible:ring-0 bg-transparent text-center"
                          onClick={(e) => e.stopPropagation()}
                          readOnly={!canEditBlock}
                          disabled={!canEditBlock}
                        />
                        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
                          ({idx + 1})
                        </span>
                      </span>
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {/* Raw text editor */}
            <div className="border-t border-dashed border-border pt-2">
              <Label className="text-xs text-muted-foreground">Edit (use ... for blanks)</Label>
              <Textarea
                value={block.data.text}
                onChange={(e) => {
                  const newText = e.target.value;
                  const newBlankCount = (newText.match(/\.\.\./g) || []).length;
                  const currentAnswers = block.data.answers || [];
                  const newAnswers = Array(newBlankCount).fill('').map((_, i) => currentAnswers[i] || '');
                  updateBlock(block.id, { ...block.data, text: newText, answers: newAnswers });
                }}
                placeholder="My shoes ... 100 euros."
                className="min-h-[32px] mt-1 border-0 shadow-none resize-none focus-visible:ring-0 bg-muted/30 text-xs rounded px-2 py-1"
                onClick={(e) => e.stopPropagation()}
                readOnly={!canEditBlock}
                disabled={!canEditBlock}
              />
            </div>
          </div>
        );
      }

      case 'drag_drop':
      case 'matching':
        return (
          <div className="space-y-2">
            <Input
              value={block.data.prompt}
              onChange={(e) => updateBlock(block.id, { ...block.data, prompt: e.target.value })}
              placeholder="Match the items..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent font-medium text-sm"
              readOnly={!canEditBlock}
              disabled={!canEditBlock}
              autoFocus={canEditBlock && selectedBlock === block.id}
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
              onClick={(e) => e.stopPropagation()}
              readOnly={!canEditBlock}
              disabled={!canEditBlock}
              autoFocus={canEditBlock && selectedBlock === block.id}
            />
            <p className="text-[10px] text-muted-foreground">Items are in correct order (A=first, B=second...)</p>
            <div className="space-y-1">
              {block.data.items?.map((item: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <span className="text-xs font-medium text-muted-foreground w-4">{String.fromCharCode(65 + idx)}.</span>
                  <Input
                    value={item}
                    onChange={(e) => {
                      const newItems = [...block.data.items];
                      newItems[idx] = e.target.value;
                      updateBlock(block.id, { ...block.data, items: newItems });
                    }}
                    placeholder={`Item ${String.fromCharCode(65 + idx)}`}
                    className="flex-1 h-6 text-xs border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent"
                    onClick={(e) => e.stopPropagation()}
                    readOnly={!canEditBlock}
                    disabled={!canEditBlock}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      if (!canEditBlock) return;
                      e.stopPropagation();
                      if (block.data.items.length > 2) {
                        const newItems = block.data.items.filter((_: string, i: number) => i !== idx);
                        updateBlock(block.id, { ...block.data, items: newItems });
                      }
                    }}
                    disabled={!canEditBlock || block.data.items.length <= 2}
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 text-muted-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  if (!canEditBlock) return;
                  e.stopPropagation();
                  updateBlock(block.id, { ...block.data, items: [...block.data.items, ''] });
                }}
                className="text-xs text-muted-foreground h-5"
                disabled={!canEditBlock}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
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
            readOnly={!canEditBlock}
            disabled={!canEditBlock}
            autoFocus={canEditBlock && selectedBlock === block.id}
          />
        );

      default:
        return <div className="text-sm text-muted-foreground">{block.type}</div>;
    }
  };

  const rows = getRows();

  return (
    <div
      data-testid="assignment-editor-root"
      className="h-screen flex flex-col bg-background text-foreground select-none font-sans"
      onPointerMove={handlePointerMove}
      style={{ touchAction: isDragging ? 'none' : 'auto' }}
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-background">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="h-8 px-2.5 rounded-md bg-muted/50 gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Button>
          <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex === 0} className="h-8 rounded-md px-2.5 bg-muted/50 gap-1.5" title={t.undo}>
            <Undo2 className="h-4 w-4" />
            {t.undo}
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1} className="h-8 rounded-md px-2.5 bg-muted/50 gap-1.5" title={t.redo}>
            <Redo2 className="h-4 w-4" />
            {t.redo}
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="outline" size="sm" onClick={handleExport} className="h-8 rounded-md px-2.5 bg-muted/50" title={t.export}>
            <Download className="h-4 w-4 mr-1.5" />
            {t.export}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                data-testid="assignment-size-button"
                variant="outline"
                size="sm"
                className="h-8 rounded-md px-2.5 bg-muted/50"
                title={t.size}
                disabled={!isTeacher || !selectedBlockRecord || !isEditMode}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                {t.size}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <Label className="text-xs">
                {selectedBlockRecord ? `${t.widthFor} ${BLOCK_TEMPLATES.find((item) => item.type === selectedBlockRecord.type)?.label || 'block'}` : t.selectBlockFirst}
              </Label>
              <input
                data-testid="assignment-size-slider"
                type="range"
                min={1}
                max={3}
                step={1}
                value={selectedBlockRecord?.size ?? 3}
                onChange={(e) => {
                  if (!selectedBlockRecord || !isEditMode) return;
                  setBlockSize(selectedBlockRecord.id, Number(e.target.value) as 1 | 2 | 3);
                }}
                className="mt-2 w-full"
                disabled={!selectedBlockRecord || !isEditMode}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={handleImport} className="h-8 rounded-md px-2.5 bg-muted/50" title={t.import}>
            <Upload className="h-4 w-4 mr-1.5" />
            {t.import}
          </Button>
          <Button
            data-testid="assignment-edit-toggle"
            variant={isEditMode ? 'default' : 'outline'}
            size="sm"
            onClick={handleEditModeToggle}
            className="h-8 rounded-md px-2.5"
          >
            {t.edit}: {isEditMode ? t.on : t.off}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-xs text-muted-foreground animate-pulse">{t.saving}</span>}
          {isTeacher && (
            <Button
              variant={isStudentPreview ? 'default' : 'outline'}
              size="sm"
              className="h-8 rounded-md px-3 text-sm bg-muted/50"
              onClick={() => setIsStudentPreview((prev) => !prev)}
            >
              {isStudentPreview ? t.exitStudentView : t.studentView}
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Paper area */}
        <div className="flex-1 overflow-auto p-2 md:p-3 bg-[hsl(var(--surface-1))]">
          <div
            ref={paperRef}
            data-testid="assignment-paper"
            className="bg-card border border-border rounded-xl shadow-sm min-h-[calc(100vh-130px)] p-3 relative w-full"
          >
              {rows.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <p className="mb-2">{t.noContentTitle}</p>
                    <p className="text-sm">{t.noContentHint}</p>
                  </div>
                </div>
              ) : (
              <div className="space-y-3">
                {rows.map((row, rowIndex) => (
                  <React.Fragment key={row.rowId}>
                    {/* Drop indicator before row */}
                    {isDragging && dropTarget?.rowIndex === rowIndex && !dropTarget.column && (
                      <div className="h-2 flex items-center justify-center">
                      <div className="w-4 h-4 bg-primary rounded-sm" />
                      </div>
                    )}
                    
                    {/* Row */}
                      <div className="flex gap-2.5">
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
                            data-testid={`assignment-block-${row.blocks[0].id}`}
                            className={`${showTeacherControls ? 'px-3 pb-3 pt-11' : 'p-3'} border rounded-xl transition-all duration-200 ease-out ${
                              selectedBlock === row.blocks[0].id 
                                ? 'border-primary bg-card' 
                                : 'border-border bg-background hover:bg-muted/30'
                            }`}
                            style={{
                              width: `${getBlockWidthPercent(row.blocks[0])}%`,
                              marginLeft: 'auto',
                              marginRight: 'auto',
                            }}
                            onClick={(e) => {
                              if (!showTeacherControls) return;
                              setSelectedBlock(row.blocks[0].id);
                            }}
                            onMouseEnter={() => setHoveredBlock(row.blocks[0].id)}
                            onMouseLeave={() => setHoveredBlock(null)}
                          >
                            {/* Controls */}
                            {showTeacherControls && (
                            <div className={`absolute top-2 right-2 left-2 flex items-center justify-between gap-1 bg-background/95 border border-border rounded-lg px-1.5 py-1 shadow-sm transition-opacity ${
                              selectedBlock === row.blocks[0].id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}>
                              <div className="text-[11px] font-medium text-muted-foreground">
                                {BLOCK_TEMPLATES.find((t) => t.type === row.blocks[0].type)?.label || 'Block'}
                              </div>
                              <div className="flex items-center gap-1">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] bg-muted/60" title="Block size">
                                      <SlidersHorizontal className="h-3 w-3 mr-1" />
                                      Size
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-52 p-3" align="end">
                                    <Label className="text-xs">Block width</Label>
                                    <input
                                      type="range"
                                      min={1}
                                      max={3}
                                      step={1}
                                      value={row.blocks[0].size ?? 3}
                                      onChange={(e) => setBlockSize(row.blocks[0].id, Number(e.target.value) as 1 | 2 | 3)}
                                      className="mt-2 w-full"
                                    />
                                  </PopoverContent>
                                </Popover>
                                <div 
                                  className="h-6 w-6 p-0 flex items-center justify-center cursor-grab bg-muted/70 hover:bg-muted rounded"
                                  onPointerDown={(e) => handleGripPointerDown(e, row.blocks[0].id)}
                                  title="Move block"
                                >
                                  <GripVertical className="h-3 w-3" />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); deleteBlock(row.blocks[0].id); }}
                                  className="h-6 w-6 p-0 bg-muted/70 text-destructive"
                                  title="Delete block"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            )}
                            
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
                                    data-testid={`assignment-block-${block.id}`}
                                    className={`h-full ${showTeacherControls ? 'px-3 pb-3 pt-11' : 'p-3'} border rounded-xl transition-all duration-200 ease-out ${
                                      selectedBlock === block.id 
                                        ? 'border-primary bg-card' 
                                        : 'border-border bg-background hover:bg-muted/30'
                                    }`}
                                    style={{
                                      width: `${getBlockWidthPercent(block)}%`,
                                      marginLeft: 'auto',
                                      marginRight: 'auto',
                                    }}
                                    onClick={(e) => {
                                      if (!showTeacherControls) return;
                                      setSelectedBlock(block.id);
                                    }}
                                    onMouseEnter={() => setHoveredBlock(block.id)}
                                    onMouseLeave={() => setHoveredBlock(null)}
                                  >
                                    {/* Controls */}
                                    {showTeacherControls && (
                                    <div className={`absolute top-2 right-2 left-2 flex items-center justify-between gap-1 bg-background/95 border border-border rounded-lg px-1.5 py-1 shadow-sm transition-opacity ${
                                      selectedBlock === block.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    }`}>
                                      <div className="text-[11px] font-medium text-muted-foreground">
                                        {BLOCK_TEMPLATES.find((t) => t.type === block.type)?.label || 'Block'}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] bg-muted/60" title="Block size">
                                              <SlidersHorizontal className="h-3 w-3 mr-1" />
                                              Size
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-52 p-3" align="end">
                                            <Label className="text-xs">Block width</Label>
                                            <input
                                              type="range"
                                              min={1}
                                              max={3}
                                              step={1}
                                              value={block.size ?? 3}
                                              onChange={(e) => setBlockSize(block.id, Number(e.target.value) as 1 | 2 | 3)}
                                              className="mt-2 w-full"
                                            />
                                          </PopoverContent>
                                        </Popover>
                                        <div 
                                          className="h-6 w-6 p-0 flex items-center justify-center cursor-grab bg-muted/70 hover:bg-muted rounded"
                                          onPointerDown={(e) => handleGripPointerDown(e, block.id)}
                                          title="Move block"
                                        >
                                          <GripVertical className="h-3 w-3" />
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                          className="h-6 w-6 p-0 bg-muted/70 text-destructive"
                                          title="Delete block"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    )}
                                    
                                    {renderBlockContent(block)}
                                  </div>
                                ) : (
                                  <div className="h-full border border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground bg-background">
                                    Drop Here
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
              <div className="h-16 mt-4 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-sm text-muted-foreground bg-background">
                Drop Here For New Row
              </div>
            )}
          </div>
        </div>

        {showTeacherControls && (
          <aside className="w-[320px] border-l border-border bg-background p-3 overflow-y-auto">
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.08em] mb-2">Blocks</div>
                <div className="space-y-1.5">
                  {BLOCK_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      data-testid={`assignment-template-${template.id}`}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab hover:bg-muted border border-transparent hover:border-border"
                      onPointerDown={(e) => handleTemplatePointerDown(e, template.id)}
                    >
                      {template.icon}
                      <span className="text-sm">{template.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-1">
                <AssignmentSettingsOverlay
                  settings={localSettings}
                  onSettingsChange={handleAdvancedSettingsChange}
                />
              </div>
              {selectedBlock && (() => {
                const block = blocks.find((b) => b.id === selectedBlock);
                if (!block) return null;
                const s = normalizeBlockSettings(block.settings || {});
                const isQuestionBlock = ['multiple_choice', 'open_question', 'fill_in_blank', 'drag_drop', 'matching', 'ordering'].includes(block.type);
                return (
                  <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.08em]">Question Settings</div>
                    {isQuestionBlock && localAnswersEnabled && (
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Show feedback</Label>
                        <Checkbox
                          checked={!!block.showFeedback}
                          onCheckedChange={() => toggleBlockFeedback(block.id)}
                        />
                      </div>
                    )}
                    {block.type === 'open_question' && (
                      <Popover
                        open={aiSettingsBlockId === block.id}
                        onOpenChange={(open) => setAiSettingsBlockId(open ? block.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 w-full justify-start gap-2">
                            <Sparkles className="h-3.5 w-3.5" />
                            AI Grading Preset
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="p-0 w-auto">
                          <AIGradingPresets
                            presets={gradingPresets}
                            selectedPresetId={selectedPresetId}
                            blockOverride={block.aiGradingOverride}
                            onSelectPreset={setSelectedPresetId}
                            onSavePreset={(preset) => {
                              setGradingPresets((prev) => {
                                const exists = prev.find((p) => p.id === preset.id);
                                if (exists) return prev.map((p) => (p.id === preset.id ? preset : p));
                                return [...prev, preset];
                              });
                            }}
                            onDeletePreset={(id) => {
                              setGradingPresets((prev) => prev.filter((p) => p.id !== id));
                            }}
                            onSetDefault={(id) => {
                              setGradingPresets((prev) => prev.map((p) => ({ ...p, is_default: p.id === id })));
                            }}
                            onBlockOverrideChange={(override) => updateBlockAiOverride(block.id, override)}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={s.points}
                        onChange={(e) => updateBlockSettings(block.id, (prev) => ({ ...prev, points: Number(e.target.value || 0) }))}
                        className="h-8"
                        placeholder="Points"
                      />
                      <Input
                        value={s.tags.join(',')}
                        onChange={(e) => updateBlockSettings(block.id, (prev) => ({ ...prev, tags: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean) }))}
                        className="h-8"
                        placeholder="Tags"
                      />
                    </div>
                    <Textarea
                      value={s.hints.join('\n')}
                      onChange={(e) =>
                        updateBlockSettings(block.id, (prev) => ({
                          ...prev,
                          hints: e.target.value.split('\n').map((v: string) => v.trim()).filter(Boolean),
                        }))
                      }
                      className="text-xs min-h-[52px]"
                      placeholder="Hints (1 per line)"
                    />
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Required</Label>
                      <Checkbox
                        checked={s.required}
                        onCheckedChange={(checked) => updateBlockSettings(block.id, (prev) => ({ ...prev, required: !!checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Random position</Label>
                      <Checkbox
                        checked={s.randomPosition}
                        onCheckedChange={(checked) => updateBlockSettings(block.id, (prev) => ({ ...prev, randomPosition: !!checked }))}
                      />
                    </div>
                    <Textarea
                      value={s.feedbackText}
                      onChange={(e) => updateBlockSettings(block.id, (prev) => ({ ...prev, feedbackText: e.target.value }))}
                      className="text-xs min-h-[52px]"
                      placeholder="Custom feedback text"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={s.timeLimitSeconds ?? ''}
                      onChange={(e) => updateBlockSettings(block.id, (prev) => ({ ...prev, timeLimitSeconds: e.target.value ? Number(e.target.value) : null }))}
                      className="h-8"
                      placeholder="Question time limit (s)"
                    />
                    {block.type === 'open_question' && (
                      <div className="space-y-2 border-t pt-2">
                        <Input
                          value={s.openQuestion.modelAnswer}
                          onChange={(e) => updateBlockSettings(block.id, (prev) => ({ ...prev, openQuestion: { ...prev.openQuestion, modelAnswer: e.target.value } }))}
                          className="h-8"
                          placeholder="Model answer"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={s.openQuestion.maxWords ?? ''}
                            onChange={(e) => updateBlockSettings(block.id, (prev) => ({ ...prev, openQuestion: { ...prev.openQuestion, maxWords: e.target.value ? Number(e.target.value) : null } }))}
                            className="h-8"
                            placeholder="Max words"
                          />
                          <Input
                            type="number"
                            min={1}
                            value={s.openQuestion.maxChars ?? ''}
                            onChange={(e) => updateBlockSettings(block.id, (prev) => ({ ...prev, openQuestion: { ...prev.openQuestion, maxChars: e.target.value ? Number(e.target.value) : null } }))}
                            className="h-8"
                            placeholder="Max chars"
                          />
                        </div>
                        <div className="flex items-center justify-between"><Label className="text-xs">Spellcheck</Label><Checkbox checked={s.openQuestion.spellcheck} onCheckedChange={(checked) => updateBlockSettings(block.id, (prev) => ({ ...prev, openQuestion: { ...prev.openQuestion, spellcheck: !!checked } }))} /></div>
                        <div className="flex items-center justify-between"><Label className="text-xs">Allow file upload</Label><Checkbox checked={s.openQuestion.allowFileUpload} onCheckedChange={(checked) => updateBlockSettings(block.id, (prev) => ({ ...prev, openQuestion: { ...prev.openQuestion, allowFileUpload: !!checked } }))} /></div>
                        <div className="flex items-center justify-between"><Label className="text-xs">Plagiarism check</Label><Checkbox checked={s.openQuestion.plagiarismCheck} onCheckedChange={(checked) => updateBlockSettings(block.id, (prev) => ({ ...prev, openQuestion: { ...prev.openQuestion, plagiarismCheck: !!checked } }))} /></div>
                      </div>
                    )}
                    {block.type === 'multiple_choice' && (
                      <div className="space-y-2 border-t pt-2">
                        <div className="flex items-center justify-between"><Label className="text-xs">Shuffle options</Label><Checkbox checked={s.multipleChoice.shuffleOptions} onCheckedChange={(checked) => updateBlockSettings(block.id, (prev) => ({ ...prev, multipleChoice: { ...prev.multipleChoice, shuffleOptions: !!checked } }))} /></div>
                        <div className="flex items-center justify-between"><Label className="text-xs">Partial credit</Label><Checkbox checked={s.multipleChoice.partialCredit} onCheckedChange={(checked) => updateBlockSettings(block.id, (prev) => ({ ...prev, multipleChoice: { ...prev.multipleChoice, partialCredit: !!checked } }))} /></div>
                        <div className="flex items-center justify-between"><Label className="text-xs">Negative scoring</Label><Checkbox checked={s.multipleChoice.negativeScoring} onCheckedChange={(checked) => updateBlockSettings(block.id, (prev) => ({ ...prev, multipleChoice: { ...prev.multipleChoice, negativeScoring: !!checked } }))} /></div>
                        <select
                          className="h-8 rounded-md border border-input bg-background text-foreground px-2 text-sm w-full"
                          value={s.multipleChoice.scoringMode}
                          onChange={(e) => updateBlockSettings(block.id, (prev) => ({ ...prev, multipleChoice: { ...prev.multipleChoice, scoringMode: e.target.value } }))}
                        >
                          <option value="partial">Partial</option>
                          <option value="all_or_nothing">All or nothing</option>
                        </select>
                      </div>
                    )}
                    {(block.type === 'drag_drop' || block.type === 'matching' || block.type === 'ordering') && (
                      <div className="space-y-2 border-t pt-2">
                        <div className="flex items-center justify-between"><Label className="text-xs">Shuffle items</Label><Checkbox checked={s.matching.shuffleItems} onCheckedChange={(checked) => updateBlockSettings(block.id, (prev) => ({ ...prev, matching: { ...prev.matching, shuffleItems: !!checked } }))} /></div>
                        <div className="flex items-center justify-between"><Label className="text-xs">Partial scoring</Label><Checkbox checked={s.matching.partialScoring} onCheckedChange={(checked) => updateBlockSettings(block.id, (prev) => ({ ...prev, matching: { ...prev.matching, partialScoring: !!checked } }))} /></div>
                        <Input
                          type="number"
                          min={1}
                          value={s.matching.maxAttemptsInQuestion ?? ''}
                          onChange={(e) => updateBlockSettings(block.id, (prev) => ({ ...prev, matching: { ...prev.matching, maxAttemptsInQuestion: e.target.value ? Number(e.target.value) : null } }))}
                          className="h-8"
                          placeholder="Max attempts in question"
                        />
                      </div>
                    )}
                    {(block.type === 'media_embed' || block.type === 'video' || block.type === 'image') && (
                      <div className="space-y-2 border-t pt-2">
                        <div className="flex items-center justify-between"><Label className="text-xs">Must watch before answer</Label><Checkbox checked={s.media.mustWatchBeforeAnswer} onCheckedChange={(checked) => updateBlockSettings(block.id, (prev) => ({ ...prev, media: { ...prev.media, mustWatchBeforeAnswer: !!checked } }))} /></div>
                        <Input
                          type="number"
                          min={0}
                          value={s.media.revealDelaySeconds}
                          onChange={(e) => updateBlockSettings(block.id, (prev) => ({ ...prev, media: { ...prev.media, revealDelaySeconds: Number(e.target.value || 0) } }))}
                          className="h-8"
                          placeholder="Reveal delay seconds"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </aside>
        )}
      </div>

    </div>
  );
}

