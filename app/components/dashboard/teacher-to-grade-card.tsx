'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, ChevronRight } from 'lucide-react';

type PendingGradeSet = { id: string; title: string; class_name: string; class_id: string };

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

export function TeacherToGradeCard({ classIds }: { classIds: string[] }) {
  const [gradeSets, setGradeSets] = useState<PendingGradeSet[]>([]);
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
    fetch(`/api/dashboard/teacher/pending-grades?classIds=${classIds.join(',')}&limit=4`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : { gradeSets: [], totalCount: 0 })
      .then(d => {
        setGradeSets(Array.isArray(d?.gradeSets) ? d.gradeSets : []);
        setTotalCount(typeof d?.totalCount === 'number' ? d.totalCount : 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [classIds.join(',')]);

  return (
    <div className="rounded-xl surface-panel border border-border p-4 space-y-3 h-full shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
            <ClipboardList className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-sm">To Grade</p>
            <p className="text-xs text-muted-foreground">Draft grade sets waiting to be finished</p>
          </div>
        </div>
        <Link href="/teacher-grades" className="text-xs text-foreground hover:opacity-70 flex items-center gap-1 shrink-0">
          All grades <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : gradeSets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing waiting on you right now.</p>
      ) : (
        <div className="space-y-1.5">
          {gradeSets.map(g => (
            <Link
              key={g.id}
              prefetch={false}
              href={`/teacher-grades/${g.id}`}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[hsl(var(--interactive-hover))] transition-colors"
            >
              <ClipboardList className="h-3.5 w-3.5 shrink-0 text-amber-600/70" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate">{g.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{g.class_name}</p>
              </div>
            </Link>
          ))}
          {totalCount > gradeSets.length && (
            <p className="text-[11px] text-muted-foreground px-1">+{totalCount - gradeSets.length} more</p>
          )}
        </div>
      )}
    </div>
  );
}
