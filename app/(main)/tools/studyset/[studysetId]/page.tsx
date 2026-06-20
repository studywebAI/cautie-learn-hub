'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Brain,
  Check,
  CheckCircle2,
  FileText,
  History,
  Layers,
  LineChart,
  Link2,
  Map,
  Minus,
  RefreshCcw,
  Settings,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Copy } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { PageSection } from '@/components/layout/page-section';
import { MaterialsPanel } from '@/components/studyset/materials-panel';
import { RecentsLinksUpdater, RecentsBreadcrumb } from '@/components/tools/recents-breadcrumb';

type StudysetTask = {
  id: string;
  task_type: string;
  title: string;
  description?: string | null;
  estimated_minutes: number;
  position: number;
  completed: boolean;
};

type StudysetDay = {
  id: string;
  day_number: number;
  plan_date?: string | null;
  summary?: string | null;
  estimated_minutes: number;
  completed: boolean;
  studyset_plan_tasks: StudysetTask[];
};

type StudysetDetail = {
  id: string;
  name: string;
  target_days: number;
  minutes_per_day: number;
  status: string;
  exam_date?: string | null;
  subject?: string | null;
  meta?: { icon?: string | null; color?: string | null } | null;
  source_bundle?: string | null;
};

type StudysetAdaptive = {
  avg_score: number;
  mastery_band: string;
  last_issues: string[];
  updated_at?: string | null;
};

type MasteryTopic = {
  topic_label: string;
  weakness_score: number;
  mastery_score: number;
};

type TrendPoint = {
  date: string;
  avg_score: number;
};

type AiRecommendation = {
  id: string;
  kind: string;
  tool_key?: string | null;
  title: string;
  reason: string;
  priority: number;
  due_date?: string | null;
  status: string;
  task_id?: string | null;
  task_type?: string | null;
  task_title?: string | null;
  day_number?: number | null;
  plan_date?: string | null;
  launch_href?: string | null;
};

type AiBrief = {
  title: string;
  summary: string;
  recommendation?: {
    tool: string;
    taskTitle: string;
    href: string | null;
    dayNumber: number;
  } | null;
};

type DailyPulse = {
  summary?: string;
  weakest_tool?: string | null;
  focus_topics?: string[];
  recommended_tools?: string[];
  completion_percent?: number;
  avg_score?: number;
};

type PerformanceSummary = {
  weakest_tool?: string | null;
  strongest_tool?: string | null;
  momentum?: string;
  momentum_delta?: number;
};

// Maps a plan-task type to the launch page `tool` param.
const TOOL_TYPES: Record<string, string> = {
  notes: 'notes',
  flashcards: 'flashcards',
  quiz: 'quiz',
  wordweb: 'wordweb',
};

const SECTION_HEADING = 'text-[11px] text-muted-foreground mb-3';
const CARD = 'bg-white rounded-2xl border border-border shadow-sm p-5';

function toolMeta(taskType: string) {
  switch (taskType) {
    case 'quiz':
      return { emoji: '🧠', Icon: Brain, label: 'Quiz' };
    case 'flashcards':
      return { emoji: '🃏', Icon: Layers, label: 'Flashcards' };
    case 'wordweb':
      return { emoji: '🗺', Icon: Map, label: 'Concept map' };
    case 'review':
      return { emoji: '✅', Icon: CheckCircle2, label: 'Review' };
    default:
      return { emoji: '📝', Icon: FileText, label: 'Notes' };
  }
}

function taskHref(taskType: string, studysetId: string, taskId: string) {
  if (taskType === 'review') return `/tools/studyset/${studysetId}`;
  const tool = TOOL_TYPES[taskType] || 'notes';
  return `/tools/launch?tool=${tool}&studysetId=${studysetId}&taskId=${taskId}&launch=1`;
}

function toIsoLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readinessTone(percent: number) {
  if (percent >= 75) return 'var(--accent-brand)';
  if (percent >= 40) return '#d6a312';
  return '#c0524a';
}

function chipTone(weakness: number) {
  if (weakness > 70) return 'bg-[#fbe9e7] text-[#9b3a32] border border-[#f1c4bf]';
  if (weakness >= 40) return 'bg-[#fdf3da] text-[#8a6a13] border border-[#f0e0b0]';
  return 'bg-[#e8eddf] text-[#4a5735] border border-[#d4dcc2]';
}

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

function momentumMeta(momentum?: string | null) {
  if (momentum === 'up') {
    return { Icon: TrendingUp, label: 'Improving', className: 'bg-[#e8eddf] text-[#4a5735] border border-[#d4dcc2]' };
  }
  if (momentum === 'down') {
    return { Icon: TrendingDown, label: 'Slipping', className: 'bg-[#fbe9e7] text-[#9b3a32] border border-[#f1c4bf]' };
  }
  return { Icon: Minus, label: 'Steady', className: 'bg-muted text-muted-foreground border border-border' };
}

export default function StudysetDetailPage() {
  const params = useParams<{ studysetId: string }>();
  const studysetId = params?.studysetId;
  const router = useRouter();
  const { toast } = useToast();
  const todayIso = useMemo(() => toIsoLocalDate(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [planMode, setPlanMode] = useState<'today' | 'full'>('today');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [studyset, setStudyset] = useState<StudysetDetail | null>(null);
  const [adaptive, setAdaptive] = useState<StudysetAdaptive | null>(null);
  const [days, setDays] = useState<StudysetDay[]>([]);
  const [progress, setProgress] = useState({ total_tasks: 0, completed_tasks: 0, percent: 0 });
  const [masteryTopics, setMasteryTopics] = useState<MasteryTopic[]>([]);
  const [scoreTrend, setScoreTrend] = useState<TrendPoint[]>([]);
  const [aiBrief, setAiBrief] = useState<AiBrief | null>(null);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [dailyPulse, setDailyPulse] = useState<DailyPulse | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const loadDetail = async () => {
    if (!studysetId) return;
    setLoading(true);
    try {
      const [detailRes, analyticsRes] = await Promise.all([
        fetch(`/api/studysets/${studysetId}`, { cache: 'no-store' }),
        fetch(`/api/studysets/${studysetId}/analytics`, { cache: 'no-store' }).catch(() => null),
      ]);

      if (!detailRes.ok) throw new Error('Could not load studyset');
      const data = await detailRes.json();

      const detail: StudysetDetail | null = data.studyset || null;
      setStudyset(detail);
      setAdaptive(data.adaptive || null);
      setDays(data.days || []);
      setProgress(data.progress || { total_tasks: 0, completed_tasks: 0, percent: 0 });
      setAiBrief(data.ai_brief || null);
      setDailyPulse(data?.analytics?.daily_pulse || null);
      setPerformanceSummary(data?.analytics?.performance_summary || null);
      const pendingRecs = data?.analytics?.adaptive_engine?.interventions_pending;
      setRecommendations(Array.isArray(pendingRecs) ? pendingRecs : []);

      if (analyticsRes && analyticsRes.ok) {
        const analytics = await analyticsRes.json();
        setMasteryTopics(Array.isArray(analytics?.mastery_topics) ? analytics.mastery_topics : []);
        setScoreTrend(Array.isArray(analytics?.score_trend_30d) ? analytics.score_trend_30d : []);
      } else {
        // Fall back to mastery topics embedded in the detail analytics payload.
        const fallbackTopics = Array.isArray(data?.analytics?.mastery_topics) ? data.analytics.mastery_topics : [];
        const fallbackTrend = Array.isArray(data?.analytics?.score_trend_7d) ? data.analytics.score_trend_7d : [];
        setMasteryTopics(fallbackTopics);
        setScoreTrend(fallbackTrend);
      }
    } catch (error: any) {
      toast({
        title: 'Could not load studyset',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    setSavingTaskId(taskId);
    try {
      const response = await fetch(`/api/studysets/plan-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (!response.ok) throw new Error('Could not update task');

      setDays((prev) =>
        prev.map((day) => {
          const nextTasks = day.studyset_plan_tasks.map((task) =>
            task.id === taskId ? { ...task, completed } : task
          );
          const dayCompleted = nextTasks.length > 0 && nextTasks.every((task) => task.completed);
          return {
            ...day,
            completed: dayCompleted,
            studyset_plan_tasks: nextTasks,
          };
        })
      );

      setProgress((prev) => {
        const delta = completed ? 1 : -1;
        const nextCompleted = Math.max(0, Math.min(prev.total_tasks, prev.completed_tasks + delta));
        return {
          ...prev,
          completed_tasks: nextCompleted,
          percent: prev.total_tasks === 0 ? 0 : Math.round((nextCompleted / prev.total_tasks) * 100),
        };
      });
    } catch (error: any) {
      toast({
        title: 'Could not update task',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
      await loadDetail();
    } finally {
      setSavingTaskId(null);
    }
  };

  const respondToRecommendation = async (id: string, status: 'done' | 'dismissed') => {
    setRespondingId(id);
    try {
      const response = await fetch(`/api/studysets/interventions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Could not update recommendation');

      setRecommendations((prev) => prev.filter((rec) => rec.id !== id));
      toast({ title: status === 'done' ? 'Marked as done' : 'Recommendation dismissed' });
    } catch (error: any) {
      toast({
        title: 'Could not update recommendation',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setRespondingId(null);
    }
  };

  const deleteStudyset = async () => {
    if (!studysetId) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/studysets/${studysetId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete studyset');
      toast({ title: 'Studyset deleted' });
      router.push('/tools/studyset');
    } catch (error: any) {
      toast({
        title: 'Could not delete studyset',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const loadShareToken = async () => {
    if (!studysetId || shareToken) return;
    try {
      const response = await fetch(`/api/studysets/${studysetId}/share`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not generate share link');
      const data = await response.json();
      setShareToken(data.token);
    } catch (error: any) {
      toast({
        title: 'Could not generate share link',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    }
  };

  const copyShareUrl = async () => {
    if (!shareToken) return;
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/studyset/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
      toast({ title: 'Share link copied to clipboard' });
    } catch (error: any) {
      toast({
        title: 'Could not copy to clipboard',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studysetId]);

  const completedDays = useMemo(() => days.filter((day) => day.completed).length, [days]);

  const todayDay = useMemo(
    () => days.find((day) => (day.plan_date || '').slice(0, 10) === todayIso),
    [days, todayIso]
  );

  const fallbackDay = useMemo(() => days.find((day) => !day.completed) || days[0] || null, [days]);

  const focusDay = todayDay || fallbackDay;

  const todayTasks = focusDay?.studyset_plan_tasks ?? [];

  const weakTopicCount = useMemo(
    () => masteryTopics.filter((topic) => topic.weakness_score > topic.mastery_score).length,
    [masteryTopics]
  );

  const sparkPoints = useMemo(() => {
    const last7 = scoreTrend.slice(-7);
    if (last7.length === 0) return '';
    const w = 120;
    const h = 36;
    const max = 100;
    if (last7.length === 1) {
      const y = h - (Math.min(max, last7[0].avg_score) / max) * h;
      return `0,${y.toFixed(1)} ${w},${y.toFixed(1)}`;
    }
    return last7
      .map((point, index) => {
        const x = (index / (last7.length - 1)) * w;
        const y = h - (Math.min(max, point.avg_score) / max) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [scoreTrend]);

  const showPerformance = (adaptive?.avg_score ?? 0) > 0 || scoreTrend.length > 0;

  const examCountdown = useMemo(() => {
    const examDate = studyset?.exam_date;
    if (!examDate) return null;
    const exam = new Date(`${String(examDate).slice(0, 10)}T00:00:00`);
    const now = new Date(`${todayIso}T00:00:00`);
    const diff = Math.round((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { days: diff };
  }, [studyset?.exam_date, todayIso]);

  // Readiness ring math.
  const ringRadius = 30;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(100, Math.max(0, progress.percent)) / 100);

  const scrollToDay = (dayId: string) => {
    const node = dayRefs.current[dayId];
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const renderTaskCard = (task: StudysetTask) => {
    const { emoji, label } = toolMeta(task.task_type);
    const href = taskHref(task.task_type, String(studysetId), task.id);
    return (
      <div
        key={task.id}
        className="flex items-start gap-3 rounded-xl border border-border bg-white p-4"
      >
        <span className="mt-0.5 text-lg leading-none" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-sm ${
                task.completed ? 'text-muted-foreground line-through' : 'font-medium text-foreground'
              }`}
            >
              {task.title}
            </p>
            <Badge variant="outline" className="text-[10px]">
              {label}
            </Badge>
            {task.completed && <CheckCircle2 className="h-4 w-4 text-[var(--accent-brand)]" />}
          </div>
          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {task.task_type !== 'review' && (
            <Button asChild size="sm">
              <Link href={href}>Start</Link>
            </Button>
          )}
          <Checkbox
            checked={task.completed}
            disabled={savingTaskId === task.id}
            onCheckedChange={(checked) => {
              if (typeof checked !== 'boolean') return;
              void toggleTask(task.id, checked);
            }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <PageSection variant="tool">
        <div className="flex min-h-[55vh] items-center justify-center">
          <CautieLoader label="Loading study plan" sublabel="Preparing day-by-day tasks" size="lg" />
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection variant="tool">
      <RecentsLinksUpdater />

      {/* Recents breadcrumb */}
      <div className="mb-4">
        <RecentsBreadcrumb />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 shrink-0">
            <Link href="/tools/studyset" aria-label="Back to studysets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl leading-tight tracking-tight text-foreground">
            {studyset?.name || 'Studyset'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {studyset?.subject && (
            <span className="rounded-full bg-[#e8eddf] px-3 py-1 text-xs font-medium text-[#4a5735]">
              {studyset.subject}
            </span>
          )}
          {studyset?.status && (
            <Badge variant="outline" className="capitalize">
              {studyset.status}
            </Badge>
          )}
          <Button asChild variant="outline" size="icon" className="h-9 w-9" aria-label="Analytics">
            <Link href={`/tools/studyset/${studysetId}/analytics`}>
              <LineChart className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" className="h-9 w-9" aria-label="Changes">
            <Link href={`/tools/studyset/${studysetId}/changes`}>
              <History className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" className="h-9 w-9" aria-label="Settings">
            <Link href={`/tools/studyset/${studysetId}/settings`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => void loadDetail()}
            aria-label="Refresh"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Popover open={shareOpen} onOpenChange={setShareOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => void loadShareToken()}
                aria-label="Share studyset"
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="text-base mb-1">Share this studyset</h4>
                  <p className="text-xs text-muted-foreground">
                    Anyone with this link can view and copy this studyset.
                  </p>
                </div>
                {shareToken && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border">
                      <code className="text-xs flex-1 truncate font-mono text-muted-foreground">
                        /share/studyset/{shareToken}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => void copyShareUrl()}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button
                      asChild
                      variant="default"
                      className="w-full"
                      style={{ backgroundColor: '#6b7c4e' }}
                    >
                      <Link href={`/share/studyset/${shareToken}`} target="_blank">
                        Open share page
                      </Link>
                    </Button>
                    {shareCopied && (
                      <p className="text-xs text-green-600 text-center">✓ Copied!</p>
                    )}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 text-destructive"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete studyset"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${CARD} flex items-center gap-4`}>
          <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
            <circle cx="36" cy="36" r={ringRadius} fill="none" stroke="#e8eddf" strokeWidth="8" />
            <circle
              cx="36"
              cy="36"
              r={ringRadius}
              fill="none"
              stroke={readinessTone(progress.percent)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              transform="rotate(-90 36 36)"
            />
            <text x="36" y="41" textAnchor="middle" className="fill-foreground text-[15px]">
              {progress.percent}%
            </text>
          </svg>
          <div>
            <p className="text-[11px] text-muted-foreground">
              Readiness
            </p>
            <p className="text-sm text-muted-foreground">
              {progress.completed_tasks}/{progress.total_tasks} tasks
            </p>
          </div>
        </div>

        <div className={`${CARD} flex flex-col justify-center`}>
          <p className="text-[11px] text-muted-foreground">
            Sessions done
          </p>
          <p className="mt-1 text-3xl text-foreground">
            {completedDays}
            <span className="text-base font-normal text-muted-foreground">/{days.length}</span>
          </p>
          <p className="text-sm text-muted-foreground">study days complete</p>
        </div>

        <div className={`${CARD} flex flex-col justify-center`}>
          <p className="text-[11px] text-muted-foreground">
            Weak topics
          </p>
          <p className="mt-1 text-3xl text-foreground">{weakTopicCount}</p>
          <p className="text-sm text-muted-foreground">need attention</p>
        </div>
      </div>

      {/* Exam countdown */}
      {examCountdown && (
        <div
          className="rounded-2xl border p-5 shadow-sm"
          style={{
            backgroundColor:
              examCountdown.days <= 7 ? '#fbe9e7' : examCountdown.days <= 14 ? '#fdf3da' : '#e8eddf',
            borderColor:
              examCountdown.days <= 7 ? '#f1c4bf' : examCountdown.days <= 14 ? '#f0e0b0' : '#d4dcc2',
          }}
        >
          <p
            className="text-2xl"
            style={{
              color:
                examCountdown.days <= 7 ? '#9b3a32' : examCountdown.days <= 14 ? '#8a6a13' : '#4a5735',
            }}
          >
            {examCountdown.days < 0
              ? 'Exam has passed'
              : examCountdown.days === 0
                ? 'Exam is today'
                : `${examCountdown.days} day${examCountdown.days === 1 ? '' : 's'} until exam`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Current readiness: {progress.percent}%</p>
        </div>
      )}

      {/* AI Brief */}
      {aiBrief && (
        <section>
          <h2 className={SECTION_HEADING}>ai brief</h2>
          <div className={`${CARD} flex flex-wrap items-start justify-between gap-4`}>
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8eddf] text-[#4a5735]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-base text-foreground">{aiBrief.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{aiBrief.summary}</p>
                {dailyPulse?.focus_topics && dailyPulse.focus_topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {dailyPulse.focus_topics.slice(0, 4).map((topic, index) => (
                      <span
                        key={`${topic}-${index}`}
                        className="rounded-full bg-[#fdf3da] px-2.5 py-0.5 text-[11px] font-medium text-[#8a6a13] border border-[#f0e0b0]"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {aiBrief.recommendation?.href && (
              <Button asChild size="sm" className="shrink-0" style={{ backgroundColor: '#6b7c4e' }}>
                <Link href={aiBrief.recommendation.href}>Continue: {aiBrief.recommendation.taskTitle}</Link>
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Today's Plan */}
      <section>
        <h2 className={SECTION_HEADING}>today&apos;s plan</h2>
        {todayTasks.length === 0 ? (
          <div className={`${CARD} text-center`}>
            <p className="text-sm text-muted-foreground">All done for today 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {focusDay && (
              <p className="text-xs text-muted-foreground">
                Day {focusDay.day_number}
                {focusDay.plan_date
                  ? ` · ${format(new Date(`${focusDay.plan_date}T00:00:00`), 'EEEE, MMM d')}`
                  : ''}
                {focusDay.summary ? ` · ${focusDay.summary}` : ''}
              </p>
            )}
            {todayTasks.map(renderTaskCard)}
          </div>
        )}
      </section>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] text-muted-foreground">
              ai recommendations
            </h2>
            {performanceSummary?.momentum && (
              (() => {
                const { Icon: MomentumIcon, label, className } = momentumMeta(performanceSummary.momentum);
                return (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
                    <MomentumIcon className="h-3.5 w-3.5" />
                    {label}
                  </span>
                );
              })()
            )}
          </div>
          <div className="space-y-3">
            {recommendations.map((rec) => {
              const { Icon: KindIcon, label } = recommendationMeta(rec.kind);
              const busy = respondingId === rec.id;
              return (
                <div key={rec.id} className={`${CARD} flex items-start gap-3`}>
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8eddf] text-[#4a5735]">
                    <KindIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{rec.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {label}
                      </Badge>
                      {rec.priority >= 90 && (
                        <span className="rounded-full bg-[#fbe9e7] px-2 py-0.5 text-[10px] font-medium text-[#9b3a32] border border-[#f1c4bf]">
                          Urgent
                        </span>
                      )}
                    </div>
                    {rec.reason && <p className="mt-1 text-xs text-muted-foreground">{rec.reason}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {rec.launch_href && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={rec.launch_href}>Start</Link>
                      </Button>
                    )}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[var(--accent-brand)] hover:text-[var(--accent-brand)]"
                        disabled={busy}
                        onClick={() => void respondToRecommendation(rec.id, 'done')}
                        aria-label="Mark recommendation as done"
                        title="Mark as done"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={busy}
                        onClick={() => void respondToRecommendation(rec.id, 'dismissed')}
                        aria-label="Dismiss recommendation"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Weak Spots */}
      {masteryTopics.length > 0 && (
        <section>
          <h2 className={SECTION_HEADING}>weak spots</h2>
          <div className={CARD}>
            <div className="flex flex-wrap gap-2">
              {masteryTopics.map((topic, index) => (
                <span
                  key={`${topic.topic_label}-${index}`}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${chipTone(topic.weakness_score)}`}
                >
                  {topic.topic_label}
                </span>
              ))}
            </div>
            <div className="mt-4">
              <Button asChild size="sm" variant="outline">
                <Link href={`/tools/quiz?studysetId=${studysetId}&launch=1`}>Study weak spots</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Study Plan roadmap */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] text-muted-foreground">
            study plan
          </h2>
          <div className="flex items-center gap-1 rounded-full border border-border bg-white p-1">
            <button
              type="button"
              onClick={() => setPlanMode('today')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                planMode === 'today'
                  ? 'bg-[var(--accent-brand)] text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPlanMode('full')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                planMode === 'full'
                  ? 'bg-[var(--accent-brand)] text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Full plan
            </button>
          </div>
        </div>

        {planMode === 'today' ? (
          focusDay ? (
            <div
              className={CARD}
              ref={(node) => {
                dayRefs.current[focusDay.id] = node;
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Day {focusDay.day_number}
                  {focusDay.plan_date
                    ? ` · ${format(new Date(`${focusDay.plan_date}T00:00:00`), 'MMM d')}`
                    : ''}
                </p>
                <Badge variant={focusDay.completed ? 'default' : 'outline'}>
                  {focusDay.completed ? 'Completed' : 'In progress'}
                </Badge>
              </div>
              <div className="space-y-3">
                {focusDay.studyset_plan_tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks for this day.</p>
                ) : (
                  focusDay.studyset_plan_tasks.map(renderTaskCard)
                )}
              </div>
            </div>
          ) : (
            <div className={`${CARD} text-sm text-muted-foreground`}>No plan days yet.</div>
          )
        ) : (
          <div className="space-y-4">
            {/* Horizontal timeline */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {days.map((day) => {
                const total = day.studyset_plan_tasks.length;
                const done = day.studyset_plan_tasks.filter((task) => task.completed).length;
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => scrollToDay(day.id)}
                    className={`min-w-[120px] shrink-0 rounded-xl border p-3 text-left transition-colors ${
                      day.completed
                        ? 'border-[#d4dcc2] bg-[#e8eddf]'
                        : 'border-border bg-white hover:border-[var(--accent-brand)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground">Day {day.day_number}</span>
                      {day.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-[var(--accent-brand)]" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {day.plan_date
                        ? format(new Date(`${day.plan_date}T00:00:00`), 'MMM d')
                        : 'Unscheduled'}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {done}/{total} tasks
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Expanded day list */}
            <div className="space-y-4">
              {days.map((day) => (
                <div
                  key={day.id}
                  className={CARD}
                  ref={(node) => {
                    dayRefs.current[day.id] = node;
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      Day {day.day_number}
                      {day.plan_date
                        ? ` · ${format(new Date(`${day.plan_date}T00:00:00`), 'EEEE, MMM d')}`
                        : ''}
                    </p>
                    <Badge variant={day.completed ? 'default' : 'outline'}>
                      {day.completed ? 'Completed' : 'In progress'}
                    </Badge>
                  </div>
                  {day.summary && <p className="mb-3 text-xs text-muted-foreground">{day.summary}</p>}
                  <div className="space-y-3">
                    {day.studyset_plan_tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tasks for this day.</p>
                    ) : (
                      day.studyset_plan_tasks.map(renderTaskCard)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Performance */}
      {showPerformance && (
        <section>
          <h2 className={SECTION_HEADING}>performance</h2>
          <div className={CARD}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#e8eddf] px-3 py-1 text-sm font-medium text-[#4a5735]">
                  <Sparkles className="h-4 w-4" />
                  Avg score: {adaptive?.avg_score ?? 0}%
                </span>
                {adaptive?.mastery_band && (
                  <Badge variant="outline" className="capitalize">
                    {adaptive.mastery_band}
                  </Badge>
                )}
              </div>
              {sparkPoints && (
                <svg width="120" height="36" viewBox="0 0 120 36" className="shrink-0">
                  <polyline
                    points={sparkPoints}
                    fill="none"
                    stroke="var(--accent-brand)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            {adaptive?.last_issues && adaptive.last_issues.length > 0 && (
              <ul className="mt-4 space-y-1">
                {adaptive.last_issues.slice(0, 4).map((issue, index) => (
                  <li key={`${issue}-${index}`} className="text-xs text-muted-foreground">
                    • {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Materials */}
      <section>
        <h2 className={SECTION_HEADING}>materials</h2>
        <div className={CARD}>
          <MaterialsPanel studysetId={studysetId || ''} editable={true} />
        </div>
      </section>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this studyset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive &quot;{studyset?.name || 'this studyset'}&quot; and remove it from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void deleteStudyset();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageSection>
  );
}
