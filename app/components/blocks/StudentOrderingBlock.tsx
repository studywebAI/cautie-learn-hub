'use client';

import React, { useMemo, useRef, useState } from 'react';
import { BaseBlock, OrderingContent } from './types';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { normalizeBlockSettings } from '@/lib/assignments/settings';

interface StudentOrderingBlockProps {
  block: BaseBlock & { data: OrderingContent };
  onSubmit: (answerData: any) => Promise<{ ok: boolean; error?: string }>;
  isSubmitted?: boolean;
}

export const StudentOrderingBlock: React.FC<StudentOrderingBlockProps> = ({
  block,
  onSubmit,
  isSubmitted = false,
}) => {
  const settings = normalizeBlockSettings((block as any).settings || block.data?.settings || {});
  const startedAtRef = useRef<string>(new Date().toISOString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialOrder = useMemo(() => {
    const indices = block.data.items.map((_, idx) => idx);
    if (!settings.matching.shuffleItems) return indices;
    const shuffled = [...indices];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [block.data.items, settings.matching.shuffleItems]);

  const [order, setOrder] = useState<number[]>(initialOrder);

  const move = (index: number, direction: 'up' | 'down') => {
    if (isSubmitted || isSubmitting) return;
    const next = [...order];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await onSubmit({
      order,
      started_at: startedAtRef.current,
      submitted_at: new Date().toISOString(),
    });
    if (!result.ok) {
      setError(result.error || 'Failed to submit answer');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="font-medium">{block.data.prompt || 'Put the items in the correct order'}</div>
      <div className="space-y-2">
        {order.map((itemIndex, index) => (
          <div key={`${block.id}-${itemIndex}`} className="flex items-center gap-2 rounded-md border bg-background p-3">
            <div className="flex flex-col gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(index, 'up')} disabled={isSubmitted || isSubmitting || index === 0}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(index, 'down')} disabled={isSubmitted || isSubmitting || index === order.length - 1}>
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground w-6">{index + 1}.</div>
            <div className="flex-1">{block.data.items[itemIndex]}</div>
          </div>
        ))}
      </div>

      {!isSubmitted && (
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      )}
      {isSubmitted && <div className="text-sm text-green-600">Answer submitted successfully.</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
};

