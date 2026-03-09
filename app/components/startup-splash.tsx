'use client';

import { CautieWordmark } from './cautie-wordmark';

type StartupSplashProps = {
  visible: boolean;
};

export function StartupSplash({ visible }: StartupSplashProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/96 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <CautieWordmark animated className="scale-125" textClassName="font-headline" />
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">loading your workspace</p>
      </div>
    </div>
  );
}

