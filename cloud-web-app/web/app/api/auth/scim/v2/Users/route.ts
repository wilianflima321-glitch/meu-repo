import { randomUUID } from 'node:crypto'

import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

import { prisma } from '@/lib/db'
import {
  authorizeScimRequest,
  parseScimPagination,
  parseUserNameEqFilter,
  resolveScimDisplayName,
  resolveScimEmail,
  scimError,
  scimJson,
  scimListResponse,
  toScimUser,
  type ScimUserPayload,
} from '@/lib/security/scim'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const unauthorized = authorizeScimRequest(request)
  if (unauthorized) return unauthorized

  const { searchParams } = request.nextUrl
  const { startIndex, count, skip } = parseScimPagination(searchParams)
  const emailFilter = parseUserNameEqFilter(searchParams.get('filter'))
  const where = emailFilter
    ? { email: emailFilter }
    : { oauthProvider: 'scim' }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip,
      take: count,
    }),
    prisma.user.count({ where }),
  ])

  return scimJson(scimListResponse(users.map(toScimUser), startIndex, count, total))
}

export async function POST(request: NextRequest) {
  const unauthorized = authorizeScimRequest(request)
  if (unauthorized) return unauthorized

  const payload = (await request.json().catch(() => null)) as ScimUserPayload | null
  if (!payload) return scimError(400, 'Invalid SCIM user payload.', 'invalidSyntax')

  const email = resolveScimEmail(payload)
  if (!email) return scimError(400, 'SCIM userName or primary email is required.', 'invalidValue')

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return scimError(409, 'A user with this userName already exists.', 'uniqueness')

  const password = await bcrypt.hash(`scim:${randomUUID()}`, 10)
  const user = await prisma.user.create({
    data: {
      email,
      password,
      name: resolveScimDisplayName(payload) || email,
      emailVerified: true,
      oauthProvider: 'scim',
      oauthProviderId: payload.externalId || email,
      plan: 'free',
      isShadowBanned: payload.active === false,
      shadowBanReason: payload.active === false ? 'SCIM provisioned inactive' : null,
      shadowBannedAt: payload.active === false ? new Date() : null,
    },
  })

  return scimJson(toScimUser(user), { status: 201 })
}