import { useState, useCallback } from 'react';

export interface UseGradeHistoryReturn {
  state: Record<string, number | null>;
  setState: (newState: Record<string, number | null>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

/**
 * Hook for managing grade state with undo/redo functionality
 * Stores snapshots of state and allows navigation through history
 */
export function useGradeHistory(
  initialState: Record<string, number | null> = {},
  maxSnapshots: number = 50
): UseGradeHistoryReturn {
  const [history, setHistory] = useState<Array<Record<string, number | null>>>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const state = history[currentIndex];

  const setState = useCallback(
    (newState: Record<string, number | null>) => {
      // Remove any redo history after current index
      const newHistory = history.slice(0, currentIndex + 1);

      // Add new state to history
      newHistory.push(newState);

      // Limit history size
      if (newHistory.length > maxSnapshots) {
        newHistory.shift();
        setCurrentIndex(currentIndex); // Adjust if we shifted
      } else {
        setCurrentIndex(newHistory.length - 1);
      }

      setHistory(newHistory);
    },
    [history, currentIndex, maxSnapshots]
  );

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, history.length]);

  const clearHistory = useCallback(() => {
    setHistory([state]);
    setCurrentIndex(0);
  }, [state]);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    clearHistory,
  };
}
