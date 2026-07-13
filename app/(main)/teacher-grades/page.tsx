'use client';

import { useEffect, useState, useMemo, useContext } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { AppContext, AppContextType } from '@/contexts/app-context';
import Loader from '@/components/ui/loader';

type GradeSet = {
  id: string;
  title: string;
  class_id: string;
  class_name: string;
  subject?: { title?: string } | null;
  status: 'draft' | 'in_progress' | 'completed';
  weight?: number;
  graded_count?: number;
  total_students?: number;
  average?: number | null;
  created_at: string;
  updated_at?: string;
};

function fmtDate(iso: string) {
  try { return format(parseISO(iso), 'd MMM'); } catch { return ''; }
}

function GradeCard({ grade }: { grade: GradeSet }) {
  const graded = grade.graded_count || 0;
  const total = grade.total_students || 0;
  const pct = total > 0 ? Math.round((graded / total) * 100) : 0;

  const statusColor = {
    draft: 'surface-chip text-muted-foreground',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
  }[grade.status] || 'surface-chip text-muted-foreground';

  return (
    <Link href={`/teacher-grades/${grade.id}`}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer surface-panel border border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm truncate">{grade.title}</h3>
              <span className={`text-xs px-2 py-1 rounded ${statusColor} font-medium capitalize`}>
                {grade.status === 'in_progress' ? 'In progress' : grade.status === 'completed' ? 'Done' : 'Draft'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {grade.class_name}
              {grade.subject?.title && <> • {grade.subject.title}</>}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {fmtDate(grade.created_at)} • {grade.weight} pts
            </p>
          </div>

          <div className="flex-shrink-0 text-right space-y-1">
            <div className="text-[13px] text-foreground">
              {graded} / {total}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              {pct}%
            </div>
            <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden mt-1">
              <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function TeacherGradesLanding() {
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';
  const classes = context?.classes || [];

  const [allGrades, setAllGrades] = useState<GradeSet[]>([]);
  const [loading, setLoading] = useState(true);

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
            title: String(gs.title || ''),
            class_id: String(cls.id),
            class_name: String(cls.name || ''),
            subject: gs.subject || null,
            status: gs.status || 'draft',
            weight: gs.weight || 5,
            graded_count: Number(gs.graded_count || 0),
            total_students: Number(gs.total_students || 0),
            average: gs.average || null,
            created_at: String(gs.created_at || ''),
            updated_at: String(gs.updated_at || ''),
          } as GradeSet));
        })
      );
      const all: GradeSet[] = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllGrades(all);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const recentGrades = useMemo(() => allGrades.slice(0, 3), [allGrades]);

  if (loading) {
    return (
      <div className="page-content flex min-h-[40vh] items-center justify-center">
        <CautieLoader
          label={isDutch ? 'Cijfers laden' : 'Loading grades'}
          size="md"
        />
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isDutch ? 'Cijfers' : 'Grades'}</h1>
          <p className="page-subtitle">{isDutch ? 'Welkom terug' : 'Welcome back'}</p>
        </div>
        <Link href="/teacher-grades/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            {isDutch ? 'Nieuwe cijfers' : 'New grade'}
          </Button>
        </Link>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/teacher-grades/new">
          <div className="class-panel-lg flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer hover:bg-[hsl(var(--interactive-hover))] transition-colors min-h-[80px]">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">{isDutch ? 'Nieuwe Cijfers' : 'New Grade'}</p>
            <p className="text-xs text-muted-foreground">{isDutch ? 'Maak een nieuwe cijferlijst' : 'Create a new grade set'}</p>
          </div>
        </Link>
        <Link href="/teacher-grades?view=all">
          <div className="class-panel-lg flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer hover:bg-[hsl(var(--interactive-hover))] transition-colors min-h-[80px]">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">{isDutch ? 'Bestaande Cijfers' : 'Existing Grades'}</p>
            <p className="text-xs text-muted-foreground">{isDutch ? 'Bekijk en beheer cijfers' : 'View & manage grades'}</p>
          </div>
        </Link>
        <Link href="/teacher-grades/metrics">
          <div className="class-panel-lg flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer hover:bg-[hsl(var(--interactive-hover))] transition-colors min-h-[80px]">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">{isDutch ? 'Metrics' : 'Metrics'}</p>
            <p className="text-xs text-muted-foreground">{isDutch ? 'Analyseer en vergelijk' : 'Analyze & compare'}</p>
          </div>
        </Link>
      </div>

      {/* Recent grades */}
      {recentGrades.length > 0 && (
        <div className="class-panel-lg space-y-3">
          <p className="text-xs text-muted-foreground">
            {isDutch ? 'Recente cijfers' : 'Recent grades'} ({allGrades.length})
          </p>
          <div className="space-y-2">
            {recentGrades.map(grade => (
              <GradeCard key={grade.id} grade={grade} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allGrades.length === 0 && (
        <div className="class-panel-lg flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {isDutch ? 'Nog geen cijferlijsten. Maak er een aan om te beginnen.' : 'No grade sets yet. Create one to get started.'}
          </p>
          <Link href="/teacher-grades/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {isDutch ? 'Eerste cijferlijst' : 'Create first grade set'}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
