'use client';

import { ReactNode, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type WorkbenchShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  sidebar: ReactNode;
  topAccessory?: ReactNode;
};

export function WorkbenchShell({ title, description, children, sidebar, topAccessory }: WorkbenchShellProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-full overflow-hidden relative">
      <div className="flex h-full">
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-5 md:px-7 pt-5 pb-2 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-normal">{title}</h1>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
            {isMobile && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 px-5 md:px-7 pb-7">
            {topAccessory && <div className="mb-3">{topAccessory}</div>}
            {children}
          </div>
        </div>

        {/* Settings sidebar — desktop: always visible, mobile: slide-over */}
        {isMobile ? (
          <>
            {sidebarOpen && (
              <div className="fixed inset-0 bg-background/80 z-40" onClick={() => setSidebarOpen(false)} />
            )}
            <div className={cn(
              "fixed top-0 right-0 h-full w-[280px] bg-background border-l z-50 transition-transform duration-200",
              sidebarOpen ? "translate-x-0" : "translate-x-full"
            )}>
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Settings</p>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSidebarOpen(false)}>Done</Button>
              </div>
              <ScrollArea className="h-[calc(100%-44px)]">
                <div className="p-4 space-y-5">
                  {sidebar}
                </div>
              </ScrollArea>
            </div>
          </>
        ) : (
          <div className="w-[280px] shrink-0 border-l bg-muted/30">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-5">
                {sidebar}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
