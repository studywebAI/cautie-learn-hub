'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, ArrowRight } from 'lucide-react';

type LaunchpadItem = {
  id: string;
  title: string;
  due_today_tasks: number;
  pending_interventions: number;
  next_action_href?: string | null;
  next_action_label?: string | null;
  analytics_href?: string | null;
  progress?: {
    completed_tasks: number;
    total_tasks: number;
    percent: number;
  };
  pulse_weakest_tool?: string | null;
};

type AnalyticsResponse = {
  totalStudyTime?: number;
};

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

export function LearningPulse() {
  const [items, setItems] = useState<LaunchpadItem[]>([]);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      try {
        const [launchpadRes, analyticsRes] = await Promise.allSettled([
          fetch('/api/studysets/launchpad?limit=8', { signal: controller.signal }).then((r) => (r.ok ? r.json() : { items: [] })),
          fetch('/api/analytics', { signal: controller.signal }).then((r) => (r.ok ? r.json() : {})),
        ]);

        const launchpadData = launchpadRes.status === 'fulfilled' ? launchpadRes.value : { items: [] };
        const analyticsData: AnalyticsResponse = analyticsRes.status === 'fulfilled' ? analyticsRes.value : {};

        setItems(Array.isArray(launchpadData?.items) ? launchpadData.items : []);
        setTotalStudyTime(Number(analyticsData?.totalStudyTime || 0));
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const stats = useMemo(() => {
    const activeStudysets = items.length;
    const dueToday = items.reduce((sum, row) => sum + Number(row?.due_today_tasks || 0), 0);
    const queue = items.reduce((sum, row) => sum + Number(row?.pending_interventions || 0), 0);
    const avgProgress = items.length > 0
      ? Math.round(items.reduce((sum, row) => sum + Number(row?.progress?.percent || 0), 0) / items.length)
      : 0;
    return { activeStudysets, dueToday, queue, avgProgress };
  }, [items]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Learning Pulse
          </CardTitle>
          <CardDescription>Loading today&apos;s activity...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (items.length === 0 && totalStudyTime <= 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Learning Pulse
        </CardTitle>
        <CardDescription>Live studyset and activity analytics for today.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border p-2">
            <p className="text-[11px] text-muted-foreground">Active studysets</p>
            <p className="text-sm font-medium">{stats.activeStudysets}</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-[11px] text-muted-foreground">Due today</p>
            <p className="text-sm font-medium">{stats.dueToday}</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-[11px] text-muted-foreground">Queue</p>
            <p className="text-sm font-medium">{stats.queue}</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-[11px] text-muted-foreground">Weekly study time</p>
            <p className="text-sm font-medium">{Math.round((totalStudyTime / 60) * 10) / 10}h</p>
          </div>
        </div>

        {items.slice(0, 3).map((item) => (
          <div key={item.id} className="rounded-md border p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <Badge variant="outline">{Number(item?.progress?.percent || 0)}%</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {Number(item?.progress?.completed_tasks || 0)}/{Number(item?.progress?.total_tasks || 0)} tasks
              {' - '}
              Due today {Number(item?.due_today_tasks || 0)}
              {' - '}
              Queue {Number(item?.pending_interventions || 0)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {item.next_action_href ? (
                <Button asChild size="sm">
                  <Link prefetch={false} href={item.next_action_href}>
                    {item.next_action_label || 'Keep going'}
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <Link prefetch={false} href={item.analytics_href || `/tools/studyset/${item.id}`}>
                  Analytics
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ))}

        {items.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Avg studyset completion: {stats.avgProgress}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}

