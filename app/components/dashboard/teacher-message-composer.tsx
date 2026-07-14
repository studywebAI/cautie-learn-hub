'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

type Member = { user_id: string; role: string; profiles?: { full_name?: string | null } };

export function TeacherMessageComposer({ classId, trigger }: { classId: string; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>('class');
  const [members, setMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !classId) return;
    fetch(`/api/classes/${classId}/members`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setMembers(Array.isArray(d) ? d.filter((m: Member) => m.role !== 'teacher') : []))
      .catch(() => setMembers([]));
  }, [open, classId]);

  const handleSend = async () => {
    if (!message.trim() || !classId) return;
    setSending(true);
    try {
      const response = await fetch('/api/notifications/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          studentId: target === 'class' ? undefined : target,
          message: message.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to send message');
      }
      toast({ title: 'Message sent' });
      setMessage('');
      setTarget('class');
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled={!classId}
            aria-label="Send a quick message"
            title="Send a quick message"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div>
          <p className="text-sm font-medium">Send message</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            A one-way message — not a chat. Shows up in the recipient&apos;s notifications and on their dashboard.
          </p>
        </div>

        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger>
            <SelectValue placeholder="Who should receive this?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="class">Whole class</SelectItem>
            {members.map(m => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.profiles?.full_name || 'Student'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea
          placeholder="e.g. Room for Chemistry is now 109"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={500}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSend} disabled={sending || !message.trim()}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
