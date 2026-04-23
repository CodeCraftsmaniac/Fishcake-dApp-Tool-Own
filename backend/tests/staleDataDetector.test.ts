import { describe, it, expect, beforeEach } from 'vitest';
import { staleDataDetector, balanceKey, contractReadKey } from '../src/utils/staleDataDetector.js';

describe('StaleDataDetector', () => {
  beforeEach(() => {
    staleDataDetector.clear();
  });

  it('should detect no data as stale', () => {
    expect(staleDataDetector.isStale('nonexistent')).toBe(true);
  });

  it('should detect fresh data as not stale', () => {
    staleDataDetector.record('test-key', '100');
    expect(staleDataDetector.isStale('test-key')).toBe(false);
  });

  it('should return cached value if not stale', () => {
    staleDataDetector.record('test-key', '100');
    expect(staleDataDetector.getCached('test-key')).toBe('100');
  });

  it('should return null for stale or missing cached value', () => {
    expect(staleDataDetector.getCached('nonexistent')).toBe(null);
  });

  it('should detect value changes', () => {
    staleDataDetector.record('test-key', '100');
    expect(staleDataDetector.hasChanged('test-key', '100')).toBe(false);
    expect(staleDataDetector.hasChanged('test-key', '200')).toBe(true);
  });

  it('should report data age', () => {
    staleDataDetector.record('test-key', '100');
    const age = staleDataDetector.getAge('test-key');
    expect(age).toBeGreaterThanOrEqual(0);
    expect(age).toBeLessThan(1000);
  });

  it('should return null age for missing data', () => {
    expect(staleDataDetector.getAge('nonexistent')).toBe(null);
  });

  it('should report stats correctly', () => {
    staleDataDetector.record('key1', '100');
    staleDataDetector.record('key2', '200');
    const stats = staleDataDetector.getStats();
    expect(stats.total).toBe(2);
    expect(stats.fresh).toBe(2);
    expect(stats.stale).toBe(0);
  });

  it('should generate correct balance key', () => {
    const key = balanceKey('0xABC', 'FCC');
    expect(key).toBe('balance:0xabc:FCC');
  });

  it('should generate correct contract read key', () => {
    const key = contractReadKey('0xContract', 'balanceOf', '0xUser');
    expect(key).toBe('read:0xContract:balanceOf:0xUser');
  });
});
