/**
 * CSRF Protection Middleware
 * 
 * Implementação de proteção CSRF usando Double Submit Cookie pattern.
 * Compatível com Next.js 14+ App Router.
 * 
 * @security Proteção contra Cross-Site Request Forgery
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes, createHmac } from 'crypto';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = '__Host-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-me';

// Rotas que requerem proteção CSRF
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Rotas isentas de CSRF (webhooks, APIs públicas)
const EXEMPT_ROUTES = [
  '/api/webhooks/',
  '/api/stripe/webhook',
  '/api/health',
  '/api/auth/oauth/',
];

// ============================================================================
// TIPOS
// ============================================================================

export interface CSRFToken {
  token: string;
  signature: string;
  expiresAt: number;
}

export interface CSRFValidationResult {
  valid: boolean;
  reason?: string;
}

// ============================================================================
// FUNÇÕES CORE
// ============================================================================

/**
 * Gera um token CSRF seguro
 */
export function generateCSRFToken(): CSRFToken {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 horas
  const signature = signToken(token, expiresAt);

  return { token, signature, expiresAt };
}

/**
 * Assina o token com HMAC
 */
function signToken(token: string, expiresAt: number): string {
  const payload = `${token}:${expiresAt}`;
  return createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
}

/**
 * Valida o token CSRF
 */
export function validateCSRFToken(
  cookieToken: string | undefined,
  headerToken: string | undefined
): CSRFValidationResult {
  // Verifica se ambos tokens existem
  if (!cookieToken || !headerToken) {
    return { 
      valid: false, 
      reason: 'Missing CSRF token' 
    };
  }

  // Parse do cookie token
  let parsedCookie: CSRFToken;
  try {
    parsedCookie = JSON.parse(cookieToken);
  } catch {
    return { 
      valid: false, 
      reason: 'Invalid cookie token format' 
    };
  }

  // Verifica expiração
  if (Date.now() > parsedCookie.expiresAt) {
    return { 
      valid: false, 
      reason: 'Token expired' 
    };
  }

  // Verifica assinatura
  const expectedSignature = signToken(parsedCookie.token, parsedCookie.expiresAt);
  if (parsedCookie.signature !== expectedSignature) {
    return { 
      valid: false, 
      reason: 'Invalid token signature' 
    };
  }

  // Compara tokens (timing-safe comparison)
  if (!timingSafeEqual(parsedCookie.token, headerToken)) {
    return { 
      valid: false, 
      reason: 'Token mismatch' 
    };
  }

  return { valid: true };
}

/**
 * Comparação timing-safe para prevenir timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifica se a rota está isenta de CSRF
 */
function isExemptRoute(pathname: string): boolean {
  return EXEMPT_ROUTES.some(route => pathname.startsWith(route));
}

// ============================================================================
// MIDDLEWARE PRINCIPAL
// ============================================================================

/**
 * Middleware CSRF para Next.js
 */
export async function csrfMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const { method, nextUrl: { pathname } } = request;

  // Ignora métodos seguros (GET, HEAD, OPTIONS)
  if (!PROTECTED_METHODS.includes(method)) {
    return null;
  }

  // Ignora rotas isentas
  if (isExemptRoute(pathname)) {
    return null;
  }

  // Obtém tokens
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // Valida
  const validation = validateCSRFToken(cookieToken ?? undefined, headerToken ?? undefined);

  if (!validation.valid) {
    return NextResponse.json(
      { 
        error: 'CSRF validation failed',
        reason: validation.reason,
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Handler para obter/renovar token CSRF
 */
export async function handleCSRFTokenRequest(
  request: NextRequest
): Promise<NextResponse> {
  const csrf = generateCSRFToken();

  const response = NextResponse.json({ 
    token: csrf.token,
    expiresAt: csrf.expiresAt,
  });

  // Set cookie com configurações seguras
  response.cookies.set(CSRF_COOKIE_NAME, JSON.stringify(csrf), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 horas
  });

  return response;
}

// ============================================================================
// HOOK PARA CLIENTE
// ============================================================================

/**
 * Código para uso no cliente (exportar separadamente)
 */
export const clientCSRFCode = `
// Hook para gerenciar CSRF token no cliente
import { useEffect, useState, useCallback } from 'react';

export function useCSRF() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/csrf', { method: 'GET' });
      const data = await response.json();
      setToken(data.token);
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Wrapper para fetch com CSRF token
  const secureFetch = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    if (!token) {
      await refresh();
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'x-csrf-token': token || '',
      },
    });
  }, [token, refresh]);

  return { token, loading, refresh, secureFetch };
}
`;

// ============================================================================
// INTEGRAÇÃO COM MIDDLEWARE.TS
// ============================================================================

/**
 * Exporta configuração para integrar com middleware.ts principal
 */
export const csrfConfig = {
  cookieName: CSRF_COOKIE_NAME,
  headerName: CSRF_HEADER_NAME,
  protectedMethods: PROTECTED_METHODS,
  exemptRoutes: EXEMPT_ROUTES,
};
