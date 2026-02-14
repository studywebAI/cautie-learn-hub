'use client';

import { format, isPast, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Calendar, Home, Circle, Square, BookCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CalendarEvent } from '@/lib/types';
import Link from 'next/link';

interface TeacherDeadlinesPanelProps {
  events: CalendarEvent[];
  selectedDay?: Date;
}

export function TeacherDeadlinesPanel({ events, selectedDay }: TeacherDeadlinesPanelProps) {
  // Filter only assignments (not personal tasks)
  const deadlines = events.filter(e => e.type === 'assignment');
  
  // Count overdue
  const overdueCount = deadlines.filter(e => isPast(e.date) && !isToday(e.date)).length;
  
  // Events for selected day
  const selectedDayEvents = selectedDay
    ? deadlines.filter(e => format(e.date, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd'))
    : [];

  // Upcoming events (next 7 days)
  const upcomingEvents = deadlines
    .filter(e => !isPast(e.date) || isToday(e.date))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const getDeadlineStyle = (event: CalendarEvent) => {
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

  return (
    <div className="space-y-4">
      {overdueCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm">{overdueCount} deadline{overdueCount > 1 ? 's' : ''} past due</p>
              <p className="text-xs text-muted-foreground">Review assignments that need attention</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {selectedDay ? format(selectedDay, 'MMMM d') : 'Upcoming Deadlines'}
          </CardTitle>
          <CardDescription>
            {selectedDay
              ? `${selectedDayEvents.length} deadline${selectedDayEvents.length !== 1 ? 's' : ''} on this day`
              : 'All upcoming assignments and tests'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(selectedDay ? selectedDayEvents : upcomingEvents).length > 0 ? (
            (selectedDay ? selectedDayEvents : upcomingEvents).map(event => {
              const style = getDeadlineStyle(event);
              const IconComponent = style.icon;
              
              return (
                <Link
                  key={event.id}
                  href={event.href}
                  className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  style={{ borderLeftColor: style.borderColor, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start justify-between gap-2">
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
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-xs">
                        {format(event.date, 'MMM d')}
                      </Badge>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {selectedDay ? 'No deadlines on this day' : 'No upcoming deadlines'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
