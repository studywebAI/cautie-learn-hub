'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BrainCircuit, Loader2, X, Trash2 } from 'lucide-react';
import { AppContext } from '@/contexts/app-context';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SourceInput } from '@/components/tools/source-input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import type { Quiz } from '@/lib/types';
import { classifyContent, isQuizTypeAvailable } from '@/lib/tools/content-classifier';
import type { ContentClassification } from '@/lib/tools/content-classifier';

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
  { value: 'video-fragment', label: 'Video Fragment' },
  { value: 'internet-photo', label: 'Internet Photo' },
  { value: 'timeline', label: 'Timeline' },
] as const;

const PRESET_STORAGE_KEY = 'quiz.mode.presets.v2';
const QUIZ_SETTINGS_STORAGE_KEY = 'tools.quiz.settings.v1';
const QUIZ_PAGE_SESSION_KEY = 'tools.quiz.page.session.v1';

function pill(active: boolean) {
  return active
    ? 'px-3 py-1.5 text-xs rounded-[16px] border border-border bg-background text-foreground shadow-sm'
    : 'px-3 py-1.5 text-xs rounded-[16px] border border-transparent bg-muted text-muted-foreground hover:bg-accent/10 transition-colors';
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

  // Content classification — drives which question types are shown
  const [contentClass, setContentClass] = useState<ContentClassification | null>(null);
  const classifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const adaptiveCap = 50;
  const runCounterRef = useRef(0);

  // Classify source text after user stops typing (800 ms debounce)
  useEffect(() => {
    if (classifyTimerRef.current) clearTimeout(classifyTimerRef.current);
    classifyTimerRef.current = setTimeout(() => {
      const result = classifyContent(sourceText);
      setContentClass(result);
    }, 800);
    return () => {
      if (classifyTimerRef.current) clearTimeout(classifyTimerRef.current);
    };
  }, [sourceText]);

  // When classification changes, drop any question types that are no longer applicable
  useEffect(() => {
    if (!contentClass) return;
    setQuestionTypes((prev) => {
      const next = prev.filter((t) => isQuizTypeAvailable(t, contentClass));
      return next.length > 0 ? next : ['multiple-choice'];
    });
  }, [contentClass]);

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
    return {
      sourceText: compiledText,
      imageDataUri: imageDataUri || undefined,
      questionCount: requestedCount,
      language,
      regionCode: String(region || 'global').toUpperCase(),
      educationLevel: schoolingLevel,
      questionTypes,
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
  }, [answerFeedback, gradingModes, imageDataUri, knowledgeScore, language, mode, questionCount, questionTypes, region, schoolingLevel]);

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
      if (!output || !Array.isArray((output as any).questions) || (output as any).questions.length === 0) {
        const err = new Error(`Quiz run returned no questions (run: ${String((run as any)?.id || 'unknown')})`);
        (err as any).code = "EMPTY_QUIZ_OUTPUT";
        throw err;
      }
      setQuiz(output as Quiz);
    } catch (error: any) {
      const msg = String(error?.message || 'Unknown error');
      const isQuota = /quota|insufficient|rate limit|billing/i.test(msg);
      const detail = isQuota
        ? `Provider quota/billing error detected. ${msg}`
        : msg;
      console.error('[QUIZ_GENERATION_ERROR]', {
        message: msg,
        code: error?.code || null,
        runId: error?.runId || null,
        mode,
        questionTypes,
      });
      toast({ variant: 'destructive', title: 'Quiz generation failed', description: detail });
    } finally {
      setLoading(false);
    }
  }, [buildGenerationInput, mode, questionTypes, title, toast]);

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

  const sidebar = (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Title</p>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} className="h-9 surface-panel text-sm" disabled={loading} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Mode</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
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
                className="absolute -right-1 -top-1 hidden rounded-full bg-background p-0.5 text-destructive shadow-sm group-hover:block"
                onClick={() => handleDeletePreset(preset.id)}
                aria-label={`Delete ${preset.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Answer reveal</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['immediate', 'end'].map((entry) => (
            <button key={entry} type="button" className={pill(answerFeedback === entry)} onClick={() => setAnswerFeedback(entry as AnswerFeedback)}>
              {entry === 'immediate' ? 'Immediate' : 'At end'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Question types</p>
        <div className="flex flex-wrap gap-2">
          {QUIZ_TYPES.filter((entry) => isQuizTypeAvailable(entry.value, contentClass)).map((entry) => (
            <button key={entry.value} type="button" className={pill(questionTypes.includes(entry.value))} onClick={() => toggleQuestionType(entry.value)}>
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Knowledge</p>
        </div>
        <Slider value={[knowledgeScore]} onValueChange={([value]) => setKnowledgeScore(value)} min={0} max={100} step={1} disabled={loading} />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Nothing</span>
          <span>Almost everything</span>
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Questions</p>
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
        <p className="text-xs font-medium text-muted-foreground">Focus on</p>
        <div className="flex flex-wrap gap-2">
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
      <Button
        type="button"
        className="h-11 w-full rounded-md border-none bg-[var(--accent-brand)] text-[13px] font-semibold text-white hover:opacity-90"
        onClick={() => void handleGenerate(sourceText)}
        disabled={loading || !sourceText.trim()}
      >
        {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-1.5 h-4 w-4" />}
        Generate
      </Button>

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

    </div>
  );

  if (quiz) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto px-0 pb-0">
          <QuizTaker
            quiz={quiz}
            mode={mode}
            sourceText={sourceText}
            onRestart={handleRestart}
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

  // Determine if we're in State 1 (input) or State 2 (settings)
  const inState1 = !sourceText.trim();

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
            <span className="font-semibold text-foreground">Quiz</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-foreground"></div>
            <div className="w-2 h-2 rounded-full bg-border"></div>
            <span className="text-xs text-muted-foreground ml-1">Step 1 of 2</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 overflow-y-auto">
          <div className="bg-background rounded-lg border border-border p-6 w-full max-w-2xl shadow-xs">

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-1.5 text-foreground">Create a Quiz</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Paste text, upload files, or add a link. We'll analyze the content and tailor the quiz settings for you.
              </p>
            </div>

            {/* Upload Buttons */}
            <div className="flex gap-2 flex-wrap mb-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-background text-muted-foreground text-xs font-medium hover:bg-accent/5 hover:border-accent/30 hover:text-foreground transition-all"
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
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-background text-muted-foreground text-xs font-medium hover:bg-accent/5 hover:border-accent/30 hover:text-foreground transition-all"
              >
                <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Photo
              </button>
              <button
                onClick={() => toast({ variant: 'default', title: 'Voice recording coming soon', description: 'This feature will be available soon.' })}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-background text-muted-foreground text-xs font-medium hover:bg-accent/5 hover:border-accent/30 hover:text-foreground transition-all"
              >
                <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>Mic
              </button>
              <button
                onClick={() => toast({ variant: 'default', title: 'Import coming soon', description: 'This feature will be available soon.' })}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-background text-muted-foreground text-xs font-medium hover:bg-accent/5 hover:border-accent/30 hover:text-foreground transition-all"
              >
                <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 13v6"/><path d="M9 16h6"/></svg>Import from
              </button>
              <button
                onClick={() => setState1ShowLinkDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-background text-muted-foreground text-xs font-medium hover:bg-accent/5 hover:border-accent/30 hover:text-foreground transition-all"
              >
                <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Link
              </button>

              {/* Link dialog modal */}
              {state1ShowLinkDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                  <div className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl">
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
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-[var(--accent-brand)] focus:ring-2 focus:ring-[var(--accent-brand)]/10 outline-none transition-colors bg-background text-foreground"
                        onKeyPress={(e) => e.key === 'Enter' && handleLinkSubmit()}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setState1ShowLinkDialog(false)}
                          className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-accent/5 transition-all"
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
            <div className="flex gap-4 mb-5 h-56">
              {/* Textarea */}
              <div className="flex-1 flex flex-col">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 block">Your content</label>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Paste text, article content, notes, or anything you want to create a quiz from..."
                  className="flex-1 w-full p-3 border border-border rounded-lg text-sm text-foreground resize-none outline-none leading-relaxed focus:border-[var(--accent-brand)] focus:ring-2 focus:ring-[var(--accent-brand)]/10 transition-colors bg-background font-sans"
                />
                <span className="text-xs text-muted-foreground mt-1.5">Supports: text, PDF, DOCX, images, YouTube links, web URLs</span>
              </div>

              {/* Added sources */}
              <div className="w-48 flex flex-col border-l border-border pl-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Added (0)</div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                  <div className="text-center text-muted-foreground text-xs py-12 flex flex-col items-center justify-center">
                    <svg className="w-6 h-6 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9-4 9 4" /></svg>
                    No sources yet
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex gap-2 justify-end border-t border-border pt-4">
              <button
                onClick={() => setSourceText('')}
                className="px-4 py-2 bg-background border border-border rounded-md text-xs font-medium text-muted-foreground hover:bg-accent/5 hover:border-accent/30 transition-all"
              >
                Clear
              </button>
              <button
                disabled={!sourceText.trim()}
                className="px-4 py-2 bg-[var(--accent-brand)] text-white rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Continue →
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // STATE 2: SETTINGS (existing sidebar + generation)
  return (
    <WorkbenchShell title="Quiz" sidebar={sidebar} breadcrumbIcon={<BrainCircuit className="h-4 w-4 text-[var(--accent-brand)]" />}>
      <div className="flex h-full w-full flex-col justify-end pl-3 pr-2">
        <SourceInput
          toolId="quiz"
          value={sourceText}
          onChange={setSourceText}
          onImageDataUriChange={setImageDataUri}
          onSubmit={(compiledText) => handleGenerate(String(compiledText || sourceText))}
          placeholder=""
          disabled={loading}
          speechLanguage={language}
          enableMic
          enableCaptions={false}
          sourceMergeMode="append_labeled"
          showSubmitButton={false}
        />
      </div>
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
