'use client';

import dynamic from 'next/dynamic';
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  BookOpen,
  Home,
  BrainCircuit,
  Copy,
  FileSignature,
  Network,
  Route,
  School,
  Calendar,
  Menu,
  ArrowUpRight,
  ChevronDown,
  Check,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { useDeviceTier } from '@/hooks/use-device-tier';
import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type DropdownKind = 'classes' | 'subjects';
type DropdownState = { kind: DropdownKind; left: number; top: number } | null;
type DropdownClassItem = { id: string; name: string; status?: string | null };
type DropdownSubjectItem = { id: string; title: string; classIds: string[] };

const RecentsSidebar = dynamic(
  () => import('./recents-sidebar').then((m) => m.RecentsSidebar),
  { ssr: false }
);

const SidebarProfile = dynamic(
  () => import('./sidebar-profile').then((m) => m.SidebarProfile),
  { ssr: false }
);

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
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const classDropdownTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [classItems, setClassItems] = useState<DropdownClassItem[]>([]);
  const [subjectItems, setSubjectItems] = useState<DropdownSubjectItem[]>([]);
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
  const [joinClassOpen, setJoinClassOpen] = useState(false);
  const [newClassMenuOpen, setNewClassMenuOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [classSubjectTitle, setClassSubjectTitle] = useState('');
  const [subjectTitle, setSubjectTitle] = useState('');
  const [selectedSubjectClassId, setSelectedSubjectClassId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinSubjectTitle, setJoinSubjectTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTeacherClassId, setActiveTeacherClassId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('studyweb-last-class-id') || '';
  });
  const [storedTeacherClassId, setStoredTeacherClassId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('studyweb-last-class-id') || '';
  });

  const isTeacher = context?.role === 'teacher';
  const isDutch = context?.language === 'nl';
  const routeClassIdMatch = pathname?.match(/^\/class\/([^/?#]+)/);
  const routeClassId = routeClassIdMatch?.[1] || searchParams?.get('classId') || '';
  const t = {
    manage: isDutch ? 'Beheer' : 'Manage',
    studyset: isDutch ? 'Studieset' : 'Studyset',
    materials: isDutch ? 'Materialen' : 'Materials',
    untitledClass: isDutch ? 'Naamloze Klas' : 'Untitled Class',
    untitledSubject: isDutch ? 'Naamloos Vak' : 'Untitled Subject',
    classesLoadError: isDutch ? 'Kon klassen niet laden' : 'Could not load classes',
    subjectsLoadError: isDutch ? 'Kon vakken niet laden' : 'Could not load subjects',
    classCreated: isDutch ? 'Klas aangemaakt' : 'Class created',
    createClassError: isDutch ? 'Kon klas niet aanmaken' : 'Could not create class',
    createSubjectError: isDutch ? 'Kon vak niet aanmaken' : 'Could not create subject',
    joinClassError: isDutch ? 'Kon niet deelnemen aan klas' : 'Could not join class',
    tryAgain: isDutch ? 'Probeer opnieuw.' : 'Try again.',
    sectionMain: isDutch ? 'Hoofd' : 'Main',
    sectionTools: isDutch ? 'Tools' : 'Tools',
    sectionOther: isDutch ? 'Overig' : 'Other',
    sectionRecents: isDutch ? 'Recent' : 'Recents',
    upgrade: isDutch ? 'Upgraden' : 'Upgrade',
    selectDifferentClass: isDutch ? 'Selecteer Andere Klas' : 'Select Different Class',
    joinClass: isDutch ? 'Deelnemen Klas' : 'Join Class',
    createNewClass: isDutch ? 'Nieuwe klas maken' : 'Create New Class',
    joinClassAsTeacher: isDutch ? 'Deelnemen als docent' : 'Join Class as Teacher',
    createClassSubtitle: isDutch
      ? 'Stel je klas in met naam, optionele beschrijving en eerste vak.'
      : 'Set up your class with name, optional description, and first subject.',
    joinClassSubtitle: isDutch
      ? 'Neem deel met een code en koppel je vak in deze klas.'
      : 'Join an existing class using a code and define your subject in that class.',
    close: isDutch ? 'Sluiten' : 'Close',
    className: isDutch ? 'Klasnaam' : 'Class Name',
    classDescriptionOptional: isDutch ? 'Beschrijving (optioneel)' : 'Description (optional)',
    firstSubject: isDutch ? 'Eerste vak' : 'First subject',
    cancel: isDutch ? 'Annuleren' : 'Cancel',
    creatingClass: isDutch ? 'Klas maken...' : 'Creating class...',
    createClass: isDutch ? 'Klas maken' : 'Create Class',
    joinCode: isDutch ? 'Deelnamecode' : 'Join Code',
    yourSubject: isDutch ? 'Jouw Vak' : 'Your Subject',
    joining: isDutch ? 'Bezig met deelnemen...' : 'Joining...',
  };
  const isRailCollapsed = !isPhone && sidebarState === 'collapsed';
  const activeClassTab = searchParams?.get('tab') || '';
  const effectiveTeacherClassId =
    routeClassId ||
    activeTeacherClassId ||
    storedTeacherClassId ||
    classItems[0]?.id ||
    (context?.classes?.find((classItem) => classItem.status !== 'archived')?.id || '');
  const teacherSubjectsHref = isTeacher && effectiveTeacherClassId ? `/subjects?classId=${effectiveTeacherClassId}` : '/subjects';
  const teacherManageHref = isTeacher && effectiveTeacherClassId ? `/class/${effectiveTeacherClassId}?tab=group` : '/classes';
  const teacherAgendaHref = isTeacher && effectiveTeacherClassId ? `/agenda?classId=${effectiveTeacherClassId}` : '/agenda';

  const menuItems = isTeacher
    ? [
        { href: '/', label: dictionary.sidebar.dashboard, icon: Home },
        { href: teacherSubjectsHref, label: dictionary.sidebar.subjects, icon: BookOpen },
        { href: teacherManageHref, label: t.manage, icon: School },
        { href: teacherAgendaHref, label: dictionary.sidebar.agenda, icon: Calendar },
      ]
    : [
        { href: '/', label: dictionary.sidebar.dashboard, icon: Home },
        { href: '/subjects', label: dictionary.sidebar.subjects, icon: BookOpen },
        { href: '/classes', label: t.manage, icon: School },
        { href: '/agenda', label: dictionary.sidebar.agenda, icon: Calendar },
      ];

  const toolsMenuItems = [
    { href: '/tools/studyset', label: t.studyset, icon: Route },
    { href: '/tools/quiz', label: dictionary.sidebar.tools.quizGenerator, icon: BrainCircuit },
    { href: '/tools/flashcards', label: dictionary.sidebar.tools.flashcardMaker, icon: Copy },
    { href: '/tools/notes', label: dictionary.sidebar.tools.notes, icon: FileSignature },
    { href: '/tools/wordweb', label: 'Wordweb', icon: Network },
    { href: '/tools/timeline', label: isDutch ? 'Tijdlijn' : 'Timeline', icon: Calendar },
  ];

  const otherMenuItems = [
    { href: '/other/materials', label: t.materials, icon: FolderOpen },
  ];

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


  const classDropdownItems = useMemo(() => {
    return [...classItems]
      .filter((classItem) => classItem.status !== 'archived')
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
        .map((classItem) => ({
        id: classItem.id,
        label: String(classItem?.name || t.untitledClass),
        href: `/class/${classItem.id}`,
      }));
  }, [classItems, t.untitledClass]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
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
    if (classDropdownItems.length === 0) return;

    const storageClassId =
      typeof window !== 'undefined' ? window.localStorage.getItem('studyweb-last-class-id') : null;
    const preferredClassId = routeClassId || activeTeacherClassId || storedTeacherClassId || storageClassId || classDropdownItems[0].id;
    const preferredClass =
      classDropdownItems.find((classItem) => classItem.id === preferredClassId) || classDropdownItems[0];
    if (preferredClass.id !== activeTeacherClassId || preferredClass.id !== storedTeacherClassId) {
      persistTeacherClassId(preferredClass.id);
    }
  }, [isTeacher, classDropdownItems, routeClassId, activeTeacherClassId, storedTeacherClassId]);

  useEffect(() => {
    if (!isTeacher) return;
    if (!effectiveTeacherClassId) return;
    if (effectiveTeacherClassId === activeTeacherClassId && effectiveTeacherClassId === storedTeacherClassId) return;
    persistTeacherClassId(effectiveTeacherClassId);
  }, [isTeacher, effectiveTeacherClassId, activeTeacherClassId, storedTeacherClassId]);

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
    const openClassDropdown = () => {
      if (!isTeacher || !classDropdownTriggerRef.current) return;
      setNewClassMenuOpen(false);
      setCreateClassOpen(false);
      setJoinClassOpen(false);
      openDropdownFor('classes', classDropdownTriggerRef.current);
    };

    window.addEventListener('cautie:open-class-dropdown', openClassDropdown);
    return () => window.removeEventListener('cautie:open-class-dropdown', openClassDropdown);
  }, [isTeacher]);

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
    setCreateClassOpen(false);
    setCreateSubjectOpen(false);
    setJoinClassOpen(false);
    setNewClassMenuOpen(false);
    setClassName('');
    setClassDescription('');
    setClassSubjectTitle('');
    setSubjectTitle('');
    setSelectedSubjectClassId('');
    setJoinCode('');
    setJoinSubjectTitle('');
  };

  const resolveTeacherClassRoute = (nextClassId: string) => {
    const defaultRoute = `/class/${nextClassId}?tab=group`;
    if (!pathname) return defaultRoute;

    const classRouteMatch = pathname.match(/^\/class\/[^/?#]+(?<suffix>.*)$/);
    if (classRouteMatch) {
      const suffix = classRouteMatch.groups?.suffix || '';
      if (suffix === '/agenda' || suffix.startsWith('/agenda/')) {
        return `/agenda?classId=${nextClassId}`;
      }
      const currentQuery = typeof window !== 'undefined' ? window.location.search : '';
      return `/class/${nextClassId}${suffix}${currentQuery}`;
    }

    if (pathname === '/subjects') return `/class/${nextClassId}?tab=group`;
    if (pathname.startsWith('/subjects/')) return `/class/${nextClassId}?tab=group`;
    if (pathname === '/agenda') return `/agenda?classId=${nextClassId}`;
    if (pathname === '/' || pathname === '/classes') return defaultRoute;

    return defaultRoute;
  };

  const loadDropdownData = async (kind: DropdownKind) => {
    if (!context) return;
    try {
      if (kind === 'classes') {
        await context.warmResources(['classes:list']);
      } else {
        await context.warmResources(['subjects:list']);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: kind === 'classes' ? t.classesLoadError : t.subjectsLoadError,
        description: error?.message || t.tryAgain,
      });
    }
  };

  const waitForClassAvailability = async (createdClassId: string) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const response = await fetch(`/api/classes/${createdClassId}`, { cache: 'no-store' });
        if (response.ok) return true;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
  };

  const submitCreateClass = async () => {
    if (!className.trim() || !classSubjectTitle.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: className.trim(),
          description: classDescription.trim() || null,
          subject_title: classSubjectTitle.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to create class');
      if (data?.id) {
        persistTeacherClassId(data.id);
        await waitForClassAvailability(data.id);
        await loadDropdownData('classes');
        router.replace(resolveTeacherClassRoute(data.id));
      }
      toast({ title: t.classCreated });
      setClassName('');
      setClassDescription('');
      setClassSubjectTitle('');
      setCreateClassOpen(false);
      setNewClassMenuOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: t.createClassError, description: error?.message || t.tryAgain });
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
          class_ids: [selectedSubjectClassId],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to create subject');
      toast({ title: 'Subject created' });
      setSubjectTitle('');
      setCreateSubjectOpen(false);
      await loadDropdownData('subjects');
    } catch (error: any) {
      toast({ variant: 'destructive', title: t.createSubjectError, description: error?.message || t.tryAgain });
    } finally {
      setSubmitting(false);
    }
  };

  const submitJoinClass = async () => {
    if (!joinCode.trim()) return;
    if (isTeacher && !joinSubjectTitle.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_code: joinCode.trim(),
          subject_title: isTeacher ? joinSubjectTitle.trim() : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to join class');
      toast({ title: data?.message || 'Joined class' });
      if (data?.pendingApproval) {
        setJoinCode('');
        setJoinSubjectTitle('');
        setJoinClassOpen(false);
        setNewClassMenuOpen(false);
        return;
      }
      const joinedClassId = data?.class?.id;
      if (joinedClassId) {
        persistTeacherClassId(joinedClassId);
        router.push(resolveTeacherClassRoute(joinedClassId));
      }
      setJoinCode('');
      setJoinSubjectTitle('');
      setJoinClassOpen(false);
      setNewClassMenuOpen(false);
      await loadDropdownData('classes');
    } catch (error: any) {
      toast({ variant: 'destructive', title: t.joinClassError, description: error?.message || t.tryAgain });
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
    if (href.startsWith('/class/')) {
      const [basePath, queryString] = href.split('?');
      if (pathname !== basePath) return false;
      if (!queryString) return true;
      const expectedTab = new URLSearchParams(queryString).get('tab');
      return expectedTab ? activeClassTab === expectedTab : true;
    }
    if (basePath === '/classes') return pathname === '/classes' || pathname.startsWith('/class/');
    if (basePath === '/agenda') return pathname === '/agenda';
    if (basePath === '/subjects') return pathname === '/subjects' || pathname.startsWith('/subjects/');
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
        '/other/materials',
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
    for (const classItem of classDropdownItems) {
      const target = resolveTeacherClassRoute(classItem.id);
      try {
        void router.prefetch(target);
      } catch {}
    }
  }, [isTeacher, classDropdownItems, router, pathname, searchParams]);

  const renderFloatingDropdown = () => {
    if (!dropdown) return null;
    const items = dropdown.kind === 'classes' ? classDropdownItems : subjectDropdownItems;
    const emptyText = dropdown.kind === 'classes'
      ? (isDutch ? 'Geen klassen gevonden' : 'No classes found')
      : (isDutch ? 'Geen vakken gevonden' : 'No subjects found');
    const loading =
      dropdown.kind === 'classes'
        ? context?.preloadSnapshot['classes:list']?.status === 'loading'
        : context?.preloadSnapshot['subjects:list']?.status === 'loading';

    return (
      <div
        ref={floatingRef}
        className="fixed z-[120] rounded-2xl border border-border/80 bg-[hsl(var(--surface-1))/0.98] shadow-lg shadow-black/10 backdrop-blur-xl"
        style={{ left: dropdown.left, top: dropdown.top }}
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
      >
        <div className="w-max min-w-[11rem] max-w-[22rem] max-h-[65vh] overflow-auto p-1.5">
          {dropdown.kind === 'classes' && (
            <div className="px-2 py-1 text-[12px] tracking-[0.08em] text-muted-foreground">
                {t.selectDifferentClass}
            </div>
          )}
          <div className="mb-1 flex gap-1 border-b border-border/80 pb-1">
            {dropdown.kind === 'classes' && isTeacher && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-xl border-transparent surface-interactive px-3 text-[12px] text-sidebar-foreground hover:surface-chip"
                onClick={() => {
                  setNewClassMenuOpen(false);
                  setCreateClassOpen(false);
                  setJoinClassOpen(false);
                  setCreateClassOpen(true);
                }}
              >
                + {isDutch ? 'Nieuwe klas' : 'New class'}
              </Button>
            )}
            {dropdown.kind === 'classes' && !isTeacher && (
              <Button
                size="sm"
                variant="outline"
                  className="h-8 text-[12px] rounded-lg border-transparent surface-interactive text-sidebar-foreground hover:surface-chip"
                onClick={() => {
                  setJoinClassOpen((v) => !v);
                  setCreateClassOpen(false);
                }}
              >
                {t.joinClass}
              </Button>
            )}
            {dropdown.kind === 'subjects' && isTeacher && (
              <Button
                size="sm"
                variant="outline"
                  className="h-8 text-[12px] rounded-lg border-transparent surface-interactive text-sidebar-foreground hover:surface-chip"
                onClick={() => setCreateSubjectOpen((v) => !v)}
              >
                + {isDutch ? 'Vak maken' : 'Create subject'}
              </Button>
            )}
          </div>

          {createSubjectOpen && (
            <div className="mb-1 space-y-1 rounded-xl surface-interactive p-2">
              <select
                value={selectedSubjectClassId}
                onChange={(e) => setSelectedSubjectClassId(e.target.value)}
                className="h-8 w-full rounded border border-border/30 bg-background px-2 text-sm"
              >
                <option value="">{isDutch ? 'Selecteer klas' : 'Select class'}</option>
                {classDropdownItems.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.label}
                  </option>
                ))}
              </select>
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
                  disabled={submitting || !subjectTitle.trim() || !selectedSubjectClassId}
                >
                  {isDutch ? 'Maken' : 'Create'}
                </Button>
              </div>
            </div>
          )}

          {dropdown.kind === 'classes' && isTeacher && newClassMenuOpen && !createClassOpen && !joinClassOpen && (
            <div className="mb-1 space-y-1 rounded-xl surface-interactive p-2">
              <Button
                size="sm"
                variant="outline"
                 className="h-8 w-full justify-start rounded-xl text-[12px]"
                onClick={() => {
                  setCreateClassOpen(true);
                  setNewClassMenuOpen(false);
                }}
              >
                {isDutch ? 'Nieuwe klas maken' : 'Create new class'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                 className="h-8 w-full justify-start rounded-xl text-[12px]"
                onClick={() => {
                  setJoinClassOpen(true);
                  setNewClassMenuOpen(false);
                }}
              >
                {isDutch ? 'Deelnemen als docent (samenwerken)' : 'Join as teacher (collaborate)'}
              </Button>
            </div>
          )}

          {loading ? (
            <p className="px-2 py-1.5 text-xs text-sidebar-foreground/80">{isDutch ? 'Laden...' : 'Loading...'}</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-sidebar-foreground/80">{emptyText}</p>
          ) : (
            items.map((entry) => (
              <Link
                key={entry.id}
                href={dropdown.kind === 'classes' && isTeacher ? resolveTeacherClassRoute(entry.id) : entry.href}
                className={cn(
                  'flex items-center justify-between gap-2 truncate rounded-xl px-2.5 py-2 text-[13px] transition-colors',
                  dropdown.kind === 'classes' && entry.id === effectiveTeacherClassId
                    ? 'surface-chip text-sidebar-foreground'
                    : 'hover:surface-chip text-sidebar-foreground/85 hover:text-sidebar-foreground'
                )}
                onClick={(event) => {
                  if (dropdown.kind === 'classes' && isTeacher) {
                    event.preventDefault();
                    persistTeacherClassId(entry.id);
                    const nextRoute = resolveTeacherClassRoute(entry.id);
                    try {
                      void router.prefetch(nextRoute);
                    } catch {}
                    router.replace(nextRoute);
                  }
                  resetInlinePanels();
                  setDropdown(null);
                  setOpenMobile(false);
                }}
                onMouseEnter={() => {
                  if (dropdown.kind === 'classes' && isTeacher) {
                    const nextRoute = resolveTeacherClassRoute(entry.id);
                    try {
                      void router.prefetch(nextRoute);
                    } catch {}
                  }
                }}
              >
                <span className="truncate">{entry.label}</span>
                {dropdown.kind === 'classes' && entry.id === effectiveTeacherClassId && (
                  <Check className="h-3.5 w-3.5 text-foreground/80" />
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderTeacherClassSwitcher = () => {
    if (!isTeacher) return null;
    if (isRailCollapsed) return null;

    if (isPhone) {
      return (
        <div className="mb-2 px-2">
                      <label className="mb-1 block text-[11px] font-medium text-sidebar-foreground/80">
            {isDutch ? 'Klas' : 'Class'}
          </label>
          <select
            value={effectiveTeacherClassId}
            onChange={(event) => {
              const nextClassId = event.target.value;
              if (!nextClassId) return;
              persistTeacherClassId(nextClassId);
              const nextRoute = resolveTeacherClassRoute(nextClassId);
              try {
                void router.prefetch(nextRoute);
              } catch {}
              router.replace(nextRoute);
              setOpenMobile(false);
            }}
            disabled={classDropdownItems.length === 0}
            className="h-8 w-full rounded-xl border-transparent surface-interactive px-3 text-[12px] text-sidebar-foreground transition-colors hover:surface-chip disabled:opacity-60"
          >
            {classDropdownItems.length === 0 ? (
              <option value="">{isDutch ? 'Geen klassen' : 'No classes'}</option>
            ) : (
              classDropdownItems.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.label}
                </option>
              ))
            )}
          </select>
        </div>
      );
    }

    return (
      <>
      <div className="mb-1.5 px-2">
                    <label className="mb-1 block text-[11px] font-medium text-sidebar-foreground/80">
          {isDutch ? 'Klas' : 'Class'}
        </label>
        <Button
          size="sm"
          variant="outline"
          className="mb-1 h-7 w-full justify-start rounded-xl border-transparent surface-interactive px-2.5 text-[11px] font-normal text-sidebar-foreground hover:surface-chip"
          onClick={(event) => {
            openDropdownFor('classes', event.currentTarget);
            setNewClassMenuOpen(false);
            setJoinClassOpen(false);
            setCreateClassOpen(true);
          }}
        >
          + {isDutch ? 'Nieuwe klas' : 'New class'}
        </Button>
        <button
          ref={classDropdownTriggerRef}
          type="button"
          data-nav-dropdown-trigger="true"
          onClick={(event) => {
            setNewClassMenuOpen(false);
            setCreateClassOpen(false);
            setJoinClassOpen(false);
            openDropdownFor('classes', event.currentTarget);
          }}
          disabled={classDropdownItems.length === 0}
          className="h-7 w-full rounded-xl border-transparent surface-interactive px-2.5 text-left text-[11px] text-sidebar-foreground transition-colors hover:surface-chip disabled:opacity-60"
        >
          <span className="flex items-center justify-between gap-2">
              <span className="truncate">
              {classDropdownItems.find((classItem) => classItem.id === effectiveTeacherClassId)?.label || (isDutch ? 'Geen klassen' : 'No classes')}
            </span>
            <ChevronDown className="h-4 w-4 text-sidebar-foreground/70" />
          </span>
        </button>
      </div>
      {(createClassOpen || joinClassOpen) && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-border surface-panel shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-xl leading-tight">
                  {createClassOpen ? t.createNewClass : t.joinClassAsTeacher}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {createClassOpen
                    ? t.createClassSubtitle
                    : t.joinClassSubtitle}
                </p>
              </div>
              <Button
                variant="ghost"
                className="h-8 px-3"
                onClick={() => {
                  setCreateClassOpen(false);
                  setJoinClassOpen(false);
                }}
              >
                {t.close}
              </Button>
            </div>
            <div className="space-y-5 px-6 py-5">
              {createClassOpen && (
                <>
                  <div className="space-y-1.5">
                    <p className="text-sm text-muted-foreground">{t.className}</p>
                    <Input
                      placeholder=""
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="h-11 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm text-muted-foreground">{t.classDescriptionOptional}</p>
                    <Input
                      placeholder=""
                      value={classDescription}
                      onChange={(e) => setClassDescription(e.target.value)}
                      className="h-11 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm text-muted-foreground">{t.firstSubject}</p>
                    <Input
                      placeholder=""
                      value={classSubjectTitle}
                      onChange={(e) => setClassSubjectTitle(e.target.value)}
                      className="h-11 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="h-10 px-4"
                      onClick={() => setCreateClassOpen(false)}
                      disabled={submitting}
                    >
                      {t.cancel}
                    </Button>
                    <Button
                      className="h-10 px-4"
                      onClick={submitCreateClass}
                      disabled={submitting || !className.trim() || !classSubjectTitle.trim()}
                    >
                      {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.creatingClass}</> : t.createClass}
                    </Button>
                  </div>
                </>
              )}
              {joinClassOpen && (
                <>
                  <div className="space-y-1.5">
                    <p className="text-sm text-muted-foreground">{t.joinCode}</p>
                    <Input
                      placeholder=""
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="h-11 text-sm"
                    />
                  </div>
                  {isTeacher && (
                    <div className="space-y-1.5">
                      <p className="text-sm text-muted-foreground">{t.yourSubject}</p>
                      <Input
                        placeholder=""
                        value={joinSubjectTitle}
                        onChange={(e) => setJoinSubjectTitle(e.target.value)}
                        className="h-11 text-sm"
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="h-10 px-4"
                      onClick={() => setJoinClassOpen(false)}
                      disabled={submitting}
                    >
                      {t.cancel}
                    </Button>
                    <Button
                      className="h-10 px-4"
                      onClick={submitJoinClass}
                      disabled={submitting || !joinCode.trim() || (isTeacher && !joinSubjectTitle.trim())}
                    >
                      {submitting ? t.joining : t.joinClass}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
                  <>
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
                  </>
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
                    <item.icon className="h-4 w-4" />
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
                <item.icon className="h-4 w-4" />
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
                <item.icon className="h-4 w-4" />
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
        <Sidebar className="w-[min(17rem,calc(100vw-3rem))]">
          <SidebarContent className="flex-1 px-2.5 py-2.5">
            {renderTeacherClassSwitcher()}
            {visibleMainItems.length > 0 && (
              <>
                  {showSectionHeaders && <p className="px-2 pb-1 pt-1 text-[11px] font-medium text-sidebar-foreground/80">{t.sectionMain}</p>}
                <SidebarMenu>
                  {visibleMainItems.map((item) => (
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
                            <item.icon className="h-4 w-4" />
                            <span className="text-[12px] leading-4">{item.label}</span>
                          </SidebarMenuButton>
                        </>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={isMenuItemActive(item.href)}
                          tooltip={item.label}
                        >
                          <Link href={item.href} onClick={() => setOpenMobile(false)}>
                            <item.icon className="h-4 w-4" />
                            <span className="text-[12px] leading-4">{item.label}</span>
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
                          <item.icon className="h-4 w-4" />
                          <span className="text-[12px] leading-4">{item.label}</span>
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
                          <item.icon className="h-4 w-4" />
                          <span className="text-[12px] leading-4">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </>
            )}

            <div className="space-y-2">
              {showSectionHeaders && (visibleMainItems.length > 0 || visibleToolsItems.length > 0 || visibleOtherItems.length > 0) && <div className="h-5" />}
                {showSectionHeaders && <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/80">{t.sectionRecents}</p>}
              <RecentsSidebar />
            </div>
          </SidebarContent>
          <SidebarFooter className="flex flex-col gap-2 px-2.5 pb-2.5 pt-2">
            <SidebarProfile />
          </SidebarFooter>
        </Sidebar>
        {renderFloatingDropdown()}
      </>
    );
  }

  // Tablet + desktop: regular sidebar with trigger
  return (
    <Sidebar className={cn(isTablet ? "w-[12.75rem]" : "w-[14.5rem] lg:w-[15.5rem]")} collapsible="icon">
      <div className="absolute top-1/2 right-0 transform -translate-y-1/2 z-50">
        <SidebarTrigger />
      </div>
      <SidebarContent className="px-2.5 py-2.5 flex-1">
        {renderTeacherClassSwitcher()}
        {visibleMainItems.length > 0 && (
          <>
                  {showSectionHeaders && <p className="px-2 pb-1 pt-1 text-[11px] font-medium text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">{t.sectionMain}</p>}
            <SidebarMenu>
              {visibleMainItems.map((item) => (
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
                        <item.icon className="h-4 w-4" />
                        <span className="text-[12px] leading-4">{item.label}</span>
                      </SidebarMenuButton>
                    </>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={isMenuItemActive(item.href)}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span className="text-[12px] leading-4">{item.label}</span>
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
                {showSectionHeaders && <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">{t.sectionTools}</p>}
            <SidebarMenu>
              {visibleToolsItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={isMenuItemActive(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span className="text-[12px] leading-4">{item.label}</span>
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
                      <item.icon className="h-4 w-4" />
                      <span className="text-[12px] leading-4">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </>
        )}

        <div className="space-y-2">
          {showSectionHeaders && (visibleMainItems.length > 0 || visibleToolsItems.length > 0 || visibleOtherItems.length > 0) && <div className="h-5" />}
              {showSectionHeaders && <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/80">{t.sectionRecents}</p>}
          <RecentsSidebar />
        </div>
      </SidebarContent>
      <SidebarFooter className="px-2.5 pt-2 pb-2.5 flex flex-col gap-2">
        <SidebarProfile />
      </SidebarFooter>
      {renderFloatingDropdown()}
    </Sidebar>
  );
}


