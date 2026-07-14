'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { format, isToday, isTomorrow, parseISO, startOfDay } from 'date-fns';
import { ChevronRight, FlaskConical, ClipboardList } from 'lucide-react';
import type { ClassAssignment, ClassInfo } from '@/contexts/app-context';

type Props = {
  assignments: ClassAssignment[];
  classes: ClassInfo[];
};

type NextItem = { id: string; title: string; className: string; isTest: boolean; dueDate: Date };

function isTest(a: ClassAssignment) {
  const t = (a.type || '').toLowerCase();
  return t === 'small_test' || t === 'big_test' || t === 'test' || t === 'quiz' || t === 'exam';
}

function dayLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE d MMM');
}

// "Next up" — the teacher's own agenda items (tests/homework they've
// scheduled), not the school timetable/rooster. Self-hides when there's
// nothing upcoming, same as the live-test widget.
export function TeacherAgendaWidget({ assignments, classes }: Props) {
  const items = useMemo<NextItem[]>(() => {
    const today = startOfDay(new Date());
    const upcoming: NextItem[] = [];

    for (const a of Array.isArray(assignments) ? assignments : []) {
      if (!a.due_date) continue;
      let due: Date;
      try { due = startOfDay(parseISO(a.due_date)); } catch { continue; }
      if (due.getTime() < today.getTime()) continue;
      const cls = classes.find(c => c.id === a.class_id);
      upcoming.push({
        id: a.id,
        title: a.title,
        className: cls?.name || 'Class',
        isTest: isTest(a),
        dueDate: due,
      });
    }

    return upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 4);
  }, [assignments, classes]);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl surface-panel border border-border p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm">Next up</p>
        <Link href="/agenda" className="text-xs text-foreground hover:opacity-70 flex items-center gap-1">
          Open agenda <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-1">
        {items.map(item => (
          <Link
            key={item.id}
            prefetch={false}
            href={`/agenda?itemId=${item.id}`}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[hsl(var(--interactive-hover))] transition-colors"
          >
            {item.isTest ? (
              <FlaskConical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ClipboardList className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate">{item.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{item.className}</p>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">{dayLabel(item.dueDate)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
