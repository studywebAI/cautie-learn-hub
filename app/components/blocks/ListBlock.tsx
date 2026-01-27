'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { BlockProps, ListBlockContent, ListItem } from './types';
import { cn } from '@/lib/utils';

interface ListBlockProps extends BlockProps {
  block: BlockProps['block'] & { content: ListBlockContent };
}

export const ListBlock: React.FC<ListBlockProps> = ({
  block,
  onUpdate,
  isEditing = false,
  className,
}) => {
  const [isEditingState, setIsEditingState] = useState(isEditing);
  const [items, setItems] = useState<ListItem[]>(block.content.items || []);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...block.content,
        items,
      });
    }
    setIsEditingState(false);
  };

  const handleItemChange = (index: number, text: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], text };
    setItems(newItems);
  };

  const handleItemCheck = (index: number, checked: boolean) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], checked };
    setItems(newItems);
    if (onUpdate) {
      onUpdate({
        ...block.content,
        items: newItems,
      });
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), text: '' }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === items.length - 1) {
        addItem();
      }
    }
    if (e.key === 'Backspace' && items[index].text === '' && items.length > 1) {
      e.preventDefault();
      removeItem(index);
    }
  };

  const renderDisplay = () => {
    const { type } = block.content;

    return (
      <div className="mb-4">
        {items.map((item, index) => {
          if (type === 'todo') {
            return (
              <div key={item.id} className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={item.checked || false}
                  onCheckedChange={(checked) => handleItemCheck(index, checked as boolean)}
                  className="mt-0.5"
                />
                <span
                  className={cn(
                    'text-base',
                    item.checked && 'line-through text-muted-foreground'
                  )}
                >
                  {item.text || 'Todo item'}
                </span>
              </div>
            );
          }

          if (type === 'numbered') {
            return (
              <div key={item.id} className="flex gap-2 mb-2">
                <span className="text-base font-medium text-muted-foreground min-w-[24px]">
                  {index + 1}.
                </span>
                <span className="text-base">{item.text || 'List item'}</span>
              </div>
            );
          }

          // bulleted
          return (
            <div key={item.id} className="flex gap-2 mb-2">
              <span className="text-base text-muted-foreground">•</span>
              <span className="text-base">{item.text || 'List item'}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderEditor = () => {
    return (
      <div className="mb-4">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2 mb-2">
            {block.content.type === 'todo' && (
              <Checkbox
                checked={item.checked || false}
                onCheckedChange={(checked) => handleItemCheck(index, checked as boolean)}
                className="mt-0.5"
              />
            )}
            {block.content.type === 'numbered' && (
              <span className="text-base font-medium text-muted-foreground min-w-[24px]">
                {index + 1}.
              </span>
            )}
            {block.content.type === 'bulleted' && (
              <span className="text-base text-muted-foreground">•</span>
            )}
            <Textarea
              value={item.text}
              onChange={(e) => handleItemChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              placeholder="List item..."
              className="min-h-[24px] resize-none border-none shadow-none focus-visible:ring-0 p-0 text-base"
              autoFocus={index === items.length - 1}
            />
          </div>
        ))}
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