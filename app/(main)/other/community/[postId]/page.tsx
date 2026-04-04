'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type CommunityPostPayload = {
  post: any;
  artifact: any;
  version: any;
};

export default function CommunityPostPage({ params }: { params: { postId: string } }) {
  const postId = String(params.postId || '');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<CommunityPostPayload | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);

  const load = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/community/posts/${postId}`, { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json?.error || 'Failed to load post'));
      setPayload(json as CommunityPostPayload);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const excerpt = useMemo(() => {
    const content = payload?.version?.content;
    if (!content) return '';
    if (typeof content === 'string') return content.slice(0, 1500);
    try {
      return JSON.stringify(content, null, 2).slice(0, 1500);
    } catch {
      return '';
    }
  }, [payload?.version?.content]);

  const toggleLike = async () => {
    if (!postId) return;
    setLikeBusy(true);
    try {
      const response = await fetch(`/api/community/posts/${postId}/like`, { method: 'POST' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json?.error || 'Failed to like post'));
      setPayload((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          post: {
            ...prev.post,
            liked_by_me: Boolean(json.liked),
            like_count: Number(json.likeCount || 0),
          },
        };
      });
    } finally {
      setLikeBusy(false);
    }
  };

  if (loading || !payload) {
    return (
      <div className="h-full overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Loading post...
        </div>
      </div>
    );
  }

  const { post } = payload;

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="h-8 rounded-full text-xs">
            <Link href="/other/community">Back to Community</Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={toggleLike} disabled={likeBusy}>
            {likeBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Heart className={`mr-1.5 h-3.5 w-3.5 ${post.liked_by_me ? 'fill-current' : ''}`} />}
            {post.like_count || 0} likes
          </Button>
        </div>

        <article className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{post.tool_id}</Badge>
            {post.subject && <Badge variant="outline">{post.subject}</Badge>}
            {post.difficulty && <Badge variant="outline">{post.difficulty}</Badge>}
            {post.language && <Badge variant="outline">{post.language}</Badge>}
          </div>
          <h1 className="text-xl font-semibold">{post.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{post.description || 'No description.'}</p>
          <p className="mt-2 text-xs text-muted-foreground">by {post.creator_name || 'Anonymous'} • {new Date(post.published_at || post.created_at).toLocaleString()}</p>
          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {post.tags.map((tag: string) => (
                <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button asChild size="sm" className="h-8 rounded-full text-xs">
              <Link href={`/material/${post.artifact_id}`}>Play</Link>
            </Button>
          </div>
        </article>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Preview</h2>
          <div className="mt-2 rounded-lg border border-border bg-background p-3">
            {excerpt ? (
              <pre className="whitespace-pre-wrap break-words text-xs">{excerpt}</pre>
            ) : (
              <p className="text-xs text-muted-foreground">No preview content available.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
