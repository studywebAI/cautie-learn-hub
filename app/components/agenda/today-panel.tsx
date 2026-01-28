'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, BookCheck, Lightbulb, Loader2 } from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import type { AiSuggestion } from '@/lib/types';
import { useDictionary } from '@/contexts/app-context';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';

type TodayPanelProps = {
  selectedDay?: Date;
  events: CalendarEvent[];
  suggestion: AiSuggestion | null;
  isGeneratingSuggestion: boolean;
  personalTasks: any[];
  assignments: any[];
  classes: any[];
};

export function TodayPanel({ selectedDay, events, suggestion, isGeneratingSuggestion }: TodayPanelProps) {
  const { dictionary } = useDictionary();

  const renderEvent = (event: CalendarEvent) => {
    const content = (
      <div className="p-3 bg-muted/50 rounded-lg border-l-4" 
           style={{borderColor: `hsl(var(--${event.type === 'assignment' ? 'destructive' : 'primary'}))`}}>
        <div className='flex justify-between items-start'>
          <div className="flex-1">
            <p>{event.title}</p>
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
        <Link key={event.id} href={event.href} className="block hover:bg-muted transition-colors rounded-lg">
          {content}
        </Link>
      );
    }

    return <div key={event.id}>{content}</div>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
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
      
      {/* AI suggestion - only shown when user explicitly requests it */}
      {(isGeneratingSuggestion || suggestion) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              AI Suggestion
            </CardTitle>
            <CardDescription>
              Generated study plan based on your tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isGeneratingSuggestion ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            ) : suggestion?.content ? (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {suggestion.content}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
