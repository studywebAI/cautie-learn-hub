'use client';

import { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Check, X, Clock, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';

/* ─── Types ─── */
type StudentStats = {
  averageGrade: number | null;
  absenceCount?: number;
};

type Student = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  stats: StudentStats;
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
  stats?: { totalStudents: number; totalTeachers: number };
};

type AttendanceState = {
  isPresent: boolean | null;
  wasTooLate: boolean;
  hasHomeworkIncomplete: boolean;
  totalAbsent: number;
  saving: boolean;
};

type GroupTabProps = {
  classId: string;
  isTeacher: boolean;
  cachedData?: any;
  parentLoading?: boolean;
};

function defaultAtt(): AttendanceState {
  return { isPresent: null, wasTooLate: false, hasHomeworkIncomplete: false, totalAbsent: 0, saving: false };
}

export function GroupTab({ classId, isTeacher, cachedData, parentLoading = false }: GroupTabProps) {
  const appContext = useContext(AppContext) as AppContextType | null;
  const language = appContext?.language || 'en';
  const isDutch = language === 'nl';

  const [data, setData] = useState<GroupData | null>(cachedData || null);
  const [loading, setLoading] = useState(!cachedData && !parentLoading);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [renameStudent, setRenameStudent] = useState<Student | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  // Per-student attendance state — isolated by studentId key
  const [attMap, setAttMap] = useState<Map<string, AttendanceState>>(new Map());

  useEffect(() => {
    if (!cachedData) setData(null);
    setLoading(!cachedData && !parentLoading);
    setError(null);
  }, [classId, cachedData, parentLoading]);

  useEffect(() => {
    if (cachedData) { setData(cachedData); setLoading(false); }
  }, [cachedData]);

  useEffect(() => {
    if (cachedData || parentLoading || data) return;
    void fetchData();
  }, [classId, cachedData, parentLoading, data]);

  async function fetchData() {
    if (!data) setLoading(true);
    setError(null);
    try {
      const [groupRes, attRes] = await Promise.allSettled([
        fetch(`/api/classes/${classId}/group`),
        isTeacher ? fetch(`/api/classes/${classId}/attendance`) : Promise.resolve(null as any),
      ]);

      if (groupRes.status === 'rejected' || !groupRes.value?.ok) {
        throw new Error('Failed to load group data');
      }
      const groupData = await groupRes.value.json();
      setData(groupData);

      // Build per-student attendance state from API
      if (isTeacher && attRes.status === 'fulfilled' && attRes.value?.ok) {
        const attData = await attRes.value.json();
        const newMap = new Map<string, AttendanceState>();
        for (const s of attData.students || []) {
          newMap.set(String(s.id), {
            isPresent: typeof s.isPresent === 'boolean' ? s.isPresent : null,
            wasTooLate: Boolean(s.wasTooLate),
            hasHomeworkIncomplete: Boolean(s.hasHomeworkIncomplete),
            totalAbsent: Number(s.stats?.totalAbsent ?? 0),
            saving: false,
          });
        }
        setAttMap(newMap);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load group');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function markAttendance(
    studentId: string,
    field: 'isPresent' | 'wasTooLate' | 'hasHomeworkIncomplete',
    value: boolean,
  ) {
    const current = attMap.get(studentId) || defaultAtt();
    if (current.saving) return;

    // Optimistic update — scoped strictly to this student
    const nextState: AttendanceState = { ...current, [field]: value, saving: true };
    setAttMap(prev => {
      const next = new Map(prev);
      next.set(studentId, nextState);
      return next;
    });

    const body = {
      studentId,
      isPresent: field === 'isPresent' ? value : (current.isPresent ?? true),
      wasTooLate: field === 'wasTooLate' ? value : current.wasTooLate,
      hasHomeworkIncomplete: field === 'hasHomeworkIncomplete' ? value : current.hasHomeworkIncomplete,
    };

    try {
      const res = await fetch(`/api/classes/${classId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setAttMap(prev => {
        const next = new Map(prev);
        next.set(studentId, res.ok
          ? { ...nextState, saving: false }
          : { ...current, saving: false }, // revert on failure
        );
        return next;
      });
    } catch {
      setAttMap(prev => {
        const next = new Map(prev);
        next.set(studentId, { ...current, saving: false });
        return next;
      });
    }
  }

  async function saveRename() {
    if (!renameStudent || !renameValue.trim()) return;
    setSavingRename(true);
    try {
      const res = await fetch(`/api/classes/${classId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: renameStudent.id, display_name: renameValue.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setData(prev => prev ? {
        ...prev,
        students: prev.students.map(s =>
          s.id === renameStudent.id ? { ...s, name: renameValue.trim() } : s
        ),
      } : prev);
      setRenameStudent(null);
    } catch { /* ignore */ }
    finally { setSavingRename(false); }
  }

  if ((loading || parentLoading) && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader
          label={isDutch ? 'Groep laden' : 'Loading group'}
          sublabel={isDutch ? 'Leden ophalen' : 'Fetching members'}
          size="md"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="class-panel py-8 text-center text-muted-foreground">
        <p>{error || 'Failed to load group'}</p>
        <Button variant="outline" className="mt-3" onClick={() => void fetchData()}>
          {isDutch ? 'Opnieuw proberen' : 'Retry'}
        </Button>
      </div>
    );
  }

  const q = search.toLowerCase();
  const filteredStudents = data.students
    .filter(s => !q || s.name.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
  const filteredTeachers = data.teachers
    .filter(t => !q || t.name.toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  const noResults = filteredStudents.length === 0 && filteredTeachers.length === 0;

  return (
    <div className="class-shell space-y-3">
      {/* Search bar */}
      <Input
        placeholder={isDutch ? 'Zoek leden…' : 'Search members…'}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="h-8 max-w-xs text-[13px]"
      />

      {/* Members list */}
      <div className="class-panel overflow-hidden p-0">
        {noResults ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {isDutch ? 'Geen leden gevonden' : 'No members found'}
          </p>
        ) : (
          <>
            {/* ── Teachers ── */}
            {filteredTeachers.length > 0 && (
              <>
                <div className="border-b border-border bg-[hsl(var(--surface-2))] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {isDutch ? 'Docenten' : 'Teachers'} · {filteredTeachers.length}
                </div>
                {filteredTeachers.map((teacher, i) => (
                  <div
                    key={teacher.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[hsl(var(--interactive-hover))]',
                      i < filteredTeachers.length - 1 && 'border-b border-border',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-tight">{teacher.name}</p>
                      {teacher.email && (
                        <p className="text-[11px] leading-tight text-muted-foreground">{teacher.email}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground capitalize">{teacher.role}</span>
                  </div>
                ))}
              </>
            )}

            {/* ── Students ── */}
            {filteredStudents.length > 0 && (
              <>
                <div className={cn(
                  'border-b border-border bg-[hsl(var(--surface-2))] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
                  filteredTeachers.length > 0 && 'border-t',
                )}>
                  {isDutch ? 'Leerlingen' : 'Students'} · {filteredStudents.length}
                </div>

                {/* Column header row */}
                <div
                  className="grid items-center gap-3 border-b border-border px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ gridTemplateColumns: isTeacher ? '1fr 148px 48px 48px' : '1fr 48px 48px' }}
                >
                  <span>{isDutch ? 'Naam' : 'Name'}</span>
                  {isTeacher && (
                    <span className="text-center">{isDutch ? 'Aanwezigheid' : 'Attendance'}</span>
                  )}
                  <span className="text-right">{isDutch ? 'Absent' : 'Absent'}</span>
                  <span className="text-right">{isDutch ? 'Gem.' : 'Avg'}</span>
                </div>

                {filteredStudents.map((student, i) => {
                  const att = attMap.get(student.id) || defaultAtt();
                  const avg = student.stats?.averageGrade ?? null;
                  const avgColor = avg === null
                    ? 'text-muted-foreground'
                    : avg >= 7 ? 'text-[var(--accent-brand)]'
                    : avg >= 5.5 ? 'text-amber-600'
                    : 'text-destructive';
                  const absences = att.totalAbsent || student.stats?.absenceCount || 0;

                  return (
                    <div
                      key={student.id}
                      className={cn(
                        'group grid items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[hsl(var(--interactive-hover))]',
                        i < filteredStudents.length - 1 && 'border-b border-border',
                      )}
                      style={{ gridTemplateColumns: isTeacher ? '1fr 148px 48px 48px' : '1fr 48px 48px' }}
                    >
                      {/* Name */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[13px] font-semibold leading-tight">{student.name}</p>
                          {isTeacher && (
                            <button
                              type="button"
                              className="invisible shrink-0 text-muted-foreground opacity-0 transition-all group-hover:visible group-hover:opacity-100"
                              onClick={() => { setRenameStudent(student); setRenameValue(student.name); }}
                              title={isDutch ? 'Hernoemen' : 'Rename'}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Attendance buttons — teacher only */}
                      {isTeacher && (
                        <div className="flex items-center justify-center gap-0.5">
                          {/* Present ✓ */}
                          <button
                            type="button"
                            disabled={att.saving}
                            onClick={() => void markAttendance(student.id, 'isPresent', true)}
                            title={isDutch ? 'Aanwezig' : 'Present'}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded transition-colors',
                              att.isPresent === true
                                ? 'bg-[hsl(var(--accent-brand)/0.15)] text-[var(--accent-brand)]'
                                : 'text-border hover:bg-[hsl(var(--surface-2))] hover:text-[var(--accent-brand)]',
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>

                          {/* Absent ✗ */}
                          <button
                            type="button"
                            disabled={att.saving}
                            onClick={() => void markAttendance(student.id, 'isPresent', false)}
                            title={isDutch ? 'Afwezig' : 'Absent'}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded transition-colors',
                              att.isPresent === false
                                ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                : 'text-border hover:bg-[hsl(var(--surface-2))] hover:text-red-500',
                            )}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>

                          {/* Divider */}
                          <span className="mx-0.5 h-4 w-px bg-border" />

                          {/* Late ⏱ */}
                          <button
                            type="button"
                            disabled={att.saving}
                            onClick={() => void markAttendance(student.id, 'wasTooLate', !att.wasTooLate)}
                            title={isDutch ? 'Te laat' : 'Late'}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded transition-colors',
                              att.wasTooLate
                                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'text-border hover:bg-[hsl(var(--surface-2))] hover:text-amber-500',
                            )}
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>

                          {/* Forgot HW 📚 */}
                          <button
                            type="button"
                            disabled={att.saving}
                            onClick={() => void markAttendance(student.id, 'hasHomeworkIncomplete', !att.hasHomeworkIncomplete)}
                            title={isDutch ? 'HW vergeten' : 'Forgot HW'}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded transition-colors',
                              att.hasHomeworkIncomplete
                                ? 'bg-[hsl(var(--surface-3))] text-foreground'
                                : 'text-border hover:bg-[hsl(var(--surface-2))] hover:text-foreground',
                            )}
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Total absences */}
                      <div className="text-right">
                        <span className={cn(
                          'text-[12px] font-semibold tabular-nums',
                          absences > 2 ? 'text-destructive'
                            : absences > 0 ? 'text-amber-600'
                            : 'text-muted-foreground',
                        )}>
                          {absences}
                        </span>
                      </div>

                      {/* Avg grade */}
                      <div className="text-right">
                        <span className={cn('text-[13px] font-bold tabular-nums', avgColor)}>
                          {avg !== null ? avg : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={!!renameStudent} onOpenChange={() => setRenameStudent(null)}>
        <DialogContent className="max-w-sm rounded-xl border-0">
          <DialogHeader>
            <DialogTitle className="text-base">
              {isDutch ? 'Leerling hernoemen' : 'Rename student'}
            </DialogTitle>
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
              <Button size="sm" disabled={savingRename || !renameValue.trim()} onClick={() => void saveRename()}>
                {savingRename ? (isDutch ? 'Opslaan…' : 'Saving…') : (isDutch ? 'Opslaan' : 'Save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
