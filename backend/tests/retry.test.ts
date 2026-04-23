import { describe, it, expect } from 'vitest';
import { withRetry, withContractRetry } from '../src/utils/retry.js';

describe('withRetry', () => {
  it('should succeed on first try', async () => {
    const result = await withRetry(async () => 'success', { maxRetries: 0 });
    expect(result).toBe('success');
  });

  it('should retry on failure and eventually succeed', async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('fail');
        return 'success';
      },
      { maxRetries: 3, baseDelayMs: 10 }
    );
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should throw after max retries', async () => {
    await expect(
      withRetry(async () => { throw new Error('always fails'); }, {
        maxRetries: 2,
        baseDelayMs: 10,
      })
    ).rejects.toThrow('always fails');
  });

  it('should timeout', async () => {
    await expect(
      withRetry(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return 'late';
      }, { timeoutMs: 50, baseDelayMs: 10 })
    ).rejects.toThrow('timed out');
  });
});

describe('withContractRetry', () => {
  it('should retry contract calls', async () => {
    let attempts = 0;
    const result = await withContractRetry(
      async () => {
        attempts++;
        if (attempts < 2) throw new Error('rpc error');
        return 42n;
      },
      'balanceOf',
      { maxRetries: 3, baseDelayMs: 10 }
    );
    expect(result).toBe(42n);
    expect(attempts).toBe(2);
  });
});
