'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, Link2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { INTEGRATION_APPS } from '@/lib/integrations/catalog';

const APPS = INTEGRATION_APPS.filter((app) => app.provider === 'microsoft').map((app) => ({
  id: app.id,
  label: app.label,
  logo: app.logoPath,
  description: app.description,
  kind: app.id,
}));

type MicrosoftStatus = {
  connected: boolean;
  account_email?: string;
};

type MicrosoftFileItem = {
  id: string;
  name: string;
  webUrl?: string;
  size?: number;
  lastModifiedDateTime?: string;
  kind: 'word' | 'powerpoint' | 'excel';
  mimeType?: string;
};

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState<MicrosoftStatus>({ connected: false });
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [files, setFiles] = useState<MicrosoftFileItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedLoading, setSelectedLoading] = useState(false);

  const returnTo = useMemo(() => {
    const raw = searchParams.get('returnTo') || '/tools';
    return raw.startsWith('/') ? raw : '/tools';
  }, [searchParams]);
  const appQuery = (searchParams.get('app') || '').toLowerCase();
  const selectedApp = useMemo(
    () => APPS.find((app) => app.id === appQuery || app.kind === appQuery) || APPS[0],
    [appQuery]
  );
  const oauthResult = searchParams.get('ms');
  const oauthError = searchParams.get('ms_error');

  const connectReturnTo = useMemo(() => {
    const p = new URLSearchParams();
    p.set('returnTo', returnTo);
    p.set('app', selectedApp.id);
    return `/settings/integrations?${p.toString()}`;
  }, [returnTo, selectedApp.id]);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setStatusLoading(true);
        const response = await fetch('/api/integrations/microsoft/status', { cache: 'no-store' });
        if (!response.ok) {
          setStatus({ connected: false });
          const payload = await response.json().catch(() => ({}));
          setStatusError(typeof payload?.error === 'string' ? payload.error : `Status request failed (${response.status})`);
          return;
        }
        const json = await response.json();
        setStatus({
          connected: Boolean(json?.connected),
          account_email: json?.account_email ? String(json.account_email) : undefined,
        });
        setStatusError(null);
      } catch {
        setStatus({ connected: false });
        setStatusError('Could not reach integration status service.');
      } finally {
        setStatusLoading(false);
      }
    };
    void loadStatus();
  }, []);

  const connectHref = `/api/integrations/microsoft/connect?returnTo=${encodeURIComponent(connectReturnTo)}`;

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

  useEffect(() => {
    const loadFiles = async () => {
      if (!status.connected) {
        setFiles([]);
        return;
      }
      setLoadingFiles(true);
      try {
        const response = await fetch(`/api/integrations/microsoft/files?kind=${selectedApp.kind}`, { cache: 'no-store' });
        if (!response.ok) {
          setFiles([]);
          return;
        }
        const json = await response.json();
        setFiles(Array.isArray(json?.items) ? json.items : []);
      } catch {
        setFiles([]);
      } finally {
        setLoadingFiles(false);
      }
    };
    void loadFiles();
  }, [selectedApp.kind, status.connected]);

  useEffect(() => {
    const loadSelected = async () => {
      if (!status.connected) {
        setSelectedIds([]);
        return;
      }
      setSelectedLoading(true);
      try {
        const response = await fetch(
          `/api/integrations/context-sources?provider=microsoft&app=${encodeURIComponent(selectedApp.kind)}&selected=1`,
          { cache: 'no-store' }
        );
        if (!response.ok) {
          setSelectedIds([]);
          return;
        }
        const json = await response.json();
        const ids = Array.isArray(json?.items)
          ? json.items.map((item: any) => String(item?.provider_item_id || '')).filter(Boolean)
          : [];
        setSelectedIds(ids);
      } catch {
        setSelectedIds([]);
      } finally {
        setSelectedLoading(false);
      }
    };
    void loadSelected();
  }, [selectedApp.kind, status.connected]);

  const toggleFile = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const handleUseSelected = async () => {
    const selectedFiles = files.filter((file) => selectedIds.includes(file.id));
    if (selectedFiles.length === 0) return;
    const response = await fetch('/api/integrations/context-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'microsoft',
        app: selectedApp.kind,
        items: selectedFiles.map((file) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          webUrl: file.webUrl,
        })),
        replaceSelection: true,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setStatusError(typeof payload?.error === 'string' ? payload.error : 'Failed to store selected sources.');
      return;
    }
    setStatusError(null);
    if (typeof window !== 'undefined') window.location.href = returnTo;
  };

  useEffect(() => {
    if (!oauthResult && !oauthError) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('ms');
    params.delete('ms_error');
    const next = params.toString() ? `/settings/integrations?${params.toString()}` : '/settings/integrations';
    router.replace(next);
  }, [oauthError, oauthResult, router, searchParams]);

  const oauthMessage = (() => {
    if (oauthResult === 'connected') return 'Microsoft linked successfully.';
    if (!oauthError) return null;
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
    return map[oauthError] || map.microsoft_connect_failed;
  })();

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
              {statusLoading
                ? 'Checking connection...'
                : status.connected
                ? `Connected as ${status.account_email || 'Microsoft account'}`
                : 'Not connected yet'}
            </div>
            {oauthMessage && (
              <div className="rounded-xl border border-orange-200/80 bg-orange-50/70 p-3 text-sm text-foreground dark:border-orange-900/40 dark:bg-orange-950/25">
                {oauthMessage}
              </div>
            )}
            {statusError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {statusError}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!status.connected ? (
                <Button asChild>
                  <a href={connectHref}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Link Microsoft Account
                  </a>
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => void handleDisconnect()} disabled={disconnecting}>
                    {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                  <Button type="button" onClick={() => void handleUseSelected()} disabled={selectedIds.length === 0}>
                    Use selected files
                  </Button>
                </div>
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
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {APPS.map((app) => {
              const appHref = `/settings/integrations?returnTo=${encodeURIComponent(returnTo)}&app=${encodeURIComponent(app.id)}`;
              return (
                <a
                  key={app.id}
                  href={appHref}
                  className={`rounded-xl border bg-white p-3 transition-colors hover:bg-muted/40 dark:bg-background ${
                    selectedApp.id === app.id ? 'border-primary' : 'border-border'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="rounded-lg border bg-white p-2 dark:bg-background">
                      <img src={app.logo} alt={app.label} className="h-4 w-4" />
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
            <CardTitle>{selectedApp.label} files</CardTitle>
            <CardDescription>Select files to attach as context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!status.connected && (
              <p className="text-sm text-muted-foreground">Link your Microsoft account first.</p>
            )}
            {status.connected && loadingFiles && (
              <p className="text-sm text-muted-foreground">Loading files...</p>
            )}
            {status.connected && selectedLoading && (
              <p className="text-sm text-muted-foreground">Loading selected sources...</p>
            )}
            {status.connected && !loadingFiles && files.length === 0 && (
              <p className="text-sm text-muted-foreground">No files found.</p>
            )}
            {status.connected &&
              !loadingFiles &&
              files.map((file) => (
                <label key={file.id} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm dark:bg-background">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(file.id)}
                    onChange={() => toggleFile(file.id)}
                  />
                  <span className="truncate">{file.name}</span>
                </label>
              ))}
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
