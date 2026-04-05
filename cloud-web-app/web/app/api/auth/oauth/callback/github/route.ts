import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url))
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
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
    redirectUrl.searchParams.set('oauth_provider', 'github')
    redirectUrl.searchParams.set('oauth_login', 'true')
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}
