'use client';

import React, { useState, useEffect, Suspense, useContext, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { ChevronLeft, Copy, Loader2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { FunLoader } from '@/components/tools/fun-loader';
import { FlashcardViewer, StudyMode } from '@/components/tools/flashcard-viewer';
import { AppContext } from '@/contexts/app-context';
import type { Flashcard } from '@/lib/types';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToolInputBox } from '@/components/tools/tool-input-box';
import { PillSelector } from '@/components/tools/pill-selector';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { ExportToolbar } from '@/components/tools/export-toolbar';
import { flashcardsToMarkdown, flashcardsToHtml } from '@/lib/export-formatters';
import { ImportToolbar } from '@/components/tools/import-toolbar';
import { parseFlashcardsFromMarkdown, parseFlashcardsFromHtml } from '@/lib/import-parsers';
import { getToolStrings } from '@/lib/tool-i18n';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAdvancedToolSettings } from '@/hooks/use-advanced-tool-settings';
import { detectAdvancedSettingsConflicts } from '@/lib/tools/advanced-settings-schema';
import { SendToClassButton } from '@/components/tools/send-to-class-button';
import { extractShareableClasses } from '@/lib/classes/shareable-classes';
import { postClassShareItem } from '@/lib/class-share/client';
import { classifyContent } from '@/lib/tools/content-classifier';
import type { ContentClassification } from '@/lib/tools/content-classifier';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonGroup, SkeletonCard } from '@/components/ui/skeleton';

type Phase = 'input' | 'options' | 'study';

const normalizeStudyMode = (value: string | null | undefined): StudyMode => {
  if (!value) return 'flip';
  if (value === 'write' || value === 'type') return 'multiple-choice';
  if (value === 'flip' || value === 'multiple-choice' || value === 'fill-blank') return value;
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
  const shareableClasses = React.useMemo(
    () => extractShareableClasses((appContext as any)?.classes || []),
    [appContext]
  );

  const [phase, setPhase] = useState<Phase>('input');
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
  const [activeRecallOnly, setActiveRecallOnly] = useState(false);
  const [interleavingMode, setInterleavingMode] = useState(true);
  const [semanticLinking, setSemanticLinking] = useState(true);
  const [errorTagging, setErrorTagging] = useState(true);
  const [memoryStrengthMeter, setMemoryStrengthMeter] = useState(true);
  const [timePerCardSeconds, setTimePerCardSeconds] = useState(0);
  const [autoFlipDelayMs, setAutoFlipDelayMs] = useState(0);
  const [showCitations, setShowCitations] = useState(true);
  const [mnemonicHints, setMnemonicHints] = useState(true);
  const [explanationMode, setExplanationMode] = useState<'literal' | 'research'>('literal');
  const [studyCompleted, setStudyCompleted] = useState(false);
  const [isSharingToClass, setIsSharingToClass] = useState(false);
  const [contentClass, setContentClass] = useState<ContentClassification | null>(null);
  const launchHandledRef = useRef(false);
  const performanceRecordedRef = useRef(false);
  const classifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceParamsHandledRef = useRef(false);
  const { toast } = useToast();
  const { settings: advancedSettings, savePatch: saveAdvancedSettingsPatch } = useAdvancedToolSettings();
  const advancedHydratedRef = useRef(false);

  // Classify source text after user stops typing (800 ms debounce)
  useEffect(() => {
    if (classifyTimerRef.current) clearTimeout(classifyTimerRef.current);
    classifyTimerRef.current = setTimeout(() => {
      setContentClass(classifyContent(sourceText));
    }, 800);
    return () => {
      if (classifyTimerRef.current) clearTimeout(classifyTimerRef.current);
    };
  }, [sourceText]);

  // Auto-suggest Term first for vocabulary content (only on first classification)
  const vocabSuggestedRef = useRef(false);
  useEffect(() => {
    if (!contentClass || vocabSuggestedRef.current) return;
    if (contentClass.vocabulary === 'y') {
      vocabSuggestedRef.current = true;
      setCardStartSide('term');
    }
  }, [contentClass]);


  const modeOptions = React.useMemo(
    () => [
      ...t.flashcards.studyModeOptions
        .filter((option) => option.value === 'flip' || option.value === 'multiple-choice')
        .map((option) =>
          option.value === 'flip'
            ? { ...option, label: 'Standard', description: 'Classic flip card — see one side, flip to reveal the other' }
            : option.value === 'multiple-choice'
              ? { ...option, label: 'Multiple choice' }
              : option
        ),
      {
        value: 'fill-blank',
        label: 'Fill in the blank',
        description: 'See one side of a pair (e.g. a year), flip, then write down the matching answer (e.g. the event) yourself before checking',
      },
    ],
    [t.flashcards.studyModeOptions]
  );

  const resolveComputeClass = (requestedCount: number): 'light' | 'standard' | 'heavy' => {
    const budget = advancedSettings?.safety.performance_budget || 'auto';
    if (budget === 'low') return 'light';
    if (budget === 'medium') return requestedCount > 24 ? 'standard' : 'light';
    if (budget === 'high') return requestedCount > 16 ? 'heavy' : 'standard';
    return requestedCount > 20 ? 'heavy' : 'standard';
  };
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
    if (advancedSettings?.safety.offline_mode && typeof navigator !== 'undefined' && !navigator.onLine) {
      toast({
        variant: 'destructive',
        title: t.flashcards.generatingTitle,
        description: 'Offline mode is enabled and no connection is available.',
      });
      return;
    }
    setIsLoading(true);
    setGeneratedCards(null);
    try {
      if (advancedSettings?.safety.setting_conflict_detector && advancedSettings) {
        const conflicts = detectAdvancedSettingsConflicts(advancedSettings, { tool: 'flashcards' });
        const blocking = conflicts.find((conflict) => conflict.severity === 'error');
        if (blocking) {
          toast({
            variant: 'destructive',
            title: 'Settings conflict',
            description: blocking.message,
          });
          setIsLoading(false);
          return;
        }
      }
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
            explanationMode,
            includeCitations: showCitations,
            includeHints: mnemonicHints,
            flashcardsOptions: {
              activeRecallOnly,
              interleavingMode,
              semanticLinking,
              errorTagging,
              memoryStrengthMeter,
              timePerCardSeconds,
              autoFlipDelayMs,
              showCitations,
              mnemonicHints,
              explanationMode,
            },
            sourcePolicy: {
              wikipediaEnabled: Boolean(advancedSettings?.sources.wikipedia_enabled),
              wikipediaDepth: advancedSettings?.sources.wikipedia_depth,
              youtubeTranscriptEnabled: Boolean(advancedSettings?.sources.youtube_transcript_enabled),
              crossLanguageSearch: Boolean(advancedSettings?.sources.cross_language_search),
              contradictionResolutionMode: advancedSettings?.sources.contradiction_resolution_mode,
              sourceTraceback: Boolean(advancedSettings?.sources.source_traceback),
              liveUpdateMode: Boolean(advancedSettings?.sources.live_update_mode),
              biasDetection: Boolean(advancedSettings?.sources.bias_detection),
              contextWindowPriority: advancedSettings?.sources.context_window_priority,
              maxSourcesPerRun: advancedSettings?.sources.max_sources_per_run,
            },
            visuals: {
              imagesInQuestions: Boolean(advancedSettings?.visuals.images_in_questions),
              imageStyle: advancedSettings?.visuals.image_style,
              progressiveReveal: Boolean(advancedSettings?.visuals.progressive_reveal),
              focusMode: Boolean(advancedSettings?.visuals.focus_mode),
              autoSimplification: Boolean(advancedSettings?.visuals.auto_simplification),
            },
          },
          computeClass: resolveComputeClass(requestedCount),
      });
      const response = run?.output_payload || run;
      setGeneratedCards(response.flashcards);
      setCurrentView('study');
      setStudyCompleted(false);
    } catch (error) {
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
  }, [activeRecallOnly, advancedSettings, autoFlipDelayMs, customTitle, errorTagging, explanationMode, flashcardCount, imageDataUri, interleavingMode, language, memoryStrengthMeter, mnemonicHints, region, saveToRecents, schoolingLevel, semanticLinking, showCitations, studyMode, t.flashcards.generatingTitle, timePerCardSeconds, toast]);

  useEffect(() => {
    if (!sourceTextFromParams || isAssignmentContext || sourceParamsHandledRef.current) return;
    sourceParamsHandledRef.current = true;
    void handleGenerate(sourceTextFromParams);
  }, [sourceTextFromParams, isAssignmentContext, handleGenerate]);

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
        console.error('[STUDYSET_LAUNCH][FLASHCARDS] error', {
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
    if (s('activeRecallOnly') === 'true') setActiveRecallOnly(true);
    if (s('interleavingMode') === 'false') setInterleavingMode(false);
    if (s('semanticLinking') === 'false') setSemanticLinking(false);
    if (s('errorTagging') === 'false') setErrorTagging(false);
    if (s('memoryStrengthMeter') === 'false') setMemoryStrengthMeter(false);
    if (s('timePerCardSeconds') && !Number.isNaN(Number(s('timePerCardSeconds')))) setTimePerCardSeconds(Number(s('timePerCardSeconds')));
    if (s('autoFlipDelayMs') && !Number.isNaN(Number(s('autoFlipDelayMs')))) setAutoFlipDelayMs(Number(s('autoFlipDelayMs')));
    if (s('showCitations') === 'false') setShowCitations(false);
    if (s('mnemonicHints') === 'false') setMnemonicHints(false);
    if (s('explanationMode') === 'research') setExplanationMode('research');
  }, []);

  useEffect(() => { localStorage.setItem('tools.flashcards.mode', studyMode); }, [studyMode]);
  useEffect(() => { localStorage.setItem('tools.flashcards.cardStartSide', cardStartSide); }, [cardStartSide]);
  useEffect(() => { localStorage.setItem('tools.flashcards.count', String(flashcardCount)); }, [flashcardCount]);
  useEffect(() => { localStorage.setItem('tools.flashcards.saveToRecents', String(saveToRecents)); }, [saveToRecents]);
  useEffect(() => { localStorage.setItem('tools.flashcards.activeRecallOnly', String(activeRecallOnly)); }, [activeRecallOnly]);
  useEffect(() => { localStorage.setItem('tools.flashcards.interleavingMode', String(interleavingMode)); }, [interleavingMode]);
  useEffect(() => { localStorage.setItem('tools.flashcards.semanticLinking', String(semanticLinking)); }, [semanticLinking]);
  useEffect(() => { localStorage.setItem('tools.flashcards.errorTagging', String(errorTagging)); }, [errorTagging]);
  useEffect(() => { localStorage.setItem('tools.flashcards.memoryStrengthMeter', String(memoryStrengthMeter)); }, [memoryStrengthMeter]);
  useEffect(() => { localStorage.setItem('tools.flashcards.timePerCardSeconds', String(timePerCardSeconds)); }, [timePerCardSeconds]);
  useEffect(() => { localStorage.setItem('tools.flashcards.autoFlipDelayMs', String(autoFlipDelayMs)); }, [autoFlipDelayMs]);
  useEffect(() => { localStorage.setItem('tools.flashcards.showCitations', String(showCitations)); }, [showCitations]);
  useEffect(() => { localStorage.setItem('tools.flashcards.mnemonicHints', String(mnemonicHints)); }, [mnemonicHints]);
  useEffect(() => { localStorage.setItem('tools.flashcards.explanationMode', explanationMode); }, [explanationMode]);

  useEffect(() => {
    if (!advancedSettings || advancedHydratedRef.current) return;
    advancedHydratedRef.current = true;
    setActiveRecallOnly(Boolean(advancedSettings.flashcards.active_recall_only));
    setInterleavingMode(Boolean(advancedSettings.flashcards.interleaving_mode));
    setSemanticLinking(Boolean(advancedSettings.flashcards.semantic_linking));
    setErrorTagging(Boolean(advancedSettings.flashcards.error_tagging));
    setMemoryStrengthMeter(Boolean(advancedSettings.flashcards.memory_strength_meter));
    setTimePerCardSeconds(Number(advancedSettings.flashcards.time_per_card_seconds || 0));
    setAutoFlipDelayMs(Number(advancedSettings.flashcards.auto_flip_delay_ms || 0));
    setShowCitations(Boolean(advancedSettings.flashcards.show_citations));
    setMnemonicHints(Boolean(advancedSettings.flashcards.mnemonic_hints));
    setExplanationMode(advancedSettings.flashcards.explanation_mode === 'research' ? 'research' : 'literal');
  }, [advancedSettings]);

  const handleRestart = () => {
    setGeneratedCards(null);
    setCurrentView('setup');
    if (isAssignmentContext) {
      if (classId) router.push(`/class/${classId}`);
      else router.push('/classes');
    }
  };

  const handleFlashcardComplete = React.useCallback(
    async ({ score, totalItems, correctItems }: { score: number; totalItems: number; correctItems: number }) => {
      if (performanceRecordedRef.current || !taskId || !studysetId) return;
      performanceRecordedRef.current = true;
      try {
        await fetch(`/api/studysets/plan-tasks/${taskId}/performance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studysetId,
            toolId: 'flashcards',
            score,
            totalItems,
            correctItems,
            markCompleted: true,
          }),
        });
      } catch {
        // non-critical
      }
    },
    [taskId, studysetId]
  );

  const handleShareToClass = useCallback(async (targetClassId: string) => {
    if (!targetClassId || !generatedCards) return;
    setIsSharingToClass(true);
    try {
      const summary = `${generatedCards.length} cards | mode: ${studyMode}`;
      await postClassShareItem({
        classId: targetClassId,
        audience: 'teacher',
        text: `Shared flashcards: ${customTitle.trim() || 'Untitled flashcards'}`,
        attachmentLabel: summary,
      });
      toast({ title: 'Shared to class', description: 'Flashcards were posted in class share.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Share failed', description: error?.message || 'Could not share flashcards.' });
    } finally {
      setIsSharingToClass(false);
    }
  }, [customTitle, generatedCards, studyMode, toast]);


  // INPUT PHASE - just textbox, no sidebar
  if (phase === 'input') {
    const modeToggle = (
      <div className="flex items-center gap-1">
        {(['literal', 'research'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setExplanationMode(m);
              void saveAdvancedSettingsPatch({ flashcards: { explanation_mode: m } as any }, { tool: 'flashcards' });
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
              explanationMode === m
                ? 'bg-[var(--accent-brand)] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'literal' ? 'Literal' : 'Research'}
          </button>
        ))}
        {/* Info tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors text-[10px] font-bold leading-none"
            >
              i
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[240px] space-y-1.5 text-[11px]">
            <p><span className="font-medium text-foreground">Literal</span> — cards stick to exactly what's explicitly in your text.</p>
            <p><span className="font-medium text-foreground">Research</span> — cards may connect ideas beyond your text, and explain their reasoning on each card.</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );

    return (
      <WorkbenchShell
        title={isAssignmentContext ? t.flashcards.createFlashcards : 'Flashcards'}
        sidebar={<div />}
        hideSidebar={true}
        breadcrumbIcon={<Copy className="h-4 w-4" />}
      >
        <div className="flex h-full w-full flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-4">
            <div className="space-y-1.5 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Create Flashcards</h1>
              <p className="text-sm text-muted-foreground">
                Paste your notes, upload a file, or drop a link
              </p>
            </div>
            <ToolInputBox
              toolId="flashcards"
              placeholder={t.sourceInputPlaceholder}
              onSourceChange={(text) => setSourceText(text)}
              onImageDataUriChange={setImageDataUri}
              onSubmit={(compiledText) => {
                setSourceText(compiledText);
                setPhase('options');
              }}
              isLoading={false}
              submitLabel="Next"
              speechLanguage={language}
              hideToolSwitcher
              bottomSlot={modeToggle}
            />
          </div>
        </div>
      </WorkbenchShell>
    );
  }

  if (isLoading) {
    return <FunLoader tool="flashcards" />;
  }

  // STUDY PHASE - show generated cards
  if (phase === 'study' && generatedCards && currentView === 'study') {
    return (
      <div className="h-full flex flex-col">
        <PageHeader title="Study Flashcards" hideBreadcrumb />
        <div className="flex-1 min-h-0 overflow-auto flex flex-col">
          <div className="p-3 md:p-4 flex items-center justify-between border-b border-border/20">
            <Button variant="ghost" onClick={() => { handleRestart(); setPhase('options'); }} className="rounded-full text-xs">{t.back}</Button>
          {studyCompleted && (
            <ExportToolbar
              toolType="flashcards"
              title={customTitle.trim() || undefined}
              getMarkdown={() => flashcardsToMarkdown(generatedCards)}
              getHtml={() => flashcardsToHtml(generatedCards)}
            />
          )}
          <SendToClassButton
            classes={shareableClasses}
            classIdFromRoute={classId}
            sending={isSharingToClass}
            onSend={handleShareToClass}
            className="rounded-full text-xs"
          />
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
              onComplete={handleFlashcardComplete}
              settings={{
                activeRecallOnly,
                interleavingMode,
                semanticLinking,
                errorTagging,
                memoryStrengthMeter,
                timePerCardSeconds,
                autoFlipDelayMs,
                showCitations,
                mnemonicHints,
                explanationMode,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // OPTIONS PHASE - show settings panel
  if (phase === 'options') {
    return (
      <div className="h-full flex flex-col">
        <PageHeader
          title="Customize Flashcards"
          subtitle="Adjust your settings and generate"
          hideBreadcrumb
        />

        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Title section */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Title</p>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="h-9 text-sm"
                placeholder="Flashcards title (optional)"
                disabled={isLoading}
              />
            </div>

            {/* Study Mode */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Study Mode</p>
              <div className="flex flex-wrap gap-2">
                {modeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStudyMode(normalizeStudyMode(option.value))}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      studyMode === option.value
                        ? 'border-border bg-background text-foreground'
                        : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Side */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Card Side</p>
              <div className="flex flex-wrap gap-2">
                {startSideOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setCardStartSide(option.value === 'explanation' ? 'explanation' : 'term')}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      cardStartSide === option.value
                        ? 'border-border bg-background text-foreground'
                        : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card extras: citations, hints */}
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Card Extras</p>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-foreground">Source citations</p>
                  <p className="text-[11px] text-muted-foreground">Show a small "i" on each card that reveals where its info came from</p>
                </div>
                <Switch
                  checked={showCitations}
                  onCheckedChange={(checked) => {
                    setShowCitations(checked);
                    void saveAdvancedSettingsPatch({ flashcards: { show_citations: checked } as any }, { tool: 'flashcards' });
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-foreground">Mnemonic hints</p>
                  <p className="text-[11px] text-muted-foreground">Add a "Reveal hint" button with a simple memory aid (ezelsbruggetje) per card</p>
                </div>
                <Switch
                  checked={mnemonicHints}
                  onCheckedChange={(checked) => {
                    setMnemonicHints(checked);
                    void saveAdvancedSettingsPatch({ flashcards: { mnemonic_hints: checked } as any }, { tool: 'flashcards' });
                  }}
                />
              </div>
            </div>

            {/* Content classification tags */}
            {contentClass && (
              <div className="flex flex-wrap gap-1.5">
                {contentClass.vocabulary === 'y' && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Vocabulary</span>
                )}
                {contentClass.code === 'y' && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Code</span>
                )}
                {contentClass.processes === 'y' && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Processes</span>
                )}
                {contentClass.people === 'y' && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">People</span>
                )}
                {contentClass.dates === 'y' && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Dates</span>
                )}
              </div>
            )}

            {/* Card Count */}
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Card Count</p>
                <span className="text-xs font-mono">{flashcardCount}</span>
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

            {/* Save to recents */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Save to Recents</p>
              <Switch
                checked={saveToRecents}
                onCheckedChange={setSaveToRecents}
              />
            </div>

            {/* Advanced settings collapse */}
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Advanced Options</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Active Recall Only</p>
                  <Switch
                    checked={activeRecallOnly}
                    onCheckedChange={(checked) => {
                      setActiveRecallOnly(checked);
                      void saveAdvancedSettingsPatch({ flashcards: { active_recall_only: checked } as any }, { tool: 'flashcards' });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Interleaving Mode</p>
                  <Switch checked={interleavingMode} onCheckedChange={(checked) => {
                    setInterleavingMode(checked);
                    void saveAdvancedSettingsPatch({ flashcards: { interleaving_mode: checked } as any }, { tool: 'flashcards' });
                  }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Semantic Linking</p>
                  <Switch checked={semanticLinking} onCheckedChange={(checked) => {
                    setSemanticLinking(checked);
                    void saveAdvancedSettingsPatch({ flashcards: { semantic_linking: checked } as any }, { tool: 'flashcards' });
                  }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Error Tagging</p>
                  <Switch checked={errorTagging} onCheckedChange={(checked) => {
                    setErrorTagging(checked);
                    void saveAdvancedSettingsPatch({ flashcards: { error_tagging: checked } as any }, { tool: 'flashcards' });
                  }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Memory Strength Meter</p>
                  <Switch checked={memoryStrengthMeter} onCheckedChange={(checked) => {
                    setMemoryStrengthMeter(checked);
                    void saveAdvancedSettingsPatch({ flashcards: { memory_strength_meter: checked } as any }, { tool: 'flashcards' });
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="border-t border-border p-4 flex justify-between gap-2">
          <Button
            variant="outline"
            className="relative ps-10 pe-4"
            onClick={() => {
              setPhase('input');
              setSourceText('');
              setCustomTitle('');
            }}
          >
            Back
            <span className="pointer-events-none absolute inset-y-0 start-0 flex w-8 items-center justify-center rounded-l-lg bg-foreground/[0.06]">
              <ChevronLeft size={14} strokeWidth={2} className="opacity-50" aria-hidden="true" />
            </span>
          </Button>
          <Button
            onClick={() => {
              setPhase('study');
              void handleGenerate(sourceText);
            }}
            disabled={isLoading || !sourceText.trim()}
          >
            {isLoading ? (
              <>
                <Spinner size={16} className="mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Generate Flashcards
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Fallback (should not reach here if all phases are covered)
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Flashcards</h2>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <FlashcardsPageContent />
    </Suspense>
  );
}
