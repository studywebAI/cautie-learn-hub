'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_CLASS_PREFERENCES, normalizeClassPreferences } from '@/lib/class-preferences';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';

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
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_CLASS_PREFERENCES);
  const [oneTimeTeacherCode, setOneTimeTeacherCode] = useState('');
  const [oneTimeTeacherCodeExpiresAt, setOneTimeTeacherCodeExpiresAt] = useState<string | null>(null);
  const [isGeneratingTeacherCode, setIsGeneratingTeacherCode] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const studentLink = joinCode ? `${origin}/classes?join_code=${joinCode}` : '';
  const teacherLink = oneTimeTeacherCode ? `${origin}/classes/join/${oneTimeTeacherCode}` : '';

  const activeCode = mode === 'students' ? joinCode : oneTimeTeacherCode;
  const activeLink = mode === 'students' ? studentLink : teacherLink;
  const activeQr = activeLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeLink)}&format=png&margin=10`
    : '';

  useEffect(() => {
    void logClassTabEvent({ classId, tab: 'invite', event: 'mount', stage: 'ui', level: 'info' });

    const loadPreferences = async () => {
      try {
        const res = await fetch(`/api/classes/${classId}`);
        if (!res.ok) return;
        const data = await res.json();
        setPreferences(normalizeClassPreferences(data.preferences || {}));
      } catch {
        setPreferences(DEFAULT_CLASS_PREFERENCES);
      }
    };
    void loadPreferences();
  }, [classId]);

  const copyCode = async () => {
    if (!activeCode) return;
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!' });
      void logClassTabEvent({ classId, tab: 'invite', event: 'copy_to_clipboard', stage: 'action', level: 'debug', meta: { mode } });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };


  const copyLink = async () => {
    if (!activeLink) return;
    try {
      await navigator.clipboard.writeText(activeLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({ title: 'Link copied!' });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const generateTeacherCode = async () => {
    if (!preferences.invite_allow_teacher_invites) return;
    setIsGeneratingTeacherCode(true);
    try {
      const res = await fetch(`/api/classes/${classId}/teacher-invite-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_in_minutes: 60 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate teacher code');
      setOneTimeTeacherCode(data?.code?.code || '');
      setOneTimeTeacherCodeExpiresAt(data?.code?.expires_at || null);
      toast({ title: 'Teacher code generated (valid 60 min)' });
      void logClassTabEvent({ classId, tab: 'invite', event: 'teacher_code_generated', stage: 'action', level: 'info' });
    } catch (error: any) {
      toast({ title: error?.message || 'Failed to generate teacher code', variant: 'destructive' });
    } finally {
      setIsGeneratingTeacherCode(false);
    }
  };

  const teachersDisabled = !preferences.invite_allow_teacher_invites;

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
                ? 'bg-[#7f8962] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            Students
          </button>
          <button
            onClick={() => !teachersDisabled && setMode('teachers')}
            disabled={teachersDisabled}
            className={[
              'px-5 py-1.5 rounded-md text-sm transition-all',
              teachersDisabled
                ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                : mode === 'teachers'
                  ? 'bg-[#7f8962] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            Teachers
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 items-start">

          {/* QR code */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative rounded-xl border border-border p-3 bg-white">
              {/* Always render a real-looking QR — use a dummy URL when no code yet */}
              <img
                src={activeQr || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=placeholder&format=png&margin=10`}
                alt="QR Code"
                width={180}
                height={180}
                className={['rounded transition-all duration-300', !activeQr ? 'blur-md select-none pointer-events-none' : ''].join(' ')}
              />
              {!activeQr && mode === 'teachers' && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                  <button
                    onClick={generateTeacherCode}
                    disabled={isGeneratingTeacherCode}
                    className="flex items-center gap-1.5 rounded-md bg-white/90 border border-border px-3 py-1.5 text-[12px] text-foreground shadow-sm hover:bg-white transition-colors"
                  >
                    {isGeneratingTeacherCode
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <RefreshCw className="h-3 w-3" />}
                    {isGeneratingTeacherCode ? 'Generating…' : 'Generate code'}
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === 'students' ? 'Scan to join' : 'Scan to join as teacher'}
            </p>
          </div>

          {/* Code + copy */}
          <div className="flex-1 space-y-3 w-full">
            <div className="space-y-1.5">
              <Label className="text-sm">
                {mode === 'students' ? 'Join Code' : 'Teacher Code'}
              </Label>
              <div className="relative flex gap-2">
                <Input
                  value={activeCode || (mode === 'teachers' ? 'XXXXXX' : '')}
                  readOnly
                  className={['font-mono text-xl tracking-widest font-bold h-12 text-center transition-all duration-300', !activeCode ? 'blur-sm select-none' : ''].join(' ')}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  onClick={copyCode}
                  disabled={!activeCode}
                >
                  {copied
                    ? <Check className="h-4 w-4 text-[#7f8962]" />
                    : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Copy link */}
            <button
              onClick={copyLink}
              disabled={!activeLink}
              className="flex items-center gap-2 w-full rounded-md border border-border px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left disabled:opacity-40 disabled:pointer-events-none"
            >
              {copiedLink
                ? <Check className="h-3.5 w-3.5 text-[#7f8962] shrink-0" />
                : <Copy className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{activeLink || 'No link yet'}</span>
            </button>

            {mode === 'students' && (
              <p className="text-xs text-muted-foreground">
                Students can enter this code in the app to join.
              </p>
            )}

            {mode === 'teachers' && oneTimeTeacherCodeExpiresAt && (
              <p className="text-xs text-muted-foreground">
                Expires at{' '}
                {new Date(oneTimeTeacherCodeExpiresAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}

            {mode === 'teachers' && oneTimeTeacherCode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={generateTeacherCode}
                disabled={isGeneratingTeacherCode}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </Button>
            )}
          </div>
        </div>

      </section>
    </div>
  );
}
