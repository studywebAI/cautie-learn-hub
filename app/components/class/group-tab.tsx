'use client';

import { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Check, Settings, X, BookOpen, CalendarDays, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { formatDistanceToNow } from 'date-fns';

type StudentStats = {
  totalAssignments: number;
  completedAssignments: number;
  gradedAssignments: number;
  averageGrade: number | null;
  completionRate: number;
  absenceCount?: number;
  noteCount?: number;
};

type Student = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  lastSeen: string | null;
  onlineStatus: 'online' | 'offline';
  stats: StudentStats;
};

type Teacher = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  lastSeen: string | null;
  onlineStatus: 'online' | 'offline';
  subjects?: Array<{ id: string; title: string }>;
};

type GroupData = {
  classId: string;
  students: Student[];
  teachers: Teacher[];
  stats: { totalStudents: number; onlineStudents: number; totalTeachers: number; onlineTeachers: number };
};

type GroupTabProps = {
  classId: string;
  isTeacher: boolean;
  cachedData?: GroupData;
  parentLoading?: boolean;
};

function formatLastSeen(lastSeen: string | null, onlineStatus: 'online' | 'offline'): string {
  if (onlineStatus === 'online') return 'Online';
  if (!lastSeen) return 'Never seen';
  try {
    return 'Last seen ' + formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
  } catch {
    return 'Offline';
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('');
}

export function GroupTab({ classId, cachedData, parentLoading = false }: GroupTabProps) {
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
    void fetchGroupData();
  }, [classId, cachedData, parentLoading, data]);

  async function fetchGroupData() {
    if (!data) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/group`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load group data');
      setData(null);
    } finally {
      setLoading(false);
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
        students: prev.students.map(s => s.id === renameStudent.id ? { ...s, name: renameValue.trim() } : s),
      } : prev);
      setRenameStudent(null);
      void logClassTabEvent({ classId, tab: 'group', event: 'student_renamed', stage: 'action', level: 'info', meta: { student_id: renameStudent.id } });
    } catch { /* ignore */ }
    finally { setSavingRename(false); }
  }

  if ((loading || parentLoading) && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader label={isDutch ? 'Groep laden' : 'Loading group'} sublabel={isDutch ? 'Docenten en leerlingen ophalen' : 'Fetching teachers and students'} size="md" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="class-panel py-8 text-center text-muted-foreground">
        <p>{error || 'Failed to load group data'}</p>
        <Button variant="outline" className="mt-3" onClick={() => void fetchGroupData()}>Retry</Button>
      </div>
    );
  }

  const q = search.toLowerCase();
  const filteredStudents = data.students.filter(s =>
    !q || s.name.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)
  ).sort((a, b) => a.name.localeCompare(b.name));
  const filteredTeachers = data.teachers.filter(t =>
    !q || t.name.toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q)
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="class-shell space-y-3">
      {/* Topbar */}
      <div className="flex items-center gap-3">
        <Input
          placeholder={isDutch ? 'Zoek leden…' : 'Search members…'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 max-w-xs text-sm"
        />
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#5b9bd5]" />
            {isDutch ? 'Leerlingen' : 'Students'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-brand)]" />
            {isDutch ? 'Docenten' : 'Teachers'}
          </span>
        </div>
      </div>

      {/* Member table */}
      <div className="class-panel overflow-hidden p-0">
        {/* Column headers */}
        <div className="grid items-center gap-3 border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns: '40px 1fr 80px 80px 80px 60px' }}>
          <div />
          <div>{isDutch ? 'Naam' : 'Name'}</div>
          <div className="text-right">{isDutch ? 'Notities' : 'Notes'}</div>
          <div className="text-right">{isDutch ? 'Absent' : 'Absences'}</div>
          <div className="text-right">{isDutch ? 'Gem. cijfer' : 'Avg grade'}</div>
          <div className="text-right">{isDutch ? 'Agenda' : 'Agenda'}</div>
        </div>

        {/* Teachers */}
        {filteredTeachers.map(teacher => (
          <div
            key={teacher.id}
            className="grid items-center gap-3 border-b border-border px-4 py-2.5 transition-colors hover:bg-[hsl(var(--interactive-hover))]"
            style={{ gridTemplateColumns: '40px 1fr 80px 80px 80px 60px', borderLeftWidth: '3px', borderLeftColor: 'hsl(var(--accent-brand) / 0.8)', borderLeftStyle: 'solid' }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--accent-brand)/0.12)] text-[11px] font-bold text-[var(--accent-brand)] ring-2 ring-[var(--accent-brand)]">
              {getInitials(teacher.name)}
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-tight">{teacher.name}</p>
              <p className={`text-[11px] leading-tight ${teacher.onlineStatus === 'online' ? 'text-[var(--accent-brand)]' : 'text-muted-foreground'}`}>
                {formatLastSeen(teacher.lastSeen, teacher.onlineStatus)}
              </p>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">—</div>
            <div className="text-right text-[11px] text-muted-foreground">—</div>
            <div className="text-right text-[11px] text-muted-foreground">—</div>
            <div className="text-right text-[11px] text-muted-foreground">—</div>
          </div>
        ))}

        {/* Students */}
        {filteredStudents.length === 0 && filteredTeachers.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">{isDutch ? 'Geen leden gevonden' : 'No members found'}</p>
        ) : filteredStudents.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">{isDutch ? 'Geen leerlingen gevonden' : 'No students found'}</p>
        ) : (
          filteredStudents.map(student => {
            const avg = student.stats.averageGrade;
            const avgColor = avg === null ? 'text-muted-foreground'
              : avg >= 7 ? 'text-[var(--accent-brand)]'
              : avg >= 5.5 ? 'text-amber-600'
              : 'text-destructive';
            const absences = student.stats.absenceCount ?? 0;
            const notes = student.stats.noteCount ?? 0;

            return (
              <div
                key={student.id}
                className="group grid items-center gap-3 border-b border-border px-4 py-2.5 transition-colors hover:bg-[hsl(var(--interactive-hover))]"
                style={{ gridTemplateColumns: '40px 1fr 80px 80px 80px 60px', borderLeftWidth: '3px', borderLeftColor: '#5b9bd5', borderLeftStyle: 'solid' }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5eef8] text-[11px] font-bold text-[#3a7fc1] ring-2 ring-[#5b9bd5]">
                  {getInitials(student.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold leading-tight">{student.name}</p>
                    <button
                      type="button"
                      className="invisible text-muted-foreground opacity-0 transition-all group-hover:visible group-hover:opacity-100"
                      onClick={() => { setRenameStudent(student); setRenameValue(student.name); }}
                      title={isDutch ? 'Hernoemen' : 'Rename'}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                  <p className={`text-[11px] leading-tight ${student.onlineStatus === 'online' ? 'text-[var(--accent-brand)]' : 'text-muted-foreground'}`}>
                    {formatLastSeen(student.lastSeen, student.onlineStatus)}
                  </p>
                </div>

                {/* Notes */}
                <div className="text-right">
                  {notes > 0 ? (
                    <Link
                      prefetch={false}
                      href={`/class/${classId}?tab=attendance&studentId=${student.id}`}
                      className="text-[12px] font-semibold text-[var(--accent-brand)] underline underline-offset-2 hover:opacity-80"
                      onClick={e => e.stopPropagation()}
                    >
                      {notes}
                    </Link>
                  ) : (
                    <span className="text-[12px] text-muted-foreground">0</span>
                  )}
                </div>

                {/* Absences */}
                <div className="text-right">
                  <span className={`text-[12px] font-semibold ${absences > 2 ? 'text-destructive' : absences > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {absences}
                  </span>
                </div>

                {/* Avg grade */}
                <div className="text-right">
                  <span className={`text-[13px] font-bold ${avgColor}`}>
                    {avg !== null ? avg : '—'}
                  </span>
                </div>

                {/* Agenda */}
                <div className="text-right">
                  <Link
                    prefetch={false}
                    href={`/agenda?classId=${classId}&studentId=${student.id}`}
                    className="inline-flex items-center justify-end gap-1 text-[11px] text-[var(--accent-brand)] hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <CalendarDays className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={!!renameStudent} onOpenChange={() => setRenameStudent(null)}>
        <DialogContent className="max-w-sm rounded-xl border-0">
          <DialogHeader>
            <DialogTitle className="text-base">{isDutch ? 'Leerling hernoemen' : 'Rename student'}</DialogTitle>
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
