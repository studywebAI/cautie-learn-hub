'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Plus, X, Trash2 } from 'lucide-react';
import { AppContext } from '@/contexts/app-context';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SourceInput } from '@/components/tools/source-input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import type { Quiz } from '@/lib/types';

const QuizTaker = dynamic(() => import('@/components/tools/quiz-taker').then((module) => module.QuizTaker), { ssr: false });

type QuizMode = 'classic' | 'assisted' | 'adaptive';
type AnswerFeedback = 'immediate' | 'end';
type GradingMode = 'accuracy' | 'speed' | 'progression';

const QUIZ_TYPES = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'true-false', label: 'True/False' },
  { value: 'fill-blank', label: 'Fill in Blank' },
  { value: 'short-answer', label: 'Short Answer' },
  { value: 'matching', label: 'Matching' },
  { value: 'ordering', label: 'Ordering' },
] as const;

const PRESET_STORAGE_KEY = 'quiz.mode.presets.v2';
const QUIZ_SETTINGS_STORAGE_KEY = 'tools.quiz.settings.v1';
const QUIZ_PAGE_SESSION_KEY = 'tools.quiz.page.session.v1';

function pill(active: boolean) {
  return active
    ? 'px-3 py-1 text-xs rounded-full bg-white text-foreground'
    : 'px-3 py-1 text-xs rounded-full bg-[hsl(var(--background))] text-foreground';
}

function decodePresetCode(value: string) {
  try {
    const raw = atob(value.trim());
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

function encodePresetCode(value: unknown) {
  return btoa(JSON.stringify(value));
}

function QuizPageContent() {
  const { toast } = useToast();
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const region = appContext?.region ?? 'global';
  const schoolingLevel = appContext?.schoolingLevel ?? 2;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sourceText, setSourceText] = useState(searchParams.get('sourceText') || '');
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  const [mode, setMode] = useState<QuizMode>('classic');
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback>('end');
  const [questionTypes, setQuestionTypes] = useState<string[]>(['multiple-choice']);
  const [knowledgeScore, setKnowledgeScore] = useState(50);
  const [questionCount, setQuestionCount] = useState(12);
  const [gradingModes, setGradingModes] = useState<GradingMode[]>(['accuracy', 'speed', 'progression']);

  const [presets, setPresets] = useState<Array<{ id: string; name: string; config: any }>>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [importCode, setImportCode] = useState('');
  const [showPresetOverlay, setShowPresetOverlay] = useState(false);

  const adaptiveCap = 50;
  const runCounterRef = useRef(0);
  const hasVideoContext = useMemo(
    () => /(youtube\.com|youtu\.be|vimeo\.com)/i.test(String(sourceText || '')),
    [sourceText]
  );
  const quizRunKey = useMemo(
    () => (quiz ? `${quiz.title || 'quiz'}::${(quiz.questions || []).slice(0, 24).map((question) => question.id).join('|')}` : ''),
    [quiz]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUIZ_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.title === 'string') setTitle(parsed.title);
      if (parsed?.mode === 'classic' || parsed?.mode === 'assisted' || parsed?.mode === 'adaptive') setMode(parsed.mode);
      if (parsed?.answerFeedback === 'immediate' || parsed?.answerFeedback === 'end') setAnswerFeedback(parsed.answerFeedback);
      if (Array.isArray(parsed?.questionTypes) && parsed.questionTypes.length > 0) {
        const allowed = parsed.questionTypes.filter((entry: string) => QUIZ_TYPES.some((item) => item.value === entry));
        if (allowed.length > 0) setQuestionTypes(allowed);
      }
      if (Number.isFinite(parsed?.knowledgeScore)) setKnowledgeScore(Math.max(0, Math.min(100, Number(parsed.knowledgeScore))));
      if (Number.isFinite(parsed?.questionCount)) setQuestionCount(Math.max(1, Math.min(25, Number(parsed.questionCount))));
      if (Array.isArray(parsed?.gradingModes) && parsed.gradingModes.length > 0) {
        const next = parsed.gradingModes.filter((entry: string) => ['accuracy', 'speed', 'progression'].includes(entry)) as GradingMode[];
        setGradingModes(next.length > 0 ? next : ['accuracy', 'speed', 'progression']);
      }
    } catch {
      // ignore broken saved settings
    }
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(QUIZ_PAGE_SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.sourceText === 'string') setSourceText(parsed.sourceText);
      if (typeof parsed?.title === 'string') setTitle(parsed.title);
      if (parsed?.mode === 'classic' || parsed?.mode === 'assisted' || parsed?.mode === 'adaptive') setMode(parsed.mode);
      if (parsed?.answerFeedback === 'immediate' || parsed?.answerFeedback === 'end') setAnswerFeedback(parsed.answerFeedback);
      if (Array.isArray(parsed?.questionTypes) && parsed.questionTypes.length > 0) {
        const allowed = parsed.questionTypes.filter((entry: string) => QUIZ_TYPES.some((item) => item.value === entry));
        if (allowed.length > 0) setQuestionTypes(allowed);
      }
      if (Number.isFinite(parsed?.knowledgeScore)) setKnowledgeScore(Math.max(0, Math.min(100, Number(parsed.knowledgeScore))));
      if (Number.isFinite(parsed?.questionCount)) setQuestionCount(Math.max(1, Math.min(25, Number(parsed.questionCount))));
      if (Array.isArray(parsed?.gradingModes) && parsed.gradingModes.length > 0) {
        const next = parsed.gradingModes.filter((entry: string) => ['accuracy', 'speed', 'progression'].includes(entry)) as GradingMode[];
        setGradingModes(next.length > 0 ? next : ['accuracy', 'speed', 'progression']);
      }
      if (parsed?.quiz && Array.isArray(parsed.quiz?.questions)) setQuiz(parsed.quiz as Quiz);
    } catch {
      // ignore broken session state
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        QUIZ_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          title,
          mode,
          answerFeedback,
          questionTypes,
          knowledgeScore,
          questionCount,
          gradingModes,
        })
      );
    } catch {
      // ignore storage write failures
    }
  }, [answerFeedback, gradingModes, knowledgeScore, mode, questionCount, questionTypes, title]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        QUIZ_PAGE_SESSION_KEY,
        JSON.stringify({
          sourceText,
          title,
          mode,
          answerFeedback,
          questionTypes,
          knowledgeScore,
          questionCount,
          gradingModes,
          quiz,
        })
      );
    } catch {
      // ignore storage write failures
    }
  }, [answerFeedback, gradingModes, knowledgeScore, mode, questionCount, questionTypes, quiz, sourceText, title]);

  useEffect(() => {
    if (mode === 'classic') {
      setAnswerFeedback('end');
      setQuestionCount((prev) => (prev < 1 ? 12 : Math.min(25, prev || 12)));
    }
    if (mode === 'assisted') {
      setAnswerFeedback('immediate');
      setQuestionCount((prev) => (prev < 1 ? 12 : Math.min(25, prev || 12)));
    }
  }, [mode]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setPresets(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  const toggleQuestionType = (value: string) => {
    setQuestionTypes((prev) => {
      if (prev.includes(value)) {
        const next = prev.filter((entry) => entry !== value);
        return next.length ? next : ['multiple-choice'];
      }
      return [...prev, value];
    });
  };

  const toggleGrading = (value: GradingMode) => {
    setGradingModes((prev) => {
      if (prev.includes(value)) {
        const next = prev.filter((entry) => entry !== value);
        return next.length ? next : ['accuracy'];
      }
      return [...prev, value];
    });
  };

  const handleSavePreset = () => {
    const name = newPresetName.trim() || `Preset ${presets.length + 1}`;
    const config = { mode, answerFeedback, questionTypes, knowledgeScore, questionCount, gradingModes };
    setPresets((prev) => [{ id: crypto.randomUUID(), name, config }, ...prev].slice(0, 100));
    setNewPresetName('');
    toast({ title: 'Preset saved' });
  };

  const handleDeletePreset = (id: string) => {
    setPresets((prev) => prev.filter((preset) => preset.id !== id));
  };

  const applyPreset = (config: any) => {
    if (!config) return;
    if (config.mode === 'classic' || config.mode === 'assisted' || config.mode === 'adaptive') setMode(config.mode);
    if (config.answerFeedback === 'immediate' || config.answerFeedback === 'end') setAnswerFeedback(config.answerFeedback);
    if (Array.isArray(config.questionTypes) && config.questionTypes.length > 0) setQuestionTypes(config.questionTypes);
    if (Number.isFinite(config.knowledgeScore)) setKnowledgeScore(Math.max(0, Math.min(100, Number(config.knowledgeScore))));
    if (Number.isFinite(config.questionCount)) setQuestionCount(Math.max(1, Math.min(25, Number(config.questionCount))));
    if (Array.isArray(config.gradingModes) && config.gradingModes.length > 0) setGradingModes(config.gradingModes.filter((v: string) => ['accuracy', 'speed', 'progression'].includes(v)) as GradingMode[]);
  };

  const handleImportPreset = () => {
    const decoded = decodePresetCode(importCode);
    if (!decoded || typeof decoded !== 'object') {
      toast({ variant: 'destructive', title: 'Invalid preset code' });
      return;
    }
    applyPreset((decoded as any).config || decoded);
    toast({ title: 'Preset imported' });
    setImportCode('');
  };

  const buildGenerationInput = useCallback((compiledText: string) => {
    const requestedCount = mode === 'adaptive' ? 12 : questionCount;
    runCounterRef.current += 1;
    const derivedTypes = new Set(questionTypes);
    if (imageDataUri) {
      derivedTypes.add('image-analysis');
      derivedTypes.add('drawing-analysis');
    }
    if (hasVideoContext) {
      derivedTypes.add('video-analysis');
    }
    return {
      sourceText: compiledText,
      imageDataUri: imageDataUri || undefined,
      questionCount: requestedCount,
      language,
      regionCode: String(region || 'global').toUpperCase(),
      educationLevel: schoolingLevel,
      questionTypes: Array.from(derivedTypes),
      knowledgeScore,
      gradingModes,
      feedbackTiming: answerFeedback,
      quizMode: mode,
      runNonce: `${Date.now()}-${runCounterRef.current}-${Math.random().toString(36).slice(2, 8)}`,
      qualityConstraints: {
        enforceLanguage: true,
        enforceGrammar: true,
        enforcePlausibleDistractors: true,
        enforceNoDuplicates: true,
      },
      timelineContext: { enabled: true },
      imageContext: { enabled: true },
      videoContext: { enabled: true },
    };
  }, [answerFeedback, gradingModes, hasVideoContext, imageDataUri, knowledgeScore, language, mode, questionCount, questionTypes, region, schoolingLevel]);

  const handleGenerate = useCallback(async (compiledText: string) => {
    if (!compiledText.trim()) return;
    setLoading(true);
    setQuiz(null);
    try {
      const run = await runToolFlowV2({
        toolId: 'quiz',
        flowName: 'generateQuiz',
        mode,
        artifactType: 'quiz',
        artifactTitle: title.trim(),
        options: { saveToRecents: true },
        persistArtifact: true,
        input: buildGenerationInput(compiledText),
        computeClass: mode === 'adaptive' ? 'heavy' : 'standard',
      });
      const output = run?.output_payload || run;
      setQuiz(output as Quiz);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Quiz generation failed', description: error?.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }, [buildGenerationInput, mode, title, toast]);

  const handleRestart = useCallback(() => {
    setQuiz(null);
    try {
      const raw = sessionStorage.getItem(QUIZ_PAGE_SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      delete parsed.quiz;
      sessionStorage.setItem(QUIZ_PAGE_SESSION_KEY, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }, []);

  const sidebar = (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Title</p>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} className="h-9 bg-[hsl(var(--background))] text-sm" disabled={loading} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Mode</p>
          <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => setShowPresetOverlay(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: 'classic', label: 'Classic' },
            { value: 'assisted', label: 'Assisted' },
            { value: 'adaptive', label: 'Adaptive' },
          ].map((entry) => (
            <button key={entry.value} type="button" className={pill(mode === entry.value)} onClick={() => setMode(entry.value as QuizMode)}>
              {entry.label}
            </button>
          ))}
          {presets.map((preset) => (
            <div key={preset.id} className="group relative">
              <button
                type="button"
                className={pill(false)}
                onClick={() => applyPreset(preset.config)}
                onDoubleClick={async () => {
                  await navigator.clipboard.writeText(encodePresetCode({ config: preset.config }));
                  toast({ title: 'Preset code copied' });
                }}
                onContextMenu={async (event) => {
                  event.preventDefault();
                  await navigator.clipboard.writeText(encodePresetCode({ config: preset.config }));
                  toast({ title: 'Preset code copied' });
                }}
              >
                {preset.name}
              </button>
              <button
                type="button"
                className="absolute -right-1 -top-1 hidden rounded-full bg-white p-0.5 text-red-600 shadow-sm group-hover:block"
                onClick={() => handleDeletePreset(preset.id)}
                aria-label={`Delete ${preset.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-lg surface-interactive px-2.5 py-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Answer reveal</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['immediate', 'end'].map((entry) => (
            <button key={entry} type="button" className={pill(answerFeedback === entry)} onClick={() => setAnswerFeedback(entry as AnswerFeedback)}>
              {entry === 'immediate' ? 'Immediate' : 'At end'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Question type (multi-select)</p>
        <div className="flex flex-wrap gap-1.5">
          {QUIZ_TYPES.map((entry) => (
            <button key={entry.value} type="button" className={pill(questionTypes.includes(entry.value))} onClick={() => toggleQuestionType(entry.value)}>
              {entry.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Image/video/drawing analysis are automatic capabilities. Uploading an image enables image+drawing analysis; adding a video link enables video analysis.
        </p>
        <div className="rounded-md border border-border bg-background px-2.5 py-2 text-[11px] text-muted-foreground space-y-1">
          <p className="font-medium text-foreground/80">Media guidelines</p>
          <p>Use <span className="font-medium">Image analysis</span> for facts visible in a photo/diagram/map.</p>
          <p>Use <span className="font-medium">Drawing analysis</span> for interpretation of a sketch/chart/hand-drawn process.</p>
          <p>Use <span className="font-medium">Video analysis</span> only when a relevant video link exists and the question depends on time-based context.</p>
          <p>Fallback to regular question types when media evidence is missing or weak.</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">How much do you already know?</p>
        </div>
        <Slider value={[knowledgeScore]} onValueChange={([value]) => setKnowledgeScore(value)} min={0} max={100} step={1} disabled={loading} />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Nothing</span>
          <span>Almost everything</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Questions</p>
          <span className="text-xs font-mono">{mode === 'adaptive' ? 12 : questionCount}</span>
        </div>
        <Slider
          value={[mode === 'adaptive' ? 12 : questionCount]}
          onValueChange={([value]) => mode !== 'adaptive' && setQuestionCount(value)}
          min={1}
          max={25}
          step={1}
          disabled={loading || mode === 'adaptive'}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Grading (multi-select)</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: 'accuracy', label: 'Accuracy' },
            { value: 'speed', label: 'Speed' },
            { value: 'progression', label: 'Progression' },
          ].map((entry) => (
            <button key={entry.value} type="button" className={pill(gradingModes.includes(entry.value as GradingMode))} onClick={() => toggleGrading(entry.value as GradingMode)}>
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {showPresetOverlay ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Mode presets</p>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowPresetOverlay(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Save current preset</p>
                <div className="flex items-center gap-2">
                  <Input value={newPresetName} onChange={(event) => setNewPresetName(event.target.value)} className="h-9 bg-background text-xs" placeholder="Preset name" />
                  <Button
                    type="button"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      handleSavePreset();
                      setShowPresetOverlay(false);
                    }}
                  >
                    Save current
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Import preset code</p>
                <div className="flex items-center gap-2">
                  <Input value={importCode} onChange={(event) => setImportCode(event.target.value)} className="h-9 bg-background text-xs" placeholder="Paste code" />
                  <Button
                    type="button"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      handleImportPreset();
                      setShowPresetOverlay(false);
                    }}
                  >
                    Import
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </>
  );

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (quiz) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto px-2 pb-2">
          <QuizTaker
            quiz={quiz}
            mode={mode}
            sourceText={sourceText}
            onRestart={handleRestart}
            runKey={quizRunKey}
            runtimeSettings={{
              answerFeedback,
              gradingModes,
              adaptiveCap,
              questionTypes,
              knowledgeScore,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <WorkbenchShell title="Quiz" sidebar={sidebar}>
      <SourceInput
        toolId="quiz"
        value={sourceText}
        onChange={setSourceText}
        onImageDataUriChange={setImageDataUri}
        onSubmit={(compiledText) => handleGenerate(String(compiledText || sourceText))}
        placeholder=""
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
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <QuizPageContent />
    </Suspense>
  );
}
