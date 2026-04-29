'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect, Suspense, useCallback, useContext, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { Loader2 } from 'lucide-react';
import { FunLoader } from '@/components/tools/fun-loader';
import type { QuizMode } from '@/components/tools/quiz-taker';
import { AppContext } from '@/contexts/app-context';
import type { Quiz } from '@/lib/types';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SourceInput } from '@/components/tools/source-input';
import { PillSelector } from '@/components/tools/pill-selector';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useAdvancedToolSettings } from '@/hooks/use-advanced-tool-settings';
import { ExportToolbar } from '@/components/tools/export-toolbar';
import { quizToMarkdown, quizToHtml } from '@/lib/export-formatters';
import { ImportToolbar } from '@/components/tools/import-toolbar';
import { parseQuizFromMarkdown, parseQuizFromHtml } from '@/lib/import-parsers';
import { getToolStrings } from '@/lib/tool-i18n';
import { Switch } from '@/components/ui/switch';
import { detectAdvancedSettingsConflicts } from '@/lib/tools/advanced-settings-schema';

const QuizTaker = dynamic(
  () => import('@/components/tools/quiz-taker').then((m) => m.QuizTaker),
  { ssr: false }
);
const QuizDuel = dynamic(
  () => import('@/components/tools/quiz-duel').then((m) => m.QuizDuel),
  { ssr: false }
);

const VALID_QUIZ_MODES: QuizMode[] = ['normal', 'practice', 'exam', 'adaptive', 'duel'];
type KnowledgeLevel = 'beginner' | 'intermediate' | 'advanced';

function normalizeQuizMode(value: string | null | undefined): QuizMode {
  const next = String(value || '').trim().toLowerCase();
  if (next === 'classic') return 'practice';
  if ((VALID_QUIZ_MODES as string[]).includes(next)) return next as QuizMode;
  return 'practice';
}

function QuizPageContent() {
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
  const { run: savedRun, isLoading: isLoadingRun } = useSavedRun(runId);
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const region = appContext?.region ?? 'global';
  const schoolingLevel = appContext?.schoolingLevel ?? 2;
  const t = getToolStrings(language);

  const [sourceText, setSourceText] = useState(sourceTextFromParams || '');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');
  const [questionCount, setQuestionCount] = useState(7);
  const [questionType, setQuestionType] = useState('mixed');
  const [knowledgeLevel, setKnowledgeLevel] = useState<KnowledgeLevel>('intermediate');
  const [currentView, setCurrentView] = useState<'setup' | 'take' | 'duel'>('setup');
  const [customTitle, setCustomTitle] = useState('');
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [saveToRecents, setSaveToRecents] = useState(true);
  const [includeImages, setIncludeImages] = useState(false);
  const [sourceBackedDepth, setSourceBackedDepth] = useState(false);
  const [adaptiveGoal, setAdaptiveGoal] = useState<'balanced' | 'speed' | 'mastery'>('balanced');
  const [answerRevisionWindowSeconds, setAnswerRevisionWindowSeconds] = useState(5);
  const [scoringModel, setScoringModel] = useState<'accuracy' | 'speed_weighted' | 'negative_marking' | 'mastery_points'>('accuracy');
  const [timebankSystem, setTimebankSystem] = useState(false);
  const [progressiveUnlock, setProgressiveUnlock] = useState(false);
  const [progressiveUnlockStreak, setProgressiveUnlockStreak] = useState(4);
  const [questionDecay, setQuestionDecay] = useState(true);
  const [confidenceScoring, setConfidenceScoring] = useState(false);
  const [isSharingToClass, setIsSharingToClass] = useState(false);
  const launchHandledRef = useRef(false);
  const sourceParamsHandledRef = useRef(false);
  const advancedHydratedRef = useRef(false);
  const { toast } = useToast();
  const {
    settings: advancedSettings,
    conflicts: advancedConflicts,
    savePatch: saveAdvancedSettingsPatch,
  } = useAdvancedToolSettings();

  const resolveComputeClass = (requestedCount: number): 'light' | 'standard' | 'heavy' => {
    const budget = advancedSettings?.safety.performance_budget || 'auto';
    if (budget === 'low') return 'light';
    if (budget === 'medium') return requestedCount > 24 ? 'standard' : 'light';
    if (budget === 'high') return requestedCount > 16 ? 'heavy' : 'standard';
    return requestedCount > 20 ? 'heavy' : 'standard';
  };

  const handleGenerate = useCallback(async (
    text: string,
    overrides?: Partial<{
      mode: QuizMode;
      questionCount: number;
      questionType: string;
      title: string;
    }>
  ) => {
    if (!text.trim()) return;
    if (advancedSettings?.safety.offline_mode && typeof navigator !== 'undefined' && !navigator.onLine) {
      toast({
        variant: 'destructive',
        title: t.quiz.generatingTitle,
        description: 'Offline mode is enabled and no connection is available.',
      });
      return;
    }
    setIsLoading(true);
    setGeneratedQuiz(null);
    try {
        const requestedMode = overrides?.mode || quizMode;
      const requestedQuestionCount = overrides?.questionCount ?? questionCount;
      const requestedQuestionType = overrides?.questionType || questionType;
      const requestedTitle = overrides?.title || customTitle.trim() || 'Generated Quiz';
      const effectiveSettings = advancedSettings;
      if (effectiveSettings?.safety.setting_conflict_detector) {
        const conflicts = detectAdvancedSettingsConflicts(effectiveSettings, {
          tool: 'quiz',
          isLiveGeneratedQuiz: true,
        });
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

      if (requestedMode === 'duel') {
        setCurrentView('duel');
      } else {
        const count = requestedMode === 'adaptive' ? 1 : requestedQuestionCount;
        const run = await runToolFlowV2({
          toolId: 'quiz',
          flowName: 'generateQuiz',
          mode: requestedMode,
          artifactType: 'quiz',
          artifactTitle: requestedTitle,
          options: { saveToRecents },
          persistArtifact: saveToRecents,
          input: {
            sourceText: text,
            imageDataUri: imageDataUri || undefined,
            questionCount: count,
            language,
            regionCode: String(region || 'global').toUpperCase(),
            educationLevel: schoolingLevel,
            questionType: requestedQuestionType,
            knowledgeLevel,
            includeImages,
            sourceBackedDepth,
            answerRevisionWindowSeconds,
            scoringModel,
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
              timelineEmbedMode: Boolean(advancedSettings?.visuals.timeline_embed_mode),
              customDiagramGeneration: Boolean(advancedSettings?.visuals.custom_diagram_generation),
              progressiveReveal: Boolean(advancedSettings?.visuals.progressive_reveal),
              focusMode: Boolean(advancedSettings?.visuals.focus_mode),
              interactionRequired: Boolean(advancedSettings?.visuals.interaction_required),
              autoSimplification: Boolean(advancedSettings?.visuals.auto_simplification),
              spatialQuizMode: Boolean(advancedSettings?.visuals.spatial_quiz_mode),
            },
            adaptiveTimer: {
              enabled: Boolean(advancedSettings?.adaptiveTimer.enabled),
              baseSeconds: advancedSettings?.adaptiveTimer.base_seconds,
              goal: adaptiveGoal,
              readingSpeedWpm: advancedSettings?.adaptiveTimer.reading_speed_wpm,
              knownTopicDiscountPct: advancedSettings?.adaptiveTimer.known_topic_discount_pct,
              uncertainTopicBonusPct: advancedSettings?.adaptiveTimer.uncertain_topic_bonus_pct,
              mediaBonusSeconds: advancedSettings?.adaptiveTimer.media_bonus_seconds,
              minSeconds: advancedSettings?.adaptiveTimer.min_seconds,
              maxSeconds: advancedSettings?.adaptiveTimer.max_seconds,
              fatigueDetection: advancedSettings?.adaptiveTimer.fatigue_detection,
              hesitationDetection: advancedSettings?.adaptiveTimer.hesitation_detection,
              deviceAdjustment: advancedSettings?.adaptiveTimer.device_adjustment,
            },
          },
          computeClass: resolveComputeClass(count),
        });
        const response = run?.output_payload || run;
        setGeneratedQuiz(response as Quiz);
        setCurrentView('take');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        variant: 'destructive',
        title: t.quiz.generatingTitle,
        description: (error as any)?.message || 'Unable to generate quiz',
        errorCode: (error as any)?.code ? String((error as any).code) : undefined,
      });
      setCurrentView('setup');
    } finally {
      setIsLoading(false);
    }
  }, [customTitle, imageDataUri, language, region, schoolingLevel, questionCount, questionType, quizMode, saveToRecents, knowledgeLevel, includeImages, sourceBackedDepth, answerRevisionWindowSeconds, scoringModel, advancedSettings, adaptiveGoal, t.quiz.generatingTitle, toast]);

  useEffect(() => {
    if (!sourceTextFromParams || isAssignmentContext || sourceParamsHandledRef.current) return;
    sourceParamsHandledRef.current = true;
    void handleGenerate(sourceTextFromParams);
  }, [sourceTextFromParams, isAssignmentContext, handleGenerate]);

  useEffect(() => {
    if (!launchRequested || !taskId || !studysetId || launchHandledRef.current) return;
    launchHandledRef.current = true;
    console.info('[STUDYSET_LAUNCH][QUIZ] launch requested', {
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
        const preset = payload?.launch?.quizPreset || {};
        const title = String(payload?.launch?.artifactTitle || '').trim();
        console.info('[STUDYSET_LAUNCH][QUIZ] launch payload loaded', {
          taskId,
          studysetId,
          sourceLength: source.length,
          preset,
          hasTitle: Boolean(title),
        });

        if (source) setSourceText(source);
        if (preset?.mode) setQuizMode(normalizeQuizMode(String(preset.mode)));
        if (typeof preset?.questionCount === 'number') setQuestionCount(preset.questionCount);
        if (preset?.questionType) setQuestionType(String(preset.questionType));
        if (title) setCustomTitle(title);

        if (source) {
          await handleGenerate(source, {
            mode: normalizeQuizMode(String(preset?.mode || 'practice')),
            questionCount: typeof preset?.questionCount === 'number' ? preset.questionCount : undefined,
            questionType: preset?.questionType ? String(preset.questionType) : undefined,
            title: title || undefined,
          });
          console.info('[STUDYSET_LAUNCH][QUIZ] generation completed', { taskId, studysetId });
        }
      } catch (error: any) {
        console.error('[STUDYSET_LAUNCH][QUIZ] launch failed', {
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
      setGeneratedQuiz(output as Quiz);
      setCurrentView('take');
      if (savedRun.input_payload?.sourceText) setSourceText(savedRun.input_payload.sourceText);
      if (savedRun.mode) setQuizMode(normalizeQuizMode(savedRun.mode));
    }
  }, [savedRun]);

  useEffect(() => {
    const s = (k: string) => localStorage.getItem(`tools.quiz.${k}`);
    if (s('mode')) setQuizMode(normalizeQuizMode(s('mode')));
    if (s('count') && !Number.isNaN(Number(s('count')))) setQuestionCount(Number(s('count')));
    if (s('questionType')) setQuestionType(s('questionType')!);
    if (s('knowledgeLevel') === 'beginner' || s('knowledgeLevel') === 'intermediate' || s('knowledgeLevel') === 'advanced') {
      setKnowledgeLevel(s('knowledgeLevel') as KnowledgeLevel);
    }
    if (s('includeImages') === 'true') setIncludeImages(true);
    if (s('sourceBackedDepth') === 'true') setSourceBackedDepth(true);
    if (s('saveToRecents') === 'false') setSaveToRecents(false);
  }, []);

  useEffect(() => { localStorage.setItem('tools.quiz.mode', quizMode); }, [quizMode]);
  useEffect(() => { localStorage.setItem('tools.quiz.count', String(questionCount)); }, [questionCount]);
  useEffect(() => { localStorage.setItem('tools.quiz.questionType', questionType); }, [questionType]);
  useEffect(() => { localStorage.setItem('tools.quiz.knowledgeLevel', knowledgeLevel); }, [knowledgeLevel]);
  useEffect(() => { localStorage.setItem('tools.quiz.includeImages', String(includeImages)); }, [includeImages]);
  useEffect(() => { localStorage.setItem('tools.quiz.sourceBackedDepth', String(sourceBackedDepth)); }, [sourceBackedDepth]);
  useEffect(() => { localStorage.setItem('tools.quiz.saveToRecents', String(saveToRecents)); }, [saveToRecents]);
  useEffect(() => { localStorage.setItem('tools.quiz.answerRevisionWindowSeconds', String(answerRevisionWindowSeconds)); }, [answerRevisionWindowSeconds]);
  useEffect(() => { localStorage.setItem('tools.quiz.scoringModel', scoringModel); }, [scoringModel]);
  useEffect(() => { localStorage.setItem('tools.quiz.adaptiveGoal', adaptiveGoal); }, [adaptiveGoal]);
  useEffect(() => { localStorage.setItem('tools.quiz.timebankSystem', String(timebankSystem)); }, [timebankSystem]);
  useEffect(() => { localStorage.setItem('tools.quiz.progressiveUnlock', String(progressiveUnlock)); }, [progressiveUnlock]);
  useEffect(() => { localStorage.setItem('tools.quiz.progressiveUnlockStreak', String(progressiveUnlockStreak)); }, [progressiveUnlockStreak]);
  useEffect(() => { localStorage.setItem('tools.quiz.questionDecay', String(questionDecay)); }, [questionDecay]);
  useEffect(() => { localStorage.setItem('tools.quiz.confidenceScoring', String(confidenceScoring)); }, [confidenceScoring]);

  useEffect(() => {
    const s = (k: string) => localStorage.getItem(`tools.quiz.${k}`);
    if (s('answerRevisionWindowSeconds') && !Number.isNaN(Number(s('answerRevisionWindowSeconds')))) {
      setAnswerRevisionWindowSeconds(Number(s('answerRevisionWindowSeconds')));
    }
    const sm = s('scoringModel');
    if (sm === 'accuracy' || sm === 'speed_weighted' || sm === 'negative_marking' || sm === 'mastery_points') {
      setScoringModel(sm);
    }
    const ag = s('adaptiveGoal');
    if (ag === 'balanced' || ag === 'speed' || ag === 'mastery') setAdaptiveGoal(ag);
    if (s('timebankSystem') === 'true') setTimebankSystem(true);
    if (s('progressiveUnlock') === 'true') setProgressiveUnlock(true);
    if (s('progressiveUnlockStreak') && !Number.isNaN(Number(s('progressiveUnlockStreak')))) setProgressiveUnlockStreak(Number(s('progressiveUnlockStreak')));
    if (s('questionDecay') === 'false') setQuestionDecay(false);
    if (s('confidenceScoring') === 'true') setConfidenceScoring(true);
  }, []);

  useEffect(() => {
    if (!advancedSettings || advancedHydratedRef.current) return;
    advancedHydratedRef.current = true;
    setAnswerRevisionWindowSeconds(Number(advancedSettings.quiz.answer_revision_window_seconds || 0));
    setScoringModel(advancedSettings.quiz.scoring_model as typeof scoringModel);
    setTimebankSystem(Boolean(advancedSettings.quiz.timebank_system));
    setProgressiveUnlock(Boolean(advancedSettings.quiz.progressive_unlock));
    setProgressiveUnlockStreak(Number(advancedSettings.quiz.progressive_unlock_streak || 4));
    setQuestionDecay(Boolean(advancedSettings.quiz.question_decay));
    setConfidenceScoring(Boolean(advancedSettings.quiz.confidence_scoring));
    setAdaptiveGoal((advancedSettings.adaptiveTimer.user_goal_alignment || 'balanced') as typeof adaptiveGoal);
  }, [advancedSettings]);

  const handleRestart = () => {
    setGeneratedQuiz(null);
    setCurrentView('setup');
    if (isAssignmentContext) {
      if (classId) router.push(`/class/${classId}`);
      else router.push('/classes');
    }
  };

  const handleShareToClass = useCallback(async () => {
    if (!classId || !generatedQuiz) return;
    setIsSharingToClass(true);
    try {
      const summary = `${generatedQuiz.questions?.length || 0} questions | mode: ${quizMode}`;
      const res = await fetch(`/api/classes/${classId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: 'teacher',
          text: `Shared quiz: ${customTitle.trim() || generatedQuiz.title || 'Untitled quiz'}`,
          attachmentLabel: summary,
        }),
      });
      if (!res.ok) throw new Error('Failed to share quiz');
      toast({ title: 'Shared to class', description: 'Quiz was posted in class share.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Share failed', description: error?.message || 'Could not share quiz.' });
    } finally {
      setIsSharingToClass(false);
    }
  }, [classId, customTitle, generatedQuiz, quizMode, toast]);

  if (isLoading) {
    return <FunLoader tool="quiz" />;
  }

  if (generatedQuiz && currentView === 'take') {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 md:p-4 flex items-center justify-between">
          <Button variant="ghost" onClick={handleRestart} className="rounded-full text-xs">{t.back}</Button>
          <ExportToolbar
            toolType="quiz"
            title={customTitle.trim() || generatedQuiz.title}
            getMarkdown={() => quizToMarkdown(generatedQuiz)}
            getHtml={() => quizToHtml(generatedQuiz)}
          />
          {classId ? (
            <Button variant="outline" onClick={() => void handleShareToClass()} className="rounded-full text-xs" disabled={isSharingToClass}>
              {isSharingToClass ? 'Sharing...' : 'Share to class'}
            </Button>
          ) : null}
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <QuizTaker
            quiz={generatedQuiz}
            mode={quizMode}
            sourceText={sourceText}
            onRestart={handleRestart}
            taskId={taskId || undefined}
            studysetId={studysetId || undefined}
            runtimeSettings={{
              answerRevisionWindowSeconds,
              timebankSystem,
              progressiveUnlock,
              progressiveUnlockStreak,
              questionDecay,
              confidenceScoring,
              scoringModel,
            }}
          />
        </div>
      </div>
    );
  }
  if (currentView === 'duel') {
    return <QuizDuel sourceText={sourceText} onRestart={handleRestart} />;
  }

  const sidebar = (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{t.title}</p>
        <Input
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          className="h-9 bg-[hsl(var(--background))] text-sm"
          disabled={isLoading}
        />
      </div>

      <PillSelector
        label={t.quiz.labels.mode}
        options={t.quiz.modeOptions.filter((option) => ['practice', 'normal', 'exam', 'adaptive', 'duel'].includes(option.value))}
        value={quizMode}
        onChange={(v) => setQuizMode(v as QuizMode)}
        disabled={isLoading}
      />

      <PillSelector label={t.quiz.labels.questionType} options={t.quiz.questionTypeOptions} value={questionType} onChange={setQuestionType} disabled={isLoading} />
      <PillSelector
        label="How much do you already know?"
        options={[
          { value: 'beginner', label: 'Beginner', description: 'Starts with basics' },
          { value: 'intermediate', label: 'Intermediate', description: 'Balanced depth' },
          { value: 'advanced', label: 'Advanced', description: 'Harder wording and nuance' },
        ]}
        value={knowledgeLevel}
        onChange={(v) => setKnowledgeLevel(v as KnowledgeLevel)}
        disabled={isLoading}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t.questions}</p>
          <span className="text-xs font-mono tabular-nums">{questionCount}</span>
        </div>
        <Slider
          value={[questionCount]}
          onValueChange={([v]) => setQuestionCount(v)}
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
      <div className="space-y-2 rounded-lg surface-interactive px-2.5 py-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Include images in questions</p>
          <Switch
            checked={includeImages}
            onCheckedChange={setIncludeImages}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Source-backed deep questions</p>
          <Switch
            checked={sourceBackedDepth}
            onCheckedChange={setSourceBackedDepth}
          />
        </div>
      </div>
      <PillSelector
        label="Scoring model"
        options={[
          { value: 'accuracy', label: 'Accuracy', description: 'Pure correctness based score.' },
          { value: 'speed_weighted', label: 'Speed weighted', description: 'Correctness plus time pressure bonus.' },
          { value: 'negative_marking', label: 'Negative marking', description: 'Wrong answers deduct score.' },
          { value: 'mastery_points', label: 'Mastery points', description: 'Progress-oriented skill score.' },
        ]}
        value={scoringModel}
        onChange={(v) => {
          const next = v as typeof scoringModel;
          setScoringModel(next);
          void saveAdvancedSettingsPatch({ quiz: { scoring_model: next } as any }, { tool: 'quiz' });
        }}
        disabled={isLoading}
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Answer revision window (seconds)</p>
          <span className="text-xs font-mono tabular-nums">{answerRevisionWindowSeconds}</span>
        </div>
        <Slider
          value={[answerRevisionWindowSeconds]}
          onValueChange={([v]) => {
            setAnswerRevisionWindowSeconds(v);
            void saveAdvancedSettingsPatch({ quiz: { answer_revision_window_seconds: v } as any }, { tool: 'quiz' });
          }}
          min={0}
          max={30}
          step={1}
          disabled={isLoading}
        />
      </div>
      <PillSelector
        label="Adaptive timer goal"
        options={[
          { value: 'balanced', label: 'Balanced', description: 'Mix speed and mastery constraints.' },
          { value: 'speed', label: 'Speed', description: 'Aggressive timer profile with tighter pacing.' },
          { value: 'mastery', label: 'Mastery', description: 'More generous timing for depth.' },
        ]}
        value={adaptiveGoal}
        onChange={(v) => {
          const next = v as typeof adaptiveGoal;
          setAdaptiveGoal(next);
          void saveAdvancedSettingsPatch({ adaptiveTimer: { user_goal_alignment: next } as any }, { tool: 'quiz' });
        }}
        disabled={isLoading}
      />
      <div className="rounded-lg surface-interactive px-2.5 py-2 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Adaptive timer</p>
          <Switch
            checked={Boolean(advancedSettings?.adaptiveTimer.enabled)}
            onCheckedChange={(checked) => {
              void saveAdvancedSettingsPatch({ adaptiveTimer: { enabled: checked } as any }, { tool: 'quiz' });
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Speedrun mode (curated sets only)</p>
          <Switch
            checked={Boolean(advancedSettings?.speedrun.mode_enabled)}
            onCheckedChange={(checked) => {
              void saveAdvancedSettingsPatch({ speedrun: { mode_enabled: checked, curated_only: true } as any }, { tool: 'quiz', isLiveGeneratedQuiz: true });
            }}
          />
        </div>
        {advancedConflicts.length > 0 ? (
          <div className="space-y-1">
            {advancedConflicts.slice(0, 2).map((conflict) => (
              <p key={`${conflict.key}-${conflict.message}`} className="text-[11px] text-muted-foreground">
                {conflict.message}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <div className="space-y-2 rounded-lg surface-interactive px-2.5 py-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Timebank system</p>
          <Switch checked={timebankSystem} onCheckedChange={(checked) => {
            setTimebankSystem(checked);
            void saveAdvancedSettingsPatch({ quiz: { timebank_system: checked } as any }, { tool: 'quiz' });
          }} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Progressive unlock</p>
          <Switch checked={progressiveUnlock} onCheckedChange={(checked) => {
            setProgressiveUnlock(checked);
            void saveAdvancedSettingsPatch({ quiz: { progressive_unlock: checked } as any }, { tool: 'quiz' });
          }} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Question decay</p>
          <Switch checked={questionDecay} onCheckedChange={(checked) => {
            setQuestionDecay(checked);
            void saveAdvancedSettingsPatch({ quiz: { question_decay: checked } as any }, { tool: 'quiz' });
          }} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Confidence scoring</p>
          <Switch checked={confidenceScoring} onCheckedChange={(checked) => {
            setConfidenceScoring(checked);
            void saveAdvancedSettingsPatch({ quiz: { confidence_scoring: checked } as any }, { tool: 'quiz' });
          }} />
        </div>
      </div>
      {progressiveUnlock ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Unlock streak</p>
            <span className="text-xs font-mono tabular-nums">{progressiveUnlockStreak}</span>
          </div>
          <Slider value={[progressiveUnlockStreak]} onValueChange={([v]) => {
            setProgressiveUnlockStreak(v);
            void saveAdvancedSettingsPatch({ quiz: { progressive_unlock_streak: v } as any }, { tool: 'quiz' });
          }} min={2} max={10} step={1} disabled={isLoading} />
        </div>
      ) : null}

      <ImportToolbar
        toolType="quiz"
        onImport={(text) => {
          const quiz = text.includes('<') ? parseQuizFromHtml(text) : parseQuizFromMarkdown(text);
          if (quiz && quiz.questions.length > 0) {
            setGeneratedQuiz(quiz);
            setCurrentView('take');
          } else {
            toast({ variant: 'destructive', title: t.couldNotParse, description: t.quiz.parseError });
          }
        }}
        disabled={isLoading}
      />
    </>
  );

  return (
    <WorkbenchShell
      title={isAssignmentContext ? t.quiz.createQuiz : 'Quiz'}
      sidebar={sidebar}
    >
      <SourceInput
        toolId="quiz"
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

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <QuizPageContent />
    </Suspense>
  );
}
