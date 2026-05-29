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
    value: 'timeline',
    label: 'Timeline',
    description: 'Place events on a chronological timeline',
    variants: [
      { id: 'multiple-choice', label: 'Timeline MCQ', difficulty: 'easy' },
    ],
    requiresFlag: 'timeline',
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


  // Content classification — drives which question types are shown
  const [contentClass, setContentClass] = useState<ContentClassification | null>(null);
  const classifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const adaptiveCap = 50;
  const runCounterRef = useRef(0);

  // Classify source text after user stops typing (800 ms debounce)
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

  // When classification changes, drop any question types that are no longer applicable
  useEffect(() => {
    if (!contentClass) return;
    setQuestionTypes((prev) => {
      const next = prev.filter((t) => isQuizTypeAvailable(t, contentClass));
      return next.length > 0 ? next : ['multiple-choice'];
    });
  }, [contentClass]);

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
    return {
      sourceText: compiledText,
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
  }, [answerFeedback, gradingModes, imageDataUri, knowledgeScore, language, mode, questionCount, questionTypes, region, schoolingLevel]);

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

  // Track which question type rows are expanded (showing variants)
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const toggleExpanded = (value: string) =>
    setExpandedTypes((prev) => { const next = new Set(prev); next.has(value) ? next.delete(value) : next.add(value); return next; });

  // Content category labels from classifier flags
  const contentCategories: string[] = [];
  if (contentClass) {
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

  // OPTIONS PHASE - Settings panel (State 2)
  const renderOptions = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Quiz Settings</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Configure what your quiz focuses on</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-8">

          {/* Detected content categories */}
          {contentCategories.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Detected in your content</p>
              <div className="flex flex-wrap gap-1.5">
                {contentCategories.map((cat) => (
                  <span key={cat} className="inline-flex items-center rounded-full border border-[var(--accent-brand)]/30 bg-[var(--accent-brand)]/8 px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent-brand)]">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Question types — hierarchical */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Question Types</p>
              <span className="text-[11px] text-muted-foreground">{questionTypes.length} selected</span>
            </div>
            <div className="space-y-1.5">
              {QUIZ_TYPE_DEFINITIONS.map((typeDef) => {
                const available = isQuizTypeAvailable(typeDef.value, contentClass);
                const isSelected = questionTypes.includes(typeDef.value);
                const isExpanded = expandedTypes.has(typeDef.value);

                return (
                  <div key={typeDef.value} className={`rounded-xl border transition-all ${!available ? 'opacity-40' : isSelected ? 'border-[var(--accent-brand)]/40 bg-[var(--accent-brand)]/5' : 'border-border bg-muted/20'}`}>
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      {/* Circle toggle — select/deselect entire type */}
                      <button
                        type="button"
                        disabled={!available}
                        onClick={() => toggleQuestionType(typeDef.value)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          isSelected
                            ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]'
                            : 'border-muted-foreground/30 bg-transparent hover:border-[var(--accent-brand)]/60'
                        }`}
                      >
                        {isSelected && <span className="block h-2 w-2 rounded-full bg-white" />}
                      </button>

                      {/* Label + description */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-[13px] font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {typeDef.label}
                        </span>
                        <span className="ml-2 text-[11px] text-muted-foreground">{typeDef.description}</span>
                      </div>

                      {/* Expand/collapse variants */}
                      {typeDef.variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(typeDef.value)}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Show layout variants"
                        >
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Expanded variants */}
                    {isExpanded && typeDef.variants.length > 1 && (
                      <div className="border-t border-border/60 px-3 py-2.5">
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Layout variants — selected by weighted chance based on your knowledge level</p>
                        <div className="flex flex-wrap gap-2">
                          {typeDef.variants.map((v) => (
                            <div key={v.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5">
                              <span className="text-[12px] text-foreground">{v.label}</span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${DIFFICULTY_COLOR[v.difficulty]}`}>
                                {DIFFICULTY_LABEL[v.difficulty]}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          Lower knowledge level → higher chance of easier variants. Variants are picked randomly per question.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Knowledge level */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-foreground">Knowledge Level</p>
                <p className="text-[11px] text-muted-foreground">How much do you already know about this topic?</p>
              </div>
              <span className="text-[13px] font-semibold text-[var(--accent-brand)]">{knowledgeScore}%</span>
            </div>
            <Slider
              value={[knowledgeScore]}
              onValueChange={([value]) => setKnowledgeScore(value)}
              min={0}
              max={100}
              step={5}
              disabled={loading}
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Nothing at all</span>
              <span>Almost everything</span>
            </div>
          </div>

          {/* Settings row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* Mode */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Mode</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { value: 'classic', label: 'Classic', desc: 'Answers revealed at end' },
                  { value: 'assisted', label: 'Assisted', desc: 'Immediate feedback' },
                  { value: 'adaptive', label: 'Adaptive', desc: 'AI adjusts difficulty' },
                ].map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => setMode(entry.value as QuizMode)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                      mode === entry.value
                        ? 'border-[var(--accent-brand)]/40 bg-[var(--accent-brand)]/8 text-foreground'
                        : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${mode === entry.value ? 'bg-[var(--accent-brand)]' : 'bg-muted-foreground/40'}`} />
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Questions</p>
                <span className="text-[11px] font-mono text-muted-foreground">{mode === 'adaptive' ? '∞' : questionCount}</span>
              </div>
              <Slider
                value={[mode === 'adaptive' ? 12 : questionCount]}
                onValueChange={([value]) => mode !== 'adaptive' && setQuestionCount(value)}
                min={3}
                max={25}
                step={1}
                disabled={loading || mode === 'adaptive'}
              />
            </div>

            {/* Focus */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Focus</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { value: 'accuracy', label: 'Accuracy' },
                  { value: 'speed', label: 'Speed' },
                  { value: 'progression', label: 'Progression' },
                ].map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => toggleGrading(entry.value as GradingMode)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                      gradingModes.includes(entry.value as GradingMode)
                        ? 'border-[var(--accent-brand)]/40 bg-[var(--accent-brand)]/8 text-foreground'
                        : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${gradingModes.includes(entry.value as GradingMode) ? 'bg-[var(--accent-brand)]' : 'bg-muted-foreground/40'}`} />
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Title (optional) */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Title (optional)</p>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-sm"
              placeholder="e.g. WW2 Overview, Cell Division..."
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="shrink-0 border-t border-border px-6 py-4 flex justify-between gap-3">
        <Button
          variant="outline"
          className="h-10 px-5"
          onClick={() => {
            setPhase('input');
            setSourceText('');
            setTitle('');
          }}
        >
          ← Back
        </Button>
        <Button
          className="h-10 bg-[var(--accent-brand)] px-6 text-white hover:opacity-90"
          onClick={() => {
            setLoading(true);
            handleGenerate(sourceText);
            setPhase('study');
          }}
          disabled={loading || !sourceText.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <BrainCircuit className="mr-2 h-4 w-4" />
              Generate Quiz
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // INPUT PHASE - Clean input without sidebar (State 1)
  if (phase === 'input') {
    return (
      <WorkbenchShell
        title="Quiz Generator"
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
              onImageDataUriChange={setImageDataUri}
              onSubmit={(compiledText) => {
                setSourceText(compiledText);
                setPhase('options');
              }}
              isLoading={false}
              submitLabel="Next"
              speechLanguage={language}
              hideToolSwitcher
            />
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
