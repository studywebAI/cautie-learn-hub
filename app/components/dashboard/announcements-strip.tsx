'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Announcement = {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  class_id: string;
  classes?: { id: string; name: string } | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

export function AnnouncementsStrip() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load dismissed IDs from localStorage
    try {
      const saved = localStorage.getItem('dismissed_announcements');
      if (saved) {
        setDismissed(new Set(JSON.parse(saved)));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }

    const fetchAnnouncements = async () => {
      try {
        const res = await fetch('/api/student/announcements?limit=5');
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(Array.isArray(data?.announcements) ? data.announcements : []);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    void fetchAnnouncements();
  }, []);

  const handleDismiss = useCallback((id: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);
    // Persist to localStorage
    try {
      localStorage.setItem('dismissed_announcements', JSON.stringify([...newDismissed]));
    } catch {}
  }, [dismissed]);

  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl surface-panel border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm">Announcements</p>
      </div>

      <div className="space-y-2 max-h-[280px] overflow-y-auto">
        {visibleAnnouncements.map(announcement => (
          <div
            key={announcement.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--interactive-hover))] hover:bg-[hsl(var(--interactive-hover),.8)] transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground truncate">
                {announcement.title}
              </p>
              {announcement.content && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                  {announcement.content}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                {announcement.classes?.name && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-background text-muted-foreground">
                    {announcement.classes.name}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {relativeTime(announcement.created_at)}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(announcement.id)}
              className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-background transition-all"
              aria-label="Dismiss announcement"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
