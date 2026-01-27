interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly defaultWindowMs = 60 * 1000; // 1 minute
  private readonly defaultMaxRequests = 10;

  /**
   * Check if a request should be allowed
   */
  checkLimit(
    identifier: string,
    maxRequests: number = this.defaultMaxRequests,
    windowMs: number = this.defaultWindowMs
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
    }

    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Get current usage for an identifier
   */
  getUsage(identifier: string): { count: number; resetTime: number } | null {
    const entry = this.limits.get(identifier);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.resetTime) {
      this.limits.delete(identifier);
      return null;
    }

    return { count: entry.count, resetTime: entry.resetTime };
  }

  /**
   * Clear all limits (useful for testing)
   */
  clear(): void {
    this.limits.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Rate limit configurations for different features
export const RATE_LIMITS = {
  // AI features - more restrictive
  aiGeneration: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  aiSummary: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  aiQuiz: { maxRequests: 3, windowMs: 60 * 1000 }, // 3 per minute

  // General features - less restrictive
  general: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  ui: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
};

/**
 * Higher-order function to add rate limiting to API routes
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  config: { maxRequests: number; windowMs: number } = RATE_LIMITS.general
) {
  return async (request: Request): Promise<Response> => {
    // Get client identifier (IP address or user ID)
    const clientIP = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown';

    const limit = rateLimiter.checkLimit(clientIP, config.maxRequests, config.windowMs);

    if (!limit.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((limit.resetTime - Date.now()) / 1000)
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((limit.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Remaining': limit.remaining.toString(),
          'X-RateLimit-Reset': limit.resetTime.toString()
        }
      });
    }

    // Add rate limit headers to successful response
    const response = await handler(request);

    // Clone the response to add headers
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-RateLimit-Remaining', limit.remaining.toString());
    newResponse.headers.set('X-RateLimit-Reset', limit.resetTime.toString());
    newResponse.headers.set('X-RateLimit-Limit', config.maxRequests.toString());

    return newResponse;
  };
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export function createRateLimitMiddleware(
  config: { maxRequests: number; windowMs: number } = RATE_LIMITS.general
) {
  return (handler: (req: any, res: any) => Promise<any> | any) => {
    return async (req: any, res: any) => {
      const clientIP = req.headers['x-forwarded-for'] ||
                      req.headers['x-real-ip'] ||
                      req.connection?.remoteAddress ||
                      'unknown';

      const limit = rateLimiter.checkLimit(clientIP, config.maxRequests, config.windowMs);

      if (!limit.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((limit.resetTime - Date.now()) / 1000)
        });
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Remaining', limit.remaining);
      res.setHeader('X-RateLimit-Reset', limit.resetTime);
      res.setHeader('X-RateLimit-Limit', config.maxRequests);

      return handler(req, res);
    };
  };
}

/**
 * Check rate limit without blocking (for UI feedback)
 */
export function checkRateLimit(
  identifier: string,
  config: { maxRequests: number; windowMs: number } = RATE_LIMITS.general
) {
  return rateLimiter.checkLimit(identifier, config.maxRequests, config.windowMs);
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(identifier: string) {
  return rateLimiter.getUsage(identifier);
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimits() {
  rateLimiter.cleanup();
}

// Auto cleanup every 5 minutes
if (typeof globalThis !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}