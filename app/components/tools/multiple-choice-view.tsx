
'use client';

import React, { useState, useEffect } from 'react';
import { type Flashcard, type McqQuestion } from '@/lib/types'; // Import McqQuestion from types
// import { generateMultipleChoiceFromFlashcard, type McqQuestion } from '@/ai/flows/generate-multiple-choice-from-flashcard'; // Removed direct import
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle } from 'lucide-react';

interface MultipleChoiceViewProps {
  card: Flashcard;
  onAnswered: (isCorrect: boolean) => void;
}

export function MultipleChoiceView({ card, onAnswered }: MultipleChoiceViewProps) {
  const [mcq, setMcq] = useState<McqQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const generateQuestion = async () => {
      setIsLoading(true);
      setIsAnswered(false);
      setSelectedOptionId(null);
      try {
        const response = await fetch('/api/ai/handle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                flowName: 'generateMultipleChoiceFromFlashcard',
                input: {
                    front: card.front,
                    back: card.back,
                },
            }),
        });
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        const result = await response.json();
        setMcq(result);
      } catch (error) {
        console.error('Failed to generate multiple choice question', error);
        toast({
          variant: 'destructive',
          title: 'AI Error',
          description: 'Could not generate a multiple-choice question for this card.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    generateQuestion();
  }, [card, toast]);

  const handleSelectOption = (optionId: string) => {
    if (isAnswered) return;
    setSelectedOptionId(optionId);
    setIsAnswered(true);
    onAnswered(optionId === mcq?.correctOptionId);
  };
  
  if (isLoading) {
    return (
        <div className="w-full max-w-md space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    )
  }

  if (!mcq) {
    return <p className="text-destructive text-center">Failed to load question.</p>;
  }

  return (
    <div className="w-full max-w-md">
      <p className="font-semibold mb-4 text-lg text-center">{mcq.question}</p>
      <RadioGroup onValueChange={handleSelectOption} value={selectedOptionId || ''} disabled={isAnswered}>
        <div className="space-y-3">
          {mcq.options.map((opt: { id: string; text: string }) => { // Explicitly type opt
            const isTheCorrectAnswer = mcq.correctOptionId === opt.id;
            const isSelected = selectedOptionId === opt.id;

            return (
              <Label
                key={opt.id}
                htmlFor={`${mcq.question}-${opt.id}`}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-md text-sm border transition-all',
                  isAnswered && isTheCorrectAnswer ? 'bg-green-100 dark:bg-green-900/30 border-green-500/50' : '',
                  isAnswered && isSelected && !isTheCorrectAnswer ? 'bg-red-100 dark:bg-red-900/30 border-red-500/50' : '',
                  !isAnswered ? 'cursor-pointer hover:bg-muted/80' : 'cursor-default',
                  isAnswered && !isSelected && !isTheCorrectAnswer ? 'bg-muted/50 opacity-70' : ''
                )}
              >
                <RadioGroupItem value={opt.id} id={`${mcq.question}-${opt.id}`} className="flex-shrink-0" />
                <span>{opt.text}</span>
                {isAnswered && (isSelected || isTheCorrectAnswer) && (isTheCorrectAnswer ? <CheckCircle className="h-5 w-5 text-green-600 ml-auto" /> : <XCircle className="h-5 w-5 text-red-600 ml-auto" />)}
              </Label>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
}
