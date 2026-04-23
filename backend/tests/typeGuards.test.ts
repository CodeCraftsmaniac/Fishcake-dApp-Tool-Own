import { describe, it, expect } from 'vitest';

/**
 * Type guard tests - verify runtime type checking utilities
 */

// Type guards from the codebase patterns
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasProperty<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

interface WalletInput {
  privateKey: string;
  passphrase: string;
}

function isWalletInput(value: unknown): value is WalletInput {
  return (
    isObject(value) &&
    hasProperty(value, 'privateKey') &&
    isString(value.privateKey) &&
    hasProperty(value, 'passphrase') &&
    isString(value.passphrase)
  );
}

interface MiningConfig {
  fccPerRecipient: number;
  maxConcurrent: number;
  enabled: boolean;
}

function isMiningConfig(value: unknown): value is MiningConfig {
  return (
    isObject(value) &&
    hasProperty(value, 'fccPerRecipient') &&
    isNumber(value.fccPerRecipient) &&
    hasProperty(value, 'maxConcurrent') &&
    isNumber(value.maxConcurrent) &&
    hasProperty(value, 'enabled') &&
    typeof value.enabled === 'boolean'
  );
}

describe('Type Guards', () => {
  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
    });

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should return true for valid numbers', () => {
      expect(isNumber(42)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-1.5)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isNumber('42')).toBe(false);
      expect(isNumber(null)).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isObject([])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isObject('str')).toBe(false);
      expect(isObject(42)).toBe(false);
    });
  });

  describe('isWalletInput', () => {
    it('should validate correct wallet input', () => {
      const input = { privateKey: '0xabc', passphrase: 'Pass123' };
      expect(isWalletInput(input)).toBe(true);
    });

    it('should reject missing privateKey', () => {
      const input = { passphrase: 'Pass123' };
      expect(isWalletInput(input)).toBe(false);
    });

    it('should reject non-string privateKey', () => {
      const input = { privateKey: 123, passphrase: 'Pass123' };
      expect(isWalletInput(input)).toBe(false);
    });

    it('should reject null', () => {
      expect(isWalletInput(null)).toBe(false);
    });
  });

  describe('isMiningConfig', () => {
    it('should validate correct config', () => {
      const config = { fccPerRecipient: 12, maxConcurrent: 3, enabled: true };
      expect(isMiningConfig(config)).toBe(true);
    });

    it('should reject string numbers', () => {
      const config = { fccPerRecipient: '12', maxConcurrent: 3, enabled: true };
      expect(isMiningConfig(config)).toBe(false);
    });

    it('should reject missing fields', () => {
      const config = { fccPerRecipient: 12, enabled: true };
      expect(isMiningConfig(config)).toBe(false);
    });
  });
});
