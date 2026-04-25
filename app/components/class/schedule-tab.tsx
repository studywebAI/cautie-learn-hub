'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock3, CopyPlus, GripVertical, Pencil, Plus, Shuffle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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

const WEEK_DAYS = [
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
];

function parseMinutes(time: string) {
  const [h, m] = String(time || '').split(':').map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

function formatTime(time: string) {
  const [h, m] = String(time || '').split(':').map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function ScheduleTab({ classId, cachedData = null, parentLoading = false }: ScheduleTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(!cachedData && !parentLoading);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(Boolean(cachedData?.enabled));
  const [slots, setSlots] = useState<ScheduleSlot[]>(cachedData?.slots || []);
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [editDraft, setEditDraft] = useState({
    title: '',
    start_time: '08:30',
    end_time: '09:20',
    day_of_week: '1',
    period_index: '1',
  });
  const [newSlot, setNewSlot] = useState({
    day_of_week: '1',
    period_index: '1',
    title: '',
    start_time: '08:30',
    end_time: '09:20',
  });

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/school-schedule`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load schedule');
      setEnabled(data.enabled !== false);
      setSlots(data.slots || []);
    } catch (error: any) {
      toast({ title: 'Could not load schedule', description: error?.message || 'Try again.', variant: 'destructive' });
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
    if (!cachedData) {
      void loadSchedule();
    }
  }, [classId, cachedData]);

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
    for (const slot of sortedSlots) {
      map.set(`${slot.day_of_week}-${slot.period_index}`, slot);
    }
    return map;
  }, [sortedSlots]);

  const nowSummary = useMemo(() => {
    const now = new Date();
    const jsDay = now.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const minutes = now.getHours() * 60 + now.getMinutes();
    const todaySlots = sortedSlots.filter((slot) => slot.day_of_week === dayOfWeek);
    const current = todaySlots.find((slot) => {
      const start = parseMinutes(slot.start_time);
      const end = parseMinutes(slot.end_time);
      return !Number.isNaN(start) && !Number.isNaN(end) && minutes >= start && minutes < end;
    }) || null;
    const next =
      todaySlots.find((slot) => {
        const start = parseMinutes(slot.start_time);
        return !Number.isNaN(start) && start > minutes;
      }) || null;
    return { current, next };
  }, [sortedSlots]);

  const createSlot = async () => {
    if (!newSlot.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    const start = parseMinutes(newSlot.start_time);
    const end = parseMinutes(newSlot.end_time);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      toast({ title: 'End time must be after start time', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/school-schedule`, {
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add slot');
      setNewSlot((prev) => ({ ...prev, title: '' }));
      await loadSchedule();
      toast({ title: 'Schedule slot added' });
    } catch (error: any) {
      toast({ title: 'Could not add slot', description: error?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const moveSlot = async (slotId: string, dayOfWeek: number, periodIndex: number) => {
    const slot = slots.find((entry) => entry.id === slotId);
    if (!slot) return;
    if (slot.day_of_week === dayOfWeek && slot.period_index === periodIndex) return;

    const occupied = slotByCell.get(`${dayOfWeek}-${periodIndex}`);
    if (occupied && occupied.id !== slotId) {
      const sourceDay = slot.day_of_week;
      const sourcePeriod = slot.period_index;
      setSlots((prev) =>
        prev.map((entry) => {
          if (entry.id === slotId) return { ...entry, day_of_week: dayOfWeek, period_index: periodIndex };
          if (entry.id === occupied.id) return { ...entry, day_of_week: sourceDay, period_index: sourcePeriod };
          return entry;
        })
      );
      try {
        const [firstResponse, secondResponse] = await Promise.all([
          fetch(`/api/classes/${classId}/school-schedule`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slot_id: slotId,
              day_of_week: dayOfWeek,
              period_index: periodIndex,
            }),
          }),
          fetch(`/api/classes/${classId}/school-schedule`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slot_id: occupied.id,
              day_of_week: sourceDay,
              period_index: sourcePeriod,
            }),
          }),
        ]);
        const firstPayload = await firstResponse.json().catch(() => ({}));
        const secondPayload = await secondResponse.json().catch(() => ({}));
        if (!firstResponse.ok) throw new Error(firstPayload.error || 'Failed to swap source slot');
        if (!secondResponse.ok) throw new Error(secondPayload.error || 'Failed to swap target slot');
        await loadSchedule();
        toast({ title: 'Slots swapped' });
      } catch (error: any) {
        toast({ title: 'Could not swap slots', description: error?.message || 'Try again.', variant: 'destructive' });
        await loadSchedule();
      }
      return;
    }

    setSlots((prev) => prev.map((entry) => (entry.id === slotId ? { ...entry, day_of_week: dayOfWeek, period_index: periodIndex } : entry)));
    try {
      const response = await fetch(`/api/classes/${classId}/school-schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: slotId,
          day_of_week: dayOfWeek,
          period_index: periodIndex,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to move slot');
      await loadSchedule();
    } catch (error: any) {
      toast({ title: 'Could not move slot', description: error?.message || 'Try again.', variant: 'destructive' });
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
    });
  };

  const saveEditSlot = async () => {
    if (!editingSlot) return;
    if (!editDraft.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    const start = parseMinutes(editDraft.start_time);
    const end = parseMinutes(editDraft.end_time);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      toast({ title: 'End time must be after start time', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/school-schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: editingSlot.id,
          title: editDraft.title.trim(),
          start_time: editDraft.start_time,
          end_time: editDraft.end_time,
          day_of_week: Number(editDraft.day_of_week),
          period_index: Number(editDraft.period_index),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save slot');
      await loadSchedule();
      setEditingSlot(null);
      toast({ title: 'Slot updated' });
    } catch (error: any) {
      toast({ title: 'Could not update slot', description: error?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const duplicateSlotToNextDay = async (slot: ScheduleSlot) => {
    const targetDay = slot.day_of_week === 5 ? 1 : slot.day_of_week + 1;
    const targetKey = `${targetDay}-${slot.period_index}`;
    if (slotByCell.has(targetKey)) {
      toast({ title: 'Next day period occupied', description: 'Pick another slot or move existing block first.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/school-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to duplicate slot');
      await loadSchedule();
      toast({ title: 'Slot duplicated to next day' });
    } catch (error: any) {
      toast({ title: 'Could not duplicate slot', description: error?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removeSlot = async (slotId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/school-schedule?slotId=${encodeURIComponent(slotId)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove slot');
      await loadSchedule();
      toast({ title: 'Slot removed' });
    } catch (error: any) {
      toast({ title: 'Could not remove slot', description: error?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const periodRows = useMemo(() => {
    const highest = Math.max(8, ...sortedSlots.map((slot) => slot.period_index));
    return Array.from({ length: highest }, (_, idx) => idx + 1);
  }, [sortedSlots]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <Card className="border-0 bg-[hsl(var(--surface-1))]">
        <CardHeader>
          <CardTitle>School Schedule</CardTitle>
          <CardDescription>Enable school schedule in Settings → Teaching Defaults to manage timetable.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-[hsl(var(--surface-1))]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" />
            Live School Schedule
          </CardTitle>
          <CardDescription>Drag timetable blocks between day/period cells. This updates schedule instantly.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-[hsl(var(--surface-2))] p-3">
            <p className="text-xs text-muted-foreground">Current class</p>
            <p className="mt-1 text-sm font-medium">{nowSummary.current ? nowSummary.current.title : 'No class right now'}</p>
            {nowSummary.current && (
              <p className="text-xs text-muted-foreground">
                P{nowSummary.current.period_index} · {formatTime(nowSummary.current.start_time)} - {formatTime(nowSummary.current.end_time)}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-[hsl(var(--surface-2))] p-3">
            <p className="text-xs text-muted-foreground">Next class</p>
            <p className="mt-1 text-sm font-medium">{nowSummary.next ? nowSummary.next.title : 'No more classes today'}</p>
            {nowSummary.next && (
              <p className="text-xs text-muted-foreground">
                P{nowSummary.next.period_index} · {formatTime(nowSummary.next.start_time)} - {formatTime(nowSummary.next.end_time)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-[hsl(var(--surface-1))]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly Timetable</CardTitle>
          <CardDescription>Drop onto any cell to move a class. Occupied targets are protected.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="hidden min-w-[840px] space-y-2 md:block">
            <div className="grid grid-cols-[80px_repeat(5,minmax(0,1fr))] gap-2">
              <div />
              {WEEK_DAYS.map((day) => (
                <div key={day.value} className="rounded-lg bg-[hsl(var(--surface-2))] px-3 py-2 text-sm font-medium">
                  {day.short}
                </div>
              ))}
            </div>
            {periodRows.map((periodIndex) => (
              <div key={periodIndex} className="grid grid-cols-[80px_repeat(5,minmax(0,1fr))] gap-2">
                <div className="rounded-lg bg-[hsl(var(--surface-2))] px-3 py-2 text-xs text-muted-foreground">P{periodIndex}</div>
                {WEEK_DAYS.map((day) => {
                  const slot = slotByCell.get(`${day.value}-${periodIndex}`) || null;
                  return (
                    <div
                      key={`${day.value}-${periodIndex}`}
                      className="min-h-[78px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-2"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!dragSlotId) return;
                        void moveSlot(dragSlotId, day.value, periodIndex);
                        setDragSlotId(null);
                      }}
                    >
                      {slot ? (
                        <div
                          draggable
                          onDragStart={() => setDragSlotId(slot.id)}
                          onDragEnd={() => setDragSlotId(null)}
                          className="h-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold">{slot.title}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                              <button
                                type="button"
                                onClick={() => openEditSlot(slot)}
                                className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--interactive-hover))] hover:text-foreground"
                                disabled={saving}
                                aria-label="Edit slot"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void duplicateSlotToNextDay(slot)}
                                className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--interactive-hover))] hover:text-foreground"
                                disabled={saving}
                                aria-label="Duplicate slot"
                              >
                                <CopyPlus className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeSlot(slot.id)}
                                className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--interactive-hover))] hover:text-foreground"
                                disabled={saving}
                                aria-label="Remove slot"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">Drop here</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="space-y-2 md:hidden">
            {WEEK_DAYS.map((day) => {
              const daySlots = sortedSlots.filter((slot) => slot.day_of_week === day.value);
              return (
                <div key={day.value} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-2">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">{day.label}</p>
                  {daySlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No slots</p>
                  ) : (
                    <div className="space-y-2">
                      {daySlots.map((slot) => (
                        <div key={slot.id} className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold">P{slot.period_index} · {slot.title}</p>
                              <p className="text-[11px] text-muted-foreground">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => openEditSlot(slot)} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--interactive-hover))] hover:text-foreground">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" onClick={() => void duplicateSlotToNextDay(slot)} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--interactive-hover))] hover:text-foreground">
                                <Shuffle className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" onClick={() => void removeSlot(slot.id)} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--interactive-hover))] hover:text-foreground">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-[hsl(var(--surface-1))]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Quick Add Slot
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <Label>Day</Label>
            <Select value={newSlot.day_of_week} onValueChange={(value) => setNewSlot((prev) => ({ ...prev, day_of_week: value }))}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEK_DAYS.map((day) => (
                  <SelectItem key={day.value} value={String(day.value)}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Period</Label>
            <Input value={newSlot.period_index} onChange={(event) => setNewSlot((prev) => ({ ...prev, period_index: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Start</Label>
            <Input value={newSlot.start_time} onChange={(event) => setNewSlot((prev) => ({ ...prev, start_time: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>End</Label>
            <Input value={newSlot.end_time} onChange={(event) => setNewSlot((prev) => ({ ...prev, end_time: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={newSlot.title} onChange={(event) => setNewSlot((prev) => ({ ...prev, title: event.target.value }))} placeholder="Mathematics" />
          </div>
          <div className="md:col-span-5">
            <Button onClick={() => void createSlot()} disabled={saving} className="h-9">
              <Clock3 className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Add Slot'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingSlot)} onOpenChange={(open) => !open && setEditingSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule Slot</DialogTitle>
            <DialogDescription>Update day, period, title, and time range.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Day</Label>
              <Select value={editDraft.day_of_week} onValueChange={(value) => setEditDraft((prev) => ({ ...prev, day_of_week: value }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_DAYS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Period</Label>
              <Input value={editDraft.period_index} onChange={(event) => setEditDraft((prev) => ({ ...prev, period_index: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Start</Label>
              <Input value={editDraft.start_time} onChange={(event) => setEditDraft((prev) => ({ ...prev, start_time: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input value={editDraft.end_time} onChange={(event) => setEditDraft((prev) => ({ ...prev, end_time: event.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Title</Label>
              <Input value={editDraft.title} onChange={(event) => setEditDraft((prev) => ({ ...prev, title: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSlot(null)}>Cancel</Button>
            <Button onClick={() => void saveEditSlot()} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
