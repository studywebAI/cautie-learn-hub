'use client';

import { useEffect, useState } from 'react';
import { Loader2, Trash2, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type CalendarEvent = {
  id: string;
  title: string;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  description: string | null;
  created_by: string | null;
  created_at?: string | null;
};

type CalendarTabProps = {
  classId: string;
};

const EVENT_TYPE_OPTIONS = [
  { value: 'exam', label: 'Exam' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'session', label: 'Study session' },
  { value: 'other', label: 'Other' },
];

const EVENT_TYPE_BADGE: Record<string, string> = {
  exam: 'bg-red-100 text-red-700',
  deadline: 'bg-amber-100 text-amber-700',
  session: 'bg-[#e8eddf] text-[#4a5735]',
  other: 'bg-muted text-muted-foreground',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  exam: 'Exam',
  deadline: 'Deadline',
  session: 'Study session',
  other: 'Other',
};

function formatEventDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function CalendarTab({ classId }: CalendarTabProps) {
  const { toast } = useToast();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('other');
  const [formStartsAt, setFormStartsAt] = useState('');
  const [formEndsAt, setFormEndsAt] = useState('');
  const [formDescription, setFormDescription] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/classes/${classId}/calendar-events`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load events');
        if (!cancelled) setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (error: any) {
        if (!cancelled) {
          toast({ title: 'Could not load calendar events', description: error?.message || '', variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [classId, toast]);

  const resetForm = () => {
    setFormTitle('');
    setFormType('other');
    setFormStartsAt('');
    setFormEndsAt('');
    setFormDescription('');
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!formStartsAt) {
      toast({ title: 'Start date is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/classes/${classId}/calendar-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          event_type: formType,
          starts_at: new Date(formStartsAt).toISOString(),
          ends_at: formEndsAt ? new Date(formEndsAt).toISOString() : null,
          description: formDescription.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create event');
      setEvents(prev => [...prev, data.event].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      ));
      resetForm();
      setShowForm(false);
      toast({ title: 'Event created' });
    } catch (error: any) {
      toast({ title: 'Could not create event', description: error?.message || '', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      const res = await fetch(`/api/classes/${classId}/calendar-events/${eventId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete event');
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast({ title: 'Event deleted' });
    } catch (error: any) {
      toast({ title: 'Could not delete event', description: error?.message || '', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Class calendar</CardTitle>
          <Button size="sm" onClick={() => setShowForm(v => !v)}>+ New event</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Events appear in the class calendar feed. Students subscribe via the agenda page.
        </p>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 space-y-3 rounded-lg border p-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Midterm exam"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Event type</label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value)}
                className="h-9 w-full text-sm rounded-md border border-input px-3 bg-background"
              >
                {EVENT_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Start</label>
                <input
                  type="datetime-local"
                  value={formStartsAt}
                  onChange={e => setFormStartsAt(e.target.value)}
                  className="h-9 text-sm rounded-md border border-input px-3"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">End (optional)</label>
                <input
                  type="datetime-local"
                  value={formEndsAt}
                  onChange={e => setFormEndsAt(e.target.value)}
                  className="h-9 text-sm rounded-md border border-input px-3"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                rows={3}
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Details students should know"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void handleCreate()} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowForm(false); resetForm(); }}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No events yet. Create one to populate the class calendar feed.
          </p>
        ) : (
          <div className="space-y-2">
            {events.map(event => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{event.title}</span>
                  <Badge className={EVENT_TYPE_BADGE[event.event_type] || EVENT_TYPE_BADGE.other}>
                    {EVENT_TYPE_LABEL[event.event_type] || 'Other'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatEventDate(event.starts_at)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => void handleDelete(event.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
