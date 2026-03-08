'use client';

import React, { useState, useEffect, Suspense, useCallback, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { Loader2, Sparkles } from 'lucide-react';
import { FunLoader } from '@/components/tools/fun-loader';
import { QuizTaker, QuizMode } from '@/components/tools/quiz-taker';
import { AppContext } from '@/contexts/app-context';
import type { Quiz } from '@/lib/types';
import { QuizDuel } from '@/components/tools/quiz-duel';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { SourceInput } from '@/components/tools/source-input';
import { PillSelector } from '@/components/tools/pill-selector';
import { PresetManager } from '@/components/tools/preset-manager';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { ExportToolbar } from '@/components/tools/export-toolbar';
import { quizToMarkdown, quizToHtml } from '@/lib/export-formatters';
import { ImportToolbar } from '@/components/tools/import-toolbar';
import { parseQuizFromMarkdown, parseQuizFromHtml } from '@/lib/import-parsers';
import { getToolStrings } from '@/lib/tool-i18n';

function QuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceTextFromParams = searchParams.get('sourceText');
  const runId = searchParams.get('runId');
  const context = searchParams.get('context');
  const classId = searchParams.get('classId');
  const isAssignmentContext = context === 'assignment';
  const { run: savedRun, isLoading: isLoadingRun } = useSavedRun(runId);
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const t = getToolStrings(language);

  const [sourceText, setSourceText] = useState(sourceTextFromParams || '');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');
  const [modePack, setModePack] = useState('practice');
  const [difficultyProfile, setDifficultyProfile] = useState('balanced');
  const [questionCount, setQuestionCount] = useState(7);
  const [questionType, setQuestionType] = useState('mixed');
  const [feedbackStyle, setFeedbackStyle] = useState('immediate');
  const [gradingStrictness, setGradingStrictness] = useState('moderate');
  const [spellingTolerance, setSpellingTolerance] = useState('lenient');
  const [partialCredit, setPartialCredit] = useState('enabled');
  const [gradingMethod, setGradingMethod] = useState('auto');
  const [currentView, setCurrentView] = useState<'setup' | 'take' | 'duel'>('setup');
  const [customTitle, setCustomTitle] = useState('');
  const { toast } = useToast();

  const handleGenerate = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsLoading(true);
    setGeneratedQuiz(null);
    try {
      if (quizMode === 'duel') {
        setCurrentView('duel');
      } else {
        const count = (quizMode === 'survival' || quizMode === 'adaptive' || quizMode === 'boss-fight') ? 1 : questionCount;
        const run = await runToolFlowV2({
          toolId: 'quiz',
          flowName: 'generateQuiz',
          mode: quizMode,
          artifactType: 'quiz',
          artifactTitle: customTitle.trim() || 'Generated Quiz',
          input: { sourceText: text, questionCount: count, language, difficultyProfile, modePack, questionType, feedbackStyle, gradingStrictness, spellingTolerance, partialCredit, gradingMethod },
          computeClass: count > 20 ? 'heavy' : 'standard',
        });
        const response = run?.output_payload || run;
        setGeneratedQuiz(response as Quiz);
        setCurrentView('take');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({ variant: 'destructive', title: t.quiz.generatingTitle, description: (error as any)?.message || 'Unable to generate quiz' });
      setCurrentView('setup');
    } finally {
      setIsLoading(false);
    }
  }, [quizMode, questionCount, language, difficultyProfile, modePack, questionType, feedbackStyle, gradingStrictness, spellingTolerance, partialCredit, gradingMethod]);

  useEffect(() => {
    if (sourceTextFromParams && !isAssignmentContext) handleGenerate(sourceTextFromParams);
  }, [sourceTextFromParams, handleGenerate]);

  useEffect(() => {
    if (savedRun?.output_payload && savedRun.status === 'succeeded') {
      const output = savedRun.output_payload;
      setGeneratedQuiz(output as Quiz);
      setCurrentView('take');
      if (savedRun.input_payload?.sourceText) setSourceText(savedRun.input_payload.sourceText);
      if (savedRun.mode) setQuizMode(savedRun.mode as QuizMode);
    }
  }, [savedRun]);

  useEffect(() => {
    const s = (k: string) => localStorage.getItem(`tools.quiz.${k}`);
    if (s('mode')) setQuizMode(s('mode') as QuizMode);
    if (s('count') && !Number.isNaN(Number(s('count')))) setQuestionCount(Number(s('count')));
    if (s('pack')) setModePack(s('pack')!);
    if (s('difficulty')) setDifficultyProfile(s('difficulty')!);
    if (s('questionType')) setQuestionType(s('questionType')!);
    if (s('feedbackStyle')) setFeedbackStyle(s('feedbackStyle')!);
    if (s('gradingStrictness')) setGradingStrictness(s('gradingStrictness')!);
    if (s('spellingTolerance')) setSpellingTolerance(s('spellingTolerance')!);
    if (s('partialCredit')) setPartialCredit(s('partialCredit')!);
    if (s('gradingMethod')) setGradingMethod(s('gradingMethod')!);
  }, []);

  useEffect(() => { localStorage.setItem('tools.quiz.mode', quizMode); }, [quizMode]);
  useEffect(() => { localStorage.setItem('tools.quiz.count', String(questionCount)); }, [questionCount]);
  useEffect(() => { localStorage.setItem('tools.quiz.pack', modePack); }, [modePack]);
  useEffect(() => { localStorage.setItem('tools.quiz.difficulty', difficultyProfile); }, [difficultyProfile]);
  useEffect(() => { localStorage.setItem('tools.quiz.questionType', questionType); }, [questionType]);
  useEffect(() => { localStorage.setItem('tools.quiz.feedbackStyle', feedbackStyle); }, [feedbackStyle]);
  useEffect(() => { localStorage.setItem('tools.quiz.gradingStrictness', gradingStrictness); }, [gradingStrictness]);
  useEffect(() => { localStorage.setItem('tools.quiz.spellingTolerance', spellingTolerance); }, [spellingTolerance]);
  useEffect(() => { localStorage.setItem('tools.quiz.partialCredit', partialCredit); }, [partialCredit]);
  useEffect(() => { localStorage.setItem('tools.quiz.gradingMethod', gradingMethod); }, [gradingMethod]);

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
        <div className="px-4 md:px-6 pt-3 flex items-center justify-between">
          <Button variant="ghost" onClick={handleRestart} className="rounded-full text-xs">{t.back}</Button>
          <ExportToolbar
            toolType="quiz"
            title={customTitle.trim() || generatedQuiz.title}
            getMarkdown={() => quizToMarkdown(generatedQuiz)}
            getHtml={() => quizToHtml(generatedQuiz)}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <QuizTaker quiz={generatedQuiz} mode={quizMode} sourceText={sourceText} onRestart={handleRestart} />
        </div>
      </div>
    );
  }
  if (currentView === 'duel') {
    return <QuizDuel sourceText={sourceText} onRestart={handleRestart} />;
  }

  const currentSettings = { quizMode, modePack, difficultyProfile, questionCount, questionType, feedbackStyle, gradingStrictness, spellingTolerance, partialCredit, gradingMethod };

  const sidebar = (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{t.title}</p>
        <input
          type="text"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder={t.titlePlaceholder}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={isLoading}
        />
      </div>

      <PresetManager
        toolId="quiz"
        currentSettings={currentSettings}
        onLoadPreset={(s) => {
          if (s.quizMode) setQuizMode(s.quizMode);
          if (s.modePack) setModePack(s.modePack);
          if (s.difficultyProfile) setDifficultyProfile(s.difficultyProfile);
          if (s.questionCount) setQuestionCount(s.questionCount);
          if (s.questionType) setQuestionType(s.questionType);
          if (s.feedbackStyle) setFeedbackStyle(s.feedbackStyle);
          if (s.gradingStrictness) setGradingStrictness(s.gradingStrictness);
          if (s.spellingTolerance) setSpellingTolerance(s.spellingTolerance);
          if (s.partialCredit) setPartialCredit(s.partialCredit);
          if (s.gradingMethod) setGradingMethod(s.gradingMethod);
        }}
      />

      <PillSelector label={t.quiz.labels.pack} options={t.quiz.packOptions} value={modePack}
        onChange={(v) => { setModePack(v); if (v === 'adaptive') setQuizMode('adaptive'); if (v === 'exam') setQuizMode('exam'); if (v === 'practice') setQuizMode('practice'); }}
        disabled={isLoading} />

      <PillSelector label={t.quiz.labels.mode} options={t.quiz.modeOptions} value={quizMode} onChange={(v) => setQuizMode(v as QuizMode)} disabled={isLoading} />

      <PillSelector label={t.quiz.labels.difficulty} options={t.quiz.difficultyOptions} value={difficultyProfile} onChange={setDifficultyProfile} disabled={isLoading} />

      <PillSelector label={t.quiz.labels.questionType} options={t.quiz.questionTypeOptions} value={questionType} onChange={setQuestionType} disabled={isLoading} />

      <PillSelector label={t.quiz.labels.feedback} options={t.quiz.feedbackOptions} value={feedbackStyle} onChange={setFeedbackStyle} disabled={isLoading} />

      <PillSelector label={t.quiz.labels.gradingStrictness} options={t.quiz.gradingStrictnessOptions} value={gradingStrictness} onChange={setGradingStrictness} disabled={isLoading} />

      <PillSelector label={t.quiz.labels.spellingTolerance} options={t.quiz.spellingToleranceOptions} value={spellingTolerance} onChange={setSpellingTolerance} disabled={isLoading} />

      <PillSelector label={t.quiz.labels.partialCredit} options={t.quiz.partialCreditOptions} value={partialCredit} onChange={setPartialCredit} disabled={isLoading} />

      <PillSelector label={t.quiz.labels.gradingMethod} options={t.quiz.gradingMethodOptions} value={gradingMethod} onChange={setGradingMethod} disabled={isLoading} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t.questions}</p>
          <span className="text-xs font-mono tabular-nums">{questionCount}</span>
        </div>
        <Slider value={[questionCount]} onValueChange={([v]) => setQuestionCount(v)} min={1} max={50} step={1} disabled={isLoading} />
      </div>

      <Button onClick={() => handleGenerate(sourceText)} disabled={isLoading || !sourceText.trim()} className="w-full rounded-full">
        <Sparkles className="mr-2 h-4 w-4" />
        {t.quiz.generate}
      </Button>

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
    <WorkbenchShell title={isAssignmentContext ? t.quiz.createQuiz : 'Quiz'} sidebar={sidebar}>
      <SourceInput value={sourceText} onChange={setSourceText} onSubmit={() => handleGenerate(sourceText)} placeholder={t.sourceInputPlaceholder} />
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