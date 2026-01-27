import { useCallback, useEffect, useRef, useContext } from 'react';
import { AppContext } from '@/contexts/app-context';

interface AutosaveData {
  notes?: any[];
  mindmaps?: any[];
  timelines?: any[];
  wordwebDrawings?: any[];
  agendaItems?: any[];
  assignments?: any[];
  assignmentAnswers?: any;
  classes?: any[];
  userPreferences?: any;
  colorThemes?: any;
  toolOutputs?: any;
  importedContent?: any;
  lastOpenedProject?: string;
  scrollPosition?: { x: number; y: number };
  zoomLevel?: number;
  selectedTool?: string;
}

export const useAutosave = () => {
  const context = useContext(AppContext);
  const session = context?.session;
  const debounceTimer = useRef<NodeJS.Timeout>();
  const lastSavedData = useRef<string>('');

  const saveToSupabase = useCallback(async (data: AutosaveData) => {
    if (!session?.user?.id) return;

    try {
      // For now, store in localStorage until we add the user_autosave table
      const key = `autosave-${session.user.id}`;
      localStorage.setItem(key, JSON.stringify({
        data,
        updated_at: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Autosave error:', error);
    }
  }, [session?.user?.id]);

  const debouncedSave = useCallback((data: AutosaveData) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for 2 seconds
    debounceTimer.current = setTimeout(() => {
      const dataString = JSON.stringify(data);
      // Only save if data has actually changed
      if (dataString !== lastSavedData.current) {
        lastSavedData.current = dataString;
        saveToSupabase(data);
      }
    }, 2000);
  }, [saveToSupabase]);

  const loadFromSupabase = useCallback(async (): Promise<AutosaveData | null> => {
    if (!session?.user?.id) return null;

    try {
      const key = `autosave-${session.user.id}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return parsed.data || null;
    } catch (error) {
      console.error('Load autosave error:', error);
      return null;
    }
  }, [session?.user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    autosave: debouncedSave,
    loadAutosave: loadFromSupabase,
  };
};