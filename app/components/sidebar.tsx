'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  BookOpen,
  Home,
  BrainCircuit,
  Copy,
  FileSignature,
  School,
  Calendar,
  Menu,
  ArrowUpRight,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDictionary } from '@/contexts/app-context';
import { RecentsSidebar } from './recents-sidebar';
import { SidebarProfile } from './sidebar-profile';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const pathname = usePathname();
  const { dictionary } = useDictionary();
  const isMobile = useIsMobile();
  const { state, openMobile, setOpenMobile } = useSidebar();

  const menuItems = [
    { href: '/', label: dictionary.sidebar.dashboard, icon: Home },
    { href: '/subjects', label: dictionary.sidebar.subjects, icon: BookOpen },
    { href: '/classes', label: dictionary.sidebar.classes, icon: School },
    { href: '/agenda', label: dictionary.sidebar.agenda, icon: Calendar },
    { href: '/material', label: dictionary.sidebar.material || 'Material', icon: FileSignature },
  ];

  const toolsMenuItems = [
    { href: '/tools/quiz', label: dictionary.sidebar.tools.quizGenerator, icon: BrainCircuit },
    { href: '/tools/flashcards', label: dictionary.sidebar.tools.flashcardMaker, icon: Copy },
    { href: '/tools/notes', label: dictionary.sidebar.tools.notes, icon: FileSignature },
    { href: '/tools/blocks', label: dictionary.sidebar.tools.blocks || 'Blocks', icon: FileSignature },
  ];

  // Mobile: Show mini sidebar with icons only + hamburger button
  if (isMobile) {
    return (
      <>
        {/* Mini sidebar - always visible on mobile */}
        <div className="fixed left-0 top-0 h-full w-14 bg-sidebar border-r border-sidebar-border z-40 flex flex-col py-3">
          {/* Hamburger button to open full drawer */}
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto mb-4 h-10 w-10"
            onClick={() => setOpenMobile(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Mini icon navigation */}
          <nav className="flex-1 flex flex-col gap-1 px-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                title={item.label}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            ))}
            <div className="h-px bg-sidebar-border my-2" />
            {toolsMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                title={item.label}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            ))}
          </nav>

          {/* Upgrade at bottom */}
          <div className="px-2 mt-auto">
            <button
              className="flex items-center justify-center h-10 w-10 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent"
              title="Upgrade"
              onClick={() => {/* placeholder */}}
            >
              <ArrowUpRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Full drawer sidebar (when hamburger is clicked) */}
        <Sidebar className="w-64">
          <SidebarContent className="px-3 py-3 flex-1">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <Link href={item.href} onClick={() => setOpenMobile(false)}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <div className="h-px bg-sidebar-border my-2" />

              {toolsMenuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <Link href={item.href} onClick={() => setOpenMobile(false)}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
      <SidebarFooter className="p-3 flex flex-col gap-2">
            <RecentsSidebar />
            <div className="h-px bg-sidebar-border" />
            <SidebarProfile />
          </SidebarFooter>
        </Sidebar>
      </>
    );
  }

  // Desktop: Regular sidebar with trigger
  return (
    <Sidebar className="w-48" collapsible="icon">
      <div className="absolute top-1/2 right-0 transform -translate-y-1/2 z-50">
        <SidebarTrigger />
      </div>
      <SidebarContent className="px-3 py-3 flex-1">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          <div className="h-px bg-sidebar-border my-2" />

          {toolsMenuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3 flex flex-col gap-2">
        <RecentsSidebar />
        <div className="h-px bg-sidebar-border" />
        <SidebarProfile />
      </SidebarFooter>
    </Sidebar>
  );
}
