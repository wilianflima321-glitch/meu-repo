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
        id: 'User',
        name: 'User',
        endpoint: '/Users',
        description: 'Aethel enterprise user provisioning resource.',
        schema: SCIM_USER_SCHEMA,
        schemaExtensions: [],
        meta: { resourceType: 'ResourceType', location: '/api/auth/scim/v2/ResourceTypes/User' },
      },
    ],
  })
}