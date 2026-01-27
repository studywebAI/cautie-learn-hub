'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BlockProps, QuoteBlockContent } from './types';
import { cn } from '@/lib/utils';

interface QuoteBlockProps extends BlockProps {
  block: BlockProps['block'] & { content: QuoteBlockContent };
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({
  block,
  onUpdate,
  isEditing = false,
  className,
}) => {
  const [isEditingState, setIsEditingState] = useState(isEditing);
  const [text, setText] = useState(block.content.text || '');
  const [author, setAuthor] = useState(block.content.author || '');
  const [source, setSource] = useState(block.content.source || '');

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...block.content,
        text,
        author,
        source,
      });
    }
    setIsEditingState(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setText(block.content.text || '');
      setAuthor(block.content.author || '');
      setSource(block.content.source || '');
      setIsEditingState(false);
    }
  };

  const renderDisplay = () => {
    return (
      <blockquote className="border-l-4 border-primary pl-4 py-2 mb-4 italic text-muted-foreground">
        <p className="text-lg mb-2">"{text || 'Quote text...'}"</p>
        {author && (
          <cite className="text-sm font-medium text-foreground not-italic">
            — {author}
            {source && `, ${source}`}
          </cite>
        )}
      </blockquote>
    );
  };

  const renderEditor = () => {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/50 mb-4">
        <div>
          <label className="text-sm font-medium">Quote</label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter the quote..."
            className="mt-1 min-h-[80px] resize-none"
            autoFocus
          />
        </div>
        <div>
          <label className="text-sm font-medium">Author</label>
          <Input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Author name..."
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Source</label>
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Book, article, etc..."
            className="mt-1"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditingState(false)}
            className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn('w-full', className)}
      onClick={() => !isEditingState && setIsEditingState(true)}
    >
      {isEditingState ? renderEditor() : renderDisplay()}
    </div>
  );
};