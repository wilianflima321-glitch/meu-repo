/**
 * RBAC Middleware for Aethel Engine
 * Protects critical admin and billing routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'aethel-secret-key')

export type UserRole = 'admin' | 'moderator' | 'user' | 'guest'

interface DecodedToken {
  sub: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['admin:read', 'admin:write', 'billing:read', 'billing:write', 'security:read', 'security:write', 'user:manage'],
  moderator: ['admin:read', 'security:read', 'user:read'],
  user: ['user:read', 'project:read', 'project:write'],
  guest: ['public:read']
}

const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  '/api/admin': ['admin'],
  '/api/billing': ['admin', 'moderator'],
  '/api/security': ['admin'],
  '/api/users': ['admin', 'moderator'],
  '/admin': ['admin'],
}

export async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    const verified = await jwtVerify(token, secret)
    const payload = verified.payload as Record<string, unknown>
    const sub = typeof payload.sub === 'string' ? payload.sub : null
    const email = typeof payload.email === 'string' ? payload.email : null
    const roleRaw = typeof payload.role === 'string' ? payload.role : 'guest'
    const role: UserRole = ['admin', 'moderator', 'user', 'guest'].includes(roleRaw)
      ? (roleRaw as UserRole)
      : 'guest'
    if (!sub || !email) return null
    return {
      sub,
      email,
      role,
      iat: typeof payload.iat === 'number' ? payload.iat : 0,
      exp: typeof payload.exp === 'number' ? payload.exp : 0,
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.includes(permission) || permissions.includes('*')
}

export async function rbacMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname

  // Check if route requires RBAC
  const requiredRoles = Object.entries(PROTECTED_ROUTES).find(([route]) => pathname.startsWith(route))?.[1]

  if (!requiredRoles) {
    return null // Route doesn't require RBAC
  }

  // Extract token from Authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const decoded = await verifyToken(token)

  if (!decoded) {
    return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 })
  }

  // Check if user role is allowed
  if (!requiredRoles.includes(decoded.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
  }

  // Add user info to request headers for downstream handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', decoded.sub)
  requestHeaders.set('x-user-role', decoded.role)
  requestHeaders.set('x-user-email', decoded.email)

  return null // Allow request to proceed
}

export function createAuthorizationHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  }
}
