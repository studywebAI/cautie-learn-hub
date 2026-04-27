"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDeviceTier } from "@/hooks/use-device-tier";
import { usePathname } from "next/navigation";
import { FirstTimeSetupGate } from "@/components/onboarding/first-time-setup-gate";

const AppSidebar = dynamic(
    () => import("@/components/sidebar").then((m) => m.AppSidebar),
    { ssr: false }
);

const GlobalCommandPalette = dynamic(
    () => import("@/components/global-command-palette").then((m) => m.GlobalCommandPalette),
    { ssr: false }
);

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const deviceTier = useDeviceTier();
    const pathname = usePathname();
    const [routePulseVisible, setRoutePulseVisible] = useState(false);

    const isClassPage = pathname?.startsWith('/class/');
    const isTablet = deviceTier === "tablet";
    const isPhone = deviceTier === "phone";

    useEffect(() => {
        setRoutePulseVisible(true);
        const timer = window.setTimeout(() => setRoutePulseVisible(false), 120);
        return () => window.clearTimeout(timer);
    }, [pathname]);

    return (
        <SidebarProvider defaultOpen={!isTablet}>
            <FirstTimeSetupGate />
            <GlobalCommandPalette />
            {routePulseVisible && (
                <div className="pointer-events-none fixed inset-x-0 top-0 z-[210] h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            )}
            <Suspense fallback={null}>
                <AppSidebar />
            </Suspense>
            <SidebarInset className={`h-screen bg-background ${isMobile ? 'ml-11' : ''} relative text-[hsl(var(--sidebar-active-foreground))]`}>
                <div
                  className={`${
                    isClassPage ? "h-full overflow-hidden" : "h-full overflow-auto"
                  } ${isPhone ? "p-2" : isTablet ? "p-2.5" : "p-3"}`}
                >
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
