'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SimpleTextBlockProps = {
  block: {
    id: string;
    type: string;
    position: number;
    data: {
      content?: string;
      style?: string;
    };
  };
  answer?: any;
  onAnswer?: (blockId: string, answerData: any) => void;
  isTeacher?: boolean;
  readOnly?: boolean;
  onBlockUpdate?: (blockId: string, data: any) => void;
};

export const SimpleTextBlock: React.FC<SimpleTextBlockProps> = ({
  block,
  isTeacher = false,
  readOnly = false,
  onBlockUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(block.data.content || '');
  const [style, setStyle] = useState(block.data.style || 'normal');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save content changes
  const saveChanges = useCallback(async () => {
    if (!onBlockUpdate || isSaving) return;

    setIsSaving(true);
    try {
      await onBlockUpdate(block.id, { content, style });
      console.log('Text block auto-saved');
    } catch (error) {
      console.error('Failed to save text block:', error);
    } finally {
      setIsSaving(false);
    }
  }, [block.id, content, style, onBlockUpdate, isSaving]);

  // Auto-save on content/style change (debounced)
  useEffect(() => {
    if (!isTeacher) return;

    const timeoutId = setTimeout(saveChanges, 1000); // Save after 1 second of inactivity
    return () => clearTimeout(timeoutId);
  }, [content, style, saveChanges, isTeacher]);

  if (readOnly || !isTeacher) {
    return (
      <div className="w-full p-4 border rounded-lg bg-muted/20">
        <div
          className={`prose prose-sm max-w-none ${
            block.data.style === 'heading' ? 'text-xl font-bold' :
            block.data.style === 'subheading' ? 'text-lg font-semibold' :
            block.data.style === 'quote' ? 'border-l-4 border-primary pl-4 italic' :
            block.data.style === 'note' ? 'bg-yellow-50 p-3 rounded border-l-4 border-yellow-400' :
            block.data.style === 'warning' ? 'bg-red-50 p-3 rounded border-l-4 border-red-400' :
            ''
          }`}
          dangerouslySetInnerHTML={{ __html: block.data.content || 'No content' }}
        />
      </div>
    );
  }

  return (
    <div className="w-full p-4 border rounded-lg bg-muted/20">
      {/* Teacher Controls */}
      <div className="flex items-center gap-2 mb-3">
        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="heading">Heading</SelectItem>
            <SelectItem value="subheading">Subheading</SelectItem>
            <SelectItem value="quote">Quote</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Preview' : 'Edit'}
        </Button>
        {isSaving && <span className="text-sm text-muted-foreground">Saving...</span>}
      </div>

      {/* Content Display/Edit */}
      {isEditing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter your text content here..."
          className="w-full min-h-24 p-3 border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-primary"
        />
      ) : (
        <div
          className={`prose prose-sm max-w-none ${
            style === 'heading' ? 'text-xl font-bold' :
            style === 'subheading' ? 'text-lg font-semibold' :
            style === 'quote' ? 'border-l-4 border-primary pl-4 italic' :
            style === 'note' ? 'bg-yellow-50 p-3 rounded border-l-4 border-yellow-400' :
            style === 'warning' ? 'bg-red-50 p-3 rounded border-l-4 border-red-400' :
            ''
          }`}
          dangerouslySetInnerHTML={{ __html: content || 'Click Edit to add content' }}
        />
      )}
    </div>
  );
};