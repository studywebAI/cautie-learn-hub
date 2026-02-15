'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Home, Circle, Square, BookCheck, Link as LinkIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { CalendarEvent } from '@/lib/types';

interface TaskOverviewModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onCompletionToggle: (eventId: string, completed: boolean) => void;
}

export function TaskOverviewModal({ event, isOpen, onClose, onCompletionToggle }: TaskOverviewModalProps) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setIsCompleted((event as any).completed || false);
    }
  }, [event]);

  const getDeadlineStyle = (event: CalendarEvent) => {
    const assignmentType = (event as any).assignment_type || 'homework';

    switch (assignmentType) {
      case 'homework':
        return {
          borderColor: 'rgb(59, 130, 246)',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          icon: Home,
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-100',
          label: 'H'
        };
      case 'small_test':
        return {
          borderColor: 'rgb(249, 115, 22)',
          bgColor: 'rgba(249, 115, 22, 0.1)',
          icon: Circle,
          iconColor: 'text-orange-500',
          iconBg: 'bg-orange-100',
          label: 't'
        };
      case 'big_test':
        return {
          borderColor: 'rgb(239, 68, 68)',
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
          icon: BookCheck,
          iconColor: 'text-destructive',
          iconBg: 'bg-destructive/10',
          label: '!'
        };
    }
  };

  const handleToggleComplete = async (checked: boolean) => {
    if (!event || event.type !== 'assignment') return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/assignments/${event.id}/toggle-completed`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to update completion status');
      }

      setIsCompleted(checked);
      onCompletionToggle(event.id, checked);
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
    } finally {
      setIsLoading(false);
    }
  };

  if (!event) return null;

  const style = getDeadlineStyle(event);
  const IconComponent = style.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {event.type === 'assignment' && (
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={handleToggleComplete}
                  disabled={isLoading}
                  className="mt-1"
                />
              )}
              <div className={`flex-shrink-0 w-10 h-10 rounded ${style.iconBg} flex items-center justify-center ${isCompleted ? 'opacity-50' : ''}`}>
                <span className={`text-sm font-bold ${style.iconColor}`}>{style.label}</span>
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl">
                  <p className={`font-bold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                    {event.title}
                  </p>
                </DialogTitle>
                <p className="text-base text-muted-foreground mt-1">{event.subject}</p>
                {event.chapter_title && (
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    {event.chapter_title}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">Assignment Details</CardTitle>
            <CardDescription>
              {event.date ? format(new Date(event.date), 'PPP') : 'No due date'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">
                {(event as any).description || 'No description provided.'}
              </p>
            </div>

            {(event as any).linked_content && (event as any).linked_content.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Linked Content</h4>
                <div className="space-y-2">
                  {(event as any).linked_content.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{item.title}</span>
                      <span className="text-xs text-muted-foreground/70">({item.type})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={handleToggleComplete}
                  disabled={isLoading}
                />
                <span className="text-sm font-medium">
                  Mark as {isCompleted ? 'incomplete' : 'complete'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
