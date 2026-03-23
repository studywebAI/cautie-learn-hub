'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { INTEGRATION_APPS } from '@/lib/integrations/catalog';

type MicrosoftStatus = {
  connected: boolean;
  account_email?: string;
};

type MicrosoftAppStripProps = {
  returnTo: string;
};

const APPS = INTEGRATION_APPS.filter((app) => app.provider === 'microsoft').map((app) => ({
  id: app.id,
  label: app.label,
  logo: app.logoPath,
  app: app.id,
}));

export function MicrosoftAppStrip({ returnTo }: MicrosoftAppStripProps) {
  const [status, setStatus] = useState<MicrosoftStatus>({ connected: false });
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const loadStatus = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const connectHref = useMemo(
    () => `/settings/integrations?returnTo=${encodeURIComponent(returnTo)}`,
    [returnTo]
  );

  useEffect(() => {
    const ms = searchParams.get('ms');
    const msError = searchParams.get('ms_error');
    if (!ms && !msError) return;

    if (ms === 'connected') {
      toast({ title: 'Microsoft connected', description: 'Your account is linked.' });
    } else if (msError) {
      const map: Record<string, string> = {
        access_denied: 'Microsoft login was canceled.',
        invalid_state: 'Login session expired. Please try again.',
        unauthorized: 'Please log in to Cautie first.',
        integration_not_configured: 'Microsoft app credentials are missing on server.',
        integration_storage_not_configured: 'Token encryption key is missing on server.',
        token_exchange_failed: 'Microsoft token exchange failed.',
        invalid_client: 'Microsoft app credentials are invalid.',
        microsoft_connect_failed: 'Could not link Microsoft account.',
      };
      toast({ title: 'Microsoft connection failed', description: map[msError] || map.microsoft_connect_failed, variant: 'destructive' });
    }

    void loadStatus();

    const params = new URLSearchParams(searchParams.toString());
    params.delete('ms');
    params.delete('ms_error');
    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(next);
  }, [loadStatus, pathname, router, searchParams, toast]);

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
          const href = `/settings/integrations?returnTo=${encodeURIComponent(returnTo)}&app=${encodeURIComponent(app.app)}`;
          return (
            <Link
              key={app.id}
              prefetch={false}
              href={href}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-white transition-colors hover:bg-muted/40 dark:bg-background"
              title={app.label}
            >
              <img src={app.logo} alt={app.label} className="h-5 w-5" />
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
