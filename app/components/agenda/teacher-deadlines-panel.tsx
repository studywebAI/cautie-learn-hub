'use client';

import { format, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Home, Circle, Square, BookCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CalendarEvent } from '@/lib/types';
import { getAgendaVisualStyle } from '@/lib/agenda-event-style';

interface TeacherDeadlinesPanelProps {
  events: CalendarEvent[];
  selectedDay?: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

export function TeacherDeadlinesPanel({ events, selectedDay, onEventClick }: TeacherDeadlinesPanelProps) {
  // Teacher agenda source: unified agenda items, fallback assignments.
  const deadlines = events.filter((event) => event.type === 'agenda_item' || event.type === 'assignment');
  
  // Events for selected day
  const selectedDayEvents = selectedDay
    ? deadlines.filter(e => format(e.date, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd'))
    : [];

  // Upcoming events (next 7 days)
  const upcomingEvents = deadlines
    .filter(e => isToday(e.date) || e.date > new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const getDeadlineStyle = (event: CalendarEvent) => {
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
      other: 'bg-muted',
    } as const;
    return {
      borderColor: visual.accentColor,
      icon: iconByType[visual.visualType],
      iconColor: iconColorByType[visual.visualType],
      iconBg: iconBgByType[visual.visualType],
      label: visual.label,
    };
  };

  const displayEvents = selectedDay ? selectedDayEvents : upcomingEvents;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {selectedDay ? format(selectedDay, 'MMMM d') : 'Upcoming'}
        </CardTitle>
        <CardDescription>
          {selectedDay
            ? `${selectedDayEvents.length} item${selectedDayEvents.length !== 1 ? 's' : ''} on this day`
            : 'Upcoming items for students'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayEvents.length > 0 ? (
          displayEvents.map(event => {
            const style = getDeadlineStyle(event);
            return (
              <div
                key={event.id}
                className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                style={{ borderLeftColor: style.borderColor, borderLeftWidth: '4px' }}
                onClick={() => onEventClick?.(event)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`flex-shrink-0 w-8 h-8 rounded ${style.iconBg} flex items-center justify-center`}>
                      <span className={`text-xs font-bold ${style.iconColor}`}>{style.label}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {event.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{event.subject}</p>
                      {event.class_name && (
                        <p className="text-xs text-muted-foreground">{event.class_name}</p>
                      )}
                      {event.chapter_title && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.chapter_title}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {format(event.date, 'MMM d')}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {selectedDay ? 'No items on this day' : 'No upcoming items'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

