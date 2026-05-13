import { NextRequest, NextResponse } from 'next/server'

import { apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'
import { consumeMagicLink } from '@/lib/server/magic-link'

export const dynamic = 'force-dynamic'

const routeLogger = createComponentLogger('api.auth.magic-link.verify')

function buildRedirect(req: NextRequest, path: string) {
  return new URL(path, req.url)
}

function withAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return response
}

async function verifyTokenValue(req: NextRequest, token: string | null) {
  if (!token) {
    return NextResponse.json({ error: 'Magic link token is required' }, { status: 400 })
  }

  const result = await consumeMagicLink(token)
  if (result.status !== 'authenticated') {
    return NextResponse.json({ error: 'Magic link is invalid, expired, or already used', status: result.status }, { status: 401 })
  }

  return withAuthCookie(
    NextResponse.json({
      access_token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        plan: result.user.plan,
      },
    }),
    result.token
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const token = typeof body.token === 'string' ? body.token : null
    return verifyTokenValue(req, token)
  } catch (error) {
    routeLogger.error('magic_link.verify.failed', error)
    return apiInternalError()
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.redirect(buildRedirect(req, '/login?magic=missing'))

    const result = await consumeMagicLink(token)
    if (result.status !== 'authenticated') {
      return NextResponse.redirect(buildRedirect(req, `/login?magic=${encodeURIComponent(result.status)}`))
    }

    return withAuthCookie(NextResponse.redirect(buildRedirect(req, '/dashboard?magic=success')), result.token)
  } catch (error) {
    routeLogger.error('magic_link.verify_redirect.failed', error)
    return NextResponse.redirect(buildRedirect(req, '/login?magic=error'))
  }
}
