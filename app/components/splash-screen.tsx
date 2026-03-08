'use client';

import { useContext } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';

export function SplashScreen() {
  const context = useContext(AppContext) as AppContextType | null;
  const session = context?.session;
  const email = session?.user?.email || '';
  const username = email ? email.split('@')[0] : 'guest';

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-opacity duration-500">
      <p className="text-2xl tracking-tight text-foreground lowercase font-normal">
        [cautie]
      </p>
      <p className="mt-4 text-sm text-muted-foreground lowercase">
        welcome, {username}
      </p>
    </div>
  );
}
