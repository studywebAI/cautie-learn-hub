
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Flashcard } from '@/lib/types';
// import { explainAnswer } from '@/ai/flows/explain-answer'; // Removed direct import
import { useToast } from '@/hooks/use-toast';
import { ChevronsLeftRight, ArrowLeft, ArrowRight, RefreshCw, Lightbulb, Loader2, Shield, Pause } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { TypeView } from './type-view';
import { MultipleChoiceView } from './multiple-choice-view';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
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

// Sub-component for Classic Flip Mode
function FlipView({ card, isFlipped, setIsFlipped }: { card: Flashcard; isFlipped: boolean; setIsFlipped: (f: boolean) => void; }) {
  return (
    <div className='flex flex-col items-center justify-center gap-6'>
      <div className="w-full max-w-lg h-80 [perspective:1000px]">
        <div
          className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]"
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className="absolute flex items-center justify-center p-6 w-full h-full bg-card border rounded-lg [backface-visibility:hidden]">
            <p className="text-center text-xl font-medium">{card.front}</p>
          </div>
          <div className="absolute flex items-center justify-center p-6 w-full h-full bg-card border rounded-lg [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <p className="text-center text-muted-foreground">{card.back}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center">
        <Button variant="secondary" onClick={() => setIsFlipped(!isFlipped)}>
          <ChevronsLeftRight className="mr-2 h-4 w-4" />
          Flip Card
        </Button>
      </div>
    </div>
  );
}

// Main Viewer Component
export function FlashcardViewer({
  cards,
  mode,
  onRestart,
  taskId,
  studysetId,
}: {
  cards: Flashcard[];
  mode: StudyMode;
  onRestart: () => void;
  taskId?: string;
  studysetId?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [answerCorrectness, setAnswerCorrectness] = useState<boolean | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [cardsReviewed, setCardsReviewed] = useState<Set<string>>(new Set());
  const [correctCards, setCorrectCards] = useState(0);
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
      for (const card of cards) {
        hydrated[card.id] = parsed[card.id] || defaultSRSState();
      }
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
    if (currentIndex >= queue.length) {
      setCurrentIndex(Math.max(0, queue.length - 1));
    }
  }, [queue.length, currentIndex]);

  useEffect(() => {
    cardStartedAtRef.current = Date.now();
    setAnswerCorrectness(null);
  }, [currentIndex]);

  // Track card as reviewed when moving forward
  const markCurrentReviewed = useCallback(() => {
    const id = queue[currentIndex]?.id;
    if (!id) return;
    setCardsReviewed(prev => new Set(prev).add(id));
  }, [currentIndex, queue]);

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

  // Save flashcard session to database
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
          }
        })
      });
      console.log('Flashcard session saved to database');

      if (taskId && studysetId) {
        const weakTopics: string[] = [];
        if (deckHealth.dueCount > Math.max(2, Math.round(cards.length * 0.35))) {
          weakTopics.push('memory retention');
        }
        if (deckHealth.lapseRate > 0.25) {
          weakTopics.push('recall stability');
        }
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
    if (isCorrect) {
      setCorrectCards((prevCount) => prevCount + 1);
    }

    if (currentIndex >= queue.length - 1) {
      saveFlashcardProgress();
      toast({ title: 'Review queue complete', description: 'Queue updated using spaced repetition.' });
      return;
    }
    setDirection(1);
    setIsFlipped(false);
    setIsAnswered(false);
    setAnswerCorrectness(null);
    setExplanation(null);
    setCurrentIndex((prevIndex) => prevIndex + 1);
  };

  const handleNext = () => {
    if (currentIndex === queue.length - 1) {
      // Last card - save progress
      markCurrentReviewed();
      saveFlashcardProgress();
      return;
    }
    markCurrentReviewed();
    setDirection(1);
    setIsFlipped(false);
    setIsAnswered(false);
    setAnswerCorrectness(null);
    setExplanation(null);
    setCurrentIndex((prev) => (prev + 1));
  };

  const handlePrev = () => {
    if (currentIndex === 0) return;
    setDirection(-1);
    setIsFlipped(false);
    setIsAnswered(false);
    setAnswerCorrectness(null);
    setExplanation(null);
    setCurrentIndex((prev) => (prev - 1));
  };
  
  const handleFlipOrCheck = () => {
    if (mode === 'flip') {
        setIsFlipped(f => !f);
    } else if (mode === 'type') {
        // Find the button and click it to trigger submission within TypeView
        const checkButton = (document.getElementById('check-answer-btn') as HTMLButtonElement);
        checkButton?.click();
    }
  }
  
  const handleGetExplanation = async () => {
    const card = queue[currentIndex];
    if (!card) return;
    setIsExplanationLoading(true);
    setExplanation(null);
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
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        const result = await response.json();
        setExplanation(result.explanation);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Could not get explanation',
            description: 'The AI failed to generate an explanation. Please try again.',
        });
    } finally {
        setIsExplanationLoading(false);
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent shortcuts when user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        switch (e.key) {
            case 'ArrowRight':
                if (mode === 'flip' || isAnswered) handleNext();
                break;
            case 'ArrowLeft':
                handlePrev();
                break;
            case ' ': // Spacebar
                e.preventDefault();
                if(mode === 'flip' || mode === 'type') handleFlipOrCheck();
                break;
        }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, queue.length, mode, isAnswered]);

  const card = queue[currentIndex];
  const deckHealth = computeDeckHealth();
  const canRate = !!card && ((mode === 'flip' && isFlipped) || (mode !== 'flip' && isAnswered));

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
      for (const id of Object.keys(next)) {
        next[id] = { ...next[id], suspended: false, buriedUntil: null };
      }
      return next;
    });
  };

  const getModeDescription = () => {
    switch (mode) {
        case 'flip': return 'Flip, then mark correct or incorrect.';
        case 'type': return 'Answer, then confirm correct or incorrect.';
        case 'multiple-choice': return 'Choose an answer, then confirm correct or incorrect.';
        default: return '';
    }
  }

  const weakestCards = React.useMemo(() => {
    return cards
      .map((cardItem) => {
        const state = srsState[cardItem.id] || defaultSRSState();
        const weakness = (state.lapses * 2) + (isDueNow(state.dueAt) ? 1 : 0) + Math.max(0, 2.5 - state.ease);
        return {
          id: cardItem.id,
          front: cardItem.front,
          weakness,
          lapses: state.lapses,
          ease: state.ease,
          due: isDueNow(state.dueAt),
        };
      })
      .sort((a, b) => b.weakness - a.weakness)
      .slice(0, 5);
  }, [cards, srsState]);

  const handleCardAnswered = useCallback((isCorrect?: boolean) => {
    setIsAnswered(true);
    setAnswerCorrectness(Boolean(isCorrect));
  }, []);

  const renderCardContent = () => {
    switch(mode) {
        case 'flip':
            return <FlipView card={card} isFlipped={isFlipped} setIsFlipped={setIsFlipped} />;
        case 'type':
            return <TypeView card={card} onAnswered={(correct) => handleCardAnswered(correct)} />;
        case 'multiple-choice':
            return <MultipleChoiceView card={card} onAnswered={(correct) => handleCardAnswered(correct)} />;
        default:
            return null;
    }
  }
  
  const showExplanationButton = (mode === 'flip' && isFlipped) || (mode !== 'flip' && isAnswered);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Study Flashcards</CardTitle>
        <CardDescription>
          Card {queue.length === 0 ? 0 : currentIndex + 1} of {queue.length}. {getModeDescription()}
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="outline">Deck Health {deckHealth.health}%</Badge>
          <Badge variant="secondary">{deckHealth.dueCount} due</Badge>
          <Badge variant="secondary">{deckHealth.matureCount} mature</Badge>
          <Badge variant="secondary">Lapse {(deckHealth.lapseRate * 100).toFixed(0)}%</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 overflow-hidden min-h-[24rem]">
        {queue.length === 0 && (
          <div className="w-full rounded-md border p-4 text-sm text-muted-foreground">
            All cards are suspended or buried for now.
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={unsuspendAll}>Unsuspend/Unbury All</Button>
            </div>
          </div>
        )}
        {queue.length > 0 && (
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'tween', duration: 0.3 },
              opacity: { duration: 0.2 },
            }}
            className="w-full"
          >
            <div className="flex flex-col items-center justify-center">
              {renderCardContent()}
               {showExplanationButton && (
                    <div className="mt-6">
                         <Button variant="outline" size="sm" onClick={handleGetExplanation} disabled={isExplanationLoading}>
                            {isExplanationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                            {isExplanationLoading ? 'Generating...' : 'Explain this'}
                        </Button>
                    </div>
                )}
            </div>
          </motion.div>
        </AnimatePresence>
        )}
        {explanation && (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <Alert className="border-blue-500/50 text-blue-500 dark:text-blue-400 [&>svg]:text-blue-500 dark:[&>svg]:text-blue-400">
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Explanation</AlertTitle>
                    <AlertDescription>
                        {explanation}
                    </AlertDescription>
                </Alert>
            </motion.div>
        )}
        {canRate && (
          <div className="w-full max-w-md space-y-2">
            <p className="text-xs text-muted-foreground text-center">Mark result. Scheduling uses result + response time.</p>
            {answerCorrectness !== null && (
              <p className="text-[11px] text-muted-foreground text-center">
                Auto-detected answer: {answerCorrectness ? 'Correct' : 'Incorrect'} (you can override)
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="destructive" onClick={() => applyOutcome(false)}>Incorrect</Button>
              <Button size="sm" onClick={() => applyOutcome(true)}>Correct</Button>
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
        <div className="w-full space-y-3 rounded-md border p-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Weakest cards</p>
            <p className="text-xs text-muted-foreground">Sorted by misses and overdue pressure.</p>
          </div>
          <div className="space-y-2">
            {weakestCards.length === 0 && <p className="text-xs text-muted-foreground">No weak cards yet.</p>}
            {weakestCards.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded border p-2">
                <p className="truncate pr-2 text-xs">{item.front}</p>
                <div className="flex items-center gap-1">
                  {item.due && <Badge variant="outline" className="text-[10px]">Due</Badge>}
                  <Badge variant="secondary" className="text-[10px]">Lapses {item.lapses}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="ghost" onClick={() => { saveFlashcardProgress(); onRestart(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Start Over
        </Button>
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Previous Card" disabled={currentIndex === 0}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleNext} 
            aria-label="Next Card" 
            disabled={currentIndex === queue.length - 1 || (mode !== 'flip' && !isAnswered)}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
