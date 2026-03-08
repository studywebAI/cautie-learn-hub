'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, Layers, FileText } from 'lucide-react';

const TOOL_CONFIG = {
  quiz: {
    icon: HelpCircle,
    steps: [
      'Reading your source material…',
      'Identifying key concepts…',
      'Crafting questions…',
      'Generating answer options…',
      'Reviewing difficulty balance…',
      'Finalizing your quiz…',
    ],
  },
  flashcards: {
    icon: Layers,
    steps: [
      'Scanning your content…',
      'Extracting key terms…',
      'Pairing concepts with definitions…',
      'Building card deck…',
      'Reviewing card quality…',
      'Finalizing flashcards…',
    ],
  },
  notes: {
    icon: FileText,
    steps: [
      'Analyzing your material…',
      'Identifying main topics…',
      'Structuring sections…',
      'Summarizing key points…',
      'Formatting output…',
      'Finalizing your notes…',
    ],
  },
} as const;

const DEFAULT_STEPS = ['Processing…', 'Analyzing…', 'Generating…', 'Reviewing…', 'Finalizing…'];

interface FunLoaderProps {
  tool?: 'quiz' | 'flashcards' | 'notes';
}

export function FunLoader({ tool }: FunLoaderProps) {
  const config = tool ? TOOL_CONFIG[tool] : null;
  const steps = config?.steps || DEFAULT_STEPS;
  const Icon = config?.icon || FileText;
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const getDelay = (step: number) => {
      if (step === 0) return 1200;
      if (step < steps.length - 2) return 2200 + step * 400;
      return 4000;
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

        {/* Tool-specific icon with subtle pulse */}
        <div className="relative flex items-center justify-center h-14 w-14">
          <div className="absolute inset-0 rounded-xl bg-primary/10 animate-pulse" />
          <Icon className="h-6 w-6 text-primary relative z-10" strokeWidth={1.5} />
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-3">
          <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step text crossfade */}
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
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= currentStep ? 'w-2.5 bg-primary' : 'w-1.5 bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
