'use client';

import React from 'react';
import { BaseBlock, TextBlockContent } from './types';

interface StudentTextBlockProps {
  block: BaseBlock & { content: TextBlockContent };
  onSubmit: (answerData: any) => void;
}

export const StudentTextBlock: React.FC<StudentTextBlockProps> = ({
  block,
}) => {
  const getStyleClasses = (style: string) => {
    switch (style) {
      case 'heading':
        return 'text-2xl font-bold mb-4';
      case 'subheading':
        return 'text-xl font-semibold mb-3';
      case 'quote':
        return 'border-l-4 border-primary pl-4 italic text-muted-foreground';
      case 'note':
        return 'bg-yellow-50 border border-yellow-200 p-4 rounded';
      case 'warning':
        return 'bg-red-50 border border-red-200 p-4 rounded text-red-800';
      default:
        return 'text-base';
    }
  };

  return (
    <div className={getStyleClasses(block.content.style)}>
      {block.content.content}
    </div>
  );
};