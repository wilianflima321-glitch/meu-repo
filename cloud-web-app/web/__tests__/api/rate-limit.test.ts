/**
 * Rate Limiting Tests
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  it('should allow requests within limit', () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    });

    const config = { windowMs: 60000, maxRequests: 10 };
    
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit(req, config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10 - i - 1);
    }
  });

  it('should block requests exceeding limit', () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '127.0.0.2' },
    });

    const config = { windowMs: 60000, maxRequests: 5 };
    
    // Make 5 allowed requests
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(req, config);
      expect(result.allowed).toBe(true);
    }

    // 6th request should be blocked
    const result = checkRateLimit(req, config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after time window', async () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '127.0.0.3' },
    });

    const config = { windowMs: 100, maxRequests: 2 }; // 100ms window
    
    // Use up the limit
    checkRateLimit(req, config);
    checkRateLimit(req, config);
    
    let result = checkRateLimit(req, config);
    expect(result.allowed).toBe(false);

    // Wait for window to reset
    await new Promise(resolve => setTimeout(resolve, 150));

    result = checkRateLimit(req, config);
    expect(result.allowed).toBe(true);
  });
});
