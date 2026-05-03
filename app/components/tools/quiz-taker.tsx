'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle2, XCircle, ArrowRight, Trophy, HelpCircle, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Quiz, QuizQuestion } from '@/lib/types';

export type QuizMode = 'classic' | 'assisted' | 'adaptive' | 'practice';

type QuizRuntimeSettings = {
  answerFeedback: 'immediate' | 'end';
  gradingModes: Array<'accuracy' | 'speed' | 'progression'>;
  adaptiveCap: number;
  questionTypes: string[];
  knowledgeScore: number;
};

type AnswerValue =
  | { kind: 'option'; value: string }
  | { kind: 'text'; value: string }
  | { kind: 'matching'; value: Record<string, string> }
  | { kind: 'ordering'; value: string[] };

type AnswerMap = Record<string, AnswerValue>;

type AdaptivePerformanceSignal = {
  category: string;
  isCorrect: boolean;
  difficulty?: number;
  responseMs?: number;
};

function normalizeText(value: string) {
  return String(value || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,!?;:]/g, '');
}

function evaluateQuestionAnswer(question: QuizQuestion, answer?: AnswerValue | null): boolean {
  if (!question || !answer) return false;
  const type = question.type || 'multiple-choice';
  if (['multiple-choice', 'true-false', 'image-analysis', 'video-analysis', 'drawing-analysis'].includes(type)) {
    if (answer.kind !== 'option') return false;
    const correctOption = question.options.find((option) => option.isCorrect) || (question.correctOptionId ? question.options.find((option) => option.id === question.correctOptionId) : undefined);
    return Boolean(correctOption && correctOption.id === answer.value);
  }
  if (type === 'fill-blank' || type === 'short-answer') {
    if (answer.kind !== 'text') return false;
    const targetAnswers = (question.acceptableAnswers || []).map(normalizeText).filter(Boolean);
    return targetAnswers.includes(normalizeText(answer.value));
  }
  if (type === 'matching') {
    if (answer.kind !== 'matching') return false;
    const pairs = question.matchingPairs || [];
    return pairs.length > 0 && pairs.every((pair) => normalizeText(answer.value[pair.left] || '') === normalizeText(pair.right));
  }
  if (type === 'ordering') {
    if (answer.kind !== 'ordering') return false;
    const expected = (question.orderingItems || []).map(normalizeText);
    const actual = answer.value.map(normalizeText);
    return expected.length > 0 && expected.length === actual.length && expected.every((entry, index) => entry === actual[index]);
  }
  return false;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getAdaptiveStorageKey(sourceText: string, questionTypes: string[]) {
  return `quiz.adaptive.profile.v1::${normalizeText(sourceText).slice(0, 180)}::${[...questionTypes].sort().join(',')}`;
}

function scoreProgression(signals: AdaptivePerformanceSignal[]) {
  if (signals.length < 6) return 50;
  const recent = signals.slice(-12);
  const midpoint = Math.floor(recent.length / 2);
  const head = recent.slice(0, midpoint);
  const tail = recent.slice(midpoint);
  const headAcc = head.length ? head.filter((s) => s.isCorrect).length / head.length : 0;
  const tailAcc = tail.length ? tail.filter((s) => s.isCorrect).length / tail.length : 0;
  return Math.round(clamp(50 + ((tailAcc - headAcc) * 100), 0, 100));
}

function scoreSpeed(signals: AdaptivePerformanceSignal[]) {
  const valid = signals.map((s) => Number(s.responseMs || 0)).filter((n) => n > 0);
  if (valid.length === 0) return 50;
  const avgMs = valid.reduce((acc, n) => acc + n, 0) / valid.length;
  return Math.round(clamp(100 - (((avgMs - 30000) / 30000) * 40), 0, 100));
}

function getCorrectAnswerText(question: QuizQuestion) {
  const type = question.type || 'multiple-choice';
  if (type === 'fill-blank' || type === 'short-answer') return (question.acceptableAnswers || []).join(' / ') || '-';
  if (type === 'matching') return (question.matchingPairs || []).map((pair) => `${pair.left} -> ${pair.right}`).join(' | ') || '-';
  if (type === 'ordering') return (question.orderingItems || []).join(' -> ') || '-';
  return question.options.find((option) => option.isCorrect)?.text || question.options.find((option) => option.id === question.correctOptionId)?.text || '-';
}

function formatAnswer(question: QuizQuestion, answer?: AnswerValue) {
  if (!answer) return '-';
  if (answer.kind === 'text') return answer.value || '-';
  if (answer.kind === 'option') return question.options.find((opt) => opt.id === answer.value)?.text || '-';
  if (answer.kind === 'ordering') return answer.value.join(' -> ');
  if (answer.kind === 'matching') return Object.entries(answer.value).map(([k, v]) => `${k} -> ${v}`).join(' | ');
  return '-';
}

function MatchingComparison({
  question,
  answer,
}: {
  question: QuizQuestion;
  answer?: AnswerValue;
}) {
  const pairs = question.matchingPairs || [];
  const mapping = answer?.kind === 'matching' ? answer.value : {};
  return (
    <div className="space-y-1.5">
      {pairs.map((pair) => {
        const user = String(mapping[pair.left] || '');
        const ok = normalizeText(user) === normalizeText(pair.right);
        return (
          <div key={`cmp-${pair.left}`} className="grid grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_auto] items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-xs">
            <span className="font-medium">{pair.left}</span>
            <span className="truncate">{user || '-'}</span>
            <span className="truncate">{pair.right}</span>
            <span className={ok ? 'text-emerald-700' : 'text-red-700'}>{ok ? 'OK' : 'X'}</span>
          </div>
        );
      })}
    </div>
  );
}

function MatchingBoard({ question, answer, disabled, onChange }: { question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (next: AnswerValue) => void }) {
  const pairs = question.matchingPairs || [];
  const mapping = answer?.kind === 'matching' ? answer.value : {};
  const pool = Array.from(new Set(pairs.map((pair) => pair.right)));
  const canReuse = /multiple times|more than once|reuse/i.test(String(question.hint || ''));

  const onDrop = (left: string, right: string) => {
    if (disabled) return;
    const next = { ...mapping };
    if (!canReuse) {
      for (const key of Object.keys(next)) if (next[key] === right) delete next[key];
    }
    next[left] = right;
    onChange({ kind: 'matching', value: next });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
        {pairs.map((pair) => (
          <div key={pair.left} className="rounded-lg border border-border bg-background p-2.5">
            <p className="mb-2 text-sm font-medium">{pair.left}</p>
            <div
              className="min-h-10 rounded-md border border-dashed border-border px-2 py-2 text-sm"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const right = e.dataTransfer.getData('text/plain');
                if (right) onDrop(pair.left, right);
              }}
            >
              {mapping[pair.left] || <span className="text-muted-foreground">Drop match here</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg surface-interactive p-2.5">
        <p className="mb-2 text-xs text-muted-foreground">Drag options</p>
        <div className="flex flex-wrap gap-2">
          {pool.map((right) => (
            <button
              key={right}
              type="button"
              draggable={!disabled}
              onDragStart={(e) => e.dataTransfer.setData('text/plain', right)}
              onClick={() => {
                const unassigned = pairs.find((pair) => !mapping[pair.left]);
                if (unassigned) onDrop(unassigned.left, right);
              }}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"
            >
              {right}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{canReuse ? 'Terms can be used multiple times.' : 'Each term can be used once.'}</p>
      </div>
    </div>
  );
}

function QuestionView({ question, answer, disabled, onChange }: { question: QuizQuestion; answer: AnswerValue | undefined; disabled: boolean; onChange: (next: AnswerValue) => void }) {
  const type = question.type || 'multiple-choice';
  const fillBlankMatch = type === 'fill-blank' ? question.question.match(/_{3,}/) : null;

  if (type === 'fill-blank' && fillBlankMatch) {
    const [before, after] = question.question.split(fillBlankMatch[0], 2);
    return (
      <div className="rounded-xl border border-border bg-background p-3 text-sm leading-relaxed">
        {before}
        <Input autoFocus value={answer?.kind === 'text' ? answer.value : ''} onFocus={(e) => e.currentTarget.select()} onChange={(e) => onChange({ kind: 'text', value: e.target.value })} disabled={disabled} className="mx-2 inline-flex h-9 w-52 align-middle" placeholder="..." />
        {after}
      </div>
    );
  }
  if (type === 'fill-blank' || type === 'short-answer') {
    return <Input autoFocus value={answer?.kind === 'text' ? answer.value : ''} onFocus={(e) => e.currentTarget.select()} onChange={(e) => onChange({ kind: 'text', value: e.target.value })} disabled={disabled} className="h-10 bg-background" placeholder={type === 'fill-blank' ? 'Fill in the blank...' : 'Type your answer...'} />;
  }
  if (type === 'matching') return <MatchingBoard question={question} answer={answer} disabled={disabled} onChange={onChange} />;
  if (type === 'ordering') {
    const items = question.orderingItems || [];
    const selected = answer?.kind === 'ordering' ? answer.value : Array.from({ length: items.length }, () => '');
    return (
      <div className="space-y-2">
        {items.map((_, index) => (
          <div key={`order-${index}`} className="grid grid-cols-[90px_minmax(0,1fr)] gap-2 items-center">
            <Label className="text-xs text-muted-foreground">Position {index + 1}</Label>
            <select value={selected[index] || ''} onChange={(event) => { const next = [...selected]; next[index] = event.target.value; onChange({ kind: 'ordering', value: next }); }} disabled={disabled} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">Select item</option>
              {items.map((item) => (<option key={`item-${item}`} value={item}>{item}</option>))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  return (
    <RadioGroup value={answer?.kind === 'option' ? answer.value : ''} onValueChange={(value) => onChange({ kind: 'option', value })} className="space-y-2">
      {question.options.map((option) => {
        const selected = answer?.kind === 'option' && answer.value === option.id;
        return (
          <button key={option.id} type="button" onClick={() => onChange({ kind: 'option', value: option.id })} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${selected ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-muted/40'}`}>
            <RadioGroupItem id={`${question.id}-${option.id}`} value={option.id} disabled={disabled} checked={selected} />
            <Label htmlFor={`${question.id}-${option.id}`} className="cursor-pointer text-sm">{option.text}</Label>
          </button>
        );
      })}
    </RadioGroup>
  );
}

function QuizResults({ quiz, answers, signals, runtimeSettings, sourceText, onRestart }: { quiz: Quiz; answers: AnswerMap; signals: AdaptivePerformanceSignal[]; runtimeSettings?: QuizRuntimeSettings; sourceText: string; onRestart: () => void }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const gradeStorageKey = `quiz.grade.format::${normalizeText(sourceText).slice(0, 96)}`;
  const [gradeFormat, setGradeFormat] = useState<'percent' | 'eu10' | 'usAF'>('percent');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(gradeStorageKey);
      if (raw === 'percent' || raw === 'eu10' || raw === 'usAF') setGradeFormat(raw);
    } catch {}
  }, [gradeStorageKey]);

  useEffect(() => {
    try { localStorage.setItem(gradeStorageKey, gradeFormat); } catch {}
  }, [gradeFormat, gradeStorageKey]);

  const rows = useMemo(() => quiz.questions.map((question, index) => {
    const answer = answers[question.id];
    const correct = evaluateQuestionAnswer(question, answer);
    const type = question.type || 'multiple-choice';
    let totalParts = 1;
    let correctParts = correct ? 1 : 0;
    if (type === 'matching') {
      totalParts = (question.matchingPairs || []).length || 1;
      correctParts = answer?.kind === 'matching'
        ? (question.matchingPairs || []).reduce((acc, pair) => acc + (normalizeText(answer.value[pair.left] || '') === normalizeText(pair.right) ? 1 : 0), 0)
        : 0;
    }
    return {
      idx: index,
      id: question.id,
      question,
      correct,
      answer,
      given: formatAnswer(question, answer),
      correctValue: getCorrectAnswerText(question),
      category: question.category || 'general',
      accuracy: Math.round((correctParts / Math.max(1, totalParts)) * 100),
    };
  }), [answers, quiz.questions]);

  const selected = rows[Math.min(selectedIdx, rows.length - 1)] || rows[0];
  const grouped = rows.reduce<Record<string, { total: number; correct: number }>>((acc, row) => {
    const key = row.category;
    acc[key] = acc[key] || { total: 0, correct: 0 };
    acc[key].total += 1;
    acc[key].correct += row.correct ? 1 : 0;
    return acc;
  }, {});
  const categoryScores = Object.entries(grouped).map(([category, stat]) => ({ category, score: Math.round((stat.correct / Math.max(1, stat.total)) * 100) }));
  const weak = [...categoryScores].sort((a, b) => a.score - b.score).slice(0, 3);
  const strong = [...categoryScores].sort((a, b) => b.score - a.score).slice(0, 3);
  const correctCount = rows.filter((row) => row.correct).length;
  const accuracyPct = rows.length ? Math.round((correctCount / rows.length) * 100) : 0;
  const speedPct = scoreSpeed(signals);
  const progressionPct = scoreProgression(signals);
  const gradeLabel = gradeFormat === 'percent'
    ? `${accuracyPct}%`
    : gradeFormat === 'eu10'
      ? (accuracyPct / 10).toFixed(1)
      : (accuracyPct >= 90 ? 'A' : accuracyPct >= 80 ? 'B' : accuracyPct >= 70 ? 'C' : accuracyPct >= 60 ? 'D' : accuracyPct >= 50 ? 'E' : 'F');

  const openPracticeTool = (tool: 'quiz' | 'flashcards' | 'notes' | 'mindmap', category: string) => {
    const scoped = `${sourceText}\n\nFocus category: ${category}`;
    const encoded = encodeURIComponent(scoped);
    const path = tool === 'mindmap' ? '/tools/wordweb' : `/tools/${tool}`;
    window.location.href = `${path}?sourceText=${encoded}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz Analytics</CardTitle>
        <CardDescription>Interactive review of your answers</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Grade</p>
                <p className="text-lg font-semibold">{gradeLabel}</p>
                <select value={gradeFormat} onChange={(e) => setGradeFormat(e.target.value as any)} className="mt-1 h-7 rounded border border-border bg-background px-2 text-[11px]">
                  <option value="percent">Percent</option>
                  <option value="eu10">EU 1-10</option>
                  <option value="usAF">US A-F</option>
                </select>
              </div>
              <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Accuracy</p><p className="text-lg font-semibold">{accuracyPct}%</p></div>
              <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Speed</p><p className="text-lg font-semibold">{speedPct}%</p></div>
              <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Progression</p><p className="text-lg font-semibold">{progressionPct}%</p></div>
            </div>

            <div className="rounded-lg border border-border bg-background p-2">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {rows.map((row) => (
                  <button key={row.id} type="button" onClick={() => setSelectedIdx(row.idx)} className={`rounded-full px-2.5 py-1 text-xs ${selected?.id === row.id ? 'bg-foreground text-background' : row.correct ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    Q{row.idx + 1} {row.correct ? 'OK' : 'X'}
                  </button>
                ))}
              </div>
              {selected ? (
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-1 text-sm font-medium">{selected.question.question}</p>
                  <p className="mb-2 text-xs text-muted-foreground">Category: {selected.category} · Accuracy on this question: {selected.accuracy}%</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-md bg-muted/30 p-2"><p className="text-xs text-muted-foreground">Your answer</p><p className="text-sm">{selected.given}</p></div>
                    <div className="rounded-md bg-muted/30 p-2"><p className="text-xs text-muted-foreground">Correct answer</p><p className="text-sm">{selected.correctValue}</p></div>
                  </div>
                  {selected.question.type === 'matching' ? (
                    <div className="mt-2 rounded-md bg-muted/20 p-2">
                      <p className="mb-1 text-xs text-muted-foreground">Matching breakdown</p>
                      <MatchingComparison question={selected.question} answer={selected.answer} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-border bg-background p-3">
              <p className="mb-2 text-sm font-medium">Practice weak points</p>
              <div className="space-y-2">
                {weak.map((entry) => (
                  <details key={entry.category} className="rounded-md border border-border px-2 py-1.5">
                    <summary className="cursor-pointer text-sm">{entry.category} ({entry.score}%)</summary>
                    <div className="mt-2 grid gap-1 text-xs">
                      <button className="rounded bg-muted px-2 py-1 text-left" onClick={() => openPracticeTool('quiz', entry.category)}>Quiz</button>
                      <button className="rounded bg-muted px-2 py-1 text-left" onClick={() => openPracticeTool('flashcards', entry.category)}>Flashcards</button>
                      <button className="rounded bg-muted px-2 py-1 text-left" onClick={() => openPracticeTool('notes', entry.category)}>Notes</button>
                      <button className="rounded bg-muted px-2 py-1 text-left" onClick={() => openPracticeTool('mindmap', entry.category)}>Mindmap</button>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-sm font-medium">Strong points</p>
              <div className="mt-2 space-y-1.5">{strong.map((entry) => <p key={entry.category} className="text-xs">{entry.category} <span className="text-muted-foreground">{entry.score}%</span></p>)}</div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-sm font-medium">Weak points</p>
              <div className="mt-2 space-y-1.5">{weak.map((entry) => <p key={entry.category} className="text-xs">{entry.category} <span className="text-muted-foreground">{entry.score}%</span></p>)}</div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-sm font-medium">Notes</p>
              <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
                {rows.some((r) => !r.correct) ? <li>Review incorrect answers first for fastest improvement.</li> : null}
                {rows.filter((r) => r.accuracy < 100).length > 0 ? <li>Matching/ordering questions can be partially correct. Focus on pair precision.</li> : null}
                {runtimeSettings?.knowledgeScore && runtimeSettings.knowledgeScore > 70 && accuracyPct < 70 ? <li>High prior-knowledge setting with lower result: practice weak categories first.</li> : null}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onRestart}><Trophy className="mr-2 h-4 w-4" />Start new quiz</Button>
      </CardFooter>
    </Card>
  );
}

export function QuizTaker({ quiz, mode, sourceText, onRestart, runtimeSettings }: { quiz: Quiz; mode: QuizMode; sourceText: string; onRestart: () => void; runtimeSettings?: QuizRuntimeSettings }) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz.questions || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [adaptiveBuffer, setAdaptiveBuffer] = useState<QuizQuestion[]>([]);
  const [isAdaptiveLoading, setIsAdaptiveLoading] = useState(false);
  const [adaptiveSignals, setAdaptiveSignals] = useState<AdaptivePerformanceSignal[]>([]);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(() => Date.now());
  const [showWhy, setShowWhy] = useState(false);
  const [whyIncorrect, setWhyIncorrect] = useState('');
  const [whyIncorrectLoading, setWhyIncorrectLoading] = useState(false);

  const effectiveMode: 'classic' | 'assisted' | 'adaptive' = mode === 'practice' ? 'classic' : mode;
  const adaptiveCap = Math.max(1, Math.min(50, Number(runtimeSettings?.adaptiveCap || 50)));
  const selectedTypes = runtimeSettings?.questionTypes?.length ? runtimeSettings.questionTypes : ['multiple-choice'];
  const adaptiveStorageKey = getAdaptiveStorageKey(sourceText, selectedTypes);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const canAdvance = Boolean(currentQuestion && currentAnswer);

  useEffect(() => { setQuestionStartedAt(Date.now()); setShowWhy(false); setWhyIncorrect(''); }, [currentIndex, currentQuestion?.id]);

  useEffect(() => {
    if (effectiveMode !== 'adaptive') return;
    try {
      const raw = localStorage.getItem(adaptiveStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.signals)) return;
      const restored = parsed.signals.filter((entry: any) => entry && typeof entry.category === 'string' && typeof entry.isCorrect === 'boolean').slice(-40) as AdaptivePerformanceSignal[];
      if (restored.length > 0) setAdaptiveSignals((prev) => (prev.length > 0 ? prev : restored));
    } catch {}
  }, [adaptiveStorageKey, effectiveMode]);

  useEffect(() => {
    if (effectiveMode !== 'adaptive') return;
    try { localStorage.setItem(adaptiveStorageKey, JSON.stringify({ updatedAt: Date.now(), signals: adaptiveSignals.slice(-40) })); } catch {}
  }, [adaptiveSignals, adaptiveStorageKey, effectiveMode]);

  const ensureAdaptiveBuffer = useCallback(async () => {
    if (effectiveMode !== 'adaptive' || isAdaptiveLoading) return;
    const knownIds = new Set<string>([...questions.map((q) => q.id), ...adaptiveBuffer.map((q) => q.id)]);
    if (knownIds.size >= adaptiveCap || adaptiveBuffer.length >= 6) return;
    setIsAdaptiveLoading(true);
    try {
      const requested = Math.min(10, Math.max(4, adaptiveCap - knownIds.size));
      const categoryWeights = adaptiveSignals.reduce<Record<string, number>>((acc, signal) => {
        acc[signal.category] = Number((acc[signal.category] || 0) + (signal.isCorrect ? -0.2 : 0.8));
        return acc;
      }, {});
      const response = await fetch('/api/ai/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'generateQuiz',
          input: {
            sourceText,
            questionCount: requested,
            quizMode: 'adaptive',
            questionTypes: selectedTypes,
            feedbackTiming: runtimeSettings?.answerFeedback || 'immediate',
            gradingModes: runtimeSettings?.gradingModes || ['accuracy'],
            knowledgeScore: runtimeSettings?.knowledgeScore || 50,
            adaptiveProfile: { cap: adaptiveCap, recentAnswers: adaptiveSignals.slice(-18), categoryWeights },
            existingQuestionIds: Array.from(knownIds),
          },
        }),
      });
      if (!response.ok) throw new Error('Adaptive generation request failed');
      const payload = await response.json();
      const nextQuestions = Array.isArray(payload?.questions) ? payload.questions : [];
      const cleaned = nextQuestions.filter((q: QuizQuestion) => q?.id && !knownIds.has(q.id));
      if (cleaned.length > 0) setAdaptiveBuffer((prev) => [...prev, ...cleaned].slice(0, 20));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Adaptive update failed', description: error?.message || 'Could not load next questions.' });
    } finally {
      setIsAdaptiveLoading(false);
    }
  }, [adaptiveBuffer, adaptiveCap, adaptiveSignals, effectiveMode, isAdaptiveLoading, questions, runtimeSettings?.answerFeedback, runtimeSettings?.gradingModes, runtimeSettings?.knowledgeScore, selectedTypes, sourceText, toast]);

  useEffect(() => { if (effectiveMode === 'adaptive') void ensureAdaptiveBuffer(); }, [effectiveMode, ensureAdaptiveBuffer]);

  const handleSetAnswer = (next: AnswerValue) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: next }));
    if (effectiveMode === 'assisted') { setIsAnswered(false); setIsCurrentCorrect(null); }
  };

  const handleAnswerPress = () => {
    if (!currentQuestion || !currentAnswer) return;
    const correct = evaluateQuestionAnswer(currentQuestion, currentAnswer);
    setIsAnswered(true);
    setIsCurrentCorrect(correct);
    setAdaptiveSignals((prev) => [...prev, { category: currentQuestion.category || 'general', isCorrect: correct, difficulty: currentQuestion.difficulty, responseMs: Math.max(0, Date.now() - questionStartedAt) }].slice(-40));
    if (effectiveMode === 'adaptive') void ensureAdaptiveBuffer();
  };

  const loadWhyIncorrect = async () => {
    if (!currentQuestion || !currentAnswer || isCurrentCorrect !== false || whyIncorrectLoading || whyIncorrect) return;
    setWhyIncorrectLoading(true);
    try {
      const questionType = currentQuestion.type || 'multiple-choice';
      const mismatchContext = questionType === 'matching'
        ? JSON.stringify({
            user: currentAnswer?.kind === 'matching' ? currentAnswer.value : null,
            correct: currentQuestion.matchingPairs || [],
          })
        : questionType === 'ordering'
          ? JSON.stringify({
              user: currentAnswer?.kind === 'ordering' ? currentAnswer.value : null,
              correct: currentQuestion.orderingItems || [],
            })
          : '';
      const response = await fetch('/api/ai/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'explainAnswer',
          model: 'gpt-5.4-mini',
          input: {
            question: currentQuestion.question,
            userAnswer: formatAnswer(currentQuestion, currentAnswer),
            correctAnswer: getCorrectAnswerText(currentQuestion),
            isCorrect: false,
            sourceText: mismatchContext ? `${sourceText}\n\nQuestion type: ${questionType}\nMismatch context: ${mismatchContext}` : sourceText,
          },
        }),
      });
      if (!response.ok) throw new Error('Could not generate explanation');
      const payload = await response.json();
      setWhyIncorrect(String(payload?.explanation || payload?.output?.explanation || 'Your answer does not match the source-backed answer.').trim());
    } catch (error: any) {
      setWhyIncorrect(String(error?.message || 'Could not generate explanation now.'));
    } finally {
      setWhyIncorrectLoading(false);
    }
  };

  const advanceQuestion = () => {
    if (!currentQuestion) return;
    if (effectiveMode === 'adaptive') {
      if (currentIndex >= questions.length - 1) {
        if (adaptiveBuffer.length > 0) {
          const [next, ...rest] = adaptiveBuffer;
          setQuestions((prev) => [...prev, next].slice(0, adaptiveCap));
          setAdaptiveBuffer(rest);
          setCurrentIndex((prev) => prev + 1);
          setIsAnswered(false);
          setIsCurrentCorrect(null);
          void ensureAdaptiveBuffer();
          return;
        }
        void ensureAdaptiveBuffer();
        return;
      }
      setCurrentIndex((prev) => prev + 1);
      setIsAnswered(false);
      setIsCurrentCorrect(null);
      if (questions.length - (currentIndex + 1) <= 3) void ensureAdaptiveBuffer();
      return;
    }
    if (currentIndex >= questions.length - 1) { setIsFinished(true); return; }
    setCurrentIndex((prev) => prev + 1);
    setIsAnswered(false);
    setIsCurrentCorrect(null);
  };

  if (isFinished) {
    return <QuizResults quiz={{ ...quiz, questions }} answers={answers} signals={adaptiveSignals} runtimeSettings={runtimeSettings} sourceText={sourceText} onRestart={onRestart} />;
  }
  if (!currentQuestion) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))} disabled={currentIndex === 0}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button>
          <div className="flex flex-wrap items-center gap-1.5">
            {questions.map((question, index) => {
              const answered = answers[question.id];
              const isCurrent = index === currentIndex;
              const isCorrect = answered ? evaluateQuestionAnswer(question, answered) : null;
              return (
                <button key={question.id} type="button" onClick={() => setCurrentIndex(index)} className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[11px] ${isCurrent ? 'bg-foreground text-background' : isCorrect === true ? 'bg-emerald-100 text-emerald-800' : isCorrect === false ? 'bg-red-100 text-red-800' : 'bg-background text-muted-foreground border border-border'}`}>
                  {isCorrect === true ? 'OK' : isCorrect === false ? 'X' : index + 1}
                </button>
              );
            })}
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={advanceQuestion} disabled={!canAdvance && !isAnswered}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-base font-medium leading-relaxed">{currentQuestion.question.replace(/_{3,}/g, '____')}</p>
          {currentQuestion.type === 'matching' ? <p className="mt-2 text-xs text-muted-foreground">Match each item to the correct term. {(/multiple times|more than once|reuse/i.test(String(currentQuestion.hint || '')) ? 'Terms may be reused.' : 'Each term can be used once unless noted.')}</p> : null}
        </div>

        <QuestionView question={currentQuestion} answer={currentAnswer} disabled={effectiveMode !== 'classic' && isAnswered} onChange={handleSetAnswer} />

        {effectiveMode !== 'classic' && isAnswered ? (
          <div className={`rounded-xl border p-3 ${isCurrentCorrect ? 'border-emerald-300 bg-emerald-50/40' : 'border-red-300 bg-red-50/40'}`}>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              {isCurrentCorrect ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
              <span>{isCurrentCorrect ? 'Correct' : 'Incorrect'}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-lg bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Your answer</p><p className="text-sm">{formatAnswer(currentQuestion, currentAnswer)}</p></div>
              <div className="rounded-lg bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Correct answer</p><p className="text-sm">{getCorrectAnswerText(currentQuestion)}</p></div>
            </div>
            {currentQuestion.type === 'matching' ? (
              <div className="mt-2 rounded-lg bg-background px-3 py-2">
                <p className="mb-1 text-xs text-muted-foreground">Pair review</p>
                <MatchingComparison question={currentQuestion} answer={currentAnswer} />
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setShowWhy((prev) => !prev)}><HelpCircle className="mr-1.5 h-3.5 w-3.5" />Why is this correct?</Button>
              {isCurrentCorrect === false ? <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void loadWhyIncorrect()} disabled={whyIncorrectLoading}>{whyIncorrectLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}Why is this incorrect?</Button> : null}
            </div>
            {showWhy ? <div className="mt-2 rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">{currentQuestion.explanation?.trim() || 'This follows directly from the source material used to generate the question.'}</div> : null}
            {whyIncorrect ? <div className="mt-2 rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">{whyIncorrect}</div> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{currentQuestion.type || 'multiple-choice'}</span>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{currentQuestion.category || 'general'}</span>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">difficulty {currentQuestion.difficulty || 5}</span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <Button type="button" variant="outline" className="h-8 bg-background" onClick={onRestart}>Back</Button>
        <div className="flex items-center gap-2">
          {effectiveMode === 'adaptive' ? <Button type="button" variant="outline" className="h-8" onClick={() => setIsFinished(true)}><Flag className="mr-1 h-4 w-4" />Finish</Button> : null}
          {effectiveMode === 'assisted' && !isAnswered ? (
            <Button type="button" onClick={handleAnswerPress} disabled={!canAdvance} className="h-8">Answer</Button>
          ) : (
            <Button type="button" onClick={() => { if (effectiveMode === 'classic' && !isAnswered) handleAnswerPress(); advanceQuestion(); }} disabled={effectiveMode === 'assisted' ? !isAnswered : !canAdvance} className="h-8">
              {effectiveMode !== 'adaptive' && currentIndex >= questions.length - 1 ? 'Finish' : 'Next'}
              {(effectiveMode === 'adaptive' && isAdaptiveLoading) ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
