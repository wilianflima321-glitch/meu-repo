'use client'

/**
 * Block 6H.4 — Calm AI quota modal (PAYG §4.2).
 * IDE never locked — CTAs only.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Sparkles } from 'lucide-react'
import {
  subscribeAiQuotaModal,
} from '@/lib/billing/ai-quota-modal-bridge'
import type { AiQuotaBlockedResponse } from '@/lib/billing/ai-quota-blocked'

export function AiQuotaModal() {
  const [payload, setPayload] = useState<AiQuotaBlockedResponse | null>(null)

  useEffect(() => subscribeAiQuotaModal(setPayload), [])

  if (!payload) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-bg-primary)_70%,transparent)] p-4"
      role="presentation"
      onClick={() => setPayload(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-quota-title"
        className="relative w-full max-w-md rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => setPayload(null)}
          className="absolute right-3 top-3 rounded-lg p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)]">
            <Sparkles className="h-5 w-5 text-[var(--aethel-info-light)]" />
          </div>
          <div>
            <h2 id="ai-quota-title" className="text-lg font-semibold text-[var(--aethel-text-primary)]">
              AI quota reached
            </h2>
            <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">{payload.message}</p>
            <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">
              IDE stays open — choose how to continue AI. Editor, scene, and local work are never locked.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {payload.actions.map((action) => (
            <Link
              key={action.type}
              href={action.href}
              onClick={() => setPayload(null)}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                action.primary
                  ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
                  : 'border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              {action.label}
              {action.requiresSpendCap ? (
                <span className="ml-2 text-xs opacity-80">(spend cap required)</span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AiQuotaModal
