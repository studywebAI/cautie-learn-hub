'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ClassInfo } from '@/contexts/app-context';

// Real, always-available dashboard content: the teacher's actual classes.
// Unlike the old "Quick access" grid (removed — duplicated sidebar nav),
// this shows real data (their own classes), not navigation shortcuts.
export function TeacherClassesList({ classes, activeClassId }: { classes: ClassInfo[]; activeClassId?: string }) {
  if (!classes || classes.length === 0) return null;

  return (
    <div className="rounded-xl surface-panel border border-border p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm">Your classes</p>
        <span className="text-xs text-muted-foreground">{classes.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {classes.map((cls: any) => (
          <Link
            key={cls.id}
            prefetch={false}
            href={`/class/${cls.id}`}
            className="group flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 hover:bg-[hsl(var(--interactive-hover))] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{cls.name}</p>
              {cls.id === activeClassId && (
                <p className="text-[10px] text-muted-foreground">Active</p>
              )}
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
