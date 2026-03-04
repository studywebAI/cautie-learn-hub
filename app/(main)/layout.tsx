"use client";

import { AppSidebar } from "@/components/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const pathname = usePathname();
    
    // Hide content on class detail pages
    const isClassPage = pathname?.startsWith('/class/');

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className={`bg-background h-screen ${isMobile ? 'ml-14' : ''} relative`}>
                <div className={isClassPage ? "h-full overflow-hidden" : "h-full overflow-auto p-3 md:p-4"}>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
