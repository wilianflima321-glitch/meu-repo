import { NextRequest, NextResponse } from 'next/server'
import { createComponentLogger } from '@/lib/observability/logger'

const routeLogger = createComponentLogger('api.auth.oauth.google.callback')

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/callback/google`,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url))
    }

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()

    // Here you would:
    // 1. Check if user exists in your database
    // 2. Create or update user
    // 3. Create session/token
    // 4. Redirect to dashboard

    // For now, redirect to dashboard with user info (in production, use proper session)
    const redirectUrl = new URL('/dashboard', request.url)
    redirectUrl.searchParams.set('oauth_provider', 'google')
    redirectUrl.searchParams.set('oauth_login', 'true')
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    routeLogger.error('Google OAuth error', error)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}
