import { 
  invalidateClassCache, 
  invalidateAllClassCaches,
  invalidateUserCache 
} from './invalidation';

export async function invalidateClassCachesOnCreate(classId: string) {
  // When a new class is created, invalidate user cache to refresh class list
  await invalidateUserCache('current-user');
}

export async function invalidateClassCachesOnUpdate(classId: string) {
  // When a class is updated, invalidate its specific cache
  await invalidateClassCache(classId);
}

export async function invalidateClassCachesOnDelete(classId: string) {
  // When a class is deleted, invalidate its specific cache
  await invalidateClassCache(classId);
}

export async function invalidateClassCachesOnStudentChange(classId: string) {
  // When students are added/removed, invalidate class and students cache
  await invalidateClassCache(classId);
}

export async function invalidateClassCachesOnAssignmentChange(classId: string) {
  // When assignments are created/updated/deleted, invalidate class cache
  await invalidateClassCache(classId);
}

export async function invalidateClassCachesOnGradeChange(classId: string) {
  // When grades are updated, invalidate class cache
  await invalidateClassCache(classId);
}

export async function invalidateClassCachesOnAttendanceChange(classId: string) {
  // When attendance is updated, invalidate class cache
  await invalidateClassCache(classId);
}

export async function invalidateClassCachesOnProgressChange(classId: string) {
  // When progress is updated, invalidate class cache
  await invalidateClassCache(classId);
}

export async function invalidateAllCachesOnLogout() {
  // When user logs out, clear all caches
  await invalidateUserCache('current-user');
}

// Batch invalidation for multiple classes
export async function invalidateMultipleClassCaches(classIds: string[]) {
  await invalidateAllClassCaches(classIds);
}

// Utility function to determine what to invalidate based on mutation type
export async function handleCacheInvalidation(
  mutationType: 'create' | 'update' | 'delete',
  entityType: 'class' | 'student' | 'assignment' | 'grade' | 'attendance' | 'progress',
  classId?: string
) {
  switch (entityType) {
    case 'class':
      if (mutationType === 'create') {
        await invalidateClassCachesOnCreate(classId!);
      } else if (mutationType === 'update') {
        await invalidateClassCachesOnUpdate(classId!);
      } else if (mutationType === 'delete') {
        await invalidateClassCachesOnDelete(classId!);
      }
      break;
    
    case 'student':
      if (classId) {
        await invalidateClassCachesOnStudentChange(classId);
      }
      break;
    
    case 'assignment':
      if (classId) {
        await invalidateClassCachesOnAssignmentChange(classId);
      }
      break;
    
    case 'grade':
      if (classId) {
        await invalidateClassCachesOnGradeChange(classId);
      }
      break;
    
    case 'attendance':
      if (classId) {
        await invalidateClassCachesOnAttendanceChange(classId);
      }
      break;
    
    case 'progress':
      if (classId) {
        await invalidateClassCachesOnProgressChange(classId);
      }
      break;
  }
}