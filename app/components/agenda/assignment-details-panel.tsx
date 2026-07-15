'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ExternalLink, Pencil, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { CalendarEvent } from '@/lib/types';
import type { ClassInfo } from '@/contexts/app-context';
import { getAgendaVisualStyle } from '@/lib/agenda-event-style';

type EditableType = 'assignment' | 'quiz' | 'event' | 'other';

type AgendaLink = {
  id?: string;
  link_type: string;
  link_ref_id?: string | null;
  label: string;
  metadata_json?: Record<string, any>;
  position?: number;
};

interface AssignmentDetailsPanelProps {
  event: CalendarEvent | null;
  classes: ClassInfo[];
  isTeacher: boolean;
  isStudent: boolean;
  onClose?: () => void;
  onItemPatched?: (item: any) => void;
  onItemDeleted?: (itemId: string) => void;
  onRefresh?: () => Promise<void> | void;
}

function getAccentColor(event: CalendarEvent) {
  return getAgendaVisualStyle(event as any).accentColor;
}

export function AssignmentDetailsPanel({
  event,
  isTeacher,
  onClose,
  onItemPatched,
  onItemDeleted,
  onRefresh,
}: AssignmentDetailsPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EditableType>('assignment');
  const [visible, setVisible] = useState(true);
  const [links, setLinks] = useState<AgendaLink[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isUpdatingCompletion, setIsUpdatingCompletion] = useState(false);

  useEffect(() => {
    if (!event) return;
    setTitle(event.title || '');
    setDescription(event.description || '');
    setType(((event.item_type as EditableType) || 'assignment') as EditableType);
    setVisible(event.visibility_state !== 'hidden');
    setLinks((event.links || []).map((link, idx) => ({ ...link, position: idx })));
    setIsCompleted(event.completed || false);
    setIsEditing(false);

    // Load completion status from API for agenda items
    const loadCompletionStatus = async () => {
      if (!event.class_id || event.type !== 'agenda_item' || !isStudent) return;
      try {
        const response = await fetch(
          `/api/classes/${event.class_id}/agenda/${event.id}/completion`
        );
        if (response.ok) {
          const data = await response.json();
          setIsCompleted(data.completed || false);
        }
      } catch {
        // Silently fail, use default value
      }
    };

    void loadCompletionStatus();
  }, [event?.id, isStudent]);

  const resourceLinks = useMemo(() => {
    if (!event) return [];
    const rows = (links.length > 0 ? links : (event.links || [])).map((link) => {
      const meta = link.metadata_json || {};
      let href = meta.url || '#';

      if (link.link_type === 'tool_run') {
        const toolId = String(meta.tool_id || 'notes');
        href = `/tools/${toolId}?runId=${link.link_ref_id || ''}`;
      } else if (link.link_type === 'studyset' && link.link_ref_id) {
        href = `/tools/studyset/${link.link_ref_id}`;
      } else if (link.link_type === 'material' && link.link_ref_id) {
        href = `/material/${link.link_ref_id}`;
      } else if (link.link_type === 'assignment') {
        const classId = String(meta.class_id || event.class_id || '');
        href = classId ? `/class/${classId}?tab=grades` : '/classes';
      } else if (['subject', 'chapter', 'paragraph', 'assignment'].includes(link.link_type) && typeof meta.url === 'string') {
        href = meta.url;
      }

      return {
        ...link,
        href,
      };
    });

    return rows;
  }, [event, links]);

  useEffect(() => {
    resourceLinks.forEach((link) => {
      if (link.href && link.href.startsWith('/')) router.prefetch(link.href);
    });
    if (event?.href && event.href.startsWith('/')) router.prefetch(event.href);
  }, [resourceLinks, event?.href, router]);

  if (!event) return null;

  const accent = getAccentColor(event);
  const subjectLine = `${event.subject || 'General'}${event.class_name ? ` | ${event.class_name}` : ''}`;

  const toggleCompletion = async () => {
    if (!event?.class_id || event.type !== 'agenda_item') return;

    const newCompleted = !isCompleted;
    setIsCompleted(newCompleted);
    setIsUpdatingCompletion(true);

    try {
      const response = await fetch(`/api/classes/${event.class_id}/agenda/${event.id}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to update completion status');
      }

      toast({
        title: 'Updated',
        description: newCompleted ? 'Task marked as complete' : 'Task marked as incomplete',
      });
      await onRefresh?.();
    } catch (error: any) {
      setIsCompleted(!newCompleted); // Revert on error
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update completion status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingCompletion(false);
    }
  };

  const saveChanges = async () => {
    if (!event.class_id || event.type !== 'agenda_item') {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/classes/${event.class_id}/agenda/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Agenda item',
          description: description.trim(),
          item_type: type,
          visible,
          links,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to save item');
      }
      const payload = await response.json().catch(() => ({}));
      if (payload?.item) {
        onItemPatched?.(payload.item);
      }

      toast({ title: 'Updated', description: 'Agenda item updated.' });
      setIsEditing(false);
      await onRefresh?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to save item', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!event.class_id || event.type !== 'agenda_item') return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/classes/${event.class_id}/agenda/${event.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete item');
      onItemDeleted?.(event.id);
      toast({ title: 'Deleted', description: 'Agenda item deleted.' });
      onClose?.();
      await onRefresh?.();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleVisible = async () => {
    if (!event.class_id || event.type !== 'agenda_item') return;

    const nextVisible = !visible;
    setVisible(nextVisible);
    try {
      const response = await fetch(`/api/classes/${event.class_id}/agenda/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: nextVisible }),
      });
      if (!response.ok) throw new Error('Failed visibility update');
      const payload = await response.json().catch(() => ({}));
      if (payload?.item) {
        onItemPatched?.(payload.item);
      }
      await onRefresh?.();
    } catch {
      setVisible(!nextVisible);
      toast({ title: 'Error', description: 'Failed visibility update', variant: 'destructive' });
    }
  };

  const getCategoryColor = () => {
    if (event.task_category === 'homework') return '#FF9500'; // Orange
    if (event.task_category === 'small_test') return '#3B82F6'; // Blue
    if (event.task_category === 'big_test') return '#EF4444'; // Red
    if (event.task_category === 'other') return '#10B981'; // Green
    return '#4f86c0'; // Default blue
  };

  const getCategoryLabel = () => {
    if (event.custom_category_label) return event.custom_category_label;
    if (event.task_category === 'homework') return 'Homework';
    if (event.task_category === 'small_test') return 'Quiz/Test';
    if (event.task_category === 'big_test') return 'Big Test/Exam';
    if (event.task_category === 'other') return 'Other';
    return event.item_type?.charAt(0).toUpperCase() + event.item_type?.slice(1) || 'Task';
  };

  return (
    <Card className="relative overflow-hidden rounded-xl border-0 surface-panel shadow-sm">
      <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: accent }} />

      {/* Header with close button */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border surface-panel px-4 py-3">
        <div />
        {!isEditing && isTeacher && (
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => setIsEditing(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Subject/Class line */}
        <div className="text-xs text-muted-foreground">
          {subjectLine}
        </div>

        {/* Title */}
        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 text-lg"
            placeholder="Task title"
          />
        ) : (
          <h2 className="text-xl text-foreground">{event.title}</h2>
        )}

        {/* Info block */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg surface-interactive p-3">
          {/* Category badge */}
          <Badge
            className="text-white"
            style={{ backgroundColor: getCategoryColor() }}
          >
            {getCategoryLabel()}
          </Badge>

          {/* Date */}
          <span className="text-sm text-foreground">
            {format(event.date, 'EEE, MMM d')}
          </span>

          {/* Class name for teachers */}
          {isTeacher && event.class_name && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-foreground">{event.class_name}</span>
            </>
          )}
        </div>

        {/* Description */}
        {isEditing ? (
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="min-h-[88px]"
            placeholder="Description or instructions"
          />
        ) : (
          <>
            {event.description && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {event.description.trim()}
              </p>
            )}
          </>
        )}

        {/* Completion checkbox */}
        {!isEditing && event.type === 'agenda_item' && (
          <div className="flex items-center gap-3 rounded-lg surface-interactive p-3">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={toggleCompletion}
              disabled={isUpdatingCompletion}
              id="task-completion"
            />
            <label
              htmlFor="task-completion"
              className="flex-1 text-sm font-medium cursor-pointer"
            >
              {isCompleted ? 'Task completed' : 'Mark as complete'}
            </label>
          </div>
        )}

        {/* Resources */}
        {resourceLinks.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground">
              Resources
            </p>
            {resourceLinks.map((link, index) => (
              <div
                key={`${link.link_type}-${link.link_ref_id || index}`}
                className="flex items-center gap-2 rounded-lg surface-chip px-2.5 py-2"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    if (!link.href || link.href === '#') return;
                    if (link.href.startsWith('http')) {
                      window.open(link.href, '_blank', 'noopener,noreferrer');
                    } else {
                      router.push(link.href);
                    }
                  }}
                >
                  <p className="truncate text-sm">{link.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {link.link_type.replace('_', ' ')}
                  </p>
                </button>
                {isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setLinks((prev) =>
                        prev
                          .filter((_, idx) => idx !== index)
                          .map((row, idx) => ({ ...row, position: idx }))
                      )
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Open button */}
        {event.href && (
          <Button
            type="button"
            variant="secondary"
            className="h-9 w-full justify-between"
            onClick={() => router.push(event.href)}
          >
            Open
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}

        {/* Teacher controls */}
        {isTeacher && (
          <div className="space-y-2 border-t border-border pt-4">
            {/* Visibility toggle */}
            <div className="flex items-center gap-3 rounded-md surface-interactive px-2.5 py-1.5">
              <Switch
                checked={visible}
                onCheckedChange={toggleVisible}
                disabled={isEditing}
              />
              <span className="text-xs">Visible to students</span>
              {!visible && !isEditing && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Hidden
                </Badge>
              )}
            </div>

            {/* Edit mode controls */}
            {isEditing && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 flex-1"
                  disabled={isSaving}
                  onClick={saveChanges}
                >
                  <Save className="mr-1 h-3.5 w-3.5" />
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-8"
                  disabled={isSaving}
                  onClick={deleteItem}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
