/**
 * SSO Readiness API
 *
 * GET /api/security/sso - Check SSO provider configuration
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P2: Security)
 */

import { NextResponse } from 'next/server';
import { getConfiguredProviders } from '@/lib/security/sso-provider';

export const dynamic = 'force-dynamic';

export async function GET() {
  const readiness = getConfiguredProviders();

  return NextResponse.json({
    configured: readiness.configured,
    providers: readiness.providers.map((p) => ({
      name: p.name,
      configured: p.configured,
      issuer: p.issuer,
      missingCount: p.missing?.length || 0,
    })),
    samlConfigured: readiness.samlConfigured,
    supportedProtocols: ['oidc', 'saml'],
    supportedProviders: ['google', 'github', 'microsoft', 'okta', 'auth0', 'custom-oidc'],
  });
}
