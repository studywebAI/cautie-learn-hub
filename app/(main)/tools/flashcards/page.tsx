'use client';

import React, { useState, useEffect, Suspense, useContext, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { FlashcardViewer, StudyMode } from '@/components/tools/flashcard-viewer';
import { AppContext } from '@/contexts/app-context';
import type { Flashcard } from '@/lib/types';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { SourceInput } from '@/components/tools/source-input';
import { PillSelector } from '@/components/tools/pill-selector';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

function FlashcardsPageContent() {
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
  const [generatedCards, setGeneratedCards] = useState<Flashcard[] | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>('flip');
  const [modePack, setModePack] = useState<'core' | 'retention' | 'exam'>('core');
  const [retentionProfile, setRetentionProfile] = useState<'balanced' | 'aggressive' | 'exam-cram'>('balanced');
  const [flashcardCount, setFlashcardCount] = useState(10);
  const [currentView, setCurrentView] = useState<'setup' | 'study'>('setup');
  const { toast } = useToast();

  const handleGenerate = useCallback(async (text: string) => {
    if (!text.trim()) return;
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
      setCurrentView('study');
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast({
        variant: 'destructive',
        title: 'Flashcard generation failed',
        description: (error as any)?.message || 'Unable to generate flashcards',
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
    if (savedPack === 'core' || savedPack === 'retention' || savedPack === 'exam') setModePack(savedPack);
    if (savedRetention === 'balanced' || savedRetention === 'aggressive' || savedRetention === 'exam-cram') setRetentionProfile(savedRetention);
  }, []);

  useEffect(() => { localStorage.setItem('tools.flashcards.mode', studyMode); }, [studyMode]);
  useEffect(() => { localStorage.setItem('tools.flashcards.count', String(flashcardCount)); }, [flashcardCount]);
  useEffect(() => { localStorage.setItem('tools.flashcards.pack', modePack); }, [modePack]);
  useEffect(() => { localStorage.setItem('tools.flashcards.retention', retentionProfile); }, [retentionProfile]);

  const handleRestart = () => {
    setGeneratedCards(null);
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
          <h3 className="text-lg font-normal mt-3">Generating Flashcards</h3>
          <p className="text-xs text-muted-foreground">Working on it...</p>
        </div>
      </div>
    );
  }

  if (generatedCards && currentView === 'study') {
    return <FlashcardViewer cards={generatedCards} mode={studyMode} onRestart={handleRestart} />;
  }

  const studyModeOptions = [
    { value: 'flip', label: 'Flip' },
    { value: 'type', label: 'Type' },
    { value: 'multiple-choice', label: 'Multiple Choice' },
  ];

  const packOptions = [
    { value: 'core', label: 'Core' },
    { value: 'retention', label: 'Retention' },
    { value: 'exam', label: 'Exam' },
  ];

  const retentionOptions = [
    { value: 'balanced', label: 'Balanced' },
    { value: 'aggressive', label: 'Aggressive' },
    { value: 'exam-cram', label: 'Exam-Cram' },
  ];

  const sidebar = (
    <>
      <PillSelector
        label="Pack"
        options={packOptions}
        value={modePack}
        onChange={(v) => {
          const next = v as 'core' | 'retention' | 'exam';
          setModePack(next);
          if (next === 'retention') setStudyMode('multiple-choice');
          if (next === 'core') setStudyMode('flip');
          if (next === 'exam') setStudyMode('type');
        }}
        disabled={isLoading}
      />

      <PillSelector
        label="Study Mode"
        options={studyModeOptions}
        value={studyMode}
        onChange={(v) => setStudyMode(v as StudyMode)}
        disabled={isLoading}
      />

      <PillSelector
        label="Retention"
        options={retentionOptions}
        value={retentionProfile}
        onChange={(v) => setRetentionProfile(v as 'balanced' | 'aggressive' | 'exam-cram')}
        disabled={isLoading}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Cards</p>
          <span className="text-xs font-mono tabular-nums">{flashcardCount}</span>
        </div>
        <Slider
          value={[flashcardCount]}
          onValueChange={([v]) => setFlashcardCount(v)}
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
        Generate Flashcards
      </Button>
    </>
  );

  return (
    <WorkbenchShell
      title={isAssignmentContext ? 'Create Flashcards' : 'Flashcards'}
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

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <FlashcardsPageContent />
    </Suspense>
  );
}
