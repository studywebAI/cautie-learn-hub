'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BlockProps, LayoutBlockContent } from './types';
import { cn } from '@/lib/utils';

interface LayoutBlockProps extends BlockProps {
  block: BlockProps['block'] & { content: LayoutBlockContent };
}

export const LayoutBlock: React.FC<LayoutBlockProps> = ({
  block,
  onUpdate,
  isEditing = false,
  className,
}) => {
  const [isEditingState, setIsEditingState] = useState(isEditing);
  const [text, setText] = useState(block.content.text || '');
  const [icon, setIcon] = useState(block.content.icon || '');

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...block.content,
        text,
        icon,
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
      setIcon(block.content.icon || '');
      setIsEditingState(false);
    }
  };

  const renderDivider = () => {
    return (
      <div className="my-8">
        <hr className="border-t border-muted-foreground/20" />
      </div>
    );
  };

  const renderCallout = () => {
    return (
      <div className="bg-muted/50 border-l-4 border-primary p-4 my-4 rounded-r-lg">
        <div className="flex items-start gap-3">
          {icon && <span className="text-xl">{icon}</span>}
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">
              {text || 'Callout text...'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderDisplay = () => {
    const { type } = block.content;

    if (type === 'divider') {
      return renderDivider();
    }

    return renderCallout();
  };

  const renderEditor = () => {
    const { type } = block.content;

    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/50 mb-4">
        {type === 'callout' && (
          <>
            <div>
              <label className="text-sm font-medium">Icon (emoji or symbol)</label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="💡"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Text</label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter callout text..."
                className="mt-1 min-h-[60px] resize-none"
              />
            </div>
          </>
        )}
        {type === 'divider' && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Divider - no content needed</p>
          </div>
        )}
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
      onClick={() => !isEditingState && block.content.type === 'callout' && setIsEditingState(true)}
    >
      {isEditingState ? renderEditor() : renderDisplay()}
    </div>
  );
};