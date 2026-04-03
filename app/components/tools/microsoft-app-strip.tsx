'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, Folder, Layers, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ENABLED_INTEGRATION_APPS } from '@/lib/integrations/catalog';

type MicrosoftStatus = {
  connected: boolean;
  account_email?: string;
};

type MicrosoftAppStripProps = {
  returnTo: string;
  autoOpen?: boolean;
  hideLauncher?: boolean;
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
  fallbackMode?: 'graph' | null;
};

type OneDrivePickedItem = {
  id: string;
  name: string;
  webUrl?: string;
  mimeType?: string;
  previewUrl?: string;
  driveId?: string;
  parentId?: string;
  downloadUrl?: string;
};
type GraphListItem = {
  id: string;
  name: string;
  webUrl?: string;
  mimeType?: string;
  previewUrl?: string;
  lastModifiedDateTime?: string;
  size?: number;
  isFolder?: boolean;
  isFile?: boolean;
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
type PickerFileFilter = 'all' | 'word' | 'powerpoint' | 'excel' | 'pdf' | 'image';

const ONEDRIVE_APP = ENABLED_INTEGRATION_APPS.find((app) => app.id === 'onedrive' && app.provider === 'microsoft');
const RESUME_KEY = 'cautie.onedrive.embed.resume';
const CAUTIE_LOGO_PATH = '/favicon.ico';

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
    const previewUrl =
      raw?.thumbnails?.[0]?.large?.url ||
      raw?.thumbnails?.[0]?.medium?.url ||
      raw?.thumbnails?.[0]?.small?.url ||
      undefined;
    const driveId = raw?.parentReference?.driveId || raw?.driveId || undefined;
    const parentId = raw?.parentReference?.id || raw?.parentId || undefined;
    const downloadUrl = raw?.['@microsoft.graph.downloadUrl'] || raw?.downloadUrl || undefined;
    out.push({ id, name, mimeType, webUrl, previewUrl, driveId, parentId, downloadUrl });
  }
  return out;
}

function matchesPickerFilter(item: OneDrivePickedItem, filter: PickerFileFilter) {
  if (filter === 'all') return true;
  const name = String(item.name || '').toLowerCase();
  const mime = String(item.mimeType || '').toLowerCase();
  if (filter === 'word') {
    return name.endsWith('.doc') || name.endsWith('.docx') || mime.includes('wordprocessingml') || mime === 'application/msword';
  }
  if (filter === 'powerpoint') {
    return name.endsWith('.ppt') || name.endsWith('.pptx') || mime.includes('presentationml') || mime === 'application/vnd.ms-powerpoint';
  }
  if (filter === 'excel') {
    return name.endsWith('.xls') || name.endsWith('.xlsx') || mime.includes('spreadsheetml') || mime === 'application/vnd.ms-excel';
  }
  if (filter === 'pdf') {
    return name.endsWith('.pdf') || mime === 'application/pdf';
  }
  if (filter === 'image') {
    return mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(name);
  }
  return true;
}

function fallbackTypeLabel(item: GraphListItem) {
  const name = item.name.toLowerCase();
  const mime = (item.mimeType || '').toLowerCase();
  if (name.endsWith('.pdf') || mime === 'application/pdf') return 'PDF';
  if (name.endsWith('.doc') || name.endsWith('.docx') || mime.includes('wordprocessingml') || mime === 'application/msword') return 'Word';
  if (name.endsWith('.ppt') || name.endsWith('.pptx') || mime.includes('presentationml') || mime === 'application/vnd.ms-powerpoint') return 'PowerPoint';
  if (name.endsWith('.xls') || name.endsWith('.xlsx') || mime.includes('spreadsheetml') || mime === 'application/vnd.ms-excel') return 'Excel';
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(name)) return 'Image';
  if (name.includes('.')) return name.split('.').pop()?.toUpperCase() || 'File';
  return 'File';
}

export function MicrosoftAppStrip({ returnTo, autoOpen = false, hideLauncher = false }: MicrosoftAppStripProps) {
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
  const [activeFilter, setActiveFilter] = useState<PickerFileFilter>('all');
  const [fallbackMode, setFallbackMode] = useState<'none' | 'graph'>('none');
  const [fallbackFiles, setFallbackFiles] = useState<GraphListItem[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [selectedFallbackIds, setSelectedFallbackIds] = useState<string[]>([]);
  const [fallbackSource, setFallbackSource] = useState<'all' | 'files' | 'recent'>('all');

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
    setFallbackMode('none');
    setFallbackFiles([]);
    setSelectedFallbackIds([]);
    setFallbackSource('all');
    if (portRef.current) {
      try {
        portRef.current.close();
      } catch {
        // no-op
      }
      portRef.current = null;
    }
  }, []);

  const loadFallbackFiles = useCallback(async (source: 'all' | 'files' | 'recent' = 'all') => {
    setFallbackLoading(true);
    try {
      const response = await fetch(`/api/integrations/microsoft/files?kind=onedrive&source=${source}`, { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      const items = Array.isArray(json?.items) ? json.items : [];
      const mapped: GraphListItem[] = items
        .map((item: any) => ({
          id: String(item?.id || ''),
          name: String(item?.name || 'Untitled'),
          webUrl: item?.webUrl ? String(item.webUrl) : undefined,
          mimeType: item?.mimeType ? String(item.mimeType) : undefined,
          previewUrl: item?.previewUrl ? String(item.previewUrl) : undefined,
          lastModifiedDateTime: item?.lastModifiedDateTime ? String(item.lastModifiedDateTime) : undefined,
          size: typeof item?.size === 'number' ? item.size : undefined,
          isFolder: Boolean(item?.isFolder),
          isFile: Boolean(item?.isFile),
        }))
        .filter((item: GraphListItem) => Boolean(item.id));
      setFallbackFiles(mapped);
      setSelectedFallbackIds([]);
    } finally {
      setFallbackLoading(false);
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

  const persistSelection = useCallback(async (items: OneDrivePickedItem[]) => {
    const extractRes = await fetch('/api/integrations/microsoft/files/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          kind: 'onedrive',
          webUrl: item.webUrl,
          mimeType: item.mimeType,
        })),
      }),
    }).catch(() => null);
    const extractJson = await extractRes?.json().catch(() => ({}));
    const extractedMap = new Map<string, { extractedText?: string; mimeType?: string; webUrl?: string; previewUrl?: string }>();
    const extractedItems = Array.isArray(extractJson?.items) ? extractJson.items : [];
    for (const extractedItem of extractedItems) {
      const id = String(extractedItem?.id || '');
      if (!id) continue;
      extractedMap.set(id, {
        extractedText: typeof extractedItem?.extractedText === 'string' ? extractedItem.extractedText : '',
        mimeType: typeof extractedItem?.mimeType === 'string' ? extractedItem.mimeType : undefined,
        webUrl: typeof extractedItem?.webUrl === 'string' ? extractedItem.webUrl : undefined,
        previewUrl: typeof extractedItem?.previewUrl === 'string' ? extractedItem.previewUrl : undefined,
      });
    }
    const enrichedItems = items.map((item) => {
      const extracted = extractedMap.get(item.id);
      const extractedText = extracted?.extractedText || '';
      return {
        ...item,
        mimeType: extracted?.mimeType || item.mimeType,
        webUrl: extracted?.webUrl || item.webUrl,
        extractedText,
        previewUrl: extracted?.previewUrl || item.previewUrl,
        extractionStatus: extractedText.trim() ? 'ready' : 'error',
      };
    });

    // Reflect extraction result in UI immediately (no refresh required).
    window.dispatchEvent(new CustomEvent('integration-source-picked', {
      detail: { provider: 'microsoft', app: 'onedrive', items: enrichedItems },
    }));

    const saveRes = await fetch('/api/integrations/context-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'microsoft',
        app: 'onedrive',
        items: enrichedItems,
        replaceSelection: true,
      }),
    });

    if (!saveRes.ok) {
      const payload = await saveRes.json().catch(() => ({}));
      const message = typeof payload?.error === 'string' ? payload.error : 'Failed to save selected file';
      if (message.toLowerCase().includes('integration source storage is not set up')) {
        window.dispatchEvent(new CustomEvent('integration-source-picked', {
          detail: { provider: 'microsoft', app: 'onedrive', items: enrichedItems },
        }));
        window.dispatchEvent(new CustomEvent('integration-sources-updated', { detail: { provider: 'microsoft', localOnly: true } }));
        return;
      }
      throw new Error(message);
    }

    await fetch('/api/integrations/ingestion-jobs/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'microsoft', app: 'onedrive', maxJobs: 25 }),
    }).catch(() => null);

    window.dispatchEvent(new CustomEvent('integration-sources-updated', { detail: { provider: 'microsoft' } }));
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
    if (searchParams.get('ms') || searchParams.get('ms_error')) return;
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

    let connectedNow = status.connected;
    if (!connectedNow) {
      try {
        const statusRes = await fetch('/api/integrations/microsoft/status', { cache: 'no-store' });
        if (statusRes.ok) {
          const statusJson = await statusRes.json().catch(() => ({}));
          connectedNow = Boolean(statusJson?.connected);
          if (connectedNow) {
            setStatus({
              connected: true,
              account_email: statusJson?.account_email ? String(statusJson.account_email) : undefined,
            });
          }
        }
      } catch {
        // fall through to connect redirect decision below
      }
    }

    if (!connectedNow) {
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
      const forceGraphPreviewPicker = true;
      if (forceGraphPreviewPicker || bootstrap.fallbackMode === 'graph') {
        setFallbackMode('graph');
        setPickerStatus('Ready to select');
        setFallbackSource('all');
        await loadFallbackFiles('all');
        return;
      }
      setFallbackMode('none');
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
              const filteredItems = items.filter((item) => matchesPickerFilter(item, activeFilter));
              if (filteredItems.length === 0) {
                throw new Error(`No selected files match filter: ${activeFilter}.`);
              }

              port.postMessage({ type: 'result', id: commandEnvelopeId, data: { result: 'success' } });
              // Close picker immediately and let extraction continue in the background.
              window.dispatchEvent(new CustomEvent('integration-source-picked', {
                detail: {
                  provider: 'microsoft',
                  app: 'onedrive',
                  items: filteredItems.map((item) => ({
                    ...item,
                    extractedText: '',
                    extractionStatus: 'pending',
                  })),
                },
              }));
              closePicker();
              void persistSelection(filteredItems)
                .then(() => {
                  toast({ title: 'File imported', description: `${filteredItems[0].name} added as context.` });
                })
                .catch((error: any) => {
                  const message = String(error?.message || 'Failed to import selected file');
                  toast({ variant: 'destructive', title: 'Import failed', description: message });
                });
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
  }, [activeFilter, closePicker, loadFallbackFiles, persistSelection, safeReturnTo, status.connected, toast]);

  useEffect(() => {
    if (!autoOpen) return;
    if (pickerOpen || opening) return;
    void openEmbeddedPicker();
  }, [autoOpen, openEmbeddedPicker, opening, pickerOpen]);

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
      {!hideLauncher && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void openEmbeddedPicker()}
            disabled={opening}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d1d1d1] bg-white p-0 transition-colors hover:bg-[#f6f6f6] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="OneDrive"
          >
            {opening ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <img src={ONEDRIVE_APP.logoPath} alt="OneDrive" className="h-5 w-5 object-contain" />
            )}
          </button>
        </div>
      )}

      {pickerOpen && (
        <div className="mx-auto flex min-h-[620px] max-h-[78vh] w-full max-w-[1020px] flex-1 flex-col overflow-hidden rounded-lg border border-[#d9d9d9] bg-[#f3f2f1]">
          <div className="flex items-center justify-between border-b border-[#e1dfdd] bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <img src={ONEDRIVE_APP.logoPath} alt="OneDrive" className="h-4 w-4 object-contain" />
              <span className="text-sm font-medium">OneDrive</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm text-muted-foreground">Cautie</span>
              <img src={CAUTIE_LOGO_PATH} alt="Cautie" className="h-4 w-4 rounded-sm object-contain" />
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
          {pickerStatus !== 'Ready to select' && (
            <div className="flex items-center gap-2 border-b border-[#e1dfdd] bg-white px-3 py-1.5 text-xs text-muted-foreground">
              {pickerStatus === 'Ready to use in Cautie' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Loader2 className={`h-3.5 w-3.5 ${pickerStatus === 'Import failed' ? 'hidden' : 'animate-spin'}`} />}
              <span>{pickerStatus}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1 border-b border-[#e1dfdd] bg-white px-3 py-1.5 text-xs">
            <span className="mr-1 text-muted-foreground">Filter:</span>
            {([
              ['all', 'All'],
              ['word', 'Word'],
              ['powerpoint', 'PowerPoint'],
              ['excel', 'Excel'],
              ['pdf', 'PDF'],
              ['image', 'Image'],
            ] as Array<[PickerFileFilter, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveFilter(value)}
                className={`rounded-full border px-2 py-0.5 ${
                  activeFilter === value
                    ? 'border-[#0f6cbd] bg-[#e8f2fc] text-[#0f6cbd]'
                    : 'border-[#d1d1d1] bg-white text-[#323130]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {authTransitioning && (
            <div className="border-b border-[#e1dfdd] bg-[#faf9f8] px-3 py-2 text-xs text-[#605e5c]">
              Continuing to Microsoft sign-in and returning here automatically.
            </div>
          )}
          <div className="min-h-0 flex-1 bg-white">
            {fallbackMode === 'graph' ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-[#e1dfdd] px-3 py-2 text-xs text-muted-foreground">
                  <span />
                  <button
                    type="button"
                    onClick={() => void loadFallbackFiles(fallbackSource)}
                    className="rounded border border-[#d1d1d1] px-2 py-0.5"
                  >
                    Refresh
                  </button>
                </div>
                <div className="min-h-0 flex flex-1">
                  <aside className="flex w-20 flex-col items-center gap-2 border-r border-[#e1dfdd] bg-[#fbfbfb] py-2">
                    {([
                      ['all', 'All', Layers],
                      ['files', 'Files', Folder],
                      ['recent', 'Recent', Clock3],
                    ] as Array<['all' | 'files' | 'recent', string, any]>).map(([value, label, Icon]) => (
                      <button
                        key={value}
                        type="button"
                        title={label}
                        onClick={() => {
                          setFallbackSource(value);
                          void loadFallbackFiles(value);
                        }}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-md border ${
                          fallbackSource === value
                            ? 'border-[#0f6cbd] bg-[#e8f2fc] text-[#0f6cbd]'
                            : 'border-transparent text-[#605e5c] hover:bg-[#f3f2f1]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </aside>
                  <div className="min-h-0 flex-1 overflow-auto p-2">
                    {fallbackLoading ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {fallbackFiles
                          .filter((file) => file.isFile === true && !file.isFolder)
                          .filter((file) => matchesPickerFilter({
                            id: file.id,
                            name: file.name,
                            mimeType: file.mimeType,
                            webUrl: file.webUrl,
                          }, activeFilter))
                          .map((file) => {
                            const selected = selectedFallbackIds.includes(file.id);
                            return (
                              <button
                                key={file.id}
                                type="button"
                                onClick={() =>
                                  setSelectedFallbackIds((prev) =>
                                    prev.includes(file.id) ? prev.filter((id) => id !== file.id) : [...prev, file.id]
                                  )
                                }
                                className={`text-left rounded-lg border p-2 transition ${
                                  selected
                                    ? 'border-[#0f6cbd] bg-[#e8f2fc]'
                                    : 'border-[#e1dfdd] bg-white hover:bg-[#f7f7f7]'
                                }`}
                              >
                                <div className="relative mb-2 h-24 overflow-hidden rounded-md bg-[#f3f2f1]">
                                  {file.previewUrl ? (
                                    <>
                                      <img
                                        src={file.previewUrl}
                                        alt={`${file.name} preview`}
                                        className="h-full w-full object-cover object-top [transform:scale(1.1)] [transform-origin:top_center]"
                                      />
                                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent px-1 py-0.5">
                                        <span className="text-[9px] font-medium text-white/95">CAUTIE</span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                                      No preview
                                    </div>
                                  )}
                                </div>
                                <p className="truncate text-xs font-medium">{file.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {fallbackTypeLabel(file)} • {file.lastModifiedDateTime ? new Date(file.lastModifiedDateTime).toLocaleDateString() : '-'}
                                </p>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-[#e1dfdd] px-3 py-2">
                  <button
                    type="button"
                    className="rounded border border-[#d1d1d1] px-3 py-1 text-sm"
                    onClick={closePicker}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={selectedFallbackIds.length === 0}
                    className="rounded border border-[#0f6cbd] bg-[#0f6cbd] px-3 py-1 text-sm text-white disabled:opacity-50"
                    onClick={async () => {
                      const files = fallbackFiles.filter((f) => selectedFallbackIds.includes(f.id));
                      if (files.length === 0) return;
                      setPickerStatus('Importing selected file');
                      try {
                        window.dispatchEvent(new CustomEvent('integration-source-picked', {
                          detail: {
                            provider: 'microsoft',
                            app: 'onedrive',
                            items: files.map((file) => ({
                              id: file.id,
                              name: file.name,
                              webUrl: file.webUrl,
                              mimeType: file.mimeType,
                              previewUrl: file.previewUrl,
                              extractedText: '',
                              extractionStatus: 'pending',
                            })),
                          },
                        }));
                        closePicker();
                        await persistSelection(files.map((file) => ({
                          id: file.id,
                          name: file.name,
                          webUrl: file.webUrl,
                          mimeType: file.mimeType,
                          previewUrl: file.previewUrl,
                        })));
                        setPickerStatus('Ready to use in Cautie');
                        // Silent success: context files are reflected in the source cards without a toast.
                      } catch (error: any) {
                        setPickerStatus('Import failed');
                        toast({ variant: 'destructive', title: 'Import failed', description: String(error?.message || 'Failed to import selected file') });
                      }
                    }}
                  >
                    Select
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                ref={frameRef}
                title="Embedded OneDrive picker"
                className="h-full w-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
