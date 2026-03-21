"use client";

import { Suspense, useEffect, useState } from "react";
import { AppSidebar } from "@/components/sidebar";
import { GlobalCommandPalette } from "@/components/global-command-palette";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const pathname = usePathname();
    const [routePulseVisible, setRoutePulseVisible] = useState(false);

    const isClassPage = pathname?.startsWith('/class/');

    useEffect(() => {
        setRoutePulseVisible(true);
        const timer = window.setTimeout(() => setRoutePulseVisible(false), 120);
        return () => window.clearTimeout(timer);
    }, [pathname]);

    return (
        <SidebarProvider>
            <GlobalCommandPalette />
            {routePulseVisible && (
                <div className="pointer-events-none fixed inset-x-0 top-0 z-[210] h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            )}
            <Suspense fallback={null}>
                <AppSidebar />
            </Suspense>
            <SidebarInset className={`h-screen bg-background ${isMobile ? 'ml-14' : ''} relative text-[hsl(var(--sidebar-active-foreground))]`}>
                <div className={`${isClassPage ? "h-full overflow-hidden p-3" : "h-full overflow-auto p-3"}`}>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
