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
  Loader2,
  Shield,
  Pause,
  CheckCircle2,
  XCircle,
  Sparkles,
  FileText,
  ListChecks,
  BookOpen,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { TypeView } from './type-view';
import { MultipleChoiceView } from './multiple-choice-view';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type StudyMode = 'flip' | 'type' | 'multiple-choice';

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
  const estimatedLines = Math.ceil(totalChars / 36);
  const base = 400;
  const perLine = 10;
  return Math.max(400, Math.min(700, base + estimatedLines * perLine));
};

function FlipView({ card, isFlipped, setIsFlipped, height }: { card: Flashcard; isFlipped: boolean; setIsFlipped: (f: boolean) => void; height: number; }) {
  return (
    <div className='flex w-full flex-col items-center justify-center gap-4'>
      <div className="w-[min(96vw,1080px)] [perspective:1200px]" style={{ height: `${height}px` }}>
        <div
          className="relative h-full w-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className="absolute flex h-full w-full items-center justify-center rounded-2xl border border-border/80 bg-card px-12 py-10 shadow-sm [backface-visibility:hidden]">
            <p className="max-w-[92%] text-center text-4xl leading-[1.28] text-foreground">{card.front}</p>
          </div>
          <div className="absolute flex h-full w-full items-center justify-center rounded-2xl border border-border/80 bg-card px-12 py-10 shadow-sm [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <p className="max-w-[92%] text-center text-3xl leading-[1.35] text-muted-foreground">{card.back}</p>
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

export function FlashcardViewer({
  cards,
  mode,
  onRestart,
  taskId,
  studysetId,
  onCompletionChange,
}: {
  cards: Flashcard[];
  mode: StudyMode;
  onRestart: () => void;
  taskId?: string;
  studysetId?: string;
  onCompletionChange?: (completed: boolean) => void;
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
  const [sessionComplete, setSessionComplete] = useState(false);
  const [srsState, setSrsState] = useState<Record<string, CardSRSState>>({});
  const startTimeRef = React.useRef(Date.now());
  const cardStartedAtRef = React.useRef(Date.now());
  const { toast } = useToast();

  const queue = React.useMemo(() => {
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

    if (due.length > 0) return due;
    if (fresh.length > 0) return fresh;
    return rest;
  }, [cards, srsState]);

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
    if (!cards.length || !Object.keys(srsState).length) return;
    localStorage.setItem(deckStorageKey(cards), JSON.stringify(srsState));
  }, [cards, srsState]);

  useEffect(() => {
    if (currentIndex >= queue.length) setCurrentIndex(Math.max(0, queue.length - 1));
  }, [queue.length, currentIndex]);

  useEffect(() => {
    cardStartedAtRef.current = Date.now();
    setAnswerCorrectness(null);
    setExplanation(null);
    setIsExplanationOpen(false);
  }, [currentIndex]);

  useEffect(() => {
    const completed = cards.length > 0 && cardsReviewed.size >= cards.length;
    if (completed !== sessionComplete) setSessionComplete(completed);
  }, [cards.length, cardsReviewed.size, sessionComplete]);

  useEffect(() => {
    onCompletionChange?.(sessionComplete);
  }, [onCompletionChange, sessionComplete]);

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

  const saveFlashcardProgress = useCallback(async () => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const deckHealth = computeDeckHealth();
    const completionScore = cards.length > 0 ? Math.round((cardsReviewed.size / cards.length) * 100) : 0;
    try {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: 'flashcard',
          score: completionScore,
          total_items: cards.length,
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
        const weakTopics: string[] = [];
        if (deckHealth.dueCount > Math.max(2, Math.round(cards.length * 0.35))) weakTopics.push('memory retention');
        if (deckHealth.lapseRate > 0.25) weakTopics.push('recall stability');

        await fetch(`/api/studysets/plan-tasks/${taskId}/performance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studysetId,
            toolId: 'flashcards',
            score: completionScore,
            totalItems: cards.length,
            correctItems: correctCards,
            timeSpentSeconds: timeSpent,
            weakTopics,
            markCompleted: true,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to save flashcard session:', error);
    }
  }, [cards.length, cardsReviewed.size, correctCards, mode, computeDeckHealth, studysetId, taskId]);

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
    if (mode === 'flip') {
      setIsFlipped((f) => !f);
      return;
    }
    if (mode === 'type') {
      const checkButton = document.getElementById('check-answer-btn') as HTMLButtonElement | null;
      checkButton?.click();
    }
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
          if (mode === 'flip' || isAnswered) handleNext();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case ' ':
          e.preventDefault();
          if (mode === 'flip' || mode === 'type') handleFlipOrCheck();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, queue.length, mode, isAnswered]);

  const card = queue[currentIndex];
  const deckHealth = computeDeckHealth();
  const canRate = !!card && ((mode === 'flip' && isFlipped) || (mode !== 'flip' && isAnswered));
  const currentFlipHeight = React.useMemo(() => {
    if (!card) return 460;
    return computeAdaptiveHeight(card.front, card.back);
  }, [card]);

  const suspendCurrent = () => {
    if (!card) return;
    setSrsState((prev) => ({
      ...prev,
      [card.id]: { ...(prev[card.id] || defaultSRSState()), suspended: true },
    }));
    toast({ title: 'Card suspended', description: 'This card is removed from active review queue.' });
  };

  const buryCurrentToday = () => {
    if (!card) return;
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    setSrsState((prev) => ({
      ...prev,
      [card.id]: { ...(prev[card.id] || defaultSRSState()), buriedUntil: endOfDay.toISOString() },
    }));
    toast({ title: 'Card buried for today' });
  };

  const unsuspendAll = () => {
    setSrsState((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) next[id] = { ...next[id], suspended: false, buriedUntil: null };
      return next;
    });
  };

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

  const strongestCards = React.useMemo(() => {
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
      .sort((a, b) => a.weakness - b.weakness)
      .slice(0, 5);
  }, [cards, srsState]);

  const openToolFromWeakCards = (tool: 'notes' | 'quiz' | 'flashcards') => {
    const source = weakestCards.map((item, index) => `${index + 1}. ${item.front}\nAnswer: ${item.back}`).join('\n\n');
    router.push(`/tools/${tool}?sourceText=${encodeURIComponent(source)}`);
  };

  const handleCardAnswered = useCallback((isCorrect?: boolean) => {
    setIsAnswered(true);
    setAnswerCorrectness(Boolean(isCorrect));
  }, []);

  const renderCardContent = () => {
    if (!card) return null;
    if (mode === 'flip') return <FlipView card={card} isFlipped={isFlipped} setIsFlipped={setIsFlipped} height={currentFlipHeight} />;
    if (mode === 'type') return <TypeView card={card} onAnswered={(correct) => handleCardAnswered(correct)} />;
    return <MultipleChoiceView card={card} onAnswered={(correct) => handleCardAnswered(correct)} />;
  };

  const showExplanationButton = (mode === 'flip' && isFlipped) || (mode !== 'flip' && isAnswered);
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
          Card {queue.length === 0 ? 0 : currentIndex + 1} of {queue.length}. {mode === 'multiple-choice' ? 'Choose the correct answer, then mark result.' : mode === 'type' ? 'Type answer, then mark result.' : 'Flip, then mark result.'}
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
            All cards are suspended or buried for now.
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={unsuspendAll}>Unsuspend/Unbury All</Button>
            </div>
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

        {showExplanationButton && (
          <div className="w-full max-w-2xl text-center">
            <Button variant="outline" size="sm" onClick={handleGetExplanation} disabled={isExplanationLoading} className="rounded-full">
              {isExplanationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
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
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={buryCurrentToday}>
                <Pause className="mr-2 h-4 w-4" />
                Bury Today
              </Button>
              <Button size="sm" variant="outline" onClick={suspendCurrent}>
                <Shield className="mr-2 h-4 w-4" />
                Suspend Card
              </Button>
            </div>
          </div>
        )}

        {sessionComplete && (
          <div className="w-full space-y-4 rounded-xl border border-border/80 bg-card p-4">
            <div>
              <p className="text-base">Best and Worst Cards</p>
              <p className="text-xs text-muted-foreground">Your weakest cards are listed first so you can regenerate focused material.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-red-700">Worst cards</p>
                {weakestCards.map((item) => (
                  <div key={item.id} className="rounded-md border border-red-200/70 bg-red-50/50 p-2 text-xs">
                    <p className="truncate">{item.front}</p>
                    <p className="text-muted-foreground">Lapses: {item.lapses} {item.due ? '· Due' : ''}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-emerald-700">Best cards</p>
                {strongestCards.map((item) => (
                  <div key={item.id} className="rounded-md border border-emerald-200/70 bg-emerald-50/40 p-2 text-xs">
                    <p className="truncate">{item.front}</p>
                    <p className="text-muted-foreground">Lapses: {item.lapses} {item.due ? '· Due' : ''}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Button variant="outline" onClick={() => openToolFromWeakCards('flashcards')}>
                <BookOpen className="mr-2 h-4 w-4" />
                New Flashcards
              </Button>
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

      <CardFooter className="mt-auto sticky bottom-0 z-10 border-t border-border/70 bg-background/95 backdrop-blur px-4 py-3 md:px-6">
        <div className="flex w-full items-center justify-between">
          <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0} className="rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => { void saveFlashcardProgress(); onRestart(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
          </div>
          <Button variant="outline" onClick={handleNext} disabled={currentIndex === queue.length - 1 || (mode !== 'flip' && !isAnswered)} className="rounded-full">
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
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
          <div className="max-h-[52vh] overflow-auto rounded-md bg-muted/60 p-3 text-sm leading-6">
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

