'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, PlusCircle, X, ArrowRight } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';

type ScheduledItem = {
  id: string;
  tool: 'quiz' | 'flashcards' | 'notes' | 'wordweb';
  title: string;
  source_text: string | null;
  scheduled_for: string;
  status: 'pending' | 'notified' | 'completed' | 'dismissed';
};

const TOOL_LABELS: Record<ScheduledItem['tool'], string> = {
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  notes: 'Notes',
  wordweb: 'Word web',
};

const TOOL_HREFS: Record<ScheduledItem['tool'], string> = {
  quiz: '/tools/quiz',
  flashcards: '/tools/flashcards',
  notes: '/tools/notes',
  wordweb: '/tools/notes',
};

function startHref(item: ScheduledItem): string {
  const href = TOOL_HREFS[item.tool];
  if (!item.source_text?.trim()) return href;
  return `${href}?sourceText=${encodeURIComponent(item.source_text)}&autostart=1`;
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ScheduledStudyItems() {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tool, setTool] = useState<ScheduledItem['tool']>('quiz');
  const [title, setTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [scheduledFor, setScheduledFor] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return toLocalInputValue(d);
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/scheduled-items?status=pending,notified');
      if (!response.ok) {
        setItems([]);
        return;
      }
      const data = await response.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setTool('quiz');
    setTitle('');
    setSourceText('');
    setScheduledFor(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  };

  const handleCreate = async () => {
    if (!title.trim() || !scheduledFor) {
      toast({ title: 'Missing information', description: 'Give it a title and a time.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/scheduled-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool,
          title: title.trim(),
          source_text: sourceText.trim() || null,
          scheduled_for: new Date(scheduledFor).toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Failed to schedule');
      const created = await response.json();
      setItems((prev) => [...prev, created].sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for)));
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Scheduled', description: `${title.trim()} will remind you on time.` });
    } catch {
      toast({ title: 'Error', description: 'Could not schedule the study session.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await fetch(`/api/scheduled-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    }).catch(() => {});
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduled study</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Scheduled study
          </CardTitle>
          <CardDescription>Plan a quiz, flashcards, or notes session for later</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
          Schedule
        </Button>
      </CardHeader>

      {items.length > 0 && (
        <CardContent className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {TOOL_LABELS[item.tool]} · {format(new Date(item.scheduled_for), 'EEE d MMM, HH:mm')}
                </p>
              </div>
              <Button asChild size="sm">
                <a href={startHref(item)}>
                  Start
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
              <button
                type="button"
                onClick={() => handleDismiss(item.id)}
                className="shrink-0 rounded p-1 text-muted-foreground/60 hover:text-destructive transition-colors"
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </CardContent>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule a study session</DialogTitle>
            <DialogDescription>
              We&apos;ll remind you and show it on your dashboard and agenda when it&apos;s time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Tool</Label>
              <Select value={tool} onValueChange={(value) => setTool(value as ScheduledItem['tool'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="flashcards">Flashcards</SelectItem>
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="wordweb">Word web</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scheduled-title">Title</Label>
              <Input
                id="scheduled-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Biology chapter 4 quiz"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scheduled-source">Source text (optional)</Label>
              <Textarea
                id="scheduled-source"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste notes or source material - we'll auto-generate from this when it's time. Leave blank to pick it later."
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scheduled-time">When</Label>
              <Input
                id="scheduled-time"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Spinner size={16} color="white" className="mr-2" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
