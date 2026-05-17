'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Check, ChevronDown, ChevronRight } from 'lucide-react';

type Student = {
  id: string;
  full_name: string;
  email?: string;
};

type PreviousGrade = {
  title: string;
  grade: number;
  date: string;
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'graded' | 'ungraded'>('all');
  const [sort, setSort] = useState('name');
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<Record<string, number | null>>({});
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [previousGrades, setPreviousGrades] = useState<Record<string, PreviousGrade[]>>({});

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
        setStudents(responseData.students || []);
      } catch {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [data.classId]);

  // Load previous grades when student is expanded
  const loadPreviousGrades = async (studentId: string) => {
    if (previousGrades[studentId]) return; // Already loaded

    try {
      const res = await fetch(
        `/api/classes/${data.classId}/students/${studentId}/grades${data.subjectId ? `?subjectId=${data.subjectId}` : ''}`
      );
      if (!res.ok) {
        setPreviousGrades(prev => ({ ...prev, [studentId]: [] }));
        return;
      }
      const responseData = await res.json();
      setPreviousGrades(prev => ({
        ...prev,
        [studentId]: responseData.grades || []
      }));
    } catch {
      setPreviousGrades(prev => ({ ...prev, [studentId]: [] }));
    }
  };

  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.full_name.toLowerCase().includes(q));
    }

    // Status filter
    if (filter === 'graded') {
      result = result.filter(s => grades[s.id] !== undefined && grades[s.id] !== null);
    } else if (filter === 'ungraded') {
      result = result.filter(s => grades[s.id] === undefined || grades[s.id] === null);
    }

    // Sort
    if (sort === 'grade') {
      result.sort((a, b) => (grades[b.id] ?? -1) - (grades[a.id] ?? -1));
    } else {
      result.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }

    return result;
  }, [students, search, filter, sort, grades]);

  const gradedCount = useMemo(() => {
    return Object.values(grades).filter(g => g !== null && g !== undefined).length;
  }, [grades]);

  const averageGrade = useMemo(() => {
    const gradeValues = Object.values(grades).filter((g): g is number => g !== null && g !== undefined);
    if (gradeValues.length === 0) return null;
    return gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length;
  }, [grades]);

  const getPreviousAverage = (studentId: string) => {
    const prev = previousGrades[studentId] || [];
    if (prev.length === 0) return null;
    const sum = prev.reduce((acc, g) => acc + g.grade, 0);
    return sum / prev.length;
  };

  const getLiveAverage = (studentId: string) => {
    const prev = previousGrades[studentId] || [];
    const currentGrade = grades[studentId];
    if (currentGrade === null || currentGrade === undefined) {
      return getPreviousAverage(studentId);
    }
    const allGrades = [...prev.map(g => g.grade), currentGrade];
    if (allGrades.length === 0) return null;
    return allGrades.reduce((a, b) => a + b, 0) / allGrades.length;
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {isDutch ? 'Voer cijfers in voor studenten' : 'Enter grades for students'}
      </p>

      {/* Grade info */}
      <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
        <p className="font-semibold">{data.title}</p>
        <p className="text-xs text-muted-foreground">
          {isDutch ? 'Klas' : 'Class'}: {data.className} • {isDutch ? 'Gewicht' : 'Weight'}: {data.weight} pts
        </p>
      </div>

      {/* Search & Filter */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isDutch ? 'Zoek studenten...' : 'Search students...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'graded', 'ungraded'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                filter === f
                  ? 'bg-[var(--accent-brand)] border-[var(--accent-brand)] text-white'
                  : 'border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >
              {f === 'all' ? (isDutch ? 'Alle' : 'All') : f === 'graded' ? (isDutch ? 'Beoordeeld' : 'Graded') : (isDutch ? 'Niet beoordeeld' : 'Not Graded')}
              {' '}({filteredStudents.length})
            </button>
          ))}
          <div className="ml-auto">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-auto text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">
                  {isDutch ? 'Op naam' : 'By Name'}
                </SelectItem>
                <SelectItem value="grade">
                  {isDutch ? 'Op cijfer' : 'By Grade'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grading table - expandable rows */}
      <div className="space-y-1 border border-border rounded-lg divide-y divide-border overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {isDutch ? 'Geen studenten gevonden' : 'No students found'}
          </div>
        ) : (
          filteredStudents.map(student => {
            const isExpanded = expandedStudent === student.id;
            const prevAvg = getPreviousAverage(student.id);
            const liveAvg = getLiveAverage(student.id);
            const currentGrade = grades[student.id];

            return (
              <div key={student.id} className="hover:bg-muted/30 transition-colors">
                {/* Main row */}
                <button
                  onClick={() => handleExpandStudent(student.id)}
                  className="w-full p-3 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-medium">{student.full_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={currentGrade ?? ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        const value = e.target.value ? parseFloat(e.target.value) : null;
                        setGrades(prev => ({
                          ...prev,
                          [student.id]: value,
                        }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="-"
                      className="w-16 text-center h-8 text-xs"
                    />
                  </div>
                </button>

                {/* Expanded row */}
                {isExpanded && (
                  <div className="bg-muted/30 px-3 py-3 space-y-3 text-xs border-t border-border/50">
                    {/* Previous grades */}
                    {previousGrades[student.id]?.length ? (
                      <div className="space-y-1">
                        <p className="font-semibold text-muted-foreground">
                          {isDutch ? 'Eerdere Cijfers' : 'Previous Grades'}:
                        </p>
                        {previousGrades[student.id].map((pg, idx) => (
                          <div key={idx} className="flex justify-between text-muted-foreground">
                            <span>{pg.title}</span>
                            <span className="font-medium">{pg.grade.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        {isDutch ? 'Geen eerdere cijfers' : 'No previous grades'}
                      </p>
                    )}

                    {/* Averages */}
                    <div className="border-t border-border/50 pt-2 space-y-1">
                      {prevAvg !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {isDutch ? 'Vorig Gemiddelde' : 'Previous Average'}:
                          </span>
                          <span className="font-semibold">{prevAvg.toFixed(1)}</span>
                        </div>
                      )}
                      {liveAvg !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {isDutch ? 'Nieuw Gemiddelde' : 'New Average'}:
                          </span>
                          <span className="font-semibold text-[var(--accent-brand)]">
                            {liveAvg.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{isDutch ? 'Beoordeeld' : 'Graded'}</span>
          <span className="font-semibold">{gradedCount} / {students.length}</span>
        </div>
        <div className="w-full h-2 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent-brand)] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {progressPct}% {isDutch ? 'voltooid' : 'complete'}
        </div>
        {averageGrade !== null && (
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-muted-foreground">{isDutch ? 'Gemiddelde' : 'Average'}</span>
            <span className="font-semibold">{averageGrade.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-2 pt-4 border-t border-border">
        <Button variant="outline" onClick={onBack}>
          ← {isDutch ? 'Terug' : 'Back'}
        </Button>
        <Button onClick={onSave} disabled={isSaving || gradedCount === 0}>
          <Check className="h-4 w-4 mr-1" />
          {isSaving
            ? isDutch ? 'Opslaan...' : 'Saving...'
            : isDutch ? 'Opslaan & Voltooien' : 'Save & Complete'
          }
        </Button>
      </div>
    </div>
  );
}
