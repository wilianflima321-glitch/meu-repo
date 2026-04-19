'use client'

import { useEffect } from 'react'
import { initSentry } from '@/lib/sentry'

export default function TelemetryBootstrap() {
  useEffect(() => {
    initSentry()
  }, [])

  return null
}
