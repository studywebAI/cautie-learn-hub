'use client';

import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookCheck, BrainCircuit, Clock } from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import Link from 'next/link';

interface ListViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export function ListView({ events, onEventClick }: ListViewProps) {
  // Simple grouping by time - no overdue, no checkboxes in list
  const groupedEvents = events.reduce((groups, event) => {
    const eventDate = event.date;
    let groupKey: string;
    
    if (isToday(eventDate)) {
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
    today: 'Today',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    upcoming: 'Upcoming',
  };

  const groupOrder = ['today', 'tomorrow', 'thisWeek', 'upcoming'];

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
            <h3 className="text-sm mb-3 text-muted-foreground">
              {groupLabels[groupKey]}
            </h3>
            <div className="space-y-2">
              {groupEvents
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map(event => (
                  <EventListItem
                    key={event.id}
                    event={event}
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

function EventListItem({ event, onEventClick }: { event: CalendarEvent; onEventClick?: (event: CalendarEvent) => void }) {
  const getClassChipColor = (classId?: string) => {
    if (!classId) return 'hsl(var(--muted))';
    let hash = 0;
    for (let i = 0; i < classId.length; i += 1) hash = (hash * 31 + classId.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 65% 52%)`;
  };

  const buildHref = () => {
    if (!event.href) return undefined;
    
    if (event.description) {
      const separator = event.href.includes('?') ? '&' : '?';
      return `${event.href}${separator}instructions=${encodeURIComponent(event.description)}`;
    }
    return event.href;
  };

  const href = buildHref();

  // No checkbox in list - only when clicking on the event
  const content = (
    <div className="flex items-center gap-4 p-3 rounded-lg border transition-colors hover:bg-muted/50">
      <div className="w-1 h-12 rounded-full flex-shrink-0" style={{
        backgroundColor:
          event.type === 'assignment'
            ? '#3b82f6'
            : event.type === 'agenda_item' && event.visibility_state === 'hidden'
            ? '#ef4444'
            : event.type === 'agenda_item'
            ? '#6366f1'
            : undefined
      }} />
      
      <div className="flex-1 min-w-0">
        <p className="truncate">{event.title}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{event.subject}</span>
          {event.class_name && (
            <>
              <span>·</span>
              <span
                className="inline-flex rounded-full px-2 py-0.5 text-white text-[10px]"
                style={{ backgroundColor: getClassChipColor(event.class_id) }}
              >
                {event.class_name}
              </span>
            </>
          )}
          {event.chapter_title && (
            <>
              <span>â€º</span>
              <span className="truncate">{event.chapter_title}</span>
            </>
          )}
        </div>
        {event.linked_path && (
          <div className="text-xs text-primary mt-1 truncate">
            â†’ {event.linked_path}
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
          ? <BookCheck className="h-4 w-4 text-blue-500" />
          : event.type === 'agenda_item'
          ? <BookCheck className="h-4 w-4 text-violet-500" />
          : <BrainCircuit className="h-4 w-4 text-primary" />
        }
      </div>
    </div>
  );

  if (href) {
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
      <Link prefetch={false} href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

