'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { Clock, Brain, RotateCw, TreePine, Zap } from 'lucide-react';

type WorkflowData = {
  step: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  subject: string;
  materials: Array<{ type: string; content: string }>;
  aiGenOptions: string;
  agenda: Record<string, any>;
  preferences: Record<string, any>;
  studysetId?: string;
};

type GenOption = {
  id: string;
  icon: any;
  label: string;
  description: string;
  subtitle: string;
};

export function Step3AIGeneration({
  data,
  setData,
}: {
  data: WorkflowData;
  setData: (data: WorkflowData) => void;
}) {
  const genOptions: GenOption[] = [
    {
      id: '3a-linear',
      icon: Clock,
      label: 'Linear Progress',
      description: 'Simple progress bar with card previews',
      subtitle: 'Fast & straightforward',
    },
    {
      id: '3b-thinking',
      icon: Brain,
      label: 'Thinking State',
      description: 'See AI reasoning before results',
      subtitle: 'Detailed analysis',
    },
    {
      id: '3c-wizard',
      icon: RotateCw,
      label: 'Multi-Step Wizard',
      description: 'Sequential generation (flashcards → quiz → guide)',
      subtitle: 'Step by step',
    },
    {
      id: '3d-tree',
      icon: TreePine,
      label: 'Tree Visualization',
      description: 'Hierarchical mindmap view',
      subtitle: 'Visual structure',
    },
    {
      id: '3e-carousel',
      icon: Zap,
      label: 'Carousel Options',
      description: 'Compare 3-5 different AI-generated plans',
      subtitle: 'Choose your favorite',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>How should AI generate your plan?</CardTitle>
        <CardDescription>
          Choose how you want to see the AI create your study materials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Box */}
        <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-900 dark:text-purple-200">
            <strong>How it works:</strong> The AI will analyze all your materials and automatically generate flashcards, quizzes, summaries, and a learning schedule - all in the style you choose below.
          </p>
        </div>

        {/* Option Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {genOptions.map(option => {
            const Icon = option.icon;
            const isSelected = data.aiGenOptions === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setData({ ...data, aiGenOptions: option.id })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-[var(--accent-brand)] bg-blue-50 dark:bg-blue-900/20'
                    : 'border-border hover:border-[var(--accent-brand)] hover:bg-muted/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${
                    isSelected ? 'text-[var(--accent-brand)]' : 'text-muted-foreground'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{option.label}</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {option.subtitle}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {isSelected && (
                    <div className="text-[var(--accent-brand)] text-lg">✓</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Preview */}
        <div className="rounded-lg bg-muted/30 p-4">
          <p className="text-sm font-medium mb-2">What you'll get:</p>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>✓ Flashcards (organized by topic/difficulty)</li>
            <li>✓ Quiz questions (to test understanding)</li>
            <li>✓ Study guide (summary of key concepts)</li>
            <li>✓ Learning schedule (spread across days)</li>
            <li>✓ Personalized preferences (order, reminders, etc.)</li>
          </ul>
        </div>

        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-900 dark:text-yellow-200">
            <strong>Note:</strong> The choice here only affects how you SEE the generation process. The final result will be the same.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
