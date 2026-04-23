'use client'

import { useEffect } from 'react'
import { createComponentLogger } from '@/lib/observability/logger'

const logger = createComponentLogger('telemetry-bootstrap')

export default function TelemetryBootstrap() {
  useEffect(() => {
    let cancelled = false

    import('@/lib/sentry-browser')
      .then(({ initBrowserSentry }) => {
        if (!cancelled) {
          initBrowserSentry()
        }
      })
      .catch((error) => {
        logger.warn('[TelemetryBootstrap] Failed to initialize Sentry lazily', { error })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
