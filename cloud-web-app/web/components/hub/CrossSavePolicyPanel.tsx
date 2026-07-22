'use client'



/**

 * I.7 — Cross-save policy empty-honest surface.

 * Shows durable default-on opt-out status; never claims Desktop↔Web sync when cloud HELD.

 */



import { useCallback, useEffect, useState } from 'react'

import { createComponentLogger } from '@/lib/observability/logger'



const log = createComponentLogger('CrossSavePolicyPanel')



type CrossSavePolicy = 'required' | 'optional' | 'disabled'



type CrossSavePolicyPanelProps = {

  gameId: string

}



type PolicyPayload = {

  policy?: CrossSavePolicy

  defaultOn?: boolean

  userOptedOut?: boolean

  cloudSyncMarketing?: 'LIVE' | 'HELD'

  gameSaveCloudReady?: boolean

}



export function CrossSavePolicyPanel({ gameId }: CrossSavePolicyPanelProps) {

  const [payload, setPayload] = useState<PolicyPayload | null>(null)

  const [authHint, setAuthHint] = useState(false)

  const [busy, setBusy] = useState(false)

  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const [loadError, setLoadError] = useState<string | null>(null)



  const refresh = useCallback(async () => {

    try {

      const res = await fetch(`/api/hub/games/${encodeURIComponent(gameId)}/cross-save-policy`, {

        cache: 'no-store',

      })

      if (!res.ok) {

        const errBody = await res.json().catch(() => ({}))

        throw new Error(

          (errBody as { error?: string }).error || `cross-save-policy ${res.status}`,

        )

      }

      const data = (await res.json()) as PolicyPayload

      setPayload(data)

      setLoadError(null)

    } catch (err) {

      log.warn('cross_save_policy_panel_load_failed', {

        error: err instanceof Error ? err.message : String(err),

      })

      setLoadError(err instanceof Error ? err.message : String(err))

      setPayload(null)

    }

  }, [gameId])



  useEffect(() => {

    void refresh()

  }, [refresh])



  const onToggleOptOut = async () => {

    if (!payload || payload.policy !== 'optional') return

    setBusy(true)

    setStatusMsg(null)

    try {

      const nextOptOut = !(payload.userOptedOut === true)

      const res = await fetch(`/api/hub/games/${encodeURIComponent(gameId)}/cross-save-policy`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ action: 'opt_out', optedOut: nextOptOut }),

      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {

        setAuthHint(true)

        setStatusMsg('Sign in to change cross-save preference')

        return

      }

      if (!res.ok) {

        setStatusMsg((data as { error?: string }).error || 'Opt-out update failed')

        return

      }

      setAuthHint(false)

      setStatusMsg(nextOptOut ? 'Opted out of cross-save' : 'Cross-save default-on restored')

      await refresh()

    } catch (err) {

      setStatusMsg(err instanceof Error ? err.message : String(err))

    } finally {

      setBusy(false)

    }

  }



  const policy = payload?.policy ?? 'optional'

  const cloudHeld = payload?.cloudSyncMarketing !== 'LIVE'

  const optedOut = payload?.userOptedOut === true



  return (

    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-4 py-3">

      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-secondary)]">

        Cross-save policy

      </p>

      <p className="mt-1.5 text-xs leading-5 text-[var(--aethel-text-tertiary)]">

        Title policy: <span className="text-[var(--aethel-text-secondary)]">{policy}</span>

        {policy === 'optional' ? ' · default-on, player may opt out' : null}

        {policy === 'required' ? ' · required (no opt-out)' : null}

        {policy === 'disabled' ? ' · disabled by title' : null}

      </p>



      {cloudHeld ? (

        <p className="mt-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] px-3 py-2 text-[11px] leading-5 text-[var(--aethel-warning-light)]">

          Desktop ↔ Web cloud sync [HELD] until F.1 Prisma/R2 GameSave credentials. Durable local

          slots are not cross-device sync.

        </p>

      ) : (

        <p className="mt-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)] px-3 py-2 text-[11px] leading-5 text-[var(--aethel-success-light)]">

          Cloud GameSave path live — cross-save marketing unlocked for this title.

        </p>

      )}



      {loadError ? (

        <p className="mt-2 text-[11px] text-[var(--aethel-warning-light)]">{loadError}</p>

      ) : null}

      {authHint ? (

        <p className="mt-2 text-[11px] text-[var(--aethel-text-quaternary)]">

          Sign in to manage your opt-out preference.

        </p>

      ) : null}

      {statusMsg ? (

        <p className="mt-2 text-[11px] text-[var(--aethel-text-secondary)]">{statusMsg}</p>

      ) : null}



      {policy === 'optional' ? (

        <button

          type="button"

          disabled={busy}

          onClick={() => void onToggleOptOut()}

          className="mt-3 rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border)] disabled:opacity-50"

        >

          {busy ? 'Saving…' : optedOut ? 'Re-enable cross-save (default-on)' : 'Opt out of cross-save'}

        </button>

      ) : null}

    </div>

  )

}



export default CrossSavePolicyPanel


