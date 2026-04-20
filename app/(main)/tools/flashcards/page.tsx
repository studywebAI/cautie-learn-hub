'use client';

import React, { useState, useEffect, Suspense, useContext, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { FunLoader } from '@/components/tools/fun-loader';
import { FlashcardViewer, StudyMode } from '@/components/tools/flashcard-viewer';
import { AppContext } from '@/contexts/app-context';
import type { Flashcard } from '@/lib/types';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SourceInput } from '@/components/tools/source-input';
import { PillSelector } from '@/components/tools/pill-selector';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { ExportToolbar } from '@/components/tools/export-toolbar';
import { flashcardsToMarkdown, flashcardsToHtml } from '@/lib/export-formatters';
import { ImportToolbar } from '@/components/tools/import-toolbar';
import { parseFlashcardsFromMarkdown, parseFlashcardsFromHtml } from '@/lib/import-parsers';
import { getToolStrings } from '@/lib/tool-i18n';
import { Switch } from '@/components/ui/switch';

const normalizeStudyMode = (value: string | null | undefined): StudyMode => {
  if (!value) return 'flip';
  if (value === 'write' || value === 'type') return 'multiple-choice';
  if (value === 'flip' || value === 'multiple-choice') return value;
  return 'flip';
};

function FlashcardsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceTextFromParams = searchParams.get('sourceText');
  const runId = searchParams.get('runId');
  const taskId = searchParams.get('taskId');
  const studysetId = searchParams.get('studysetId');
  const launchRequested = searchParams.get('launch') === '1';
  const context = searchParams.get('context');
  const classId = searchParams.get('classId');
  const isAssignmentContext = context === 'assignment';
  const { run: savedRun } = useSavedRun(runId);
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const region = appContext?.region ?? 'global';
  const schoolingLevel = appContext?.schoolingLevel ?? 2;
  const t = getToolStrings(language);

  const [sourceText, setSourceText] = useState(sourceTextFromParams || '');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<Flashcard[] | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>('flip');
  const [cardStartSide, setCardStartSide] = useState<'term' | 'explanation'>('term');
  const [flashcardCount, setFlashcardCount] = useState(10);
  const [currentView, setCurrentView] = useState<'setup' | 'study'>('setup');
  const [customTitle, setCustomTitle] = useState('');
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [saveToRecents, setSaveToRecents] = useState(true);
  const [studyCompleted, setStudyCompleted] = useState(false);
  const launchHandledRef = useRef(false);
  const { toast } = useToast();
  const modeOptions = React.useMemo(
    () =>
      t.flashcards.studyModeOptions
        .filter((option) => option.value === 'flip' || option.value === 'multiple-choice')
        .map((option) =>
          option.value === 'flip'
            ? { ...option, label: 'Standard' }
            : option.value === 'multiple-choice'
              ? { ...option, label: 'Multiple choice' }
              : option
        ),
    [t.flashcards.studyModeOptions]
  );
  const startSideOptions = React.useMemo(
    () => [
      { value: 'term', label: 'Term first' },
      { value: 'explanation', label: 'Explanation first' },
    ],
    []
  );

  const handleGenerate = useCallback(async (
    text: string,
    overrides?: Partial<{
      mode: StudyMode;
      count: number;
      title: string;
    }>
  ) => {
    if (!text.trim()) return;
    setIsLoading(true);
    setGeneratedCards(null);
    try {
      const requestedMode = overrides?.mode || studyMode;
      const requestedCount = overrides?.count ?? flashcardCount;
      const requestedTitle = overrides?.title || customTitle.trim() || 'Generated Flashcards';

      const run = await runToolFlowV2({
        toolId: 'flashcards',
        flowName: 'generateFlashcards',
        mode: requestedMode,
          artifactType: 'flashcards',
          artifactTitle: requestedTitle,
          options: { saveToRecents },
          persistArtifact: saveToRecents,
          input: {
            sourceText: text,
            imageDataUri: imageDataUri || undefined,
            count: requestedCount,
            language,
            educationLevel: schoolingLevel,
            regionCode: String(region || 'global').toUpperCase(),
            studyMode: requestedMode,
          },
          computeClass: requestedCount > 20 ? 'heavy' : 'standard',
      });
      const response = run?.output_payload || run;
      setGeneratedCards(response.flashcards);
      setCurrentView('study');
      setStudyCompleted(false);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast({
        variant: 'destructive',
        title: t.flashcards.generatingTitle,
        description: (error as any)?.message || 'Unable to generate flashcards',
        errorCode: (error as any)?.code ? String((error as any).code) : undefined,
      });
      setCurrentView('setup');
    } finally {
      setIsLoading(false);
    }
  }, [customTitle, flashcardCount, imageDataUri, language, region, schoolingLevel, saveToRecents, studyMode]);

  useEffect(() => {
    if (sourceTextFromParams && !isAssignmentContext) handleGenerate(sourceTextFromParams);
  }, [sourceTextFromParams, handleGenerate]);

  useEffect(() => {
    if (!launchRequested || !taskId || !studysetId || launchHandledRef.current) return;
    launchHandledRef.current = true;
    console.info('[STUDYSET_LAUNCH][FLASHCARDS] launch requested', {
      taskId,
      studysetId,
      launchRequested,
    });

    const runLaunch = async () => {
      try {
        const response = await fetch(`/api/studysets/plan-tasks/${taskId}/launch`);
        if (!response.ok) throw new Error(`Could not load studyset task preset (${response.status})`);
        const payload = await response.json();
        const source = String(payload?.launch?.sourceText || '').trim();
        const preset = payload?.launch?.flashcardsPreset || {};
        const title = String(payload?.launch?.artifactTitle || '').trim();
        console.info('[STUDYSET_LAUNCH][FLASHCARDS] launch payload loaded', {
          taskId,
          studysetId,
          sourceLength: source.length,
          preset,
          hasTitle: Boolean(title),
        });

        if (source) setSourceText(source);
        if (preset?.mode) setStudyMode(normalizeStudyMode(String(preset.mode)));
        if (typeof preset?.count === 'number') setFlashcardCount(preset.count);
        if (title) setCustomTitle(title);

        if (source) {
          await handleGenerate(source, {
            mode: normalizeStudyMode(typeof preset?.mode === 'string' ? preset.mode : undefined),
            count: typeof preset?.count === 'number' ? preset.count : undefined,
            title: title || undefined,
          });
          console.info('[STUDYSET_LAUNCH][FLASHCARDS] generation completed', { taskId, studysetId });
        }
      } catch (error: any) {
        console.error('[STUDYSET_LAUNCH][FLASHCARDS] launch failed', {
          taskId,
          studysetId,
          message: error?.message || String(error),
        });
        toast({
          variant: 'destructive',
          title: 'Could not start studyset task',
          description: error?.message || 'Please refresh and try again.',
          errorCode: error?.code ? String(error.code) : undefined,
        });
      }
    };

    void runLaunch();
  }, [handleGenerate, launchRequested, studysetId, taskId, toast]);

  useEffect(() => {
    if (savedRun?.output_payload && savedRun.status === 'succeeded') {
      const output = savedRun.output_payload;
      setGeneratedCards(output.flashcards || null);
      setCurrentView('study');
      if (savedRun.input_payload?.sourceText) setSourceText(savedRun.input_payload.sourceText);
      if (savedRun.mode) setStudyMode(normalizeStudyMode(String(savedRun.mode)));
    }
  }, [savedRun]);

  useEffect(() => {
    const s = (k: string) => localStorage.getItem(`tools.flashcards.${k}`);
    if (s('mode')) setStudyMode(normalizeStudyMode(s('mode')));
    if (s('cardStartSide') === 'explanation') setCardStartSide('explanation');
    if (s('count') && !Number.isNaN(Number(s('count')))) setFlashcardCount(Number(s('count')));
    if (s('saveToRecents') === 'false') setSaveToRecents(false);
  }, []);

  useEffect(() => { localStorage.setItem('tools.flashcards.mode', studyMode); }, [studyMode]);
  useEffect(() => { localStorage.setItem('tools.flashcards.cardStartSide', cardStartSide); }, [cardStartSide]);
  useEffect(() => { localStorage.setItem('tools.flashcards.count', String(flashcardCount)); }, [flashcardCount]);
  useEffect(() => { localStorage.setItem('tools.flashcards.saveToRecents', String(saveToRecents)); }, [saveToRecents]);

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
          {studyCompleted && (
            <ExportToolbar
              toolType="flashcards"
              title={customTitle.trim() || undefined}
              getMarkdown={() => flashcardsToMarkdown(generatedCards)}
              getHtml={() => flashcardsToHtml(generatedCards)}
            />
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <FlashcardViewer
            cards={generatedCards}
            mode={studyMode}
            cardStartSide={cardStartSide}
            onRestart={handleRestart}
            taskId={taskId || undefined}
            studysetId={studysetId || undefined}
            onCompletionChange={setStudyCompleted}
          />
        </div>
      </div>
    );
  }

  const sidebar = (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{t.title}</p>
        <Input
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          className="h-9 text-sm"
          disabled={isLoading}
        />
      </div>

      <PillSelector label="Mode" options={modeOptions} value={studyMode} onChange={(v) => setStudyMode(normalizeStudyMode(v))} disabled={isLoading} />
      <PillSelector
        label="Card side"
        options={startSideOptions}
        value={cardStartSide}
        onChange={(v) => setCardStartSide(v === 'explanation' ? 'explanation' : 'term')}
        disabled={isLoading}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t.cards}</p>
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

      <div className="flex items-center justify-between rounded-lg bg-sidebar-accent/30 px-2.5 py-2">
        <p className="text-xs text-muted-foreground">Save to recents</p>
        <Switch
          checked={saveToRecents}
          onCheckedChange={setSaveToRecents}
          className="h-5 w-9 data-[state=checked]:!bg-emerald-800 data-[state=unchecked]:!bg-red-800 data-[state=checked]:[&>span]:translate-x-4 [&>span]:h-4 [&>span]:w-4"
        />
      </div>

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
    <WorkbenchShell
      title={isAssignmentContext ? t.flashcards.createFlashcards : 'Flashcards'}
      sidebar={sidebar}
    >
      <SourceInput
        toolId="flashcards"
        value={sourceText}
        onChange={setSourceText}
        onImageDataUriChange={setImageDataUri}
        onSubmit={(compiledText) => handleGenerate(String(compiledText || sourceText))}
        placeholder={t.sourceInputPlaceholder}
        speechLanguage={language}
        enableMic={false}
        enableCaptions={false}
        sourceMergeMode="append_labeled"
      />
    </WorkbenchShell>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<FunLoader tool="flashcards" />}>
      <FlashcardsPageContent />
    </Suspense>
  );
}
