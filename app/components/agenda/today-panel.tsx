'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, BookCheck, Lightbulb, Loader2, Home, Circle, Square, BookOpen } from 'lucide-react';
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
  onEventClick?: (event: CalendarEvent) => void;
};

export function TodayPanel({ selectedDay, events, suggestion, isGeneratingSuggestion, onEventClick }: TodayPanelProps) {
  const { dictionary } = useDictionary();

  const getDeadlineStyle = (event: CalendarEvent) => {
    if (event.type === 'agenda_item') {
      if (event.visibility_state === 'hidden') {
        return {
          borderColor: 'rgb(239, 68, 68)',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          icon: Square,
          iconColor: 'text-red-500',
          iconBg: 'bg-red-100',
          label: 'H'
        };
      }
      if (event.item_type === 'quiz') {
        return {
          borderColor: 'rgb(249, 115, 22)',
          bgColor: 'rgba(249, 115, 22, 0.1)',
          icon: Circle,
          iconColor: 'text-orange-500',
          iconBg: 'bg-orange-100',
          label: 'Q'
        };
      }
      return {
        borderColor: 'rgb(59, 130, 246)',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        icon: Home,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-100',
        label: 'A'
      };
    }

    if (event.type !== 'assignment') {
      return {
        borderColor: 'rgb(15, 23, 42)',
        bgColor: 'rgba(15, 23, 42, 0.08)',
        icon: BookOpen,
        iconColor: 'text-slate-700',
        iconBg: 'bg-slate-100',
        label: 'S'
      };
    }

    const assignmentType = (event as any).assignment_type || 'homework';
    
    switch (assignmentType) {
      case 'homework':
        return {
          borderColor: 'rgb(59, 130, 246)',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          icon: Home,
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-100',
          label: 'H'
        };
      case 'small_test':
        return {
          borderColor: 'rgb(249, 115, 22)',
          bgColor: 'rgba(249, 115, 22, 0.1)',
          icon: Circle,
          iconColor: 'text-orange-500',
          iconBg: 'bg-orange-100',
          label: 't'
        };
      case 'big_test':
        return {
          borderColor: 'rgb(239, 68, 68)',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          icon: Square,
          iconColor: 'text-red-500',
          iconBg: 'bg-red-100',
          label: 'T'
        };
      default:
        return {
          borderColor: 'hsl(var(--muted))',
          bgColor: 'hsl(var(--muted) / 0.1)',
          icon: BookCheck,
          iconColor: 'text-muted-foreground',
          iconBg: 'bg-muted',
          label: '!'
        };
    }
  };

  const renderEvent = (event: CalendarEvent) => {
    const style = getDeadlineStyle(event);
    const IconComponent = style.icon;
    
    const content = (
      <div
        className="p-3 rounded-lg border-l-4 cursor-pointer hover:bg-muted/50 transition-colors"
        style={{borderColor: style.borderColor, backgroundColor: style.bgColor}}
        onClick={() => {
          if ((event.type === 'assignment' || event.type === 'agenda_item') && onEventClick) {
            onEventClick(event);
          }
        }}
      >
        <div className='flex justify-between items-start gap-3'>
          <div className="flex items-start gap-3 flex-1">
            <div className={`flex-shrink-0 w-8 h-8 rounded ${style.iconBg} flex items-center justify-center`}>
              <span className={`text-xs font-bold ${style.iconColor}`}>{style.label}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{event.title}</p>
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
      
      {/* AI suggestion */}
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
