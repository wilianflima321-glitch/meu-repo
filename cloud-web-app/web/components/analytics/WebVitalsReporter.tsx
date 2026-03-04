'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { analytics } from '@/lib/analytics'

type SupportedMetric = 'FCP' | 'LCP' | 'CLS' | 'TTI'

function safeTrackMetric(metric: SupportedMetric, value: number, route: string) {
  if (!Number.isFinite(value)) return
  analytics?.trackPerformance?.(metric, value, metric === 'CLS' ? 'count' : 'ms', { route })
  analytics?.track?.('performance', 'render_time', {
    label: metric,
    value: Math.round(value),
    metadata: {
      metric,
      route,
      rawValue: value,
    },
  })
}

export default function WebVitalsReporter() {
  const pathname = usePathname()
  const tracked = useRef<Set<string>>(new Set())
  const lcpValue = useRef<number | null>(null)
  const clsValue = useRef(0)

  useEffect(() => {
    const route = pathname || 'unknown'
    const key = (metric: SupportedMetric) => `${route}:${metric}`

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav && !tracked.current.has(key('TTI'))) {
      safeTrackMetric('TTI', nav.domInteractive, route)
      tracked.current.add(key('TTI'))
    }

    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint')
    if (fcp && !tracked.current.has(key('FCP'))) {
      safeTrackMetric('FCP', fcp.startTime, route)
      tracked.current.add(key('FCP'))
    }

    const lcpObserver =
      typeof PerformanceObserver !== 'undefined'
        ? new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const last = entries[entries.length - 1]
            if (last) lcpValue.current = last.startTime
          })
        : null

    const clsObserver =
      typeof PerformanceObserver !== 'undefined'
        ? new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
              if (!entry.hadRecentInput && typeof entry.value === 'number') {
                clsValue.current += entry.value
              }
            }
          })
        : null

    try {
      lcpObserver?.observe({ type: 'largest-contentful-paint', buffered: true })
      clsObserver?.observe({ type: 'layout-shift', buffered: true })
    } catch {
      // Ignore unsupported observer types.
    }

    const flushFinalMetrics = () => {
      if (document.visibilityState !== 'hidden') return
      if (lcpValue.current !== null && !tracked.current.has(key('LCP'))) {
        safeTrackMetric('LCP', lcpValue.current, route)
        tracked.current.add(key('LCP'))
      }
      if (!tracked.current.has(key('CLS'))) {
        safeTrackMetric('CLS', clsValue.current, route)
        tracked.current.add(key('CLS'))
      }
    }

    document.addEventListener('visibilitychange', flushFinalMetrics)

    analytics?.track?.('performance', 'page_load', {
      label: route,
      metadata: {
        route,
      },
    })

    return () => {
      document.removeEventListener('visibilitychange', flushFinalMetrics)
      lcpObserver?.disconnect()
      clsObserver?.disconnect()
    }
  }, [pathname])

  return null
}
