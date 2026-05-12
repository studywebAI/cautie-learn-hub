'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Clock, Pencil, Plus, Trash2, X, Check, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';

type ScheduleSlot = {
  id: string;
  class_id: string;
  day_of_week: number; // 1=Mon … 5=Fri
  period_index: number;
  title: string;
  start_time: string; // "HH:MM"
  end_time: string;
  is_break: boolean;
  subject_id: string | null;
  notes: string | null;
};

type ScheduleTabRedesignedProps = {
  classId: string;
  cachedData?: { slots?: ScheduleSlot[]; enabled?: boolean } | null;
  parentLoading?: boolean;
};

const WEEK_DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEK_DAYS_NL = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];
const WEEK_DAYS_SHORT_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEK_DAYS_SHORT_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];

function parseMinutes(time: string): number {
  const [h, m] = String(time || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

function fmt24(time: string): string {
  const [h, m] = String(time || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function minuteHeight(start: string, end: string): number {
  const s = parseMinutes(start);
  const e = parseMinutes(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return 48;
  return Math.max(32, (e - s) * 0.9);
}

function todayDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 || d === 6 ? 1 : d; // weekend → show Mon
}

export function ScheduleTabRedesigned({
  classId,
  cachedData = null,
  parentLoading = false,
}: ScheduleTabRedesignedProps) {
  const appContext = useContext(AppContext) as AppContextType | null;
  const role = appContext?.role || 'student';
  const language = appContext?.language || 'en';
  const isDutch = language === 'nl';
  const isTeacher = ['teacher', 'owner', 'admin', 'creator'].includes(String(role));

  const WEEK_DAYS = isDutch ? WEEK_DAYS_NL : WEEK_DAYS_EN;
  const WEEK_DAYS_SHORT = isDutch ? WEEK_DAYS_SHORT_NL : WEEK_DAYS_SHORT_EN;

  const [slots, setSlots] = useState<ScheduleSlot[]>(cachedData?.slots || []);
  const [loading, setLoading] = useState(!cachedData && !parentLoading);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'week' | 'day'>('week');
  const [editMode, setEditMode] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(todayDayOfWeek());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [draft, setDraft] = useState({
    title: '',
    day_of_week: '1',
    start_time: '08:30',
    end_time: '09:20',
    notes: '',
  });

  useEffect(() => {
    setSlots(cachedData?.slots || []);
    setLoading(!cachedData && !parentLoading);
  }, [cachedData, parentLoading, classId]);

  useEffect(() => {
    if (!cachedData && !parentLoading) void loadSchedule();
  }, [classId]);

  async function loadSchedule() {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/${classId}/school-schedule`);
      const data = await res.json();
      if (res.ok) setSlots(data.slots || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function createSlot() {
    const title = draft.title.trim();
    if (!title) return;
    const start = parseMinutes(draft.start_time);
    const end = parseMinutes(draft.end_time);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${classId}/school-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          day_of_week: Number(draft.day_of_week),
          period_index: 1,
          start_time: draft.start_time,
          end_time: draft.end_time,
          notes: draft.notes.trim() || null,
        }),
      });
      if (res.ok) {
        setShowAddDialog(false);
        setDraft({ title: '', day_of_week: '1', start_time: '08:30', end_time: '09:20', notes: '' });
        await loadSchedule();
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function updateSlot() {
    if (!editingSlot) return;
    const title = draft.title.trim();
    if (!title) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${classId}/school-schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: editingSlot.id,
          title,
          day_of_week: Number(draft.day_of_week),
          period_index: editingSlot.period_index,
          start_time: draft.start_time,
          end_time: draft.end_time,
          notes: draft.notes.trim() || null,
        }),
      });
      if (res.ok) {
        setEditingSlot(null);
        await loadSchedule();
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function deleteSlot(slotId: string) {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/classes/${classId}/school-schedule?slotId=${encodeURIComponent(slotId)}`,
        { method: 'DELETE' }
      );
      if (res.ok) await loadSchedule();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  function openEdit(slot: ScheduleSlot) {
    setEditingSlot(slot);
    setDraft({
      title: slot.title,
      day_of_week: String(slot.day_of_week),
      start_time: slot.start_time,
      end_time: slot.end_time,
      notes: slot.notes || '',
    });
  }

  function openAdd() {
    setDraft({
      title: '',
      day_of_week: String(view === 'day' ? selectedDay : 1),
      start_time: '08:30',
      end_time: '09:20',
      notes: '',
    });
    setShowAddDialog(true);
  }

  const sortedSlots = useMemo(
    () =>
      [...slots].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return parseMinutes(a.start_time) - parseMinutes(b.start_time);
      }),
    [slots]
  );

  const slotsByDay = useMemo(() => {
    const map = new Map<number, ScheduleSlot[]>();
    for (let d = 1; d <= 5; d++) map.set(d, []);
    for (const s of sortedSlots) {
      map.get(s.day_of_week)?.push(s);
    }
    return map;
  }, [sortedSlots]);

  const todaySlots = slotsByDay.get(selectedDay) || [];

  // Live "now" indicator
  const nowMin = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  function isCurrentSlot(slot: ScheduleSlot): boolean {
    const s = parseMinutes(slot.start_time);
    const e = parseMinutes(slot.end_time);
    return !Number.isNaN(s) && !Number.isNaN(e) && nowMin >= s && nowMin < e && slot.day_of_week === todayDayOfWeek();
  }

  function isUpcomingSlot(slot: ScheduleSlot): boolean {
    const s = parseMinutes(slot.start_time);
    return !Number.isNaN(s) && s > nowMin && slot.day_of_week === todayDayOfWeek();
  }

  if (loading || parentLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader
          label={isDutch ? 'Rooster laden' : 'Loading schedule'}
          sublabel={isDutch ? 'Tijdslots ophalen' : 'Fetching time slots'}
          size="md"
        />
      </div>
    );
  }

  return (
    <div className="class-shell space-y-3">
      {/* Header bar */}
      <div className="flex items-center gap-2">
        {/* Week/Day toggle */}
        <div className="flex items-center overflow-hidden rounded-lg border border-border bg-[hsl(var(--surface-1))]">
          <button
            type="button"
            onClick={() => setView('week')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors',
              view === 'week'
                ? 'bg-[var(--accent-brand)] text-white'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {isDutch ? 'Week' : 'Week'}
          </button>
          <button
            type="button"
            onClick={() => setView('day')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors',
              view === 'day'
                ? 'bg-[var(--accent-brand)] text-white'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            {isDutch ? 'Dag' : 'Day'}
          </button>
        </div>

        {/* Day selector (only in day view) */}
        {view === 'day' && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedDay(d => Math.max(1, d - 1))}
              disabled={selectedDay === 1}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-[hsl(var(--surface-1))] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {[1, 2, 3, 4, 5].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={cn(
                  'h-7 min-w-[2.75rem] rounded-md px-2 text-[12px] font-medium transition-colors border',
                  d === selectedDay
                    ? 'border-[var(--accent-brand)] bg-[hsl(var(--accent-brand)/0.1)] text-[var(--accent-brand)]'
                    : 'border-border bg-[hsl(var(--surface-1))] text-muted-foreground hover:text-foreground',
                  d === todayDayOfWeek() && d !== selectedDay && 'border-[var(--accent-brand)/0.4]'
                )}
              >
                {WEEK_DAYS_SHORT[d - 1]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedDay(d => Math.min(5, d + 1))}
              disabled={selectedDay === 5}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-[hsl(var(--surface-1))] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isTeacher && (
            <>
              <button
                type="button"
                onClick={() => setEditMode(e => !e)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors',
                  editMode
                    ? 'border-[var(--accent-brand)] bg-[hsl(var(--accent-brand)/0.08)] text-[var(--accent-brand)]'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <Pencil className="h-3 w-3" />
                {editMode ? (isDutch ? 'Gereed' : 'Done') : (isDutch ? 'Bewerken' : 'Edit')}
              </button>
              {editMode && (
                <Button size="sm" onClick={openAdd} className="h-7 gap-1.5 px-3 text-[12px]">
                  <Plus className="h-3.5 w-3.5" />
                  {isDutch ? 'Toevoegen' : 'Add slot'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── WEEK VIEW ── */}
      {view === 'week' && (
        <div className="class-panel overflow-hidden p-0">
          {/* Day headers */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}>
            <div className="border-r border-border px-2 py-2" />
            {WEEK_DAYS_SHORT.map((d, i) => (
              <div
                key={d}
                className={cn(
                  'border-r border-border px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider last:border-r-0',
                  i + 1 === todayDayOfWeek() ? 'text-[var(--accent-brand)]' : 'text-muted-foreground'
                )}
              >
                {d}
                {i + 1 === todayDayOfWeek() && (
                  <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-brand)] align-middle" />
                )}
              </div>
            ))}
          </div>

          {/* Slot rows — one row per unique time bucket across all days */}
          {sortedSlots.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {isTeacher
                ? (isDutch ? 'Geen lessen. Klik "Bewerken" om te starten.' : 'No lessons yet. Click "Edit" to get started.')
                : (isDutch ? 'Nog geen lessen ingepland.' : 'No lessons scheduled yet.')}
            </div>
          ) : (
            (() => {
              // Collect all unique start times across days, sorted
              const allTimes = Array.from(new Set(sortedSlots.map(s => s.start_time))).sort();
              return allTimes.map(time => {
                const rowSlots = new Map<number, ScheduleSlot>();
                for (let d = 1; d <= 5; d++) {
                  const match = (slotsByDay.get(d) || []).find(s => s.start_time === time);
                  if (match) rowSlots.set(d, match);
                }
                return (
                  <div
                    key={time}
                    className="grid border-b border-border last:border-b-0"
                    style={{ gridTemplateColumns: '56px repeat(5, 1fr)' }}
                  >
                    {/* Time label */}
                    <div className="flex items-center justify-center border-r border-border px-1 py-3 text-[11px] font-mono text-muted-foreground">
                      {fmt24(time)}
                    </div>
                    {/* Day cells */}
                    {[1, 2, 3, 4, 5].map(d => {
                      const slot = rowSlots.get(d);
                      const isCurrent = slot ? isCurrentSlot(slot) : false;
                      return (
                        <div
                          key={d}
                          className="border-r border-border p-1.5 last:border-r-0"
                        >
                          {slot ? (
                            <div
                              className={cn(
                                'group relative rounded-lg px-2.5 py-2 text-[12px] transition-colors',
                                isCurrent
                                  ? 'bg-[hsl(var(--accent-brand)/0.15)] ring-1 ring-[var(--accent-brand)]'
                                  : 'bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--interactive-hover))]'
                              )}
                            >
                              <p className={cn('font-semibold leading-tight truncate', isCurrent && 'text-[var(--accent-brand)]')}>
                                {slot.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {fmt24(slot.start_time)}–{fmt24(slot.end_time)}
                              </p>
                              {slot.notes && (
                                <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
                                  {slot.notes}
                                </p>
                              )}
                              {/* Edit controls */}
                              {editMode && isTeacher && (
                                <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
                                  <button
                                    type="button"
                                    onClick={() => openEdit(slot)}
                                    className="rounded p-0.5 text-muted-foreground hover:bg-white hover:text-foreground"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void deleteSlot(slot.id)}
                                    disabled={saving}
                                    className="rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            editMode && isTeacher ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setDraft({
                                    title: '',
                                    day_of_week: String(d),
                                    start_time: time,
                                    end_time: fmt24(`${Math.floor(parseMinutes(time) / 60 + 0)}:${String(parseMinutes(time) % 60).padStart(2, '0')}`),
                                    notes: '',
                                  });
                                  setShowAddDialog(true);
                                }}
                                className="flex h-full min-h-[48px] w-full items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-muted-foreground/50 transition-colors hover:border-[var(--accent-brand)] hover:text-[var(--accent-brand)]"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            ) : (
                              <div className="min-h-[48px]" />
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()
          )}
        </div>
      )}

      {/* ── DAY VIEW ── */}
      {view === 'day' && (
        <div className="class-panel space-y-2 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold">
              {WEEK_DAYS[selectedDay - 1]}
              {selectedDay === todayDayOfWeek() && (
                <span className="ml-2 inline-block rounded-full bg-[hsl(var(--accent-brand)/0.12)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-brand)]">
                  {isDutch ? 'Vandaag' : 'Today'}
                </span>
              )}
            </h3>
            <span className="text-[12px] text-muted-foreground">
              {todaySlots.length} {isDutch ? 'les(sen)' : 'lesson(s)'}
            </span>
          </div>

          {todaySlots.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isTeacher
                ? (isDutch ? 'Geen lessen op deze dag.' : 'No lessons on this day.')
                : (isDutch ? 'Geen lessen gepland.' : 'No lessons scheduled.')}
              {isTeacher && editMode && (
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={openAdd}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {isDutch ? 'Les toevoegen' : 'Add lesson'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {todaySlots.map(slot => {
                const isCurrent = isCurrentSlot(slot);
                const isUpcoming = !isCurrent && isUpcomingSlot(slot);
                return (
                  <div
                    key={slot.id}
                    className={cn(
                      'group flex items-stretch gap-3 rounded-xl border transition-colors',
                      isCurrent
                        ? 'border-[var(--accent-brand)] bg-[hsl(var(--accent-brand)/0.06)]'
                        : isUpcoming
                        ? 'border-border bg-[hsl(var(--surface-1))]'
                        : 'border-border bg-[hsl(var(--surface-1))] opacity-75'
                    )}
                  >
                    {/* Time stripe */}
                    <div
                      className={cn(
                        'flex w-14 flex-shrink-0 flex-col items-center justify-center rounded-l-xl py-3 text-center',
                        isCurrent
                          ? 'bg-[var(--accent-brand)] text-white'
                          : 'bg-[hsl(var(--surface-2))] text-muted-foreground'
                      )}
                    >
                      <span className="text-[11px] font-bold">{fmt24(slot.start_time)}</span>
                      <span className="text-[9px] opacity-70">{fmt24(slot.end_time)}</span>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-center py-3 pr-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={cn('text-[14px] font-semibold leading-tight', isCurrent && 'text-[var(--accent-brand)]')}>
                            {slot.title}
                          </p>
                          {slot.notes && (
                            <p className="mt-0.5 text-[12px] text-muted-foreground">{slot.notes}</p>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="ml-2 flex items-center gap-1 rounded-full bg-[var(--accent-brand)] px-2 py-0.5 text-[10px] font-semibold text-white">
                            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                            {isDutch ? 'Nu' : 'Now'}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {fmt24(slot.start_time)} – {fmt24(slot.end_time)}
                        {' · '}
                        {Math.round((parseMinutes(slot.end_time) - parseMinutes(slot.start_time)))} min
                      </p>
                    </div>

                    {/* Edit controls */}
                    {editMode && isTeacher && (
                      <div className="flex flex-col items-center justify-center gap-1 pr-3">
                        <button
                          type="button"
                          onClick={() => openEdit(slot)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-[hsl(var(--interactive-hover))] hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteSlot(slot.id)}
                          disabled={saving}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog
        open={showAddDialog || !!editingSlot}
        onOpenChange={open => {
          if (!open) { setShowAddDialog(false); setEditingSlot(null); }
        }}
      >
        <DialogContent className="max-w-sm rounded-xl border-0">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingSlot
                ? (isDutch ? 'Les bewerken' : 'Edit lesson')
                : (isDutch ? 'Les toevoegen' : 'Add lesson')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                {isDutch ? 'Titel' : 'Title'}
              </label>
              <Input
                value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                placeholder={isDutch ? 'bijv. Biologie' : 'e.g. Biology'}
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                {isDutch ? 'Dag' : 'Day'}
              </label>
              <select
                value={draft.day_of_week}
                onChange={e => setDraft(d => ({ ...d, day_of_week: e.target.value }))}
                className="w-full rounded-md border border-border bg-[hsl(var(--surface-1))] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent-brand)]"
              >
                {WEEK_DAYS.map((day, i) => (
                  <option key={i + 1} value={String(i + 1)}>{day}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                  {isDutch ? 'Starttijd' : 'Start time'}
                </label>
                <Input
                  type="time"
                  value={draft.start_time}
                  onChange={e => setDraft(d => ({ ...d, start_time: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                  {isDutch ? 'Eindtijd' : 'End time'}
                </label>
                <Input
                  type="time"
                  value={draft.end_time}
                  onChange={e => setDraft(d => ({ ...d, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                {isDutch ? 'Lokaal / notitie (optioneel)' : 'Room / note (optional)'}
              </label>
              <Input
                value={draft.notes}
                onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                placeholder={isDutch ? 'bijv. Lokaal 3A' : 'e.g. Room 3A'}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAddDialog(false); setEditingSlot(null); }}
            >
              {isDutch ? 'Annuleren' : 'Cancel'}
            </Button>
            <Button
              size="sm"
              disabled={saving || !draft.title.trim()}
              onClick={() => void (editingSlot ? updateSlot() : createSlot())}
            >
              {saving
                ? (isDutch ? 'Opslaan…' : 'Saving…')
                : (isDutch ? 'Opslaan' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
