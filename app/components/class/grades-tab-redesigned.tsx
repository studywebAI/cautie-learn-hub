'use client';

import { useState, useEffect, useContext } from 'react';
import { Plus, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { format, parseISO, type Locale } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';

/* ─────────── Types ─────────── */
type StudentGrade = { studentId: string; studentName: string; grade: number | null; gradeRowId?: string };
type GradeSet = {
  id: string;
  name: string;
  subject: string | null;
  status: 'draft' | 'published';
  createdAt: string;
  studentCount: number;
  average: number | null;
  grades: StudentGrade[];
};

type StudentOwnGrade = {
  id: string;
  gradeSetId: string;
  gradeSetName: string;
  subject: string | null;
  grade: number | null;
  publishedAt: string;
};

/* ─────────── Constants ─────────── */
const SUBJECT_SUGGESTIONS = [
  'Biology', 'Mathematics', 'English', 'History', 'Chemistry',
  'Physics', 'Geography', 'Arts', 'PE', 'Economics',
];

const GRADE_COLOR = (g: number | null) =>
  g === null ? 'text-muted-foreground' : g >= 7 ? 'text-[var(--accent-brand)]' : g >= 5.5 ? 'text-amber-600' : 'text-destructive';

/* ─────────── Helpers ─────────── */
function fmtDate(iso: string, loc: Locale) {
  try { return format(parseISO(iso), 'MMM d, yyyy', { locale: loc }); }
  catch { return ''; }
}

/* ─────────── Grade Distribution Chart ─────────── */
function GradeDistributionChart({ grades, isDutch }: { grades: StudentGrade[]; isDutch: boolean }) {
  const valid = grades.map(g => g.grade).filter((g): g is number => g !== null);
  if (valid.length === 0) return null;

  const buckets = [
    { key: 'A', label: isDutch ? 'Uitst.' : 'Excl.', min: 8.5, max: 11, color: 'var(--accent-brand)' },
    { key: 'B', label: isDutch ? 'Goed' : 'Good', min: 7, max: 8.5, color: 'hsl(var(--chart-2, 221 83% 53%))' },
    { key: 'C', label: isDutch ? 'Vold.' : 'Pass', min: 5.5, max: 7, color: 'hsl(var(--chart-3, 43 96% 56%))' },
    { key: 'D', label: isDutch ? 'Onv.' : 'Fail', min: 0, max: 5.5, color: 'hsl(var(--chart-5, 0 84% 60%))' },
  ];

  const counts = buckets.map(b => ({
    ...b,
    count: valid.filter(g => g >= b.min && g < b.max).length,
  }));

  const maxCount = Math.max(...counts.map(c => c.count), 1);

  return (
    <div className="mb-4 rounded-lg border border-border bg-[hsl(var(--surface-1))] px-4 py-3">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {isDutch ? 'Verdeling' : 'Distribution'} · {valid.length} {isDutch ? 'cijfers' : 'grades'}
      </p>
      <div className="flex items-end gap-3">
        {counts.map(b => (
          <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
            {/* Count label */}
            <span className="text-[11px] font-semibold text-foreground/80">{b.count}</span>
            {/* Bar */}
            <div className="w-full overflow-hidden rounded-t" style={{ height: 48 }}>
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${(b.count / maxCount) * 100}%`,
                  minHeight: b.count > 0 ? 4 : 0,
                  backgroundColor: b.color,
                }}
              />
            </div>
            {/* Bucket label */}
            <div className="text-center">
              <span className="block text-[11px] font-bold" style={{ color: b.color }}>{b.key}</span>
              <span className="block text-[9px] text-muted-foreground">{b.label}</span>
            </div>
          </div>
        ))}
        {/* Percentage strip */}
        <div className="flex flex-col justify-end gap-0.5 pb-9 pl-2 text-right text-[9px] text-muted-foreground">
          {counts.map(b => b.count > 0 && (
            <span key={b.key}>
              {Math.round((b.count / valid.length) * 100)}% {b.key}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Teacher view ─────────── */
function TeacherGradesView({ classId, isDutch, dateLocale }: { classId: string; isDutch: boolean; dateLocale: Locale }) {
  const [sets, setSets] = useState<GradeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [studentNames, setStudentNames] = useState<Map<string, string>>(new Map());

  // New grade set dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubjects, setNewSubjects] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Inline grade editing
  const [editingSet, setEditingSet] = useState<string | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => { void loadSets(); }, [classId]);

  async function loadSets() {
    setLoading(true);
    setError(null);
    try {
      // Load grades and student names in parallel
      const [gradesRes, groupRes] = await Promise.allSettled([
        fetch(`/api/classes/${classId}/grades`),
        fetch(`/api/classes/${classId}/group`),
      ]);

      // Build student name map from group data
      const nameMap = new Map<string, string>();
      if (groupRes.status === 'fulfilled' && groupRes.value.ok) {
        const groupData = await groupRes.value.json();
        for (const s of groupData.students || []) {
          if (s.id) nameMap.set(String(s.id), String(s.name || s.id.slice(0, 8)));
        }
      }
      setStudentNames(nameMap);

      if (gradesRes.status === 'rejected') {
        throw new Error('Network error — check your connection');
      }
      if (!gradesRes.value.ok) {
        const status = gradesRes.value.status;
        if (status === 403) {
          // Not a teacher in this class — show empty state without error
          setSets([]);
          return;
        }
        // For other errors (500 etc) try to get error message
        let msg = `Request failed (${status})`;
        try { const j = await gradesRes.value.json(); msg = j.error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const data = await gradesRes.value.json();

      // Map API shape (snake_case) to component type (camelCase)
      const mapped: GradeSet[] = (data.grade_sets || []).map((gs: any) => {
        const rawGrades: StudentGrade[] = (gs.student_grades || []).map((sg: any) => {
          const numericGrade = typeof sg.grade_numeric === 'number' ? sg.grade_numeric
            : sg.grade_value ? parseFloat(sg.grade_value) || null : null;
          const sid = String(sg.student_id || '');
          return {
            studentId: sid,
            studentName: nameMap.get(sid) || sid.slice(0, 8) || '—',
            grade: numericGrade,
            gradeRowId: String(sg.id || ''),
          };
        });
        return {
          id: String(gs.id),
          name: String(gs.title || gs.name || ''),
          subject: gs.subject?.title || (typeof gs.subject === 'string' ? gs.subject : null),
          status: gs.status === 'published' ? 'published' : 'draft',
          createdAt: String(gs.created_at || gs.createdAt || ''),
          studentCount: gs.total_students ?? gs.studentCount ?? rawGrades.length,
          average: gs.average ?? null,
          grades: rawGrades,
        };
      });
      setSets(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load grades');
    } finally { setLoading(false); }
  }

  async function createSet() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      // Resolve the first selected subject name to a class subject_id (optional)
      let subjectId: string | null = null;
      if (newSubjects.length > 0) {
        try {
          const subRes = await fetch(`/api/classes/${classId}/subjects`);
          if (subRes.ok) {
            const subData = await subRes.json();
            const match = (subData.subjects || subData || []).find(
              (s: any) => String(s.title || '').toLowerCase() === newSubjects[0].toLowerCase()
            );
            if (match) subjectId = match.id;
          }
        } catch { /* ignore — subject link is optional */ }
      }
      const res = await fetch(`/api/classes/${classId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newName.trim(),
          category: 'test',
          weight: 1,
          ...(subjectId ? { subject_id: subjectId } : {}),
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewName('');
        setNewSubjects([]);
        void loadSets();
      }
    } catch { /* ignore */ }
    finally { setCreating(false); }
  }

  async function publishSet(setId: string) {
    setPublishing(setId);
    try {
      // PUT with action=publish (existing API contract)
      const res = await fetch(`/api/classes/${classId}/grades/${setId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      if (res.ok) void loadSets();
    } catch { /* ignore */ }
    finally { setPublishing(null); }
  }

  async function saveGrades(setId: string) {
    const inputs = gradeInputs;
    const gradeSet = sets.find(s => s.id === setId);
    try {
      // Build update payload with existing row IDs (required by the API)
      const student_grades = Object.entries(inputs)
        .filter(([, gradeStr]) => gradeStr !== '')
        .map(([studentId, gradeStr]) => {
          const existingRow = gradeSet?.grades.find(g => g.studentId === studentId);
          const gradeNum = parseFloat(gradeStr) || null;
          return {
            id: existingRow?.gradeRowId || null,
            student_id: studentId,
            grade_numeric: gradeNum,
            grade_value: gradeStr || null,
          };
        });

      const withIds = student_grades.filter(sg => sg.id);
      const withoutIds = student_grades.filter(sg => !sg.id);

      // Update existing rows
      if (withIds.length > 0) {
        await fetch(`/api/classes/${classId}/grades/${setId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_student_grades', student_grades: withIds }),
        });
      }

      // Insert new grade rows (students without existing grade entries)
      if (withoutIds.length > 0) {
        // Try to create grade rows via the grades route using upsert
        await Promise.all(withoutIds.map(sg =>
          fetch(`/api/classes/${classId}/grades/${setId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upsert_student_grade',
              student_id: sg.student_id,
              grade_numeric: sg.grade_numeric,
              grade_value: sg.grade_value,
            }),
          })
        ));
      }

      setEditingSet(null);
      void loadSets();
    } catch { /* ignore */ }
  }

  const subjects = Array.from(new Set(sets.map(s => s.subject).filter(Boolean))) as string[];
  const filtered = sets.filter(s =>
    (filterSubject === 'all' || s.subject === filterSubject) &&
    (filterStatus === 'all' || s.status === filterStatus)
  );

  if (loading) return <div className="flex min-h-[30vh] items-center justify-center"><CautieLoader size="md" label="" sublabel="" /></div>;
  if (error) return <div className="class-panel py-6 text-center text-muted-foreground">{error}<Button variant="outline" size="sm" className="mt-3 block" onClick={() => void loadSets()}>Retry</Button></div>;

  return (
    <div className="class-shell space-y-3">
      {/* Topbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="h-8 gap-1.5 text-[12px]" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" />
          {isDutch ? 'Nieuwe cijferlijst' : 'New grade set'}
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-[12px]"
          onClick={() => {/* export */}}>
          {isDutch ? 'Exporteren' : 'Export'}
        </Button>
        {subjects.length > 0 && (
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="ml-auto h-8 rounded-md border border-border bg-white px-2 text-[12px]"
          >
            <option value="all">{isDutch ? 'Alle vakken' : 'All subjects'}</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <div className="flex overflow-hidden rounded-md border border-border">
          {(['all', 'published', 'draft'] as const).map(f => (
            <button key={f} type="button"
              onClick={() => setFilterStatus(f)}
              className={cn('px-2.5 py-1 text-[11px] transition-colors', f !== 'all' && 'border-l border-border',
                filterStatus === f ? 'bg-[var(--accent-brand)] text-white' : 'bg-white text-muted-foreground hover:bg-[hsl(var(--interactive-hover))]'
              )}>
              {f === 'all' ? (isDutch ? 'Alles' : 'All') : f === 'published' ? (isDutch ? 'Gepubliceerd' : 'Published') : (isDutch ? 'Concept' : 'Draft')}
            </button>
          ))}
        </div>
      </div>

      {/* Grade sets list */}
      {filtered.length === 0 ? (
        <div className="class-panel py-8 text-center text-sm text-muted-foreground">
          {isDutch ? 'Geen cijferlijsten gevonden.' : 'No grade sets found.'}
        </div>
      ) : filtered.map(gs => {
        const isExpanded = expanded === gs.id;
        const isEditing = editingSet === gs.id;

        return (
          <div key={gs.id} className="class-panel p-0 overflow-hidden">
            {/* Header row */}
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : gs.id)}
              className="grid w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--interactive-hover))]"
              style={{ gridTemplateColumns: '1fr 110px 80px 60px 36px' }}
            >
              <div>
                <p className="text-[13px] font-semibold">{gs.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  {gs.subject && <span className="text-[11px] text-muted-foreground">{gs.subject}</span>}
                  <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    gs.status === 'published' ? 'bg-[hsl(var(--accent-brand)/0.12)] text-[var(--accent-brand)]' : 'bg-amber-100 text-amber-700'
                  )}>
                    {gs.status === 'published' ? (isDutch ? 'Gepubliceerd' : 'Published') : (isDutch ? 'Concept' : 'Draft')}
                  </span>
                </div>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">{fmtDate(gs.createdAt, dateLocale)}</div>
              <div className="text-right text-[12px] text-muted-foreground">{gs.studentCount} {isDutch ? 'lln.' : 'students'}</div>
              <div className={cn('text-right text-[14px] font-bold', GRADE_COLOR(gs.average))}>
                {gs.average !== null ? gs.average : '—'}
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-border bg-[hsl(var(--surface-2))] px-4 py-3">
                {/* Action bar */}
                <div className="mb-3 flex items-center gap-2">
                  {!isEditing && (
                    <Button size="sm" variant="outline" className="h-7 text-[11px]"
                      onClick={() => {
                        setEditingSet(gs.id);
                        const inputs: Record<string, string> = {};
                        // Pre-populate existing grades
                        gs.grades.forEach(g => { inputs[g.studentId] = g.grade !== null ? String(g.grade) : ''; });
                        // Add empty slots for students who don't have grade rows yet
                        studentNames.forEach((_, sid) => {
                          if (!(sid in inputs)) inputs[sid] = '';
                        });
                        setGradeInputs(inputs);
                      }}>
                      {isDutch ? 'Cijfers invoeren' : 'Enter grades'}
                    </Button>
                  )}
                  {isEditing && (
                    <>
                      <Button size="sm" className="h-7 text-[11px]" onClick={() => void saveGrades(gs.id)}>{isDutch ? 'Opslaan' : 'Save'}</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEditingSet(null)}>{isDutch ? 'Annuleren' : 'Cancel'}</Button>
                    </>
                  )}
                  {gs.status === 'draft' && !isEditing && (
                    <Button size="sm" className="h-7 text-[11px]" disabled={publishing === gs.id}
                      onClick={() => void publishSet(gs.id)}>
                      {publishing === gs.id ? '…' : (isDutch ? 'Publiceren' : 'Publish')}
                    </Button>
                  )}
                </div>

                {/* Grade distribution chart — only when published and has grades */}
                {gs.status === 'published' && gs.grades.some(g => g.grade !== null) && (
                  <GradeDistributionChart grades={gs.grades} isDutch={isDutch} />
                )}

                {/* Student grade rows */}
                {(() => {
                  // In edit mode, show all students; otherwise show only those with grade entries
                  const gradeMap = new Map(gs.grades.map(g => [g.studentId, g]));
                  const studentRows: Array<{ studentId: string; studentName: string; grade: number | null; gradeRowId?: string }> = isEditing
                    ? Array.from(
                        new Map([
                          ...gs.grades.map(g => [g.studentId, g] as const),
                          ...Array.from(studentNames.entries()).map(([id, name]) => [id, { studentId: id, studentName: name, grade: null, gradeRowId: undefined }] as const),
                        ]).values()
                      ).sort((a, b) => a.studentName.localeCompare(b.studentName))
                    : gs.grades.sort((a, b) => a.studentName.localeCompare(b.studentName));

                  if (studentRows.length === 0) {
                    return (
                      <p className="py-3 text-[12px] text-muted-foreground">
                        {isDutch ? 'Geen leerlingen gevonden.' : 'No students found.'}
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-0">
                      <div className="grid gap-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                        style={{ gridTemplateColumns: '1fr 80px 100px' }}>
                        <div>{isDutch ? 'Leerling' : 'Student'}</div>
                        <div className="text-right">{isDutch ? 'Cijfer' : 'Grade'}</div>
                        <div className="text-right">{isDutch ? 'Beoordeling' : 'Assessment'}</div>
                      </div>
                      {studentRows.map((sg, i) => {
                        const g = isEditing ? (gradeInputs[sg.studentId] ? parseFloat(gradeInputs[sg.studentId]) || null : null) : sg.grade;
                        const label = g === null ? '—' : g >= 8.5 ? (isDutch ? 'Uitstekend' : 'Excellent') : g >= 7 ? (isDutch ? 'Goed' : 'Good') : g >= 5.5 ? (isDutch ? 'Voldoende' : 'Sufficient') : (isDutch ? 'Onvoldoende' : 'Insufficient');
                        return (
                          <div key={sg.studentId}
                            className={cn('grid items-center gap-3 py-2', i > 0 && 'border-t border-border')}
                            style={{ gridTemplateColumns: '1fr 80px 100px' }}>
                            <span className="text-[13px]">{sg.studentName}</span>
                            {isEditing ? (
                              <Input
                                type="number"
                                min={1} max={10} step={0.1}
                                value={gradeInputs[sg.studentId] ?? ''}
                                onChange={e => setGradeInputs(prev => ({ ...prev, [sg.studentId]: e.target.value }))}
                                className="h-7 text-right text-[12px]"
                              />
                            ) : (
                              <span className={cn('text-right text-[14px] font-bold', GRADE_COLOR(sg.grade))}>{sg.grade !== null ? sg.grade : '—'}</span>
                            )}
                            <span className="text-right text-[11px] text-muted-foreground">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}

      {/* Create grade set dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm rounded-xl border-0">
          <DialogHeader>
            <DialogTitle className="text-base">{isDutch ? 'Nieuwe cijferlijst' : 'New grade set'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={isDutch ? 'Naam (bijv. Toets hoofdstuk 5)…' : 'Name (e.g. Quiz Chapter 5)…'}
              autoFocus
            />
            <div>
              <p className="mb-1.5 text-[12px] text-muted-foreground">{isDutch ? 'Vak(ken)' : 'Subject(s)'}</p>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_SUGGESTIONS.map(s => (
                  <button key={s} type="button"
                    onClick={() => setNewSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                    className={cn('rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                      newSubjects.includes(s)
                        ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)] text-white'
                        : 'border-border bg-white text-muted-foreground hover:border-[var(--accent-brand)]'
                    )}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>{isDutch ? 'Annuleren' : 'Cancel'}</Button>
              <Button size="sm" disabled={!newName.trim() || creating} onClick={() => void createSet()}>
                {creating ? '…' : (isDutch ? 'Aanmaken' : 'Create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────── Student view ─────────── */
function StudentGradesView({ classId, isDutch, dateLocale }: { classId: string; isDutch: boolean; dateLocale: Locale }) {
  const [grades, setGrades] = useState<StudentOwnGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'recent' | 'subject'>('recent');
  const [showCalc, setShowCalc] = useState(false);
  const [calcCurrent, setCalcCurrent] = useState('');
  const [calcTarget, setCalcTarget] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  useEffect(() => { void loadGrades(); }, [classId]);

  async function loadGrades() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/grades/student`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setGrades((data.grades || []).sort((a: StudentOwnGrade, b: StudentOwnGrade) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load grades');
    } finally { setLoading(false); }
  }

  const calcResult = (() => {
    const cur = parseFloat(calcCurrent);
    const tar = parseFloat(calcTarget);
    if (isNaN(cur) || isNaN(tar) || grades.length === 0) return null;
    const count = grades.filter(g => g.grade !== null).length;
    const needed = (tar * (count + 1)) - (cur * count);
    return Math.round(needed * 10) / 10;
  })();

  // Group by subject
  const bySubject = grades.reduce<Record<string, StudentOwnGrade[]>>((acc, g) => {
    const key = g.subject || (isDutch ? 'Overig' : 'Other');
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  if (loading) return <div className="flex min-h-[30vh] items-center justify-center"><CautieLoader size="md" label="" sublabel="" /></div>;
  if (error) return <div className="class-panel py-6 text-center text-muted-foreground">{error}</div>;

  return (
    <div className="class-shell space-y-3">
      {/* Topbar */}
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-border">
          {(['recent', 'subject'] as const).map(v => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={cn('px-3 py-1.5 text-[12px] transition-colors', v !== 'recent' && 'border-l border-border',
                view === v ? 'bg-[var(--accent-brand)] text-white' : 'bg-white text-muted-foreground hover:bg-[hsl(var(--interactive-hover))]'
              )}>
              {v === 'recent' ? (isDutch ? 'Meest recent' : 'Recent') : (isDutch ? 'Per vak' : 'By subject')}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="ml-auto h-8 text-[12px]" onClick={() => setShowCalc(v => !v)}>
          {isDutch ? 'Cijfercalculator' : 'Grade calculator'}
        </Button>
      </div>

      {/* Grade calculator */}
      {showCalc && (
        <div className="class-panel space-y-3">
          <p className="text-[13px] font-semibold">{isDutch ? 'Welk cijfer heb ik nodig?' : 'What grade do I need?'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">{isDutch ? 'Huidig gemiddelde' : 'Current average'}</label>
              <Input type="number" min={1} max={10} step={0.1} value={calcCurrent} onChange={e => setCalcCurrent(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">{isDutch ? 'Streefcijfer' : 'Target average'}</label>
              <Input type="number" min={1} max={10} step={0.1} value={calcTarget} onChange={e => setCalcTarget(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          {calcResult !== null && (
            <div className={cn('rounded-md px-3 py-2 text-[13px] font-semibold',
              calcResult <= 10 ? 'bg-[hsl(var(--accent-brand)/0.1)] text-[var(--accent-brand)]' : 'bg-red-50 text-destructive'
            )}>
              {calcResult <= 10
                ? (isDutch ? `Je hebt minimaal een ${calcResult} nodig.` : `You need at least a ${calcResult}.`)
                : (isDutch ? 'Niet haalbaar met één opdracht.' : 'Not achievable in one assignment.')}
            </div>
          )}
        </div>
      )}

      {/* RECENT VIEW */}
      {view === 'recent' && (
        <div className="class-panel p-0">
          {grades.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {isDutch ? 'Nog geen gepubliceerde cijfers.' : 'No published grades yet.'}
            </p>
          ) : (
            <div>
              <div className="grid gap-3 border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                style={{ gridTemplateColumns: '70px 1fr 80px 56px' }}>
                <div>{isDutch ? 'Datum' : 'Date'}</div>
                <div>{isDutch ? 'Opdracht' : 'Assignment'}</div>
                <div>{isDutch ? 'Vak' : 'Subject'}</div>
                <div className="text-right">{isDutch ? 'Cijfer' : 'Grade'}</div>
              </div>
              {grades.map((g, i) => (
                <div key={g.id}
                  className={cn('grid items-center gap-3 px-4 py-3', i > 0 && 'border-t border-border')}
                  style={{ gridTemplateColumns: '70px 1fr 80px 56px' }}>
                  <span className="text-[11px] text-muted-foreground">{fmtDate(g.publishedAt, dateLocale)}</span>
                  <span className="text-[13px] font-semibold">{g.gradeSetName}</span>
                  <span className="text-[11px] text-muted-foreground">{g.subject || '—'}</span>
                  <span className={cn('text-right text-[15px] font-bold', GRADE_COLOR(g.grade))}>
                    {g.grade !== null ? g.grade : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BY SUBJECT VIEW */}
      {view === 'subject' && (
        <div className="space-y-2">
          {Object.entries(bySubject).map(([subject, sGrades]) => {
            const validGrades = sGrades.filter(g => g.grade !== null).map(g => g.grade as number);
            const avg = validGrades.length > 0
              ? Math.round(validGrades.reduce((a, b) => a + b, 0) / validGrades.length * 10) / 10
              : null;
            const pct = avg !== null ? Math.min(100, (avg / 10) * 100) : 0;
            const isOpen = expandedSubject === subject;

            return (
              <div key={subject} className="class-panel p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSubject(isOpen ? null : subject)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--interactive-hover))]"
                >
                  <span className="flex-1 text-[13px] font-semibold">{subject}</span>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[hsl(var(--surface-3))]">
                    <div className="h-full rounded-full bg-[var(--accent-brand)]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className={cn('w-10 text-right text-[15px] font-bold', GRADE_COLOR(avg))}>
                    {avg !== null ? avg : '—'}
                  </span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-[hsl(var(--surface-2))]">
                    {sGrades.map((g, i) => (
                      <div key={g.id}
                        className={cn('grid items-center gap-3 px-4 py-2.5', i > 0 && 'border-t border-border')}
                        style={{ gridTemplateColumns: '1fr 80px 56px' }}>
                        <span className="text-[13px]">{g.gradeSetName}</span>
                        <span className="text-[11px] text-muted-foreground">{fmtDate(g.publishedAt, dateLocale)}</span>
                        <span className={cn('text-right text-[14px] font-bold', GRADE_COLOR(g.grade))}>
                          {g.grade !== null ? g.grade : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {Object.keys(bySubject).length === 0 && (
            <div className="class-panel py-6 text-center text-sm text-muted-foreground">
              {isDutch ? 'Nog geen gepubliceerde cijfers.' : 'No published grades yet.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────── Exported wrapper ─────────── */
export function GradesTabRedesigned({ classId }: { classId: string }) {
  const appContext = useContext(AppContext) as AppContextType | null;
  const role = appContext?.role || 'student';
  const language = appContext?.language || 'en';
  const isDutch = language === 'nl';
  const dateLocale = isDutch ? nl : enUS;
  const isTeacher = ['teacher', 'owner', 'admin', 'creator'].includes(String(role));

  return isTeacher
    ? <TeacherGradesView classId={classId} isDutch={isDutch} dateLocale={dateLocale} />
    : <StudentGradesView classId={classId} isDutch={isDutch} dateLocale={dateLocale} />;
}
