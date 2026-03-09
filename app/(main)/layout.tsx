"use client";

import { useContext, useEffect, useState } from "react";
import { AppSidebar } from "@/components/sidebar";
import { StartupSplash } from "@/components/startup-splash";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppContext, AppContextType } from "@/contexts/app-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const pathname = usePathname();
    const { isLoading } = useContext(AppContext) as AppContextType;
    const [showStartupSplash, setShowStartupSplash] = useState(true);
    
    const isClassPage = pathname?.startsWith('/class/');

    useEffect(() => {
        if (isLoading) {
            setShowStartupSplash(true);
            return;
        }
        const hideTimer = setTimeout(() => setShowStartupSplash(false), 1000);
        return () => clearTimeout(hideTimer);
    }, [isLoading]);

    return (
        <SidebarProvider>
            <StartupSplash visible={showStartupSplash} />
            <AppSidebar />
            <SidebarInset className={`bg-background h-screen ${isMobile ? 'ml-14' : ''} relative`}>
                <div key={pathname} className={`${isClassPage ? "h-full overflow-hidden" : "h-full overflow-auto p-3 md:p-4"} animate-fade-in`}>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
