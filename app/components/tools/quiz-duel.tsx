'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Removed direct import - using API route instead
import type { QuizDuelData } from '@/ai/flows/generate-quiz-duel-data';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, User, Check, X, Swords } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

type QuizDuelProps = {
  sourceText: string;
  onRestart: () => void;
};

function LoadingDuel() {
    return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
            <div className="flex flex-col items-center gap-2 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h3 className="text-2xl font-bold tracking-tight mt-4">
                    Preparing Your Duel
                </h3>
                <p className="text-sm text-muted-foreground">
                    The AI is setting up the arena. Please wait a moment...
                </p>
            </div>
        </div>
    );
}

export function QuizDuel({ sourceText, onRestart }: QuizDuelProps) {
    const [duelData, setDuelData] = useState<QuizDuelData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    
    const { toast } = useToast();

    useEffect(() => {
        const fetchDuelData = async () => {
            setIsLoading(true);
            try {
                const apiResponse = await fetch('/api/ai/handle', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    flowName: 'generateQuizDuelData',
                    input: {
                      sourceText,
                      player1Name: 'You',
                      player2Name: 'AI Opponent',
                      questionCount: 10,
                    },
                  }),
                });
                if (!apiResponse.ok) {
                  throw new Error(`API call failed: ${apiResponse.statusText}`);
                }
                const data = await apiResponse.json();
                setDuelData(data);
            } catch (error) {
                console.error("Failed to generate duel data:", error);
                toast({
                    variant: 'destructive',
                    title: 'Failed to Start Duel',
                    description: 'The AI could not set up the duel. Please try again.',
                });
                onRestart();
            } finally {
                setIsLoading(false);
            }
        };
        fetchDuelData();
    }, [sourceText, onRestart, toast]);
    
    const handleNextRound = () => {
        if (!duelData || currentRoundIndex >= duelData.rounds.length - 1) return;
        setIsAnswered(false);
        setSelectedOptionId(null);
        setCurrentRoundIndex(prev => prev + 1);
    };

    const handleSelectAnswer = (optionId: string) => {
        if (isAnswered) return;
        setSelectedOptionId(optionId);
        setIsAnswered(true);
    }
    
    if (isLoading || !duelData) {
        return <LoadingDuel />;
    }

    const { player1, player2, rounds } = duelData;
    const currentRound = rounds[currentRoundIndex];
    const { question } = currentRound;
    const correctOption = question.options.find(o => o.isCorrect);

    const isFinished = currentRoundIndex === rounds.length -1 && isAnswered;

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="font-headline text-center text-3xl">Quiz Duel!</CardTitle>
                <div className="flex justify-between items-center pt-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-primary">
                            <AvatarImage src={player1.avatarUrl} alt={player1.name} />
                            <AvatarFallback><User /></AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold text-lg">{player1.name}</p>
                            <p className="text-2xl font-bold font-headline text-primary">{player1.score}</p>
                        </div>
                    </div>
                     <Swords className="h-10 w-10 text-muted-foreground" />
                     <div className="flex items-center gap-4 text-right">
                         <div>
                            <p className="font-bold text-lg">{player2.name}</p>
                            <p className="text-2xl font-bold font-headline text-primary">{player2.score}</p>
                        </div>
                        <Avatar className="h-16 w-16 border-2">
                            <AvatarImage src={player2.avatarUrl} alt={player2.name} />
                            <AvatarFallback><User /></AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Round {currentRoundIndex + 1} of {rounds.length}</p>
                     <p className="font-semibold text-xl">{question.question}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {question.options.map(opt => {
                        const isTheCorrectAnswer = correctOption?.id === opt.id;
                        const isSelected = selectedOptionId === opt.id;

                        return (
                             <Button
                                key={opt.id}
                                variant="outline"
                                className={cn(
                                    "h-auto py-3 whitespace-normal justify-start text-left",
                                    isAnswered && isTheCorrectAnswer ? 'bg-green-100 dark:bg-green-900/30 border-green-500/50 hover:bg-green-100' : '',
                                    isAnswered && isSelected && !isTheCorrectAnswer ? 'bg-red-100 dark:bg-red-900/30 border-red-500/50 hover:bg-red-100' : '',
                                    isAnswered && !isSelected ? 'opacity-60' : ''
                                )}
                                onClick={() => handleSelectAnswer(opt.id)}
                                disabled={isAnswered}
                            >
                                <span className="font-bold mr-3">{opt.id.toUpperCase()}.</span>
                                <span>{opt.text}</span>
                                {isAnswered && isTheCorrectAnswer && <Check className="ml-auto h-5 w-5 text-green-600" />}
                                {isAnswered && isSelected && !isTheCorrectAnswer && <X className="ml-auto h-5 w-5 text-red-600" />}
                             </Button>
                        )
                    })}
                </div>

                <AnimatePresence>
                {isAnswered && (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center pt-4"
                     >
                        {currentRound.winnerId ? (
                             <p className="font-semibold">{currentRound.winnerId === player1.id ? player1.name : player2.name} answered first and wins the round!</p>
                        ) : (
                             <p className="font-semibold">It's a draw for this round!</p>
                        )}
                        
                        {isFinished ? (
                            <Button onClick={onRestart} className="mt-4">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {player1.score > player2.score ? 'You Win! Play Again?' : (player2.score > player1.score ? 'You Lose. Try Again?' : 'It\'s a Draw! Rematch?')}
                            </Button>
                        ) : (
                             <Button onClick={handleNextRound} className="mt-4">
                                Next Round
                            </Button>
                        )}
                    </motion.div>
                )}
                </AnimatePresence>


            </CardContent>
            <CardFooter className="flex-col gap-2">
                 <p className="text-xs text-muted-foreground">Round History</p>
                 <div className="flex gap-1.5">
                    {rounds.map((round, index) => (
                        <div key={index} className="h-2 w-6 rounded-full bg-muted relative overflow-hidden">
                            {index <= currentRoundIndex && (
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    className={cn(
                                        "h-full",
                                        !round.winnerId && "bg-muted-foreground",
                                        round.winnerId === player1.id && "bg-primary",
                                        round.winnerId === player2.id && "bg-destructive",
                                    )} />
                            )}
                        </div>
                    ))}
                 </div>
            </CardFooter>
        </Card>
    );
}
