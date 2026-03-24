'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2, Search, RefreshCw, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ENABLED_INTEGRATION_APPS } from '@/lib/integrations/catalog';

type MicrosoftStatus = {
  connected: boolean;
  account_email?: string;
};

type MicrosoftFileItem = {
  id: string;
  name: string;
  webUrl?: string;
  mimeType?: string;
  size?: number;
  lastModifiedDateTime?: string;
};

type MicrosoftAppStripProps = {
  returnTo: string;
};

const APPS = ENABLED_INTEGRATION_APPS.filter((app) => app.provider === 'microsoft').map((app) => ({
  id: app.id,
  label: app.label,
  logo: app.logoPath,
}));

function formatFileSize(value?: number) {
  if (!value || value <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const rounded = unitIndex === 0 ? Math.round(size).toString() : size.toFixed(1);
  return `${rounded} ${units[unitIndex]}`;
}

function getFileTypeLabel(appId: string, mimeType?: string) {
  if (mimeType?.includes('presentation')) return 'PowerPoint';
  if (mimeType?.includes('wordprocessingml')) return 'Word';
  if (mimeType?.includes('spreadsheetml')) return 'Excel';
  if (appId === 'word') return 'Word';
  if (appId === 'powerpoint') return 'PowerPoint';
  if (appId === 'onedrive') return 'File';
  return 'File';
}

function withQuery(path: string, params: Record<string, string>) {
  const [pathname, search = ''] = path.split('?');
  const next = new URLSearchParams(search);
  for (const [key, value] of Object.entries(params)) {
    next.set(key, value);
  }
  const encoded = next.toString();
  return encoded ? `${pathname}?${encoded}` : pathname;
}

export function MicrosoftAppStrip({ returnTo }: MicrosoftAppStripProps) {
  const [status, setStatus] = useState<MicrosoftStatus>({ connected: false });
  const [isOpen, setIsOpen] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [activeApp, setActiveApp] = useState<string>(APPS[0]?.id || 'word');
  const [files, setFiles] = useState<MicrosoftFileItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const currentReturnTo = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('ms');
    params.delete('ms_error');
    params.delete('ms_picker');
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const safeReturnTo = useMemo(() => {
    if (returnTo && returnTo.startsWith('/')) return returnTo;
    return currentReturnTo.startsWith('/') ? currentReturnTo : '/tools/quiz';
  }, [currentReturnTo, returnTo]);

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

  const loadFiles = useCallback(async (kind: string, query?: string) => {
    if (!status.connected) {
      setFiles([]);
      return;
    }
    setLoadingFiles(true);
    setLoadError(null);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      const params = new URLSearchParams();
      params.set('kind', kind);
      if (query && query.trim()) params.set('q', query.trim());
      const response = await fetch(`/api/integrations/microsoft/files?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setLoadError(typeof payload?.error === 'string' ? payload.error : 'Failed to load files');
        setFiles([]);
        return;
      }
      const json = await response.json();
      setFiles(Array.isArray(json?.items) ? json.items : []);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        setLoadError('Loading timed out. Try refresh or another app tab.');
      } else {
        setLoadError('Failed to load files');
      }
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [status.connected]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!isOpen) return;
    void loadFiles(activeApp, searchText);
  }, [activeApp, isOpen, loadFiles, searchText]);

  useEffect(() => {
    const ms = searchParams.get('ms');
    const msError = searchParams.get('ms_error');
    const msPicker = searchParams.get('ms_picker');
    const app = searchParams.get('app');

    if (!ms && !msError && !msPicker) return;

    if (ms === 'connected') {
      toast({ title: 'Microsoft connected', description: 'Account linked.' });
      void loadStatus();
      if (msPicker === '1') {
        if (app && APPS.some((entry) => entry.id === app)) setActiveApp(app);
        setIsOpen(true);
      }
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

    const params = new URLSearchParams(searchParams.toString());
    params.delete('ms');
    params.delete('ms_error');
    params.delete('ms_picker');
    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(next);
  }, [loadStatus, pathname, router, searchParams, toast]);

  const openPicker = async (appId: string) => {
    setActiveApp(appId);
    setSelectedIds([]);
    setSearchText('');
    if (!status.connected) {
      const returnWithPicker = withQuery(safeReturnTo, { ms_picker: '1', app: appId });
      window.location.href = `/api/integrations/microsoft/connect?returnTo=${encodeURIComponent(returnWithPicker)}`;
      return;
    }
    setIsOpen(true);
  };

  const toggleFile = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const attachSelected = async () => {
    if (selectedIds.length === 0) return;
    const selected = files.filter((item) => selectedIds.includes(item.id));
    if (selected.length === 0) return;

    setAttaching(true);
    try {
      const saveResponse = await fetch('/api/integrations/context-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'microsoft',
          app: activeApp,
          items: selected.map((file) => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            webUrl: file.webUrl,
          })),
          replaceSelection: true,
        }),
      });

      if (!saveResponse.ok) {
        const payload = await saveResponse.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to attach files');
      }

      await fetch('/api/integrations/ingestion-jobs/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'microsoft', app: activeApp, maxJobs: 25 }),
      }).catch(() => null);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('integration-sources-updated', { detail: { provider: 'microsoft' } }));
      }
      toast({ title: 'Context attached', description: `${selected.length} file${selected.length === 1 ? '' : 's'} added.` });
      setIsOpen(false);
      setSelectedIds([]);
      setSearchText('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Attach failed', description: error?.message || 'Could not attach files' });
    } finally {
      setAttaching(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {APPS.map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => void openPicker(app.id)}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-sidebar-border bg-sidebar p-0 transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={app.label}
          >
            <img src={app.logo} alt={app.label} className="h-9 w-9 object-contain" />
          </button>
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div>
                <p className="text-lg font-semibold">Select Microsoft file</p>
                <p className="text-xs text-muted-foreground">Choose one or more files to add as context.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-md p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-0 md:grid-cols-[220px_1fr]">
              <div className="border-b border-r border-border bg-muted/30 p-3 md:border-b-0">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Microsoft Apps</div>
                <div className="space-y-1">
                  {APPS.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => {
                        setActiveApp(app.id);
                        setSelectedIds([]);
                        setSearchText('');
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${
                        activeApp === app.id ? 'bg-background font-medium ring-1 ring-border' : 'hover:bg-background/60'
                      }`}
                      title={app.label}
                    >
                      <img src={app.logo} alt={app.label} className="h-6 w-6 object-contain" />
                      <span>{app.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Search files"
                      className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadFiles(activeApp, searchText)}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm hover:bg-muted/40"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                </div>

                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-[minmax(0,1fr)_160px_110px_110px] bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
                    <span>Name</span>
                    <span>Modified</span>
                    <span>Type</span>
                    <span>Size</span>
                  </div>
                  <div className="max-h-[48vh] overflow-auto">
                    {loadingFiles && (
                      <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading files...
                      </div>
                    )}
                    {!loadingFiles && loadError && (
                      <div className="space-y-2 px-3 py-4">
                        <p className="text-sm text-destructive">{loadError}</p>
                        <button
                          type="button"
                          onClick={() => void loadFiles(activeApp, searchText)}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-muted/40"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Retry
                        </button>
                      </div>
                    )}
                    {!loadingFiles && !loadError && files.length === 0 && (
                      <p className="px-3 py-4 text-sm text-muted-foreground">No files found.</p>
                    )}
                    {!loadingFiles && !loadError && files.map((file) => {
                      const checked = selectedIds.includes(file.id);
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => toggleFile(file.id)}
                          className={`grid w-full grid-cols-[minmax(0,1fr)_160px_110px_110px] items-center gap-2 border-t border-border px-3 py-2 text-left text-sm ${
                            checked ? 'bg-muted/60' : 'bg-background hover:bg-muted/30'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {checked ? <Check className="h-4 w-4 shrink-0" /> : <span className="h-4 w-4 shrink-0 rounded-sm border border-border" />}
                            <span className="truncate">{file.name}</span>
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {file.lastModifiedDateTime ? new Date(file.lastModifiedDateTime).toLocaleDateString() : '-'}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">{getFileTypeLabel(activeApp, file.mimeType)}</span>
                          <span className="truncate text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <p className="text-xs text-muted-foreground">
                {selectedIds.length} selected
              </p>
              <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                disabled={attaching}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void attachSelected()}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                disabled={attaching || selectedIds.length === 0}
              >
                {attaching ? 'Attaching...' : 'Open'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
