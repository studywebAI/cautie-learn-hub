'use client';

import { ReactNode, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeviceTier } from '@/hooks/use-device-tier';
import { cn } from '@/lib/utils';

type WorkbenchShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  sidebar: ReactNode;
  topAccessory?: ReactNode;
  hideSidebar?: boolean;
};

export function WorkbenchShell({ title, description, children, sidebar, topAccessory, hideSidebar = false }: WorkbenchShellProps) {
  const deviceTier = useDeviceTier();
  const isPhone = deviceTier === 'phone';
  const isTablet = deviceTier === 'tablet';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative h-full overflow-hidden">
      <div className="flex h-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className={cn('flex items-center justify-between', isPhone ? 'px-3 pb-2 pt-3' : isTablet ? 'px-4 pb-2 pt-4' : 'px-5 pb-2 pt-5')}>
            <div>
              <h1 className="text-lg font-normal">{title}</h1>
              {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
            </div>
            {isPhone && !hideSidebar && (
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setSidebarOpen(true)}>
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className={cn('flex-1 min-h-0', isPhone ? 'px-3 pb-4' : isTablet ? 'px-4 pb-5' : 'px-5 pb-7')}>
            {topAccessory && <div className="mb-3">{topAccessory}</div>}
            {children}
          </div>
        </div>

        {!hideSidebar &&
          (isPhone ? (
            <>
              {sidebarOpen && <div className="fixed inset-0 z-40 bg-background/80" onClick={() => setSidebarOpen(false)} />}
              <div
                className={cn(
                  'fixed right-0 top-0 z-50 h-full w-[88vw] max-w-[320px] border-l border-sidebar-border bg-sidebar transition-transform duration-200',
                  sidebarOpen ? 'translate-x-0' : 'translate-x-full'
                )}
              >
                <div className="flex items-center justify-between border-b px-4 pb-2 pt-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Settings</p>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSidebarOpen(false)}>
                    Done
                  </Button>
                </div>
                <ScrollArea className="h-[calc(100%-44px)]">
                  <div className="space-y-5 p-4">{sidebar}</div>
                </ScrollArea>
              </div>
            </>
          ) : (
            <div className={cn('shrink-0 border-l border-sidebar-border bg-sidebar', isTablet ? 'w-[240px]' : 'w-[280px]')}>
              <ScrollArea className="h-full">
                <div className={cn('space-y-5', isTablet ? 'p-3.5' : 'p-4')}>{sidebar}</div>
              </ScrollArea>
            </div>
          ))}
      </div>
    </div>
  );
}
