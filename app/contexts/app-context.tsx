'use client';

import { createContext, useState, useEffect, ReactNode, useCallback, useContext, useMemo, useRef } from 'react';
import type { SessionRecapData } from '@/lib/types';
import type { Tables } from '@/lib/supabase/database.types';
import { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Student, MaterialReference } from '@/lib/teacher-types';
import { getDictionary } from '@/lib/get-dictionary';
import type { Dictionary, Locale } from '@/lib/get-dictionary';

export type UserRole = 'student' | 'teacher';
export type ThemeType = 'light' | 'sand' | 'legacy' | 'dark' | 'ocean' | 'forest' | 'sunset' | 'rose';
export type FontType = 'ibm-plex';
export type PreloadResourceKey = 'classes:list' | 'subjects:list';
export type PreloadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type PreloadSnapshot = Record<PreloadResourceKey, {
  status: PreloadStatus;
  updatedAt: number | null;
  error: string | null;
}>;
const PRELOAD_FRESH_TTL_MS = 30_000;
const DASHBOARD_MIN_INTERVAL_MS = 5_000;
const DASHBOARD_LAST_FETCH_KEY = 'studyweb-dashboard-last-fetch-at';
// AccentColor removed — themes handle their own accent
export type ClassInfo = Tables<'classes'>;
export type ClassAssignment = Tables<'assignments'> & {
  chapter_id?: string | null;
  class_id?: string | null;
  due_date?: string | null;
  material_id?: string | null;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  scheduled_answer_release_at?: string | null;
  type?: 'homework' | 'small_test' | 'big_test' | null;
  completed?: boolean | null;
  description?: string | null;
  linked_content?: any | null;
};
export type PersonalTask = {
  id: string;
  title: string;
  description?: string;
  date?: string;
  due_date?: string;
  subject?: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  priority?: 'low' | 'medium' | 'high';
  estimated_duration?: number;
  tags?: string[];
  dependencies?: string[];
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at?: string;
  recurrence?: any;
};

export type DashboardSubject = {
  id: string;
  title: string;
  description?: string;
  cover_type?: string;
  cover_image_url?: string;
  classes?: { id: string; name: string }[];
};

export type AppContextType = {
  session: Session | null;
  isLoading: boolean;
  appReady: boolean;
  isTier0Ready: boolean;
  language: Locale;
  setLanguage: (language: Locale) => void;
  dictionary: Dictionary;
  role: UserRole;
  setRole: (role: UserRole) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  dyslexiaFont: boolean;
  setDyslexiaFont: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  font: FontType;
  setFont: (font: FontType) => void;
  sessionRecap: SessionRecapData | null;
  setSessionRecap: (data: SessionRecapData | null) => void;
  classes: ClassInfo[];
  subjects: DashboardSubject[];
  createClass: (newClass: { name: string; description: string | null }) => Promise<ClassInfo | null>;
  isCreatingClass: boolean;
  refetchClasses: () => Promise<void>;
  assignments: ClassAssignment[];
  createAssignment: (newAssignment: Omit<ClassAssignment, 'id' | 'created_at'>) => Promise<void>;
  deleteAssignment: (assignmentId: string) => Promise<void>;
  refetchAssignments: () => Promise<void>;
  students: Student[];
  personalTasks: PersonalTask[];
  createPersonalTask: (newTask: Omit<PersonalTask, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  updatePersonalTask: (id: string, updates: Partial<PersonalTask>) => Promise<void>;
  materials: MaterialReference[];
  refetchMaterials: (classId: string) => Promise<void>;
  preloadSnapshot: PreloadSnapshot;
  warmResources: (keys: PreloadResourceKey[]) => Promise<void>;
};

export const AppContext = createContext<AppContextType | null>(null);

const THEME_VALUES: ThemeType[] = ['light', 'sand', 'legacy', 'dark', 'ocean', 'forest', 'sunset', 'rose'];

const isThemeType = (value: string | null): value is ThemeType => {
  return value !== null && THEME_VALUES.includes(value as ThemeType);
};

const getSystemTheme = (): ThemeType => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getInitialTheme = (): ThemeType => {
  if (typeof window === 'undefined') return 'light';
  const savedTheme = window.localStorage.getItem('studyweb-theme');
  if (isThemeType(savedTheme)) return savedTheme;
  return getSystemTheme();
};

const getInitialFont = (): FontType => {
  return 'ibm-plex';
};

// Fast localStorage helpers - synchronous, instant
const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const item = window.localStorage.getItem(key);
        if (item === null) return defaultValue;
        if (typeof defaultValue === 'string') return item as T;
        return JSON.parse(item) as T;
    } catch { return defaultValue; }
};

const saveToLocalStorage = <T,>(key: string, value: T) => {
    if (typeof window === 'undefined') return;
    try {
        const itemToSave = typeof value === 'string' ? value : JSON.stringify(value);
        window.localStorage.setItem(key, itemToSave);
    } catch {}
};

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [isTier0Ready, setIsTier0Ready] = useState(false);
  const [language, setLanguageState] = useState<Locale>('en');
  const [dictionary, setDictionary] = useState<Dictionary>(() => getDictionary(language));
  const [role, setRoleState] = useState<UserRole>('student');
  const [highContrast, setHighContrastState] = useState(false);
  const [dyslexiaFont, setDyslexiaFontState] = useState(false);
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [theme, setThemeState] = useState<ThemeType>(() => getInitialTheme());
  const [font, setFontState] = useState<FontType>(() => getInitialFont());
  
  const [sessionRecap, setSessionRecap] = useState<SessionRecapData | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<DashboardSubject[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [materials, setMaterials] = useState<MaterialReference[]>([]);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [preloadSnapshot, setPreloadSnapshot] = useState<PreloadSnapshot>({
    'classes:list': { status: 'idle', updatedAt: null, error: null },
    'subjects:list': { status: 'idle', updatedAt: null, error: null },
  });
  const preloadSnapshotRef = useRef<PreloadSnapshot>(preloadSnapshot);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;
  const preloadInFlight = useRef<Partial<Record<PreloadResourceKey, Promise<void>>>>({});
  const initStartedRef = useRef(false);
  const dashboardInFlightRef = useRef<Promise<any | null> | null>(null);
  const lastDashboardFetchAtRef = useRef(0);

  useEffect(() => {
    preloadSnapshotRef.current = preloadSnapshot;
  }, [preloadSnapshot]);

  const applyAppearance = useCallback((currentTheme: ThemeType) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove(
      'theme-light',
      'theme-sand',
      'theme-legacy',
      'theme-dark',
      'theme-ocean',
      'theme-forest',
      'theme-sunset',
      'theme-rose',
    );
    root.classList.add(`theme-${currentTheme}`);
  }, []);

  const applyFont = useCallback((_currentFont: FontType) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('ui-font-georgia', 'ui-font-legacy');
    root.classList.add('ui-font-legacy');
  }, []);

  const setPreloadState = useCallback((key: PreloadResourceKey, next: Partial<PreloadSnapshot[PreloadResourceKey]>) => {
    setPreloadSnapshot((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...next,
      },
    }));
  }, []);

  const fetchClassesResource = useCallback(async () => {
    const res = await fetch('/api/classes', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 401) {
        setClasses([]);
        return;
      }
      throw new Error(`classes fetch failed (${res.status})`);
    }
    const data = await res.json().catch(() => []);
    setClasses(Array.isArray(data) ? data : []);
  }, []);

  const fetchSubjectsResource = useCallback(async () => {
    const params = new URLSearchParams();
    if (role === 'teacher') {
      params.set('lite', '1');
      if (typeof window !== 'undefined') {
        const activeClassId = window.localStorage.getItem('studyweb-last-class-id');
        if (activeClassId) params.set('classId', activeClassId);
      }
    }
    const url = params.size > 0 ? `/api/subjects?${params.toString()}` : '/api/subjects';
    const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 401) {
        setSubjects([]);
        return;
      }
      throw new Error(`subjects fetch failed (${res.status})`);
    }
    const data = await res.json().catch(() => []);
    setSubjects(Array.isArray(data) ? data : []);
  }, [role]);

  const fetchNavigationBundle = useCallback(async () => {
    const preloadRequestId = `nav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const params = new URLSearchParams();
    if (role === 'teacher' && typeof window !== 'undefined') {
      const activeClassId = window.localStorage.getItem('studyweb-last-class-id');
      if (activeClassId) params.set('classId', activeClassId);
    }
    const url = params.size > 0 ? `/api/preload/navigation?${params.toString()}` : '/api/preload/navigation';
    console.info('[PRELOAD][NAV] request start', { preloadRequestId, role, url });
    const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 401) {
        setClasses([]);
        setSubjects([]);
        console.warn('[PRELOAD][NAV] unauthorized', { preloadRequestId, role, status: res.status });
        return;
      }
      const body = await res.text().catch(() => '');
      console.error('[PRELOAD][NAV] failed', { preloadRequestId, role, status: res.status, body });
      throw new Error(`navigation preload failed (${res.status})`);
    }
    const data = await res.json().catch(() => ({}));
    setClasses(Array.isArray(data?.classes) ? data.classes : []);
    setSubjects(Array.isArray(data?.subjects) ? data.subjects : []);
    console.info('[PRELOAD][NAV] success', {
      preloadRequestId,
      role,
      classCount: Array.isArray(data?.classes) ? data.classes.length : 0,
      subjectCount: Array.isArray(data?.subjects) ? data.subjects.length : 0,
    });
  }, [role]);

  const warmResource = useCallback(async (key: PreloadResourceKey) => {
    const snapshot = preloadSnapshotRef.current[key];
    if (
      snapshot.status === 'ready' &&
      snapshot.updatedAt !== null &&
      Date.now() - snapshot.updatedAt < PRELOAD_FRESH_TTL_MS
    ) {
      return;
    }

    if (preloadInFlight.current[key]) {
      await preloadInFlight.current[key];
      return;
    }

    const run = (async () => {
      const startedAt = Date.now();
      setPreloadState(key, { status: 'loading', error: null });
      try {
        await fetchNavigationBundle();
        const updatedAt = Date.now();
        setPreloadState('classes:list', { status: 'ready', updatedAt, error: null });
        setPreloadState('subjects:list', { status: 'ready', updatedAt, error: null });
        console.log('[PRELOAD] Resource ready', { key: 'navigation_bundle', durationMs: updatedAt - startedAt });
      } catch (error: any) {
        setPreloadState(key, {
          status: 'error',
          updatedAt: Date.now(),
          error: error?.message || 'Unknown preload error',
        });
        console.error('[PRELOAD] Resource failed', { key, error: error?.message || error });
      }
    })();

    preloadInFlight.current[key] = run;
    try {
      await run;
    } finally {
      preloadInFlight.current[key] = undefined;
    }
  }, [fetchNavigationBundle, setPreloadState]);

  const warmResources = useCallback(async (keys: PreloadResourceKey[]) => {
    const uniqueKeys = Array.from(new Set(keys));
    await Promise.all(uniqueKeys.map((key) => warmResource(key)));
  }, [warmResource]);

  const warmBootstrapBundle = useCallback(async (classIds: string[]) => {
    if (classIds.length === 0) return;
    const startedAt = Date.now();
    const ids = classIds.slice(0, 8).join(',');
    try {
      const res = await fetch(`/api/preload/bootstrap?classIds=${encodeURIComponent(ids)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`bootstrap preload failed (${res.status})`);
      }
      const payload = await res.json().catch(() => null);
      console.log('[PRELOAD][TIER1] bootstrap bundle ready', {
        durationMs: Date.now() - startedAt,
        classCount: payload?.classes?.length || 0,
      });
    } catch (error: any) {
      console.warn('[PRELOAD][TIER1] bootstrap bundle failed', {
        durationMs: Date.now() - startedAt,
        error: error?.message || String(error),
      });
    }
  }, []);

  const applyDashboardData = useCallback((dashboardData: any) => {
    if (!dashboardData) return;
    const now = Date.now();
    setClasses(dashboardData.classes || []);
    setSubjects(dashboardData.subjects || []);
    setAssignments(dashboardData.assignments || []);
    setPersonalTasks(dashboardData.personalTasks || []);
    setStudents(dashboardData.students || []);
    const subscriptionType = dashboardData.subscription?.type || 'student';
    setRoleState(subscriptionType as UserRole);
    saveToLocalStorage('studyweb-cached-dashboard', dashboardData);
    setPreloadState('classes:list', { status: 'ready', updatedAt: now, error: null });
    setPreloadState('subjects:list', { status: 'ready', updatedAt: now, error: null });

    const activeClassIds = (dashboardData.classes || [])
      .filter((classItem: any) => classItem?.status !== 'archived')
      .slice(0, 4)
      .map((classItem: any) => classItem.id)
      .filter(Boolean);
    void warmBootstrapBundle(activeClassIds);
  }, [setPreloadState, warmBootstrapBundle]);

  const fetchDashboardSnapshot = useCallback(async (force = false, source: 'init' | 'auth_signed_in' | 'manual' = 'manual') => {
    if (dashboardInFlightRef.current) {
      return await dashboardInFlightRef.current;
    }

    const now = Date.now();
    const persistedLastFetchAt =
      typeof window !== 'undefined'
        ? Number(window.sessionStorage.getItem(DASHBOARD_LAST_FETCH_KEY) || '0')
        : 0;
    const effectiveLastFetchAt = Math.max(lastDashboardFetchAtRef.current, persistedLastFetchAt);
    if (!force && now - lastDashboardFetchAtRef.current < DASHBOARD_MIN_INTERVAL_MS) {
      return null;
    }
    if (!force && now - effectiveLastFetchAt < DASHBOARD_MIN_INTERVAL_MS) {
      return null;
    }

    const run = (async () => {
      const startedAt = Date.now();
      lastDashboardFetchAtRef.current = startedAt;
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(DASHBOARD_LAST_FETCH_KEY, String(startedAt));
      }
      return await fetch(`/api/dashboard?source=${source}`, { credentials: 'include', cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);
    })();

    dashboardInFlightRef.current = run;
    try {
      return await run;
    } finally {
      dashboardInFlightRef.current = null;
    }
  }, []);

  // OPTIMIZED: Load cache first (instant), then fetch in parallel
  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    // STEP 1: Load from cache IMMEDIATELY (synchronous, instant)
    const cached = getFromLocalStorage('studyweb-cached-dashboard', null as any);
    if (cached) {
      setClasses(cached.classes || []);
      setSubjects(cached.subjects || []);
      setAssignments(cached.assignments || []);
      setPersonalTasks(cached.personalTasks || []);
      setStudents(cached.students || []);
      const cachedRole = cached?.subscription?.type;
      if (cachedRole === 'teacher' || cachedRole === 'student') {
        setRoleState(cachedRole);
      }
    }

    // STEP 2: Load settings from cache (instant)
    const savedLanguage = getFromLocalStorage('studyweb-language', 'en');
    setLanguageState(savedLanguage);
    setDictionary(getDictionary(savedLanguage));
    const hc = getFromLocalStorage('studyweb-high-contrast', false);
    setHighContrastState(hc);
    if(hc) document.documentElement.classList.add('high-contrast');
    const df = getFromLocalStorage('studyweb-dyslexia-font', false);
    setDyslexiaFontState(df);
    if(df) document.body.classList.add('font-dyslexia');
    const rm = getFromLocalStorage('studyweb-reduced-motion', false);
    setReducedMotionState(rm);
    if(rm) document.body.setAttribute('data-reduced-motion', 'true');
    const resolvedTheme = getInitialTheme();
    setThemeState(resolvedTheme);
    applyAppearance(resolvedTheme);
    const resolvedFont = getInitialFont();
    setFontState(resolvedFont);
    applyFont(resolvedFont);

    const init = async () => {
      const tier0StartedAt = Date.now();
      try {
        const sessionResult = await supabase.auth.getSession();
        const newSession = sessionResult.data.session;
        setSession(newSession);

        if (!newSession) {
          console.log('[PRELOAD][TIER0] ready (no session)', { durationMs: Date.now() - tier0StartedAt });
          setIsTier0Ready(true);
          return;
        }

        // If we already hydrated from local cache, do not immediately hit /api/dashboard again.
        if (cached) {
          const now = Date.now();
          setPreloadState('classes:list', { status: 'ready', updatedAt: now, error: null });
          setPreloadState('subjects:list', { status: 'ready', updatedAt: now, error: null });
          console.log('[PRELOAD][TIER0] using cached dashboard snapshot', { durationMs: Date.now() - tier0StartedAt });
          setIsTier0Ready(true);
          return;
        }

        const dashboardData = await fetchDashboardSnapshot(true, 'init');

        // Update with fresh data when available
        if (dashboardData) {
          applyDashboardData(dashboardData);
        } else {
          await warmResources(['classes:list', 'subjects:list']);
        }
        console.log('[PRELOAD][TIER0] ready', { durationMs: Date.now() - tier0StartedAt });
        setIsTier0Ready(true);
      } catch (e) {
        console.error('Init error:', e);
        console.log('[PRELOAD][TIER0] failed/partial', { durationMs: Date.now() - tier0StartedAt });
        setIsTier0Ready(true);
      } finally {
        setIsLoading(false);
        setAppReady(true);
      }
    };

    init();

    // Listen for auth changes. Ignore token refresh churn because most consumers only need stable identity.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'TOKEN_REFRESHED') return;
      setSession((prevSession) => {
        const prevUserId = prevSession?.user?.id ?? null;
        const nextUserId = nextSession?.user?.id ?? null;
        const prevEmail = prevSession?.user?.email ?? null;
        const nextEmail = nextSession?.user?.email ?? null;
        const authPresenceChanged = Boolean(prevSession) !== Boolean(nextSession);
        const identityChanged = prevUserId !== nextUserId || prevEmail !== nextEmail;
        if (!authPresenceChanged && !identityChanged) return prevSession;
        return nextSession;
      });
    });

    return () => subscription.unsubscribe();
  }, [applyAppearance, applyFont, warmResources, applyDashboardData, fetchDashboardSnapshot, supabase.auth]);

  const setLanguage = (newLanguage: Locale) => {
    setLanguageState(newLanguage);
    saveToLocalStorage('studyweb-language', newLanguage);
    setDictionary(getDictionary(newLanguage));
    if (session?.user?.id) {
      supabase.from('profiles').update({ language: newLanguage }).eq('id', session.user.id).then(() => {});
    }
  };

  // Role is now determined by subscription_type from the database
  // setRole only updates local state (does nothing - kept for API compatibility)
  const setRole = (newRole: UserRole) => {
    // Role is controlled by subscription_type - this function is kept for backward compatibility but does nothing
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    saveToLocalStorage('studyweb-high-contrast', enabled);
    enabled ? document.documentElement.classList.add('high-contrast') : document.documentElement.classList.remove('high-contrast');
  };

  const setDyslexiaFont = (enabled: boolean) => {
    setDyslexiaFontState(enabled);
    saveToLocalStorage('studyweb-dyslexia-font', enabled);
    enabled ? document.body.classList.add('font-dyslexia') : document.body.classList.remove('font-dyslexia');
  };

  const setReducedMotion = (enabled: boolean) => {
    setReducedMotionState(enabled);
    saveToLocalStorage('studyweb-reduced-motion', enabled);
    enabled ? document.body.setAttribute('data-reduced-motion', 'true') : document.body.removeAttribute('data-reduced-motion');
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    saveToLocalStorage('studyweb-theme', newTheme);
    applyAppearance(newTheme);
  };

  const setFont = (_newFont: FontType) => {
    setFontState('ibm-plex');
    saveToLocalStorage('studyweb-font', 'ibm-plex');
    applyFont('ibm-plex');
  };

  const refetchClasses = useCallback(async () => {
    if (session) {
      const res = await fetch('/api/classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data || []);
      }
    }
  }, [session]);

  const refetchAssignments = useCallback(async () => {
    if (session) {
      const res = await fetch('/api/assignments');
      if (res.ok) {
        const data = await res.json();
        setAssignments(data || []);
      }
    }
  }, [session]);

  const createAssignment = useCallback(async (newAssignmentData: Omit<ClassAssignment, 'id' | 'created_at'>) => {
    if (session) {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssignmentData),
      });
      if (!response.ok) throw new Error('Failed');
      await refetchAssignments();
    }
  }, [session, refetchAssignments]);

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    if (session) {
      await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      await refetchAssignments();
    }
  }, [session, refetchAssignments]);

  const createPersonalTask = useCallback(async (newTaskData: Omit<PersonalTask, 'id' | 'created_at' | 'user_id'>) => {
    if (session) {
      const response = await fetch('/api/personal-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskData),
      });
      if (response.ok) {
        const newTask = await response.json();
        setPersonalTasks(prev => [...prev, newTask]);
      }
    }
  }, [session]);

  const updatePersonalTask = useCallback(async (id: string, updates: Partial<PersonalTask>) => {
    if (session) {
      await fetch(`/api/personal-tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setPersonalTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  }, [session]);

  const createClass = useCallback(async (newClassData: { name: string; description: string | null }): Promise<ClassInfo | null> => {
    if (isCreatingClass) return null;
    setIsCreatingClass(true);
    try {
      if (session && role === 'teacher') {
        const response = await fetch('/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newClassData),
        });
        if (!response.ok) throw new Error('Failed');
        const savedClass = await response.json();
        setClasses(prev => [...prev, savedClass]);
        return savedClass;
      }
      return null;
    } finally {
      setIsCreatingClass(false);
    }
  }, [session, role, isCreatingClass]);

  const refetchMaterials = useCallback(async (classId: string) => {
    if (session) {
      const res = await fetch(`/api/materials?classId=${classId}`);
      if (res.ok) setMaterials(await res.json());
    }
  }, [session]);

  const contextValue = useMemo(() => ({
    session, isLoading, appReady, isTier0Ready, language, setLanguage, dictionary, role, setRole,
    highContrast, setHighContrast, dyslexiaFont, setDyslexiaFont,
    reducedMotion, setReducedMotion, theme, setTheme, font, setFont, sessionRecap, setSessionRecap,
    classes, subjects, createClass, isCreatingClass, refetchClasses,
    assignments, createAssignment, deleteAssignment, refetchAssignments,
    students, personalTasks, createPersonalTask, updatePersonalTask,
    materials, refetchMaterials, preloadSnapshot, warmResources,
  }), [session, isLoading, appReady, isTier0Ready, language, dictionary, role, highContrast, dyslexiaFont, reducedMotion, theme, font, sessionRecap, classes, subjects, isCreatingClass, assignments, students, personalTasks, materials, preloadSnapshot, warmResources]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useDictionary = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useDictionary must be used within AppContextProvider');
  return { dictionary: context.dictionary };
};
