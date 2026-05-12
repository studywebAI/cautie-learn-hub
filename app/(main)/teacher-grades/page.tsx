'use client';

import { useState, useEffect, useMemo, useContext } from 'react';
import { Plus, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { format, parseISO } from 'date-fns';

type GradeSet = {
  id: string;
  title: string;
  classId: string;
  className: string;
  status: 'draft' | 'published';
  gradedCount: number;
  totalCount: number;
  average: number | null;
  createdAt: string;
  subject: string | null;
};

function fmtDate(iso: string) {
  try { return format(parseISO(iso), 'd MMM yyyy'); } catch { return ''; }
}

function gradeColor(g: number | null) {
  if (g === null) return 'text-muted-foreground';
  if (g >= 7) return 'text-[var(--accent-brand)]';
  if (g >= 5.5) return 'text-amber-600';
  return 'text-destructive';
}

export default function TeacherGradesPage() {
  const { classes, language } = useContext(AppContext) as AppContextType;
  const isDutch = language === 'nl';

  const [sets, setSets] = useState<GradeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    void loadAllGradeSets();
  }, [classes]);

  async function loadAllGradeSets() {
    if (!classes?.length) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        classes.map(async (cls: any) => {
          const res = await fetch(`/api/classes/${cls.id}/grades`);
          if (!res.ok) return [];
          const data = await res.json();
          return (data.grade_sets || []).map((gs: any) => ({
            id: String(gs.id),
            title: String(gs.title || gs.name || ''),
            classId: String(cls.id),
            className: String(cls.name || ''),
            status: gs.status === 'published' ? 'published' : 'draft',
            gradedCount: Number(gs.graded_count ?? (gs.student_grades?.filter((g: any) => g.grade_numeric !== null || g.grade_value).length ?? 0)),
            totalCount: Number(gs.total_students ?? gs.student_grades?.length ?? 0),
            average: gs.average ?? null,
            createdAt: String(gs.created_at || gs.createdAt || ''),
            subject: gs.subject?.title || null,
          } as GradeSet));
        })
      );
      const all: GradeSet[] = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSets(all);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const classOptions = useMemo(() => [...new Set(sets.map(s => s.classId))].map(id => ({
    id,
    name: sets.find(s => s.classId === id)?.className || id,
  })), [sets]);

  const filtered = useMemo(() => sets.filter(s =>
    (filterClass === 'all' || s.classId === filterClass) &&
    (filterStatus === 'all' || s.status === filterStatus)
  ), [sets, filterClass, filterStatus]);

  const publishedCount = sets.filter(s => s.status === 'published').length;
  const draftCount = sets.filter(s => s.status === 'draft').length;

  if (loading) {
    return (
      <div className="page-content flex min-h-[40vh] items-center justify-center">
        <CautieLoader
          label={isDutch ? 'Cijfers laden' : 'Loading grades'}
          sublabel={isDutch ? 'Cijferlijsten ophalen' : 'Fetching grade sets'}
          size="md"
        />
      </div>
    );
  }

  return (
    <div className="page-content max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">{isDutch ? 'Cijfers' : 'Grades'}</h1>
          <p className="page-subtitle">
            {sets.length} {isDutch ? 'cijferlijsten' : 'grade sets'}
            {publishedCount > 0 && <> · {publishedCount} {isDutch ? 'gepubliceerd' : 'published'}</>}
            {draftCount > 0 && <> · {draftCount} {isDutch ? 'concept' : 'draft'}</>}
          </p>
        </div>
      </div>

      {sets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground text-sm">
            {isDutch ? 'Nog geen cijferlijsten. Maak er een aan in een klas.' : 'No grade sets yet. Create one inside a class.'}
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Class filter */}
            {classOptions.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setFilterClass('all')}
                  className={cn(
                    'h-7 rounded-md border px-2.5 text-[11px] font-medium whitespace-nowrap transition-colors',
                    filterClass === 'all'
                      ? 'border-foreground/30 bg-foreground/8 text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                  )}
                >
                  {isDutch ? 'Alle klassen' : 'All classes'}
                </button>
                {classOptions.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setFilterClass(c.id)}
                    className={cn(
                      'h-7 rounded-md border px-2.5 text-[11px] font-medium whitespace-nowrap transition-colors',
                      filterClass === c.id
                        ? 'border-foreground/30 bg-foreground/8 text-foreground'
                        : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Status filter */}
            <div className="ml-auto flex overflow-hidden rounded-md border border-border">
              {(['all', 'published', 'draft'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] transition-colors',
                    f !== 'all' && 'border-l border-border',
                    filterStatus === f
                      ? 'bg-foreground/8 font-semibold text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f === 'all' ? (isDutch ? 'Alles' : 'All') : f === 'published' ? (isDutch ? 'Gepubliceerd' : 'Published') : (isDutch ? 'Concept' : 'Draft')}
                </button>
              ))}
            </div>
          </div>

          {/* Grade sets */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {isDutch ? 'Geen cijferlijsten gevonden.' : 'No grade sets found.'}
              </p>
            ) : filtered.map(gs => {
              const isExpanded = expanded === gs.id;
              const pct = gs.totalCount > 0 ? Math.round((gs.gradedCount / gs.totalCount) * 100) : 0;

              return (
                <div
                  key={gs.id}
                  className="overflow-hidden rounded-xl border border-border bg-white dark:bg-[hsl(var(--surface-1))]"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : gs.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--interactive-hover))]"
                  >
                    {/* Title + meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold truncate">{gs.title}</p>
                        <span className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                          gs.status === 'published'
                            ? 'bg-[hsl(var(--accent-brand)/0.12)] text-[var(--accent-brand)]'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        )}>
                          {gs.status === 'published' ? (isDutch ? 'Gepubliceerd' : 'Published') : (isDutch ? 'Concept' : 'Draft')}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {gs.className}
                        {gs.subject && <> · {gs.subject}</>}
                        {' · '}
                        {fmtDate(gs.createdAt)}
                      </p>
                    </div>

                    {/* Progress */}
                    <div className="hidden w-32 flex-shrink-0 sm:block">
                      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{isDutch ? 'Beoordeeld' : 'Graded'}</span>
                        <span className="font-medium text-foreground">{gs.gradedCount}/{gs.totalCount}</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-3))]">
                        <div
                          className="h-full rounded-full bg-muted-foreground/40 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Average */}
                    <div className="w-10 shrink-0 text-right">
                      <span className={cn('text-[15px] font-bold tabular-nums', gradeColor(gs.average))}>
                        {gs.average !== null ? gs.average : '—'}
                      </span>
                    </div>

                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    }
                  </button>

                  {/* Expanded: link to class grades tab */}
                  {isExpanded && (
                    <div className="border-t border-border bg-[hsl(var(--surface-2))] px-4 py-3">
                      <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>{isDutch ? 'Beoordeeld' : 'Graded'}</span>
                          <span className="font-semibold text-foreground">{gs.gradedCount}/{gs.totalCount}</span>
                        </div>
                        {gs.average !== null && (
                          <div className="flex items-center gap-2">
                            <span>{isDutch ? 'Gemiddelde' : 'Average'}</span>
                            <span className={cn('font-semibold', gradeColor(gs.average))}>{gs.average}</span>
                          </div>
                        )}
                        <a
                          href={`/class/${gs.classId}?tab=grades`}
                          className="ml-auto flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-[hsl(var(--interactive-hover))] dark:bg-[hsl(var(--surface-1))]"
                          onClick={e => e.stopPropagation()}
                        >
                          {isDutch ? 'Open in klas' : 'Open in class'}
                          <ChevronRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
