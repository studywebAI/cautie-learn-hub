'use client';

import { useState, useEffect, useContext } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, Clock, BookOpen, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';

/* ─── Types ─── */
type Student = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  stats: { averageGrade: number | null; absenceCount?: number };
};

type Teacher = {
  id: string;
  name: string;
  email: string | null;
  role: string;
};

type GroupData = {
  classId: string;
  students: Student[];
  teachers: Teacher[];
};

type AttState = {
  isPresent: boolean | null;
  wasTooLate: boolean;
  hasHomeworkIncomplete: boolean;
  totalAbsent: number;
  saving: boolean;
};

type Props = {
  classId: string;
  isTeacher: boolean;
  cachedData?: any;
  parentLoading?: boolean;
};

function defaultAtt(): AttState {
  return { isPresent: null, wasTooLate: false, hasHomeworkIncomplete: false, totalAbsent: 0, saving: false };
}

export function GroupTab({ classId, isTeacher, cachedData, parentLoading = false }: Props) {
  const ctx = useContext(AppContext) as AppContextType | null;
  const isDutch = ctx?.language === 'nl';

  const [data, setData] = useState<GroupData | null>(cachedData ?? null);
  const [loading, setLoading] = useState(!cachedData && !parentLoading);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [attMap, setAttMap] = useState<Map<string, AttState>>(new Map());
  const [renameStudent, setRenameStudent] = useState<Student | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showTeachers, setShowTeachers] = useState(true);

  useEffect(() => {
    if (!cachedData) { setData(null); setLoading(!parentLoading); setError(null); }
  }, [classId]);

  useEffect(() => {
    if (cachedData) { setData(cachedData); setLoading(false); }
  }, [cachedData]);

  useEffect(() => {
    if (cachedData || parentLoading || data) return;
    void load();
  }, [classId, cachedData, parentLoading, data]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [gRes, aRes] = await Promise.allSettled([
        fetch(`/api/classes/${classId}/group`),
        isTeacher ? fetch(`/api/classes/${classId}/attendance`) : Promise.resolve(null as any),
      ]);
      if (gRes.status === 'rejected' || !gRes.value?.ok) throw new Error('Failed to load');
      setData(await gRes.value.json());

      if (isTeacher && aRes.status === 'fulfilled' && aRes.value?.ok) {
        const att = await aRes.value.json();
        const map = new Map<string, AttState>();
        for (const s of att.students || []) {
          map.set(String(s.id), {
            isPresent: typeof s.isPresent === 'boolean' ? s.isPresent : null,
            wasTooLate: Boolean(s.wasTooLate),
            hasHomeworkIncomplete: Boolean(s.hasHomeworkIncomplete),
            totalAbsent: Number(s.stats?.totalAbsent ?? 0),
            saving: false,
          });
        }
        setAttMap(map);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function mark(studentId: string, field: keyof Pick<AttState, 'isPresent' | 'wasTooLate' | 'hasHomeworkIncomplete'>, value: boolean) {
    const cur = attMap.get(studentId) ?? defaultAtt();
    if (cur.saving) return;
    const next: AttState = { ...cur, [field]: value, saving: true };
    setAttMap(prev => new Map(prev).set(studentId, next));
    try {
      const res = await fetch(`/api/classes/${classId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          isPresent: field === 'isPresent' ? value : (cur.isPresent ?? true),
          wasTooLate: field === 'wasTooLate' ? value : cur.wasTooLate,
          hasHomeworkIncomplete: field === 'hasHomeworkIncomplete' ? value : cur.hasHomeworkIncomplete,
        }),
      });
      setAttMap(prev => new Map(prev).set(studentId, { ...(res.ok ? next : cur), saving: false }));
    } catch {
      setAttMap(prev => new Map(prev).set(studentId, { ...cur, saving: false }));
    }
  }

  async function saveRename() {
    if (!renameStudent || !renameValue.trim()) return;
    setRenameSaving(true);
    try {
      const res = await fetch(`/api/classes/${classId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: renameStudent.id, display_name: renameValue.trim() }),
      });
      if (!res.ok) throw new Error();
      setData(prev => prev ? {
        ...prev,
        students: prev.students.map(s => s.id === renameStudent.id ? { ...s, name: renameValue.trim() } : s),
      } : prev);
      setRenameStudent(null);
    } catch { /* ignore */ } finally { setRenameSaving(false); }
  }

  if ((loading || parentLoading) && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader label={isDutch ? 'Laden…' : 'Loading…'} sublabel="" size="md" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground dark:bg-[hsl(var(--surface-1))]">
        <p>{error || 'Failed to load'}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>Retry</Button>
      </div>
    );
  }

  const q = search.toLowerCase();
  const students = data.students
    .filter(s => !q || s.name.toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
  const teachers = data.teachers
    .filter(t => !q || t.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  /* Column widths — matching mockup: name + (teacher: attendance buttons) */
  const teacherCols = '1fr';
  const studentCols = isTeacher ? '1fr 160px' : '1fr';

  return (
    <div className="space-y-4">
      {/* Topbar */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={isDutch ? 'Zoek leden…' : 'Search members…'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 max-w-[240px] text-[13px]"
        />
        <div className="flex items-center gap-3">
          {isTeacher && (
            <button
              onClick={() => setShowTeachers(!showTeachers)}
              className={cn(
                'px-3 py-1.5 rounded-md text-[12px] font-500 transition-colors',
                showTeachers
                  ? 'bg-[#7f8962] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {isDutch ? 'Docenten' : 'Teachers'}
            </button>
          )}
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#5b9bd5]" />
              {isDutch ? 'Students' : 'Students'} ({data.students.length})
            </span>
            {showTeachers && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#7f8962]" />
                {isDutch ? 'Docenten' : 'Teachers'} ({data.teachers.length})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-white dark:bg-[hsl(var(--surface-1))]">

        {/* ── Column header ── */}
        <div
          className="grid gap-3 border-b border-border px-4 py-2.5 text-[11px] text-muted-foreground"
          style={{ gridTemplateColumns: studentCols }}
        >
          <div>{isDutch ? 'Naam' : 'Name'}</div>
          {isTeacher && <div className="text-center">{isDutch ? 'Aanwezigheid' : 'Attendance'}</div>}
        </div>

        {/* ── Teacher rows ── */}
        {showTeachers && teachers.map((t, i) => (
          <div
            key={t.id}
            className={cn(
              'grid items-center gap-3 px-4 py-3 transition-colors hover:bg-[hsl(var(--interactive-hover))]',
              i > 0 || students.length > 0 ? 'border-t border-border/40' : '',
            )}
            style={{ gridTemplateColumns: teacherCols, borderLeft: '3px solid #7f8962' }}
          >
            <div>
              <p className="text-[13px] leading-snug">{t.name}</p>
              <p className="text-[11px] text-muted-foreground capitalize leading-snug">{t.role}</p>
            </div>
          </div>
        ))}

        {/* ── Student rows ── */}
        {students.length === 0 && teachers.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {isDutch ? 'Geen leden gevonden.' : 'No members found.'}
          </p>
        ) : (
          students.map((s, i) => {
            const att = attMap.get(s.id) ?? defaultAtt();
            const avg = s.stats?.averageGrade ?? null;
            const absences = att.totalAbsent || s.stats?.absenceCount || 0;
            const isSelected = selectedStudentId === s.id;

            return (
              <div key={s.id}>
                {/* Main row */}
                <div
                  className={cn(
                    'group grid items-center gap-3 border-t border-border/40 px-4 py-3 transition-colors cursor-pointer hover:bg-[hsl(var(--interactive-hover))]',
                    isSelected && 'bg-[hsl(var(--interactive-hover))]'
                  )}
                  style={{ gridTemplateColumns: studentCols, borderLeft: '3px solid #5b9bd5' }}
                  onClick={() => setSelectedStudentId(isSelected ? null : s.id)}
                >
                  {/* Name */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] leading-snug">{s.name}</p>
                      {isTeacher && (
                        <button
                          type="button"
                          className="invisible text-muted-foreground opacity-0 transition-opacity group-hover:visible group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); setRenameStudent(s); setRenameValue(s.name); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {s.email && <p className="text-[11px] text-muted-foreground leading-snug">{s.email}</p>}
                  </div>

                  {/* Attendance buttons (teacher only) */}
                  {isTeacher && (
                    <div className="flex items-center justify-center gap-1">
                      {/* Present */}
                      <button
                        type="button"
                        disabled={att.saving}
                        onClick={(e) => { e.stopPropagation(); void mark(s.id, 'isPresent', true); }}
                        title={isDutch ? 'Aanwezig' : 'Present'}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded transition-colors text-[13px] font-semibold',
                          att.isPresent === true
                            ? 'bg-[#7f8962] text-white'
                            : 'bg-[#f0f0f0] text-[#7f8962] hover:bg-[#e8e8e8]',
                          att.saving && 'opacity-60'
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>

                      {/* Absent */}
                      <button
                        type="button"
                        disabled={att.saving}
                        onClick={(e) => { e.stopPropagation(); void mark(s.id, 'isPresent', false); }}
                        title={isDutch ? 'Afwezig' : 'Absent'}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded transition-colors text-[13px] font-semibold',
                          att.isPresent === false
                            ? 'bg-red-600 text-white'
                            : 'bg-[#f0f0f0] text-red-600 hover:bg-[#e8e8e8]',
                          att.saving && 'opacity-60'
                        )}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                      {/* Divider */}
                      <span className="mx-0.5 h-4 w-px bg-border" />

                      {/* Late */}
                      <button
                        type="button"
                        disabled={att.saving}
                        onClick={(e) => { e.stopPropagation(); void mark(s.id, 'wasTooLate', !att.wasTooLate); }}
                        title={isDutch ? 'Te laat' : 'Late'}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded transition-colors text-[13px] font-semibold',
                          att.wasTooLate
                            ? 'bg-amber-500 text-white'
                            : 'bg-[#f0f0f0] text-amber-600 hover:bg-[#e8e8e8]',
                          att.saving && 'opacity-60'
                        )}
                      >
                        <Clock className="h-3.5 w-3.5" />
                      </button>

                      {/* HW */}
                      <button
                        type="button"
                        disabled={att.saving}
                        onClick={(e) => { e.stopPropagation(); void mark(s.id, 'hasHomeworkIncomplete', !att.hasHomeworkIncomplete); }}
                        title={isDutch ? 'HW vergeten' : 'Forgot HW'}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded transition-colors text-[13px] font-semibold',
                          att.hasHomeworkIncomplete
                            ? 'bg-slate-600 text-white'
                            : 'bg-[#f0f0f0] text-slate-600 hover:bg-[#e8e8e8]',
                          att.saving && 'opacity-60'
                        )}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded detail view (shown on click) */}
                {isSelected && (
                  <div className="border-t border-border/40 bg-[hsl(var(--interactive-hover))] px-4 py-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">{isDutch ? 'Afwezigheid' : 'Absences'}</p>
                        <p className={cn('text-[16px] mt-1',
                          absences > 2 ? 'text-red-600' : absences > 0 ? 'text-amber-600' : 'text-[#7f8962]'
                        )}>
                          {absences}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">{isDutch ? 'Gemiddelde' : 'Average'}</p>
                        <p className={cn('text-[16px] mt-1',
                          avg === null ? 'text-muted-foreground' : avg >= 7 ? 'text-[#7f8962]' : avg >= 5.5 ? 'text-amber-600' : 'text-red-600'
                        )}>
                          {avg !== null ? avg.toFixed(1) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">{isDutch ? 'Status' : 'Status'}</p>
                        <p className="text-[12px] mt-2">
                          {att.isPresent === true && <span className="text-[#7f8962]">✓ {isDutch ? 'Aanwezig' : 'Present'}</span>}
                          {att.isPresent === false && <span className="text-red-600">✗ {isDutch ? 'Afwezig' : 'Absent'}</span>}
                          {att.isPresent === null && <span className="text-muted-foreground">—</span>}
                          {att.wasTooLate && <span className="text-amber-600"> · {isDutch ? 'Te laat' : 'Late'}</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={!!renameStudent} onOpenChange={() => setRenameStudent(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isDutch ? 'Leerling hernoemen' : 'Rename student'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">{renameStudent?.name}</p>
            <Input
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void saveRename()}
              placeholder={isDutch ? 'Nieuwe naam…' : 'New name…'}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRenameStudent(null)}>
                {isDutch ? 'Annuleren' : 'Cancel'}
              </Button>
              <Button size="sm" disabled={renameSaving || !renameValue.trim()} onClick={() => void saveRename()}>
                {renameSaving ? '…' : (isDutch ? 'Opslaan' : 'Save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
