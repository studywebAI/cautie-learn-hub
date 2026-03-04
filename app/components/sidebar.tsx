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
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type DropdownKind = 'classes' | 'subjects';
type DropdownState = { kind: DropdownKind; left: number; top: number } | null;
type DropdownClassItem = { id: string; name: string; status?: string | null };
type DropdownSubjectItem = { id: string; title: string };

export function AppSidebar() {
  const pathname = usePathname();
  const { dictionary } = useDictionary();
  const context = useContext(AppContext) as AppContextType | null;
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const [dropdown, setDropdown] = useState<DropdownState>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const [classesLoading, setClassesLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [classItems, setClassItems] = useState<DropdownClassItem[]>([]);
  const [subjectItems, setSubjectItems] = useState<DropdownSubjectItem[]>([]);
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
  const [joinClassOpen, setJoinClassOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [subjectTitle, setSubjectTitle] = useState('');
  const [selectedSubjectClassId, setSelectedSubjectClassId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const menuItems = [
    { href: '/', label: dictionary.sidebar.dashboard, icon: Home },
    { href: '/subjects', label: dictionary.sidebar.subjects, icon: BookOpen },
    { href: '/classes', label: 'manage', icon: School },
    { href: '/agenda', label: dictionary.sidebar.agenda, icon: Calendar },
    { href: '/material', label: dictionary.sidebar.material || 'material', icon: FileSignature },
  ];

  const toolsMenuItems = [
    { href: '/tools/quiz', label: dictionary.sidebar.tools.quizGenerator, icon: BrainCircuit },
    { href: '/tools/flashcards', label: dictionary.sidebar.tools.flashcardMaker, icon: Copy },
    { href: '/tools/notes', label: dictionary.sidebar.tools.notes, icon: FileSignature },
    { href: '/tools/blocks', label: dictionary.sidebar.tools.blocks || 'blocks', icon: FileSignature },
  ];

  const isTeacher = context?.role === 'teacher';

  const classDropdownItems = useMemo(() => {
    return [...classItems]
      .filter((classItem) => classItem.status !== 'archived')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((classItem) => ({
        id: classItem.id,
        label: classItem.name,
        href: `/class/${classItem.id}`,
      }));
  }, [classItems]);

  const subjectDropdownItems = useMemo(
    () =>
      [...subjectItems]
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((subject) => ({
          id: subject.id,
          label: subject.title,
          href: `/subjects/${subject.id}`,
        })),
    [subjectItems]
  );

  useEffect(() => {
    setDropdown(null);
  }, [pathname]);

  useEffect(() => {
    if (!dropdown) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideFloating = !!floatingRef.current?.contains(target);
      const triggerNode = (target as HTMLElement).closest('[data-nav-dropdown-trigger="true"]');
      if (!insideFloating && !triggerNode) {
        setDropdown(null);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [dropdown]);

  const isDropdownTrigger = (href: string) => href === '/classes' || href === '/subjects';
  const canUseDropdownFor = (href: string) => href === '/classes' || href === '/subjects';
  const getDropdownKind = (href: string) => (href === '/classes' ? 'classes' : 'subjects') as 'classes' | 'subjects';

  const resetInlinePanels = () => {
    setCreateClassOpen(false);
    setCreateSubjectOpen(false);
    setJoinClassOpen(false);
    setClassName('');
    setSubjectTitle('');
    setSelectedSubjectClassId('');
    setJoinCode('');
  };

  const loadDropdownData = async (kind: DropdownKind) => {
    try {
      if (kind === 'classes') {
        setClassesLoading(true);
        const response = await fetch('/api/classes', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load classes');
        const data = await response.json();
        setClassItems(Array.isArray(data) ? data : []);
      } else {
        setSubjectsLoading(true);
        const response = await fetch('/api/subjects', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load subjects');
        const data = await response.json();
        setSubjectItems(Array.isArray(data) ? data : []);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: kind === 'classes' ? 'Could not load classes' : 'Could not load subjects',
        description: error?.message || 'Try again.',
      });
    } finally {
      if (kind === 'classes') setClassesLoading(false);
      else setSubjectsLoading(false);
    }
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setDropdown(null), 150);
  };

  const openDropdownFor = (kind: DropdownKind, element: HTMLElement) => {
    clearCloseTimer();
    const rect = element.getBoundingClientRect();
    const estimatedPanelWidth = 320;
    const estimatedPanelHeight = 360;
    const left = Math.min(rect.right + 8, window.innerWidth - estimatedPanelWidth - 8);
    const top = Math.min(Math.max(8, rect.top), window.innerHeight - estimatedPanelHeight - 8);
    resetInlinePanels();
    void loadDropdownData(kind);
    if (kind === 'subjects' && isTeacher) {
      void loadDropdownData('classes');
    }
    setDropdown({ kind, left, top });
  };

  const isMenuItemActive = (href: string) => {
    if (href === '/classes') return pathname === '/classes' || pathname.startsWith('/class/');
    if (href === '/subjects') return pathname === '/subjects' || pathname.startsWith('/subjects/');
    if (href.startsWith('/tools')) return pathname.startsWith(href);
    return pathname === href;
  };

  const renderFloatingDropdown = () => {
    if (!dropdown) return null;
    const items = dropdown.kind === 'classes' ? classDropdownItems : subjectDropdownItems;
    const emptyText = dropdown.kind === 'classes' ? 'No classes found' : 'No subjects found';
    const loading = dropdown.kind === 'classes' ? classesLoading : subjectsLoading;

    const submitCreateClass = async () => {
      if (!className.trim()) return;
      setSubmitting(true);
      try {
        const response = await fetch('/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: className.trim(), description: null }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to create class');
        toast({ title: 'Class created' });
        setClassName('');
        setCreateClassOpen(false);
        await loadDropdownData('classes');
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Could not create class', description: error?.message || 'Try again.' });
      } finally {
        setSubmitting(false);
      }
    };

    const submitCreateSubject = async () => {
      if (!subjectTitle.trim()) return;
      if (!selectedSubjectClassId) {
        toast({ variant: 'destructive', title: 'Select a class first' });
        return;
      }
      setSubmitting(true);
      try {
        const response = await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: subjectTitle.trim(),
            description: undefined,
            class_ids: [selectedSubjectClassId]
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to create subject');
        toast({ title: 'Subject created' });
        setSubjectTitle('');
        setCreateSubjectOpen(false);
        await loadDropdownData('subjects');
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Could not create subject', description: error?.message || 'Try again.' });
      } finally {
        setSubmitting(false);
      }
    };

    const submitJoinClass = async () => {
      if (!joinCode.trim()) return;
      setSubmitting(true);
      try {
        const response = await fetch('/api/classes/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ class_code: joinCode.trim() }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to join class');
        toast({ title: data?.message || 'Joined class' });
        setJoinCode('');
        setJoinClassOpen(false);
        await loadDropdownData('classes');
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Could not join class', description: error?.message || 'Try again.' });
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div
        ref={floatingRef}
        className="fixed z-[120] rounded-xl border border-border/70 bg-[hsl(var(--surface-1))] shadow-[0_16px_34px_-20px_hsl(var(--foreground)/0.4)]"
        style={{ left: dropdown.left, top: dropdown.top }}
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
      >
        <div className="w-max min-w-[10rem] max-w-[22rem] max-h-[60vh] overflow-auto p-1">
          <div className="mb-1 flex gap-1 border-b border-border pb-1">
            {dropdown.kind === 'classes' && isTeacher && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs rounded-lg"
                onClick={() => {
                  setCreateClassOpen((v) => !v);
                  setJoinClassOpen(false);
                }}
              >
                + Create class
              </Button>
            )}
            {dropdown.kind === 'classes' && !isTeacher && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs rounded-lg"
                onClick={() => {
                  setJoinClassOpen((v) => !v);
                  setCreateClassOpen(false);
                }}
              >
                Join class
              </Button>
            )}
            {dropdown.kind === 'subjects' && isTeacher && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs rounded-lg"
                onClick={() => setCreateSubjectOpen((v) => !v)}
              >
                + Create subject
              </Button>
            )}
          </div>

          {createClassOpen && (
            <div className="mb-1 space-y-1 rounded-xl border border-border/70 bg-[hsl(var(--surface-2))] p-2">
              <Input
                placeholder="Class name"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex justify-end">
                <Button size="sm" className="h-7 text-xs" onClick={submitCreateClass} disabled={submitting || !className.trim()}>
                  Create
                </Button>
              </div>
            </div>
          )}

          {createSubjectOpen && (
            <div className="mb-1 space-y-1 rounded-xl border border-border/70 bg-[hsl(var(--surface-2))] p-2">
              <select
                value={selectedSubjectClassId}
                onChange={(e) => setSelectedSubjectClassId(e.target.value)}
                className="h-8 w-full rounded border border-border bg-background px-2 text-sm"
              >
                <option value="">Select class</option>
                {classDropdownItems.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.label}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Subject title"
                value={subjectTitle}
                onChange={(e) => setSubjectTitle(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={submitCreateSubject}
                  disabled={submitting || !subjectTitle.trim() || !selectedSubjectClassId}
                >
                  Create
                </Button>
              </div>
            </div>
          )}

          {joinClassOpen && (
            <div className="mb-1 space-y-1 rounded-xl border border-border/70 bg-[hsl(var(--surface-2))] p-2">
              <Input
                placeholder="Enter join code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex justify-end">
                <Button size="sm" className="h-7 text-xs" onClick={submitJoinClass} disabled={submitting || !joinCode.trim()}>
                  Join
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyText}</p>
          ) : (
            items.map((entry) => (
              <Link
                key={entry.id}
                href={entry.href}
                className="block truncate rounded-lg px-2 py-1.5 text-sm hover:bg-[hsl(var(--surface-2))]"
                onClick={() => {
                  resetInlinePanels();
                  setDropdown(null);
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
          <nav className="flex-1 flex flex-col gap-1 px-2">
            {menuItems.map((item) => (
              <div key={item.href} className="relative">
                {isDropdownTrigger(item.href) && canUseDropdownFor(item.href) ? (
                  <>
                    <button
                      type="button"
                      data-nav-dropdown-trigger="true"
                      onMouseEnter={(e) => openDropdownFor(getDropdownKind(item.href), e.currentTarget)}
                      onMouseLeave={scheduleClose}
                      onClick={(e) => openDropdownFor(getDropdownKind(item.href), e.currentTarget)}
                      className={cn(
                        "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                        isMenuItemActive(item.href) || dropdown?.kind === getDropdownKind(item.href)
                          ? "bg-sidebar-accent text-[hsl(var(--sidebar-active-foreground))]"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                      title={item.label}
                    >
                      <item.icon className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                      isMenuItemActive(item.href)
                        ? "bg-sidebar-accent text-[hsl(var(--sidebar-active-foreground))]"
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
                    ? "bg-sidebar-accent text-[hsl(var(--sidebar-active-foreground))]"
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
        <Sidebar className="w-[19rem]">
          <SidebarContent className="px-3 py-3 flex-1">
            <p className="px-2 pb-1 text-[11px] tracking-[0.08em] text-sidebar-foreground/55 lowercase">main</p>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label} className="relative">
                  {isDropdownTrigger(item.href) && canUseDropdownFor(item.href) ? (
                    <>
                      <SidebarMenuButton
                        data-nav-dropdown-trigger="true"
                        onMouseEnter={(e) => openDropdownFor(getDropdownKind(item.href), e.currentTarget)}
                        onMouseLeave={scheduleClose}
                        onClick={(e) => openDropdownFor(getDropdownKind(item.href), e.currentTarget)}
                        isActive={isMenuItemActive(item.href) || dropdown?.kind === getDropdownKind(item.href)}
                        tooltip={item.label}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="lowercase text-[14px]">{item.label}</span>
                      </SidebarMenuButton>
                    </>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={isMenuItemActive(item.href)}
                      tooltip={item.label}
                    >
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <item.icon className="h-5 w-5" />
                        <span className="lowercase text-[14px]">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}

            </SidebarMenu>

            <div className="h-3" />
            <p className="px-2 pb-1 text-[11px] tracking-[0.08em] text-sidebar-foreground/55 lowercase">tools</p>
            <SidebarMenu>
              {toolsMenuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={isMenuItemActive(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href} onClick={() => setOpenMobile(false)}>
                      <item.icon className="h-5 w-5" />
                      <span className="lowercase text-[14px] leading-5">{item.label}</span>
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
        {renderFloatingDropdown()}
      </>
    );
  }

  // Desktop: Regular sidebar with trigger
  return (
    <Sidebar className="w-64" collapsible="icon">
      <div className="absolute top-1/2 right-0 transform -translate-y-1/2 z-50">
        <SidebarTrigger />
      </div>
      <SidebarContent className="px-3 py-3 flex-1">
        <p className="px-2 pb-1 text-[11px] tracking-[0.08em] text-sidebar-foreground/55 lowercase">main</p>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label} className="relative">
              {isDropdownTrigger(item.href) && canUseDropdownFor(item.href) ? (
                <>
                  <SidebarMenuButton
                    data-nav-dropdown-trigger="true"
                    onMouseEnter={(e) => openDropdownFor(getDropdownKind(item.href), e.currentTarget)}
                    onMouseLeave={scheduleClose}
                    onClick={(e) => openDropdownFor(getDropdownKind(item.href), e.currentTarget)}
                    isActive={isMenuItemActive(item.href) || dropdown?.kind === getDropdownKind(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="lowercase text-[14px] leading-5">{item.label}</span>
                  </SidebarMenuButton>
                </>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={isMenuItemActive(item.href)}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    <span className="lowercase text-[14px] leading-5">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <div className="h-3" />
        <p className="px-2 pb-1 text-[11px] tracking-[0.08em] text-sidebar-foreground/55 lowercase">tools</p>
        <SidebarMenu>
          {toolsMenuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={isMenuItemActive(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span className="lowercase text-[14px] leading-5">{item.label}</span>
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
      {renderFloatingDropdown()}
    </Sidebar>
  );
}
