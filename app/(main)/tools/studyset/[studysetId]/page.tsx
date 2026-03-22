'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, RefreshCcw, Wand2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  confidence_level: string;
  target_days: number;
  minutes_per_day: number;
  status: string;
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

export default function StudysetDetailPage() {
  const params = useParams<{ studysetId: string }>();
  const studysetId = params?.studysetId;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [studyset, setStudyset] = useState<StudysetDetail | null>(null);
  const [days, setDays] = useState<StudysetDay[]>([]);
  const [progress, setProgress] = useState({ total_tasks: 0, completed_tasks: 0, percent: 0 });
  const [approval, setApproval] = useState<'pending' | 'approved' | 'changes'>('pending');
  const [changeRequest, setChangeRequest] = useState('');

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

  const regenerateWithChanges = async () => {
    if (!studysetId) return;
    setRegenerating(true);
    try {
      const response = await fetch(`/api/studysets/${studysetId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: changeRequest.trim() || 'Adjust the plan for better pacing.',
        }),
      });
      if (!response.ok) throw new Error('Could not regenerate plan');
      await loadDetail();
      setApproval('pending');
      setChangeRequest('');
      toast({ title: 'Plan regenerated', description: 'Your requested changes were applied.' });
    } catch (error: any) {
      toast({
        title: 'Could not regenerate plan',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setRegenerating(false);
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
                <Clock3 className="h-3 w-3" /> {studyset?.minutes_per_day || 0} min/day
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {completedDays}/{days.length} days complete
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progress.percent} />
            <p className="text-sm text-muted-foreground">
              {progress.completed_tasks}/{progress.total_tasks} tasks completed ({progress.percent}%)
            </p>
          </CardContent>
        </Card>

        <Card className="border-none">
          <CardHeader>
            <CardTitle className="text-base">Plan review</CardTitle>
            <CardDescription>Approve this plan or request changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={approval === 'approved' ? 'default' : 'outline'}
                onClick={() => setApproval('approved')}
              >
                Looks good
              </Button>
              <Button
                size="sm"
                variant={approval === 'changes' ? 'default' : 'outline'}
                onClick={() => setApproval('changes')}
              >
                Needs changes
              </Button>
            </div>

            {approval === 'changes' && (
              <div className="space-y-2">
                <Textarea
                  value={changeRequest}
                  onChange={(event) => setChangeRequest(event.target.value)}
                  placeholder="Describe what should change (pace, tool mix, focus topics)..."
                  className="min-h-[120px]"
                />
                <Button onClick={() => void regenerateWithChanges()} disabled={regenerating}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  {regenerating ? 'Regenerating...' : 'Regenerate with changes'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex min-h-[45vh] items-center justify-center">
            <CautieLoader label="Loading study plan" sublabel="Preparing day-by-day tasks" size="lg" />
          </div>
        ) : days.length === 0 ? (
          <Card className="border-none">
            <CardContent className="p-6 text-sm text-muted-foreground">
              No plan days yet. Generate a plan from the Studyset overview first.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {days.map((day, index) => (
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
                    {day.estimated_minutes} min · {day.summary || 'Study session'}
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
                          : `${TOOL_HREFS[task.task_type] || '/tools/notes'}?studysetId=${studysetId}&taskId=${task.id}`;

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
                                <Badge variant="outline" className="bg-card">
                                  {toolLabel(task.task_type)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {task.estimated_minutes} min
                              </p>
                              {task.description && (
                                <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                              )}
                            </div>
                            <Button asChild size="sm" variant="outline">
                              <Link href={href}>Start now</Link>
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
