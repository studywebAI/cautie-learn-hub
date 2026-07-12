'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Archive,
  Check,
  Clock,
  History,
  Pencil,
  Plus,
  RefreshCcw,
  Sparkles,
  Target,
  User,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Loader from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { PageSection } from '@/components/layout/page-section';

const CARD = 'bg-white rounded-2xl border border-border shadow-sm p-5';
const SECTION_HEADING = 'text-[11px] text-muted-foreground mb-3';

type ManualEntry = {
  id: string;
  type: 'manual';
  action: string;
  changes: Record<string, { from: any; to: any }> | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

type AiEntry = {
  id: string;
  type: 'ai';
  kind: string;
  tool_key?: string | null;
  title: string;
  reason: string;
  priority: number;
  status: string;
  due_date?: string | null;
  origin: string;
  created_at: string;
  updated_at: string;
};

type TimelineEntry = ManualEntry | AiEntry;

// Mirrors the recommendation styling already shipped on the studyset detail page —
// same icon/label per `kind`, so the AI voice looks identical everywhere it appears.
function recommendationMeta(kind: string) {
  switch (kind) {
    case 'focus':
      return { Icon: Target, label: 'Focus' };
    case 'retry':
      return { Icon: RefreshCcw, label: 'Retry' };
    case 'challenge':
      return { Icon: Zap, label: 'Challenge' };
    default:
      return { Icon: Sparkles, label: 'Suggestion' };
  }
}

function manualMeta(action: string) {
  switch (action) {
    case 'studyset_created':
      return { Icon: Plus, label: 'Created' };
    case 'studyset_archived':
      return { Icon: Archive, label: 'Archived' };
    case 'studyset_updated':
      return { Icon: Pencil, label: 'Updated' };
    default:
      return { Icon: Pencil, label: 'Changed' };
  }
}

function describeManualChange(entry: ManualEntry): { headline: string; details: string[] } {
  if (entry.action === 'studyset_created') {
    const name = entry.metadata?.name ? String(entry.metadata.name) : null;
    return { headline: name ? `Created "${name}"` : 'Created this studyset', details: [] };
  }
  if (entry.action === 'studyset_archived') {
    return {
      headline: 'Archived this studyset',
      details: ['Moved out of your active list — you can restore it from settings any time.'],
    };
  }
  if (entry.action === 'studyset_updated') {
    const changes = entry.changes || {};
    const details: string[] = [];
    if (changes.name) details.push(`Renamed from "${changes.name.from}" to "${changes.name.to}"`);
    if (changes.status) details.push(`Status changed from ${changes.status.from} to ${changes.status.to}`);
    if (changes.icon) details.push('Icon updated');
    if (changes.color) details.push('Color updated');
    if (changes.subject) details.push(`Subject set to "${changes.subject.to || '—'}"`);
    if (changes.exam_date) {
      details.push(changes.exam_date.to ? `Exam date set to ${changes.exam_date.to}` : 'Exam date cleared');
    }
    if (changes.description) details.push('Description updated');
    if (changes.study_days) {
      details.push(`Study days changed from ${changes.study_days.from} to ${changes.study_days.to} days`);
    }
    if (details.length === 0) details.push('Saved settings changes');
    return { headline: 'Updated this studyset', details };
  }
  return { headline: entry.action.replace(/_/g, ' ') || 'Change recorded', details: [] };
}

function aiStatusMeta(status: string) {
  switch (status) {
    case 'done':
      return { label: 'Applied', className: 'bg-[#e8eddf] text-[#4a5735] border border-[#d4dcc2]' };
    case 'dismissed':
      return { label: 'Dismissed', className: 'bg-muted text-muted-foreground border border-border/60' };
    default:
      return { label: 'Pending', className: 'bg-[#fdf3da] text-[#8a6a13] border border-[#f0e0b0]' };
  }
}

function formatWhen(iso: string) {
  try {
    return format(new Date(iso), "EEEE, MMM d 'at' HH:mm");
  } catch {
    return iso;
  }
}

export default function StudysetChangesPage() {
  const params = useParams<{ studysetId: string }>();
  const studysetId = params?.studysetId as string | undefined;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [studysetName, setStudysetName] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [manualCount, setManualCount] = useState(0);
  const [aiCount, setAiCount] = useState(0);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = async () => {
    if (!studysetId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/studysets/${studysetId}/changes`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load history');
      const json = await response.json();
      setStudysetName(json?.studyset?.name ? String(json.studyset.name) : null);
      setTimeline(Array.isArray(json?.timeline) ? json.timeline : []);
      setManualCount(Number(json?.manual_count || 0));
      setAiCount(Number(json?.ai_count || 0));
    } catch (error: any) {
      toast({
        title: 'Could not load history',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studysetId]);

  const respond = async (id: string, status: 'done' | 'dismissed') => {
    setRespondingId(id);
    try {
      const response = await fetch(`/api/studysets/interventions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Could not update suggestion');
      setTimeline((prev) =>
        prev.map((entry) =>
          entry.type === 'ai' && entry.id === id
            ? { ...entry, status, updated_at: new Date().toISOString() }
            : entry
        )
      );
      toast({ title: status === 'done' ? 'Marked as applied' : 'Suggestion dismissed' });
    } catch (error: any) {
      toast({
        title: 'Could not update suggestion',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setRespondingId(null);
    }
  };

  const pendingAiCount = useMemo(
    () => timeline.filter((entry) => entry.type === 'ai' && entry.status === 'pending').length,
    [timeline]
  );

  if (loading) {
    return (
      <PageSection className="[--accent-brand:#6b7c4e]">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader />
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection className="[--accent-brand:#6b7c4e]">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/tools/studyset/${studysetId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to studyset
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl text-foreground">
          <History className="h-5 w-5 text-muted-foreground" />
          {studysetName ? `${studysetName} — Changes` : 'Changes'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you changed yourself, plus everything Cautie&apos;s AI adjusted or suggested — and why.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-surface-chip px-3 py-1.5 text-xs font-medium text-foreground">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          {manualCount} manual {manualCount === 1 ? 'change' : 'changes'}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-surface-chip px-3 py-1.5 text-xs font-medium text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          {aiCount} AI {aiCount === 1 ? 'suggestion' : 'suggestions'}
        </span>
        {pendingAiCount > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full bg-[#fdf3da] px-3 py-1.5 text-xs font-medium text-[#8a6a13] border border-[#f0e0b0]">
            <Clock className="h-3.5 w-3.5" />
            {pendingAiCount} waiting on you
          </span>
        )}
      </div>

      <section>
        <h2 className={SECTION_HEADING}>history</h2>
        {timeline.length === 0 ? (
          <div className={`${CARD} text-center`}>
            <p className="text-sm text-muted-foreground">
              Nothing to show yet — edits you make (and suggestions Cautie&apos;s AI proposes) will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {timeline.map((entry) => {
              if (entry.type === 'manual') {
                const { Icon, label } = manualMeta(entry.action);
                const { headline, details } = describeManualChange(entry);
                return (
                  <div key={`manual-${entry.id}`} className={`${CARD} flex items-start gap-3`}>
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-chip text-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{headline}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {label}
                        </Badge>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <User className="h-3 w-3" />
                          You
                        </span>
                      </div>
                      {details.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                          {details.map((line, index) => (
                            <li key={index}>· {line}</li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-1.5 text-[11px] text-muted-foreground">{formatWhen(entry.created_at)}</p>
                    </div>
                  </div>
                );
              }

              const { Icon: KindIcon, label: kindLabel } = recommendationMeta(entry.kind);
              const sm = aiStatusMeta(entry.status);
              const busy = respondingId === entry.id;
              return (
                <div key={`ai-${entry.id}`} className={`${CARD} flex items-start gap-3`}>
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8eddf] text-[#4a5735]">
                    <KindIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{entry.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {kindLabel}
                      </Badge>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sm.className}`}>
                        {sm.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#eef1e7] px-2 py-0.5 text-[10px] font-medium text-[#5b6b41]">
                        <Sparkles className="h-3 w-3" />
                        Cautie AI
                      </span>
                    </div>
                    {entry.reason && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">Why: </span>
                        {entry.reason}
                      </p>
                    )}
                    <p className="mt-1.5 text-[11px] text-muted-foreground">{formatWhen(entry.created_at)}</p>
                  </div>
                  {entry.status === 'pending' && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[var(--accent-brand)] hover:text-[var(--accent-brand)]"
                        disabled={busy}
                        onClick={() => void respond(entry.id, 'done')}
                        aria-label="Apply suggestion"
                        title="Apply"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={busy}
                        onClick={() => void respond(entry.id, 'dismissed')}
                        aria-label="Dismiss suggestion"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageSection>
  );
}
