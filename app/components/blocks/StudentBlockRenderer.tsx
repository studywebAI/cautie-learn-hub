'use client';

import React from 'react';
import { BaseBlock } from './types';
import { StudentTextBlock } from './StudentTextBlock';
import { StudentMultipleChoiceBlock } from './StudentMultipleChoiceBlock';
import { StudentOpenQuestionBlock } from './StudentOpenQuestionBlock';
import { StudentFillInBlankBlock } from './StudentFillInBlankBlock';
import { StudentMediaBlock } from './StudentMediaBlock';
import { StudentDividerBlock } from './StudentDividerBlock';

interface GradingResult {
  score: number;
  feedback: string;
  graded_by_ai: boolean;
  graded_at?: string;
}

interface StudentBlockRendererProps {
  block: BaseBlock;
  onSubmit: (answerData: any) => void;
  gradingResult?: GradingResult;
  isSubmitted?: boolean;
}

export const StudentBlockRenderer: React.FC<StudentBlockRendererProps> = ({
  block,
  onSubmit,
  gradingResult,
  isSubmitted,
}) => {
  const renderBlock = () => {
    const commonProps = {
      block: block as any,
      onSubmit,
      gradingResult,
      isSubmitted,
    };

    switch (block.type) {
      case 'text':
        return <StudentTextBlock {...commonProps} />;
      case 'multiple_choice':
        return <StudentMultipleChoiceBlock {...commonProps} />;
      case 'open_question':
        return <StudentOpenQuestionBlock {...commonProps} />;
      case 'fill_in_blank':
        return <StudentFillInBlankBlock {...commonProps} />;
      case 'image':
      case 'video':
      case 'media_embed':
        return <StudentMediaBlock {...commonProps} />;
      case 'divider':
        return <StudentDividerBlock {...commonProps} />;
      default:
        // For blocks that don't have student interaction, just display content
        return (
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground mb-2">
              {block.type.replace('_', ' ').toUpperCase()}
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs">
              {JSON.stringify(block.content, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return renderBlock();
};