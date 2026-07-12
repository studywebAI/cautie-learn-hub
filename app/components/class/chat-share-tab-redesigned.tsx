'use client';

import { useState, useEffect, useRef, useContext } from 'react';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import Loader from '@/components/ui/loader';
import { ImagePlus, X } from 'lucide-react';

type Reaction = { emoji: string; count: number; reactedByMe: boolean };

type Message = {
  id: string;
  authorId: string;
  authorName: string;
  isTeacher: boolean;
  content: string;
  imageDataUrl?: string;
  createdAt: string;
  channel: 'all' | 'teachers';
  reactions: Reaction[];
};

type Channel = 'all' | 'teachers';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🙌', '✅', '❓'];
const MAX_IMAGE_BYTES = 2_000_000;

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today ${timeStr}`;
    if (isYesterday) return `Yesterday ${timeStr}`;
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + timeStr;
  } catch { return ''; }
}

function mapRow(row: any): Message {
  return {
    id: String(row?.id || ''),
    authorId: String(row?.authorId || ''),
    authorName: String(row?.authorName || row?.authorEmail || 'User'),
    isTeacher: false,
    content: String(row?.text || ''),
    imageDataUrl: row?.imageDataUrl ? String(row.imageDataUrl) : undefined,
    createdAt: String(row?.createdAt || ''),
    channel: row?.audience === 'teacher' ? 'teachers' : 'all',
    reactions: [],
  };
}

export function ChatShareTabRedesigned({ classId }: { classId: string }) {
  const appContext = useContext(AppContext) as AppContextType | null;
  const role = appContext?.role || 'student';
  const session = appContext?.session;
  const language = appContext?.language || 'en';
  const isDutch = language === 'nl';
  const isTeacher = ['teacher', 'owner', 'admin', 'creator'].includes(String(role));

  const [channel, setChannel] = useState<Channel>('all');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmojis, setShowEmojis] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUserId = session?.user?.id || '';

  useEffect(() => { void loadMessages(); }, [classId, channel]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadMessages() {
    setLoading(true);
    try {
      const audience = channel === 'all' ? 'all' : 'teacher';
      const res = await fetch(`/api/classes/${classId}/share?audience=${audience}`);
      if (res.ok) {
        const data = await res.json();
        setMessages((data.rows || []).map(mapRow));
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      alert(isDutch ? 'Afbeelding is te groot (max 2 MB).' : 'Image is too large (max 2 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function sendMessage() {
    const content = text.trim();
    if (!content && !imagePreview || sending) return;
    setSending(true);
    const sentText = content;
    const sentImage = imagePreview;
    setText('');
    setImagePreview(null);
    try {
      const audience = channel === 'all' ? 'all' : 'teacher';
      const res = await fetch(`/api/classes/${classId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentText, audience, imageDataUrl: sentImage || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, mapRow(data)]);
      }
    } catch { /* ignore */ }
    finally { setSending(false); textRef.current?.focus(); }
  }

  function toggleReaction(msgId: string, emoji: string) {
    setShowEmojis(null);
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const existing = m.reactions.find(r => r.emoji === emoji);
      if (existing) {
        return {
          ...m,
          reactions: m.reactions
            .map(r => r.emoji === emoji
              ? { ...r, count: r.reactedByMe ? r.count - 1 : r.count + 1, reactedByMe: !r.reactedByMe }
              : r
            )
            .filter(r => r.count > 0),
        };
      }
      return { ...m, reactions: [...m.reactions, { emoji, count: 1, reactedByMe: true }] };
    }));
  }

  const channelLabel = channel === 'all'
    ? (isDutch ? 'Iedereen' : 'All')
    : (isDutch ? 'Docenten' : 'Teachers');

  const canSend = !!(text.trim() || imagePreview) && !sending;

  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-background">
      {/* Topbar */}
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-2.5 text-[12px] text-muted-foreground">
        <span className="text-foreground">
          {isDutch ? 'Berichten' : 'Messenger'}
        </span>
      </div>

      {/* Two-panel layout */}
      <div className="grid h-[460px]" style={{ gridTemplateColumns: '180px 1fr' }}>

        {/* ── Channel sidebar ── */}
        <div className="flex flex-col gap-0.5 overflow-y-auto border-r border-border p-3">
          <div className="px-2 pb-1 pt-2 text-[10px] text-muted-foreground/60">
            {isDutch ? 'Kanalen' : 'Channels'}
          </div>

          {/* All channel */}
          <button
            type="button"
            onClick={() => setChannel('all')}
            className={cn(
              'flex items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] text-foreground/70 transition-colors',
              channel === 'all'
                ? 'bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]'
                : 'hover:bg-muted/60'
            )}
          >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] bg-blue-100 text-[12px] text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              A
            </span>
            {isDutch ? 'Iedereen' : 'All'}
            {messages.length > 0 && channel !== 'all' && (
              <span className="ml-auto h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[var(--accent-brand)]" />
            )}
          </button>

          {/* Teachers channel — teacher-only */}
          {isTeacher && (
            <button
              type="button"
              onClick={() => setChannel('teachers')}
              className={cn(
                'flex items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] text-foreground/70 transition-colors',
                channel === 'teachers'
                  ? 'bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]'
                  : 'hover:bg-muted/60'
              )}
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] bg-[var(--accent-brand)]/10 text-[12px] text-[var(--accent-brand)]">
                T
              </span>
              {isDutch ? 'Docenten' : 'Teachers'}
            </button>
          )}
        </div>

        {/* ── Thread area ── */}
        <div className="flex min-w-0 flex-col">
          {/* Thread header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[13px] text-foreground">
              {channelLabel}
            </p>
            <button
              type="button"
              onClick={() => void loadMessages()}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              {isDutch ? 'Vernieuwen' : 'Refresh'}
            </button>
          </div>

          {/* Messages list */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <CautieLoader size="sm" label="" sublabel="" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center">
                <p className="text-[13px] text-muted-foreground">
                  {channel === 'all'
                    ? (isDutch ? 'Nog geen berichten. Stuur het eerste!' : 'No messages yet. Send the first one!')
                    : (isDutch ? 'Nog geen berichten van docenten.' : 'No teacher messages yet.')}
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const isOwn = msg.authorId === currentUserId;
                return (
                  <div key={msg.id} className={cn('group flex gap-2.5', isOwn ? 'flex-row-reverse justify-end' : 'flex-row justify-start')}>
                    <div className={cn('min-w-0 max-w-xs rounded-[12px] px-3.5 py-2.5',
                      isOwn
                        ? 'bg-[var(--accent-brand)] text-background'
                        : 'bg-muted text-foreground'
                    )}>
                      {/* Meta line */}
                      <div className="mb-[3px] text-[11px] text-muted-foreground">
                        <strong className="text-foreground/70">
                          {isOwn ? (isDutch ? 'Jij' : 'You') : msg.authorName}
                        </strong>
                        {'  '}
                        {formatTime(msg.createdAt)}
                      </div>

                      {/* Inline image */}
                      {msg.imageDataUrl && (
                        <div className="mb-2 overflow-hidden rounded-[8px]">
                          <img
                            src={msg.imageDataUrl}
                            alt=""
                            className="max-h-48 w-auto max-w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Message text */}
                      {msg.content && (
                        <div className="text-[13px] leading-[1.45] text-foreground">
                          {msg.content}
                        </div>
                      )}

                      {/* Reactions */}
                      {msg.reactions.length > 0 && (
                        <div className="mt-[5px] flex flex-wrap gap-1">
                          {msg.reactions.map(r => (
                            <button
                              key={r.emoji}
                              type="button"
                              onClick={() => toggleReaction(msg.id, r.emoji)}
                              className={cn(
                                'rounded-full border px-[7px] py-[2px] text-[12px] transition-colors',
                                r.reactedByMe
                                  ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/10'
                                  : 'border-border bg-muted hover:border-[var(--accent-brand)]'
                              )}
                            >
                              {r.emoji} {r.count}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Add reaction button — hover-only */}
                      <div className="relative mt-1">
                        <button
                          type="button"
                          onClick={() => setShowEmojis(showEmojis === msg.id ? null : msg.id)}
                          className="invisible rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-[var(--accent-brand)] group-hover:visible"
                        >
                          + react
                        </button>
                        {showEmojis === msg.id && (
                          <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-lg border border-border bg-background p-1.5 shadow-md">
                            {EMOJI_OPTIONS.map(e => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => toggleReaction(msg.id, e)}
                                className="rounded px-1 py-0.5 text-base hover:bg-muted"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {/* ── Composer ── */}
          <div className="border-t border-border p-[10px_14px]">
            <div className="overflow-hidden rounded-[8px] border border-border">

              {/* Image preview */}
              {imagePreview && (
                <div className="relative border-b border-border p-2">
                  <img
                    src={imagePreview}
                    alt=""
                    className="max-h-28 max-w-full rounded-[6px] object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute right-3 top-3 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Text input area */}
              <textarea
                ref={textRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={channel === 'all'
                  ? (isDutch ? 'Schrijf een bericht naar Iedereen…' : 'Write a message to All…')
                  : (isDutch ? 'Schrijf een bericht naar Docenten…' : 'Write a message to Teachers…')}
                rows={2}
                className="w-full resize-none bg-muted/30 px-3 pt-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
              />

              {/* Toolbar */}
              <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/50 px-3 py-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title={isDutch ? 'Afbeelding toevoegen' : 'Attach image'}
                  className="rounded-[6px] p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="hidden"
                  onChange={handleImageSelect}
                />

                <button
                  type="button"
                  disabled={!canSend}
                  onClick={() => void sendMessage()}
                  className="rounded-[6px] border border-[var(--accent-brand)] bg-[var(--accent-brand)] px-3 py-1.5 text-[12px] text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? '…' : (isDutch ? 'Stuur' : 'Send')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
