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
}

export function DroppableDay({ id, date, events, isSelected, onClick }: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`min-h-[200px] p-3 border-x border-t border-b border-border/50 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary/5 border-primary/30'
          : isOver
          ? 'bg-muted/30 border-dashed'
          : 'bg-card/50 hover:bg-muted/20'
      }`}
    >
      <div className="mb-3">
        <div className="text-2xl font-bold text-left">{format(date, 'd')}</div>
      </div>

      <SortableContext items={events.map(e => e.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {events.map((event) => (
            <DraggableEvent key={event.id} event={event} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}