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
import { X, ExternalLink, Pencil, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { CalendarEvent } from '@/lib/types';
import type { ClassInfo } from '@/contexts/app-context';

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
  onRefresh?: () => Promise<void> | void;
}

function getAccentColor(event: CalendarEvent) {
  if (event.visibility_state === 'hidden') return '#c56f6f';
  if (event.item_type === 'quiz') return '#c38843';
  if (event.item_type === 'event') return '#c56f6f';
  if (event.item_type === 'other') return '#8f7bb0';
  if (event.item_type === 'studyset') return '#5fa771';
  return '#4f86c0';
}

export function AssignmentDetailsPanel({ event, isTeacher, onClose, onRefresh }: AssignmentDetailsPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EditableType>('assignment');
  const [visible, setVisible] = useState(true);
  const [links, setLinks] = useState<AgendaLink[]>([]);

  useEffect(() => {
    if (!event) return;
    setTitle(event.title || '');
    setDescription(event.description || '');
    setType(((event.item_type as EditableType) || 'assignment') as EditableType);
    setVisible(event.visibility_state !== 'hidden');
    setLinks((event.links || []).map((link, idx) => ({ ...link, position: idx })));
    setIsEditing(false);
  }, [event?.id]);

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
        href = classId ? `/class/${classId}?tab=assignments` : '/classes';
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
      await onRefresh?.();
    } catch {
      setVisible(!nextVisible);
      toast({ title: 'Error', description: 'Failed visibility update', variant: 'destructive' });
    }
  };

  return (
    <Card className="relative overflow-hidden rounded-xl border-0 bg-card p-4 shadow-sm">
      <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: accent }} />

      <div className="mb-3 flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0">
          <button
            type="button"
            className="truncate text-[11px] uppercase tracking-[0.03em] text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (event.href) router.push(event.href);
            }}
          >
            {subjectLine}
          </button>
          {isEditing ? (
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-9" />
          ) : (
            <p className="mt-1 text-base text-foreground">{event.title}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isTeacher && (
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => setIsEditing((v) => !v)}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 pl-2">
        <p className="text-sm text-muted-foreground">{format(event.date, 'EEEE d MMMM yyyy')}</p>

        {isEditing ? (
          <div className="space-y-2">
            <Select value={type} onValueChange={(value) => setType(value as EditableType)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assignment">Homework</SelectItem>
                <SelectItem value="quiz">Test</SelectItem>
                <SelectItem value="event">Big Test</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="min-h-[88px]" />
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.description?.trim() || '-'}</p>
        )}

        {event.href && (
          <Button type="button" variant="secondary" className="h-9 w-full justify-between" onClick={() => router.push(event.href)}>
            Open
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}

        {resourceLinks.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs uppercase tracking-[0.03em] text-muted-foreground">Resources</p>
            {resourceLinks.map((link, index) => (
              <div key={`${link.link_type}-${link.link_ref_id || index}`} className="flex items-center gap-2 rounded-lg bg-muted/25 px-2.5 py-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    if (!link.href || link.href === '#') return;
                    router.push(link.href);
                  }}
                >
                  <p className="truncate text-sm">{link.label}</p>
                  <p className="text-[11px] text-muted-foreground">{link.link_type.replace('_', ' ')}</p>
                </button>
                {isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== index).map((row, idx) => ({ ...row, position: idx })))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {isTeacher && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="flex items-center gap-2 rounded-md bg-muted/35 px-2.5 py-1.5">
              <Switch checked={visible} onCheckedChange={toggleVisible} />
              <span className="text-xs">Visible to students</span>
            </div>
            {isEditing && (
              <Button type="button" size="sm" className="h-8" disabled={isSaving} onClick={saveChanges}>
                <Save className="mr-1 h-3.5 w-3.5" />
                Save
              </Button>
            )}
            {isEditing && (
              <Button type="button" size="sm" variant="destructive" className="h-8" disabled={isSaving} onClick={deleteItem}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            )}
            {!visible && <Badge variant="secondary">Hidden</Badge>}
          </div>
        )}
      </div>
    </Card>
  );
}
