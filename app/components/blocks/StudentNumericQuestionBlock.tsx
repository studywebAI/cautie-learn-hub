'use client';

import React, { useRef, useState } from 'react';
import { BaseBlock, NumericQuestionContent } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StudentNumericQuestionBlockProps {
  block: BaseBlock & { data: NumericQuestionContent };
  onSubmit: (answerData: any) => Promise<{ ok: boolean; error?: string }>;
  isSubmitted?: boolean;
}

export const StudentNumericQuestionBlock: React.FC<StudentNumericQuestionBlockProps> = ({
  block,
  onSubmit,
  isSubmitted = false,
}) => {
  const [value, setValue] = useState('');
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
    <div className="space-y-3">
      <div className="font-medium">{block.data.question || 'Enter the numeric answer'}</div>
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isSubmitted || isSubmitting}
        className="h-10"
      />
      {!isSubmitted && (
        <Button onClick={handleSubmit} disabled={value === '' || isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      )}
      {isSubmitted && <div className="text-sm text-green-600">Answer submitted successfully.</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
};
