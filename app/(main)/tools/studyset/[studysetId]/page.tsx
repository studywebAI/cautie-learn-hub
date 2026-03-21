'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarDays, Clock3, CheckCircle2 } from 'lucide-react';
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
  confidence_level: string;
  target_days: number;
  minutes_per_day: number;
  status: string;
};

export default function StudysetDetailPage() {
  const params = useParams<{ studysetId: string }>();
  const studysetId = params?.studysetId;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [studyset, setStudyset] = useState<StudysetDetail | null>(null);
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
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>{studyset?.name || 'Studyset'}</span>
              {studyset?.status && <Badge variant="outline">{studyset.status}</Badge>}
            </CardTitle>
            <CardDescription className="flex flex-wrap gap-4 text-xs">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {studyset?.target_days || 0} days</span>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {studyset?.minutes_per_day || 0} min/day</span>
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {completedDays}/{days.length} days complete</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progress.percent} />
            <p className="text-sm text-muted-foreground">
              {progress.completed_tasks}/{progress.total_tasks} tasks completed ({progress.percent}%)
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading studyset...</CardContent>
          </Card>
        ) : days.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No plan days yet. Generate a plan from the Studyset overview first.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {days.map((day) => (
              <Card key={day.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span>Day {day.day_number}</span>
                    <Badge variant={day.completed ? 'default' : 'outline'}>
                      {day.completed ? 'Completed' : 'In progress'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {(day.plan_date || 'No date')} · {day.estimated_minutes} min · {day.summary || 'Study session'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {day.studyset_plan_tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks for this day.</p>
                  ) : (
                    day.studyset_plan_tasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-3 rounded-md border p-3">
                        <Checkbox
                          checked={task.completed}
                          disabled={savingTaskId === task.id}
                          onCheckedChange={(checked) => {
                            if (typeof checked !== 'boolean') return;
                            void toggleTask(task.id, checked);
                          }}
                        />
                        <div className="flex-1">
                          <p className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.task_type} · {task.estimated_minutes} min
                          </p>
                          {task.description && (
                            <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                      </div>
                    ))
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
