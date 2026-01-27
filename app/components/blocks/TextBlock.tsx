'use client';

import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { BlockProps, TextBlockContent } from './types';
import { cn } from '@/lib/utils';

interface TextBlockProps extends BlockProps {
  block: BlockProps['block'] & { content: TextBlockContent };
}

export const TextBlock: React.FC<TextBlockProps> = ({
  block,
  onUpdate,
  isEditing = false,
  className,
}) => {
  const [isEditingState, setIsEditingState] = useState(isEditing);
  const [content, setContent] = useState(block.content.content || '');
  const [style, setStyle] = useState(block.content.style || 'normal');
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const text = block.content.content || '';
    if (style === 'normal' && text && !isEditingState) {
      setIsTyping(true);
      setDisplayedText('');
      let i = 0;
      const timer = setInterval(() => {
        if (i < text.length) {
          setDisplayedText(prev => prev + text[i]);
          i++;
        } else {
          setIsTyping(false);
          clearInterval(timer);
        }
      }, 50);
      return () => clearInterval(timer);
    } else {
      setDisplayedText(text);
      setIsTyping(false);
    }
  }, [block.content.content, style, isEditingState]);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...block.content,
        content,
        style,
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
      setContent(block.content.content || '');
      setStyle(block.content.style || 'normal');
      setIsEditingState(false);
    }
  };

  const renderDisplay = () => {
    const { content: displayContent, style } = block.content;

    switch (style) {
      case 'heading':
        return (
          <h1 className="text-3xl font-bold mb-4 text-foreground">
            {displayContent || 'Heading'}
          </h1>
        );
      case 'subheading':
        return (
          <h2 className="text-2xl font-semibold mb-3 text-foreground">
            {displayContent || 'Subheading'}
          </h2>
        );
      case 'quote':
        return (
          <blockquote className="text-lg italic border-l-4 border-primary pl-4 mb-4 text-foreground">
            {displayContent || 'Quote'}
          </blockquote>
        );
      case 'note':
        return (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p className="text-blue-800">{displayContent || 'Note'}</p>
          </div>
        );
      case 'warning':
        return (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
            <p className="text-yellow-800">{displayContent || 'Warning'}</p>
          </div>
        );
      case 'normal':
      default:
        return (
          <p className="text-base leading-relaxed text-foreground mb-4">
            {displayedText || 'Start writing...'}{isTyping && <span className="animate-pulse">|</span>}
          </p>
        );
    }
  };

  const renderEditor = () => {
    return (
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        placeholder="Enter text..."
        className={cn(
          'min-h-[60px] resize-none border-none shadow-none focus-visible:ring-0 p-0',
          style === 'heading' && 'text-3xl font-bold',
          style === 'subheading' && 'text-2xl font-semibold',
          style === 'quote' && 'text-lg italic',
          style === 'note' && 'text-base',
          style === 'warning' && 'text-base',
          style === 'normal' && 'text-base',
          className
        )}
        autoFocus
      />
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