'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const MESSAGES_BY_TOOL: Record<string, string[]> = {
  quiz: [
    'Cooking up tricky questions…',
    'Making sure the wrong answers sound right…',
    'Adding a pinch of difficulty…',
    'Double-checking the answer key…',
    'Almost there, just sharpening the last question…',
    'Consulting the quiz gods…',
    'Mixing easy and hard ones together…',
    'Your quiz is almost ready to roll…',
  ],
  flashcards: [
    'Flipping through your text…',
    'Crafting the perfect card pairs…',
    'Front side… back side… done!',
    'Sorting the key concepts…',
    'Making them stick in your memory…',
    'Almost done shuffling…',
    'Picking out the important bits…',
    'Your flashcards are nearly ready…',
  ],
  notes: [
    'Reading through your material…',
    'Highlighting the key points…',
    'Organizing everything neatly…',
    'Structuring your notes…',
    'Adding headers and sections…',
    'Making it easy to scan…',
    'Wrapping things up…',
    'Your notes are almost done…',
  ],
};

const DEFAULT_MESSAGES = [
  'Working on it…',
  'Almost there…',
  'Just a moment…',
  'Putting it all together…',
  'Nearly done…',
];

interface FunLoaderProps {
  tool?: 'quiz' | 'flashcards' | 'notes';
}

export function FunLoader({ tool }: FunLoaderProps) {
  const messages = tool ? MESSAGES_BY_TOOL[tool] || DEFAULT_MESSAGES : DEFAULT_MESSAGES;
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setFade(true);
      }, 200);
    }, 2400);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p
          className={`text-sm text-muted-foreground mt-2 transition-opacity duration-200 ${fade ? 'opacity-100' : 'opacity-0'}`}
        >
          {messages[index]}
        </p>
      </div>
    </div>
  );
}
