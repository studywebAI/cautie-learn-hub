'use client';

import React, { useState } from 'react';
import { BaseBlock, OpenQuestionContent } from './types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, CheckCircle, XCircle } from 'lucide-react';
import { normalizeBlockSettings } from '@/lib/assignments/settings';

interface GradingResult {
  score: number;
  feedback: string;
  graded_by_ai: boolean;
  graded_at?: string;
}

interface StudentOpenQuestionBlockProps {
  block: BaseBlock & { data: OpenQuestionContent };
  onSubmit: (answerData: any) => void;
  gradingResult?: GradingResult;
  isSubmitted?: boolean;
}

export const StudentOpenQuestionBlock: React.FC<StudentOpenQuestionBlockProps> = ({
  block,
  onSubmit,
  gradingResult,
  isSubmitted = false,
}) => {
  const [answer, setAnswer] = useState('');
  const [pasteCount, setPasteCount] = useState(0);
  const [pasteChars, setPasteChars] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const settings = normalizeBlockSettings((block as any).settings || block.data?.settings || {});
  const maxChars = settings.openQuestion.maxChars;
  const maxWords = settings.openQuestion.maxWords;

  const handleSubmit = () => {
    const answerData = {
      text: answer,
      ai_grading: block.data.ai_grading,
      paste_count: pasteCount,
      paste_chars: pasteChars,
      typed_chars: typedChars,
    };
    onSubmit(answerData);
  };

  return (
    <div className="space-y-4">
      <div className="font-medium">{block.data.question}</div>

      {block.data.ai_grading && (
        <div className="text-sm text-muted-foreground">
          This question will be graded automatically using AI.
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="answer">Your Answer</Label>
        <Textarea
          id="answer"
          placeholder="Type your answer here..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
              setTypedChars((prev) => prev + 1);
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData?.getData('text') || '';
            setPasteCount((prev) => prev + 1);
            setPasteChars((prev) => prev + pasted.length);
          }}
          disabled={isSubmitted}
          rows={6}
          maxLength={maxChars || (block.data.max_score ? undefined : 1000)}
        />
        <div className="text-sm text-muted-foreground">
          {answer.length} characters
          {maxChars ? ` / ${maxChars}` : ''}
          {maxWords ? ` - ${answer.trim().split(/\\s+/).filter(Boolean).length}/${maxWords} words` : ''}
        </div>
      </div>

      {!isSubmitted && (
        <Button
          onClick={handleSubmit}
          disabled={
            !answer.trim() ||
            (maxChars ? answer.length > maxChars : false) ||
            (maxWords ? answer.trim().split(/\\s+/).filter(Boolean).length > maxWords : false)
          }
          className="mt-4"
        >
          Submit Answer
        </Button>
      )}

      {isSubmitted && !gradingResult && (
        <div className="flex items-center gap-2 text-sm text-blue-600 mt-4">
          <Clock className="h-4 w-4" />
          <span>Answer submitted successfully! {block.data.ai_grading ? 'AI grading in progress...' : ''}</span>
        </div>
      )}

      {gradingResult && (
        <div className="mt-6 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-3">
            {gradingResult.graded_by_ai ? (
              <Sparkles className="h-5 w-5 text-purple-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            <span className="font-medium">
              {gradingResult.graded_by_ai ? 'AI Graded' : 'Teacher Graded'}
            </span>
            <Badge variant="outline">
              {gradingResult.score}/{block.data.max_score || 5} points
            </Badge>
          </div>

          {gradingResult.feedback && (
            <div className="text-sm">
              <div className="font-medium mb-1">Feedback:</div>
              <div className="text-muted-foreground">{gradingResult.feedback}</div>
            </div>
          )}

          {gradingResult.graded_at && (
            <div className="text-xs text-muted-foreground mt-2">
              Graded on {new Date(gradingResult.graded_at).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
