'use client';

import { useState, useEffect } from 'react';

// ── Per-scenario config ──────────────────────────────────────────────────────
type ScenarioConfig = {
  title: string;
  steps: string[];
};

const SCENARIOS: Record<string, ScenarioConfig> = {
  quiz: {
    title: 'Generating Quiz',
    steps: [
      'Opening study task',
      'Retrieving source content',
      'Preparing question blueprint',
      'Generating questions',
      'Finalizing workspace',
    ],
  },
  flashcards: {
    title: 'Creating Flashcards',
    steps: [
      'Opening study task',
      'Retrieving source content',
      'Preparing card structure',
      'Generating flashcards',
      'Finalizing workspace',
    ],
  },
  notes: {
    title: 'Generating Notes',
    steps: [
      'Opening study task',
      'Retrieving source content',
      'Preparing note structure',
      'Writing notes',
      'Finalizing workspace',
    ],
  },
  mindmap: {
    title: 'Building Mind Map',
    steps: [
      'Opening study task',
      'Retrieving source content',
      'Mapping key concepts',
      'Generating branches',
      'Finalizing workspace',
    ],
  },
  presentation: {
    title: 'Creating Presentation',
    steps: [
      'Opening study task',
      'Retrieving source content',
      'Planning slide structure',
      'Generating slides',
      'Finalizing workspace',
    ],
  },
  analytics: {
    title: 'Loading Analytics',
    steps: [
      'Connecting to data',
      'Fetching records',
      'Calculating metrics',
      'Building overview',
    ],
  },
  page: {
    title: 'Loading',
    steps: ['Connecting', 'Fetching data', 'Preparing view'],
  },
};

const DEFAULT_SCENARIO: ScenarioConfig = {
  title: 'Loading',
  steps: ['Preparing', 'Loading data', 'Almost done'],
};

// Step-specific delays (ms) — early steps resolve faster, last step lingers
const STEP_DELAYS = [1100, 2300, 3000, 3700, 4400];

// ── Component ────────────────────────────────────────────────────────────────
interface FunLoaderProps {
  /** Maps to a built-in scenario (quiz, flashcards, notes, mindmap, presentation, analytics, page) */
  tool?: string;
  /** Explicit scenario key — takes precedence over `tool` */
  scenario?: string;
}

export function FunLoader({ tool, scenario }: FunLoaderProps) {
  const key = scenario || tool || '';
  const config = SCENARIOS[key] ?? DEFAULT_SCENARIO;
  const { title, steps } = config;

  const [currentStep, setCurrentStep] = useState(0);
  const [animKey, setAnimKey] = useState(0); // triggers re-animation on step change

  // Reset when scenario changes
  useEffect(() => {
    setCurrentStep(0);
    setAnimKey((k) => k + 1);
  }, [key]);

  // Auto-advance through steps
  useEffect(() => {
    if (currentStep >= steps.length - 1) return;
    const delay = STEP_DELAYS[currentStep] ?? 3000;
    const timer = setTimeout(() => {
      setCurrentStep((s) => s + 1);
      setAnimKey((k) => k + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [currentStep, steps.length]);

  return (
    <div className="flex flex-1 items-center justify-center p-8 bg-background">
      <div className="flex flex-col items-center gap-6 text-center">

        {/* Spinner */}
        <div
          className="h-9 w-9 animate-spin rounded-full"
          style={{
            border: '2.5px solid rgba(0,0,0,0.08)',
            borderTopColor: 'var(--accent-brand)',
            animationDuration: '0.8s',
          }}
        />

        {/* Current step — fades up on each change */}
        <div className="space-y-1.5">
          <p
            key={animKey}
            className="text-[22px] tracking-tight text-foreground fun-loader-fade-up"
          >
            {steps[currentStep]}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {title}&nbsp;·&nbsp;Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Breadcrumb dots */}
        <div className="flex items-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === currentStep ? 24 : 8,
                backgroundColor:
                  i <= currentStep ? 'var(--accent-brand)' : 'rgba(0,0,0,0.12)',
                opacity: i > currentStep ? 0.35 : 1,
              }}
            />
          ))}
        </div>
      </div>

      {/* Keyframe for step label animation */}
      <style>{`
        @keyframes funLoaderFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fun-loader-fade-up {
          animation: funLoaderFadeUp 0.45s ease forwards;
        }
      `}</style>
    </div>
  );
}
