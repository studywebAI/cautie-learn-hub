'use client';

import React, { useMemo, useRef, useState } from 'react';
import { BaseBlock, DragDropContent } from './types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalizeBlockSettings } from '@/lib/assignments/settings';

interface StudentDragDropBlockProps {
  block: BaseBlock & { data: DragDropContent };
  onSubmit: (answerData: any) => Promise<{ ok: boolean; error?: string }>;
  isSubmitted?: boolean;
}

export const StudentDragDropBlock: React.FC<StudentDragDropBlockProps> = ({
  block,
  onSubmit,
  isSubmitted = false,
}) => {
  const settings = normalizeBlockSettings((block as any).settings || block.data?.settings || {});
  const startedAtRef = useRef<string>(new Date().toISOString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const pairs: Array<{ left: string; right: string }> = Array.isArray(block.data?.pairs) ? block.data.pairs : [];

  const rightItems = useMemo(() => {
    const values = pairs.map((pair) => pair.right);
    if (!settings.matching.shuffleItems) return values;
    const shuffled = [...values];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [pairs, settings.matching.shuffleItems]);

  const allFilled = pairs.every((pair) => !!matches[pair.left]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const selectedPairs = pairs.map((pair) => ({
      left: pair.left,
      right: matches[pair.left] || '',
    }));
    const result = await onSubmit({
      pairs: selectedPairs,
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
      <div className="font-medium">{block.data.prompt || 'Match each item with the correct option'}</div>
      <div className="space-y-2">
        {pairs.map((pair) => (
          <div key={`${block.id}-${pair.left}`} className="grid grid-cols-1 md:grid-cols-2 items-center gap-3 rounded-md border bg-background p-3">
            <div className="text-sm font-medium">{pair.left}</div>
            <Select
              value={matches[pair.left] || ''}
              onValueChange={(value) => setMatches((prev) => ({ ...prev, [pair.left]: value }))}
              disabled={isSubmitted || isSubmitting}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rightItems.map((item) => (
                  <SelectItem key={`${pair.left}-${item}`} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      {!isSubmitted && (
        <Button onClick={handleSubmit} disabled={!allFilled || isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      )}
      {isSubmitted && <div className="text-sm text-green-600">Answer submitted successfully.</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
};
