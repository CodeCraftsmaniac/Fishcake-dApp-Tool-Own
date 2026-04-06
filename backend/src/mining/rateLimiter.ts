// Rate Limiter - Limit requests per endpoint
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_LIMIT = 10; // requests
const DEFAULT_WINDOW_MS = 60000; // 1 minute

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private limitPerEndpoint: Map<string, number> = new Map();

  /**
   * Set custom limit for an endpoint
   */
  setEndpointLimit(endpoint: string, limit: number): void {
    this.limitPerEndpoint.set(endpoint, limit);
  }

  /**
   * Check if request should be rate limited
   */
  isRateLimited(key: string, limit?: number): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);
    const maxRequests = limit || DEFAULT_LIMIT;

    if (!entry || now >= entry.resetAt) {
      // New window
      this.limits.set(key, {
        count: 1,
        resetAt: now + DEFAULT_WINDOW_MS,
      });
      return false;
    }

    if (entry.count >= maxRequests) {
      return true;
    }

    entry.count++;
    return false;
  }

  /**
   * Get remaining requests for a key
   */
  getRemainingRequests(key: string, limit?: number): number {
    const entry = this.limits.get(key);
    const maxRequests = limit || DEFAULT_LIMIT;

    if (!entry || Date.now() >= entry.resetAt) {
      return maxRequests;
    }

    return Math.max(0, maxRequests - entry.count);
  }

  /**
   * Get time until reset (in seconds)
   */
  getResetTime(key: string): number {
    const entry = this.limits.get(key);
    if (!entry || Date.now() >= entry.resetAt) {
      return 0;
    }
    return Math.ceil((entry.resetAt - Date.now()) / 1000);
  }

  /**
   * Clear rate limit for a key
   */
  clear(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.limits.clear();
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Cleanup expired entries every 5 minutes
setInterval(() => rateLimiter.cleanup(), 300000);

/**
 * Express middleware for rate limiting
 */
export function rateLimitMiddleware(
  limit: number = DEFAULT_LIMIT,
  keyGenerator?: (req: Request) => string
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate key from IP + endpoint
    const key = keyGenerator 
      ? keyGenerator(req) 
      : `${req.ip || 'unknown'}:${req.path}`;

    // Check endpoint-specific limit
    const endpointLimit = rateLimiter['limitPerEndpoint'].get(req.path) || limit;

    if (rateLimiter.isRateLimited(key, endpointLimit)) {
      const resetTime = rateLimiter.getResetTime(key);
      
      res.setHeader('X-RateLimit-Limit', endpointLimit.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', resetTime.toString());
      res.setHeader('Retry-After', resetTime.toString());

      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: resetTime,
      });
    }

    // Add rate limit headers
    const remaining = rateLimiter.getRemainingRequests(key, endpointLimit);
    res.setHeader('X-RateLimit-Limit', endpointLimit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());

    next();
  };
}

/**
 * Decorator for rate limiting async functions
 */
export function rateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  key: string,
  limit: number = DEFAULT_LIMIT
): (fn: T) => T {
  return (fn: T): T => {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      if (rateLimiter.isRateLimited(key, limit)) {
        throw new Error(`Rate limit exceeded for ${key}. Try again later.`);
      }
      return fn(...args) as ReturnType<T>;
    }) as T;
  };
}
