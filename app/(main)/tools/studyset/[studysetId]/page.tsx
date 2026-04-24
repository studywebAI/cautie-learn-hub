'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, CalendarDays, CheckCircle2, RefreshCcw, Send, Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { useToast } from '@/hooks/use-toast';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

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
  meta?: {
    icon?: string | null;
    color?: string | null;
  };
};

type StudysetAdaptive = {
  avg_score: number;
  mastery_band: string;
  last_issues: string[];
  updated_at?: string | null;
};

type TaskMetric = {
  attempts: number;
  latest_score: number;
  latest_correct_items: number;
  latest_total_items: number;
  last_attempt_at: string | null;
};

type StudysetAIBrief = {
  title?: string;
  summary?: string;
  recommendation?: {
    tool?: string;
    taskTitle?: string;
    href?: string | null;
    dayNumber?: number;
  } | null;
};

type StudysetAnalytics = {
  completion_percent: number;
  completed_tasks: number;
  total_tasks: number;
  completed_days: number;
  total_days: number;
  due_today_tasks: number;
  avg_score: number;
  score_trend_7d: Array<{ date: string; avg_score: number; attempts: number }>;
  tool_breakdown: Array<{
    tool: string;
    total_tasks: number;
    completed_tasks: number;
    completion_percent: number;
    avg_score: number;
  }>;
  mastery_topics: Array<{
    topic_label: string;
    weakness_score: number;
    mastery_score: number;
    exposure_count: number;
    updated_at: string | null;
  }>;
  mastery_risk: Array<{
    topic_label: string;
    risk_score: number;
    weakness_score: number;
    mastery_score: number;
  }>;
  performance_summary?: {
    weakest_tool?: {
      tool: string;
      avg_score: number;
      completion_percent: number;
      total_tasks: number;
      completed_tasks: number;
    } | null;
    strongest_tool?: {
      tool: string;
      avg_score: number;
      completion_percent: number;
      total_tasks: number;
      completed_tasks: number;
    } | null;
    momentum?: 'up' | 'down' | 'flat' | string;
    momentum_delta?: number;
    recent3_avg?: number;
    prior3_avg?: number;
  };
  pace: {
    recent_attempts_7d: number;
    pending_tasks: number;
    pending_days: number;
    forecast_finish_date: string | null;
  };
  adaptive_engine?: {
    tool_profiles?: Array<{
      id: string;
      tool_key: string;
      attempts_count: number;
      avg_score: number;
      recent_avg_score: number;
      mastery_band: 'weak' | 'developing' | 'strong' | string;
      momentum: 'down' | 'flat' | 'up' | string;
      momentum_delta: number;
      recommended_action: 'reinforce' | 'stabilize' | 'challenge' | string;
      updated_at: string;
    }>;
    interventions_pending?: Array<{
      id: string;
      kind: 'retry' | 'focus' | 'challenge' | string;
      tool_key?: string | null;
      title: string;
      reason: string;
      priority: number;
      due_date?: string | null;
      status?: string;
      created_at?: string | null;
      task_id?: string | null;
      task_type?: string | null;
      task_title?: string | null;
      day_number?: number | null;
      plan_date?: string | null;
      launch_href?: string | null;
    }>;
    generated_at?: string;
  };
  daily_pulse?: {
    id: string;
    pulse_date: string;
    completion_percent: number;
    avg_score: number;
    pending_tasks: number;
    pending_interventions: number;
    weakest_tool?: string | null;
    focus_topics?: string[];
    recommended_tools?: Array<{
      tool?: string;
      avg_score?: number;
      action?: string;
      pending_tasks?: number;
    }>;
    summary?: string;
    updated_at?: string | null;
  } | null;
};

type StudysetDeepAnalytics = {
  score_trend_30d: Array<{ date: string; avg_score: number; attempts: number }>;
};

const TOOL_HREFS: Record<string, string> = {
  notes: '/tools/notes',
  flashcards: '/tools/flashcards',
  quiz: '/tools/quiz',
  wordweb: '/tools/notes',
  review: '/tools/studyset',
};

function toolLabel(taskType: string) {
  if (taskType === 'flashcards') return 'Flashcards';
  if (taskType === 'wordweb') return 'Concept map';
  if (taskType === 'quiz') return 'Quiz';
  if (taskType === 'review') return 'Review';
  return 'Notes';
}

function toIsoLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shortTopicLabel(input: string, max = 20) {
  const value = String(input || '').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

export default function StudysetDetailPage() {
  const params = useParams<{ studysetId: string }>();
  const studysetId = params?.studysetId;
  const { toast } = useToast();
  const todayIso = useMemo(() => toIsoLocalDate(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [showAllDays, setShowAllDays] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [studyset, setStudyset] = useState<StudysetDetail | null>(null);
  const [adaptive, setAdaptive] = useState<StudysetAdaptive | null>(null);
  const [analytics, setAnalytics] = useState<StudysetAnalytics | null>(null);
  const [deepAnalytics, setDeepAnalytics] = useState<StudysetDeepAnalytics | null>(null);
  const [loadingDeepAnalytics, setLoadingDeepAnalytics] = useState(false);
  const [aiBrief, setAiBrief] = useState<StudysetAIBrief | null>(null);
  const [days, setDays] = useState<StudysetDay[]>([]);
  const [progress, setProgress] = useState({ total_tasks: 0, completed_tasks: 0, percent: 0 });
  const [taskMetrics, setTaskMetrics] = useState<Record<string, TaskMetric>>({});
  const [nextTaskHref, setNextTaskHref] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [updatingInterventionId, setUpdatingInterventionId] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!studysetId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/studysets/${studysetId}`);
      if (!response.ok) throw new Error('Could not load studyset');
      const data = await response.json();
      setStudyset(data.studyset || null);
      setAdaptive(data.adaptive || null);
      setAnalytics((data?.analytics && typeof data.analytics === 'object') ? data.analytics : null);
      setAiBrief(data.ai_brief || null);
      setDays(data.days || []);
      setTaskMetrics((data?.task_metrics && typeof data.task_metrics === 'object') ? data.task_metrics : {});
      setNextTaskHref(typeof data?.next_task_href === 'string' ? data.next_task_href : null);
      setProgress(data.progress || { total_tasks: 0, completed_tasks: 0, percent: 0 });
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

  useEffect(() => {
    void loadDetail();
  }, [studysetId]);

  useEffect(() => {
    if (!showAnalytics || !studysetId) return;
    let active = true;
    const run = async () => {
      setLoadingDeepAnalytics(true);
      try {
        const response = await fetch(`/api/studysets/${studysetId}/analytics`, { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Could not load deep analytics');
        if (!active) return;
        setDeepAnalytics({
          score_trend_30d: Array.isArray(data?.score_trend_30d) ? data.score_trend_30d : [],
        });
      } catch {
        if (active) setDeepAnalytics({ score_trend_30d: [] });
      } finally {
        if (active) setLoadingDeepAnalytics(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [showAnalytics, studysetId]);

  const completedDays = useMemo(() => days.filter((day) => day.completed).length, [days]);

  const todayDay = useMemo(
    () => days.find((day) => (day.plan_date || '').slice(0, 10) === todayIso),
    [days, todayIso]
  );

  const fallbackDay = useMemo(() => days.find((day) => !day.completed) || days[0] || null, [days]);

  const visibleDays = useMemo(() => {
    if (showAllDays) return days;
    const day = todayDay || fallbackDay;
    return day ? [day] : [];
  }, [days, fallbackDay, showAllDays, todayDay]);

  const scoreTrendChartData = useMemo(
    () =>
      (analytics?.score_trend_7d || []).map((row) => ({
        date: row.date.slice(5),
        score: Number(row.avg_score || 0),
        attempts: Number(row.attempts || 0),
      })),
    [analytics?.score_trend_7d]
  );
  const scoreTrend30dChartData = useMemo(
    () =>
      (deepAnalytics?.score_trend_30d || []).map((row) => ({
        date: row.date.slice(5),
        score: Number(row.avg_score || 0),
        attempts: Number(row.attempts || 0),
      })),
    [deepAnalytics?.score_trend_30d]
  );

  const dayCompletionChartData = useMemo(
    () =>
      days.map((day) => {
        const tasks = Array.isArray(day.studyset_plan_tasks) ? day.studyset_plan_tasks : [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((task) => task.completed).length;
        return {
          day: `D${day.day_number}`,
          completion: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          completed: completedTasks,
          total: totalTasks,
        };
      }),
    [days]
  );

  const masteryRiskChartData = useMemo(
    () =>
      (analytics?.mastery_risk || []).slice(0, 8).map((row) => ({
        topic: shortTopicLabel(row.topic_label, 18),
        risk: Number(row.risk_score || 0),
      })),
    [analytics?.mastery_risk]
  );

  const toolPerformanceChartData = useMemo(
    () =>
      (analytics?.tool_breakdown || []).map((row) => ({
        tool: toolLabel(row.tool),
        completion: Number(row.completion_percent || 0),
        score: Number(row.avg_score || 0),
      })),
    [analytics?.tool_breakdown]
  );

  const scoreChartConfig: ChartConfig = {
    score: { label: 'Avg score', color: 'hsl(var(--chart-1))' },
  };

  const dayChartConfig: ChartConfig = {
    completion: { label: 'Day completion', color: 'hsl(var(--chart-2))' },
  };

  const masteryRiskChartConfig: ChartConfig = {
    risk: { label: 'Risk score', color: 'hsl(var(--chart-4))' },
  };

  const toolPerformanceChartConfig: ChartConfig = {
    completion: { label: 'Completion', color: 'hsl(var(--chart-2))' },
    score: { label: 'Avg score', color: 'hsl(var(--chart-1))' },
  };

  const handleShare = async () => {
    if (!studysetId || shareLoading) return;
    setShareLoading(true);
    try {
      const response = await fetch(`/api/studysets/${studysetId}/share`, { method: 'POST' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.token) throw new Error(json?.error || 'Could not create share link');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${origin}/tools/studyset/import?token=${encodeURIComponent(String(json.token))}`;
      await navigator.clipboard.writeText(link);
      toast({ title: 'Share link copied', description: 'You can now send this link by email.' });
      const subject = encodeURIComponent(`Studyset: ${studyset?.name || 'Shared plan'}`);
      const body = encodeURIComponent(`Import this studyset:\n${link}`);
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Share failed',
        description: error?.message || 'Try again.',
      });
    } finally {
      setShareLoading(false);
    }
  };

  const updateInterventionStatus = async (interventionId: string, status: 'done' | 'dismissed') => {
    if (!interventionId || updatingInterventionId) return;
    setUpdatingInterventionId(interventionId);
    try {
      const response = await fetch(`/api/studysets/interventions/${interventionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || 'Could not update intervention');

      setAnalytics((prev) => {
        if (!prev) return prev;
        const current = prev.adaptive_engine?.interventions_pending || [];
        return {
          ...prev,
          adaptive_engine: {
            ...(prev.adaptive_engine || {}),
            interventions_pending: current.filter((row) => row.id !== interventionId),
          },
        };
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Intervention update failed',
        description: error?.message || 'Try again.',
      });
    } finally {
      setUpdatingInterventionId(null);
    }
  };

  const getDayTimingState = (planDate?: string | null) => {
    const normalized = String(planDate || '').slice(0, 10);
    if (!normalized) return 'today' as const;
    if (normalized > todayIso) return 'future' as const;
    if (normalized < todayIso) return 'past' as const;
    return 'today' as const;
  };

  return (
    <div className="h-full overflow-auto">
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/tools/studyset">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Studysets
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void loadDetail()} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Card className="border-none">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>{studyset?.name || 'Studyset'}</span>
              {studyset?.status && <Badge variant="outline">{studyset.status}</Badge>}
            </CardTitle>
            <CardDescription className="flex flex-wrap gap-4 text-xs">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> {studyset?.target_days || 0} days
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {completedDays}/{days.length} days complete
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progress.percent} />
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {progress.completed_tasks}/{progress.total_tasks} tasks completed ({progress.percent}%)
              </p>
              <div className="flex items-center gap-2">
                {nextTaskHref && (
                  <Button size="sm" variant="default" asChild>
                    <Link href={nextTaskHref}>
                      <Play className="mr-2 h-3.5 w-3.5" />
                      Keep going
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => void handleShare()} disabled={shareLoading}>
                  <Send className="mr-2 h-3.5 w-3.5" />
                  {shareLoading ? 'Preparing...' : 'Share'}
                </Button>
                <Button size="sm" variant={showAnalytics ? 'default' : 'outline'} onClick={() => setShowAnalytics((value) => !value)}>
                  {showAnalytics ? 'Hide analytics' : 'Analytics'}
                </Button>
                <Button size="sm" variant={showAllDays ? 'outline' : 'default'} onClick={() => setShowAllDays(false)}>
                  Today
                </Button>
                <Button size="sm" variant={showAllDays ? 'default' : 'outline'} onClick={() => setShowAllDays(true)}>
                  All days
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {adaptive && (adaptive.last_issues?.length > 0 || adaptive.avg_score > 0) && (
          <Card className="border-none">
            <CardHeader>
              <CardTitle className="text-base">Adaptive coach</CardTitle>
              <CardDescription>
                Avg score: {adaptive.avg_score || 0}% {adaptive.mastery_band ? `| ${adaptive.mastery_band}` : ''}
              </CardDescription>
            </CardHeader>
            {adaptive.last_issues?.length > 0 && (
              <CardContent className="space-y-1 pt-0">
                {adaptive.last_issues.slice(0, 4).map((issue, index) => (
                  <p key={`${issue}-${index}`} className="text-xs text-muted-foreground">
                    {issue}
                  </p>
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {showAnalytics && analytics && (
          <Card className="border-none">
            <CardHeader>
              <CardTitle className="text-base">Studyset analytics</CardTitle>
              <CardDescription>
                {analytics.completed_tasks}/{analytics.total_tasks} tasks complete | {analytics.completed_days}/{analytics.total_days} days complete
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-background p-2">
                  <p className="text-[11px] text-muted-foreground">Completion</p>
                  <p className="text-sm font-medium">{analytics.completion_percent}%</p>
                </div>
                <div className="rounded-lg bg-background p-2">
                  <p className="text-[11px] text-muted-foreground">Due today</p>
                  <p className="text-sm font-medium">{analytics.due_today_tasks}</p>
                </div>
                <div className="rounded-lg bg-background p-2">
                  <p className="text-[11px] text-muted-foreground">Average score</p>
                  <p className="text-sm font-medium">{analytics.avg_score}%</p>
                </div>
              </div>

              {analytics.pace && (
                <div className="grid gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-background p-2">
                    <p className="text-[11px] text-muted-foreground">Attempts (7d)</p>
                    <p className="text-sm font-medium">{analytics.pace.recent_attempts_7d}</p>
                  </div>
                  <div className="rounded-lg bg-background p-2">
                    <p className="text-[11px] text-muted-foreground">Pending tasks</p>
                    <p className="text-sm font-medium">{analytics.pace.pending_tasks}</p>
                  </div>
                  <div className="rounded-lg bg-background p-2">
                    <p className="text-[11px] text-muted-foreground">Pending days</p>
                    <p className="text-sm font-medium">{analytics.pace.pending_days}</p>
                  </div>
                  <div className="rounded-lg bg-background p-2">
                    <p className="text-[11px] text-muted-foreground">Forecast finish</p>
                    <p className="text-sm font-medium">
                      {analytics.pace.forecast_finish_date || 'Not set'}
                    </p>
                  </div>
                </div>
              )}

              {analytics.performance_summary && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-background p-2">
                    <p className="text-[11px] text-muted-foreground">Momentum</p>
                    <p className="text-sm font-medium">
                      {String(analytics.performance_summary.momentum || 'flat').toUpperCase()}
                      {typeof analytics.performance_summary.momentum_delta === 'number'
                        ? ` (${analytics.performance_summary.momentum_delta >= 0 ? '+' : ''}${analytics.performance_summary.momentum_delta})`
                        : ''}
                    </p>
                  </div>
                  <div className="rounded-lg bg-background p-2">
                    <p className="text-[11px] text-muted-foreground">Weakest tool</p>
                    <p className="text-sm font-medium">
                      {analytics.performance_summary.weakest_tool
                        ? `${toolLabel(analytics.performance_summary.weakest_tool.tool)} (${analytics.performance_summary.weakest_tool.avg_score}%)`
                        : 'n/a'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-background p-2">
                    <p className="text-[11px] text-muted-foreground">Strongest tool</p>
                    <p className="text-sm font-medium">
                      {analytics.performance_summary.strongest_tool
                        ? `${toolLabel(analytics.performance_summary.strongest_tool.tool)} (${analytics.performance_summary.strongest_tool.avg_score}%)`
                        : 'n/a'}
                    </p>
                  </div>
                </div>
              )}

              {analytics.score_trend_7d.length > 0 && (
                <div className="rounded-lg bg-background p-2">
                  <p className="mb-1 text-[11px] text-muted-foreground">Last 7 days score trend</p>
                  <ChartContainer config={scoreChartConfig} className="h-44 w-full">
                    <LineChart data={scoreTrendChartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={26} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ChartContainer>
                </div>
              )}

              <div className="rounded-lg bg-background p-2">
                <p className="mb-1 text-[11px] text-muted-foreground">Last 30 days score trend</p>
                {loadingDeepAnalytics ? (
                  <p className="text-xs text-muted-foreground">Loading 30-day trend...</p>
                ) : scoreTrend30dChartData.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No 30-day trend data yet.</p>
                ) : (
                  <ChartContainer config={scoreChartConfig} className="h-44 w-full">
                    <LineChart data={scoreTrend30dChartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={26} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                )}
              </div>

              {dayCompletionChartData.length > 0 && (
                <div className="rounded-lg bg-background p-2">
                  <p className="mb-1 text-[11px] text-muted-foreground">Day completion</p>
                  <ChartContainer config={dayChartConfig} className="h-44 w-full">
                    <BarChart data={dayCompletionChartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={26} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="completion" fill="var(--color-completion)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}

              {masteryRiskChartData.length > 0 && (
                <div className="rounded-lg bg-background p-2">
                  <p className="mb-1 text-[11px] text-muted-foreground">Mastery risk (Step 3)</p>
                  <ChartContainer config={masteryRiskChartConfig} className="h-52 w-full">
                    <BarChart data={masteryRiskChartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="topic" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} width={26} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="risk" fill="var(--color-risk)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}

              {toolPerformanceChartData.length > 0 && (
                <div className="rounded-lg bg-background p-2">
                  <p className="mb-1 text-[11px] text-muted-foreground">Tool performance (Step 4)</p>
                  <ChartContainer config={toolPerformanceChartConfig} className="h-52 w-full">
                    <BarChart data={toolPerformanceChartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="tool" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={26} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="completion" fill="var(--color-completion)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="score" fill="var(--color-score)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}

              {analytics.adaptive_engine && (
                <div className="space-y-2 rounded-lg bg-background p-2">
                  <p className="text-[11px] text-muted-foreground">Intervention queue (Step 5)</p>
                  {(analytics.adaptive_engine.tool_profiles || []).length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(analytics.adaptive_engine.tool_profiles || []).slice(0, 3).map((profile) => (
                        <div key={profile.id} className="rounded-lg border p-2">
                          <p className="text-xs font-medium">{toolLabel(profile.tool_key)}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {profile.avg_score}% avg - {profile.mastery_band} - {profile.momentum}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Action: {profile.recommended_action}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {(analytics.adaptive_engine.interventions_pending || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active interventions right now.</p>
                  ) : (
                    <div className="space-y-2">
                      {(analytics.adaptive_engine.interventions_pending || []).slice(0, 8).map((item) => (
                        <div key={item.id} className="rounded-lg border p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium">{item.title}</p>
                            <Badge variant="outline">P{item.priority}</Badge>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{item.reason}</p>
                          <div className="mt-2 flex items-center gap-2">
                            {item.launch_href && (
                              <Button asChild size="sm" variant="outline">
                                <Link href={item.launch_href}>Keep going</Link>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingInterventionId === item.id}
                              onClick={() => void updateInterventionStatus(item.id, 'done')}
                            >
                              Done
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={updatingInterventionId === item.id}
                              onClick={() => void updateInterventionStatus(item.id, 'dismissed')}
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {analytics.daily_pulse && (
                <div className="space-y-2 rounded-lg bg-background p-2">
                  <p className="text-[11px] text-muted-foreground">Daily pulse</p>
                  <p className="text-xs text-muted-foreground">
                    {analytics.daily_pulse.summary || 'No pulse summary yet.'}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <div className="rounded-lg border p-2">
                      <p className="text-[11px] text-muted-foreground">Pulse date</p>
                      <p className="text-sm font-medium">{analytics.daily_pulse.pulse_date || 'n/a'}</p>
                    </div>
                    <div className="rounded-lg border p-2">
                      <p className="text-[11px] text-muted-foreground">Weakest tool</p>
                      <p className="text-sm font-medium">
                        {analytics.daily_pulse.weakest_tool ? toolLabel(analytics.daily_pulse.weakest_tool) : 'n/a'}
                      </p>
                    </div>
                    <div className="rounded-lg border p-2">
                      <p className="text-[11px] text-muted-foreground">Pending tasks</p>
                      <p className="text-sm font-medium">{Number(analytics.daily_pulse.pending_tasks || 0)}</p>
                    </div>
                    <div className="rounded-lg border p-2">
                      <p className="text-[11px] text-muted-foreground">Queue</p>
                      <p className="text-sm font-medium">{Number(analytics.daily_pulse.pending_interventions || 0)}</p>
                    </div>
                  </div>
                  {Array.isArray(analytics.daily_pulse.focus_topics) && analytics.daily_pulse.focus_topics.length > 0 && (
                    <div className="rounded-lg border p-2">
                      <p className="text-[11px] text-muted-foreground">Focus topics</p>
                      <p className="text-xs">{analytics.daily_pulse.focus_topics.slice(0, 4).join(', ')}</p>
                    </div>
                  )}
                  {Array.isArray(analytics.daily_pulse.recommended_tools) && analytics.daily_pulse.recommended_tools.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-3">
                      {analytics.daily_pulse.recommended_tools.slice(0, 3).map((item, idx) => (
                        <div key={`${String(item?.tool || 'tool')}-${idx}`} className="rounded-lg border p-2">
                          <p className="text-xs font-medium">{toolLabel(String(item?.tool || 'notes'))}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Score {Number(item?.avg_score || 0)}% - {String(item?.action || 'stabilize')}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Pending {Number(item?.pending_tasks || 0)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {aiBrief && (
          <Card className="border-none">
            <CardHeader>
              <CardTitle className="text-base">{aiBrief.title || 'Daily AI Focus'}</CardTitle>
              <CardDescription>{aiBrief.summary || 'Start with your next incomplete task.'}</CardDescription>
            </CardHeader>
            {aiBrief.recommendation?.href && (
              <CardContent className="pt-0">
                <Button asChild size="sm" variant="outline">
                  <Link href={String(aiBrief.recommendation.href)}>Keep going</Link>
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        {loading ? (
          <div className="flex min-h-[45vh] items-center justify-center">
            <CautieLoader label="Loading study plan" sublabel="Preparing day-by-day tasks" size="lg" />
          </div>
        ) : visibleDays.length === 0 ? (
          <Card className="border-none">
            <CardContent className="p-6 text-sm text-muted-foreground">No plan days yet.</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleDays.map((day, index) => (
              <Card key={day.id} className="border-none studyset-day-card" style={{ animationDelay: `${index * 55}ms` }}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span>
                      Day {day.day_number}
                      {day.plan_date ? ` - ${format(new Date(`${day.plan_date}T00:00:00`), 'EEEE, MMM d')}` : ''}
                    </span>
                    <Badge variant={day.completed ? 'default' : 'outline'}>
                      {day.completed
                        ? 'Completed'
                        : getDayTimingState(day.plan_date) === 'future'
                          ? 'Upcoming'
                          : getDayTimingState(day.plan_date) === 'past'
                            ? 'Due'
                            : 'In progress'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{day.summary || 'Study session'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {day.studyset_plan_tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks for this day.</p>
                  ) : (
                    day.studyset_plan_tasks.map((task) => {
                      const isFutureDay = getDayTimingState(day.plan_date) === 'future';
                      const metric = taskMetrics[task.id];
                      const href =
                        task.task_type === 'review'
                          ? `/tools/studyset/${studysetId}`
                          : `${TOOL_HREFS[task.task_type] || '/tools/notes'}?studysetId=${studysetId}&taskId=${task.id}&launch=1`;

                      return (
                        <div key={task.id} className="rounded-xl bg-background p-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={task.completed}
                              disabled={savingTaskId === task.id || isFutureDay}
                              onCheckedChange={(checked) => {
                                if (typeof checked !== 'boolean') return;
                                void toggleTask(task.id, checked);
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                                  {task.title}
                                </p>
                                <Badge variant="outline" className="bg-card">
                                  {toolLabel(task.task_type)}
                                </Badge>
                              </div>
                              {task.description && <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>}
                              {metric && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  Last: {metric.latest_correct_items}/{metric.latest_total_items || 0} | {metric.latest_score}% | {metric.attempts} attempt{metric.attempts === 1 ? '' : 's'}
                                </p>
                              )}
                            </div>
                            <Button asChild size="sm" variant="outline" disabled={isFutureDay}>
                              <Link
                                href={href}
                                onClick={() => {
                                  if (isFutureDay) return;
                                  console.info('[STUDYSET_TASK] keep going clicked', {
                                    studysetId,
                                    taskId: task.id,
                                    taskType: task.task_type,
                                    href,
                                    completed: task.completed,
                                  });
                                }}
                              >
                                {isFutureDay ? 'Locked' : 'Keep going'}
                              </Link>
                            </Button>
                          </div>
                          {isFutureDay && (
                            <p className="mt-2 text-[11px] text-muted-foreground">This task unlocks on its scheduled day.</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
