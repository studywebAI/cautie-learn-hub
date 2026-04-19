'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CalendarEvent } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { getAgendaVisualStyle } from '@/lib/agenda-event-style';

interface DraggableEventProps {
  event: CalendarEvent;
  onEventClick?: (event: CalendarEvent) => void;
  compact?: boolean;
}

export function DraggableEvent({ event, onEventClick, compact = false }: DraggableEventProps) {
  const router = useRouter();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getDeadlineStyle = () => {
    const isStudyset =
      event.subject === 'Studyset' ||
      event.item_type === 'studyset' ||
      String(event.href || '').includes('studysetId=');

    if (isStudyset) {
      return {
        accentColor: '#5fa771',
      };
    }

    if (event.type === 'agenda_item') {
      if (event.visibility_state === 'hidden') {
        return { accentColor: '#c56f6f' };
      }
      if (event.item_type === 'quiz') {
        return { accentColor: '#c38843' };
      }
      if (event.item_type === 'studyset') {
        return { accentColor: '#5fa771' };
      }
      if (event.item_type === 'event') {
        return { accentColor: '#4f86c0' };
      }
      if (event.item_type === 'other') {
        return { accentColor: '#8f7bb0' };
      }
      return { accentColor: '#4f86c0' };
    }

    if (event.type !== 'assignment') {
      return { accentColor: '#7e8d9d' };
    }

    const visual = getAgendaVisualStyle(event as any);
    return { accentColor: visual.accentColor };
  };

  const styleData = getDeadlineStyle();

  const handleClick = () => {
    if (onEventClick) {
      onEventClick(event);
    } else if (event.type === 'assignment') {
      router.push(event.href);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftColor: styleData.accentColor
      }}
      {...attributes}
      {...listeners}
      className={`rounded-md border-l-4 border-l-transparent bg-[hsl(var(--surface-1))] px-2 py-1 cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : 'hover:bg-[hsl(var(--surface-2))]'
      }`}
      onClick={handleClick}
    >
      <div className={`min-w-0 flex-1 ${compact ? 'hidden xl:block' : ''}`}>
        <p className="truncate text-[10px] uppercase tracking-[0.03em] text-muted-foreground">
          {event.subject}{event.class_name ? ` | ${event.class_name}` : ''}
        </p>
        <p className="truncate text-[13px] text-foreground">{event.title}</p>
        {event.chapter_title && (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {event.chapter_title}
          </p>
        )}
      </div>
    </div>
  );
}
