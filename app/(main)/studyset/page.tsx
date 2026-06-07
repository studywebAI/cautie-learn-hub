'use client';

import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { BookOpen, Calendar, Trash2, ArrowRight, Plus, ChevronDown } from 'lucide-react';
import Link from 'next/link';

// --- Types ---------------------------------------------------------------

type StudySetBase = {
  id: string;
  name: string;
  description?: string | null;
  subject?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  exam_date?: string | null;
};

// Enriched view-model after merging base + launchpad data.
type StudySet = {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  exam_date: string | null;
  total_tasks: number;
  completed_tasks: number;
  due_today_tasks: number;
  next_action_href: string | null;
  weakest_tool: string | null;
  focus_topics: string[];
  pulse_summary: string | null;
};

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

const BRAND = '#6b7c4e';

// --- Helpers -------------------------------------------------------------

function toStringOrNull(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return null;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? '').trim()).filter(Boolean);
}

// The launchpad API may expose progress either flat or nested under `progress`,
// and pulse fields either prefixed (`pulse_*`) or plain. Read both shapes.
function normalizeLaunchpad(raw: Record<string, unknown>) {
  const progress = (raw.progress as Record<string, unknown> | undefined) ?? {};
  return {
    id: String(raw.id ?? ''),
    status: toStringOrNull(raw.status),
    total_tasks: toNumber(raw.total_tasks ?? progress.total_tasks),
    completed_tasks: toNumber(raw.completed_tasks ?? progress.completed_tasks),
    due_today_tasks: toNumber(raw.due_today_tasks),
    next_action_href: toStringOrNull(raw.next_action_href),
    weakest_tool: toStringOrNull(raw.weakest_tool ?? raw.pulse_weakest_tool),
    focus_topics: toStringArray(raw.focus_topics ?? raw.pulse_focus_topics),
    pulse_summary: toStringOrNull(raw.pulse_summary ?? raw.summary),
  };
}

function isCompletedOrArchived(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'archived' || s === 'complete' || s === 'completed';
}

function statusBadge(status: string): { label: string; className: string } {
  const s = status.toLowerCase();
  if (s === 'review') {
    return { label: 'review', className: 'bg-amber-100 text-amber-700' };
  }
  if (s === 'draft') {
    return { label: 'draft', className: 'bg-muted text-muted-foreground' };
  }
  if (isCompletedOrArchived(s)) {
    return { label: s === 'archived' ? 'archived' : 'complete', className: 'bg-muted text-muted-foreground' };
  }
  return { label: 'active', className: 'bg-[var(--accent-brand)]/12 text-[var(--accent-brand)]' };
}

function daysUntil(exam: string): number | null {
  const t = new Date(exam).getTime();
  if (!Number.isFinite(t)) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfExam = new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate()).getTime();
  return Math.round((startOfExam - startOfToday) / (24 * 60 * 60 * 1000));
}

function examChipClass(days: number): string {
  if (days <= 7) return 'bg-red-100 text-red-700';
  if (days <= 14) return 'bg-amber-100 text-amber-700';
  return 'bg-muted text-muted-foreground';
}

// --- Card skeleton -------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-6 w-1/2 animate-pulse rounded bg-muted" />
      <div className="mt-5 h-2 w-full animate-pulse rounded-full bg-muted" />
      <div className="mt-6 flex gap-2">
        <div className="h-9 flex-1 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

// --- Chip ----------------------------------------------------------------

function Chip({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

// --- Active card ---------------------------------------------------------

function ActiveCard({
  ss,
  onDelete,
  deleting,
}: {
  ss: StudySet;
  onDelete: (e: React.MouseEvent, id: string) => void;
  deleting: boolean;
}) {
  const badge = statusBadge(ss.status);
  const percent = ss.total_tasks === 0 ? 0 : Math.round((ss.completed_tasks / ss.total_tasks) * 100);
  const examDays = ss.exam_date ? daysUntil(ss.exam_date) : null;
  const nextHref = ss.next_action_href || `/tools/studyset/${ss.id}`;
  const topics = ss.focus_topics.slice(0, 3);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* top row */}
      <div className="flex items-start justify-between gap-2">
        {ss.subject ? (
          <Chip className="bg-[var(--accent-brand)]/12 text-[var(--accent-brand)]">{ss.subject.toLowerCase()}</Chip>
        ) : (
          <span />
        )}
        <Chip className={badge.className}>{badge.label}</Chip>
      </div>

      {/* title */}
      <Link
        href={`/tools/studyset/${ss.id}`}
        className="mt-3 line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-foreground transition-colors hover:text-[var(--accent-brand)]"
      >
        {ss.name}
      </Link>

      {/* progress */}
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${percent}%`, backgroundColor: BRAND }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {ss.completed_tasks} of {ss.total_tasks} tasks
          </span>
          <span>{percent}%</span>
        </div>
      </div>

      {/* exam countdown + weak topics */}
      {(examDays !== null || topics.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {examDays !== null && (
            <Chip className={examChipClass(examDays)}>
              📅 {examDays < 0 ? 'overdue' : `${examDays} days`}
            </Chip>
          )}
          {topics.map((topic) => (
            <Chip key={topic} className="bg-red-50 text-red-600">
              {topic.toLowerCase()}
            </Chip>
          ))}
        </div>
      )}

      {/* spacer to push footer down */}
      <div className="flex-1" />

      {/* bottom buttons */}
      <div className="mt-5 flex items-center gap-2">
        <Button asChild size="sm" className="flex-1" style={{ backgroundColor: BRAND }}>
          <Link href={nextHref}>
            next task
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/tools/studyset/${ss.id}`}>open</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => onDelete(e, ss.id)}
          disabled={deleting}
          aria-label="delete studyset"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// --- Archived row --------------------------------------------------------

function ArchivedRow({
  ss,
  onDelete,
  deleting,
}: {
  ss: StudySet;
  onDelete: (e: React.MouseEvent, id: string) => void;
  deleting: boolean;
}) {
  const percent = ss.total_tasks === 0 ? 0 : Math.round((ss.completed_tasks / ss.total_tasks) * 100);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
      <Link href={`/tools/studyset/${ss.id}`} className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{ss.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {ss.subject && (
            <>
              <span>{ss.subject.toLowerCase()}</span>
              <span>·</span>
            </>
          )}
          <span>{percent}% complete</span>
        </div>
      </Link>
      <Chip className="bg-muted text-muted-foreground">
        {ss.status.toLowerCase() === 'archived' ? 'archived' : 'complete'}
      </Chip>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={(e) => onDelete(e, ss.id)}
        disabled={deleting}
        aria-label="delete studyset"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// --- Create modal --------------------------------------------------------

function CreateStudysetModal({
  open,
  onOpenChange,
  subjects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setSubject('');
      setExamDate('');
      setDescription('');
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: 'Name required', description: 'Please enter a name for your studyset.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/studysets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          subject: subject.trim() || null,
          description: description.trim() || null,
          exam_date: examDate || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.studyset?.id) {
        const id = String(data.studyset.id);
        onOpenChange(false);
        router.push(`/studyset/create?studysetId=${id}`);
      } else {
        toast({
          title: 'Error',
          description: data?.error || 'Failed to create studyset',
          variant: 'destructive',
        });
        setSubmitting(false);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create studyset', variant: 'destructive' });
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>new studyset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ss-name" className="text-sm">
              name
            </Label>
            <Input
              id="ss-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. cell biology midterm"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ss-subject" className="text-sm">
              subject <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="ss-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Biology, History — or leave blank"
              list="ss-subject-options"
            />
            {subjects.length > 0 && (
              <datalist id="ss-subject-options">
                {subjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ss-exam" className="text-sm">
              exam date <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="ss-exam" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ss-desc" className="text-sm">
              description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="ss-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="what do you want to study?"
              className="min-h-[72px]"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting} style={{ backgroundColor: BRAND }} className="w-full sm:w-auto">
              {submitting ? 'creating…' : 'create studyset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Page ----------------------------------------------------------------

export default function StudySetsPage() {
  const { session, isLoading } = useContext(AppContext) as AppContextType;
  const [studysets, setStudysets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStudysetId, setSelectedStudysetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading || !session) {
      setLoading(true);
      return;
    }

    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }

    const fetchStudysets = async () => {
      try {
        const [baseRes, launchRes] = await Promise.all([
          fetch('/api/studysets'),
          fetch('/api/studysets/launchpad?limit=50'),
        ]);

        let baseList: StudySetBase[] = [];
        if (baseRes.ok) {
          const data = await baseRes.json();
          baseList = Array.isArray(data?.studysets) ? data.studysets : [];
        }

        const launchById = new Map<string, ReturnType<typeof normalizeLaunchpad>>();
        if (launchRes.ok) {
          const data = await launchRes.json();
          const items: Record<string, unknown>[] = Array.isArray(data?.items) ? data.items : [];
          for (const item of items) {
            const norm = normalizeLaunchpad(item);
            if (norm.id) launchById.set(norm.id, norm);
          }
        }

        const merged: StudySet[] = baseList.map((base) => {
          const id = String(base.id);
          const lp = launchById.get(id);
          // Base API may also carry nested progress/analytics — read defensively.
          const baseAny = base as unknown as Record<string, unknown>;
          const baseProgress = (baseAny.progress as Record<string, unknown> | undefined) ?? {};
          const baseAnalytics = (baseAny.analytics_summary as Record<string, unknown> | undefined) ?? {};

          return {
            id,
            name: String(base.name ?? 'Studyset'),
            description: toStringOrNull(base.description),
            subject: toStringOrNull(base.subject),
            status: lp?.status || String(base.status ?? 'draft'),
            created_at: String(base.created_at ?? new Date().toISOString()),
            updated_at: String(base.updated_at ?? new Date().toISOString()),
            exam_date: toStringOrNull(base.exam_date),
            total_tasks: lp?.total_tasks || toNumber(baseProgress.total_tasks),
            completed_tasks: lp?.completed_tasks || toNumber(baseProgress.completed_tasks),
            due_today_tasks: lp?.due_today_tasks || toNumber(baseAnalytics.due_today_tasks),
            next_action_href:
              lp?.next_action_href || toStringOrNull(baseAny.next_task_href),
            weakest_tool: lp?.weakest_tool || toStringOrNull(baseAnalytics.weakest_tool),
            focus_topics: lp?.focus_topics ?? [],
            pulse_summary: lp?.pulse_summary ?? null,
          };
        });

        setStudysets(merged);
      } catch {
        // swallow — render empty state on failure
      } finally {
        setLoading(false);
      }
    };

    void fetchStudysets();
  }, [session, isLoading]);

  const { active, archived, subjects } = useMemo(() => {
    const activeList = studysets.filter((ss) => !isCompletedOrArchived(ss.status));
    const archivedList = studysets.filter((ss) => isCompletedOrArchived(ss.status));
    const subjectSet = new Set<string>();
    for (const ss of studysets) {
      if (ss.subject) subjectSet.add(ss.subject);
    }
    return { active: activeList, archived: archivedList, subjects: Array.from(subjectSet).sort() };
  }, [studysets]);

  const handleDeleteClick = (e: React.MouseEvent, studysetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedStudysetId(studysetId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedStudysetId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/studysets/${selectedStudysetId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setStudysets((prev) => prev.filter((ss) => ss.id !== selectedStudysetId));
        toast({ title: 'Success', description: 'Studyset deleted successfully' });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete studyset',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete studyset', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedStudysetId(null);
    }
  };

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  // --- Empty state ---
  if (studysets.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center min-h-[420px]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-brand)]/12">
            <BookOpen className="h-7 w-7 text-[var(--accent-brand)]" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">No studysets yet</h3>
          <p className="mb-6 mt-2 max-w-sm text-sm text-muted-foreground">
            Create your first studyset to start learning with AI-powered, personalized study materials.
          </p>
          <Button onClick={() => setCreateOpen(true)} style={{ backgroundColor: BRAND }}>
            <Plus className="mr-1 h-4 w-4" />
            Create your first studyset
          </Button>
        </div>
        <CreateStudysetModal open={createOpen} onOpenChange={setCreateOpen} subjects={subjects} />
      </>
    );
  }

  return (
    <>
      {/* Header + create button */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Studysets</h1>
        <Button onClick={() => setCreateOpen(true)} style={{ backgroundColor: BRAND }}>
          <Plus className="mr-1 h-4 w-4" />
          New studyset
        </Button>
      </div>

      {/* Active studysets */}
      {active.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Active studysets
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {active.map((ss) => (
              <ActiveCard key={ss.id} ss={ss} onDelete={handleDeleteClick} deleting={deleting} />
            ))}
          </div>
        </section>
      )}

      {active.length === 0 && archived.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No active studysets right now.</p>
          <Button onClick={() => setCreateOpen(true)} className="mt-4" style={{ backgroundColor: BRAND }}>
            <Plus className="mr-1 h-4 w-4" />
            New studyset
          </Button>
        </div>
      )}

      {/* Completed / Archived */}
      {archived.length > 0 && (
        <section className="mt-8">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showArchived ? 'rotate-180' : ''}`}
            />
            Show archived ({archived.length})
          </button>
          {showArchived && (
            <div className="mt-3 space-y-2">
              {archived.map((ss) => (
                <ArchivedRow key={ss.id} ss={ss} onDelete={handleDeleteClick} deleting={deleting} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Create modal */}
      <CreateStudysetModal open={createOpen} onOpenChange={setCreateOpen} subjects={subjects} />

      {/* Delete confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete studyset?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent. The studyset and all its associated data will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
