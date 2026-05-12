import { NextResponse } from 'next/server'

import { buildSamlMetadata, getSamlReadiness } from '@/lib/security/saml'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const readiness = getSamlReadiness()
  return new NextResponse(buildSamlMetadata(readiness), {
    status: 200,
    headers: {
      'content-type': 'application/samlmetadata+xml; charset=utf-8',
      'cache-control': 'no-store',
      'x-aethel-saml-idp-configured': String(readiness.configured),
      'x-aethel-saml-request-signing': String(readiness.requestSigningConfigured),
    },
  })
}
