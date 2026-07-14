'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { School, ClipboardList, GraduationCap, Bell, ChevronDown } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

type ClassAverage = { classId: string; className: string; average: number; points: { title: string; avg: number }[] };

export function TeacherStatRow({ classIds, classesCount }: { classIds: string[]; classesCount: number }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [classAverages, setClassAverages] = useState<ClassAverage[]>([]);
  const [overallAverage, setOverallAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  useEffect(() => {
    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }
    if (classIds.length === 0) {
      setLoading(false);
      return;
    }
    const ids = classIds.join(',');
    const controller = new AbortController();
    Promise.all([
      fetch(`/api/dashboard/teacher/to-grade?classIds=${ids}`, { signal: controller.signal }).then(r => r.ok ? r.json() : { totalCount: 0 }).catch(() => ({ totalCount: 0 })),
      fetch('/api/notifications/mark-read', { signal: controller.signal }).then(r => r.ok ? r.json() : { count: 0 }).catch(() => ({ count: 0 })),
      fetch(`/api/dashboard/teacher/grade-averages?classIds=${ids}`, { signal: controller.signal }).then(r => r.ok ? r.json() : { classes: [], overallAverage: null }).catch(() => ({ classes: [], overallAverage: null })),
    ]).then(([pending, notif, averages]) => {
      setPendingCount(typeof pending?.totalCount === 'number' ? pending.totalCount : 0);
      setUnreadCount(typeof notif?.count === 'number' ? notif.count : 0);
      setClassAverages(Array.isArray(averages?.classes) ? averages.classes : []);
      setOverallAverage(typeof averages?.overallAverage === 'number' ? averages.overallAverage : null);
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [classIds.join(',')]);

  const chartData = useMemo(() => {
    if (selectedClassId === 'all') {
      // Merge all classes' points in chronological-ish order for a rough overall trend.
      return classAverages.flatMap(c => c.points).slice(-8);
    }
    return classAverages.find(c => c.classId === selectedClassId)?.points || [];
  }, [classAverages, selectedClassId]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="group rounded-xl border border-border bg-gradient-to-br from-foreground/[0.04] to-transparent p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Classes</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/10 text-foreground/70">
              <School className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-2xl tabular-nums">{classesCount}</div>
        </div>

        <Link
          href="/teacher-grades"
          className="group rounded-xl border border-border bg-gradient-to-br from-amber-500/[0.07] to-transparent p-4 shadow-sm transition-all hover:shadow-md hover:border-amber-500/30"
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">To grade</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
              <ClipboardList className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className={`text-2xl tabular-nums ${!loading && pendingCount > 0 ? 'text-amber-600' : ''}`}>
            {loading ? '—' : pendingCount}
          </div>
        </Link>

        <button
          onClick={() => setExpanded(v => !v)}
          className="group text-left rounded-xl border border-border bg-gradient-to-br from-[var(--accent-brand)]/[0.07] to-transparent p-4 shadow-sm transition-all hover:shadow-md hover:border-[var(--accent-brand)]/30"
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Average grade</span>
            <span className="flex items-center gap-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-brand)]/15 text-[var(--accent-brand)]">
                <GraduationCap className="h-3.5 w-3.5" />
              </span>
              <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </span>
          </div>
          <div className="text-2xl tabular-nums">
            {loading ? '—' : overallAverage !== null ? overallAverage.toFixed(1) : '—'}
          </div>
        </button>

        <div className="rounded-xl border border-border bg-gradient-to-br from-blue-500/[0.07] to-transparent p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Notifications</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600">
              <Bell className="h-3.5 w-3.5" />
            </span>
          </div>
          <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs tabular-nums ${
            unreadCount > 0 ? 'bg-[var(--accent-brand)] text-white' : 'bg-foreground/10 text-muted-foreground'
          }`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="rounded-xl surface-panel border border-border p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Grade trend</p>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="text-xs bg-transparent border border-border rounded-md px-2 py-1"
            >
              <option value="all">All classes</option>
              {classAverages.map(c => (
                <option key={c.classId} value={c.classId}>{c.className}</option>
              ))}
            </select>
          </div>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published grades yet.</p>
          ) : (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="title" hide />
                  <Tooltip
                    formatter={(value: any) => [value, 'avg']}
                    labelFormatter={(label) => label}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="avg" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
