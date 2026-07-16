"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useDeviceTier } from "@/hooks/use-device-tier";
import { usePathname } from "next/navigation";
import { AppErrorBoundary } from "@/components/ui/app-error-boundary";
import { ScheduledReminderChecker } from "@/components/scheduled-items/scheduled-reminder-checker";
import { DeadlineReminderChecker } from "@/components/scheduled-items/deadline-reminder-checker";
import { PageHeaderProvider, usePageHeaderSlot } from "@/contexts/page-header-context";
import { TopbarAccountMenu } from "@/components/topbar-account-menu";

// Persistent topbar: sidebar-collapse toggle + whatever the current page set
// via <PageHeader> on the left, account menu on the right — always visible,
// not just when a page has set a title, so the collapse toggle and account
// menu stay reachable everywhere (mirrors the reference UI: those controls
// live in the header, not pinned to the bottom of the nav rail).
function TopBar() {
    const { content } = usePageHeaderSlot();
    return (
        <div className="shrink-0 border-b border-border bg-background px-[var(--page-inline-padding)] py-2.5 flex items-center gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1 min-w-0">{content}</div>
            <TopbarAccountMenu />
        </div>
    );
}

const AppSidebar = dynamic(
    () => import("@/components/sidebar").then((m) => m.AppSidebar),
    { ssr: false }
);

const GlobalCommandPalette = dynamic(
    () => import("@/components/global-command-palette").then((m) => m.GlobalCommandPalette),
    { ssr: false }
);

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const deviceTier = useDeviceTier();
    const pathname = usePathname();
    const [routePulseVisible, setRoutePulseVisible] = useState(false);

    const isClassPage = pathname?.startsWith('/class/');
    const isToolPage = pathname?.startsWith('/tools/');
    const isTablet = deviceTier === "tablet";
    const isPhone = deviceTier === "phone";

    const [sidebarDefaultOpen] = useState(() => {
        if (typeof document === 'undefined') return false;
        const match = document.cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/);
        if (match) return match[1] === 'true';
        return true; // default: expanded
    });

    useEffect(() => {
        setRoutePulseVisible(true);
        const timer = window.setTimeout(() => setRoutePulseVisible(false), 120);
        return () => window.clearTimeout(timer);
    }, [pathname]);

    return (
        <SidebarProvider
            defaultOpen={isPhone ? false : sidebarDefaultOpen}
            style={{ "--sidebar-width": isTablet ? "15rem" : "16.5rem" } as React.CSSProperties}
        >
            <GlobalCommandPalette />
            <ScheduledReminderChecker />
            <DeadlineReminderChecker />
            {routePulseVisible && (
                <div className="pointer-events-none fixed inset-x-0 top-0 z-[210] h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            )}
            <Suspense fallback={null}>
                <AppSidebar />
            </Suspense>
            <PageHeaderProvider>
                <SidebarInset className="h-dvh bg-background relative text-[hsl(var(--sidebar-active-foreground))] transition-all duration-300 ease-in-out">
                    <TopBar />
                    <div
                      className={`${
                        isClassPage ? "flex-1 min-h-0 overflow-hidden" : "flex-1 min-h-0 overflow-auto"
                      } app-main-shell transition-all duration-300 ease-in-out ${
                        isClassPage
                          ? "app-main-shell--class"
                          : isToolPage
                            ? "app-main-shell--tool"
                            : "app-main-shell--page"
                      }`}
                    >
                        <AppErrorBoundary key={pathname || 'main'}>
                            {children}
                        </AppErrorBoundary>
                    </div>
                </SidebarInset>
            </PageHeaderProvider>
        </SidebarProvider>
    );
}
