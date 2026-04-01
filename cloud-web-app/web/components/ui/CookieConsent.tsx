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
      className="fixed bottom-0 left-0 right-0 z-[1080] border-t border-white/10 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent)] backdrop-blur-xl shadow-2xl shadow-black/40"
      role="dialog"
      aria-label="Consentimento de cookies"
      style={{ animation: 'slideUp 300ms ease-out' }}
    >
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-[var(--aethel-warning)]" />
            <div>
              <p className="text-sm text-[var(--aethel-text-secondary)]">
                Usamos cookies para melhorar sua experiencia, proteger a sessao e entender o uso do produto.{' '}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-[var(--aethel-primary-light)] hover:text-[var(--aethel-primary)] underline underline-offset-2 transition-colors"
                >
                  {showDetails ? 'Ocultar detalhes' : 'Saiba mais'}
                </button>
              </p>
              {showDetails && (
                <div className="mt-3 space-y-2 text-xs text-[var(--aethel-text-tertiary)]">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-[var(--aethel-success)]" />
                    <span><strong className="text-[var(--aethel-text-secondary)]">Essenciais:</strong> autenticacao, seguranca e preferencias basicas do studio (sempre ativos)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-[var(--aethel-info)]" />
                    <span><strong className="text-[var(--aethel-text-secondary)]">Analytics:</strong> padroes de uso, performance e etapas do onboarding</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => accept('essential')}
              className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] transition-colors"
            >
              Apenas essenciais
            </button>
            <button
              onClick={() => accept('all')}
              className="rounded-lg bg-[var(--aethel-primary)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:brightness-110 transition-colors"
            >
              Aceitar todos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
