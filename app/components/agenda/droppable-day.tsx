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
      className="relative min-h-[360px] rounded-xl bg-white/95 p-2 md:min-h-[520px] md:p-2.5 cursor-pointer transition-colors"
    >
      <div className="mb-2 flex items-center justify-end">
        <span className="text-[11px] text-muted-foreground">{format(date, 'd')}</span>
      </div>

      <SortableContext items={events.map(e => e.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {events.map((event) => (
            <DraggableEvent key={event.id} event={event} onEventClick={onEventClick} compact={compact} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
