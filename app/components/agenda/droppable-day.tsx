'use client';

import { format, isToday } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableEvent } from './draggable-event';
import type { CalendarEvent } from '@/lib/types';

interface DroppableDayProps {
  id: string;
  date: Date;
  events: CalendarEvent[];
  isSelected?: boolean;
  onClick: () => void;
}

export function DroppableDay({ id, date, events, isSelected, onClick }: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`min-h-[120px] p-2 border rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary/10 border-primary'
          : isOver
          ? 'bg-muted border-dashed'
          : 'bg-background hover:bg-muted/50'
      } ${isToday(date) ? 'ring-2 ring-accent' : ''}`}
    >
      <div className="text-center mb-2">
        <div className="text-sm font-medium">{format(date, 'EEE')}</div>
        <div className={`text-lg font-bold ${isToday(date) ? 'text-accent-foreground' : ''}`}>
          {format(date, 'd')}
        </div>
      </div>

      <SortableContext items={events.map(e => e.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {events.map((event) => (
            <DraggableEvent key={event.id} event={event} />
          ))}
        </div>
      </SortableContext>

      {events.length === 0 && (
        <div className="text-xs text-muted-foreground text-center mt-4">
          No events
        </div>
      )}
    </div>
  );
}