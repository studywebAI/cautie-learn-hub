'use client';

import React, { useState, useRef, useEffect } from 'react';
import { type Flashcard } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle } from 'lucide-react';

interface TypeViewProps {
  card: Flashcard;
  onAnswered: (isCorrect: boolean) => void;
}

export function TypeView({ card, onAnswered }: TypeViewProps) {
    const [userAnswer, setUserAnswer] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsSubmitted(false);
        setUserAnswer('');
        setIsCorrect(false);
        inputRef.current?.focus({ preventScroll: true });
    }, [card]);


    const handleCheckAnswer = () => {
        if (!userAnswer || isSubmitted) return;
        const correct = userAnswer.trim().toLowerCase() === card.back.trim().toLowerCase();
        setIsCorrect(correct);
        setIsSubmitted(true);
        onAnswered(correct);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleCheckAnswer();
        }
    }

    const clozeSentence = card.cloze || `____ is defined as: ${card.back}`;
    const [before, after] = clozeSentence.split('____');

    return (
        <div className="w-full max-w-4xl min-h-[26rem] flex flex-col items-center justify-center gap-5">
            <div className="flex items-center justify-center p-8 w-full min-h-[16rem] bg-card border rounded-2xl">
                 <p className="text-center text-3xl leading-[1.35]">
                    {before}
                    <span className='inline-block w-40 border-b-2 border-dashed align-middle mx-2'></span>
                    {after}
                 </p>
            </div>
            
            <div className="w-full max-w-2xl space-y-2">
                 <Input
                    ref={inputRef}
                    placeholder="Type your answer..."
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitted}
                    className={cn(
                        'text-center text-xl h-14',
                        isSubmitted && isCorrect && 'border-green-500 focus-visible:ring-green-500',
                        isSubmitted && !isCorrect && 'border-red-500 focus-visible:ring-red-500'
                    )}
                 />
                 {isSubmitted && !isCorrect && (
                     <p className="text-sm text-center text-muted-foreground">
                         Correct answer: <span className="font-semibold text-foreground">{card.back}</span>
                     </p>
                 )}
                 {isSubmitted && (
                     <div className={cn("flex items-center justify-center gap-2 text-sm", isCorrect ? 'text-green-600' : 'text-red-600')}>
                        {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span>{isCorrect ? "Correct!" : "Incorrect"}</span>
                     </div>
                 )}
            </div>

            <div className='flex items-center justify-center'>
                 <Button id="check-answer-btn" variant="secondary" onClick={handleCheckAnswer} disabled={isSubmitted || !userAnswer}>
                    Check Answer
                </Button>
            </div>
        </div>
    )
}
