'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ENABLED_INTEGRATION_APPS } from '@/lib/integrations/catalog';

type MicrosoftStatus = {
  connected: boolean;
  account_email?: string;
};

type MicrosoftAppStripProps = {
  returnTo: string;
};

type PickerBootstrapResponse = {
  channelId: string;
  kind: 'consumer' | 'sharepoint';
  baseUrl: string;
  action: string;
  options: {
    sdk: string;
    entry: Record<string, any>;
    authentication: Record<string, any>;
    messaging: {
      origin: string;
      channelId: string;
    };
  };
  accessToken: string;
  scope?: string | null;
  accountEmail?: string | null;
};

type OneDrivePickedItem = {
  id: string;
  name: string;
  webUrl?: string;
  mimeType?: string;
  driveId?: string;
  parentId?: string;
  downloadUrl?: string;
};

type PickerStatus =
  | 'Idle'
  | 'Signing in to your account'
  | 'Fetching files'
  | 'Loading picker'
  | 'Ready to select'
  | 'Importing selected file'
  | 'Ready to use in Cautie'
  | 'Import failed';

const ONEDRIVE_APP = ENABLED_INTEGRATION_APPS.find((app) => app.id === 'onedrive' && app.provider === 'microsoft');
const RESUME_KEY = 'cautie.onedrive.embed.resume';

function withQuery(path: string, params: Record<string, string>) {
  const [pathname, search = ''] = path.split('?');
  const next = new URLSearchParams(search);
  for (const [key, value] of Object.entries(params)) {
    next.set(key, value);
  }
  const encoded = next.toString();
  return encoded ? `${pathname}?${encoded}` : pathname;
}

function extractItems(input: any): OneDrivePickedItem[] {
  const candidates: any[] = [
    ...(Array.isArray(input?.items) ? input.items : []),
    ...(Array.isArray(input?.selection) ? input.selection : []),
    ...(Array.isArray(input?.value) ? input.value : []),
  ];
  const out: OneDrivePickedItem[] = [];
  for (const raw of candidates) {
    const id = String(raw?.id || raw?.itemId || '').trim();
    if (!id) continue;
    const name = String(raw?.name || 'Untitled');
    const mimeType = raw?.file?.mimeType || raw?.mimeType || raw?.type || undefined;
    const webUrl = raw?.webUrl || raw?.link || raw?.url || undefined;
    const driveId = raw?.parentReference?.driveId || raw?.driveId || undefined;
    const parentId = raw?.parentReference?.id || raw?.parentId || undefined;
    const downloadUrl = raw?.['@microsoft.graph.downloadUrl'] || raw?.downloadUrl || undefined;
    out.push({ id, name, mimeType, webUrl, driveId, parentId, downloadUrl });
  }
  return out;
}

export function MicrosoftAppStrip({ returnTo }: MicrosoftAppStripProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const portRef = useRef<MessagePort | null>(null);
  const bootstrapRef = useRef<PickerBootstrapResponse | null>(null);

  const [status, setStatus] = useState<MicrosoftStatus>({ connected: false });
  const [opening, setOpening] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStatus, setPickerStatus] = useState<PickerStatus>('Idle');
  const [authTransitioning, setAuthTransitioning] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [openAfterConnect, setOpenAfterConnect] = useState(false);

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

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setPickerStatus('Idle');
    if (portRef.current) {
      try {
        portRef.current.close();
      } catch {
        // no-op
      }
      portRef.current = null;
    }
  }, []);

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

  useEffect(() => {
    const ms = searchParams.get('ms');
    const msError = searchParams.get('ms_error');
    const msErrorCode = searchParams.get('ms_error_code');
    const msPicker = searchParams.get('ms_picker');
    if (!ms && !msError && !msPicker) return;

    if (ms === 'connected') {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(RESUME_KEY);
      setStatus((prev) => ({ ...prev, connected: true }));
      setAuthTransitioning(false);
      void loadStatus();
      if (msPicker === 'embed') {
        toast({ title: 'Microsoft connected', description: 'Opening OneDrive in Cautie.' });
        setOpenAfterConnect(true);
      }
    } else if (msError) {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(RESUME_KEY);
      setAuthTransitioning(false);
      const message = msErrorCode ? `${msError} (${msErrorCode})` : msError;
      toast({ title: 'Microsoft connection failed', description: message, variant: 'destructive' });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('ms');
    params.delete('ms_error');
    params.delete('ms_picker');
    params.delete('ms_error_code');
    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadStatus, pathname, router, searchParams, toast]);

  useEffect(() => {
    if (!status.connected || pickerOpen || opening) return;
    if (typeof window === 'undefined') return;
    const raw = window.sessionStorage.getItem(RESUME_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { returnTo?: string; ts?: number };
      const isFresh = typeof parsed?.ts === 'number' && Date.now() - parsed.ts < 5 * 60_000;
      const sameTarget = typeof parsed?.returnTo === 'string' && parsed.returnTo === safeReturnTo;
      if (isFresh && sameTarget) {
        window.sessionStorage.removeItem(RESUME_KEY);
        setAuthTransitioning(false);
        window.setTimeout(() => {
          void openEmbeddedPicker();
        }, 50);
      }
    } catch {
      window.sessionStorage.removeItem(RESUME_KEY);
    }
  }, [opening, pickerOpen, safeReturnTo, status.connected]);

  const openEmbeddedPicker = useCallback(async (options?: { allowConnectRedirect?: boolean }) => {
    const allowConnectRedirect = options?.allowConnectRedirect ?? true;
    if (!ONEDRIVE_APP) {
      toast({ variant: 'destructive', title: 'OneDrive is not enabled', description: 'Enable OneDrive in integration catalog.' });
      return;
    }

    if (!status.connected) {
      if (!allowConnectRedirect) {
        setPickerStatus('Import failed');
        return;
      }
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(RESUME_KEY, JSON.stringify({ returnTo: safeReturnTo, ts: Date.now() }));
      }
      setPickerOpen(true);
      setAuthTransitioning(true);
      setPickerStatus('Signing in to your account');
      const returnWithPicker = withQuery(safeReturnTo, { ms_picker: 'embed', app: 'onedrive' });
      window.setTimeout(() => {
        window.location.href = `/api/integrations/microsoft/connect?returnTo=${encodeURIComponent(returnWithPicker)}`;
      }, 180);
      return;
    }

    setAuthTransitioning(false);
    setOpening(true);
    setPickerOpen(true);
    setPickerStatus('Signing in to your account');

    try {
      const bootstrapRes = await fetch('/api/integrations/microsoft/picker/bootstrap', { cache: 'no-store' });
      if (!bootstrapRes.ok) {
        const payload = await bootstrapRes.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to initialize picker');
      }
      const bootstrap = await bootstrapRes.json() as PickerBootstrapResponse;
      bootstrapRef.current = bootstrap;
      setPickerStatus('Fetching files');

      const frame = frameRef.current;
      if (!frame) throw new Error('Picker surface is unavailable');
      const win = frame.contentWindow;
      if (!win) throw new Error('Picker host window unavailable');

      const initializeListener = async (event: MessageEvent) => {
        if (!bootstrapRef.current) return;
        if (event.source !== frame.contentWindow) return;
        const payload = event.data;
        if (payload?.type !== 'initialize') return;
        if (payload?.channelId !== bootstrapRef.current.channelId) return;

        const port = event.ports?.[0];
        if (!port) return;
        portRef.current = port;
        port.start();
        port.postMessage({ type: 'activate' });

        port.addEventListener('message', async (portEvent: MessageEvent) => {
          const envelope = portEvent.data;
          if (!envelope) return;

          if (envelope.type === 'notification') {
            if (envelope.data?.notification === 'page-loaded') {
              setPickerStatus('Ready to select');
            }
            return;
          }

          if (envelope.type !== 'command') return;
          const commandEnvelopeId = envelope.id;
          const command = envelope.data || {};

          port.postMessage({ type: 'acknowledge', id: commandEnvelopeId });

          if (command.command === 'authenticate') {
            try {
              const tokenRes = await fetch('/api/integrations/microsoft/picker/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  command: command.command,
                  resource: command.resource || null,
                  type: command.type || null,
                }),
              });
              const tokenPayload = await tokenRes.json().catch(() => ({}));
              if (!tokenRes.ok || !tokenPayload?.token) {
                throw new Error(typeof tokenPayload?.error === 'string' ? tokenPayload.error : 'Unable to obtain token');
              }
              port.postMessage({
                type: 'result',
                id: commandEnvelopeId,
                data: { result: 'token', token: tokenPayload.token },
              });
            } catch (error: any) {
              port.postMessage({
                type: 'result',
                id: commandEnvelopeId,
                data: {
                  result: 'error',
                  error: {
                    code: 'unableToObtainToken',
                    message: String(error?.message || 'Unable to obtain token'),
                  },
                },
              });
            }
            return;
          }

          if (command.command === 'pick') {
            setPickerStatus('Importing selected file');
            try {
              const items = extractItems(command);
              if (items.length === 0) throw new Error('No files were returned from OneDrive picker.');

              const saveRes = await fetch('/api/integrations/context-sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  provider: 'microsoft',
                  app: 'onedrive',
                  items,
                  replaceSelection: true,
                }),
              });
              if (!saveRes.ok) {
                const payload = await saveRes.json().catch(() => ({}));
                throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to save selected file');
              }

              await fetch('/api/integrations/ingestion-jobs/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: 'microsoft', app: 'onedrive', maxJobs: 25 }),
              }).catch(() => null);

              window.dispatchEvent(new CustomEvent('integration-sources-updated', { detail: { provider: 'microsoft' } }));
              setPickerStatus('Ready to use in Cautie');
              toast({ title: 'File imported', description: `${items[0].name} added as context.` });

              port.postMessage({ type: 'result', id: commandEnvelopeId, data: { result: 'success' } });
              window.setTimeout(() => closePicker(), 180);
            } catch (error: any) {
              setPickerStatus('Import failed');
              const message = String(error?.message || 'Failed to import selected file');
              toast({ variant: 'destructive', title: 'Import failed', description: message });
              port.postMessage({
                type: 'result',
                id: commandEnvelopeId,
                data: { result: 'error', error: { code: 'import_failed', message } },
              });
            }
            return;
          }

          if (command.command === 'close') {
            port.postMessage({ type: 'result', id: commandEnvelopeId, data: { result: 'success' } });
            closePicker();
            return;
          }

          port.postMessage({
            type: 'result',
            id: commandEnvelopeId,
            data: { result: 'error', error: { code: 'unsupportedCommand', message: 'Unsupported command' } },
          });
        });
      };

      window.addEventListener('message', initializeListener as unknown as EventListener);
      setPickerStatus('Loading picker');

      // Load picker via POST into iframe to keep the browsing experience embedded.
      win.document.open();
      win.document.write('<!doctype html><html><body style="margin:0"></body></html>');
      win.document.close();
      const form = win.document.createElement('form');
      form.setAttribute('method', 'POST');
      form.setAttribute('action', bootstrap.action);
      const tokenInput = win.document.createElement('input');
      tokenInput.setAttribute('type', 'hidden');
      tokenInput.setAttribute('name', 'access_token');
      tokenInput.setAttribute('value', bootstrap.accessToken);
      form.appendChild(tokenInput);
      win.document.body.appendChild(form);
      form.submit();

      window.setTimeout(() => {
        window.removeEventListener('message', initializeListener as unknown as EventListener);
      }, 45_000);
    } catch (error: any) {
      setPickerStatus('Import failed');
      toast({
        variant: 'destructive',
        title: 'OneDrive picker failed',
        description: String(error?.message || 'Unable to open picker'),
      });
      closePicker();
    } finally {
      setOpening(false);
    }
  }, [closePicker, safeReturnTo, status.connected, toast]);

  useEffect(() => {
    if (!openAfterConnect) return;
    if (!status.connected) return;
    setOpenAfterConnect(false);
    window.setTimeout(() => {
      void openEmbeddedPicker({ allowConnectRedirect: false });
    }, 40);
  }, [openAfterConnect, openEmbeddedPicker, status.connected]);

  const handleSwitchAccount = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(RESUME_KEY, JSON.stringify({ returnTo: safeReturnTo, ts: Date.now() }));
    }
    setSwitchingAccount(true);
    setPickerOpen(true);
    setAuthTransitioning(true);
    setPickerStatus('Signing in to your account');
    const returnWithPicker = withQuery(safeReturnTo, { ms_picker: 'embed', app: 'onedrive' });
    window.setTimeout(() => {
      window.location.href = `/api/integrations/microsoft/connect?switch_account=1&returnTo=${encodeURIComponent(returnWithPicker)}`;
    }, 140);
  }, [safeReturnTo]);

  useEffect(() => {
    if (!switchingAccount) return;
    if (searchParams.get('ms') === 'connected' || searchParams.get('ms_error')) {
      setSwitchingAccount(false);
    }
  }, [searchParams, switchingAccount]);

  if (!ONEDRIVE_APP) return null;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void openEmbeddedPicker()}
          disabled={opening}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[#d1d1d1] bg-white p-0 transition-colors hover:bg-[#f6f6f6] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="OneDrive"
        >
          {opening ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <img src={ONEDRIVE_APP.logoPath} alt="OneDrive" className="h-6 w-6 object-contain" />
          )}
        </button>

        <div className="min-w-0">
          <p className="text-sm font-medium">OneDrive in Cautie</p>
          <p className="text-xs text-muted-foreground">
            {status.connected
              ? `Connected${status.account_email ? ` as ${status.account_email}` : ''}`
              : 'Connect your Microsoft account to browse files'}
          </p>
          {status.connected && (
            <button
              type="button"
              onClick={handleSwitchAccount}
              className="mt-1 text-xs text-[#0f6cbd] hover:underline"
            >
              {switchingAccount ? 'Switching account...' : 'Switch account'}
            </button>
          )}
        </div>
      </div>

      {pickerOpen && (
        <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-lg border border-[#d9d9d9] bg-[#f3f2f1]">
          <div className="flex items-center justify-between border-b border-[#e1dfdd] bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <img src={ONEDRIVE_APP.logoPath} alt="OneDrive" className="h-4 w-4 object-contain" />
              <span className="text-sm font-medium">OneDrive</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-xs text-muted-foreground">Opened in Cautie</span>
            </div>
            <div className="flex items-center gap-2">
              {status.account_email ? (
                <span className="max-w-[220px] truncate text-xs text-muted-foreground">
                  Connected as {status.account_email}
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="rounded-md border border-[#d1d1d1] px-2 py-1 text-xs text-[#0f6cbd] hover:bg-[#f5f9fd]"
              >
                {switchingAccount ? 'Switching...' : 'Use another account'}
              </button>
              <button
                type="button"
                onClick={closePicker}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close picker"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-[#e1dfdd] bg-white px-3 py-1.5 text-xs text-muted-foreground">
            {pickerStatus === 'Ready to use in Cautie' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Loader2 className={`h-3.5 w-3.5 ${pickerStatus === 'Ready to select' || pickerStatus === 'Import failed' ? 'hidden' : 'animate-spin'}`} />}
            <span>{pickerStatus}</span>
          </div>
          {authTransitioning && (
            <div className="border-b border-[#e1dfdd] bg-[#faf9f8] px-3 py-2 text-xs text-[#605e5c]">
              Continuing to Microsoft sign-in and returning here automatically.
            </div>
          )}
          <div className="min-h-0 flex-1 bg-white">
            <iframe
              ref={frameRef}
              title="Embedded OneDrive picker"
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
            />
          </div>
        </div>
      )}
    </div>
  );
}
