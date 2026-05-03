'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Copy, Download, Plus } from 'lucide-react';
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
  { value: 'image-analysis', label: 'Image analysis' },
  { value: 'video-analysis', label: 'Video analysis' },
  { value: 'drawing-analysis', label: 'Drawing analysis' },
] as const;

const PRESET_STORAGE_KEY = 'quiz.mode.presets.v2';

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
  const [gradingModes, setGradingModes] = useState<GradingMode[]>(['accuracy']);

  const [presets, setPresets] = useState<Array<{ id: string; name: string; config: any }>>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [importCode, setImportCode] = useState('');

  const adaptiveCap = 50;

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
        artifactTitle: title.trim() || 'Quiz',
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

  const sidebar = (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Title</p>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} className="h-9 bg-[hsl(var(--background))] text-sm" disabled={loading} />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Mode</p>
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
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">How much do you already know?</p>
          <span className="text-xs font-mono">{knowledgeScore}</span>
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

      <div className="space-y-2 rounded-lg surface-interactive px-2.5 py-2">
        <p className="text-xs text-muted-foreground">Mode presets</p>
        <div className="flex items-center gap-2">
          <Input value={newPresetName} onChange={(event) => setNewPresetName(event.target.value)} className="h-8 bg-background text-xs" placeholder="Preset name" />
          <Button type="button" size="sm" className="h-8 px-2" onClick={handleSavePreset}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="flex items-center gap-2">
          <Input value={importCode} onChange={(event) => setImportCode(event.target.value)} className="h-8 bg-background text-xs" placeholder="Import preset code" />
          <Button type="button" size="sm" className="h-8 px-2" onClick={handleImportPreset}><Download className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="max-h-40 overflow-auto space-y-1.5">
          {presets.map((preset) => (
            <div key={preset.id} className="flex items-center justify-between rounded-md bg-background px-2 py-1.5">
              <button
                type="button"
                className="text-xs text-left"
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
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={async () => {
                await navigator.clipboard.writeText(encodePresetCode({ config: preset.config }));
                toast({ title: 'Preset code copied' });
              }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (quiz) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 md:p-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setQuiz(null)} className="rounded-full text-xs">Back</Button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-2 pb-2">
          <QuizTaker
            quiz={quiz}
            mode={mode}
            sourceText={sourceText}
            onRestart={() => setQuiz(null)}
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
