'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Target, BarChart3, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { PageSection } from '@/components/layout/page-section';

const BRAND = '#6b7c4e';

type LaunchpadItem = {
  id: string;
  title: string;
  status: string;
  progress: {
    completed_tasks: number;
    total_tasks: number;
    percent: number;
  };
};

type StudysetRow = {
  id: string;
  title: string;
  status: string;
  completionPercent: number;
  avgScore: number;
  sessions: number;
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function StatBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${BRAND}1a`, color: BRAND }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-none text-foreground">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsOverviewPage() {
  const [rows, setRows] = useState<StudysetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/studysets/launchpad?limit=50', { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Request failed (${res.status})`);
        }
        const json = (await res.json()) as { items?: LaunchpadItem[] };
        const items = Array.isArray(json.items) ? json.items : [];

        // Enrich each studyset with avg score + sessions from its analytics.
        const enriched = await Promise.all(
          items.map(async (item): Promise<StudysetRow> => {
            const base: StudysetRow = {
              id: item.id,
              title: item.title,
              status: item.status,
              completionPercent: num(item.progress?.percent),
              avgScore: 0,
              sessions: 0,
            };
            try {
              const aRes = await fetch(`/api/studysets/${item.id}/analytics`, {
                cache: 'no-store',
              });
              if (!aRes.ok) return base;
              const a = await aRes.json();
              const trend: Array<{ avg_score: number; attempts: number }> = Array.isArray(
                a?.score_trend_30d
              )
                ? a.score_trend_30d
                : [];
              const totalAttempts = trend.reduce((sum, p) => sum + num(p.attempts), 0);
              const weighted = trend.reduce(
                (sum, p) => sum + num(p.avg_score) * num(p.attempts),
                0
              );
              return {
                ...base,
                completionPercent: num(a?.totals?.completion_percent) || base.completionPercent,
                avgScore: totalAttempts > 0 ? Math.round(weighted / totalAttempts) : 0,
                sessions: totalAttempts,
              };
            } catch {
              return base;
            }
          })
        );

        if (!cancelled) setRows(enriched);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const aggregate = useMemo(() => {
    const totalSessions = rows.reduce((sum, r) => sum + r.sessions, 0);
    const scoredRows = rows.filter((r) => r.sessions > 0);
    const weighted = scoredRows.reduce((sum, r) => sum + r.avgScore * r.sessions, 0);
    const overallAvg = totalSessions > 0 ? Math.round(weighted / totalSessions) : 0;
    return {
      totalSessions,
      overallAvg,
      activeStudysets: rows.length,
    };
  }, [rows]);

  if (loading) {
    return (
      <PageSection>
        <div className="flex min-h-[60vh] items-center justify-center">
          <CautieLoader label="Loading analytics" sublabel="Gathering your studysets" />
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection className="[--accent-brand:#6b7c4e]">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track progress and performance across all your studysets.
        </p>
      </div>

      {error ? (
        <Card className="mb-6">
          <CardContent className="p-6 text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : null}

      {/* Aggregate stats */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatBox
          label="Active studysets"
          value={String(aggregate.activeStudysets)}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatBox
          label="Total sessions"
          value={String(aggregate.totalSessions)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatBox
          label="Overall avg score"
          value={`${aggregate.overallAvg}%`}
          icon={<Target className="h-5 w-5" />}
        />
      </div>

      {/* Studyset list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your studysets</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No active studysets yet. Create one to start tracking analytics.
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/tools/studyset/${row.id}/analytics`}
                    className="flex items-center gap-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{row.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {row.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {row.sessions} session{row.sessions === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    <div className="hidden w-32 shrink-0 sm:block">
                      <p className="text-xs text-muted-foreground">Completion</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${row.completionPercent}%`, backgroundColor: BRAND }}
                          />
                        </div>
                        <span className="w-9 text-xs text-muted-foreground">
                          {row.completionPercent}%
                        </span>
                      </div>
                    </div>
                    <div className="w-20 shrink-0 text-right">
                      <p className="text-lg font-semibold text-foreground">{row.avgScore}%</p>
                      <p className="text-xs text-muted-foreground">avg score</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageSection>
  );
}
