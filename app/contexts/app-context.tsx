'use client';

import { createContext, useState, useEffect, ReactNode, useCallback, useContext, useMemo } from 'react';
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

// Helper functions for local storage..
const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const item = window.localStorage.getItem(key);
        if (item === null) return defaultValue;
        // For non-string types, parse JSON. For strings, just return the item.
        if (typeof defaultValue === 'string') {
            return item as T;
        }
        const parsed = JSON.parse(item) as T;
        // Ensure arrays are arrays
        if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
            console.warn(`Corrupted localStorage data for key "${key}", resetting to default`);
            return defaultValue;
        }
        return parsed;
    } catch (error) {
        // If parsing fails, it's likely a plain string that shouldn't have been parsed.
        // This is a recovery mechanism from the previous bug.a
        const item = window.localStorage.getItem(key);
        if (item) {
          return item as T;
        }
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

  const [language, setLanguageState] = useState<Locale>('en');
  const [dictionary, setDictionary] = useState<Dictionary>(() => getDictionary(language));
  const [role, setRoleState] = useState<UserRole>('student');
  const [highContrast, setHighContrastState] = useState(false);
  const [dyslexiaFont, setDyslexiaFontState] = useState(false);
  const [reducedMotion, setReducedMotionState] = useState(false);

  // Theme state
  const [theme, setThemeState] = useState<ThemeType>('pastel');

  const [sessionRecap, setSessionRecap] = useState<SessionRecapData | null>(null);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [materials, setMaterials] = useState<MaterialReference[]>([]);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isSyncingData, setIsSyncingData] = useState(false);

  // Track previous session state to detect login
  const [prevSession, setPrevSession] = useState<Session | null>(session);

  const supabase = createClient();

  // Apply theme to document
  const applyTheme = useCallback((currentTheme: ThemeType) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove('theme-light', 'theme-dark', 'theme-pastel');

    // Apply theme class
    root.classList.add(`theme-${currentTheme}`);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const syncLocalDataToSupabase = useCallback(async () => {
    // Prevent multiple simultaneous sync operations
    if (isSyncingData) {
      console.warn('Data sync already in progress, ignoring duplicate request');
      return;
    }

    console.log("Starting data sync to Supabase...");
    setIsSyncingData(true);

    const localClasses = getFromLocalStorage<ClassInfo[]>('studyweb-local-classes', []);
    const localAssignments = getFromLocalStorage<ClassAssignment[]>('studyweb-local-assignments', []);
    const localPersonalTasks = getFromLocalStorage<PersonalTask[]>('studyweb-local-personal-tasks', []);

    if (localClasses.length === 0 && localAssignments.length === 0 && localPersonalTasks.length === 0) {
      console.log("No local data to sync.");
      setIsSyncingData(false);
      return; // Nothing to sync
    }

    try {
      // Get user role before syncing
      let userRole: UserRole = 'student';
      if (session?.user?.id) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profile?.role) {
            userRole = profile.role as UserRole;
          }
        } catch (roleError) {
          console.error('Error fetching user role for sync:', roleError);
          userRole = 'student'; // Default to student
        }
      }

      // Sync classes - only for teachers (students join classes instead of creating them)
      let syncedClasses: { localId: string; remoteId: string }[] = [];
      if (userRole === 'teacher' && localClasses.length > 0) {
        syncedClasses = await Promise.all(localClasses.map(async (cls: ClassInfo) => {
          const response = await fetch('/api/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: cls.name, description: cls.description }),
          });
          if (!response.ok) throw new Error(`Failed to sync class: ${cls.name}`);
          const savedClass = await response.json();
          // Return a map from old local ID to new remote ID
          return { localId: cls.id, remoteId: savedClass.id };
        }));
        console.log("Synced classes for teacher:", syncedClasses);
      } else if (userRole === 'student' && localClasses.length > 0) {
        console.log("Skipping class sync for student - students should join classes instead of creating them");
      }

      // Create a mapping from old local class IDs to new Supabase class IDs
      const classIdMap = new Map(syncedClasses.map(c => [c.localId, c.remoteId]));

      // Sync assignments, using the new class IDs
      if (userRole === 'teacher' && localAssignments.length > 0) {
        await Promise.all(localAssignments.map(async (asn: ClassAssignment) => {
          const remoteClassId = asn.class_id ? classIdMap.get(asn.class_id) : null;
          if (!remoteClassId) {
            console.warn(`Skipping assignment "${asn.title}" because its class was not synced or has no class_id.`);
            return;
          }
          const response = await fetch('/api/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: asn.title,
                class_id: remoteClassId,
                paragraph_id: asn.paragraph_id,
                assignment_index: asn.assignment_index,
                answers_enabled: asn.answers_enabled,
            }),
          });
          if (!response.ok) throw new Error(`Failed to sync assignment: ${asn.title}`);
        }));
        console.log("Synced assignments for teacher.");
      } else if (userRole === 'student' && localAssignments.length > 0) {
        console.log("Skipping assignment sync for student - assignments are managed by teachers");
      }
      console.log("Synced assignments.");

      // Sync personal tasks
      await Promise.all(localPersonalTasks.map(async (task: PersonalTask) => {
        const response = await fetch('/api/personal-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            // date and subject not supported in current schema
          }),
        });
        if (!response.ok) throw new Error(`Failed to sync personal task: ${task.title}`);
      }));
      console.log("Synced personal tasks.");

      // Clear local storage after sync attempt
      // Clear classes (whether synced or skipped)
      if (localClasses.length > 0) {
        saveToLocalStorage('studyweb-local-classes', []);
        console.log("Cleared local classes from storage");
      }
      // Clear assignments (whether synced or skipped)
      if (localAssignments.length > 0) {
        saveToLocalStorage('studyweb-local-assignments', []);
        console.log("Cleared local assignments from storage");
      }
      // Clear personal tasks
      if (localPersonalTasks.length > 0) {
        saveToLocalStorage('studyweb-local-personal-tasks', []);
        console.log("Cleared local personal tasks from storage");
      }
    } catch (error) {
      console.error("Data synchronization failed:", error);
      // Optionally, notify the user that sync failed
    } finally {
      setIsSyncingData(false);
    }
  }, [isSyncingData]);

  const fetchData = useCallback(async () => {
      setIsLoading(true);
      if (session) {
          // User is logged in, fetch from Supabase

          // Fetch all dashboard data from single endpoint
          try {
              const dashboardRes = await fetch('/api/dashboard');
              if (!dashboardRes.ok) {
                throw new Error('Failed to fetch dashboard data');
              }
              const dashboardData = await dashboardRes.json();

              setClasses(dashboardData.classes || []);
              setAssignments(dashboardData.assignments || []);
              setPersonalTasks(dashboardData.personalTasks || []);
              setStudents(dashboardData.students || []);
              setRoleState(dashboardData.role || 'student');

          } catch (error) {
              console.error("Failed to fetch Supabase data:", error);
              setClasses([]);
              setAssignments([]);
              setPersonalTasks([]);
              setStudents([]);
              setRoleState('student'); // Default to student on overall fetch failure
          }
      } else {
          // User is a guest, fetch from localStorage
           try {
               const [localClasses, localAssignments, localPersonalTasks] = await Promise.all([
                   Promise.resolve(getFromLocalStorage<ClassInfo[]>('studyweb-local-classes', [])),
                   Promise.resolve(getFromLocalStorage<ClassAssignment[]>('studyweb-local-assignments', [])),


                   Promise.resolve(getFromLocalStorage<PersonalTask[]>('studyweb-local-personal-tasks', [])),
               ]);
               setClasses(localClasses);
               setAssignments(localAssignments);
               setPersonalTasks(localPersonalTasks);
               // For guests, always use localStorage role
               setRoleState(getFromLocalStorage('studyweb-role', 'student'));
           } catch (error) {
               console.error("Failed to fetch guest data:", error);
               setRoleState('student'); // Default to student on guest data fetch failure
           }
      }
      setIsLoading(false);
  }, [session, supabase]);

  // Role sync disabled - roles managed directly in setRole and fetchData

  useEffect(() => {
    const wasGuest = !prevSession;
    const isLoggedInNow = !!session;

    if (wasGuest && isLoggedInNow) {
      // User has just logged in, start sync
      syncLocalDataToSupabase().then(() => {
        // After sync, fetch the authoritative data from Supabase
        fetchData();
      });
    } else {
      // Regular data fetch on load or session change (e.g., logout)
      fetchData();
    }

    // Update previous session state for next render
    setPrevSession(session);
  }, [session, prevSession, fetchData, syncLocalDataToSupabase]);


  // ---- Data Creation ----
  const createClass = useCallback(async (newClassData: { name: string; description: string | null }): Promise<ClassInfo | null> => {
    // Prevent multiple simultaneous class creation requests
    if (isCreatingClass) {
      console.warn('Class creation already in progress, ignoring duplicate request');
      return null;
    }

    setIsCreatingClass(true);

    try {
      if (session) {
        // Check if user is a teacher before allowing class creation
        if (role !== 'teacher') {
          throw new Error('Only teachers can create classes. Students should join existing classes instead.');
        }

        // Logged-in teacher: save to Supabase
        const response = await fetch('/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newClassData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create class in Supabase');
        }
        const savedClass = await response.json();

        // Optimistic update: Add to local state immediately (PERFORMANCE FIX #3)
        setClasses(prev => [...prev, savedClass]);

        return savedClass;
      } else {
        // Guest user: save to localStorage
        const newClass: ClassInfo = {
          id: `local-${Date.now()}`,
          name: newClassData.name,
          description: newClassData.description,
          created_at: new Date().toISOString(),
          owner_id: 'local-user',
          join_code: null,
          status: null,
        };
        const updatedClasses = [...classes, newClass];
        setClasses(updatedClasses);
        saveToLocalStorage('studyweb-local-classes', updatedClasses);
        return newClass;
      }
    } finally {
      setIsCreatingClass(false);
    }
  }, [session, classes, isCreatingClass]);

  const createAssignment = useCallback(async (newAssignmentData: Omit<ClassAssignment, 'id' | 'created_at'>) => {
     if (session) {
        // Logged-in user: save to Supabase
        const response = await fetch('/api/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAssignmentData),
        });
        if (!response.ok) throw new Error('Failed to create assignment in Supabase');
        await refetchAssignments();
    } else {
        // Guest user: save to localStorage
        const newAssignment: ClassAssignment = {
            id: `local-assign-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...newAssignmentData
        };
        const updatedAssignments = [...assignments, newAssignment];
        setAssignments(updatedAssignments);
        saveToLocalStorage('studyweb-local-assignments', updatedAssignments);
    }
  }, [session, assignments]);

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    if (session) {
      // Logged-in user: delete from Supabase
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete assignment in Supabase');
      await refetchAssignments();
    } else {
      // Guest user: remove from localStorage
      const updatedAssignments = assignments.filter(a => a.id !== assignmentId);
      setAssignments(updatedAssignments);
      saveToLocalStorage('studyweb-local-assignments', updatedAssignments);
    }
  }, [session, assignments]);

   const createPersonalTask = useCallback(async (newTaskData: Omit<PersonalTask, 'id' | 'created_at' | 'user_id'>) => {
     if (session) {
        const response = await fetch('/api/personal-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTaskData),
        });
        if (!response.ok) throw new Error('Failed to create personal task in Supabase');
        const newTask = await response.json();
        setPersonalTasks(prev => [...prev, newTask]);
     } else {
        const newTask: PersonalTask = {
            id: `local-task-${Date.now()}`,
            created_at: new Date().toISOString(),
            user_id: 'local-user',
            ...newTaskData
        };
        const updatedTasks = [...personalTasks, newTask];
        setPersonalTasks(updatedTasks);
        saveToLocalStorage('studyweb-local-personal-tasks', updatedTasks);
     }
  }, [session, personalTasks]);

  const updatePersonalTask = useCallback(async (id: string, updates: Partial<PersonalTask>) => {
     if (session) {
        const response = await fetch(`/api/personal-tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error('Failed to update personal task in Supabase');
        // Update local state
        setPersonalTasks(prev => (prev as PersonalTask[]).map((task: PersonalTask) => task.id === id ? { ...task, ...updates } as PersonalTask : task));
     } else {
        // Guest: update localStorage
        const updatedTasks = personalTasks.map(task => task.id === id ? { ...task, ...updates } : task);
        setPersonalTasks(updatedTasks);
        saveToLocalStorage('studyweb-local-personal-tasks', updatedTasks);
     }
  }, [session, personalTasks]);

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

  const refetchMaterials = useCallback(async (classId: string) => {
    if (session) {
        const res = await fetch(`/api/materials?classId=${classId}`);
        if (res.ok) {
            const data = await res.json();
            setMaterials(data || []);
        }
    }
  }, [session]);

  // ---- Settings and Preferences ----
  useEffect(() => {
    setLanguageState(getFromLocalStorage('studyweb-language', 'en'));
    // Removed initial setRoleState from localStorage here as it will be set from Supabase profile on login

    const hc = getFromLocalStorage('studyweb-high-contrast', false);
    setHighContrastState(hc);
    if(hc) document.documentElement.classList.add('high-contrast');

    const df = getFromLocalStorage('studyweb-dyslexia-font', false);
    setDyslexiaFontState(df);
     if(df) document.body.classList.add('font-dyslexia');

    const rm = getFromLocalStorage('studyweb-reduced-motion', false);
    setReducedMotionState(rm);
    if(rm) document.body.setAttribute('data-reduced-motion', 'true');

    // Load theme settings
    const savedTheme = getFromLocalStorage('studyweb-theme', 'light');

    setThemeState(savedTheme);

    // Apply theme
    applyTheme(savedTheme);
  }, [applyTheme]);

  const setLanguage = (newLanguage: Locale) => {
    setLanguageState(newLanguage);
    saveToLocalStorage('studyweb-language', newLanguage);
    const newDict = getDictionary(newLanguage);
    setDictionary(newDict);
  };

  // Update role in Supabase profiles table (blocks until API returns)
  const setRole = async (newRole: UserRole) => {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    console.log(`[${requestId}] AppContext.setRole - Starting role update:`, {
      newRole,
      userId: session?.user?.id || 'none',
      currentRole: role,
      timestamp: new Date().toISOString()
    });

    try {
      if (session?.user?.id) {
        console.log(`[${requestId}] AppContext.setRole - Attempting Supabase update...`);

        const { data, error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', session.user.id)
          .select('role')
          .single();

        if (error) {
          const duration = Date.now() - startTime;
          console.error(`[${requestId}] AppContext.setRole - Supabase update failed:`, {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            userId: session.user.id,
            attemptedRole: newRole,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
          });
          return;
        }

        console.log(`[${requestId}] AppContext.setRole - Supabase update successful:`, {
          returnedData: data,
          attemptedRole: newRole
        });

        // Update local state only after successful Supabase update
        console.log(`[${requestId}] AppContext.setRole - Updating local state from ${role} to ${newRole}`);
        setRoleState(newRole);

        // Force a re-render check
        console.log(`[${requestId}] AppContext.setRole - Current role state after update:`, role);

        const duration = Date.now() - startTime;
        console.log(`[${requestId}] AppContext.setRole - Role updated successfully:`, {
          newRole,
          previousRole: role,
          userId: session.user.id,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error(`[${requestId}] AppContext.setRole - No valid session for role update:`, {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id || 'none',
          sessionKeys: session ? Object.keys(session) : 'no session'
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] AppContext.setRole - Unexpected error:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        attemptedRole: newRole,
        userId: session?.user?.id || 'none',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
    }
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

  // Theme setters
  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    saveToLocalStorage('studyweb-theme', newTheme);
    applyTheme(newTheme);
  };


  const contextValue = useMemo<AppContextType>(() => ({
    session,
    isLoading,
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
    isCreatingClass,
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
  }), [
    session,
    isLoading,
    language,
    dictionary,
    role,
    isCreatingClass,
    highContrast,
    dyslexiaFont,
    reducedMotion,
    theme,
    sessionRecap,
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
    setLanguage,
    setRole,
    setHighContrast,
    setDyslexiaFont,
    setReducedMotion,
    setTheme,
    setSessionRecap
  ]);


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