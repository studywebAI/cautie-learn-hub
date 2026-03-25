'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Home, Circle, Square, BookOpen } from 'lucide-react';
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
        borderColor: '#87A96B',
        bgColor: 'rgba(135, 169, 107, 0.08)',
        icon: BookOpen,
        iconColor: 'text-[#87A96B]',
        iconBg: 'bg-[#f2f7ee]',
        label: 'S',
        accentWord: 'tudyset',
      };
    }

    if (event.type === 'agenda_item') {
      if (event.visibility_state === 'hidden') {
        return {
          borderColor: 'rgb(239, 68, 68)',
          bgColor: 'rgba(239, 68, 68, 0.12)',
          icon: Square,
          iconColor: 'text-red-500',
          iconBg: 'bg-red-100',
          label: 'H',
        };
      }
      if (event.item_type === 'quiz') {
        return {
          borderColor: 'rgb(245, 158, 11)',
          bgColor: 'rgba(245, 158, 11, 0.12)',
          icon: Circle,
          iconColor: 'text-amber-500',
          iconBg: 'bg-amber-100',
          label: 'Q',
        };
      }
      if (event.item_type === 'studyset') {
        return {
          borderColor: 'rgb(139, 92, 246)',
          bgColor: 'rgba(139, 92, 246, 0.12)',
          icon: BookOpen,
          iconColor: 'text-violet-500',
          iconBg: 'bg-violet-100',
          label: 'S',
        };
      }
      return {
        borderColor: 'rgb(59, 130, 246)',
        bgColor: 'rgba(59, 130, 246, 0.12)',
        icon: Home,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-100',
        label: 'A',
      };
    }

    if (event.type !== 'assignment') {
      return {
        borderColor: 'rgb(148, 163, 184)',
        bgColor: 'rgba(148, 163, 184, 0.10)',
        icon: BookOpen,
        iconColor: 'text-slate-600',
        iconBg: 'bg-slate-100',
        label: 'S',
        accentWord: '',
      };
    }

    const assignmentType = (event as any).assignment_type || 'homework';
    
    switch (assignmentType) {
      case 'homework':
        return {
          borderColor: 'rgb(59, 130, 246)', // blue-500
          bgColor: 'rgba(59, 130, 246, 0.1)',
          icon: Home,
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-100',
          label: 'H',
          accentWord: '',
        };
      case 'small_test':
        return {
          borderColor: 'rgb(249, 115, 22)', // orange-500
          bgColor: 'rgba(249, 115, 22, 0.1)',
          icon: Circle,
          iconColor: 'text-orange-500',
          iconBg: 'bg-orange-100',
          label: 't',
          accentWord: '',
        };
      case 'big_test':
        return {
          borderColor: 'rgb(239, 68, 68)', // red-500
          bgColor: 'rgba(239, 68, 68, 0.1)',
          icon: Square,
          iconColor: 'text-red-500',
          iconBg: 'bg-red-100',
          label: 'T',
          accentWord: '',
        };
      default:
        return {
          borderColor: 'hsl(var(--destructive))',
          bgColor: 'hsl(var(--destructive) / 0.1)',
          icon: Home,
          iconColor: 'text-destructive',
          iconBg: 'bg-destructive/10',
          label: '!',
          accentWord: '',
        };
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
    } catch (error) {
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
        borderLeftColor: styleData.borderColor,
        backgroundColor: isCompleted ? 'rgba(148, 163, 184, 0.10)' : styleData.bgColor,
      }}
      {...attributes}
      {...listeners}
      className={`p-3 rounded-lg border-l-4 cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : 'hover:bg-muted/10'
      }`}
      onClick={handleClick}
    >
      <div className='flex justify-between items-start gap-3'>
        <div className="flex items-start gap-3 flex-1">
          {event.type === 'assignment' && (
            <Checkbox
              checked={isCompleted}
              onCheckedChange={handleToggleComplete}
              className="mt-1"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className={`flex-shrink-0 h-8 w-8 rounded ${styleData.iconBg} flex items-center justify-center ${isCompleted ? 'opacity-50' : ''}`}>
            {styleData.label === 'S' && styleData.accentWord && !compact ? (
              <div className="flex items-end leading-none">
                <span className={`text-sm font-extrabold ${styleData.iconColor}`}>S</span>
                <span className="text-[7px] text-slate-800">{styleData.accentWord}</span>
              </div>
            ) : (
              <span className={`text-xs font-bold ${styleData.iconColor}`}>{styleData.label}</span>
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
              <p className="text-xs text-muted-foreground mt-1">
                {event.chapter_title}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
