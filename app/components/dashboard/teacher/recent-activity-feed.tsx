'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, FileText, UserCheck, Info, ChevronRight, Reply, Send, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  if (category === 'results') return <FileText className={`${cls} text-emerald-600`} />;
  if (category === 'attendance') return <UserCheck className={`${cls} text-amber-600`} />;
  return <Info className={`${cls} text-muted-foreground`} />;
}

function itemHref(item: FeedItem): string {
  const d = item.data || {};
  if (d.class_id) return `/class/${d.class_id}?tab=${item.category === 'messages' ? 'share' : item.category === 'attendance' ? 'group' : 'grades'}`;
  return '/';
}

function replyTarget(item: FeedItem): { classId: string; studentId: string } | null {
  const d = item.data || {};
  const classId = d.class_id;
  const studentId = d.from_user_id || d.student_id;
  if (item.category !== 'messages' || !classId || !studentId) return null;
  return { classId, studentId };
}

export function RecentActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const sendReply = async (item: FeedItem) => {
    const target = replyTarget(item);
    if (!target || !replyText.trim()) return;
    setSending(true);
    try {
      const response = await fetch('/api/notifications/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: target.classId, studentId: target.studentId, message: replyText.trim() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to send reply');
      }
      toast({ title: 'Reply sent' });
      setReplyingId(null);
      setReplyText('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setSending(false);
    }
  };

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
    <div className="rounded-xl surface-panel border border-border p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/5 text-foreground/70 shrink-0">
            <Activity className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm">Recent activity</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
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
                ? 'bg-primary border-primary text-primary-foreground'
                : 'bg-transparent border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
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
          {items.map(item => {
            const target = replyTarget(item);
            const isReplying = replyingId === item.id;
            return (
              <div key={item.id} className="rounded-lg hover:bg-[hsl(var(--interactive-hover))] transition-colors group">
                <div className="flex items-start gap-3 px-2.5 py-2">
                  <Link prefetch={false} href={itemHref(item)} className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5">
                      <FeedIcon category={item.category} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium truncate">{item.message || item.title}</p>
                      {item.message && item.title && item.message !== item.title && (
                        <p className="text-[10px] text-muted-foreground truncate">{item.title}</p>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {relativeTime(item.created_at)}
                    </span>
                    {!item.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-brand)] shrink-0" />
                    )}
                    {target && (
                      <button
                        onClick={() => { setReplyingId(isReplying ? null : item.id); setReplyText(''); }}
                        className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Reply"
                        title="Reply"
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                {isReplying && target && (
                  <div className="flex items-center gap-1.5 px-2.5 pb-2">
                    <input
                      autoFocus
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void sendReply(item); }}
                      placeholder="Quick reply..."
                      maxLength={500}
                      className="flex-1 text-xs bg-transparent border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      onClick={() => void sendReply(item)}
                      disabled={sending || !replyText.trim()}
                      className="h-7 w-7 flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                      aria-label="Send reply"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
