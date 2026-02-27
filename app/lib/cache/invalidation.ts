import { CacheService } from './cache-service';

export const cacheService = new CacheService();

export const invalidateClassCache = async (classId: string): Promise<void> => {
  await Promise.all([
    cacheService.delete(`class_${classId}`),
    cacheService.delete(`students_${classId}`),
    cacheService.delete(`analytics_${classId}`),
    cacheService.delete(`grades_${classId}`),
    cacheService.delete(`attendance_${classId}`),
    cacheService.delete(`assignments_${classId}`),
    cacheService.delete(`progress_${classId}`)
  ]);
};

export const invalidateAllClassCaches = async (classIds: string[]): Promise<void> => {
  await Promise.all(classIds.map(id => invalidateClassCache(id)));
};

export const invalidateUserCache = async (userId: string): Promise<void> => {
  // Clear all user-specific caches
  await cacheService.clearAll();
};

export const clearExpiredCaches = async (): Promise<void> => {
  await cacheService.clearExpired();
};

export const getCachedClassData = async (classId: string) => {
  const cached = await cacheService.get(`class_${classId}`);
  return cached;
};

export const setCachedClassData = async (classId: string, data: any): Promise<void> => {
  await cacheService.set(`class_${classId}`, data, 300000); // 5 minutes TTL
};

export const getCachedStudents = async (classId: string) => {
  const cached = await cacheService.get(`students_${classId}`);
  return cached;
};

export const setCachedStudents = async (classId: string, data: any): Promise<void> => {
  await cacheService.set(`students_${classId}`, data, 600000); // 10 minutes TTL
};

export const getCachedAnalytics = async (classId: string) => {
  const cached = await cacheService.get(`analytics_${classId}`);
  return cached;
};

export const setCachedAnalytics = async (classId: string, data: any): Promise<void> => {
  await cacheService.set(`analytics_${classId}`, data, 300000); // 5 minutes TTL
};