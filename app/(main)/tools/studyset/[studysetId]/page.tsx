'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, CalendarDays, CheckCircle2, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { useToast } from '@/hooks/use-toast';

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
};

type StudysetAdaptive = {
  avg_score: number;
  mastery_band: string;
  last_issues: string[];
  updated_at?: string | null;
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

export default function StudysetDetailPage() {
  const params = useParams<{ studysetId: string }>();
  const studysetId = params?.studysetId;
  const { toast } = useToast();
  const todayIso = useMemo(() => toIsoLocalDate(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [showAllDays, setShowAllDays] = useState(false);
  const [studyset, setStudyset] = useState<StudysetDetail | null>(null);
  const [adaptive, setAdaptive] = useState<StudysetAdaptive | null>(null);
  const [days, setDays] = useState<StudysetDay[]>([]);
  const [progress, setProgress] = useState({ total_tasks: 0, completed_tasks: 0, percent: 0 });

  const loadDetail = async () => {
    if (!studysetId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/studysets/${studysetId}`);
      if (!response.ok) throw new Error('Could not load studyset');
      const data = await response.json();
      setStudyset(data.studyset || null);
      setAdaptive(data.adaptive || null);
      setDays(data.days || []);
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

  const completedDays = useMemo(() => days.filter((day) => day.completed).length, [days]);

  const todayDay = useMemo(
    () => days.find((day) => (day.plan_date || '').slice(0, 10) === todayIso),
    [days, todayIso]
  );

  const fallbackDay = useMemo(
    () => days.find((day) => !day.completed) || days[0] || null,
    [days]
  );

  const visibleDays = useMemo(() => {
    if (showAllDays) return days;
    const day = todayDay || fallbackDay;
    return day ? [day] : [];
  }, [days, fallbackDay, showAllDays, todayDay]);

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
                <Button
                  size="sm"
                  variant={showAllDays ? 'outline' : 'default'}
                  onClick={() => setShowAllDays(false)}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant={showAllDays ? 'default' : 'outline'}
                  onClick={() => setShowAllDays(true)}
                >
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
                Avg score: {adaptive.avg_score || 0}% {adaptive.mastery_band ? `· ${adaptive.mastery_band}` : ''}
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

        {loading ? (
          <div className="flex min-h-[45vh] items-center justify-center">
            <CautieLoader label="Loading study plan" sublabel="Preparing day-by-day tasks" size="lg" />
          </div>
        ) : visibleDays.length === 0 ? (
          <Card className="border-none">
            <CardContent className="p-6 text-sm text-muted-foreground">
              No plan days yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleDays.map((day, index) => (
              <Card
                key={day.id}
                className="border-none studyset-day-card"
                style={{ animationDelay: `${index * 55}ms` }}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span>
                      Day {day.day_number}
                      {day.plan_date ? ` - ${format(new Date(`${day.plan_date}T00:00:00`), 'EEEE, MMM d')}` : ''}
                    </span>
                    <Badge variant={day.completed ? 'default' : 'outline'}>
                      {day.completed ? 'Completed' : 'In progress'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {day.summary || 'Study session'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {day.studyset_plan_tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks for this day.</p>
                  ) : (
                    day.studyset_plan_tasks.map((task) => {
                      const href =
                        task.task_type === 'review'
                          ? `/tools/studyset/${studysetId}`
                          : `${TOOL_HREFS[task.task_type] || '/tools/notes'}?studysetId=${studysetId}&taskId=${task.id}&launch=1`;

                      return (
                        <div key={task.id} className="rounded-xl bg-background p-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={task.completed}
                              disabled={savingTaskId === task.id}
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
                                <Badge variant="outline" className="surface-panel">
                                  {toolLabel(task.task_type)}
                                </Badge>
                              </div>
                              {task.description && (
                                <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                              )}
                            </div>
                            <Button asChild size="sm" variant="outline">
                              <Link
                                href={href}
                                onClick={() => {
                                  console.info('[STUDYSET_TASK] start now clicked', {
                                    studysetId,
                                    taskId: task.id,
                                    taskType: task.task_type,
                                    href,
                                    completed: task.completed,
                                  });
                                }}
                              >
                                Start now
                              </Link>
                            </Button>
                          </div>
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
