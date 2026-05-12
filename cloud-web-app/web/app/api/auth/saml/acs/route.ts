import { NextRequest, NextResponse } from 'next/server'

import { getSamlReadiness } from '@/lib/security/saml'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const readiness = getSamlReadiness()
  const form = await request.formData().catch(() => null)
  const samlResponse = form?.get('SAMLResponse')

  if (!samlResponse || typeof samlResponse !== 'string') {
    return NextResponse.json(
      {
        error: 'SAML_RESPONSE_REQUIRED',
        message: 'The SAML ACS endpoint requires a SAMLResponse form field from the identity provider.',
      },
      { status: 400 },
    )
  }

  return NextResponse.json(
    {
      error: 'SAML_ACS_VALIDATION_NOT_ENABLED',
      message:
        'SAML metadata and login initiation are available, but assertion validation is intentionally held until certificate-chain validation and replay protection are enabled.',
      configured: readiness.configured,
      acsUrl: readiness.acsUrl,
    },
    { status: 501 },
  )
}
