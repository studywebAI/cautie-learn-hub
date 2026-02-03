"use client";

import { AppSidebar } from "@/components/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className={`bg-background h-screen ${isMobile ? 'ml-14' : ''}`}>
                <div className="h-full overflow-auto p-2">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
