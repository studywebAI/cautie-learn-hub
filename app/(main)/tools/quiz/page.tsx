'use client';

import React, { useState, useEffect, Suspense, useCallback, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Swords, BookCheck, Shield, Sparkles } from 'lucide-react';
import { QuizTaker, QuizMode } from '@/components/tools/quiz-taker';
import { AppContext } from '@/contexts/app-context';

import type { Quiz } from '@/lib/types';
import { QuizDuel } from '@/components/tools/quiz-duel';
import { QuizEditor } from '@/components/tools/quiz-editor';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';


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
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');
  const [questionCount, setQuestionCount] = useState(7);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentView, setCurrentView] = useState<'setup' | 'edit' | 'take' | 'duel'>('setup');

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'file' | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [plan, setPlan] = useState<string>('free');
  const [latestArtifactId, setLatestArtifactId] = useState<string | null>(null);

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
          input: { sourceText: text, questionCount: count, language },
          computeClass: count > 20 ? 'heavy' : 'standard',
        });
        const response = run?.output_payload || run;
        setGeneratedQuiz(response as Quiz);
        setLatestArtifactId(run?.output_artifact_id || null);
        if (isEditMode) {
          setCurrentView('edit');
        } else {
          setCurrentView('take');
        }
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      setCurrentView('setup');
    } finally {
      setIsLoading(false);
    }
  }, [quizMode, questionCount, isEditMode]);

  useEffect(() => {
    if (sourceTextFromParams && !isAssignmentContext) {
      handleGenerate(sourceTextFromParams);
    }
  }, [sourceTextFromParams, handleGenerate]);

  useEffect(() => {
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

  // Add to recents when quiz is generated
  useEffect(() => {
    if (generatedQuiz && !isAssignmentContext) {
      const title = uploadedFile
        ? `${uploadedFile.name.split('.')[0]} Quiz`
        : `Quiz from "${sourceText.slice(0, 30)}${sourceText.length > 30 ? '...' : ''}"`;

      if ((window as any).recentsManager) {
        (window as any).recentsManager.addRecent({
          title,
          type: 'quiz'
        });
      }
    }
  }, [generatedQuiz, uploadedFile, sourceText, isAssignmentContext]);

  const handleFormSubmit = () => {
    handleGenerate(sourceText);
  }

  const handleStartQuiz = (finalQuiz: Quiz) => {
    setGeneratedQuiz(finalQuiz);
    setCurrentView('take');
  }

  const handleCreateForAssignment = (finalQuiz: Quiz) => {
    console.log("Creating quiz for assignment in class:", classId, finalQuiz);
    if (classId) {
        router.push(`/class/${classId}`);
    } else {
        router.push('/classes');
    }
  };

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

  if (generatedQuiz && currentView === 'edit') {
    return <QuizEditor quiz={generatedQuiz} sourceText={sourceText} onStartQuiz={handleStartQuiz} onBack={() => setCurrentView('setup')} isAssignmentContext={isAssignmentContext} onCreateForAssignment={handleCreateForAssignment} />;
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
        placeholder="Paste material to generate quiz questions..."
        className="min-h-[360px]"
      />
    </div>
  );

  const centerPanel = (
    <div className="space-y-3 pt-1">
      {!generatedQuiz && (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Quiz preview appears after generation.
        </div>
      )}
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
      <div className="space-y-2">
        <Label>Quiz Mode</Label>
        <select
          value={quizMode}
          onChange={(e) => setQuizMode(e.target.value as QuizMode)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {quizModeOptions.map((mode) => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
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
      <div className="space-y-2">
        <Label>Edit Mode</Label>
        <select
          value={isEditMode ? 'edit' : 'direct'}
          onChange={(e) => setIsEditMode(e.target.value === 'edit')}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="direct">Direct Start</option>
          <option value="edit">Review & Edit</option>
        </select>
      </div>
      <Button onClick={handleFormSubmit} disabled={isLoading || !sourceText.trim()} className="w-full">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Generate Quiz
      </Button>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Recent Runs</Label>
          <Badge variant="outline">{plan.toUpperCase()}</Badge>
        </div>
        {history.length === 0 && <p className="text-xs text-muted-foreground">No runs yet.</p>}
        {history.map((run: any) => (
          <div key={run.id} className="rounded-md border p-2">
            <p className="text-xs font-medium">{run.status}</p>
            <p className="text-[11px] text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
      {latestArtifactId && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push('/material')}
        >
          Open Saved Artifact
        </Button>
      )}
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
