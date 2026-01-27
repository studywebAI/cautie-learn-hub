'use client';

import React, { useState } from 'react';
import { BlockProps, MultipleChoiceContent } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultipleChoiceBlockProps extends BlockProps {
  block: BlockProps['block'] & { content: MultipleChoiceContent };
}

export const MultipleChoiceBlock: React.FC<MultipleChoiceBlockProps> = ({
  block,
  onUpdate,
  isEditing = false,
  className,
}) => {
  const [isEditingState, setIsEditingState] = useState(isEditing);
  const [question, setQuestion] = useState(block.content.question || '');
  const [options, setOptions] = useState<MultipleChoiceContent['options']>(block.content.options || [{ id: '1', text: '', correct: false }]);
  const [multipleCorrect, setMultipleCorrect] = useState(block.content.multiple_correct || false);
  const [shuffle, setShuffle] = useState(block.content.shuffle || false);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...block.content,
        question,
        options,
        multiple_correct: multipleCorrect,
        shuffle,
      });
    }
    setIsEditingState(false);
  };

  const addOption = () => {
    const newId = (options.length + 1).toString();
    setOptions([...options, { id: newId, text: '', correct: false }]);
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const toggleCorrect = (id: string) => {
    if (multipleCorrect) {
      setOptions(options.map(opt => opt.id === id ? { ...opt, correct: !opt.correct } : opt));
    } else {
      setOptions(options.map(opt => ({ ...opt, correct: opt.id === id })));
    }
  };

  const removeOption = (id: string) => {
    if (options.length > 1) {
      setOptions(options.filter(opt => opt.id !== id));
    }
  };

  const handleAnswerSelect = (optionId: string) => {
    if (multipleCorrect) {
      setSelectedAnswers(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedAnswers([optionId]);
    }
  };

  const renderDisplay = () => {
    const displayOptions = shuffle ? [...options].sort(() => Math.random() - 0.5) : options;

    return (
      <div className={cn('w-full p-4 border rounded-lg', className)}>
        <h3 className="text-lg font-semibold mb-4">{question || 'Multiple Choice Question'}</h3>

        <div className="space-y-2">
          {displayOptions.map((option) => (
            <div
              key={option.id}
              className={cn(
                'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                selectedAnswers.includes(option.id) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
              )}
              onClick={() => handleAnswerSelect(option.id)}
            >
              <div className={cn(
                'w-4 h-4 border-2 rounded flex items-center justify-center',
                multipleCorrect ? 'rounded' : 'rounded-full',
                selectedAnswers.includes(option.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
              )}>
                {selectedAnswers.includes(option.id) && (
                  <CheckCircle className="w-3 h-3 text-white" />
                )}
              </div>
              <span className="flex-1">{option.text || `Option ${option.id}`}</span>
            </div>
          ))}
        </div>

        {selectedAnswers.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">Answer submitted!</p>
            <p className="text-sm text-green-600 mt-1">
              {multipleCorrect ? 'Multiple answers allowed' : 'Single answer'}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderEditor = () => {
    return (
      <div className={cn('w-full space-y-4 p-4 border rounded-lg bg-muted/50', className)}>
        <div>
          <label className="text-sm font-medium">Question</label>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question..."
            className="mt-1"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Options</label>
          {options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-2">
              <Checkbox
                checked={option.correct}
                onCheckedChange={() => toggleCorrect(option.id)}
                className="mt-1"
              />
              <Input
                value={option.text}
                onChange={(e) => updateOption(option.id, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="flex-1"
              />
              {options.length > 1 && (
                <Button
                  onClick={() => removeOption(option.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button onClick={addOption} variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={multipleCorrect}
              onCheckedChange={setMultipleCorrect}
            />
            Multiple correct answers
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={shuffle}
              onCheckedChange={setShuffle}
            />
            Shuffle options
          </label>
        </div>

        <div className="flex gap-2">
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
      </div>
    );
  };

  return (
    <div
      className="w-full mb-4"
      onClick={() => !isEditingState && setIsEditingState(true)}
    >
      {isEditingState ? renderEditor() : renderDisplay()}
    </div>
  );
};