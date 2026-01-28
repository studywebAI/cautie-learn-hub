"use client";

import { AppHeader } from "@/components/header";
import { AppSidebar } from "@/components/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className={`bg-background h-screen flex flex-col ${isMobile ? 'ml-14' : ''}`}>
                <AppHeader />
                <div className="flex-1 overflow-auto">
                  <div className="min-h-full p-4 md:p-6">
                    {children}
                  </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
