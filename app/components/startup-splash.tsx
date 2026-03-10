'use client';

import { CautieWordmark } from './cautie-wordmark';

type StartupSplashProps = {
  visible: boolean;
};

export function StartupSplash({ visible }: StartupSplashProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center">
        <CautieWordmark animated textClassName="font-headline" />
      </div>
    </div>
  );
}

