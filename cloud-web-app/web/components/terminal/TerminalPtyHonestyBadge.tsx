'use client'

import { useEffect, useState } from 'react'
import { FlaskConical } from 'lucide-react'

import { getAuthHeaders } from '@/lib/ai/change-feedback-client'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('TerminalPtyHonestyBadge')

type HonestyPayload = {
  marketingLocalShellAllowed?: boolean
  badgeLabel?: string
  claim?: string
  productCopy?: string
  activePty?: { path?: string; isUserLocalMachine?: boolean }
}

/**
 * Block 9 — PTY path honesty badge for web terminal chrome.
 * Cloud node-pty must never read as "local shell".
 */
export function TerminalPtyHonestyBadge({ compact = false }: { compact?: boolean }) {
  const [report, setReport] = useState<HonestyPayload | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const desktop =
          typeof window !== 'undefined' &&
          ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
        const res = await fetch(
          `/api/runtime/desktop-honesty?desktop=${desktop ? '1' : '0'}&cloud=${desktop ? '0' : '1'}`,
          {
            headers: { ...getAuthHeaders() },
            cache: 'no-store',
          },
        )
        if (!res.ok) throw new Error(`desktop honesty ${res.status}`)
        const data = (await res.json()) as { report?: HonestyPayload }
        if (!cancelled) setReport(data.report ?? null)
      } catch (err) {
        log.warn('terminal_pty_honesty_badge_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
        if (!cancelled) {
          setReport({
            marketingLocalShellAllowed: false,
            badgeLabel: '[HELD] local · cloud container shell',
            claim: 'Terminal path unknown — assume cloud container',
            productCopy:
              'Could not load PTY honesty report. Treat this shell as cloud/server, not your PC.',
          })
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const local = report?.marketingLocalShellAllowed === true
  const label =
    report?.badgeLabel ??
    (local ? 'Local · desktop PTY' : '[HELD] local · cloud container shell')

  return (
    <span
      role="status"
      aria-live="polite"
      title={report?.productCopy || report?.claim || 'PTY path honesty'}
      className={`
        inline-flex items-center gap-1 rounded border
        font-mono font-medium uppercase tracking-widest select-none
        ${
          local
            ? 'border-[color-mix(in_srgb,var(--aethel-success)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success)]'
            : 'border-amber-400/45 bg-amber-400/8 text-amber-400'
        }
        ${compact ? 'px-1.5 py-0 text-[9px]' : 'px-2 py-0.5 text-[10px]'}
      `}
    >
      <FlaskConical className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} aria-hidden />
      {compact ? (local ? 'Local' : 'Cloud') : label}
    </span>
  )
}
