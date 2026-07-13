'use client';

import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
};

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

export function TeacherMessageCard() {
  const [messages, setMessages] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    fetch('/api/notifications?unread_only=true&limit=20', { signal: controller.signal })
      .then(r => r.ok ? r.json() : [])
      .then((data) => {
        const all = Array.isArray(data) ? data : [];
        setMessages(all.filter((n: Notification) => n.type === 'class_message').slice(0, 2));
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading || messages.length === 0) return null;

  return (
    <div className="rounded-xl surface-panel border border-border p-4 space-y-2">
      {messages.map((m) => (
        <div key={m.id} className="flex items-start gap-2.5">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px]">
              <span className="font-medium">{m.title}</span>: {m.message}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
