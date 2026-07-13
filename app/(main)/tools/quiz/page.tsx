'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BrainCircuit, ChevronRight, Loader2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { AppContext } from '@/contexts/app-context';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useToast } from '@/hooks/use-toast';
import { ToolInputBox } from '@/components/tools/tool-input-box';
import { PageHeader } from '@/components/ui/page-header';
import type { Quiz } from '@/lib/types';
import { classifyContent, isQuizTypeAvailable } from '@/lib/tools/content-classifier';
import type { ContentClassification } from '@/lib/tools/content-classifier';
import Loader from '@/components/ui/loader';
import { FunLoader } from '@/components/tools/fun-loader';
import { QUIZ_TYPE_DEFINITIONS, QUIZ_TYPES } from '@/lib/tools/quiz-shared';
import type { QuizMode, AnswerFeedback, Phase } from '@/lib/tools/quiz-shared';

const QuizTaker = dynamic(() => import('@/components/tools/quiz-taker').then((module) => module.QuizTaker), { ssr: false });
const QuizOptionsPanel = dynamic(() => import('@/components/tools/quiz-options-panel').then((module) => module.QuizOptionsPanel), { ssr: false });

type GradingMode = 'accuracy' | 'speed' | 'progression';

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
  const autostartRequested = searchParams.get('autostart') === '1';

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
  const autostartHandledRef = useRef(false);

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

  // One-click continue — generate immediately from a pre-filled sourceText param,
  // skipping the settings screen (used by "Continue with Quiz" / "Retest weak spots").
  useEffect(() => {
    if (!autostartRequested || !sourceText.trim() || autostartHandledRef.current) return;
    autostartHandledRef.current = true;
    setPhase('study');
    void handleGenerate(sourceText);
  }, [autostartRequested, sourceText, handleGenerate]);

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

  // OPTIONS PHASE — Settings Rail layout (State 2), code-split into its own chunk
  const renderOptions = () => (
    <QuizOptionsPanel
      appContext={appContext}
      questionTypes={questionTypes}
      mergedContentClass={mergedContentClass}
      expandedTypes={expandedTypes}
      toggleExpanded={toggleExpanded}
      toggleQuestionType={toggleQuestionType}
      selectedVariants={selectedVariants}
      toggleVariant={toggleVariant}
      title={title}
      setTitle={setTitle}
      loading={loading}
      knowledgeScore={knowledgeScore}
      setKnowledgeScore={setKnowledgeScore}
      mode={mode}
      setMode={setMode}
      answerFeedback={answerFeedback}
      setAnswerFeedback={setAnswerFeedback}
      questionCount={questionCount}
      setQuestionCount={setQuestionCount}
      setPhase={setPhase}
      setSourceText={setSourceText}
      setImageDescription={setImageDescription}
      setImageDataUri={setImageDataUri}
      sourceText={sourceText}
      setLoading={setLoading}
      handleGenerate={handleGenerate}
    />
  );

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
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'literal' ? 'Literal' : 'Research'}
          </button>
        ))}
        {/* Info tooltip */}
        <InfoTooltip contentClassName="max-w-[240px]">
          <p><span className="text-foreground">Literal</span> — questions only test what's explicitly in your text.</p>
          <p><span className="text-foreground">Research</span> — questions may go beyond your text. You can skip irrelevant ones.</p>
        </InfoTooltip>
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
              <h1 className="text-2xl tracking-tight">Create a Quiz</h1>
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
      <Spinner size={28} />
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
