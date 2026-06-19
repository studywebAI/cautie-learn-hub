'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BrainCircuit, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { AppContext } from '@/contexts/app-context';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
type Phase = 'input' | 'analyzing' | 'options' | 'study';

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
  const taskId = searchParams.get('taskId');
  const studysetId = searchParams.get('studysetId');
  const launchRequested = searchParams.get('launch') === '1';
  const launchMode = searchParams.get('mode') || '';

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

  // Selected variants per question type — initialized with all variants for every type
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    QUIZ_TYPE_DEFINITIONS.forEach((t) => { init[t.value] = t.variants.map((v) => v.id); });
    return init;
  });


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
  const launchHandledRef = useRef(false);

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

  const runAiCategoryEval = useCallback(async (text: string, imgDesc: string | null) => {
    const combined = imgDesc ? `${text}\n\n${imgDesc}` : text;
    if (!combined || combined.trim().length < 150) return;
    setAiCategoryLoading(true);
    setAiCategories(null);
    try {
      const res = await fetch('/api/ai/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowName: 'evaluateContentCategories', input: { sourceText: combined.slice(0, 4000) } }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') setAiCategories(data);
      }
    } catch {
      // non-fatal — regex fallback stays active
    } finally {
      setAiCategoryLoading(false);
    }
  }, []);

  const handleInputSubmit = useCallback(async (compiledText: string) => {
    setSourceText(compiledText);
    setPhase('analyzing');
    await runAiCategoryEval(compiledText, imageDescription);
    setPhase('options');
  }, [runAiCategoryEval, imageDescription]);

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
      if (parsed?.selectedVariants && typeof parsed.selectedVariants === 'object') {
        setSelectedVariants((prev) => ({ ...prev, ...parsed.selectedVariants }));
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
      if (parsed?.selectedVariants && typeof parsed.selectedVariants === 'object') {
        setSelectedVariants((prev) => ({ ...prev, ...parsed.selectedVariants }));
      }
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
          selectedVariants,
        })
      );
    } catch {
      // ignore storage write failures
    }
  }, [answerFeedback, gradingModes, knowledgeScore, mode, questionCount, questionTypes, selectedVariants, title]);

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
          selectedVariants,
          quiz,
        })
      );
    } catch {
      // ignore storage write failures
    }
  }, [answerFeedback, gradingModes, knowledgeScore, mode, questionCount, questionTypes, quiz, selectedVariants, sourceText, title]);

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
      // Auto-select all variants when enabling a type for the first time
      setSelectedVariants((sv) => {
        if (sv[value]?.length) return sv;
        const typeDef = QUIZ_TYPE_DEFINITIONS.find((t) => t.value === value);
        return { ...sv, [value]: typeDef?.variants.map((v) => v.id) || [] };
      });
      return [...prev, value];
    });
  };

  const toggleVariant = (typeValue: string, variantId: string) => {
    setSelectedVariants((prev) => {
      const current = prev[typeValue] || [];
      if (current.includes(variantId)) {
        const next = current.filter((id) => id !== variantId);
        return { ...prev, [typeValue]: next.length > 0 ? next : current }; // keep at least one
      }
      return { ...prev, [typeValue]: [...current, variantId] };
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

  // Studyset launch — load preset and auto-generate when launched from a plan task
  useEffect(() => {
    if (!launchRequested || !taskId || !studysetId || launchHandledRef.current) return;
    launchHandledRef.current = true;
    console.info('[STUDYSET_LAUNCH][QUIZ] launch requested', { taskId, studysetId, launchRequested });

    const runLaunch = async () => {
      try {
        const response = await fetch(`/api/studysets/plan-tasks/${taskId}/launch`);
        if (!response.ok) throw new Error(`Could not load studyset task preset (${response.status})`);
        const payload = await response.json();
        const source = String(payload?.launch?.sourceText || '').trim();
        const preset = payload?.launch?.quizPreset || {};
        const presetTitle = String(payload?.launch?.artifactTitle || '').trim();
        console.info('[STUDYSET_LAUNCH][QUIZ] launch payload loaded', {
          taskId,
          studysetId,
          sourceLength: source.length,
          preset,
          hasTitle: Boolean(presetTitle),
        });

        if (source) setSourceText(source);
        if (presetTitle) setTitle(presetTitle);
        const presetCount = typeof preset?.questionCount === 'number' ? preset.questionCount : 12;
        if (launchMode === 'quick') {
          setQuestionCount(Math.min(10, presetCount));
        } else {
          setQuestionCount(Math.max(3, Math.min(25, presetCount)));
        }
        // Map difficulty profile → "how much you already know" slider (harder => assume less known)
        if (preset?.difficultyProfile === 'hard') setKnowledgeScore(30);
        else if (preset?.difficultyProfile === 'easy') setKnowledgeScore(70);
        else if (preset?.difficultyProfile === 'balanced') setKnowledgeScore(50);

        if (source) {
          setPhase('study');
          await handleGenerate(source);
          console.info('[STUDYSET_LAUNCH][QUIZ] generation completed', { taskId, studysetId });
        } else {
          setPhase('options');
        }
      } catch (error: any) {
        console.error('[STUDYSET_LAUNCH][QUIZ] error', {
          taskId,
          studysetId,
          message: error?.message || String(error),
        });
        toast({
          variant: 'destructive',
          title: 'Could not start studyset task',
          description: error?.message || 'Please refresh and try again.',
          errorCode: error?.code ? String(error.code) : undefined,
        });
      }
    };

    void runLaunch();
  }, [handleGenerate, launchMode, launchRequested, studysetId, taskId, toast]);

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
        comparisons: contentClass.comparisons === 'y' || aiCategories?.comparisons === 'y' || aiCategories?.classifications === 'y' ? 'y' : 'n',
        arguments: contentClass.arguments === 'y' || aiCategories?.arguments === 'y' ? 'y' : 'n',
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
        <div className="flex flex-1 overflow-hidden bg-background">

          {/* ── Left: Question Types accordion ── */}
          <div className="flex-1 overflow-y-auto bg-background m-3 rounded-lg">
            <div className="p-4 pb-2">
              <div className="flex items-center justify-between mb-2.5">
                <p className={S}>Question Types</p>
                <span className="text-[11px] text-muted-foreground">{questionTypes.length} selected</span>
              </div>
            </div>

            <div className="mx-4 mb-4 rounded-lg border border-border/60 overflow-visible bg-card">
              {QUIZ_TYPE_DEFINITIONS.filter((t) => isQuizTypeAvailable(t.value, mergedContentClass)).map((typeDef, idx, arr) => {
                const isSelected = questionTypes.includes(typeDef.value);
                const isExpanded = expandedTypes.has(typeDef.value);
                const isFirst = idx === 0;
                const isLast = idx === arr.length - 1;

                return (
                  <div key={typeDef.value} className={`${isFirst ? 'rounded-t-lg' : ''} ${isLast && !isExpanded ? 'rounded-b-lg' : ''}`}>
                    {/* Full-row click toggles the type */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleQuestionType(typeDef.value)}
                      onKeyDown={(e) => e.key === 'Enter' && toggleQuestionType(typeDef.value)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b border-border/40 last:border-b-0 transition-all ${isSelected ? 'bg-[var(--accent-brand)]/10' : 'hover:bg-muted/40'}`}
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); }}
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors text-[10px] font-bold leading-none"
                          >
                            i
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[224px] text-[11px]">
                          {typeDef.description}
                        </TooltipContent>
                      </Tooltip>

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
                      <div className={`border-t border-border/40 ${isLast ? 'rounded-b-lg overflow-hidden' : ''}`}>
                        {typeDef.variants.map((v) => {
                          const isVariantSelected = isSelected && (selectedVariants[typeDef.value] || []).includes(v.id);
                          return (
                            <div
                              key={v.id}
                              role="button"
                              tabIndex={isSelected ? 0 : -1}
                              onClick={(e) => { e.stopPropagation(); if (isSelected) toggleVariant(typeDef.value, v.id); }}
                              onKeyDown={(e) => e.key === 'Enter' && isSelected && toggleVariant(typeDef.value, v.id)}
                              className={`flex items-center gap-2.5 pl-9 pr-3 py-2 border-b last:border-b-0 border-border/30 transition-all ${isSelected ? 'cursor-pointer' : 'opacity-40'} ${isVariantSelected ? 'bg-[var(--accent-brand)]/[0.06]' : isSelected ? 'hover:bg-muted/40' : ''}`}
                            >
                              <div className={`flex h-[14px] w-[14px] shrink-0 rounded border-2 transition-all ${isVariantSelected ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]' : 'border-muted-foreground/30'}`}>
                                {isVariantSelected && <span className="m-auto block h-[5px] w-[5px] rounded-sm bg-white" />}
                              </div>
                              <span className={`text-[12px] flex-1 ${isVariantSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{v.label}</span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${DIFFICULTY_COLOR[v.difficulty]}`}>
                                {DIFFICULTY_LABEL[v.difficulty]}
                              </span>
                            </div>
                          );
                        })}
                        <p className="px-3 py-2 text-[10px] text-muted-foreground/50">
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
              <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className={S}>Quiz title (optional)</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors text-[10px] font-bold leading-none">i</button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[224px] text-[11px]">
                      Give your quiz a name. This appears in your results.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-[13px] border-border/30"
                  placeholder="e.g. Chapter 4 — Photosynthesis"
                  disabled={loading}
                />
              </div>

              {/* Knowledge Level */}
              <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className={S}>How much do you already know?</p>
                </div>
                <Slider
                  value={[knowledgeScore]}
                  onValueChange={([v]) => setKnowledgeScore(v)}
                  min={0} max={100} step={1}
                  disabled={loading}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Nothing</span><span>A lot</span>
                </div>
              </div>

              {/* Mode */}
              <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  <p className={S}>What mode do you want?</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors text-[10px] font-bold leading-none">i</button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] space-y-1.5 text-[11px]">
                      <p><span className="font-medium text-foreground">Classic</span> — all answers shown at the end.</p>
                      <p><span className="font-medium text-foreground">Assisted</span> — feedback after each question.</p>
                      <p><span className="font-medium text-foreground">Adaptive</span> — difficulty adjusts automatically.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-y-1">
                  {modeEntries.map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => setMode(e.value)}
                      disabled={loading}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors text-[13px] border ${
                        mode === e.value
                          ? 'border-[var(--accent-brand)]/30 bg-[var(--accent-brand)]/10 text-foreground'
                          : 'border-transparent text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${mode === e.value ? 'bg-[var(--accent-brand)]' : 'bg-muted-foreground/30'}`} />
                      <span>{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Answer Feedback */}
              <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  <p className={S}>When do you want feedback?</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors text-[10px] font-bold leading-none">i</button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] space-y-1.5 text-[11px]">
                      <p><span className="font-medium text-foreground">At the end</span> — see all answers after finishing.</p>
                      <p><span className="font-medium text-foreground">Immediately</span> — know if you're right after each question.</p>
                    </TooltipContent>
                  </Tooltip>
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
              <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className={S}>How many questions?</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--accent-brand)]">
                      {mode === 'adaptive' ? '∞' : questionCount}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors text-[10px] font-bold leading-none">i</button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[224px] text-[11px]">
                        {mode === 'adaptive' ? 'Unlimited in adaptive mode.' : 'Minimum 3, maximum 25. Adaptive mode overrides this to unlimited.'}
                      </TooltipContent>
                    </Tooltip>
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
        <div className="shrink-0 border-t border-border/60 bg-background px-5 py-3.5 flex justify-between items-center gap-3">
          <Button
            variant="outline"
            className="relative h-9 ps-10 pe-4 text-[13px]"
            onClick={() => {
              setPhase('input');
              setSourceText('');
              setTitle('');
              setImageDescription(null);
              setImageDataUri(null);
            }}
          >
            Back
            <span className="pointer-events-none absolute inset-y-0 start-0 flex w-8 items-center justify-center rounded-l-lg bg-foreground/[0.06]">
              <ChevronLeft size={14} strokeWidth={2} className="opacity-50" aria-hidden="true" />
            </span>
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
              <><Spinner size={14} className="mr-2" />Generating...</>
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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors text-[10px] font-bold leading-none"
            >
              i
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] space-y-1.5 text-[11px]">
            <p><span className="font-medium text-foreground">Literal</span> — questions only test what's explicitly in your text.</p>
            <p><span className="font-medium text-foreground">Research</span> — questions may go beyond your text. You can skip irrelevant ones.</p>
          </TooltipContent>
        </Tooltip>
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
              onSubmit={handleInputSubmit}
              isLoading={false}
              submitLabel="Next"
              speechLanguage={language}
              hideToolSwitcher
              bottomSlot={modeToggle}
            />
            {/* Image analysis indicator */}
            {imageDescLoading && (
              <div className="flex items-center gap-1.5 justify-center text-[11px] text-muted-foreground/70">
                <Spinner size={12} />
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

  if (phase === 'analyzing') {
    return (
      <WorkbenchShell
        title="Quiz"
        sidebar={<div />}
        hideSidebar={true}
        breadcrumbIcon={<BrainCircuit className="h-4 w-4" />}
      >
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <Spinner size={28} />
          <p className="text-sm text-muted-foreground">Analyzing your content…</p>
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
          studysetId={studysetId || undefined}
          taskId={taskId || undefined}
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
