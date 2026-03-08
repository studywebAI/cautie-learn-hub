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
import { Label } from '@/components/ui/label';
import { SourceInput } from '@/components/tools/source-input';
import { ArtifactCollabPanel } from '@/components/tools/artifact-collab-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  const [history, setHistory] = useState<any[]>([]);
  const [plan, setPlan] = useState<string>('free');
  const [latestArtifactId, setLatestArtifactId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = useCallback(async (text: string) => {
    if (!text.trim()) {
      return;
    }
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
        setLatestArtifactId(run?.output_artifact_id || null);
        setCurrentView('take');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        variant: 'destructive',
        title: 'Quiz generation failed',
        description: (error as any)?.message || 'Unable to generate quiz from provided source text',
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
    if (savedPack === 'practice' || savedPack === 'exam' || savedPack === 'adaptive') {
      setModePack(savedPack);
    }
    if (savedDifficulty === 'balanced' || savedDifficulty === 'ramp' || savedDifficulty === 'hard') {
      setDifficultyProfile(savedDifficulty);
    }

    const loadMeta = async () => {
      const [usageRes, runsRes] = await Promise.all([
        fetch('/api/billing/v1/usage-summary'),
        fetch('/api/tools/v2/runs'),
      ]);
      if (usageRes.ok) {
        const usage = await usageRes.json();
        setPlan(usage.plan || 'free');
      }
      if (runsRes.ok) {
        const runs = await runsRes.json();
        setHistory((runs || []).filter((r: any) => r.tool_id === 'quiz').slice(0, 8));
      }
    };
    loadMeta();
  }, []);

  useEffect(() => {
    localStorage.setItem('tools.quiz.mode', quizMode);
  }, [quizMode]);

  useEffect(() => {
    localStorage.setItem('tools.quiz.count', String(questionCount));
  }, [questionCount]);

  useEffect(() => {
    localStorage.setItem('tools.quiz.pack', modePack);
  }, [modePack]);

  useEffect(() => {
    localStorage.setItem('tools.quiz.difficulty', difficultyProfile);
  }, [difficultyProfile]);


  const handleFormSubmit = () => {
    handleGenerate(sourceText);
  }

  const handleRestart = () => {
    setGeneratedQuiz(null);
    setCurrentView('setup');
    if (isAssignmentContext) {
        if (classId) {
            router.push(`/class/${classId}`);
        } else {
            router.push('/classes');
        }
    }
  }

  const quizModeOptions = ['practice', 'normal', 'exam', 'survival', 'speedrun', 'adaptive', 'boss-fight', 'duel'];

  if (isLoading) {
     return (
       <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
        <div className="flex flex-col items-center gap-2 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h3 className="text-2xl font-bold tracking-tight mt-4">
                Generating Your Quiz
            </h3>
            <p className="text-sm text-muted-foreground">
                The AI is working its magic. Please wait a moment...
            </p>
        </div>
      </div>
    )
  }

  if (generatedQuiz && currentView === 'take') {
    return <QuizTaker quiz={generatedQuiz} mode={quizMode} sourceText={sourceText} onRestart={handleRestart} />;
  }
  if (currentView === 'duel') {
    return <QuizDuel sourceText={sourceText} onRestart={handleRestart} />
  }

  const leftPanel = (
    <div className="space-y-3 pt-1">
      <Label>Source Text</Label>
      <Textarea
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleGenerate(sourceText);
          }
        }}
        placeholder="Paste material to generate quiz questions..."
        className="min-h-[74vh] text-sm"
      />
      <p className="text-xs text-muted-foreground">Use Ctrl/Cmd + Enter to generate.</p>
    </div>
  );

  const centerPanel = (
    <div className="space-y-3 pt-1">
      {generatedQuiz && (
        <div className="space-y-2">
          <h3 className="font-semibold">{generatedQuiz.title}</h3>
          <p className="text-sm text-muted-foreground">{generatedQuiz.description}</p>
          <div className="space-y-2">
            {generatedQuiz.questions.slice(0, 5).map((q, idx) => (
              <div key={q.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{idx + 1}. {q.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const rightPanel = (
    <div className="space-y-4 pt-1">
      <div className="space-y-3">
        <Tabs
          value={modePack}
          onValueChange={(v) => {
            const next = v as 'practice' | 'exam' | 'adaptive';
            setModePack(next);
            if (next === 'adaptive') setQuizMode('adaptive');
            if (next === 'exam') setQuizMode('exam');
            if (next === 'practice') setQuizMode('practice');
          }}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="practice">Practice</TabsTrigger>
            <TabsTrigger value="exam">Exam</TabsTrigger>
            <TabsTrigger value="adaptive">Adaptive</TabsTrigger>
          </TabsList>
        </Tabs>
        <select
          value={quizMode}
          onChange={(e) => setQuizMode(e.target.value as QuizMode)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {quizModeOptions.map((mode) => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
        <Tabs value={difficultyProfile} onValueChange={(v) => setDifficultyProfile(v as 'balanced' | 'ramp' | 'hard')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="balanced">Balanced</TabsTrigger>
            <TabsTrigger value="ramp">Ramp</TabsTrigger>
            <TabsTrigger value="hard">Hard</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="space-y-2">
        <Label>Questions</Label>
        <input
          type="number"
          min={1}
          max={100}
          value={questionCount}
          onChange={(e) => setQuestionCount(parseInt(e.target.value) || 1)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      <Button onClick={handleFormSubmit} disabled={isLoading || !sourceText.trim()} className="w-full">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Generate Quiz
      </Button>

      <ArtifactCollabPanel
        latestArtifactId={latestArtifactId}
        isLoading={isLoading}
        plan={plan}
        history={history}
        transformActions={[
          {
            label: 'Transform to Flashcards',
            successMessage: 'Flashcards artifact created',
            request: {
              targetToolId: 'flashcards',
              targetFlowName: 'generateFlashcards',
              transformInput: { sourceText, count: 12 },
              title: 'Flashcards from Quiz',
            },
          },
          {
            label: 'Transform to Notes',
            successMessage: 'Notes artifact created',
            request: {
              targetToolId: 'notes',
              targetFlowName: 'generateNotes',
              transformInput: { sourceText, style: 'structured', length: 'medium' },
              title: 'Notes from Quiz',
            },
          },
        ]}
      />
    </div>
  );

  return (
    <WorkbenchShell
      title={isAssignmentContext ? 'Create New Quiz' : 'Quiz Studio'}
      description={isAssignmentContext ? 'Create quiz content to attach to an assignment.' : 'Generate, review, and run quizzes in a unified workbench.'}
      plan={plan}
      left={leftPanel}
      center={centerPanel}
      right={rightPanel}
    />
  );
}

export default function QuizPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <QuizPageContent />
        </Suspense>
    )
}
