
'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, BookCheck, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import type { AiSuggestion } from '@/lib/types';
import { useDictionary } from '@/contexts/app-context';
import { Button } from '../ui/button';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';
import { useState, useEffect } from 'react';
import type { DailyScheduleRecommendation } from '@/ai/flows/generate-daily-schedule-recommendations';

type TodayPanelProps = {
  selectedDay?: Date;
  events: CalendarEvent[];
  suggestion: AiSuggestion | null;
  isGeneratingSuggestion: boolean;
  personalTasks: any[]; // Add personal tasks
  assignments: any[]; // Add assignments
  classes: any[]; // Add classes
};

const iconMap = {
  BrainCircuit,
  FileText: BookCheck, // Mapping for consistency
  Calendar: BookCheck,
};


export function TodayPanel({ selectedDay, events, suggestion, isGeneratingSuggestion, personalTasks, assignments, classes }: TodayPanelProps) {
  const { dictionary } = useDictionary();
  const [scheduleRecommendations, setScheduleRecommendations] = useState<DailyScheduleRecommendation | null>(null);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);

  const generateScheduleRecommendations = async () => {
    if (!selectedDay) return;

    setIsGeneratingSchedule(true);
    try {
      const response = await fetch('/api/ai/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'generateDailyScheduleRecommendations',
          input: {
            currentDate: format(selectedDay, 'yyyy-MM-dd'),
            personalTasks: personalTasks.map(t => ({
              id: t.id,
              title: t.title,
              date: t.date,
              priority: (t as any).priority,
              estimatedDuration: (t as any).estimated_duration,
              subject: t.subject,
            })),
            assignments: assignments.map(a => ({
              id: a.id,
              title: a.title,
              due_date: a.due_date,
              subject: classes.find(c => c.id === a.class_id)?.name || 'Class',
            })),
            userPreferences: {
              preferredStudyTimes: ['09:00-12:00', '14:00-17:00'],
              breakFrequency: 90,
            },
          },
        }),
      });

      if (response.ok) {
        const recommendations = await response.json();
        setScheduleRecommendations(recommendations);
      }
    } catch (error) {
      console.error('Failed to generate schedule recommendations:', error);
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  const renderEvent = (event: CalendarEvent) => {
    const content = (
         <div className="p-3 bg-muted/50 rounded-lg border-l-4" 
              style={{borderColor: `hsl(var(--${event.type === 'assignment' ? 'destructive' : 'primary'}))`}}>
            <div className='flex justify-between items-start'>
              <div className="flex-1">
                <p className="font-semibold">{event.title}</p>
                <p className="text-sm text-muted-foreground">{event.subject}</p>
                {event.chapter_title && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full"></span>
                    {event.chapter_title}
                  </p>
                )}
              </div>
              {event.type === 'assignment'
                ? <BookCheck className="h-4 w-4 text-destructive"/>
                : <BrainCircuit className="h-4 w-4 text-primary"/>}
            </div>
        </div>
    );
    
    if (event.type === 'assignment') {
        return (
            <Link key={event.id} href={event.href} className="block group hover:bg-muted transition-colors rounded-lg">
                {content}
            </Link>
        )
    }

    return <div key={event.id}>{content}</div>
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">
                    {dictionary.agenda.eventsOn} {selectedDay ? format(selectedDay, 'MMMM d') : 'the selected day'}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 min-h-[200px]">
                {events.length > 0 ? (
                    events.map(renderEvent)
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        {dictionary.agenda.noEvents}
                    </p>
                )}
            </CardContent>
        </Card>
        
        {(isGeneratingSuggestion || suggestion) && (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        AI Smart Suggestion
                    </CardTitle>
                </CardHeader>
                 <CardContent>
                    {isGeneratingSuggestion ? (
                        <div className="flex items-center space-x-2">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <Skeleton className="h-4 w-[200px]" />
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full justify-start h-auto p-3 text-left bg-background hover:bg-muted"
                        >
                            <BrainCircuit className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                            <span className="flex-1 whitespace-normal">{suggestion?.title}</span>
                        </Button>
                    )}
                    {suggestion?.content && !isGeneratingSuggestion && (
                        <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                            {suggestion.content}
                        </div>
                    )}
                </CardContent>
            </Card>
        )}

        {/* AI Schedule Recommendations */}
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Smart Scheduling
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={generateScheduleRecommendations}
                        disabled={isGeneratingSchedule}
                    >
                        {isGeneratingSchedule ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Get Recommendations
                    </Button>
                </CardTitle>
                <CardDescription>
                    AI-powered suggestions for optimizing your schedule
                </CardDescription>
            </CardHeader>
            <CardContent>
                {scheduleRecommendations ? (
                    <div className="space-y-3">
                        {scheduleRecommendations.recommendations.map((rec, index) => (
                            <div key={index} className="p-3 bg-muted/50 rounded-lg">
                                <div className="font-medium">{rec.taskId}</div>
                                <div className="text-sm text-muted-foreground">
                                    Suggested: {rec.suggestedDate} at {rec.suggestedTime}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {rec.reasoning}
                                </div>
                            </div>
                        ))}
                        <div className="text-sm text-muted-foreground pt-2 border-t">
                            {scheduleRecommendations.overallAdvice}
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Click "Get Recommendations" to receive AI-powered scheduling suggestions
                    </p>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
