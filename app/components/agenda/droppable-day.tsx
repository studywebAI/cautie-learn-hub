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
  onClick: () => void;
  onEventClick?: (event: CalendarEvent) => void;
  compact?: boolean;
}

export function DroppableDay({ id, date, events, onClick, onEventClick, compact = false }: DroppableDayProps) {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className="relative min-h-[400px] rounded-xl bg-white p-2.5 md:min-h-[560px] md:p-3 cursor-pointer transition-colors hover:bg-white"
    >
      <div className="mb-1 flex items-start justify-end">
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[hsl(var(--surface-2))] px-1.5 text-[11px] text-muted-foreground">
          {format(date, 'd')}
        </span>
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
