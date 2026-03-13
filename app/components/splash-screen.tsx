import { useContext, useState, useEffect } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLogo } from './cautie-logo';

export function SplashScreen() {
  const context = useContext(AppContext) as AppContextType | null;
  const session = context?.session;
  const email = session?.user?.email || '';
  const username = email ? email.split('@')[0] : 'guest';
  const [phase, setPhase] = useState<'hidden' | 'visible'>('hidden');

  useEffect(() => {
    // Start invisible, then reveal slowly
    const t = requestAnimationFrame(() => setPhase('visible'));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-opacity duration-1500 ease-out">
      <div
        className="transition-all duration-1500 ease-out"
        style={{
          opacity: phase === 'visible' ? 1 : 0,
          filter: phase === 'visible' ? 'none' : 'blur(4px)',
          transform: phase === 'visible' ? 'translateY(0)' : 'translateY(6px)',
        }}
      >
        <CautieLogo size="lg" />
      </div>
      <p
        className="mt-4 text-sm lowercase transition-all duration-300 delay-300"
        style={{
          color: phase === 'visible' ? 'hsl(var(--muted-foreground))' : 'hsl(var(--background))',
        }}
      >
        welcome, {username}
      </p>
    </div>
  );
}
