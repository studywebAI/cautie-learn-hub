'use client';

import { useState, useEffect, useContext } from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { formatDistanceToNow, format, parseISO, type Locale } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';

type EventType = 'absent' | 'late' | 'forgot_hw' | 'incident';

type AttendanceEvent = {
  id: string;
  studentId: string;
  studentName: string;
  type: EventType;
  note: string;
  createdAt: string;
  clearedAt?: string | null;
};

type StudentSummary = {
  id: string;
  name: string;
  totalAbsent: number;
  totalLate: number;
  totalForgotHw: number;
  totalIncidents: number;
  note: string; // general per-student note from teacher
  recentActivity: AttendanceEvent[];
};

type AttendanceData = {
  events: AttendanceEvent[];
  students: StudentSummary[];
  stats: {
    absentToday: number;
    lateToday: number;
    incidentsToday: number;
    attendanceRate: number;
  };
};

type Filter = 'all' | 'absent' | 'late' | 'forgot_hw' | 'incident';
type ViewMode = 'class' | 'student';

const EVENT_LABELS: Record<EventType, { en: string; nl: string; color: string }> = {
  absent:    { en: 'Absent',    nl: 'Afwezig',       color: 'bg-red-100 text-red-700' },
  late:      { en: 'Late',      nl: 'Te laat',       color: 'bg-amber-100 text-amber-700' },
  forgot_hw: { en: 'Forgot HW', nl: 'Huiswerk vergeten', color: 'bg-green-100 text-[var(--accent-brand)]' },
  incident:  { en: 'Incident',  nl: 'Incident',      color: 'bg-purple-100 text-purple-700' },
};

function EventBadge({ type, lang }: { type: EventType; lang: string }) {
  const def = EVENT_LABELS[type];
  return (
    <span className={cn('inline-flex rounded px-2 py-0.5 text-[11px]', def.color)}>
      {lang === 'nl' ? def.nl : def.en}
    </span>
  );
}

function formatEventTime(iso: string, locale: Locale): string {
  try {
    const d = parseISO(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return 'Today · ' + format(d, 'HH:mm');
    return format(d, 'MMM d', { locale }) + ' · ' + format(d, 'HH:mm');
  } catch { return ''; }
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
}

export function AttendanceTabRedesigned({ classId }: { classId: string }) {
  const appContext = useContext(AppContext) as AppContextType | null;
  const language = appContext?.language || 'en';
  const isDutch = language === 'nl';
  const dateLocale = isDutch ? nl : enUS;

  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('class');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Record dialog
  const [showRecord, setShowRecord] = useState(false);
  const [recordType, setRecordType] = useState<EventType>('absent');
  const [recordStudentId, setRecordStudentId] = useState('');
  const [recordNote, setRecordNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Student note editing
  const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  // Expanded student rows in class view
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, [classId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/attendance`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const raw = await res.json();
      // Transform API response into our local shape
      const students: StudentSummary[] = (raw.students || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        totalAbsent: s.stats?.totalAbsent ?? 0,
        totalLate: s.stats?.totalTooLate ?? 0,
        totalForgotHw: s.stats?.totalHomeworkIncomplete ?? 0,
        totalIncidents: 0,
        note: s.generalNote || '',
        recentActivity: (s.recentActivity || []).map((log: any) => ({
          id: log.id,
          studentId: s.id,
          studentName: s.name,
          type: mapLogAction(log.action),
          note: log.details?.note || log.details?.description || '',
          createdAt: log.createdAt,
        })).filter((e: AttendanceEvent) => e.type !== null),
      }));

      // Flatten events for class timeline
      const events: AttendanceEvent[] = students.flatMap(s => s.recentActivity).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const absentToday = countTodayEvents(events, 'absent');
      const lateToday = countTodayEvents(events, 'late');
      const incidentsToday = countTodayEvents(events, 'incident');
      const totalStudents = students.length;
      const attendanceRate = totalStudents > 0
        ? Math.round(((totalStudents - absentToday) / totalStudents) * 100)
        : 100;

      setData({ events, students, stats: { absentToday, lateToday, incidentsToday, attendanceRate } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }

  function mapLogAction(action: string): EventType {
    if (action === 'attendance_state_changed') return 'absent';
    if (action === 'attendance_event_late') return 'late';
    if (action === 'attendance_event_homework_incomplete') return 'forgot_hw';
    if (action === 'attendance_event_custom') return 'incident';
    return 'incident';
  }

  function countTodayEvents(events: AttendanceEvent[], type: EventType): number {
    const today = new Date().toDateString();
    return events.filter(e => e.type === type && new Date(e.createdAt).toDateString() === today).length;
  }

  async function saveRecord() {
    if (!recordStudentId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${classId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: recordStudentId, type: recordType, note: recordNote }),
      });
      if (res.ok) {
        setShowRecord(false);
        setRecordNote('');
        void loadData();
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function saveStudentNote(studentId: string) {
    try {
      await fetch(`/api/classes/${classId}/attendance/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, note: noteValue }),
      });
      setData(prev => prev ? {
        ...prev,
        students: prev.students.map(s => s.id === studentId ? { ...s, note: noteValue } : s),
      } : prev);
    } catch { /* ignore */ }
    finally { setEditingNoteFor(null); }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader label={isDutch ? 'Aanwezigheid laden' : 'Loading attendance'} sublabel="" size="md" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="class-panel py-8 text-center text-muted-foreground">
        <p>{error || 'Failed to load attendance'}</p>
        <Button variant="outline" className="mt-3" onClick={() => void loadData()}>Retry</Button>
      </div>
    );
  }

  const eventsToShow = data.events.filter(e => filter === 'all' || e.type === filter);
  const studentToShow = viewMode === 'student' && selectedStudent
    ? data.students.find(s => s.id === selectedStudent)
    : null;

  return (
    <div className="class-shell space-y-3">
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { val: data.stats.absentToday,    lbl: isDutch ? 'Afwezig vandaag' : 'Absent today',    color: 'text-destructive' },
          { val: data.stats.lateToday,      lbl: isDutch ? 'Te laat vandaag' : 'Late today',       color: 'text-amber-600' },
          { val: data.stats.incidentsToday, lbl: isDutch ? 'Incidenten' : 'Incidents',             color: 'text-purple-700' },
          { val: data.stats.attendanceRate + '%', lbl: isDutch ? 'Aanwezigheid' : 'Attendance rate', color: 'text-foreground' },
        ].map(({ val, lbl, color }) => (
          <div key={lbl} className="class-panel text-center">
            <p className={cn('text-xl', color)}>{val}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{lbl}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View toggle */}
        <div className="flex overflow-hidden rounded-md border border-border">
          {(['class', 'student'] as ViewMode[]).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setViewMode(v)}
              className={cn(
                'px-3 py-1.5 text-[12px] transition-colors',
                viewMode === v ? 'bg-[var(--accent-brand)] text-background' : 'bg-background text-muted-foreground hover:bg-muted',
                v !== 'class' && 'border-l border-border'
              )}
            >
              {v === 'class' ? (isDutch ? 'Klas' : 'Class') : (isDutch ? 'Per leerling' : 'Per student')}
            </button>
          ))}
        </div>

        {/* Filter chips — only in class view */}
        {viewMode === 'class' && (
          <div className="flex gap-1.5">
            {(['all', 'absent', 'late', 'forgot_hw', 'incident'] as Filter[]).map(f => {
              const label = f === 'all' ? (isDutch ? 'Alles' : 'All')
                : f === 'absent' ? (isDutch ? 'Afwezig' : 'Absent')
                : f === 'late' ? (isDutch ? 'Te laat' : 'Late')
                : f === 'forgot_hw' ? (isDutch ? 'HW vergeten' : 'Forgot HW')
                : (isDutch ? 'Incident' : 'Incident');
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                    filter === f
                      ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)] text-background'
                      : 'border-border bg-background text-muted-foreground hover:border-[var(--accent-brand)]'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Student picker — only in student view */}
        {viewMode === 'student' && (
          <select
            value={selectedStudent || ''}
            onChange={e => setSelectedStudent(e.target.value || null)}
            className="h-8 rounded-md border border-border bg-background px-2 text-[12px] text-foreground"
          >
            <option value="">{isDutch ? 'Selecteer leerling…' : 'Select student…'}</option>
            {data.students.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        <Button size="sm" className="ml-auto h-8 gap-1.5 text-[12px]" onClick={() => setShowRecord(true)}>
          <Plus className="h-3.5 w-3.5" />
          {isDutch ? 'Registreren' : 'Record'}
        </Button>
      </div>

      {/* CLASS VIEW — timeline */}
      {viewMode === 'class' && (
        <div className="class-panel p-0">
          {eventsToShow.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {isDutch ? 'Geen uitzonderingen geregistreerd.' : 'No exceptions recorded. Normal attendance is not logged.'}
            </p>
          ) : (
            <div>
              {eventsToShow.map((event, i) => (
                <div key={event.id}
                  className={cn('grid items-start gap-3 px-4 py-3', i > 0 && 'border-t border-border')}
                  style={{ gridTemplateColumns: '90px 1fr auto' }}>
                  <div className="pt-0.5 text-[11px] leading-tight text-muted-foreground">
                    {formatEventTime(event.createdAt, dateLocale)}
                  </div>
                  <div>
                    <p className="text-[13px]">{event.studentName}</p>
                    {event.note && <p className="mt-0.5 text-[12px] text-muted-foreground">{event.note}</p>}
                  </div>
                  <EventBadge type={event.type} lang={language} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STUDENT VIEW */}
      {viewMode === 'student' && !selectedStudent && (
        <div className="class-panel">
          <p className="text-center text-sm text-muted-foreground">
            {isDutch ? 'Selecteer een leerling om hun aanwezigheidshistorie te bekijken.' : 'Select a student to view their attendance history.'}
          </p>
        </div>
      )}

      {viewMode === 'student' && studentToShow && (
        <div className="space-y-3">
          {/* Student stats */}
          <div className="class-panel">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[15px]">{studentToShow.name}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
                  <span>{isDutch ? 'Afwezig:' : 'Absent:'} <strong className="text-destructive">{studentToShow.totalAbsent}</strong></span>
                  <span>{isDutch ? 'Te laat:' : 'Late:'} <strong className="text-amber-600">{studentToShow.totalLate}</strong></span>
                  <span>{isDutch ? 'HW vergeten:' : 'Forgot HW:'} <strong>{studentToShow.totalForgotHw}</strong></span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => {
                setEditingNoteFor(studentToShow.id);
                setNoteValue(studentToShow.note);
              }}>
                {isDutch ? 'Notitie bewerken' : 'Edit note'}
              </Button>
            </div>

            {/* General note */}
            {editingNoteFor === studentToShow.id ? (
              <div className="space-y-2">
                <textarea
                  value={noteValue}
                  onChange={e => setNoteValue(e.target.value)}
                  rows={3}
                  placeholder={isDutch ? 'Algemene notitie over deze leerling…' : 'General note about this student…'}
                  className="w-full resize-none rounded-md border border-border bg-[hsl(var(--surface-1))] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent-brand)]"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-[11px]" onClick={() => void saveStudentNote(studentToShow.id)}>
                    {isDutch ? 'Opslaan' : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEditingNoteFor(null)}>
                    {isDutch ? 'Annuleren' : 'Cancel'}
                  </Button>
                </div>
              </div>
            ) : studentToShow.note ? (
              <div className="mt-2 rounded-md bg-[hsl(var(--surface-2))] px-3 py-2 text-[12px] text-foreground/80">
                {studentToShow.note}
              </div>
            ) : null}
          </div>

          {/* Student timeline */}
          <div className="class-panel p-0">
            <div className="border-b border-border px-4 py-2.5 text-[11px] text-muted-foreground">
              {isDutch ? 'Aanwezigheidshistorie' : 'Attendance history'}
            </div>
            {studentToShow.recentActivity.length === 0 ? (
              <p className="p-5 text-center text-sm text-muted-foreground">
                {isDutch ? 'Geen uitzonderingen geregistreerd voor deze leerling.' : 'No exceptions recorded for this student.'}
              </p>
            ) : (
              studentToShow.recentActivity.map((event, i) => (
                <div key={event.id}
                  className={cn('grid items-start gap-3 px-4 py-3', i > 0 && 'border-t border-border')}
                  style={{ gridTemplateColumns: '90px 1fr auto' }}>
                  <div className="pt-0.5 text-[11px] leading-tight text-muted-foreground">
                    {formatEventTime(event.createdAt, dateLocale)}
                  </div>
                  <div>
                    {event.note && <p className="text-[12px] text-muted-foreground">{event.note}</p>}
                  </div>
                  <EventBadge type={event.type} lang={language} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Record dialog */}
      <Dialog open={showRecord} onOpenChange={setShowRecord}>
        <DialogContent className="max-w-sm rounded-xl border-0">
          <DialogHeader>
            <DialogTitle className="text-base">
              {isDutch ? 'Uitzondering registreren' : 'Record exception'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="mb-1 block text-[12px] text-muted-foreground">
                {isDutch ? 'Leerling' : 'Student'}
              </label>
              <select
                value={recordStudentId}
                onChange={e => setRecordStudentId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-[hsl(var(--surface-1))] px-3 text-[13px]"
              >
                <option value="">{isDutch ? 'Selecteer leerling…' : 'Select student…'}</option>
                {data.students.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-muted-foreground">
                {isDutch ? 'Type' : 'Type'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['absent', 'late', 'forgot_hw', 'incident'] as EventType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setRecordType(t)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                      recordType === t
                        ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)] text-background'
                        : 'border-border bg-background text-muted-foreground hover:border-[var(--accent-brand)]'
                    )}
                  >
                    {isDutch ? EVENT_LABELS[t].nl : EVENT_LABELS[t].en}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-muted-foreground">
                {isDutch ? 'Notitie (optioneel)' : 'Note (optional)'}
              </label>
              <Input
                value={recordNote}
                onChange={e => setRecordNote(e.target.value)}
                placeholder={isDutch ? 'Bijv. ouder heeft gebeld, verklaring…' : 'E.g. parent called, explanation…'}
                className="text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowRecord(false)}>
                {isDutch ? 'Annuleren' : 'Cancel'}
              </Button>
              <Button size="sm" disabled={!recordStudentId || saving} onClick={() => void saveRecord()}>
                {saving ? (isDutch ? 'Opslaan…' : 'Saving…') : (isDutch ? 'Opslaan' : 'Save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
