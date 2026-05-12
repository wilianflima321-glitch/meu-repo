import { randomUUID } from 'node:crypto'

import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

import { prisma } from '@/lib/db'
import {
  authorizeScimRequest,
  readScimPatchValue,
  resolveScimDisplayName,
  resolveScimEmail,
  scimError,
  scimJson,
  toScimUser,
  type ScimPatchPayload,
  type ScimUserPayload,
} from '@/lib/security/scim'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const unauthorized = authorizeScimRequest(request)
  if (unauthorized) return unauthorized

  const user = await prisma.user.findUnique({ where: { id: context.params.id } })
  if (!user) return scimError(404, 'SCIM user not found.', 'notFound')
  return scimJson(toScimUser(user))
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const unauthorized = authorizeScimRequest(request)
  if (unauthorized) return unauthorized

  const payload = (await request.json().catch(() => null)) as ScimUserPayload | null
  if (!payload) return scimError(400, 'Invalid SCIM user payload.', 'invalidSyntax')

  const email = resolveScimEmail(payload)
  const user = await prisma.user.findUnique({ where: { id: context.params.id } })
  if (!user) return scimError(404, 'SCIM user not found.', 'notFound')

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(email ? { email } : {}),
      name: resolveScimDisplayName(payload) || user.name,
      oauthProvider: 'scim',
      oauthProviderId: payload.externalId || user.oauthProviderId || email || user.email,
      isShadowBanned: payload.active === false,
      shadowBanReason: payload.active === false ? 'SCIM deprovisioned' : null,
      shadowBannedAt: payload.active === false ? new Date() : null,
    },
  })

  return scimJson(toScimUser(updated))
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const unauthorized = authorizeScimRequest(request)
  if (unauthorized) return unauthorized

  const payload = (await request.json().catch(() => null)) as ScimPatchPayload | null
  if (!payload?.Operations?.length) return scimError(400, 'SCIM PATCH Operations are required.', 'invalidSyntax')

  const user = await prisma.user.findUnique({ where: { id: context.params.id } })
  if (!user) return scimError(404, 'SCIM user not found.', 'notFound')

  const activeValue = readScimPatchValue(payload, 'active')
  const displayNameValue = readScimPatchValue(payload, 'displayName')
  const userNameValue = readScimPatchValue(payload, 'userName')
  const externalIdValue = readScimPatchValue(payload, 'externalId')

  const nextActive = typeof activeValue === 'boolean' ? activeValue : undefined
  const nextEmail = typeof userNameValue === 'string' && userNameValue.includes('@') ? userNameValue.trim().toLowerCase() : undefined
  const nextName = typeof displayNameValue === 'string' && displayNameValue.trim() ? displayNameValue.trim() : undefined
  const nextExternalId = typeof externalIdValue === 'string' && externalIdValue.trim() ? externalIdValue.trim() : undefined

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(nextEmail ? { email: nextEmail } : {}),
      ...(nextName ? { name: nextName } : {}),
      ...(nextExternalId ? { oauthProviderId: nextExternalId } : {}),
      oauthProvider: 'scim',
      ...(nextActive === undefined
        ? {}
        : {
            isShadowBanned: !nextActive,
            shadowBanReason: nextActive ? null : 'SCIM deprovisioned',
            shadowBannedAt: nextActive ? null : new Date(),
          }),
    },
  })

  return scimJson(toScimUser(updated))
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const unauthorized = authorizeScimRequest(request)
  if (unauthorized) return unauthorized

  const user = await prisma.user.findUnique({ where: { id: context.params.id } })
  if (!user) return scimError(404, 'SCIM user not found.', 'notFound')

  const password = await bcrypt.hash(`scim-deprovisioned:${randomUUID()}`, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password,
      oauthProvider: 'scim',
      isShadowBanned: true,
      shadowBanReason: 'SCIM deprovisioned',
      shadowBannedAt: new Date(),
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  return new Response(null, { status: 204 })
}