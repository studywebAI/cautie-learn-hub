'use client';

import { useState, useEffect, forwardRef } from 'react';
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

function useTypingPlaceholder(texts: string[], typingSpeed = 100, pauseTime = 2000) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      const fullText = texts[currentTextIndex];
      if (currentText.length < fullText.length) {
        timeout = setTimeout(() => {
          setCurrentText(fullText.slice(0, currentText.length + 1));
        }, typingSpeed);
      } else {
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, pauseTime);
      }
    } else {
      if (currentText.length > 0) {
        timeout = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, typingSpeed / 2);
      } else {
        setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [currentText, currentTextIndex, isTyping, texts, typingSpeed, pauseTime]);

  return currentText;
}

export const InputWithTypingPlaceholder = forwardRef<HTMLInputElement, TypingPlaceholderInputProps>(
  ({ placeholders, typingSpeed = 100, pauseTime = 2000, value, className, ...props }, ref) => {
    const typingText = useTypingPlaceholder(placeholders, typingSpeed, pauseTime);
    const hasValue = value !== undefined && value !== '';

    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          value={value}
          className={cn("w-full", className)}
          {...props}
        />
        {!hasValue && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="text-muted-foreground">
              {typingText}
              <span className="animate-pulse">|</span>
            </span>
          </div>
        )}
      </div>
    );
  }
);

InputWithTypingPlaceholder.displayName = 'InputWithTypingPlaceholder';

export const TextareaWithTypingPlaceholder = forwardRef<HTMLTextAreaElement, TypingPlaceholderTextareaProps>(
  ({ placeholders, typingSpeed = 100, pauseTime = 2000, value, className, ...props }, ref) => {
    const typingText = useTypingPlaceholder(placeholders, typingSpeed, pauseTime);
    const hasValue = value !== undefined && value !== '';

    return (
      <div className="relative w-full">
        <Textarea
          ref={ref}
          value={value}
          className={cn("w-full", className)}
          {...props}
        />
        {!hasValue && (
          <div className="absolute left-3 top-3 pointer-events-none">
            <span className="text-muted-foreground">
              {typingText}
              <span className="animate-pulse">|</span>
            </span>
          </div>
        )}
      </div>
    );
  }
);

TextareaWithTypingPlaceholder.displayName = 'TextareaWithTypingPlaceholder';
