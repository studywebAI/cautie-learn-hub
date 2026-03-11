'use client';

import React, { useState, useEffect, Suspense, useContext, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { Loader2, Sparkles } from 'lucide-react';
import { FunLoader } from '@/components/tools/fun-loader';
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
import { ExportToolbar } from '@/components/tools/export-toolbar';
import { flashcardsToMarkdown, flashcardsToHtml } from '@/lib/export-formatters';
import { ImportToolbar } from '@/components/tools/import-toolbar';
import { parseFlashcardsFromMarkdown, parseFlashcardsFromHtml } from '@/lib/import-parsers';
import { getToolStrings } from '@/lib/tool-i18n';

function FlashcardsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceTextFromParams = searchParams.get('sourceText');
  const runId = searchParams.get('runId');
  const context = searchParams.get('context');
  const classId = searchParams.get('classId');
  const isAssignmentContext = context === 'assignment';
  const { run: savedRun } = useSavedRun(runId);
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const t = getToolStrings(language);

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
  const [customTitle, setCustomTitle] = useState('');
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
        artifactTitle: customTitle.trim() || 'Generated Flashcards',
        input: { sourceText: text, count: flashcardCount, language, modePack, retentionProfile, cardStyle, complexity },
        computeClass: flashcardCount > 20 ? 'heavy' : 'standard',
      });
      const response = run?.output_payload || run;
      setGeneratedCards(response.flashcards);
      setCurrentView('study');
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast({ variant: 'destructive', title: t.flashcards.generatingTitle, description: (error as any)?.message || 'Unable to generate flashcards' });
      setCurrentView('setup');
    } finally {
      setIsLoading(false);
    }
  }, [flashcardCount, language, studyMode, modePack, retentionProfile, cardStyle, complexity]);

  useEffect(() => {
    if (sourceTextFromParams && !isAssignmentContext) handleGenerate(sourceTextFromParams);
  }, [sourceTextFromParams, handleGenerate]);

  useEffect(() => {
    if (savedRun?.output_payload && savedRun.status === 'succeeded') {
      const output = savedRun.output_payload;
      setGeneratedCards(output.flashcards || null);
      setCurrentView('study');
      if (savedRun.input_payload?.sourceText) setSourceText(savedRun.input_payload.sourceText);
      if (savedRun.mode) setStudyMode(savedRun.mode as StudyMode);
    }
  }, [savedRun]);

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
    return <FunLoader tool="flashcards" />;
  }

  if (generatedCards && currentView === 'study') {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 md:px-6 pt-3 flex items-center justify-between">
          <Button variant="ghost" onClick={handleRestart} className="rounded-full text-xs">{t.back}</Button>
          <ExportToolbar
            toolType="flashcards"
            title={customTitle.trim() || undefined}
            getMarkdown={() => flashcardsToMarkdown(generatedCards)}
            getHtml={() => flashcardsToHtml(generatedCards)}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <FlashcardViewer cards={generatedCards} mode={studyMode} onRestart={handleRestart} />
        </div>
      </div>
    );
  }

  const currentSettings = { studyMode, modePack, retentionProfile, flashcardCount, cardStyle, complexity };

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

      <PillSelector label={t.flashcards.labels.pack} options={t.flashcards.packOptions} value={modePack}
        onChange={(v) => { setModePack(v); if (v === 'retention') setStudyMode('multiple-choice'); if (v === 'core') setStudyMode('flip'); if (v === 'exam') setStudyMode('type'); }}
        disabled={isLoading} />

      <PillSelector label={t.flashcards.labels.studyMode} options={t.flashcards.studyModeOptions} value={studyMode} onChange={(v) => setStudyMode(v as StudyMode)} disabled={isLoading} />

      <PillSelector label={t.flashcards.labels.retention} options={t.flashcards.retentionOptions} value={retentionProfile} onChange={setRetentionProfile} disabled={isLoading} />

      <PillSelector label={t.flashcards.labels.cardStyle} options={t.flashcards.cardStyleOptions} value={cardStyle} onChange={setCardStyle} disabled={isLoading} />

      <PillSelector label={t.flashcards.labels.complexity} options={t.flashcards.complexityOptions} value={complexity} onChange={setComplexity} disabled={isLoading} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t.cards}</p>
          <span className="text-xs font-mono tabular-nums">{flashcardCount}</span>
        </div>
        <Slider value={[flashcardCount]} onValueChange={([v]) => setFlashcardCount(v)} min={1} max={50} step={1} disabled={isLoading} />
      </div>

      <Button onClick={() => handleGenerate(sourceText)} disabled={isLoading || !sourceText.trim()} className="w-full rounded-full">
        <Sparkles className="mr-2 h-4 w-4" />
        {t.flashcards.generate}
      </Button>

      <ImportToolbar
        toolType="flashcards"
        onImport={(text) => {
          const cards = text.includes('<') ? parseFlashcardsFromHtml(text) : parseFlashcardsFromMarkdown(text);
          if (cards && cards.length > 0) {
            setGeneratedCards(cards);
            setCurrentView('study');
          } else {
            toast({ variant: 'destructive', title: t.couldNotParse, description: t.flashcards.parseError });
          }
        }}
        disabled={isLoading}
      />
    </>
  );

  return (
    <WorkbenchShell title={isAssignmentContext ? t.flashcards.createFlashcards : 'Flashcards'} sidebar={sidebar}>
      <SourceInput
        toolId="flashcards"
        value={sourceText}
        onChange={setSourceText}
        onSubmit={() => handleGenerate(sourceText)}
        placeholder={t.sourceInputPlaceholder}
        enableMic
        enableCaptions
        sourceMergeMode="append_labeled"
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
