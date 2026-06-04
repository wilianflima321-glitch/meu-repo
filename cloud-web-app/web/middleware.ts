import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveWorkbenchConvergenceRedirect } from '@/lib/routes/workbench-convergence';
import { getAdminLegacyRedirectTarget } from '@/lib/admin/admin-consolidation';
import { jwtVerify } from 'jose';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis/cloudflare';

function getJwtSecretBytes(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your-secret-key-change-in-production') {
    // Keep the same production posture as lib/auth-server.ts: no secret means misconfig.
    throw Object.assign(
      new Error('AUTH_NOT_CONFIGURED: set JWT_SECRET (do not use the default).'),
      { code: 'AUTH_NOT_CONFIGURED' }
    );
  }
  return new TextEncoder().encode(secret);
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

// Content Security Policy - Restrictive but allows necessary features
const getCSP = () => {
  const isDev = process.env.NODE_ENV !== 'production';

  // Base CSP directives
  const directives = [
    "default-src 'self'",
    // Scripts: self + inline for Next.js hydration + eval for dev hot reload
    `script-src 'self' ${isDev ? "'unsafe-eval'" : ""} 'unsafe-inline' https://cdn.jsdelivr.net`,
    // Styles: self + inline for styled-components/emotion + jsdelivr compatibility for legacy/vendor assets
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    // Fonts
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
    // Images: self + data URIs + blob for canvas + external
    "img-src 'self' data: blob: https:",
    // Connect: APIs, WebSocket, external services
    `connect-src 'self' ${isDev ? 'ws://localhost:* http://localhost:*' : ''} wss://*.aethel.dev https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.tavily.com https://api.serper.dev`,
    // Media
    "media-src 'self' blob:",
    // Workers for Monaco, Yjs, etc.
    "worker-src 'self' blob:",
    // Frame for embedded content (deny external)
    "frame-src 'self'",
    // Form actions
    "form-action 'self'",
    // Base URI
    "base-uri 'self'",
    // Block mixed content
    "block-all-mixed-content",
    // Upgrade insecure requests in production
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join('; ');
};

// Allowed origins for CORS
const ALLOWED_ORIGINS = new Set([
  // Production
  'https://aethel.dev',
  'https://www.aethel.dev',
  'https://app.aethel.dev',
  'https://ide.aethel.dev',
  // Development
  ...(process.env.NODE_ENV !== 'production' ? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
  ] : []),
]);

const LOCAL_DEV_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

function isAllowedRequestOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.has(origin) || (process.env.NODE_ENV !== 'production' && LOCAL_DEV_ORIGIN_PATTERN.test(origin));
}

function canUseLocalRateLimitFallback(req: NextRequest): boolean {
  return (
    LOCAL_DEV_ORIGIN_PATTERN.test(req.nextUrl.origin) ||
    process.env.AUTHENTICATED_UX_RATE_LIMIT_FALLBACK === '1' ||
    process.env.AETHEL_RATE_LIMIT_FALLBACK === 'local'
  );
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': getCSP(),
};

function withSecurityHeaders(res: NextResponse, req?: NextRequest, requestId?: string): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders)) {
    res.headers.set(key, value);
  }
  if (requestId) {
    res.headers.set('X-Request-Id', requestId);
  }

  // CORS: Only allow specific origins instead of wildcard
  if (req) {
    const origin = req.headers.get('origin');
    if (origin && isAllowedRequestOrigin(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    // For preflight requests
    if (req.method === 'OPTIONS') {
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.headers.set('Access-Control-Max-Age', '86400');
    }
  }

  return res;
}

// ============================================================================
// RATE LIMITING (Edge + production)
// - Upstash (Redis over HTTP) when configured
// - In production, missing backend => 503 for /api to avoid a false security signal.
// ============================================================================

type RateLimitName = 'api_general' | 'api_auth' | 'api_ai' | 'api_upload';

function getRateLimitName(pathname: string): RateLimitName {
  if (pathname.startsWith('/api/auth')) return 'api_auth';
  if (pathname.startsWith('/api/ai')) return 'api_ai';
  if (pathname.includes('/upload')) return 'api_upload';
  return 'api_general';
}

const upstashRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const upstashLimiters: Record<RateLimitName, Ratelimit> | null = upstashRedis
  ? {
      api_general: new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(100, '60 s'),
        prefix: 'aethel:rl:api_general',
      }),
      api_auth: new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(10, '60 s'),
        prefix: 'aethel:rl:api_auth',
      }),
      api_ai: new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(30, '60 s'),
        prefix: 'aethel:rl:api_ai',
      }),
      api_upload: new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(20, '60 s'),
        prefix: 'aethel:rl:api_upload',
      }),
    }
  : null;

// ============================================================================
// ADMIN ROUTES PROTECTION
// ============================================================================

const ADMIN_ROUTES = [
  '/admin',
  '/api/admin',
];

const PROTECTED_API_ROUTES = [
  '/api/projects',
  '/api/files',
  '/api/ai',
  '/api/billing',
  '/api/collaboration',
  '/api/backup',
  '/api/analytics',
  '/api/notifications',
  '/api/onboarding',
  '/api/quotas',
  '/api/experiments',
];

const PUBLIC_PATH_PREFIXES = [
  '/_next',
  '/static',
  '/icons',
  '/branding',
  '/screenshots',
  '/product-proof',
  '/login',
  '/register',
  '/pricing',
  '/docs',
  '/status',
  '/contact-sales',
  '/contact',
  '/customers',
  '/terms',
  '/privacy',
  '/trust',
  '/compliance',
  '/security',
  '/security-policy',
  '/reliability',
  '/roadmap',
  '/honest-status',
  '/help',
  '/download',
  '/marketplace',
  '/compare',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/api/auth',
  '/api/health',
  '/api/billing/webhook',
];

const PUBLIC_EXACT_PATHS = new Set([
  '/',
  '/manifest.webmanifest',
  '/sw.js',
  '/api/analytics/batch',
  '/api/billing/readiness',
  '/favicon.ico',
  '/favicon.png',
  '/robots.txt',
  '/sitemap.xml',
  '/offline',
]);

const PUBLIC_ROUTE_REDIRECTS: Record<string, string> = {
  '/contact': '/help',
  '/customers': '/trust',
  '/roadmap': '/docs/changelog',
  '/security-acknowledgments': '/security-policy',
  '/health': '/status',
};

const STUDIO_LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  '/studio/scene': '/studio/level?tool=scene',
  '/studio/material': '/studio/level?tool=material',
  '/studio/terrain': '/studio/level?tool=terrain',
  '/studio/landscape': '/studio/level?tool=landscape',
  '/studio/foliage': '/studio/level?tool=foliage',
  '/studio/water': '/studio/level?tool=water',
  '/studio/rig': '/studio/animation?tool=rig',
  '/studio/facial': '/studio/animation?tool=facial',
  '/studio/hair': '/studio/animation?tool=hair',
  '/studio/cloth': '/studio/animation?tool=cloth',
  '/studio/fluid': '/studio/vfx?tool=fluid',
  '/studio/sprite': '/studio/vfx?tool=sprite',
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  const convergence = resolveWorkbenchConvergenceRedirect(pathname);
  if (convergence && req.method === 'GET') {
    const url = req.nextUrl.clone();
    const internal = new URL(convergence.target, req.nextUrl.origin);
    url.pathname = internal.pathname;
    url.search = internal.search;
    return withSecurityHeaders(NextResponse.redirect(url), req, requestId);
  }

  const publicRedirectTarget = PUBLIC_ROUTE_REDIRECTS[pathname];
  if (publicRedirectTarget && req.method === 'GET') {
    const url = req.nextUrl.clone();
    const target = new URL(publicRedirectTarget, req.nextUrl.origin);
    url.pathname = target.pathname;
    url.search = target.search;
    return withSecurityHeaders(NextResponse.redirect(url, 308), req, requestId);
  }

  const isApi = pathname.startsWith('/api');
  const enforceDevRateLimit = process.env.AETHEL_ENFORCE_DEV_RATE_LIMIT === 'true';
  const shouldApplyRateLimit = process.env.NODE_ENV === 'production' || enforceDevRateLimit;

  // Cookie-first for pages; bearer-first for APIs.
  const cookieToken = req.cookies.get('token')?.value;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const token = isApi ? (bearerToken || cookieToken) : (cookieToken || bearerToken);

  // Get client IP for rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
             req.headers.get('x-real-ip') ||
             'anonymous';

  // 1) Rate limiting (API only)
  if (shouldApplyRateLimit && isApi && !pathname.startsWith('/api/billing/webhook') && !pathname.startsWith('/api/health')) {
    if (!upstashLimiters) {
      if (process.env.NODE_ENV === 'production') {
        return withSecurityHeaders(
          NextResponse.json(
            { error: 'RATE_LIMIT_NOT_CONFIGURED', message: 'Configure UPSTASH_REDIS_REST_URL/TOKEN.' },
            { status: 503 }
          ),
          req,
          requestId
        );
      }
    } else {
      const limitName = getRateLimitName(pathname);
      let result: Awaited<ReturnType<Ratelimit['limit']>>;
      try {
        result = await upstashLimiters[limitName].limit(ip);
      } catch {
        if (canUseLocalRateLimitFallback(req)) {
          result = {
            success: true,
            limit: 0,
            remaining: 0,
            reset: Date.now(),
            pending: Promise.resolve(),
          };
        } else {
          return withSecurityHeaders(
            NextResponse.json(
              {
                error: 'RATE_LIMIT_BACKEND_UNAVAILABLE',
                message: 'Rate limit backend is unavailable.',
              },
              { status: 503 }
            ),
            req,
            requestId
          );
        }
      }
      if (!result.success) {
        return withSecurityHeaders(
          NextResponse.json(
            {
              error: 'RATE_LIMITED',
              message: 'Too Many Requests',
              retryAfterSeconds: Math.max(1, Math.floor((result.reset - Date.now()) / 1000)),
              resetAt: new Date(result.reset).toISOString(),
              limitType: limitName,
            },
            {
              status: 429,
              headers: {
                'Retry-After': String(Math.max(1, Math.floor((result.reset - Date.now()) / 1000))),
                'X-RateLimit-Remaining': String(result.remaining),
                'X-RateLimit-Reset': String(result.reset),
                'X-RateLimit-Type': limitName,
              },
            }
          ),
          req,
          requestId
        );
      }
    }
  }

  // 2) Public paths (marketing, trust, docs, auth, assets, and public runtime).
  const isPublicPath =
    PUBLIC_EXACT_PATHS.has(pathname) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublicPath) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-request-id', requestId);
    return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), req, requestId);
  }

  // 3) Basic CSRF protection for cookie-based API sessions.
  if (isApi && req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    const origin = req.headers.get('origin');
    const expected = req.nextUrl.origin;
    // Bearer-token requests have much lower CSRF risk than cookie-only sessions.
    const usingCookieOnly = !!cookieToken && !bearerToken;
    const trustedAppOrigin = origin === expected || (origin ? isAllowedRequestOrigin(origin) : false);
    if (usingCookieOnly && origin && !trustedAppOrigin) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: 'CSRF_BLOCKED', message: 'Invalid origin.' },
          { status: 403 }
        ),
        req,
        requestId
      );
    }
  }

  // 4. Protected Paths (Admin, Dashboard, Billing)
  if (!token) {
    // Redirect to login if trying to access protected pages
    if (!pathname.startsWith('/api')) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return withSecurityHeaders(NextResponse.redirect(url), req, requestId);
    }
    // Return 401 for API calls
    return withSecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), req, requestId);
  }

  try {
    // Verify token
    const { payload } = await jwtVerify(token, getJwtSecretBytes());

    // Admin Check - verifica role no token
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      const userRole = payload.role as string | undefined;
      const adminRoles = new Set(['owner', 'super_admin', 'admin', 'moderator', 'support']);
      if (!userRole || !adminRoles.has(userRole)) {
        if (!pathname.startsWith('/api')) {
          const url = req.nextUrl.clone();
          url.pathname = '/dashboard';
          return withSecurityHeaders(NextResponse.redirect(url), req, requestId);
        }
        return withSecurityHeaders(NextResponse.json({ error: 'Admin access required' }, { status: 403 }), req, requestId);
      }

      if (!pathname.startsWith('/api') && req.method === 'GET') {
        const adminLegacyTarget = getAdminLegacyRedirectTarget(pathname);
        if (adminLegacyTarget) {
          const url = req.nextUrl.clone();
          const target = new URL(adminLegacyTarget, req.nextUrl.origin);
          url.pathname = target.pathname;
          url.search = target.search;
          return withSecurityHeaders(NextResponse.redirect(url, 308), req, requestId);
        }
      }
    }

    if (!pathname.startsWith('/api') && req.method === 'GET') {
      const studioLegacyTarget = STUDIO_LEGACY_ROUTE_REDIRECTS[pathname];
      if (studioLegacyTarget) {
        const url = req.nextUrl.clone();
        const target = new URL(studioLegacyTarget, req.nextUrl.origin);
        url.pathname = target.pathname;
        url.search = target.search;
        return withSecurityHeaders(NextResponse.redirect(url, 308), req, requestId);
      }
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-request-id', requestId);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    withSecurityHeaders(response, req, requestId);

    // Add user context headers for API handlers.
    if (pathname.startsWith('/api')) {
      response.headers.set('X-User-Id', payload.userId as string || '');
      response.headers.set('X-User-Role', (payload.role as string) || 'user');
    }

    return response;
  } catch (error) {
    if ((error as any)?.code === 'AUTH_NOT_CONFIGURED') {
      return withSecurityHeaders(
        NextResponse.json(
          { error: 'AUTH_NOT_CONFIGURED', message: (error as Error).message },
          { status: 503 }
        ),
        req,
        requestId
      );
    }
    // Invalid token
    if (!pathname.startsWith('/api')) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return withSecurityHeaders(NextResponse.redirect(url), req, requestId);
    }
    return withSecurityHeaders(NextResponse.json({ error: 'Invalid Token' }, { status: 401 }), req, requestId);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
