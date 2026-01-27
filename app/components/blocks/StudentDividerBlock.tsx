'use client';

import React from 'react';
import { BaseBlock, DividerContent } from './types';

interface StudentDividerBlockProps {
  block: BaseBlock & { content: DividerContent };
  onSubmit: (answerData: any) => void;
}

export const StudentDividerBlock: React.FC<StudentDividerBlockProps> = ({
  block,
}) => {
  const renderDivider = () => {
    switch (block.content.style) {
      case 'line':
        return <hr className="my-4 border-t border-border" />;
      case 'space':
        return <div className="my-8" />;
      case 'page_break':
        return (
          <div className="my-8 flex items-center justify-center">
            <div className="border-t border-dashed border-border flex-1"></div>
            <span className="px-4 text-xs text-muted-foreground">Page Break</span>
            <div className="border-t border-dashed border-border flex-1"></div>
          </div>
        );
      default:
        return <hr className="my-4 border-t border-border" />;
    }
  };

  return renderDivider();
};