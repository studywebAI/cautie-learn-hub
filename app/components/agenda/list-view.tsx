'use client';

import { format, isThisWeek, isToday, isTomorrow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { BookCheck, BrainCircuit, Clock } from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import Link from 'next/link';
import { getAgendaVisualStyle } from '@/lib/agenda-event-style';

interface ListViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export function ListView({ events, onEventClick }: ListViewProps) {
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
      <div className="rounded-xl bg-[hsl(var(--surface-1))] p-8 text-center">
        <p className="text-muted-foreground">No events scheduled</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupOrder.map((groupKey) => {
        const groupEvents = groupedEvents[groupKey];
        if (!groupEvents || groupEvents.length === 0) return null;

        return (
          <div key={groupKey}>
            <h3 className="mb-3 text-sm text-muted-foreground">{groupLabels[groupKey]}</h3>
            <div className="space-y-2">
              {groupEvents
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((event) => (
                  <EventListItem key={event.id} event={event} onEventClick={onEventClick} />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventListItem({ event, onEventClick }: { event: CalendarEvent; onEventClick?: (event: CalendarEvent) => void }) {
  const getEventAccent = () => {
    if (event.type === 'agenda_item') {
      if (event.visibility_state === 'hidden') return '#c56f6f';
      if (event.item_type === 'quiz') return '#c38843';
      if (event.item_type === 'event') return '#c56f6f';
      if (event.item_type === 'other') return '#8f7bb0';
      return '#4f86c0';
    }
    if (event.type === 'assignment') return getAgendaVisualStyle(event as any).accentColor;
    return '#7e8d9d';
  };

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

  const content = (
    <div className="flex items-center gap-3 rounded-md bg-[hsl(var(--surface-1))] px-3 py-2 transition-colors hover:bg-[hsl(var(--surface-2))]">
      <div
        className="h-10 w-1 flex-shrink-0 rounded-full"
        style={{ backgroundColor: getEventAccent() }}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-foreground">{event.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{event.subject}</span>
          {event.class_name && (
            <>
              <span>-</span>
              <span
                className="inline-flex rounded-full px-2 py-0.5 text-[10px] text-white"
                style={{ backgroundColor: getClassChipColor(event.class_id) }}
              >
                {event.class_name}
              </span>
            </>
          )}
          {event.chapter_title && (
            <>
              <span>{'>'}</span>
              <span className="truncate">{event.chapter_title}</span>
            </>
          )}
        </div>
        {event.linked_path && <div className="mt-1 truncate text-xs text-primary">-&gt; {event.linked_path}</div>}
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        {event.estimated_duration && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {event.estimated_duration}m
          </div>
        )}

        <div className="text-right">
          <p className="text-xs">{format(event.date, 'EEE, MMM d')}</p>
          {event.priority && (
            <Badge
              variant="secondary"
              className={`text-xs ${
                event.priority === 'high'
                  ? 'text-destructive'
                  : event.priority === 'medium'
                    ? 'text-yellow-600'
                    : 'text-green-600'
              }`}
            >
              {event.priority}
            </Badge>
          )}
        </div>

        {event.type === 'assignment' ? (
          <BookCheck className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        ) : event.type === 'agenda_item' ? (
          <BookCheck className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        ) : (
          <BrainCircuit className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        )}
      </div>
    </div>
  );

  if (href) {
    if (onEventClick) {
      return (
        <div className="block cursor-pointer" onClick={() => onEventClick(event)}>
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
