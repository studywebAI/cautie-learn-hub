'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { addDays, format, isToday, parseISO, startOfDay } from 'date-fns';
import { ChevronRight, FlaskConical } from 'lucide-react';
import type { ClassAssignment, ClassInfo } from '@/contexts/app-context';

type Props = {
  assignments: ClassAssignment[];
  classes: ClassInfo[];
};

type DayEntry = { id: string; title: string; className: string; isTest: boolean };
type Day = { date: Date; label: string; items: DayEntry[] };

function isTest(a: ClassAssignment) {
  const t = (a.type || '').toLowerCase();
  return t === 'small_test' || t === 'big_test' || t === 'test' || t === 'quiz' || t === 'exam';
}

export function TeacherAgendaWidget({ assignments, classes }: Props) {
  const days = useMemo<Day[]>(() => {
    const start = startOfDay(new Date());
    const result: Day[] = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return { date, label: format(date, i === 0 ? "'Today'" : 'EEE d'), items: [] };
    });

    for (const a of Array.isArray(assignments) ? assignments : []) {
      if (!a.due_date) continue;
      let due: Date;
      try { due = startOfDay(parseISO(a.due_date)); } catch { continue; }
      const dayIndex = result.findIndex(d => d.date.getTime() === due.getTime());
      if (dayIndex === -1) continue;
      const cls = classes.find(c => c.id === a.class_id);
      result[dayIndex].items.push({
        id: a.id,
        title: a.title,
        className: cls?.name || 'Class',
        isTest: isTest(a),
      });
    }

    return result;
  }, [assignments, classes]);

  const hasItems = days.some(d => d.items.length > 0);
  if (!hasItems) return null;

  return (
    <div className="rounded-xl surface-panel border border-border p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Upcoming deadlines you&apos;ve set</p>
        <Link href="/agenda" className="text-xs text-foreground hover:opacity-70 flex items-center gap-1">
          Open agenda <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(day => (
          <div key={day.date.toISOString()} className="min-w-0">
            <p className="text-[9px] text-muted-foreground truncate mb-1">{day.label}</p>
            <div className="space-y-0.5">
              {day.items.slice(0, 2).map(item => (
                <Link
                  prefetch={false}
                  key={item.id}
                  href={`/agenda?itemId=${item.id}`}
                  title={`${item.title} — ${item.className}`}
                  className={`flex items-center gap-0.5 truncate rounded px-1 py-0.5 text-[9px] leading-tight hover:bg-[hsl(var(--interactive-hover))] transition-colors ${
                    item.isTest ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {item.isTest && <FlaskConical className="h-2.5 w-2.5 shrink-0" />}
                  <span className="truncate">{item.title}</span>
                </Link>
              ))}
              {day.items.length > 2 && (
                <p className="text-[9px] text-muted-foreground px-1">+{day.items.length - 2}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
