import crypto from 'node:crypto'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { User } from '@prisma/client'

export const SCIM_CONTENT_TYPE = 'application/scim+json'
export const SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User'
export const SCIM_ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error'
export const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse'
export const SCIM_PATCH_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp'

export type ScimName = {
  formatted?: string
  givenName?: string
  familyName?: string
}

export type ScimUserPayload = {
  schemas?: string[]
  id?: string
  externalId?: string
  userName?: string
  active?: boolean
  displayName?: string
  name?: ScimName
  emails?: Array<{ value?: string; primary?: boolean; type?: string }>
}

type ScimOperation = {
  op?: string
  path?: string
  value?: unknown
}

export type ScimPatchPayload = {
  schemas?: string[]
  Operations?: ScimOperation[]
}

export function isScimConfigured() {
  return Boolean(getScimToken())
}

export function getScimToken() {
  return process.env.AETHEL_SCIM_BEARER_TOKEN || process.env.SCIM_BEARER_TOKEN || undefined
}

export function scimJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'content-type': SCIM_CONTENT_TYPE,
      ...(init?.headers || {}),
    },
  })
}

export function scimError(status: number, detail: string, scimType?: string) {
  return scimJson(
    {
      schemas: [SCIM_ERROR_SCHEMA],
      status: String(status),
      detail,
      ...(scimType ? { scimType } : {}),
    },
    { status },
  )
}

export function authorizeScimRequest(request: NextRequest) {
  const expected = getScimToken()
  if (!expected) {
    return scimError(503, 'SCIM provisioning is not configured. Set AETHEL_SCIM_BEARER_TOKEN.', 'notConfigured')
  }

  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (!safeEqual(token, expected)) {
    return scimError(401, 'Invalid SCIM bearer token.', 'invalidToken')
  }

  return null
}

export function resolveScimEmail(payload: ScimUserPayload) {
  const direct = normalizeEmail(payload.userName)
  if (direct) return direct

  const primary = payload.emails?.find((email) => email.primary)?.value
  const first = payload.emails?.[0]?.value
  return normalizeEmail(primary || first)
}

export function resolveScimDisplayName(payload: ScimUserPayload) {
  if (typeof payload.displayName === 'string' && payload.displayName.trim()) {
    return payload.displayName.trim()
  }

  if (payload.name?.formatted?.trim()) return payload.name.formatted.trim()

  const parts = [payload.name?.givenName, payload.name?.familyName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)

  return parts.length ? parts.join(' ') : undefined
}

export function toScimUser(user: Pick<User, 'id' | 'email' | 'name' | 'oauthProvider' | 'oauthProviderId' | 'isShadowBanned' | 'createdAt' | 'updatedAt'>) {
  return {
    schemas: [SCIM_USER_SCHEMA],
    id: user.id,
    externalId: user.oauthProvider === 'scim' ? user.oauthProviderId || undefined : undefined,
    userName: user.email,
    active: !user.isShadowBanned,
    displayName: user.name || user.email,
    name: {
      formatted: user.name || user.email,
    },
    emails: [
      {
        value: user.email,
        primary: true,
        type: 'work',
      },
    ],
    meta: {
      resourceType: 'User',
      created: user.createdAt.toISOString(),
      lastModified: user.updatedAt.toISOString(),
      location: `/api/auth/scim/v2/Users/${user.id}`,
    },
  }
}

export function scimListResponse(resources: unknown[], startIndex: number, count: number, totalResults: number) {
  return {
    schemas: [SCIM_LIST_SCHEMA],
    totalResults,
    startIndex,
    itemsPerPage: resources.length,
    Resources: resources.slice(0, count),
  }
}

export function parseScimPagination(searchParams: URLSearchParams) {
  const startIndex = Math.max(Number(searchParams.get('startIndex') || '1'), 1)
  const count = Math.min(Math.max(Number(searchParams.get('count') || '50'), 1), 100)
  return { startIndex, count, skip: startIndex - 1 }
}

export function parseUserNameEqFilter(filter: string | null) {
  if (!filter) return null
  const match = filter.match(/^userName\s+eq\s+"([^"]+)"$/i)
  return normalizeEmail(match?.[1])
}

export function readScimPatchValue(payload: ScimPatchPayload, path: string) {
  const op = payload.Operations?.find((operation) => operation.path?.toLowerCase() === path.toLowerCase())
  return op?.value
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' && value.includes('@') ? value.trim().toLowerCase() : null
}

function safeEqual(a: string, b: string) {
  if (!a || !b) return false
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}