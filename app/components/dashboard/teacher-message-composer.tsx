'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Megaphone } from 'lucide-react';

type Member = { user_id: string; role: string; profiles?: { full_name?: string | null } };

export function TeacherMessageComposer({ classId }: { classId: string }) {
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
    <>
      <Button size="sm" className="w-full" onClick={() => setOpen(true)} disabled={!classId}>
        <Megaphone className="mr-1.5 h-3.5 w-3.5" />
        Send message
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send message</DialogTitle>
            <DialogDescription>
              A one-way message — not a chat. It shows up in the recipient&apos;s notifications and on their dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !message.trim()}>
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
