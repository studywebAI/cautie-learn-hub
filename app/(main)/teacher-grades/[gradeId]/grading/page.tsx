'use client';

import { useEffect, useState, useMemo, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  ChevronLeft,
  Save,
  Edit2,
  Download,
  RotateCcw,
  RotateCw,
  ChevronUp,
  ChevronDown,
  Upload,
} from 'lucide-react';
import { useGradeHistory } from '@/hooks/useGradeHistory';
import { getGradeColor } from '@/lib/grade-coloring';
import { calculateGradeStats, getGradeDistribution } from '@/lib/grade-calculations';
import { exportGradesToHTML, exportGradesToPDF, exportGradesToCSV, downloadGradesAsCSV } from '@/lib/grade-export';
import BulkImportDialog from '@/components/grades/bulk-import-dialog';
import { GradingTemplatePicker } from '@/components/grades/grading-template-picker';
import { Send, MessageSquareText, Flag, RotateCcw as ReopenIcon, X as DismissIcon, ListChecks } from 'lucide-react';
import { AnswerReviewDialog } from '@/components/grades/answer-review-dialog';

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

export default function GradingInterfacePage() {
  const params = useParams();
  const gradeId = params.gradeId as string;
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';
  const router = useRouter();

  const [gradeSet, setGradeSet] = useState<any>(null);
  const [classId, setClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const gradeHistory = useGradeHistory({});
  const { state: grades, setState: setGradeState, undo, redo, canUndo, canRedo } = gradeHistory;
  const [weights, setWeights] = useState<Record<string, number | null>>({});
  const [sort, setSort] = useState<'name' | 'high-to-low' | 'low-to-high'>('name');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [previousGrades, setPreviousGrades] = useState<Record<string, PreviousGrade[]>>({});
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [gradeValues, setGradeValues] = useState<Record<string, string | null>>({});
  const [rawScores, setRawScores] = useState<Record<string, { score: number; maxScore: number }>>({});
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [releasing, setReleasing] = useState<'answers' | 'grade' | null>(null);
  const [disputes, setDisputes] = useState<Array<{ event_id: string; student_name: string; question: string; note: string }>>([]);
  const [resolvingDispute, setResolvingDispute] = useState<string | null>(null);
  const [answerReviewOpen, setAnswerReviewOpen] = useState(false);

  // Load grade set and students
  useEffect(() => {
    const loadData = async () => {
      try {
        const classes = context?.classes || [];
        let foundGrade = null;
        let foundClassId = null;

        // Find the grade set
        for (const cls of classes) {
          const res = await fetch(`/api/classes/${cls.id}/grades`);
          if (!res.ok) continue;

          const data = await res.json();
          const gs = (data.grade_sets || []).find((g: any) => g.id === gradeId);
          if (gs) {
            foundGrade = gs;
            foundClassId = cls.id;
            break;
          }
        }

        if (!foundGrade || !foundClassId) {
          setLoading(false);
          return;
        }

        setGradeSet(foundGrade);
        setClassId(foundClassId);

        // Load students
        const studRes = await fetch(`/api/classes/${foundClassId}/students`);
        if (studRes.ok) {
          const studData = await studRes.json();
          const loadedStudents = studData.students || [];
          setStudents(loadedStudents);

          // Initialize grades and weights from grade set
          const gradeMap: Record<string, number | null> = {};
          const weightMap: Record<string, number | null> = {};
          const valueMap: Record<string, string | null> = {};
          (foundGrade.student_grades || []).forEach((sg: any) => {
            gradeMap[sg.student_id] = sg.grade_numeric || null;
            weightMap[sg.student_id] = sg.weight || null;
            valueMap[sg.student_id] = sg.grade_value || null;
          });
          setGradeState(gradeMap);
          setWeights(weightMap);
          setGradeValues(valueMap);
          setSelectedPresetId(foundGrade.grading_preset_id || null);
        }

        if (foundGrade.assignment_id) {
          const scoresRes = await fetch(`/api/classes/${foundClassId}/grades/${foundGrade.id}/scores`);
          if (scoresRes.ok) {
            const scoresData = await scoresRes.json();
            const map: Record<string, { score: number; maxScore: number }> = {};
            for (const row of scoresData.scores || []) {
              map[row.student_id] = { score: row.score, maxScore: row.max_score };
            }
            setRawScores(map);
          }
          await loadDisputes(foundClassId, foundGrade.id);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [gradeId, context?.classes]);

  const loadDisputes = async (cid: string, gsId: string) => {
    const res = await fetch(`/api/classes/${cid}/grades/${gsId}/disputes`);
    if (res.ok) {
      const data = await res.json();
      setDisputes(data.disputes || []);
    }
  };

  const resolveDispute = async (eventId: string, action: 'reopen' | 'dismiss') => {
    if (!classId || !gradeSet?.id || resolvingDispute) return;
    setResolvingDispute(eventId);
    try {
      await fetch(`/api/classes/${classId}/grades/${gradeSet.id}/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, action }),
      });
      await loadDisputes(classId, gradeSet.id);
    } finally {
      setResolvingDispute(null);
    }
  };

  const reloadStudentGrades = async () => {
    if (!classId || !gradeSet?.id) return;
    const res = await fetch(`/api/classes/${classId}/grades/${gradeSet.id}`);
    if (!res.ok) return;
    const data = await res.json();
    const gs = data.grade_set;
    const gradeMap: Record<string, number | null> = {};
    const valueMap: Record<string, string | null> = {};
    (gs?.student_grades || []).forEach((sg: any) => {
      gradeMap[sg.student_id] = sg.grade_numeric ?? null;
      valueMap[sg.student_id] = sg.grade_value ?? null;
    });
    setGradeState(gradeMap);
    setGradeValues(valueMap);
    setGradeSet((prev: any) => ({ ...prev, ...gs }));
  };

  const applyTemplate = async () => {
    if (!classId || !gradeSet?.id || !selectedPresetId || applyingTemplate) return;
    setApplyingTemplate(true);
    try {
      await fetch(`/api/classes/${classId}/grades/${gradeSet.id}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_id: selectedPresetId }),
      });
      await reloadStudentGrades();
    } finally {
      setApplyingTemplate(false);
    }
  };

  const releaseResults = async (type: 'answers' | 'grade') => {
    if (!classId || !gradeSet?.id || releasing) return;
    setReleasing(type);
    try {
      const res = await fetch(`/api/classes/${classId}/grades/${gradeSet.id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        setGradeSet((prev: any) => ({ ...prev, ...data.grade_set }));
      }
    } finally {
      setReleasing(null);
    }
  };

  const handleExpandStudent = (studentId: string) => {
    setExpandedStudent(prev => (prev === studentId ? null : studentId));
    void loadPreviousGrades(studentId);
  };

  // Load previous grades when student is expanded
  const loadPreviousGrades = async (studentId: string) => {
    if (previousGrades[studentId]) return;

    try {
      const res = await fetch(
        `/api/classes/${classId}/students/${studentId}/grades${
          gradeSet.subject_id ? `?subjectId=${gradeSet.subject_id}` : ''
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

  const stats = useMemo(() => {
    const gradeValues = Object.values(grades).filter((g): g is number => g !== null && g !== undefined);
    if (gradeValues.length === 0) return null;
    return calculateGradeStats(gradeValues);
  }, [grades]);

  const distribution = useMemo(() => {
    const gradeValues = Object.values(grades).filter((g): g is number => g !== null && g !== undefined);
    if (gradeValues.length === 0) return null;
    return getGradeDistribution(gradeValues);
  }, [grades]);

  const getPreviousStats = (studentId: string) => {
    const prev = previousGrades[studentId] || [];
    if (prev.length === 0) return null;

    const sum = prev.reduce((acc, g) => acc + g.grade, 0);
    const avg = sum / prev.length;
    const percentage = (avg / 10) * 100;

    return {
      grades: prev,
      average: avg,
      percentage: Math.round(percentage),
    };
  };

  const progressPct = students.length > 0 ? Math.round((gradedCount / students.length) * 100) : 0;

  const handleSave = async () => {
    if (!gradeSet?.id || !classId) return;

    setSaving(true);
    try {
      const promises = Object.entries(grades).map(async ([studentId, grade]) => {
        return fetch(`/api/classes/${classId}/grades/${gradeSet.id}/students/${studentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grade,
            weight: weights[studentId] || null,
          }),
        });
      });

      await Promise.all(promises);
      setIsEditMode(false);
    } catch (err) {
      console.error('Error saving grades:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportHTML = () => {
    if (!gradeSet) return;
    const html = exportGradesToHTML(
      {
        title: gradeSet.title,
        class_name: gradeSet.class_name || '',
        subject_title: gradeSet.subject?.title,
        created_at: gradeSet.created_at,
        status: gradeSet.status,
        weight: gradeSet.weight,
        students: sortedStudents.map(s => ({
          studentId: s.id,
          studentName: s.full_name,
          grade: grades[s.id] || null,
          weight: weights[s.id] || undefined,
          letterGrade: getGradeColor(grades[s.id] || undefined).letterGrade,
          color: getGradeColor(grades[s.id] || undefined).color,
        })),
        stats: stats ?? undefined,
        distribution: distribution ?? undefined,
      }
    );

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gradeSet.title.replace(/\s+/g, '_')}_grades.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBulkImport = (gradeMap: Record<string, number | null>) => {
    // Map the imported grades using student IDs
    const idMap: Record<string, string> = {};
    students.forEach(s => {
      const name = s.full_name.toLowerCase();
      idMap[name] = s.id;
    });

    const newGrades = { ...grades };
    Object.entries(gradeMap).forEach(([studentName, grade]) => {
      const matchingKey = Object.keys(idMap).find(key =>
        key.includes(studentName.toLowerCase()) ||
        studentName.toLowerCase().includes(key)
      );
      if (matchingKey) {
        newGrades[idMap[matchingKey]] = grade;
      }
    });

    setGradeState(newGrades);
  };

  if (loading) {
    return (
      <div className="page-content max-w-6xl mx-auto py-6">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-96 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!gradeSet) {
    return (
      <div className="page-content max-w-6xl mx-auto py-6">
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
    <div className="page-content max-w-6xl mx-auto py-6 space-y-4">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="h-4 w-4" />
        {isDutch ? 'Terug' : 'Back'}
      </button>

      <PageHeader
        title={gradeSet.title}
        subtitle={
          <>
            {isDutch ? 'Klas' : 'Class'}: {gradeSet.class_name}
            {gradeSet.subject?.title && ` • ${gradeSet.subject.title}`}
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportHTML}
              title={isDutch ? 'Exporteren als HTML' : 'Export as HTML'}
            >
              <Download className="h-4 w-4" />
            </Button>

            {isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportDialogOpen(true)}
                title={isDutch ? 'Bulk importeren' : 'Bulk import'}
              >
                <Upload className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant={isEditMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {isEditMode ? isDutch ? 'Gereed' : 'Done' : isDutch ? 'Bewerk' : 'Edit'}
            </Button>

            {isEditMode && (
              <Button onClick={handleSave} disabled={saving || gradedCount === 0}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? isDutch ? 'Opslaan...' : 'Saving...' : isDutch ? 'Opslaan' : 'Save'}
              </Button>
            )}
          </>
        }
      />

      {/* Gemelde nakijk-issues */}
      {disputes.length > 0 && (
        <Card className="p-3 surface-panel border border-amber-300 space-y-2">
          <p className="text-xs flex items-center gap-1.5 text-amber-800">
            <Flag className="h-3.5 w-3.5" />
            {isDutch ? `${disputes.length} melding(en) van leerlingen` : `${disputes.length} student report(s)`}
          </p>
          <div className="space-y-1.5">
            {disputes.map(d => (
              <div key={d.event_id} className="text-xs bg-amber-50 dark:bg-amber-950/20 rounded-md p-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{d.student_name} — {d.question}</p>
                  <p className="text-muted-foreground">{d.note}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 px-2" disabled={resolvingDispute === d.event_id} onClick={() => resolveDispute(d.event_id, 'reopen')} title={isDutch ? 'Heropen voor nakijken' : 'Reopen for review'}>
                    <ReopenIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" disabled={resolvingDispute === d.event_id} onClick={() => resolveDispute(d.event_id, 'dismiss')} title={isDutch ? 'Afwijzen' : 'Dismiss'}>
                    <DismissIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Cijfer-template + vrijgeven (alleen voor toets-gekoppelde cijferlijsten) */}
      {gradeSet.assignment_id && classId && (
        <Card className="p-3 surface-panel border border-border space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">{isDutch ? 'Cijfer-template:' : 'Grading template:'}</span>
            <GradingTemplatePicker
              classId={classId}
              isDutch={isDutch}
              selectedPresetId={selectedPresetId}
              onSelect={setSelectedPresetId}
              onApply={applyTemplate}
              applying={applyingTemplate}
            />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAnswerReviewOpen(true)}
            >
              <ListChecks className="h-4 w-4 mr-1.5" />
              {isDutch ? 'Antwoorden bekijken' : 'Review answers'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={releasing !== null || !!gradeSet.answers_released_at}
              onClick={() => releaseResults('answers')}
            >
              <MessageSquareText className="h-4 w-4 mr-1.5" />
              {gradeSet.answers_released_at
                ? (isDutch ? 'Antwoorden vrijgegeven' : 'Answers released')
                : (isDutch ? 'Antwoorden vrijgeven' : 'Release answers')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={releasing !== null || !!gradeSet.grade_released_at}
              onClick={() => releaseResults('grade')}
            >
              <Send className="h-4 w-4 mr-1.5" />
              {gradeSet.grade_released_at
                ? (isDutch ? 'Cijfer vrijgegeven' : 'Grade released')
                : (isDutch ? 'Cijfer vrijgeven' : 'Release grade')}
            </Button>
          </div>
        </Card>
      )}

      {/* Sort buttons and undo/redo */}
      {isEditMode && (
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
            {isDutch ? 'Hoog → Laag' : 'High → Low'}
          </Button>
          <Button
            size="sm"
            variant={sort === 'low-to-high' ? 'default' : 'outline'}
            onClick={() => setSort('low-to-high')}
          >
            {isDutch ? 'Laag → Hoog' : 'Low → High'}
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
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="bg-muted border-b border-border">
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr] gap-4 px-4 py-3 text-xs text-muted-foreground">
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
                    {rawScores[student.id] && (
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        ({rawScores[student.id].score}/{rawScores[student.id].maxScore})
                      </span>
                    )}
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
                        if (!isEditMode) return;
                        const value = e.target.value ? parseFloat(e.target.value) : null;
                        setGradeState({ ...grades, [student.id]: value });
                      }}
                      disabled={!isEditMode}
                      placeholder=""
                      style={{
                        color: currentGrade !== null ? gradeColor.color : 'inherit',
                        borderColor: currentGrade !== null ? gradeColor.color : 'var(--color-border)',
                      }}
                      className="w-16 text-center h-9 text-sm border-2 bg-white dark:bg-[hsl(var(--surface-1))] disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    {currentGrade === null && gradeValues[student.id] && (
                      <span className="text-xs text-muted-foreground ml-1.5">{gradeValues[student.id]}</span>
                    )}
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
                        if (!isEditMode) return;
                        const value = e.target.value ? parseFloat(e.target.value) : null;
                        setWeights({ ...weights, [student.id]: value });
                      }}
                      disabled={!isEditMode}
                      placeholder=""
                      className="w-14 text-center h-9 text-sm border border-border bg-white dark:bg-[hsl(var(--surface-1))] disabled:opacity-60 disabled:cursor-not-allowed"
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

      {/* Summary stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 p-3 bg-muted rounded-lg text-xs">
          <div>
            <p className="text-muted-foreground">{isDutch ? 'Beoordeeld' : 'Graded'}</p>
            <p className="text-lg">{gradedCount} / {students.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{isDutch ? 'Voortgang' : 'Progress'}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span>{progressPct}%</span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">{isDutch ? 'Gemiddelde' : 'Average'}</p>
            <p className="text-lg">{stats.average.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{isDutch ? 'Mediaan' : 'Median'}</p>
            <p className="text-lg">{stats.median.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{isDutch ? 'Std Dev' : 'Std Dev'}</p>
            <p className="text-lg">{stats.stdDev.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Edit mode hint */}
      {!isEditMode && (
        <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground text-center">
          {isDutch ? 'Klik op "Bewerk" om cijfers in te voeren' : 'Click "Edit" to enter grades'}
        </div>
      )}

      {/* Bulk import dialog */}
      <BulkImportDialog
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImport={handleBulkImport}
        studentNames={students.map(s => s.full_name)}
      />

      {gradeSet?.assignment_id && classId && (
        <AnswerReviewDialog
          open={answerReviewOpen}
          onOpenChange={setAnswerReviewOpen}
          classId={classId}
          gradeSetId={gradeId}
          isDutch={isDutch}
        />
      )}
    </div>
  );
}
