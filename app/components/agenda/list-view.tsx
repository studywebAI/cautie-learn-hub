'use client';

import { format, isToday, isTomorrow, isThisWeek, isPast, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookCheck, BrainCircuit, Clock, CheckCircle2 } from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import Link from 'next/link';

interface ListViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export function ListView({ events, onEventClick }: ListViewProps) {
  // Group events by time period
  const groupedEvents = events.reduce((groups, event) => {
    const eventDate = event.date;
    let groupKey: string;
    
    if (isPast(eventDate) && !isToday(eventDate)) {
      groupKey = 'overdue';
    } else if (isToday(eventDate)) {
      groupKey = 'today';
    } else if (isTomorrow(eventDate)) {
      groupKey = 'tomorrow';
    } else if (isThisWeek(eventDate)) {
      groupKey = 'thisWeek';
    } else {
      groupKey = 'upcoming';
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);

  const groupLabels: Record<string, string> = {
    overdue: 'Overdue',
    today: 'Today',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    upcoming: 'Upcoming',
  };

  const groupOrder = ['overdue', 'today', 'tomorrow', 'thisWeek', 'upcoming'];

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No events scheduled</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupOrder.map(groupKey => {
        const groupEvents = groupedEvents[groupKey];
        if (!groupEvents || groupEvents.length === 0) return null;

        return (
          <div key={groupKey}>
            <h3 className={`text-sm mb-3 ${
              groupKey === 'overdue' ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {groupLabels[groupKey]}
            </h3>
            <div className="space-y-2">
              {groupEvents
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map(event => (
                  <EventListItem
                    key={event.id}
                    event={event}
                    isOverdue={groupKey === 'overdue'}
                    onEventClick={onEventClick}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventListItem({ event, isOverdue, onEventClick }: { event: CalendarEvent; isOverdue?: boolean; onEventClick?: (event: CalendarEvent) => void }) {
  // Build href with instructions if available
  const buildHref = () => {
    if (!event.href) return undefined;
    
    // If there are instructions (description from teacher), add as query param
    if (event.description) {
      const separator = event.href.includes('?') ? '&' : '?';
      return `${event.href}${separator}instructions=${encodeURIComponent(event.description)}`;
    }
    return event.href;
  };

  const href = buildHref();

  const content = (
    <div className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
      isOverdue ? 'border-destructive/30 bg-destructive/5' : 'hover:bg-muted/50'
    }`}>
      <div className={`w-1 h-12 rounded-full ${
        event.type === 'assignment' ? 'bg-destructive' : 'bg-primary'
      }`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate">{event.title}</p>
          {event.status === 'completed' && (
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{event.subject}</span>
          {event.chapter_title && (
            <>
              <span>›</span>
              <span className="truncate">{event.chapter_title}</span>
            </>
          )}
        </div>
        {/* Show linked path if available */}
        {event.linked_path && (
          <div className="text-xs text-primary mt-1 truncate">
            → {event.linked_path}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3 flex-shrink-0">
        {event.estimated_duration && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {event.estimated_duration}m
          </div>
        )}
        
        <div className="text-right">
          <p className="text-sm">{format(event.date, 'EEE, MMM d')}</p>
          {event.priority && (
            <Badge variant="outline" className={`text-xs ${
              event.priority === 'high' ? 'text-destructive' :
              event.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {event.priority}
            </Badge>
          )}
        </div>
        
        {event.type === 'assignment' 
          ? <BookCheck className="h-4 w-4 text-destructive" />
          : <BrainCircuit className="h-4 w-4 text-primary" />
        }
      </div>
    </div>
  );

  if (event.type === 'assignment' && href) {
    if (onEventClick) {
      return (
        <div
          className="block cursor-pointer"
          onClick={() => onEventClick(event)}
        >
          {content}
        </div>
      );
    }
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
