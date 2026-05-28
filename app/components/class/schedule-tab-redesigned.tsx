'use client';

import { useEffect, useMemo, useState, useContext } from 'react';
import { Plus, Trash2, CopyPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { cn } from '@/lib/utils';

type ScheduleSlot = {
  id: string;
  class_id: string;
  day_of_week: number;
  period_index: number;
  title: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  subject_id: string | null;
  notes: string | null;
};

type ScheduleTabProps = {
  classId: string;
  cachedData?: { slots?: ScheduleSlot[]; enabled?: boolean } | null;
  parentLoading?: boolean;
};

type ViewMode = 'week' | 'day';

const WEEK_DAYS = [
  { value: 1, short: 'Mon', label: 'Monday', shortNl: 'Ma', labelNl: 'Maandag' },
  { value: 2, short: 'Tue', label: 'Tuesday', shortNl: 'Di', labelNl: 'Dinsdag' },
  { value: 3, short: 'Wed', label: 'Wednesday', shortNl: 'Wo', labelNl: 'Woensdag' },
  { value: 4, short: 'Thu', label: 'Thursday', shortNl: 'Do', labelNl: 'Donderdag' },
  { value: 5, short: 'Fri', label: 'Friday', shortNl: 'Vr', labelNl: 'Vrijdag' },
];

function parseMinutes(time: string) {
  const [h, m] = String(time || '').split(':').map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

function fmt24(time: string) {
  // Return as-is if already HH:MM
  const parts = String(time || '').split(':');
  if (parts.length >= 2) {
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    return `${h}:${m}`;
  }
  return time;
}

export function ScheduleTabRedesigned({ classId, cachedData = null, parentLoading = false }: ScheduleTabProps) {
  const { toast } = useToast();
  const appContext = useContext(AppContext) as AppContextType | null;
  const role = appContext?.role || 'student';
  const language = appContext?.language || 'en';
  const isDutch = language === 'nl';
  const isTeacher = ['teacher', 'owner', 'admin', 'creator', 'ta'].includes(String(role));

  const [loading, setLoading] = useState(!cachedData && !parentLoading);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(Boolean(cachedData?.enabled));
  const [slots, setSlots] = useState<ScheduleSlot[]>(cachedData?.slots || []);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [editMode, setEditMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Drag state
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);

  // Edit dialog
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [editDraft, setEditDraft] = useState({
    title: '',
    start_time: '08:30',
    end_time: '09:20',
    day_of_week: '1',
    period_index: '1',
    notes: '',
  });

  // Add form
  const [newSlot, setNewSlot] = useState({
    day_of_week: '1',
    period_index: '1',
    title: '',
    start_time: '08:30',
    end_time: '09:20',
  });

  /* ── Load ── */
  const loadSchedule = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/school-schedule`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load schedule');
      setEnabled(data.enabled !== false);
      setSlots(data.slots || []);
    } catch (error: any) {
      toast({ title: isDutch ? 'Rooster laden mislukt' : 'Could not load schedule', description: error?.message || '', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSlots(cachedData?.slots || []);
    setEnabled(cachedData?.enabled !== false);
    setLoading(!cachedData && !parentLoading);
  }, [cachedData, parentLoading, classId]);

  useEffect(() => {
    if (!cachedData) void loadSchedule();
  }, [classId, cachedData]);

  /* ── Derived ── */
  const sortedSlots = useMemo(
    () =>
      [...slots].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        if (a.period_index !== b.period_index) return a.period_index - b.period_index;
        return parseMinutes(a.start_time) - parseMinutes(b.start_time);
      }),
    [slots]
  );

  const slotByCell = useMemo(() => {
    const map = new Map<string, ScheduleSlot>();
    for (const slot of sortedSlots) map.set(`${slot.day_of_week}-${slot.period_index}`, slot);
    return map;
  }, [sortedSlots]);

  const periodRows = useMemo(() => {
    const highest = Math.max(8, ...sortedSlots.map((s) => s.period_index));
    return Array.from({ length: highest }, (_, i) => i + 1);
  }, [sortedSlots]);

  // Today's slots for day view
  const todayDayIndex = useMemo(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 7 : jsDay;
  }, []);

  const todaySlots = useMemo(
    () => sortedSlots.filter((s) => s.day_of_week === todayDayIndex),
    [sortedSlots, todayDayIndex]
  );

  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  function isCurrentSlot(slot: ScheduleSlot) {
    const start = parseMinutes(slot.start_time);
    const end = parseMinutes(slot.end_time);
    return !Number.isNaN(start) && !Number.isNaN(end) && nowMinutes >= start && nowMinutes < end;
  }

  /* ── CRUD ── */
  const createSlot = async () => {
    if (!newSlot.title.trim()) {
      toast({ title: isDutch ? 'Titel vereist' : 'Title is required', variant: 'destructive' });
      return;
    }
    const start = parseMinutes(newSlot.start_time);
    const end = parseMinutes(newSlot.end_time);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      toast({ title: isDutch ? 'Eindtijd moet na begintijd zijn' : 'End time must be after start time', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${classId}/school-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: Number(newSlot.day_of_week),
          period_index: Number(newSlot.period_index),
          title: newSlot.title.trim(),
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add slot');
      setNewSlot(prev => ({ ...prev, title: '' }));
      setShowAddForm(false);
      await loadSchedule();
      toast({ title: isDutch ? 'Roosterblok toegevoegd' : 'Schedule slot added' });
    } catch (error: any) {
      toast({ title: isDutch ? 'Toevoegen mislukt' : 'Could not add slot', description: error?.message || '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const moveSlot = async (slotId: string, dayOfWeek: number, periodIndex: number) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    if (slot.day_of_week === dayOfWeek && slot.period_index === periodIndex) return;

    const occupied = slotByCell.get(`${dayOfWeek}-${periodIndex}`);
    if (occupied && occupied.id !== slotId) {
      const sourceDay = slot.day_of_week;
      const sourcePeriod = slot.period_index;
      setSlots(prev => prev.map(s => {
        if (s.id === slotId) return { ...s, day_of_week: dayOfWeek, period_index: periodIndex };
        if (s.id === occupied.id) return { ...s, day_of_week: sourceDay, period_index: sourcePeriod };
        return s;
      }));
      try {
        const [r1, r2] = await Promise.all([
          fetch(`/api/classes/${classId}/school-schedule`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slot_id: slotId, day_of_week: dayOfWeek, period_index: periodIndex }),
          }),
          fetch(`/api/classes/${classId}/school-schedule`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slot_id: occupied.id, day_of_week: sourceDay, period_index: sourcePeriod }),
          }),
        ]);
        if (!r1.ok || !r2.ok) throw new Error('Swap failed');
        await loadSchedule();
      } catch (error: any) {
        toast({ title: 'Could not swap slots', variant: 'destructive' });
        await loadSchedule();
      }
      return;
    }

    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, day_of_week: dayOfWeek, period_index: periodIndex } : s));
    try {
      const res = await fetch(`/api/classes/${classId}/school-schedule`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: slotId, day_of_week: dayOfWeek, period_index: periodIndex }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await loadSchedule();
    } catch (error: any) {
      toast({ title: 'Could not move slot', variant: 'destructive' });
      await loadSchedule();
    }
  };

  const openEditSlot = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setEditDraft({
      title: slot.title,
      start_time: slot.start_time,
      end_time: slot.end_time,
      day_of_week: String(slot.day_of_week),
      period_index: String(slot.period_index),
      notes: slot.notes || '',
    });
  };

  const saveEditSlot = async () => {
    if (!editingSlot) return;
    if (!editDraft.title.trim()) {
      toast({ title: isDutch ? 'Titel vereist' : 'Title is required', variant: 'destructive' });
      return;
    }
    const start = parseMinutes(editDraft.start_time);
    const end = parseMinutes(editDraft.end_time);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      toast({ title: isDutch ? 'Eindtijd moet na begintijd zijn' : 'End time must be after start time', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${classId}/school-schedule`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: editingSlot.id,
          title: editDraft.title.trim(),
          start_time: editDraft.start_time,
          end_time: editDraft.end_time,
          day_of_week: Number(editDraft.day_of_week),
          period_index: Number(editDraft.period_index),
          notes: editDraft.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      await loadSchedule();
      setEditingSlot(null);
      toast({ title: isDutch ? 'Blok bijgewerkt' : 'Slot updated' });
    } catch (error: any) {
      toast({ title: isDutch ? 'Opslaan mislukt' : 'Could not update slot', description: error?.message || '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const duplicateSlotToNextDay = async (slot: ScheduleSlot) => {
    const targetDay = slot.day_of_week === 5 ? 1 : slot.day_of_week + 1;
    const targetKey = `${targetDay}-${slot.period_index}`;
    if (slotByCell.has(targetKey)) {
      toast({ title: isDutch ? 'Periode bezet' : 'Next day period occupied', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${classId}/school-schedule`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: targetDay,
          period_index: slot.period_index,
          title: slot.title,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_break: slot.is_break,
          subject_id: slot.subject_id,
          notes: slot.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await loadSchedule();
      toast({ title: isDutch ? 'Blok gekopieerd naar volgende dag' : 'Slot duplicated to next day' });
    } catch (error: any) {
      toast({ title: 'Could not duplicate slot', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removeSlot = async (slotId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${classId}/school-schedule?slotId=${encodeURIComponent(slotId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await loadSchedule();
      toast({ title: isDutch ? 'Blok verwijderd' : 'Slot removed' });
    } catch (error: any) {
      toast({ title: 'Could not remove slot', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const todayLabel = useMemo(() => {
    const day = WEEK_DAYS.find(d => d.value === todayDayIndex);
    if (!day) return '';
    const now = new Date();
    const dateStr = now.toLocaleDateString(isDutch ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'long' });
    return `${isDutch ? day.labelNl : day.label}, ${dateStr}`;
  }, [todayDayIndex, isDutch]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-[var(--accent-brand)]" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="overflow-hidden rounded-[10px] border border-border bg-background p-8 text-center">
        <p className="text-[13px] text-muted-foreground">
          {isDutch ? 'Rooster is niet ingeschakeld voor deze klas.' : 'Schedule is not enabled for this class.'}
        </p>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <>
      <div className="overflow-hidden rounded-[10px] border border-border bg-background">
        {/* Topbar */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-2.5 text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            {isDutch ? 'Rooster' : 'Schedule'}
          </span>
          <span>·</span>
          <span>{isDutch ? `Week ${getISOWeek(new Date())}` : `Week ${getISOWeek(new Date())}`}</span>
        </div>

        <div className="p-5">
          {/* Controls row */}
          <div className="mb-4 flex items-center justify-between">
            {/* Week / Day toggle */}
            <div className="flex overflow-hidden rounded-[6px] border border-border">
              <button
                type="button"
                onClick={() => setViewMode('week')}
                style={viewMode === 'week' ? { backgroundColor: '#7f8962', color: '#ffffff' } : undefined}
                className={cn(
                  'border-r border-border px-3 py-[5px] text-[12px] transition-colors',
                  viewMode === 'week'
                    ? 'border-[var(--accent-brand)]'
                    : 'bg-background text-foreground/70 hover:bg-muted'
                )}
              >
                {isDutch ? 'Week' : 'Week'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('day')}
                style={viewMode === 'day' ? { backgroundColor: '#7f8962', color: '#ffffff' } : undefined}
                className={cn(
                  'px-3 py-[5px] text-[12px] transition-colors',
                  viewMode === 'day'
                    ? 'border-[var(--accent-brand)]'
                    : 'bg-background text-foreground/70 hover:bg-muted'
                )}
              >
                {isDutch ? 'Dag' : 'Day'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Edit mode toggle — teacher only */}
              {isTeacher && (
                <button
                  type="button"
                  onClick={() => { setEditMode(!editMode); setShowAddForm(false); }}
                  className={cn(
                    'rounded-[6px] border px-3 py-[5px] text-[12px] transition-colors',
                    editMode
                      ? 'border-amber-600 bg-amber-600/10 text-amber-600'
                      : 'border-border bg-background text-foreground/70 hover:border-[var(--accent-brand)] hover:text-[var(--accent-brand)]'
                  )}
                >
                  {editMode
                    ? (isDutch ? 'Bewerken actief' : 'Edit mode on')
                    : (isDutch ? 'Rooster bewerken' : 'Edit schedule')}
                </button>
              )}
              {/* Add slot button — teacher only */}
              {isTeacher && editMode && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  style={{ backgroundColor: '#7f8962', color: '#ffffff' }}
                  className="flex items-center gap-1.5 rounded-[6px] border border-[var(--accent-brand)] px-3 py-[5px] text-[12px] font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isDutch ? 'Toevoegen' : 'Add slot'}
                </button>
              )}
            </div>
          </div>

          {/* Edit hint */}
          {editMode && (
            <div className="mb-3 rounded-[6px] bg-amber-600/10 px-3 py-2 text-[12px] text-amber-600">
              {isDutch
                ? 'Klik op een blok om te bewerken. Sleep om van positie te wisselen.'
                : 'Click any slot to edit. Drag to swap positions.'}
            </div>
          )}

          {/* ── Add slot form ── */}
          {showAddForm && isTeacher && (
            <div className="mb-4 rounded-[8px] border border-border bg-muted/30 p-4">
              <p className="mb-3 text-[13px] font-semibold text-foreground">
                {isDutch ? 'Nieuw roosterblok' : 'New schedule slot'}
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="space-y-1">
                  <Label className="text-[11px]">{isDutch ? 'Dag' : 'Day'}</Label>
                  <Select value={newSlot.day_of_week} onValueChange={v => setNewSlot(p => ({ ...p, day_of_week: v }))}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WEEK_DAYS.map(d => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {isDutch ? d.labelNl : d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">{isDutch ? 'Periode' : 'Period'}</Label>
                  <Input
                    value={newSlot.period_index}
                    onChange={e => setNewSlot(p => ({ ...p, period_index: e.target.value }))}
                    className="h-8 text-[12px]"
                    type="number" min="1" max="12"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">{isDutch ? 'Begin' : 'Start'}</Label>
                  <Input
                    value={newSlot.start_time}
                    onChange={e => setNewSlot(p => ({ ...p, start_time: e.target.value }))}
                    className="h-8 text-[12px]"
                    placeholder="08:30"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">{isDutch ? 'Einde' : 'End'}</Label>
                  <Input
                    value={newSlot.end_time}
                    onChange={e => setNewSlot(p => ({ ...p, end_time: e.target.value }))}
                    className="h-8 text-[12px]"
                    placeholder="09:20"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">{isDutch ? 'Vak / Titel' : 'Subject / Title'}</Label>
                  <Input
                    value={newSlot.title}
                    onChange={e => setNewSlot(p => ({ ...p, title: e.target.value }))}
                    className="h-8 text-[12px]"
                    placeholder={isDutch ? 'Wiskunde' : 'Mathematics'}
                    onKeyDown={e => { if (e.key === 'Enter') void createSlot(); }}
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void createSlot()}
                  disabled={saving}
                  style={{ backgroundColor: '#7f8962', color: '#ffffff' }}
                  className="rounded-[6px] px-4 py-1.5 text-[12px] font-semibold disabled:opacity-50"
                >
                  {saving ? '…' : (isDutch ? 'Opslaan' : 'Save')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-[6px] border border-border bg-background px-4 py-1.5 text-[12px] text-muted-foreground hover:bg-muted"
                >
                  {isDutch ? 'Annuleren' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* ── WEEK VIEW ── */}
          {viewMode === 'week' && (
            <div className="overflow-x-auto">
              <div className="min-w-[520px]">
                <div className="grid gap-1" style={{ gridTemplateColumns: '44px repeat(5, 1fr)' }}>
                  {/* Day headers */}
                  <div />
                  {WEEK_DAYS.map(day => (
                    <div
                      key={day.value}
                      className={cn(
                        'p-1 text-center text-[11px] font-bold uppercase tracking-[.4px]',
                        day.value === todayDayIndex ? 'text-[var(--accent-brand)]' : 'text-muted-foreground'
                      )}
                    >
                      {isDutch ? day.shortNl : day.short}
                    </div>
                  ))}

                  {/* Period rows */}
                  {periodRows.map(periodIndex => (
                    <>
                      {/* Time label */}
                      <div key={`time-${periodIndex}`} className="pr-1.5 pt-1.5 text-right text-[10px] text-muted-foreground/60">
                        P{periodIndex}
                      </div>

                      {WEEK_DAYS.map(day => {
                        const slot = slotByCell.get(`${day.value}-${periodIndex}`) || null;
                        return (
                          <div
                            key={`${day.value}-${periodIndex}`}
                            className={cn(
                              'min-h-[44px] rounded-[4px]',
                              slot
                                ? 'border-l-[3px] border-l-[var(--accent-brand)] bg-[var(--accent-brand)]/10'
                                : 'border-l-[3px] border-l-border bg-muted/30',
                              editMode && slot && 'cursor-pointer outline outline-2 outline-dashed outline-[#c87d25]',
                            )}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                              e.preventDefault();
                              if (!dragSlotId || !editMode) return;
                              void moveSlot(dragSlotId, day.value, periodIndex);
                              setDragSlotId(null);
                            }}
                            onClick={() => {
                              if (editMode && slot) openEditSlot(slot);
                            }}
                          >
                            {slot ? (
                              <div
                                draggable={editMode}
                                onDragStart={() => editMode && setDragSlotId(slot.id)}
                                onDragEnd={() => setDragSlotId(null)}
                                className="flex h-full flex-col p-[5px_6px]"
                              >
                                <div className="text-[10px] font-semibold text-[var(--accent-brand)]">
                                  {fmt24(slot.start_time)}–{fmt24(slot.end_time)}
                                </div>
                                <div className="mt-0.5 text-[11px] font-semibold text-foreground">
                                  {slot.title}
                                </div>
                                {slot.notes && (
                                  <div className="mt-0.5 text-[10px] text-muted-foreground">{slot.notes}</div>
                                )}

                                {/* Edit controls — only in edit mode, not via click (click opens dialog) */}
                                {editMode && (
                                  <div className="mt-auto flex gap-0.5 pt-1">
                                    <button
                                      type="button"
                                      onClick={e => { e.stopPropagation(); void duplicateSlotToNextDay(slot); }}
                                      className="rounded p-0.5 text-muted-foreground hover:text-[var(--accent-brand)]"
                                      title={isDutch ? 'Kopieer naar volgende dag' : 'Duplicate to next day'}
                                    >
                                      <CopyPlus className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={e => { e.stopPropagation(); void removeSlot(slot.id); }}
                                      className="rounded p-0.5 text-muted-foreground hover:text-red-600"
                                      title={isDutch ? 'Verwijderen' : 'Remove'}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Empty cell
                              editMode ? (
                                <div
                                  className="flex h-full min-h-[44px] cursor-pointer items-center justify-center text-[11px] text-muted-foreground/40 hover:text-amber-600"
                                  onClick={() => {
                                    setNewSlot(p => ({ ...p, day_of_week: String(day.value), period_index: String(periodIndex) }));
                                    setShowAddForm(true);
                                  }}
                                >
                                  +
                                </div>
                              ) : null
                            )}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── DAY VIEW ── */}
          {viewMode === 'day' && (
            <div>
              <p className="mb-2.5 text-[12px] font-semibold text-[var(--accent-brand)]">{todayLabel}</p>

              {todaySlots.length === 0 ? (
                <div className="rounded-[8px] border border-border bg-muted/30 p-6 text-center text-[13px] text-muted-foreground">
                  {isDutch ? 'Geen lessen vandaag.' : 'No classes today.'}
                </div>
              ) : (
                <div className="flex flex-col">
                  {todaySlots.map(slot => {
                    const isCurrent = isCurrentSlot(slot);
                    return (
                      <div
                        key={slot.id}
                        className={cn(
                          'grid items-center gap-3 rounded-[6px] border-b border-border p-[11px_10px] last:border-b-0',
                          isCurrent ? 'bg-[var(--accent-brand)]/10' : ''
                        )}
                        style={{ gridTemplateColumns: '60px 1fr 60px' }}
                      >
                        <div className="text-[12px] font-semibold text-[var(--accent-brand)]">
                          {fmt24(slot.start_time)}
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-foreground">
                            {slot.title}
                          </div>
                          {slot.notes && (
                            <div className="mt-0.5 text-[11px] text-muted-foreground">{slot.notes}</div>
                          )}
                        </div>
                        <div className="text-right">
                          {isCurrent && (
                            <span className="rounded-full bg-[var(--accent-brand)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-brand)]">
                              {isDutch ? 'Nu' : 'Now'}
                            </span>
                          )}
                          {editMode && (
                            <button
                              type="button"
                              onClick={() => openEditSlot(slot)}
                              className="text-[11px] text-amber-600"
                            >
                              {isDutch ? 'Bewerk' : 'Edit'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit slot dialog ── */}
      <Dialog open={Boolean(editingSlot)} onOpenChange={open => !open && setEditingSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isDutch ? 'Roosterblok bewerken' : 'Edit Schedule Slot'}</DialogTitle>
            <DialogDescription>
              {isDutch ? 'Pas dag, periode, titel en tijden aan.' : 'Update day, period, title, and time range.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>{isDutch ? 'Dag' : 'Day'}</Label>
              <Select value={editDraft.day_of_week} onValueChange={v => setEditDraft(p => ({ ...p, day_of_week: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEK_DAYS.map(d => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {isDutch ? d.labelNl : d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{isDutch ? 'Periode' : 'Period'}</Label>
              <Input value={editDraft.period_index} onChange={e => setEditDraft(p => ({ ...p, period_index: e.target.value }))} className="h-9" type="number" min="1" />
            </div>
            <div className="space-y-1">
              <Label>{isDutch ? 'Begintijd' : 'Start time'}</Label>
              <Input value={editDraft.start_time} onChange={e => setEditDraft(p => ({ ...p, start_time: e.target.value }))} className="h-9" placeholder="08:30" />
            </div>
            <div className="space-y-1">
              <Label>{isDutch ? 'Eindtijd' : 'End time'}</Label>
              <Input value={editDraft.end_time} onChange={e => setEditDraft(p => ({ ...p, end_time: e.target.value }))} className="h-9" placeholder="09:20" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>{isDutch ? 'Vak / Titel' : 'Subject / Title'}</Label>
              <Input value={editDraft.title} onChange={e => setEditDraft(p => ({ ...p, title: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>{isDutch ? 'Notities (optioneel)' : 'Notes (optional)'}</Label>
              <Input value={editDraft.notes} onChange={e => setEditDraft(p => ({ ...p, notes: e.target.value }))} className="h-9" placeholder={isDutch ? 'Lokaal 102' : 'Room 102'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSlot(null)}>
              {isDutch ? 'Annuleren' : 'Cancel'}
            </Button>
            <Button
              onClick={() => void saveEditSlot()}
              disabled={saving}
              style={{ backgroundColor: '#7f8962', color: '#ffffff' }}
              className="hover:opacity-90"
            >
              {saving ? '…' : (isDutch ? 'Opslaan' : 'Save changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** ISO week number helper */
function getISOWeek(date: Date): number {
  const d = new Date(date.valueOf());
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
}
