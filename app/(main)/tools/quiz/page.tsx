'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect, Suspense, useCallback, useContext, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { Loader2 } from 'lucide-react';
import { FunLoader } from '@/components/tools/fun-loader';
import type { QuizMode } from '@/components/tools/quiz-taker';
import { AppContext } from '@/contexts/app-context';
import type { Quiz } from '@/lib/types';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SourceInput } from '@/components/tools/source-input';
import { PillSelector } from '@/components/tools/pill-selector';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { ExportToolbar } from '@/components/tools/export-toolbar';
import { quizToMarkdown, quizToHtml } from '@/lib/export-formatters';
import { ImportToolbar } from '@/components/tools/import-toolbar';
import { parseQuizFromMarkdown, parseQuizFromHtml } from '@/lib/import-parsers';
import { getToolStrings } from '@/lib/tool-i18n';
import { Switch } from '@/components/ui/switch';

const QuizTaker = dynamic(
  () => import('@/components/tools/quiz-taker').then((m) => m.QuizTaker),
  { ssr: false }
);
const QuizDuel = dynamic(
  () => import('@/components/tools/quiz-duel').then((m) => m.QuizDuel),
  { ssr: false }
);

const VALID_QUIZ_MODES: QuizMode[] = ['normal', 'practice', 'exam', 'survival', 'speedrun', 'adaptive', 'duel', 'boss-fight'];

function normalizeQuizMode(value: string | null | undefined): QuizMode {
  const next = String(value || '').trim().toLowerCase();
  if (next === 'classic') return 'practice';
  if ((VALID_QUIZ_MODES as string[]).includes(next)) return next as QuizMode;
  return 'practice';
}

function QuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceTextFromParams = searchParams.get('sourceText');
  const runId = searchParams.get('runId');
  const taskId = searchParams.get('taskId');
  const studysetId = searchParams.get('studysetId');
  const launchRequested = searchParams.get('launch') === '1';
  const context = searchParams.get('context');
  const classId = searchParams.get('classId');
  const isAssignmentContext = context === 'assignment';
  const { run: savedRun, isLoading: isLoadingRun } = useSavedRun(runId);
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const region = appContext?.region ?? 'global';
  const schoolingLevel = appContext?.schoolingLevel ?? 2;
  const t = getToolStrings(language);

  const [sourceText, setSourceText] = useState(sourceTextFromParams || '');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');
  const [questionCount, setQuestionCount] = useState(7);
  const [questionType, setQuestionType] = useState('mixed');
  const [currentView, setCurrentView] = useState<'setup' | 'take' | 'duel'>('setup');
  const [customTitle, setCustomTitle] = useState('');
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [saveToRecents, setSaveToRecents] = useState(true);
  const launchHandledRef = useRef(false);
  const sourceParamsHandledRef = useRef(false);
  const { toast } = useToast();

  const handleGenerate = useCallback(async (
    text: string,
    overrides?: Partial<{
      mode: QuizMode;
      questionCount: number;
      questionType: string;
      title: string;
    }>
  ) => {
    if (!text.trim()) return;
    setIsLoading(true);
    setGeneratedQuiz(null);
    try {
      const requestedMode = overrides?.mode || quizMode;
      const requestedQuestionCount = overrides?.questionCount ?? questionCount;
      const requestedQuestionType = overrides?.questionType || questionType;
      const requestedTitle = overrides?.title || customTitle.trim() || 'Generated Quiz';

      if (requestedMode === 'duel') {
        setCurrentView('duel');
      } else {
        const count = (requestedMode === 'survival' || requestedMode === 'adaptive' || requestedMode === 'boss-fight') ? 1 : requestedQuestionCount;
        const run = await runToolFlowV2({
          toolId: 'quiz',
          flowName: 'generateQuiz',
          mode: requestedMode,
          artifactType: 'quiz',
          artifactTitle: requestedTitle,
          options: { saveToRecents },
          persistArtifact: saveToRecents,
          input: {
            sourceText: text,
            imageDataUri: imageDataUri || undefined,
            questionCount: count,
            language,
            regionCode: String(region || 'global').toUpperCase(),
            educationLevel: schoolingLevel,
            questionType: requestedQuestionType,
          },
          computeClass: count > 20 ? 'heavy' : 'standard',
        });
        const response = run?.output_payload || run;
        setGeneratedQuiz(response as Quiz);
        setCurrentView('take');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        variant: 'destructive',
        title: t.quiz.generatingTitle,
        description: (error as any)?.message || 'Unable to generate quiz',
        errorCode: (error as any)?.code ? String((error as any).code) : undefined,
      });
      setCurrentView('setup');
    } finally {
      setIsLoading(false);
    }
  }, [customTitle, imageDataUri, language, region, schoolingLevel, questionCount, questionType, quizMode, saveToRecents]);

  useEffect(() => {
    if (!sourceTextFromParams || isAssignmentContext || sourceParamsHandledRef.current) return;
    sourceParamsHandledRef.current = true;
    void handleGenerate(sourceTextFromParams);
  }, [sourceTextFromParams, isAssignmentContext, handleGenerate]);

  useEffect(() => {
    if (!launchRequested || !taskId || !studysetId || launchHandledRef.current) return;
    launchHandledRef.current = true;
    console.info('[STUDYSET_LAUNCH][QUIZ] launch requested', {
      taskId,
      studysetId,
      launchRequested,
    });

    const runLaunch = async () => {
      try {
        const response = await fetch(`/api/studysets/plan-tasks/${taskId}/launch`);
        if (!response.ok) throw new Error(`Could not load studyset task preset (${response.status})`);
        const payload = await response.json();
        const source = String(payload?.launch?.sourceText || '').trim();
        const preset = payload?.launch?.quizPreset || {};
        const title = String(payload?.launch?.artifactTitle || '').trim();
        console.info('[STUDYSET_LAUNCH][QUIZ] launch payload loaded', {
          taskId,
          studysetId,
          sourceLength: source.length,
          preset,
          hasTitle: Boolean(title),
        });

        if (source) setSourceText(source);
        if (preset?.mode) setQuizMode(normalizeQuizMode(String(preset.mode)));
        if (typeof preset?.questionCount === 'number') setQuestionCount(preset.questionCount);
        if (preset?.questionType) setQuestionType(String(preset.questionType));
        if (title) setCustomTitle(title);

        if (source) {
          await handleGenerate(source, {
            mode: normalizeQuizMode(String(preset?.mode || 'practice')),
            questionCount: typeof preset?.questionCount === 'number' ? preset.questionCount : undefined,
            questionType: preset?.questionType ? String(preset.questionType) : undefined,
            title: title || undefined,
          });
          console.info('[STUDYSET_LAUNCH][QUIZ] generation completed', { taskId, studysetId });
        }
      } catch (error: any) {
        console.error('[STUDYSET_LAUNCH][QUIZ] launch failed', {
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
  }, [handleGenerate, launchRequested, studysetId, taskId, toast]);

  useEffect(() => {
    if (savedRun?.output_payload && savedRun.status === 'succeeded') {
      const output = savedRun.output_payload;
      setGeneratedQuiz(output as Quiz);
      setCurrentView('take');
      if (savedRun.input_payload?.sourceText) setSourceText(savedRun.input_payload.sourceText);
      if (savedRun.mode) setQuizMode(normalizeQuizMode(savedRun.mode));
    }
  }, [savedRun]);

  useEffect(() => {
    const s = (k: string) => localStorage.getItem(`tools.quiz.${k}`);
    if (s('mode')) setQuizMode(normalizeQuizMode(s('mode')));
    if (s('count') && !Number.isNaN(Number(s('count')))) setQuestionCount(Number(s('count')));
    if (s('questionType')) setQuestionType(s('questionType')!);
    if (s('saveToRecents') === 'false') setSaveToRecents(false);
  }, []);

  useEffect(() => { localStorage.setItem('tools.quiz.mode', quizMode); }, [quizMode]);
  useEffect(() => { localStorage.setItem('tools.quiz.count', String(questionCount)); }, [questionCount]);
  useEffect(() => { localStorage.setItem('tools.quiz.questionType', questionType); }, [questionType]);
  useEffect(() => { localStorage.setItem('tools.quiz.saveToRecents', String(saveToRecents)); }, [saveToRecents]);

  const handleRestart = () => {
    setGeneratedQuiz(null);
    setCurrentView('setup');
    if (isAssignmentContext) {
      if (classId) router.push(`/class/${classId}`);
      else router.push('/classes');
    }
  };

  if (isLoading) {
    return <FunLoader tool="quiz" />;
  }

  if (generatedQuiz && currentView === 'take') {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 md:p-4 flex items-center justify-between">
          <Button variant="ghost" onClick={handleRestart} className="rounded-full text-xs">{t.back}</Button>
          <ExportToolbar
            toolType="quiz"
            title={customTitle.trim() || generatedQuiz.title}
            getMarkdown={() => quizToMarkdown(generatedQuiz)}
            getHtml={() => quizToHtml(generatedQuiz)}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <QuizTaker
            quiz={generatedQuiz}
            mode={quizMode}
            sourceText={sourceText}
            onRestart={handleRestart}
            taskId={taskId || undefined}
            studysetId={studysetId || undefined}
          />
        </div>
      </div>
    );
  }
  if (currentView === 'duel') {
    return <QuizDuel sourceText={sourceText} onRestart={handleRestart} />;
  }

  const sidebar = (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{t.title}</p>
        <Input
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          className="h-9 text-sm"
          disabled={isLoading}
        />
      </div>

      <PillSelector label={t.quiz.labels.mode} options={t.quiz.modeOptions} value={quizMode} onChange={(v) => setQuizMode(v as QuizMode)} disabled={isLoading} />

      <PillSelector label={t.quiz.labels.questionType} options={t.quiz.questionTypeOptions} value={questionType} onChange={setQuestionType} disabled={isLoading} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t.questions}</p>
          <span className="text-xs font-mono tabular-nums">{questionCount}</span>
        </div>
        <Slider
          value={[questionCount]}
          onValueChange={([v]) => setQuestionCount(v)}
          min={1}
          max={50}
          step={1}
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg bg-sidebar-accent/30 px-2.5 py-2">
        <p className="text-xs text-muted-foreground">Save to recents</p>
        <Switch
          checked={saveToRecents}
          onCheckedChange={setSaveToRecents}
          className="h-5 w-9 data-[state=checked]:!bg-emerald-800 data-[state=unchecked]:!bg-red-800 data-[state=checked]:[&>span]:translate-x-4 [&>span]:h-4 [&>span]:w-4"
        />
      </div>

      <ImportToolbar
        toolType="quiz"
        onImport={(text) => {
          const quiz = text.includes('<') ? parseQuizFromHtml(text) : parseQuizFromMarkdown(text);
          if (quiz && quiz.questions.length > 0) {
            setGeneratedQuiz(quiz);
            setCurrentView('take');
          } else {
            toast({ variant: 'destructive', title: t.couldNotParse, description: t.quiz.parseError });
          }
        }}
        disabled={isLoading}
      />
    </>
  );

  return (
    <WorkbenchShell
      title={isAssignmentContext ? t.quiz.createQuiz : 'Quiz'}
      sidebar={sidebar}
    >
      <SourceInput
        toolId="quiz"
        value={sourceText}
        onChange={setSourceText}
        onImageDataUriChange={setImageDataUri}
        onSubmit={(compiledText) => handleGenerate(String(compiledText || sourceText))}
        placeholder={t.sourceInputPlaceholder}
        speechLanguage={language}
        enableMic={false}
        enableCaptions={false}
        sourceMergeMode="append_labeled"
      />
    </WorkbenchShell>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <QuizPageContent />
    </Suspense>
  );
}
