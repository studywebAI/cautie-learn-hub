'use client';

import { useState, useMemo } from 'react';
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
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableEvent } from './draggable-event';
import { DroppableDay } from './droppable-day';

interface WeekViewProps {
  events: CalendarEvent[];
  selectedDay?: Date;
  onDaySelect: (day: Date) => void;
  onEventMove: (eventId: string, newDate: Date, newOrder?: number) => void;
}

export function WeekView({ events, selectedDay, onDaySelect, onEventMove }: WeekViewProps) {
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const { dictionary } = useDictionary();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Generate multiple weeks to display (current week + next 1 week)
  const weeksToShow = 2; // Show 2 weeks at a time
  
  const weeks = useMemo(() => {
    const weeksArray = [];
    const today = new Date();
    const firstWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    
    for (let weekIndex = 0; weekIndex < weeksToShow; weekIndex++) {
      const weekStart = addWeeks(firstWeekStart, weekIndex);
      const weekDays = [];
      
      // Monday to Friday
      for (let i = 0; i < 5; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        weekDays.push(day);
      }
      
      weeksArray.push({
        startDate: weekStart,
        days: weekDays
      });
    }
    return weeksArray;
  }, []);

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

      // Only allow moving personal tasks to different dates
      const eventToMove = events.find(e => e.id === activeId);
      if (eventToMove?.type === 'personal') {
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
    <div className="space-y-6">
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex}>
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Day name headers */}
            <div className="grid grid-cols-5 gap-0 mb-2">
              {dayNames.map((name, idx) => (
                <div key={idx} className="text-center text-sm font-medium text-muted-foreground py-1">
                  {name}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-0">
              {week.days.map((day) => {
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
                  />
                );
              })}
            </div>
            <DragOverlay>
              {activeEvent ? (
                <div className="bg-background border rounded-md p-2 shadow-lg opacity-90">
                  <div className="text-sm font-medium">{activeEvent.title}</div>
                  <div className="text-xs text-muted-foreground">{activeEvent.subject}</div>
                </div>
              ) : null}
              </DragOverlay>
          </DndContext>
        </div>
      ))}
    </div>
  );
}