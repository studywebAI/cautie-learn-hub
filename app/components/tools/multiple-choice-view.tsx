'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { type Flashcard } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle, ChevronsLeftRight, XCircle } from 'lucide-react';

interface MultipleChoiceViewProps {
  card: Flashcard;
  allCards: Flashcard[];
  isFlipped: boolean;
  setIsFlipped: (flipped: boolean) => void;
  onAnswered: (isCorrect: boolean) => void;
}

type ChoiceOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

function buildChoices(card: Flashcard, allCards: Flashcard[]): ChoiceOption[] {
  const pool = allCards.filter((item) => item.id !== card.id && item.back?.trim());

  const sortedPool = [...pool].sort((a, b) => {
    const scoreA = hashString(`${card.id}:${a.id}`);
    const scoreB = hashString(`${card.id}:${b.id}`);
    return scoreA - scoreB;
  });

  const distractors = sortedPool.slice(0, 2).map((item, idx) => ({
    id: `d-${item.id}-${idx}`,
    text: item.back,
    isCorrect: false,
  }));

  while (distractors.length < 2) {
    distractors.push({
      id: `fallback-${distractors.length}`,
      text: distractors.length === 0 ? 'Not this answer' : 'Another option',
      isCorrect: false,
    });
  }

  const options: ChoiceOption[] = [
    {
      id: `c-${card.id}`,
      text: card.back,
      isCorrect: true,
    },
    ...distractors,
  ];

  return options.sort((a, b) => {
    const scoreA = hashString(`${card.id}:${a.id}:slot`);
    const scoreB = hashString(`${card.id}:${b.id}:slot`);
    return scoreA - scoreB;
  });
}

export function MultipleChoiceView({ card, allCards, isFlipped, setIsFlipped, onAnswered }: MultipleChoiceViewProps) {
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const choices = useMemo(() => buildChoices(card, allCards), [card, allCards]);

  useEffect(() => {
    setIsAnswered(false);
    setSelectedOptionId(null);
  }, [card.id]);

  const handleSelect = (option: ChoiceOption) => {
    if (!isFlipped || isAnswered) return;
    setSelectedOptionId(option.id);
    setIsAnswered(true);
    onAnswered(option.isCorrect);
  };

  const selectedOption = choices.find((option) => option.id === selectedOptionId);

  if (!isFlipped) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4">
        <div className="flex min-h-[260px] w-full max-w-5xl items-center justify-center rounded-2xl border border-border/80 bg-card px-12 py-10 shadow-sm">
          <p className="max-w-[92%] text-center text-2xl leading-[1.35] text-foreground md:text-4xl">{card.front}</p>
        </div>
        <Button variant="secondary" onClick={() => setIsFlipped(true)} className="rounded-full px-6">
          <ChevronsLeftRight className="mr-2 h-4 w-4" />
          Reveal choices
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl space-y-4">
      <div className="rounded-2xl border border-border/80 bg-card px-8 py-6 shadow-sm">
        <p className="text-center text-lg leading-[1.35] text-muted-foreground md:text-2xl">{card.front}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {choices.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const showCorrect = isAnswered && option.isCorrect;
          const showIncorrect = isAnswered && isSelected && !option.isCorrect;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              className={cn(
                'min-h-[130px] rounded-xl border px-4 py-3 text-left transition-colors',
                'bg-card/90 hover:bg-muted/30',
                !isAnswered && 'cursor-pointer',
                isAnswered && 'cursor-default',
                showCorrect && 'border-emerald-500/60 bg-emerald-500/10',
                showIncorrect && 'border-red-500/60 bg-red-500/10'
              )}
              disabled={isAnswered}
            >
              <p className="line-clamp-4 text-sm leading-6">{option.text}</p>
              {showCorrect && (
                <span className="mt-3 inline-flex items-center text-xs text-emerald-600">
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                  Correct
                </span>
              )}
              {showIncorrect && (
                <span className="mt-3 inline-flex items-center text-xs text-red-600">
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Incorrect
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isAnswered && selectedOption && !selectedOption.isCorrect && (
        <p className="text-center text-sm text-muted-foreground">
          Correct answer: <span className="text-foreground">{card.back}</span>
        </p>
      )}
    </div>
  );
}
