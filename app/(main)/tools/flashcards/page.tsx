'use client';

import React, { useState, useEffect, Suspense, useContext, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { ChevronLeft, Copy, Loader2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import Loader from '@/components/ui/loader';
import { FunLoader } from '@/components/tools/fun-loader';
import { FlashcardViewer, StudyMode } from '@/components/tools/flashcard-viewer';
import { AppContext } from '@/contexts/app-context';
import { NotesReminder } from '@/components/analytics/notes-reminder';
import type { Flashcard } from '@/lib/types';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToolInputBox } from '@/components/tools/tool-input-box';
import { useToast } from '@/hooks/use-toast';
import { ExportToolbar } from '@/components/tools/export-toolbar';
import { flashcardsToMarkdown, flashcardsToHtml } from '@/lib/export-formatters';
import { getToolStrings } from '@/lib/tool-i18n';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useAdvancedToolSettings } from '@/hooks/use-advanced-tool-settings';
import { detectAdvancedSettingsConflicts } from '@/lib/tools/advanced-settings-schema';
import { SendToClassButton } from '@/components/tools/send-to-class-button';
import { extractShareableClasses } from '@/lib/classes/shareable-classes';
import { postClassShareItem } from '@/lib/class-share/client';
import { classifyContent, isFlashcardTypeAvailable } from '@/lib/tools/content-classifier';
import type { ContentClassification } from '@/lib/tools/content-classifier';
import { PageHeader } from '@/components/ui/page-header';

type Phase = 'input' | 'options' | 'study';

type FlashcardTypeValue =
  | 'term-definition'
  | 'multiple-choice'
  | 'image-card'
  | 'cloze'
  | 'example-sentence'
  | 'true-false'
  | 'compare-pair'
  | 'mnemonic'
  | 'formula'
  | 'process-step'
  | 'date-event'
  | 'reversed-direction';

type FlashcardTypeDefinition = {
  value: FlashcardTypeValue;
  label: string;
  description: string;
  requiresResearchMode?: boolean;
};

const FLASHCARD_TYPE_VALUES: { value: FlashcardTypeValue; requiresResearchMode?: boolean }[] = [
  { value: 'term-definition' },
  { value: 'multiple-choice' },
  { value: 'true-false' },
  { value: 'cloze' },
  { value: 'example-sentence' },
  { value: 'compare-pair' },
  { value: 'mnemonic' },
  { value: 'formula' },
  { value: 'process-step' },
  { value: 'date-event' },
  { value: 'reversed-direction' },
  { value: 'image-card', requiresResearchMode: true },
];

const normalizeStudyMode = (value: string | null | undefined): StudyMode => {
  if (!value) return 'flip';
  if (value === 'write' || value === 'type') return 'multiple-choice';
  if (value === 'flip' || value === 'multiple-choice' || value === 'fill-blank' || value === 'assisted') return value;
  return 'flip';
};

const FlashcardsOptionsPanel = dynamic(() => import('@/components/tools/flashcards-options-panel').then(m => m.FlashcardsOptionsPanel), { ssr: false });

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
  // Practice mode — mirrors quiz's classic/assisted/adaptive triad (feedback timing + difficulty), separate from the interaction type below
  const [practiceMode, setPracticeMode] = useState<'classic' | 'assisted' | 'adaptive'>('classic');
  const [cardStartSide, setCardStartSide] = useState<'term' | 'explanation'>('term');
  const [flashcardCount, setFlashcardCount] = useState(10);
  const [knowledgeScore, setKnowledgeScore] = useState(50);
  const [currentView, setCurrentView] = useState<'setup' | 'study'>('setup');
  const [customTitle, setCustomTitle] = useState('');
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [saveToRecents, setSaveToRecents] = useState(true);
  const [explanationMode, setExplanationMode] = useState<'literal' | 'research'>('literal');
  const [studyCompleted, setStudyCompleted] = useState(false);
  const [isSharingToClass, setIsSharingToClass] = useState(false);
  const [contentClass, setContentClass] = useState<ContentClassification | null>(null);
  const [enabledCardTypes, setEnabledCardTypes] = useState<string[]>(['term-definition']);
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



  const visibleCardTypes = React.useMemo<FlashcardTypeDefinition[]>(
    () => FLASHCARD_TYPE_VALUES
      .filter(
        (def) =>
          (!def.requiresResearchMode || explanationMode === 'research') &&
          isFlashcardTypeAvailable(def.value, contentClass)
      )
      .map((def) => ({ ...def, ...t.flashcards.cardTypes[def.value] })),
    [contentClass, explanationMode, t]
  );

  useEffect(() => {
    setEnabledCardTypes((prev) => {
      const allowed = prev.filter((v) => visibleCardTypes.some((t) => t.value === v));
      return allowed.length > 0 ? allowed : ['term-definition'];
    });
  }, [visibleCardTypes]);

  const toggleCardType = (value: string) => {
    setEnabledCardTypes((prev) => {
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      return next.length > 0 ? next : prev;
    });
  };

  const resolveComputeClass = (requestedCount: number): 'light' | 'standard' | 'heavy' => {
    const budget = advancedSettings?.safety.performance_budget || 'auto';
    if (budget === 'low') return 'light';
    if (budget === 'medium') return requestedCount > 24 ? 'standard' : 'light';
    if (budget === 'high') return requestedCount > 16 ? 'heavy' : 'standard';
    return requestedCount > 20 ? 'heavy' : 'standard';
  };

  // Generate title from first few words/keywords of source text
  const autoGenerateTitle = (text: string): string => {
    const words = text.trim().split(/\s+/).slice(0, 4).join(' ');
    return words.length > 0 ? words : 'Generated Flashcards';
  };

  // Determine cardStartSide dynamically based on content classification
  const determineCardStartSide = (): 'term' | 'explanation' => {
    return contentClass?.vocabulary === 'y' ? 'term' : 'explanation';
  };

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
      const requestedTitle = overrides?.title || customTitle.trim() || autoGenerateTitle(text);
      const dynamicCardStartSide = determineCardStartSide();

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
            knowledgeScore,
            educationLevel: schoolingLevel,
            regionCode: String(region || 'global').toUpperCase(),
            studyMode: requestedMode,
            explanationMode,
            cardStartSide: dynamicCardStartSide,
            includeCitations: true,
            includeHints: true,
            includeAssistedHints: requestedMode === 'assisted',
            enabledTypes: enabledCardTypes,
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
      setCardStartSide(dynamicCardStartSide);
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
  }, [advancedSettings, customTitle, enabledCardTypes, explanationMode, flashcardCount, imageDataUri, knowledgeScore, language, region, saveToRecents, schoolingLevel, studyMode, t.flashcards.generatingTitle, toast, contentClass]);

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
    if (s('count') && !Number.isNaN(Number(s('count')))) setFlashcardCount(Number(s('count')));
    if (s('knowledgeScore') && !Number.isNaN(Number(s('knowledgeScore')))) setKnowledgeScore(Math.max(0, Math.min(100, Number(s('knowledgeScore')))));
    if (s('saveToRecents') === 'false') setSaveToRecents(false);
    if (s('explanationMode') === 'research') setExplanationMode('research');
    const storedTypes = s('enabledCardTypes');
    if (storedTypes) {
      try {
        const parsed = JSON.parse(storedTypes);
        if (Array.isArray(parsed) && parsed.length > 0) setEnabledCardTypes(parsed);
      } catch {
        // ignore malformed value
      }
    }
  }, []);

  useEffect(() => { localStorage.setItem('tools.flashcards.mode', studyMode); }, [studyMode]);
  useEffect(() => { localStorage.setItem('tools.flashcards.count', String(flashcardCount)); }, [flashcardCount]);
  useEffect(() => { localStorage.setItem('tools.flashcards.knowledgeScore', String(knowledgeScore)); }, [knowledgeScore]);
  useEffect(() => { localStorage.setItem('tools.flashcards.saveToRecents', String(saveToRecents)); }, [saveToRecents]);
  useEffect(() => { localStorage.setItem('tools.flashcards.explanationMode', explanationMode); }, [explanationMode]);
  useEffect(() => { localStorage.setItem('tools.flashcards.enabledCardTypes', JSON.stringify(enabledCardTypes)); }, [enabledCardTypes]);

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
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'literal' ? t.flashcards.panel.literalToggle : t.flashcards.panel.researchToggle}
          </button>
        ))}
        {/* Info tooltip */}
        <InfoTooltip side="bottom" contentClassName="max-w-[240px]">
          <p>{t.flashcards.panel.literalTooltip}</p>
          <p>{t.flashcards.panel.researchTooltip}</p>
        </InfoTooltip>
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
              <h1 className="text-2xl tracking-tight">{t.flashcards.panel.createTitle}</h1>
              <p className="text-sm text-muted-foreground">
                {t.flashcards.panel.pasteSubtitle}
              </p>
            </div>
            <ToolInputBox
              toolId="flashcards"
              placeholder={t.sourceInputPlaceholder}
              onSourceChange={(text) => setSourceText(text)}
              onImageDataUriChange={setImageDataUri}
              onSubmit={(compiledText) => {
                setSourceText(compiledText);
                setCustomTitle(autoGenerateTitle(compiledText));
                setPhase('options');
              }}
              isLoading={false}
              submitLabel={t.flashcards.panel.nextButton}
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
        <PageHeader title={t.flashcards.panel.studyTitle} hideBreadcrumb />
        <NotesReminder topicId="flashcard-study" topicName="Flashcard topic" />
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
                explanationMode,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // OPTIONS PHASE — Settings Rail layout (mirrors quiz's renderOptions)
  if (phase === 'options') {
    const profileName = (() => {
      if (typeof window !== 'undefined') {
        const saved = String(window.localStorage.getItem('studyweb-display-name') || '').trim();
        if (saved) return saved;
      }
      const meta = (appContext as any)?.session?.user?.user_metadata;
      return String(meta?.display_name || meta?.full_name || (appContext as any)?.session?.user?.email?.split('@')[0] || 'User');
    })();

    return (
      <FlashcardsOptionsPanel
        appContext={appContext}
        profileName={profileName}
        panel={t.flashcards.panel}
        generateLabel={t.flashcards.generate}
        phase={phase}
        setPhase={setPhase}
        setSourceText={setSourceText}
        customTitle={customTitle}
        setCustomTitle={setCustomTitle}
        knowledgeScore={knowledgeScore}
        setKnowledgeScore={setKnowledgeScore}
        practiceMode={practiceMode}
        setPracticeMode={setPracticeMode}
        flashcardCount={flashcardCount}
        setFlashcardCount={setFlashcardCount}
        isLoading={isLoading}
        sourceText={sourceText}
        visibleCardTypes={visibleCardTypes}
        enabledCardTypes={enabledCardTypes}
        toggleCardType={toggleCardType}
        contentClass={contentClass}
        saveAdvancedSettingsPatch={saveAdvancedSettingsPatch}
        handleGenerate={handleGenerate}
        autoGenerateTitle={autoGenerateTitle}
      />
    );
  }

  // Fallback (should not reach here if all phases are covered)
  return (
    <div className="h-full flex items-center justify-center">
      <Spinner size={28} />
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
