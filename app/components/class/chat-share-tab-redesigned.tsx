'use client';

import { useState, useEffect, useRef, useContext } from 'react';
import { Send, Paperclip, Image, Upload, SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';

type Reaction = { emoji: string; count: number; reactedByMe: boolean };

type Message = {
  id: string;
  authorId: string;
  authorName: string;
  isTeacher: boolean;
  content: string;
  createdAt: string;
  channel: 'all' | 'teachers';
  reactions: Reaction[];
};

type Channel = 'all' | 'teachers';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🙌', '✅', '❓'];

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// Map share API row to our Message type
function mapRow(row: any): Message {
  const text = String(row?.text || '');
  const authorName = String(row?.authorName || row?.authorEmail || 'User');
  return {
    id: String(row?.id || ''),
    authorId: String(row?.authorId || ''),
    authorName,
    isTeacher: false, // share API doesn't expose role — we derive below from viewer
    content: text,
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
  const [showEmojis, setShowEmojis] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const currentUserId = session?.user?.id || '';

  useEffect(() => {
    void loadMessages();
  }, [classId, channel]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    setLoading(true);
    try {
      // The share API uses audience=all|teacher (not channel)
      const audience = channel === 'all' ? 'all' : 'teacher';
      const res = await fetch(`/api/classes/${classId}/share?audience=${audience}`);
      if (res.ok) {
        const data = await res.json();
        const rows = data.rows || [];
        setMessages(rows.map(mapRow));
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    try {
      const audience = channel === 'all' ? 'all' : 'teacher';
      const res = await fetch(`/api/classes/${classId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, audience }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, mapRow(data)]);
      }
    } catch { /* ignore */ }
    finally { setSending(false); textRef.current?.focus(); }
  }

  // Reactions are optimistic-only (no backend reaction endpoint yet)
  function toggleReaction(msgId: string, emoji: string) {
    setShowEmojis(null);
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const existing = m.reactions.find(r => r.emoji === emoji);
      if (existing) {
        return {
          ...m,
          reactions: m.reactions.map(r =>
            r.emoji === emoji
              ? { ...r, count: r.reactedByMe ? r.count - 1 : r.count + 1, reactedByMe: !r.reactedByMe }
              : r
          ).filter(r => r.count > 0),
        };
      }
      return { ...m, reactions: [...m.reactions, { emoji, count: 1, reactedByMe: true }] };
    }));
  }

  return (
    <div className="class-shell flex h-[calc(100vh-12rem)] min-h-0 overflow-hidden rounded-xl surface-panel border border-border">
      {/* Channel sidebar */}
      <div className="flex w-44 flex-shrink-0 flex-col border-r border-border">
        <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {isDutch ? 'Kanalen' : 'Channels'}
        </div>

        <button
          type="button"
          onClick={() => setChannel('all')}
          className={cn(
            'mx-1.5 mb-1 flex items-center gap-2 rounded-md px-2 py-2 text-[13px] transition-colors',
            channel === 'all'
              ? 'bg-[hsl(var(--accent-brand)/0.12)] font-semibold text-[var(--accent-brand)]'
              : 'text-foreground/75 hover:bg-[hsl(var(--interactive-hover))]'
          )}
        >
          {isDutch ? 'Iedereen' : 'All'}
        </button>

        {isTeacher && (
          <button
            type="button"
            onClick={() => setChannel('teachers')}
            className={cn(
              'mx-1.5 flex items-center gap-2 rounded-md px-2 py-2 text-[13px] transition-colors',
              channel === 'teachers'
                ? 'bg-[hsl(var(--accent-brand)/0.12)] font-semibold text-[var(--accent-brand)]'
                : 'text-foreground/75 hover:bg-[hsl(var(--interactive-hover))]'
            )}
          >
            {isDutch ? 'Docenten' : 'Teachers'}
          </button>
        )}
      </div>

      {/* Thread area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Thread header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-[13px] font-semibold">
            {channel === 'all' ? (isDutch ? 'Iedereen' : 'All') : (isDutch ? 'Docenten' : 'Teachers')}
          </p>
          <button
            type="button"
            onClick={() => void loadMessages()}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            {isDutch ? 'Vernieuwen' : 'Refresh'}
          </button>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <CautieLoader size="sm" label="" sublabel="" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">
                {channel === 'all'
                  ? (isDutch ? 'Nog geen berichten. Stuur het eerste!' : 'No messages yet. Send the first one!')
                  : (isDutch ? 'Nog geen berichten van docenten.' : 'No teacher messages yet.')}
              </p>
            </div>
          ) : (
            messages.map(msg => {
              const isOwn = msg.authorId === currentUserId;
              return (
                <div key={msg.id} className={cn('group flex', isOwn && 'flex-row-reverse')}>
                  {/* Bubble */}
                  <div className={cn('min-w-0 flex-1', isOwn && 'flex flex-col items-end')}>
                    <p className="mb-1 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground/80">{isOwn ? (isDutch ? 'Jij' : 'You') : msg.authorName}</span>
                      {' · '}
                      {formatTime(msg.createdAt)}
                    </p>
                    <div className={cn(
                      'max-w-[80%] rounded-xl px-3 py-2 text-[13px] leading-relaxed',
                      isOwn
                        ? 'bg-[var(--accent-brand)] text-white'
                        : 'bg-[hsl(var(--surface-2))]'
                    )}>
                      {msg.content}
                    </div>

                    {/* Reactions row */}
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {msg.reactions.map(r => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() => toggleReaction(msg.id, r.emoji)}
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[12px] transition-colors',
                            r.reactedByMe
                              ? 'border-[var(--accent-brand)] bg-[hsl(var(--accent-brand)/0.08)]'
                              : 'border-border bg-[hsl(var(--surface-1))] hover:border-[var(--accent-brand)]'
                          )}
                        >
                          {r.emoji} {r.count}
                        </button>
                      ))}

                      {/* Add reaction */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEmojis(showEmojis === msg.id ? null : msg.id)}
                          className="invisible rounded-full border border-border bg-[hsl(var(--surface-1))] px-1.5 py-0.5 text-[11px] text-muted-foreground transition-all hover:border-[var(--accent-brand)] group-hover:visible"
                        >
                          <SmilePlus className="h-3 w-3" />
                        </button>
                        {showEmojis === msg.id && (
                          <div className="absolute bottom-full mb-1 left-0 z-10 flex gap-1 rounded-lg border border-border bg-white p-1.5 shadow-md dark:bg-[hsl(var(--surface-2))]">
                            {EMOJI_OPTIONS.map(e => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => toggleReaction(msg.id, e)}
                                className="rounded px-1 py-0.5 text-[16px] hover:bg-[hsl(var(--interactive-hover))]"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-border p-3">
          <div className="overflow-hidden rounded-xl border border-border bg-[hsl(var(--surface-1))]">
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
                ? (isDutch ? 'Bericht sturen naar iedereen…' : 'Send a message to All…')
                : (isDutch ? 'Bericht naar docenten…' : 'Message teachers…')}
              rows={2}
              className="w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] outline-none placeholder:text-muted-foreground/60"
            />
            <div className="flex items-center gap-1 border-t border-border bg-[hsl(var(--surface-2))] px-2 py-1.5">
              {/* File / image attach buttons — functional hooks ready for upload API */}
              <button type="button" title={isDutch ? 'Bestand toevoegen' : 'Attach file'}
                className="flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-muted-foreground hover:border-[var(--accent-brand)] hover:text-[var(--accent-brand)] dark:bg-[hsl(var(--surface-3))]">
                <Paperclip className="h-3 w-3" /> {isDutch ? 'Bestand' : 'File'}
              </button>
              <button type="button" title={isDutch ? 'Afbeelding toevoegen' : 'Attach image'}
                className="flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-muted-foreground hover:border-[var(--accent-brand)] hover:text-[var(--accent-brand)] dark:bg-[hsl(var(--surface-3))]">
                <Image className="h-3 w-3" /> {isDutch ? 'Afbeelding' : 'Image'}
              </button>
              <button type="button" title="Import from OneDrive / Google Drive"
                className="flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] text-muted-foreground hover:border-[var(--accent-brand)] hover:text-[var(--accent-brand)] dark:bg-[hsl(var(--surface-3))]">
                <Upload className="h-3 w-3" /> Import
              </button>
              <span className="pl-1 text-[10px] text-muted-foreground/50">OneDrive · Drive</span>
              <Button
                size="sm"
                disabled={!text.trim() || sending}
                onClick={() => void sendMessage()}
                className="ml-auto h-7 gap-1.5 px-3 text-[12px]"
              >
                <Send className="h-3 w-3" />
                {isDutch ? 'Stuur' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
