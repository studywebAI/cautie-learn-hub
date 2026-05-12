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

  /* Column widths — matching mockup: name + (teacher: attendance buttons) + notes + absences + avg + agenda */
  const teacherCols = '1fr 80px 80px 80px 80px';
  const studentCols = isTeacher ? '1fr 152px 80px 80px 80px' : '1fr 80px 80px 80px';

  return (
    <div className="space-y-3">
      {/* Topbar */}
      <div className="flex items-center gap-4">
        <Input
          placeholder={isDutch ? 'Zoek leden…' : 'Search members…'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 max-w-[200px] text-[13px]"
        />
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#5b9bd5]" />
            {isDutch ? 'Leerlingen' : 'Students'} ({data.students.length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#7f8962]" />
            {isDutch ? 'Docenten' : 'Teachers'} ({data.teachers.length})
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-white dark:bg-[hsl(var(--surface-1))]">

        {/* ── Column header ── */}
        <div
          className="grid gap-3 border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60"
          style={{ gridTemplateColumns: studentCols }}
        >
          <div>{isDutch ? 'Naam' : 'Name'}</div>
          {isTeacher && <div className="text-center">{isDutch ? 'Aanwezigheid' : 'Attendance'}</div>}
          <div className="text-right">{isDutch ? 'Notities' : 'Notes'}</div>
          <div className="text-right">{isDutch ? 'Absent' : 'Absent'}</div>
          <div className="text-right">{isDutch ? 'Gem.' : 'Avg'}</div>
          {!isTeacher && <div className="text-right">{isDutch ? 'Agenda' : 'Agenda'}</div>}
        </div>

        {/* ── Teacher rows ── */}
        {teachers.map((t, i) => (
          <div
            key={t.id}
            className={cn(
              'grid items-center gap-3 px-3 py-[11px] transition-colors hover:bg-[hsl(var(--interactive-hover))]',
              i > 0 || students.length > 0 ? 'border-t border-border/40' : '',
            )}
            style={{ gridTemplateColumns: teacherCols, borderLeft: '3px solid #7f8962' }}
          >
            <div>
              <p className="text-[13px] font-semibold leading-snug">{t.name}</p>
              <p className="text-[11px] text-muted-foreground capitalize leading-snug">{t.role}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-semibold text-muted-foreground">—</p>
              <p className="text-[10px] text-muted-foreground/60">{isDutch ? 'notities' : 'notes'}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-semibold text-muted-foreground">—</p>
              <p className="text-[10px] text-muted-foreground/60">{isDutch ? 'absent' : 'absent'}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-semibold text-muted-foreground">—</p>
              <p className="text-[10px] text-muted-foreground/60">{isDutch ? 'gem.' : 'avg'}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-semibold text-muted-foreground">—</p>
              <p className="text-[10px] text-muted-foreground/60">{isDutch ? 'agenda' : 'agenda'}</p>
            </div>
          </div>
        ))}

        {/* ── Student rows ── */}
        {students.length === 0 && teachers.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {isDutch ? 'Geen leden gevonden.' : 'No members found.'}
          </p>
        ) : (
          students.map((s, i) => {
            const att = attMap.get(s.id) ?? defaultAtt();
            const avg = s.stats?.averageGrade ?? null;
            const absences = att.totalAbsent || s.stats?.absenceCount || 0;
            const avgColor = avg === null ? 'text-muted-foreground'
              : avg >= 7 ? 'text-[#7f8962]'
              : avg >= 5.5 ? 'text-amber-600'
              : 'text-red-600';
            const absColor = absences > 2 ? 'text-red-600' : absences > 0 ? 'text-amber-600' : 'text-muted-foreground';

            return (
              <div
                key={s.id}
                className="group grid items-center gap-3 border-t border-border/40 px-3 py-[11px] transition-colors hover:bg-[hsl(var(--interactive-hover))]"
                style={{ gridTemplateColumns: studentCols, borderLeft: '3px solid #5b9bd5' }}
              >
                {/* Name */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold leading-snug">{s.name}</p>
                    {isTeacher && (
                      <button
                        type="button"
                        className="invisible text-muted-foreground opacity-0 transition-opacity group-hover:visible group-hover:opacity-100"
                        onClick={() => { setRenameStudent(s); setRenameValue(s.name); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {s.email && <p className="text-[11px] text-muted-foreground leading-snug">{s.email}</p>}
                </div>

                {/* Attendance buttons (teacher only) */}
                {isTeacher && (
                  <div className="flex items-center justify-center gap-0.5">
                    {/* Present */}
                    <button
                      type="button"
                      disabled={att.saving}
                      onClick={() => void mark(s.id, 'isPresent', true)}
                      title={isDutch ? 'Aanwezig' : 'Present'}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded transition-colors',
                        att.isPresent === true
                          ? 'bg-[#edf1e5] text-[#7f8962]'
                          : 'text-border hover:bg-[hsl(var(--interactive-hover))] hover:text-[#7f8962]',
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    {/* Absent */}
                    <button
                      type="button"
                      disabled={att.saving}
                      onClick={() => void mark(s.id, 'isPresent', false)}
                      title={isDutch ? 'Afwezig' : 'Absent'}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded transition-colors',
                        att.isPresent === false
                          ? 'bg-[#fde9e8] text-red-600'
                          : 'text-border hover:bg-[hsl(var(--interactive-hover))] hover:text-red-500',
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span className="mx-0.5 h-3.5 w-px bg-border" />
                    {/* Late */}
                    <button
                      type="button"
                      disabled={att.saving}
                      onClick={() => void mark(s.id, 'wasTooLate', !att.wasTooLate)}
                      title={isDutch ? 'Te laat' : 'Late'}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded transition-colors',
                        att.wasTooLate
                          ? 'bg-[#fdf3e3] text-amber-600'
                          : 'text-border hover:bg-[hsl(var(--interactive-hover))] hover:text-amber-500',
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" />
                    </button>
                    {/* HW */}
                    <button
                      type="button"
                      disabled={att.saving}
                      onClick={() => void mark(s.id, 'hasHomeworkIncomplete', !att.hasHomeworkIncomplete)}
                      title={isDutch ? 'HW vergeten' : 'Forgot HW'}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded transition-colors',
                        att.hasHomeworkIncomplete
                          ? 'bg-[hsl(var(--surface-3))] text-foreground'
                          : 'text-border hover:bg-[hsl(var(--interactive-hover))] hover:text-foreground',
                      )}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Notes stat */}
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-muted-foreground leading-snug">—</p>
                  <p className="text-[10px] text-muted-foreground/60 leading-snug">{isDutch ? 'notities' : 'notes'}</p>
                </div>

                {/* Absences stat */}
                <div className="text-right">
                  <p className={cn('text-[12px] font-semibold tabular-nums leading-snug', absColor)}>{absences}</p>
                  <p className="text-[10px] text-muted-foreground/60 leading-snug">{isDutch ? 'absent' : 'absent'}</p>
                </div>

                {/* Avg grade stat */}
                <div className="text-right">
                  <p className={cn('text-[13px] font-bold tabular-nums leading-snug', avgColor)}>
                    {avg !== null ? avg : '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 leading-snug">{isDutch ? 'gem.' : 'avg'}</p>
                </div>

                {/* Agenda link (student view only) */}
                {!isTeacher && (
                  <div className="text-right">
                    <button
                      type="button"
                      className="text-[12px] text-[#7f8962] hover:underline leading-snug"
                      onClick={() => { /* TODO: navigate to student agenda */ }}
                    >
                      {isDutch ? 'Open' : 'Open'}
                    </button>
                    <p className="text-[10px] text-muted-foreground/60 leading-snug">{isDutch ? 'agenda' : 'agenda'}</p>
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
