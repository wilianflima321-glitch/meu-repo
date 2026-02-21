import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth Provider Configuration
 * Supports: Google, GitHub, Discord, GitLab
 */

const OAUTH_PROVIDERS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    emailUrl: 'https://api.github.com/user/emails',
    scopes: ['read:user', 'user:email'],
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
  },
  discord: {
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    scopes: ['identify', 'email'],
    clientIdEnv: 'DISCORD_CLIENT_ID',
    clientSecretEnv: 'DISCORD_CLIENT_SECRET',
  },
  gitlab: {
    authUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    userInfoUrl: 'https://gitlab.com/api/v4/user',
    scopes: ['read_user', 'email'],
    clientIdEnv: 'GITLAB_CLIENT_ID',
    clientSecretEnv: 'GITLAB_CLIENT_SECRET',
  },
} as const;

type Provider = keyof typeof OAUTH_PROVIDERS;

const MAX_PROVIDER_LENGTH = 40;

function getCallbackUrl(provider: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/auth/oauth/${provider}/callback`;
}

/**
 * GET /api/auth/oauth/[provider]
 * Redirects user to OAuth provider's authorization page
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const providerRaw = String(params.provider || '').trim().toLowerCase();
  if (!providerRaw || providerRaw.length > MAX_PROVIDER_LENGTH) {
    return NextResponse.json(
      { error: 'INVALID_PROVIDER', message: 'provider is required and must be under 40 characters.' },
      { status: 400 }
    );
  }
  const provider = providerRaw as Provider;
  
  if (!OAUTH_PROVIDERS[provider]) {
    return NextResponse.json(
      { error: `Unsupported OAuth provider: ${provider}` },
      { status: 400 }
    );
  }

  const config = OAUTH_PROVIDERS[provider];
  const clientId = process.env[config.clientIdEnv];

  if (!clientId) {
    return NextResponse.json(
      { error: `OAuth provider ${provider} is not configured` },
      { status: 500 }
    );
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID();
  
  // Build authorization URL
  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getCallbackUrl(provider),
    scope: config.scopes.join(' '),
    state,
    response_type: 'code',
  });

  // Provider-specific params
  if (provider === 'google') {
    authParams.set('access_type', 'offline');
    authParams.set('prompt', 'consent');
  }

  const authUrl = `${config.authUrl}?${authParams.toString()}`;

  // Create response with state cookie
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return response;
}

export const dynamic = 'force-dynamic';
