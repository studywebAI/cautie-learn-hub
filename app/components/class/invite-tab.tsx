'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Mode = 'students' | 'teachers';

export function InviteTab({
  classId,
  joinCode,
  teacherJoinCode,
}: {
  classId: string;
  joinCode: string;
  teacherJoinCode?: string;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('students');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const activeCode = mode === 'students' ? joinCode : (teacherJoinCode || '');
  const activeLink = activeCode
    ? `${origin}/classes?join_code=${activeCode}`
    : '';
  const activeQr = activeLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeLink)}&format=png&margin=10`
    : '';

  const copy = async (text: string, type: 'code' | 'link') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
      toast({ title: type === 'code' ? 'Code copied!' : 'Link copied!' });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  return (
    <div className="class-shell">
      <section className="class-panel-lg space-y-6">

        {/* Toggle */}
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted gap-0.5">
          <button
            onClick={() => setMode('students')}
            className={[
              'px-5 py-1.5 rounded-md text-sm transition-all',
              mode === 'students'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            Students
          </button>
          <button
            onClick={() => setMode('teachers')}
            className={[
              'px-5 py-1.5 rounded-md text-sm transition-all',
              mode === 'teachers'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            Teachers
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 items-start">

          {/* QR code */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="rounded-xl border border-border p-3 bg-white">
              {activeQr
                ? <img src={activeQr} alt="QR Code" width={180} height={180} className="rounded" />
                : <div className="w-[180px] h-[180px] flex items-center justify-center text-xs text-muted-foreground text-center px-4">
                    No code available
                  </div>
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === 'students' ? 'Scan to join' : 'Scan to join as teacher'}
            </p>
          </div>

          {/* Code + link */}
          <div className="flex-1 space-y-3 w-full">
            <div className="space-y-1.5">
              <Label className="text-sm">
                {mode === 'students' ? 'Join Code' : 'Teacher Code'}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={activeCode}
                  readOnly
                  className="font-mono text-xl tracking-widest h-12 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  onClick={() => copy(activeCode, 'code')}
                  disabled={!activeCode}
                >
                  {copiedCode
                    ? <Check className="h-4 w-4 text-[var(--accent-brand)]" />
                    : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Copy link */}
            <button
              onClick={() => copy(activeLink, 'link')}
              disabled={!activeLink}
              className="flex items-center gap-2 w-full rounded-md border border-border px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left disabled:opacity-40 disabled:pointer-events-none"
            >
              {copiedLink
                ? <Check className="h-3.5 w-3.5 text-[var(--accent-brand)] shrink-0" />
                : <Copy className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{activeLink || '—'}</span>
            </button>

            <p className="text-xs text-muted-foreground">
              {mode === 'students'
                ? 'Students can use this code or link to join the class.'
                : 'Share this code or link with teachers you want to add.'}
            </p>
          </div>
        </div>

      </section>
    </div>
  );
}
