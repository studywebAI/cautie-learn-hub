'use client';

import { useState, useEffect, useContext } from 'react';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';

type SubjectAnalytics = {
  name: string;
  avg: number | null;
  trend: number; // positive = up, negative = down, 0 = flat
  count: number;
};

export function AnalyticsTabRedesigned({ classId }: { classId: string }) {
  const ctx = useContext(AppContext) as AppContextType | null;
  const isDutch = ctx?.language === 'nl';

  const [subjects, setSubjects] = useState<SubjectAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'class' | 'student'>('class');
  const [period, setPeriod] = useState<'term' | 'month' | 'all'>('term');

  useEffect(() => {
    void load();
  }, [classId, view, period]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [gradesRes, trendRes] = await Promise.all([
        fetch(`/api/classes/${classId}/grades`),
        fetch(`/api/classes/${classId}/analytics/trend?period=${period}`),
      ]);

      if (!gradesRes.ok) throw new Error(`Error ${gradesRes.status}`);
      const data = await gradesRes.json();

      // Get trend data if available
      let trendData: { [key: string]: number } = {};
      if (trendRes.ok) {
        const trendInfo = await trendRes.json();
        // For class-level analytics, we use the overall trend
        trendData['_overall'] = trendInfo.trend ?? 0;
      }

      // Calculate per-subject averages from grade sets
      const subjectMap = new Map<string, { sum: number; count: number }>();
      for (const gs of data.grade_sets || []) {
        if (gs.status !== 'published') continue;
        const subj = gs.subject?.title || (isDutch ? 'Overig' : 'Other');
        const avg = gs.average;
        if (avg !== null && avg !== undefined) {
          const entry = subjectMap.get(subj) || { sum: 0, count: 0 };
          entry.sum += avg;
          entry.count += 1;
          subjectMap.set(subj, entry);
        }
      }

      const result: SubjectAnalytics[] = Array.from(subjectMap.entries()).map(([name, { sum, count }]) => ({
        name,
        avg: count > 0 ? Math.round((sum / count) * 10) / 10 : null,
        // Use trend from API if available, otherwise use overall trend, else 0
        trend: trendData[name] ?? trendData['_overall'] ?? 0,
        count,
      }));

      result.sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
      setSubjects(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader size="md" label="" sublabel="" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground dark:bg-[hsl(var(--surface-1))]">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e4e4e4] bg-white dark:border-border dark:bg-[hsl(var(--surface-1))]">
      {/* Topbar */}
      <div className="flex items-center gap-1.5 border-b border-[#e4e4e4] bg-[#f7f7f7] px-4 py-2.5 text-[12px] text-[#888] dark:border-border dark:bg-[hsl(var(--surface-2))]">
        <span className="font-semibold text-[#1a1a1a] dark:text-foreground">
          {isDutch ? 'Analyse' : 'Analytics'}
        </span>
      </div>

      <div className="p-5">
        {/* Controls */}
        <div className="mb-4 flex items-center justify-between gap-4">
          {/* Class / Per student toggle */}
          <div className="flex overflow-hidden rounded-[6px] border border-[#e0e0e0] dark:border-border">
            <button
              type="button"
              onClick={() => setView('class')}
              className={cn(
                'border-r border-[#e0e0e0] px-3 py-[5px] text-[12px] transition-colors dark:border-border',
                view === 'class'
                  ? 'bg-[#7f8962] text-white'
                  : 'bg-white text-[#666] hover:bg-[#f5f5f5] dark:bg-[hsl(var(--surface-2))] dark:text-foreground/70'
              )}
            >
              {isDutch ? 'Klas' : 'Class'}
            </button>
            <button
              type="button"
              onClick={() => setView('student')}
              className={cn(
                'px-3 py-[5px] text-[12px] transition-colors',
                view === 'student'
                  ? 'bg-[#7f8962] text-white'
                  : 'bg-white text-[#666] hover:bg-[#f5f5f5] dark:bg-[hsl(var(--surface-2))] dark:text-foreground/70'
              )}
            >
              {isDutch ? 'Per leerling' : 'Per student'}
            </button>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#888]">{isDutch ? 'Periode:' : 'Period:'}</span>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as any)}
              className="rounded-[6px] border border-[#ddd] bg-white px-2.5 py-1.5 text-[12px] text-[#555] dark:border-border dark:bg-[hsl(var(--surface-2))] dark:text-foreground/70"
            >
              <option value="term">{isDutch ? 'Dit semester' : 'This term'}</option>
              <option value="month">{isDutch ? 'Vorige maand' : 'Last month'}</option>
              <option value="all">{isDutch ? 'Alles' : 'All time'}</option>
            </select>
          </div>
        </div>

        {/* Analytics table */}
        {subjects.length === 0 ? (
          <div className="rounded-[8px] border border-[#e4e4e4] bg-[#fafafa] px-4 py-8 text-center text-[13px] text-[#aaa] dark:border-border dark:bg-[hsl(var(--surface-2))]">
            {isDutch ? 'Geen gegevens beschikbaar.' : 'No data available.'}
          </div>
        ) : (
          <div className="rounded-[8px] border border-[#e4e4e4] bg-white dark:border-border dark:bg-[hsl(var(--surface-1))]">
            {/* Column headers */}
            <div
              className="grid gap-2 border-b border-[#ebebeb] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[#bbb]"
              style={{ gridTemplateColumns: '1fr 40px 80px 48px' }}
            >
              <div>{isDutch ? 'Vak' : 'Subject'}</div>
              <div className="text-right">{isDutch ? 'Gem.' : 'Avg'}</div>
              <div></div>
              <div className="text-right">{isDutch ? 'Trend' : 'Trend'}</div>
            </div>

            {/* Data rows */}
            {subjects.map((s, i) => {
              const pct = s.avg ? Math.min(100, (s.avg / 10) * 100) : 0;
              const trendColor =
                s.trend > 0.05 ? 'text-[#7f8962]' : s.trend < -0.05 ? 'text-red-600' : 'text-[#aaa]';
              const trendLabel = s.trend > 0 ? `+${s.trend.toFixed(1)}` : s.trend.toFixed(1);

              return (
                <div
                  key={s.name}
                  className={cn(
                    'grid items-center gap-2 px-4 py-[9px] transition-colors hover:bg-[hsl(var(--interactive-hover))]',
                    i > 0 && 'border-t border-[#f0f0f0]'
                  )}
                  style={{ gridTemplateColumns: '1fr 40px 80px 48px' }}
                >
                  {/* Subject name */}
                  <div className="text-[13px] font-semibold text-[#1a1a1a] dark:text-foreground">
                    {s.name}
                  </div>

                  {/* Average */}
                  <div className="text-right text-[14px] font-bold text-[#7f8962]">
                    {s.avg !== null ? s.avg.toFixed(1) : '—'}
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center">
                    <div className="h-[5px] w-full overflow-hidden rounded-full bg-[#ebebeb]">
                      <div
                        className="h-full rounded-full bg-[#7f8962] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Trend */}
                  <div className={cn('text-right text-[11px] font-semibold', trendColor)}>
                    {trendLabel}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Alert box (if any subject is below 5.5) */}
        {subjects.some(s => (s.avg ?? 0) < 5.5) && (
          <div className="mt-4 rounded-[6px] bg-[#fdf3e3] px-3 py-2.5 text-[12px] text-[#c87d25] dark:bg-[hsl(var(--accent-brand)/0.1)]">
            <p className="font-semibold">
              {isDutch
                ? 'Let op: Sommige vakken scoren onder gemiddeld.'
                : 'Alert: Some subjects are underperforming.'}
            </p>
            <p className="mt-1 text-[11px]">
              {isDutch
                ? 'Overweeg herhalingslessen of extra ondersteuning.'
                : 'Consider review sessions or additional support.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
