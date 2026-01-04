import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateTokenWithRole } from '@/lib/auth-server';

/**
 * OAuth Callback Handler
 * Exchanges authorization code for tokens and creates/updates user
 */

const OAUTH_PROVIDERS = {
  google: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
  },
  github: {
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    emailUrl: 'https://api.github.com/user/emails',
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
  },
  discord: {
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    clientIdEnv: 'DISCORD_CLIENT_ID',
    clientSecretEnv: 'DISCORD_CLIENT_SECRET',
  },
  gitlab: {
    tokenUrl: 'https://gitlab.com/oauth/token',
    userInfoUrl: 'https://gitlab.com/api/v4/user',
    clientIdEnv: 'GITLAB_CLIENT_ID',
    clientSecretEnv: 'GITLAB_CLIENT_SECRET',
  },
} as const;

type Provider = keyof typeof OAUTH_PROVIDERS;

interface OAuthUserInfo {
  email: string;
  name: string;
  avatar?: string;
  providerId: string;
}

function getCallbackUrl(provider: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/auth/oauth/${provider}/callback`;
}

async function exchangeCodeForToken(
  provider: Provider,
  code: string
): Promise<string> {
  const config = OAUTH_PROVIDERS[provider];
  const clientId = process.env[config.clientIdEnv]!;
  const clientSecret = process.env[config.clientSecretEnv]!;

  const tokenParams: Record<string, string> = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: getCallbackUrl(provider),
    grant_type: 'authorization_code',
  };

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(tokenParams).toString(),
  });

  const data = await response.json();
  
  if (!response.ok || !data.access_token) {
    throw new Error(`Failed to exchange code: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function fetchUserInfo(
  provider: Provider,
  accessToken: string
): Promise<OAuthUserInfo> {
  const config = OAUTH_PROVIDERS[provider];

  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  const data = await response.json();

  // Normalize user info based on provider
  switch (provider) {
    case 'google':
      return {
        email: data.email,
        name: data.name,
        avatar: data.picture,
        providerId: data.id,
      };

    case 'github': {
      // GitHub may not return email in user info, need to fetch separately
      let email = data.email;
      if (!email && 'emailUrl' in config) {
        const emailResponse = await fetch(config.emailUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });
        const emails = await emailResponse.json();
        const primaryEmail = emails.find((e: any) => e.primary) || emails[0];
        email = primaryEmail?.email;
      }
      return {
        email,
        name: data.name || data.login,
        avatar: data.avatar_url,
        providerId: String(data.id),
      };
    }

    case 'discord':
      return {
        email: data.email,
        name: data.username,
        avatar: data.avatar
          ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
          : undefined,
        providerId: data.id,
      };

    case 'gitlab':
      return {
        email: data.email,
        name: data.name || data.username,
        avatar: data.avatar_url,
        providerId: String(data.id),
      };

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider as Provider;

  if (!OAUTH_PROVIDERS[provider]) {
    return NextResponse.redirect(new URL('/login?error=invalid_provider', req.url));
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error(`OAuth error from ${provider}:`, error);
    return NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  }

  // Validate code and state
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url));
  }

  // Verify state (CSRF protection)
  const storedState = req.cookies.get('oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', req.url));
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(provider, code);

    // Fetch user info from provider
    const userInfo = await fetchUserInfo(provider, accessToken);

    if (!userInfo.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', req.url));
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      // Create new user with OAuth
      user = await prisma.user.create({
        data: {
          email: userInfo.email,
          name: userInfo.name,
          password: '', // OAuth users don't have password
          plan: 'starter',
          oauthProvider: provider,
          oauthProviderId: userInfo.providerId,
          emailVerified: true, // OAuth emails are pre-verified
          avatar: userInfo.avatar,
        },
      });
    } else {
      // Update OAuth info if not set
      if (!(user as any).oauthProvider) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            oauthProvider: provider,
            oauthProviderId: userInfo.providerId,
            emailVerified: true,
            avatar: userInfo.avatar || (user as any).avatar,
          },
        });
      }
    }

    // Generate JWT token
    const token = generateTokenWithRole(
      user.id,
      user.email,
      (user as any).role || 'user'
    );

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Redirect to dashboard with token cookie
    const response = NextResponse.redirect(new URL('/dashboard', req.url));
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Clear OAuth state cookie
    response.cookies.delete('oauth_state');

    return response;
  } catch (err) {
    console.error(`OAuth callback error for ${provider}:`, err);
    return NextResponse.redirect(
      new URL('/login?error=oauth_failed', req.url)
    );
  }
}

export const dynamic = 'force-dynamic';
