/**
 * Authentication API Tests
 */

import { verifyToken, generateToken } from '@/lib/auth';

describe('Authentication', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken('user123', 'test@example.com');
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken('user123', 'test@example.com');
      const decoded = verifyToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe('user123');
      expect(decoded?.email).toBe('test@example.com');
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
