'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Workflow,
  Menu,
  ArrowUpRight,
  ChevronDown,
  Check,
  FolderOpen,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TimelineIcon } from '@/components/icons/custom-icons';
import { LayoutDashboard } from '@/components/animate-ui/icons/layout-dashboard';
import { SquareArrowOutUpRight } from '@/components/animate-ui/icons/square-arrow-out-up-right';
import { Users } from '@/components/animate-ui/icons/users';
import { ChartColumn } from '@/components/animate-ui/icons/chart-column';
import { ChartSpline } from '@/components/animate-ui/icons/chart-spline';
import { ClipboardList } from '@/components/animate-ui/icons/clipboard-list';
import { GalleryVerticalEnd } from '@/components/animate-ui/icons/gallery-vertical-end';
import { CircleCheck } from '@/components/animate-ui/icons/circle-check';
import { AnimateIcon } from '@/components/animate-ui/icons/icon-base';
import { Layers } from '@/components/animate-ui/icons/layers';
import { Brush } from '@/components/animate-ui/icons/brush';
import { useDeviceTier } from '@/hooks/use-device-tier';
import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type DropdownKind = 'classes' | 'subjects';
type DropdownState = { kind: DropdownKind; left: number; top: number } | null;
type DropdownClassItem = { id: string; name: string; status?: string | null };
type DropdownSubjectItem = { id: string; title: string; classIds: string[] };


// Statically imported (not next/dynamic) — AppSidebar itself is only ever
// rendered client-side (mounted-gated in app/(main)/layout.tsx), so these
// don't need their own ssr:false, and avoiding it means they can't go stale
// as a separate runtime-fetched chunk independent of the rest of the app.
import { SidebarProfile } from './sidebar-profile';
import { RecentsSidebar } from './recents-sidebar';

type SidebarNavItem = { href: string; label: string; icon: React.ComponentType<any>; animated?: boolean };

// Desktop nav row. Deliberately does NOT use AnimateIcon's own
// asChild/onMouseEnter wiring — that mode wraps the actual <Link> in a
// motion.create(CustomComponent) + hand-rolled Slot, which is what caused
// nav clicks to silently stop navigating after repeated use (see git log).
// A controlled-mode AnimateIcon (external hover state feeding its `animate`
// prop) was tried next but didn't reliably fire either, so the
// hover feedback here is plain CSS (group-hover) instead — guaranteed to
// fire, no dependency on that system, still nudges the icon on hover.
function SidebarNavRow({ item, isActive, iconSizeClass }: { item: SidebarNavItem; isActive: boolean; iconSizeClass: string }) {
  const canAnimate = item.animated !== false;
  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      tooltip={item.label}
      className="group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
    >
      <Link href={item.href} className="group/navrow">
        <span
          className={cn(
            'inline-flex shrink-0 transition-transform duration-200 ease-out',
            canAnimate && 'group-hover/navrow:-translate-y-0.5 group-hover/navrow:translate-x-0.5'
          )}
        >
          <item.icon className={iconSizeClass} />
        </span>
        <span
          className={cn(
            'text-base leading-5 transition-[opacity,transform] duration-200 group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-1',
            isActive ? 'font-normal text-sidebar-active-foreground' : 'font-normal text-sidebar-foreground'
          )}
        >
          {item.label}
        </span>
      </Link>
    </SidebarMenuButton>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { dictionary } = useDictionary();
  const context = useContext(AppContext) as AppContextType | null;
  const { toast } = useToast();
  const deviceTier = useDeviceTier();
  const isPhone = deviceTier === 'phone';
  const isTablet = deviceTier === 'tablet';
  const { setOpenMobile, openMobile, state: sidebarState } = useSidebar();
  const [dropdown, setDropdown] = useState<DropdownState>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didWarmTeacherResourcesRef = useRef(false);
  const didPrefetchLikelyRoutesRef = useRef(false);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const subjectDropdownTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [classItems, setClassItems] = useState<DropdownClassItem[]>([]);
  const [subjectItems, setSubjectItems] = useState<DropdownSubjectItem[]>([]);
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
  const [joinSubjectOpen, setJoinSubjectOpen] = useState(false);
  const [subjectJoinCode, setSubjectJoinCode] = useState('');
  const [subjectTitle, setSubjectTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTeacherClassId, setActiveTeacherClassId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('studyweb-last-class-id') || '';
  });
  const [storedTeacherClassId, setStoredTeacherClassId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('studyweb-last-class-id') || '';
  });
  // Subject is the primary switcher identity now -- class persistence above
  // is kept only as a fallback for the legacy /class/[classId] routes.
  const [activeTeacherSubjectId, setActiveTeacherSubjectId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('studyweb-last-subject-id') || '';
  });
  const [storedTeacherSubjectId, setStoredTeacherSubjectId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('studyweb-last-subject-id') || '';
  });

  const isTeacher = context?.role === 'teacher';
  const isDutch = context?.language === 'nl';
  const routeClassIdMatch = pathname?.match(/^\/class\/([^/?#]+)/);
  const routeClassId = routeClassIdMatch?.[1] || searchParams?.get('classId') || '';
  const t = {
    manage: isDutch ? 'Beheer' : 'Manage',
    studyset: isDutch ? 'Studieset' : 'Studyset',
    untitledSubject: isDutch ? 'Naamloos Vak' : 'Untitled Subject',
    subjectsLoadError: isDutch ? 'Kon vakken niet laden' : 'Could not load subjects',
    createSubjectError: isDutch ? 'Kon vak niet aanmaken' : 'Could not create subject',
    tryAgain: isDutch ? 'Probeer opnieuw.' : 'Try again.',
    sectionMain: isDutch ? 'Hoofd' : 'Main',
    sectionTools: isDutch ? 'Tools' : 'Tools',
    sectionOther: isDutch ? 'Overig' : 'Other',
    recents: isDutch ? 'Recent' : 'Recents',
    sectionRecents: isDutch ? 'Recent' : 'Recents',
    upgrade: isDutch ? 'Upgraden' : 'Upgrade',
  };
  const isRailCollapsed = !isPhone && sidebarState === 'collapsed';
  const effectiveTeacherClassId =
    routeClassId ||
    activeTeacherClassId ||
    storedTeacherClassId ||
    classItems[0]?.id ||
    (context?.classes?.find((classItem) => classItem.status !== 'archived')?.id || '');
  // Subjects is genuinely subject-scoped now -- a teacher's full subject
  // list (class-linked or standalone) loads regardless of which class is
  // "active", so this link no longer needs a classId param at all.
  const teacherSubjectsHref = '/subjects';
  // "Manage" (attendance) is subject-first now that every class has a
  // backfilled 1:1 subject (Phase 3.1 migration) -- class stays as the
  // fallback only for the rare case a subject hasn't loaded yet client-side.
  const routeSubjectIdMatch = pathname?.match(/^\/subjects\/([^/?#]+)/);
  const routeSubjectId = routeSubjectIdMatch?.[1] || searchParams?.get('subjectId') || '';
  const effectiveTeacherSubjectId =
    routeSubjectId ||
    activeTeacherSubjectId ||
    storedTeacherSubjectId ||
    subjectItems.find((subject) => subject.classIds.includes(effectiveTeacherClassId))?.id ||
    subjectItems[0]?.id ||
    '';
  const effectiveTeacherSubject = subjectItems.find((subject) => subject.id === effectiveTeacherSubjectId) || null;
  const teacherManageHref = isTeacher && effectiveTeacherSubjectId
    ? `/subjects/${effectiveTeacherSubjectId}/attendance`
    : '/subjects';
  // Agenda's own page is still keyed on ?classId= -- route through the
  // active subject's linked class if it has one, otherwise fall back to
  // the plain unscoped agenda (which already merges everything a teacher
  // can see). Standalone subjects (no class) simply don't filter Agenda.
  const teacherAgendaClassId = effectiveTeacherSubject?.classIds[0] || effectiveTeacherClassId;
  const teacherAgendaHref = isTeacher && teacherAgendaClassId ? `/agenda?classId=${teacherAgendaClassId}` : '/agenda';

  const menuItems = isTeacher
    ? [
        { href: '/', label: dictionary.sidebar.dashboard, icon: LayoutDashboard, animated: true },
        { href: teacherSubjectsHref, label: dictionary.sidebar.subjects, icon: SquareArrowOutUpRight, animated: true },
        { href: teacherManageHref, label: t.manage, icon: Users, animated: true },
        { href: '/teacher-grades', label: isDutch ? 'Cijfers' : 'Grades', icon: ChartColumn, animated: true },
        { href: '/analytics', label: isDutch ? 'Analyses' : 'Analytics', icon: ChartSpline, animated: true },
        { href: teacherAgendaHref, label: dictionary.sidebar.agenda, icon: ClipboardList, animated: true },
      ]
    : [
        { href: '/', label: dictionary.sidebar.dashboard, icon: LayoutDashboard, animated: true },
        { href: '/subjects', label: dictionary.sidebar.subjects, icon: SquareArrowOutUpRight, animated: true },
        { href: '/student-grades', label: isDutch ? 'Cijfers' : 'Grades', icon: ChartColumn, animated: true },
        { href: '/analytics', label: isDutch ? 'Analyses' : 'Analytics', icon: ChartSpline, animated: true },
        { href: '/agenda', label: dictionary.sidebar.agenda, icon: ClipboardList, animated: true },
      ];

  const toolsMenuItems = [
    { href: '/tools/studyset', label: t.studyset, icon: GalleryVerticalEnd, animated: true },
    { href: '/tools/quiz', label: dictionary.sidebar.tools.quizGenerator, icon: CircleCheck, animated: true },
    { href: '/tools/flashcards', label: dictionary.sidebar.tools.flashcardMaker, icon: Layers, animated: true },
    { href: '/tools/notes', label: dictionary.sidebar.tools.notes, icon: Brush, animated: true },
    { href: '/tools/wordweb', label: 'Mindmap', icon: Workflow, animated: false },
    { href: '/tools/timeline', label: isDutch ? 'Tijdlijn' : 'Timeline', icon: TimelineIcon, animated: false },
  ];

  const otherMenuItems: Array<{ href: string; label: string; icon: typeof FolderOpen; animated?: boolean }> = [];

  useEffect(() => {
    const warmResources = context?.warmResources;
    if (!isTeacher || !warmResources) {
      didWarmTeacherResourcesRef.current = false;
      return;
    }

    if (!didWarmTeacherResourcesRef.current) {
      didWarmTeacherResourcesRef.current = true;
      void warmResources(['classes:list', 'subjects:list']);
    }

    const refreshResources = () => {
      void warmResources(['classes:list', 'subjects:list']);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', refreshResources);
      const intervalId = window.setInterval(refreshResources, 300000);
      return () => {
        window.removeEventListener('focus', refreshResources);
        window.clearInterval(intervalId);
      };
    }
  }, [isTeacher, context?.warmResources]);


  const subjectDropdownItems = useMemo(
    () =>
      [...subjectItems]
        .sort((a, b) => String(a?.title || '').localeCompare(String(b?.title || '')))
        .map((subject) => ({
          id: subject.id,
          label: String(subject?.title || t.untitledSubject),
          href: `/subjects/${subject.id}`,
        })),
    [subjectItems, t.untitledSubject]
  );

  const persistTeacherClassId = (nextClassId: string) => {
    if (!nextClassId) return;
    setActiveTeacherClassId(nextClassId);
    setStoredTeacherClassId(nextClassId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studyweb-last-class-id', nextClassId);
    }
  };

  const persistTeacherSubjectId = (nextSubjectId: string) => {
    if (!nextSubjectId) return;
    setActiveTeacherSubjectId(nextSubjectId);
    setStoredTeacherSubjectId(nextSubjectId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studyweb-last-subject-id', nextSubjectId);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (didPrefetchLikelyRoutesRef.current) return;
    didPrefetchLikelyRoutesRef.current = true;
    const classIdFromStorage = window.localStorage.getItem('studyweb-last-class-id') || '';
    if (!classIdFromStorage) return;
    setStoredTeacherClassId(classIdFromStorage);
    setActiveTeacherClassId(classIdFromStorage);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'studyweb-last-class-id') return;
      const next = event.newValue || '';
      if (!next) return;
      setStoredTeacherClassId(next);
      setActiveTeacherClassId(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);


  useEffect(() => {
    if (!isTeacher) return;
    const activeClasses = classItems.filter((classItem) => classItem.status !== 'archived');
    if (activeClasses.length === 0) return;

    const storageClassId =
      typeof window !== 'undefined' ? window.localStorage.getItem('studyweb-last-class-id') : null;
    const preferredClassId = routeClassId || activeTeacherClassId || storedTeacherClassId || storageClassId || activeClasses[0].id;
    const preferredClass =
      activeClasses.find((classItem) => classItem.id === preferredClassId) || activeClasses[0];
    if (preferredClass.id !== activeTeacherClassId || preferredClass.id !== storedTeacherClassId) {
      persistTeacherClassId(preferredClass.id);
    }
  }, [isTeacher, classItems, routeClassId, activeTeacherClassId, storedTeacherClassId]);

  useEffect(() => {
    if (!isTeacher) return;
    if (!effectiveTeacherClassId) return;
    if (effectiveTeacherClassId === activeTeacherClassId && effectiveTeacherClassId === storedTeacherClassId) return;
    persistTeacherClassId(effectiveTeacherClassId);
  }, [isTeacher, effectiveTeacherClassId, activeTeacherClassId, storedTeacherClassId]);

  useEffect(() => {
    if (!isTeacher) return;
    if (!effectiveTeacherSubjectId) return;
    if (effectiveTeacherSubjectId === activeTeacherSubjectId && effectiveTeacherSubjectId === storedTeacherSubjectId) return;
    persistTeacherSubjectId(effectiveTeacherSubjectId);
  }, [isTeacher, effectiveTeacherSubjectId, activeTeacherSubjectId, storedTeacherSubjectId]);

  useEffect(() => {
    setDropdown(null);
  }, [pathname]);

  useEffect(() => {
    const classMatch = pathname?.match(/^\/class\/([^/?#]+)/);
    const classIdFromPath = classMatch?.[1];
    const classIdFromQuery = searchParams?.get('classId');
    const nextClassId = classIdFromPath || classIdFromQuery || '';
    if (!nextClassId) return;
    if (nextClassId !== activeTeacherClassId || nextClassId !== storedTeacherClassId) {
      persistTeacherClassId(nextClassId);
    }
  }, [pathname, searchParams, activeTeacherClassId, storedTeacherClassId]);

  useEffect(() => {
    const subjectMatch = pathname?.match(/^\/subjects\/([^/?#]+)/);
    const subjectIdFromPath = subjectMatch?.[1];
    const subjectIdFromQuery = searchParams?.get('subjectId');
    const nextSubjectId = subjectIdFromPath || subjectIdFromQuery || '';
    if (!nextSubjectId) return;
    if (nextSubjectId !== activeTeacherSubjectId || nextSubjectId !== storedTeacherSubjectId) {
      persistTeacherSubjectId(nextSubjectId);
    }
  }, [pathname, searchParams, activeTeacherSubjectId, storedTeacherSubjectId]);

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

  useEffect(() => {
    setClassItems((context?.classes || []) as DropdownClassItem[]);
  }, [context?.classes]);

  useEffect(() => {
    setSubjectItems(
      (context?.subjects || []).map((subject) => ({
        id: subject.id,
        title: subject.title,
        classIds: (subject.classes || []).map((classItem) => classItem.id),
      }))
    );
  }, [context?.subjects]);

  const isDropdownTrigger = (_href: string) => false;
  const canUseDropdownFor = (_href: string) => false;
  const getDropdownKind = (_href: string) => 'subjects' as const;

  const resetInlinePanels = () => {
    setCreateSubjectOpen(false);
    setJoinSubjectOpen(false);
    setSubjectTitle('');
    setSubjectJoinCode('');
  };

  // Subject is now the primary switcher identity. Preserve the current
  // sub-route (e.g. /attendance) when switching subjects the same way
  // resolveTeacherClassRoute preserves class sub-routes.
  const resolveTeacherSubjectRoute = (nextSubjectId: string) => {
    const defaultRoute = `/subjects/${nextSubjectId}`;
    if (!pathname) return defaultRoute;

    const subjectRouteMatch = pathname.match(/^\/subjects\/[^/?#]+(?<suffix>.*)$/);
    if (subjectRouteMatch) {
      const suffix = subjectRouteMatch.groups?.suffix || '';
      const currentQuery = typeof window !== 'undefined' ? window.location.search : '';
      return `/subjects/${nextSubjectId}${suffix}${currentQuery}`;
    }

    if (pathname === '/' || pathname === '/subjects') return defaultRoute;

    return defaultRoute;
  };

  const loadDropdownData = async () => {
    if (!context) return;
    try {
      await context.warmResources(['subjects:list']);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t.subjectsLoadError,
        description: error?.message || t.tryAgain,
      });
    }
  };

  const submitCreateSubject = async () => {
    if (!subjectTitle.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: subjectTitle.trim(), description: undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to create subject');
      toast({ title: 'Subject created' });
      setSubjectTitle('');
      setCreateSubjectOpen(false);
      await loadDropdownData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: t.createSubjectError, description: error?.message || t.tryAgain });
    } finally {
      setSubmitting(false);
    }
  };

  const submitJoinSubject = async () => {
    if (!subjectJoinCode.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/subjects/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_code: subjectJoinCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to join subject');
      toast({ title: data?.message || (isDutch ? 'Vak toegevoegd' : 'Joined subject') });
      setSubjectJoinCode('');
      setJoinSubjectOpen(false);
      await loadDropdownData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: t.createSubjectError, description: error?.message || t.tryAgain });
    } finally {
      setSubmitting(false);
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
    setDropdown({ kind, left, top });
  };

  const isMenuItemActive = (href: string) => {
    const [basePath] = href.split('?');
    if (basePath === '/agenda') return pathname === '/agenda';
    if (href.startsWith('/subjects/') && href.includes('/attendance')) {
      // "Manage" (subject-scoped attendance) -- don't also light up "Subjects".
      return pathname === basePath;
    }
    if (basePath === '/subjects') {
      return (pathname === '/subjects' || pathname.startsWith('/subjects/')) && !pathname.endsWith('/attendance');
    }
    if (href.startsWith('/tools')) return pathname.startsWith(href);
    return pathname === basePath;
  };

  const visibleMainItems = menuItems;
  const visibleToolsItems = toolsMenuItems;
  const visibleOtherItems = otherMenuItems;
  const showSectionHeaders = false;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const targets = Array.from(
      new Set([
        '/',
        teacherSubjectsHref,
        teacherManageHref,
        teacherAgendaHref,
        '/subjects',
        '/agenda',
        '/tools/studyset',
        '/tools/quiz',
        '/tools/flashcards',
        '/tools/notes',
      ])
    ).slice(0, 10);

    const prefetchLikelyRoutes = () => {
      for (const target of targets) {
        try {
          void router.prefetch(target);
        } catch {}
      }
    };

    const browserWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof browserWindow.requestIdleCallback === 'function') {
      const idleId = browserWindow.requestIdleCallback(prefetchLikelyRoutes, { timeout: 1200 });
      return () => {
        if (typeof browserWindow.cancelIdleCallback === 'function') {
          browserWindow.cancelIdleCallback(idleId);
        }
      };
    }

    const timer = browserWindow.setTimeout(prefetchLikelyRoutes, 300);
    return () => browserWindow.clearTimeout(timer);
  }, [router, teacherSubjectsHref, teacherManageHref, teacherAgendaHref]);

  useEffect(() => {
    if (!isTeacher) return;
    for (const subjectItem of subjectDropdownItems) {
      const target = resolveTeacherSubjectRoute(subjectItem.id);
      try {
        void router.prefetch(target);
      } catch {}
    }
  }, [isTeacher, subjectDropdownItems, router]);

  const renderFloatingDropdown = () => {
    if (!dropdown) return null;
    const items = subjectDropdownItems;
    const emptyText = isDutch ? 'Geen vakken gevonden' : 'No subjects found';
    const loading = context?.preloadSnapshot['subjects:list']?.status === 'loading';

    return (
      <div
        ref={floatingRef}
        className="fixed z-[120] rounded-2xl border border-border/80 bg-[hsl(var(--surface-1))/0.98] shadow-lg shadow-black/10 backdrop-blur-xl"
        style={{ left: dropdown.left, top: dropdown.top }}
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
      >
        <div className="w-max min-w-[11rem] max-w-[22rem] max-h-[65vh] overflow-auto p-1.5">
          <div className="mb-1 flex gap-1 border-b border-border/80 pb-1">
            {isTeacher ? (
              <Button
                size="sm"
                variant="outline"
                  className="h-8 text-[12px] rounded-lg border-transparent surface-interactive text-sidebar-foreground hover:surface-chip"
                onClick={() => setCreateSubjectOpen((v) => !v)}
              >
                + {isDutch ? 'Vak maken' : 'Create subject'}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                  className="h-8 text-[12px] rounded-lg border-transparent surface-interactive text-sidebar-foreground hover:surface-chip"
                onClick={() => setJoinSubjectOpen((v) => !v)}
              >
                {isDutch ? 'Vak toevoegen' : 'Join subject'}
              </Button>
            )}
          </div>

          {joinSubjectOpen && (
            <div className="mb-1 space-y-1 rounded-xl surface-interactive p-2">
              <Input
                placeholder={isDutch ? 'Deelnamecode' : 'Join code'}
                value={subjectJoinCode}
                onChange={(e) => setSubjectJoinCode(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={submitJoinSubject}
                  disabled={submitting || !subjectJoinCode.trim()}
                >
                  {isDutch ? 'Toevoegen' : 'Join'}
                </Button>
              </div>
            </div>
          )}

          {createSubjectOpen && (
            <div className="mb-1 space-y-1 rounded-xl surface-interactive p-2">
              <Input
                placeholder={isDutch ? 'Vaktitel' : 'Subject title'}
                value={subjectTitle}
                onChange={(e) => setSubjectTitle(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={submitCreateSubject}
                  disabled={submitting || !subjectTitle.trim()}
                >
                  {isDutch ? 'Maken' : 'Create'}
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="px-2 py-1.5 text-xs text-sidebar-foreground/80">{isDutch ? 'Laden...' : 'Loading...'}</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-sidebar-foreground/80">{emptyText}</p>
          ) : (
            items.map((entry) => {
              const isActiveEntry = isTeacher && entry.id === effectiveTeacherSubjectId;
              const teacherRoute = isTeacher ? resolveTeacherSubjectRoute(entry.id) : entry.href;
              return (
                <Link
                  key={entry.id}
                  href={isTeacher ? teacherRoute : entry.href}
                  className={cn(
                    'flex items-center justify-between gap-2 truncate rounded-xl px-2.5 py-2 text-[13px] transition-colors',
                    isActiveEntry
                      ? 'surface-chip text-sidebar-foreground'
                      : 'hover:surface-chip text-sidebar-foreground/85 hover:text-sidebar-foreground'
                  )}
                  onClick={(event) => {
                    if (isTeacher) {
                      event.preventDefault();
                      persistTeacherSubjectId(entry.id);
                      try { void router.prefetch(teacherRoute); } catch {}
                      router.replace(teacherRoute);
                    }
                    resetInlinePanels();
                    setDropdown(null);
                    setOpenMobile(false);
                  }}
                  onMouseEnter={() => {
                    if (isTeacher) {
                      try { void router.prefetch(teacherRoute); } catch {}
                    }
                  }}
                >
                  <span className="truncate">{entry.label}</span>
                  {isActiveEntry && <Check className="h-3.5 w-3.5 text-foreground/80" />}
                </Link>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderTeacherSubjectSwitcher = () => {
    if (!isTeacher) return null;
    if (isRailCollapsed) return null;

    if (isPhone) {
      return (
        <div className="mb-2 px-2">
          <Select
            value={effectiveTeacherSubjectId || '__none__'}
            disabled={subjectDropdownItems.length === 0}
            onValueChange={(val) => {
              if (!val || val === '__none__') return;
              persistTeacherSubjectId(val);
              const nextRoute = resolveTeacherSubjectRoute(val);
              try { void router.prefetch(nextRoute); } catch {}
              router.replace(nextRoute);
              setOpenMobile(false);
            }}
          >
            <SelectTrigger className="h-9 w-full text-[12px]">
              <SelectValue placeholder={isDutch ? 'Geen vakken' : 'No subjects'} />
            </SelectTrigger>
            <SelectContent>
              {subjectDropdownItems.length === 0 ? (
                <SelectItem value="__none__" disabled>{isDutch ? 'Geen vakken' : 'No subjects'}</SelectItem>
              ) : (
                subjectDropdownItems.map((subjectItem) => (
                  <SelectItem key={subjectItem.id} value={subjectItem.id}>{subjectItem.label}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <>
      <div className="mb-1.5 px-2">
        <button
          ref={subjectDropdownTriggerRef}
          type="button"
          data-nav-dropdown-trigger="true"
          onClick={(event) => {
            event.preventDefault();
            openDropdownFor('subjects', event.currentTarget);
          }}
          disabled={subjectDropdownItems.length === 0}
          className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border/70 surface-panel px-2.5 text-left text-[13px] font-medium text-sidebar-foreground transition-colors hover:surface-interactive disabled:opacity-60"
        >
          <span className="truncate">
            {subjectDropdownItems.find((subjectItem) => subjectItem.id === effectiveTeacherSubjectId)?.label || (isDutch ? 'Geen vakken' : 'No subjects')}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-sidebar-foreground/70" />
        </button>
      </div>
      </>
    );
  };

  // Phone: show mini sidebar with icons + hamburger drawer
  if (isPhone) {
    return (
      <>
        {/* Mini sidebar - always visible on mobile */}
        <div className={cn("fixed left-0 top-0 z-40 flex h-full w-11 flex-col bg-sidebar py-2 transition-opacity", openMobile && "pointer-events-none opacity-0")}>
          {/* Hamburger button to open full drawer */}
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto mb-2 h-8 w-8"
            onClick={() => setOpenMobile(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* Mini icon navigation */}
          <nav className="flex-1 flex flex-col gap-1 px-1.5">
            {visibleMainItems.map((item) => (
              <div key={item.href} className="relative">
                {isDropdownTrigger(item.href) && canUseDropdownFor(item.href) ? (
                  <AnimateIcon animateOnHover={item.animated !== false} animateOnTap={item.animated !== false} completeOnStop asChild>
                    <button
                      type="button"
                      data-nav-dropdown-trigger="true"
                      onMouseEnter={(e) => openDropdownFor(getDropdownKind(item.href), e.currentTarget)}
                      onMouseLeave={scheduleClose}
                      onClick={(e) => openDropdownFor(getDropdownKind(item.href), e.currentTarget)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                        isMenuItemActive(item.href) || dropdown?.kind === getDropdownKind(item.href)
                          ? "surface-chip text-sidebar-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
                          : "text-sidebar-foreground hover:surface-interactive"
                      )}
                      title={item.label}
                    >
                      <item.icon className="h-4 w-4" />
                    </button>
                  </AnimateIcon>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                      isMenuItemActive(item.href)
                        ? "surface-chip text-sidebar-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
                        : "text-sidebar-foreground hover:surface-interactive"
                    )}
                    title={item.label}
                  >
                    <AnimateIcon animateOnHover={item.animated !== false} animateOnTap={item.animated !== false} completeOnStop>
                      <item.icon className="h-4 w-4" />
                    </AnimateIcon>
                  </Link>
                )}
              </div>
            ))}
            {showSectionHeaders && visibleMainItems.length > 0 && (visibleToolsItems.length > 0 || visibleOtherItems.length > 0) && <div className="h-px bg-sidebar-border my-2" />}
            {visibleToolsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  isMenuItemActive(item.href)
                    ? "surface-chip text-sidebar-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
                    : "text-sidebar-foreground hover:surface-interactive"
                )}
                title={item.label}
              >
                <AnimateIcon animateOnHover={item.animated !== false} animateOnTap={item.animated !== false} completeOnStop>
                  <item.icon className="h-4 w-4" />
                </AnimateIcon>
              </Link>
            ))}
            {showSectionHeaders && visibleToolsItems.length > 0 && visibleOtherItems.length > 0 && <div className="h-px bg-sidebar-border my-2" />}
            {visibleOtherItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  isMenuItemActive(item.href)
                    ? "surface-chip text-sidebar-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
                    : "text-sidebar-foreground hover:surface-interactive"
                )}
                title={item.label}
              >
                <AnimateIcon animateOnHover={item.animated !== false} animateOnTap={item.animated !== false} completeOnStop>
                  <item.icon className="h-4 w-4" />
                </AnimateIcon>
              </Link>
            ))}
          </nav>

          {/* Upgrade at bottom */}
          <div className="mt-auto px-1.5">
            <Link
              href="/upgrade"
              className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:surface-interactive"
              title={isDutch ? 'Upgraden' : 'Upgrade'}
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Full drawer sidebar (when hamburger is clicked) */}
        <Sidebar className="overflow-hidden">
          <SidebarContent className="flex-1 overflow-y-auto px-2 py-2">
            {renderTeacherSubjectSwitcher()}
            {visibleMainItems.length > 0 && (
              <>
                  {showSectionHeaders && <p className="px-2 pb-1 pt-1 text-[11px] font-medium text-sidebar-foreground/80">{t.sectionMain}</p>}
                <SidebarMenu>
                  {visibleMainItems.map((item) => (
                    <SidebarMenuItem key={item.label} className="relative">
                      {isDropdownTrigger(item.href) && canUseDropdownFor(item.href) ? (
                        <AnimateIcon animateOnHover={item.animated !== false} animateOnTap={item.animated !== false} completeOnStop asChild>
                          <SidebarMenuButton
                            data-nav-dropdown-trigger="true"
                            onMouseEnter={(e) => openDropdownFor(getDropdownKind(item.href), e.currentTarget)}
                            onMouseLeave={scheduleClose}
                            onClick={(e) => openDropdownFor(getDropdownKind(item.href), e.currentTarget)}
                            isActive={isMenuItemActive(item.href) || dropdown?.kind === getDropdownKind(item.href)}
                            tooltip={item.label}
                          >
                            <item.icon className="h-4 w-4" />
                            <span className="text-[13px] font-medium leading-4">{item.label}</span>
                          </SidebarMenuButton>
                        </AnimateIcon>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={isMenuItemActive(item.href)}
                          tooltip={item.label}
                        >
                          <Link href={item.href} onClick={() => setOpenMobile(false)}>
                            <AnimateIcon animateOnHover={item.animated !== false} animateOnTap={item.animated !== false} completeOnStop>
                              <item.icon className="h-4 w-4" />
                            </AnimateIcon>
                            <span className="text-[13px] font-medium leading-4">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}

                </SidebarMenu>
              </>
            )}

            {visibleToolsItems.length > 0 && (
              <>
                {showSectionHeaders && visibleMainItems.length > 0 && <div className="h-5" />}
                {showSectionHeaders && <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/80">{t.sectionTools}</p>}
                <SidebarMenu>
                  {visibleToolsItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={isMenuItemActive(item.href)}
                        tooltip={item.label}
                      >
                        <Link href={item.href} onClick={() => setOpenMobile(false)}>
                          <AnimateIcon animateOnHover={item.animated !== false} animateOnTap={item.animated !== false} completeOnStop>
                            <item.icon className="h-4 w-4" />
                          </AnimateIcon>
                          <span className="text-[13px] font-medium leading-4">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </>
            )}

            {visibleOtherItems.length > 0 && (
              <>
                {showSectionHeaders && (visibleMainItems.length > 0 || visibleToolsItems.length > 0) && <div className="h-5" />}
                {showSectionHeaders && <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/80">{t.sectionOther}</p>}
                <SidebarMenu>
                  {visibleOtherItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={isMenuItemActive(item.href)}
                        tooltip={item.label}
                      >
                        <Link href={item.href} onClick={() => setOpenMobile(false)}>
                          <AnimateIcon animateOnHover={item.animated !== false} animateOnTap={item.animated !== false} completeOnStop>
                            <item.icon className="h-4 w-4" />
                          </AnimateIcon>
                          <span className="text-[13px] font-medium leading-4">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </>
            )}

          </SidebarContent>
          <SidebarFooter className="flex flex-col gap-2 px-2 pb-2 pt-2">
            <SidebarProfile />
          </SidebarFooter>
        </Sidebar>
        {renderFloatingDropdown()}
      </>
    );
  }

  // Tablet + desktop: regular sidebar with trigger
  return (
    <Sidebar
      className={cn(isTablet ? "w-[15rem]" : "w-[16.5rem]", "overflow-hidden transition-all duration-300 rounded-br-2xl")}
      collapsible="icon"
    >
      <SidebarContent className="px-2 py-2 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]">
        {renderTeacherSubjectSwitcher()}
        {visibleMainItems.length > 0 && (
          <>
            {showSectionHeaders && <p className="px-2 pb-1 pt-1 text-[11px] font-medium text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">{t.sectionMain}</p>}
            <SidebarMenu>
              {visibleMainItems.map((item) => (
                <SidebarMenuItem key={item.label} className="relative">
                  {isDropdownTrigger(item.href) && canUseDropdownFor(item.href) ? (
                    <AnimateIcon animateOnHover={item.animated !== false} completeOnStop asChild>
                      <SidebarMenuButton
                        data-nav-dropdown-trigger="true"
                        onMouseEnter={(e) => openDropdownFor(getDropdownKind(item.href), e.currentTarget)}
                        onMouseLeave={scheduleClose}
                        onClick={(e) => openDropdownFor(getDropdownKind(item.href), e.currentTarget)}
                        isActive={isMenuItemActive(item.href) || dropdown?.kind === getDropdownKind(item.href)}
                        tooltip={item.label}
                        className="group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                      >
                        <item.icon className="h-4 w-4 shrink-0 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4" />
                        <span className="text-[13px] font-medium leading-4 transition-[opacity,transform] duration-200 group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-1">{item.label}</span>
                      </SidebarMenuButton>
                    </AnimateIcon>
                  ) : (
                    <SidebarNavRow
                      item={item}
                      isActive={isMenuItemActive(item.href)}
                      iconSizeClass="h-4 w-4 shrink-0 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4"
                    />
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </>
        )}

        {visibleToolsItems.length > 0 && (
          <>
            {visibleMainItems.length > 0 && <div className="h-4" />}
            <p className="px-2.5 pb-1 text-[11px] font-medium text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden">{t.sectionTools}</p>
            <SidebarMenu>
              {visibleToolsItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarNavRow
                    item={item}
                    isActive={isMenuItemActive(item.href)}
                    iconSizeClass="h-4 w-4 shrink-0 group-data-[collapsible=icon]:h-3 group-data-[collapsible=icon]:w-3"
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </>
        )}

        {visibleOtherItems.length > 0 && (
          <>
            {showSectionHeaders && (visibleMainItems.length > 0 || visibleToolsItems.length > 0) && <div className="h-2" />}
            {showSectionHeaders && <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">{t.sectionOther}</p>}
            <SidebarMenu className="group-data-[collapsible=icon]:hidden">
              {visibleOtherItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={isMenuItemActive(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <AnimateIcon animateOnHover={item.animated !== false} completeOnStop>
                        <item.icon className="h-4 w-4 shrink-0 group-data-[collapsible=icon]:h-3 group-data-[collapsible=icon]:w-3" />
                      </AnimateIcon>
                      <span className="text-[13px] font-medium leading-4 transition-[opacity,transform] duration-200 group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-1">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </>
        )}

        {/* Recents section — only shows when expanded */}
        <div className="group-data-[collapsible=icon]:hidden mt-4">
          <p className="px-2.5 pb-1 text-[11px] font-medium text-sidebar-foreground/55">{t.recents}</p>
          <RecentsSidebar />
        </div>
      </SidebarContent>
      {renderFloatingDropdown()}
    </Sidebar>
  );
}




