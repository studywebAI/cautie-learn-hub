'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
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
};

type MicrosoftAppStripProps = {
  returnTo: string;
};

const APPS = ENABLED_INTEGRATION_APPS.filter((app) => app.provider === 'microsoft').map((app) => ({
  id: app.id,
  label: app.label,
  logo: app.logoPath,
}));

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

  const loadFiles = useCallback(async (kind: string) => {
    if (!status.connected) {
      setFiles([]);
      return;
    }
    setLoadingFiles(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/integrations/microsoft/files?kind=${encodeURIComponent(kind)}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setLoadError(typeof payload?.error === 'string' ? payload.error : 'Failed to load files');
        setFiles([]);
        return;
      }
      const json = await response.json();
      setFiles(Array.isArray(json?.items) ? json.items : []);
    } catch {
      setLoadError('Failed to load files');
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
    void loadFiles(activeApp);
  }, [activeApp, isOpen, loadFiles]);

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
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-transparent p-0 transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={app.label}
          >
            <img src={app.logo} alt={app.label} className="h-10 w-10 object-contain" />
          </button>
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-background p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Select Microsoft file</p>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-md p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 flex items-center gap-2">
              {APPS.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => {
                    setActiveApp(app.id);
                    setSelectedIds([]);
                  }}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-md border ${
                    activeApp === app.id ? 'border-foreground bg-muted' : 'border-border bg-background'
                  }`}
                  title={app.label}
                >
                  <img src={app.logo} alt={app.label} className="h-6 w-6" />
                </button>
              ))}
            </div>

            <div className="max-h-[50vh] space-y-2 overflow-auto">
              {loadingFiles && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading files...
                </div>
              )}
              {!loadingFiles && loadError && (
                <p className="text-sm text-destructive">{loadError}</p>
              )}
              {!loadingFiles && !loadError && files.length === 0 && (
                <p className="text-sm text-muted-foreground">No files found.</p>
              )}
              {!loadingFiles && !loadError && files.map((file) => {
                const checked = selectedIds.includes(file.id);
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => toggleFile(file.id)}
                    className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                      checked ? 'border-foreground bg-muted' : 'border-border bg-background hover:bg-muted/30'
                    }`}
                  >
                    <span className="line-clamp-1 flex-1">{file.name}</span>
                    {checked ? <Check className="h-4 w-4" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
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
                {attaching ? 'Attaching...' : 'Attach'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
