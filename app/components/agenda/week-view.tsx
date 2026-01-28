'use client';

import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 })); // Start on Monday
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Only show weekdays (Monday to Friday) - skip Saturday and Sunday
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const day = new Date(currentWeek);
      day.setDate(currentWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeek]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    weekDays.forEach(day => {
      const dateString = format(day, 'yyyy-MM-dd');
      const dayEvents = events.filter(event => format(event.date, 'yyyy-MM-dd') === dateString);
      map.set(dateString, dayEvents);
    });
    return map;
  }, [events, weekDays]);

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">
          Week of {format(currentWeek, 'MMMM d, yyyy')}
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-5 gap-2">
            {weekDays.map((day, index) => {
              const dateString = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay.get(dateString) || [];
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
      </CardContent>
    </Card>
  );
}