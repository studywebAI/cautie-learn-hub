'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';

type LaunchpadItem = {
  id: string;
  title?: string | null;
  pulse_focus_topics?: string[];
  pulse_weakest_tool?: string | null;
  analytics_summary?: {
    weakest_tool?: string | null;
  } | null;
};

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

export function WeakSpotsPanel() {
  const [items, setItems] = useState<LaunchpadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch('/api/studysets/launchpad?limit=10', { signal: controller.signal });
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

  const topics = useMemo(() => {
    const seen = new Set<string>();
    const collected: string[] = [];
    for (const item of items) {
      const focusTopics = Array.isArray(item?.pulse_focus_topics) ? item.pulse_focus_topics : [];
      for (const topic of focusTopics) {
        const label = typeof topic === 'string' ? topic.trim() : '';
        if (!label) continue;
        const key = label.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(label);
      }
      const weakestTool = item?.analytics_summary?.weakest_tool || item?.pulse_weakest_tool;
      if (typeof weakestTool === 'string' && weakestTool.trim()) {
        const label = weakestTool.trim();
        const key = label.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          collected.push(label);
        }
      }
    }
    return collected.slice(0, 8);
  }, [items]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Weak spots
          </CardTitle>
          <CardDescription>Loading weak areas...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (topics.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4" />
          Weak spots
        </CardTitle>
        <CardDescription>Topics worth a focused review session.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {topics.map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700"
            >
              {topic}
            </span>
          ))}
        </div>
        <Button asChild size="sm" className="w-full">
          <Link prefetch={false} href="/tools/quiz">
            Study weak spots
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
