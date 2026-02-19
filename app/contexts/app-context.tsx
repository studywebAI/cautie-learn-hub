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
export type ThemeType = 'light' | 'dark' | 'ocean';
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
};

export const AppContext = createContext<AppContextType | null>(null);

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
  const [hasHydrated, setHasHydrated] = useState(false); // Track if we've loaded from cache
  const [language, setLanguageState] = useState<Locale>('en');
  const [dictionary, setDictionary] = useState<Dictionary>(() => getDictionary(language));
  const [role, setRoleState] = useState<UserRole>('student');
  const [highContrast, setHighContrastState] = useState(false);
  const [dyslexiaFont, setDyslexiaFontState] = useState(false);
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [theme, setThemeState] = useState<ThemeType>('light');
  const [sessionRecap, setSessionRecap] = useState<SessionRecapData | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<DashboardSubject[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [materials, setMaterials] = useState<MaterialReference[]>([]);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const applyTheme = useCallback((currentTheme: ThemeType) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-ocean');
    root.classList.add(`theme-${currentTheme}`);
  }, []);

  // OPTIMIZED: Load cache first (instant), then fetch in parallel
  useEffect(() => {
    // STEP 1: Load from cache IMMEDIATELY (synchronous, instant)
    const cached = getFromLocalStorage('studyweb-cached-dashboard', null as any);
    if (cached) {
      setClasses(cached.classes || []);
      setSubjects(cached.subjects || []);
      setAssignments(cached.assignments || []);
      setPersonalTasks(cached.personalTasks || []);
      setStudents(cached.students || []);
      setRoleState(cached.role || 'student');
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
    const savedTheme = getFromLocalStorage('studyweb-theme', 'light');
    setThemeState(savedTheme);
    applyTheme(savedTheme);

    // STEP 3: Fetch session + dashboard data in PARALLEL
    const init = async () => {
      try {
        // Run both in parallel - no waiting!
        const [sessionResult, dashboardData] = await Promise.all([
          supabase.auth.getSession(),
          fetch('/api/dashboard', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        const newSession = sessionResult.data.session;
        setSession(newSession);

        // Update with fresh data if available
        if (dashboardData) {
          setClasses(dashboardData.classes || []);
          setSubjects(dashboardData.subjects || []);
          setAssignments(dashboardData.assignments || []);
          setPersonalTasks(dashboardData.personalTasks || []);
          setStudents(dashboardData.students || []);
          setRoleState(dashboardData.role || 'student');
          
          // Save to cache for next visit
          saveToLocalStorage('studyweb-cached-dashboard', dashboardData);
        }
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Optionally refetch data on auth change
      if (session) {
        fetch('/api/dashboard', { credentials: 'include' })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data) {
              setClasses(data.classes || []);
              setSubjects(data.subjects || []);
              setAssignments(data.assignments || []);
              setPersonalTasks(data.personalTasks || []);
              setStudents(data.students || []);
              setRoleState(data.role || 'student');
              saveToLocalStorage('studyweb-cached-dashboard', data);
            }
          });
      }
    });

    return () => subscription.unsubscribe();
  }, [applyTheme]);

  const setLanguage = (newLanguage: Locale) => {
    setLanguageState(newLanguage);
    saveToLocalStorage('studyweb-language', newLanguage);
    setDictionary(getDictionary(newLanguage));
    if (session?.user?.id) {
      supabase.from('profiles').update({ language: newLanguage }).eq('id', session.user.id).then(() => {});
    }
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    saveToLocalStorage('studyweb-role', newRole);
    if (session?.user?.id) {
      supabase.from('profiles').upsert({ id: session.user.id, role: newRole }, { onConflict: 'id' }).then(() => {});
    }
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
    applyTheme(newTheme);
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
    session, isLoading, language, setLanguage, dictionary, role, setRole,
    highContrast, setHighContrast, dyslexiaFont, setDyslexiaFont,
    reducedMotion, setReducedMotion, theme, setTheme, sessionRecap, setSessionRecap,
    classes, subjects, createClass, isCreatingClass, refetchClasses,
    assignments, createAssignment, deleteAssignment, refetchAssignments,
    students, personalTasks, createPersonalTask, updatePersonalTask,
    materials, refetchMaterials,
  }), [session, isLoading, language, dictionary, role, highContrast, dyslexiaFont, reducedMotion, theme, sessionRecap, classes, subjects, isCreatingClass, assignments, students, personalTasks, materials]);

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
