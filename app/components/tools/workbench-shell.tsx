'use client';

import { ReactNode } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

type WorkbenchShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  sidebar: ReactNode;
};

export function WorkbenchShell({ title, description, children, sidebar }: WorkbenchShellProps) {
  return (
    <div className="h-full overflow-hidden">
      <div className="flex h-full">
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-6 pt-4 pb-2">
            <h1 className="text-lg font-normal">{title}</h1>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <div className="flex-1 min-h-0 px-6 pb-6">
            {children}
          </div>
        </div>

        {/* Settings sidebar — always visible, everything open */}
        <div className="w-[280px] shrink-0 border-l bg-muted/30">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-5">
              {sidebar}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
