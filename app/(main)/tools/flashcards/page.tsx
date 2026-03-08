'use client';

import React, { useState, useEffect, Suspense, useContext, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { FlashcardViewer, StudyMode } from '@/components/tools/flashcard-viewer';
import { AppContext } from '@/contexts/app-context';
import type { Flashcard } from '@/lib/types';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArtifactCollabPanel } from '@/components/tools/artifact-collab-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';


function FlashcardsPageContent() {
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
  const [generatedCards, setGeneratedCards] = useState<Flashcard[] | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>('flip');
  const [modePack, setModePack] = useState<'core' | 'retention' | 'exam'>('core');
  const [retentionProfile, setRetentionProfile] = useState<'balanced' | 'aggressive' | 'exam-cram'>('balanced');
  const [flashcardCount, setFlashcardCount] = useState(10);
  const [currentView, setCurrentView] = useState<'setup' | 'study'>('setup');

  const [history, setHistory] = useState<any[]>([]);
  const [plan, setPlan] = useState<string>('free');
  const [latestArtifactId, setLatestArtifactId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = useCallback(async (text: string) => {
    if (!text.trim()) {
      return;
    }
    setIsLoading(true);
    setGeneratedCards(null);
    try {
      const run = await runToolFlowV2({
        toolId: 'flashcards',
        flowName: 'generateFlashcards',
        mode: studyMode,
        artifactType: 'flashcards',
        artifactTitle: 'Generated Flashcards',
        input: { sourceText: text, count: flashcardCount, language, modePack, retentionProfile },
        computeClass: flashcardCount > 20 ? 'heavy' : 'standard',
      });
      const response = run?.output_payload || run;
      setGeneratedCards(response.flashcards);
      setLatestArtifactId(run?.output_artifact_id || null);
      setCurrentView('study');
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast({
        variant: 'destructive',
        title: 'Flashcard generation failed',
        description: (error as any)?.message || 'Unable to generate flashcards from provided source text',
      });
      setCurrentView('setup');
    } finally {
      setIsLoading(false);
    }
  }, [flashcardCount, language, studyMode, modePack, retentionProfile]);

  useEffect(() => {
    if (sourceTextFromParams && !isAssignmentContext) {
      handleGenerate(sourceTextFromParams);
    }
  }, [sourceTextFromParams, handleGenerate]);

  useEffect(() => {
    const savedMode = localStorage.getItem('tools.flashcards.mode');
    const savedCount = localStorage.getItem('tools.flashcards.count');
    const savedPack = localStorage.getItem('tools.flashcards.pack');
    const savedRetention = localStorage.getItem('tools.flashcards.retention');
    if (savedMode) setStudyMode(savedMode as StudyMode);
    if (savedCount && !Number.isNaN(Number(savedCount))) setFlashcardCount(Number(savedCount));
    if (savedPack === 'core' || savedPack === 'retention' || savedPack === 'exam') {
      setModePack(savedPack);
    }
    if (savedRetention === 'balanced' || savedRetention === 'aggressive' || savedRetention === 'exam-cram') {
      setRetentionProfile(savedRetention);
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
        setHistory((runs || []).filter((r: any) => r.tool_id === 'flashcards').slice(0, 8));
      }
    };
    loadMeta();
  }, []);

  useEffect(() => {
    localStorage.setItem('tools.flashcards.mode', studyMode);
  }, [studyMode]);

  useEffect(() => {
    localStorage.setItem('tools.flashcards.count', String(flashcardCount));
  }, [flashcardCount]);

  useEffect(() => {
    localStorage.setItem('tools.flashcards.pack', modePack);
  }, [modePack]);

  useEffect(() => {
    localStorage.setItem('tools.flashcards.retention', retentionProfile);
  }, [retentionProfile]);


  const handleFormSubmit = () => {
      handleGenerate(sourceText);
  }

  const handleRestart = () => {
    setGeneratedCards(null);
    setCurrentView('setup');
     if (isAssignmentContext) {
        if (classId) {
            router.push(`/class/${classId}`);
        } else {
            router.push('/classes');
        }
    }
  };

  const studyModeOptions = ['flip', 'type', 'multiple-choice'];

  if (isLoading) {
     return (
       <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
        <div className="flex flex-col items-center gap-2 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h3 className="text-2xl font-bold tracking-tight mt-4">
                Generating Your Flashcards
            </h3>
            <p className="text-sm text-muted-foreground">
                The AI is analyzing the text. Please wait a moment...
            </p>
        </div>
      </div>
    )
  }

  if (generatedCards && currentView === 'study') {
    return <FlashcardViewer cards={generatedCards} mode={studyMode} onRestart={handleRestart} />;
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
        placeholder="Paste material to generate flashcards..."
        className="min-h-[74vh] text-sm"
      />
      <p className="text-xs text-muted-foreground">Use Ctrl/Cmd + Enter to generate.</p>
    </div>
  );

  const centerPanel = (
    <div className="space-y-3 pt-1">
      {generatedCards && (
        <div className="space-y-2">
          {generatedCards.slice(0, 6).map((card) => (
            <div key={card.id} className="rounded-md border p-3">
              <p className="text-sm font-medium">{card.front}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.back}</p>
            </div>
          ))}
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
            const next = v as 'core' | 'retention' | 'exam';
            setModePack(next);
            if (next === 'retention') setStudyMode('multiple-choice');
            if (next === 'core') setStudyMode('flip');
            if (next === 'exam') setStudyMode('type');
          }}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="core">Core</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
            <TabsTrigger value="exam">Exam</TabsTrigger>
          </TabsList>
        </Tabs>
        <select
          value={studyMode}
          onChange={(e) => setStudyMode(e.target.value as StudyMode)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {studyModeOptions.map((mode) => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
        <Tabs value={retentionProfile} onValueChange={(v) => setRetentionProfile(v as 'balanced' | 'aggressive' | 'exam-cram')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="balanced">Balanced</TabsTrigger>
            <TabsTrigger value="aggressive">Aggressive</TabsTrigger>
            <TabsTrigger value="exam-cram">Exam-Cram</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="space-y-2">
        <Label>Cards</Label>
        <input
          type="number"
          min={1}
          max={100}
          value={flashcardCount}
          onChange={(e) => setFlashcardCount(parseInt(e.target.value) || 1)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      <Button onClick={handleFormSubmit} disabled={isLoading || !sourceText.trim()} className="w-full">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Generate Flashcards
      </Button>

      <ArtifactCollabPanel
        latestArtifactId={latestArtifactId}
        isLoading={isLoading}
        plan={plan}
        history={history}
        transformActions={[
          {
            label: 'Transform to Quiz',
            successMessage: 'Quiz artifact created',
            request: {
              targetToolId: 'quiz',
              targetFlowName: 'generateQuiz',
              transformInput: { sourceText, questionCount: 10 },
              title: 'Quiz from Flashcards',
            },
          },
          {
            label: 'Transform to Notes',
            successMessage: 'Notes artifact created',
            request: {
              targetToolId: 'notes',
              targetFlowName: 'generateNotes',
              transformInput: { sourceText, style: 'structured', length: 'medium' },
              title: 'Notes from Flashcards',
            },
          },
        ]}
      />
    </div>
  );

  return (
    <WorkbenchShell
      title={isAssignmentContext ? 'Create New Flashcard Set' : 'Flashcards Studio'}
      description={isAssignmentContext ? 'Create flashcards for assignment context.' : 'Generate, preview, and study flashcards in a unified workbench.'}
      plan={plan}
      left={leftPanel}
      center={centerPanel}
      right={rightPanel}
    />
  );
}

export default function FlashcardsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <FlashcardsPageContent />
        </Suspense>
    )
}
