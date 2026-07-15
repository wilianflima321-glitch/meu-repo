import { createHash, randomBytes } from 'node:crypto'

import type { User } from '@prisma/client'

import { generateTokenWithRole } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { emailService } from '@/lib/email-system'

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000

type MagicLinkTokenRow = {
  id: string
  user_id: string
  email: string
  token_hash: string
  expires_at: Date
  used_at: Date | null
  created_at: Date
}

export type MagicLinkIssueResult =
  | {
      status: 'sent'
      email: string
      expiresAt: Date
    }
  | {
      status: 'not-found'
      email: string
    }

export type MagicLinkConsumeResult =
  | {
      status: 'authenticated'
      token: string
      user: Pick<User, 'id' | 'email' | 'name' | 'role' | 'plan'>
    }
  | {
      status: 'invalid' | 'expired' | 'used'
    }

export function normalizeMagicLinkEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function hashMagicLinkToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function buildMagicLinkUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl.replace(/\/$/, '')}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`
}

export async function issueMagicLink(params: {
  email: string
  requestIp?: string | null
  userAgent?: string | null
}): Promise<MagicLinkIssueResult> {
  const email = normalizeMagicLinkEmail(params.email)
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  })

  if (!user) {
    return { status: 'not-found', email }
  }

  const token = randomBytes(32).toString('hex')
  const tokenHash = hashMagicLinkToken(token)
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS)

  await prisma.$executeRaw`
    DELETE FROM auth_magic_link_tokens
    WHERE user_id = ${user.id}
      AND (used_at IS NOT NULL OR expires_at < CURRENT_TIMESTAMP)
  `

  await prisma.$executeRaw`
    INSERT INTO auth_magic_link_tokens (
      id,
      user_id,
      email,
      token_hash,
      request_ip,
      user_agent,
      expires_at
    )
    VALUES (
      ${`magic-link-${randomBytes(12).toString('hex')}`},
      ${user.id},
      ${user.email},
      ${tokenHash},
      ${params.requestIp || null},
      ${params.userAgent || null},
      ${expiresAt}
    )
  `

  const magicLinkUrl = buildMagicLinkUrl(token)
  await emailService.sendTemplate(
    'magic_link',
    { email: user.email, name: user.name || user.email.split('@')[0] },
    {
      name: user.name || user.email.split('@')[0],
      magicLinkUrl,
      expiryMinutes: Math.round(MAGIC_LINK_TTL_MS / 60_000),
    },
    { tags: ['auth', 'magic-link'] }
  )

  return { status: 'sent', email: user.email, expiresAt }
}

export async function consumeMagicLink(token: string): Promise<MagicLinkConsumeResult> {
  const tokenHash = hashMagicLinkToken(token)
  const rows = await prisma.$queryRaw<MagicLinkTokenRow[]>`
    SELECT
      id,
      user_id,
      email,
      token_hash,
      expires_at,
      used_at,
      created_at
    FROM auth_magic_link_tokens
    WHERE token_hash = ${tokenHash}
    LIMIT 1
  `

  const row = rows[0]
  if (!row) return { status: 'invalid' }
  if (row.used_at) return { status: 'used' }
  if (row.expires_at.getTime() <= Date.now()) return { status: 'expired' }

  const consumed = await prisma.$executeRaw`
    UPDATE auth_magic_link_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE id = ${row.id}
      AND used_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
  `

  if (Number(consumed) !== 1) return { status: 'used' }

  const user = await prisma.user.findUnique({
    where: { id: row.user_id },
    select: { id: true, email: true, name: true, role: true, plan: true },
  })
  if (!user) return { status: 'invalid' }

  return {
    status: 'authenticated',
    user,
    token: generateTokenWithRole(user.id, user.email, user.role || 'user', user.plan || undefined),
  }
}
