'use client';

import React, { useState, useEffect, Suspense, useContext, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { Copy, Loader2 } from 'lucide-react';
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
import { useAdvancedToolSettings } from '@/hooks/use-advanced-tool-settings';
import { detectAdvancedSettingsConflicts } from '@/lib/tools/advanced-settings-schema';
import { SendToClassButton } from '@/components/tools/send-to-class-button';
import { extractShareableClasses } from '@/lib/classes/shareable-classes';
import { postClassShareItem } from '@/lib/class-share/client';
import { classifyContent } from '@/lib/tools/content-classifier';
import type { ContentClassification } from '@/lib/tools/content-classifier';

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
  const shareableClasses = React.useMemo(
    () => extractShareableClasses((appContext as any)?.classes || []),
    [appContext]
  );

  const [sourceText, setSourceText] = useState(sourceTextFromParams || '');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<Flashcard[] | null>(null);
  const [state1Completed, setState1Completed] = useState(false);
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
  const [studyCompleted, setStudyCompleted] = useState(false);
  const [isSharingToClass, setIsSharingToClass] = useState(false);
  const [contentClass, setContentClass] = useState<ContentClassification | null>(null);
  const launchHandledRef = useRef(false);
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

  // State 1 handlers for upload buttons
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state1LinkUrl, setState1LinkUrl] = useState('');
  const [state1ShowLinkDialog, setState1ShowLinkDialog] = useState(false);
  const [state1LinkLoading, setState1LinkLoading] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setSourceText((prev) => prev ? `${prev}\n\n${text}` : text);
      }
    };
    reader.onerror = () => {
      toast({ variant: 'destructive', title: 'File reading failed' });
    };
    reader.readAsText(file);
  }, [toast]);

  const handleLinkSubmit = useCallback(async () => {
    const url = state1LinkUrl.trim();
    if (!url) {
      toast({ variant: 'destructive', title: 'Please enter a URL' });
      return;
    }

    setState1LinkLoading(true);
    try {
      const response = await fetch('/api/tools/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch URL');
      }

      const data = await response.json();
      const extracted = data?.text?.trim();

      if (extracted) {
        setSourceText((prev) => prev ? `${prev}\n\n${extracted}` : extracted);
        setState1LinkUrl('');
        setState1ShowLinkDialog(false);
        toast({ title: 'Content imported', description: 'URL content added to textarea' });
      } else {
        toast({ variant: 'destructive', title: 'No text found', description: 'Could not extract text from this URL' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'URL extraction failed', description: error?.message || 'Please try again' });
    } finally {
      setState1LinkLoading(false);
    }
  }, [state1LinkUrl, toast]);

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
            flashcardsOptions: {
              activeRecallOnly,
              interleavingMode,
              semanticLinking,
              errorTagging,
              memoryStrengthMeter,
              timePerCardSeconds,
              autoFlipDelayMs,
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
  }, [activeRecallOnly, advancedSettings, autoFlipDelayMs, customTitle, errorTagging, flashcardCount, imageDataUri, interleavingMode, language, memoryStrengthMeter, region, saveToRecents, schoolingLevel, semanticLinking, studyMode, t.flashcards.generatingTitle, timePerCardSeconds, toast]);

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
  }, [advancedSettings]);

  const handleRestart = () => {
    setGeneratedCards(null);
    setCurrentView('setup');
    if (isAssignmentContext) {
      if (classId) router.push(`/class/${classId}`);
      else router.push('/classes');
    }
  };

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


  if (isLoading) {
    return <FunLoader tool="flashcards" />;
  }

  if (generatedCards && currentView === 'study') {
    return (
      <>
      <div className="h-full flex flex-col">
        <div className="p-3 md:p-4 flex items-center justify-between">
          <Button variant="ghost" onClick={handleRestart} className="rounded-full text-xs">{t.back}</Button>
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
            settings={{
              activeRecallOnly,
              interleavingMode,
              semanticLinking,
              errorTagging,
              memoryStrengthMeter,
              timePerCardSeconds,
              autoFlipDelayMs,
            }}
          />
        </div>
      </div>
      </>
    );
  }

  const sidebar = (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#666]">Title</p>
        <Input
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          className="h-9 bg-[hsl(var(--background))] text-sm"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <PillSelector label="Mode" options={modeOptions} value={studyMode} onChange={(v) => setStudyMode(normalizeStudyMode(v))} disabled={isLoading} />
      </div>
      <div className="space-y-2">
        <PillSelector
          label="Card side"
          options={startSideOptions}
          value={cardStartSide}
          onChange={(v) => setCardStartSide(v === 'explanation' ? 'explanation' : 'term')}
          disabled={isLoading}
        />
      </div>

      {contentClass && (
        <div className="flex flex-wrap gap-1.5">
          {contentClass.vocabulary === 'y' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ebebeb] text-[#555]">Vocabulary</span>
          )}
          {contentClass.code === 'y' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ebebeb] text-[#555]">Code</span>
          )}
          {contentClass.processes === 'y' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ebebeb] text-[#555]">Processes</span>
          )}
          {contentClass.people === 'y' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ebebeb] text-[#555]">People</span>
          )}
          {contentClass.dates === 'y' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ebebeb] text-[#555]">Dates</span>
          )}
        </div>
      )}

      <div className="space-y-2 border-t border-[#d0d0d0] pt-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#666]">Questions</p>
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

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#666]">Save to recents</p>
        <Switch
          checked={saveToRecents}
          onCheckedChange={setSaveToRecents}
          className="h-5 w-9 data-[state=checked]:!bg-emerald-800 data-[state=unchecked]:!bg-red-800 data-[state=checked]:[&>span]:translate-x-4 [&>span]:h-4 [&>span]:w-4"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Active recall only</p>
          <Switch
            checked={activeRecallOnly}
            onCheckedChange={(checked) => {
              setActiveRecallOnly(checked);
              void saveAdvancedSettingsPatch({ flashcards: { active_recall_only: checked } as any }, { tool: 'flashcards' });
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Interleaving mode</p>
          <Switch checked={interleavingMode} onCheckedChange={(checked) => {
            setInterleavingMode(checked);
            void saveAdvancedSettingsPatch({ flashcards: { interleaving_mode: checked } as any }, { tool: 'flashcards' });
          }} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Semantic linking</p>
          <Switch checked={semanticLinking} onCheckedChange={(checked) => {
            setSemanticLinking(checked);
            void saveAdvancedSettingsPatch({ flashcards: { semantic_linking: checked } as any }, { tool: 'flashcards' });
          }} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Error tagging</p>
          <Switch checked={errorTagging} onCheckedChange={(checked) => {
            setErrorTagging(checked);
            void saveAdvancedSettingsPatch({ flashcards: { error_tagging: checked } as any }, { tool: 'flashcards' });
          }} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Memory strength meter</p>
          <Switch checked={memoryStrengthMeter} onCheckedChange={(checked) => {
            setMemoryStrengthMeter(checked);
            void saveAdvancedSettingsPatch({ flashcards: { memory_strength_meter: checked } as any }, { tool: 'flashcards' });
          }} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Time per card (seconds)</p>
          <span className="text-xs font-mono tabular-nums">{timePerCardSeconds}</span>
        </div>
        <Slider value={[timePerCardSeconds]} onValueChange={([v]) => {
          setTimePerCardSeconds(v);
          void saveAdvancedSettingsPatch({ flashcards: { time_per_card_seconds: v } as any }, { tool: 'flashcards' });
        }} min={0} max={120} step={1} disabled={isLoading} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Auto flip delay (ms)</p>
          <span className="text-xs font-mono tabular-nums">{autoFlipDelayMs}</span>
        </div>
        <Slider value={[autoFlipDelayMs]} onValueChange={([v]) => {
          setAutoFlipDelayMs(v);
          void saveAdvancedSettingsPatch({ flashcards: { auto_flip_delay_ms: v } as any }, { tool: 'flashcards' });
        }} min={0} max={15000} step={250} disabled={isLoading} />
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
    </div>
  );

  // Determine if we're in State 1 (input) or State 2 (settings)
  const inState1 = !state1Completed;
  const inState2 = state1Completed && !generatedCards;

  if (inState1) {
    // STATE 1: INPUT MATERIAL
    return (
      <div className="flex h-full w-full flex-col">
        {/* Topbar */}
        <div className="h-[52px] border-b border-border bg-background px-8 flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-bold text-foreground">cautie</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Tools</span>
            <span className="text-border">›</span>
            <span className="font-semibold text-foreground">Flashcards</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-foreground"></div>
            <div className="w-2 h-2 rounded-full bg-border"></div>
            <span className="text-xs text-muted-foreground ml-1">Step 1 of 2</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 overflow-y-auto bg-background">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-2xl shadow-sm">

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-1.5 text-foreground">Create Flashcards</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Paste text, upload files, or add a link. We'll analyze the content and tailor the flashcard settings for you.
              </p>
            </div>

            {/* Upload Buttons */}
            <div className="flex gap-2 flex-wrap mb-5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 hover:border-accent/50 transition-all"
              >
                <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".txt,.pdf,.docx,.md"
              />
              <button
                onClick={() => toast({ variant: 'default', title: 'Photo capture coming soon', description: 'This feature will be available soon.' })}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 hover:border-accent/50 transition-all"
              >
                <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Photo
              </button>
              <button
                onClick={() => toast({ variant: 'default', title: 'Voice recording coming soon', description: 'This feature will be available soon.' })}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 hover:border-accent/50 transition-all"
              >
                <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>Mic
              </button>
              <button
                onClick={() => toast({ variant: 'default', title: 'Import coming soon', description: 'This feature will be available soon.' })}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 hover:border-accent/50 transition-all"
              >
                <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 13v6"/><path d="M9 16h6"/></svg>Import from
              </button>
              <button
                onClick={() => setState1ShowLinkDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 hover:border-accent/50 transition-all"
              >
                <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Link
              </button>

              {/* Link dialog modal */}
              {state1ShowLinkDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                  <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-xl">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Paste a link</h3>
                      <button
                        onClick={() => setState1ShowLinkDialog(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <input
                        type="url"
                        value={state1LinkUrl}
                        onChange={(e) => setState1LinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-[var(--accent-brand)] focus:ring-2 focus:ring-[var(--accent-brand)]/10 outline-none transition-colors bg-muted/30 text-foreground"
                        onKeyPress={(e) => e.key === 'Enter' && handleLinkSubmit()}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setState1ShowLinkDialog(false)}
                          className="px-4 py-2 border border-border rounded-md text-xs font-medium text-foreground hover:bg-accent/10 hover:border-accent/50 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleLinkSubmit}
                          disabled={state1LinkLoading || !state1LinkUrl.trim()}
                          className="px-4 py-2 bg-[var(--accent-brand)] text-white rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                          {state1LinkLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                          {state1LinkLoading ? 'Loading...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Textarea + Added sources */}
            <div className="flex gap-5 mb-6 h-72">
              {/* Textarea */}
              <div className="flex-1 flex flex-col">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">Your content</div>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Paste text, article content, notes, or anything you want to create flashcards from..."
                  className="flex-1 w-full p-3 border border-border rounded-lg text-sm font-inherit text-foreground resize-none outline-none leading-relaxed focus:border-[var(--accent-brand)] focus:ring-2 focus:ring-[var(--accent-brand)]/10 transition-colors bg-muted/20"
                />
                <span className="text-xs text-muted-foreground mt-1.5">Supports: text, PDF, DOCX, images, YouTube links, web URLs</span>
              </div>

              {/* Added sources */}
              <div className="w-60 flex flex-col border-l border-border pl-4">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">Added (0)</div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                  <div className="text-center text-muted-foreground text-xs py-12 flex flex-col items-center justify-center">
                    <svg className="w-6 h-6 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9-4 9 4" /></svg>
                    No sources yet
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 justify-end border-t border-border pt-5">
              <button
                onClick={() => setSourceText('')}
                className="px-5 py-2.5 bg-muted border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 hover:border-accent/30 transition-all"
              >
                Clear
              </button>
              <button
                disabled={!sourceText.trim()}
                onClick={() => setState1Completed(true)}
                className="px-5 py-2.5 bg-[var(--accent-brand)] text-white rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Continue →
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // STATE 2: SETTINGS (new clean layout)
  if (inState2) {
    return (
      <div className="flex h-full w-full flex-col bg-background">
        {/* Topbar */}
        <div className="h-[52px] border-b border-border bg-background px-8 flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-bold text-foreground">cautie</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Tools</span>
            <span className="text-border">›</span>
            <span className="font-semibold text-foreground">Flashcards</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-foreground"></div>
            <div className="w-2 h-2 rounded-full bg-border"></div>
            <span className="text-xs text-muted-foreground ml-1">Step 2 of 2</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 overflow-y-auto">
          <div className="bg-card rounded-lg border border-border w-full max-w-2xl shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h2 className="text-base font-bold text-foreground mb-1">Flashcard Settings</h2>
              <p className="text-xs text-muted-foreground">Configure your flashcards based on the content you added.</p>
            </div>

            {/* Settings */}
            <div className="px-6 py-6 space-y-6 overflow-y-auto" style={{maxHeight: 'calc(100% - 180px)'}}>
              {sidebar}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/30">
              <button
                onClick={() => void runFlashcardGeneration(sourceText)}
                disabled={isLoading || !sourceText.trim()}
                className="w-full px-4 py-2.5 bg-[var(--accent-brand)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                {isLoading ? 'Generating...' : 'Generate Flashcards'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FALLBACK: Old sidebar layout
  return (
    <>
    <WorkbenchShell
      title={isAssignmentContext ? t.flashcards.createFlashcards : 'Flashcards'}
      sidebar={sidebar}
      breadcrumbIcon={<Copy className="h-4 w-4" />}
    >
      <div className="flex h-full w-full flex-col justify-end p-3 gap-3">
        <ToolInputBox
          toolId="flashcards"
          placeholder={t.sourceInputPlaceholder}
          onSourceChange={(text) => setSourceText(text)}
          onImageDataUriChange={setImageDataUri}
          onSubmit={(compiledText) => void handleGenerate(compiledText || sourceText)}
          isLoading={isLoading}
          submitLabel="Generate"
          speechLanguage={language}
        />
      </div>
    </WorkbenchShell>
    </>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <FlashcardsPageContent />
    </Suspense>
  );
}
