'use client';

import { useState, useEffect } from 'react';
import { CautieLogoAnimation } from './cautie-logo-animation';
import { SHOW_CAUTIE_LOGO } from '@/lib/branding';

type StartupSplashProps = {
  visible: boolean;
  onIntroAnimationDone?: () => void;
};

export function StartupSplash({ visible, onIntroAnimationDone }: StartupSplashProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const hideTimer = setTimeout(() => {
      setFadeOut(true);
    }, 4000); // Hide after 4s (2.5s writing + 1.2s highlight + buffer)

    return () => clearTimeout(hideTimer);
  }, [visible]);

  if (!visible || !SHOW_CAUTIE_LOGO) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-start bg-background transition-opacity duration-500 ease-out"
      style={{
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      <div className="w-full h-full flex items-center justify-start pl-12">
        <div className="w-96 h-40">
          <CautieLogoAnimation
            onComplete={() => {
              onIntroAnimationDone?.();
            }}
            autoPlay={true}
          />
        </div>
      </div>
    </div>
  );
}

