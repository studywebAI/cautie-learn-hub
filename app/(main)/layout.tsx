"use client";

import { Suspense, useCallback, useContext, useMemo, useState } from "react";
import { AppSidebar } from "@/components/sidebar";
import { StartupSplash } from "@/components/startup-splash";
import { GlobalCommandPalette } from "@/components/global-command-palette";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname } from "next/navigation";
import { AppContext } from "@/contexts/app-context";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const pathname = usePathname();
    const appContext = useContext(AppContext);
    const appReady = appContext?.appReady ?? false;
    const isTier0Ready = appContext?.isTier0Ready ?? false;
    const [introAnimationDone, setIntroAnimationDone] = useState(false);

    const isClassPage = pathname?.startsWith('/class/');

    const onIntroAnimationDone = useCallback(() => {
        setIntroAnimationDone(true);
    }, []);

    const showStartupSplash = useMemo(() => {
        return !(appReady && isTier0Ready && introAnimationDone);
    }, [appReady, isTier0Ready, introAnimationDone]);

    return (
        <SidebarProvider>
            <StartupSplash visible={showStartupSplash} onIntroAnimationDone={onIntroAnimationDone} />
            <GlobalCommandPalette />
            <Suspense fallback={null}>
                <div className={showStartupSplash ? 'opacity-0 pointer-events-none select-none' : ''}>
                    <AppSidebar />
                </div>
            </Suspense>
            <SidebarInset className={`bg-background h-screen ${isMobile ? 'ml-14' : ''} relative`}>
                <div className={`${isClassPage ? "h-full overflow-hidden" : "h-full overflow-auto p-4 md:p-6"}`}>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
