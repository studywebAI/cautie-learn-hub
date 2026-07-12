'use client';

import { useState, useEffect, useContext } from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import Loader from '@/components/ui/loader';
import { format, parseISO, type Locale } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/* ─── Types ─── */
type StudentGrade = { studentId: string; studentName: string; grade: number | null; gradeRowId?: string };
type GradeSet = {
  id: string;
  name: string;
  subject: string | null;
  status: 'draft' | 'published';
  createdAt: string;
  studentCount: number;
  gradedCount: number;
  average: number | null;
  grades: StudentGrade[];
};
type StudentOwnGrade = {
  id: string; gradeSetId: string; gradeSetName: string;
  subject: string | null; grade: number | null; publishedAt: string;
};

const SUBJECT_SUGGESTIONS = ['Biology','Mathematics','English','History','Chemistry','Physics','Geography','Arts','PE','Economics'];

function fmtDate(iso: string, loc: Locale) {
  try { return format(parseISO(iso), 'd MMM yyyy', { locale: loc }); } catch { return '—'; }
}

function gradeColor(g: number | null): string {
  if (g === null) return 'text-muted-foreground';
  if (g >= 7) return 'text-[var(--accent-brand)]';
  if (g >= 5.5) return 'text-amber-600';
  return 'text-red-600';
}

function gradeLabel(g: number | null, isDutch: boolean): string {
  if (g === null) return '—';
  if (g >= 8.5) return isDutch ? 'Uitstekend' : 'Excellent';
  if (g >= 7) return isDutch ? 'Goed' : 'Good';
  if (g >= 5.5) return isDutch ? 'Voldoende' : 'Sufficient';
  return isDutch ? 'Onvoldoende' : 'Below avg';
}

/* ─── Grade distribution chart ─── */
function GradeDistChart({ grades, isDutch }: { grades: StudentGrade[]; isDutch: boolean }) {
  const valid = grades.filter(g => g.grade !== null).map(g => g.grade as number);
  if (valid.length < 2) return null;

  const buckets = [
    { label: isDutch ? 'Uitst.' : 'A', range: '≥8.5', count: valid.filter(g => g >= 8.5).length, color: '#7f8962' },
    { label: isDutch ? 'Goed' : 'B',  range: '7–8.4', count: valid.filter(g => g >= 7 && g < 8.5).length, color: '#7f8962' },
    { label: isDutch ? 'Vold.' : 'C', range: '5.5–7', count: valid.filter(g => g >= 5.5 && g < 7).length, color: '#c87d25' },
    { label: isDutch ? 'Onv.' : 'D',  range: '<5.5',  count: valid.filter(g => g < 5.5).length, color: '#c94040' },
  ];

  return (
    <div className="mt-3 rounded-md border border-border bg-white p-3 dark:bg-[hsl(var(--surface-1))]">
      <p className="mb-2 text-[12px] text-muted-foreground/60">
        {isDutch ? 'Verdeling' : 'Distribution'}
      </p>
      <div className="h-[80px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} barSize={28} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#bbb' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{ fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
              formatter={(value: number, _name: string, entry: any) => [
                `${value} ${isDutch ? 'leerlingen' : 'students'} (${entry.payload.range})`,
                '',
              ]}
              labelFormatter={() => ''}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {buckets.map((b, i) => <Cell key={i} fill={b.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Teacher view ─── */
function TeacherGradesView({ classId, isDutch, loc }: { classId: string; isDutch: boolean; loc: Locale }) {
  const [sets, setSets] = useState<GradeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [studentNames, setStudentNames] = useState<Map<string, string>>(new Map());

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubjects, setNewSubjects] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const [editingSet, setEditingSet] = useState<string | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => { void loadSets(); }, [classId]);

  async function loadSets() {
    setLoading(true); setError(null);
    try {
      const [gradesRes, groupRes] = await Promise.allSettled([
        fetch(`/api/classes/${classId}/grades`),
        fetch(`/api/classes/${classId}/group`),
      ]);

      const nameMap = new Map<string, string>();
      if (groupRes.status === 'fulfilled' && groupRes.value.ok) {
        const g = await groupRes.value.json();
        for (const s of g.students || []) if (s.id) nameMap.set(String(s.id), String(s.name || s.id.slice(0, 8)));
      }
      setStudentNames(nameMap);

      if (gradesRes.status === 'rejected') throw new Error('Network error');
      if (!gradesRes.value.ok) {
        if (gradesRes.value.status === 403) { setSets([]); return; }
        let msg = `Error (${gradesRes.value.status})`;
        try { msg = (await gradesRes.value.json()).error || msg; } catch { /**/ }
        throw new Error(msg);
      }
      const data = await gradesRes.value.json();
      const mapped: GradeSet[] = (data.grade_sets || []).map((gs: any) => {
        const rawGrades: StudentGrade[] = (gs.student_grades || []).map((sg: any) => {
          const numericGrade = typeof sg.grade_numeric === 'number' ? sg.grade_numeric
            : sg.grade_value ? (parseFloat(sg.grade_value) || null) : null;
          const sid = String(sg.student_id || '');
          return { studentId: sid, studentName: nameMap.get(sid) || sid.slice(0, 8) || '—', grade: numericGrade, gradeRowId: String(sg.id || '') };
        });
        return {
          id: String(gs.id),
          name: String(gs.title || gs.name || ''),
          subject: gs.subject?.title ?? null,
          status: gs.status === 'published' ? 'published' : 'draft',
          createdAt: String(gs.created_at || ''),
          studentCount: gs.total_students ?? rawGrades.length,
          gradedCount: gs.graded_count ?? rawGrades.filter(g => g.grade !== null).length,
          average: gs.average ?? null,
          grades: rawGrades,
        };
      });
      setSets(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function createSet() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      let subjectId: string | null = null;
      if (newSubjects.length > 0) {
        try {
          const r = await fetch(`/api/classes/${classId}/subjects`);
          if (r.ok) {
            const d = await r.json();
            const m = (d.subjects || d || []).find((s: any) => String(s.title || '').toLowerCase() === newSubjects[0].toLowerCase());
            if (m) subjectId = m.id;
          }
        } catch { /**/ }
      }
      const res = await fetch(`/api/classes/${classId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newName.trim(), category: 'test', weight: 1, ...(subjectId ? { subject_id: subjectId } : {}) }),
      });
      if (res.ok) { setShowCreate(false); setNewName(''); setNewSubjects([]); void loadSets(); }
    } catch { /**/ } finally { setCreating(false); }
  }

  async function publishSet(setId: string) {
    setPublishing(setId);
    try {
      const res = await fetch(`/api/classes/${classId}/grades/${setId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      if (res.ok) void loadSets();
    } catch { /**/ } finally { setPublishing(null); }
  }

  async function saveGrades(setId: string) {
    const gs = sets.find(s => s.id === setId);
    try {
      const entries = Object.entries(gradeInputs).filter(([, v]) => v !== '').map(([studentId, v]) => {
        const existing = gs?.grades.find(g => g.studentId === studentId);
        return { id: existing?.gradeRowId || null, student_id: studentId, grade_numeric: parseFloat(v) || null, grade_value: v || null };
      });
      const withIds = entries.filter(e => e.id);
      const withoutIds = entries.filter(e => !e.id);
      if (withIds.length > 0) {
        await fetch(`/api/classes/${classId}/grades/${setId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_student_grades', student_grades: withIds }),
        });
      }
      if (withoutIds.length > 0) {
        await Promise.all(withoutIds.map(sg => fetch(`/api/classes/${classId}/grades/${setId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'upsert_student_grade', student_id: sg.student_id, grade_numeric: sg.grade_numeric, grade_value: sg.grade_value }),
        })));
      }
      setEditingSet(null);
      void loadSets();
    } catch { /**/ }
  }

  const subjects = [...new Set(sets.map(s => s.subject).filter(Boolean))] as string[];
  const filtered = sets.filter(s =>
    (filterSubject === 'all' || s.subject === filterSubject) &&
    (filterStatus === 'all' || s.status === filterStatus)
  );

  if (loading) return <div className="flex min-h-[30vh] items-center justify-center"><CautieLoader size="md" label="" sublabel="" /></div>;

  return (
    <div className="space-y-3">
      {/* Topbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex h-8 items-center gap-1.5 rounded-md bg-[var(--accent-brand)] px-3 text-[13px] text-background hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          {isDutch ? 'Nieuwe cijferlijst' : 'New grade set'}
        </button>
        <button
          type="button"
          className="flex h-8 items-center rounded-md border border-border bg-white px-3 text-[12px] text-foreground/70 hover:border-[#7f8962] hover:text-foreground dark:bg-[hsl(var(--surface-1))]"
        >
          {isDutch ? 'Exporteren' : 'Export'}
        </button>

        {/* Status filter */}
        <div className="ml-auto flex overflow-hidden rounded-md border border-border">
          {(['all', 'published', 'draft'] as const).map((f, i) => (
            <button key={f} type="button" onClick={() => setFilterStatus(f)}
              className={cn('px-2.5 py-1.5 text-[11px] transition-colors', i > 0 && 'border-l border-border',
                filterStatus === f ? 'bg-[hsl(var(--surface-2))] text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}>
              {f === 'all' ? (isDutch ? 'Alles' : 'All') : f === 'published' ? (isDutch ? 'Gepubliceerd' : 'Published') : (isDutch ? 'Concept' : 'Draft')}
            </button>
          ))}
        </div>

        {/* Subject filter */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {['all', ...subjects].map(s => (
              <button key={s} type="button" onClick={() => setFilterSubject(s)}
                className={cn('rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                  filterSubject === s ? 'border-[#7f8962] bg-[#7f8962] text-white' : 'border-border bg-white text-muted-foreground hover:border-[#7f8962] dark:bg-[hsl(var(--surface-1))]'
                )}>
                {s === 'all' ? (isDutch ? 'Alle vakken' : 'All') : s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-1))] px-4 py-3 text-sm text-muted-foreground">
          {error} <button className="ml-2 text-[var(--accent-brand)] underline" onClick={() => void loadSets()}>Retry</button>
        </div>
      )}

      {/* Grade sets */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {isDutch ? 'Geen cijferlijsten gevonden.' : 'No grade sets found.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(gs => {
            const isExpanded = expanded === gs.id;
            const isEditing = editingSet === gs.id;
            return (
              <div key={gs.id} className="overflow-hidden rounded-lg border border-border bg-white dark:bg-[hsl(var(--surface-1))]">
                {/* Header */}
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : gs.id)}
                  className="grid w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-[hsl(var(--interactive-hover))]"
                  style={{ gridTemplateColumns: '1fr 100px 90px 70px 24px' }}
                >
                  <div>
                    <p className="text-[14px] leading-snug">{gs.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {gs.subject && <>{gs.subject} · </>}
                      <span className={cn(
                        gs.status === 'published' ? 'text-[var(--accent-brand)]' : 'text-amber-600'
                      )}>
                        {gs.status === 'published' ? (isDutch ? 'Gepubliceerd' : 'Published') : (isDutch ? 'Concept' : 'Draft')}
                      </span>
                    </p>
                  </div>
                  <p className="text-right text-[12px] text-muted-foreground">{fmtDate(gs.createdAt, loc)}</p>
                  <p className="text-right text-[12px] text-muted-foreground">
                    {gs.gradedCount}/{gs.studentCount}
                  </p>
                  <p className={cn('text-right text-[15px]', gradeColor(gs.average))}>
                    {gs.average !== null ? gs.average : '—'}
                  </p>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="border-t border-border bg-[hsl(var(--surface-2))] px-3.5 py-3">
                    {/* Action row */}
                    <div className="mb-3 flex items-center gap-2">
                      {!isEditing && (
                        <button type="button"
                          onClick={() => {
                            setEditingSet(gs.id);
                            const inp: Record<string, string> = {};
                            gs.grades.forEach(g => { inp[g.studentId] = g.grade !== null ? String(g.grade) : ''; });
                            studentNames.forEach((_, id) => { if (!(id in inp)) inp[id] = ''; });
                            setGradeInputs(inp);
                          }}
                          className="h-7 rounded-md border border-border bg-white px-2.5 text-[11px] text-foreground hover:border-[#7f8962] dark:bg-[hsl(var(--surface-1))]">
                          {isDutch ? 'Cijfers invoeren' : 'Enter grades'}
                        </button>
                      )}
                      {isEditing && (
                        <>
                          <button type="button" onClick={() => void saveGrades(gs.id)}
                            className="h-7 rounded-md bg-[var(--accent-brand)] px-2.5 text-[12px] text-background hover:opacity-90">
                            {isDutch ? 'Opslaan' : 'Save'}
                          </button>
                          <button type="button" onClick={() => setEditingSet(null)}
                            className="h-7 rounded-md border border-border bg-white px-2.5 text-[11px] text-foreground dark:bg-[hsl(var(--surface-1))]">
                            {isDutch ? 'Annuleren' : 'Cancel'}
                          </button>
                        </>
                      )}
                      {gs.status === 'draft' && !isEditing && (
                        <button type="button" disabled={publishing === gs.id}
                          onClick={() => void publishSet(gs.id)}
                          className="h-7 rounded-md bg-[var(--accent-brand)] px-2.5 text-[12px] text-background hover:opacity-90 disabled:opacity-50">
                          {publishing === gs.id ? '…' : (isDutch ? 'Publiceren' : 'Publish')}
                        </button>
                      )}
                    </div>

                    {/* Grade distribution chart — published sets only */}
                    {gs.status === 'published' && gs.grades.length >= 2 && (
                      <GradeDistChart grades={gs.grades} isDutch={isDutch} />
                    )}

                    {/* Student rows */}
                    {(() => {
                      const gradeMap = new Map(gs.grades.map(g => [g.studentId, g]));
                      const rows: StudentGrade[] = isEditing
                        ? Array.from(new Map([
                            ...gs.grades.map(g => [g.studentId, g] as const),
                            ...Array.from(studentNames.entries()).map(([id, name]) => [id, { studentId: id, studentName: name, grade: null }] as const),
                          ]).values()).sort((a, b) => a.studentName.localeCompare(b.studentName))
                        : gs.grades.filter(g => g.grade !== null).sort((a, b) => a.studentName.localeCompare(b.studentName));

                      if (rows.length === 0) return (
                        <p className="py-2 text-[12px] text-muted-foreground">
                          {isDutch ? 'Nog geen cijfers.' : 'No grades yet.'}
                        </p>
                      );

                      return (
                        <div className="overflow-hidden rounded-md border border-border bg-white dark:bg-[hsl(var(--surface-1))]">
                          {/* Col header */}
                          <div className="grid gap-2 border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground/60"
                            style={{ gridTemplateColumns: '1fr 60px 80px' }}>
                            <span>{isDutch ? 'Leerling' : 'Student'}</span>
                            <span className="text-right">{isDutch ? 'Beoord.' : 'Label'}</span>
                            <span className="text-right">{isDutch ? 'Cijfer' : 'Grade'}</span>
                          </div>
                          {rows.map((sg, i) => {
                            const g = isEditing ? (gradeInputs[sg.studentId] ? (parseFloat(gradeInputs[sg.studentId]) || null) : null) : sg.grade;
                            return (
                              <div key={sg.studentId}
                                className={cn('grid items-center gap-2 px-3 py-2', i > 0 && 'border-t border-border/40')}
                                style={{ gridTemplateColumns: '1fr 60px 80px' }}>
                                <span className="text-[13px] font-medium">{sg.studentName}</span>
                                <span className="text-right text-[11px] text-muted-foreground">{gradeLabel(g, isDutch)}</span>
                                {isEditing ? (
                                  <Input type="number" min={1} max={10} step={0.1}
                                    value={gradeInputs[sg.studentId] ?? ''}
                                    onChange={e => setGradeInputs(prev => ({ ...prev, [sg.studentId]: e.target.value }))}
                                    className="h-7 text-right text-[12px]" />
                                ) : (
                                  <span className={cn('text-right text-[15px]', gradeColor(sg.grade))}>
                                    {sg.grade !== null ? sg.grade : '—'}
                                  </span>
                                )}
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
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isDutch ? 'Nieuwe cijferlijst' : 'New grade set'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder={isDutch ? 'Naam (bijv. Toets hoofdstuk 5)…' : 'Name (e.g. Quiz Chapter 5)…'} autoFocus />
            <div>
              <p className="mb-1.5 text-[12px] text-muted-foreground">{isDutch ? 'Vak (optioneel)' : 'Subject (optional)'}</p>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_SUGGESTIONS.map(s => (
                  <button key={s} type="button"
                    onClick={() => setNewSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [s])}
                    className={cn('rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                      newSubjects.includes(s) ? 'border-[#7f8962] bg-[#7f8962] text-white' : 'border-border bg-white text-muted-foreground hover:border-[#7f8962] dark:bg-[hsl(var(--surface-1))]'
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

/* ─── Student view ─── */
function StudentGradesView({ classId, isDutch, loc }: { classId: string; isDutch: boolean; loc: Locale }) {
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
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/grades/student`);
      if (!res.ok) throw new Error(`Error (${res.status})`);
      const data = await res.json();
      setGrades((data.grades || []).sort((a: StudentOwnGrade, b: StudentOwnGrade) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally { setLoading(false); }
  }

  const calcResult = (() => {
    const cur = parseFloat(calcCurrent), tar = parseFloat(calcTarget);
    if (isNaN(cur) || isNaN(tar)) return null;
    const count = grades.filter(g => g.grade !== null).length;
    return Math.round(((tar * (count + 1)) - (cur * count)) * 10) / 10;
  })();

  const bySubject = grades.reduce<Record<string, StudentOwnGrade[]>>((acc, g) => {
    const k = g.subject || (isDutch ? 'Overig' : 'Other');
    if (!acc[k]) acc[k] = [];
    acc[k].push(g);
    return acc;
  }, {});

  if (loading) return <div className="flex min-h-[30vh] items-center justify-center"><CautieLoader size="md" label="" sublabel="" /></div>;

  return (
    <div className="space-y-3">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <div className="flex overflow-hidden rounded-md border border-border">
          {(['recent', 'subject'] as const).map((v, i) => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={cn('px-3 py-1.5 text-[12px] transition-colors', i > 0 && 'border-l border-border',
                view === v ? 'bg-[#7f8962] text-white' : 'bg-white text-muted-foreground hover:text-foreground dark:bg-[hsl(var(--surface-1))]'
              )}>
              {v === 'recent' ? (isDutch ? 'Meest recent' : 'Recent') : (isDutch ? 'Per vak' : 'By subject')}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowCalc(v => !v)}
          className="h-8 rounded-md border border-border bg-white px-3 text-[12px] text-muted-foreground hover:border-[#7f8962] hover:text-foreground dark:bg-[hsl(var(--surface-1))]">
          {isDutch ? 'Cijfercalculator' : 'Grade calculator'}
        </button>
      </div>

      {/* Grade calculator */}
      {showCalc && (
        <div className="rounded-lg border border-border bg-[hsl(var(--surface-2))] p-3.5">
          <p className="mb-2.5 text-[14px]">{isDutch ? 'Welk cijfer heb ik nodig?' : 'What grade do I need?'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">{isDutch ? 'Huidig gemiddelde' : 'Current average'}</label>
              <Input type="number" min={1} max={10} step={0.1} value={calcCurrent} onChange={e => setCalcCurrent(e.target.value)} className="h-8 text-[13px]" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">{isDutch ? 'Streefcijfer' : 'Target average'}</label>
              <Input type="number" min={1} max={10} step={0.1} value={calcTarget} onChange={e => setCalcTarget(e.target.value)} className="h-8 text-[13px]" />
            </div>
          </div>
          {calcResult !== null && (
            <div className={cn('mt-3 rounded-md px-3 py-2 text-[14px]',
              calcResult <= 10 ? 'bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]' : 'bg-red-600/10 text-red-600'
            )}>
              {calcResult <= 10
                ? (isDutch ? `Je hebt minimaal een ${calcResult} nodig.` : `You need at least a ${calcResult}.`)
                : (isDutch ? 'Niet haalbaar met één opdracht.' : 'Not achievable in one assignment.')}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-muted-foreground">{error}</p>}

      {/* Recent view */}
      {view === 'recent' && (
        <div className="overflow-hidden rounded-lg border border-border bg-white dark:bg-[hsl(var(--surface-1))]">
          {grades.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {isDutch ? 'Nog geen gepubliceerde cijfers.' : 'No published grades yet.'}
            </p>
          ) : (
            <>
              <div className="grid gap-3 border-b border-border px-3.5 py-2 text-[11px] text-muted-foreground/60"
                style={{ gridTemplateColumns: '60px 1fr 50px' }}>
                <span>{isDutch ? 'Datum' : 'Date'}</span>
                <span>{isDutch ? 'Opdracht' : 'Assignment'}</span>
                <span className="text-right">{isDutch ? 'Cijfer' : 'Grade'}</span>
              </div>
              {grades.map((g, i) => (
                <div key={g.id}
                  className={cn('grid items-center gap-3 px-3.5 py-[11px] transition-colors hover:bg-[hsl(var(--interactive-hover))]', i > 0 && 'border-t border-border/40')}
                  style={{ gridTemplateColumns: '60px 1fr 50px' }}>
                  <span className="text-[11px] text-muted-foreground">{fmtDate(g.publishedAt, loc)}</span>
                  <div>
                    <p className="text-[14px] leading-snug">{g.gradeSetName}</p>
                    {g.subject && <p className="text-[11px] text-muted-foreground leading-snug">{g.subject}</p>}
                  </div>
                  <span className={cn('text-right text-[17px]', gradeColor(g.grade))}>
                    {g.grade !== null ? g.grade : '—'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* By subject view */}
      {view === 'subject' && (
        <div className="overflow-hidden rounded-lg border border-border bg-white dark:bg-[hsl(var(--surface-1))]">
          {Object.keys(bySubject).length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {isDutch ? 'Nog geen gepubliceerde cijfers.' : 'No published grades yet.'}
            </p>
          ) : Object.entries(bySubject).map(([subject, sGrades], i) => {
            const validGrades = sGrades.filter(g => g.grade !== null).map(g => g.grade as number);
            const avg = validGrades.length > 0
              ? Math.round(validGrades.reduce((a, b) => a + b, 0) / validGrades.length * 10) / 10 : null;
            const pct = avg !== null ? Math.min(100, (avg / 10) * 100) : 0;
            const isOpen = expandedSubject === subject;
            return (
              <div key={subject}>
                <button type="button"
                  onClick={() => setExpandedSubject(isOpen ? null : subject)}
                  className={cn('flex w-full items-center gap-3 px-3.5 py-[11px] text-left transition-colors hover:bg-[hsl(var(--interactive-hover))]', i > 0 && 'border-t border-border/40')}>
                  <span className="flex-1 text-[14px]">{subject}</span>
                  <div className="h-[5px] w-24 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-[var(--accent-brand)]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className={cn('w-10 text-right text-[17px]', gradeColor(avg))}>
                    {avg !== null ? avg : '—'}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-border/40 bg-[hsl(var(--surface-2))]" style={{ borderLeft: '3px solid #7f8962' }}>
                    {sGrades.map((g, j) => (
                      <div key={g.id}
                        className={cn('flex items-center justify-between px-3.5 py-2 text-[12px]', j > 0 && 'border-t border-border/40')}>
                        <span className="text-muted-foreground">{g.gradeSetName}</span>
                        <span className="text-muted-foreground">{fmtDate(g.publishedAt, loc)}</span>
                        <span className={cn('text-[13px]', gradeColor(g.grade))}>{g.grade !== null ? g.grade : '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Exported wrapper ─── */
export function GradesTabRedesigned({ classId }: { classId: string }) {
  const ctx = useContext(AppContext) as AppContextType | null;
  const role = ctx?.role || 'student';
  const language = ctx?.language || 'en';
  const isDutch = language === 'nl';
  const loc = isDutch ? nl : enUS;
  const isTeacher = ['teacher', 'owner', 'admin', 'creator'].includes(String(role));
  return isTeacher
    ? <TeacherGradesView classId={classId} isDutch={isDutch} loc={loc} />
    : <StudentGradesView classId={classId} isDutch={isDutch} loc={loc} />;
}
