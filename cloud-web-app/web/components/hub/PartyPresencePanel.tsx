'use client'

/**
 * I.4 — Rich presence + party invite empty-honest surface.
 * Never invents online friends. Agones / dedicated session stays [HELD].
 */

import { useCallback, useEffect, useState } from 'react'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('PartyPresencePanel')

type PresenceRow = {
  userId: string
  status: string
  gameId?: string
  gameTitle?: string
  joinable: boolean
  updatedAt: string
}

type InviteRow = {
  id: string
  hostUserId: string
  inviteeUserId: string
  gameId: string
  gameTitle?: string
  status: string
  createdAt: string
}

type PartyPresencePanelProps = {
  gameId?: string
  gameTitle?: string
}

export function PartyPresencePanel({ gameId, gameTitle }: PartyPresencePanelProps) {
  const [presence, setPresence] = useState<PresenceRow | null>(null)
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [authHint, setAuthHint] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [inviteeId, setInviteeId] = useState('')
  const [ageYears, setAgeYears] = useState('18')
  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [lastDeepLink, setLastDeepLink] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const ageQ = encodeURIComponent(ageYears.trim() || '18')
      const [presRes, partyRes] = await Promise.all([
        fetch('/api/hub/social/presence', { cache: 'no-store' }),
        fetch(`/api/hub/social/party?ageYears=${ageQ}`, { cache: 'no-store' }),
      ])
      if (presRes.status === 401 || partyRes.status === 401) {
        setAuthHint(true)
        setPresence(null)
        setInvites([])
        setLoadError(null)
        return
      }
      setAuthHint(false)

      if (presRes.ok) {
        const presData = (await presRes.json()) as { presence?: PresenceRow | null }
        setPresence(presData.presence ?? null)
      } else if (presRes.status === 503) {
        setPresence(null)
      }

      if (partyRes.ok) {
        const partyData = (await partyRes.json()) as { invites?: InviteRow[] }
        setInvites(Array.isArray(partyData.invites) ? partyData.invites : [])
        setLoadError(null)
      } else if (partyRes.status === 403) {
        const errBody = (await partyRes.json().catch(() => ({}))) as {
          error?: string
          reason?: string
        }
        setInvites([])
        setLoadError(errBody.reason || errBody.error || 'COPPA / block gate held')
      } else if (partyRes.status === 503) {
        const errBody = (await partyRes.json().catch(() => ({}))) as { error?: string }
        setInvites([])
        setLoadError(errBody.error || 'Party substrate held')
      } else {
        throw new Error(`party ${partyRes.status}`)
      }
    } catch (err) {
      log.warn('party_presence_panel_load_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      setLoadError(err instanceof Error ? err.message : String(err))
      setPresence(null)
      setInvites([])
    }
  }, [ageYears])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const onHeartbeat = async () => {
    setBusy(true)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/hub/social/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: gameId ? 'in_game' : 'online',
          gameId,
          gameTitle,
          joinable: Boolean(gameId),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setAuthHint(true)
        setStatusMsg('Sign in to publish presence')
        return
      }
      if (!res.ok) {
        setStatusMsg((data as { error?: string }).error || 'Presence update failed')
        return
      }
      setStatusMsg('Presence heartbeat saved')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const onInvite = async () => {
    const inviteeUserId = inviteeId.trim()
    if (!inviteeUserId) {
      setStatusMsg('Enter an invitee user id')
      return
    }
    if (!gameId) {
      setStatusMsg('Game context required for party invite')
      return
    }
    setBusy(true)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/hub/social/party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteeUserId,
          gameId,
          gameTitle,
          ageYears: Number(ageYears) || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setAuthHint(true)
        setStatusMsg('Sign in to invite')
        return
      }
      if (!res.ok) {
        setStatusMsg(
          (data as { reason?: string; error?: string }).reason ||
            (data as { error?: string }).error ||
            'Invite failed',
        )
        return
      }
      const uri = (data as { deepLink?: { uri?: string } }).deepLink?.uri
      setLastDeepLink(uri || null)
      setStatusMsg('Party invite created — Agones session [HELD]')
      setInviteeId('')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
        Presence · Party invite · Deep-link
      </p>
      <p className="mt-1.5 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
        Durable presence and invite tokens. No fake online friends wall. Dedicated multiplayer
        session host / Agones remains [HELD].
      </p>

      {authHint ? (
        <p className="mt-3 text-xs text-[var(--aethel-warning-light)]">
          Sign in to publish presence or send invites.
        </p>
      ) : null}
      {loadError ? (
        <p className="mt-3 text-xs text-[var(--aethel-warning-light)]">{loadError}</p>
      ) : null}
      {statusMsg ? (
        <p className="mt-2 text-xs text-[var(--aethel-text-secondary)]">{statusMsg}</p>
      ) : null}
      {lastDeepLink ? (
        <p className="mt-2 break-all text-[11px] text-[var(--aethel-text-tertiary)]">
          {lastDeepLink}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
          Age years (COPPA)
          <input
            value={ageYears}
            onChange={(e) => setAgeYears(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-transparent px-3 py-2 text-xs text-[var(--aethel-text-primary)] sm:w-24"
            inputMode="numeric"
            autoComplete="off"
          />
        </label>
        <label className="flex-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
          Invitee user id
          <input
            value={inviteeId}
            onChange={(e) => setInviteeId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-transparent px-3 py-2 text-xs text-[var(--aethel-text-primary)]"
            placeholder="invitee user id"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onHeartbeat()}
          className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-[var(--aethel-text-secondary)] disabled:opacity-50"
        >
          Heartbeat presence
        </button>
        <button
          type="button"
          disabled={busy || !gameId}
          onClick={() => void onInvite()}
          className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] px-3 py-1.5 text-[11px] font-semibold text-[var(--aethel-success-light)] disabled:opacity-50"
        >
          Send party invite
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            Your presence
          </p>
          {!presence ? (
            <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">
              No presence yet — empty-honest.
            </p>
          ) : (
            <p className="mt-2 text-xs text-[var(--aethel-text-secondary)]">
              {presence.status}
              {presence.gameTitle ? ` · ${presence.gameTitle}` : presence.gameId ? ` · ${presence.gameId}` : ''}
              {presence.joinable ? ' · joinable' : ''}
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            Your invites
          </p>
          {invites.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">No invites yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {invites.map((inv) => (
                <li key={inv.id} className="text-xs text-[var(--aethel-text-secondary)]">
                  {inv.gameId} · {inv.status} · {inv.inviteeUserId}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default PartyPresencePanel
