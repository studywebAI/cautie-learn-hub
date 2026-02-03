"use client";

import { AppSidebar } from "@/components/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { TopBar } from "@/components/top-bar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className={`bg-background h-screen ${isMobile ? 'ml-14' : ''} relative`}>
                <TopBar />
                <div className="h-full overflow-auto p-2">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
