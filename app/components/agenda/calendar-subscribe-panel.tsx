'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link2, Check, Copy, CalendarDays } from 'lucide-react';

type Class = { id: string; name: string };

type Props = {
  role: 'student' | 'teacher' | string;
  classes?: Class[];
};

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex-shrink-0 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
      title="Copy link"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function ICSRow({ label, url }: { label: string; url: string }) {
  const webcalUrl = url.replace(/^https?:\/\//, 'webcal://');
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-1.5">
        <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
          {url}
        </code>
        <CopyButton url={url} />
        <a
          href={webcalUrl}
          className="flex-shrink-0 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          title="Subscribe in your calendar app"
        >
          Subscribe
        </a>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Click Subscribe or paste the URL into Apple Calendar, Google Calendar, or Outlook → Add calendar by URL.
      </p>
    </div>
  );
}

export function CalendarSubscribePanel({ role, classes = [] }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';

  const loadToken = async () => {
    if (!isStudent) return;
    setLoading(true);
    try {
      const res = await fetch('/api/calendar/token');
      if (res.ok) {
        const data = await res.json();
        setToken(data?.token || null);
      }
    } finally {
      setLoading(false);
    }
  };

  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : '';

  const studentIcsUrl = token ? `${baseUrl}/api/calendar/student/${token}` : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-xl px-3.5"
          onClick={loadToken}
          title="Subscribe to this calendar in your calendar app"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Subscribe
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 rounded-xl border border-border bg-card p-4 shadow-lg" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Subscribe to calendar</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add these links to any calendar app — they auto-sync, no setup needed after that.
            </p>
          </div>

          {isStudent && (
            <div className="space-y-3">
              {loading && <p className="text-xs text-muted-foreground">Loading your link…</p>}
              {!loading && studentIcsUrl && (
                <ICSRow
                  label="Your study schedule"
                  url={studentIcsUrl}
                />
              )}
              {!loading && !studentIcsUrl && (
                <button
                  type="button"
                  onClick={loadToken}
                  className="text-xs text-[#6b7c4e] underline"
                >
                  Generate calendar link
                </button>
              )}
            </div>
          )}

          {isTeacher && classes.length > 0 && (
            <div className="space-y-4">
              {classes.map((cls) => (
                <ICSRow
                  key={cls.id}
                  label={cls.name}
                  url={`${baseUrl}/api/calendar/class/${cls.id}`}
                />
              ))}
            </div>
          )}

          {isTeacher && classes.length === 0 && (
            <p className="text-xs text-muted-foreground">No active classes found.</p>
          )}

          <div className="border-t border-border pt-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Works with Apple Calendar, Google Calendar, Outlook, and more.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
