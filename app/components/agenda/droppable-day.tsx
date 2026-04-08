'use client';

import { format } from 'date-fns';
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
  onEventClick?: (event: CalendarEvent) => void;
  compact?: boolean;
}

export function DroppableDay({ id, date, events, isSelected, onClick, onEventClick, compact = false }: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`min-h-[280px] p-2 md:min-h-[340px] md:p-3 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary/10'
          : isOver
          ? 'bg-muted/35'
          : 'bg-card/35 hover:bg-muted/20'
      }`}
    >
      <div className="mb-3">
        <div className="text-sm font-medium text-left">{format(date, 'd')}</div>
      </div>

      <SortableContext items={events.map(e => e.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {events.map((event) => (
            <DraggableEvent key={event.id} event={event} onEventClick={onEventClick} compact={compact} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
