'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, BookCheck, Lightbulb, Loader2, Home, Circle, Square, Check } from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import type { AiSuggestion } from '@/lib/types';
import { useDictionary } from '@/contexts/app-context';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';
import { Checkbox } from '../ui/checkbox';
import { toast } from '@/hooks/use-toast';

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

  const handleToggleComplete = async (event: CalendarEvent) => {
    try {
      const response = await fetch(`/api/assignments/${event.id}/toggle-completed`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update completion status');
      }
      
      toast({
        title: 'Status updated',
        description: `Marked as ${(event as any).completed ? 'incomplete' : 'complete'}`,
      });
      
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update completion status',
        variant: 'destructive',
      });
    }
  };

  const getDeadlineStyle = (event: CalendarEvent) => {
    // For assignment events, check if they have a subtype (homework, small_test, big_test)
    // For now, we'll use the assignment type or default to homework styling
    const assignmentType = (event as any).assignment_type || 'homework';
    
    switch (assignmentType) {
      case 'homework':
        return {
          borderColor: 'rgb(59, 130, 246)', // blue-500
          bgColor: 'rgba(59, 130, 246, 0.1)',
          icon: Home,
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-100',
          label: 'H'
        };
      case 'small_test':
        return {
          borderColor: 'rgb(249, 115, 22)', // orange-500
          bgColor: 'rgba(249, 115, 22, 0.1)',
          icon: Circle,
          iconColor: 'text-orange-500',
          iconBg: 'bg-orange-100',
          label: 't'
        };
      case 'big_test':
        return {
          borderColor: 'rgb(239, 68, 68)', // red-500
          bgColor: 'rgba(239, 68, 68, 0.1)',
          icon: Square,
          iconColor: 'text-red-500',
          iconBg: 'bg-red-100',
          label: 'T'
        };
      default:
        return {
          borderColor: 'hsl(var(--destructive))',
          bgColor: 'hsl(var(--destructive) / 0.1)',
          icon: BookCheck,
          iconColor: 'text-destructive',
          iconBg: 'bg-destructive/10',
          label: '!'
        };
    }
  };

  const renderEvent = (event: CalendarEvent) => {
    const style = getDeadlineStyle(event);
    const IconComponent = style.icon;
    const isCompleted = (event as any).completed;
    
    const content = (
      <div className="p-3 rounded-lg border-l-4"
           style={{borderColor: style.borderColor, backgroundColor: isCompleted ? 'rgba(0,0,0,0.05)' : style.bgColor}}>
        <div className='flex justify-between items-start gap-2'>
          <div className="flex items-start gap-3 flex-1">
            {event.type === 'assignment' && (
              <Checkbox
                checked={isCompleted}
                onCheckedChange={() => handleToggleComplete(event)}
                className="mt-1"
              />
            )}
            <div className={`flex-shrink-0 w-8 h-8 rounded ${style.iconBg} flex items-center justify-center ${isCompleted ? 'opacity-50' : ''}`}>
              <span className={`text-xs font-bold ${style.iconColor}`}>{style.label}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{event.title}</p>
              <p className="text-sm text-muted-foreground">{event.subject}</p>
              {event.chapter_title && (
                <p className="text-xs text-muted-foreground mt-1">
                  {event.chapter_title}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
    
    if (event.type === 'assignment') {
      return (
        <Link key={event.id} href={event.href} className="block hover:bg-muted/50 transition-colors rounded-lg">
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
