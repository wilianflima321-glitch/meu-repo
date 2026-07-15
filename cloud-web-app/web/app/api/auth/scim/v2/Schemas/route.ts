import { NextRequest } from 'next/server'

import { authorizeScimRequest, SCIM_USER_SCHEMA, scimJson } from '@/lib/security/scim'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const unauthorized = authorizeScimRequest(request)
  if (unauthorized) return unauthorized

  return scimJson({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 1,
    startIndex: 1,
    itemsPerPage: 1,
    Resources: [
      {
        id: SCIM_USER_SCHEMA,
        name: 'User',
        description: 'Core user schema for Aethel SCIM provisioning.',
        attributes: [
          { name: 'userName', type: 'string', required: true, uniqueness: 'server' },
          { name: 'active', type: 'boolean', required: false },
          { name: 'displayName', type: 'string', required: false },
          { name: 'emails', type: 'complex', multiValued: true, required: false },
        ],
        meta: { resourceType: 'Schema', location: `/api/auth/scim/v2/Schemas/${encodeURIComponent(SCIM_USER_SCHEMA)}` },
      },
    ],
  })
}