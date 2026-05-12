'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, FileText, UserCheck, Info, ChevronRight } from 'lucide-react';

type FeedItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  created_at: string;
  read: boolean;
  category: 'messages' | 'results' | 'attendance' | 'info';
};

type Filter = 'all' | 'messages' | 'results' | 'attendance';

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function FeedIcon({ category }: { category: FeedItem['category'] }) {
  const cls = 'h-3.5 w-3.5 shrink-0';
  if (category === 'messages') return <MessageSquare className={`${cls} text-blue-500`} />;
  if (category === 'results') return <FileText className={`${cls} text-[var(--accent-brand)]`} />;
  if (category === 'attendance') return <UserCheck className={`${cls} text-amber-600`} />;
  return <Info className={`${cls} text-muted-foreground`} />;
}

function itemHref(item: FeedItem): string {
  const d = item.data || {};
  if (d.class_id) return `/class/${d.class_id}?tab=${item.category === 'messages' ? 'share' : item.category === 'attendance' ? 'attendance' : 'grades'}`;
  return '/';
}

export function RecentActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async (f: Filter) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/dashboard/teacher/activity?limit=20&type=${f}`);
      if (!r.ok) { setItems([]); return; }
      const d = await r.json();
      setItems(Array.isArray(d?.items) ? d.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }
    void load(filter);
  }, [filter, load]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'messages', label: 'Messages' },
    { key: 'results', label: 'Results' },
    { key: 'attendance', label: 'Attendance' },
  ];

  return (
    <div className="rounded-xl surface-panel border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Recent activity</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-muted-foreground">Live</span>
          </span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              filter === f.key
                ? 'bg-[var(--accent-brand)] border-[var(--accent-brand)] text-white'
                : 'bg-transparent border-border text-muted-foreground hover:border-[var(--accent-brand)] hover:text-[var(--accent-brand)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-3 px-2 py-2 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-3/4 bg-muted rounded" />
                <div className="h-2.5 w-1/2 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">
          {filter === 'all' ? 'No recent activity yet.' : `No recent ${filter}.`}
        </p>
      ) : (
        <div className="space-y-0.5 max-h-[280px] overflow-y-auto pr-1">
          {items.map(item => (
            <Link
              prefetch={false}
              key={item.id}
              href={itemHref(item)}
              className="flex items-start gap-3 px-2.5 py-2 rounded-lg hover:bg-[hsl(var(--interactive-hover))] transition-colors group"
            >
              <div className="mt-0.5">
                <FeedIcon category={item.category} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate">{item.message || item.title}</p>
                {item.message && item.title && item.message !== item.title && (
                  <p className="text-[10px] text-muted-foreground truncate">{item.title}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {relativeTime(item.created_at)}
                </span>
                {!item.read && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-brand)] shrink-0" />
                )}
                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
