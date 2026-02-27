# Cautie Learn Hub Caching System

A comprehensive caching solution designed to optimize student loading performance and improve overall application responsiveness.

## 🚀 Features

- **IndexedDB-based Caching**: Persistent client-side storage with automatic expiration
- **Real-time Change Detection**: Live cache invalidation using Supabase Realtime
- **Smart Cache Invalidation**: Automatic cache clearing based on database changes
- **Performance Monitoring**: Built-in metrics tracking and analysis
- **React Integration**: Easy-to-use hooks for frontend integration
- **Type Safety**: Full TypeScript support with proper type definitions

## 📁 Project Structure

```
app/lib/cache/
├── cache-service.ts          # Core caching service with IndexedDB
├── change-detection.ts       # Real-time change detection and invalidation
├── invalidation.ts           # Cache invalidation utilities
├── performance-monitor.ts    # Performance tracking and metrics
├── cache-hooks.ts           # React hooks for frontend integration
├── cache-invalidation.ts    # High-level invalidation strategies
├── mutation-invalidation.ts # Mutation-specific invalidation
├── frontend-integration.ts  # Frontend integration examples and utilities
├── index.ts                 # Main export file
└── README.md               # This documentation file
```

## 🎯 Quick Start

### 1. Basic Usage with React Hooks

```typescript
import { useCachedClassData, useCachedStudents } from '@/lib/cache';

function StudentAssignmentView({ classId }: { classId: string }) {
  const { data: classData, loading, error } = useCachedClassData(classId);
  const { students, loading: studentsLoading } = useCachedStudents(classId);

  if (loading || studentsLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{classData?.name}</h1>
      <div>Total Students: {students.length}</div>
      {/* Render student list */}
    </div>
  );
}
```

### 2. Cache Invalidation on Mutations

```typescript
import { useMutationCacheInvalidation } from '@/lib/cache';

function ClassManagement({ classId }: { classId: string }) {
  const { invalidateAfterMutation } = useMutationCacheInvalidation();

  const handleStudentUpdate = async (studentId: string, updates: any) => {
    try {
      await fetch(`/api/classes/${classId}/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      // Automatically invalidate cache
      await invalidateAfterMutation('update', 'student', classId);
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };
}
```

### 3. Performance Monitoring

```typescript
import { usePerformanceMetrics } from '@/lib/cache';

function PerformanceDashboard() {
  const { metrics, getPerformanceSummary } = usePerformanceMetrics();
  
  const summary = getPerformanceSummary();
  
  return (
    <div>
      <h2>Cache Performance</h2>
      <div>Cache Hit Rate: {summary?.cacheHitRate.toFixed(2)}%</div>
      <div>Average Response Time: {summary?.averageResponseTime.toFixed(2)}ms</div>
      <div>Total Requests: {summary?.totalRequests}</div>
    </div>
  );
}
```

## 🔧 API Reference

### CacheService

Core caching service with IndexedDB integration.

```typescript
import { cacheService } from '@/lib/cache';

// Set cache
await cacheService.set('class-123', classData, 'classes');

// Get cache
const cachedData = await cacheService.get('class-123', 'classes');

// Check if cached
const isCached = await cacheService.isCached('class-123', 'classes');

// Invalidate cache
await cacheService.invalidate('class-123', 'classes');

// Clear expired entries
await cacheService.clearExpired();
```

### React Hooks

#### `useCachedClassData(classId: string)`
Returns cached class data with automatic cache management.

#### `useCachedStudents(classId: string)`
Returns cached student data with automatic cache management.

#### `useCacheWarming(classIds: string[])`
Pre-fetches data for better user experience.

#### `usePerformanceMetrics()`
Provides performance monitoring capabilities.

#### `useMutationCacheInvalidation()`
Provides cache invalidation for mutations.

### Cache Invalidation

#### Automatic Invalidation
Cache is automatically invalidated when database changes are detected via Supabase Realtime.

#### Manual Invalidation
```typescript
import { invalidateClassCache, invalidateAllClassCaches } from '@/lib/cache';

// Invalidate specific class cache
await invalidateClassCache('class-123');

// Invalidate multiple class caches
await invalidateAllClassCaches(['class-123', 'class-456']);
```

## 📊 Performance Benefits

- **Faster Student Loading**: Cached student data eliminates repeated database queries
- **Reduced Server Load**: Fewer API calls to the backend
- **Better User Experience**: Instant data retrieval from cache
- **Real-time Updates**: Changes are reflected immediately across all clients
- **Scalability**: Efficient handling of large class sizes and multiple concurrent users

## 🧪 Testing

### Development Testing

1. **Cache Hit Testing**: Verify cached data is returned correctly
2. **Cache Miss Testing**: Ensure fallback to API works when cache is empty
3. **Invalidation Testing**: Confirm cache is properly cleared on mutations
4. **Performance Testing**: Measure response time improvements

### Example Test

```typescript
// Test cache functionality
describe('CacheService', () => {
  it('should cache and retrieve data', async () => {
    const testData = { id: 'test', name: 'Test Class' };
    
    await cacheService.set('test-key', testData, 'classes');
    const cachedData = await cacheService.get('test-key', 'classes');
    
    expect(cachedData).toEqual(testData);
  });
});
```

## 🔍 Monitoring and Analytics

The caching system provides comprehensive performance monitoring:

- **Cache Hit/Miss Rates**: Track cache effectiveness
- **Response Times**: Monitor performance improvements
- **Cache Size**: Track storage usage
- **Invalidation Events**: Monitor cache clearing activities

### Exporting Metrics

```typescript
import { performanceMonitor } from '@/lib/cache';

// Export metrics for analysis
const metrics = performanceMonitor.exportMetrics();
console.log('Performance Metrics:', metrics);
```

## 🚀 Integration Guide

### 1. Update Existing Components

Replace direct API calls with cached hooks:

```typescript
// Before
const [students, setStudents] = useState([]);
useEffect(() => {
  fetch(`/api/classes/${classId}/students`)
    .then(res => res.json())
    .then(setStudents);
}, [classId]);

// After
const { students } = useCachedStudents(classId);
```

### 2. Add Cache Invalidation to Mutations

Wrap mutation calls with cache invalidation:

```typescript
// Before
const createAssignment = async (data) => {
  const response = await fetch('/api/assignments', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
};

// After
const createAssignment = async (data) => {
  const response = await withCacheInvalidation(
    () => fetch('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    'create',
    'assignment',
    data.classId
  );
  return response.json();
};
```

### 3. Add Performance Monitoring

Integrate performance monitoring in key components:

```typescript
function Dashboard() {
  const { metrics } = usePerformanceMetrics();
  
  useEffect(() => {
    // Log performance metrics
    console.log('Cache Performance:', metrics);
  }, [metrics]);
  
  return <div>Dashboard Content</div>;
}
```

## 📝 Best Practices

1. **Use Appropriate Cache Durations**: Balance between freshness and performance
2. **Monitor Cache Hit Rates**: Aim for high cache hit rates (>80%)
3. **Handle Cache Misses Gracefully**: Always have fallback to API
4. **Invalidate Cache on Mutations**: Keep data consistent
5. **Monitor Performance Metrics**: Regularly review cache effectiveness

## 🐛 Troubleshooting

### Common Issues

1. **Cache Not Working**: Check if IndexedDB is available and not blocked
2. **Stale Data**: Ensure cache invalidation is working correctly
3. **Performance Issues**: Monitor cache hit rates and response times
4. **Memory Usage**: Regularly clear expired cache entries

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Enable debug mode
localStorage.setItem('CACHE_DEBUG', 'true');

// View debug logs in browser console
```

## 🤝 Contributing

When contributing to the caching system:

1. **Follow TypeScript Standards**: Maintain type safety throughout
2. **Write Tests**: Add tests for new caching functionality
3. **Monitor Performance**: Ensure changes don't degrade performance
4. **Update Documentation**: Keep this README updated with changes

## 📄 License

This caching system is part of the Cautie Learn Hub project.