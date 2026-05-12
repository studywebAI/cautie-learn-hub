'use client';

import { useState, useEffect, useRef, useContext } from 'react';
import { Paperclip, ImageIcon, Upload } from 'lucide-react';
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

  const memberCount = messages.length > 0 ? undefined : undefined; // no member count from messages API

  return (
    /* Outer shell — flat white box matching mockup */
    <div className="overflow-hidden rounded-[10px] border border-[#e4e4e4] bg-white dark:border-border dark:bg-[hsl(var(--surface-1))]">
      {/* Topbar */}
      <div className="flex items-center gap-1.5 border-b border-[#e4e4e4] bg-[#f7f7f7] px-4 py-2.5 text-[12px] text-[#888] dark:border-border dark:bg-[hsl(var(--surface-2))]">
        <span className="font-semibold text-[#1a1a1a] dark:text-foreground">
          {isDutch ? 'Berichten' : 'Messenger'}
        </span>
      </div>

      {/* Two-panel layout */}
      <div className="grid h-[460px]" style={{ gridTemplateColumns: '180px 1fr' }}>

        {/* ── Channel sidebar ── */}
        <div className="flex flex-col gap-0.5 overflow-y-auto border-r border-[#ebebeb] p-3 dark:border-border">
          <div
            className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[.5px] text-[#bbb]"
          >
            {isDutch ? 'Kanalen' : 'Channels'}
          </div>

          {/* All channel */}
          <button
            type="button"
            onClick={() => setChannel('all')}
            className={cn(
              'flex items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] text-[#555] transition-colors dark:text-foreground/70',
              channel === 'all'
                ? 'bg-[#edf1e5] font-semibold text-[#7f8962]'
                : 'hover:bg-[#f5f5f5] dark:hover:bg-[hsl(var(--interactive-hover))]'
            )}
          >
            {/* Channel icon */}
            <span
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] text-[12px] font-bold"
              style={{ background: '#e5eef8', color: '#3a7fc1' }}
            >
              A
            </span>
            {isDutch ? 'Iedereen' : 'All'}
            {/* Unread dot placeholder — shown when there are messages */}
            {messages.length > 0 && channel !== 'all' && (
              <span
                className="ml-auto h-[7px] w-[7px] flex-shrink-0 rounded-full"
                style={{ background: '#7f8962' }}
              />
            )}
          </button>

          {/* Teachers channel — teacher-only */}
          {isTeacher && (
            <button
              type="button"
              onClick={() => setChannel('teachers')}
              className={cn(
                'flex items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] text-[#555] transition-colors dark:text-foreground/70',
                channel === 'teachers'
                  ? 'bg-[#edf1e5] font-semibold text-[#7f8962]'
                  : 'hover:bg-[#f5f5f5] dark:hover:bg-[hsl(var(--interactive-hover))]'
              )}
            >
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px] text-[12px] font-bold"
                style={{ background: '#edf1e5', color: '#7f8962' }}
              >
                T
              </span>
              {isDutch ? 'Docenten' : 'Teachers'}
            </button>
          )}
        </div>

        {/* ── Thread area ── */}
        <div className="flex min-w-0 flex-col">
          {/* Thread header */}
          <div className="flex items-center justify-between border-b border-[#ebebeb] px-4 py-3 dark:border-border">
            <p className="text-[13px] font-semibold text-[#1a1a1a] dark:text-foreground">
              {channelLabel}
            </p>
            <button
              type="button"
              onClick={() => void loadMessages()}
              className="text-[11px] text-[#aaa] hover:text-[#555] dark:text-muted-foreground"
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
                <p className="text-[13px] text-[#aaa]">
                  {channel === 'all'
                    ? (isDutch ? 'Nog geen berichten. Stuur het eerste!' : 'No messages yet. Send the first one!')
                    : (isDutch ? 'Nog geen berichten van docenten.' : 'No teacher messages yet.')}
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const isOwn = msg.authorId === currentUserId;
                return (
                  <div key={msg.id} className="group flex gap-2.5">
                    {/* No avatar — per design rules */}
                    <div className="min-w-0 flex-1">
                      {/* Meta line */}
                      <div className="mb-[3px] text-[11px] text-[#bbb]">
                        <strong className="font-semibold text-[#444] dark:text-foreground/70">
                          {isOwn ? (isDutch ? 'Jij' : 'You') : msg.authorName}
                        </strong>
                        {'  '}
                        {formatTime(msg.createdAt)}
                      </div>
                      {/* Message text */}
                      <div className="text-[13px] leading-[1.45] text-[#1a1a1a] dark:text-foreground">
                        {msg.content}
                      </div>

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
                                  ? 'border-[#7f8962] bg-[#edf1e5]'
                                  : 'border-[#e4e4e4] bg-[#f5f5f5] hover:border-[#7f8962]'
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
                          className="invisible rounded-full border border-[#e4e4e4] bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] text-[#aaa] hover:border-[#7f8962] group-hover:visible"
                        >
                          + react
                        </button>
                        {showEmojis === msg.id && (
                          <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-lg border border-[#e4e4e4] bg-white p-1.5 shadow-md dark:bg-[hsl(var(--surface-2))]">
                            {EMOJI_OPTIONS.map(e => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => toggleReaction(msg.id, e)}
                                className="rounded px-1 py-0.5 text-base hover:bg-[#f5f5f5]"
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
          <div className="border-t border-[#ebebeb] p-[10px_14px] dark:border-border">
            <div className="overflow-hidden rounded-[8px] border border-[#e0e0e0] dark:border-border">
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
                className="w-full resize-none bg-[#fafafa] px-3 pt-2 text-[13px] text-[#1a1a1a] outline-none placeholder:text-[#aaa] dark:bg-[hsl(var(--surface-2))] dark:text-foreground"
              />
              {/* Toolbar */}
              <div className="flex items-center gap-1 border-t border-[#ebebeb] bg-[#f7f7f7] px-2 py-[6px] dark:border-border dark:bg-[hsl(var(--surface-2))]">
                <button
                  type="button"
                  title={isDutch ? 'Bestand toevoegen' : 'Attach file'}
                  className="flex items-center gap-1 rounded-[4px] border border-[#e4e4e4] bg-white px-2 py-1 text-[11px] text-[#555] transition-colors hover:border-[#7f8962] hover:text-[#7f8962] dark:bg-[hsl(var(--surface-3))] dark:text-foreground/60"
                >
                  <Paperclip className="h-3 w-3" />
                  {isDutch ? 'Bestand' : 'File'}
                </button>
                <button
                  type="button"
                  title={isDutch ? 'Afbeelding toevoegen' : 'Attach image'}
                  className="flex items-center gap-1 rounded-[4px] border border-[#e4e4e4] bg-white px-2 py-1 text-[11px] text-[#555] transition-colors hover:border-[#7f8962] hover:text-[#7f8962] dark:bg-[hsl(var(--surface-3))] dark:text-foreground/60"
                >
                  <ImageIcon className="h-3 w-3" />
                  {isDutch ? 'Afbeelding' : 'Image'}
                </button>
                <button
                  type="button"
                  title="Import from OneDrive / Google Drive"
                  className="flex items-center gap-1 rounded-[4px] border border-[#e4e4e4] bg-white px-2 py-1 text-[11px] text-[#555] transition-colors hover:border-[#7f8962] hover:text-[#7f8962] dark:bg-[hsl(var(--surface-3))] dark:text-foreground/60"
                >
                  <Upload className="h-3 w-3" />
                  Import
                </button>
                <span className="px-1 text-[11px] text-[#ccc]">OneDrive · Drive · Recents</span>
                {/* Send button */}
                <button
                  type="button"
                  disabled={!text.trim() || sending}
                  onClick={() => void sendMessage()}
                  className="ml-auto rounded-[4px] border border-[#7f8962] bg-[#7f8962] px-3 py-1 text-[12px] font-semibold text-white transition-opacity disabled:opacity-40"
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
