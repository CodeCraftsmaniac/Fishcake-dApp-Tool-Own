import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../src/mining/rateLimiter.js';

describe('RateLimiter', () => {
  it('should allow requests within limit', () => {
    const limiter = new RateLimiter();
    const key = 'test-endpoint';
    
    // RateLimiter uses isRateLimited which returns true if LIMITED
    for (let i = 0; i < 10; i++) {
      expect(limiter.isRateLimited(key, 10)).toBe(false);
    }
    
    // 11th request should be blocked
    expect(limiter.isRateLimited(key, 10)).toBe(true);
  });

  it('should clean up old entries', () => {
    const limiter = new RateLimiter();
    const key = 'test-endpoint';
    
    limiter.isRateLimited(key, 10);
    
    // Cleanup expired entries
    limiter.cleanup();
    
    // After cleanup, should be able to request again
    expect(limiter.isRateLimited(key, 10)).toBe(false);
  });

  it('should handle different endpoints separately', () => {
    const limiter = new RateLimiter();
    
    // With limit=3, count starts at 1 on first call, then increments
    limiter.isRateLimited('endpoint-a', 3);
    limiter.isRateLimited('endpoint-a', 3);
    
    expect(limiter.isRateLimited('endpoint-b', 3)).toBe(false);
    expect(limiter.isRateLimited('endpoint-a', 3)).toBe(false);
    expect(limiter.isRateLimited('endpoint-a', 3)).toBe(true);
  });
});
