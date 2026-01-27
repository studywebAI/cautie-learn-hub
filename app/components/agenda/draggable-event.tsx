'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookCheck, BrainCircuit, Clock, Tag } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { CalendarEvent } from '@/lib/types';

interface DraggableEventProps {
  event: CalendarEvent;
}

export function DraggableEvent({ event }: DraggableEventProps) {
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

  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-2 rounded text-xs cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : 'hover:bg-muted/50'
      } ${
        event.type === 'assignment' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
      }`}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className="text-muted-foreground truncate">{event.subject}</div>

      <div className="flex items-center gap-1 mt-1">
        {event.priority && (
          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${priorityColors[event.priority]}`}>
            {event.priority}
          </Badge>
        )}
        {event.estimated_duration && (
          <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {event.estimated_duration}m
          </div>
        )}
      </div>

      {event.tags && event.tags.length > 0 && (
        <div className="flex items-center gap-0.5 mt-0.5">
          <Tag className="h-2.5 w-2.5 text-muted-foreground" />
          <div className="flex gap-0.5">
            {event.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-[8px] px-0.5 py-0">
                {tag}
              </Badge>
            ))}
            {event.tags.length > 2 && (
              <span className="text-[8px] text-muted-foreground">+{event.tags.length - 2}</span>
            )}
          </div>
        </div>
      )}

      {event.chapter_title && (
        <div className="text-muted-foreground/70 truncate text-[10px] flex items-center gap-1 mt-0.5">
          <span className="inline-block w-1 h-1 bg-current rounded-full"></span>
          {event.chapter_title}
        </div>
      )}
    </div>
  );
}