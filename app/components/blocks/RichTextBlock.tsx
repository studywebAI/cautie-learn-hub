'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BlockProps, RichTextBlockContent } from './types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Check, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextBlockProps extends BlockProps {
  block: BlockProps['block'] & { content: RichTextBlockContent };
}

export const RichTextBlock: React.FC<RichTextBlockProps> = ({
  block,
  onUpdate,
  isEditing = false,
  className,
}) => {
  const [isEditingState, setIsEditingState] = useState(isEditing);
  const [html, setHtml] = useState(block.content.html || '');
  const [plainText, setPlainText] = useState(block.content.plainText || '');
  const [aiSuggestions, setAiSuggestions] = useState<NonNullable<RichTextBlockContent['aiSuggestions']>>(block.content.aiSuggestions || []);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...block.content,
        html,
        plainText,
        aiSuggestions,
      });
    }
    setIsEditingState(false);
  };

  const handleTextChange = (value: string) => {
    setPlainText(value);
    setHtml(value); // For now, treat as plain text. Could add markdown/html parsing later
  };

  const generateAISuggestions = async () => {
    if (!plainText.trim()) return;

    setIsGeneratingSuggestions(true);
    try {
      // Call AI service for suggestions
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: plainText,
          types: ['grammar', 'style', 'content']
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newSuggestions = data.suggestions.map((suggestion: any, index: number) => ({
          id: `suggestion-${Date.now()}-${index}`,
          type: suggestion.type,
          suggestion: suggestion.text,
          applied: false,
        }));
        setAiSuggestions(newSuggestions);
      }
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const applySuggestion = (suggestionId: string) => {
    const suggestion = aiSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      // Simple text replacement - could be more sophisticated
      setPlainText(suggestion.suggestion);
      setHtml(suggestion.suggestion);

      setAiSuggestions(prev =>
        prev.map(s =>
          s.id === suggestionId ? { ...s, applied: true } : s
        )
      );
    }
  };

  const dismissSuggestion = (suggestionId: string) => {
    setAiSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const renderDisplay = () => {
    return (
      <div className={cn('w-full p-4 border rounded-lg', className)}>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: html || '<p>Click to edit rich text...</p>' }}
        />
        {aiSuggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              AI Suggestions
            </h4>
            {aiSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="flex items-start gap-2 p-2 bg-blue-50 rounded border">
                <Badge variant="secondary" className="text-xs">
                  {suggestion.type}
                </Badge>
                <span className="text-sm flex-1">{suggestion.suggestion}</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applySuggestion(suggestion.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissSuggestion(suggestion.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderEditor = () => {
    return (
      <div className={cn('w-full space-y-4', className)}>
        <div className="border rounded-lg p-4">
          <Textarea
            ref={textareaRef}
            value={plainText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Start writing your rich text content..."
            className="min-h-[200px] resize-none border-none shadow-none focus-visible:ring-0 p-0"
            autoFocus
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={generateAISuggestions}
            disabled={isGeneratingSuggestions || !plainText.trim()}
            size="sm"
            variant="outline"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGeneratingSuggestions ? 'Generating...' : 'Get AI Suggestions'}
          </Button>

          <Button onClick={handleSave} size="sm">
            Save
          </Button>

          <Button
            onClick={() => setIsEditingState(false)}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>

        {aiSuggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              AI Suggestions
            </h4>
            {aiSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="flex items-start gap-2 p-2 bg-blue-50 rounded border">
                <Badge variant="secondary" className="text-xs">
                  {suggestion.type}
                </Badge>
                <span className="text-sm flex-1">{suggestion.suggestion}</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applySuggestion(suggestion.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissSuggestion(suggestion.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="w-full"
      onClick={() => !isEditingState && setIsEditingState(true)}
    >
      {isEditingState ? renderEditor() : renderDisplay()}
    </div>
  );
};