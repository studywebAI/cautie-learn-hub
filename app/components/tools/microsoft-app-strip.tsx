'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ENABLED_INTEGRATION_APPS } from '@/lib/integrations/catalog';

type MicrosoftStatus = {
  connected: boolean;
  account_email?: string;
};

type MicrosoftAppStripProps = {
  returnTo: string;
};

type OneDriveSdkSelection = {
  id?: string;
  name?: string;
  webUrl?: string;
  link?: string;
  mimeType?: string;
  file?: { mimeType?: string };
};

type PickerConfigResponse = {
  clientId: string;
  redirectUri: string;
  accessToken?: string | null;
  loginHint?: string | null;
  endpointHint?: string | null;
  scope?: string | null;
  isConsumerAccount?: boolean | null;
  tokenExpiresAt?: string | null;
};

declare global {
  interface Window {
    OneDrive?: {
      open: (options: Record<string, any>) => void;
    };
  }
}

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

function newTraceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeErrorMessage(error: any) {
  return String(
    error?.message ||
    error?.error?.message ||
    error?.error_description ||
    error?.statusText ||
    'Picker failed'
  );
}

export function MicrosoftAppStrip({ returnTo }: MicrosoftAppStripProps) {
  const [status, setStatus] = useState<MicrosoftStatus>({ connected: false });
  const [openingOfficialPicker, setOpeningOfficialPicker] = useState(false);
  const [pendingPickerApp, setPendingPickerApp] = useState<string | null>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const sessionTraceId = useRef(newTraceId());
  const logSeq = useRef(0);
  const bootAtMs = useRef(Date.now());

  const reportServerLog = useCallback((level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown> = {}) => {
    if (typeof window === 'undefined') return;
    const payload = {
      level,
      event,
      sessionTraceId: sessionTraceId.current,
      pickerTraceId: typeof data.traceId === 'string' ? data.traceId : null,
      appId: typeof data.appId === 'string' ? data.appId : null,
      path: pathname,
      at: new Date().toISOString(),
      data,
      client: {
        href: window.location.href,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent || null,
        visibilityState: document.visibilityState,
        online: navigator.onLine,
        language: navigator.language || null,
      },
    };
    fetch('/api/integrations/microsoft/picker-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => null);
  }, [pathname]);

  const log = useCallback((event: string, data: Record<string, unknown> = {}, level: 'info' | 'warn' | 'error' = 'info') => {
    const seq = ++logSeq.current;
    const elapsedMs = Date.now() - bootAtMs.current;
    const payload = {
      event,
      seq,
      sessionTraceId: sessionTraceId.current,
      path: pathname,
      at: new Date().toISOString(),
      elapsedMs,
      ...data,
    };

    if (level === 'error') {
      console.error('[ms-picker-client]', payload);
    } else if (level === 'warn') {
      console.warn('[ms-picker-client]', payload);
    } else {
      console.info('[ms-picker-client]', payload);
    }
    reportServerLog(level, event, { seq, elapsedMs, ...data });
  }, [pathname, reportServerLog]);

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

  useEffect(() => {
    log('component-mounted', {
      returnTo,
      pathname,
      search: searchParams.toString(),
      appCount: APPS.length,
    });

    const onError = (event: ErrorEvent) => {
      log('window-error', {
        message: event.message || 'unknown',
        filename: event.filename || null,
        line: event.lineno || null,
        col: event.colno || null,
      }, 'error');
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      let reason = 'unknown';
      try {
        reason = typeof event.reason === 'string' ? event.reason : JSON.stringify(event.reason);
      } catch {
        reason = String(event.reason || 'unknown');
      }
      log('window-unhandledrejection', { reason }, 'error');
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection as any);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection as any);
      log('component-unmounted');
    };
  }, [log, pathname, returnTo, searchParams]);

  const loadStatus = useCallback(async () => {
    try {
      log('status-load-start');
      const response = await fetch('/api/integrations/microsoft/status', { cache: 'no-store' });
      if (!response.ok) {
        log('status-load-non-ok', { status: response.status });
        setStatus({ connected: false });
        return;
      }
      const json = await response.json();
      const nextStatus = {
        connected: Boolean(json?.connected),
        account_email: json?.account_email ? String(json.account_email) : undefined,
      };
      setStatus(nextStatus);
      log('status-load-success', { connected: nextStatus.connected, accountEmail: nextStatus.account_email || null });
    } catch (error: any) {
      log('status-load-error', { message: String(error?.message || 'unknown') });
      setStatus({ connected: false });
    }
  }, [log]);

  const loadOneDriveSdk = useCallback(async (traceId: string) => {
    if (typeof window === 'undefined') {
      log('sdk-load-skip-ssr', { traceId });
      return false;
    }
    if (window.OneDrive?.open) {
      log('sdk-load-already-ready', { traceId });
      return true;
    }

    const id = 'onedrive-sdk-v72';
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      log('sdk-load-existing-script', { traceId });
      await new Promise<void>((resolve, reject) => {
        if (window.OneDrive?.open) {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load OneDrive SDK')), { once: true });
      });
      const ready = Boolean(window.OneDrive?.open);
      log('sdk-load-existing-script-finished', { traceId, ready });
      return ready;
    }

    log('sdk-load-inject-start', { traceId });
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.id = id;
      script.src = 'https://js.live.net/v7.2/OneDrive.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load OneDrive SDK'));
      document.head.appendChild(script);
    });

    const ready = Boolean(window.OneDrive?.open);
    log('sdk-load-inject-finished', { traceId, ready });
    return ready;
  }, [log]);

  const attachFromPickerItems = useCallback(async (appId: string, items: OneDriveSdkSelection[], traceId: string) => {
    const normalized = items
      .map((item) => ({
        id: String(item.id || ''),
        name: String(item.name || 'Untitled'),
        mimeType: item.mimeType || item.file?.mimeType,
        webUrl: item.webUrl || item.link,
      }))
      .filter((item) => item.id);

    log('attach-normalize-finished', {
      traceId,
      appId,
      inputCount: items.length,
      normalizedCount: normalized.length,
    });

    if (normalized.length === 0) {
      toast({ variant: 'destructive', title: 'No file selected', description: 'Picker returned no usable file items.' });
      return;
    }

    const saveResponse = await fetch('/api/integrations/context-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'microsoft',
        app: appId,
        items: normalized,
        replaceSelection: true,
      }),
    });

    if (!saveResponse.ok) {
      const payload = await saveResponse.json().catch(() => ({}));
      const message = typeof payload?.error === 'string' ? payload.error : 'Failed to attach files';
      log('attach-save-failed', { traceId, appId, status: saveResponse.status, message });
      throw new Error(message);
    }

    log('attach-save-success', { traceId, appId, count: normalized.length });

    await fetch('/api/integrations/ingestion-jobs/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'microsoft', app: appId, maxJobs: 25 }),
    }).catch((error: any) => {
      log('attach-process-jobs-non-fatal-error', {
        traceId,
        appId,
        message: String(error?.message || 'unknown'),
      });
      return null;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('integration-sources-updated', { detail: { provider: 'microsoft' } }));
    }
    toast({ title: 'Context attached', description: `${normalized.length} file${normalized.length === 1 ? '' : 's'} added.` });
    log('attach-complete', { traceId, appId, count: normalized.length });
  }, [log, toast]);

  const openOfficialPicker = useCallback(async (appId: string) => {
    const traceId = newTraceId();
    setOpeningOfficialPicker(true);
    log('open-picker-start', { traceId, appId, connected: status.connected });

    try {
      const sdkReady = await loadOneDriveSdk(traceId);
      if (!sdkReady || !window.OneDrive?.open) {
        throw new Error('OneDrive picker SDK unavailable');
      }

      log('picker-config-fetch-start', { traceId, appId });
      const configUrl = `/api/integrations/microsoft/picker-config?traceId=${encodeURIComponent(traceId)}&app=${encodeURIComponent(appId)}`;
      const configFetchStart = Date.now();
      const configResponse = await fetch(configUrl, { cache: 'no-store' });
      log('picker-config-fetch-response', {
        traceId,
        appId,
        status: configResponse.status,
        ok: configResponse.ok,
        durationMs: Date.now() - configFetchStart,
      });
      if (!configResponse.ok) {
        const payload = await configResponse.json().catch(() => ({}));
        log('picker-config-fetch-non-ok-payload', {
          traceId,
          appId,
          payloadKeys: Object.keys(payload || {}),
        }, 'warn');
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to get Microsoft picker config');
      }

      const config = await configResponse.json() as PickerConfigResponse;
      if (!config?.clientId || !config?.redirectUri) {
        throw new Error('Microsoft picker config incomplete');
      }
      const filter = appId === 'word' ? '.doc,.docx' : appId === 'powerpoint' ? '.ppt,.pptx' : '';

      log('picker-config-fetch-success', {
        traceId,
        appId,
        redirectUri: config.redirectUri,
        hasClientId: Boolean(config.clientId),
        hasAccessToken: Boolean(config.accessToken),
        hasLoginHint: Boolean(config.loginHint),
        hasEndpointHint: Boolean(config.endpointHint),
        isConsumerAccount: config.isConsumerAccount ?? null,
        tokenExpiresAt: config.tokenExpiresAt || null,
        filter: filter || null,
      });

      const scopeSet = new Set(
        String(config.scope || '')
          .split(/\s+/)
          .map((scope) => scope.trim().toLowerCase())
          .filter(Boolean)
      );
      const hasFilesReadAll = scopeSet.has('files.read.all');
      if (!hasFilesReadAll) {
        const returnWithPicker = withQuery(safeReturnTo, { ms_picker: '1', app: appId });
        log('picker-scope-upgrade-required', {
          traceId,
          appId,
          scope: config.scope || null,
          missing: 'Files.Read.All',
          redirectTo: `/api/integrations/microsoft/connect?returnTo=${encodeURIComponent(returnWithPicker)}`,
        }, 'warn');
        toast({
          title: 'Microsoft consent needed',
          description: 'Please approve OneDrive file access once to continue.',
        });
        window.location.href = `/api/integrations/microsoft/connect?returnTo=${encodeURIComponent(returnWithPicker)}`;
        return;
      }

      const advancedBase: Record<string, any> = {
        redirectUri: config.redirectUri,
        filter: filter || undefined,
        queryParameters: 'select=id,name,size,webUrl,file,lastModifiedDateTime',
      };
      // Keep picker options minimal/official to avoid provider-side login-hint edge cases.
      if (typeof config.isConsumerAccount === 'boolean') advancedBase.isConsumerAccount = config.isConsumerAccount;

      const tokenModeEnabled = false;
      const canUseSuppliedToken = tokenModeEnabled && Boolean(config.accessToken && config.endpointHint);
      const advancedWithToken: Record<string, any> = { ...advancedBase };
      if (canUseSuppliedToken) {
        advancedWithToken.accessToken = config.accessToken;
        advancedWithToken.endpointHint = config.endpointHint;
      } else {
        log('picker-supplied-token-skipped', {
          traceId,
          appId,
          reason: !tokenModeEnabled
            ? 'token_mode_temporarily_disabled'
            : (!config.accessToken ? 'missing_access_token' : 'missing_endpoint_hint'),
          hasAccessToken: Boolean(config.accessToken),
          hasEndpointHint: Boolean(config.endpointHint),
        });
      }

      log('picker-open-options-ready', {
        traceId,
        appId,
        openInNewWindow: true,
        action: 'query',
        multiSelect: true,
        advancedKeysWithToken: Object.keys(advancedWithToken),
        advancedKeysBase: Object.keys(advancedBase),
        redirectUriHost: (() => {
          try {
            return new URL(config.redirectUri).host;
          } catch {
            return null;
          }
        })(),
      });

      const runPickerAttempt = async (attempt: 'with_token' | 'without_token', advanced: Record<string, any>) => {
        log('picker-attempt-start', { traceId, appId, attempt, advancedKeys: Object.keys(advanced) });
        await new Promise<void>((resolve, reject) => {
          const attemptStart = Date.now();
          const timeoutMs = 25_000;
          let done = false;

          const onMessage = (event: MessageEvent) => {
            let dataPreview: string | null = null;
            try {
              dataPreview = typeof event.data === 'string'
                ? event.data.slice(0, 220)
                : JSON.stringify(event.data).slice(0, 220);
            } catch {
              dataPreview = '[unserializable]';
            }
            log('picker-popup-postmessage', {
              traceId,
              appId,
              attempt,
              origin: event.origin,
              sourcePresent: Boolean(event.source),
              dataPreview,
            });
          };
          const onFocus = () => log('picker-window-focus', { traceId, appId, attempt });
          const onBlur = () => log('picker-window-blur', { traceId, appId, attempt });
          window.addEventListener('message', onMessage);
          window.addEventListener('focus', onFocus);
          window.addEventListener('blur', onBlur);

          const finish = () => {
            if (done) return;
            done = true;
            window.clearTimeout(timeout);
            window.removeEventListener('message', onMessage);
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('blur', onBlur);
          };

          const timeout = window.setTimeout(() => {
            log('picker-timeout-no-callback', {
              traceId,
              appId,
              attempt,
              timeoutMs,
              durationMs: Date.now() - attemptStart,
              hint: 'no_success_cancel_or_error_callback_received',
            }, 'error');
            finish();
            reject(new Error('Picker timeout (no callback from popup)'));
          }, timeoutMs);

          log('picker-open-invoked', {
            traceId,
            appId,
            attempt,
            durationSinceAttemptStartMs: Date.now() - attemptStart,
          });
          window.OneDrive?.open({
            clientId: config.clientId,
            action: 'query',
            multiSelect: true,
            openInNewWindow: true,
            advanced,
            success: async (result: any) => {
              finish();
              const values: OneDriveSdkSelection[] = Array.isArray(result?.value)
                ? result.value
                : Array.isArray(result?.files)
                  ? result.files
                  : Array.isArray(result)
                    ? result
                    : [];

              log('picker-success-callback', {
                traceId,
                appId,
                attempt,
                returnedCount: values.length,
                resultKeys: Object.keys(result || {}),
                hasAccessTokenInResult: Boolean(result?.accessToken),
                apiEndpoint: result?.apiEndpoint || null,
                durationMs: Date.now() - attemptStart,
              });

              try {
                await attachFromPickerItems(appId, values, traceId);
                resolve();
              } catch (error: any) {
                reject(new Error(String(error?.message || 'Attach failed')));
              }
            },
            cancel: () => {
              finish();
              log('picker-cancel-callback', { traceId, appId, attempt, durationMs: Date.now() - attemptStart });
              resolve();
            },
            error: (error: any) => {
              finish();
              const message = safeErrorMessage(error);
              log('picker-error-callback', {
                traceId,
                appId,
                attempt,
                message,
                durationMs: Date.now() - attemptStart,
                code: String(error?.code || error?.error?.code || ''),
                status: String(error?.status || error?.error?.status || ''),
                errorType: String(error?.error || ''),
                errorCode: String(error?.errorCode || ''),
                rawKeys: Object.keys(error || {}),
                rawJson: (() => {
                  try {
                    return JSON.stringify(error);
                  } catch {
                    return '[unserializable]';
                  }
                })(),
              }, 'error');
              reject(new Error(message));
            },
          });
        });
      };

      if (canUseSuppliedToken) {
        try {
          await runPickerAttempt('with_token', advancedWithToken);
        } catch (error: any) {
          log('picker-attempt-fallback-triggered', {
            traceId,
            appId,
            from: 'with_token',
            to: 'without_token',
            message: String(error?.message || 'unknown'),
          }, 'warn');
          await runPickerAttempt('without_token', advancedBase);
        }
      } else {
        await runPickerAttempt('without_token', advancedBase);
      }

      log('open-picker-finished', { traceId, appId });
    } catch (error: any) {
      const message = String(error?.message || 'Failed to open picker');
      log('open-picker-failed', { traceId, appId, message }, 'error');
      toast({ variant: 'destructive', title: 'Microsoft picker failed', description: message });
      throw error;
    } finally {
      setOpeningOfficialPicker(false);
    }
  }, [attachFromPickerItems, loadOneDriveSdk, log, status.connected, toast]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const ms = searchParams.get('ms');
    const msError = searchParams.get('ms_error');
    const msPicker = searchParams.get('ms_picker');
    const app = searchParams.get('app');
    const selectedApp = app && APPS.some((entry) => entry.id === app) ? app : APPS[0]?.id || 'word';

    if (!ms && !msError && !msPicker) return;

    log('oauth-return-query-detected', {
      ms: ms || null,
      msError: msError || null,
      msPicker: msPicker || null,
      app: app || null,
    });

    if (ms === 'connected') {
      toast({ title: 'Microsoft connected', description: 'Account linked.' });
      void loadStatus();
      if (msPicker === '1') {
        setPendingPickerApp(selectedApp);
        log('picker-open-deferred-after-oauth', {
          app: selectedApp,
          reason: 'requires_direct_user_interaction_for_popup',
        });
        toast({
          title: 'Ready to pick file',
          description: 'Click the Microsoft app button again to open the official picker.',
        });
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
      log('oauth-connect-failed', { msError });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('ms');
    params.delete('ms_error');
    params.delete('ms_picker');
    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(next);
  }, [loadStatus, log, pathname, router, searchParams, toast]);

  const openPicker = async (appId: string) => {
    log('picker-button-click', { appId, connected: status.connected });
    if (!status.connected) {
      const returnWithPicker = withQuery(safeReturnTo, { ms_picker: '1', app: appId });
      log('oauth-connect-redirect', { appId, returnWithPicker });
      window.location.href = `/api/integrations/microsoft/connect?returnTo=${encodeURIComponent(returnWithPicker)}`;
      return;
    }
    if (pendingPickerApp && pendingPickerApp === appId) {
      log('picker-button-click-after-defer', { appId });
      setPendingPickerApp(null);
    }
    await openOfficialPicker(appId);
  };

  return (
    <div className="flex items-center gap-3">
      {APPS.map((app) => (
        <button
          key={app.id}
          type="button"
          onClick={() => void openPicker(app.id)}
          disabled={openingOfficialPicker}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-sidebar-border bg-sidebar p-0 transition-transform hover:scale-[1.04] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={app.label}
        >
          {openingOfficialPicker ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <img src={app.logo} alt={app.label} className="h-9 w-9 object-contain" />
          )}
        </button>
      ))}
    </div>
  );
}
