'use client';

import React, { useMemo, useRef, useState } from 'react';
import { BaseBlock, MultipleChoiceContent } from './types';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { normalizeBlockSettings } from '@/lib/assignments/settings';

interface StudentMultipleChoiceBlockProps {
  block: BaseBlock & { data: MultipleChoiceContent };
  onSubmit: (answerData: any) => Promise<{ ok: boolean; error?: string }>;
  isSubmitted?: boolean;
}

export const StudentMultipleChoiceBlock: React.FC<StudentMultipleChoiceBlockProps> = ({
  block,
  onSubmit,
  isSubmitted = false,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const settings = normalizeBlockSettings((block as any).settings || block.data?.settings || {});
  const shouldShuffleOptions = settings.multipleChoice.shuffleOptions || block.data.shuffle;
  const displayOptions = useMemo(
    () => shouldShuffleOptions
      ? [...(block.data.options as Array<{id: string, text: string, correct: boolean}> || [])].sort(() => Math.random() - 0.5)
      : (block.data.options as Array<{id: string, text: string, correct: boolean}> || []),
    [shouldShuffleOptions, block.data.options]
  );

  const handleAnswerChange = (value: string, checked: boolean) => {
    if (block.data.multiple_correct) {
      // Multiple selection
      if (checked) {
        setSelectedAnswers(prev => [...prev, value]);
      } else {
        setSelectedAnswers(prev => prev.filter(id => id !== value));
      }
    } else {
      // Single selection
      setSelectedAnswers([value]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const answerData = {
      selected_answers: selectedAnswers,
      multiple_correct: block.data.multiple_correct,
      started_at: startedAtRef.current,
      submitted_at: new Date().toISOString(),
    };
    const result = await onSubmit(answerData);
    if (!result.ok) {
      setError(result.error || 'Failed to submit answer');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="font-medium">{block.data.question}</div>

      {block.data.multiple_correct ? (
        // Multiple choice with checkboxes
        <div className="space-y-2">
      {displayOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={option.id}
                checked={selectedAnswers.includes(option.id)}
                onCheckedChange={(checked) => handleAnswerChange(option.id, checked as boolean)}
                disabled={isSubmitted || isSubmitting}
              />
              <Label htmlFor={option.id} className="cursor-pointer">
                {option.text}
              </Label>
            </div>
          ))}
        </div>
      ) : (
        // Single choice with radio buttons
        <RadioGroup
          value={selectedAnswers[0] || ''}
          onValueChange={(value) => setSelectedAnswers([value])}
          disabled={isSubmitted || isSubmitting}
        >
          {displayOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <RadioGroupItem value={option.id} id={option.id} />
              <Label htmlFor={option.id} className="cursor-pointer">
                {option.text}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {!isSubmitted && (
        <Button
          onClick={handleSubmit}
          disabled={selectedAnswers.length === 0 || isSubmitting}
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
