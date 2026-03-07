'use client';

import React, { useState, useEffect, Suspense, useCallback, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

type ArtifactVersion = {
  id: string;
  version_number: number;
  content: any;
  created_at: string;
};

type CollabComment = {
  id: string;
  content: string;
  created_at: string;
};

type Suggestion = {
  id: string;
  note: string | null;
  status: string;
  created_at: string;
};


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
  const [questionCount, setQuestionCount] = useState(7);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentView, setCurrentView] = useState<'setup' | 'edit' | 'take' | 'duel'>('setup');

  const [history, setHistory] = useState<any[]>([]);
  const [plan, setPlan] = useState<string>('free');
  const [latestArtifactId, setLatestArtifactId] = useState<string | null>(null);
  const [artifactVersions, setArtifactVersions] = useState<ArtifactVersion[]>([]);
  const [comments, setComments] = useState<CollabComment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionDraft, setSuggestionDraft] = useState('');
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
  }, [quizMode, questionCount, isEditMode, language]);

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

  useEffect(() => {
    const loadArtifactData = async () => {
      if (!latestArtifactId) {
        setArtifactVersions([]);
        setComments([]);
        setSuggestions([]);
        return;
      }
      const [historyRes, commentsRes, suggestionsRes] = await Promise.all([
        fetch(`/api/tools/v2/artifacts/${latestArtifactId}/history`),
        fetch(`/api/collab/v1/comments?artifactId=${latestArtifactId}`),
        fetch(`/api/collab/v1/suggestions?artifactId=${latestArtifactId}`),
      ]);

      if (historyRes.ok) {
        const data = await historyRes.json();
        setArtifactVersions(data.versions || []);
      }
      if (commentsRes.ok) {
        setComments(await commentsRes.json());
      }
      if (suggestionsRes.ok) {
        setSuggestions(await suggestionsRes.json());
      }
    };
    loadArtifactData();
  }, [latestArtifactId]);

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

      <Tabs defaultValue="actions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={!latestArtifactId || isLoading}
            onClick={async () => {
              if (!latestArtifactId) return;
              try {
                const res = await fetch(`/api/tools/v2/artifacts/${latestArtifactId}/transform`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    targetToolId: 'flashcards',
                    targetFlowName: 'generateFlashcards',
                    transformInput: { sourceText, count: 12 },
                    title: 'Flashcards from Quiz',
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Transform failed');
                toast({ title: 'Flashcards artifact created' });
              } catch (error: any) {
                toast({ variant: 'destructive', title: 'Transform failed', description: error?.message || 'Unable to transform artifact' });
              }
            }}
          >
            Transform to Flashcards
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={!latestArtifactId || isLoading}
            onClick={async () => {
              if (!latestArtifactId) return;
              try {
                const res = await fetch(`/api/tools/v2/artifacts/${latestArtifactId}/transform`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    targetToolId: 'notes',
                    targetFlowName: 'generateNotes',
                    transformInput: { sourceText, style: 'structured', length: 'medium' },
                    title: 'Notes from Quiz',
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Transform failed');
                toast({ title: 'Notes artifact created' });
              } catch (error: any) {
                toast({ variant: 'destructive', title: 'Transform failed', description: error?.message || 'Unable to transform artifact' });
              }
            }}
          >
            Transform to Notes
          </Button>
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {artifactVersions.length === 0 && <p className="text-xs text-muted-foreground">No artifact versions yet.</p>}
          {artifactVersions.map((version) => (
            <div key={version.id} className="rounded-md border p-2">
              <p className="text-xs font-medium">Version {version.version_number}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(version.created_at).toLocaleString()}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="comments" className="space-y-2">
          <Textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="Add collaboration comment..."
            className="min-h-[90px]"
          />
          <Button
            className="w-full"
            disabled={!latestArtifactId || !commentDraft.trim()}
            onClick={async () => {
              if (!latestArtifactId || !commentDraft.trim()) return;
              try {
                const res = await fetch('/api/collab/v1/comments', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    artifactId: latestArtifactId,
                    content: commentDraft.trim(),
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Comment failed');
                setCommentDraft('');
                const commentsRes = await fetch(`/api/collab/v1/comments?artifactId=${latestArtifactId}`);
                if (commentsRes.ok) setComments(await commentsRes.json());
              } catch (error: any) {
                toast({ variant: 'destructive', title: 'Comment failed', description: error?.message || 'Unable to add comment' });
              }
            }}
          >
            Add Comment
          </Button>
          {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-md border p-2">
              <p className="text-xs">{comment.content}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{new Date(comment.created_at).toLocaleString()}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-2">
          <Textarea
            value={suggestionDraft}
            onChange={(e) => setSuggestionDraft(e.target.value)}
            placeholder="Propose an improvement suggestion..."
            className="min-h-[90px]"
          />
          <Button
            className="w-full"
            disabled={!latestArtifactId || !suggestionDraft.trim()}
            onClick={async () => {
              if (!latestArtifactId || !suggestionDraft.trim()) return;
              try {
                const res = await fetch('/api/collab/v1/suggestions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    artifactId: latestArtifactId,
                    patch: { summary: suggestionDraft.trim() },
                    note: suggestionDraft.trim(),
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Suggestion failed');
                setSuggestionDraft('');
                const suggestionsRes = await fetch(`/api/collab/v1/suggestions?artifactId=${latestArtifactId}`);
                if (suggestionsRes.ok) setSuggestions(await suggestionsRes.json());
              } catch (error: any) {
                toast({ variant: 'destructive', title: 'Suggestion failed', description: error?.message || 'Unable to create suggestion' });
              }
            }}
          >
            Create Suggestion
          </Button>
          {suggestions.length === 0 && <p className="text-xs text-muted-foreground">No suggestions yet.</p>}
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-md border p-2">
              <p className="text-xs">{suggestion.note || 'No note'}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">{new Date(suggestion.created_at).toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{suggestion.status}</Badge>
                  {suggestion.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/collab/v1/suggestions/${suggestion.id}/apply`, { method: 'POST' });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data?.error || 'Apply failed');
                          const suggestionsRes = await fetch(`/api/collab/v1/suggestions?artifactId=${latestArtifactId}`);
                          if (suggestionsRes.ok) setSuggestions(await suggestionsRes.json());
                          toast({ title: 'Suggestion applied' });
                        } catch (error: any) {
                          toast({ variant: 'destructive', title: 'Apply failed', description: error?.message || 'Unable to apply suggestion' });
                        }
                      }}
                    >
                      Apply
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

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
