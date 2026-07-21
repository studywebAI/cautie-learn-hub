'use client';

import { useEffect, useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';

type Grade = {
  id: string;
  grade_set_title: string;
  class_name: string;
  grade_numeric: number | null;
  grade_value: string | null;
  published_at: string | null;
};

function gradeColor(g: number | null): string {
  if (g === null) return '';
  if (g >= 8.5) return 'text-green-700 dark:text-green-400';
  if (g >= 7) return 'text-[var(--accent-brand)]';
  if (g >= 5.5) return 'text-amber-700 dark:text-amber-400';
  return 'text-destructive';
}

function gradeLabel(g: number): string {
  if (g >= 8.5) return 'A';
  if (g >= 7) return 'B';
  if (g >= 5.5) return 'C';
  return 'D';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'd MMM yyyy'); } catch { return '—'; }
}

function WhatGradeCalculator({ grades }: { grades: Grade[] }) {
  const classNames = [...new Set(grades.map(g => g.class_name).filter(Boolean))];
  const [selectedClass, setSelectedClass] = useState(classNames[0] || '');
  const [target, setTarget] = useState('7.5');

  const classGrades = useMemo(
    () => grades.filter(g => g.class_name === selectedClass && g.grade_numeric !== null),
    [grades, selectedClass]
  );

  const currentAvg = useMemo(() => {
    if (classGrades.length === 0) return null;
    const nums = classGrades.map(g => g.grade_numeric as number);
    return nums.reduce((s, n) => s + n, 0) / nums.length;
  }, [classGrades]);

  const targetNum = parseFloat(target);
  const needed = useMemo(() => {
    if (isNaN(targetNum) || classGrades.length === 0) return null;
    const n = classGrades.length;
    const sum = classGrades.reduce((s, g) => s + (g.grade_numeric ?? 0), 0);
    const required = targetNum * (n + 1) - sum;
    return Math.round(required * 10) / 10;
  }, [targetNum, classGrades]);

  if (classNames.length === 0) return null;

  return (
    <div className="rounded-lg surface-panel border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm">What grade do I need?</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Calculate what you need on the next assessment to reach your target average.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Class</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Target average</label>
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={target}
            onChange={e => setTarget(e.target.value)}
            className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
          />
        </div>
      </div>
      {currentAvg !== null && (
        <div className="rounded-lg surface-chip border border-border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Current average in {selectedClass}</p>
              <p className="text-sm">{currentAvg.toFixed(1)} over {classGrades.length} grade{classGrades.length !== 1 ? 's' : ''}</p>
            </div>
            {needed !== null && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">Need on next test</p>
                <p className={`text-xl ${needed > 10 ? 'text-destructive' : gradeColor(needed)}`}>
                  {needed > 10 ? 'Not possible' : needed < 0 ? 'Already there!' : needed.toFixed(1)}
                </p>
              </div>
            )}
          </div>
          {needed !== null && needed <= 10 && needed >= 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Score a <strong>{needed.toFixed(1)}</strong> on your next assessment to reach an average of <strong>{targetNum.toFixed(1)}</strong>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentGradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [view, setView] = useState<'recent' | 'by-subject'>('recent');

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await fetch('/api/student/grades?limit=100');
        const data = await res.json();
        setGrades(Array.isArray(data?.grades) ? data.grades : []);
      } catch {
        setGrades([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchGrades();
  }, []);

  const classNames = useMemo(
    () => [...new Set(grades.map(g => g.class_name).filter(Boolean))],
    [grades]
  );

  const filtered = useMemo(
    () => filterClass === 'all' ? grades : grades.filter(g => g.class_name === filterClass),
    [grades, filterClass]
  );

  const nums = filtered.map(g => g.grade_numeric).filter((g): g is number => g !== null);
  const overallAvg = nums.length > 0 ? (nums.reduce((s, g) => s + g, 0) / nums.length) : null;

  const byClass = useMemo(() => {
    const map = new Map<string, Grade[]>();
    for (const g of filtered) {
      const k = g.class_name || 'Unknown';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(g);
    }
    return map;
  }, [filtered]);

  if (loading) {
    return (
      <div className="page-content max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content max-w-3xl mx-auto space-y-5">
      <PageHeader
        title="My Grades"
        subtitle={
          <>
            {grades.length} published grade{grades.length !== 1 ? 's' : ''}
            {overallAvg !== null && (
              <> · overall average <span className={gradeColor(overallAvg)}>{overallAvg.toFixed(1)}</span></>
            )}
          </>
        }
      />

      {grades.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">No grades published yet. Check back after your teacher grades your work.</p>
        </div>
      ) : (
        <>
          {/* Calculator */}
          <WhatGradeCalculator grades={grades} />

          {/* View Toggle */}
          <div className="flex gap-1.5">
            {(['recent', 'by-subject'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  view === v
                    ? 'bg-[var(--accent-brand)] border-[var(--accent-brand)] text-white'
                    : 'bg-transparent border-border text-muted-foreground hover:border-[var(--accent-brand)]'
                }`}
              >
                {v === 'recent' ? 'Recent Grades' : 'By Subject'}
              </button>
            ))}
          </div>

          {/* Class Filter */}
          {classNames.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterClass('all')}
                className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${filterClass === 'all' ? 'bg-[var(--accent-brand)] border-[var(--accent-brand)] text-white' : 'bg-transparent border-border text-muted-foreground hover:border-[var(--accent-brand)]'}`}
              >
                All
              </button>
              {classNames.map(c => (
                <button
                  key={c}
                  onClick={() => setFilterClass(c)}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${filterClass === c ? 'bg-[var(--accent-brand)] border-[var(--accent-brand)] text-white' : 'bg-transparent border-border text-muted-foreground hover:border-[var(--accent-brand)]'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Grades Grouped by Class */}
          <div className="space-y-4">
            {[...byClass.entries()].map(([className, classGrades]) => {
              const classNums = classGrades.map(g => g.grade_numeric).filter((g): g is number => g !== null);
              const classAvg = classNums.length > 0 ? classNums.reduce((s, g) => s + g, 0) / classNums.length : null;

              return (
                <div key={className} className="rounded-lg surface-panel border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <p className="text-base">{className}</p>
                    {classAvg !== null && (
                      <span className={`text-sm ${gradeColor(classAvg)}`}>
                        avg {classAvg.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-border">
                    {classGrades.map((g, idx) => {
                      const prevGrade = classGrades[idx + 1];
                      const trend = g.grade_numeric !== null && prevGrade?.grade_numeric !== null
                        ? g.grade_numeric > prevGrade.grade_numeric
                          ? 'up' : g.grade_numeric < prevGrade.grade_numeric
                          ? 'down' : 'flat'
                        : 'flat';

                      return (
                        <div key={g.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--interactive-hover))] transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{g.grade_set_title}</p>
                            <p className="text-[11px] text-muted-foreground">{formatDate(g.published_at)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-green-600" />}
                            {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                            {trend === 'flat' && idx < classGrades.length - 1 && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span className={`text-lg tabular-nums w-12 text-right ${gradeColor(g.grade_numeric)}`}>
                              {g.grade_numeric !== null ? g.grade_numeric.toFixed(1) : (g.grade_value ?? '—')}
                            </span>
                            {g.grade_numeric !== null && (
                              <span className="text-[10px] text-muted-foreground w-4">
                                {gradeLabel(g.grade_numeric)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
