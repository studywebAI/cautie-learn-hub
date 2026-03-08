'use client';

import React, { useState, useEffect, Suspense, useCallback, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { QuizTaker, QuizMode } from '@/components/tools/quiz-taker';
import { AppContext } from '@/contexts/app-context';
import type { Quiz } from '@/lib/types';
import { QuizDuel } from '@/components/tools/quiz-duel';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { SourceInput } from '@/components/tools/source-input';
import { PillSelector } from '@/components/tools/pill-selector';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

function QuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceTextFromParams = searchParams.get('sourceText');
  const context = searchParams.get('context');
  const classId = searchParams.get('classId');
  const isAssignmentContext = context === 'assignment';
  const appContext = useContext(AppContext);
  if (!appContext) return null;
  const { language } = appContext;

  const [sourceText, setSourceText] = useState(sourceTextFromParams || '');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');
  const [modePack, setModePack] = useState<'practice' | 'exam' | 'adaptive'>('practice');
  const [difficultyProfile, setDifficultyProfile] = useState<'balanced' | 'ramp' | 'hard'>('balanced');
  const [questionCount, setQuestionCount] = useState(7);
  const [currentView, setCurrentView] = useState<'setup' | 'take' | 'duel'>('setup');
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
          artifactTitle: 'Generated Quiz',
          input: { sourceText: text, questionCount: count, language, difficultyProfile, modePack },
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
        title: 'Quiz generation failed',
        description: (error as any)?.message || 'Unable to generate quiz',
      });
      setCurrentView('setup');
    } finally {
      setIsLoading(false);
    }
  }, [quizMode, questionCount, language, difficultyProfile, modePack]);

  useEffect(() => {
    if (sourceTextFromParams && !isAssignmentContext) {
      handleGenerate(sourceTextFromParams);
    }
  }, [sourceTextFromParams, handleGenerate]);

  useEffect(() => {
    const savedMode = localStorage.getItem('tools.quiz.mode');
    const savedCount = localStorage.getItem('tools.quiz.count');
    const savedPack = localStorage.getItem('tools.quiz.pack');
    const savedDifficulty = localStorage.getItem('tools.quiz.difficulty');
    if (savedMode) setQuizMode(savedMode as QuizMode);
    if (savedCount && !Number.isNaN(Number(savedCount))) setQuestionCount(Number(savedCount));
    if (savedPack === 'practice' || savedPack === 'exam' || savedPack === 'adaptive') setModePack(savedPack);
    if (savedDifficulty === 'balanced' || savedDifficulty === 'ramp' || savedDifficulty === 'hard') setDifficultyProfile(savedDifficulty);
  }, []);

  useEffect(() => { localStorage.setItem('tools.quiz.mode', quizMode); }, [quizMode]);
  useEffect(() => { localStorage.setItem('tools.quiz.count', String(questionCount)); }, [questionCount]);
  useEffect(() => { localStorage.setItem('tools.quiz.pack', modePack); }, [modePack]);
  useEffect(() => { localStorage.setItem('tools.quiz.difficulty', difficultyProfile); }, [difficultyProfile]);

  const handleRestart = () => {
    setGeneratedQuiz(null);
    setCurrentView('setup');
    if (isAssignmentContext) {
      if (classId) router.push(`/class/${classId}`);
      else router.push('/classes');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h3 className="text-lg font-normal mt-3">Generating Quiz</h3>
          <p className="text-xs text-muted-foreground">Working on it...</p>
        </div>
      </div>
    );
  }

  if (generatedQuiz && currentView === 'take') {
    return <QuizTaker quiz={generatedQuiz} mode={quizMode} sourceText={sourceText} onRestart={handleRestart} />;
  }
  if (currentView === 'duel') {
    return <QuizDuel sourceText={sourceText} onRestart={handleRestart} />;
  }

  const modeOptions = [
    { value: 'practice', label: 'Practice' },
    { value: 'normal', label: 'Normal' },
    { value: 'exam', label: 'Exam' },
    { value: 'survival', label: 'Survival' },
    { value: 'speedrun', label: 'Speedrun' },
    { value: 'adaptive', label: 'Adaptive' },
    { value: 'boss-fight', label: 'Boss Fight' },
    { value: 'duel', label: 'Duel' },
  ];

  const packOptions = [
    { value: 'practice', label: 'Practice' },
    { value: 'exam', label: 'Exam' },
    { value: 'adaptive', label: 'Adaptive' },
  ];

  const difficultyOptions = [
    { value: 'balanced', label: 'Balanced' },
    { value: 'ramp', label: 'Ramp' },
    { value: 'hard', label: 'Hard' },
  ];

  const sidebar = (
    <>
      <PillSelector
        label="Pack"
        options={packOptions}
        value={modePack}
        onChange={(v) => {
          const next = v as 'practice' | 'exam' | 'adaptive';
          setModePack(next);
          if (next === 'adaptive') setQuizMode('adaptive');
          if (next === 'exam') setQuizMode('exam');
          if (next === 'practice') setQuizMode('practice');
        }}
        disabled={isLoading}
      />

      <PillSelector
        label="Mode"
        options={modeOptions}
        value={quizMode}
        onChange={(v) => setQuizMode(v as QuizMode)}
        disabled={isLoading}
      />

      <PillSelector
        label="Difficulty"
        options={difficultyOptions}
        value={difficultyProfile}
        onChange={(v) => setDifficultyProfile(v as 'balanced' | 'ramp' | 'hard')}
        disabled={isLoading}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Questions</p>
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

      <Button
        onClick={() => handleGenerate(sourceText)}
        disabled={isLoading || !sourceText.trim()}
        className="w-full rounded-full"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Generate Quiz
      </Button>
    </>
  );

  return (
    <WorkbenchShell
      title={isAssignmentContext ? 'Create Quiz' : 'Quiz'}
      sidebar={sidebar}
    >
      <SourceInput
        value={sourceText}
        onChange={setSourceText}
        onSubmit={() => handleGenerate(sourceText)}
        placeholder="Paste or type your source material..."
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
