'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock generated plan - will be replaced with AI-generated data later
const generateMockPlan = (studyDays: string[]): any => {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const taskExamples: Record<string, { tasks: string[]; tools: string[] }> = {
    monday: {
      tasks: ['Read: Introduction Chapter', 'Timeline: Key Events', 'Quiz: Basic Concepts (5 questions)'],
      tools: ['notes', 'timeline', 'quiz'],
    },
    wednesday: {
      tasks: ['Flashcards: Key Terms', 'Quiz: Deep Dive (8 questions)', 'Mindmap: Full Topic Map'],
      tools: ['flashcards', 'quiz', 'mindmap'],
    },
    friday: {
      tasks: ['Review: Complete Summary', 'Quiz: Mixed Review (15 questions)', 'Flashcards: Weak Areas'],
      tools: ['notes', 'quiz', 'flashcards'],
    },
    default: {
      tasks: ['Study Session: Core Concepts', 'Practice: Examples & Applications'],
      tools: ['notes', 'quiz'],
    },
  };

  const selectedDays = studyDays.slice(0, 3); // Use first 3 selected days for demo
  const days = selectedDays.map((dayName) => {
    const dayKey = dayName.toLowerCase() as keyof typeof taskExamples;
    const examples = taskExamples[dayKey] || taskExamples.default;
    const dayIndex = dayNames.indexOf(dayName);
    const dateOffset = (dayIndex + 13) - new Date().getDay(); // Relative to May 13, 2026
    const date = new Date(2026, 4, 13 + dateOffset).toISOString().split('T')[0];

    return {
      date,
      dayName,
      tasks: examples.tasks.map((task, idx) => ({
        task,
        tool: examples.tools[idx],
      })),
    };
  });

  return { days };
};

export function Step4Review({
  data,
  setData,
  onSubmit,
  isLoading,
}: {
  data: any;
  setData: (data: any) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}) {
  const { toast } = useToast();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [isAddingToAgenda, setIsAddingToAgenda] = useState(false);

  const studyDays = data.settings?.studyDays || [];
  const generatedPlan = data.generatedPlan || generateMockPlan(studyDays);

  // Ensure generatedPlan is always defined
  const plan = generatedPlan || { days: [] };

  const handleAddToAgenda = async () => {
    if (!data.studysetId) {
      toast({
        title: 'Error',
        description: 'StudySet ID not found. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsAddingToAgenda(true);
    try {
      const response = await fetch(`/api/studysets/${data.studysetId}/agenda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        throw new Error('Failed to add to agenda');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: `✓ Added ${plan.days.length} days to your agenda`,
      });

      // Update data and call onSubmit
      setData({
        ...data,
        agenda: { eventIds: result.eventIds },
      });

      // Give user a moment to see the success message
      setTimeout(onSubmit, 500);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add to agenda. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToAgenda(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Your Study Plan</CardTitle>
        <CardDescription>
          AI-generated schedule based on your settings. Click days to see details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Overview */}
        <div className="space-y-2">
          {plan.days.map((day: any) => (
            <button
              key={day.date}
              onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
              className="w-full text-left"
            >
              <div className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📅</span>
                  <div>
                    <div className="font-medium text-sm">{day.dayName}</div>
                    <div className="text-xs text-muted-foreground">{day.tasks.length} tasks</div>
                  </div>
                </div>
                {expandedDay === day.date ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>

              {/* Expanded Details */}
              {expandedDay === day.date && (
                <div className="mt-2 ml-6 space-y-2 pb-4 border-l-2 border-muted pl-4">
                  {day.tasks.map((item: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5">
                          {item.tool === 'notes' && '📝'}
                          {item.tool === 'flashcards' && '🎴'}
                          {item.tool === 'quiz' && '❓'}
                          {item.tool === 'timeline' && '📅'}
                          {item.tool === 'mindmap' && '🌳'}
                        </span>
                        <div>
                          <div className="font-medium text-foreground">{item.task}</div>
                          <div className="text-xs text-muted-foreground capitalize">{item.tool}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Agenda Preview */}
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
          <div className="text-sm font-medium text-emerald-900 dark:text-emerald-200 mb-3">
            📌 In je Agenda:
          </div>
          <div className="space-y-1 text-xs text-emerald-900 dark:text-emerald-200">
            {plan.days.map((day: any) => (
              <div key={day.date}>
                <strong>{day.dayName}</strong> • {day.tasks.length} tasks
              </div>
            ))}
          </div>
        </div>

        {/* Settings Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="font-medium">Your Settings:</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>
              Knowledge Level: <span className="font-medium text-foreground capitalize">{data.settings?.knowledgeLevel}</span>
            </div>
            <div>
              Study Days: <span className="font-medium text-foreground">{data.settings?.studyDays?.join(', ')}</span>
            </div>
            {data.settings?.workflowSetting && (
              <div>
                Preference: <span className="font-medium text-foreground">{data.settings.workflowSetting}</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>💡 Ready?</strong> Click "Add to Agenda" to create calendar events for each study day. You can modify them anytime.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setData({ ...data, step: 3 })}
            disabled={isAddingToAgenda}
            className="flex-1"
          >
            ← Edit Settings
          </Button>
          <Button
            onClick={handleAddToAgenda}
            disabled={isAddingToAgenda}
            className="flex-1"
          >
            {isAddingToAgenda ? 'Adding...' : 'Add to Agenda →'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
