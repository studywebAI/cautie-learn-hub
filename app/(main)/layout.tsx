"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
    const isTier0Ready = appContext?.isTier0Ready ?? false;
    const [introAnimationDone, setIntroAnimationDone] = useState(false);

    const isClassPage = pathname?.startsWith('/class/');

    useEffect(() => {
        console.log('[INTRO_LAYOUT] Mounted', { pathname, isMobile });
    }, [pathname, isMobile]);

    useEffect(() => {
        console.log('[INTRO_LAYOUT] appReady changed', { appReady });
    }, [appReady]);

    useEffect(() => {
        console.log('[INTRO_LAYOUT] isTier0Ready changed', { isTier0Ready });
    }, [isTier0Ready]);

    useEffect(() => {
        console.log('[INTRO_LAYOUT] introAnimationDone changed', { introAnimationDone });
    }, [introAnimationDone]);

    const onIntroAnimationDone = useCallback(() => {
        console.log('[INTRO_LAYOUT] Received intro animation done signal');
        setIntroAnimationDone(true);
    }, []);

    const showStartupSplash = useMemo(() => {
        const shouldShow = !(appReady && isTier0Ready && introAnimationDone);
        console.log('[INTRO_LAYOUT] Splash visibility computed', {
            appReady,
            isTier0Ready,
            introAnimationDone,
            showStartupSplash: shouldShow,
        });
        return shouldShow;
    }, [appReady, isTier0Ready, introAnimationDone]);

    return (
        <SidebarProvider>
            <StartupSplash visible={showStartupSplash} onIntroAnimationDone={onIntroAnimationDone} />
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
