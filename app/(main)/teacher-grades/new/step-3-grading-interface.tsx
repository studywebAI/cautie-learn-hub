'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, ChevronUp, RotateCcw, RotateCw } from 'lucide-react';
import { useGradeHistory } from '@/hooks/useGradeHistory';
import { calculateGradeStats } from '@/lib/grade-calculations';
import { getGradeColor } from '@/lib/grade-coloring';

type Student = {
  id: string;
  full_name: string;
  email?: string;
};

type PreviousGrade = {
  title: string;
  grade: number;
  weight?: number;
};

type GradeRecord = {
  grade: number | null;
  weight: number | null;
};

type StepThreeProps = {
  onBack: () => void;
  onSave: () => void;
  data: any;
  isSaving: boolean;
};

export default function StepThreeGrading({ onBack, onSave, data, isSaving }: StepThreeProps) {
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';

  const [students, setStudents] = useState<Student[]>([]);
  const [sort, setSort] = useState<'name' | 'high-to-low' | 'low-to-high'>('name');
  const [loading, setLoading] = useState(true);
  const gradeHistory = useGradeHistory({});
  const { state: grades, setState: setGradeState, undo, redo, canUndo, canRedo } = gradeHistory;
  const [weights, setWeights] = useState<Record<string, number | null>>({});
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [previousGrades, setPreviousGrades] = useState<Record<string, PreviousGrade[]>>({});

  const defaultWeight = data.weight || null;

  // Load students
  useEffect(() => {
    if (!data.classId) return;

    const loadStudents = async () => {
      try {
        const res = await fetch(`/api/classes/${data.classId}/students`);
        if (!res.ok) {
          setStudents([]);
          return;
        }
        const responseData = await res.json();
        const loadedStudents = responseData.students || [];
        setStudents(loadedStudents);

        // Initialize weights with default value
        const initialWeights: Record<string, number | null> = {};
        loadedStudents.forEach((student: Student) => {
          initialWeights[student.id] = defaultWeight;
        });
        setWeights(initialWeights);
      } catch {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [data.classId, defaultWeight]);

  // Load previous grades when student is expanded
  const loadPreviousGrades = async (studentId: string) => {
    if (previousGrades[studentId]) return; // Already loaded

    try {
      const res = await fetch(
        `/api/classes/${data.classId}/students/${studentId}/grades${
          data.subjectId ? `?subjectId=${data.subjectId}` : ''
        }`
      );
      if (!res.ok) {
        setPreviousGrades(prev => ({ ...prev, [studentId]: [] }));
        return;
      }
      const responseData = await res.json();
      setPreviousGrades(prev => ({
        ...prev,
        [studentId]: responseData.grades || [],
      }));
    } catch {
      setPreviousGrades(prev => ({ ...prev, [studentId]: [] }));
    }
  };

  const sortedStudents = useMemo(() => {
    const sorted = [...students];

    if (sort === 'name') {
      sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (sort === 'high-to-low') {
      sorted.sort((a, b) => (grades[b.id] ?? -Infinity) - (grades[a.id] ?? -Infinity));
    } else if (sort === 'low-to-high') {
      sorted.sort((a, b) => (grades[a.id] ?? Infinity) - (grades[b.id] ?? Infinity));
    }

    return sorted;
  }, [students, sort, grades]);

  const gradedCount = useMemo(() => {
    return Object.values(grades).filter(g => g !== null && g !== undefined).length;
  }, [grades]);

  const classAverage = useMemo(() => {
    const gradeValues = Object.values(grades).filter((g): g is number => g !== null && g !== undefined);
    if (gradeValues.length === 0) return null;
    return gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length;
  }, [grades]);

  const getPreviousStats = (studentId: string) => {
    const prev = previousGrades[studentId] || [];
    if (prev.length === 0) return null;

    const sum = prev.reduce((acc, g) => acc + g.grade, 0);
    const avg = sum / prev.length;
    const percentage = (avg / 10) * 100; // Assuming max grade is 10

    // Calculate weighted average if weights are available
    const hasWeights = prev.some(g => g.weight);
    let weightedAvg = null;
    if (hasWeights) {
      const totalWeight = prev.reduce((acc, g) => acc + (g.weight || 1), 0);
      const weightedSum = prev.reduce((acc, g) => acc + g.grade * (g.weight || 1), 0);
      weightedAvg = weightedSum / totalWeight;
    }

    return {
      grades: prev,
      average: avg,
      percentage: Math.round(percentage),
      weightedAverage: weightedAvg,
    };
  };

  const progressPct = students.length > 0 ? Math.round((gradedCount / students.length) * 100) : 0;

  const handleExpandStudent = (studentId: string) => {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
    } else {
      setExpandedStudent(studentId);
      loadPreviousGrades(studentId);
    }
  };

  const handleGradeChange = (studentId: string, value: number | null) => {
    setGradeState({ ...grades, [studentId]: value });
  };

  const handleWeightChange = (studentId: string, value: number | null) => {
    setWeights({ ...weights, [studentId]: value });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-muted rounded-lg animate-pulse" />
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
        <p className="font-semibold">{data.title}</p>
        <p className="text-xs text-muted-foreground">
          {isDutch ? 'Klas' : 'Class'}: {data.className}
        </p>
      </div>

      {/* Sort buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={sort === 'name' ? 'default' : 'outline'}
          onClick={() => setSort('name')}
        >
          {isDutch ? 'Naam' : 'Name'}
        </Button>
        <Button
          size="sm"
          variant={sort === 'high-to-low' ? 'default' : 'outline'}
          onClick={() => setSort('high-to-low')}
        >
          {isDutch ? 'Hoog naar Laag' : 'High → Low'}
        </Button>
        <Button
          size="sm"
          variant={sort === 'low-to-high' ? 'default' : 'outline'}
          onClick={() => setSort('low-to-high')}
        >
          {isDutch ? 'Laag naar Hoog' : 'Low → High'}
        </Button>

        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={undo}
            disabled={!canUndo}
            title={isDutch ? 'Ongedaan maken' : 'Undo'}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={redo}
            disabled={!canRedo}
            title={isDutch ? 'Opnieuw doen' : 'Redo'}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="bg-muted border-b border-border">
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr] gap-4 px-4 py-3 text-xs font-semibold text-muted-foreground">
            <div>{isDutch ? 'Student' : 'Student'}</div>
            <div>{isDutch ? 'Vorige Cijfers' : 'Previous Grades'}</div>
            <div className="text-center">{isDutch ? 'Cijfer' : 'Grade'}</div>
            <div className="text-center">{isDutch ? 'Gewicht' : 'Weight'}</div>
          </div>
        </div>

        {/* Table body */}
        {students.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {isDutch ? 'Geen studenten in deze klas' : 'No students in this class'}
          </div>
        ) : (
          sortedStudents.map(student => {
            const isExpanded = expandedStudent === student.id;
            const stats = getPreviousStats(student.id);
            const currentGrade = grades[student.id];
            const currentWeight = weights[student.id];
            const gradeColor = getGradeColor(currentGrade || undefined);

            return (
              <div key={student.id}>
                {/* Main row */}
                <div className="grid grid-cols-[2fr_2fr_1fr_1fr] gap-4 px-4 py-3 items-center border-b border-border hover:bg-muted/30 transition-colors">
                  {/* Student name with expand button */}
                  <button
                    onClick={() => handleExpandStudent(student.id)}
                    className="flex items-center gap-2 text-left hover:text-[var(--accent-brand)] transition-colors"
                  >
                    {stats && stats.grades.length > 0 && (
                      <>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </>
                    )}
                    <span className="text-sm font-medium">{student.full_name}</span>
                  </button>

                  {/* Previous grades summary */}
                  <div className="text-xs text-muted-foreground">
                    {stats && stats.grades.length > 0 ? (
                      <div>
                        <div>
                          {stats.grades.map(g => g.grade.toFixed(1)).join(', ')}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {isDutch ? 'Avg' : 'Avg'}: {stats.percentage}% • {stats.average.toFixed(1)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Grade input */}
                  <div className="flex justify-center">
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={currentGrade ?? ''}
                      onChange={e => {
                        const value = e.target.value ? parseFloat(e.target.value) : null;
                        handleGradeChange(student.id, value);
                      }}
                      placeholder=""
                      style={{
                        color: currentGrade !== null ? gradeColor.color : 'inherit',
                        borderColor: currentGrade !== null ? gradeColor.color : 'var(--color-border)',
                      }}
                      className="w-16 text-center h-9 text-sm border-2 bg-white dark:bg-[hsl(var(--surface-1))]"
                    />
                  </div>

                  {/* Weight input */}
                  <div className="flex justify-center">
                    <Input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.5"
                      value={currentWeight ?? ''}
                      onChange={e => {
                        const value = e.target.value ? parseFloat(e.target.value) : null;
                        handleWeightChange(student.id, value);
                      }}
                      placeholder=""
                      className="w-14 text-center h-9 text-sm border border-border bg-white dark:bg-[hsl(var(--surface-1))]"
                    />
                  </div>
                </div>

                {/* Expanded row */}
                {isExpanded && stats && stats.grades.length > 0 && (
                  <div className="grid grid-cols-[2fr_2fr_1fr_1fr] gap-4 px-4 py-3 bg-muted/20 border-b border-border/50 text-xs">
                    <div />
                    <div className="space-y-1 col-span-3">
                      <div className="space-y-1">
                        {stats.grades.map((grade, idx) => (
                          <div key={idx} className="flex justify-between text-muted-foreground">
                            <span>{grade.title}</span>
                            <span className="font-medium">{grade.grade.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-muted rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">{isDutch ? 'Beoordeeld' : 'Graded'}</p>
          <p className="text-lg font-semibold">
            {gradedCount} / {students.length}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{isDutch ? 'Voortgang' : 'Progress'}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-brand)] transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-sm font-semibold">{progressPct}%</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{isDutch ? 'Gemiddelde Klas' : 'Class Avg'}</p>
          <p className="text-lg font-semibold">
            {classAverage ? classAverage.toFixed(1) : '—'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-2 pt-4 border-t border-border">
        <Button variant="outline" onClick={onBack}>
          ← {isDutch ? 'Terug' : 'Back'}
        </Button>
        <Button onClick={onSave} disabled={isSaving || gradedCount === 0}>
          <Check className="h-4 w-4 mr-2" />
          {isSaving ? isDutch ? 'Opslaan...' : 'Saving...' : isDutch ? 'Opslaan & Voltooien' : 'Save & Complete'}
        </Button>
      </div>
    </div>
  );
}
