'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, Layers, FileText, Loader2, CheckCircle2 } from 'lucide-react';

const TOOL_CONFIG = {
  quiz: {
    icon: HelpCircle,
    steps: [
      'Opening study task',
      'Retrieving source content',
      'Preparing question blueprint',
      'Generating questions',
      'Finalizing workspace',
    ],
  },
  flashcards: {
    icon: Layers,
    steps: [
      'Opening study task',
      'Retrieving source content',
      'Preparing card structure',
      'Generating flashcards',
      'Finalizing workspace',
    ],
  },
  notes: {
    icon: FileText,
    steps: [
      'Opening study task',
      'Retrieving source content',
      'Preparing note structure',
      'Generating notes',
      'Finalizing workspace',
    ],
  },
} as const;

const DEFAULT_STEPS = ['Opening task', 'Retrieving source content', 'Preparing structure', 'Generating output', 'Finalizing workspace'];

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
      return 3800;
    };
    if (currentStep < steps.length - 1) {
      const timer = setTimeout(() => setCurrentStep((s) => s + 1), getDelay(currentStep));
      return () => clearTimeout(timer);
    }
  }, [currentStep, steps.length]);

  const progress = Math.min(((currentStep + 1) / steps.length) * 100, 95);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-border surface-panel p-5 md:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border surface-interactive">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Generating {tool || 'content'}</p>
            <p className="text-xs text-muted-foreground">Using your selected source material and settings.</p>
          </div>
        </div>

        <div className="w-full space-y-3">
          <div className="h-1 w-full overflow-hidden rounded-full surface-interactive">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="space-y-2">
            {steps.map((step, i) => {
              const isDone = i < currentStep;
              const isActive = i === currentStep;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : isDone
                        ? 'bg-emerald-900/10 text-emerald-800'
                        : 'surface-interactive text-muted-foreground'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : isActive ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
