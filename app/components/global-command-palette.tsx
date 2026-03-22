'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const GlobalCommandPaletteDialog = dynamic(
  () =>
    import('@/components/global-command-palette-dialog').then(
      (m) => m.GlobalCommandPaletteDialog
    ),
  { ssr: false }
);

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const [shouldLoadDialog, setShouldLoadDialog] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShouldLoadDialog(true);
        setOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!shouldLoadDialog) return null;

  return <GlobalCommandPaletteDialog open={open} onOpenChange={setOpen} />;
}
