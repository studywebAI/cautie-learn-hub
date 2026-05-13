'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { CheckCircle2, Zap } from 'lucide-react';

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

export function Step5Review({
  data,
  setData,
}: {
  data: WorkflowData;
  setData: (data: WorkflowData) => void;
}) {
  const [randomOrder, setRandomOrder] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');

  const handleSave = () => {
    setData({
      ...data,
      preferences: {
        randomOrder,
        reminders,
        theme,
      },
    });
  };

  // Trigger save on any change
  const handleChange = (key: string, value: any) => {
    const newPrefs = { ...data.preferences, [key]: value };
    setData({ ...data, preferences: newPrefs });
    if (key === 'randomOrder') setRandomOrder(value);
    if (key === 'reminders') setReminders(value);
    if (key === 'theme') setTheme(value);
  };

  const summaryItems = [
    { label: 'Topic', value: data.name },
    { label: 'Materials', value: `${data.materials.length} added` },
    { label: 'Subject', value: data.subject || 'Not set' },
    { label: 'Schedule', value: `${data.agenda.minutesPerDay || 45} min/day` },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your StudySet Summary</CardTitle>
          <CardDescription>Review what we're about to create</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {summaryItems.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="text-sm font-medium truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Completion Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { done: !!data.name, label: 'Study set name' },
            { done: data.materials.length > 0, label: 'Materials uploaded' },
            { done: !!data.aiGenOptions, label: 'Generation style selected' },
            { done: !!data.agenda.layoutPattern, label: 'Schedule configured' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <CheckCircle2 className={`h-4 w-4 ${
                item.done ? 'text-green-600' : 'text-muted-foreground'
              }`} />
              <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your learning experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Random Order */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium text-sm">Random Order</p>
              <p className="text-xs text-muted-foreground">Shuffle questions each session</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={randomOrder}
                onChange={e => handleChange('randomOrder', e.target.checked)}
                className="w-4 h-4"
              />
            </label>
          </div>

          {/* Reminders */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium text-sm">Daily Reminders</p>
              <p className="text-xs text-muted-foreground">Get notified to study</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={reminders}
                onChange={e => handleChange('reminders', e.target.checked)}
                className="w-4 h-4"
              />
            </label>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-sm">App Theme</Label>
            <div className="flex gap-2">
              {(['light', 'dark', 'auto'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => handleChange('theme', t)}
                  className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium capitalize ${
                    theme === t
                      ? 'border-[var(--accent-brand)] bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border hover:border-[var(--accent-brand)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ready Card */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-200 mb-1">
                You're all set! 🎉
              </p>
              <p className="text-sm text-green-800 dark:text-green-300">
                Click "Finish" to create your StudySet. The AI will now generate your personalized study materials, flashcards, quiz questions, and learning schedule.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
