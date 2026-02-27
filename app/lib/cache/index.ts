export { CacheService } from './cache-service';
export { ChangeDetectionService } from './change-detection';
export { 
  cacheService,
  invalidateClassCache,
  invalidateAllClassCaches,
  invalidateUserCache,
  clearExpiredCaches,
  getCachedClassData,
  setCachedClassData,
  getCachedStudents,
  setCachedStudents,
  getCachedAnalytics,
  setCachedAnalytics
} from './invalidation';
export { performanceMonitor } from './performance-monitor';
export * from './cache-invalidation';
export * from './mutation-invalidation';
export * from './frontend-integration';
