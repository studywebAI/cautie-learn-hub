'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, Link2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  created_at: string;
};

const EVENT_TYPES = [
  { value: 'exam', label: 'Exam / Test', emoji: '📝' },
  { value: 'assignment', label: 'Assignment deadline', emoji: '📋' },
  { value: 'quiz', label: 'Quiz', emoji: '✏️' },
  { value: 'cancellation', label: 'Class cancellation', emoji: '🚫' },
  { value: 'event', label: 'Class event', emoji: '📅' },
  { value: 'other', label: 'Other', emoji: '•' },
] as const;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function eventTypeLabel(type: string) {
  return EVENT_TYPES.find((t) => t.value === type) || { label: type, emoji: '•' };
}

type Props = {
  classId: string;
  className: string;
};

export function ClassCalendarEvents({ classId, className }: Props) {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<string>('exam');
  const [startsAt, setStartsAt] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [description, setDescription] = useState('');

  const icsUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/api/calendar/class/${classId}`
    : `/api/calendar/class/${classId}`;

  const webcalUrl = icsUrl.replace(/^https?:\/\//, 'webcal://');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/classes/${classId}/calendar-events`);
        if (res.ok) {
          const data = await res.json();
          setEvents(Array.isArray(data?.events) ? data.events : []);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [classId]);

  const handleCreate = async () => {
    if (!title.trim() || !startsAt) return;
    setSubmitting(true);
    try {
      const body = {
        title: title.trim(),
        event_type: eventType,
        starts_at: allDay ? `${startsAt}T00:00:00.000Z` : new Date(startsAt).toISOString(),
        all_day: allDay,
        description: description.trim() || null,
      };
      const res = await fetch(`/api/classes/${classId}/calendar-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setEvents((prev) => [...prev, data.event].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()));
      setTitle(''); setEventType('exam'); setStartsAt(''); setDescription(''); setAllDay(true);
      setShowForm(false);
      toast({ title: 'Event added', description: `"${data.event.title}" added to calendar.` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to create event', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      const res = await fetch(`/api/classes/${classId}/calendar-events/${eventId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast({ title: 'Removed', description: 'Calendar event deleted.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete event', variant: 'destructive' });
    }
  };

  const copyIcsUrl = () => {
    navigator.clipboard.writeText(icsUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* ICS subscription section */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#6b7c4e]" />
              Calendar subscription link
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Share this URL with students so they can subscribe in Apple Calendar, Google Calendar, or Outlook — events auto-sync.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-background border border-border px-2.5 py-1.5 text-xs text-muted-foreground">
            {icsUrl}
          </code>
          <button type="button" onClick={copyIcsUrl} className="flex-shrink-0 rounded-lg border border-border bg-background p-1.5 transition-colors hover:bg-muted" title="Copy ICS link">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
          </button>
          <a href={webcalUrl} className="flex-shrink-0 rounded-lg border border-[#6b7c4e] bg-[#6b7c4e]/10 px-3 py-1.5 text-xs font-medium text-[#4a5735] transition-colors hover:bg-[#6b7c4e]/20" title="Subscribe in calendar app">
            <Link2 className="inline h-3.5 w-3.5 mr-1" />
            Subscribe
          </a>
        </div>
      </div>

      {/* Events list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">
            Upcoming events ({events.filter(e => new Date(e.starts_at) >= new Date()).length})
          </h4>
          <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)} style={{ backgroundColor: '#6b7c4e' }}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add event
          </Button>
        </div>

        {showForm && (
          <div className="mb-4 rounded-xl border border-[#6b7c4e]/30 bg-[#6b7c4e]/5 p-4 space-y-3">
            <h5 className="text-sm font-medium text-foreground">New calendar event</h5>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Exam" className="mt-1 h-9" />
              </div>

              <div>
                <Label className="text-xs">Type</Label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#6b7c4e]"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Date *</Label>
                <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-1 h-9" />
              </div>

              <div className="col-span-2">
                <Label className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Extra details for students…" className="mt-1 h-9" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="button" size="sm" onClick={handleCreate} disabled={!title.trim() || !startsAt || submitting} style={{ backgroundColor: '#6b7c4e' }}>
                {submitting ? 'Adding…' : 'Add to calendar'}
              </Button>
              <button type="button" onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground underline">
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading && <p className="text-xs text-muted-foreground">Loading events…</p>}

        {!loading && events.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground">No events yet. Add exams, deadlines or cancellations — they appear in students&apos; calendar subscriptions.</p>
        )}

        {!loading && events.length > 0 && (
          <div className="space-y-2">
            {events.map((event) => {
              const type = eventTypeLabel(event.event_type);
              const isPast = new Date(event.starts_at) < new Date();
              return (
                <div key={event.id} className={`flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 ${isPast ? 'opacity-50' : 'bg-background'}`}>
                  <span className="text-base">{type.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{type.label} · {formatDate(event.starts_at)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(event.id)}
                    className="flex-shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-red-600"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
