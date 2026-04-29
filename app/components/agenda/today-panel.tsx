'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, BookCheck, Lightbulb, Loader2, Home, Circle, Square, BookOpen } from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import type { AiSuggestion } from '@/lib/types';
import { useDictionary } from '@/contexts/app-context';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';
import { getAgendaVisualStyle } from '@/lib/agenda-event-style';

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
      const visual = getAgendaVisualStyle(event as any);
      const iconByType = {
        homework: Home,
        test: Circle,
        big_test: Square,
        other: BookCheck,
      } as const;
      const iconColorByType = {
        homework: 'text-blue-500',
        test: 'text-orange-500',
        big_test: 'text-red-500',
        other: 'text-muted-foreground',
      } as const;
      const iconBgByType = {
        homework: 'bg-blue-100',
        test: 'bg-orange-100',
        big_test: 'bg-red-100',
        other: 'surface-interactive',
      } as const;
      return {
        borderColor: visual.accentColor,
        bgColor: visual.bgColor,
        icon: iconByType[visual.visualType],
        iconColor: iconColorByType[visual.visualType],
        iconBg: iconBgByType[visual.visualType],
        label: visual.label,
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

    const visual = getAgendaVisualStyle(event as any);
    const iconByType = {
      homework: Home,
      test: Circle,
      big_test: Square,
      other: BookCheck,
    } as const;
    const iconColorByType = {
      homework: 'text-blue-500',
      test: 'text-orange-500',
      big_test: 'text-red-500',
      other: 'text-muted-foreground',
    } as const;
    const iconBgByType = {
      homework: 'bg-blue-100',
      test: 'bg-orange-100',
      big_test: 'bg-red-100',
      other: 'surface-interactive',
    } as const;
    return {
      borderColor: visual.accentColor,
      bgColor: visual.bgColor,
      icon: iconByType[visual.visualType],
      iconColor: iconColorByType[visual.visualType],
      iconBg: iconBgByType[visual.visualType],
      label: visual.label,
    };
  };

  const renderEvent = (event: CalendarEvent) => {
    const style = getDeadlineStyle(event);
    const IconComponent = style.icon;
    
    const content = (
      <div
        className="p-3 rounded-lg border-l-4 cursor-pointer hover:surface-interactive transition-colors"
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
