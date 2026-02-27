import { useState, useEffect, useCallback } from 'react';
import { 
  getCachedClassData, 
  setCachedClassData, 
  getCachedStudents, 
  setCachedStudents,
  performanceMonitor 
} from './index';

export function useCachedClassData(classId: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClassData = useCallback(async () => {
    if (!classId) return;

    setLoading(true);
    setError(null);

    try {
      const startTime = performance.now();
      
      // Try to get cached data first
      const cachedData = await getCachedClassData(classId);
      
      if (cachedData) {
        setData(cachedData);
        const duration = performance.now() - startTime;
        performanceMonitor.recordMetric({
          endpoint: `classes/${classId}`,
          duration,
          cached: true,
          timestamp: Date.now(),
          success: true
        });
        setLoading(false);
        return;
      }

      // If no cache, fetch from API
      const response = await fetch(`/api/classes/${classId}/cached`);
      const freshData = await response.json();

      if (!response.ok) {
        throw new Error(freshData.error || 'Failed to fetch class data');
      }

      setData(freshData);
      await setCachedClassData(classId, freshData);
      
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        endpoint: `classes/${classId}`,
        duration,
        cached: false,
        timestamp: Date.now(),
        success: true
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch class data');
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        endpoint: `classes/${classId}`,
        duration,
        cached: false,
        timestamp: Date.now(),
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

  const refetch = useCallback(() => {
    // Clear cache and refetch
    fetchClassData();
  }, [fetchClassData]);

  return { data, loading, error, refetch };
}

export function useCachedStudents(classId: string) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!classId) return;

    setLoading(true);
    setError(null);

    try {
      const startTime = performance.now();
      
      // Try to get cached data first
      const cachedStudents = await getCachedStudents(classId);
      
      if (cachedStudents) {
        setStudents(cachedStudents.data || []);
        const duration = performance.now() - startTime;
        performanceMonitor.recordMetric({
          endpoint: `classes/${classId}/students`,
          duration,
          cached: true,
          timestamp: Date.now(),
          success: true
        });
        setLoading(false);
        return;
      }

      // If no cache, fetch from API
      const response = await fetch(`/api/classes/${classId}/students/cached`);
      const freshData = await response.json();

      if (!response.ok) {
        throw new Error(freshData.error || 'Failed to fetch students');
      }

      setStudents(freshData.data || []);
      await setCachedStudents(classId, freshData);
      
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        endpoint: `classes/${classId}/students`,
        duration,
        cached: false,
        timestamp: Date.now(),
        success: true
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch students');
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        endpoint: `classes/${classId}/students`,
        duration,
        cached: false,
        timestamp: Date.now(),
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const refetch = useCallback(() => {
    // Clear cache and refetch
    fetchStudents();
  }, [fetchStudents]);

  return { students, loading, error, refetch };
}

export function useCacheWarming(classIds: string[]) {
  const [warming, setWarming] = useState(false);

  const warmCache = useCallback(async () => {
    if (!classIds.length) return;

    setWarming(true);
    
    try {
      // Pre-fetch data for all classes in parallel
      await Promise.all(
        classIds.map(async (classId) => {
          try {
            // Fetch class data
            const classResponse = await fetch(`/api/classes/${classId}/cached`);
            if (classResponse.ok) {
              const classData = await classResponse.json();
              await setCachedClassData(classId, classData);
            }

            // Fetch students data
            const studentsResponse = await fetch(`/api/classes/${classId}/students/cached`);
            if (studentsResponse.ok) {
              const studentsData = await studentsResponse.json();
              await setCachedStudents(classId, studentsData);
            }
          } catch (error) {
            console.warn(`Failed to warm cache for class ${classId}:`, error);
          }
        })
      );
    } finally {
      setWarming(false);
    }
  }, [classIds]);

  useEffect(() => {
    warmCache();
  }, [warmCache]);

  return { warming, warmCache };
}

export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<any>(null);

  const refreshMetrics = useCallback(() => {
    setMetrics(performanceMonitor.getMetricsSummary());
  }, []);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  const exportMetrics = useCallback(() => {
    return performanceMonitor.exportMetrics();
  }, []);

  const clearMetrics = useCallback(() => {
    performanceMonitor.clearMetrics();
    setMetrics(null);
  }, []);

  return {
    metrics,
    refreshMetrics,
    exportMetrics,
    clearMetrics
  };
}