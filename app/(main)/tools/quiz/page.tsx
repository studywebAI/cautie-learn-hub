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
import { PresetManager } from '@/components/tools/preset-manager';
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
  const language = appContext?.language ?? 'en';

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
          input: { sourceText: text, questionCount: count, language, difficultyProfile, modePack, questionType, feedbackStyle },
          computeClass: count > 20 ? 'heavy' : 'standard',
        });
        const response = run?.output_payload || run;
        setGeneratedQuiz(response as Quiz);
        setCurrentView('take');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({ variant: 'destructive', title: 'Quiz generation failed', description: (error as any)?.message || 'Unable to generate quiz' });
      setCurrentView('setup');
    } finally {
      setIsLoading(false);
    }
  }, [quizMode, questionCount, language, difficultyProfile, modePack, questionType, feedbackStyle]);

  useEffect(() => {
    if (sourceTextFromParams && !isAssignmentContext) handleGenerate(sourceTextFromParams);
  }, [sourceTextFromParams, handleGenerate]);

  useEffect(() => {
    const s = (k: string) => localStorage.getItem(`tools.quiz.${k}`);
    if (s('mode')) setQuizMode(s('mode') as QuizMode);
    if (s('count') && !Number.isNaN(Number(s('count')))) setQuestionCount(Number(s('count')));
    if (s('pack')) setModePack(s('pack')!);
    if (s('difficulty')) setDifficultyProfile(s('difficulty')!);
    if (s('questionType')) setQuestionType(s('questionType')!);
    if (s('feedbackStyle')) setFeedbackStyle(s('feedbackStyle')!);
  }, []);

  useEffect(() => { localStorage.setItem('tools.quiz.mode', quizMode); }, [quizMode]);
  useEffect(() => { localStorage.setItem('tools.quiz.count', String(questionCount)); }, [questionCount]);
  useEffect(() => { localStorage.setItem('tools.quiz.pack', modePack); }, [modePack]);
  useEffect(() => { localStorage.setItem('tools.quiz.difficulty', difficultyProfile); }, [difficultyProfile]);
  useEffect(() => { localStorage.setItem('tools.quiz.questionType', questionType); }, [questionType]);
  useEffect(() => { localStorage.setItem('tools.quiz.feedbackStyle', feedbackStyle); }, [feedbackStyle]);

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
    { value: 'practice', label: 'Practice', description: 'Relaxed mode with hints and explanations after each question' },
    { value: 'normal', label: 'Normal', description: 'Standard quiz with score at the end' },
    { value: 'exam', label: 'Exam', description: 'Strict timed exam — no going back, no hints' },
    { value: 'survival', label: 'Survival', description: 'Endless questions until you get one wrong' },
    { value: 'speedrun', label: 'Speedrun', description: 'Answer as many as possible in a time limit' },
    { value: 'adaptive', label: 'Adaptive', description: 'Difficulty adjusts based on your performance' },
    { value: 'boss-fight', label: 'Boss Fight', description: 'One extremely hard multi-part question' },
    { value: 'duel', label: 'Duel', description: 'Compete head-to-head against an AI opponent' },
    { value: 'blitz', label: 'Blitz', description: '5-second timer per question, pure speed' },
    { value: 'reverse', label: 'Reverse', description: 'Given the answer, figure out the question' },
    { value: 'elimination', label: 'Elimination', description: 'Wrong answers remove options until only correct remains' },
  ];

  const packOptions = [
    { value: 'practice', label: 'Practice', description: 'Lighter questions focused on understanding concepts' },
    { value: 'exam', label: 'Exam', description: 'Rigorous questions matching real exam difficulty' },
    { value: 'adaptive', label: 'Adaptive', description: 'Mix of difficulties that adapts to your level' },
    { value: 'deep-dive', label: 'Deep Dive', description: 'Focuses on edge cases, exceptions, and nuance' },
    { value: 'rapid-review', label: 'Rapid Review', description: 'Quick-fire questions covering broad surface area' },
    { value: 'application', label: 'Application', description: 'Scenario-based questions testing real-world usage' },
  ];

  const difficultyOptions = [
    { value: 'balanced', label: 'Balanced', description: 'Even mix of easy, medium, and hard questions' },
    { value: 'ramp', label: 'Ramp', description: 'Starts easy and gradually gets harder' },
    { value: 'hard', label: 'Hard', description: 'All questions are challenging from the start' },
    { value: 'easy', label: 'Easy', description: 'Beginner-friendly questions for building confidence' },
    { value: 'random', label: 'Random', description: 'Completely random difficulty distribution' },
    { value: 'inverted', label: 'Inverted', description: 'Starts hard and gets easier — reverse ramp' },
  ];

  const questionTypeOptions = [
    { value: 'mixed', label: 'Mixed', description: 'Combination of all question types' },
    { value: 'multiple-choice', label: 'Multiple Choice', description: 'Pick the correct answer from options' },
    { value: 'true-false', label: 'True/False', description: 'Simple true or false statements' },
    { value: 'fill-blank', label: 'Fill in Blank', description: 'Complete the missing word or phrase' },
    { value: 'short-answer', label: 'Short Answer', description: 'Write a brief response in your own words' },
    { value: 'matching', label: 'Matching', description: 'Match items from two columns together' },
    { value: 'ordering', label: 'Ordering', description: 'Put items in the correct sequence' },
  ];

  const feedbackOptions = [
    { value: 'immediate', label: 'Immediate', description: 'See if you\'re right or wrong after each question' },
    { value: 'end', label: 'At End', description: 'Review all answers together when the quiz is done' },
    { value: 'detailed', label: 'Detailed', description: 'Full explanation with source references after each question' },
    { value: 'minimal', label: 'Minimal', description: 'Just correct/incorrect, no explanations' },
    { value: 'none', label: 'None', description: 'No feedback at all — score only' },
  ];

  const currentSettings = { quizMode, modePack, difficultyProfile, questionCount, questionType, feedbackStyle };

  const sidebar = (
    <>
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
        }}
      />

      <PillSelector label="Pack" options={packOptions} value={modePack}
        onChange={(v) => { setModePack(v); if (v === 'adaptive') setQuizMode('adaptive'); if (v === 'exam') setQuizMode('exam'); if (v === 'practice') setQuizMode('practice'); }}
        disabled={isLoading} />

      <PillSelector label="Mode" options={modeOptions} value={quizMode} onChange={(v) => setQuizMode(v as QuizMode)} disabled={isLoading} />

      <PillSelector label="Difficulty" options={difficultyOptions} value={difficultyProfile} onChange={setDifficultyProfile} disabled={isLoading} />

      <PillSelector label="Question Type" options={questionTypeOptions} value={questionType} onChange={setQuestionType} disabled={isLoading} />

      <PillSelector label="Feedback" options={feedbackOptions} value={feedbackStyle} onChange={setFeedbackStyle} disabled={isLoading} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Questions</p>
          <span className="text-xs font-mono tabular-nums">{questionCount}</span>
        </div>
        <Slider value={[questionCount]} onValueChange={([v]) => setQuestionCount(v)} min={1} max={50} step={1} disabled={isLoading} />
      </div>

      <Button onClick={() => handleGenerate(sourceText)} disabled={isLoading || !sourceText.trim()} className="w-full rounded-full">
        <Sparkles className="mr-2 h-4 w-4" />
        Generate Quiz
      </Button>
    </>
  );

  return (
    <WorkbenchShell title={isAssignmentContext ? 'Create Quiz' : 'Quiz'} sidebar={sidebar}>
      <SourceInput value={sourceText} onChange={setSourceText} onSubmit={() => handleGenerate(sourceText)} placeholder="Paste or type your source material..." />
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
