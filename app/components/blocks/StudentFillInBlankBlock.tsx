'use client';

import React, { useRef, useState } from 'react';
import { BaseBlock, FillInBlankContent } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StudentFillInBlankBlockProps {
  block: BaseBlock & { data: FillInBlankContent };
  onSubmit: (answerData: any) => Promise<{ ok: boolean; error?: string }>;
  isSubmitted?: boolean;
}

export const StudentFillInBlankBlock: React.FC<StudentFillInBlankBlockProps> = ({
  block,
  onSubmit,
  isSubmitted = false,
}) => {
  const [answers, setAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  const blanks = block.data.text.split('___');

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const answerData = {
      answers: answers,
      case_sensitive: block.data.case_sensitive,
      started_at: startedAtRef.current,
      submitted_at: new Date().toISOString(),
    };
    const result = await onSubmit(answerData);
    if (!result.ok) {
      setError(result.error || 'Failed to submit answer');
    }
    setIsSubmitting(false);
  };

  const allAnswersFilled = answers.length === blanks.length - 1 && answers.every(answer => answer.trim());

  return (
    <div className="space-y-4">
      <div className="text-lg">
        {blanks.map((part: string, index: number) => (
          <React.Fragment key={index}>
            {part}
            {index < blanks.length - 1 && (
              <Input
                type="text"
                placeholder="..."
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                disabled={isSubmitted || isSubmitting}
                className="inline-block w-32 mx-1"
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {!isSubmitted && (
        <Button
          onClick={handleSubmit}
          disabled={!allAnswersFilled || isSubmitting}
          className="mt-4"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      )}

      {isSubmitted && (
        <div className="text-sm text-green-600 font-medium">
          Answer submitted successfully!
        </div>
      )}
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
};
