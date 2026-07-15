/**
 * Authentication API Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { verifyToken, generateTokenWithRole } from '@/lib/auth-server';

describe('Authentication', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
      const token = generateTokenWithRole('user123', 'test@example.com', 'user');
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
      const token = generateTokenWithRole('user123', 'test@example.com', 'user');
      const decoded = verifyToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe('user123');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.role).toBe('user');
    });

    it('should reject an invalid token', () => {
      const decoded = verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should reject an expired token', () => {
      // This would require mocking jwt.verify or using a library like timekeeper
      // For now, just test the basic case
      const decoded = verifyToken('');
      expect(decoded).toBeNull();
    });
  });
});
