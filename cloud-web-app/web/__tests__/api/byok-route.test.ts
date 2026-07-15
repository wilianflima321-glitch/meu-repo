import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/db', () => prismaMocks)
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}))

import { GET, POST, DELETE } from '@/app/api/settings/byok/route'

describe('api/settings/byok route (Block 6E — client-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
  })

  describe('GET', () => {
    it('returns honest client-only status (server vault retired)', async () => {
      const response = await GET(new NextRequest('http://localhost:3000/api/settings/byok'))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.isConfigured).toBe(false)
      expect(payload.serverVaultRetired).toBe(true)
      expect(payload.storage).toBe('client_indexeddb')
      expect(payload.setupUrl).toBe('/settings?tab=byok')
      expect(prismaMocks.prisma.user.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    it('returns 410 — server vault retired', async () => {
      const response = await POST(
        new NextRequest('http://localhost:3000/api/settings/byok', {
          method: 'POST',
          body: JSON.stringify({ key: 'sk-should-not-persist' }),
        }),
      )
      const payload = await response.json()

      expect(response.status).toBe(410)
      expect(payload.error).toBe('BYOK_SERVER_VAULT_RETIRED')
      expect(payload.success).toBe(false)
      expect(prismaMocks.prisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('DELETE', () => {
    it('clears legacy User.byokKey and confirms client-only storage', async () => {
      prismaMocks.prisma.user.update.mockResolvedValue({ id: 'user-1', byokKey: null })

      const response = await DELETE(new NextRequest('http://localhost:3000/api/settings/byok', { method: 'DELETE' }))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.success).toBe(true)
      expect(payload.legacyServerKeyCleared).toBe(true)
      expect(prismaMocks.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { byokKey: null },
      })
    })
  })
})
