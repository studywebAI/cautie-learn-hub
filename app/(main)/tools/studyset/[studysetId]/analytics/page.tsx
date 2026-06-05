'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Target,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { PageSection } from '@/components/layout/page-section';

const BRAND = '#6b7c4e';

type ScoreTrendPoint = {
  date: string;
  avg_score: number;
  attempts: number;
};

type MasteryTopic = {
  topic_label: string;
  weakness_score: number | null;
  mastery_score: number | null;
  exposure_count: number | null;
  updated_at: string | null;
};

type AnalyticsDay = {
  id: string;
  day_number: number;
  plan_date: string | null;
  completed: boolean;
  total_tasks: number;
  completed_tasks: number;
};

type AnalyticsResponse = {
  studyset: { id: string; name: string };
  totals: {
    total_tasks: number;
    completed_tasks: number;
    completion_percent: number;
  };
  score_trend_30d: ScoreTrendPoint[];
  mastery_topics: MasteryTopic[];
  days: AnalyticsDay[];
};

type TopicStatus = 'Strong' | 'Developing' | 'Weak';

function topicStatus(mastery: number, weakness: number): TopicStatus {
  if (weakness >= 60) return 'Weak';
  if (mastery >= 70 && weakness < 35) return 'Strong';
  return 'Developing';
}

function statusBadgeClasses(status: TopicStatus): string {
  if (status === 'Strong') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'Developing') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function num(value: number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

function ScoreTrendChart({ data }: { data: ScoreTrendPoint[] }) {
  // SVG viewBox geometry.
  const width = 720;
  const height = 240;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const points = useMemo(() => {
    if (data.length === 0) return [];
    const n = data.length;
    return data.map((point, index) => {
      const x = n === 1 ? padL + plotW / 2 : padL + (index / (n - 1)) * plotW;
      const score = Math.max(0, Math.min(100, num(point.avg_score)));
      const y = padT + (1 - score / 100) * plotH;
      return { x, y, point };
    });
  }, [data, plotW, plotH]);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No quiz sessions yet
      </div>
    );
  }

  const targetY = padT + (1 - 70 / 100) * plotH;
  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Y axis gridlines at 0/25/50/75/100.
  const yTicks = [0, 25, 50, 75, 100];

  // Show at most ~6 x labels to avoid crowding.
  const labelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Score trend over the last 30 days"
    >
      {/* Y gridlines + labels */}
      {yTicks.map((tick) => {
        const y = padT + (1 - tick / 100) * plotH;
        return (
          <g key={tick}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-muted-foreground/20"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {tick}%
            </text>
          </g>
        );
      })}

      {/* Target reference line at 70% */}
      <line
        x1={padL}
        x2={width - padR}
        y1={targetY}
        y2={targetY}
        stroke={BRAND}
        strokeWidth={1.5}
        strokeDasharray="6 4"
      />
      <text x={width - padR} y={targetY - 4} textAnchor="end" className="text-[10px]" fill={BRAND}>
        target 70%
      </text>

      {/* Score polyline */}
      <polyline
        points={polyline}
        fill="none"
        stroke={BRAND}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={BRAND}>
          <title>{`${formatShortDate(p.point.date)}: ${num(p.point.avg_score)}% (${num(
            p.point.attempts
          )} attempts)`}</title>
        </circle>
      ))}

      {/* X labels */}
      {points.map((p, i) =>
        i % labelStep === 0 || i === points.length - 1 ? (
          <text
            key={`x-${i}`}
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {formatShortDate(p.point.date)}
          </text>
        ) : null
      )}
    </svg>
  );
}

export default function StudysetAnalyticsPage() {
  const params = useParams();
  const studysetId = String(params?.studysetId || '');

  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studysetId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/studysets/${studysetId}/analytics`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Request failed (${res.status})`);
        }
        const json = (await res.json()) as AnalyticsResponse;
        if (!cancelled) setData(json);
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
  }, [studysetId]);

  const sortedTopics = useMemo(() => {
    const topics = data?.mastery_topics ?? [];
    return [...topics].sort((a, b) => num(b.weakness_score) - num(a.weakness_score));
  }, [data]);

  const overview = useMemo(() => {
    const trend = data?.score_trend_30d ?? [];
    const totalAttempts = trend.reduce((sum, p) => sum + num(p.attempts), 0);
    const weightedScore = trend.reduce((sum, p) => sum + num(p.avg_score) * num(p.attempts), 0);
    const avgScore = totalAttempts > 0 ? Math.round(weightedScore / totalAttempts) : 0;
    const sessionsDone = totalAttempts;
    const weakCount = (data?.mastery_topics ?? []).filter(
      (t) => num(t.weakness_score) >= 60
    ).length;
    return {
      completion: data?.totals?.completion_percent ?? 0,
      avgScore,
      sessionsDone,
      weakCount,
    };
  }, [data]);

  const daysWithAttempts = useMemo(
    () => (data?.days ?? []).filter((d) => d.completed_tasks > 0),
    [data]
  );

  if (loading) {
    return (
      <PageSection>
        <div className="flex min-h-[60vh] items-center justify-center">
          <CautieLoader label="Loading analytics" sublabel="Crunching your study data" />
        </div>
      </PageSection>
    );
  }

  if (error || !data) {
    return (
      <PageSection>
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/tools/studyset/${studysetId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to studyset
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {error || 'No analytics available for this studyset.'}
          </CardContent>
        </Card>
      </PageSection>
    );
  }

  return (
    <PageSection
      className="[--accent-brand:#6b7c4e]"
    >
      {/* Back + heading */}
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/tools/studyset/${studysetId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to studyset
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          {data.studyset.name} — Analytics
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            style={{ borderColor: `${BRAND}55`, color: BRAND }}
          >
            <BookOpen className="mr-1 h-3 w-3" />
            Studyset
          </Badge>
          <Badge variant="secondary">
            {overview.completion === 100 ? 'Completed' : 'In progress'}
          </Badge>
        </div>
      </div>

      {/* Section 1: Overview stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox
          label="Completion"
          value={`${overview.completion}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatBox
          label="Avg score"
          value={`${overview.avgScore}%`}
          icon={<Target className="h-5 w-5" />}
        />
        <StatBox
          label="Sessions done"
          value={String(overview.sessionsDone)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatBox
          label="Weak topics"
          value={String(overview.weakCount)}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      {/* Section 2: Score trend */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Score trend (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreTrendChart data={data.score_trend_30d ?? []} />
        </CardContent>
      </Card>

      {/* Section 3: Per-topic mastery */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Topic mastery</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedTopics.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No topic data yet. Practice quizzes to build mastery insights.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Topic</th>
                    <th className="py-2 pr-4 font-medium">Mastery</th>
                    <th className="py-2 pr-4 font-medium">Weakness</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTopics.map((topic, index) => {
                    const mastery = Math.max(0, Math.min(100, num(topic.mastery_score)));
                    const weakness = Math.max(0, Math.min(100, num(topic.weakness_score)));
                    const status = topicStatus(mastery, weakness);
                    return (
                      <tr key={`${topic.topic_label}-${index}`} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium text-foreground">
                          {topic.topic_label || 'Untitled topic'}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${mastery}%`, backgroundColor: BRAND }}
                              />
                            </div>
                            <span className="w-9 text-xs text-muted-foreground">{mastery}%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-red-500"
                                style={{ width: `${weakness}%` }}
                              />
                            </div>
                            <span className="w-9 text-xs text-muted-foreground">{weakness}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClasses(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Session history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session history</CardTitle>
        </CardHeader>
        <CardContent>
          {daysWithAttempts.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              Complete sessions to see history.
            </p>
          ) : (
            <ul className="divide-y">
              {daysWithAttempts.map((day) => {
                const pct =
                  day.total_tasks > 0
                    ? Math.round((day.completed_tasks / day.total_tasks) * 100)
                    : 0;
                return (
                  <li key={day.id} className="flex items-center gap-4 py-3">
                    <div className="w-28 shrink-0">
                      <p className="text-sm font-medium text-foreground">Day {day.day_number}</p>
                      {day.plan_date ? (
                        <p className="text-xs text-muted-foreground">
                          {formatShortDate(String(day.plan_date).slice(0, 10))}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <Progress value={pct} className="h-2" />
                    </div>
                    <div className="w-28 shrink-0 text-right text-xs text-muted-foreground">
                      {day.completed_tasks}/{day.total_tasks} tasks
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageSection>
  );
}
