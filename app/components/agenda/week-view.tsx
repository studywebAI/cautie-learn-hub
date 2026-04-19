'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, addWeeks, parseISO } from 'date-fns';
import type { CalendarEvent } from '@/lib/types';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DraggableEvent } from './draggable-event';
import { DroppableDay } from './droppable-day';

interface WeekViewProps {
  events: CalendarEvent[];
  selectedDay?: Date;
  onDaySelect: (day: Date) => void;
  onEventMove: (eventId: string, newDate: Date, newOrder?: number) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export function WeekView({ events, selectedDay, onDaySelect, onEventMove, onEventClick }: WeekViewProps) {
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [isCompact, setIsCompact] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    const update = () => setIsCompact(window.innerWidth < 1380);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const activeWeek = useMemo(() => {
    const anchor = selectedDay || new Date();
    const weekStart = startOfWeek(addWeeks(anchor, weekOffset), { weekStartsOn: 1 });
    const days = Array.from({ length: 5 }).map((_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      return day;
    });
    return { startDate: days[0], endDate: days[4], days };
  }, [selectedDay, weekOffset]);

  // Group events by date for quick lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const dateString = format(event.date, 'yyyy-MM-dd');
      if (!map.has(dateString)) {
        map.set(dateString, []);
      }
      map.get(dateString)?.push(event);
    });
    return map;
  }, [events]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeEvent = events.find(e => e.id === active.id);
    setActiveEvent(activeEvent || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a day
    if (overId.startsWith('day-')) {
      const newDateString = overId.replace('day-', '');
      const newDate = parseISO(newDateString);

      // Allow moving personal tasks and unified agenda items.
      const eventToMove = events.find(e => e.id === activeId);
      if (eventToMove?.type === 'personal' || eventToMove?.type === 'agenda_item') {
        onEventMove(activeId, newDate);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 py-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg bg-[hsl(var(--surface-2))] px-2.5 hover:bg-[hsl(var(--surface-3))]"
          onClick={() => setWeekOffset((prev) => prev - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 text-xs">Prev</span>
        </Button>
        <div className="text-sm">
          Week of {format(activeWeek.startDate, 'MMM d')} - {format(activeWeek.endDate, 'MMM d')}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg bg-[hsl(var(--surface-2))] px-2.5 hover:bg-[hsl(var(--surface-3))]"
          onClick={() => setWeekOffset((prev) => prev + 1)}
        >
          <span className="mr-1 text-xs">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {activeWeek.days.map((day) => (
          <div key={`label-${format(day, 'yyyy-MM-dd')}`} className="rounded-xl bg-white px-2 py-2 text-center">
            <p className="text-sm text-foreground/90">{format(day, 'EEEE')}</p>
            <p className="text-[11px] text-muted-foreground">{format(day, 'MMM d')}</p>
          </div>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-5 gap-2">
          {activeWeek.days.map((day) => {
            const dateString = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateString) || [];

            return (
              <DroppableDay
                key={dateString}
                id={`day-${dateString}`}
                date={day}
                events={dayEvents}
                onClick={() => onDaySelect(day)}
                onEventClick={onEventClick}
                compact={isCompact}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeEvent ? (
            <div className="rounded-lg bg-background p-2 shadow-lg opacity-90">
              <div className="text-sm font-medium">{activeEvent.title}</div>
              <div className="text-xs text-muted-foreground">{activeEvent.subject}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

