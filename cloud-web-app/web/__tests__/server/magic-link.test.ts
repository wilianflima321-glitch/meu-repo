import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  },
  emailService: {
    sendTemplate: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }))
vi.mock('@/lib/email-system', () => ({ emailService: mocks.emailService }))

import {
  buildMagicLinkUrl,
  consumeMagicLink,
  hashMagicLinkToken,
  issueMagicLink,
  normalizeMagicLinkEmail,
} from '@/lib/server/magic-link'

describe('magic link auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret-for-magic-link'
    process.env.NEXT_PUBLIC_APP_URL = 'https://aethel.example'
  })

  it('normalizes email and hashes tokens before persistence', () => {
    expect(normalizeMagicLinkEmail(' Builder@Example.COM ')).toBe('builder@example.com')
    expect(hashMagicLinkToken('token')).toMatch(/^[a-f0-9]{64}$/)
    expect(hashMagicLinkToken('token')).not.toBe('token')
    expect(buildMagicLinkUrl('abc 123')).toBe('https://aethel.example/api/auth/magic-link/verify?token=abc%20123')
  })

  it('does not reveal unknown accounts during issue', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce(null)

    const result = await issueMagicLink({ email: 'missing@example.com' })

    expect(result).toEqual({ status: 'not-found', email: 'missing@example.com' })
    expect(mocks.emailService.sendTemplate).not.toHaveBeenCalled()
    expect(mocks.prisma.$executeRaw).not.toHaveBeenCalled()
  })

  it('sends a one-time sign-in email for existing users', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'builder@example.com',
      name: 'Builder',
    })
    mocks.prisma.$executeRaw.mockResolvedValue(1)
    mocks.emailService.sendTemplate.mockResolvedValue({ success: true })

    const result = await issueMagicLink({ email: 'Builder@Example.com', requestIp: '127.0.0.1', userAgent: 'vitest' })

    expect(result.status).toBe('sent')
    expect(mocks.prisma.$executeRaw).toHaveBeenCalledTimes(2)
    expect(mocks.emailService.sendTemplate).toHaveBeenCalledWith(
      'magic_link',
      { email: 'builder@example.com', name: 'Builder' },
      expect.objectContaining({ magicLinkUrl: expect.stringContaining('/api/auth/magic-link/verify?token=') }),
      { tags: ['auth', 'magic-link'] }
    )
  })

  it('rejects invalid, expired, and used tokens', async () => {
    mocks.prisma.$queryRaw.mockResolvedValueOnce([])
    await expect(consumeMagicLink('missing')).resolves.toEqual({ status: 'invalid' })

    mocks.prisma.$queryRaw.mockResolvedValueOnce([{ id: 'm1', used_at: new Date(), expires_at: new Date(Date.now() + 60_000) }])
    await expect(consumeMagicLink('used')).resolves.toEqual({ status: 'used' })

    mocks.prisma.$queryRaw.mockResolvedValueOnce([{ id: 'm2', used_at: null, expires_at: new Date(Date.now() - 60_000) }])
    await expect(consumeMagicLink('expired')).resolves.toEqual({ status: 'expired' })
  })

  it('consumes a valid token once and returns an auth cookie token', async () => {
    mocks.prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: 'magic-1',
        user_id: 'user-1',
        email: 'builder@example.com',
        token_hash: hashMagicLinkToken('valid-token'),
        expires_at: new Date(Date.now() + 60_000),
        used_at: null,
        created_at: new Date(),
      },
    ])
    mocks.prisma.$executeRaw.mockResolvedValueOnce(1)
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'builder@example.com',
      name: 'Builder',
      role: 'user',
      plan: 'free',
    })

    const result = await consumeMagicLink('valid-token')

    expect(result.status).toBe('authenticated')
    if (result.status === 'authenticated') {
      expect(result.user.email).toBe('builder@example.com')
      expect(result.token).toBeTruthy()
    }
  })
})
