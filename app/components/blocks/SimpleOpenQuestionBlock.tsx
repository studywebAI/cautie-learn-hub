'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type SimpleOpenQuestionBlockProps = {
  block: {
    id: string;
    type: string;
    position: number;
    data: {
      question?: string;
      ai_grading?: boolean;
      grading_criteria?: string;
      max_score?: number;
      max_length?: number;
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

export const SimpleOpenQuestionBlock: React.FC<SimpleOpenQuestionBlockProps> = ({
  block,
  answer,
  onAnswer,
  isTeacher = false,
  readOnly = false
}) => {
  const [textAnswer, setTextAnswer] = useState(answer?.answer_data?.text || '');

  const handleAnswerChange = (value: string) => {
    setTextAnswer(value);
    onAnswer?.(block.id, { text: value });
  };

  const maxLength = block.data.max_length || 1000;

  return (
    <div className="w-full p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">
        {block.data.question || 'Open Question'}
      </h3>

      {!isTeacher && !readOnly ? (
        <div className="space-y-4">
          <Textarea
            value={textAnswer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Type your answer here..."
            rows={6}
            maxLength={maxLength}
            className="w-full"
          />
          <div className="text-sm text-muted-foreground text-right">
            {textAnswer.length}/{maxLength} characters
          </div>
        </div>
      ) : (
        <div className="p-3 bg-gray-50 rounded border">
          <p className="text-gray-600 italic">
            {answer?.answer_data?.text || (isTeacher ? 'Student answer will appear here' : 'No answer submitted yet')}
          </p>
        </div>
      )}

      {answer?.is_correct !== undefined && (
        <div className={`mt-4 p-3 rounded-lg border ${
          answer.score && answer.score > (block.data.max_score || 5) * 0.7
            ? 'bg-green-50 border-green-200 text-green-800'
            : answer.score && answer.score > (block.data.max_score || 5) * 0.4
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <p className="font-medium">
              Score: {answer.score || 0}/{block.data.max_score || 5}
            </p>
            {answer.is_correct !== undefined && (
              <span className={`text-sm px-2 py-1 rounded ${
                answer.is_correct
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {answer.is_correct ? 'Passed' : 'Needs Improvement'}
              </span>
            )}
          </div>
          {answer.feedback && (
            <p className="text-sm mt-2">{answer.feedback}</p>
          )}
        </div>
      )}

      {!isTeacher && textAnswer && answer?.is_correct === undefined && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 font-medium">Answer submitted!</p>
          <p className="text-sm text-blue-600 mt-1">
            {block.data.ai_grading ? 'AI grading in progress...' : 'Waiting for teacher grading...'}
          </p>
        </div>
      )}
    </div>
  );
};