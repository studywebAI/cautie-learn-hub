'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Cloud, ExternalLink, FileText, Link2, Presentation } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const APPS = [
  { id: 'word', label: 'Word', Icon: FileText, description: 'Read-only .doc/.docx access' },
  { id: 'powerpoint', label: 'PowerPoint', Icon: Presentation, description: 'Read-only .ppt/.pptx access' },
  { id: 'onedrive', label: 'OneDrive', Icon: Cloud, description: 'Browse recent files safely' },
];

type MicrosoftStatus = {
  connected: boolean;
  account_email?: string;
};

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<MicrosoftStatus>({ connected: false });

  const returnTo = useMemo(() => {
    const raw = searchParams.get('returnTo') || '/tools';
    return raw.startsWith('/') ? raw : '/tools';
  }, [searchParams]);

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

  const connectHref = `/api/integrations/microsoft/connect?returnTo=${encodeURIComponent(returnTo)}`;

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const response = await fetch('/api/integrations/microsoft/disconnect', { method: 'POST' });
      if (!response.ok) return;
      setStatus({ connected: false });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="w-full space-y-4">
        <Card className="border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Integrations
            </CardTitle>
            <CardDescription>
              Link your own Microsoft account. Read-only file access only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-orange-200/80 bg-orange-50/70 p-3 text-sm dark:border-orange-900/40 dark:bg-orange-950/25">
              {status.connected
                ? `Connected as ${status.account_email || 'Microsoft account'}`
                : 'Not connected yet'}
            </div>
            <div className="flex flex-wrap gap-2">
              {!status.connected ? (
                <Button asChild>
                  <a href={connectHref}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Link Microsoft Account
                  </a>
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => void handleDisconnect()} disabled={disconnecting}>
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              )}
              <Button asChild variant="outline">
                <Link prefetch={false} href={returnTo}>
                  Back to previous page
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none">
          <CardHeader>
            <CardTitle>Apps</CardTitle>
            <CardDescription>Pick where to pull context from.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {APPS.map((app) => {
              const Icon = app.Icon;
              const appHref = status.connected
                ? `/tools/studyset?open=create&step=2&source=${encodeURIComponent(app.id)}`
                : connectHref;
              return (
                <a
                  key={app.id}
                  href={appHref}
                  className="rounded-xl border border-orange-200/80 bg-orange-50/70 p-3 transition-colors hover:bg-orange-100/80 dark:border-orange-900/40 dark:bg-orange-950/25 dark:hover:bg-orange-900/35"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="rounded-lg bg-white/80 p-2 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{app.label}</p>
                  <p className="text-xs text-muted-foreground">{app.description}</p>
                </a>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-none">
          <CardHeader>
            <CardTitle>Safety</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Your Microsoft account link is per-user.</li>
              <li>Access is read-only and limited to files.</li>
              <li>Connected tokens are stored encrypted.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
