'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Send, Link2, Image as ImageIcon, Paperclip, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ShareAudience = 'teacher' | 'all';

type SharePost = {
  id: string;
  createdAt: string;
  audience: ShareAudience;
  text: string;
  replyToId?: string;
  authorId?: string;
  authorName?: string;
  authorEmail?: string | null;
  attachmentLabel?: string;
  sourceType?: string;
  sourceHref?: string;
};
type ShareSettings = {
  allChatEnabled: boolean;
  teacherChatEnabled: boolean;
  mutedUsers: Array<{ userId: string; until: string }>;
};

export function ShareTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const [audienceFilter, setAudienceFilter] = useState<ShareAudience>(isTeacher ? 'teacher' : 'all');
  const [message, setMessage] = useState('');
  const [posts, setPosts] = useState<SharePost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ShareSettings>({
    allChatEnabled: true,
    teacherChatEnabled: true,
    mutedUsers: [],
  });
  const [muteUserId, setMuteUserId] = useState('');
  const [muteMinutes, setMuteMinutes] = useState('30');
  const [savingSettings, setSavingSettings] = useState(false);
  const [composerMode, setComposerMode] = useState<'text' | 'photo' | 'file' | 'link'>('text');
  const [attachmentLabel, setAttachmentLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [attachmentMimeType, setAttachmentMimeType] = useState('');
  const [attachmentSizeBytes, setAttachmentSizeBytes] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewerUserId, setViewerUserId] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [readByUser, setReadByUser] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isTeacher) setAudienceFilter('all');
  }, [isTeacher]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/classes/${classId}/share/settings`, { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return;
        setSettings({
          allChatEnabled: data?.settings?.allChatEnabled !== false,
          teacherChatEnabled: data?.settings?.teacherChatEnabled !== false,
          mutedUsers: Array.isArray(data?.settings?.mutedUsers) ? data.settings.mutedUsers : [],
        });
      } catch {}
    };
    void loadSettings();
  }, [classId]);

  useEffect(() => {
    if (audienceFilter === 'all' && !settings.allChatEnabled && isTeacher && settings.teacherChatEnabled) {
      setAudienceFilter('teacher');
    }
    if (audienceFilter === 'teacher' && !settings.teacherChatEnabled) {
      setAudienceFilter('all');
    }
  }, [audienceFilter, isTeacher, settings.allChatEnabled, settings.teacherChatEnabled]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/classes/${classId}/share?audience=${audienceFilter}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load class chat');
        setPosts(Array.isArray(data?.rows) ? data.rows : []);
        setViewerUserId(typeof data?.viewerUserId === 'string' ? data.viewerUserId : '');
      } catch {
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [classId, audienceFilter]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/classes/${classId}/share/presence`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setTypingUserIds(Array.isArray(data?.typingUserIds) ? data.typingUserIds : []);
        setReadByUser(data?.readByUser && typeof data.readByUser === 'object' ? data.readByUser : {});
      } catch {}
    }, 4000);
    return () => window.clearInterval(timer);
  }, [classId]);

  useEffect(() => {
    const lastMessage = posts[posts.length - 1];
    if (!lastMessage?.id) return;
    void fetch(`/api/classes/${classId}/share/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'read', lastSeenMessageId: lastMessage.id }),
    }).catch(() => {});
  }, [classId, posts]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/classes/${classId}/share?audience=${audienceFilter}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setPosts(Array.isArray(data?.rows) ? data.rows : []);
        if (typeof data?.viewerUserId === 'string') setViewerUserId(data.viewerUserId);
      } catch {}
    }, 5000);
    return () => window.clearInterval(timer);
  }, [classId, audienceFilter]);

  const isValidLink = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const sendMessage = async () => {
    setStatusMessage(null);
    const text = message.trim();
    const hasAttachment = Boolean(attachmentLabel || linkUrl.trim());
    if (!text && !hasAttachment) return;
    if (composerMode === 'link' && linkUrl.trim() && !isValidLink(linkUrl.trim())) {
      setStatusMessage({ type: 'error', text: 'Use a valid http/https link.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const source =
        composerMode === 'link' && linkUrl.trim()
          ? {
              link_type: 'link',
              link_ref_id: null,
              metadata_json: { href: linkUrl.trim() },
            }
          : composerMode === 'photo' || composerMode === 'file'
            ? {
                link_type: composerMode,
                link_ref_id: null,
                metadata_json: {
                  file_name: attachmentLabel || null,
                  mime_type: attachmentMimeType || null,
                  size_bytes: attachmentSizeBytes || 0,
                },
              }
            : null;
      const res = await fetch(`/api/classes/${classId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          replyToId: replyToId || undefined,
          audience: audienceFilter,
          attachmentLabel: attachmentLabel || undefined,
          source,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to send message');
      setMessage('');
      setAttachmentLabel('');
      setLinkUrl('');
      setAttachmentMimeType('');
      setAttachmentSizeBytes(0);
      setComposerMode('text');
      setReplyToId(null);
      setPosts((prev) => [...prev, data]);
      setStatusMessage({ type: 'success', text: 'Message sent.' });
    } catch (error: any) {
      console.error('share send failed', error);
      setStatusMessage({ type: 'error', text: error?.message || 'Failed to send message.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/classes/${classId}/share/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      setSettingsOpen(false);
      setStatusMessage({ type: 'success', text: 'Share settings saved.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const addMute = () => {
    const userId = muteUserId.trim();
    const mins = Number(muteMinutes || 0);
    if (!userId || !Number.isFinite(mins) || mins <= 0) return;
    const until = new Date(Date.now() + mins * 60_000).toISOString();
    setSettings((prev) => ({
      ...prev,
      mutedUsers: [...prev.mutedUsers.filter((entry) => entry.userId !== userId), { userId, until }],
    }));
    setMuteUserId('');
  };

  const removeMute = (userId: string) => {
    setSettings((prev) => ({
      ...prev,
      mutedUsers: prev.mutedUsers.filter((entry) => entry.userId !== userId),
    }));
  };

  const visiblePosts = useMemo(() => posts, [posts]);

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>, mode: 'photo' | 'file') => {
    const file = event.target.files?.[0];
    if (!file) return;
    setComposerMode(mode);
    setAttachmentLabel(file.name);
    setAttachmentMimeType(file.type || '');
    setAttachmentSizeBytes(file.size || 0);
  };

  const replyTarget = replyToId ? posts.find((p) => p.id === replyToId) || null : null;
  const markTyping = () => {
    void fetch(`/api/classes/${classId}/share/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'typing' }),
    }).catch(() => {});
  };

  return (
    <div className="class-shell space-y-3">
      <div className="flex items-center gap-2">
        {isTeacher && settings.teacherChatEnabled ? (
          <Button size="sm" variant={audienceFilter === 'teacher' ? 'default' : 'outline'} onClick={() => setAudienceFilter('teacher')} className="h-8">
            Teacher
          </Button>
        ) : null}
        {settings.allChatEnabled ? (
          <Button size="sm" variant={audienceFilter === 'all' ? 'default' : 'outline'} onClick={() => setAudienceFilter('all')} className="h-8">
          All
          </Button>
        ) : null}
        {isTeacher ? (
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)} className="h-8 ml-auto">
            <Settings2 className="mr-1 h-3.5 w-3.5" />
            Settings
          </Button>
        ) : null}
      </div>
      {!settings.allChatEnabled && !settings.teacherChatEnabled ? (
        <div className="rounded-md surface-panel p-4 text-sm text-muted-foreground">Chat is disabled by class settings.</div>
      ) : null}

      <div className="rounded-xl border surface-panel p-3">
        {statusMessage ? (
          <div
            className={`mb-3 rounded-md px-3 py-2 text-xs ${
              statusMessage.type === 'error'
                ? 'border border-destructive/40 bg-destructive/10 text-destructive'
                : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
            }`}
          >
            {statusMessage.text}
          </div>
        ) : null}
        <div className="mb-3 max-h-[52vh] space-y-2 overflow-y-auto pr-1">
        {isLoading ? <p className="text-xs text-muted-foreground">Loading messages...</p> : null}
        {visiblePosts.length === 0 && !isLoading ? (
          <div className="rounded-md surface-panel p-4 text-sm text-muted-foreground">No messages yet.</div>
        ) : null}
        {visiblePosts.map((post) => (
          <article key={post.id} className={`flex ${post.authorId && post.authorId === viewerUserId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[86%] rounded-2xl px-3 py-2 ${post.authorId && post.authorId === viewerUserId ? 'bg-primary text-primary-foreground' : 'surface-interactive text-foreground'}`}>
              <div className={`mb-1 flex items-center justify-between gap-2 text-[11px] ${post.authorId && post.authorId === viewerUserId ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                <span className="truncate">{post.authorName || post.authorEmail || 'User'}</span>
                <span>{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {post.replyToId ? (
                <div className={`mb-1 rounded-lg px-2 py-1 text-[11px] ${post.authorId && post.authorId === viewerUserId ? 'bg-primary-foreground/15 text-primary-foreground/90' : 'bg-background/60 text-muted-foreground'}`}>
                  Replying to: {posts.find((p) => p.id === post.replyToId)?.text?.slice(0, 80) || 'message'}
                </div>
              ) : null}
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.text}</p>
              {post.attachmentLabel ? (
                <p className={`mt-1 text-xs ${post.authorId && post.authorId === viewerUserId ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>Attachment: {post.attachmentLabel}</p>
              ) : null}
              {post.sourceHref ? (
                <a className={`mt-1 inline-flex text-xs underline ${post.authorId && post.authorId === viewerUserId ? 'text-primary-foreground' : 'text-foreground/80'}`} href={post.sourceHref} target="_blank" rel="noreferrer">
                  Open link
                </a>
              ) : null}
              <div className="mt-1 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`h-6 px-1.5 text-[11px] ${post.authorId && post.authorId === viewerUserId ? 'text-primary-foreground/80 hover:text-primary-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setReplyToId(post.id)}
                >
                  Reply
                </Button>
              </div>
            </div>
          </article>
        ))}
        </div>
        <div className="mb-2 min-h-5 text-xs text-muted-foreground">
          {typingUserIds.length > 0 ? `${typingUserIds.length} typing...` : ''}
        </div>
        <div className="border-t border-border pt-3">
          {replyTarget ? (
            <div className="mb-2 flex items-center justify-between rounded-md surface-interactive px-2 py-1 text-xs">
              <span className="truncate">Replying to: {replyTarget.text.slice(0, 100)}</span>
              <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setReplyToId(null)}>
                Cancel
              </Button>
            </div>
          ) : null}
          <div className="relative z-10 mb-2 flex flex-wrap items-center gap-1.5">
            <label className="inline-flex">
              <input type="file" accept="image/*" className="hidden" onChange={(event) => onPickFile(event, 'photo')} />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={`h-7 rounded-full border-sidebar-border bg-white px-3 text-xs hover:surface-panel ${composerMode === 'photo' ? 'ring-1 ring-primary/30' : ''}`}
                asChild
              >
                <span><ImageIcon className="mr-1 h-3.5 w-3.5" />Photo</span>
              </Button>
            </label>
            <label className="inline-flex">
              <input type="file" className="hidden" onChange={(event) => onPickFile(event, 'file')} />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={`h-7 rounded-full border-sidebar-border bg-white px-3 text-xs hover:surface-panel ${composerMode === 'file' ? 'ring-1 ring-primary/30' : ''}`}
                asChild
              >
                <span><Paperclip className="mr-1 h-3.5 w-3.5" />Files</span>
              </Button>
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={`h-7 rounded-full border-sidebar-border bg-white px-3 text-xs hover:surface-panel ${composerMode === 'link' ? 'ring-1 ring-primary/30' : ''}`}
              onClick={() => setComposerMode('link')}
            >
              <Link2 className="mr-1 h-3.5 w-3.5" />
              Links
            </Button>
          </div>
          {composerMode === 'link' ? (
            <div className="mb-2 rounded-xl border border-sidebar-border bg-background/80 p-2">
              <div className="flex items-center gap-2">
                <Input
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="Paste link..."
                  className="h-8 flex-1 border-sidebar-border bg-sidebar-accent/50 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  disabled={!linkUrl.trim()}
                  onClick={() => setComposerMode('text')}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : null}
          {(composerMode === 'photo' || composerMode === 'file') && attachmentLabel ? (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-md surface-interactive px-2 py-1 text-xs text-muted-foreground">
              <span className="truncate">
                {attachmentLabel}
                {attachmentSizeBytes > 0 ? ` (${Math.ceil(attachmentSizeBytes / 1024)} KB)` : ''}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
                onClick={() => {
                  setAttachmentLabel('');
                  setAttachmentMimeType('');
                  setAttachmentSizeBytes(0);
                  if (!linkUrl.trim()) setComposerMode('text');
                }}
              >
                Remove
              </Button>
            </div>
          ) : null}
          <div className="mb-1 flex items-start gap-2">
            <Textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                markTyping();
              }}
              placeholder="Write a message..."
              className="h-[132px] min-h-[132px] flex-1 resize-none rounded-2xl border border-border surface-chip text-sm"
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <Button
              size="sm"
              className="w-[112px] rounded-2xl text-xs"
              onClick={() => void sendMessage()}
              disabled={isSubmitting || (!message.trim() && !attachmentLabel && !linkUrl.trim())}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {isSubmitting ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">
          {Object.keys(readByUser).length > 0 ? `Seen by ${Object.keys(readByUser).length}` : ''}
        </div>
      </div>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share settings</DialogTitle>
            <DialogDescription>Control all chat, teacher chat, and mute users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md surface-interactive p-2">
              <Label>All chat enabled</Label>
              <Switch
                checked={settings.allChatEnabled}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, allChatEnabled: Boolean(checked) }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md surface-interactive p-2">
              <Label>Teacher chat enabled</Label>
              <Switch
                checked={settings.teacherChatEnabled}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, teacherChatEnabled: Boolean(checked) }))}
              />
            </div>
            <div className="space-y-2 rounded-md surface-interactive p-2">
              <Label>Mute user</Label>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <Input value={muteUserId} onChange={(event) => setMuteUserId(event.target.value)} placeholder="User ID" className="md:col-span-2" />
                <Input value={muteMinutes} onChange={(event) => setMuteMinutes(event.target.value)} placeholder="Minutes" />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addMute}>Add mute timeout</Button>
              <div className="space-y-1">
                {settings.mutedUsers.map((entry) => (
                  <div key={`${entry.userId}-${entry.until}`} className="flex items-center justify-between rounded-md bg-background px-2 py-1 text-xs">
                    <span className="truncate">{entry.userId} until {new Date(entry.until).toLocaleString()}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeMute(entry.userId)}>Remove</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void saveSettings()} disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
