'use client';

import { CautieWordmark } from './cautie-wordmark';
import { SHOW_CAUTIE_LOGO } from '@/lib/branding';

type StartupSplashProps = {
  visible: boolean;
  onIntroAnimationDone?: () => void;
};

export function StartupSplash({ visible, onIntroAnimationDone }: StartupSplashProps) {
  console.log('[INTRO_SPLASH] Render', {
    visible,
    logoEnabled: SHOW_CAUTIE_LOGO,
  });

  if (!visible || !SHOW_CAUTIE_LOGO) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center">
        <CautieWordmark animated textClassName="font-headline" onAnimationDone={onIntroAnimationDone} />
      </div>
    </div>
  );
}

