'use client';

import React, { useState } from 'react';
import { BaseBlock, FillInBlankContent } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StudentFillInBlankBlockProps {
  block: BaseBlock & { content: FillInBlankContent };
  onSubmit: (answerData: any) => void;
}

export const StudentFillInBlankBlock: React.FC<StudentFillInBlankBlockProps> = ({
  block,
  onSubmit,
}) => {
  const [answers, setAnswers] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const blanks = block.content.text.split('___');

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    const answerData = {
      answers: answers,
      case_sensitive: block.content.case_sensitive,
    };
    onSubmit(answerData);
    setIsSubmitted(true);
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
                disabled={isSubmitted}
                className="inline-block w-32 mx-1"
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {!isSubmitted && (
        <Button
          onClick={handleSubmit}
          disabled={!allAnswersFilled}
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