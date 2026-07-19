'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
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
  SlidersHorizontal,
  Eye,
  Users,
  Pencil,
  Image as ImageIcon,
  Video,
  Loader2,
  Copy,
  MoreVertical,
  Play,
  History,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  attachedToBlockId?: string | null; // When set, this block renders as a banner inside that question block's card
}

type OpenAnswerRow = {
  id: string;
  block_id: string;
  student_name: string;
  score: number | null;
  max_points: number | null;
  answer_data: any;
};

type OwnAnswer = {
  id: string;
  block_id: string;
  answer_data: any;
  score: number | null;
  is_correct: boolean | null;
};

interface AssignmentEditorProps {
  assignmentId: string;
  subjectId: string;
  chapterId: string;
  paragraphId: string;
  classId?: string | null;
  initialBlocks?: AssignmentBlock[];
  initialTitle?: string;
  initialDescription?: string | null;
  answersEnabled?: boolean;
  isVisible?: boolean;
  answerMode?: 'view_only' | 'editable' | 'self_grade';
  aiGradingEnabled?: boolean;
  initialSettings?: AssignmentSettings | null;
  initialType?: 'homework' | 'small_test' | 'big_test' | 'other' | null;
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
  },
  {
    id: 'image',
    type: 'image',
    icon: <ImageIcon className="h-4 w-4" />,
    label: 'Image',
    defaultData: { url: '', caption: '', alt: '' }
  },
  {
    id: 'video',
    type: 'video',
    icon: <Video className="h-4 w-4" />,
    label: 'Video',
    defaultData: { url: '', caption: '' }
  },
  {
    id: 'file',
    type: 'file',
    icon: <FileText className="h-4 w-4" />,
    label: 'File',
    defaultData: { url: '', filename: '', caption: '' }
  }
];

const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateRowId = () => `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function AssignmentEditor({
  assignmentId,
  subjectId,
  chapterId,
  paragraphId,
  classId = null,
  initialBlocks = [],
  initialTitle = '',
  initialDescription = null,
  answersEnabled = false,
  isVisible = true,
  answerMode = 'view_only',
  aiGradingEnabled = false,
  initialSettings = null,
  initialType = 'homework',
  onSave,
  onPreview,
  onSettingsChange,
  isTeacher = true
}: AssignmentEditorProps) {
  const appContext = useContext(AppContext) as AppContextType | null;
  const isDutch = appContext?.language === 'nl';
  const t = {
    isTestLabel: isDutch ? 'Dit is een toets' : 'This is a test',
    isTestHint: isDutch ? 'Zet timer, anti-cheat en planning aan in de Time/Anti-Cheat secties hieronder.' : 'Turns on timer, anti-cheat, and scheduling in the Time/Anti-Cheat sections below.',
    isTestHiddenNotice: isDutch ? 'Verborgen voor leerlingen totdat je hem publiceert.' : 'Hidden from students until you publish it.',
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
    viewStudentAnswers: isDutch ? 'Bekijk leerlingantwoorden' : 'View Student Answers',
    viewOwnAnswer: isDutch ? 'Bekijk eigen antwoord' : 'View My Answer',
    editQuestion: isDutch ? 'Bewerk vraag' : 'Edit Question',
    widthFor: isDutch ? 'Breedte voor' : 'Width for',
    selectBlockFirst: isDutch ? 'Selecteer eerst een blok' : 'Select a block first',
    noContentTitle: isDutch ? 'Nog geen inhoud' : 'No content yet',
    noContentHint: isDutch ? 'Gebruik het rechterpaneel om blokken toe te voegen' : 'Use the right panel to add blocks',
    tabWorkspace: isDutch ? 'Werkruimte' : 'Workspace',
    tabSettings: isDutch ? 'Instellingen' : 'Settings',
    tabInformation: isDutch ? 'Informatie' : 'Information',
    titleLabel: isDutch ? 'Titel' : 'Title',
    descriptionLabel: isDutch ? 'Beschrijving (optioneel)' : 'Description (optional)',
    visibleLabel: isDutch ? 'Zichtbaar voor leerlingen' : 'Visible to students',
    visibleHint: isDutch ? 'Verbergen betekent dat leerlingen deze opdracht nergens zien.' : 'Hidden means students can’t see this assignment anywhere.',
    answersEnabledLabel: isDutch ? 'Antwoorden vrijgeven' : 'Release answers',
    answersEnabledHint: isDutch ? 'Leerlingen kunnen zien welke vragen goed/fout waren.' : 'Students can see which questions were right/wrong.',
    moveTitle: isDutch ? 'Verplaatsen' : 'Move',
    moveButton: isDutch ? 'Verplaats naar...' : 'Move to...',
    moveChooseSubject: isDutch ? 'Kies vak...' : 'Choose subject...',
    moveChooseChapter: isDutch ? 'Kies hoofdstuk...' : 'Choose chapter...',
    moveChooseParagraph: isDutch ? 'Kies paragraaf...' : 'Choose paragraph...',
    moveConfirm: isDutch ? 'Verplaats' : 'Move',
    moveSuccess: isDutch ? 'Opdracht verplaatst' : 'Assignment moved',
    moveFailed: isDutch ? 'Verplaatsen mislukt' : 'Move failed',
    shareTitle: isDutch ? 'Delen' : 'Share',
    shareHint: isDutch ? 'Een andere docent kan deze code gebruiken om een eigen, losstaande kopie te importeren.' : 'Another teacher can use this code to import their own, independent copy.',
    shareGenerate: isDutch ? 'Genereer deel-code' : 'Generate share code',
    shareCode: isDutch ? 'Code' : 'Code',
    shareLink: isDutch ? 'Link' : 'Link',
    copy: isDutch ? 'Kopiëren' : 'Copy',
    copied: isDutch ? 'Gekopieerd' : 'Copied',
    infoLoading: isDutch ? 'Laden...' : 'Loading...',
    infoNoData: isDutch ? 'Nog geen data — leerlingen hebben nog niets ingeleverd.' : 'No data yet — no students have submitted anything.',
    infoQuestions: isDutch ? 'Vragen' : 'Questions',
    infoAnswers: isDutch ? 'Antwoorden' : 'Answers',
    infoAttempts: isDutch ? 'pogingen' : 'attempts',
    infoAvgScore: isDutch ? 'gem. score' : 'avg score',
    infoDifficulty: isDutch ? 'moeilijkheid' : 'difficulty',
    infoStudents: isDutch ? 'Scores per leerling' : 'Scores per student',
    infoNoSubmissions: isDutch ? 'Nog geen inzendingen' : 'No submissions yet',
    infoTimeSpent: isDutch ? 'tijd besteed (schatting)' : 'time spent (estimate)',
    infoMinutes: isDutch ? 'min' : 'min',
    editMode: isDutch ? 'Bewerken' : 'Edit',
    viewMode: isDutch ? 'Bekijken' : 'View',
    present: isDutch ? 'Presenteren' : 'Present',
    exitPresent: isDutch ? 'Stoppen' : 'Exit present',
    docHistory: isDutch ? 'Versiegeschiedenis' : 'Doc history',
    docHistorySoon: isDutch ? 'Binnenkort beschikbaar' : 'Coming soon',
    assignmentSettings: isDutch ? 'Opdrachtinstellingen' : 'Assignment settings',
    helpFaq: isDutch ? 'Help & FAQ' : 'Help & FAQ',
    deleteAssignment: isDutch ? 'Verwijder opdracht' : 'Delete assignment',
    deleteConfirmTitle: isDutch ? 'Opdracht verwijderen?' : 'Delete this assignment?',
    deleteConfirmDesc: isDutch ? 'Dit kan niet ongedaan worden gemaakt. De opdracht en alle inzendingen worden permanent verwijderd.' : 'This can\'t be undone. The assignment and all submissions will be permanently deleted.',
    cancel: isDutch ? 'Annuleren' : 'Cancel',
    confirmDelete: isDutch ? 'Verwijderen' : 'Delete',
    deleteFailed: isDutch ? 'Verwijderen mislukt' : 'Failed to delete assignment',
    questionOf: isDutch ? 'Vraag' : 'Question',
    previous: isDutch ? 'Vorige' : 'Previous',
    next: isDutch ? 'Volgende' : 'Next',
    copyAssignment: isDutch ? 'Kopieer opdracht' : 'Copy assignment',
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
    attachedToBlockId: (b as any).attached_to_block_id ?? b.attachedToBlockId ?? null,
    settings: normalizeBlockSettings((b as any).settings || (b as any).data?.settings || {}),
    data: {
      ...getTemplateDefaults(b.type),
      ...(typeof b.data === 'object' && b.data !== null ? b.data : {}),
    },
  })), [initialBlocks]);

  const [blocks, setBlocks] = useState<AssignmentBlock[]>(normalizedInitialBlocks);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [aiCommand, setAiCommand] = useState('');
  const [aiCommandLoading, setAiCommandLoading] = useState(false);
  const [aiIncludeSiblingContext, setAiIncludeSiblingContext] = useState(false);
  const [copyFromOpen, setCopyFromOpen] = useState(false);
  const [copyChapters, setCopyChapters] = useState<Array<{ id: string; title: string }>>([]);
  const [copyParagraphs, setCopyParagraphs] = useState<Array<{ id: string; title: string }>>([]);
  const [copyAssignments, setCopyAssignments] = useState<Array<{ id: string; title: string }>>([]);
  const [copyChapterId, setCopyChapterId] = useState('');
  const [copyParagraphId, setCopyParagraphId] = useState('');
  const [copyAssignmentId, setCopyAssignmentId] = useState('');
  const [isLoadingCopyOptions, setIsLoadingCopyOptions] = useState(false);
  const [isCopyingBlocks, setIsCopyingBlocks] = useState(false);
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
  const [isEditMode, setIsEditMode] = useState(true);
  const [localAnswersEnabled, setLocalAnswersEnabled] = useState(answersEnabled);
  const [localIsVisible, setLocalIsVisible] = useState(isVisible);
  const [localAnswerMode, setLocalAnswerMode] = useState<'view_only' | 'editable' | 'self_grade'>(answerMode);
  const [localAiGradingEnabled, setLocalAiGradingEnabled] = useState(aiGradingEnabled);
  const [isTest, setIsTest] = useState(initialType === 'small_test' || initialType === 'big_test');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'workspace' | 'settings' | 'information'>('workspace');
  const [isPresenting, setIsPresenting] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localTitle, setLocalTitle] = useState(initialTitle);
  const [localDescription, setLocalDescription] = useState(initialDescription || '');
  // Move-assignment popover state (Settings tab)
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveSubjects, setMoveSubjects] = useState<Array<{ id: string; title: string }>>([]);
  const [moveChapters, setMoveChapters] = useState<Array<{ id: string; title: string }>>([]);
  const [moveParagraphs, setMoveParagraphs] = useState<Array<{ id: string; title: string }>>([]);
  const [moveSubjectId, setMoveSubjectId] = useState('');
  const [moveChapterId, setMoveChapterId] = useState('');
  const [moveParagraphId, setMoveParagraphId] = useState('');
  const [isLoadingMoveOptions, setIsLoadingMoveOptions] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  // Share/import popover state (Settings tab) — generic for any assignment type
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  // Information tab state
  const [infoData, setInfoData] = useState<{
    total_questions: number;
    total_answers: number;
    question_metrics: Array<{ block_id: string; type: string; attempts: number; average_score: number; correct_count: number; wrong_count: number; error_rate_percent: number; difficulty_percent: number }>;
    student_scores: Array<{ student_id: string; name: string; total_answered: number; total_questions: number; correct_count: number; score_percent: number; last_submitted_at: string | null; time_spent_minutes: number | null }>;
  } | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [expandedAnswersBlockId, setExpandedAnswersBlockId] = useState<string | null>(null);
  const [expandedOwnAnswerBlockId, setExpandedOwnAnswerBlockId] = useState<string | null>(null);
  const [openAnswerRows, setOpenAnswerRows] = useState<OpenAnswerRow[]>([]);
  const [ownAnswers, setOwnAnswers] = useState<OwnAnswer[]>([]);
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
  const isTestRef = useRef(isTest);
  const titleRef = useRef(localTitle);
  const descriptionRef = useRef(localDescription);

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
  
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

  const paperRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const showTeacherControls = isTeacher && isEditMode;
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
    isTestRef.current = isTest;
  }, [isTest]);

  useEffect(() => {
    titleRef.current = localTitle;
  }, [localTitle]);

  useEffect(() => {
    descriptionRef.current = localDescription;
  }, [localDescription]);

  // Toggling "this is a test" on hides the assignment from students, matching
  // the same exam-security default new tests get at creation time (docs/
  // subjects-feature-brainstorm.md G1) — the teacher must explicitly publish it.
  const handleTestToggle = (next: boolean) => {
    setIsTest(next);
    if (next && localIsVisible) {
      setLocalIsVisible(false);
      toast({ title: t.isTestHiddenNotice });
    }
    setHasUnsavedChanges(true);
  };

  const handleTitleChange = (next: string) => {
    setLocalTitle(next);
    setHasUnsavedChanges(true);
  };

  const handleDescriptionChange = (next: string) => {
    setLocalDescription(next);
    setHasUnsavedChanges(true);
  };

  const handleVisibleToggle = (next: boolean) => {
    setLocalIsVisible(next);
    setHasUnsavedChanges(true);
  };

  const handleAnswersEnabledToggle = (next: boolean) => {
    setLocalAnswersEnabled(next);
    setHasUnsavedChanges(true);
  };

  useEffect(() => {
    const loadReadOnlyAnswers = async () => {
      if (isEditMode) return;

      if (isTeacher && classId) {
        try {
          const res = await fetch(
            `/api/classes/${classId}/assignments/open-answers?assignmentId=${assignmentId}&status=graded&limit=200`,
            { cache: 'no-store' }
          );
          const payload = await res.json().catch(() => ({}));
          if (res.ok) {
            setOpenAnswerRows(Array.isArray(payload?.rows) ? payload.rows : []);
          }
        } catch {}
      }

      try {
        const res = await fetch(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/answers`,
          { cache: 'no-store' }
        );
        const payload = await res.json().catch(() => []);
        if (res.ok) {
          setOwnAnswers(Array.isArray(payload) ? payload : []);
        }
      } catch {}
    };

    void loadReadOnlyAnswers();
  }, [assignmentId, chapterId, classId, isEditMode, isTeacher, paragraphId, subjectId]);

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

  // Attach/detach a media block to a question block (renders as a banner
  // inside that question's card instead of its own row).
  const updateBlockAttachment = (blockId: string, attachedToBlockId: string | null) => {
    setBlocks(prev => {
      const newBlocks = prev.map(block =>
        block.id === blockId ? { ...block, attachedToBlockId } : block
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
    
    // Sort blocks by position first, excluding blocks attached to a question
    // (docs/mockups/editor-redesign.html) -- those render as a banner inside
    // their parent question's card via renderBlockContent, not as their own row.
    const sortedBlocks = [...blocks]
      .filter((b) => !b.attachedToBlockId)
      .sort((a, b) => a.position - b.position);

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

  // Appends a single block as a new full-width row at the end — used by the
  // AI insert-command, which doesn't need the drag-target row/column
  // resolution that manual palette drops require.
  const addBlockFromCommand = (type: string, data: any) => {
    const newBlock: AssignmentBlock = {
      id: generateId(),
      type,
      position: blocks.length,
      width: 'full',
      rowId: generateRowId(),
      data,
      settings: normalizeBlockSettings(DEFAULT_BLOCK_SETTINGS),
    };
    setBlocks(prev => {
      const newBlocks = [...prev, newBlock];
      saveToHistory(newBlocks);
      return newBlocks;
    });
    setSelectedBlock(newBlock.id);
  };

  // Reuse a block-set from another assignment (docs/subjects-feature-brainstorm.md
  // section E point 17) — copy, not link: a fresh set of block ids, no shared state.
  useEffect(() => {
    if (!copyFromOpen) return;
    setIsLoadingCopyOptions(true);
    fetch(`/api/subjects/${subjectId}/chapters`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCopyChapters(Array.isArray(data) ? data : []))
      .catch(() => setCopyChapters([]))
      .finally(() => setIsLoadingCopyOptions(false));
  }, [copyFromOpen, subjectId]);

  useEffect(() => {
    if (!copyChapterId) { setCopyParagraphs([]); setCopyParagraphId(''); return; }
    setCopyParagraphId('');
    setCopyAssignmentId('');
    fetch(`/api/subjects/${subjectId}/chapters/${copyChapterId}/paragraphs`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCopyParagraphs(Array.isArray(data) ? data : []))
      .catch(() => setCopyParagraphs([]));
  }, [copyChapterId, subjectId]);

  useEffect(() => {
    if (!copyChapterId || !copyParagraphId) { setCopyAssignments([]); setCopyAssignmentId(''); return; }
    setCopyAssignmentId('');
    fetch(`/api/subjects/${subjectId}/chapters/${copyChapterId}/paragraphs/${copyParagraphId}/assignments`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCopyAssignments(Array.isArray(data) ? data.filter((a: any) => a.id !== assignmentId) : []))
      .catch(() => setCopyAssignments([]));
  }, [copyChapterId, copyParagraphId, subjectId, assignmentId]);

  const handleCopyBlocks = async () => {
    if (!copyChapterId || !copyParagraphId || !copyAssignmentId || isCopyingBlocks) return;
    setIsCopyingBlocks(true);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/chapters/${copyChapterId}/paragraphs/${copyParagraphId}/assignments/${copyAssignmentId}/blocks`);
      if (!res.ok) throw new Error('Failed to load blocks');
      const sourceBlocks = await res.json();
      const list = Array.isArray(sourceBlocks) ? sourceBlocks : [];
      if (list.length === 0) {
        toast({ title: isDutch ? 'Geen blokken gevonden' : 'No blocks found' });
        return;
      }
      const newBlocks: AssignmentBlock[] = list.map((b: any, i: number) => ({
        id: generateId(),
        type: b.type,
        position: blocks.length + i,
        width: 'full',
        rowId: generateRowId(),
        data: { ...(b.data || {}) },
        settings: normalizeBlockSettings(b.settings || b.data?.settings || {}),
      }));
      setBlocks(prev => {
        const combined = [...prev, ...newBlocks];
        saveToHistory(combined);
        return combined;
      });
      toast({ title: isDutch ? 'Blokken gekopieerd' : 'Blocks copied', description: `${newBlocks.length} ${isDutch ? 'blokken toegevoegd' : 'blocks added'}` });
      setCopyFromOpen(false);
    } catch {
      toast({ variant: 'destructive', title: isDutch ? 'Mislukt' : 'Failed' });
    } finally {
      setIsCopyingBlocks(false);
    }
  };

  // Move assignment to another paragraph/chapter/subject (docs/subjects-
  // feature-brainstorm.md section H, Settings tab). Cascading subject ->
  // chapter -> paragraph pickers, same pattern as "Copy blocks from...".
  useEffect(() => {
    if (!moveOpen) return;
    setIsLoadingMoveOptions(true);
    fetch('/api/subjects')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.subjects) ? data.subjects : []);
        setMoveSubjects(list.map((s: any) => ({ id: s.id, title: s.title || s.name || 'Untitled' })));
      })
      .catch(() => setMoveSubjects([]))
      .finally(() => setIsLoadingMoveOptions(false));
  }, [moveOpen]);

  useEffect(() => {
    if (!moveSubjectId) { setMoveChapters([]); setMoveChapterId(''); return; }
    setMoveChapterId('');
    setMoveParagraphId('');
    fetch(`/api/subjects/${moveSubjectId}/chapters`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMoveChapters(Array.isArray(data) ? data : []))
      .catch(() => setMoveChapters([]));
  }, [moveSubjectId]);

  useEffect(() => {
    if (!moveSubjectId || !moveChapterId) { setMoveParagraphs([]); setMoveParagraphId(''); return; }
    setMoveParagraphId('');
    fetch(`/api/subjects/${moveSubjectId}/chapters/${moveChapterId}/paragraphs`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMoveParagraphs(Array.isArray(data) ? data : []))
      .catch(() => setMoveParagraphs([]));
  }, [moveSubjectId, moveChapterId]);

  const handleMoveAssignment = async () => {
    if (!moveSubjectId || !moveChapterId || !moveParagraphId || isMoving) return;
    setIsMoving(true);
    try {
      const res = await fetch(
        `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/move`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetSubjectId: moveSubjectId, targetChapterId: moveChapterId, targetParagraphId: moveParagraphId }),
        }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Move failed');
      }
      const payload = await res.json().catch(() => ({}));
      toast({ title: t.moveSuccess });
      setMoveOpen(false);
      if (payload?.redirectTo) {
        window.location.href = payload.redirectTo;
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: t.moveFailed, description: error?.message });
    } finally {
      setIsMoving(false);
    }
  };

  // Generic share/import (extends G3 — was test-only, now any assignment
  // type). Reuses the existing share endpoint with its type restriction
  // relaxed server-side.
  const handleGenerateShareCode = async () => {
    if (shareCode || isSharing) return;
    setIsSharing(true);
    try {
      const res = await fetch(
        `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/share`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error('Failed to share');
      const data = await res.json();
      setShareCode(data.code);
    } catch {
      toast({ variant: 'destructive', title: isDutch ? 'Delen mislukt' : 'Failed to share' });
    } finally {
      setIsSharing(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (isDeleting || !appContext?.deleteAssignment) return;
    setIsDeleting(true);
    try {
      await appContext.deleteAssignment(assignmentId);
      router.push(`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}`);
    } catch (error: any) {
      toast({ variant: 'destructive', title: t.deleteFailed, description: error?.message });
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  // Information tab — surfaces the existing per-block analytics endpoint.
  useEffect(() => {
    if (activeSidebarTab !== 'information') return;
    setIsLoadingInfo(true);
    fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/analytics`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setInfoData(data))
      .catch(() => setInfoData(null))
      .finally(() => setIsLoadingInfo(false));
  }, [activeSidebarTab, subjectId, chapterId, paragraphId, assignmentId]);

  const buildBlocksContextSummary = () => {
    return blocks.slice(0, 12).map((b, i) => {
      const snippet = b.data?.question || b.data?.content || b.data?.prompt || b.data?.caption || '';
      return `${i + 1}. [${b.type}] ${String(snippet).slice(0, 80)}`;
    }).join('\n') || '(nog geen blokken)';
  };

  const handleAiCommandSubmit = async () => {
    const command = aiCommand.trim();
    if (!command || aiCommandLoading) return;
    setAiCommandLoading(true);
    try {
      const res = await fetch(
        `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks/ai-command`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command,
            contextSummary: buildBlocksContextSummary(),
            includeSiblingContext: aiIncludeSiblingContext,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'AI command failed');
      }
      const { block } = await res.json();
      const blockType = block?.blockType;
      let data: any;
      if (blockType === 'multiple_choice') {
        const options = Array.isArray(block.options) && block.options.length > 0
          ? block.options.map((o: any, i: number) => ({ id: String.fromCharCode(97 + i), text: o.text || '', correct: !!o.correct }))
          : getTemplateDefaults('multiple_choice').options;
        data = { question: block.question || '', options, multiple_correct: options.filter((o: any) => o.correct).length > 1, shuffle: true };
      } else if (blockType === 'open_question') {
        data = { question: block.question || '', correct_answer: block.correct_answer || '', ai_grading: true, grading_criteria: block.grading_criteria || '', max_score: 5 };
      } else if (blockType === 'fill_in_blank') {
        data = { text: block.fill_text || '', answers: block.fill_answers || [], case_sensitive: false };
      } else if (blockType === 'image') {
        data = { url: '', caption: block.caption || '', alt: '' };
      } else if (blockType === 'video') {
        data = { url: '', caption: block.caption || '' };
      } else {
        data = { header: block?.header || '', content: block?.content || '', style: 'normal' };
      }
      addBlockFromCommand(blockType || 'text', data);
      setAiCommand('');
      toast({ title: isDutch ? 'Blok ingevoegd' : 'Block inserted' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: isDutch ? 'Mislukt' : 'Failed', description: error.message });
    } finally {
      setAiCommandLoading(false);
    }
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
    if (!showTeacherControls) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    startDragBlock(blockId);
  };

  const handleTemplatePointerDown = (e: React.PointerEvent, templateId: string) => {
    if (!showTeacherControls) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
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
        const sourceRowIndex = rows.findIndex((row) => row.blocks.some((b) => b.id === dragSource.id));
        if (!(sourceRowIndex === dropTarget.rowIndex && dropTarget.column === undefined)) {
          moveBlock(dragSource.id, dropTarget.rowIndex, dropTarget.column);
        }
      }
    }
    setIsDragging(false);
    setDragSource(null);
    setDropTarget(null);
  };

  const updateDropTargetFromPoint = (clientX: number, clientY: number) => {
    if (!isDragging || !paperRef.current) return;

    const rowElements = Array.from(
      paperRef.current.querySelectorAll<HTMLElement>('[data-assignment-row-index]')
    );

    if (rowElements.length === 0) {
      setDropTarget({ rowIndex: 0 });
      return;
    }

    const hoveredRow = rowElements.find((rowEl) => {
      const rect = rowEl.getBoundingClientRect();
      return clientY >= rect.top && clientY <= rect.bottom;
    });

    if (!hoveredRow) {
      const lastRect = rowElements[rowElements.length - 1].getBoundingClientRect();
      const rowIndex = clientY > lastRect.bottom ? rowElements.length : 0;
      setDropTarget({ rowIndex });
      return;
    }

    const rowIndex = Number(hoveredRow.dataset.assignmentRowIndex || 0);
    const rect = hoveredRow.getBoundingClientRect();
    const xRatio = (clientX - rect.left) / Math.max(rect.width, 1);
    let column: 'left' | 'right' | undefined;
    if (xRatio < 0.45) column = 'left';
    if (xRatio > 0.55) column = 'right';
    setDropTarget({ rowIndex, column });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!showTeacherControls) return;
    updateDropTargetFromPoint(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleGlobalPointerMove = (event: PointerEvent) => {
      if (!isDragging || !showTeacherControls) return;
      updateDropTargetFromPoint(event.clientX, event.clientY);
    };
    const handleGlobalPointerUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    const handleGlobalCancel = () => {
      if (!isDragging) return;
      setIsDragging(false);
      setDragSource(null);
      setDropTarget(null);
    };
    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalCancel);
    window.addEventListener('blur', handleGlobalCancel);
    window.addEventListener('touchend', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalCancel);
      window.removeEventListener('blur', handleGlobalCancel);
      window.removeEventListener('touchend', handleGlobalPointerUp);
    };
  }, [isDragging, showTeacherControls, dragSource, dropTarget]);

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
          attached_to_block_id: block.attachedToBlockId || null,
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
          type: isTestRef.current ? 'small_test' : 'homework',
          settings: settingsRef.current,
          title: titleRef.current,
          description: descriptionRef.current,
        }),
      });
      if (!assignmentSettingsRes.ok) {
        throw new Error('Failed to save assignment settings');
      }

      setHasUnsavedChanges(false);
      if (onSave) onSave(blocksToPersist);
    } catch (error) {
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

  const MEDIA_ACCEPT: Record<'image' | 'video' | 'file', string> = {
    image: 'image/jpeg,image/png,image/gif,image/webp',
    video: 'video/mp4,video/webm,video/ogg',
    file: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip',
  };

  const handleMediaUpload = (block: AssignmentBlock, mediaType: 'image' | 'video' | 'file') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = MEDIA_ACCEPT[mediaType];
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploadingBlockId(block.id);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', mediaType);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const result = await res.json();
        if (!res.ok || !result.url) {
          throw new Error(result.error || 'Upload failed');
        }
        updateBlock(block.id, { ...block.data, url: result.url, ...(mediaType === 'file' ? { filename: file.name } : {}) });
      } catch (error: any) {
        toast({ title: 'Upload failed', description: error?.message || 'Please try again.', variant: 'destructive' });
      } finally {
        setUploadingBlockId(null);
      }
    };
    input.click();
  };

  // Attached media (image/video) renders as a banner inside its parent
  // question's card instead of as its own row (docs/mockups/editor-redesign.html).
  const renderAttachedMediaBanner = (block: AssignmentBlock) => {
    const media = blocks.find((b) => b.attachedToBlockId === block.id);
    if (!media) return null;
    const url = media.data?.url;
    return (
      <div className="mb-3 rounded-lg bg-muted overflow-hidden">
        {media.type === 'video' ? (
          url ? (
            <video src={url} controls className="w-full max-h-56 object-cover" />
          ) : (
            <div className="flex h-24 items-center justify-center gap-2 text-xs text-muted-foreground">
              <Video className="h-4 w-4" /> {media.data?.caption || 'Linked video'}
            </div>
          )
        ) : url ? (
          <img src={url} alt={media.data?.caption || ''} className="w-full max-h-56 object-cover" />
        ) : (
          <div className="flex h-24 items-center justify-center gap-2 text-xs text-muted-foreground">
            <ImageIcon className="h-4 w-4" /> {media.data?.caption || 'Linked image'}
          </div>
        )}
        {showTeacherControls && (
          <button
            type="button"
            className="w-full border-t border-border/60 px-2 py-1 text-[11px] text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); updateBlockAttachment(media.id, null); }}
          >
            {isDutch ? 'Losmaken van vraag' : 'Detach from question'}
          </button>
        )}
      </div>
    );
  };

  const renderBlockContent = (block: AssignmentBlock) => {
    const canEditBlock = showTeacherControls && selectedBlock === block.id;
    const renderReadOnlyActions = () => {
      if (!isTeacher || isEditMode) return null;
      const referenceAnswer = (() => {
        if (block.type === 'multiple_choice') {
          const answers = (block.data.options || [])
            .filter((option: any) => option?.correct)
            .map((option: any) => option?.text || '...')
            .join(', ');
          return answers || 'No reference answer set.';
        }
        if (block.type === 'open_question') return String(block.data.correct_answer || 'No reference answer set.');
        if (block.type === 'fill_in_blank') return ((block.data.answers || []) as string[]).filter(Boolean).join(', ') || 'No reference answer set.';
        return '';
      })();
      return (
        <div className="mt-3 border-t border-border/60 pt-3">
          <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 surface-panel"
            onClick={() => setExpandedAnswersBlockId((prev) => prev === block.id ? null : block.id)}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            {t.viewStudentAnswers}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 surface-panel"
            onClick={() => setExpandedOwnAnswerBlockId((prev) => prev === block.id ? null : block.id)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {t.viewOwnAnswer}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 surface-panel"
            onClick={() => {
              setIsEditMode(true);
              setSelectedBlock(block.id);
            }}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {t.editQuestion}
          </Button>
          </div>
          {expandedAnswersBlockId === block.id && (
            <div className="mt-2 space-y-2 rounded-lg border border-border/70 surface-panel p-2 text-xs">
              <div className="rounded-md border border-border/50 bg-background p-2 text-foreground/80">
                <p className="text-[11px] text-foreground/65">Question</p>
                <p className="mt-1">{String(block.data.question || block.data.prompt || block.data.header || 'Untitled block')}</p>
                {referenceAnswer ? (
                  <>
                    <p className="mt-2 text-[11px] text-foreground/65">Reference Answer</p>
                    <p className="mt-1">{referenceAnswer}</p>
                  </>
                ) : null}
              </div>
              {openAnswerRows.filter((row) => row.block_id === block.id).slice(0, 8).map((row) => {
                const max = Number(row.max_points || 0);
                const score = Number(row.score || 0);
                const ratio = max > 0 ? score / max : 0;
                const verdict = ratio >= 0.85 ? 'Correct' : ratio >= 0.45 ? 'Partially Correct' : 'Incorrect';
                const verdictClass = ratio >= 0.85 ? 'text-emerald-600' : ratio >= 0.45 ? 'text-amber-600' : 'text-rose-600';
                return (
                  <div key={row.id} className="rounded-md border border-border/50 bg-background p-2">
                    <div className="flex items-center justify-between">
                      <span>{row.student_name || 'Student'}</span>
                      <span className={verdictClass}>{verdict}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-foreground/65">Student Answer</p>
                    <p className="mt-1 line-clamp-2 text-foreground/80">{String(row.answer_data?.text || row.answer_data?.answer || '')}</p>
                  </div>
                );
              })}
              {openAnswerRows.filter((row) => row.block_id === block.id).length === 0 && (
                <div className="text-foreground/70">No graded answers yet.</div>
              )}
            </div>
          )}
          {expandedOwnAnswerBlockId === block.id && (
            <div className="mt-2 rounded-lg border border-border/70 surface-panel p-2 text-xs text-foreground/75">
              {(() => {
                const own = ownAnswers.find((item) => item.block_id === block.id);
                if (!own) return 'No submitted answer yet.';
                const answerText = String(own.answer_data?.text || own.answer_data?.answer || own.answer_data?.value || 'Answer recorded');
                const scoreText = own.score === null ? '' : `${own.score}`;
                return (
                  <div className="space-y-2">
                    <div>
                      <p className="text-[11px] text-foreground/65">My Submitted Answer</p>
                      <p className="mt-1 text-foreground/85">{answerText}</p>
                    </div>
                    {referenceAnswer ? (
                      <div>
                        <p className="text-[11px] text-foreground/65">Reference Answer</p>
                        <p className="mt-1 text-foreground/85">{referenceAnswer}</p>
                      </div>
                    ) : null}
                    {scoreText ? <p className="text-foreground/75">Score: {scoreText}</p> : null}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      );
    };

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
            <Label className="text-[11px] text-muted-foreground">Question</Label>
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
                    className="h-5 w-5 p-0 text-muted-foreground"
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
            <div className="rounded-md border border-dashed border-border/70 surface-chip p-2">
              <p className="text-[11px] text-muted-foreground">Expected Answer</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {Array.isArray(block.data.options)
                  ? block.data.options.filter((option: any) => option?.correct).map((option: any) => option?.text || '...').join(', ') || 'No correct option set.'
                  : 'No options yet.'}
              </p>
            </div>
            {renderReadOnlyActions()}
          </div>
        );

      case 'open_question':
        return (
          <div className="space-y-2">
            <Label className="text-[11px] text-muted-foreground">Question</Label>
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
            <Label className="text-[11px] text-muted-foreground">Correct / Model Answer</Label>
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
            {renderReadOnlyActions()}
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
                className="min-h-[32px] mt-1 border-0 shadow-none resize-none focus-visible:ring-0 surface-interactive text-xs rounded px-2 py-1"
                onClick={(e) => e.stopPropagation()}
                readOnly={!canEditBlock}
                disabled={!canEditBlock}
              />
            </div>
            {renderReadOnlyActions()}
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
                  <div className="p-1 surface-interactive rounded text-center">{pair.left || '...'}</div>
                  <div className="p-1 surface-interactive rounded text-center">{pair.right || '...'}</div>
                </React.Fragment>
              ))}
            </div>
            <div className="rounded-md border border-dashed border-border/70 surface-chip p-2">
              <p className="text-[11px] text-muted-foreground">Expected Matches</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(block.data.pairs || [])
                  .slice(0, 3)
                  .map((pair: any) => `${pair?.left || '...'} â†’ ${pair?.right || '...'}`)
                  .join(' | ') || 'No pairs yet.'}
              </p>
            </div>
            {renderReadOnlyActions()}
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
                    className="h-5 w-5 p-0 text-muted-foreground"
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
            <div className="rounded-md border border-dashed border-border/70 surface-chip p-2">
              <p className="text-[11px] text-muted-foreground">Expected Order</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(block.data.items || []).map((item: string, idx: number) => `${idx + 1}. ${item || '...'}`).join(' | ') || 'No items yet.'}
              </p>
            </div>
            {renderReadOnlyActions()}
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

      case 'image': {
        const isUploading = uploadingBlockId === block.id;
        return (
          <div className="space-y-2">
            {block.data.url ? (
              <div className="space-y-2">
                <img
                  src={block.data.url}
                  alt={block.data.alt || ''}
                  className="max-w-full max-h-64 rounded-md border border-border object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                {canEditBlock && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleMediaUpload(block, 'image'); }}
                    className="h-6 text-xs text-muted-foreground"
                    disabled={isUploading}
                  >
                    <Upload className="h-3 w-3 mr-1" /> Replace image
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleMediaUpload(block, 'image'); }}
                className="h-16 w-full border-dashed text-xs text-muted-foreground"
                disabled={!canEditBlock || isUploading}
              >
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                ) : (
                  <><ImageIcon className="h-4 w-4 mr-2" /> Click to upload image</>
                )}
              </Button>
            )}
            <Input
              value={block.data.caption || ''}
              onChange={(e) => updateBlock(block.id, { ...block.data, caption: e.target.value })}
              placeholder="Caption (optional)..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent text-sm"
              onClick={(e) => e.stopPropagation()}
              readOnly={!canEditBlock}
              disabled={!canEditBlock}
            />
            <Input
              value={block.data.alt || ''}
              onChange={(e) => updateBlock(block.id, { ...block.data, alt: e.target.value })}
              placeholder="Alt text (for accessibility)..."
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-xs text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
              readOnly={!canEditBlock}
              disabled={!canEditBlock}
            />
          </div>
        );
      }

      case 'video': {
        const isUploading = uploadingBlockId === block.id;
        return (
          <div className="space-y-2">
            {block.data.url ? (
              <div className="space-y-2">
                <video
                  src={block.data.url}
                  controls
                  className="max-w-full max-h-64 rounded-md border border-border"
                  onClick={(e) => e.stopPropagation()}
                />
                {canEditBlock && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleMediaUpload(block, 'video'); }}
                    className="h-6 text-xs text-muted-foreground"
                    disabled={isUploading}
                  >
                    <Upload className="h-3 w-3 mr-1" /> Replace video
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleMediaUpload(block, 'video'); }}
                className="h-16 w-full border-dashed text-xs text-muted-foreground"
                disabled={!canEditBlock || isUploading}
              >
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                ) : (
                  <><Video className="h-4 w-4 mr-2" /> Click to upload video</>
                )}
              </Button>
            )}
            <Input
              value={block.data.caption || ''}
              onChange={(e) => updateBlock(block.id, { ...block.data, caption: e.target.value })}
              placeholder="Caption (optional)..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent text-sm"
              onClick={(e) => e.stopPropagation()}
              readOnly={!canEditBlock}
              disabled={!canEditBlock}
            />
          </div>
        );
      }

      case 'file': {
        const isUploading = uploadingBlockId === block.id;
        return (
          <div className="space-y-2">
            {block.data.url ? (
              <div className="flex items-center gap-2 rounded-md border border-border p-2.5" onClick={(e) => e.stopPropagation()}>
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a href={block.data.url} download={block.data.filename || true} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-sm hover:underline">
                  {block.data.filename || 'Download file'}
                </a>
                {canEditBlock && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleMediaUpload(block, 'file'); }}
                    className="h-6 text-xs text-muted-foreground shrink-0"
                    disabled={isUploading}
                  >
                    <Upload className="h-3 w-3 mr-1" /> Replace
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleMediaUpload(block, 'file'); }}
                className="h-16 w-full border-dashed text-xs text-muted-foreground"
                disabled={!canEditBlock || isUploading}
              >
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                ) : (
                  <><FileText className="h-4 w-4 mr-2" /> Click to upload file</>
                )}
              </Button>
            )}
            <Input
              value={block.data.caption || ''}
              onChange={(e) => updateBlock(block.id, { ...block.data, caption: e.target.value })}
              placeholder="Caption (optional)..."
              className="border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 bg-transparent text-sm"
              onClick={(e) => e.stopPropagation()}
              readOnly={!canEditBlock}
              disabled={!canEditBlock}
            />
          </div>
        );
      }

      default:
        return <div className="text-sm text-muted-foreground">{block.type}</div>;
    }
  };

  const rows = getRows();
  const presentableBlocks = [...blocks].sort((a, b) => a.position - b.position);
  const QUESTION_BLOCK_TYPES = new Set(['multiple_choice', 'open_question', 'fill_in_blank', 'drag_drop', 'matching', 'ordering']);
  const questionNumberByBlockId = new Map<string, number>();
  {
    let n = 0;
    for (const b of presentableBlocks) {
      if (QUESTION_BLOCK_TYPES.has(b.type)) {
        n += 1;
        questionNumberByBlockId.set(b.id, n);
      }
    }
  }

  // Present mode: full takeover, one question at a time, everything but
  // the exit control disappears (matches docs/mockups/editor-redesign.html).
  if (isPresenting) {
    const currentBlock = presentableBlocks[presentIndex];
    return (
      <div className="h-screen flex flex-col bg-background text-foreground font-sans">
        <div className="flex justify-end p-3 border-b border-border">
          <Button variant="outline" size="sm" onClick={() => setIsPresenting(false)} className="h-8 gap-1.5">
            <X className="h-3.5 w-3.5" />
            {t.exitPresent}
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-auto">
          <p className="text-xs text-muted-foreground mb-4">
            {t.questionOf} {presentIndex + 1} / {presentableBlocks.length}
          </p>
          <div className="w-full max-w-xl">
            {currentBlock ? (
              <>
                {renderAttachedMediaBanner(currentBlock)}
                {renderBlockContent(currentBlock)}
              </>
            ) : (
              <p className="text-center text-muted-foreground">{t.noContentTitle}</p>
            )}
          </div>
          <div className="flex gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={presentIndex === 0}
              onClick={() => setPresentIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t.previous}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={presentIndex >= presentableBlocks.length - 1}
              onClick={() => setPresentIndex((i) => Math.min(presentableBlocks.length - 1, i + 1))}
            >
              {t.next}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="assignment-editor-root"
      className="h-screen flex flex-col bg-background text-foreground select-none font-sans"
      onPointerMove={handlePointerMove}
      style={{ touchAction: isDragging ? 'none' : 'auto' }}
    >
      {/* Top toolbar: back+title / Edit-View switch / ⋮ menu (docs/mockups/editor-redesign.html) */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-background">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="h-8 px-2.5 rounded-md surface-interactive gap-1.5 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Button>
          {localTitle && <span className="text-sm font-medium truncate hidden sm:inline">{localTitle}</span>}
          {isSaving && <span className="text-xs text-muted-foreground animate-pulse shrink-0">{t.saving}</span>}
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-muted p-0.5">
          <Button
            data-testid="assignment-edit-toggle"
            variant={isEditMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { if (!isEditMode) handleEditModeToggle(); }}
            className="h-7 rounded-md px-3 text-xs"
          >
            {t.editMode}
          </Button>
          <Button
            variant={!isEditMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { if (isEditMode) handleEditModeToggle(); }}
            className="h-7 rounded-md px-3 text-xs"
          >
            {t.viewMode}
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          {isTeacher && selectedBlockRecord && isEditMode && (
            <Popover>
              <PopoverTrigger asChild>
                <Button data-testid="assignment-size-button" variant="outline" size="icon" className="h-8 w-8 surface-interactive" title={t.size}>
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <Label className="text-xs">
                  {`${t.widthFor} ${BLOCK_TEMPLATES.find((item) => item.type === selectedBlockRecord.type)?.label || 'block'}`}
                </Label>
                <input
                  data-testid="assignment-size-slider"
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={selectedBlockRecord?.size ?? 3}
                  onChange={(e) => setBlockSize(selectedBlockRecord.id, Number(e.target.value) as 1 | 2 | 3)}
                  className="mt-2 w-full"
                />
              </PopoverContent>
            </Popover>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 surface-interactive" aria-label={isDutch ? 'Meer opties' : 'More options'}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => { setIsPresenting(true); setPresentIndex(0); }}>
                <Play className="h-4 w-4 mr-2" />
                {t.present}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={undo} disabled={historyIndex === 0}>
                <Undo2 className="h-4 w-4 mr-2" />
                {t.undo}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={redo} disabled={historyIndex >= history.length - 1}>
                <Redo2 className="h-4 w-4 mr-2" />
                {t.redo}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { if (!isEditMode) handleEditModeToggle(); setActiveSidebarTab('settings'); }}>
                <Pencil className="h-4 w-4 mr-2" />
                {t.assignmentSettings}
              </DropdownMenuItem>
              <DropdownMenuItem disabled title={t.docHistorySoon}>
                <History className="h-4 w-4 mr-2" />
                {t.docHistory}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                {t.export}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                {t.import}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { if (!isEditMode) handleEditModeToggle(); setActiveSidebarTab('workspace'); setCopyFromOpen(true); }}>
                <Copy className="h-4 w-4 mr-2" />
                {t.copyAssignment}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { if (!isEditMode) handleEditModeToggle(); setActiveSidebarTab('settings'); setMoveOpen(true); }}>
                <Move className="h-4 w-4 mr-2" />
                {t.moveButton}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/help')}>
                <HelpCircle className="h-4 w-4 mr-2" />
                {t.helpFaq}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteConfirmOpen(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                {t.deleteAssignment}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteConfirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleDeleteAssignment(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Paper area */}
        <div className="flex-1 overflow-auto p-2 md:p-3 surface-panel">
          <div
            ref={paperRef}
            data-testid="assignment-paper"
            className="surface-panel border border-border rounded-xl shadow-sm min-h-[calc(100vh-130px)] p-3 relative w-full"
          >
              {rows.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <p className="mb-2">{t.noContentTitle}</p>
                    <p className="text-sm">{t.noContentHint}</p>
                  </div>
                </div>
              ) : (
              <div className="mx-auto max-w-3xl">
                {rows.map((row, rowIndex) => (
                  <React.Fragment key={row.rowId}>
                    {/* Drop indicator before row */}
                    {isDragging && dropTarget?.rowIndex === rowIndex && !dropTarget.column && (
                      <div className="h-3 flex items-center justify-center">
                      <div className="h-1 w-full rounded-full bg-primary/70" />
                      </div>
                    )}

                    {/* Row */}
                      <div
                        className={cn(
                          'flex gap-2.5 py-3',
                          rowIndex < rows.length - 1 && 'border-b border-border/60'
                        )}
                        data-assignment-row-index={rowIndex}
                      >
                      {row.blocks[0]?.width === 'full' ? (
                        // Full width block
                        <div className="flex-1 relative group">
                          {/* Left drop zone */}
                          {isDragging && dropTarget?.rowIndex === rowIndex && dropTarget.column === 'left' && (
                            <div className="absolute left-0 top-0 bottom-0 w-1/2 flex items-center justify-start pl-2 pointer-events-none z-10">
                            <div className="h-full w-1 rounded-full bg-primary/70" />
                            </div>
                          )}
                          {/* Right drop zone */}
                          {isDragging && dropTarget?.rowIndex === rowIndex && dropTarget.column === 'right' && (
                            <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-end pr-2 pointer-events-none z-10">
                            <div className="h-full w-1 rounded-full bg-primary/70" />
                            </div>
                          )}
                          
                          <div
                            data-testid={`assignment-block-${row.blocks[0].id}`}
                            className={`${showTeacherControls ? 'px-3 pb-3 pt-11' : 'p-3'} border rounded-xl transition-all duration-200 ease-out ${
                              selectedBlock === row.blocks[0].id 
                                ? 'border-primary surface-panel' 
                                : 'border-border bg-background hover:surface-interactive'
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
                            <div className="absolute top-2 right-2 left-2 flex items-center justify-between gap-1 bg-background/95 border border-border rounded-lg px-1.5 py-1 shadow-sm opacity-100">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                {questionNumberByBlockId.has(row.blocks[0].id) && (
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                                    {questionNumberByBlockId.get(row.blocks[0].id)}
                                  </span>
                                )}
                                {BLOCK_TEMPLATES.find((t) => t.type === row.blocks[0].type)?.label || 'Block'}
                              </div>
                              <div className="flex items-center gap-1">
                                {(row.blocks[0].type === 'image' || row.blocks[0].type === 'video') && questionNumberByBlockId.size > 0 && (
                                  <select
                                    className="h-6 text-[11px] border border-border rounded-md bg-background px-1 surface-chip"
                                    value={row.blocks[0].attachedToBlockId || ''}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => updateBlockAttachment(row.blocks[0].id, e.target.value || null)}
                                    title={isDutch ? 'Koppel aan vraag' : 'Attach to question'}
                                  >
                                    <option value="">{isDutch ? 'Niet gekoppeld' : 'Not attached'}</option>
                                    {presentableBlocks.filter((b) => questionNumberByBlockId.has(b.id)).map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {isDutch ? 'Vraag' : 'Q'} {questionNumberByBlockId.get(b.id)}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] surface-chip" title="Block size">
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
                                  className="h-6 w-6 p-0 flex items-center justify-center cursor-grab surface-chip hover:surface-interactive rounded"
                                  onPointerDown={(e) => handleGripPointerDown(e, row.blocks[0].id)}
                                  title="Move block"
                                >
                                  <GripVertical className="h-3 w-3" />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); deleteBlock(row.blocks[0].id); }}
                                  className="h-6 w-6 p-0 surface-chip text-destructive"
                                  title="Delete block"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            )}
                            
                            {renderAttachedMediaBanner(row.blocks[0])}
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
                    <div className="h-full w-1 rounded-full bg-primary/70" />
                                  </div>
                                )}
                                
                                {block ? (
                                  <div
                                    data-testid={`assignment-block-${block.id}`}
                                    className={`h-full ${showTeacherControls ? 'px-3 pb-3 pt-11' : 'p-3'} border rounded-xl transition-all duration-200 ease-out ${
                                      selectedBlock === block.id 
                                        ? 'border-primary surface-panel' 
                                        : 'border-border bg-background hover:surface-interactive'
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
                                    <div className="absolute top-2 right-2 left-2 flex items-center justify-between gap-1 bg-background/95 border border-border rounded-lg px-1.5 py-1 shadow-sm opacity-100">
                                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                        {questionNumberByBlockId.has(block.id) && (
                                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                                            {questionNumberByBlockId.get(block.id)}
                                          </span>
                                        )}
                                        {BLOCK_TEMPLATES.find((t) => t.type === block.type)?.label || 'Block'}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] surface-chip" title="Block size">
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
                                          className="h-6 w-6 p-0 flex items-center justify-center cursor-grab surface-chip hover:surface-interactive rounded"
                                          onPointerDown={(e) => handleGripPointerDown(e, block.id)}
                                          title="Move block"
                                        >
                                          <GripVertical className="h-3 w-3" />
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                          className="h-6 w-6 p-0 surface-chip text-destructive"
                                          title="Delete block"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    )}
                                    
                                    {renderAttachedMediaBanner(block)}
                                    {renderBlockContent(block)}
                                  </div>
                                ) : (
                                  <div className="h-full rounded-lg border border-border surface-panel p-2">
                                    <div className="rounded-md border border-border/70 bg-background p-2">
                                      <div className="mb-1.5 h-2.5 w-24 rounded surface-interactive" />
                                      <div className="h-2 w-full rounded surface-chip" />
                                      <div className="mt-1 h-2 w-4/5 rounded surface-chip" />
                                    </div>
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
                  <div className="h-3 flex items-center justify-center">
                    <div className="h-1 w-full rounded-full bg-primary/70" />
                  </div>
                )}
              </div>
            )}
            
            {/* Empty drop zone at bottom */}
            {isDragging && rows.length > 0 && (
              <div className="mt-4 rounded-xl border border-border surface-panel p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/80 bg-background p-2">
                    <div className="mb-1.5 h-2.5 w-20 rounded surface-interactive" />
                    <div className="h-2 w-full rounded surface-chip" />
                    <div className="mt-1 h-2 w-3/5 rounded surface-chip" />
                  </div>
                  <div className="rounded-lg border border-border/80 bg-background p-2">
                    <div className="mb-1.5 h-2.5 w-28 rounded surface-interactive" />
                    <div className="h-2 w-full rounded surface-chip" />
                    <div className="mt-1 h-2 w-2/3 rounded surface-chip" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showTeacherControls && (
          <aside className="w-[320px] border-l border-border bg-background flex flex-col overflow-hidden">
            <div className="flex shrink-0 border-b border-border">
              {([
                { key: 'workspace' as const, label: t.tabWorkspace },
                { key: 'settings' as const, label: t.tabSettings },
                { key: 'information' as const, label: t.tabInformation },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveSidebarTab(tab.key)}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                    activeSidebarTab === tab.key
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-3">
            {activeSidebarTab === 'workspace' && (
              <>
              <div className="rounded-xl border border-border surface-panel p-3">
                <div className="text-[11px] font-medium text-muted-foreground mb-2">Blocks</div>
                <div className="space-y-1.5">
                  {BLOCK_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      data-testid={`assignment-template-${template.id}`}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab hover:surface-interactive border border-transparent hover:border-border"
                      onPointerDown={(e) => handleTemplatePointerDown(e, template.id)}
                    >
                      {template.icon}
                      <span className="text-sm">{template.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedBlock && (() => {
                const block = blocks.find((b) => b.id === selectedBlock);
                if (!block) return null;
                const s = normalizeBlockSettings(block.settings || {});
                const isQuestionBlock = ['multiple_choice', 'open_question', 'fill_in_blank', 'drag_drop', 'matching', 'ordering'].includes(block.type);
                return (
                  <div className="rounded-xl border border-border surface-panel p-3 space-y-2">
                    <div className="text-[11px] font-medium text-muted-foreground">Question Settings</div>
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

              {/* Automation last: blocks + per-block settings come first, AI
                  assist and copy-from live at the bottom of the tab. */}
              <div className="rounded-xl border border-border surface-panel p-3 space-y-2">
                <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  {isDutch ? 'Zeg wat je wilt toevoegen' : 'Say what to add'}
                </div>
                <Textarea
                  value={aiCommand}
                  onChange={(e) => setAiCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleAiCommandSubmit();
                    }
                  }}
                  placeholder={isDutch ? 'bv. "maak een multiple choice blok over fotosynthese"' : 'e.g. "make a multiple choice block about photosynthesis"'}
                  rows={2}
                  disabled={aiCommandLoading}
                  className="text-xs resize-none"
                  maxLength={500}
                />
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={aiIncludeSiblingContext}
                    onChange={(e) => setAiIncludeSiblingContext(e.target.checked)}
                    className="h-3 w-3"
                  />
                  {isDutch ? 'Ook vorige paragrafen/hoofdstukken gebruiken' : 'Also use previous paragraphs/chapters'}
                </label>
                <Button
                  size="sm"
                  className="h-7 w-full text-xs"
                  disabled={!aiCommand.trim() || aiCommandLoading}
                  onClick={() => void handleAiCommandSubmit()}
                >
                  {aiCommandLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>{isDutch ? 'Invoegen' : 'Insert'}</>
                  )}
                </Button>
              </div>
              <Popover open={copyFromOpen} onOpenChange={setCopyFromOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-full justify-start gap-2">
                    <Copy className="h-3.5 w-3.5" />
                    {isDutch ? 'Kopieer blokken van...' : 'Copy blocks from...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 space-y-2.5">
                  <p className="text-[11px] font-medium text-muted-foreground">{isDutch ? 'Kopieer van een andere opdracht' : 'Copy from another assignment'}</p>
                  <select
                    value={copyChapterId}
                    onChange={(e) => setCopyChapterId(e.target.value)}
                    className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background h-8"
                    disabled={isLoadingCopyOptions}
                  >
                    <option value="">{isDutch ? 'Kies hoofdstuk...' : 'Choose chapter...'}</option>
                    {copyChapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <select
                    value={copyParagraphId}
                    onChange={(e) => setCopyParagraphId(e.target.value)}
                    className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background h-8"
                    disabled={!copyChapterId}
                  >
                    <option value="">{isDutch ? 'Kies paragraaf...' : 'Choose paragraph...'}</option>
                    {copyParagraphs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  <select
                    value={copyAssignmentId}
                    onChange={(e) => setCopyAssignmentId(e.target.value)}
                    className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background h-8"
                    disabled={!copyParagraphId}
                  >
                    <option value="">{isDutch ? 'Kies opdracht...' : 'Choose assignment...'}</option>
                    {copyAssignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                  <Button size="sm" className="h-7 w-full text-xs" disabled={!copyAssignmentId || isCopyingBlocks} onClick={handleCopyBlocks}>
                    {isCopyingBlocks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (isDutch ? 'Kopiëren' : 'Copy')}
                  </Button>
                </PopoverContent>
              </Popover>
              </>
            )}

            {activeSidebarTab === 'settings' && (
              <>
              <div className="rounded-xl border border-border surface-panel p-3 space-y-2.5">
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground">{t.titleLabel}</Label>
                  <Input
                    value={localTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="h-8 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground">{t.descriptionLabel}</Label>
                  <Textarea
                    value={localDescription}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    rows={2}
                    className="text-sm resize-none mt-1"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 rounded-xl border border-border surface-panel p-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={isTest}
                  onChange={(e) => handleTestToggle(e.target.checked)}
                />
                <span className="text-sm">
                  <span className="block font-medium">{t.isTestLabel}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{t.isTestHint}</span>
                </span>
              </label>

              <label className="flex items-start gap-2 rounded-xl border border-border surface-panel p-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={localIsVisible}
                  onChange={(e) => handleVisibleToggle(e.target.checked)}
                />
                <span className="text-sm">
                  <span className="block font-medium">{t.visibleLabel}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{t.visibleHint}</span>
                </span>
              </label>

              <label className="flex items-start gap-2 rounded-xl border border-border surface-panel p-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={localAnswersEnabled}
                  onChange={(e) => handleAnswersEnabledToggle(e.target.checked)}
                />
                <span className="text-sm">
                  <span className="block font-medium">{t.answersEnabledLabel}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{t.answersEnabledHint}</span>
                </span>
              </label>

              <Popover open={moveOpen} onOpenChange={setMoveOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-full justify-start gap-2">
                    <Move className="h-3.5 w-3.5" />
                    {t.moveButton}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 space-y-2.5">
                  <p className="text-[11px] font-medium text-muted-foreground">{t.moveTitle}</p>
                  <select
                    value={moveSubjectId}
                    onChange={(e) => setMoveSubjectId(e.target.value)}
                    className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background h-8"
                    disabled={isLoadingMoveOptions}
                  >
                    <option value="">{t.moveChooseSubject}</option>
                    {moveSubjects.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                  <select
                    value={moveChapterId}
                    onChange={(e) => setMoveChapterId(e.target.value)}
                    className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background h-8"
                    disabled={!moveSubjectId}
                  >
                    <option value="">{t.moveChooseChapter}</option>
                    {moveChapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <select
                    value={moveParagraphId}
                    onChange={(e) => setMoveParagraphId(e.target.value)}
                    className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background h-8"
                    disabled={!moveChapterId}
                  >
                    <option value="">{t.moveChooseParagraph}</option>
                    {moveParagraphs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  <Button size="sm" className="h-7 w-full text-xs" disabled={!moveParagraphId || isMoving} onClick={handleMoveAssignment}>
                    {isMoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.moveConfirm}
                  </Button>
                </PopoverContent>
              </Popover>

              <div className="rounded-xl border border-border surface-panel p-3 space-y-2">
                <div className="text-[11px] font-medium text-muted-foreground">{t.shareTitle}</div>
                <p className="text-xs text-muted-foreground">{t.shareHint}</p>
                {shareCode ? (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">{t.shareCode}</Label>
                      <Input value={shareCode} readOnly className="h-8 text-sm font-mono tracking-wider mt-1" />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">{t.shareLink}</Label>
                      <Input
                        value={typeof window !== 'undefined' ? `${window.location.origin}/tests/import/${shareCode}` : ''}
                        readOnly
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 w-full text-xs" disabled={isSharing} onClick={handleGenerateShareCode}>
                    {isSharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.shareGenerate}
                  </Button>
                )}
              </div>

              <div className="rounded-xl border border-border surface-panel p-1">
                <AssignmentSettingsOverlay
                  settings={localSettings}
                  onSettingsChange={handleAdvancedSettingsChange}
                />
              </div>
              </>
            )}

            {activeSidebarTab === 'information' && (
              <>
              {isLoadingInfo ? (
                <div className="rounded-xl border border-border surface-panel p-3 text-xs text-muted-foreground">{t.infoLoading}</div>
              ) : !infoData || infoData.total_answers === 0 ? (
                <div className="rounded-xl border border-border surface-panel p-3 text-xs text-muted-foreground">{t.infoNoData}</div>
              ) : (
                <>
                  <div className="rounded-xl border border-border surface-panel p-3 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] text-muted-foreground">{t.infoQuestions}</div>
                      <div className="text-lg font-semibold">{infoData.total_questions}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">{t.infoAnswers}</div>
                      <div className="text-lg font-semibold">{infoData.total_answers}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border surface-panel p-3 space-y-2">
                    <div className="text-[11px] font-medium text-muted-foreground mb-1">{t.infoStudents}</div>
                    {infoData.student_scores.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t.infoNoSubmissions}</p>
                    ) : (
                      infoData.student_scores.map((s) => (
                        <div key={s.student_id} className="flex items-center justify-between gap-2 text-xs border-b border-border/60 pb-2 last:border-0 last:pb-0">
                          <span className="truncate">{s.name}</span>
                          <span className="text-right shrink-0 text-muted-foreground">
                            {s.correct_count}/{s.total_answered} · {s.score_percent.toFixed(0)}%
                            {typeof s.time_spent_minutes === 'number' && (
                              <> · {s.time_spent_minutes} {t.infoMinutes} {t.infoTimeSpent}</>
                            )}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="rounded-xl border border-border surface-panel p-3 space-y-2">
                    {infoData.question_metrics.map((m, i) => (
                      <div key={m.block_id} className="flex items-center justify-between gap-2 text-xs border-b border-border/60 pb-2 last:border-0 last:pb-0">
                        <span className="text-muted-foreground shrink-0">#{i + 1} {m.type.replace('_', ' ')}</span>
                        <span className="text-right">
                          {m.attempts} {t.infoAttempts} · {m.average_score.toFixed(1)} {t.infoAvgScore} · {m.difficulty_percent.toFixed(0)}% {t.infoDifficulty}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              </>
            )}
            </div>
            </div>
          </aside>
        )}
      </div>

    </div>
  );
}

