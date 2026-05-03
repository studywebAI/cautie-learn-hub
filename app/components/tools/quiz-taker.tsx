'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, ArrowRight, Trophy, Gauge, Flag } from 'lucide-react';
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

type GradingSummary = {
  accuracy: number;
  speed: number;
  progression: number;
  answered: number;
  correct: number;
};

function normalizeText(value: string) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]/g, '');
}

function evaluateQuestionAnswer(question: QuizQuestion, answer?: AnswerValue | null): boolean {
  if (!question || !answer) return false;
  const type = question.type || 'multiple-choice';

  if (type === 'multiple-choice' || type === 'true-false' || type === 'image-analysis' || type === 'video-analysis' || type === 'drawing-analysis') {
    if (answer.kind !== 'option') return false;
    const correctOption = question.options.find((option) => option.isCorrect) || (question.correctOptionId ? question.options.find((option) => option.id === question.correctOptionId) : undefined);
    return Boolean(correctOption && correctOption.id === answer.value);
  }

  if (type === 'fill-blank' || type === 'short-answer') {
    if (answer.kind !== 'text') return false;
    const targetAnswers = (question.acceptableAnswers || []).map(normalizeText).filter(Boolean);
    if (targetAnswers.length === 0) return false;
    const given = normalizeText(answer.value);
    return targetAnswers.includes(given);
  }

  if (type === 'matching') {
    if (answer.kind !== 'matching') return false;
    const pairs = question.matchingPairs || [];
    if (pairs.length === 0) return false;
    return pairs.every((pair) => normalizeText(answer.value[pair.left] || '') === normalizeText(pair.right));
  }

  if (type === 'ordering') {
    if (answer.kind !== 'ordering') return false;
    const expected = (question.orderingItems || []).map(normalizeText);
    const actual = answer.value.map(normalizeText);
    if (expected.length === 0 || expected.length !== actual.length) return false;
    return expected.every((entry, index) => entry === actual[index]);
  }

  return false;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getAdaptiveStorageKey(sourceText: string, questionTypes: string[]) {
  const compactSource = normalizeText(sourceText).slice(0, 180);
  const compactTypes = [...questionTypes].sort().join(',');
  return `quiz.adaptive.profile.v1::${compactSource}::${compactTypes}`;
}

function scoreProgression(signals: AdaptivePerformanceSignal[]) {
  if (signals.length < 6) return 50;
  const recent = signals.slice(-12);
  const midpoint = Math.floor(recent.length / 2);
  const head = recent.slice(0, midpoint);
  const tail = recent.slice(midpoint);
  const headAcc = head.length ? head.filter((s) => s.isCorrect).length / head.length : 0;
  const tailAcc = tail.length ? tail.filter((s) => s.isCorrect).length / tail.length : 0;
  const delta = (tailAcc - headAcc) * 100;
  return Math.round(clamp(50 + delta, 0, 100));
}

function scoreSpeed(signals: AdaptivePerformanceSignal[]) {
  const valid = signals.map((s) => Number(s.responseMs || 0)).filter((n) => n > 0);
  if (valid.length === 0) return 50;
  const avgMs = valid.reduce((acc, n) => acc + n, 0) / valid.length;
  const anchorMs = 30000;
  const raw = 100 - ((avgMs - anchorMs) / anchorMs) * 40;
  return Math.round(clamp(raw, 0, 100));
}

function buildGradingSummary(questions: QuizQuestion[], answers: AnswerMap, signals: AdaptivePerformanceSignal[]): GradingSummary {
  const evaluated = questions.map((question) => evaluateQuestionAnswer(question, answers[question.id]));
  const correct = evaluated.filter(Boolean).length;
  const accuracy = Math.round((correct / Math.max(1, questions.length)) * 100);
  return {
    accuracy,
    speed: scoreSpeed(signals),
    progression: scoreProgression(signals),
    answered: Object.keys(answers).length,
    correct,
  };
}

function QuestionView({
  question,
  answer,
  disabled,
  showHint,
  onChange,
}: {
  question: QuizQuestion;
  answer: AnswerValue | undefined;
  disabled: boolean;
  showHint: boolean;
  onChange: (next: AnswerValue) => void;
}) {
  const type = question.type || 'multiple-choice';

  const renderMedia = () => {
    if (!question.media?.url) return null;
    if (question.media.kind === 'video') {
      return (
        <div className="rounded-xl border border-border overflow-hidden bg-black/5">
          <iframe
            src={question.media.url}
            title={question.media.title || 'Video context'}
            className="h-64 w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-border overflow-hidden bg-black/5">
        <img src={question.media.url} alt={question.media.title || 'Question media'} className="max-h-64 w-full object-contain" />
      </div>
    );
  };

  const renderBody = () => {
    if (type === 'fill-blank' || type === 'short-answer') {
      return (
        <Textarea
          value={answer?.kind === 'text' ? answer.value : ''}
          onChange={(event) => onChange({ kind: 'text', value: event.target.value })}
          disabled={disabled}
          className="min-h-[96px] bg-background"
          placeholder={type === 'fill-blank' ? 'Fill in the blank...' : 'Type your answer...'}
        />
      );
    }

    if (type === 'matching') {
      const pairs = question.matchingPairs || [];
      const rights = pairs.map((pair) => pair.right);
      const mapping = answer?.kind === 'matching' ? answer.value : {};
      return (
        <div className="space-y-3">
          {pairs.map((pair) => (
            <div key={pair.left} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <div className="rounded-lg surface-interactive px-3 py-2 text-sm">{pair.left}</div>
              <select
                value={mapping[pair.left] || ''}
                onChange={(event) => onChange({ kind: 'matching', value: { ...mapping, [pair.left]: event.target.value } })}
                disabled={disabled}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="">Select match</option>
                {rights.map((right) => (
                  <option key={`${pair.left}-${right}`} value={right}>{right}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }

    if (type === 'ordering') {
      const items = question.orderingItems || [];
      const selected = answer?.kind === 'ordering' ? answer.value : Array.from({ length: items.length }, () => '');
      return (
        <div className="space-y-2">
          {items.map((_, index) => (
            <div key={`order-${index}`} className="grid grid-cols-[90px_minmax(0,1fr)] gap-2 items-center">
              <Label className="text-xs text-muted-foreground">Position {index + 1}</Label>
              <select
                value={selected[index] || ''}
                onChange={(event) => {
                  const next = [...selected];
                  next[index] = event.target.value;
                  onChange({ kind: 'ordering', value: next });
                }}
                disabled={disabled}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={`item-${item}`} value={item}>{item}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }

    return (
      <RadioGroup
        value={answer?.kind === 'option' ? answer.value : ''}
        onValueChange={(value) => onChange({ kind: 'option', value })}
        className="space-y-2"
      >
        {question.options.map((option) => (
          <div key={option.id} className="flex items-center gap-2 rounded-lg surface-interactive px-3 py-2">
            <RadioGroupItem id={`${question.id}-${option.id}`} value={option.id} disabled={disabled} />
            <Label htmlFor={`${question.id}-${option.id}`} className="text-sm">{option.text}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-background px-2 py-0.5">{type}</span>
        <span className="rounded-full bg-background px-2 py-0.5">{question.category || 'general'}</span>
        <span className="rounded-full bg-background px-2 py-0.5">difficulty {question.difficulty || 5}</span>
      </div>
      <p className="text-base leading-relaxed">{question.question}</p>
      {renderMedia()}
      {renderBody()}
      {showHint && question.hint ? (
        <p className="text-xs text-muted-foreground">Hint: {question.hint}</p>
      ) : null}
    </div>
  );
}

function QuizResults({
  quiz,
  answers,
  gradingSummary,
  selectedGrading,
  onRestart,
}: {
  quiz: Quiz;
  answers: AnswerMap;
  gradingSummary: GradingSummary;
  selectedGrading: Array<'accuracy' | 'speed' | 'progression'>;
  onRestart: () => void;
}) {
  const rows = quiz.questions.map((question) => {
    const answer = answers[question.id];
    const correct = evaluateQuestionAnswer(question, answer);
    let given = '-';
    let correctValue = '-';

    if (question.type === 'fill-blank' || question.type === 'short-answer') {
      given = answer?.kind === 'text' ? answer.value : '-';
      correctValue = (question.acceptableAnswers || []).join(' / ') || '-';
    } else if (question.type === 'matching') {
      given = answer?.kind === 'matching' ? JSON.stringify(answer.value) : '-';
      correctValue = JSON.stringify(question.matchingPairs || []);
    } else if (question.type === 'ordering') {
      given = answer?.kind === 'ordering' ? answer.value.join(' -> ') : '-';
      correctValue = (question.orderingItems || []).join(' -> ');
    } else {
      const selected = answer?.kind === 'option' ? question.options.find((option) => option.id === answer.value)?.text : undefined;
      const right = question.options.find((option) => option.isCorrect)?.text || question.options.find((option) => option.id === question.correctOptionId)?.text;
      given = selected || '-';
      correctValue = right || '-';
    }

    return {
      id: question.id,
      question: question.question,
      category: question.category || 'general',
      correct,
      given,
      correctValue,
    };
  });

  const correctCount = rows.filter((row) => row.correct).length;
  const score = rows.length > 0 ? Math.round((correctCount / rows.length) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz overview</CardTitle>
        <CardDescription>{correctCount}/{rows.length} correct ({score}%)</CardDescription>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {selectedGrading.includes('accuracy') ? <span className="rounded-full bg-background px-2 py-1">Accuracy {gradingSummary.accuracy}%</span> : null}
          {selectedGrading.includes('speed') ? <span className="rounded-full bg-background px-2 py-1">Speed {gradingSummary.speed}%</span> : null}
          {selectedGrading.includes('progression') ? <span className="rounded-full bg-background px-2 py-1">Progression {gradingSummary.progression}%</span> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[65vh] overflow-auto">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-border surface-interactive p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{row.question}</p>
              <span className={`text-xs ${row.correct ? 'text-emerald-700' : 'text-red-700'}`}>{row.correct ? 'Correct' : 'Incorrect'}</span>
            </div>
            <p className="text-xs text-muted-foreground">Category: {row.category}</p>
            <p className="mt-2 text-xs"><strong>Your answer:</strong> {row.given}</p>
            <p className="text-xs"><strong>Correct answer:</strong> {row.correctValue}</p>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button onClick={onRestart}><Trophy className="mr-2 h-4 w-4" />Start new quiz</Button>
      </CardFooter>
    </Card>
  );
}

export function QuizTaker({
  quiz,
  mode,
  sourceText,
  onRestart,
  runtimeSettings,
}: {
  quiz: Quiz;
  mode: QuizMode;
  sourceText: string;
  onRestart: () => void;
  runtimeSettings?: QuizRuntimeSettings;
}) {
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

  const effectiveMode: 'classic' | 'assisted' | 'adaptive' = mode === 'practice' ? 'classic' : mode;
  const adaptiveCap = Math.max(1, Math.min(50, Number(runtimeSettings?.adaptiveCap || 50)));
  const selectedTypes = runtimeSettings?.questionTypes?.length ? runtimeSettings.questionTypes : ['multiple-choice'];
  const selectedGrading = runtimeSettings?.gradingModes?.length ? runtimeSettings.gradingModes : ['accuracy'];
  const adaptiveStorageKey = getAdaptiveStorageKey(sourceText, selectedTypes);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const gradingSummary = buildGradingSummary(questions, answers, adaptiveSignals);

  const answeredCount = Object.keys(answers).length;
  const canAdvance = Boolean(currentQuestion && currentAnswer);

  useEffect(() => {
    setQuestionStartedAt(Date.now());
  }, [currentIndex, currentQuestion?.id]);

  useEffect(() => {
    if (effectiveMode !== 'adaptive') return;
    try {
      const raw = localStorage.getItem(adaptiveStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.signals)) return;
      const restored = parsed.signals
        .filter((entry: any) => entry && typeof entry.category === 'string' && typeof entry.isCorrect === 'boolean')
        .slice(-40) as AdaptivePerformanceSignal[];
      if (restored.length > 0) {
        setAdaptiveSignals((prev) => (prev.length > 0 ? prev : restored));
      }
    } catch {
      // ignore invalid local profile
    }
  }, [adaptiveStorageKey, effectiveMode]);

  useEffect(() => {
    if (effectiveMode !== 'adaptive') return;
    try {
      localStorage.setItem(adaptiveStorageKey, JSON.stringify({
        updatedAt: Date.now(),
        signals: adaptiveSignals.slice(-40),
      }));
    } catch {
      // ignore storage write failures
    }
  }, [adaptiveSignals, adaptiveStorageKey, effectiveMode]);

  const getCorrectAnswerText = useCallback((question: QuizQuestion) => {
    if (!question) return '-';
    const type = question.type || 'multiple-choice';
    if (type === 'fill-blank' || type === 'short-answer') {
      return (question.acceptableAnswers || []).join(' / ') || '-';
    }
    if (type === 'matching') {
      return (question.matchingPairs || []).map((pair) => `${pair.left} -> ${pair.right}`).join(' | ') || '-';
    }
    if (type === 'ordering') {
      return (question.orderingItems || []).join(' -> ') || '-';
    }
    const right = question.options.find((option) => option.isCorrect)?.text || question.options.find((option) => option.id === question.correctOptionId)?.text;
    return right || '-';
  }, []);

  const ensureAdaptiveBuffer = useCallback(async () => {
    if (effectiveMode !== 'adaptive') return;
    if (isAdaptiveLoading) return;

    const knownIds = new Set<string>([...questions.map((question) => question.id), ...adaptiveBuffer.map((question) => question.id)]);
    if (knownIds.size >= adaptiveCap) return;
    if (adaptiveBuffer.length >= 6) return;

    setIsAdaptiveLoading(true);
    try {
      const requested = Math.min(10, Math.max(4, adaptiveCap - knownIds.size));
      const categoryWeights = adaptiveSignals.reduce<Record<string, number>>((acc, signal) => {
        const weight = signal.isCorrect ? -0.2 : 0.8;
        acc[signal.category] = Number((acc[signal.category] || 0) + weight);
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
            adaptiveProfile: {
              cap: adaptiveCap,
              recentAnswers: adaptiveSignals.slice(-18),
              categoryWeights,
            },
            existingQuestionIds: Array.from(knownIds),
          },
        }),
      });

      if (!response.ok) throw new Error('Adaptive generation request failed');
      const payload = await response.json();
      const nextQuestions = Array.isArray(payload?.questions) ? payload.questions : [];
      const cleaned = nextQuestions.filter((question: QuizQuestion) => question?.id && !knownIds.has(question.id));
      if (cleaned.length > 0) {
        setAdaptiveBuffer((prev) => [...prev, ...cleaned].slice(0, 20));
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Adaptive update failed', description: error?.message || 'Could not load next questions.' });
    } finally {
      setIsAdaptiveLoading(false);
    }
  }, [adaptiveBuffer, adaptiveCap, adaptiveSignals, effectiveMode, isAdaptiveLoading, questions, runtimeSettings?.answerFeedback, runtimeSettings?.gradingModes, runtimeSettings?.knowledgeScore, selectedTypes, sourceText, toast]);

  useEffect(() => {
    if (effectiveMode !== 'adaptive') return;
    void ensureAdaptiveBuffer();
  }, [effectiveMode, ensureAdaptiveBuffer]);

  const handleSetAnswer = (next: AnswerValue) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: next }));
    if (effectiveMode === 'classic') return;
    if (effectiveMode === 'assisted') {
      setIsAnswered(false);
      setIsCurrentCorrect(null);
    }
  };

  const handleAnswerPress = () => {
    if (!currentQuestion || !currentAnswer) return;
    const correct = evaluateQuestionAnswer(currentQuestion, currentAnswer);
    setIsAnswered(true);
    setIsCurrentCorrect(correct);
    const responseMs = Math.max(0, Date.now() - questionStartedAt);

    const signal: AdaptivePerformanceSignal = {
      category: currentQuestion.category || 'general',
      isCorrect: correct,
      difficulty: currentQuestion.difficulty,
      responseMs,
    };
    setAdaptiveSignals((prev) => [...prev, signal].slice(-40));

    if (effectiveMode === 'adaptive') {
      void ensureAdaptiveBuffer();
    }
  };

  const advanceQuestion = () => {
    if (!currentQuestion) return;

    if (effectiveMode === 'adaptive') {
      if (currentIndex >= questions.length - 1) {
        if (adaptiveBuffer.length > 0) {
          const [next, ...rest] = adaptiveBuffer;
          setQuestions((prev) => {
            const merged = [...prev, next];
            return merged.slice(0, adaptiveCap);
          });
          setAdaptiveBuffer(rest);
          setCurrentIndex((prev) => prev + 1);
          setIsAnswered(false);
          setIsCurrentCorrect(null);
          void ensureAdaptiveBuffer();
          return;
        }
        toast({ title: 'Generating next questions...', description: 'Please press next again in a moment.' });
        void ensureAdaptiveBuffer();
        return;
      }

      setCurrentIndex((prev) => prev + 1);
      setIsAnswered(false);
      setIsCurrentCorrect(null);
      if (questions.length - (currentIndex + 1) <= 3) {
        void ensureAdaptiveBuffer();
      }
      return;
    }

    if (currentIndex >= questions.length - 1) {
      setIsFinished(true);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setIsAnswered(false);
    setIsCurrentCorrect(null);
  };

  const finishQuizNow = () => {
    setIsFinished(true);
  };

  if (isFinished) {
    return (
      <QuizResults
        quiz={{ ...quiz, questions }}
        answers={answers}
        gradingSummary={gradingSummary}
        selectedGrading={selectedGrading}
        onRestart={onRestart}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const modeTitle = effectiveMode === 'classic' ? 'Classic' : effectiveMode === 'assisted' ? 'Assisted' : 'Adaptive';
  const progressText = `${Math.min(currentIndex + 1, questions.length)} / ${effectiveMode === 'adaptive' ? `${adaptiveCap} max` : questions.length}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{modeTitle} mode</CardTitle>
            <CardDescription>{quiz.title}</CardDescription>
          </div>
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> {progressText}</div>
            {effectiveMode === 'adaptive' ? <div className="mt-1 flex items-center gap-1"><Flag className="h-3.5 w-3.5" /> cap {adaptiveCap}</div> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <QuestionView
          question={currentQuestion}
          answer={currentAnswer}
          disabled={effectiveMode !== 'classic' && isAnswered}
          showHint={effectiveMode === 'assisted'}
          onChange={handleSetAnswer}
        />

        {effectiveMode !== 'classic' && isAnswered ? (
          <Alert variant={isCurrentCorrect ? 'default' : 'destructive'}>
            {isCurrentCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <AlertTitle>{isCurrentCorrect ? 'Correct' : 'Incorrect'}</AlertTitle>
            <AlertDescription>
              {isCurrentCorrect ? 'Good answer.' : `Correct answer is shown in the final overview${effectiveMode === 'assisted' ? ' and immediately now.' : '.'}`}
            </AlertDescription>
          </Alert>
        ) : null}

        {effectiveMode === 'assisted' && isAnswered ? (
          <div className="rounded-xl border border-border surface-interactive p-3">
            <p className="text-xs text-muted-foreground">Correct answer</p>
            <p className="mt-1 text-sm">{getCorrectAnswerText(currentQuestion)}</p>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Answered: {answeredCount}</div>
        <div className="flex items-center gap-2">
          {effectiveMode === 'adaptive' ? (
            <Button type="button" variant="outline" onClick={finishQuizNow}>Finish</Button>
          ) : null}

          {effectiveMode === 'assisted' && !isAnswered ? (
            <Button type="button" onClick={handleAnswerPress} disabled={!canAdvance}>Answer</Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                if (effectiveMode === 'classic' && !isAnswered) {
                  handleAnswerPress();
                }
                advanceQuestion();
              }}
              disabled={effectiveMode === 'assisted' ? !isAnswered : !canAdvance}
            >
              {effectiveMode !== 'adaptive' && currentIndex >= questions.length - 1 ? 'Finish' : 'Next'}
              {(effectiveMode === 'adaptive' && isAdaptiveLoading) ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
