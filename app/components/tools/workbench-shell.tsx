'use client';

import { ReactNode, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeviceTier } from '@/hooks/use-device-tier';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';

type WorkbenchShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  sidebar: ReactNode;
  topAccessory?: ReactNode;
  hideSidebar?: boolean;
  /** @deprecated title now renders in the persistent app topbar without an icon */
  breadcrumbIcon?: ReactNode;
};

export function WorkbenchShell({ title, description, children, sidebar, topAccessory, hideSidebar = false }: WorkbenchShellProps) {
  const deviceTier = useDeviceTier();
  const isPhone = deviceTier === 'phone';
  const isTablet = deviceTier === 'tablet';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative h-full w-full">
      {/* Registers title/subtitle into the persistent app topbar (see
          app/(main)/layout.tsx) instead of this component drawing its own
          separate breadcrumb bar — tool pages used to have a second, visually
          inconsistent header on top of the real one. */}
      <PageHeader
        title={title}
        subtitle={description}
        actions={
          isPhone && !hideSidebar ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          ) : undefined
        }
      />
      <div className="flex h-full w-full flex-col">
        <div className="flex min-h-0 flex-1 gap-2 px-0 py-1">
          <div className="flex min-w-0 flex-1 flex-col">
          <div className={cn('min-h-0 flex flex-1 flex-col', isPhone ? 'pl-3 pr-2 pb-1' : isTablet ? 'pl-3 pr-2 pb-1' : 'pl-3 pr-2 pb-1')}>
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
                  <p className="text-sm font-medium text-muted-foreground">Settings</p>
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
            <div className={cn('tool-right-rail shrink-0', isTablet ? 'w-[292px]' : 'w-[296px]')}>
              <ScrollArea className="h-full">
                <div className={cn('tool-right-rail-inner', isTablet ? 'p-3.5' : 'p-4')}>{sidebar}</div>
              </ScrollArea>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
