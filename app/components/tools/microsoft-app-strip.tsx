'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FileText, Presentation, Cloud } from 'lucide-react';

type MicrosoftStatus = {
  connected: boolean;
  account_email?: string;
};

type MicrosoftAppStripProps = {
  returnTo: string;
};

const APPS = [
  { id: 'word', label: 'Word', Icon: FileText, href: '/tools/studyset?open=create&step=2&source=word' },
  { id: 'powerpoint', label: 'PowerPoint', Icon: Presentation, href: '/tools/studyset?open=create&step=2&source=powerpoint' },
  { id: 'onedrive', label: 'OneDrive', Icon: Cloud, href: '/tools/studyset?open=create&step=2&source=onedrive' },
];

export function MicrosoftAppStrip({ returnTo }: MicrosoftAppStripProps) {
  const [status, setStatus] = useState<MicrosoftStatus>({ connected: false });

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await fetch('/api/integrations/microsoft/status', { cache: 'no-store' });
        if (!response.ok) {
          setStatus({ connected: false });
          return;
        }
        const json = await response.json();
        setStatus({
          connected: Boolean(json?.connected),
          account_email: json?.account_email ? String(json.account_email) : undefined,
        });
      } catch {
        setStatus({ connected: false });
      }
    };
    void loadStatus();
  }, []);

  const connectHref = useMemo(
    () => `/settings/integrations?returnTo=${encodeURIComponent(returnTo)}`,
    [returnTo]
  );

  return (
    <div className="rounded-xl border border-orange-200/80 bg-orange-50/70 p-3 dark:border-orange-900/40 dark:bg-orange-950/25">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Microsoft Apps</p>
        <Link prefetch={false} href={connectHref} className="text-[11px] text-muted-foreground underline-offset-2 hover:underline">
          {status.connected ? 'Manage link' : 'Connect'}
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {APPS.map((app) => {
          const Icon = app.Icon;
          const href = status.connected ? app.href : connectHref;
          return (
            <Link
              key={app.id}
              prefetch={false}
              href={href}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-orange-200/90 bg-white/80 text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-950/35 dark:text-orange-200 dark:hover:bg-orange-900/40"
              title={app.label}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
      </div>
      {status.connected && (
        <p className="mt-2 text-[11px] text-muted-foreground">Connected as {status.account_email || 'Microsoft account'}</p>
      )}
    </div>
  );
}
