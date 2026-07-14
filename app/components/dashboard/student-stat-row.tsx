'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, GraduationCap, Bell } from 'lucide-react';

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

function gradeColor(g: number | null): string {
  if (g === null) return 'text-foreground';
  if (g >= 8.5) return 'text-green-700 dark:text-green-400';
  if (g >= 7) return 'text-[var(--accent-brand)]';
  if (g >= 5.5) return 'text-amber-700 dark:text-amber-400';
  return 'text-destructive';
}

export function StudentStatRow({ subjectsCount }: { subjectsCount: number }) {
  const [avg, setAvg] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    Promise.all([
      fetch('/api/student/grades?limit=100', { signal: controller.signal }).then(r => r.ok ? r.json() : { grades: [] }).catch(() => ({ grades: [] })),
      fetch('/api/notifications/mark-read', { signal: controller.signal }).then(r => r.ok ? r.json() : { count: 0 }).catch(() => ({ count: 0 })),
    ]).then(([gradesData, notifData]) => {
      const nums = (Array.isArray(gradesData?.grades) ? gradesData.grades : [])
        .map((g: any) => g.grade_numeric)
        .filter((g: any): g is number => typeof g === 'number');
      setAvg(nums.length > 0 ? nums.reduce((s: number, g: number) => s + g, 0) / nums.length : null);
      setUnreadCount(typeof notifData?.count === 'number' ? notifData.count : 0);
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="rounded-xl surface-panel border border-border p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Subjects</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/5 text-foreground/70">
            <BookOpen className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="text-2xl tabular-nums">{subjectsCount}</div>
      </div>

      <Link
        href="/grades"
        className="rounded-xl surface-panel border border-border p-4 shadow-sm transition-all hover:shadow-md hover:border-[var(--accent-brand)]/30"
      >
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Average grade</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]">
            <GraduationCap className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className={`text-2xl tabular-nums ${loading ? 'text-muted-foreground' : gradeColor(avg)}`}>
          {loading ? '—' : avg !== null ? avg.toFixed(1) : '—'}
        </div>
      </Link>

      <div className="col-span-2 sm:col-span-1 rounded-xl surface-panel border border-border p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Notifications</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <Bell className="h-3.5 w-3.5" />
          </span>
        </div>
        <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs tabular-nums ${
          unreadCount > 0 ? 'bg-[var(--accent-brand)] text-white' : 'bg-foreground/5 text-muted-foreground'
        }`}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      </div>
    </div>
  );
}
