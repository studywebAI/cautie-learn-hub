'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Home, Circle, Square, Check } from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface DraggableEventProps {
  event: CalendarEvent;
}

export function DraggableEvent({ event }: DraggableEventProps) {
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

  const getDeadlineStyle = () => {
    const assignmentType = (event as any).assignment_type || 'homework';
    
    switch (assignmentType) {
      case 'homework':
        return {
          borderColor: 'rgb(59, 130, 246)', // blue-500
          bgColor: 'rgba(59, 130, 246, 0.1)',
          icon: Home,
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-100',
          label: 'H'
        };
      case 'small_test':
        return {
          borderColor: 'rgb(249, 115, 22)', // orange-500
          bgColor: 'rgba(249, 115, 22, 0.1)',
          icon: Circle,
          iconColor: 'text-orange-500',
          iconBg: 'bg-orange-100',
          label: 't'
        };
      case 'big_test':
        return {
          borderColor: 'rgb(239, 68, 68)', // red-500
          bgColor: 'rgba(239, 68, 68, 0.1)',
          icon: Square,
          iconColor: 'text-red-500',
          iconBg: 'bg-red-100',
          label: 'T'
        };
      default:
        return {
          borderColor: 'hsl(var(--destructive))',
          bgColor: 'hsl(var(--destructive) / 0.1)',
          icon: Home,
          iconColor: 'text-destructive',
          iconBg: 'bg-destructive/10',
          label: '!'
        };
    }
  };

  const styleData = getDeadlineStyle();
  const IconComponent = styleData.icon;

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
    if (event.type === 'assignment') {
      router.push(event.href);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftColor: styleData.borderColor,
        backgroundColor: isCompleted ? 'rgba(0,0,0,0.05)' : styleData.bgColor,
      }}
      {...attributes}
      {...listeners}
      className={`p-3 rounded-lg border-l-4 cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : 'hover:bg-muted/20'
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
          <div className={`flex-shrink-0 w-8 h-8 rounded ${styleData.iconBg} flex items-center justify-center ${isCompleted ? 'opacity-50' : ''}`}>
            <span className={`text-xs font-bold ${styleData.iconColor}`}>{styleData.label}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {event.title}
            </p>
            <p className="text-sm text-muted-foreground">{event.subject}</p>
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
