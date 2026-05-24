'use client';

/**
 * CookieConsent - GDPR-compliant cookie consent banner
 * Appears on first visit, remembers preference in localStorage.
 */
import { useState, useEffect } from 'react'
import { X, Cookie, Shield } from 'lucide-react'

const CONSENT_KEY = 'aethel_cookie_consent'
type ConsentLevel = 'all' | 'essential' | null

const AUTHENTICATED_WORKSPACE_PATHS = [
  '/admin',
  '/billing',
  '/dashboard',
  '/evidence',
  '/ide',
  '/marketplace',
  '/nexus',
  '/profile',
  '/project-settings',
  '/settings',
  '/studio',
]

function shouldSuppressForAuthenticatedWorkspace() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  const isWorkspacePath = AUTHENTICATED_WORKSPACE_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  if (!isWorkspacePath) return false

  const hasTokenCookie = document.cookie.split(';').some((cookie) => cookie.trim().startsWith('token='))
  const hasLocalToken = Boolean(localStorage.getItem('aethel-token') || localStorage.getItem('token'))
  return hasTokenCookie || hasLocalToken
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (shouldSuppressForAuthenticatedWorkspace()) return
    const stored = localStorage.getItem(CONSENT_KEY)
    if (!stored) {
      // Delay slightly to avoid CLS
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = (level: ConsentLevel) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ level, timestamp: Date.now() }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[1080] border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent)] backdrop-blur-xl shadow-2xl shadow-black/40"
      role="dialog"
      aria-label="Cookie consent"
      style={{ animation: 'slideUp 300ms ease-out' }}
    >
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-[var(--aethel-warning)]" />
            <div>
              <p className="text-sm text-[var(--aethel-text-secondary)]">
                We use cookies to improve the experience, protect the session, and understand product usage.{' '}
                <button type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-[var(--aethel-primary-light)] hover:text-[var(--aethel-primary)] underline underline-offset-2 transition-colors"
                >
                  {showDetails ? 'Hide details' : 'Learn more'}
                </button>
              </p>
              {showDetails && (
                <div className="mt-3 space-y-2 text-xs text-[var(--aethel-text-tertiary)]">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-[var(--aethel-success)]" />
                    <span><strong className="text-[var(--aethel-text-secondary)]">Essentials:</strong> authentication, security, and basic studio preferences (always active)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-[var(--aethel-info)]" />
                    <span><strong className="text-[var(--aethel-text-secondary)]">Analytics:</strong> usage patterns, performance, and onboarding steps</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button"
              onClick={() => accept('essential')}
              className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] transition-colors"
            >
              Essentials only
            </button>
            <button type="button"
              onClick={() => accept('all')}
              className="rounded-lg bg-[var(--aethel-primary)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:brightness-110 transition-colors"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
