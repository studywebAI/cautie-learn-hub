'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Route, ArrowRight } from 'lucide-react';

type StudysetLaunchpadItem = {
  id: string;
  title: string;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4" />
          Today&apos;s Studyset
        </CardTitle>
        <CardDescription>
          {summary.completed}/{summary.total} tasks complete - Queue {summary.queue}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.slice(0, 3).map((item) => {
          const completed = Number(item?.progress?.completed_tasks || 0);
          const total = Number(item?.progress?.total_tasks || 0);
          return (
            <div key={item.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <div className="flex items-center gap-2">
                  {Number(item.pending_interventions || 0) > 0 && (
                    <Badge variant="outline">Q:{item.pending_interventions}</Badge>
                  )}
                  <Badge variant="outline">{completed}/{total}</Badge>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Due today {Number(item?.due_today_tasks || 0)} - {Number(item?.progress?.percent || 0)}%
              </p>
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link prefetch={false} href={item.analytics_href || `/tools/studyset/${item.id}`}>
                      Open Studyset
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  {item.next_action_href && (
                    <Button asChild size="sm">
                      <Link prefetch={false} href={item.next_action_href}>{item.next_action_label || 'Start now'}</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
