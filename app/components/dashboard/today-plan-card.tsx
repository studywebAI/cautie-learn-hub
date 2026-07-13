'use client';

import { useMemo, useState } from 'react';
import { isToday, isTomorrow, isPast, parseISO, format, addDays, startOfDay } from 'date-fns';
import Link from 'next/link';
import { Calendar, ChevronRight, Clock, FileText, BookOpen, FlaskConical } from 'lucide-react';
import type { ClassAssignment, ClassInfo, PersonalTask } from '@/contexts/app-context';

type WeekDayItem = { id: string; title: string; type: PlanItemType };
type WeekDay = { date: Date; label: string; items: WeekDayItem[] };
type PlanItemType = 'assignment' | 'test' | 'personal' | 'event';

type PlanItem = {
  id: string;
  title: string;
  className: string;
  class_id: string | null;
  type: 'assignment' | 'test' | 'personal' | 'event';
  due_date: string | null;
  due_time: string | null;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  material_id?: string | null;
};

type Filter = 'all' | 'tests' | 'homework' | 'events';

const TYPE_LABELS: Record<PlanItem['type'], string> = {
  assignment: 'Homework',
  test: 'Test',
  personal: 'Personal',
  event: 'Event',
};

function typeFromAssignment(a: ClassAssignment): PlanItem['type'] {
  const t = (a.type || '').toLowerCase();
  if (t === 'test' || t === 'quiz' || t === 'exam' || t === 'toets') return 'test';
  return 'assignment';
}

function matchesFilter(item: PlanItem, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'tests') return item.type === 'test';
  if (filter === 'homework') return item.type === 'assignment';
  if (filter === 'events') return item.type === 'personal' || item.type === 'event';
  return true;
}

type Props = {
  assignments: ClassAssignment[];
  personalTasks: PersonalTask[];
  classes: ClassInfo[];
  schoolSlots: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    day_of_week: number;
    is_break: boolean;
    class_id?: string;
  }>;
};

export function TodayPlanCard({ assignments, personalTasks, classes, schoolSlots }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const todayDow = new Date().getDay(); // 0=Sun, 1=Mon … 6=Sat

  // Today's schedule slots
  const todaySlots = useMemo(() => {
    if (!Array.isArray(schoolSlots)) return [];
    return schoolSlots
      .filter(s => !s.is_break && s.day_of_week === todayDow)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [schoolSlots, todayDow]);

  // Build plan items from assignments + personal tasks
  const allItems = useMemo<PlanItem[]>(() => {
    const items: PlanItem[] = [];

    for (const a of Array.isArray(assignments) ? assignments : []) {
      if (!a.due_date) continue;
      const parsed = parseISO(a.due_date);
      const overdue = isPast(parsed) && !isToday(parsed);
      const todayFlag = isToday(parsed);
      const tomorrowFlag = isTomorrow(parsed);
      if (!overdue && !todayFlag && !tomorrowFlag) continue;
      const cls = classes.find(c => c.id === a.class_id);
      items.push({
        id: a.id,
        title: a.title,
        className: cls?.name || 'Class',
        class_id: a.class_id,
        type: typeFromAssignment(a),
        due_date: a.due_date,
        due_time: null,
        material_id: a.material_id ?? null,
        isOverdue: overdue,
        isToday: todayFlag,
        isTomorrow: tomorrowFlag,
      });
    }

    for (const t of Array.isArray(personalTasks) ? personalTasks : []) {
      if (!t.due_date) continue;
      const parsed = parseISO(t.due_date);
      const overdue = isPast(parsed) && !isToday(parsed);
      const todayFlag = isToday(parsed);
      const tomorrowFlag = isTomorrow(parsed);
      if (!overdue && !todayFlag && !tomorrowFlag) continue;
      items.push({
        id: t.id,
        title: t.title,
        className: 'Personal',
        class_id: null,
        type: 'personal',
        due_date: t.due_date,
        due_time: null,
        isOverdue: overdue,
        isToday: todayFlag,
        isTomorrow: tomorrowFlag,
      });
    }

    // Sort: overdue first → today tests first → today homework → tomorrow tests → tomorrow homework
    items.sort((a, b) => {
      const priority = (item: PlanItem) => {
        if (item.isOverdue) return 0;
        if (item.isToday && item.type === 'test') return 1;
        if (item.isToday) return 2;
        if (item.isTomorrow && item.type === 'test') return 3;
        return 4;
      };
      return priority(a) - priority(b);
    });

    return items;
  }, [assignments, personalTasks, classes]);

  // 7-day strip: tests/homework titles per day, each opens the item directly in Agenda.
  const weekDays = useMemo<WeekDay[]>(() => {
    const start = startOfDay(new Date());
    const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return { date, label: format(date, i === 0 ? "'Today'" : 'EEE d'), items: [] };
    });

    const place = (id: string, title: string, type: PlanItemType, dueDateIso: string | null) => {
      if (!dueDateIso) return;
      let due: Date;
      try { due = startOfDay(parseISO(dueDateIso)); } catch { return; }
      const dayIndex = days.findIndex(d => d.date.getTime() === due.getTime());
      if (dayIndex === -1) return;
      days[dayIndex].items.push({ id, title, type });
    };

    for (const a of Array.isArray(assignments) ? assignments : []) {
      place(a.id, a.title, typeFromAssignment(a), a.due_date);
    }
    for (const t of Array.isArray(personalTasks) ? personalTasks : []) {
      place(t.id, t.title, 'personal', t.due_date ?? null);
    }

    return days;
  }, [assignments, personalTasks]);

  const hasWeekItems = weekDays.some(d => d.items.length > 0);

  // Only suggest practice for items that actually link to real content —
  // a free-text task title has nothing to build a suggestion from.
  const practiceSuggestion = useMemo(
    () => allItems.find(i => (i.isToday || i.isTomorrow) && !i.isOverdue && i.material_id),
    [allItems]
  );

  const filteredItems = useMemo(
    () => allItems.filter(i => matchesFilter(i, filter)),
    [allItems, filter]
  );

  const todayCount = allItems.filter(i => i.isToday || i.isOverdue).length;
  const hasAnything = allItems.length > 0 || todaySlots.length > 0 || hasWeekItems;

  if (!hasAnything) {
    return (
      <div className="rounded-xl surface-panel border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">Today&apos;s plan</p>
          <Link href="/agenda" className="text-xs text-foreground hover:opacity-70 flex items-center gap-1">
            Open agenda <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Nothing due today — enjoy the day!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl surface-panel border border-border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Today&apos;s plan</p>
          {todayCount > 0 && (
            <span className="text-[10px] bg-[var(--accent-brand)] text-white rounded-full px-2 py-0.5">
              {todayCount}
            </span>
          )}
        </div>
        <Link href="/agenda" className="text-xs text-foreground hover:opacity-70 flex items-center gap-1">
          Open agenda <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Week strip: tests/homework titles per day, click opens the item directly */}
      {hasWeekItems && (
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => (
            <div key={day.date.toISOString()} className="min-w-0">
              <p className="text-[9px] text-muted-foreground truncate mb-1">{day.label}</p>
              <div className="space-y-0.5">
                {day.items.slice(0, 2).map(item => (
                  <Link
                    prefetch={false}
                    key={item.id}
                    href={`/agenda?itemId=${item.id}`}
                    title={item.title}
                    className={`block truncate rounded px-1 py-0.5 text-[9px] leading-tight hover:bg-[hsl(var(--interactive-hover))] transition-colors ${
                      item.type === 'test' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.title}
                  </Link>
                ))}
                {day.items.length > 2 && (
                  <p className="text-[9px] text-muted-foreground px-1">+{day.items.length - 2}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's schedule strip */}
      {todaySlots.length > 0 && (
        <div className="rounded-lg bg-[var(--accent-brand)]/8 border border-[var(--accent-brand)]/25 p-3 space-y-1.5">
          <p className="text-[10px] text-[var(--accent-brand)]">Today&apos;s schedule</p>
          <div className="space-y-1">
            {todaySlots.slice(0, 4).map(slot => (
              <div key={slot.id} className="flex items-center gap-2 text-sm">
                <span className="text-[11px] font-medium text-[var(--accent-brand)] w-12 shrink-0 tabular-nums">
                  {slot.start_time.slice(0, 5)}
                </span>
                <span className="text-[12px] text-foreground truncate">{slot.title}</span>
              </div>
            ))}
            {todaySlots.length > 4 && (
              <p className="text-[10px] text-muted-foreground pl-14">
                +{todaySlots.length - 4} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filter chips */}
      {allItems.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'tests', 'homework', 'events'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                filter === f
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-transparent border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              {f === 'all' ? 'All' : f === 'tests' ? 'Tests' : f === 'homework' ? 'Homework' : 'Events'}
            </button>
          ))}
        </div>
      )}

      {/* Items list */}
      {filteredItems.length > 0 && (
        <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
          {filteredItems.map(item => {
            const href = item.class_id ? `/class/${item.class_id}` : '/agenda';
            const icon = item.type === 'test'
              ? <FlaskConical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              : item.type === 'personal'
              ? <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              : <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;

            const dueLabel = item.isOverdue
              ? <span className="text-[10px] text-destructive bg-destructive/10 rounded px-1.5 py-0.5">Overdue</span>
              : item.isToday
              ? <span className="text-[10px] text-[var(--accent-brand)] bg-[var(--accent-brand)]/10 rounded px-1.5 py-0.5">Today</span>
              : <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">Tomorrow</span>;

            return (
              <Link
                prefetch={false}
                key={item.id}
                href={href}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[hsl(var(--interactive-hover))] transition-colors group"
              >
                {icon}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.className}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {dueLabel}
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {practiceSuggestion && (
        <Link
          prefetch={false}
          href={`/material/${practiceSuggestion.material_id}`}
          className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 hover:bg-[hsl(var(--interactive-hover))] transition-colors group"
        >
          <FlaskConical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate">
              {practiceSuggestion.type === 'test' ? 'Test coming up' : 'Due soon'} — practice now
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{practiceSuggestion.title}</p>
          </div>
          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </Link>
      )}

      {filteredItems.length === 0 && allItems.length > 0 && (
        <p className="text-sm text-muted-foreground px-1">No {filter} items coming up.</p>
      )}
    </div>
  );
}
