'use client';

import React, { useRef, useState } from 'react';
import { BaseBlock, NumberLineBlockContent } from './types';
import { Button } from '@/components/ui/button';

interface StudentNumberLineBlockProps {
  block: BaseBlock & { data: NumberLineBlockContent };
  onSubmit: (answerData: any) => Promise<{ ok: boolean; error?: string }>;
  isSubmitted?: boolean;
}

export const StudentNumberLineBlock: React.FC<StudentNumberLineBlockProps> = ({
  block,
  onSubmit,
  isSubmitted = false,
}) => {
  const { min, max, step } = block.data;
  const [value, setValue] = useState<number>(min + (max - min) / 2);
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await onSubmit({
      value,
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
      {block.data.prompt && <div className="font-medium">{block.data.prompt}</div>}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{min}</span>
          <span className="text-sm font-medium text-foreground tabular-nums">{touched ? value : '—'}</span>
          <span>{max}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step || 1}
          value={value}
          onChange={(e) => {
            setValue(Number(e.target.value));
            setTouched(true);
          }}
          disabled={isSubmitted || isSubmitting}
          className="w-full accent-foreground"
        />
      </div>
      {!isSubmitted && (
        <Button onClick={handleSubmit} disabled={!touched || isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      )}
      {isSubmitted && <div className="text-sm text-green-600 font-medium">Answer submitted successfully!</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
};
