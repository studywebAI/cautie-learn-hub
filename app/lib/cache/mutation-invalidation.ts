import { handleCacheInvalidation } from './cache-invalidation';

// Hook to automatically invalidate cache after mutations
export function useMutationCacheInvalidation() {
  const invalidateAfterMutation = async (
    mutationType: 'create' | 'update' | 'delete',
    entityType: 'class' | 'student' | 'assignment' | 'grade' | 'attendance' | 'progress',
    classId?: string
  ) => {
    try {
      await handleCacheInvalidation(mutationType, entityType, classId);
      console.log(`Cache invalidated for ${entityType} ${mutationType}`);
    } catch (error) {
      console.warn('Failed to invalidate cache:', error);
    }
  };

  return { invalidateAfterMutation };
}

// Utility function to wrap mutation calls with cache invalidation
export async function withCacheInvalidation<T>(
  mutationFn: () => Promise<T>,
  mutationType: 'create' | 'update' | 'delete',
  entityType: 'class' | 'student' | 'assignment' | 'grade' | 'attendance' | 'progress',
  classId?: string
): Promise<T> {
  try {
    const result = await mutationFn();
    await handleCacheInvalidation(mutationType, entityType, classId);
    return result;
  } catch (error) {
    console.warn('Mutation failed, cache invalidation skipped:', error);
    throw error;
  }
}

// Specific invalidation functions for different mutation types
export const invalidateClassMutations = {
  create: async (classId: string) => {
    await handleCacheInvalidation('create', 'class', classId);
  },
  update: async (classId: string) => {
    await handleCacheInvalidation('update', 'class', classId);
  },
  delete: async (classId: string) => {
    await handleCacheInvalidation('delete', 'class', classId);
  }
};

export const invalidateStudentMutations = {
  add: async (classId: string) => {
    await handleCacheInvalidation('create', 'student', classId);
  },
  remove: async (classId: string) => {
    await handleCacheInvalidation('delete', 'student', classId);
  },
  update: async (classId: string) => {
    await handleCacheInvalidation('update', 'student', classId);
  }
};

export const invalidateAssignmentMutations = {
  create: async (classId: string) => {
    await handleCacheInvalidation('create', 'assignment', classId);
  },
  update: async (classId: string) => {
    await handleCacheInvalidation('update', 'assignment', classId);
  },
  delete: async (classId: string) => {
    await handleCacheInvalidation('delete', 'assignment', classId);
  }
};

export const invalidateGradeMutations = {
  update: async (classId: string) => {
    await handleCacheInvalidation('update', 'grade', classId);
  }
};

export const invalidateAttendanceMutations = {
  update: async (classId: string) => {
    await handleCacheInvalidation('update', 'attendance', classId);
  }
};

export const invalidateProgressMutations = {
  update: async (classId: string) => {
    await handleCacheInvalidation('update', 'progress', classId);
  }
};