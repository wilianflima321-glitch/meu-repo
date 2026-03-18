/**
 * CookieConsent - GDPR-compliant cookie consent banner
 * Appears on first visit, remembers preference in localStorage.
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Cookie, Shield } from 'lucide-react'

const CONSENT_KEY = 'aethel_cookie_consent'
type ConsentLevel = 'all' | 'essential' | null

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
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
      className="fixed bottom-0 left-0 right-0 z-[1080] border-t border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/40"
      role="dialog"
      aria-label="Cookie consent"
      style={{ animation: 'slideUp 300ms ease-out' }}
    >
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-[var(--aethel-warning)]" />
            <div>
              <p className="text-sm text-zinc-200">
                We use cookies to improve your experience and analyze site usage.{' '}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                >
                  {showDetails ? 'Hide details' : 'Learn more'}
                </button>
              </p>
              {showDetails && (
                <div className="mt-3 space-y-2 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-[var(--aethel-success)]" />
                    <span><strong className="text-zinc-300">Essential:</strong> Authentication, security, preferences (always active)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-[var(--aethel-info)]" />
                    <span><strong className="text-zinc-300">Analytics:</strong> Usage patterns, performance metrics, funnel tracking</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => accept('essential')}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 transition-colors"
            >
              Essential Only
            </button>
            <button
              onClick={() => accept('all')}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
