import type { NextRequest } from 'next/server'

const FALLBACK_ORIGIN = 'http://localhost:3000'

function sanitizeOrigin(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim()
  if (!value) return null
  if (/undefined|null|NaN/i.test(value)) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function resolveAppOrigin(request?: NextRequest): string {
  const explicit = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.AETHEL_APP_URL,
  ]
    .map(sanitizeOrigin)
    .find(Boolean)

  if (explicit) return explicit
  if (request) return request.nextUrl.origin
  return FALLBACK_ORIGIN
}

export function buildAppUrl(pathname: string, request?: NextRequest): string {
  const base = resolveAppOrigin(request).replace(/\/+$/, '')
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${base}${path}`
}
