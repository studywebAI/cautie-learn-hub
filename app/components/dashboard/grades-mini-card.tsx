'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type RecentGrade = {
  id: string;
  grade_set_title: string;
  class_name: string;
  grade_numeric: number | null;
  grade_value: string | null;
  published_at: string | null;
};

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

function gradeColor(g: number | null): string {
  if (g === null) return 'text-muted-foreground';
  if (g >= 8.5) return 'text-green-700 dark:text-green-400';
  if (g >= 7) return 'text-[var(--accent-brand)]';
  if (g >= 5.5) return 'text-amber-700 dark:text-amber-400';
  return 'text-destructive';
}

function TrendIcon({ grades }: { grades: RecentGrade[] }) {
  const nums = grades.map(g => g.grade_numeric).filter((g): g is number => g !== null);
  if (nums.length < 2) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const last = nums[0];
  const prev = nums[1];
  if (last > prev) return <TrendingUp className="h-3 w-3 text-green-600" />;
  if (last < prev) return <TrendingDown className="h-3 w-3 text-destructive" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

export function GradesMiniCard() {
  const [grades, setGrades] = useState<RecentGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    fetch('/api/student/grades?limit=4', { signal: controller.signal })
      .then(r => r.ok ? r.json() : { grades: [] })
      .then(d => setGrades(Array.isArray(d?.grades) ? d.grades : []))
      .catch(() => setGrades([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl surface-panel border border-border p-4 animate-pulse">
        <div className="h-3 w-20 bg-muted rounded mb-3" />
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-9 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (grades.length === 0) return null;

  const nums = grades.map(g => g.grade_numeric).filter((g): g is number => g !== null);
  const avg = nums.length > 0 ? (nums.reduce((s, g) => s + g, 0) / nums.length) : null;

  return (
    <div className="rounded-xl surface-panel border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">My grades</p>
          {avg !== null && (
            <div className="flex items-center gap-1">
              <TrendIcon grades={grades} />
              <span className={`text-[11px] ${gradeColor(avg)}`}>
                avg {avg.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        <Link
          href="/grades"
          className="text-xs text-[var(--accent-brand)] hover:opacity-80 flex items-center gap-1"
        >
          All grades <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-1.5">
        {grades.slice(0, 3).map(g => (
          <div key={g.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(var(--interactive-hover))] transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate">{g.grade_set_title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{g.class_name}</p>
            </div>
            <span className={`text-[14px] tabular-nums shrink-0 ${gradeColor(g.grade_numeric)}`}>
              {g.grade_numeric !== null ? g.grade_numeric.toFixed(1) : (g.grade_value ?? '—')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
