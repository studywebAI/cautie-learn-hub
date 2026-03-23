'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Link2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const APPS = [
  {
    id: 'word',
    label: 'Word',
    logo: '/integrations/microsoft-word.svg',
    description: 'Read-only .doc/.docx access',
    kind: 'word',
  },
  {
    id: 'powerpoint',
    label: 'PowerPoint',
    logo: '/integrations/microsoft-powerpoint.svg',
    description: 'Read-only .ppt/.pptx access',
    kind: 'powerpoint',
  },
];

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
  kind: 'word' | 'powerpoint';
  mimeType?: string;
};

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<MicrosoftStatus>({ connected: false });
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [files, setFiles] = useState<MicrosoftFileItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const returnTo = useMemo(() => {
    const raw = searchParams.get('returnTo') || '/tools';
    return raw.startsWith('/') ? raw : '/tools';
  }, [searchParams]);
  const appQuery = (searchParams.get('app') || '').toLowerCase();
  const selectedApp = useMemo(
    () => APPS.find((app) => app.id === appQuery || app.kind === appQuery) || APPS[0],
    [appQuery]
  );

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

  const toggleFile = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const handleUseSelected = () => {
    const selectedFiles = files.filter((file) => selectedIds.includes(file.id));
    if (selectedFiles.length === 0) return;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('microsoft.selectedSources', JSON.stringify(selectedFiles));
      window.location.href = returnTo;
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
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => void handleDisconnect()} disabled={disconnecting}>
                    {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                  <Button type="button" onClick={handleUseSelected} disabled={selectedIds.length === 0}>
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
