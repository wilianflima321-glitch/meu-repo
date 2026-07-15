import { afterEach, describe, expect, it } from 'vitest'

import {
  getScimToken,
  isScimConfigured,
  parseScimPagination,
  parseUserNameEqFilter,
  resolveScimDisplayName,
  resolveScimEmail,
  scimListResponse,
  toScimUser,
} from '@/lib/security/scim'

describe('scim helpers', () => {
  afterEach(() => {
    delete process.env.AETHEL_SCIM_BEARER_TOKEN
    delete process.env.SCIM_BEARER_TOKEN
  })

  it('keeps SCIM disabled until an enterprise bearer token exists', () => {
    expect(isScimConfigured()).toBe(false)
    process.env.SCIM_BEARER_TOKEN = 'scim-secret'
    expect(getScimToken()).toBe('scim-secret')
    expect(isScimConfigured()).toBe(true)
  })

  it('normalizes user identity from SCIM payloads without inventing fields', () => {
    expect(resolveScimEmail({ userName: ' Builder@Aethel.Dev ' })).toBe('builder@aethel.dev')
    expect(resolveScimEmail({ emails: [{ value: 'team@aethel.dev', primary: true }] })).toBe('team@aethel.dev')
    expect(resolveScimDisplayName({ name: { givenName: 'Ada', familyName: 'Lovelace' } })).toBe('Ada Lovelace')
  })

  it('parses safe pagination and exact userName filters', () => {
    expect(parseScimPagination(new URLSearchParams('startIndex=2&count=500'))).toEqual({
      startIndex: 2,
      count: 100,
      skip: 1,
    })
    expect(parseUserNameEqFilter('userName eq "USER@AETHEL.DEV"')).toBe('user@aethel.dev')
    expect(parseUserNameEqFilter('displayName co "Aethel"')).toBeNull()
  })

  it('serializes users as SCIM resources with active state', () => {
    const now = new Date('2026-05-12T00:00:00.000Z')
    const resource = toScimUser({
      id: 'user-1',
      email: 'creator@aethel.dev',
      name: 'Creator',
      oauthProvider: 'scim',
      oauthProviderId: 'external-1',
      isShadowBanned: false,
      createdAt: now,
      updatedAt: now,
    })

    expect(resource).toMatchObject({
      id: 'user-1',
      externalId: 'external-1',
      userName: 'creator@aethel.dev',
      active: true,
      emails: [{ value: 'creator@aethel.dev', primary: true, type: 'work' }],
    })
    expect(scimListResponse([resource], 1, 50, 1)).toMatchObject({ totalResults: 1, itemsPerPage: 1 })
  })
})