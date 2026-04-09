'use client';

import { forwardRef } from 'react';
import { Input } from './input';
import { Textarea } from './textarea';
import { cn } from '@/lib/utils';

interface TypingPlaceholderInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  placeholders: string[];
  typingSpeed?: number;
  pauseTime?: number;
}

interface TypingPlaceholderTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'placeholder'> {
  placeholders: string[];
  typingSpeed?: number;
  pauseTime?: number;
}

export const InputWithTypingPlaceholder = forwardRef<HTMLInputElement, TypingPlaceholderInputProps>(
  ({ placeholders, typingSpeed = 100, pauseTime = 2000, value, className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        value={value}
        className={cn("w-full", className)}
        {...props}
      />
    );
  }
);

InputWithTypingPlaceholder.displayName = 'InputWithTypingPlaceholder';

export const TextareaWithTypingPlaceholder = forwardRef<HTMLTextAreaElement, TypingPlaceholderTextareaProps>(
  ({ placeholders, typingSpeed = 100, pauseTime = 2000, value, className, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        value={value}
        className={cn("w-full", className)}
        {...props}
      />
    );
  }
);

TextareaWithTypingPlaceholder.displayName = 'TextareaWithTypingPlaceholder';
