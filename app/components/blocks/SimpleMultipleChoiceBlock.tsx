'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

type SimpleMultipleChoiceBlockProps = {
  block: {
    id: string;
    type: string;
    position: number;
    data: {
      question?: string;
      options?: Array<{
        id: string;
        text: string;
        correct?: boolean;
      }>;
      multiple_correct?: boolean;
      shuffle?: boolean;
    };
  };
  answer?: {
    block_id: string;
    answer_data: any;
    is_correct?: boolean;
    score?: number;
    feedback?: string;
  };
  onAnswer?: (blockId: string, answerData: any) => void;
  isTeacher?: boolean;
  readOnly?: boolean;
};

export const SimpleMultipleChoiceBlock: React.FC<SimpleMultipleChoiceBlockProps> = ({
  block,
  answer,
  onAnswer,
  isTeacher = false,
  readOnly = false
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(
    answer?.answer_data?.selectedAnswers || []
  );

  const options = block.data.options || [];
  const multipleCorrect = block.data.multiple_correct || false;

  const handleAnswerSelect = (optionId: string) => {
    if (readOnly || isTeacher) return;

    let newSelected: string[];
    if (multipleCorrect) {
      newSelected = selectedAnswers.includes(optionId)
        ? selectedAnswers.filter(id => id !== optionId)
        : [...selectedAnswers, optionId];
    } else {
      newSelected = [optionId];
    }

    setSelectedAnswers(newSelected);
    onAnswer?.(block.id, { selectedAnswers: newSelected });
  };

  return (
    <div className="w-full p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">
        {block.data.question || 'Multiple Choice Question'}
      </h3>

      <div className="space-y-2">
        {options.map((option) => (
          <div
            key={option.id}
            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedAnswers.includes(option.id)
                ? 'bg-blue-50 border-blue-300'
                : 'hover:bg-gray-50'
            } ${readOnly || isTeacher ? 'cursor-default' : ''}`}
            onClick={() => handleAnswerSelect(option.id)}
          >
            <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
              multipleCorrect ? 'rounded' : 'rounded-full'
            } ${
              selectedAnswers.includes(option.id)
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-300'
            }`}>
              {selectedAnswers.includes(option.id) && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
            <span className="flex-1">{option.text || `Option ${option.id}`}</span>
          </div>
        ))}
      </div>

      {answer?.is_correct !== undefined && (
        <div className={`mt-4 p-3 rounded-lg border ${
          answer.is_correct
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <p className="font-medium">
            {answer.is_correct ? '✓ Correct!' : '✗ Incorrect'}
          </p>
          {answer.feedback && (
            <p className="text-sm mt-1">{answer.feedback}</p>
          )}
          {answer.score !== undefined && (
            <p className="text-sm mt-1">Score: {answer.score}</p>
          )}
        </div>
      )}

      {selectedAnswers.length > 0 && answer?.is_correct === undefined && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 font-medium">Answer submitted!</p>
          <p className="text-sm text-blue-600 mt-1">
            Waiting for grading...
          </p>
        </div>
      )}
    </div>
  );
};