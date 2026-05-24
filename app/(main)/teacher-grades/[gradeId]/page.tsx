'use client';

import { useEffect, useState, useMemo, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Edit, Trash2, Download, Upload } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

type GradeSet = {
  id: string;
  title: string;
  class_id: string;
  class_name?: string;
  subject?: { title?: string } | null;
  weight?: number;
  frequency?: string;
  description?: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  updated_at?: string;
  student_grades?: Array<{
    id: string;
    student_id: string;
    grade_numeric?: number | null;
    grade_value?: string | null;
  }>;
};

function fmtDate(iso: string) {
  try { return format(parseISO(iso), 'd MMM yyyy'); } catch { return ''; }
}

export default function GradeDetailPage() {
  const params = useParams();
  const gradeId = params.gradeId as string;
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';
  const router = useRouter();

  const [gradeSet, setGradeSet] = useState<GradeSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gradeId) return;

    const loadGrade = async () => {
      try {
        // Find the grade across all classes
        const classes = context?.classes || [];
        let found = null;

        for (const cls of classes) {
          const res = await fetch(`/api/classes/${cls.id}/grades`);
          if (!res.ok) continue;

          const data = await res.json();
          const gs = (data.grade_sets || []).find((g: any) => g.id === gradeId);
          if (gs) {
            found = { ...gs, class_name: cls.name };
            break;
          }
        }

        if (!found) {
          setError(isDutch ? 'Cijferlijst niet gevonden' : 'Grade set not found');
          setGradeSet(null);
        } else {
          setGradeSet(found);
          setError(null);
        }
      } catch (err) {
        setError(isDutch ? 'Fout bij laden' : 'Error loading');
        setGradeSet(null);
      } finally {
        setLoading(false);
      }
    };

    loadGrade();
  }, [gradeId, context?.classes, isDutch]);

  const stats = useMemo(() => {
    if (!gradeSet?.student_grades) return null;

    const grades = gradeSet.student_grades.filter(
      (g): g is { grade_numeric: number } => (g.grade_numeric ?? null) !== null
    );
    const graded = gradeSet.student_grades.filter(
      (g) => (g.grade_numeric !== null && g.grade_numeric !== undefined) || g.grade_value
    ).length;

    const numericGrades = grades.map(g => g.grade_numeric);
    const avg = numericGrades.length > 0
      ? numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length
      : null;

    const distribution: Record<number, number> = {};
    for (const g of numericGrades) {
      const rounded = Math.round(g);
      distribution[rounded] = (distribution[rounded] || 0) + 1;
    }

    return {
      total: gradeSet.student_grades.length,
      graded,
      average: avg,
      distribution,
      highest: numericGrades.length > 0 ? Math.max(...numericGrades) : null,
      lowest: numericGrades.length > 0 ? Math.min(...numericGrades) : null,
    };
  }, [gradeSet?.student_grades]);

  const progressPct = stats ? Math.round((stats.graded / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="page-content max-w-3xl mx-auto py-6">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-40 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !gradeSet) {
    return (
      <div className="page-content max-w-3xl mx-auto py-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          {isDutch ? 'Terug' : 'Back'}
        </button>
        <Card className="p-8 text-center surface-panel border border-border">
          <p className="text-muted-foreground">
            {error || (isDutch ? 'Cifferlijst niet gevonden' : 'Grade set not found')}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-content max-w-3xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          {isDutch ? 'Terug' : 'Back'}
        </button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title">{gradeSet.title}</h1>
            <p className="page-subtitle mt-0.5">
              {gradeSet.class_name}
              {gradeSet.subject?.title && ` • ${gradeSet.subject.title}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <Card className="p-3 surface-panel border border-border space-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">{isDutch ? 'Status' : 'Status'}:</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            gradeSet.status === 'draft' ? 'bg-gray-100 text-gray-700' :
            gradeSet.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
            'bg-green-100 text-green-800'
          }`}>
            {gradeSet.status === 'in_progress' ? 'In progress' : gradeSet.status === 'completed' ? 'Done' : 'Draft'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{isDutch ? 'Gewicht' : 'Weight'}:</span>
          <span className="font-semibold">{gradeSet.weight} pts</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{isDutch ? 'Gemaakt' : 'Created'}:</span>
          <span className="font-semibold text-xs">{fmtDate(gradeSet.created_at)}</span>
        </div>
        {gradeSet.description && (
          <div className="border-t border-border pt-1.5">
            <p className="text-muted-foreground text-xs mb-0.5">{isDutch ? 'Beschrijving' : 'Description'}:</p>
            <p className="text-xs">{gradeSet.description}</p>
          </div>
        )}
      </Card>

      {/* Stats */}
      {stats && (
        <Card className="p-3 surface-panel border border-border space-y-2">
          <h3 className="font-semibold text-sm">{isDutch ? 'Beoordelingsvoortgang' : 'Grading Progress'}</h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{isDutch ? 'Beoordeeld' : 'Graded'}</span>
              <span className="font-semibold">{stats.graded} / {stats.total}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-brand)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">{progressPct}%</p>
          </div>

          {stats.average !== null && (
            <div className="space-y-1.5 border-t border-border pt-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground text-xs">{isDutch ? 'Gemiddelde' : 'Average'}</p>
                  <p className="font-bold text-base">{stats.average.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{isDutch ? 'Range' : 'Range'}</p>
                  <p className="font-bold text-base">
                    {stats.lowest?.toFixed(1)}-{stats.highest?.toFixed(1)}
                  </p>
                </div>
              </div>

              {Object.keys(stats.distribution).length > 0 && (
                <div className="border-t border-border pt-2">
                  <p className="text-xs font-semibold mb-1.5">{isDutch ? 'Verdeling' : 'Distribution'}</p>
                  <div className="space-y-0.5">
                    {Array.from({ length: 10 }, (_, i) => 10 - i).map(grade => {
                      const count = stats.distribution[grade] || 0;
                      return (
                        <div key={grade} className="flex items-center justify-between text-xs">
                          <span className="w-6">{grade}.0:</span>
                          <div className="flex items-center gap-1.5 flex-1 ml-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--accent-brand)]"
                                style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="font-medium w-4 text-right">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <Link href={`/teacher-grades/${gradeId}/grading`}>
          <Button className="w-full">
            {isDutch ? 'Doorgaan met beoordelen' : 'Continue Grading'} →
          </Button>
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            {isDutch ? 'Importeren' : 'Import'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {isDutch ? 'Exporteren' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  );
}
