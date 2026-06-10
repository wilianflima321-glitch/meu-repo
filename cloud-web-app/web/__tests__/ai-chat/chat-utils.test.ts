/**
 * Tests for the canonical agent chat utilities.
 *
 * Covers:
 *  - formatTime() renders a 2-digit 24h time.
 *  - formatCost() tiers: >=10 -> $X, >=1 -> $X.XX, else -> $X.XXXX.
 *  - formatCost() returns null for NaN.
 */

import { describe, it, expect } from 'vitest';
import { formatTime, formatCost } from '../../components/agents/chat/utils';

describe('agent chat utils', () => {
  describe('formatTime', () => {
    it('renders hours and minutes in HH:MM (24h)', () => {
      const d = new Date();
      d.setHours(9, 5, 0, 0);
      expect(formatTime(d)).toMatch(/^\d{2}:\d{2}$/);
    });

    it('is stable for the same input', () => {
      const d = new Date('2026-04-21T10:30:00Z');
      expect(formatTime(d)).toBe(formatTime(d));
    });
  });

  describe('formatCost', () => {
    it('formats cost >= 10 without decimals', () => {
      expect(formatCost(12.55)).toBe('$13');
      expect(formatCost(10)).toBe('$10');
    });

    it('formats cost between 1 and 10 with 2 decimals', () => {
      expect(formatCost(1.2345)).toBe('$1.23');
      expect(formatCost(9.999)).toBe('$10.00');
    });

    it('formats sub-dollar costs with 4 decimals', () => {
      expect(formatCost(0.0123)).toBe('$0.0123');
      expect(formatCost(0)).toBe('$0.0000');
    });

    it('returns null for NaN', () => {
      expect(formatCost(NaN)).toBeNull();
    });
  });
});
