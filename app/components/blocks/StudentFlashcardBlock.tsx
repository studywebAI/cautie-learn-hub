'use client';

import React, { useRef, useState } from 'react';
import { BaseBlock, FlashcardBlockContent } from './types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';

interface StudentFlashcardBlockProps {
  block: BaseBlock & { data: FlashcardBlockContent };
  onSubmit: (answerData: any) => Promise<{ ok: boolean; error?: string }>;
  isSubmitted?: boolean;
}

export const StudentFlashcardBlock: React.FC<StudentFlashcardBlockProps> = ({
  block,
  onSubmit,
  isSubmitted = false,
}) => {
  const cards = block.data.cards || [];
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCardIds, setKnownCardIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  const current = cards[index];

  const markCard = (known: boolean) => {
    setKnownCardIds((prev) => {
      const withoutCurrent = prev.filter((id) => id !== current.id);
      return known ? [...withoutCurrent, current.id] : withoutCurrent;
    });
    setFlipped(false);
    if (index < cards.length - 1) {
      setIndex(index + 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await onSubmit({
      knownCardIds,
      started_at: startedAtRef.current,
      submitted_at: new Date().toISOString(),
    });
    if (!result.ok) {
      setError(result.error || 'Failed to submit answer');
    }
    setIsSubmitting(false);
  };

  if (!current) return null;

  const canFinish = index === cards.length - 1;

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Card {index + 1} / {cards.length}
      </div>
      <div
        className="relative h-40 w-full cursor-pointer select-none"
        style={{ perspective: '1000px' }}
        onClick={() => !isSubmitted && setFlipped((f) => !f)}
      >
        <div
          className="relative h-full w-full rounded-xl border border-border surface-panel transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center p-4 text-center text-lg font-medium"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {current.front || '...'}
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center p-4 text-center text-lg"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {current.back || '...'}
          </div>
        </div>
      </div>

      {!isSubmitted && flipped && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => markCard(false)}>
            <X className="mr-1.5 h-3.5 w-3.5 text-rose-500" /> Still learning
          </Button>
          <Button variant="outline" size="sm" onClick={() => markCard(true)}>
            <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> Knew it
          </Button>
        </div>
      )}

      {!isSubmitted && !flipped && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={index === 0}
            onClick={() => { setIndex(index - 1); setFlipped(false); }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">Click card to flip</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={index === cards.length - 1}
            onClick={() => { setIndex(index + 1); setFlipped(false); }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!isSubmitted && canFinish && !flipped && (
        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Submitting...' : `Finish (${knownCardIds.length}/${cards.length} known)`}
        </Button>
      )}

      {isSubmitted && (
        <div className="text-sm text-green-600 font-medium">Deck reviewed and submitted.</div>
      )}
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
};
