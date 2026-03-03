'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
import { RecentsSidebar } from './recents-sidebar';
import { SidebarProfile } from './sidebar-profile';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const pathname = usePathname();
  const { dictionary } = useDictionary();
  const context = useContext(AppContext) as AppContextType | null;
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const [openDropdown, setOpenDropdown] = useState<'classes' | 'subjects' | null>(null);
  const miniDropdownRef = useRef<HTMLDivElement | null>(null);
  const drawerDropdownRef = useRef<HTMLDivElement | null>(null);
  const desktopDropdownRef = useRef<HTMLDivElement | null>(null);

  const menuItems = [
    { href: '/', label: dictionary.sidebar.dashboard, icon: Home },
    { href: '/subjects', label: dictionary.sidebar.subjects, icon: BookOpen },
    { href: '/classes', label: 'Manage', icon: School },
    { href: '/agenda', label: dictionary.sidebar.agenda, icon: Calendar },
    { href: '/material', label: dictionary.sidebar.material || 'Material', icon: FileSignature },
  ];

  const toolsMenuItems = [
    { href: '/tools/quiz', label: dictionary.sidebar.tools.quizGenerator, icon: BrainCircuit },
    { href: '/tools/flashcards', label: dictionary.sidebar.tools.flashcardMaker, icon: Copy },
    { href: '/tools/notes', label: dictionary.sidebar.tools.notes, icon: FileSignature },
    { href: '/tools/blocks', label: dictionary.sidebar.tools.blocks || 'Blocks', icon: FileSignature },
  ];

  const isTeacher = context?.role === 'teacher';
  const classes = context?.classes || [];
  const subjects = context?.subjects || [];

  const classDropdownItems = useMemo(
    () =>
      classes
        .filter((classItem) => classItem.status !== 'archived')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((classItem) => ({
          id: classItem.id,
          label: classItem.name,
          href: `/class/${classItem.id}`,
        })),
    [classes]
  );

  const subjectDropdownItems = useMemo(
    () =>
      [...subjects]
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((subject) => ({
          id: subject.id,
          label: subject.title,
          href: `/subjects/${subject.id}`,
        })),
    [subjects]
  );

  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  useEffect(() => {
    if (!openDropdown) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideMini = !!miniDropdownRef.current?.contains(target);
      const insideDrawer = !!drawerDropdownRef.current?.contains(target);
      const insideDesktop = !!desktopDropdownRef.current?.contains(target);
      if (!insideMini && !insideDrawer && !insideDesktop) {
        setOpenDropdown(null);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [openDropdown]);

  const isDropdownTrigger = (href: string) => href === '/classes' || href === '/subjects';
  const canUseDropdownFor = (href: string) => {
    if (href === '/classes') return isTeacher;
    if (href === '/subjects') return true;
    return false;
  };
  const getDropdownKind = (href: string) => (href === '/classes' ? 'classes' : 'subjects') as 'classes' | 'subjects';

  const isMenuItemActive = (href: string) => {
    if (href === '/classes') return pathname === '/classes' || pathname.startsWith('/class/');
    if (href === '/subjects') return pathname === '/subjects' || pathname.startsWith('/subjects/');
    if (href.startsWith('/tools')) return pathname.startsWith(href);
    return pathname === href;
  };

  const renderSelectionDropdown = (kind: 'classes' | 'subjects') => {
    const isClasses = kind === 'classes';
    const canShowClasses = isTeacher;
    if (isClasses && !canShowClasses) return null;

    const items = isClasses ? classDropdownItems : subjectDropdownItems;
    const emptyText = isClasses ? 'No classes found' : 'No subjects found';

    return (
      <div className="absolute left-full top-0 ml-2 z-[70] rounded-md border border-border bg-background shadow-lg">
        <div className="w-max min-w-[10rem] max-w-[22rem] p-1">
          {items.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyText}</p>
          ) : (
            items.map((entry) => (
              <Link
                key={entry.id}
                href={entry.href}
                className="block truncate rounded px-2 py-1.5 text-sm hover:bg-muted"
                onClick={() => {
                  setOpenDropdown(null);
                  setOpenMobile(false);
                }}
              >
                {entry.label}
              </Link>
            ))
          )}
        </div>
      </div>
    );
  };

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
          <nav className="flex-1 flex flex-col gap-1 px-2" ref={miniDropdownRef}>
            {menuItems.map((item) => (
              <div key={item.href} className="relative">
                {isDropdownTrigger(item.href) && canUseDropdownFor(item.href) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown((prev) => (prev === getDropdownKind(item.href) ? null : getDropdownKind(item.href)))}
                      className={cn(
                        "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                        isMenuItemActive(item.href) || openDropdown === getDropdownKind(item.href)
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                      title={item.label}
                    >
                      <item.icon className="h-5 w-5" />
                    </button>
                    {openDropdown === getDropdownKind(item.href) && renderSelectionDropdown(getDropdownKind(item.href))}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                      isMenuItemActive(item.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                    title={item.label}
                  >
                    <item.icon className="h-5 w-5" />
                  </Link>
                )}
              </div>
            ))}
            <div className="h-px bg-sidebar-border my-2" />
            {toolsMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                  isMenuItemActive(item.href)
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
            <Link
              href="/upgrade"
              className="flex items-center justify-center h-10 w-10 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent"
              title="Upgrade"
            >
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Full drawer sidebar (when hamburger is clicked) */}
        <Sidebar className="w-64">
          <SidebarContent className="px-3 py-3 flex-1" ref={drawerDropdownRef}>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label} className="relative">
                  {isDropdownTrigger(item.href) && canUseDropdownFor(item.href) ? (
                    <>
                      <SidebarMenuButton
                        onClick={() => setOpenDropdown((prev) => (prev === getDropdownKind(item.href) ? null : getDropdownKind(item.href)))}
                        isActive={isMenuItemActive(item.href) || openDropdown === getDropdownKind(item.href)}
                        tooltip={item.label}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {openDropdown === getDropdownKind(item.href) && renderSelectionDropdown(getDropdownKind(item.href))}
                    </>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={isMenuItemActive(item.href)}
                      tooltip={item.label}
                    >
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}

              <div className="h-px bg-sidebar-border my-2" />

              {toolsMenuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={isMenuItemActive(item.href)}
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
      <SidebarContent className="px-3 py-3 flex-1" ref={desktopDropdownRef}>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label} className="relative">
              {isDropdownTrigger(item.href) && canUseDropdownFor(item.href) ? (
                <>
                  <SidebarMenuButton
                    onClick={() => setOpenDropdown((prev) => (prev === getDropdownKind(item.href) ? null : getDropdownKind(item.href)))}
                    isActive={isMenuItemActive(item.href) || openDropdown === getDropdownKind(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {openDropdown === getDropdownKind(item.href) && renderSelectionDropdown(getDropdownKind(item.href))}
                </>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={isMenuItemActive(item.href)}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}

          <div className="h-px bg-sidebar-border my-2" />

          {toolsMenuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={isMenuItemActive(item.href)}
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
