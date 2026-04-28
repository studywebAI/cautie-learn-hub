'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Paperclip, Image as ImageIcon, FileText, MessageSquare } from 'lucide-react';

type ShareAudience = 'teacher' | 'all';

type SharePost = {
  id: string;
  createdAt: string;
  audience: ShareAudience;
  text: string;
  attachmentLabel?: string;
  sourceType?: string;
  sourceId?: string;
  sourceHref?: string;
};

type ShareSource = {
  id: string;
  link_type: string;
  link_ref_id: string;
  label: string;
  subtitle: string;
};
type PostKind = 'chat' | 'picture' | 'file' | 'material';

const resolveSourceHref = (post: SharePost): string | null => {
  if (post.sourceHref) return post.sourceHref;
  if (!post.sourceType || !post.sourceId) return null;
  if (post.sourceType === 'assignment') return `/tools/studyset?focus=assignment:${post.sourceId}`;
  if (post.sourceType === 'material') return `/material/${post.sourceId}`;
  if (post.sourceType === 'studyset') return `/tools/studyset/${post.sourceId}`;
  if (post.sourceType === 'tool_run') return `/tools`;
  return null;
};

export function ShareTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const [audienceFilter, setAudienceFilter] = useState<ShareAudience>(isTeacher ? 'teacher' : 'all');
  const [composerAudience, setComposerAudience] = useState<ShareAudience>('teacher');
  const [text, setText] = useState('');
  const [attachmentLabel, setAttachmentLabel] = useState('');
  const [postKind, setPostKind] = useState<PostKind>('chat');
  const [posts, setPosts] = useState<SharePost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sources, setSources] = useState<ShareSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');

  useEffect(() => {
    if (!isTeacher) setAudienceFilter('all');
  }, [isTeacher]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/classes/${classId}/share?audience=${audienceFilter}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load shared posts');
        setPosts(Array.isArray(data?.rows) ? data.rows : []);
      } catch {
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [classId, audienceFilter]);

  useEffect(() => {
    if (!isTeacher) return;
    const loadSources = async () => {
      try {
        const res = await fetch(`/api/classes/agenda/link-sources?classIds=${classId}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setSources(Array.isArray(data?.items) ? data.items : []);
      } catch {}
    };
    void loadSources();
  }, [classId, isTeacher]);

  const visiblePosts = useMemo(() => posts, [posts]);

  const createPost = async () => {
    if (!isTeacher) return;
    const trimmed = text.trim();
    if (!trimmed && !attachmentLabel.trim() && !selectedSourceId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/classes/${classId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed || `${postKind === 'chat' ? 'Class message' : postKind[0].toUpperCase() + postKind.slice(1)} shared`,
          attachmentLabel: attachmentLabel.trim() || `${postKind[0].toUpperCase() + postKind.slice(1)} item`,
          audience: composerAudience,
          source: sources.find((item) => item.id === selectedSourceId) || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to share');
      setText('');
      setAttachmentLabel('');
      setSelectedSourceId('');
      if (composerAudience === audienceFilter) {
        setPosts((prev) => [data, ...prev]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[hsl(var(--surface-1))] p-4">
        <h3 className="text-base font-medium">Class Share</h3>
        <p className="mt-1 text-sm text-foreground/70">
          Share updates, files, materials, and linked class resources in one place.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-[hsl(var(--surface-1))] p-2">
        <Button size="sm" variant={audienceFilter === 'teacher' ? 'default' : 'outline'} onClick={() => setAudienceFilter('teacher')} className="h-8">
          Teacher
        </Button>
        <Button size="sm" variant={audienceFilter === 'all' ? 'default' : 'outline'} onClick={() => setAudienceFilter('all')} className="h-8">
          All
        </Button>
      </div>

      {isTeacher && (
        <div className="space-y-3 rounded-xl bg-[hsl(var(--surface-1))] p-4">
          <div>
            <p className="text-sm font-medium">Create Share Post</p>
            <p className="text-xs text-foreground/65">Choose audience, choose post type, then publish.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={composerAudience === 'teacher' ? 'default' : 'outline'} onClick={() => setComposerAudience('teacher')} className="h-8">
              Post to Teacher
            </Button>
            <Button size="sm" variant={composerAudience === 'all' ? 'default' : 'outline'} onClick={() => setComposerAudience('all')} className="h-8">
              Post to All
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={postKind === 'chat' ? 'default' : 'outline'} className="h-8" onClick={() => setPostKind('chat')}><MessageSquare className="mr-1.5 h-3.5 w-3.5" />Chat</Button>
            <Button size="sm" variant={postKind === 'picture' ? 'default' : 'outline'} className="h-8" onClick={() => setPostKind('picture')}><ImageIcon className="mr-1.5 h-3.5 w-3.5" />Picture</Button>
            <Button size="sm" variant={postKind === 'file' ? 'default' : 'outline'} className="h-8" onClick={() => setPostKind('file')}><FileText className="mr-1.5 h-3.5 w-3.5" />File</Button>
            <Button size="sm" variant={postKind === 'material' ? 'default' : 'outline'} className="h-8" onClick={() => setPostKind('material')}><Paperclip className="mr-1.5 h-3.5 w-3.5" />Material</Button>
          </div>
          <Textarea
            placeholder={postKind === 'chat'
              ? 'Write your class message...'
              : postKind === 'picture'
                ? 'Add context for this image...'
                : postKind === 'file'
                  ? 'Add context for this file...'
                  : 'Add context for this material...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[90px] bg-background"
          />
          <Input
            placeholder={postKind === 'chat'
              ? 'Optional label (example: Weekly update)'
              : 'Attachment label (example: Chapter 2 assignment)'}
            value={attachmentLabel}
            onChange={(e) => setAttachmentLabel(e.target.value)}
            className="h-9 bg-background"
          />
          <select
            value={selectedSourceId}
            onChange={(e) => setSelectedSourceId(e.target.value)}
            className="h-9 w-full rounded-md border border-border/70 bg-background px-3 text-sm"
          >
            <option value="">Link class resource (optional)</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.label} ({source.subtitle})
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void createPost()} className="ml-auto h-8" disabled={isSubmitting}>
              {isSubmitting ? 'Sharing...' : 'Share'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isLoading && <div className="text-xs text-foreground/70">Loading shared posts...</div>}
        {!isLoading && visiblePosts.length === 0 && (
          <div className="rounded-xl bg-[hsl(var(--surface-1))] p-4 text-sm text-foreground/70">
            No posts yet for this view.
          </div>
        )}
        {visiblePosts.map((post) => (
          <article key={post.id} className="rounded-xl bg-[hsl(var(--surface-1))] p-4">
            <div className="mb-1 flex items-center justify-between text-xs text-foreground/65">
              <span>{post.audience === 'teacher' ? 'Teacher' : 'All'}</span>
              <span>{new Date(post.createdAt).toLocaleString()}</span>
            </div>
            {post.text ? <p className="text-sm leading-relaxed">{post.text}</p> : null}
            {post.attachmentLabel ? (
              <div className="mt-2 inline-flex items-center rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
                <Paperclip className="mr-1 h-3 w-3" />
                {post.attachmentLabel}
              </div>
            ) : null}
            {post.sourceType && post.sourceId ? (
              <div className="mt-2 text-xs text-foreground/70">
                {(() => {
                  const href = resolveSourceHref(post);
                  if (!href) return `Linked: ${post.sourceType} (${post.sourceId.slice(0, 8)}...)`;
                  return (
                    <Link href={href} className="underline underline-offset-2">
                      Open linked {post.sourceType}
                    </Link>
                  );
                })()}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
