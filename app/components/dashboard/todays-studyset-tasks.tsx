'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Route, ArrowRight, Flame, Calendar } from 'lucide-react';

type StudysetLaunchpadItem = {
  id: string;
  title: string;
  subject: string | null;
  exam_date: string | null;
  exam_days_left: number | null;
  streak: number;
  updated_at: string;
  progress: {
    completed_tasks: number;
    total_tasks: number;
    percent: number;
  };
  due_today_tasks: number;
  pending_interventions: number;
  next_action_href?: string | null;
  next_action_type?: 'intervention' | 'task' | null;
  next_action_label?: string;
  analytics_href: string;
};

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

function ExamChip({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0) return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"><Calendar className="h-3 w-3" />Exam overdue</span>;
  if (daysLeft === 0) return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"><Calendar className="h-3 w-3" />Exam today</span>;
  if (daysLeft <= 7) return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"><Calendar className="h-3 w-3" />{daysLeft}d to exam</span>;
  if (daysLeft <= 14) return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"><Calendar className="h-3 w-3" />{daysLeft}d to exam</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"><Calendar className="h-3 w-3" />{daysLeft}d to exam</span>;
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
      <Flame className="h-3 w-3" />{streak}d streak
    </span>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-foreground transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function TodaysStudysetTasks() {
  const [items, setItems] = useState<StudysetLaunchpadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch('/api/studysets/launchpad?limit=6', {
          signal: controller.signal,
        });
        if (!response.ok) {
          setItems([]);
          return;
        }
        const data = await response.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const completed = items.reduce((sum, item) => sum + Number(item?.progress?.completed_tasks || 0), 0);
    const total = items.reduce((sum, item) => sum + Number(item?.progress?.total_tasks || 0), 0);
    const queue = items.reduce((sum, item) => sum + Number(item?.pending_interventions || 0), 0);
    return { completed, total, queue };
  }, [items]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s Studyset</CardTitle>
          <CardDescription>Loading tasks...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (items.length === 0) return null;

  const primary = items[0];
  const rest = items.slice(1, 4);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4" />
          Study today
        </CardTitle>
        <CardDescription>
          {summary.completed}/{summary.total} tasks done
          {summary.queue > 0 && ` · ${summary.queue} in queue`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Primary card */}
        {primary && (
          <div className="rounded-xl border border-border bg-background p-4">
            {/* Chips row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {primary.subject && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {primary.subject.toLowerCase()}
                </span>
              )}
              {primary.exam_days_left !== null && (
                <ExamChip daysLeft={primary.exam_days_left} />
              )}
              <StreakBadge streak={primary.streak} />
            </div>

            <p className="text-sm truncate text-foreground">{primary.title}</p>

            {/* Progress */}
            <div className="mt-2.5">
              <ProgressBar percent={primary.progress.percent} />
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{primary.progress.completed_tasks}/{primary.progress.total_tasks} tasks</span>
                <span>{primary.progress.percent}%</span>
              </div>
            </div>

            {primary.due_today_tasks > 0 && (
              <p className="mt-1.5 text-xs font-medium text-[var(--accent-brand)]">
                {primary.due_today_tasks} task{primary.due_today_tasks > 1 ? 's' : ''} due today
              </p>
            )}

            <div className="mt-3 flex items-center gap-2">
              {primary.next_action_href && (
                <Button asChild size="sm">
                  <Link prefetch={false} href={primary.next_action_href}>
                    {primary.next_action_label || 'Keep going'}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link prefetch={false} href={primary.analytics_href || `/tools/studyset/${primary.id}`}>
                  Open
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Secondary items */}
        {rest.map((item) => {
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <ProgressBar percent={item.progress.percent} />
                  <span className="flex-shrink-0 text-xs text-muted-foreground">{item.progress.percent}%</span>
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                {item.exam_days_left !== null && <ExamChip daysLeft={item.exam_days_left} />}
                <StreakBadge streak={item.streak} />
              </div>
              <Button asChild size="sm" variant="ghost" className="flex-shrink-0">
                <Link prefetch={false} href={item.analytics_href || `/tools/studyset/${item.id}`}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
