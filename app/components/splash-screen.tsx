import { useContext, useState, useEffect } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLogoAnimation } from './cautie-logo-animation';

export function SplashScreen() {
  const context = useContext(AppContext) as AppContextType | null;
  const session = context?.session;
  const email = session?.user?.email || '';
  const username = email ? email.split('@')[0] : 'guest';
  const [animationComplete, setAnimationComplete] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!animationComplete) return;

    // Fade out splash screen after animation completes
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 600);

    return () => clearTimeout(fadeTimer);
  }, [animationComplete]);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-out"
      style={{
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      <div className="w-48 h-32">
        <CautieLogoAnimation
          onComplete={() => setAnimationComplete(true)}
          autoPlay={true}
        />
      </div>
      <p
        className="mt-8 text-sm lowercase transition-all duration-500"
        style={{
          color: 'hsl(var(--muted-foreground))',
          opacity: animationComplete ? 1 : 0,
        }}
      >
        welcome, {username}
      </p>
    </div>
  );
}
