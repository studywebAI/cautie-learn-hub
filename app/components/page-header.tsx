'use client';

import { useEffect, type ReactNode } from 'react';
import { usePageHeaderSlot } from '@/contexts/page-header-context';

// Renders nothing itself — registers this page's title/subtitle/actions
// into the persistent topbar (see app/(main)/layout.tsx) instead of each
// page floating its own <h1> inside scrolling content.
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  const { setContent } = usePageHeaderSlot();

  useEffect(() => {
    setContent(
      <div className="flex items-center justify-between gap-3 w-full min-w-0">
        <div className="min-w-0">
          <h1 className="page-title truncate">{title}</h1>
          {subtitle && <p className="page-subtitle truncate mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
      </div>
    );
    return () => setContent(null);
  });

  return null;
}
