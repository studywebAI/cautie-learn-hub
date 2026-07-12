'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, CheckCircle2, GraduationCap } from 'lucide-react';
import Loader from '@/components/ui/loader';

// Real "class template" source — pulled from the user's actual `/api/agenda/feed`
// (the same unified agenda the rest of the app uses), so picking a test/assignment
// here genuinely links the studyset to that class, subject and due date.
export type AgendaTemplateSeed = {
  id: string;
  title: string;
  subject: string | null;
  className: string | null;
  examDate: string | null; // yyyy-mm-dd
  focusNote: string;
  label: string;
};

type AgendaCandidate = {
  id: string;
  title: string;
  description: string | null;
  item_type: string;
  due_at: string | null;
  starts_at: string | null;
  subjectTitle: string | null;
  className: string | null;
};

function toIsoLocalDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function AgendaTemplatePicker({
  selectedId,
  onPick,
}: {
  selectedId: string | null;
  onPick: (seed: AgendaTemplateSeed) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AgendaCandidate[]>([]);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrored(false);
      try {
        const today = new Date();
        const from = toIsoLocalDate(today.toISOString()) as string;
        const horizon = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 120);
        const to = toIsoLocalDate(horizon.toISOString()) as string;
        const response = await fetch(`/api/agenda/feed?from=${from}&to=${to}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('failed to load agenda');
        const json = await response.json();
        const rawItems = Array.isArray(json?.items) ? json.items : [];
        const mapped: AgendaCandidate[] = rawItems
          .filter((item: any) => item?.due_at || item?.starts_at)
          .map((item: any) => ({
            id: String(item.id),
            title: String(item.title || 'Untitled'),
            description: item.description ? String(item.description) : null,
            item_type: String(item.item_type || 'assignment'),
            due_at: item.due_at || null,
            starts_at: item.starts_at || null,
            subjectTitle: item?.subjects?.title ? String(item.subjects.title) : null,
            className: item?.classes?.name ? String(item.classes.name) : null,
          }))
          .sort((a: AgendaCandidate, b: AgendaCandidate) => {
            const aTime = new Date(a.due_at || a.starts_at || 0).getTime();
            const bTime = new Date(b.due_at || b.starts_at || 0).getTime();
            return aTime - bTime;
          })
          .slice(0, 10);
        if (!cancelled) setItems(mapped);
      } catch {
        if (!cancelled) setErrored(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border/60 bg-background py-10">
        <Loader />
      </div>
    );
  }

  if (errored) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
        Couldn&apos;t load your agenda right now — pick another option, or try again in a moment.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
        No upcoming tests or assignments in your agenda yet — pick another option, or check back closer to your next one.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Pick something from your agenda — we&apos;ll line the studyset up with that class, subject and date.
      </p>
      <div className="space-y-2">
        {items.map((item) => {
          const examDate = toIsoLocalDate(item.due_at || item.starts_at);
          const selected = selectedId === item.id;
          const dateLabel = examDate ? format(new Date(`${examDate}T00:00:00`), 'EEEE, MMM d') : null;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                const introParts = [
                  `Preparing for "${item.title}"`,
                  item.subjectTitle
                    ? `(${item.subjectTitle}${item.className ? ` · ${item.className}` : ''})`
                    : item.className
                    ? `(${item.className})`
                    : '',
                  dateLabel ? `— due ${dateLabel}` : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                const focusNote = [introParts, item.description || ''].filter(Boolean).join('\n\n');
                onPick({
                  id: item.id,
                  title: item.title,
                  subject: item.subjectTitle,
                  className: item.className,
                  examDate,
                  focusNote,
                  label: `${item.title}${dateLabel ? ` · ${dateLabel}` : ''}`,
                });
              }}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                selected
                  ? 'border-[#6b7c4e] bg-[#6b7c4e]/5 ring-1 ring-[#6b7c4e]/30'
                  : 'border-border bg-background hover:border-[#6b7c4e]/40 hover:bg-[#6b7c4e]/5'
              }`}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  selected ? 'bg-[#6b7c4e] text-white' : 'bg-[#e8eddf] text-[#4a5735]'
                }`}
              >
                {selected ? <CheckCircle2 className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {item.subjectTitle && (
                    <span className="rounded-full bg-[#e8eddf] px-2 py-0.5 text-[10px] font-medium text-[#4a5735]">
                      {item.subjectTitle}
                    </span>
                  )}
                  {item.className && <span>{item.className}</span>}
                  {dateLabel && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {dateLabel}
                    </span>
                  )}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
