'use client';

import React, { useState, useEffect, Suspense, useContext, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { ChevronLeft, Copy, Loader2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
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
import { PillSelector } from '@/components/tools/pill-selector';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { ExportToolbar } from '@/components/tools/export-toolbar';
import { flashcardsToMarkdown, flashcardsToHtml } from '@/lib/export-formatters';
import { ImportToolbar } from '@/components/tools/import-toolbar';
import { parseFlashcardsFromMarkdown, parseFlashcardsFromHtml } from '@/lib/import-parsers';
import { getToolStrings } from '@/lib/tool-i18n';
import { Switch } from '@/components/ui/switch';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useAdvancedToolSettings } from '@/hooks/use-advanced-tool-settings';
import { detectAdvancedSettingsConflicts } from '@/lib/tools/advanced-settings-schema';
import { SendToClassButton } from '@/components/tools/send-to-class-button';
import { extractShareableClasses } from '@/lib/classes/shareable-classes';
import { postClassShareItem } from '@/lib/class-share/client';
import { classifyContent, isFlashcardTypeAvailable } from '@/lib/tools/content-classifier';
import type { ContentClassification } from '@/lib/tools/content-classifier';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonGroup, SkeletonCard } from '@/components/ui/skeleton';

type Phase = 'input' | 'options' | 'study';

type FlashcardTypeDefinition = {
  value:
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
  label: string;
  description: string;
  requiresResearchMode?: boolean;
  requiresFlag?: string; // content classifier flag that must be 'y'
};

const FLASHCARD_TYPE_DEFINITIONS: FlashcardTypeDefinition[] = [
  {
    value: 'term-definition',
    label: 'Term & Definition',
    description: 'A term/cue fragment on one side, a matching description fragment on the other',
  },
  {
    value: 'multiple-choice',
    label: 'Multiple Choice',
    description: 'Same term/cue fragment, but the back is also offered as answer choices to pick from',
  },
  {
    value: 'true-false',
    label: 'True / False',
    description: 'A short statement on the front, whether it is true or false on the back',
  },
  {
    value: 'cloze',
    label: 'Cloze (Fill in the Blank)',
    description: 'A sentence with the key term replaced by a blank — fill in the missing word',
  },
  {
    value: 'example-sentence',
    label: 'Example Sentence',
    description: 'A sentence using the term in context with the term blanked out',
  },
  {
    value: 'compare-pair',
    label: 'Compare Pair',
    description: 'Names two related items, the key distinguishing fact between them on the back',
  },
  {
    value: 'mnemonic',
    label: 'Mnemonic',
    description: 'Same term/definition fragment, plus a memory aid (association, rhyme, image cue)',
  },
  {
    value: 'formula',
    label: 'Formula',
    description: 'Front names a formula/law/equation, back is the expression itself',
  },
  {
    value: 'process-step',
    label: 'Process Step',
    description: 'Front names a step in a sequence, back is what happens during that step',
  },
  {
    value: 'date-event',
    label: 'Date & Event',
    description: 'A date or period on one side, the matching event on the other',
  },
  {
    value: 'reversed-direction',
    label: 'Reversed Direction',
    description: 'Same term/definition fragment, flagged to also be studied back-to-front',
  },
  {
    value: 'image-card',
    label: 'Image Card',
    description: 'Front shows a photo of the term, back is a short description — only available in Research mode',
    requiresResearchMode: true,
  },
];

const normalizeStudyMode = (value: string | null | undefined): StudyMode => {
  if (!value) return 'flip';
  if (value === 'write' || value === 'type') return 'multiple-choice';
  if (value === 'flip' || value === 'multiple-choice' || value === 'fill-blank' || value === 'assisted') return value;
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
  const [knowledgeScore, setKnowledgeScore] = useState(50);
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
  const [enabledCardTypes, setEnabledCardTypes] = useState<string[]>(['term-definition']);
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
        .filter((option) => option.value === 'flip' || option.value === 'multiple-choice' || option.value === 'assisted')
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

  const visibleCardTypes = React.useMemo(
    () => FLASHCARD_TYPE_DEFINITIONS.filter(
      (def) =>
        (!def.requiresResearchMode || explanationMode === 'research') &&
        isFlashcardTypeAvailable(def.value, contentClass)
    ),
    [contentClass, explanationMode]
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
            knowledgeScore,
            educationLevel: schoolingLevel,
            regionCode: String(region || 'global').toUpperCase(),
            studyMode: requestedMode,
            explanationMode,
            includeCitations: showCitations,
            includeHints: mnemonicHints,
            includeAssistedHints: mnemonicHints && requestedMode === 'assisted',
            enabledTypes: enabledCardTypes,
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
  }, [activeRecallOnly, advancedSettings, autoFlipDelayMs, customTitle, enabledCardTypes, errorTagging, explanationMode, flashcardCount, imageDataUri, interleavingMode, knowledgeScore, language, memoryStrengthMeter, mnemonicHints, region, saveToRecents, schoolingLevel, semanticLinking, showCitations, studyMode, t.flashcards.generatingTitle, timePerCardSeconds, toast]);

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
    if (s('knowledgeScore') && !Number.isNaN(Number(s('knowledgeScore')))) setKnowledgeScore(Math.max(0, Math.min(100, Number(s('knowledgeScore')))));
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
  useEffect(() => { localStorage.setItem('tools.flashcards.cardStartSide', cardStartSide); }, [cardStartSide]);
  useEffect(() => { localStorage.setItem('tools.flashcards.count', String(flashcardCount)); }, [flashcardCount]);
  useEffect(() => { localStorage.setItem('tools.flashcards.knowledgeScore', String(knowledgeScore)); }, [knowledgeScore]);
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
  useEffect(() => { localStorage.setItem('tools.flashcards.enabledCardTypes', JSON.stringify(enabledCardTypes)); }, [enabledCardTypes]);

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
        <InfoTooltip side="bottom" contentClassName="max-w-[240px]">
          <p><span className="text-foreground">Literal</span> — cards stick to exactly what's explicitly in your text.</p>
          <p><span className="text-foreground">Research</span> — cards may connect ideas beyond your text, and explain their reasoning on each card.</p>
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
              <h1 className="text-2xl tracking-tight">Create Flashcards</h1>
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

    const S = 'text-[14px] text-foreground/90';

    return (
      <div className="h-full flex flex-col">

        {/* Breadcrumb — full-width, height = collapsed sidebar width (3.5rem), rounded-b-2xl */}
        <div className="shrink-0 w-full bg-sidebar rounded-b-2xl">
          <div className="flex min-h-[3.5rem] items-center gap-0 px-3 text-[13px] font-medium leading-none text-sidebar-foreground">
            <button
              type="button"
              className="text-sidebar-foreground/55 hover:text-[var(--accent-brand)] transition-colors"
              onClick={() => window.dispatchEvent(new Event('cautie:open-profile-menu'))}
            >
              {profileName}
            </button>
            <span className="mx-2 text-sidebar-foreground/25 select-none">/</span>
            <span className="inline-flex items-center gap-1.5 text-sidebar-foreground">
              <Copy className="h-3.5 w-3.5 text-sidebar-foreground/55" />
              Flashcards
            </span>
          </div>
        </div>

        {/* Body: card types (left) + settings rail (right) */}
        <div className="flex flex-1 overflow-hidden bg-background">

          {/* ── Left: Card Types accordion ── */}
          <div className="flex-1 overflow-y-auto bg-background m-3 rounded-lg">
            <div className="p-4 pb-2">
              <div className="flex items-center justify-between mb-2.5">
                <p className={S}>Card Types</p>
                <span className="text-[11px] text-muted-foreground">{enabledCardTypes.length} selected</span>
              </div>
            </div>

            <div className="mx-4 mb-4 rounded-lg border border-border/60 overflow-visible bg-card">
              {visibleCardTypes.map((typeDef, idx, arr) => {
                const isSelected = enabledCardTypes.includes(typeDef.value);
                const isFirst = idx === 0;
                const isLast = idx === arr.length - 1;
                return (
                  <div
                    key={typeDef.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleCardType(typeDef.value)}
                    onKeyDown={(e) => e.key === 'Enter' && toggleCardType(typeDef.value)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b border-border/40 last:border-b-0 transition-all ${isFirst ? 'rounded-t-lg' : ''} ${isLast ? 'rounded-b-lg' : ''} ${isSelected ? 'bg-[var(--accent-brand)]/10' : 'hover:bg-muted/40'}`}
                  >
                    <div
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected
                          ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]'
                          : 'border-muted-foreground/25 hover:border-[var(--accent-brand)]/50'
                      }`}
                    >
                      {isSelected && <span className="block h-[6px] w-[6px] rounded-full bg-white" />}
                    </div>
                    <span className={`text-[13px] flex-1 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {typeDef.label}
                    </span>
                    <InfoTooltip contentClassName="max-w-[224px]">
                      {typeDef.description}
                    </InfoTooltip>
                  </div>
                );
              })}
            </div>
            <p className="mx-4 mb-4 text-[11px] text-muted-foreground/70">The AI picks the best-fitting type per card from your selection — cards stay as term/cue fragments, never phrased as quiz questions.</p>

            {/* Content classification tags */}
            {contentClass && (
              <div className="mx-4 mb-4 flex flex-wrap gap-1.5">
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

            {/* Card extras: citations, hints */}
            <div className="mx-4 mb-4 rounded-lg border border-border/60 bg-card px-3 py-3 space-y-3">
              <p className={S}>Card Extras</p>

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

            {/* Advanced settings */}
            <div className="mx-4 mb-4 rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
              <p className={S}>Advanced Options</p>
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

          {/* ── Right rail: Settings ── */}
          <div className="w-[280px] shrink-0 bg-background m-3 ml-0 rounded-lg overflow-y-auto">
            <div className="p-3 space-y-3">

              {/* Title */}
              <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className={S}>Flashcards title (optional)</p>
                  <InfoTooltip contentClassName="max-w-[224px]">
                    Give your flashcard set a name. This appears in your results.
                  </InfoTooltip>
                </div>
                <Input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="h-8 text-[13px] border-border/30"
                  placeholder="e.g. Chapter 4 — Photosynthesis"
                  disabled={isLoading}
                />
              </div>

              {/* Knowledge Level */}
              <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className={S}>How much do you already know?</p>
                </div>
                <Slider
                  value={[knowledgeScore]}
                  onValueChange={([v]) => setKnowledgeScore(v)}
                  min={0} max={100} step={1}
                  disabled={isLoading}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Nothing</span><span>A lot</span>
                </div>
              </div>

              {/* Study Mode */}
              <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  <p className={S}>What study mode do you want?</p>
                  <InfoTooltip contentClassName="max-w-[200px]">
                    {modeOptions.map((option) => (
                      <p key={option.value}><span className="text-foreground">{option.label}</span> — {option.description}</p>
                    ))}
                  </InfoTooltip>
                </div>
                <div className="space-y-1">
                  {modeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStudyMode(normalizeStudyMode(option.value))}
                      disabled={isLoading}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors text-[13px] border ${
                        studyMode === option.value
                          ? 'border-[var(--accent-brand)]/30 bg-[var(--accent-brand)]/10 text-foreground'
                          : 'border-transparent text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${studyMode === option.value ? 'bg-[var(--accent-brand)]' : 'bg-muted-foreground/30'}`} />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Side */}
              <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  <p className={S}>Which side comes first?</p>
                </div>
                <div className="flex gap-1.5">
                  {startSideOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCardStartSide(option.value === 'explanation' ? 'explanation' : 'term')}
                      disabled={isLoading}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-[12px] transition-colors ${
                        cardStartSide === option.value
                          ? 'border-[var(--accent-brand)]/40 bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]'
                          : 'border-border/30 bg-transparent text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Count */}
              <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className={S}>How many cards?</p>
                  <span className="text-[13px] font-medium text-[var(--accent-brand)]">{flashcardCount}</span>
                </div>
                <Slider
                  value={[flashcardCount]}
                  onValueChange={([v]) => setFlashcardCount(v)}
                  min={1} max={50} step={1}
                  disabled={isLoading}
                />
              </div>

              {/* Save to recents */}
              <div className="rounded-lg border border-border/60 bg-card px-3 py-3 flex items-center justify-between gap-3">
                <p className={S}>Save to Recents</p>
                <Switch
                  checked={saveToRecents}
                  onCheckedChange={setSaveToRecents}
                />
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border/60 bg-background px-5 py-3.5 flex justify-between items-center gap-3">
          <Button
            variant="outline"
            className="relative h-9 ps-10 pe-4 text-[13px]"
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
            className="h-9 bg-[var(--accent-brand)] px-5 text-[13px] text-white hover:opacity-90"
            onClick={() => {
              setPhase('study');
              void handleGenerate(sourceText);
            }}
            disabled={isLoading || !sourceText.trim()}
          >
            {isLoading ? (
              <><Spinner size={14} className="mr-2" />Generating...</>
            ) : (
              <><Copy className="mr-2 h-3.5 w-3.5" />Generate Flashcards</>
            )}
          </Button>
        </div>
      </div>
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
