import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const provider = searchParams.get('provider')

  if (!provider) {
    return NextResponse.json(
      { error: 'Provider is required' },
      { status: 400 }
    )
  }

  // Redirect URLs for different providers
  const redirectUrls: Record<string, string> = {
    github: 'https://github.com/login/oauth/authorize',
    google: 'https://accounts.google.com/o/oauth2/v2/auth',
  }

  const clientId = process.env[`NEXT_PUBLIC_${provider.toUpperCase()}_CLIENT_ID`]
  
  if (!clientId) {
    return NextResponse.json(
      { error: `${provider} OAuth not configured` },
      { status: 500 }
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/oauth/callback/${provider}`

  // Build authorization URL based on provider
  let authUrl: string
  
  if (provider === 'github') {
    authUrl = `${redirectUrls.github}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`
  } else if (provider === 'google') {
    authUrl = `${redirectUrls.google}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`
  } else {
    return NextResponse.json(
      { error: 'Unsupported provider' },
      { status: 400 }
    )
  }

  return NextResponse.redirect(authUrl)
}
