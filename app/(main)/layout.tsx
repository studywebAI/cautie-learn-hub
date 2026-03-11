"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/sidebar";
import { StartupSplash } from "@/components/startup-splash";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const pathname = usePathname();
    const [showStartupSplash, setShowStartupSplash] = useState(true);
    
    const isClassPage = pathname?.startsWith('/class/');

    useEffect(() => {
        // Intro runs once on initial page open only.
        const hideTimer = setTimeout(() => setShowStartupSplash(false), 900);
        return () => clearTimeout(hideTimer);
    }, []);

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
