'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Flashcard } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronsLeftRight,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Sparkles,
  FileText,
  ListChecks,
  Info,
  Eye,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MultipleChoiceView } from './multiple-choice-view';
import { normalizeForCompare } from '@/lib/study-grading';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type StudyMode = 'flip' | 'multiple-choice' | 'fill-blank';

type CardSRSState = {
  intervalDays: number;
  ease: number;
  dueAt: string;
  reps: number;
  lapses: number;
  suspended: boolean;
  buriedUntil: string | null;
  lastScore: number | null;
  lastReviewedAt: string | null;
};

type SessionCardMetrics = {
  attempts: number;
  correct: number;
  incorrect: number;
  totalResponseMs: number;
  lastResponseMs: number;
};

const TOPIC_STOP_WORDS = new Set([
  'what', 'which', 'when', 'where', 'does', 'from', 'into', 'your', 'that', 'this', 'with',
  'have', 'been', 'were', 'will', 'would', 'could', 'about', 'after', 'before', 'under',
  'term', 'definition', 'answer', 'question', 'defined', 'provide', 'provided', 'following',
]);

const extractTopicTokens = (text: string): string[] => {
  return normalizeForCompare(text)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !TOPIC_STOP_WORDS.has(token));
};

const cardVariants = {
  enter: { opacity: 0, scale: 0.995 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.005 },
};

const defaultSRSState = (): CardSRSState => ({
  intervalDays: 0,
  ease: 2.3,
  dueAt: new Date().toISOString(),
  reps: 0,
  lapses: 0,
  suspended: false,
  buriedUntil: null,
  lastScore: null,
  lastReviewedAt: null,
});

const deckStorageKey = (cards: Flashcard[]) => `tools.flashcards.srs.${cards.map((c) => c.id).join('.')}`;
const isDueNow = (dueAt: string) => new Date(dueAt).getTime() <= Date.now();
const isBuriedNow = (buriedUntil: string | null) => !!buriedUntil && new Date(buriedUntil).getTime() > Date.now();

const computeAdaptiveHeight = (front: string, back: string) => {
  const totalChars = `${front} ${back}`.trim().length;
  const estimatedLines = Math.ceil(totalChars / 44);
  const base = 260;
  const perLine = 8;
  return Math.max(260, Math.min(460, base + estimatedLines * perLine));
};

function FlipView({ card, isFlipped, setIsFlipped, height }: { card: Flashcard; isFlipped: boolean; setIsFlipped: (f: boolean) => void; height: number; }) {
  return (
    <div className='flex w-full flex-col items-center justify-center gap-4'>
      <div className="w-full max-w-5xl [perspective:1200px]" style={{ height: `${height}px` }}>
        <div
          className="relative h-full w-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className="absolute flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border border-border/80 surface-panel px-12 py-10 shadow-sm [backface-visibility:hidden]">
            {card.type === 'image-card' && card.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.imageUrl} alt={card.front} className="max-h-[45%] rounded-lg object-contain" />
            ) : null}
            <p className="max-w-[92%] text-center text-2xl leading-[1.35] text-foreground md:text-4xl">{card.front}</p>
          </div>
          <div className="absolute flex h-full w-full items-center justify-center rounded-2xl border border-border/80 surface-panel px-12 py-10 shadow-sm [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <p className="max-w-[92%] text-center text-xl leading-[1.4] text-muted-foreground md:text-3xl">{card.back}</p>
          </div>
        </div>
      </div>
      <Button variant="secondary" onClick={() => setIsFlipped(!isFlipped)} className="rounded-full px-6">
        <ChevronsLeftRight className="mr-2 h-4 w-4" />
        Flip card
      </Button>
    </div>
  );
}

function FillBlankView({
  card,
  isFlipped,
  setIsFlipped,
  height,
  onRevealed,
}: {
  card: Flashcard;
  isFlipped: boolean;
  setIsFlipped: (f: boolean) => void;
  height: number;
  onRevealed: () => void;
}) {
  const [typedAnswer, setTypedAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);

  const handleReveal = () => {
    if (revealed) return;
    setRevealed(true);
    onRevealed();
  };

  return (
    <div className='flex w-full flex-col items-center justify-center gap-4'>
      <div className="w-full max-w-5xl [perspective:1200px]" style={{ height: `${height}px` }}>
        <div
          className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          <div
            className="absolute flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 surface-panel px-12 py-10 text-center shadow-sm [backface-visibility:hidden]"
            onClick={() => { if (!isFlipped) setIsFlipped(true); }}
          >
            <span className="text-[10px] text-muted-foreground">You see this side</span>
            <p className="max-w-[92%] text-2xl leading-[1.35] text-foreground md:text-4xl">{card.front}</p>
            {!isFlipped && (
              <span className="text-xs text-muted-foreground">Flip the card, then write down the matching answer yourself</span>
            )}
          </div>
          <div className="absolute flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 surface-panel px-10 py-8 text-center shadow-sm [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <span className="text-[10px] text-muted-foreground">Now write down the matching answer</span>
            {!revealed ? (
              <div className="flex w-full max-w-md flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <Textarea
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Type your answer here, like an example..."
                  className="min-h-[110px] text-center text-base"
                  autoFocus
                />
                <Button onClick={handleReveal} className="rounded-full px-6">
                  <Eye className="mr-2 h-4 w-4" />
                  Reveal the real answer
                </Button>
              </div>
            ) : (
              <div className="flex w-full max-w-md flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                <div className="w-full rounded-xl surface-chip p-3">
                  <p className="text-[10px] text-muted-foreground">What you wrote</p>
                  <p className="mt-1 text-sm leading-relaxed">{typedAnswer.trim() || '(left empty)'}</p>
                </div>
                <div className="w-full rounded-xl border border-border/80 p-3">
                  <p className="text-[10px] text-muted-foreground">Correct answer</p>
                  <p className="mt-1 text-base font-medium leading-relaxed">{card.back}</p>
                </div>
                <p className="text-xs text-muted-foreground">Compare the two, then mark yourself below.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {!isFlipped && (
        <Button variant="secondary" onClick={() => setIsFlipped(true)} className="rounded-full px-6">
          <ChevronsLeftRight className="mr-2 h-4 w-4" />
          Flip card
        </Button>
      )}
    </div>
  );
}

export function FlashcardViewer({
  cards,
  mode,
  cardStartSide = 'term',
  onRestart,
  taskId,
  studysetId,
  onCompletionChange,
  onComplete,
  settings,
}: {
  cards: Flashcard[];
  mode: StudyMode;
  cardStartSide?: 'term' | 'explanation';
  onRestart: () => void;
  taskId?: string;
  studysetId?: string;
  onCompletionChange?: (completed: boolean) => void;
  onComplete?: (analytics: { score: number; totalItems: number; correctItems: number }) => void;
  settings?: {
    timePerCardSeconds?: number;
    autoFlipDelayMs?: number;
    activeRecallOnly?: boolean;
    interleavingMode?: boolean;
    semanticLinking?: boolean;
    errorTagging?: boolean;
    memoryStrengthMeter?: boolean;
    showCitations?: boolean;
    mnemonicHints?: boolean;
    explanationMode?: 'literal' | 'research';
  };
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [answerCorrectness, setAnswerCorrectness] = useState<boolean | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [cardsReviewed, setCardsReviewed] = useState<Set<string>>(new Set());
  const [correctCards, setCorrectCards] = useState(0);
  const [sessionMetrics, setSessionMetrics] = useState<Record<string, SessionCardMetrics>>({});
  const [errorTags, setErrorTags] = useState<Record<string, string[]>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [srsState, setSrsState] = useState<Record<string, CardSRSState>>({});
  const [sessionQueueIds, setSessionQueueIds] = useState<string[]>([]);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [notRelevantIds, setNotRelevantIds] = useState<Set<string>>(new Set());
  const [altSelection, setAltSelection] = useState<Record<string, { front?: number; back?: number }>>({});
  const startTimeRef = React.useRef(Date.now());
  const cardStartedAtRef = React.useRef(Date.now());
  const { toast } = useToast();
  const effectiveMode: StudyMode = settings?.activeRecallOnly && mode === 'flip' ? 'multiple-choice' : mode;

  const initialQueue = React.useMemo(() => {
    const due: Flashcard[] = [];
    const fresh: Flashcard[] = [];
    const rest: Flashcard[] = [];

    for (const card of cards) {
      const state = srsState[card.id] || defaultSRSState();
      if (state.suspended || isBuriedNow(state.buriedUntil)) continue;
      if (isDueNow(state.dueAt)) due.push(card);
      else if (state.reps === 0) fresh.push(card);
      else rest.push(card);
    }

    const base = due.length > 0 ? due : fresh.length > 0 ? fresh : rest;
    if (!settings?.interleavingMode) return base;

    const buckets = new Map<string, Flashcard[]>();
    for (const card of base) {
      const topic = extractTopicTokens(card.front)[0] || 'general';
      buckets.set(topic, [...(buckets.get(topic) || []), card]);
    }
    const ordered: Flashcard[] = [];
    const keys = Array.from(buckets.keys());
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const key of keys) {
        const bucket = buckets.get(key) || [];
        const next = bucket.shift();
        if (next) {
          ordered.push(next);
          progressed = true;
        }
        buckets.set(key, bucket);
      }
    }
    return ordered;
  }, [cards, srsState, settings?.interleavingMode]);

  const queue = React.useMemo(() => {
    const map = new Map(cards.map((card) => [card.id, card]));
    return sessionQueueIds.map((id) => map.get(id)).filter(Boolean) as Flashcard[];
  }, [cards, sessionQueueIds]);

  useEffect(() => {
    const key = deckStorageKey(cards);
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as Record<string, CardSRSState>) : {};
      const hydrated: Record<string, CardSRSState> = {};
      for (const card of cards) hydrated[card.id] = parsed[card.id] || defaultSRSState();
      setSrsState(hydrated);
    } catch {
      const initial: Record<string, CardSRSState> = {};
      for (const card of cards) initial[card.id] = defaultSRSState();
      setSrsState(initial);
    }
  }, [cards]);

  useEffect(() => {
    setSessionQueueIds([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsAnswered(false);
    setAnswerCorrectness(null);
    setCardsReviewed(new Set());
    setCorrectCards(0);
    setSessionMetrics({});
    setSessionComplete(false);
    setNotRelevantIds(new Set());
    startTimeRef.current = Date.now();
  }, [cards]);

  useEffect(() => {
    if (sessionQueueIds.length > 0) return;
    if (!cards.length || Object.keys(srsState).length === 0) return;
    const ids = initialQueue.map((card) => card.id);
    setSessionQueueIds(ids);
  }, [cards.length, initialQueue, sessionQueueIds.length, srsState]);

  useEffect(() => {
    if (!cards.length || !Object.keys(srsState).length) return;
    localStorage.setItem(deckStorageKey(cards), JSON.stringify(srsState));
  }, [cards, srsState]);

  useEffect(() => {
    if (queue.length === 0) return;
    if (currentIndex >= queue.length) setCurrentIndex(Math.max(0, queue.length - 1));
  }, [queue.length, currentIndex]);

  useEffect(() => {
    cardStartedAtRef.current = Date.now();
    setAnswerCorrectness(null);
    setExplanation(null);
    setIsExplanationOpen(false);
    setHintRevealed(false);
  }, [currentIndex]);

  useEffect(() => {
    const perCardSeconds = settings?.timePerCardSeconds;
    if (!perCardSeconds || perCardSeconds <= 0 || sessionComplete) {
      setSecondsLeft(null);
      return;
    }
    setSecondsLeft(perCardSeconds);
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          applyOutcome(false);
          return perCardSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, settings?.timePerCardSeconds, sessionComplete]);

  useEffect(() => {
    if (!settings?.autoFlipDelayMs || settings.autoFlipDelayMs <= 0) return;
    if (mode !== 'flip' || isFlipped) return;
    const timer = window.setTimeout(() => setIsFlipped(true), settings.autoFlipDelayMs);
    return () => window.clearTimeout(timer);
  }, [currentIndex, isFlipped, mode, settings?.autoFlipDelayMs]);

  useEffect(() => {
    const completed = queue.length > 0 && cardsReviewed.size >= queue.length;
    if (completed !== sessionComplete) setSessionComplete(completed);
  }, [queue.length, cardsReviewed.size, sessionComplete]);

  useEffect(() => {
    onCompletionChange?.(sessionComplete);
  }, [onCompletionChange, sessionComplete]);

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;
  const firedCompleteRef = React.useRef(false);
  useEffect(() => {
    if (!sessionComplete || firedCompleteRef.current) return;
    firedCompleteRef.current = true;
    const total = queue.length;
    const correct = correctCards;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    onCompleteRef.current?.({ score, totalItems: total, correctItems: correct });
  }, [sessionComplete, queue.length, correctCards]);

  const computeDeckHealth = useCallback(() => {
    const states = cards.map((c) => srsState[c.id] || defaultSRSState());
    const dueCount = states.filter((s) => isDueNow(s.dueAt) && !s.suspended && !isBuriedNow(s.buriedUntil)).length;
    const matureCount = states.filter((s) => s.reps >= 3).length;
    const totalLapses = states.reduce((acc, s) => acc + s.lapses, 0);
    const totalReviews = states.reduce((acc, s) => acc + s.reps + s.lapses, 0);
    const lapseRate = totalReviews > 0 ? totalLapses / totalReviews : 0;
    const duePenalty = cards.length > 0 ? (dueCount / cards.length) * 35 : 0;
    const maturityBoost = cards.length > 0 ? (matureCount / cards.length) * 20 : 0;
    const lapsePenalty = lapseRate * 35;
    const health = Math.max(0, Math.min(100, Math.round(70 - duePenalty - lapsePenalty + maturityBoost)));
    return { health, dueCount, matureCount, lapseRate };
  }, [cards, srsState]);

  const computeTopicAnalytics = useCallback(() => {
    const wrongTopicScores = new Map<string, number>();
    const correctTopicScores = new Map<string, number>();

    for (const cardItem of cards) {
      const metrics = sessionMetrics[cardItem.id];
      if (!metrics || metrics.attempts === 0) continue;
      const tokens = extractTopicTokens(cardItem.front);
      for (const token of tokens) {
        if (metrics.incorrect > 0) {
          wrongTopicScores.set(token, (wrongTopicScores.get(token) || 0) + metrics.incorrect);
        }
        if (metrics.correct > 0) {
          correctTopicScores.set(token, (correctTopicScores.get(token) || 0) + metrics.correct);
        }
      }
    }

    const weakTopics = [...wrongTopicScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([topic]) => topic);

    const strongTopics = [...correctTopicScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([topic]) => topic);

    return { weakTopics, strongTopics };
  }, [cards, sessionMetrics]);

  const saveFlashcardProgress = useCallback(async () => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const deckHealth = computeDeckHealth();
    const sessionTotal = Math.max(1, queue.length);
    const accuracyScore = sessionTotal > 0 ? Math.round((correctCards / sessionTotal) * 100) : 0;
    try {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: 'flashcard',
          score: accuracyScore,
          total_items: sessionTotal,
          correct_items: correctCards,
          time_spent_seconds: timeSpent,
          metadata: {
            mode,
            cards_reviewed: cardsReviewed.size,
            deck_health: deckHealth.health,
            due_cards: deckHealth.dueCount,
            mature_cards: deckHealth.matureCount,
            lapse_rate: deckHealth.lapseRate,
          },
        }),
      });

      if (taskId && studysetId) {
        const { weakTopics } = computeTopicAnalytics();
        const topicsToSave = [...weakTopics];
        if (deckHealth.dueCount > Math.max(2, Math.round(cards.length * 0.35))) topicsToSave.push('memory retention');
        if (deckHealth.lapseRate > 0.25) topicsToSave.push('recall stability');

        await fetch(`/api/studysets/plan-tasks/${taskId}/performance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studysetId,
            toolId: 'flashcards',
            score: accuracyScore,
            totalItems: sessionTotal,
            correctItems: correctCards,
            timeSpentSeconds: timeSpent,
            weakTopics: Array.from(new Set(topicsToSave)).slice(0, 8),
            markCompleted: true,
          }),
        });
      }
    } catch (error) {
    }
  }, [cards.length, queue.length, correctCards, mode, computeDeckHealth, computeTopicAnalytics, studysetId, taskId]);

  const getQualityFromOutcome = (isCorrect: boolean, responseMs: number): 0 | 1 | 2 | 3 => {
    if (!isCorrect) return 0;
    if (responseMs <= 4500) return 3;
    if (responseMs <= 12000) return 2;
    return 1;
  };

  const applyOutcome = (isCorrect: boolean) => {
    const card = queue[currentIndex];
    if (!card) return;

    const responseMs = Math.max(0, Date.now() - cardStartedAtRef.current);
    if (!isCorrect && settings?.errorTagging) {
      const tags: string[] = [];
      if (responseMs > 12000) tags.push('slow-recall');
      if (responseMs <= 4000) tags.push('overconfident-miss');
      if (card.front.length > 90) tags.push('prompt-complexity');
      if (tags.length === 0) tags.push('concept-miss');
      setErrorTags((prevTags) => ({ ...prevTags, [card.id]: tags }));
    }
    const quality = getQualityFromOutcome(isCorrect, responseMs);
    const prev = srsState[card.id] || defaultSRSState();
    const now = new Date();

    let nextEase = prev.ease;
    let nextReps = prev.reps;
    let nextLapses = prev.lapses;
    let nextInterval = prev.intervalDays;

    if (quality === 0) {
      nextEase = Math.max(1.3, prev.ease - 0.2);
      nextReps = 0;
      nextLapses = prev.lapses + 1;
      nextInterval = 1;
    } else if (quality === 1) {
      nextEase = Math.max(1.3, prev.ease - 0.12);
      nextReps = prev.reps + 1;
      nextInterval = Math.max(1, Math.round(Math.max(1, prev.intervalDays) * 1.2));
    } else if (quality === 2) {
      nextEase = prev.ease;
      nextReps = prev.reps + 1;
      nextInterval = prev.reps <= 1 ? 3 : Math.max(1, Math.round(Math.max(1, prev.intervalDays) * prev.ease));
    } else {
      nextEase = Math.min(2.7, prev.ease + 0.06);
      nextReps = prev.reps + 1;
      nextInterval = prev.reps <= 1 ? 5 : Math.max(1, Math.round(Math.max(1, prev.intervalDays) * prev.ease * 1.3));
    }

    const due = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000).toISOString();
    setSrsState((prevState) => ({
      ...prevState,
      [card.id]: {
        ...prevState[card.id],
        intervalDays: nextInterval,
        ease: nextEase,
        reps: nextReps,
        lapses: nextLapses,
        dueAt: due,
        lastScore: quality,
        lastReviewedAt: now.toISOString(),
      },
    }));

    setCardsReviewed((prevSet) => new Set(prevSet).add(card.id));
    if (isCorrect) setCorrectCards((prevCount) => prevCount + 1);
    setSessionMetrics((prevMetrics) => {
      const currentMetrics = prevMetrics[card.id] || {
        attempts: 0,
        correct: 0,
        incorrect: 0,
        totalResponseMs: 0,
        lastResponseMs: 0,
      };
      return {
        ...prevMetrics,
        [card.id]: {
          attempts: currentMetrics.attempts + 1,
          correct: currentMetrics.correct + (isCorrect ? 1 : 0),
          incorrect: currentMetrics.incorrect + (isCorrect ? 0 : 1),
          totalResponseMs: currentMetrics.totalResponseMs + responseMs,
          lastResponseMs: responseMs,
        },
      };
    });

    const isLast = currentIndex >= queue.length - 1;
    if (isLast) {
      void saveFlashcardProgress();
      setIsFlipped(false);
      setIsAnswered(false);
      setAnswerCorrectness(null);
      return;
    }

    setIsFlipped(false);
    setIsAnswered(false);
    setAnswerCorrectness(null);
    setCurrentIndex((prevIndex) => prevIndex + 1);
  };

  const handleNext = () => {
    if (currentIndex >= queue.length - 1) return;
    setIsFlipped(false);
    setIsAnswered(false);
    setAnswerCorrectness(null);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex === 0) return;
    setIsFlipped(false);
    setIsAnswered(false);
    setAnswerCorrectness(null);
    setCurrentIndex((prev) => prev - 1);
  };

  const handleFlipOrCheck = () => {
    if (effectiveMode === 'flip') {
      setIsFlipped((f) => !f);
      return;
    }
    if (!isFlipped) setIsFlipped(true);
  };

  const handleGetExplanation = async () => {
    const card = queue[currentIndex];
    if (!card) return;

    if (explanation) {
      setIsExplanationOpen(true);
      return;
    }

    setIsExplanationLoading(true);
    try {
      const response = await fetch('/api/ai/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'explainAnswer',
          input: {
            question: card.front,
            selectedAnswer: card.back,
            correctAnswer: card.back,
            isFlashcard: true,
          },
        }),
      });

      if (!response.ok) throw new Error(`API call failed: ${response.statusText}`);
      const result = await response.json();
      setExplanation(result.explanation || 'No explanation generated.');
      setIsExplanationOpen(true);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not get explanation',
        description: 'The AI failed to generate an explanation. Please try again.',
      });
    } finally {
      setIsExplanationLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowRight':
          if (effectiveMode === 'flip' || isAnswered) handleNext();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case ' ':
          e.preventDefault();
          if (effectiveMode === 'flip' || effectiveMode === 'multiple-choice' || effectiveMode === 'fill-blank') handleFlipOrCheck();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, queue.length, effectiveMode, isAnswered]);

  const card = queue[currentIndex];
  const effectiveCard = React.useMemo(() => {
    if (!card) return null;
    const sel = altSelection[card.id];
    const front = typeof sel?.front === 'number' ? card.frontAlternatives?.[sel.front] ?? card.front : card.front;
    const back = typeof sel?.back === 'number' ? card.backAlternatives?.[sel.back] ?? card.back : card.back;
    return { ...card, front, back };
  }, [card, altSelection]);
  const displayCard = React.useMemo(() => {
    if (!effectiveCard) return null;
    if (cardStartSide === 'explanation') {
      return { ...effectiveCard, front: effectiveCard.back, back: effectiveCard.front };
    }
    return effectiveCard;
  }, [effectiveCard, cardStartSide]);
  const deckHealth = computeDeckHealth();
  const canRate = !!card && ((effectiveMode === 'flip' && isFlipped) || (effectiveMode !== 'flip' && isAnswered));
  const currentFlipHeight = React.useMemo(() => {
    if (!displayCard) return 460;
    return computeAdaptiveHeight(displayCard.front, displayCard.back);
  }, [displayCard]);

  const weakestCards = React.useMemo(() => {
    return cards
      .map((cardItem) => {
        const state = srsState[cardItem.id] || defaultSRSState();
        const weakness = (state.lapses * 2) + (isDueNow(state.dueAt) ? 1 : 0) + Math.max(0, 2.5 - state.ease);
        return {
          id: cardItem.id,
          front: cardItem.front,
          back: cardItem.back,
          weakness,
          lapses: state.lapses,
          due: isDueNow(state.dueAt),
        };
      })
      .sort((a, b) => b.weakness - a.weakness)
      .slice(0, 5);
  }, [cards, srsState]);

  const relatedCards = React.useMemo(() => {
    if (!settings?.semanticLinking || !card) return [];
    const activeTokens = new Set(extractTopicTokens(card.front));
    return cards
      .filter((candidate) => candidate.id !== card.id)
      .map((candidate) => {
        const overlap = extractTopicTokens(candidate.front).filter((token) => activeTokens.has(token)).length;
        return { card: candidate, overlap };
      })
      .filter((item) => item.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 3)
      .map((item) => item.card);
  }, [card, cards, settings?.semanticLinking]);

  const sessionAnalytics = React.useMemo(() => {
    const reviewedCount = cardsReviewed.size;
    const incorrectCount = Math.max(0, reviewedCount - correctCards);
    const accuracy = reviewedCount > 0 ? Math.round((correctCards / reviewedCount) * 100) : 0;
    const allMetrics = Object.values(sessionMetrics);
    const avgResponseMs = allMetrics.length > 0
      ? Math.round(allMetrics.reduce((sum, item) => sum + item.totalResponseMs, 0) / Math.max(1, allMetrics.reduce((sum, item) => sum + item.attempts, 0)))
      : 0;

    const quickCount = allMetrics.filter((item) => item.lastResponseMs > 0 && item.lastResponseMs <= 4500).length;
    const mediumCount = allMetrics.filter((item) => item.lastResponseMs > 4500 && item.lastResponseMs <= 12000).length;
    const slowCount = allMetrics.filter((item) => item.lastResponseMs > 12000).length;

    const perQuestionBreakdown = cards
      .map((cardItem) => {
        const state = srsState[cardItem.id] || defaultSRSState();
        const metrics = sessionMetrics[cardItem.id];
        const attempts = metrics?.attempts || 0;
        const avgResponseMs = attempts > 0 ? Math.round((metrics?.totalResponseMs || 0) / attempts) : 0;
        const incorrect = metrics?.incorrect || 0;
        const tokens = extractTopicTokens(cardItem.front).slice(0, 4);
        const responseSpeed = avgResponseMs === 0 ? 'n/a' : avgResponseMs <= 4500 ? 'fast' : avgResponseMs <= 12000 ? 'medium' : 'slow';
        let reason = 'Stable';
        if (incorrect > 0 && avgResponseMs > 12000) reason = 'Incorrect + slow recall';
        else if (incorrect > 0) reason = 'Incorrect answers';
        else if (avgResponseMs > 12000) reason = 'Slow recall';
        return {
          id: cardItem.id,
          front: cardItem.front,
          topics: tokens,
          attempts,
          incorrect,
          avgResponseMs,
          responseSpeed,
          reason,
          struggled: incorrect > 0 || avgResponseMs > 12000 || state.lapses > 0 || isDueNow(state.dueAt),
        };
      })
      .sort((a, b) => Number(b.struggled) - Number(a.struggled) || b.avgResponseMs - a.avgResponseMs);

    const topicLinkMap = new Map<string, number>();
    for (const row of perQuestionBreakdown) {
      const uniqueTopics = Array.from(new Set(row.topics));
      for (let i = 0; i < uniqueTopics.length; i += 1) {
        for (let j = i + 1; j < uniqueTopics.length; j += 1) {
          const key = [uniqueTopics[i], uniqueTopics[j]].sort().join(' <-> ');
          topicLinkMap.set(key, (topicLinkMap.get(key) || 0) + 1);
        }
      }
    }
    const topicLinks = [...topicLinkMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([link, weight]) => ({ link, weight }));

    const { weakTopics, strongTopics } = computeTopicAnalytics();
    return {
      reviewedCount,
      incorrectCount,
      accuracy,
      avgResponseMs,
      quickCount,
      mediumCount,
      slowCount,
      weakTopics,
      strongTopics,
      perQuestionBreakdown,
      topicLinks,
    };
  }, [cards, cardsReviewed.size, correctCards, sessionMetrics, srsState, computeTopicAnalytics]);

  const openToolFromWeakCards = (tool: 'notes' | 'quiz') => {
    const source = weakestCards.map((item, index) => `${index + 1}. ${item.front}\nAnswer: ${item.back}`).join('\n\n');
    router.push(`/tools/${tool}?sourceText=${encodeURIComponent(source)}`);
  };

  const handleCardAnswered = useCallback((isCorrect?: boolean) => {
    setIsAnswered(true);
    setAnswerCorrectness(Boolean(isCorrect));
  }, []);

  const handleFillBlankRevealed = useCallback(() => {
    setIsAnswered(true);
  }, []);

  const handleNotRelevant = () => {
    if (!card) return;
    setNotRelevantIds((prev) => {
      const next = new Set(prev);
      next.add(card.id);
      return next;
    });
    handleNext();
  };

  const renderCardContent = () => {
    if (!card) return null;
    if (effectiveMode === 'flip' && displayCard) return <FlipView card={displayCard} isFlipped={isFlipped} setIsFlipped={setIsFlipped} height={currentFlipHeight} />;
    if (effectiveMode === 'fill-blank' && displayCard) {
      return (
        <FillBlankView
          key={card.id}
          card={displayCard}
          isFlipped={isFlipped}
          setIsFlipped={setIsFlipped}
          height={currentFlipHeight}
          onRevealed={handleFillBlankRevealed}
        />
      );
    }
    return (
      <MultipleChoiceView
        card={effectiveCard!}
        allCards={queue}
        isFlipped={isFlipped}
        setIsFlipped={setIsFlipped}
        onAnswered={(correct) => handleCardAnswered(correct)}
      />
    );
  };

  const cardMeta = (settings?.showCitations && card?.citation) || (settings?.mnemonicHints && card?.hint);

  const showExplanationButton = (effectiveMode === 'flip' && isFlipped) || (effectiveMode !== 'flip' && isAnswered);
  const explanationButtonLabel = isExplanationLoading
    ? 'Generating...'
    : explanation
      ? 'Show explanation'
      : 'Explain this';

  return (
    <Card className="h-full border-0 bg-transparent shadow-none flex flex-col">
      <CardHeader className="px-4 md:px-6 pb-2">
        <CardTitle className="font-headline">Study Flashcards</CardTitle>
        <CardDescription>
          Card {queue.length === 0 ? 0 : currentIndex + 1} of {queue.length}. {effectiveMode === 'multiple-choice' ? 'Flip, pick the correct mini card, then mark result.' : effectiveMode === 'fill-blank' ? 'See one side, flip, write the matching answer yourself, then compare and mark result.' : 'Flip, then mark result.'}
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="outline">Deck Health {deckHealth.health}%</Badge>
          <Badge variant="secondary">{deckHealth.dueCount} due</Badge>
          <Badge variant="secondary">{deckHealth.matureCount} mature</Badge>
          <Badge variant="secondary">Lapse {(deckHealth.lapseRate * 100).toFixed(0)}%</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col items-center gap-6 px-4 md:px-6 pb-2 overflow-auto">
        {queue.length === 0 && (
          <div className="w-full rounded-md border border-border/80 p-4 text-sm text-muted-foreground">
            No cards available in this study set.
          </div>
        )}

        {queue.length > 0 && (
          <div className="w-full">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentIndex}
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ opacity: { duration: 0.16 }, scale: { duration: 0.16 } }}
                className="w-full"
              >
                <div className="flex flex-col items-center justify-center">
                  {renderCardContent()}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {card && ((card.frontAlternatives?.length ?? 0) > 0 || (card.backAlternatives?.length ?? 0) > 0) ? (
          <div className="flex w-full max-w-5xl flex-col items-center gap-1.5">
            {card.frontAlternatives && card.frontAlternatives.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[10px] text-muted-foreground/70">Front:</span>
                {[{ label: 'Original', idx: undefined as number | undefined }, ...card.frontAlternatives.map((alt, idx) => ({ label: alt, idx }))].map((opt) => {
                  const isActive = altSelection[card.id]?.front === opt.idx;
                  return (
                    <button
                      key={`front-${opt.idx ?? 'original'}`}
                      type="button"
                      title={opt.label}
                      onClick={() => setAltSelection((prev) => ({ ...prev, [card.id]: { ...prev[card.id], front: opt.idx } }))}
                      className={`max-w-[180px] truncate rounded-full px-2.5 py-1 text-[11px] transition-colors ${isActive ? 'bg-[var(--accent-brand)] text-white' : 'border border-border/60 text-muted-foreground hover:text-foreground'}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {card.backAlternatives && card.backAlternatives.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[10px] text-muted-foreground/70">Back:</span>
                {[{ label: 'Original', idx: undefined as number | undefined }, ...card.backAlternatives.map((alt, idx) => ({ label: alt, idx }))].map((opt) => {
                  const isActive = altSelection[card.id]?.back === opt.idx;
                  return (
                    <button
                      key={`back-${opt.idx ?? 'original'}`}
                      type="button"
                      title={opt.label}
                      onClick={() => setAltSelection((prev) => ({ ...prev, [card.id]: { ...prev[card.id], back: opt.idx } }))}
                      className={`max-w-[180px] truncate rounded-full px-2.5 py-1 text-[11px] transition-colors ${isActive ? 'bg-[var(--accent-brand)] text-white' : 'border border-border/60 text-muted-foreground hover:text-foreground'}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {card && cardMeta ? (
          <div className="flex w-full max-w-5xl flex-wrap items-center justify-center gap-2">
            {settings?.showCitations && card.citation ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Show source citation"
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/80 surface-chip px-3 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                    Source
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-sm" align="center">
                  <p className="text-[10px] text-muted-foreground">Where this came from</p>
                  <p className="mt-1 leading-relaxed">{card.citation}</p>
                  {settings?.explanationMode === 'research' && card.groundingNote ? (
                    <>
                      <p className="mt-3 text-[10px] text-muted-foreground">Why / how it relates</p>
                      <p className="mt-1 leading-relaxed text-muted-foreground">{card.groundingNote}</p>
                    </>
                  ) : null}
                </PopoverContent>
              </Popover>
            ) : null}
            {settings?.mnemonicHints && card.hint ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setHintRevealed((v) => !v)}
                className="h-7 rounded-full border border-border/80 surface-chip px-3 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
                {hintRevealed ? card.hint : 'Reveal hint (ezelsbruggetje)'}
              </Button>
            ) : null}
          </div>
        ) : null}

        {settings?.semanticLinking && relatedCards.length > 0 ? (
          <div className="w-full rounded-xl surface-panel p-3">
            <p className="text-xs text-muted-foreground">Related cards</p>
            <div className="mt-2 space-y-1">
              {relatedCards.map((item) => (
                <p key={`related-${item.id}`} className="text-xs">{item.front}</p>
              ))}
            </div>
          </div>
        ) : null}

        {showExplanationButton && (
          <div className="w-full max-w-2xl text-center">
            <Button variant="outline" size="sm" onClick={handleGetExplanation} disabled={isExplanationLoading} className="rounded-full">
              {isExplanationLoading ? <Spinner size={16} className="mr-2" /> : <Lightbulb className="mr-2 h-4 w-4" />}
              {explanationButtonLabel}
            </Button>
          </div>
        )}

        {canRate && (
          <div className="w-full max-w-xl space-y-3 pb-2">
            <p className="text-xs text-muted-foreground text-center">Mark result with a quick tap.</p>
            {answerCorrectness !== null && (
              <p className="text-[11px] text-muted-foreground text-center">
                Auto-detected: {answerCorrectness ? 'Correct' : 'Incorrect'}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="!bg-red-800 !text-white hover:!bg-red-900" onClick={() => applyOutcome(false)}>
                <XCircle className="mr-2 h-4 w-4" />
                Incorrect
              </Button>
              <Button size="sm" className="!bg-emerald-800 !text-white hover:!bg-emerald-900" onClick={() => applyOutcome(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Correct
              </Button>
            </div>
          </div>
        )}

        {sessionComplete && (
          <div className="w-full space-y-4 px-1">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl surface-panel p-3">
                <p className="text-xs text-muted-foreground">Accuracy</p>
                <p className="text-xl">{sessionAnalytics.accuracy}%</p>
              </div>
              <div className="rounded-xl surface-panel p-3">
                <p className="text-xs text-muted-foreground">Reviewed</p>
                <p className="text-xl">{sessionAnalytics.reviewedCount}</p>
              </div>
              <div className="rounded-xl surface-panel p-3">
                <p className="text-xs text-muted-foreground">Incorrect</p>
                <p className="text-xl">{sessionAnalytics.incorrectCount}</p>
              </div>
              <div className="rounded-xl surface-panel p-3">
                <p className="text-xs text-muted-foreground">Avg response</p>
                <p className="text-xl">{Math.max(1, Math.round(sessionAnalytics.avgResponseMs / 1000))}s</p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl surface-panel p-3">
                <p className="text-sm">Response speed</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md bg-background p-2">
                    <p className="text-muted-foreground">Quick</p>
                    <p className="text-base">{sessionAnalytics.quickCount}</p>
                  </div>
                  <div className="rounded-md bg-background p-2">
                    <p className="text-muted-foreground">Medium</p>
                    <p className="text-base">{sessionAnalytics.mediumCount}</p>
                  </div>
                  <div className="rounded-md bg-background p-2">
                    <p className="text-muted-foreground">Slow</p>
                    <p className="text-base">{sessionAnalytics.slowCount}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl surface-panel p-3">
                <p className="text-sm">Topic signals</p>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Needs retry</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(sessionAnalytics.weakTopics.length > 0 ? sessionAnalytics.weakTopics : ['No weak topic detected']).map((topic) => (
                        <Badge key={`weak-${topic}`} variant="secondary">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Strong topics</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(sessionAnalytics.strongTopics.length > 0 ? sessionAnalytics.strongTopics : ['No strong topic detected']).map((topic) => (
                        <Badge key={`strong-${topic}`} variant="secondary">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {settings?.errorTagging ? (
              <div className="rounded-xl surface-panel p-3">
                <p className="text-sm">Error tags</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(errorTags).length === 0 ? (
                    <Badge variant="secondary">No tagged errors</Badge>
                  ) : (
                    Object.entries(errorTags).flatMap(([id, tags]) =>
                      tags.map((tag) => (
                        <Badge key={`${id}-${tag}`} variant="secondary">
                          {tag}
                        </Badge>
                      ))
                    )
                  )}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl surface-panel p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm">Per-card breakdown</p>
                {notRelevantIds.size > 0 && (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    {notRelevantIds.size} marked not relevant
                  </Badge>
                )}
              </div>
              <div className="mt-2 space-y-2">
                {sessionAnalytics.perQuestionBreakdown.map((item, idx) => (
                  <div key={item.id} className="rounded-md bg-background p-2">
                    <p className="truncate text-xs font-medium">{idx + 1}. {item.front}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {notRelevantIds.has(item.id) && (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">Not relevant</Badge>
                      )}
                      {item.topics.length > 0 && item.topics.map((topic) => (
                        <Badge key={`${item.id}-${topic}`} variant="secondary">{topic}</Badge>
                      ))}
                      <Badge variant="outline">Attempts {item.attempts}</Badge>
                      <Badge variant="outline">Incorrect {item.incorrect}</Badge>
                      <Badge variant="outline">Avg {item.avgResponseMs > 0 ? `${Math.max(1, Math.round(item.avgResponseMs / 1000))}s` : '-'}</Badge>
                      <Badge variant="outline">Speed {item.responseSpeed}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Reason: {item.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            <details className="rounded-xl surface-panel p-3">
              <summary className="cursor-pointer text-sm">Topic web (optional)</summary>
              <div className="mt-2 space-y-1 text-xs">
                {sessionAnalytics.topicLinks.length === 0 ? (
                  <p className="text-muted-foreground">Not enough topic overlap yet.</p>
                ) : (
                  sessionAnalytics.topicLinks.map((item) => (
                    <div key={item.link} className="rounded-md bg-background p-2">
                      {item.link} ({item.weight})
                    </div>
                  ))
                )}
              </div>
            </details>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Button variant="outline" onClick={() => openToolFromWeakCards('notes')}>
                <FileText className="mr-2 h-4 w-4" />
                Notes from Weak Cards
              </Button>
              <Button variant="outline" onClick={() => openToolFromWeakCards('quiz')}>
                <ListChecks className="mr-2 h-4 w-4" />
                Quiz from Weak Cards
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto sticky bottom-0 z-10 bg-background/95 backdrop-blur px-4 py-3 md:px-6">
        <div className="grid w-full grid-cols-3 items-center">
          <div className="flex justify-start">
            <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0} className="h-10 min-w-[120px] rounded-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          <div className="flex justify-center">
            {settings?.memoryStrengthMeter ? (
              <Badge variant="outline" className="mr-2">Memory {deckHealth.health}%</Badge>
            ) : null}
            {secondsLeft !== null ? (
              <Badge variant="secondary" className="mr-2">Timer {secondsLeft}s</Badge>
            ) : null}
            {settings?.explanationMode === 'research' && card && !notRelevantIds.has(card.id) && (
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-3 mr-2 text-[12px] text-muted-foreground hover:text-foreground"
                onClick={handleNotRelevant}
                title="Mark as not relevant to your research"
              >
                <span className="hidden sm:inline">Not relevant</span>
                <span className="sm:hidden">Skip</span>
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => { void saveFlashcardProgress(); onRestart(); }}
              className="h-10 min-w-[120px] rounded-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentIndex === queue.length - 1 || (mode !== 'flip' && !isAnswered)}
              className="h-10 min-w-[120px] rounded-full"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>

      <Dialog open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Explanation
            </DialogTitle>
            <DialogDescription>
              Short explanation for the current card.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[52vh] overflow-auto rounded-md surface-chip p-3 text-sm leading-6">
            {explanation}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExplanationOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

