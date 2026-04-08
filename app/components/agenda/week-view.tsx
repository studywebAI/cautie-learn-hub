'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, addWeeks, isSameDay, parseISO } from 'date-fns';
import type { CalendarEvent } from '@/lib/types';
import { useDictionary } from '@/contexts/app-context';
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
  const { dictionary } = useDictionary();

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

  // Day names for Monday-Friday
  const dayNames = [
    dictionary.agenda.monday || 'Mon',
    dictionary.agenda.tuesday || 'Tue',
    dictionary.agenda.wednesday || 'Wed',
    dictionary.agenda.thursday || 'Thu',
    dictionary.agenda.friday || 'Fri'
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white"
            onClick={() => setWeekOffset((prev) => prev - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            Week {format(activeWeek.startDate, 'MMM d')} - {format(activeWeek.endDate, 'MMM d')}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white"
            onClick={() => setWeekOffset((prev) => prev + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-0 rounded-xl border border-border/40 bg-card/40">
        {dayNames.map((name, idx) => (
          <div key={idx} className="border-b border-border/40 py-2 text-center text-sm font-medium text-muted-foreground">
            {name}
          </div>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-5 gap-0 rounded-xl border border-border/50">
          {activeWeek.days.map((day) => {
            const dateString = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateString) || [];
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            return (
              <DroppableDay
                key={dateString}
                id={`day-${dateString}`}
                date={day}
                events={dayEvents}
                isSelected={isSelected}
                onClick={() => onDaySelect(day)}
                onEventClick={onEventClick}
                compact={isCompact}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeEvent ? (
            <div className="rounded-md border bg-background p-2 shadow-lg opacity-90">
              <div className="text-sm font-medium">{activeEvent.title}</div>
              <div className="text-xs text-muted-foreground">{activeEvent.subject}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

