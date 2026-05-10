'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrainCircuit, Loader2, Plus, X, Trash2 } from 'lucide-react';
import { AppContext } from '@/contexts/app-context';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SourceInput } from '@/components/tools/source-input';
import { SendToClassButton } from '@/components/tools/send-to-class-button';
import { extractShareableClasses } from '@/lib/classes/shareable-classes';
import { postClassShareItem } from '@/lib/class-share/client';
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
  { value: 'video-fragment', label: 'Video Fragment' },
  { value: 'internet-photo', label: 'Internet Photo' },
  { value: 'timeline', label: 'Timeline' },
] as const;

const PRESET_STORAGE_KEY = 'quiz.mode.presets.v2';
const QUIZ_SETTINGS_STORAGE_KEY = 'tools.quiz.settings.v1';
const QUIZ_PAGE_SESSION_KEY = 'tools.quiz.page.session.v1';

function pill(active: boolean) {
  return active
    ? 'px-[11px] py-[5px] text-[11px] rounded-[16px] border border-[#d0d0d0] bg-white text-[#333]'
    : 'px-[11px] py-[5px] text-[11px] rounded-[16px] border border-[#d0d0d0] bg-[#f8f8f8] text-[#333] hover:border-[var(--accent-brand)]';
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
  const classId = searchParams.get('classId');

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
  const [isSharingToClass, setIsSharingToClass] = useState(false);
  const shareableClasses = React.useMemo(
    () => extractShareableClasses((appContext as any)?.classes || []),
    [appContext]
  );

  const adaptiveCap = 50;
  const runCounterRef = useRef(0);
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
      console.error('[quiz.generate] failed', {
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

  const handleShareToClass = useCallback(async (targetClassId: string) => {
    if (!targetClassId || !quiz) return;
    setIsSharingToClass(true);
    try {
      const count = Array.isArray(quiz.questions) ? quiz.questions.length : questionCount;
      await postClassShareItem({
        classId: targetClassId,
        audience: 'teacher',
        text: `Shared quiz: ${title.trim() || 'Untitled quiz'}`,
        attachmentLabel: `${count} questions | mode: ${mode}`,
      });
      toast({ title: 'Shared to class', description: 'Quiz was posted in class share.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Share failed', description: error?.message || 'Could not share quiz.' });
    } finally {
      setIsSharingToClass(false);
    }
  }, [mode, questionCount, quiz, title, toast]);

  const sidebar = (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#666]">Title</p>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} className="h-9 surface-panel text-sm" disabled={loading} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#666]">Mode</p>
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#666]">Answer reveal</p>
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#666]">Question types</p>
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#666]">Knowledge</p>
        </div>
        <Slider value={[knowledgeScore]} onValueChange={([value]) => setKnowledgeScore(value)} min={0} max={100} step={1} disabled={loading} />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Nothing</span>
          <span>Almost everything</span>
        </div>
      </div>

      <div className="space-y-2 border-t border-[#d0d0d0] pt-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#666]">Questions</p>
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#666]">Focus on</p>
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

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (quiz) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-2 pb-2 pt-1.5 flex items-center justify-end">
          <SendToClassButton
            classes={shareableClasses}
            classIdFromRoute={classId}
            sending={isSharingToClass}
            onSend={handleShareToClass}
            className="rounded-full h-8"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-2 pb-2">
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

  return (
    <WorkbenchShell title="Quiz" sidebar={sidebar} breadcrumbIcon={<BrainCircuit className="h-4 w-4" />}>
      <div className="w-full space-y-3">
        <SourceInput
          toolId="quiz"
          value={sourceText}
          onChange={setSourceText}
          onImageDataUriChange={setImageDataUri}
          onSubmit={(compiledText) => handleGenerate(String(compiledText || sourceText))}
          placeholder=""
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
