'use client';

import { useState, useEffect } from 'react';

const STEPS_BY_TOOL: Record<string, string[]> = {
  quiz: [
    'Reading your source material…',
    'Identifying key concepts…',
    'Crafting questions…',
    'Generating answer options…',
    'Reviewing difficulty balance…',
    'Finalizing your quiz…',
  ],
  flashcards: [
    'Scanning your content…',
    'Extracting key terms…',
    'Pairing concepts with definitions…',
    'Building card deck…',
    'Reviewing card quality…',
    'Finalizing flashcards…',
  ],
  notes: [
    'Analyzing your material…',
    'Identifying main topics…',
    'Structuring sections…',
    'Summarizing key points…',
    'Formatting output…',
    'Finalizing your notes…',
  ],
};

const DEFAULT_STEPS = [
  'Processing input…',
  'Analyzing content…',
  'Generating output…',
  'Reviewing results…',
  'Finalizing…',
];

interface FunLoaderProps {
  tool?: 'quiz' | 'flashcards' | 'notes';
}

export function FunLoader({ tool }: FunLoaderProps) {
  const steps = tool ? STEPS_BY_TOOL[tool] || DEFAULT_STEPS : DEFAULT_STEPS;
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // First step advances quickly, then slows down, last step stays
    const getDelay = (step: number) => {
      if (step === 0) return 1200;
      if (step < steps.length - 2) return 2200 + step * 400;
      return 4000; // Last steps linger
    };

    if (currentStep < steps.length - 1) {
      const timer = setTimeout(() => setCurrentStep((s) => s + 1), getDelay(currentStep));
      return () => clearTimeout(timer);
    }
  }, [currentStep, steps.length]);

  const progress = Math.min(((currentStep + 1) / steps.length) * 100, 95);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        {/* Animated orb */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-1 rounded-full bg-primary/30 animate-pulse" />
          <div className="absolute inset-3 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-[18px] rounded-full bg-primary" />
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-3">
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step text with crossfade */}
          <div className="relative h-5 overflow-hidden">
            {steps.map((step, i) => (
              <p
                key={i}
                className="absolute inset-0 text-center text-xs text-muted-foreground transition-all duration-500"
                style={{
                  opacity: i === currentStep ? 1 : 0,
                  transform: i === currentStep ? 'translateY(0)' : i < currentStep ? 'translateY(-8px)' : 'translateY(8px)',
                }}
              >
                {step}
              </p>
            ))}
          </div>
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= currentStep ? 'w-3 bg-primary' : 'w-1.5 bg-muted-foreground/25'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
