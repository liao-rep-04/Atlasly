import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  isValidEmail,
  validatePassword,
} from './auth.js';

describe('Auth Utils', () => {
  describe('Password Hashing', () => {
    it('should hash password successfully', async () => {
      console.log('[TEST] Starting: should hash password successfully');

      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);

      console.log('[TEST] ✅ PASS: Password hashed successfully');
    });

    it('should create different hashes for same password', async () => {
      console.log('[TEST] Starting: should create different hashes');

      const password = 'TestPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);

      console.log('[TEST] ✅ PASS: Different hashes created');
    });
  });

  describe('Password Comparison', () => {
    it('should return true for correct password', async () => {
      console.log('[TEST] Starting: should return true for correct password');

      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const match = await comparePassword(password, hash);

      expect(match).toBe(true);

      console.log('[TEST] ✅ PASS: Correct password matched');
    });

    it('should return false for incorrect password', async () => {
      console.log('[TEST] Starting: should return false for incorrect password');

      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword456';
      const hash = await hashPassword(password);
      const match = await comparePassword(wrongPassword, hash);

      expect(match).toBe(false);

      console.log('[TEST] ✅ PASS: Incorrect password rejected');
    });
  });

  describe('JWT Token', () => {
    it('should generate valid token', () => {
      console.log('[TEST] Starting: should generate valid token');

      const payload = { id: 'user123', email: 'test@example.com' };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      console.log('[TEST] ✅ PASS: Valid token generated');
    });

    it('should verify valid token', () => {
      console.log('[TEST] Starting: should verify valid token');

      const payload = { id: 'user123', email: 'test@example.com' };
      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);

      console.log('[TEST] ✅ PASS: Token verified successfully');
    });

    it('should reject invalid token', () => {
      console.log('[TEST] Starting: should reject invalid token');

      const invalidToken = 'invalid.token.here';

      expect(() => verifyToken(invalidToken)).toThrow();

      console.log('[TEST] ✅ PASS: Invalid token rejected');
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email', () => {
      console.log('[TEST] Starting: should validate correct email');

      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);

      console.log('[TEST] ✅ PASS: Valid emails accepted');
    });

    it('should reject invalid email', () => {
      console.log('[TEST] Starting: should reject invalid email');

      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('invalid @example.com')).toBe(false);

      console.log('[TEST] ✅ PASS: Invalid emails rejected');
    });
  });

  describe('Password Validation', () => {
    it('should accept strong password', () => {
      console.log('[TEST] Starting: should accept strong password');

      const result = validatePassword('StrongPass123');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      console.log('[TEST] ✅ PASS: Strong password accepted');
    });

    it('should reject password too short', () => {
      console.log('[TEST] Starting: should reject short password');

      const result = validatePassword('Short1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');

      console.log('[TEST] ✅ PASS: Short password rejected');
    });

    it('should reject password without uppercase', () => {
      console.log('[TEST] Starting: should reject password without uppercase');

      const result = validatePassword('lowercase123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');

      console.log('[TEST] ✅ PASS: Password without uppercase rejected');
    });

    it('should reject password without lowercase', () => {
      console.log('[TEST] Starting: should reject password without lowercase');

      const result = validatePassword('UPPERCASE123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');

      console.log('[TEST] ✅ PASS: Password without lowercase rejected');
    });

    it('should reject password without numbers', () => {
      console.log('[TEST] Starting: should reject password without numbers');

      const result = validatePassword('NoNumbersHere');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');

      console.log('[TEST] ✅ PASS: Password without numbers rejected');
    });

    it('should list all validation errors', () => {
      console.log('[TEST] Starting: should list all validation errors');

      const result = validatePassword('weak');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      console.log(`[TEST] ✅ PASS: All ${result.errors.length} validation errors listed`);
    });
  });
});
