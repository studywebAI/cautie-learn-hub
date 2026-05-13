'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Calendar, Clock, BarChart3, Zap } from 'lucide-react';

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

type LayoutPattern = 'week-grid' | 'day-slots' | 'timeline' | 'heatmap';

export function Step4Agenda({
  data,
  setData,
}: {
  data: WorkflowData;
  setData: (data: WorkflowData) => void;
}) {
  const [layoutPattern, setLayoutPattern] = useState<LayoutPattern>('week-grid');
  const [startDate, setStartDate] = useState<string>('');
  const [minutesPerDay, setMinutesPerDay] = useState<string>('45');
  const [preferredDays, setPreferredDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

  const layouts: { id: LayoutPattern; icon: any; label: string; description: string }[] = [
    { id: 'week-grid', icon: Calendar, label: 'Week Grid', description: 'See your whole week at once' },
    { id: 'day-slots', icon: Clock, label: 'Day Slots', description: 'Time-based (morning/afternoon/evening)' },
    { id: 'timeline', icon: Zap, label: 'Timeline', description: 'Gantt-style duration visualization' },
    { id: 'heatmap', icon: BarChart3, label: 'Heatmap', description: 'Intensity/color-coded days' },
  ];

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels: Record<string, string> = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  };

  const toggleDay = (day: string) => {
    setPreferredDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    setData({
      ...data,
      agenda: {
        layoutPattern,
        startDate,
        minutesPerDay: parseInt(minutesPerDay),
        preferredDays,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Your Learning Schedule</CardTitle>
        <CardDescription>
          Choose how to view and organize your study timeline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Layout Pattern Selection */}
        <div>
          <Label className="mb-3 block">View Style</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {layouts.map(layout => {
              const Icon = layout.icon;
              return (
                <button
                  key={layout.id}
                  onClick={() => setLayoutPattern(layout.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    layoutPattern === layout.id
                      ? 'border-[var(--accent-brand)] bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border hover:border-[var(--accent-brand)]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium text-center">{layout.label}</span>
                  <span className="text-[10px] text-muted-foreground text-center">
                    {layout.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minutes">Minutes per Day</Label>
            <Input
              id="minutes"
              type="number"
              min="15"
              max="480"
              value={minutesPerDay}
              onChange={e => setMinutesPerDay(e.target.value)}
            />
          </div>
        </div>

        {/* Day Selection */}
        <div className="space-y-3">
          <Label>Which days do you want to study?</Label>
          <div className="flex flex-wrap gap-2">
            {days.map(day => (
              <Button
                key={day}
                variant={preferredDays.includes(day) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleDay(day)}
                className="flex-1 min-w-fit"
              >
                {dayLabels[day]}
              </Button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg bg-muted/30 p-4">
          <p className="text-sm font-medium mb-2">Your Schedule:</p>
          <p className="text-sm text-muted-foreground">
            {preferredDays.length > 0 && (
              <>
                Study {preferredDays.map(d => dayLabels[d]).join(', ')} · {minutesPerDay} minutes per day
              </>
            )}
            {startDate && (
              <>
                {' '}· Starting {new Date(startDate).toLocaleDateString()}
              </>
            )}
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>AI Magic:</strong> We'll automatically distribute your materials across the days you select, considering difficulty and time available.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
