'use client';

import { createContext, useState, useEffect, ReactNode, useCallback, useContext } from 'react';
import type { SessionRecapData } from '@/lib/types';
import type { Tables } from '@/lib/supabase/database.types';
import { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Student, MaterialReference } from '@/lib/teacher-types';
import { getDictionary } from '@/lib/get-dictionary';
import type { Dictionary, Locale } from '@/lib/get-dictionary';

export type UserRole = 'student' | 'teacher';
export type ThemeType = 'light' | 'dark' | 'pastel';
export type ClassInfo = Tables<'classes'>;
export type ClassAssignment = Tables<'assignments'>;

export type PersonalTask = {
  id: string;
  title: string;
  description?: string;
  date?: string;
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

export type AppContextType = {
  session: Session | null;
  isLoading: boolean;
  isLoadingClasses: boolean;
  isLoadingAssignments: boolean;
  isLoadingStudents: boolean;
  dataLoaded: boolean;
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
  createClass: (newClass: { name: string; description: string | null }) => Promise<ClassInfo | null>;
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

// Cache interface
interface DataCache {
  classes: { data: ClassInfo[]; timestamp: number; };
  assignments: { data: ClassAssignment[]; timestamp: number; };
  students: { data: Student[]; timestamp: number; };
  personalTasks: { data: PersonalTask[]; timestamp: number; };
  role: { data: UserRole; timestamp: number; };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const AppContext = createContext<AppContextType | null>(null);

// Optimized localStorage helpers
const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    if (item === null) return defaultValue;
    if (typeof defaultValue === 'string') return item as T;
    const parsed = JSON.parse(item) as T;
    if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
      console.warn(`Corrupted localStorage data for key "${key}", resetting to default`);
      return defaultValue;
    }
    return parsed;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return defaultValue;
  }
};

const saveToLocalStorage = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  try {
    const itemToSave = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, itemToSave);
  } catch (error) {
    console.error(`Error saving to localStorage key "${key}":`, error);
  }
};

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [language, setLanguageState] = useState<Locale>('en');
  const [dictionary, setDictionary] = useState<Dictionary>(() => getDictionary(language));
  const [role, setRoleState] = useState<UserRole>('student');
  const [highContrast, setHighContrastState] = useState(false);
  const [dyslexiaFont, setDyslexiaFontState] = useState(false);
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [theme, setThemeState] = useState<ThemeType>('pastel');
  const [sessionRecap, setSessionRecap] = useState<SessionRecapData | null>(null);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [materials, setMaterials] = useState<MaterialReference[]>([]);

  const [prevSession, setPrevSession] = useState<Session | null>(session);
  const [dataCache, setDataCache] = useState<DataCache | null>(null);

  const supabase = createClient();

  // Load cached data on mount
  useEffect(() => {
    const cached = getFromLocalStorage<DataCache | null>('studyweb-data-cache', null);
    if (cached) {
      setDataCache(cached);
      // Load cached data immediately for instant UI
      setClasses(cached.classes?.data || []);
      setAssignments(cached.assignments?.data || []);
      setStudents(cached.students?.data || []);
      setPersonalTasks(cached.personalTasks?.data || []);
      if (cached.role?.data) setRoleState(cached.role.data);
    }
  }, []);

  // Update cache when data changes
  const updateCache = useCallback((key: keyof DataCache, data: any) => {
    setDataCache(prev => {
      const newCache = {
        ...prev,
        [key]: { data, timestamp: Date.now() }
      } as DataCache;
      saveToLocalStorage('studyweb-data-cache', newCache);
      return newCache;
    });
  }, []);

  // Apply theme
  const applyTheme = useCallback((currentTheme: ThemeType) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-pastel');
    root.classList.add(`theme-${currentTheme}`);
  }, []);

  // Initialize session
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsLoading(false);
    };
    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setIsLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Fetch data with caching
  const fetchData = useCallback(async (force = false) => {
    if (!session) return;

    // Check cache validity
    const now = Date.now();
    const cacheValid = dataCache &&
      (now - (dataCache.classes?.timestamp || 0)) < CACHE_DURATION &&
      (now - (dataCache.assignments?.timestamp || 0)) < CACHE_DURATION &&
      (now - (dataCache.students?.timestamp || 0)) < CACHE_DURATION;

    if (!force && cacheValid) {
      console.log('Using cached data');
      return;
    }

    console.log('Fetching fresh data from server...');

    try {
      // Fetch all data in parallel
      const [classesRes, assignmentsRes, personalTasksRes] = await Promise.allSettled([
        fetch('/api/classes'),
        fetch('/api/assignments'),
        fetch('/api/personal-tasks'),
      ]);

      // Handle classes
      if (classesRes.status === 'fulfilled' && classesRes.value.ok) {
        const classesData = await classesRes.value.json();
        setClasses(classesData || []);
        updateCache('classes', classesData || []);
      }

      // Handle assignments
      if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value.ok) {
        const assignmentsData = await assignmentsRes.value.json();
        setAssignments(assignmentsData || []);
        updateCache('assignments', assignmentsData || []);
      }

      // Handle personal tasks
      if (personalTasksRes.status === 'fulfilled' && personalTasksRes.value.ok) {
        const personalTasksData = await personalTasksRes.value.json();
        setPersonalTasks(personalTasksData || []);
        updateCache('personalTasks', personalTasksData || []);
      }

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, theme, language, high_contrast, dyslexia_font, reduced_motion')
        .eq('id', session.user.id)
        .single();

      if (!profileError && profileData?.role) {
        setRoleState(profileData.role as UserRole);
        updateCache('role', profileData.role);
        saveToLocalStorage('studyweb-role', profileData.role);
      }

      // Fetch students for teacher classes
      if (profileData?.role === 'teacher') {
        const ownedClassIds = (classes as ClassInfo[]).filter(c => c.user_id === session.user.id).map(c => c.id);
        if (ownedClassIds.length > 0 && ownedClassIds.length <= 10) {
          setIsLoadingStudents(true);
          const studentPromises = ownedClassIds.map(id => fetch(`/api/classes/${id}/members`).then(res => res.json()));
          const studentsPerClass = await Promise.all(studentPromises);
          const allStudents = studentsPerClass.flat();
          const uniqueStudents = Array.from(new Set(allStudents.map((s: any) => s.id)))
            .map(id => allStudents.find((s: any) => s.id === id));
          setStudents(uniqueStudents || []);
          updateCache('students', uniqueStudents || []);
          setIsLoadingStudents(false);
        }
      }

      setDataLoaded(true);
      console.log('Fresh data loaded successfully');

    } catch (error) {
      console.error('Failed to fetch data:', error);
      // Keep cached data on error
    }
  }, [session, dataCache, updateCache]);

  // Handle session changes
  useEffect(() => {
    const wasGuest = !prevSession;
    const isLoggedInNow = !!session;

    if (wasGuest && isLoggedInNow) {
      // User just logged in - sync local data then fetch
      console.log('User logged in, syncing data...');
      fetchData(true);
    } else if (session) {
      // Regular session - fetch data if needed
      fetchData();
    }

    setPrevSession(session);
  }, [session, prevSession, fetchData]);

  // Create class with optimistic updates
  const createClass = async (newClassData: { name: string; description: string | null }): Promise<ClassInfo | null> => {
    if (session) {
      try {
        const response = await fetch('/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newClassData),
        });
        if (!response.ok) throw new Error('Failed to create class');
        const savedClass = await response.json();

        // Optimistically update local state
        setClasses(prev => [...prev, savedClass]);
        updateCache('classes', [...classes, savedClass]);

        return savedClass;
      } catch (error) {
        console.error('Error creating class:', error);
        return null;
      }
    } else {
      // Guest mode
      const newClass: ClassInfo = {
        id: `local-${Date.now()}`,
        name: newClassData.name,
        description: newClassData.description,
        created_at: new Date().toISOString(),
        owner_id: 'local-user',
        user_id: null,
        guest_id: null,
        join_code: null,
        owner_type: 'guest',
        status: null,
      };
      const updatedClasses = [...classes, newClass];
      setClasses(updatedClasses);
      saveToLocalStorage('studyweb-local-classes', updatedClasses);
      return newClass;
    }
  };

  // Enhanced role switching
  const setRole = async (newRole: UserRole) => {
    setRoleState(newRole);
    saveToLocalStorage('studyweb-role', newRole);
    updateCache('role', newRole);

    if (session?.user?.id) {
      try {
        await fetch('/api/user/role', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id, newRole }),
        });

        // Refetch data for new role
        console.log('Role changed, refetching data...');
        await fetchData(true);
      } catch (error) {
        console.error('Error updating role:', error);
        setRoleState(getFromLocalStorage('studyweb-role', 'student'));
      }
    }
  };

  // Other functions remain similar but with cache updates
  const refetchClasses = useCallback(async () => {
    if (session) {
      setIsLoadingClasses(true);
      try {
        const res = await fetch('/api/classes');
        if (res.ok) {
          const data = await res.json();
          setClasses(data || []);
          updateCache('classes', data || []);
        }
      } finally {
        setIsLoadingClasses(false);
      }
    }
  }, [session, updateCache]);

  const refetchAssignments = useCallback(async () => {
    if (session) {
      setIsLoadingAssignments(true);
      try {
        const res = await fetch('/api/assignments');
        if (res.ok) {
          const data = await res.json();
          setAssignments(data || []);
          updateCache('assignments', data || []);
        }
      } finally {
        setIsLoadingAssignments(false);
      }
    }
  }, [session, updateCache]);

  // Settings and other functions...
  const setLanguage = (newLanguage: Locale) => {
    setLanguageState(newLanguage);
    saveToLocalStorage('studyweb-language', newLanguage);
    const newDict = getDictionary(newLanguage);
    setDictionary(newDict);
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    saveToLocalStorage('studyweb-high-contrast', enabled);
    const html = document.documentElement;
    if (enabled) html.classList.add('high-contrast');
    else html.classList.remove('high-contrast');
  };

  const setDyslexiaFont = (enabled: boolean) => {
    setDyslexiaFontState(enabled);
    saveToLocalStorage('studyweb-dyslexia-font', enabled);
    const body = document.body;
    if (enabled) body.classList.add('font-dyslexia');
    else body.classList.remove('font-dyslexia');
  };

  const setReducedMotion = (enabled: boolean) => {
    setReducedMotionState(enabled);
    saveToLocalStorage('studyweb-reduced-motion', enabled);
    const body = document.body;
    if (enabled) body.setAttribute('data-reduced-motion', 'true');
    else body.removeAttribute('data-reduced-motion');
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    saveToLocalStorage('studyweb-theme', newTheme);
    applyTheme(newTheme);
  };

  // Initialize settings
  useEffect(() => {
    setLanguageState(getFromLocalStorage('studyweb-language', 'en'));
    const hc = getFromLocalStorage('studyweb-high-contrast', false);
    setHighContrastState(hc);
    if (hc) document.documentElement.classList.add('high-contrast');

    const df = getFromLocalStorage('studyweb-dyslexia-font', false);
    setDyslexiaFontState(df);
    if (df) document.body.classList.add('font-dyslexia');

    const rm = getFromLocalStorage('studyweb-reduced-motion', false);
    setReducedMotionState(rm);
    if (rm) document.body.setAttribute('data-reduced-motion', 'true');

    const savedTheme = getFromLocalStorage('studyweb-theme', 'light');
    setThemeState(savedTheme);
    applyTheme(savedTheme);
  }, [applyTheme]);

  // Placeholder functions for remaining functionality
  const createAssignment = async (newAssignmentData: Omit<ClassAssignment, 'id' | 'created_at'>) => {
    if (session) {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssignmentData),
      });
      if (!response.ok) throw new Error('Failed to create assignment');
      await refetchAssignments();
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (session) {
      const response = await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete assignment');
      await refetchAssignments();
    }
  };

  const createPersonalTask = async (newTaskData: Omit<PersonalTask, 'id' | 'created_at' | 'user_id'>) => {
    if (session) {
      const response = await fetch('/api/personal-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskData),
      });
      if (!response.ok) throw new Error('Failed to create personal task');
      const newTask = await response.json();
      setPersonalTasks(prev => [...prev, newTask]);
      updateCache('personalTasks', [...personalTasks, newTask]);
    }
  };

  const updatePersonalTask = async (id: string, updates: Partial<PersonalTask>) => {
    if (session) {
      const response = await fetch(`/api/personal-tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update personal task');
      setPersonalTasks(prev => prev.map(task => task.id === id ? { ...task, ...updates } : task));
    }
  };

  const refetchMaterials = useCallback(async (classId: string) => {
    if (session) {
      const res = await fetch(`/api/materials?classId=${classId}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data || []);
      }
    }
  }, [session]);

  const contextValue: AppContextType = {
    session,
    isLoading,
    isLoadingClasses,
    isLoadingAssignments,
    isLoadingStudents,
    dataLoaded,
    language,
    setLanguage,
    dictionary,
    role,
    setRole,
    highContrast,
    setHighContrast,
    dyslexiaFont,
    setDyslexiaFont,
    reducedMotion,
    setReducedMotion,
    theme,
    setTheme,
    sessionRecap,
    setSessionRecap,
    classes,
    createClass,
    refetchClasses,
    assignments,
    createAssignment,
    deleteAssignment,
    refetchAssignments,
    students,
    personalTasks,
    createPersonalTask,
    updatePersonalTask,
    materials,
    refetchMaterials,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useDictionary = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useDictionary must be used within an AppContextProvider');
  }
  return { dictionary: context.dictionary };
};