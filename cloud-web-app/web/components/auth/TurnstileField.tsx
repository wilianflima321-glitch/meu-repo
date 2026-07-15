'use client'

import { useEffect, useRef, useState } from 'react'

type TurnstileFieldProps = {
  action: 'login' | 'register'
  onTokenChange: (token: string | null) => void
}

type TurnstileRenderOptions = {
  sitekey: string
  action: string
  theme?: 'light' | 'dark' | 'auto'
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
    __aethelTurnstileLoader?: Promise<void>
  }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function getTurnstileSiteKey() {
  return (
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY ||
    ''
  )
}

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve()
  }

  if (window.__aethelTurnstileLoader) {
    return window.__aethelTurnstileLoader
  }

  window.__aethelTurnstileLoader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed to load')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = TURNSTILE_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Turnstile script failed to load')), { once: true })
    document.head.appendChild(script)
  })

  return window.__aethelTurnstileLoader
}

export function isTurnstileClientConfigured() {
  return Boolean(getTurnstileSiteKey())
}

export default function TurnstileField({ action, onTokenChange }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const siteKey = getTurnstileSiteKey()

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      onTokenChange(null)
      return
    }

    let cancelled = false
    setStatus('loading')

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'dark',
          callback: (token) => {
            setStatus('ready')
            onTokenChange(token)
          },
          'expired-callback': () => {
            setStatus('idle')
            onTokenChange(null)
          },
          'error-callback': () => {
            setStatus('error')
            onTokenChange(null)
          },
        })
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
          onTokenChange(null)
        }
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
      widgetIdRef.current = null
    }
  }, [action, onTokenChange, siteKey])

  if (!siteKey) {
    return null
  }

  return (
    <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/45 p-3">
      <div ref={containerRef} className="min-h-[65px]" aria-label="Human verification" />
      <p className="mt-2 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
        {status === 'error'
          ? 'Human verification could not load. Refresh the page or try another sign-in method.'
          : 'Protected by Cloudflare Turnstile so authentication stays usable without noisy captchas.'}
      </p>
    </div>
  )
}
