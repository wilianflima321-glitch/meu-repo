'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { analytics, type EventAction, type EventCategory } from '@/lib/analytics'

type RouteSurface =
  | 'web-entry'
  | 'pricing'
  | 'auth'
  | 'studio-home'
  | 'workbench'
  | 'billing'
  | 'marketplace'
  | 'docs'
  | 'contact-sales'
  | 'product-surface'

const TRACKABLE_SELECTOR = '[data-analytics-action][data-analytics-category]'

function getRouteSurface(pathname: string): RouteSurface {
  if (pathname === '/') return 'web-entry'
  if (pathname.startsWith('/pricing')) return 'pricing'
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) return 'auth'
  if (pathname.startsWith('/dashboard')) return 'studio-home'
  if (pathname.startsWith('/ide')) return 'workbench'
  if (pathname.startsWith('/billing')) return 'billing'
  if (pathname.startsWith('/marketplace')) return 'marketplace'
  if (pathname.startsWith('/docs')) return 'docs'
  if (pathname.startsWith('/contact-sales') || pathname.startsWith('/contact')) return 'contact-sales'
  return 'product-surface'
}

function getQueryContext() {
  if (typeof window === 'undefined') {
    return { source: null, missionPresent: false, plan: null }
  }

  const params = new URLSearchParams(window.location.search)
  return {
    source: params.get('source'),
    missionPresent: Boolean(params.get('mission')),
    plan: params.get('plan'),
  }
}

function findTrackableElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLElement>(TRACKABLE_SELECTOR)
}

export default function ProductTelemetry() {
  const pathname = usePathname() || '/'
  const previousPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_PRODUCT_TELEMETRY === 'false') return
    if (previousPathRef.current === pathname) return

    previousPathRef.current = pathname
    const surface = getRouteSurface(pathname)
    const query = getQueryContext()

    analytics?.track('performance', 'page_load', {
      label: surface,
      metadata: {
        path: pathname,
        source: query.source,
        missionPresent: query.missionPresent,
        plan: query.plan,
      },
    })

    if (surface === 'pricing') {
      analytics?.track('billing', 'pricing_view', {
        label: 'pricing_page',
        metadata: query,
      })
    }

    if (surface === 'studio-home') {
      analytics?.track('project', query.missionPresent ? 'onboarding_start' : 'project_open', {
        label: 'studio_home_entry',
        metadata: query,
      })
    }

    if (surface === 'workbench') {
      analytics?.track('engine', 'editor_open', {
        label: 'workbench_entry',
        metadata: query,
      })
    }
  }, [pathname])

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_PRODUCT_TELEMETRY === 'false') return

    const handleClick = (event: MouseEvent) => {
      const element = findTrackableElement(event.target)
      if (!element) return

      const category = element.dataset.analyticsCategory as EventCategory | undefined
      const action = element.dataset.analyticsAction as EventAction | undefined
      if (!category || !action) return

      analytics?.track(category, action, {
        label: element.dataset.analyticsLabel,
        projectId: element.dataset.analyticsProjectId,
        metadata: {
          path: pathname,
          href: element instanceof HTMLAnchorElement ? element.href : element.dataset.analyticsHref,
          source: element.dataset.analyticsSource,
          surface: getRouteSurface(pathname),
        },
      })
    }

    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [pathname])

  return null
}
