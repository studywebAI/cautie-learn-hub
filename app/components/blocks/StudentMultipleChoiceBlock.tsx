'use client';

import React, { useState } from 'react';
import { BaseBlock, MultipleChoiceContent } from './types';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface StudentMultipleChoiceBlockProps {
  block: BaseBlock & { content: MultipleChoiceContent };
  onSubmit: (answerData: any) => void;
}

export const StudentMultipleChoiceBlock: React.FC<StudentMultipleChoiceBlockProps> = ({
  block,
  onSubmit,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleAnswerChange = (value: string, checked: boolean) => {
    if (block.content.multiple_correct) {
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

  const handleSubmit = () => {
    const answerData = {
      selected_answers: selectedAnswers,
      multiple_correct: block.content.multiple_correct,
    };
    onSubmit(answerData);
    setIsSubmitted(true);
  };

  return (
    <div className="space-y-4">
      <div className="font-medium">{block.content.question}</div>

      {block.content.multiple_correct ? (
        // Multiple choice with checkboxes
        <div className="space-y-2">
          {(block.content.options as Array<{id: string, text: string, correct: boolean}>).map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={option.id}
                checked={selectedAnswers.includes(option.id)}
                onCheckedChange={(checked) => handleAnswerChange(option.id, checked as boolean)}
                disabled={isSubmitted}
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
          disabled={isSubmitted}
        >
          {(block.content.options as Array<{id: string, text: string, correct: boolean}>).map((option) => (
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
          disabled={selectedAnswers.length === 0}
          className="mt-4"
        >
          Submit Answer
        </Button>
      )}

      {isSubmitted && (
        <div className="text-sm text-green-600 font-medium">
          Answer submitted successfully!
        </div>
      )}
    </div>
  );
};