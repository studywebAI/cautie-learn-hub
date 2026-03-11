"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/sidebar";
import { StartupSplash } from "@/components/startup-splash";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname } from "next/navigation";
import { AppContext } from "@/contexts/app-context";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const pathname = usePathname();
    const appContext = useContext(AppContext);
    const appReady = appContext?.appReady ?? false;
    const [minimumSplashDone, setMinimumSplashDone] = useState(false);

    const isClassPage = pathname?.startsWith('/class/');

    useEffect(() => {
        // Keep intro visible long enough for animation while app preloads.
        const hideTimer = setTimeout(() => setMinimumSplashDone(true), 900);
        return () => clearTimeout(hideTimer);
    }, []);

    const showStartupSplash = useMemo(() => !(appReady && minimumSplashDone), [appReady, minimumSplashDone]);

    return (
        <SidebarProvider>
            <StartupSplash visible={showStartupSplash} />
            <div className={showStartupSplash ? 'opacity-0 pointer-events-none select-none' : ''}>
                <AppSidebar />
            </div>
            <SidebarInset className={`bg-background h-screen ${isMobile ? 'ml-14' : ''} relative`}>
                <div key={pathname} className={`${isClassPage ? "h-full overflow-hidden" : "h-full overflow-auto p-3 md:p-4"} animate-fade-in`}>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
