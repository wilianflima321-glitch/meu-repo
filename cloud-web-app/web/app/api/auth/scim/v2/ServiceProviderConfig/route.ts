import { NextRequest } from 'next/server'

import { authorizeScimRequest, isScimConfigured, scimJson } from '@/lib/security/scim'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const unauthorized = authorizeScimRequest(request)
  if (unauthorized) return unauthorized

  return scimJson({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    documentationUri: 'https://aethel.app/docs/security/scim',
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 100 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        type: 'oauthbearertoken',
        name: 'Bearer token',
        description: 'Static enterprise SCIM bearer token stored as AETHEL_SCIM_BEARER_TOKEN.',
        primary: true,
      },
    ],
    configured: isScimConfigured(),
  })
}