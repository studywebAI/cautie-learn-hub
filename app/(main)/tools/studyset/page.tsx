'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  Archive,
  BarChart3,
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Layers,
  Link2,
  Link,
  Map,
  Plus,
  Route,
  Search,
  Upload,
  FileText,
  Youtube,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { MicrosoftAppStrip } from '@/components/tools/microsoft-app-strip';
import { PageSection } from '@/components/layout/page-section';
import { ICON_OPTIONS, COLOR_OPTIONS, colorHex, iconForId, statusMeta } from '@/components/studyset/style-options';
import { AgendaTemplatePicker, type AgendaTemplateSeed } from '@/components/studyset/agenda-template-picker';
import { SubjectTopicPicker, type SubjectTopicSeed } from '@/components/studyset/subject-topic-picker';

type StudysetRow = {
  id: string;
  name: string;
  target_days: number;
  minutes_per_day: number;
  status: string;
  updated_at: string;
  source_bundle?: string | null;
  meta?: {
    icon?: string | null;
    color?: string | null;
    subject?: string | null;
    exam_date?: string | null;
    description?: string | null;
  } | null;
  progress?: {
    total_tasks: number;
    completed_tasks: number;
    percent: number;
  } | null;
  analytics_summary?: {
    avg_score: number;
    recent_attempts_7d: number;
    due_today_tasks: number;
    pending_interventions: number;
    weakest_tool: string | null;
  } | null;
  next_task_id?: string | null;
  next_task_href?: string | null;
};

type MicrosoftFileItem = {
  id: string;
  name: string;
  webUrl?: string;
  size?: number;
  lastModifiedDateTime?: string;
  kind: 'onedrive';
  mimeType?: string;
  extractedText?: string;
  extractionStatus?: string;
};

type UploadMeta = {
  name: string;
  size: number;
  type: string;
  extractedText?: string;
  extractionStatus?: 'ready' | 'empty' | 'error';
};

const STEP_TITLES = ['Basics', 'Calendar', 'Sources', 'Tools'];

// Tool mindmap — same icons/labels the studyset detail page uses for plan tasks
// (toolMeta: quiz=Brain, flashcards=Layers, wordweb=Map, notes=FileText), so
// picking a tool here looks/feels exactly like seeing it later in the plan.
const TOOL_DEFINITIONS: Array<{ id: string; label: string; description: string; Icon: typeof Brain }> = [
  { id: 'notes', label: 'Notes', description: 'Structured study notes per topic.', Icon: FileText },
  { id: 'flashcards', label: 'Flashcards', description: 'Spaced-repetition recall cards.', Icon: Layers },
  { id: 'quiz', label: 'Quiz', description: 'Practice questions that test yourself.', Icon: Brain },
  { id: 'wordweb', label: 'Concept map', description: 'Visual webs that connect ideas.', Icon: Map },
];

// A focused subset of the quiz tool's question-type catalogue — the styles that
// translate well into a mixed day-by-day plan (no niche types needing content
// flags). Selecting these biases what the AI leans toward for quiz sessions.
const QUIZ_QUESTION_TYPE_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'multiple-choice', label: 'Multiple Choice', description: 'Pick the correct answer from options.' },
  { value: 'true-false', label: 'True / False', description: 'Is the statement true or false?' },
  { value: 'fill-blank', label: 'Fill in the Blank', description: 'Complete the missing word or phrase.' },
  { value: 'short-answer', label: 'Short Answer', description: 'Write a brief answer in your own words.' },
  { value: 'matching', label: 'Matching', description: 'Connect related items from two columns.' },
  { value: 'cloze', label: 'Cloze Test', description: 'Fill in the blanks within a passage.' },
];

// ── Output-control options ────────────────────────────────────────────────
const DIFFICULTY_OPTIONS = [
  { value: 'beginner',     label: 'Beginner',     description: 'Simple language, introductory-level depth.' },
  { value: 'intermediate', label: 'Intermediate', description: 'Standard course-level challenge.' },
  { value: 'advanced',     label: 'Advanced',     description: 'Nuanced, deeper detail.' },
  { value: 'expert',       label: 'Expert',       description: 'Exam / professional-level rigour.' },
] as const;

const DEPTH_OPTIONS = [
  { value: 'overview',  label: 'Overview',       description: 'Key points only — fast review.' },
  { value: 'standard',  label: 'Standard',       description: 'Balanced detail for most sessions.' },
  { value: 'deep',      label: 'Comprehensive',  description: 'Full depth — longer output.' },
] as const;

const TONE_OPTIONS = [
  { value: 'tutor',   label: 'Tutor',        description: 'Explains as if teaching you step by step.' },
  { value: 'exam',    label: 'Exam trainer', description: 'Strict, test-style questions and answers.' },
  { value: 'summary', label: 'Summary',      description: 'Concise bullet-point overview.' },
] as const;

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Match source' },
  { value: 'nl',   label: 'Dutch' },
  { value: 'en',   label: 'English' },
  { value: 'de',   label: 'German' },
  { value: 'fr',   label: 'French' },
  { value: 'es',   label: 'Spanish' },
];

// ── URL source type ──────────────────────────────────────────────────────────
type UrlSource = { id: string; url: string; label: string };

const SOFT_SURFACE = 'border border-border/60 bg-surface-1/50';
const SECTION_HEADING = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3';
const CALENDAR_CLASSES = {
  day_selected:
    'bg-surface-chip text-foreground hover:bg-surface-chip hover:text-foreground focus:bg-surface-chip focus:text-foreground',
  day_today: 'bg-surface-1 text-foreground',
  day_range_middle: 'aria-selected:bg-surface-chip aria-selected:text-foreground',
};

function toIsoLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDates(dates: Date[]) {
  const unique = new Set(dates.map((date) => toIsoLocalDate(date)));
  return Array.from(unique).sort();
}

function parseSourceMeta(raw: string | null | undefined) {
  if (!raw) return { icon: null as string | null, color: null as string | null };
  try {
    const parsed = JSON.parse(raw);
    const icon = typeof parsed?.meta?.icon === 'string' ? parsed.meta.icon : null;
    const color = typeof parsed?.meta?.color === 'string' ? parsed.meta.color : null;
    return { icon, color };
  } catch {
    return { icon: null, color: null };
  }
}

function getMicrosoftErrorMessage(code: string) {
  const map: Record<string, string> = {
    access_denied: 'Microsoft connection was canceled.',
    invalid_state: 'Connection expired. Please try linking again.',
    unauthorized: 'Please log in before linking Microsoft.',
    integration_not_configured: 'Microsoft integration is not configured yet.',
    token_exchange_failed: 'Could not complete Microsoft sign-in. Please retry.',
    microsoft_connect_failed: 'Could not link Microsoft. Please retry.',
  };
  return map[code] || map.microsoft_connect_failed;
}

export default function StudysetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [view, setView] = useState<'home' | 'create'>('home');
  const [step, setStep] = useState(0);
  const [studysets, setStudysets] = useState<StudysetRow[]>([]);
  const [loadingStudysets, setLoadingStudysets] = useState(true);

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [notesText, setNotesText] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [uploads, setUploads] = useState<UploadMeta[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Source method — the 3-option scheme: start from an agenda item (class template),
  // a real subject/chapter/paragraph from the curriculum, or a basic upload.
  const [sourceMethod, setSourceMethod] = useState<'agenda' | 'subject' | 'upload'>('upload');
  const [linkedSeed, setLinkedSeed] = useState<{
    sourceId: string | null;
    label: string;
    subject: string | null;
    examDate: string | null;
  } | null>(null);

  // Tool mindmap — which output tools the AI should lean toward when mixing the
  // day-by-day plan, plus quiz-specific question-type preferences (mirrors the
  // quiz tool's "options" phase, scaled down to what a studyset plan can use).
  const [selectedTools, setSelectedTools] = useState<string[]>(['notes', 'flashcards', 'quiz', 'wordweb']);
  const [quizQuestionTypes, setQuizQuestionTypes] = useState<string[]>(['multiple-choice', 'true-false']);

  // ── Output preferences (Step 3 — passed straight to /generate) ────────────
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
  const [depth, setDepth] = useState<'overview' | 'standard' | 'deep'>('standard');
  const [outputLanguage, setOutputLanguage] = useState('auto');
  const [tone, setTone] = useState<'tutor' | 'exam' | 'summary'>('tutor');
  const [onlyMySources, setOnlyMySources] = useState(false);
  const [includeExamples, setIncludeExamples] = useState(true);

  // ── Extra source types ───────────────────────────────────────────────────
  const [urlSources, setUrlSources] = useState<UrlSource[]>([]);
  const [urlInput, setUrlInput] = useState('');

  // ── Home search / sort ────────────────────────────────────────────────────
  const [homeSearch, setHomeSearch] = useState('');
  const [homeSort, setHomeSort] = useState<'recent' | 'name' | 'progress'>('recent');

  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [microsoftEmail, setMicrosoftEmail] = useState('');
  const [selectedMicrosoftFiles, setSelectedMicrosoftFiles] = useState<MicrosoftFileItem[]>([]);

  const [creating, setCreating] = useState(false);
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  const activeStudysets = useMemo(() => studysets.filter((row) => row.status !== 'archived'), [studysets]);
  const archivedStudysets = useMemo(() => studysets.filter((row) => row.status === 'archived'), [studysets]);
  const todayItems = useMemo(
    () =>
      activeStudysets
        .filter((row) => Number(row.analytics_summary?.due_today_tasks || 0) > 0)
        .sort(
          (a, b) =>
            Number(b.analytics_summary?.due_today_tasks || 0) - Number(a.analytics_summary?.due_today_tasks || 0)
        ),
    [activeStudysets]
  );

  const usedMeta = useMemo(() => {
    const icons = new Set<string>();
    const colors = new Set<string>();
    for (const row of studysets) {
      const meta = parseSourceMeta(row.source_bundle);
      if (meta.icon) icons.add(meta.icon);
      if (meta.color) colors.add(meta.color);
    }
    return { icons, colors };
  }, [studysets]);

  const selectedDateStrings = useMemo(() => normalizeDates(selectedDates), [selectedDates]);
  const sortedOneDriveFiles = useMemo(() => selectedMicrosoftFiles.slice(0, 24), [selectedMicrosoftFiles]);

  const isStepOneReady = name.trim().length > 0;
  const isStepTwoReady = selectedDateStrings.length > 0;
  const hasExtractedUploads = uploads.some((file) => (file.extractedText || '').trim().length > 0);
  const hasExtractedMicrosoft = selectedMicrosoftFiles.some((file) => (file.extractedText || '').trim().length > 0);
  const isStepThreeReady =
    notesText.trim().length > 0 ||
    pastedText.trim().length > 0 ||
    hasExtractedUploads ||
    hasExtractedMicrosoft ||
    urlSources.length > 0;
  const isStepFourReady = selectedTools.length > 0;

  const resetWizard = () => {
    setStep(0);
    setName('');
    setSelectedIcon(null);
    setSelectedColor(null);
    setSelectedDates([]);
    setNotesText('');
    setPastedText('');
    setUploads([]);
    setSelectedMicrosoftFiles([]);
    setSourceMethod('upload');
    setLinkedSeed(null);
    setSelectedTools(['notes', 'flashcards', 'quiz', 'wordweb']);
    setQuizQuestionTypes(['multiple-choice', 'true-false']);
    setDifficulty('intermediate');
    setDepth('standard');
    setOutputLanguage('auto');
    setTone('tutor');
    setOnlyMySources(false);
    setIncludeExamples(true);
    setUrlSources([]);
    setUrlInput('');
  };

  const addUrlSource = () => {
    const raw = urlInput.trim();
    if (!raw) return;
    let url = raw;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const isYT = /youtube\.com|youtu\.be/i.test(url);
    setUrlSources((prev) => [...prev, { id: crypto.randomUUID(), url, label: isYT ? 'YouTube' : 'URL' }]);
    setUrlInput('');
  };

  const removeUrlSource = (id: string) => setUrlSources((prev) => prev.filter((s) => s.id !== id));

  const filteredActiveStudysets = useMemo(() => {
    let list = activeStudysets;
    if (homeSearch.trim()) {
      const q = homeSearch.toLowerCase();
      list = list.filter((row) => row.name.toLowerCase().includes(q) || (row.meta?.subject || '').toLowerCase().includes(q));
    }
    if (homeSort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (homeSort === 'progress') list = [...list].sort((a, b) => (b.progress?.percent ?? 0) - (a.progress?.percent ?? 0));
    // 'recent' = default API order (updated_at DESC)
    return list;
  }, [activeStudysets, homeSearch, homeSort]);

  const toggleTool = (id: string) => {
    setSelectedTools((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((value) => value !== id);
        return next.length > 0 ? next : prev; // always keep at least one tool active
      }
      return [...prev, id];
    });
  };

  const toggleQuizQuestionType = (value: string) => {
    setQuizQuestionTypes((prev) => {
      if (prev.includes(value)) {
        const next = prev.filter((entry) => entry !== value);
        return next.length > 0 ? next : prev; // always keep at least one style active
      }
      return [...prev, value];
    });
  };

  const loadStudysets = async () => {
    setLoadingStudysets(true);
    try {
      const response = await fetch('/api/studysets', { cache: 'no-store' });
      if (!response.ok) {
        setStudysets([]);
        return;
      }
      const data = await response.json();
      setStudysets(Array.isArray(data?.studysets) ? data.studysets : []);
    } catch {
      setStudysets([]);
    } finally {
      setLoadingStudysets(false);
    }
  };

  const loadMicrosoftStatus = async () => {
    try {
      const response = await fetch('/api/integrations/microsoft/status', { cache: 'no-store' });
      if (!response.ok) {
        setMicrosoftConnected(false);
        setMicrosoftEmail('');
        return;
      }
      const data = await response.json();
      setMicrosoftConnected(Boolean(data?.connected));
      setMicrosoftEmail(String(data?.account_email || ''));
    } catch {
      setMicrosoftConnected(false);
      setMicrosoftEmail('');
    }
  };

  const loadMicrosoftSelectedFiles = async () => {
    if (!microsoftConnected) {
      setSelectedMicrosoftFiles([]);
      return;
    }
    try {
      const response = await fetch('/api/integrations/context-sources?provider=microsoft&app=onedrive&selected=1', {
        cache: 'no-store',
      });
      const json = await response.json().catch(() => ({}));
      const items = Array.isArray(json?.items) ? json.items : [];
      const mapped: MicrosoftFileItem[] = items.map((item: any) => ({
        id: String(item?.provider_item_id || item?.id || ''),
        name: String(item?.name || 'Untitled'),
        webUrl: item?.web_url ? String(item.web_url) : undefined,
        size: typeof item?.metadata?.size === 'number' ? item.metadata.size : undefined,
        lastModifiedDateTime: typeof item?.metadata?.last_modified === 'string' ? item.metadata.last_modified : undefined,
        kind: 'onedrive',
        mimeType: item?.mime_type ? String(item.mime_type) : undefined,
        extractedText: typeof item?.extracted_text === 'string' ? item.extracted_text : '',
        extractionStatus: typeof item?.extraction_status === 'string' ? item.extraction_status : undefined,
      })).filter((item: MicrosoftFileItem) => Boolean(item.id));
      setSelectedMicrosoftFiles(mapped);
    } catch {
      setSelectedMicrosoftFiles([]);
    }
  };

  useEffect(() => {
    void loadStudysets();
    void loadMicrosoftStatus();
  }, []);

  useEffect(() => {
    if (searchParams.get('ms') === 'connected') {
      toast({ title: 'Microsoft connected', description: 'OneDrive files are ready.' });
      void loadMicrosoftStatus();
      void loadMicrosoftSelectedFiles();
      const params = new URLSearchParams(searchParams.toString());
      params.delete('ms');
      params.delete('ms_error');
      const nextQuery = params.toString();
      router.replace(nextQuery ? `/tools/studyset?${nextQuery}` : '/tools/studyset');
      return;
    }
    const msError = searchParams.get('ms_error');
    if (msError) {
      toast({ title: 'Microsoft connect failed', description: getMicrosoftErrorMessage(msError), variant: 'destructive' });
      router.replace('/tools/studyset');
    }
  }, [router, searchParams, toast]);

  useEffect(() => {
    if (searchParams.get('open') === 'create') {
      setView('create');
      const rawStep = Number(searchParams.get('step'));
      if (!Number.isNaN(rawStep)) {
        setStep(Math.max(0, Math.min(3, rawStep)));
      }
    }
  }, [searchParams]);

  useEffect(() => {
    void loadMicrosoftSelectedFiles();
  }, [microsoftConnected]);

  useEffect(() => {
    const onUpdated = () => {
      void loadMicrosoftSelectedFiles();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('integration-sources-updated', onUpdated as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('integration-sources-updated', onUpdated as EventListener);
      }
    };
  }, [loadMicrosoftSelectedFiles]);

  const startCreate = () => {
    resetWizard();
    setView('create');
  };

  const goNext = () => {
    if (step === 0 && !isStepOneReady) return;
    if (step === 1 && !isStepTwoReady) return;
    if (step === 2 && !isStepThreeReady) return;
    setStep((value) => Math.min(3, value + 1));
  };

  const canNext =
    step === 0 ? isStepOneReady : step === 1 ? isStepTwoReady : step === 2 ? isStepThreeReady : false;

  const autoPickMeta = () => {
    const icon =
      selectedIcon || ICON_OPTIONS.find((option) => !usedMeta.icons.has(option.id))?.id || ICON_OPTIONS[0].id;
    const color =
      selectedColor || COLOR_OPTIONS.find((option) => !usedMeta.colors.has(option.id))?.id || COLOR_OPTIONS[0].id;
    return { icon, color };
  };

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploadingFiles(true);
    const mapped = await Promise.all(
      files.map(async (file) => {
        try {
          if (file.type === 'text/plain') {
            const text = (await file.text()).trim();
            return {
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              extractedText: text,
              extractionStatus: text ? 'ready' as const : 'empty' as const,
            };
          }

          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/tools/extract-text', { method: 'POST', body: formData });
          if (!res.ok) {
            return {
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              extractedText: '',
              extractionStatus: 'error' as const,
            };
          }

          const data = await res.json().catch(() => ({}));
          const text = typeof data?.text === 'string' ? data.text.trim() : '';
          return {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            extractedText: text,
            extractionStatus: text ? 'ready' as const : 'empty' as const,
          };
        } catch {
          return {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            extractedText: '',
            extractionStatus: 'error' as const,
          };
        }
      })
    );

    setUploads(mapped);
    const missingTextCount = mapped.filter((file) => (file.extractedText || '').trim().length === 0).length;
    if (missingTextCount > 0) {
      toast({
        title: 'Some files have no extracted text',
        description: `${missingTextCount} file${missingTextCount === 1 ? '' : 's'} will be ignored until extraction succeeds.`,
      });
    }
    setIsUploadingFiles(false);
  };

  const disconnectMicrosoft = async () => {
    const response = await fetch('/api/integrations/microsoft/disconnect', { method: 'POST' });
    if (!response.ok) return;
    setMicrosoftConnected(false);
    setMicrosoftEmail('');
    setSelectedMicrosoftFiles([]);
  };

  // Applying a real agenda item or curriculum topic seeds the focus notes (so the
  // generation has real context) and remembers subject/exam-date so they land on
  // the studyset itself — not just inside the source bundle.
  const applyAgendaSeed = (seed: AgendaTemplateSeed) => {
    setLinkedSeed({ sourceId: seed.id, label: seed.label, subject: seed.subject, examDate: seed.examDate });
    setNotesText(seed.focusNote);
    setShowNotesInput(true);
    toast({ title: 'Linked to your agenda', description: `Focus notes filled in for "${seed.title}".` });
  };

  const applySubjectSeed = (seed: SubjectTopicSeed) => {
    setLinkedSeed({ sourceId: null, label: seed.label, subject: seed.subject, examDate: null });
    setNotesText(seed.focusNote);
    setShowNotesInput(true);
    toast({ title: 'Linked to your curriculum', description: 'Focus notes filled in — feel free to adjust them.' });
  };

  const createStudyset = async () => {
    if (!isStepOneReady || !isStepTwoReady || !isStepThreeReady) return;
    setCreating(true);
    try {
      const meta = autoPickMeta();
      const extractedUploadFiles = uploads
        .map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          extracted_text: (file.extractedText || '').trim(),
          extraction_status: file.extractionStatus || ((file.extractedText || '').trim() ? 'ready' : 'empty'),
        }))
        .filter((file) => file.extracted_text.length > 0);

      const extractedMicrosoftFiles = selectedMicrosoftFiles
        .map((file) => ({
          id: file.id,
          name: file.name,
          kind: file.kind,
          web_url: file.webUrl || null,
          mime_type: file.mimeType || null,
          size: file.size || null,
          last_modified: file.lastModifiedDateTime || null,
          extracted_text: (file.extractedText || '').trim(),
          extraction_status: file.extractionStatus || ((file.extractedText || '').trim() ? 'ready' : 'empty'),
        }))
        .filter((file) => file.extracted_text.length > 0);

      const sourcePayload = {
        meta: {
          icon: meta.icon,
          color: meta.color,
        },
        schedule: {
          selected_dates: selectedDateStrings,
        },
        // Tool mindmap — what the user picked in the "Tools" step. Stored here so
        // Settings/Analytics can read it back later, and also sent straight to
        // /generate below so the AI plan genuinely leans toward these picks.
        preferences: {
          tools: selectedTools,
          quiz_question_types: selectedTools.includes('quiz') ? quizQuestionTypes : [],
          // Output control — passed to every generation call for this studyset.
          output: {
            difficulty,
            depth,
            language: outputLanguage,
            tone,
            only_my_sources: onlyMySources,
            include_examples: includeExamples,
          },
        },
        sources: {
          notes_text: notesText.trim(),
          pasted_text: pastedText.trim(),
          uploaded_files: extractedUploadFiles,
          url_sources: urlSources.map((s) => ({ url: s.url, label: s.label })),
          imports: {
            word: false,
            powerpoint: false,
            onedrive: extractedMicrosoftFiles.length > 0,
            access_mode: 'read_only',
            microsoft_account: microsoftEmail || null,
            selected_documents: extractedMicrosoftFiles,
          },
          // Real link back to the agenda item / curriculum topic the user picked
          // in the "class template" / "subject pick" flow (when applicable).
          linked_source: linkedSeed
            ? {
                method: sourceMethod,
                agenda_item_id: linkedSeed.sourceId,
                label: linkedSeed.label,
                subject: linkedSeed.subject,
                exam_date: linkedSeed.examDate,
              }
            : null,
        },
      };

      const createRes = await fetch('/api/studysets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          confidence_level: 'beginner',
          target_days: selectedDateStrings.length,
          minutes_per_day: 45,
          source_bundle: JSON.stringify(sourcePayload),
          ...(linkedSeed?.subject ? { subject: linkedSeed.subject } : {}),
          ...(linkedSeed?.examDate ? { exam_date: linkedSeed.examDate } : {}),
        }),
      });

      if (!createRes.ok) {
        const message = await createRes.text();
        throw new Error(message || 'Failed to create studyset');
      }

      const createJson = await createRes.json();
      const studysetId = createJson?.studyset?.id;
      if (!studysetId) throw new Error('Studyset ID missing');

      // Compile the tool picks into a short instruction the planner prompt can act
      // on directly — same idea as the agenda/subject pickers seeding focus notes:
      // a real preference, expressed in plain language the AI genuinely reads.
      const toolLabels = TOOL_DEFINITIONS.filter((tool) => selectedTools.includes(tool.id)).map((tool) => tool.label);
      const questionTypeLabels = QUIZ_QUESTION_TYPE_OPTIONS.filter((qt) => quizQuestionTypes.includes(qt.value)).map((qt) => qt.label);
      const toolNotes = [
        toolLabels.length > 0 ? `Lean the day-by-day mix toward these tools: ${toolLabels.join(', ')}.` : '',
        selectedTools.includes('quiz') && questionTypeLabels.length > 0
          ? `Whenever a day includes a quiz, favor these question styles: ${questionTypeLabels.join(', ')}.`
          : '',
      ].filter(Boolean).join(' ');

      const generateRes = await fetch(`/api/studysets/${studysetId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_dates: selectedDateStrings,
          feedback: notesText.trim() || null,
          preferred_tools: selectedTools,
          quiz_question_types: selectedTools.includes('quiz') ? quizQuestionTypes : [],
          tool_notes: toolNotes || null,
          output_preferences: {
            difficulty,
            depth,
            language: outputLanguage,
            tone,
            only_my_sources: onlyMySources,
            include_examples: includeExamples,
          },
          url_sources: urlSources.map((s) => ({ url: s.url, label: s.label })),
        }),
      });

      if (!generateRes.ok) {
        const message = await generateRes.text();
        throw new Error(message || 'Failed to generate plan');
      }

      toast({ title: 'Studyset created', description: 'Today plan is ready.' });
      router.push(`/tools/studyset/${studysetId}`);
    } catch (error: any) {
      toast({
        title: 'Could not create studyset',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const selectedIconOption = ICON_OPTIONS.find((o) => o.id === selectedIcon);
  const selectedColorOption = COLOR_OPTIONS.find((o) => o.id === selectedColor);

  const STEP_SUBTITLES = [
    'Give your studyset a name, a look, and link it to your agenda or curriculum.',
    'Pick the days you plan to study.',
    'Add your notes, paste material, or upload files.',
    'Choose which tools we should mix into your plan.',
  ];

  const SOURCE_METHOD_OPTIONS: Array<{
    id: 'agenda' | 'subject' | 'upload';
    title: string;
    description: string;
    Icon: typeof GraduationCap;
  }> = [
    {
      id: 'agenda',
      title: 'From your agenda',
      description: 'Build it around an upcoming test or assignment.',
      Icon: GraduationCap,
    },
    {
      id: 'subject',
      title: 'Pick a subject & chapter',
      description: 'Scope it to part of your real curriculum.',
      Icon: BookOpen,
    },
    {
      id: 'upload',
      title: 'Just my own materials',
      description: "Skip this — I'll add notes and files in the Sources step.",
      Icon: Upload,
    },
  ];

  return (
    <PageSection variant="tool">
      {/* Tool header strip */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Route className="h-4 w-4 text-muted-foreground" />
            Studyset
          </h1>
          <p className="text-sm text-muted-foreground">Build once, follow day-by-day.</p>
        </div>
        {view === 'home' && (
          <Button type="button" onClick={startCreate} style={{ backgroundColor: '#6b7c4e' }}>
            <Plus className="mr-2 h-4 w-4" />
            New studyset
          </Button>
        )}
      </div>

      {view === 'home' && (
        <div className="space-y-6">
          {/* Search + sort row */}
          {!loadingStudysets && studysets.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={homeSearch}
                  onChange={(e) => setHomeSearch(e.target.value)}
                  placeholder="Search studysets…"
                  className="h-9 w-full rounded-lg border border-border bg-white pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#6b7c4e]/60 focus:ring-1 focus:ring-[#6b7c4e]/30"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1">
                {(['recent', 'name', 'progress'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setHomeSort(s)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors capitalize ${
                      homeSort === s
                        ? 'bg-[#6b7c4e] text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingStudysets && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}

          {!loadingStudysets && studysets.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6b7c4e]/10 mb-4">
                <Route className="h-6 w-6 text-[#6b7c4e]" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No studysets yet</p>
              <p className="text-xs text-muted-foreground mb-5 max-w-xs">
                Create your first studyset — pick your study days, add your materials and we generate a day-by-day plan.
              </p>
              <Button type="button" onClick={startCreate} style={{ backgroundColor: '#6b7c4e' }}>
                <Plus className="mr-2 h-4 w-4" />
                Create studyset
              </Button>
            </div>
          )}

          {!loadingStudysets && studysets.length > 0 && (
            <>
              {todayItems.length > 0 && (
                <section>
                  <h2 className={SECTION_HEADING}>today</h2>
                  <div className="space-y-2">
                    {todayItems.map((item) => {
                      const meta = item.meta || {};
                      const hex = colorHex(meta.color);
                      const ItemIcon = iconForId(meta.icon);
                      const progress = item.progress || { total_tasks: 0, completed_tasks: 0, percent: 0 };
                      const dueCount = Number(item.analytics_summary?.due_today_tasks || 0);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl border border-border bg-card pl-3 pr-4 py-3"
                          style={{ borderLeft: `4px solid ${hex}` }}
                        >
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${hex}1a`, color: hex }}
                          >
                            <ItemIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${progress.percent}%`, backgroundColor: hex }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{progress.percent}% done</span>
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            <span className="hidden sm:inline text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {dueCount} {dueCount === 1 ? 'task' : 'tasks'} left today
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => router.push(item.next_task_href || `/tools/studyset/${item.id}`)}
                              style={{ backgroundColor: hex }}
                              className="text-white hover:opacity-90"
                            >
                              Start
                            </Button>
                            <button
                              type="button"
                              title="View analytics"
                              onClick={() => router.push(`/tools/studyset/${item.id}/analytics`)}
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <h2 className={SECTION_HEADING}>active studysets</h2>
                {filteredActiveStudysets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {homeSearch.trim() ? 'No studysets match your search.' : 'No active studysets — everything is archived or done.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredActiveStudysets.map((item) => {
                      const meta = item.meta || {};
                      const hex = colorHex(meta.color);
                      const ItemIcon = iconForId(meta.icon);
                      const progress = item.progress || { total_tasks: 0, completed_tasks: 0, percent: 0 };
                      const sm = statusMeta(item.status);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => router.push(`/tools/studyset/${item.id}`)}
                          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:border-[#6b7c4e]/40 hover:shadow-sm"
                        >
                          <div
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${hex}1a`, color: hex }}
                          >
                            <ItemIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                              <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sm.className}`}>
                                {sm.label}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {progress.completed_tasks}/{progress.total_tasks} tasks done · {item.target_days} study days
                            </p>
                          </div>
                          <div className="hidden sm:flex flex-shrink-0 items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${progress.percent}%`, backgroundColor: hex }}
                              />
                            </div>
                            <span className="w-9 text-right text-xs text-muted-foreground">{progress.percent}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {archivedStudysets.length > 0 && (
                <section>
                  <button
                    type="button"
                    onClick={() => setArchivedExpanded((value) => !value)}
                    className="flex items-center gap-2 text-left"
                  >
                    <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={`${SECTION_HEADING} mb-0`}>archived ({archivedStudysets.length})</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${archivedExpanded ? '' : '-rotate-90'}`}
                    />
                  </button>
                  {archivedExpanded && (
                    <div className="mt-2 space-y-1.5">
                      {archivedStudysets.map((item) => {
                        const meta = item.meta || {};
                        const ItemIcon = iconForId(meta.icon);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => router.push(`/tools/studyset/${item.id}`)}
                            className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-surface-1/40 px-4 py-2.5 text-left opacity-70 transition-colors hover:opacity-100 hover:bg-surface-1"
                          >
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                              <ItemIcon className="h-3.5 w-3.5" />
                            </div>
                            <p className="truncate text-sm text-muted-foreground">{item.name}</p>
                            <span className="ml-auto flex-shrink-0 text-xs text-muted-foreground">{item.target_days} days</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      )}

      {view === 'create' && (
        <div className="mx-auto w-full max-w-2xl">
          {/* Step progress bars */}
          <div className="flex gap-1.5 mb-8">
            {STEP_TITLES.map((_, index) => (
              <div
                key={index}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ backgroundColor: index <= step ? '#6b7c4e' : '#e5e7eb' }}
              />
            ))}
          </div>

          {/* Wizard card */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Step header */}
            <div className="px-8 pt-8 pb-6 border-b border-border/60">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
                  style={{ backgroundColor: '#6b7c4e' }}
                >
                  {step + 1}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground leading-tight">{STEP_TITLES[step]}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{STEP_SUBTITLES[step]}</p>
                </div>
              </div>
            </div>

            {/* Step body */}
            <div className="px-8 py-6">
              {step === 0 && (
                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Studyset name *</label>
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Biology Chapter 5 — Photosynthesis"
                      className="h-10 text-base"
                      autoFocus
                    />
                  </div>

                  {/* Link to agenda or curriculum — real data, sets the studyset's
                      actual subject/exam date and seeds focus notes used later */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Link it to your agenda or curriculum <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Build it around something real — an upcoming test, or a part of your course — and we&apos;ll line everything up for you.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {SOURCE_METHOD_OPTIONS.map((option) => {
                        const selected = sourceMethod === option.id;
                        const OptionIcon = option.Icon;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setSourceMethod(option.id)}
                            className={`flex flex-col items-start gap-2 rounded-xl border px-4 py-3 text-left transition-all ${
                              selected
                                ? 'border-[#6b7c4e] bg-[#6b7c4e]/5 ring-1 ring-[#6b7c4e]/30'
                                : 'border-border bg-background hover:border-[#6b7c4e]/40 hover:bg-[#6b7c4e]/5'
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                selected ? 'bg-[#6b7c4e] text-white' : 'bg-surface-chip text-muted-foreground'
                              }`}
                            >
                              <OptionIcon className="h-4 w-4" />
                            </span>
                            <span className="text-sm font-medium text-foreground">{option.title}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </button>
                        );
                      })}
                    </div>

                    {linkedSeed && (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#eef1e7] px-3.5 py-2.5 text-xs text-[#4a5735]">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <Link2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            Linked to: {linkedSeed.label}
                            {linkedSeed.examDate
                              ? ` · exam ${format(new Date(`${linkedSeed.examDate}T00:00:00`), 'MMM d')}`
                              : ''}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setLinkedSeed(null)}
                          className="shrink-0 underline hover:no-underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {sourceMethod === 'agenda' && (
                      <div className="mt-3">
                        <AgendaTemplatePicker selectedId={linkedSeed?.sourceId ?? null} onPick={applyAgendaSeed} />
                      </div>
                    )}
                    {sourceMethod === 'subject' && (
                      <div className="mt-3">
                        <SubjectTopicPicker appliedLabel={linkedSeed?.label ?? null} onApply={applySubjectSeed} />
                      </div>
                    )}
                  </div>

                  {/* Icon picker */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Icon <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <div className="grid grid-cols-10 gap-1.5">
                      {ICON_OPTIONS.map((option) => {
                        const ActiveIcon = option.Icon;
                        const selected = selectedIcon === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setSelectedIcon(selected ? null : option.id)}
                            aria-label={option.id}
                            title={option.id}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                              selected
                                ? 'border-[#6b7c4e] bg-[#6b7c4e]/10 text-[#6b7c4e]'
                                : 'border-border bg-background text-muted-foreground hover:border-[#6b7c4e]/50 hover:bg-[#6b7c4e]/5'
                            }`}
                          >
                            <ActiveIcon className="h-4 w-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color picker */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Color <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map((color) => {
                        const selected = selectedColor === color.id;
                        return (
                          <button
                            key={color.id}
                            type="button"
                            aria-label={color.id}
                            title={color.id}
                            onClick={() => setSelectedColor(selected ? null : color.id)}
                            className={`h-7 w-7 rounded-full transition-all ${color.swatchClass} ${
                              selected
                                ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110'
                                : 'hover:scale-110 opacity-80 hover:opacity-100'
                            }`}
                          />
                        );
                      })}
                    </div>
                    {(selectedIcon || selectedColor) ? (
                      <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                        {selectedIconOption && <selectedIconOption.Icon className="h-3 w-3" />}
                        {selectedColorOption && (
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${selectedColorOption.swatchClass}`} />
                        )}
                        {selectedIcon && selectedColor ? 'Icon and color selected' : selectedIcon ? 'Icon selected' : 'Color selected'}
                        <button
                          type="button"
                          onClick={() => { setSelectedIcon(null); setSelectedColor(null); }}
                          className="underline text-muted-foreground hover:text-foreground ml-1"
                        >
                          clear
                        </button>
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">Skip to auto-pick an unused combo.</p>
                    )}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/60 bg-background p-2">
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(value) => setSelectedDates(Array.isArray(value) ? value : [])}
                      className="mx-auto"
                      classNames={CALENDAR_CLASSES}
                    />
                  </div>
                  <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${SOFT_SURFACE}`}>
                    {selectedDateStrings.length === 0 ? (
                      <span className="text-muted-foreground">Pick at least one study day to continue.</span>
                    ) : (
                      <>
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold"
                          style={{ backgroundColor: '#6b7c4e' }}
                        >
                          {selectedDateStrings.length}
                        </span>
                        <span className="font-medium">
                          {selectedDateStrings.length === 1 ? '1 study session' : `${selectedDateStrings.length} study sessions`} planned
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  {/* Notes */}
                  <div>
                    {linkedSeed && (
                      <p className="mb-2 text-xs text-muted-foreground">
                        We filled in focus notes from <span className="font-medium text-foreground">{linkedSeed.label}</span> below — feel free to edit them, or add your own materials too.
                      </p>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground">
                        Notes <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNotesInput((v) => !v)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        {showNotesInput ? 'Hide' : 'Add focus notes'}
                      </button>
                    </div>
                    {showNotesInput && (
                      <Textarea
                        value={notesText}
                        onChange={(event) => setNotesText(event.target.value)}
                        placeholder="What should this studyset focus on? Any specific topics or goals..."
                        className="min-h-[90px] resize-none"
                      />
                    )}
                  </div>

                  {/* Pasted text */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Paste your material</label>
                    <Textarea
                      value={pastedText}
                      onChange={(event) => setPastedText(event.target.value)}
                      placeholder="Paste chapters, lecture notes, summaries, requirements..."
                      className="min-h-[130px] resize-none"
                    />
                  </div>

                  {/* File upload */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Upload files</label>
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:border-[#6b7c4e]/50 hover:bg-[#6b7c4e]/5">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Click to upload files</p>
                        <p className="text-xs text-muted-foreground mt-0.5">PDF, Word, PowerPoint, images, text</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
                        onChange={handleUploadChange}
                      />
                    </label>
                    {isUploadingFiles && (
                      <div className="mt-3 flex items-center justify-center rounded-lg border border-border bg-background px-3 py-4">
                        <Spinner size={18} />
                      </div>
                    )}
                    {!isUploadingFiles && uploads.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                        {uploads.map((file) => (
                          <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <p className="truncate text-xs font-medium">{file.name}</p>
                            {file.extractionStatus === 'ready' && (
                              <span className="ml-auto flex-shrink-0 h-1.5 w-1.5 rounded-full bg-green-500" title="Text extracted" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* URL / YouTube / audio sources */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      URLs, YouTube &amp; audio
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrlSource(); } }}
                        placeholder="Paste a URL, YouTube link…"
                        className="h-9 flex-1 rounded-lg border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#6b7c4e]/60"
                      />
                      <button
                        type="button"
                        onClick={addUrlSource}
                        className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground transition-colors hover:border-[#6b7c4e]/50 hover:bg-[#6b7c4e]/5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>
                    {urlSources.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {urlSources.map((src) => {
                          const isYT = src.label === 'YouTube';
                          return (
                            <div key={src.id} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
                              {isYT ? (
                                <Youtube className="h-4 w-4 flex-shrink-0 text-red-500" />
                              ) : (
                                <Link className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                              )}
                              <p className="flex-1 truncate text-xs text-foreground">{src.url}</p>
                              <button
                                type="button"
                                onClick={() => removeUrlSource(src.id)}
                                className="flex-shrink-0 text-xs text-muted-foreground hover:text-destructive"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      YouTube transcripts, web pages, and audio files (MP3/M4A) are extracted automatically.
                    </p>
                  </div>

                  {/* OneDrive */}
                  <div className="rounded-xl border border-border/60 bg-background p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium">Import from OneDrive</p>
                      {microsoftConnected && (
                        <span className="text-xs text-muted-foreground">{microsoftEmail || 'Connected'}</span>
                      )}
                    </div>
                    <MicrosoftAppStrip returnTo="/tools/studyset?open=create&step=2" />
                    {microsoftConnected && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selected files</p>
                          <button
                            type="button"
                            onClick={() => void loadMicrosoftSelectedFiles()}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                          >
                            Refresh
                          </button>
                        </div>
                        {sortedOneDriveFiles.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No files selected yet.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                            {sortedOneDriveFiles.map((file) => (
                              <div key={file.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                                <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <p className="truncate text-xs">{file.name}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => void disconnectMicrosoft()}
                          className="mt-3 text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          Disconnect Microsoft
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  {/* Tool mindmap — same icons/labels the plan view uses, so picking
                      a tool here matches exactly what shows up later in the plan */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-foreground">Which tools should we mix in?</label>
                      <span className="text-xs text-muted-foreground">{selectedTools.length} selected</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      We always keep a healthy day-by-day mix — this just tells the AI what to lean toward.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {TOOL_DEFINITIONS.map((tool) => {
                        const selected = selectedTools.includes(tool.id);
                        const ToolIcon = tool.Icon;
                        return (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => toggleTool(tool.id)}
                            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                              selected
                                ? 'border-[#6b7c4e] bg-[#6b7c4e]/5 ring-1 ring-[#6b7c4e]/30'
                                : 'border-border bg-background hover:border-[#6b7c4e]/40 hover:bg-[#6b7c4e]/5'
                            }`}
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                selected ? 'bg-[#6b7c4e] text-white' : 'bg-surface-chip text-muted-foreground'
                              }`}
                            >
                              <ToolIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-foreground">{tool.label}</span>
                              <span className="block text-xs text-muted-foreground mt-0.5">{tool.description}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quiz-specific settings — only appears once Quiz is part of the mix,
                      mirroring how the quiz tool reveals question types after the input step */}
                  {selectedTools.includes('quiz') && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-foreground">Quiz question types</label>
                        <span className="text-xs text-muted-foreground">{quizQuestionTypes.length} selected</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        We&apos;ll favor these styles whenever the plan includes a quiz session.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {QUIZ_QUESTION_TYPE_OPTIONS.map((qt) => {
                          const selected = quizQuestionTypes.includes(qt.value);
                          return (
                            <button
                              key={qt.value}
                              type="button"
                              onClick={() => toggleQuizQuestionType(qt.value)}
                              title={qt.description}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                                selected
                                  ? 'border-[#6b7c4e] bg-[#6b7c4e]/10 text-[#4a5735]'
                                  : 'border-border bg-background text-muted-foreground hover:border-[#6b7c4e]/40 hover:text-foreground'
                              }`}
                            >
                              {qt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Output preferences ─────────────────────────────────── */}
                  <div className="space-y-5 border-t border-border/60 pt-5">
                    {/* Difficulty */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Difficulty</label>
                      <p className="text-xs text-muted-foreground mb-3">How challenging should the generated content be?</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {DIFFICULTY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            title={opt.description}
                            onClick={() => setDifficulty(opt.value)}
                            className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-all ${
                              difficulty === opt.value
                                ? 'border-[#6b7c4e] bg-[#6b7c4e]/5 ring-1 ring-[#6b7c4e]/30 text-[#4a5735] font-semibold'
                                : 'border-border bg-background text-muted-foreground hover:border-[#6b7c4e]/40 hover:text-foreground'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Depth */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">Depth</label>
                      <div className="flex gap-2">
                        {DEPTH_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            title={opt.description}
                            onClick={() => setDepth(opt.value)}
                            className={`flex-1 rounded-xl border px-3 py-2.5 text-center text-xs transition-all ${
                              depth === opt.value
                                ? 'border-[#6b7c4e] bg-[#6b7c4e]/5 ring-1 ring-[#6b7c4e]/30 text-[#4a5735] font-semibold'
                                : 'border-border bg-background text-muted-foreground hover:border-[#6b7c4e]/40 hover:text-foreground'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tone */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">Tone / mode</label>
                      <div className="flex gap-2">
                        {TONE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            title={opt.description}
                            onClick={() => setTone(opt.value)}
                            className={`flex-1 rounded-xl border px-3 py-2.5 text-center text-xs transition-all ${
                              tone === opt.value
                                ? 'border-[#6b7c4e] bg-[#6b7c4e]/5 ring-1 ring-[#6b7c4e]/30 text-[#4a5735] font-semibold'
                                : 'border-border bg-background text-muted-foreground hover:border-[#6b7c4e]/40 hover:text-foreground'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Output language */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Output language</label>
                      <select
                        value={outputLanguage}
                        onChange={(e) => setOutputLanguage(e.target.value)}
                        className="h-9 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:border-[#6b7c4e]/60 focus:outline-none focus:ring-1 focus:ring-[#6b7c4e]/30"
                      >
                        {LANGUAGE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Grounding + examples toggles */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">Only my sources</p>
                          <p className="text-xs text-muted-foreground">No outside knowledge — stick strictly to your uploaded material</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOnlyMySources((v) => !v)}
                          className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                            onlyMySources ? 'bg-[#6b7c4e]' : 'bg-muted'
                          }`}
                          role="switch"
                          aria-checked={onlyMySources}
                        >
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              onlyMySources ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">Include examples</p>
                          <p className="text-xs text-muted-foreground">Add worked examples to notes and explanations</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIncludeExamples((v) => !v)}
                          className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                            includeExamples ? 'bg-[#6b7c4e]' : 'bg-muted'
                          }`}
                          role="switch"
                          aria-checked={includeExamples}
                        >
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              includeExamples ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl px-4 py-3 text-sm ${SOFT_SURFACE}`}>
                    <p className="text-muted-foreground">
                      Ready to build your plan — we&apos;ll generate day-by-day sessions across{' '}
                      <span className="font-medium text-foreground">
                        {selectedDateStrings.length === 1 ? '1 study day' : `${selectedDateStrings.length} study days`}
                      </span>{' '}
                      using the tools and styles above.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer navigation */}
            <div className="flex items-center gap-3 border-t border-border/60 px-8 py-5">
              <button
                type="button"
                onClick={() => {
                  if (step === 0) { setView('home'); return; }
                  setStep((value) => Math.max(0, value - 1));
                }}
                disabled={creating}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canNext || creating}
                  className="ml-auto flex items-center gap-1.5 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: canNext ? '#6b7c4e' : undefined }}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void createStudyset()}
                  disabled={!isStepFourReady || creating}
                  className="ml-auto rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: isStepFourReady ? '#6b7c4e' : undefined }}
                >
                  {creating ? 'Creating studyset…' : 'Create studyset'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PageSection>
  );
}
