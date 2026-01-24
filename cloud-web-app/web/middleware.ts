import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis/cloudflare';

function getJwtSecretBytes(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your-secret-key-change-in-production') {
    // Return null para rotas públicas (development)
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }
    // Mantém a mesma filosofia de lib/auth-server.ts: sem segredo => misconfig.
    throw Object.assign(
      new Error('AUTH_NOT_CONFIGURED: defina JWT_SECRET (não use default).'),
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
    // Styles: self + inline for styled-components/emotion
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Fonts
    "font-src 'self' https://fonts.gstatic.com data:",
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

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': getCSP(),
};

function withSecurityHeaders(res: NextResponse, req?: NextRequest): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders)) {
    res.headers.set(key, value);
  }
  
  // CORS: Only allow specific origins instead of wildcard
  if (req) {
    const origin = req.headers.get('origin');
    if (origin && ALLOWED_ORIGINS.has(origin)) {
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
// RATE LIMITING (Edge + produção)
// - Upstash (Redis over HTTP) quando configurado
// - Em produção, sem backend => 503 para /api (evita falsa sensação de segurança)
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

// ============================================================================
// MIDDLEWARE
// ============================================================================

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api');

  // Cookie-first para páginas; Bearer-first para APIs.
  const cookieToken = req.cookies.get('token')?.value;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const token = isApi ? (bearerToken || cookieToken) : (cookieToken || bearerToken);
  
  // Get client IP for rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'anonymous';

  // 1) Rate limiting (somente API)
  if (isApi && !pathname.startsWith('/api/billing/webhook')) {
    if (!upstashLimiters) {
      if (process.env.NODE_ENV === 'production') {
        return withSecurityHeaders(
          NextResponse.json(
            { error: 'RATE_LIMIT_NOT_CONFIGURED', message: 'Configure UPSTASH_REDIS_REST_URL/TOKEN.' },
            { status: 503 }
          ),
          req
        );
      }
    } else {
      const limitName = getRateLimitName(pathname);
      const result = await upstashLimiters[limitName].limit(ip);
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
          req
        );
      }
    }
  }

  // 2) Public Paths (Login, Register, Public Assets)
  // Also allow dev mode bypass in development - more permissive for testing
  const isDevBypass = process.env.NODE_ENV !== 'production' && (
    req.nextUrl.searchParams.get('devMode') === 'true' ||
    req.cookies.get('dev_bypass')?.value === 'true' ||
    req.cookies.get('aethel_dev_mode')?.value === 'enabled' ||
    req.headers.get('x-dev-mode') === 'true'
  );
  
  // In development, allow access to all non-API routes for easier testing
  const isDevEnvironment = process.env.NODE_ENV !== 'production';
  const isPageRoute = !pathname.startsWith('/api');
  
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') || // Health checks públicos
    pathname.startsWith('/api/billing/webhook') || // Webhooks must be public
    pathname === '/' ||
    isDevBypass || // Allow dev mode bypass
    (isDevEnvironment && isPageRoute) // In dev, allow all page routes without auth
  ) {
    // Set dev bypass cookie for subsequent requests
    const response = withSecurityHeaders(NextResponse.next(), req);
    if (isDevBypass && !req.cookies.get('aethel_dev_mode')?.value) {
      response.cookies.set('aethel_dev_mode', 'enabled', {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: false,
      });
    }
    return response;
  }

  // 3) CSRF proteção simples para cookie-based sessions em APIs
  if (isApi && req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    const origin = req.headers.get('origin');
    const expected = req.nextUrl.origin;
    // Se o cliente usa Bearer token, o risco de CSRF é bem menor.
    const usingCookieOnly = !!cookieToken && !bearerToken;
    if (usingCookieOnly && origin && origin !== expected) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: 'CSRF_BLOCKED', message: 'Origem inválida.' },
          { status: 403 }
        ),
        req
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
      return withSecurityHeaders(NextResponse.redirect(url), req);
    }
    // Return 401 for API calls
    return withSecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), req);
  }

  try {
    // Verify token - check if JWT secret is configured
    const jwtSecret = getJwtSecretBytes();
    if (!jwtSecret) {
      // In development without JWT_SECRET, allow access but log warning
      console.warn('[Middleware] JWT_SECRET not configured - skipping token verification in development');
      return withSecurityHeaders(NextResponse.next(), req);
    }
    
    const { payload } = await jwtVerify(token, jwtSecret);
    
    // Admin Check - verifica role no token
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      const userRole = payload.role as string | undefined;
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        if (!pathname.startsWith('/api')) {
          const url = req.nextUrl.clone();
          url.pathname = '/dashboard';
          return withSecurityHeaders(NextResponse.redirect(url), req);
        }
        return withSecurityHeaders(NextResponse.json({ error: 'Admin access required' }, { status: 403 }), req);
      }
    }

    const response = NextResponse.next();
    withSecurityHeaders(response, req);
    
    // Adiciona informações do usuário nos headers para APIs
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
        req
      );
    }
    // Invalid token
    if (!pathname.startsWith('/api')) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return withSecurityHeaders(NextResponse.redirect(url), req);
    }
    return withSecurityHeaders(NextResponse.json({ error: 'Invalid Token' }, { status: 401 }), req);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
