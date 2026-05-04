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
    auditLog: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/db', () => prismaMocks)
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}))

import { GET } from '@/app/api/me/audit-log/route'

describe('api/me/audit-log route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    prismaMocks.prisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'audit-1',
        adminId: null,
        userId: 'user-1',
        action: 'ai_chat.created',
        category: 'ai',
        severity: 'info',
        targetType: 'project',
        targetId: 'project-1',
        targetEmail: null,
        resource: 'chat-thread-1',
        reason: null,
        metadata: {
          projectId: 'project-1',
          model: 'openai/gpt-test',
          secret: 'must-not-leak',
        },
        ipAddress: '192.168.1.42',
        userAgent: 'Mozilla/5.0 Aethel Test Browser',
        requestId: 'req-1',
        createdAt: new Date('2026-05-03T12:00:00.000Z'),
      },
      {
        id: 'audit-2',
        adminId: 'admin-1',
        userId: null,
        action: 'security.mfa_reviewed',
        category: 'security',
        severity: 'warning',
        targetType: 'user',
        targetId: 'user-1',
        targetEmail: 'builder@example.com',
        resource: null,
        reason: 'Security review completed',
        metadata: {
          provider: 'totp',
          recoveryCode: 'must-not-leak',
        },
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        userAgent: null,
        requestId: 'req-2',
        createdAt: new Date('2026-05-03T13:00:00.000Z'),
      },
    ])
  })

  it('returns a redacted user-facing audit trail scoped to the authenticated account', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/me/audit-log?limit=200&category=security'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(prismaMocks.prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'security',
          OR: expect.arrayContaining([
            { userId: 'user-1' },
            { adminId: 'user-1' },
            { targetType: 'user', targetId: 'user-1' },
            { targetEmail: 'builder@example.com' },
          ]),
        }),
        take: 50,
      }),
    )

    expect(payload.summary).toMatchObject({
      totalReturned: 2,
      warnings: 1,
      critical: 0,
    })
    expect(payload.events[0]).toMatchObject({
      actor: 'you',
      title: 'Ai chat created',
      ipAddress: '192.168.1.x',
      metadata: {
        projectId: 'project-1',
        model: 'openai/gpt-test',
      },
    })
    expect(payload.events[0].metadata.secret).toBeUndefined()
    expect(payload.events[1]).toMatchObject({
      actor: 'aethel_operator',
      ipAddress: '2001:0db8:85a3::',
      metadata: {
        provider: 'totp',
      },
    })
    expect(payload.events[1].metadata.recoveryCode).toBeUndefined()
    expect(payload.privacy).toEqual({
      metadata: 'allowlisted',
      ipAddress: 'masked',
      adminIdentity: 'redacted',
    })
  })

  it('returns 401 when the request is not authenticated', async () => {
    authMocks.requireAuth.mockImplementation(() => {
      throw new Error('Unauthorized')
    })

    const response = await GET(new NextRequest('http://localhost:3000/api/me/audit-log'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
    expect(prismaMocks.prisma.auditLog.findMany).not.toHaveBeenCalled()
  })
})
