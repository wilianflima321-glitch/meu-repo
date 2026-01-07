/**
 * Sentry Error Tracking - Configuração Completa
 * 
 * Integração profissional com:
 * - Error tracking automático
 * - Performance monitoring
 * - Session replay
 * - User feedback
 * - Release tracking
 */

import * as Sentry from '@sentry/nextjs';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.NEXT_PUBLIC_APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || 'dev';

export const sentryConfig: Sentry.BrowserOptions = {
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  release: `aethel-engine@${RELEASE}`,
  
  // Performance Monitoring
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  
  // Error filtering
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'http://tt.teletrader.com',
    'jigsaw is not defined',
    'ComboSearchWidget',
    'http://tb.teletrader.com/',
    'atomicFindClose',
    // Facebook
    'fb_xd_fragment',
    // ISP junk
    'bmi_teletext_content_main',
    // Random plugins/extensions
    'conduitPage',
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    // Network errors
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // AbortController
    'AbortError',
    // ResizeObserver
    'ResizeObserver loop',
    // Monaco editor noise
    'Cannot read properties of null (reading \'getModel\')',
  ],
  
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    // Firefox extensions
    /^moz-extension:\/\//i,
    // Safari extensions
    /^safari-web-extension:\/\//i,
    // Analytics
    /google-analytics\.com/i,
    /googletagmanager\.com/i,
    /hotjar\.com/i,
    // Ad networks
    /doubleclick\.net/i,
    /googlesyndication\.com/i,
  ],
  
  // Before send hook
  beforeSend(event, hint) {
    // Filter out specific errors
    const error = hint.originalException as Error;
    
    if (error?.message) {
      // Ignore hydration errors in dev
      if (ENVIRONMENT === 'development' && error.message.includes('Hydration')) {
        return null;
      }
      
      // Ignore cancelled requests
      if (error.message.includes('cancelled') || error.message.includes('aborted')) {
        return null;
      }
    }
    
    // Sanitize sensitive data
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['Cookie'];
    }
    
    // Add user context if available
    if (typeof window !== 'undefined') {
      const userId = (window as any).__AETHEL_USER_ID__;
      const userEmail = (window as any).__AETHEL_USER_EMAIL__;
      
      if (userId) {
        event.user = {
          ...event.user,
          id: userId,
          email: userEmail,
        };
      }
    }
    
    return event;
  },
  
  // Integrations
  integrations: [
    Sentry.browserTracingIntegration({
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/.*\.aethel\.dev/,
        /^https:\/\/aethel\.dev/,
      ],
    }),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
      maskAllInputs: true,
    }),
  ],
};

// ============================================================================
// SERVER CONFIG
// ============================================================================

export const sentryServerConfig: Sentry.NodeOptions = {
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  release: `aethel-engine@${RELEASE}`,
  
  // Performance
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  
  // Profiling
  profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  
  // Before send hook
  beforeSend(event, hint) {
    const error = hint.originalException as Error;
    
    // Sanitize database errors
    if (error?.message?.includes('prisma')) {
      event.fingerprint = ['prisma-error', error.message.split('\n')[0]];
    }
    
    // Group AI API errors
    if (error?.message?.includes('OpenAI') || error?.message?.includes('Anthropic')) {
      event.fingerprint = ['ai-api-error', error.message.split(':')[0]];
    }
    
    return event;
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Capture exception com contexto adicional
 */
export function captureException(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: { id: string; email?: string };
    level?: Sentry.SeverityLevel;
  }
): string {
  return Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
    level: context?.level,
  });
}

/**
 * Capture message com contexto
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): string {
  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string; plan?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
  
  if (user.plan) {
    Sentry.setTag('user.plan', user.plan);
  }
}

/**
 * Clear user context (logout)
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Start transaction para performance monitoring
 */
export function startTransaction(
  name: string,
  op: string,
  data?: Record<string, unknown>
): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({
    name,
    op,
    attributes: data as Record<string, string | number | boolean>,
  });
}

/**
 * Wrapper para capturar erros em funções async
 */
export async function withSentry<T>(
  fn: () => Promise<T>,
  context?: {
    name: string;
    op?: string;
    tags?: Record<string, string>;
  }
): Promise<T> {
  const span = context ? startTransaction(context.name, context.op || 'function') : undefined;
  
  try {
    const result = await fn();
    span?.setStatus({ code: 1 }); // OK
    return result;
  } catch (error) {
    span?.setStatus({ code: 2, message: String(error) }); // ERROR
    
    captureException(error, {
      tags: context?.tags,
      extra: { transactionName: context?.name },
    });
    
    throw error;
  } finally {
    span?.end();
  }
}

/**
 * Create child span
 */
export function createSpan(name: string, op: string): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({ name, op });
}

// ============================================================================
// AI-SPECIFIC TRACKING
// ============================================================================

/**
 * Track AI API call
 */
export function trackAICall(params: {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  tokens?: number;
  latency?: number;
  success: boolean;
  error?: string;
}): void {
  addBreadcrumb({
    category: 'ai',
    message: `${params.provider} ${params.model}`,
    level: params.success ? 'info' : 'error',
    data: {
      provider: params.provider,
      model: params.model,
      tokens: params.tokens,
      latency: params.latency,
      success: params.success,
      error: params.error,
    },
  });
  
  if (!params.success && params.error) {
    captureMessage(`AI API Error: ${params.provider}`, 'warning', {
      provider: params.provider,
      model: params.model,
      error: params.error,
    });
  }
}

/**
 * Track asset generation
 */
export function trackAssetGeneration(params: {
  type: 'image' | 'voice' | '3d' | 'music';
  provider: string;
  success: boolean;
  duration?: number;
  error?: string;
}): void {
  addBreadcrumb({
    category: 'asset-generation',
    message: `${params.type} via ${params.provider}`,
    level: params.success ? 'info' : 'error',
    data: params,
  });
}

// ============================================================================
// BILLING TRACKING
// ============================================================================

/**
 * Track billing event
 */
export function trackBillingEvent(params: {
  event: 'checkout_started' | 'checkout_completed' | 'subscription_created' | 'subscription_cancelled' | 'payment_failed';
  plan?: string;
  amount?: number;
  currency?: string;
  userId?: string;
}): void {
  addBreadcrumb({
    category: 'billing',
    message: params.event,
    level: params.event === 'payment_failed' ? 'error' : 'info',
    data: params,
  });
  
  if (params.event === 'payment_failed') {
    captureMessage('Payment failed', 'warning', params);
  }
}

// ============================================================================
// INIT
// ============================================================================

let initialized = false;

export function initSentry(): void {
  if (initialized || !SENTRY_DSN) {
    if (!SENTRY_DSN) {
      console.warn('[Sentry] DSN not configured, error tracking disabled');
    }
    return;
  }
  
  if (typeof window !== 'undefined') {
    // Browser
    Sentry.init(sentryConfig);
  } else {
    // Server
    Sentry.init(sentryServerConfig);
  }
  
  initialized = true;
  console.log(`[Sentry] Initialized for ${ENVIRONMENT}`);
}

// Auto-init if DSN is available
if (SENTRY_DSN) {
  initSentry();
}

export default Sentry;
