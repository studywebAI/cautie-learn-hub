'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type WorkflowType = 'balanced' | 'test_prep' | 'visual' | 'deep_diver' | 'quick_learner';

interface WorkflowSelectorProps {
  onSelectWorkflow: (workflow: WorkflowType) => void;
}

const workflows = [
  {
    id: 'balanced' as WorkflowType,
    title: 'Balanced Learner',
    description: 'All tools equally mixed. Learn topics in logical order with balanced practice.',
    icon: '⚖️',
  },
  {
    id: 'test_prep' as WorkflowType,
    title: 'Test Prep Master',
    description: '70% quiz-focused. Intensive practice with pattern recognition. Perfect for exams.',
    icon: '🎯',
  },
  {
    id: 'visual' as WorkflowType,
    title: 'Visual Learner',
    description: 'Timelines & mindmaps first. Visual understanding before diving into details.',
    icon: '🎨',
  },
  {
    id: 'deep_diver' as WorkflowType,
    title: 'Deep Diver',
    description: 'Theory-heavy. Build advanced connections and synthesis of all concepts.',
    icon: '🔬',
  },
  {
    id: 'quick_learner' as WorkflowType,
    title: 'Quick Learner',
    description: 'Short daily sessions. High-frequency review. Perfect for busy schedules.',
    icon: '⚡',
  },
];

export function WorkflowSelector({ onSelectWorkflow }: WorkflowSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Which workflow resonates with you?</h2>
        <p className="text-muted-foreground">
          Choose how you want to structure your learning. You can always adjust later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workflows.map((workflow) => (
          <button
            key={workflow.id}
            onClick={() => onSelectWorkflow(workflow.id)}
            className="text-left"
          >
            <Card className="h-full hover:shadow-md hover:border-[var(--accent-brand)] transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-3xl mb-2">{workflow.icon}</div>
                    <CardTitle>{workflow.title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm mt-2">
                  {workflow.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </button>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>💡 Tip:</strong> Each workflow personalizes your settings and generates a unique study plan.
          The choice affects which settings you'll customize next.
        </p>
      </div>
    </div>
  );
}
