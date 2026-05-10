'use client';

import { ReactNode, useContext, useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeviceTier } from '@/hooks/use-device-tier';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';

type WorkbenchShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  sidebar: ReactNode;
  topAccessory?: ReactNode;
  hideSidebar?: boolean;
  breadcrumbIcon?: ReactNode;
};

export function WorkbenchShell({ title, description, children, sidebar, topAccessory, hideSidebar = false, breadcrumbIcon }: WorkbenchShellProps) {
  const context = useContext(AppContext) as AppContextType | null;
  const deviceTier = useDeviceTier();
  const isPhone = deviceTier === 'phone';
  const isTablet = deviceTier === 'tablet';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const profileName = useMemo(() => {
    if (typeof window !== 'undefined') {
      const savedDisplayName = String(window.localStorage.getItem('studyweb-display-name') || '').trim();
      if (savedDisplayName) return savedDisplayName;
    }
    const displayName = String((context?.session?.user?.user_metadata as any)?.display_name || '').trim();
    if (displayName) return displayName;
    const fullName = String((context?.session?.user?.user_metadata as any)?.full_name || '').trim();
    if (fullName) return fullName;
    const email = String(context?.session?.user?.email || '').trim();
    return email ? email.split('@')[0] : 'User';
  }, [context?.session?.user]);

  return (
    <div className="relative h-full w-full">
      <div className="flex h-full w-full flex-col">
        <div className="w-full border-b border-sidebar-border bg-sidebar">
          <div className="flex min-h-9 items-center justify-between px-3">
            <div>
              <div className="mb-0.5 flex items-center gap-1.5 text-[13px] font-normal leading-none text-[hsl(var(--sidebar-foreground))]">
                <button
                  type="button"
                  className="text-[var(--accent-brand)] hover:underline"
                  onClick={() => window.dispatchEvent(new Event('cautie:open-profile-menu'))}
                >
                  {profileName}
                </button>
                <span className="text-[hsl(var(--sidebar-foreground))]">&gt;</span>
                <span className="inline-flex items-center gap-1.5 text-[hsl(var(--sidebar-foreground))]">
                  {breadcrumbIcon ? <span className="text-[hsl(var(--sidebar-foreground))]">{breadcrumbIcon}</span> : null}
                  <span>{title}</span>
                </span>
              </div>
              <h1 className="sr-only">{title}</h1>
              {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
            </div>
            {isPhone && !hideSidebar && (
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setSidebarOpen(true)}>
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

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
