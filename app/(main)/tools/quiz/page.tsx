'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BrainCircuit, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { AppContext } from '@/contexts/app-context';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { ToolInputBox } from '@/components/tools/tool-input-box';
import { PageHeader } from '@/components/ui/page-header';
import type { Quiz } from '@/lib/types';
import { classifyContent, isQuizTypeAvailable } from '@/lib/tools/content-classifier';
import type { ContentClassification } from '@/lib/tools/content-classifier';
import { FunLoader } from '@/components/tools/fun-loader';

const QuizTaker = dynamic(() => import('@/components/tools/quiz-taker').then((module) => module.QuizTaker), { ssr: false });

type QuizMode = 'classic' | 'assisted' | 'adaptive';
type AnswerFeedback = 'immediate' | 'end';
type GradingMode = 'accuracy' | 'speed' | 'progression';
type Phase = 'input' | 'options' | 'study';

// ─── Question type hierarchy ───────────────────────────────────────────────────
type QuizVariant = { id: string; label: string; difficulty: 'easy' | 'medium' | 'hard' };
type QuizTypeDefinition = {
  value: string;
  label: string;
  description: string;
  variants: QuizVariant[];
  requiresFlag?: string; // content classifier flag that must be 'y'
};

const QUIZ_TYPE_DEFINITIONS: QuizTypeDefinition[] = [
  {
    value: 'multiple-choice',
    label: 'Multiple Choice',
    description: 'Pick the correct answer from options',
    variants: [
      { id: 'card-grid', label: 'Card Grid', difficulty: 'hard' },
      { id: 'radio-list', label: 'Radio List', difficulty: 'medium' },
      { id: 'color-blocks', label: 'Color Blocks', difficulty: 'easy' },
    ],
  },
  {
    value: 'true-false',
    label: 'True / False',
    description: 'Is the statement true or false?',
    variants: [
      { id: 'big-buttons', label: 'Big Buttons', difficulty: 'easy' },
    ],
  },
  {
    value: 'fill-blank',
    label: 'Fill in the Blank',
    description: 'Complete the missing word or phrase',
    variants: [
      { id: 'inline-type', label: 'Type Answer', difficulty: 'hard' },
    ],
  },
  {
    value: 'short-answer',
    label: 'Short Answer',
    description: 'Write a brief answer in your own words',
    variants: [
      { id: 'plain', label: 'Open Answer', difficulty: 'hard' },
      { id: 'guided', label: 'With Hints', difficulty: 'medium' },
    ],
  },
  {
    value: 'matching',
    label: 'Matching',
    description: 'Connect related items from two columns',
    variants: [
      { id: 'click-pairs', label: 'Click Pairs', difficulty: 'easy' },
      { id: 'drag-to-slot', label: 'Drag to Slot', difficulty: 'medium' },
    ],
  },
  {
    value: 'ordering',
    label: 'Ordering',
    description: 'Arrange items in the correct sequence',
    variants: [
      { id: 'click-number', label: 'Click to Number', difficulty: 'easy' },
      { id: 'drag-handles', label: 'Drag to Order', difficulty: 'medium' },
    ],
    requiresFlag: 'processes',
  },
  {
    value: 'cloze',
    label: 'Cloze Test',
    description: 'Fill in the blanks within a passage',
    variants: [
      { id: 'word-bank', label: 'Word Bank', difficulty: 'easy' },
      { id: 'open', label: 'Open Type', difficulty: 'hard' },
    ],
  },
  {
    value: 'comparison-matrix',
    label: 'Comparison Matrix',
    description: 'Check which attributes apply to which items',
    variants: [
      { id: 'checkbox-grid', label: 'Checkbox Grid', difficulty: 'medium' },
    ],
  },
  {
    value: 'argument-analysis',
    label: 'Argument Analysis',
    description: 'Tag statements with their role (claim, evidence…)',
    variants: [
      { id: 'tag-statements', label: 'Tag Statements', difficulty: 'hard' },
    ],
  },
  {
    value: 'scenario',
    label: 'Scenario / Case Study',
    description: 'Read a scenario and answer the best-option question',
    variants: [
      { id: 'mcq', label: 'Multiple Choice', difficulty: 'medium' },
    ],
  },
  {
    value: 'timeline',
    label: 'Timeline',
    description: 'Place events on a chronological timeline',
    variants: [
      { id: 'multiple-choice', label: 'Timeline MCQ', difficulty: 'easy' },
      { id: 'sort', label: 'Sort Events', difficulty: 'medium' },
    ],
    requiresFlag: 'timeline',
  },
  {
    value: 'ranking',
    label: 'Ranking',
    description: 'Rank items from first to last by a given criterion',
    variants: [
      { id: 'drag-rank', label: 'Drag to Rank', difficulty: 'hard' },
    ],
    requiresFlag: 'processes',
  },
  {
    value: 'drag-drop',
    label: 'Drag & Drop',
    description: 'Sort items into the correct categories (or cause → effect)',
    variants: [
      { id: 'categorize', label: 'Categorize', difficulty: 'medium' },
      { id: 'cause-effect', label: 'Cause & Effect', difficulty: 'hard' },
    ],
    requiresFlag: 'processes',
  },
  {
    value: 'venn',
    label: 'Venn Diagram',
    description: 'Place items in the correct regions of overlapping circles',
    variants: [
      { id: 'zones', label: 'Zone Assignment', difficulty: 'hard' },
    ],
    requiresFlag: 'diagrams',
  },
  {
    value: 'spot-error',
    label: 'Spot the Error',
    description: 'Click on the part of the statement that contains an error',
    variants: [
      { id: 'click-segment', label: 'Click the Error', difficulty: 'hard' },
    ],
  },
];

// Legacy flat list for backward-compat with generation input
const QUIZ_TYPES = QUIZ_TYPE_DEFINITIONS.map((d) => ({ value: d.value, label: d.label })) as readonly { value: string; label: string }[];

const PRESET_STORAGE_KEY = 'quiz.mode.presets.v2';
const QUIZ_SETTINGS_STORAGE_KEY = 'tools.quiz.settings.v1';
const QUIZ_PAGE_SESSION_KEY = 'tools.quiz.page.session.v1';

function QuizPageContent() {
  const { toast } = useToast();
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const region = appContext?.region ?? 'global';
  const schoolingLevel = appContext?.schoolingLevel ?? 2;
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>('input');
  const [sourceText, setSourceText] = useState(searchParams.get('sourceText') || '');
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  const [mode, setMode] = useState<QuizMode>('classic');
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback>('end');
  const [questionTypes, setQuestionTypes] = useState<string[]>(['multiple-choice']);
  const [knowledgeScore, setKnowledgeScore] = useState(50);
  const [questionCount, setQuestionCount] = useState(12);
  const [gradingModes, setGradingModes] = useState<GradingMode[]>(['accuracy', 'speed', 'progression']);


  const [inputMode, setInputMode] = useState<'literal' | 'research'>('literal');

  // Image description — describe once on upload, reuse as text context everywhere
  const [imageDescription, setImageDescription] = useState<string | null>(null);
  const [imageDescLoading, setImageDescLoading] = useState(false);

  // Content classification — drives which question types are shown
  const [contentClass, setContentClass] = useState<ContentClassification | null>(null);
  const [aiCategories, setAiCategories] = useState<Record<string, string> | null>(null);
  const [aiCategoryLoading, setAiCategoryLoading] = useState(false);
  const classifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const adaptiveCap = 50;
  const runCounterRef = useRef(0);

  // Classify source text after user stops typing (800 ms debounce — instant regex)
  useEffect(() => {
    if (classifyTimerRef.current) clearTimeout(classifyTimerRef.current);
    classifyTimerRef.current = setTimeout(() => {
      const result = classifyContent(sourceText);
      setContentClass(result);
    }, 800);
    return () => {
      if (classifyTimerRef.current) clearTimeout(classifyTimerRef.current);
    };
  }, [sourceText]);

  // Called when user picks an image in State 1 — describes it once, stores result as text context
  const handleImageDataUriChange = useCallback((dataUri: string | null) => {
    setImageDataUri(dataUri);
    setImageDescription(null);
    if (!dataUri) return;
    setImageDescLoading(true);
    fetch('/api/ai/handle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowName: 'describeImage', input: { imageDataUri: dataUri } }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.description) {
          const topicsStr = Array.isArray(data.topics) && data.topics.length > 0
            ? ` Topics: ${data.topics.join(', ')}.`
            : '';
          const typeStr = data.contentType && data.contentType !== 'unknown'
            ? ` Type: ${data.contentType}.`
            : '';
          setImageDescription(`[Image description:${typeStr} ${data.description}${topicsStr}]`);
        }
      })
      .catch(() => { /* non-fatal — image is still sent to quiz generation directly */ })
      .finally(() => setImageDescLoading(false));
  }, []);

  // Triggered once when user clicks Next in State 1 — runs in background while user sees State 2
  const triggerAiCategoryEval = useCallback((text: string, imgDesc: string | null) => {
    const combined = imgDesc ? `${text}\n\n${imgDesc}` : text;
    if (!combined || combined.trim().length < 150) return;
    setAiCategoryLoading(true);
    setAiCategories(null);
    fetch('/api/ai/handle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowName: 'evaluateContentCategories', input: { sourceText: combined.slice(0, 4000) } }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data && typeof data === 'object') setAiCategories(data); })
      .catch(() => { /* non-fatal — regex fallback stays active */ })
      .finally(() => setAiCategoryLoading(false));
  }, []);

  // When classification changes, drop any question types that are no longer applicable
  useEffect(() => {
    if (!mergedContentClass) return;
    setQuestionTypes((prev) => {
      const next = prev.filter((t) => isQuizTypeAvailable(t, mergedContentClass));
      return next.length > 0 ? next : ['multiple-choice'];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentClass, aiCategories]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUIZ_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.title === 'string') setTitle(parsed.title);
      if (parsed?.mode === 'classic' || parsed?.mode === 'assisted' || parsed?.mode === 'adaptive') setMode(parsed.mode);
      if (parsed?.answerFeedback === 'immediate' || parsed?.answerFeedback === 'end') setAnswerFeedback(parsed.answerFeedback);
      if (Array.isArray(parsed?.questionTypes) && parsed.questionTypes.length > 0) {
        const allowed = parsed.questionTypes.filter((entry: string) => QUIZ_TYPES.some((item) => item.value === entry));
        if (allowed.length > 0) setQuestionTypes(allowed);
      }
      if (Number.isFinite(parsed?.knowledgeScore)) setKnowledgeScore(Math.max(0, Math.min(100, Number(parsed.knowledgeScore))));
      if (Number.isFinite(parsed?.questionCount)) setQuestionCount(Math.max(1, Math.min(25, Number(parsed.questionCount))));
      if (Array.isArray(parsed?.gradingModes) && parsed.gradingModes.length > 0) {
        const next = parsed.gradingModes.filter((entry: string) => ['accuracy', 'speed', 'progression'].includes(entry)) as GradingMode[];
        setGradingModes(next.length > 0 ? next : ['accuracy', 'speed', 'progression']);
      }
    } catch {
      // ignore broken saved settings
    }
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(QUIZ_PAGE_SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.sourceText === 'string') setSourceText(parsed.sourceText);
      if (typeof parsed?.title === 'string') setTitle(parsed.title);
      if (parsed?.mode === 'classic' || parsed?.mode === 'assisted' || parsed?.mode === 'adaptive') setMode(parsed.mode);
      if (parsed?.answerFeedback === 'immediate' || parsed?.answerFeedback === 'end') setAnswerFeedback(parsed.answerFeedback);
      if (Array.isArray(parsed?.questionTypes) && parsed.questionTypes.length > 0) {
        const allowed = parsed.questionTypes.filter((entry: string) => QUIZ_TYPES.some((item) => item.value === entry));
        if (allowed.length > 0) setQuestionTypes(allowed);
      }
      if (Number.isFinite(parsed?.knowledgeScore)) setKnowledgeScore(Math.max(0, Math.min(100, Number(parsed.knowledgeScore))));
      if (Number.isFinite(parsed?.questionCount)) setQuestionCount(Math.max(1, Math.min(25, Number(parsed.questionCount))));
      if (Array.isArray(parsed?.gradingModes) && parsed.gradingModes.length > 0) {
        const next = parsed.gradingModes.filter((entry: string) => ['accuracy', 'speed', 'progression'].includes(entry)) as GradingMode[];
        setGradingModes(next.length > 0 ? next : ['accuracy', 'speed', 'progression']);
      }
      if (parsed?.quiz && Array.isArray(parsed.quiz?.questions)) setQuiz(parsed.quiz as Quiz);
    } catch {
      // ignore broken session state
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        QUIZ_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          title,
          mode,
          answerFeedback,
          questionTypes,
          knowledgeScore,
          questionCount,
          gradingModes,
        })
      );
    } catch {
      // ignore storage write failures
    }
  }, [answerFeedback, gradingModes, knowledgeScore, mode, questionCount, questionTypes, title]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        QUIZ_PAGE_SESSION_KEY,
        JSON.stringify({
          sourceText,
          title,
          mode,
          answerFeedback,
          questionTypes,
          knowledgeScore,
          questionCount,
          gradingModes,
          quiz,
        })
      );
    } catch {
      // ignore storage write failures
    }
  }, [answerFeedback, gradingModes, knowledgeScore, mode, questionCount, questionTypes, quiz, sourceText, title]);

  useEffect(() => {
    if (mode === 'classic') {
      setAnswerFeedback('end');
      setQuestionCount((prev) => (prev < 1 ? 12 : Math.min(25, prev || 12)));
    }
    if (mode === 'assisted') {
      setAnswerFeedback('immediate');
      setQuestionCount((prev) => (prev < 1 ? 12 : Math.min(25, prev || 12)));
    }
  }, [mode]);


  const toggleQuestionType = (value: string) => {
    setQuestionTypes((prev) => {
      if (prev.includes(value)) {
        const next = prev.filter((entry) => entry !== value);
        return next.length ? next : ['multiple-choice'];
      }
      return [...prev, value];
    });
  };

  const toggleGrading = (value: GradingMode) => {
    setGradingModes((prev) => {
      if (prev.includes(value)) {
        const next = prev.filter((entry) => entry !== value);
        return next.length ? next : ['accuracy'];
      }
      return [...prev, value];
    });
  };


  const buildGenerationInput = useCallback((compiledText: string) => {
    const requestedCount = mode === 'adaptive' ? 12 : questionCount;
    runCounterRef.current += 1;
    // Append image description so adaptive re-fetches (which don't re-send the image) also have context
    const enrichedText = imageDescription
      ? `${compiledText}\n\n${imageDescription}`
      : compiledText;
    return {
      sourceText: enrichedText,
      imageDataUri: imageDataUri || undefined,
      questionCount: requestedCount,
      language,
      regionCode: String(region || 'global').toUpperCase(),
      educationLevel: schoolingLevel,
      questionTypes,
      knowledgeScore,
      gradingModes,
      feedbackTiming: answerFeedback,
      quizMode: mode,
      runNonce: `${Date.now()}-${runCounterRef.current}-${Math.random().toString(36).slice(2, 8)}`,
      qualityConstraints: {
        enforceLanguage: true,
        enforceGrammar: true,
        enforcePlausibleDistractors: true,
        enforceNoDuplicates: true,
      },
      timelineContext: { enabled: true },
      imageContext: { enabled: true },
      videoContext: { enabled: true },
    };
  }, [answerFeedback, gradingModes, imageDataUri, imageDescription, knowledgeScore, language, mode, questionCount, questionTypes, region, schoolingLevel]);

  const handleGenerate = useCallback(async (compiledText: string) => {
    if (!compiledText.trim()) return;
    setLoading(true);
    setQuiz(null);
    try {
      const run = await runToolFlowV2({
        toolId: 'quiz',
        flowName: 'generateQuiz',
        mode,
        artifactType: 'quiz',
        artifactTitle: title.trim(),
        options: { saveToRecents: true },
        persistArtifact: true,
        input: buildGenerationInput(compiledText),
        computeClass: mode === 'adaptive' ? 'heavy' : 'standard',
      });
      const output = run?.output_payload || run;
      if (!output || !Array.isArray((output as any).questions) || (output as any).questions.length === 0) {
        const err = new Error(`Quiz run returned no questions (run: ${String((run as any)?.id || 'unknown')})`);
        (err as any).code = "EMPTY_QUIZ_OUTPUT";
        throw err;
      }
      setQuiz(output as Quiz);
      // Auto-fill title from AI if user didn't type one
      const aiTitle = String((output as any)?.title || '').trim();
      if (aiTitle && !title.trim()) setTitle(aiTitle);
    } catch (error: any) {
      const msg = String(error?.message || 'Unknown error');
      const isQuota = /quota|insufficient|rate limit|billing/i.test(msg);
      const detail = isQuota
        ? `Provider quota/billing error detected. ${msg}`
        : msg;
      console.error('[QUIZ_GENERATION_ERROR]', {
        message: msg,
        code: error?.code || null,
        runId: error?.runId || null,
        mode,
        questionTypes,
      });
      toast({ variant: 'destructive', title: 'Quiz generation failed', description: detail });
    } finally {
      setLoading(false);
    }
  }, [buildGenerationInput, mode, questionTypes, title, toast]);

  const handleRestart = useCallback(() => {
    setQuiz(null);
    try {
      const raw = sessionStorage.getItem(QUIZ_PAGE_SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      delete parsed.quiz;
      sessionStorage.setItem(QUIZ_PAGE_SESSION_KEY, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }, []);

  // Accordion — only one type expanded at a time
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const toggleExpanded = (value: string) =>
    setExpandedTypes((prev) => {
      const isOpen = prev.has(value);
      const next = new Set<string>();
      if (!isOpen) next.add(value);
      return next;
    });

  // Merge AI categories into ContentClassification-compatible object for isQuizTypeAvailable
  const mergedContentClass: ContentClassification | null = contentClass
    ? {
        ...contentClass,
        timeline: contentClass.timeline === 'y' || aiCategories?.events === 'y' || aiCategories?.dates === 'y' ? 'y' : 'n',
        dates: contentClass.dates === 'y' || aiCategories?.dates === 'y' ? 'y' : 'n',
        people: contentClass.people === 'y' || aiCategories?.people === 'y' ? 'y' : 'n',
        processes: contentClass.processes === 'y' || aiCategories?.processes === 'y' || aiCategories?.causeEffect === 'y' ? 'y' : 'n',
        diagrams: contentClass.diagrams === 'y' || aiCategories?.visual === 'y' || aiCategories?.classifications === 'y' ? 'y' : 'n',
        vocabulary: contentClass.vocabulary === 'y' || aiCategories?.definitions === 'y' ? 'y' : 'n',
      }
    : null;

  // Detailed category labels — prefer AI result when available
  const contentCategories: string[] = [];
  if (aiCategories) {
    if (aiCategories.events === 'y' || aiCategories.dates === 'y') contentCategories.push('Events & Dates');
    if (aiCategories.people === 'y') contentCategories.push('People & Entities');
    if (aiCategories.locations === 'y') contentCategories.push('Locations');
    if (aiCategories.definitions === 'y') contentCategories.push('Definitions & Terms');
    if (aiCategories.causeEffect === 'y') contentCategories.push('Cause & Effect');
    if (aiCategories.processes === 'y') contentCategories.push('Processes & Steps');
    if (aiCategories.classifications === 'y') contentCategories.push('Classifications');
    if (aiCategories.comparisons === 'y') contentCategories.push('Comparisons');
    if (aiCategories.arguments === 'y') contentCategories.push('Arguments');
    if (aiCategories.numberedData === 'y') contentCategories.push('Numerical Data');
    if (aiCategories.visual === 'y') contentCategories.push('Visual & Spatial');
    if (aiCategories.formulas === 'y') contentCategories.push('Formulas & Equations');
    if (aiCategories.problems === 'y') contentCategories.push('Problems & Scenarios');
  } else if (contentClass) {
    if (contentClass.timeline === 'y' || contentClass.dates === 'y') contentCategories.push('Timeline & Dates');
    if (contentClass.people === 'y') contentCategories.push('People & Entities');
    if (contentClass.processes === 'y') contentCategories.push('Processes & Steps');
    if (contentClass.vocabulary === 'y') contentCategories.push('Definitions & Terms');
    if (contentClass.diagrams === 'y') contentCategories.push('Diagrams & Visuals');
    if (contentClass.sequential_plot === 'y') contentCategories.push('Sequential Narrative');
  }

  const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  const DIFFICULTY_COLOR: Record<string, string> = {
    easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    hard: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };

  // OPTIONS PHASE — Settings Rail layout (State 2)
  const renderOptions = () => {
    // Profile name — same logic as WorkbenchShell breadcrumb
    const profileName = (() => {
      if (typeof window !== 'undefined') {
        const saved = String(window.localStorage.getItem('studyweb-display-name') || '').trim();
        if (saved) return saved;
      }
      const meta = appContext?.session?.user?.user_metadata as any;
      return String(meta?.display_name || meta?.full_name || appContext?.session?.user?.email?.split('@')[0] || 'User');
    })();

    const modeEntries = [
      { value: 'classic',  label: 'Classic',  desc: 'Answers revealed at the end' },
      { value: 'assisted', label: 'Assisted', desc: 'Feedback after each question' },
      { value: 'adaptive', label: 'Adaptive', desc: 'Automatically adjust difficulty' },
    ] as const;

    // shared section header style — same as sidebar labels
    const S = 'text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground';

    return (
      <div className="h-full flex flex-col">

        {/* Breadcrumb — full-width, height = collapsed sidebar width (3.5rem), rounded-b-2xl */}
        <div className="shrink-0 w-full bg-sidebar rounded-b-2xl">
          <div className="flex min-h-[3.5rem] items-center gap-0 px-3 text-[13px] font-medium leading-none text-sidebar-foreground">
            <button
              type="button"
              className="text-sidebar-foreground/55 hover:text-[var(--accent-brand)] transition-colors"
              onClick={() => window.dispatchEvent(new Event('cautie:open-profile-menu'))}
            >
              {profileName}
            </button>
            <span className="mx-2 text-sidebar-foreground/25 select-none">/</span>
            <span className="inline-flex items-center gap-1.5 text-sidebar-foreground">
              <BrainCircuit className="h-3.5 w-3.5 text-sidebar-foreground/55" />
              Quiz
            </span>
          </div>
        </div>

        {/* Body: question types (left) + settings rail (right) */}
        <div className="flex flex-1 overflow-hidden bg-muted/12">

          {/* ── Left: Question Types accordion ── */}
          <div className="flex-1 overflow-y-auto bg-background m-3 rounded-lg">
            <div className="p-4 pb-2">
              <div className="flex items-center justify-between mb-2.5">
                <p className={S}>Question Types</p>
                <span className="text-[11px] text-muted-foreground">{questionTypes.length} selected</span>
              </div>
            </div>

            <div className="mx-4 mb-4 rounded-lg border border-border/20 overflow-hidden bg-background">
              {QUIZ_TYPE_DEFINITIONS.filter((t) => isQuizTypeAvailable(t.value, mergedContentClass)).map((typeDef, idx, arr) => {
                const isSelected = questionTypes.includes(typeDef.value);
                const isExpanded = expandedTypes.has(typeDef.value);
                const isLast = idx === arr.length - 1;

                return (
                  <div key={typeDef.value}>
                    {/* Full-row click toggles the type */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleQuestionType(typeDef.value)}
                      onKeyDown={(e) => e.key === 'Enter' && toggleQuestionType(typeDef.value)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b last:border-b-0 transition-all ${isSelected ? 'bg-[var(--accent-brand)]/8 border-b-border/20' : 'hover:bg-muted/30 border-b-border/10'}`}
                    >
                      {/* Circle — visual indicator only, clicking row handles toggle */}
                      <div
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          isSelected
                            ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]'
                            : 'border-muted-foreground/25 hover:border-[var(--accent-brand)]/50'
                        }`}
                      >
                        {isSelected && <span className="block h-[6px] w-[6px] rounded-full bg-white" />}
                      </div>

                      {/* Label only (description in info circle) */}
                      <span className={`text-[13px] flex-1 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {typeDef.label}
                      </span>

                      {/* Info circle — shows description on hover */}
                      <div className="relative group flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); }}
                          className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors text-[10px] font-bold leading-none"
                        >
                          i
                        </button>
                        <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-56 rounded-lg border border-border bg-popover px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                          <p className="text-[11px] text-muted-foreground">{typeDef.description}</p>
                        </div>
                      </div>

                      {/* Expand chevron — for variants, not description */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleExpanded(typeDef.value); }}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      >
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-3 py-2.5 bg-muted/20 border-t border-border/20">
                        <p className="text-[11px] text-muted-foreground mb-3">{typeDef.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {typeDef.variants.map((v) => (
                            <div key={v.id} className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1">
                              <span className="text-[12px] text-foreground">{v.label}</span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${DIFFICULTY_COLOR[v.difficulty]}`}>
                                {DIFFICULTY_LABEL[v.difficulty]}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2.5 text-[10px] text-muted-foreground/60">
                          Variant is chosen per question based on your knowledge level.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right rail: Settings ── */}
          <div className="w-[280px] shrink-0 bg-background m-3 ml-0 rounded-lg overflow-y-auto">
            <div className="p-3 space-y-3">

              {/* Title */}
              <div className="rounded-lg border border-border/25 bg-background px-4 py-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className={S}>Quiz title (optional)</p>
                  <div className="relative group">
                    <button type="button" className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors flex-shrink-0 text-[10px] font-bold leading-none">i</button>
                    <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-56 rounded-lg border border-border bg-popover px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                      <p className="text-[11px] text-muted-foreground">Give your quiz a name. This appears in your results.</p>
                    </div>
                  </div>
                </div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-[13px] border-border/30"
                  placeholder=""
                  disabled={loading}
                />
              </div>

              {/* Knowledge Level */}
              <div className="rounded-lg border border-border/30 bg-background px-4 py-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className={S}>How much do you already know?</p>
                  <span className="text-[13px] font-medium text-[var(--accent-brand)]">{knowledgeScore}</span>
                </div>
                <Slider
                  value={[knowledgeScore]}
                  onValueChange={([v]) => setKnowledgeScore(v)}
                  min={0} max={100} step={5}
                  disabled={loading}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Nothing</span><span>A lot</span>
                </div>
              </div>

              {/* Mode */}
              <div className="rounded-lg border border-border/30 bg-background px-4 py-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  <p className={S}>What mode do you want?</p>
                  <div className="relative group">
                    <button type="button" className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors flex-shrink-0 text-[10px] font-bold leading-none">i</button>
                    <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                      <p className="text-[11px] text-foreground mb-1">Classic</p>
                      <p className="text-[10px] text-muted-foreground mb-2">All answers shown at the end.</p>
                      <p className="text-[11px] text-foreground mb-1">Assisted</p>
                      <p className="text-[10px] text-muted-foreground mb-2">Feedback after each question.</p>
                      <p className="text-[11px] text-foreground mb-1">Adaptive</p>
                      <p className="text-[10px] text-muted-foreground">Difficulty adjusts automatically.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  {modeEntries.map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => setMode(e.value)}
                      disabled={loading}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors text-[13px] ${
                        mode === e.value
                          ? 'bg-[var(--accent-brand)]/10 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${mode === e.value ? 'bg-[var(--accent-brand)]' : 'bg-muted-foreground/30'}`} />
                      <span>{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Answer Feedback */}
              <div className="rounded-lg border border-border/30 bg-background px-4 py-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  <p className={S}>When do you want feedback?</p>
                  <div className="relative group">
                    <button type="button" className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors flex-shrink-0 text-[10px] font-bold leading-none">i</button>
                    <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                      <p className="text-[11px] text-foreground mb-1">At the end</p>
                      <p className="text-[10px] text-muted-foreground mb-2">See all answers after finishing.</p>
                      <p className="text-[11px] text-foreground mb-1">Immediately</p>
                      <p className="text-[10px] text-muted-foreground">Know if you're right after each question.</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {([
                    { value: 'end',       label: 'At the end' },
                    { value: 'immediate', label: 'Immediately' },
                  ] as const).map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => setAnswerFeedback(e.value)}
                      disabled={loading}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-[12px] transition-colors ${
                        answerFeedback === e.value
                          ? 'border-[var(--accent-brand)]/40 bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]'
                          : 'border-border/30 bg-transparent text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Questions */}
              <div className="rounded-lg border border-border/30 bg-background px-4 py-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className={S}>How many questions?</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--accent-brand)]">
                      {mode === 'adaptive' ? '∞' : questionCount}
                    </span>
                    <div className="relative group">
                      <button type="button" className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors flex-shrink-0 text-[10px] font-bold leading-none">i</button>
                      <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-56 rounded-lg border border-border bg-popover px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                        <p className="text-[11px] text-muted-foreground">{mode === 'adaptive' ? 'Unlimited in adaptive mode.' : 'Minimum 3, maximum 25. Adaptive mode overrides this to unlimited.'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Slider
                  value={[mode === 'adaptive' ? 12 : questionCount]}
                  onValueChange={([v]) => mode !== 'adaptive' && setQuestionCount(v)}
                  min={3} max={25} step={1}
                  disabled={loading || mode === 'adaptive'}
                />
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-background px-5 py-3.5 flex justify-between items-center gap-3">
          <Button
            variant="outline"
            className="h-9 px-5 text-[13px]"
            onClick={() => {
              setPhase('input');
              setSourceText('');
              setTitle('');
              setImageDescription(null);
              setImageDataUri(null);
            }}
          >
            ← Back
          </Button>
          <Button
            className="h-9 bg-[var(--accent-brand)] px-5 text-[13px] text-white hover:opacity-90"
            onClick={() => {
              setLoading(true);
              handleGenerate(sourceText);
              setPhase('study');
            }}
            disabled={loading || !sourceText.trim()}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Generating...</>
            ) : (
              <><BrainCircuit className="mr-2 h-3.5 w-3.5" />Generate Quiz</>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // INPUT PHASE - Clean input without sidebar (State 1)
  if (phase === 'input') {
    const modeToggle = (
      <div className="flex items-center gap-1">
        {(['literal', 'research'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setInputMode(m)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
              inputMode === m
                ? 'bg-[var(--accent-brand)] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'literal' ? 'Literal' : 'Research'}
          </button>
        ))}
        {/* Info tooltip */}
        <div className="relative group">
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors text-[10px] font-bold leading-none"
          >
            i
          </button>
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-60 -translate-x-1/2 rounded-xl border border-border bg-popover px-3 py-2.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50">
            <p className="text-[12px] font-medium text-foreground mb-1">Literal</p>
            <p className="text-[11px] text-muted-foreground mb-2 leading-snug">Questions only test what's explicitly in your text.</p>
            <p className="text-[12px] font-medium text-foreground mb-1">Research</p>
            <p className="text-[11px] text-muted-foreground leading-snug">Questions may go beyond your text. You can skip irrelevant ones.</p>
          </div>
        </div>
      </div>
    );

    return (
      <WorkbenchShell
        title="Quiz"
        sidebar={<div />}
        hideSidebar={true}
        breadcrumbIcon={<BrainCircuit className="h-4 w-4" />}
      >
        <div className="flex h-full w-full flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-4">
            <div className="space-y-1.5 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Create a Quiz</h1>
              <p className="text-sm text-muted-foreground">
                Paste your notes, upload a file, or drop a link
              </p>
            </div>
            <ToolInputBox
              toolId="quiz"
              placeholder="Paste your content here..."
              onSourceChange={(text) => setSourceText(text)}
              onImageDataUriChange={handleImageDataUriChange}
              onSubmit={(compiledText) => {
                setSourceText(compiledText);
                setPhase('options');
                triggerAiCategoryEval(compiledText, imageDescription);
              }}
              isLoading={false}
              submitLabel="Next"
              speechLanguage={language}
              hideToolSwitcher
              bottomSlot={modeToggle}
            />
            {/* Image analysis indicator */}
            {imageDescLoading && (
              <div className="flex items-center gap-1.5 justify-center text-[11px] text-muted-foreground/70">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analysing image…
              </div>
            )}
            {imageDescription && !imageDescLoading && (
              <div className="flex items-center gap-1.5 justify-center text-[11px] text-[var(--accent-brand)]/70">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-brand)]/60" />
                Image analysed — will be used as context
              </div>
            )}
          </div>
        </div>
      </WorkbenchShell>
    );
  }

  if (loading) {
    return <FunLoader tool="quiz" />;
  }

  // STUDY PHASE - Show quiz taker (State 3) — QuizTaker handles its own layout
  if (phase === 'study' && quiz) {
    return (
      <div className="h-full">
        <QuizTaker
          quiz={quiz}
          mode={mode}
          sourceText={sourceText}
          quizTitle={title.trim() || undefined}
          inputMode={inputMode}
          onRestart={() => {
            setQuiz(null);
            setPhase('options');
          }}
          runtimeSettings={{
            answerFeedback,
            gradingModes,
            adaptiveCap: 50,
            questionTypes,
            knowledgeScore,
          }}
        />
      </div>
    );
  }

  // OPTIONS PHASE - Show settings
  if (phase === 'options') {
    return renderOptions();
  }

  // Fallback - should not reach here
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Quiz Generator</h2>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <QuizPageContent />
    </Suspense>
  );
}
