import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}));

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth-server', () => authMocks);
vi.mock('@/lib/db', () => prismaMocks);
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}));
vi.mock('@/lib/security/vault', () => ({
  decrypt: vi.fn().mockReturnValue('sk-legacy-key-stored-in-vault'),
}));

// Set test encryption key
process.env.ENCRYPTION_KEY = 'test-encryption-key-at-least-32-chars-long';

import { GET, POST, DELETE } from '@/app/api/settings/byok/route';
import { encryptString } from '@/lib/server/crypto';

describe('api/settings/byok route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' });
  });

  describe('GET', () => {
    it('returns isConfigured=false when no key is set', async () => {
      prismaMocks.prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        byokKey: null,
      });

      const response = await GET(new NextRequest('http://localhost:3000/api/settings/byok'));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload).toEqual({ isConfigured: false, maskedKey: null });
      expect(prismaMocks.prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { byokKey: true },
      });
    });

    it('decrypts and returns a masked key when a canonical key exists', async () => {
      const originalKey = 'sk-proj-test123456789';
      const encrypted = encryptString(originalKey);

      prismaMocks.prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        byokKey: encrypted,
      });

      const response = await GET(new NextRequest('http://localhost:3000/api/settings/byok'));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload).toEqual({
        isConfigured: true,
        maskedKey: 'sk-p...6789',
      });
    });

    it('handles legacy vault JSON format fallback gracefully', async () => {
      // Create a mock Vault payload
      const legacyPayload = {
        ciphertext: 'Y2lwaGVydGV4dA==',
        iv: 'aXZfdmFsdWU=',
        tag: 'dGFnX3ZhbHVl',
        salt: 'c2FsdF92YWx1ZQ==',
        version: 1,
      };

      prismaMocks.prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        byokKey: JSON.stringify(legacyPayload),
      });

      const response = await GET(new NextRequest('http://localhost:3000/api/settings/byok'));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.isConfigured).toBe(true);
      expect(payload.maskedKey).toBe('sk-l...ault'); // Masked legacy key
    });

    it('returns 401 when GET request is not authenticated', async () => {
      authMocks.requireAuth.mockImplementation(() => {
        throw new Error('Unauthorized');
      });

      const response = await GET(new NextRequest('http://localhost:3000/api/settings/byok'));
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('POST', () => {
    it('saves encrypted key to database', async () => {
      prismaMocks.prisma.user.update.mockResolvedValue({ id: 'user-1' });

      const request = new NextRequest('http://localhost:3000/api/settings/byok', {
        method: 'POST',
        body: JSON.stringify({ key: 'sk-new-key-1234' }),
      });

      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(prismaMocks.prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            byokKey: expect.any(String),
          }),
        })
      );
    });

    it('rejects empty or invalid keys', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings/byok', {
        method: 'POST',
        body: JSON.stringify({ key: '' }),
      });

      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toBe('Invalid key');
    });
  });

  describe('DELETE', () => {
    it('removes byokKey from user record', async () => {
      prismaMocks.prisma.user.update.mockResolvedValue({ id: 'user-1' });

      const response = await DELETE(new NextRequest('http://localhost:3000/api/settings/byok', {
        method: 'DELETE',
      }));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(prismaMocks.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { byokKey: null },
      });
    });
  });
});
