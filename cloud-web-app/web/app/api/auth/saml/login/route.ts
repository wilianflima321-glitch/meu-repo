import { NextRequest, NextResponse } from 'next/server'

import { buildSamlLoginRedirectUrl } from '@/lib/security/saml'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const relayState = request.nextUrl.searchParams.get('returnTo') || request.nextUrl.searchParams.get('RelayState')
  const result = buildSamlLoginRedirectUrl({ relayState })

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        message: 'SAML login initiation requires SAML_ENTITY_ID, SAML_SSO_URL, and SAML_CERTIFICATE.',
        metadataUrl: result.readiness.metadataUrl,
        acsUrl: result.readiness.acsUrl,
      },
      { status: result.status },
    )
  }

  return NextResponse.redirect(result.url, {
    status: 302,
    headers: {
      'cache-control': 'no-store',
      'x-aethel-saml-flow': 'redirect-binding',
    },
  })
}
