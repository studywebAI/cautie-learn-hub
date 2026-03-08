'use client';

import React, { useState, useEffect, Suspense, useContext, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { Loader2, Sparkles } from 'lucide-react';
import { FlashcardViewer, StudyMode } from '@/components/tools/flashcard-viewer';
import { AppContext } from '@/contexts/app-context';
import type { Flashcard } from '@/lib/types';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { SourceInput } from '@/components/tools/source-input';
import { PillSelector } from '@/components/tools/pill-selector';
import { PresetManager } from '@/components/tools/preset-manager';
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
  const [modePack, setModePack] = useState('core');
  const [retentionProfile, setRetentionProfile] = useState('balanced');
  const [flashcardCount, setFlashcardCount] = useState(10);
  const [cardStyle, setCardStyle] = useState('standard');
  const [complexity, setComplexity] = useState('medium');
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
        input: { sourceText: text, count: flashcardCount, language, modePack, retentionProfile, cardStyle, complexity },
        computeClass: flashcardCount > 20 ? 'heavy' : 'standard',
      });
      const response = run?.output_payload || run;
      setGeneratedCards(response.flashcards);
      setCurrentView('study');
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast({ variant: 'destructive', title: 'Flashcard generation failed', description: (error as any)?.message || 'Unable to generate flashcards' });
      setCurrentView('setup');
    } finally {
      setIsLoading(false);
    }
  }, [flashcardCount, language, studyMode, modePack, retentionProfile, cardStyle, complexity]);

  useEffect(() => {
    if (sourceTextFromParams && !isAssignmentContext) handleGenerate(sourceTextFromParams);
  }, [sourceTextFromParams, handleGenerate]);

  useEffect(() => {
    const s = (k: string) => localStorage.getItem(`tools.flashcards.${k}`);
    if (s('mode')) setStudyMode(s('mode') as StudyMode);
    if (s('count') && !Number.isNaN(Number(s('count')))) setFlashcardCount(Number(s('count')));
    if (s('pack')) setModePack(s('pack')!);
    if (s('retention')) setRetentionProfile(s('retention')!);
    if (s('cardStyle')) setCardStyle(s('cardStyle')!);
    if (s('complexity')) setComplexity(s('complexity')!);
  }, []);

  useEffect(() => { localStorage.setItem('tools.flashcards.mode', studyMode); }, [studyMode]);
  useEffect(() => { localStorage.setItem('tools.flashcards.count', String(flashcardCount)); }, [flashcardCount]);
  useEffect(() => { localStorage.setItem('tools.flashcards.pack', modePack); }, [modePack]);
  useEffect(() => { localStorage.setItem('tools.flashcards.retention', retentionProfile); }, [retentionProfile]);
  useEffect(() => { localStorage.setItem('tools.flashcards.cardStyle', cardStyle); }, [cardStyle]);
  useEffect(() => { localStorage.setItem('tools.flashcards.complexity', complexity); }, [complexity]);

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
    { value: 'flip', label: 'Flip', description: 'Classic card flip — tap to reveal the answer' },
    { value: 'type', label: 'Type', description: 'Type your answer before revealing the correct one' },
    { value: 'multiple-choice', label: 'Multiple Choice', description: 'Choose the correct answer from options' },
    { value: 'write', label: 'Write', description: 'Write the full answer from memory, then compare' },
    { value: 'speak', label: 'Speak', description: 'Say the answer out loud, then check yourself' },
    { value: 'match', label: 'Match', description: 'Match terms to definitions in a timed game' },
    { value: 'scatter', label: 'Scatter', description: 'Drag terms onto their matching definitions' },
  ];

  const packOptions = [
    { value: 'core', label: 'Core', description: 'Essential terms and definitions from the material' },
    { value: 'retention', label: 'Retention', description: 'Spaced-repetition optimized for long-term memory' },
    { value: 'exam', label: 'Exam', description: 'Exam-style questions with tricky distractors' },
    { value: 'deep-dive', label: 'Deep Dive', description: 'Nuanced cards covering edge cases and details' },
    { value: 'quick-review', label: 'Quick Review', description: 'High-level overview cards for fast revision' },
    { value: 'application', label: 'Application', description: 'Apply concepts to real-world scenarios' },
    { value: 'connections', label: 'Connections', description: 'Cards linking related concepts across topics' },
  ];

  const retentionOptions = [
    { value: 'balanced', label: 'Balanced', description: 'Standard repetition schedule for steady learning' },
    { value: 'aggressive', label: 'Aggressive', description: 'More repetitions, faster intervals for quick mastery' },
    { value: 'exam-cram', label: 'Exam Cram', description: 'Intense short-term memorization before an exam' },
    { value: 'long-term', label: 'Long Term', description: 'Extended intervals optimized for months-long retention' },
    { value: 'weak-focus', label: 'Weak Focus', description: 'Prioritizes cards you keep getting wrong' },
  ];

  const cardStyleOptions = [
    { value: 'standard', label: 'Standard', description: 'Simple front/back question and answer format' },
    { value: 'cloze', label: 'Cloze', description: 'Fill-in-the-blank within a sentence or passage' },
    { value: 'image-occlusion', label: 'Image', description: 'Hide parts of diagrams or images to test recall' },
    { value: 'reversed', label: 'Reversed', description: 'Answer shown first — recall the question/term' },
    { value: 'context', label: 'Context', description: 'Includes surrounding context for better understanding' },
    { value: 'mnemonic', label: 'Mnemonic', description: 'Includes memory tricks and associations' },
  ];

  const complexityOptions = [
    { value: 'simple', label: 'Simple', description: 'Single facts and definitions' },
    { value: 'medium', label: 'Medium', description: 'Concepts requiring some explanation' },
    { value: 'complex', label: 'Complex', description: 'Multi-layered ideas with connections' },
    { value: 'expert', label: 'Expert', description: 'Advanced material with synthesis required' },
  ];

  const currentSettings = { studyMode, modePack, retentionProfile, flashcardCount, cardStyle, complexity };

  const sidebar = (
    <>
      <PresetManager
        toolId="flashcards"
        currentSettings={currentSettings}
        onLoadPreset={(s) => {
          if (s.studyMode) setStudyMode(s.studyMode);
          if (s.modePack) setModePack(s.modePack);
          if (s.retentionProfile) setRetentionProfile(s.retentionProfile);
          if (s.flashcardCount) setFlashcardCount(s.flashcardCount);
          if (s.cardStyle) setCardStyle(s.cardStyle);
          if (s.complexity) setComplexity(s.complexity);
        }}
      />

      <PillSelector label="Pack" options={packOptions} value={modePack}
        onChange={(v) => { setModePack(v); if (v === 'retention') setStudyMode('multiple-choice'); if (v === 'core') setStudyMode('flip'); if (v === 'exam') setStudyMode('type'); }}
        disabled={isLoading} />

      <PillSelector label="Study Mode" options={studyModeOptions} value={studyMode} onChange={(v) => setStudyMode(v as StudyMode)} disabled={isLoading} />

      <PillSelector label="Retention" options={retentionOptions} value={retentionProfile} onChange={setRetentionProfile} disabled={isLoading} />

      <PillSelector label="Card Style" options={cardStyleOptions} value={cardStyle} onChange={setCardStyle} disabled={isLoading} />

      <PillSelector label="Complexity" options={complexityOptions} value={complexity} onChange={setComplexity} disabled={isLoading} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Cards</p>
          <span className="text-xs font-mono tabular-nums">{flashcardCount}</span>
        </div>
        <Slider value={[flashcardCount]} onValueChange={([v]) => setFlashcardCount(v)} min={1} max={50} step={1} disabled={isLoading} />
      </div>

      <Button onClick={() => handleGenerate(sourceText)} disabled={isLoading || !sourceText.trim()} className="w-full rounded-full">
        <Sparkles className="mr-2 h-4 w-4" />
        Generate Flashcards
      </Button>
    </>
  );

  return (
    <WorkbenchShell title={isAssignmentContext ? 'Create Flashcards' : 'Flashcards'} sidebar={sidebar}>
      <SourceInput value={sourceText} onChange={setSourceText} onSubmit={() => handleGenerate(sourceText)} placeholder="Paste or type your source material..." />
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
