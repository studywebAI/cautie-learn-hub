'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, ArrowRight } from 'lucide-react';

type StudysetSummary = {
  id: string;
  name?: string | null;
  subject?: string | null;
  exam_date?: string | null;
};

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

function daysUntil(dateValue: string): number | null {
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

function formatExamDate(dateValue: string): string {
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return dateValue;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(target);
}

export function UpcomingExamsStudysets() {
  const [studysets, setStudysets] = useState<StudysetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch('/api/studysets', { signal: controller.signal });
        if (!response.ok) {
          setStudysets([]);
          return;
        }
        const data = await response.json();
        setStudysets(Array.isArray(data?.studysets) ? data.studysets : []);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        setStudysets([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, []);

  const upcoming = useMemo(() => {
    return studysets
      .filter((s) => typeof s?.exam_date === 'string' && s.exam_date.trim().length > 0)
      .map((s) => ({ ...s, days: daysUntil(String(s.exam_date)) }))
      .filter((s) => s.days !== null)
      .sort((a, b) => new Date(String(a.exam_date)).getTime() - new Date(String(b.exam_date)).getTime())
      .slice(0, 5);
  }, [studysets]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" />
            Upcoming exams
          </CardTitle>
          <CardDescription>Loading exam dates...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (upcoming.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4" />
          Upcoming exams
        </CardTitle>
        <CardDescription>Studysets with an exam date, soonest first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.map((item) => {
          const days = item.days as number;
          const badgeClass =
            days <= 7
              ? 'border-transparent bg-red-100 text-red-700'
              : days <= 14
                ? 'border-transparent bg-amber-100 text-amber-700'
                : 'border-transparent bg-[#e8eddf] text-[#4a5735]';
          const daysLabel =
            days < 0 ? 'Past' : days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`;
          return (
            <Link
              key={item.id}
              prefetch={false}
              href={`/tools/studyset/${item.id}`}
              className="block rounded-md border p-2.5 hover:bg-[hsl(var(--interactive-hover))] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{item.name || 'Studyset'}</p>
                <Badge className={badgeClass}>{daysLabel}</Badge>
              </div>
              <div className="mt-1 flex items-center gap-2">
                {item.subject ? (
                  <span className="rounded-full bg-[#e8eddf] px-2 py-0.5 text-[11px] font-medium text-[#4a5735]">
                    {item.subject}
                  </span>
                ) : null}
                <span className="text-[11px] text-muted-foreground">
                  Exam {formatExamDate(String(item.exam_date))}
                </span>
              </div>
            </Link>
          );
        })}
        <Link
          prefetch={false}
          href="/tools/studyset"
          className="flex items-center gap-1 pt-1 text-xs font-medium text-[var(--accent-brand)] hover:underline"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
