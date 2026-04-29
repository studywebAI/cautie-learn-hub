'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type ShareAudience = 'teacher' | 'all';

type SharePost = {
  id: string;
  createdAt: string;
  audience: ShareAudience;
  text: string;
  authorName?: string;
  authorEmail?: string | null;
};

export function ShareTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const [audienceFilter, setAudienceFilter] = useState<ShareAudience>(isTeacher ? 'teacher' : 'all');
  const [message, setMessage] = useState('');
  const [posts, setPosts] = useState<SharePost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isTeacher) setAudienceFilter('all');
  }, [isTeacher]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/classes/${classId}/share?audience=${audienceFilter}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load class chat');
        setPosts(Array.isArray(data?.rows) ? data.rows : []);
      } catch {
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [classId, audienceFilter]);

  const sendMessage = async () => {
    const text = message.trim();
    if (!text) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/classes/${classId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          audience: audienceFilter,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to send message');
      setMessage('');
      setPosts((prev) => [data, ...prev]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const visiblePosts = useMemo(() => posts, [posts]);

  return (
    <div className="class-shell space-y-3">
      <div className="flex items-center gap-2">
        {isTeacher ? (
          <Button size="sm" variant={audienceFilter === 'teacher' ? 'default' : 'outline'} onClick={() => setAudienceFilter('teacher')} className="h-8">
            Teacher
          </Button>
        ) : null}
        <Button size="sm" variant={audienceFilter === 'all' ? 'default' : 'outline'} onClick={() => setAudienceFilter('all')} className="h-8">
          All
        </Button>
      </div>

      <div className="rounded-md surface-panel p-3">
        <div className="mb-3 max-h-[52vh] space-y-2 overflow-y-auto pr-1">
        {isLoading ? <p className="text-xs text-muted-foreground">Loading messages...</p> : null}
        {visiblePosts.length === 0 && !isLoading ? (
          <div className="rounded-md surface-panel p-4 text-sm text-muted-foreground">No messages yet.</div>
        ) : null}
        {visiblePosts.map((post) => (
          <article key={post.id} className="rounded-md surface-interactive p-3">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{post.authorName || post.authorEmail || 'User'}</span>
              <span>{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.text}</p>
          </article>
        ))}
        </div>
        <div className="border-t border-border pt-3">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write a message..."
            className="min-h-[90px] bg-[hsl(var(--background))]"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={() => void sendMessage()} disabled={isSubmitting || !message.trim()}>
              {isSubmitting ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
