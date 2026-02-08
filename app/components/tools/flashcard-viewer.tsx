
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type Flashcard } from '@/lib/types';
// import { explainAnswer } from '@/ai/flows/explain-answer'; // Removed direct import
import { useToast } from '@/hooks/use-toast';
import { ChevronsLeftRight, ArrowLeft, ArrowRight, RefreshCw, Lightbulb, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { TypeView } from './type-view';
import { MultipleChoiceView } from './multiple-choice-view';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export type StudyMode = 'flip' | 'type' | 'multiple-choice';

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
export function FlashcardViewer({ cards, mode, onRestart }: { cards: Flashcard[]; mode: StudyMode; onRestart: () => void; }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [cardsReviewed, setCardsReviewed] = useState<Set<number>>(new Set());
  const [correctCards, setCorrectCards] = useState(0);
  const startTimeRef = React.useRef(Date.now());
  const { toast } = useToast();

  // Track card as reviewed when moving forward
  const markCurrentReviewed = useCallback(() => {
    setCardsReviewed(prev => new Set(prev).add(currentIndex));
  }, [currentIndex]);

  // Save flashcard session to database
  const saveFlashcardProgress = useCallback(async () => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: 'flashcard',
          score: cards.length > 0 ? Math.round((cardsReviewed.size / cards.length) * 100) : 0,
          total_items: cards.length,
          correct_items: correctCards,
          time_spent_seconds: timeSpent,
          metadata: {
            mode,
            cards_reviewed: cardsReviewed.size,
          }
        })
      });
      console.log('Flashcard session saved to database');
    } catch (error) {
      console.error('Failed to save flashcard session:', error);
    }
  }, [cards.length, cardsReviewed.size, correctCards, mode]);

  const handleNext = () => {
    if (currentIndex === cards.length - 1) {
      // Last card - save progress
      markCurrentReviewed();
      saveFlashcardProgress();
      return;
    }
    markCurrentReviewed();
    setDirection(1);
    setIsFlipped(false);
    setIsAnswered(false);
    setExplanation(null);
    setCurrentIndex((prev) => (prev + 1));
  };

  const handlePrev = () => {
    if (currentIndex === 0) return;
    setDirection(-1);
    setIsFlipped(false);
    setIsAnswered(false);
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
    const card = cards[currentIndex];
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
                    selectedAnswer: card.back, // Treat the back as the "selected" answer
                    correctAnswer: card.back,
                    isCorrect: true, // We always want the "why is this correct" explanation
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
  }, [currentIndex, cards.length, mode, isAnswered]);

  const card = cards[currentIndex];

  const getModeDescription = () => {
    switch (mode) {
        case 'flip': return 'Click the card or press Spacebar to flip it.';
        case 'type': return 'Type the answer to fill in the blank and press Enter.';
        case 'multiple-choice': return 'Select the correct answer from the options below.';
        default: return '';
    }
  }

  const handleCardAnswered = useCallback((isCorrect?: boolean) => {
    setIsAnswered(true);
    if (isCorrect) {
      setCorrectCards(prev => prev + 1);
    }
  }, []);

  const renderCardContent = () => {
    switch(mode) {
        case 'flip':
            return <FlipView card={card} isFlipped={isFlipped} setIsFlipped={setIsFlipped} />;
        case 'type':
            return <TypeView card={card} onAnswered={() => handleCardAnswered(true)} />;
        case 'multiple-choice':
            return <MultipleChoiceView card={card} onAnswered={() => handleCardAnswered(true)} />;
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
          Card {currentIndex + 1} of {cards.length}. {getModeDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 overflow-hidden min-h-[24rem]">
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
            disabled={currentIndex === cards.length - 1 || (mode !== 'flip' && !isAnswered)}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
