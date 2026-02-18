"use client";

import { AppSidebar } from "@/components/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { TopBar } from "@/components/top-bar";
import { usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const pathname = usePathname();
    
    // Hide TopBar on class detail pages
    const isClassPage = pathname?.startsWith('/class/');

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className={`bg-background h-screen ${isMobile ? 'ml-14' : ''} relative`}>
                {!isClassPage && <TopBar />}
                <div className={isClassPage ? "h-full overflow-hidden" : "h-full overflow-auto pt-1 pl-1"}>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
