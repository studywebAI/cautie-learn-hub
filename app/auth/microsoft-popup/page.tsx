'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function MicrosoftPopupCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const ms = searchParams.get('ms');
    const msError = searchParams.get('ms_error');
    const msErrorCode = searchParams.get('ms_error_code');
    const target = searchParams.get('target') || '/tools/studyset';
    const safeTarget = target.startsWith('/') ? target : '/tools/studyset';

    const payload =
      ms === 'connected'
        ? ({ type: 'microsoft-oauth-result', status: 'connected' } as const)
        : ({
            type: 'microsoft-oauth-result',
            status: 'error',
            message: msError || 'Microsoft sign-in failed',
            code: msErrorCode || undefined,
          } as const);

    if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(payload, window.location.origin);
      } catch {
        // no-op
      }
      window.close();
      return;
    }

    // Fallback when popup context is unavailable.
    router.replace(safeTarget);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
      <p className="text-sm text-muted-foreground">Finalizing Microsoft sign-in...</p>
    </div>
  );
}

export default function MicrosoftPopupCallbackPage() {
  return (
    <Suspense fallback={null}>
      <MicrosoftPopupCallbackContent />
    </Suspense>
  );
}
