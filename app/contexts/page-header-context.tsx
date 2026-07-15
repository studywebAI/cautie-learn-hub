'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type PageHeaderContextType = {
  content: ReactNode;
  setContent: (content: ReactNode) => void;
};

const PageHeaderContext = createContext<PageHeaderContextType | null>(null);

// Holds whatever the current page wants shown in the persistent topbar.
// Lives above SidebarInset's scroll area in app/(main)/layout.tsx so the
// title stays put while page content scrolls underneath it.
export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null);
  return (
    <PageHeaderContext.Provider value={{ content, setContent }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeaderSlot(): PageHeaderContextType {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error('usePageHeaderSlot must be used within PageHeaderProvider');
  return ctx;
}
