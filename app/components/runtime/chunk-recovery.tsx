'use client';

import { useEffect } from 'react';

const SW_CLEANUP_KEY = 'runtime.sw.cleanup.v1';
const CHUNK_RELOAD_KEY = 'runtime.chunk.reload.once.v1';

function isChunkScriptElement(target: EventTarget | null): target is HTMLScriptElement {
  if (!(target instanceof HTMLScriptElement)) return false;
  return typeof target.src === 'string' && target.src.includes('/_next/static/chunks/');
}

export function ChunkRecovery() {
  useEffect(() => {
    const cleanupStaleServiceWorkers = async () => {
      if (typeof window === 'undefined') return;
      if (window.localStorage.getItem(SW_CLEANUP_KEY) === 'done') return;

      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((reg) => reg.unregister()));
        }
      } catch {
        // Keep runtime resilient.
      }

      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          const staleKeys = keys.filter((key) => /workbox|precache|next-pwa|runtime/i.test(key));
          await Promise.all(staleKeys.map((key) => caches.delete(key)));
        }
      } catch {
        // Keep runtime resilient.
      }

      window.localStorage.setItem(SW_CLEANUP_KEY, 'done');
    };

    const recover = () => {
      if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return;
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
      window.location.reload();
    };

    const onError = (event: Event) => {
      if (isChunkScriptElement(event.target)) recover();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = String((event.reason as any)?.message || event.reason || '');
      if (/chunk|loading css chunk|loading chunk/i.test(message)) {
        recover();
      }
    };

    void cleanupStaleServiceWorkers();
    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}

