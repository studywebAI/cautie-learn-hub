'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CalendarEvent } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface DraggableEventProps {
  event: CalendarEvent;
  onEventClick?: (event: CalendarEvent) => void;
  compact?: boolean;
}

export function DraggableEvent({ event, onEventClick, compact = false }: DraggableEventProps) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState((event as any).completed || false);

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

  const getClassChipColor = (classId?: string) => {
    if (!classId) return 'hsl(var(--muted))';
    let hash = 0;
    for (let i = 0; i < classId.length; i += 1) hash = (hash * 31 + classId.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 65% 52%)`;
  };

  const getDeadlineStyle = () => {
    const isStudyset =
      event.subject === 'Studyset' ||
      event.item_type === 'studyset' ||
      String(event.href || '').includes('studysetId=');

    if (isStudyset) {
      return {
        accentColor: '#7FA36A',
        label: 'S',
        accentWord: 'tudyset',
      };
    }

    if (event.type === 'agenda_item') {
      if (event.visibility_state === 'hidden') {
        return { accentColor: '#C07A7A', label: 'H', accentWord: 'idden' };
      }
      if (event.item_type === 'quiz') {
        return { accentColor: '#B8895A', label: 'Q', accentWord: 'uiz' };
      }
      if (event.item_type === 'studyset') {
        return { accentColor: '#7FA36A', label: 'S', accentWord: 'tudyset' };
      }
      if (event.item_type === 'event') {
        return { accentColor: '#6F95B3', label: 'E', accentWord: 'vent' };
      }
      if (event.item_type === 'other') {
        return { accentColor: '#927EAA', label: 'O', accentWord: 'ther' };
      }
      return { accentColor: '#6F95B3', label: 'A', accentWord: 'ssignment' };
    }

    if (event.type !== 'assignment') {
      return { accentColor: '#8C96A1', label: 'S', accentWord: 'tudy' };
    }

    const assignmentType = (event as any).assignment_type || 'homework';
    switch (assignmentType) {
      case 'homework':
        return { accentColor: '#6F95B3', label: 'H', accentWord: 'omework' };
      case 'small_test':
        return { accentColor: '#B8895A', label: 'T', accentWord: 'est' };
      case 'big_test':
        return { accentColor: '#A86B6B', label: 'B', accentWord: 'ig test' };
      default:
        return { accentColor: '#927EAA', label: 'I', accentWord: 'tem' };
    }
  };

  const styleData = getDeadlineStyle();

  const handleToggleComplete = async (checked: boolean | 'indeterminate') => {
    if (typeof checked !== 'boolean') return;

    try {
      const response = await fetch(`/api/assignments/${event.id}/toggle-completed`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to update completion status');
      }

      setIsCompleted(checked);
      toast({
        title: 'Status updated',
        description: `Marked as ${checked ? 'complete' : 'incomplete'}`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update completion status',
        variant: 'destructive',
      });
    }
  };

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
        borderLeftColor: styleData.accentColor,
        backgroundColor: isCompleted ? 'hsl(var(--surface-3))' : 'hsl(var(--surface-2))',
      }}
      {...attributes}
      {...listeners}
      className={`rounded-lg border-l-4 p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : 'hover:bg-muted/40'
      }`}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-3 flex-1">
          {event.type === 'assignment' && (
            <Checkbox
              checked={isCompleted}
              onCheckedChange={handleToggleComplete}
              className="mt-1"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className={`flex-shrink-0 h-8 w-8 rounded border border-border/70 bg-[hsl(var(--surface-1))] flex items-center justify-center ${isCompleted ? 'opacity-50' : ''}`}>
            {styleData.accentWord && !compact ? (
              <div className="flex items-baseline leading-none">
                <span className="text-[26px] leading-none font-semibold" style={{ color: styleData.accentColor }}>{styleData.label}</span>
                <span className="-ml-[1px] text-[10px] leading-none text-foreground">{styleData.accentWord}</span>
              </div>
            ) : (
              <span className="text-[20px] leading-none font-semibold" style={{ color: styleData.accentColor }}>{styleData.label}</span>
            )}
          </div>
          <div className={`flex-1 min-w-0 ${compact ? 'hidden xl:block' : ''}`}>
            <p className={`truncate text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {event.title}
            </p>
            <p className="text-xs text-muted-foreground">{event.subject}</p>
            {event.class_name && (
              <span
                className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] text-white"
                style={{ backgroundColor: getClassChipColor(event.class_id) }}
              >
                {event.class_name}
              </span>
            )}
            {event.chapter_title && (
              <p className="mt-1 text-xs text-muted-foreground">
                {event.chapter_title}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
