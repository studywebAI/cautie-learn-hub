'use client';

import React from 'react';
import { BaseBlock, BlockProps } from './types';
import { TextBlock } from './TextBlock';
import { RichTextBlock } from './RichTextBlock';
import { ExecutableCodeBlock } from './ExecutableCodeBlock';
import { MultipleChoiceBlock } from './MultipleChoiceBlock';
import { CodeBlock } from './CodeBlock';
import { ListBlock } from './ListBlock';
import { MediaBlock } from './MediaBlock';
import { QuoteBlock } from './QuoteBlock';
import { LayoutBlock } from './LayoutBlock';
import { ComplexBlock } from './ComplexBlock';

interface BlockRendererProps extends Omit<BlockProps, 'block'> {
  block: BaseBlock;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  onUpdate,
  onDelete,
  isEditing = false,
  className,
}) => {
  const renderBlock = () => {
    const commonProps = {
      block: block as any, // Type assertion for now
      onUpdate,
      onDelete,
      isEditing,
      className,
    };

    switch (block.type) {
      case 'text':
        return <TextBlock {...commonProps} />;
      case 'rich_text':
        return <RichTextBlock {...commonProps} />;
      case 'code':
        return <CodeBlock {...commonProps} />;
      case 'executable_code':
        return <ExecutableCodeBlock {...commonProps} />;
      case 'list':
        return <ListBlock {...commonProps} />;
      case 'quote':
        return <QuoteBlock {...commonProps} />;
      case 'layout':
        return <LayoutBlock {...commonProps} />;
      case 'complex':
        return <ComplexBlock {...commonProps} />;
      case 'image':
      case 'video':
      case 'media_embed':
        return <MediaBlock {...commonProps} />;
      case 'multiple_choice':
        return <MultipleChoiceBlock {...commonProps} />;
      case 'open_question':
      case 'fill_in_blank':
      case 'drag_drop':
      case 'ordering':
        // For now, show JSON - we'll implement more quiz components next
        return (
          <div className={`p-4 border ${className || ''}`}>
            <div className="text-sm text-muted-foreground">{block.type.replace('_', ' ').toUpperCase()} Block</div>
            <pre className="whitespace-pre-wrap font-mono text-xs mt-2">
              {JSON.stringify(block.content, null, 2)}
            </pre>
          </div>
        );

      case 'rich_text':
      case 'executable_code':
        // New types - will implement components for these
        return (
          <div className={`p-4 border ${className || ''}`}>
            <div className="text-sm text-muted-foreground">{block.type.replace('_', ' ').toUpperCase()} Block</div>
            <pre className="whitespace-pre-wrap font-mono text-xs mt-2">
              {JSON.stringify(block.content, null, 2)}
            </pre>
          </div>
        );
      default:
        return (
          <div className="p-4 border rounded-lg bg-muted/50 text-muted-foreground">
            Unknown block type: {block.type}
          </div>
        );
    }
  };

  return renderBlock();
};