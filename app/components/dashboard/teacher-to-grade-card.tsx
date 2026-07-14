'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, ChevronRight, ArrowRight } from 'lucide-react';

type ToGradeItem = { id: string; title: string; class_name: string; class_id: string };

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

// Only surfaces tests that are done being nakijken (or never needed it) and
// have no released grade yet — not every draft grade set. Self-hides
// entirely when empty, same pattern as the agenda/live-test widgets, so the
// dashboard doesn't pad itself out with a low-value "nothing here" box.
export function TeacherToGradeCard({ classIds }: { classIds: string[] }) {
  const [items, setItems] = useState<ToGradeItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }
    if (classIds.length === 0) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/dashboard/teacher/to-grade?classIds=${classIds.join(',')}&limit=4`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : { items: [], totalCount: 0 })
      .then(d => {
        setItems(Array.isArray(d?.items) ? d.items : []);
        setTotalCount(typeof d?.totalCount === 'number' ? d.totalCount : 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [classIds.join(',')]);

  if (loading || totalCount === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] to-transparent p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 shrink-0">
            <ClipboardCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm">Ready to grade</p>
            <p className="text-xs text-muted-foreground">
              {totalCount} test{totalCount !== 1 ? 's' : ''} reviewed, waiting on a final grade
            </p>
          </div>
        </div>
        <Link href="/teacher-grades/review?mode=becijferen" className="text-xs text-foreground hover:opacity-70 flex items-center gap-1 shrink-0">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-1.5">
        {items.map(g => (
          <Link
            key={g.id}
            prefetch={false}
            href={`/teacher-grades/${g.id}/grading`}
            className="group flex items-center gap-2.5 rounded-lg bg-background/40 px-3 py-2 hover:bg-background/70 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate">{g.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{g.class_name}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
        {totalCount > items.length && (
          <p className="text-[11px] text-muted-foreground px-1">+{totalCount - items.length} more</p>
        )}
      </div>
    </div>
  );
}
