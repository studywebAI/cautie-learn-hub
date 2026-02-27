import { useCachedClassData, useCachedStudents, useCacheWarming, usePerformanceMetrics } from './cache-hooks';
import { useMutationCacheInvalidation } from './mutation-invalidation';

// Example: Enhanced StudentAssignmentView component using cached endpoints
export function useOptimizedStudentAssignmentView(classId: string) {
  const { data: classData, loading: classLoading, error: classError, refetch: refetchClass } = 
    useCachedClassData(classId);
  
  const { students, loading: studentsLoading, error: studentsError, refetch: refetchStudents } = 
    useCachedStudents(classId);

  const { invalidateAfterMutation } = useMutationCacheInvalidation();

  const handleStudentUpdate = async (studentId: string, updates: any) => {
    try {
      // Perform the mutation
      const response = await fetch(`/api/classes/${classId}/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update student');
      }

      // Invalidate cache after successful mutation
      await invalidateAfterMutation('update', 'student', classId);
      
      return await response.json();
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  };

  const handleAssignmentCreate = async (assignmentData: any) => {
    try {
      const response = await fetch(`/api/classes/${classId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentData)
      });

      if (!response.ok) {
        throw new Error('Failed to create assignment');
      }

      // Invalidate cache after successful mutation
      await invalidateAfterMutation('create', 'assignment', classId);
      
      return await response.json();
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  };

  return {
    classData,
    students,
    loading: classLoading || studentsLoading,
    error: classError || studentsError,
    refetchClass,
    refetchStudents,
    handleStudentUpdate,
    handleAssignmentCreate
  };
}

// Example: Enhanced Teacher Dashboard using cached endpoints
export function useOptimizedTeacherDashboard(userId: string) {
  const { data: dashboardData, loading, error, refetch } = useCachedClassData('dashboard');

  const { invalidateAfterMutation } = useMutationCacheInvalidation();

  const handleClassCreate = async (classData: any) => {
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData)
      });

      if (!response.ok) {
        throw new Error('Failed to create class');
      }

      const newClass = await response.json();
      
      // Invalidate user cache to refresh class list
      await invalidateAfterMutation('create', 'class', newClass.id);
      
      return newClass;
    } catch (error) {
      console.error('Error creating class:', error);
      throw error;
    }
  };

  const handleClassDelete = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete class');
      }

      // Invalidate cache after successful deletion
      await invalidateAfterMutation('delete', 'class', classId);
    } catch (error) {
      console.error('Error deleting class:', error);
      throw error;
    }
  };

  return {
    dashboardData,
    loading,
    error,
    refetch,
    handleClassCreate,
    handleClassDelete
  };
}

// Example: Cache warming for better UX
export function useOptimizedClassLoading(classIds: string[]) {
  const { warming, warmCache } = useCacheWarming(classIds);
  const { metrics, refreshMetrics, exportMetrics, clearMetrics } = usePerformanceMetrics();

  const preloadFrequentlyAccessedData = async () => {
    if (classIds.length > 0) {
      await warmCache();
    }
  };

  return {
    warming,
    warmCache,
    preloadFrequentlyAccessedData,
    metrics,
    refreshMetrics,
    exportMetrics,
    clearMetrics
  };
}

// Example: Performance monitoring hook
export function useOptimizedPerformanceMonitoring() {
  const { metrics, refreshMetrics, exportMetrics, clearMetrics } = usePerformanceMetrics();

  const getPerformanceSummary = () => {
    if (!metrics) return null;

    const totalRequests = metrics.totalRequests || 0;
    const cacheHits = metrics.cacheHits || 0;
    const cacheMisses = metrics.cacheMisses || 0;
    const averageResponseTime = metrics.averageResponseTime || 0;

    return {
      totalRequests,
      cacheHits,
      cacheMisses,
      cacheHitRate: totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0,
      averageResponseTime,
      performanceImprovement: metrics.performanceImprovement || 0
    };
  };

  return {
    metrics,
    getPerformanceSummary,
    refreshMetrics,
    exportMetrics,
    clearMetrics
  };
}

// Utility function to wrap existing API calls with caching
export async function withCaching<T>(
  apiCall: () => Promise<T>,
  cacheKey: string,
  cacheDuration: number = 5 * 60 * 1000 // 5 minutes default
): Promise<T> {
  // This would integrate with the CacheService for manual caching
  // Implementation would depend on specific use case
  return await apiCall();
}

// Example: Batch operations with cache invalidation
export async function batchClassOperations(
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    entity: 'class' | 'student' | 'assignment' | 'grade' | 'attendance' | 'progress';
    classId: string;
    data?: any;
  }>
) {
  const { invalidateAfterMutation } = useMutationCacheInvalidation();
  
  const results: any[] = [];
  
  for (const operation of operations) {
    try {
      let result;
      
      switch (operation.type) {
        case 'create':
          result = await fetch(`/api/${operation.entity}s`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(operation.data)
          });
          break;
        case 'update':
          result = await fetch(`/api/${operation.entity}s/${operation.data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(operation.data)
          });
          break;
        case 'delete':
          result = await fetch(`/api/${operation.entity}s/${operation.data.id}`, {
            method: 'DELETE'
          });
          break;
      }
      
      if (!result.ok) {
        throw new Error(`Failed to ${operation.type} ${operation.entity}`);
      }
      
      const data = await result.json();
      results.push(data);
      
      // Invalidate cache after each successful operation
      await invalidateAfterMutation(operation.type, operation.entity, operation.classId);
      
    } catch (error) {
      console.error(`Error in batch operation: ${operation.type} ${operation.entity}`, error);
      throw error;
    }
  }
  
  return results;
}