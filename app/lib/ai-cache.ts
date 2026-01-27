import { createHash } from 'crypto';

interface CacheEntry {
  response: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  tokens?: number; // Track token usage
}

class AICache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 1000 * 60 * 60; // 1 hour default
  private readonly maxSize = 1000; // Maximum cache entries

  /**
   * Generate a cache key from the prompt and parameters
   */
  private generateKey(prompt: string, params?: Record<string, any>): string {
    const content = JSON.stringify({ prompt, params });
    return createHash('md5').update(content).digest('hex');
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Clean expired entries and enforce size limit
   */
  private cleanup(): void {
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }

    // If still over size limit, remove oldest entries
    if (this.cache.size > this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, this.cache.size - this.maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Get cached response if available and not expired
   */
  get(prompt: string, params?: Record<string, any>): any | null {
    const key = this.generateKey(prompt, params);
    const entry = this.cache.get(key);

    if (!entry || this.isExpired(entry)) {
      if (entry) this.cache.delete(key); // Remove expired entry
      return null;
    }

    return entry.response;
  }

  /**
   * Store response in cache
   */
  set(prompt: string, response: any, params?: Record<string, any>, ttl?: number, tokens?: number): void {
    const key = this.generateKey(prompt, params);

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      tokens
    });

    this.cleanup();
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size,
    };
  }

  /**
   * Get or set with automatic caching
   */
  async getOrSet<T>(
    prompt: string,
    fetcher: () => Promise<T>,
    params?: Record<string, any>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get(prompt, params);
    if (cached !== null) {
      return cached;
    }

    // Fetch new response
    const response = await fetcher();

    // Cache the response
    this.set(prompt, response, params, ttl);

    return response;
  }
}

// Singleton instance
export const aiCache = new AICache();

/**
 * Higher-order function to add caching to AI functions
 */
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  ttl?: number
) {
  return async (...args: T): Promise<R> => {
    const prompt = args[0] as string; // Assume first arg is the prompt
    const params = args[1] as Record<string, any> | undefined;

    return aiCache.getOrSet(
      prompt,
      () => fn(...args),
      params,
      ttl
    );
  };
}

/**
 * Cache statistics for monitoring
 */
export function getCacheStats() {
  return aiCache.getStats();
}

/**
 * Clear cache (useful for development/testing)
 */
export function clearCache() {
  aiCache.clear();
}