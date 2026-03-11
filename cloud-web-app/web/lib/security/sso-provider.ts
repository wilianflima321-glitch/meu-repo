/**
 * SSO / OIDC / SAML Authentication Provider
 *
 * Supports enterprise SSO via OpenID Connect and SAML 2.0.
 * Integrates with NextAuth.js for session management.
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P2: Security)
 */

// ============================================================================
// TYPES
// ============================================================================

export type SSOProvider = 'google' | 'github' | 'microsoft' | 'okta' | 'auth0' | 'custom-oidc' | 'saml';

export interface OIDCConfig {
  provider: SSOProvider;
  clientId: string;
  clientSecret: string;
  issuer: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
  scopes?: string[];
  callbackUrl: string;
}

export interface SAMLConfig {
  provider: 'saml';
  entityId: string;
  ssoUrl: string;
  certificate: string;
  callbackUrl: string;
  attributeMapping?: {
    email?: string;
    name?: string;
    role?: string;
    groups?: string;
  };
}

export interface SSOSession {
  userId: string;
  email: string;
  name?: string;
  provider: SSOProvider;
  providerAccountId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  roles: string[];
  groups: string[];
}

export interface SSOReadiness {
  configured: boolean;
  providers: {
    name: SSOProvider;
    configured: boolean;
    issuer?: string;
    missing?: string[];
  }[];
  samlConfigured: boolean;
}

// ============================================================================
// OIDC PROVIDER CONFIGS
// ============================================================================

const WELL_KNOWN_PROVIDERS: Record<string, Partial<OIDCConfig>> = {
  google: {
    issuer: 'https://accounts.google.com',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes: ['openid', 'email', 'profile'],
  },
  github: {
    issuer: 'https://github.com',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userinfoUrl: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
  },
  microsoft: {
    issuer: 'https://login.microsoftonline.com/common/v2.0',
    scopes: ['openid', 'email', 'profile', 'User.Read'],
  },
};

// ============================================================================
// SSO CONFIGURATION
// ============================================================================

export function getConfiguredProviders(): SSOReadiness {
  const providers: SSOReadiness['providers'] = [];

  // Google
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  providers.push({
    name: 'google',
    configured: !!(googleId && googleSecret),
    issuer: WELL_KNOWN_PROVIDERS.google.issuer,
    missing: [
      ...(!googleId ? ['GOOGLE_CLIENT_ID'] : []),
      ...(!googleSecret ? ['GOOGLE_CLIENT_SECRET'] : []),
    ].filter(Boolean),
  });

  // GitHub
  const githubId = process.env.GITHUB_CLIENT_ID;
  const githubSecret = process.env.GITHUB_CLIENT_SECRET;
  providers.push({
    name: 'github',
    configured: !!(githubId && githubSecret),
    issuer: WELL_KNOWN_PROVIDERS.github.issuer,
    missing: [
      ...(!githubId ? ['GITHUB_CLIENT_ID'] : []),
      ...(!githubSecret ? ['GITHUB_CLIENT_SECRET'] : []),
    ].filter(Boolean),
  });

  // Microsoft/Azure AD
  const msId = process.env.MICROSOFT_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID;
  const msSecret = process.env.MICROSOFT_CLIENT_SECRET || process.env.AZURE_AD_CLIENT_SECRET;
  providers.push({
    name: 'microsoft',
    configured: !!(msId && msSecret),
    issuer: WELL_KNOWN_PROVIDERS.microsoft.issuer,
    missing: [
      ...(!msId ? ['MICROSOFT_CLIENT_ID'] : []),
      ...(!msSecret ? ['MICROSOFT_CLIENT_SECRET'] : []),
    ].filter(Boolean),
  });

  // Custom OIDC
  const oidcIssuer = process.env.OIDC_ISSUER;
  const oidcId = process.env.OIDC_CLIENT_ID;
  const oidcSecret = process.env.OIDC_CLIENT_SECRET;
  providers.push({
    name: 'custom-oidc',
    configured: !!(oidcIssuer && oidcId && oidcSecret),
    issuer: oidcIssuer,
    missing: [
      ...(!oidcIssuer ? ['OIDC_ISSUER'] : []),
      ...(!oidcId ? ['OIDC_CLIENT_ID'] : []),
      ...(!oidcSecret ? ['OIDC_CLIENT_SECRET'] : []),
    ].filter(Boolean),
  });

  const samlConfigured = !!(
    process.env.SAML_ENTITY_ID &&
    process.env.SAML_SSO_URL &&
    process.env.SAML_CERTIFICATE
  );

  return {
    configured: providers.some((p) => p.configured) || samlConfigured,
    providers,
    samlConfigured,
  };
}

/**
 * Build OIDC configuration for a provider
 */
export function buildOIDCConfig(provider: SSOProvider): OIDCConfig | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const callbackUrl = `${appUrl}/api/auth/callback/${provider}`;

  const wellKnown = WELL_KNOWN_PROVIDERS[provider];
  if (!wellKnown) return null;

  const envPrefix = provider.toUpperCase().replace(/-/g, '_');
  const clientId = process.env[`${envPrefix}_CLIENT_ID`];
  const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`];

  if (!clientId || !clientSecret) return null;

  return {
    provider,
    clientId,
    clientSecret,
    issuer: wellKnown.issuer || '',
    authorizationUrl: wellKnown.authorizationUrl,
    tokenUrl: wellKnown.tokenUrl,
    userinfoUrl: wellKnown.userinfoUrl,
    scopes: wellKnown.scopes || ['openid', 'email', 'profile'],
    callbackUrl,
  };
}

/**
 * Validate an OIDC token
 */
export async function validateOIDCToken(
  token: string,
  config: OIDCConfig
): Promise<{ valid: boolean; claims?: Record<string, unknown>; error?: string }> {
  try {
    if (!config.userinfoUrl) {
      return { valid: false, error: 'No userinfo URL configured' };
    }

    const res = await fetch(config.userinfoUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return { valid: false, error: `Userinfo request failed: ${res.status}` };
    }

    const claims = await res.json();
    return { valid: true, claims };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Token validation failed',
    };
  }
}

/**
 * Map SSO claims to internal user attributes
 */
export function mapSSOClaims(
  claims: Record<string, unknown>,
  provider: SSOProvider
): {
  email: string;
  name: string;
  providerAccountId: string;
  roles: string[];
  groups: string[];
} {
  const email = String(claims.email || claims.preferred_username || '');
  const name = String(claims.name || claims.given_name || email.split('@')[0] || '');
  const providerAccountId = String(claims.sub || claims.id || '');

  // Extract roles/groups from claims
  const roles: string[] = [];
  const groups: string[] = [];

  if (Array.isArray(claims.roles)) {
    roles.push(...claims.roles.map(String));
  }
  if (Array.isArray(claims.groups)) {
    groups.push(...claims.groups.map(String));
  }

  // Map enterprise roles
  if (claims.realm_access && typeof claims.realm_access === 'object') {
    const realmRoles = (claims.realm_access as Record<string, unknown>).roles;
    if (Array.isArray(realmRoles)) {
      roles.push(...realmRoles.map(String));
    }
  }

  return { email, name, providerAccountId, roles, groups };
}
