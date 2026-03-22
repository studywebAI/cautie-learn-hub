'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type XhrWithDebugMeta = XMLHttpRequest & {
  __studywebDebugId?: number;
  __studywebDebugMethod?: string;
  __studywebDebugUrl?: string;
  __studywebDebugStart?: number;
  __studywebOriginalSetRequestHeader?: XMLHttpRequest['setRequestHeader'];
};

declare global {
  interface Window {
    __studywebRequestLoggerInstalled?: boolean;
    __studywebRequestCounter?: number;
    __studywebOriginalFetch?: typeof fetch;
    __studywebOriginalXhrOpen?: XMLHttpRequest['open'];
    __studywebOriginalXhrSend?: XMLHttpRequest['send'];
  }
}

const MAX_STACK_LINES = 10;
const GET_COALESCE_WINDOW_MS = 1200;
const inFlightGetRequests = new Map<string, { startedAt: number; promise: Promise<Response> }>();

function nextRequestId(): number {
  if (typeof window === 'undefined') return 0;
  window.__studywebRequestCounter = (window.__studywebRequestCounter || 0) + 1;
  return window.__studywebRequestCounter;
}

function getStack(): string {
  const raw = new Error().stack || '';
  return raw.split('\n').slice(2, 2 + MAX_STACK_LINES).join('\n');
}

function toUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function debugLog(label: string, payload?: Record<string, unknown>) {
  const now = new Date().toISOString();
  if (payload) {
    console.log(`[request-debug] ${label}`, { ts: now, ...payload });
    return;
  }
  console.log(`[request-debug] ${label}`, { ts: now });
}

function toAbsoluteUrl(url: string): string {
  if (typeof window === 'undefined') return url;
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
}

export function GlobalRequestLogger() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() || '';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.__studywebRequestLoggerInstalled) return;

    window.__studywebRequestLoggerInstalled = true;
    window.__studywebOriginalFetch = window.fetch.bind(window);
    window.__studywebOriginalXhrOpen = XMLHttpRequest.prototype.open;
    window.__studywebOriginalXhrSend = XMLHttpRequest.prototype.send;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const id = nextRequestId();
      const correlationId = `dbg-${Date.now()}-${id}`;
      const url = toUrl(input);
      const method = (init?.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') || 'GET').toUpperCase();
      const start = performance.now();
      const mergedHeaders = new Headers(init?.headers || (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined));
      mergedHeaders.set('x-debug-request-id', correlationId);
      mergedHeaders.set('x-debug-page-path', `${window.location.pathname}${window.location.search}`);
      const bodyPreview =
        typeof init?.body === 'string'
          ? init.body.slice(0, 300)
          : init?.body
          ? `[${Object.prototype.toString.call(init.body)}]`
          : null;
      debugLog(`fetch:start #${id}`, {
        id,
        method,
        url,
        correlationId,
        pathname: window.location.pathname,
        search: window.location.search,
        headers: Object.fromEntries(mergedHeaders.entries()),
        credentials: init?.credentials || 'same-origin',
        mode: init?.mode || 'cors',
        cache: init?.cache || 'default',
        bodyPreview,
        stack: getStack(),
      });

      try {
        const absoluteUrl = toAbsoluteUrl(url);
        const shouldCoalesce =
          method === 'GET' &&
          absoluteUrl.includes('/api/') &&
          !mergedHeaders.has('x-debug-no-coalesce');

        if (shouldCoalesce) {
          const now = Date.now();
          const existing = inFlightGetRequests.get(absoluteUrl);
          if (existing && now - existing.startedAt < GET_COALESCE_WINDOW_MS) {
            debugLog(`fetch:coalesced #${id}`, {
              id,
              method,
              url: absoluteUrl,
              correlationId,
              sourceRequestStartedAt: existing.startedAt,
            });
            const sharedResponse = await existing.promise;
            return sharedResponse.clone();
          }
        }

        const sharedPromise = window.__studywebOriginalFetch!(input as any, {
          ...init,
          headers: mergedHeaders,
        }).then((res) => res.clone());

        if (shouldCoalesce) {
          inFlightGetRequests.set(absoluteUrl, { startedAt: Date.now(), promise: sharedPromise });
          void sharedPromise.finally(() => {
            window.setTimeout(() => {
              const current = inFlightGetRequests.get(absoluteUrl);
              if (current?.promise === sharedPromise) {
                inFlightGetRequests.delete(absoluteUrl);
              }
            }, GET_COALESCE_WINDOW_MS);
          });
        }

        const response = await sharedPromise;
        debugLog(`fetch:end #${id}`, {
          id,
          method,
          url,
          correlationId,
          status: response.status,
          ok: response.ok,
          durationMs: Math.round((performance.now() - start) * 100) / 100,
        });
        return response;
      } catch (error) {
        debugLog(`fetch:error #${id}`, {
          id,
          method,
          url,
          correlationId,
          durationMs: Math.round((performance.now() - start) * 100) / 100,
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        });
        throw error;
      }
    };

    XMLHttpRequest.prototype.open = function patchedOpen(
      this: XhrWithDebugMeta,
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ) {
      this.__studywebDebugMethod = (method || 'GET').toUpperCase();
      this.__studywebDebugUrl = typeof url === 'string' ? url : url.toString();
      this.__studywebDebugId = nextRequestId();
      return window.__studywebOriginalXhrOpen!.call(this, method, url, async ?? true, username ?? null, password ?? null);
    };

    XMLHttpRequest.prototype.send = function patchedSend(this: XhrWithDebugMeta, body?: Document | XMLHttpRequestBodyInit | null) {
      const id = this.__studywebDebugId || nextRequestId();
      const correlationId = `dbg-${Date.now()}-${id}`;
      this.__studywebDebugStart = performance.now();
      try {
        this.setRequestHeader('x-debug-request-id', correlationId);
        this.setRequestHeader('x-debug-page-path', `${window.location.pathname}${window.location.search}`);
      } catch {
        // Ignore when browser disallows setting headers for a given request.
      }
      debugLog(`xhr:start #${id}`, {
        id,
        correlationId,
        method: this.__studywebDebugMethod || 'GET',
        url: this.__studywebDebugUrl || 'unknown',
        pathname: window.location.pathname,
        search: window.location.search,
        hasBody: body != null,
        stack: getStack(),
      });

      const onDone = () => {
        debugLog(`xhr:end #${id}`, {
          id,
          correlationId,
          method: this.__studywebDebugMethod || 'GET',
          url: this.__studywebDebugUrl || 'unknown',
          status: this.status,
          durationMs: Math.round((performance.now() - (this.__studywebDebugStart || performance.now())) * 100) / 100,
        });
      };

      this.addEventListener('loadend', onDone, { once: true });
      return window.__studywebOriginalXhrSend!.call(this, body as any);
    };

    debugLog('request logger installed', {
      location: window.location.href,
      userAgent: window.navigator.userAgent,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    debugLog('navigation', {
      pathname,
      search: search ? `?${search}` : '',
      href: `${window.location.origin}${pathname}${search ? `?${search}` : ''}`,
      stack: getStack(),
    });
  }, [pathname, search]);

  return null;
}
