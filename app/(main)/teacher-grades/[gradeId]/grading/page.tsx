'use client';

import { useEffect, useState, useMemo, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Search, Save } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Student = {
  id: string;
  full_name: string;
  email?: string;
};

type GradeData = {
  student_id: string;
  grade_numeric?: number | null;
  grade_value?: string | null;
};

export default function GradingInterfacePage() {
  const params = useParams();
  const gradeId = params.gradeId as string;
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';
  const router = useRouter();

  const [gradeSet, setGradeSet] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, number | null>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'graded' | 'ungraded'>('all');
  const [sort, setSort] = useState('name');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load grade set and students
  useEffect(() => {
    const loadData = async () => {
      try {
        const classes = context?.classes || [];
        let foundGrade = null;
        let classId = null;

        // Find the grade set
        for (const cls of classes) {
          const res = await fetch(`/api/classes/${cls.id}/grades`);
          if (!res.ok) continue;

          const data = await res.json();
          const gs = (data.grade_sets || []).find((g: any) => g.id === gradeId);
          if (gs) {
            foundGrade = gs;
            classId = cls.id;
            break;
          }
        }

        if (!foundGrade || !classId) {
          setLoading(false);
          return;
        }

        setGradeSet(foundGrade);

        // Load students
        const studRes = await fetch(`/api/classes/${classId}/students`);
        if (studRes.ok) {
          const studData = await studRes.json();
          setStudents(studData.students || []);

          // Initialize grades from student_grades
          const gradeMap: Record<string, number | null> = {};
          (foundGrade.student_grades || []).forEach((sg: any) => {
            gradeMap[sg.student_id] = sg.grade_numeric || null;
          });
          setGrades(gradeMap);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [gradeId, context?.classes]);

  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.full_name.toLowerCase().includes(q));
    }

    if (filter === 'graded') {
      result = result.filter(s => grades[s.id] !== undefined && grades[s.id] !== null);
    } else if (filter === 'ungraded') {
      result = result.filter(s => grades[s.id] === undefined || grades[s.id] === null);
    }

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

  const progressPct = students.length > 0 ? Math.round((gradedCount / students.length) * 100) : 0;

  const handleSave = async () => {
    if (!gradeSet?.id || !gradeSet?.class_id) return;

    setSaving(true);
    try {
      // Save each grade individually
      const promises = Object.entries(grades).map(async ([studentId, grade]) => {
        if (grade === null || grade === undefined) return;

        return fetch(`/api/classes/${gradeSet.class_id}/grades/${gradeSet.id}/students/${studentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grade }),
        });
      });

      await Promise.all(promises);

      // Redirect back to grade details
      router.push(`/teacher-grades/${gradeId}`);
    } catch (err) {
      console.error('Error saving grades:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content max-w-4xl mx-auto py-6">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-96 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!gradeSet) {
    return (
      <div className="page-content max-w-4xl mx-auto py-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          {isDutch ? 'Terug' : 'Back'}
        </button>
        <p className="text-muted-foreground">
          {isDutch ? 'Cijferlijst niet gevonden' : 'Grade set not found'}
        </p>
      </div>
    );
  }

  return (
    <div className="page-content max-w-4xl mx-auto py-6 space-y-4">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          {isDutch ? 'Terug' : 'Back'}
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">{gradeSet.title}</h1>
            <p className="page-subtitle mt-0.5">
              {isDutch ? 'Beoordeel' : 'Grade'} {students.length} {isDutch ? 'studenten' : 'students'}
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving || gradedCount === 0}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? (isDutch ? 'Opslaan...' : 'Saving...') : (isDutch ? 'Opslaan' : 'Save')}
          </Button>
        </div>
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
                <SelectItem value="name">{isDutch ? 'Op naam' : 'By Name'}</SelectItem>
                <SelectItem value="grade">{isDutch ? 'Op cijfer' : 'By Grade'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grading table */}
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="text-left p-3 font-semibold text-xs text-muted-foreground">
                {isDutch ? 'Studenten' : 'Student Name'}
              </th>
              <th className="text-center p-3 font-semibold text-xs text-muted-foreground w-24">
                {isDutch ? 'Cijfer' : 'Grade'}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, idx) => (
              <tr
                key={student.id}
                className={`border-b border-border hover:bg-muted/30 transition-colors ${
                  idx % 2 === 0 ? '' : 'bg-muted/10'
                }`}
              >
                <td className="p-3 text-sm font-medium">{student.full_name}</td>
                <td className="p-3 text-center">
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={grades[student.id] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : null;
                      setGrades(prev => ({
                        ...prev,
                        [student.id]: value,
                      }));
                    }}
                    placeholder="-"
                    className="w-full text-center h-8 text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-muted rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{isDutch ? 'Beoordeeld' : 'Graded'}</p>
          <p className="font-bold text-lg">
            {gradedCount} / {students.length}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">{isDutch ? 'Vooruitgang' : 'Progress'}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-brand)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="font-semibold text-sm w-8 text-right">{progressPct}%</span>
          </div>
        </div>
        {averageGrade !== null && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">{isDutch ? 'Gemiddelde' : 'Average'}</p>
            <p className="font-bold text-lg">{averageGrade.toFixed(1)}</p>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex gap-2 pt-4 border-t border-border">
        <Button variant="outline" onClick={() => router.back()}>
          {isDutch ? 'Annuleren' : 'Cancel'}
        </Button>
        <Button onClick={handleSave} disabled={saving || gradedCount === 0} className="ml-auto">
          <Save className="h-4 w-4 mr-2" />
          {saving ? (isDutch ? 'Opslaan...' : 'Saving...') : (isDutch ? 'Opslaan' : 'Save Changes')}
        </Button>
      </div>
    </div>
  );
}
