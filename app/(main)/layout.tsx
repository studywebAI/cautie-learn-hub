"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { useDeviceTier } from "@/hooks/use-device-tier";
import { usePathname } from "next/navigation";
import { AppErrorBoundary } from "@/components/ui/app-error-boundary";
import { ScheduledReminderChecker } from "@/components/scheduled-items/scheduled-reminder-checker";
import { DeadlineReminderChecker } from "@/components/scheduled-items/deadline-reminder-checker";
import { PageHeaderProvider, usePageHeaderSlot } from "@/contexts/page-header-context";
import { TopbarAccountMenu } from "@/components/topbar-account-menu";
import { AppSidebar } from "@/components/sidebar";
import { GlobalCommandPalette } from "@/components/global-command-palette";

// Persistent topbar: sidebar-collapse toggle + whatever the current page set
// via <PageHeader> on the left, account menu on the right — always visible,
// not just when a page has set a title, so the collapse toggle and account
// menu stay reachable everywhere (mirrors the reference UI: those controls
// live in the header, not pinned to the bottom of the nav rail).
function CollapseToggle() {
    const { state, toggleSidebar } = useSidebar();
    const isCollapsed = state === 'collapsed';
    return (
        <button
            type="button"
            onClick={toggleSidebar}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
    );
}

function TopBar() {
    const { content } = usePageHeaderSlot();
    return (
        <div className="shrink-0 border-b border-border bg-background px-[var(--page-inline-padding)] py-2.5 flex items-center gap-3">
            <CollapseToggle />
            <div className="flex-1 min-w-0">{content}</div>
            <TopbarAccountMenu />
        </div>
    );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const deviceTier = useDeviceTier();
    const pathname = usePathname();
    const [routePulseVisible, setRoutePulseVisible] = useState(false);
    // AppSidebar/GlobalCommandPalette used to be next/dynamic(..., {ssr:false}),
    // which code-splits them into a SEPARATE chunk fetched at runtime — a
    // chunk that can go stale independently of the rest of the app (this is
    // what caused sidebar clicks to silently stop working: the browser kept
    // running an old cached copy of that one chunk while everything else
    // updated normally). Importing them statically bundles them with the
    // rest of this file instead, so they can never go stale on their own;
    // the mounted-gate below reproduces the same "client-only" render
    // behavior ssr:false gave us, without the separate fetch.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

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
            {mounted && <GlobalCommandPalette />}
            <ScheduledReminderChecker />
            <DeadlineReminderChecker />
            {routePulseVisible && (
                <div className="pointer-events-none fixed inset-x-0 top-0 z-[210] h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            )}
            {mounted && <AppSidebar />}
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
