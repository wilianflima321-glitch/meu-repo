'use client'

import * as Sentry from '@sentry/browser'
import { createComponentLogger } from '@/lib/observability/logger'

const logger = createComponentLogger('sentry-browser')

const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
const ENVIRONMENT = process.env.NODE_ENV || 'development'
const RELEASE =
  process.env.NEXT_PUBLIC_APP_VERSION ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  'dev'

let initialized = false

export function initBrowserSentry(): void {
  if (initialized || !SENTRY_DSN || typeof window === 'undefined') {
    if (!SENTRY_DSN) {
      logger.warn('[Sentry] Browser DSN not configured, skipping client bootstrap')
    }
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `aethel-engine@${RELEASE}`,
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.Authorization
        delete event.request.headers.Cookie
      }

      return event
    },
  })

  initialized = true
  logger.info(`[Sentry] Browser bootstrap initialized for ${ENVIRONMENT}`)
}

export function captureBrowserException(
  error: Error | unknown,
  tags?: Record<string, string>,
): string {
  return Sentry.captureException(error, {
    tags,
  })
}
