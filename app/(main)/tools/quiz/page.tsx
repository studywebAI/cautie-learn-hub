'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BrainCircuit, Loader2 } from 'lucide-react';
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

const QUIZ_TYPES = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'true-false', label: 'True/False' },
  { value: 'fill-blank', label: 'Fill in Blank' },
  { value: 'short-answer', label: 'Short Answer' },
  { value: 'matching', label: 'Matching' },
  { value: 'ordering', label: 'Ordering' },
  { value: 'video-fragment', label: 'Video Fragment' },
  { value: 'internet-photo', label: 'Internet Photo' },
  { value: 'timeline', label: 'Timeline' },
] as const;

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

  // OPTIONS PHASE - Settings panel (State 2)
  const renderOptions = () => (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Quiz Settings"
        subtitle="Configure your quiz parameters"
        hideBreadcrumb
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Title section */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Title</p>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-sm"
              placeholder="Quiz title (optional)"
              disabled={loading}
            />
          </div>

          {/* Mode section */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Quiz Mode</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'classic', label: 'Classic' },
                { value: 'assisted', label: 'Assisted' },
                { value: 'adaptive', label: 'Adaptive' },
              ].map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => setMode(entry.value as QuizMode)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    mode === entry.value
                      ? 'border-border bg-background text-foreground'
                      : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {/* Answer reveal section */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Answer Reveal</p>
            <div className="flex flex-wrap gap-2">
              {['immediate', 'end'].map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setAnswerFeedback(entry as AnswerFeedback)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    answerFeedback === entry
                      ? 'border-border bg-background text-foreground'
                      : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {entry === 'immediate' ? 'Immediate' : 'At End'}
                </button>
              ))}
            </div>
          </div>

          {/* Question types section */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Question Types</p>
            <div className="flex flex-wrap gap-2">
              {QUIZ_TYPES.filter((entry) => isQuizTypeAvailable(entry.value, contentClass)).map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => toggleQuestionType(entry.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    questionTypes.includes(entry.value)
                      ? 'border-border bg-background text-foreground'
                      : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {/* Knowledge score slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Knowledge Level</p>
              <span className="text-xs font-mono">{knowledgeScore}%</span>
            </div>
            <Slider
              value={[knowledgeScore]}
              onValueChange={([value]) => setKnowledgeScore(value)}
              min={0}
              max={100}
              step={1}
              disabled={loading}
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Nothing</span>
              <span>Almost everything</span>
            </div>
          </div>

          {/* Question count slider */}
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Question Count</p>
              <span className="text-xs font-mono">{mode === 'adaptive' ? 12 : questionCount}</span>
            </div>
            <Slider
              value={[mode === 'adaptive' ? 12 : questionCount]}
              onValueChange={([value]) => mode !== 'adaptive' && setQuestionCount(value)}
              min={1}
              max={25}
              step={1}
              disabled={loading || mode === 'adaptive'}
            />
          </div>

          {/* Focus areas */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Focus On</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'accuracy', label: 'Accuracy' },
                { value: 'speed', label: 'Speed' },
                { value: 'progression', label: 'Progression' },
              ].map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => toggleGrading(entry.value as GradingMode)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    gradingModes.includes(entry.value as GradingMode)
                      ? 'border-border bg-background text-foreground'
                      : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-border p-4 flex justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setPhase('input');
            setSourceText('');
            setTitle('');
          }}
        >
          Back
        </Button>
        <Button
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

  // STUDY PHASE - Show quiz taker with header (State 3)
  if (phase === 'study' && quiz) {
    return (
      <div className="h-full flex flex-col">
        <PageHeader title="Take Quiz" hideBreadcrumb />
        <div className="flex-1 min-h-0 overflow-auto">
          <QuizTaker
            quiz={quiz}
            mode={mode}
            sourceText={sourceText}
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
