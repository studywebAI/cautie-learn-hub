'use client';

import React, { useState } from 'react';
import { Send, Paperclip, Pin, PinOff, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Message = {
  id: string;
  author: string;
  role: 'teacher' | 'student';
  content: string;
  timestamp: string;
  isPinned: boolean;
  attachments?: { name: string; url: string }[];
};

type Audience = 'all' | 'teachers' | 'pinned';

export function ChatShareTabRedesigned({ classId }: { classId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      author: 'Teacher',
      role: 'teacher',
      content: 'Welcome to the class. Please check the assignment brief.',
      timestamp: '2:30 PM',
      isPinned: true,
      attachments: [{ name: 'Assignment_Brief.pdf', url: '#' }],
    },
    {
      id: '2',
      author: 'Alex Johnson',
      role: 'student',
      content: 'What is the deadline?',
      timestamp: '2:45 PM',
      isPinned: false,
    },
    {
      id: '3',
      author: 'Teacher',
      role: 'teacher',
      content: 'Deadline is Friday at 5 PM.',
      timestamp: '2:50 PM',
      isPinned: false,
    },
  ]);

  const [audience, setAudience] = useState<Audience>('all');
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = messages.filter(m => {
    if (audience === 'pinned') return m.isPinned;
    if (audience === 'teachers') return m.role === 'teacher';
    return true;
  }).filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    const newMessage: Message = {
      id: String(messages.length + 1),
      author: 'You',
      role: 'teacher', // Assuming teacher for now
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isPinned: false,
    };
    setMessages([...messages, newMessage]);
    setMessageText('');
  };

  const togglePin = (messageId: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
      )
    );
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-3">
      {/* Audience Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'pinned', 'teachers'] as const).map(a => (
          <button
            key={a}
            onClick={() => setAudience(a)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              audience === a
                ? 'bg-[var(--accent-brand)] text-white border-[var(--accent-brand)]'
                : 'bg-background text-muted-foreground border-border hover:border-[var(--accent-brand)]'
            }`}
          >
            {a === 'all' ? 'All Messages' : a === 'pinned' ? 'Pinned' : 'Teachers Only'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {filtered.map(message => (
          <div
            key={message.id}
            className={`p-3 rounded-lg border ${
              message.role === 'teacher'
                ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]10'
                : 'border-border bg-background'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{message.author}</span>
                <span className="text-xs text-muted-foreground">{message.timestamp}</span>
              </div>
              <button
                onClick={() => togglePin(message.id)}
                className="p-1 rounded hover:bg-[hsl(var(--interactive-hover))] text-muted-foreground hover:text-foreground transition-colors"
                title={message.isPinned ? 'Unpin' : 'Pin'}
              >
                {message.isPinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <p className="text-sm text-foreground mb-2">{message.content}</p>

            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-1 mt-2">
                {message.attachments.map((attachment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded bg-background border border-border text-xs hover:bg-[hsl(var(--interactive-hover))] cursor-pointer transition-colors"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{attachment.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
          />
          <Button
            size="sm"
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2">
            <Paperclip className="h-4 w-4" />
            Attach File
          </Button>
        </div>
      </div>
    </div>
  );
}
