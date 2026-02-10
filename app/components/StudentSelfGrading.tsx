'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, MinusCircle, BookOpen, ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelfGradingOption {
  value: 'incorrect' | 'semi' | 'correct';
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface StudentSelfGradingProps {
  question: string;
  correctAnswer: string;
  studentAnswer: string;
  maxScore: number;
  onGrade: (score: number, feedback: string) => void;
  onSkip: () => void;
}

const selfGradingOptions: SelfGradingOption[] = [
  {
    value: 'incorrect',
    label: 'Incorrect',
    icon: <XCircle className="h-5 w-5" />,
    color: 'text-red-500',
    bgColor: 'bg-red-50 hover:bg-red-100',
  },
  {
    value: 'semi',
    label: 'Partially Correct',
    icon: <MinusCircle className="h-5 w-5" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 hover:bg-yellow-100',
  },
  {
    value: 'correct',
    label: 'Correct',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'text-green-500',
    bgColor: 'bg-green-50 hover:bg-green-100',
  },
];

export function StudentSelfGrading({
  question,
  correctAnswer,
  studentAnswer,
  maxScore,
  onGrade,
  onSkip,
}: StudentSelfGradingProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customScore, setCustomScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionSelect = (optionValue: string) => {
    setSelectedOption(optionValue);
    
    // Set default score based on selected option
    if (optionValue === 'correct') {
      setCustomScore(maxScore);
    } else if (optionValue === 'semi') {
      setCustomScore(Math.floor(maxScore / 2));
    } else {
      setCustomScore(0);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption) return;
    
    setIsSubmitting(true);
    
    try {
      const feedback = getFeedback(selectedOption);
      onGrade(customScore, feedback);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFeedback = (optionValue: string): string => {
    switch (optionValue) {
      case 'correct':
        return 'Great job! Your answer matches the correct answer perfectly.';
      case 'semi':
        return 'Your answer has some correct elements but is not complete. Review the correct answer for details.';
      case 'incorrect':
        return 'Your answer is incorrect. Please review the correct answer and try again.';
      default:
        return '';
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Self-Grading</h2>
        <p className="text-sm text-muted-foreground">
          Compare your answer with the correct answer and rate your performance.
        </p>
      </div>

      <div className="space-y-6">
        {/* Question */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Question:</h3>
          <p className="text-sm">{question}</p>
        </div>

        {/* Student Answer */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <ThumbsUp className="h-4 w-4 text-blue-500" />
            Your Answer:
          </h3>
          <p className="text-sm">{studentAnswer}</p>
        </div>

        {/* Correct Answer */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-green-500" />
            Correct Answer:
          </h3>
          <p className="text-sm">{correctAnswer}</p>
        </div>

        {/* Self-Grading Options */}
        <div className="space-y-4">
          <h3 className="font-medium">How would you rate your answer?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {selfGradingOptions.map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                className={cn(
                  'h-auto p-4 flex flex-col items-center gap-2 transition-all',
                  option.bgColor,
                  selectedOption === option.value
                    ? 'ring-2 ring-offset-2 ring-current'
                    : ''
                )}
                onClick={() => handleOptionSelect(option.value)}
              >
                <span className={option.color}>{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Score (if selected semi or incorrect) */}
        {selectedOption && selectedOption !== 'correct' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Custom Score:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={maxScore}
                value={customScore}
                onChange={(e) => setCustomScore(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium w-12 text-right">{customScore}</span>
              <span className="text-sm text-muted-foreground">/ {maxScore}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Skip Grading
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedOption || isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Grade'}
          </Button>
        </div>
      </div>
    </Card>
  );
}