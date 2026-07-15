'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAuthHeaders } from '@/lib/ai/change-feedback-client'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  notifyTerrainHeightfieldChanged,
} from '@/lib/production/landscape-heightfield-bridge'

const log = createComponentLogger('TerrainHeightfieldBrushPanel')

function notifyHeightfieldChanged(): void {
  notifyTerrainHeightfieldChanged({ source: 'viewport-brush-panel' })
}

type HeightfieldMeta = {
  resolution: number
  widthMeters: number
  depthMeters: number
  maxHeight: number
  strokeCount: number
  updatedAt: string
}

type BrushMode = 'sculpt' | 'flatten' | 'smooth'

/**
 * Focus 2B / C3 — durable terrain brush → POST /api/runtime/terrain-heightfield.
 * No mock heightmap-as-shipped; every stroke persists on disk.
 */
export function TerrainHeightfieldBrushPanel({ projectId }: { projectId?: string | null }) {
  const [meta, setMeta] = useState<HeightfieldMeta | null>(null)
  const [mode, setMode] = useState<BrushMode>('sculpt')
  const [u, setU] = useState(0.5)
  const [v, setV] = useState(0.5)
  const [radius, setRadius] = useState(0.08)
  const [strength, setStrength] = useState(0.12)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const headers = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(projectId ? { 'x-project-id': projectId } : {}),
    }
  }, [projectId])

  const refresh = useCallback(async () => {
    if (!projectId?.trim()) {
      setError('Open a project to load the durable heightfield.')
      setMeta(null)
      return
    }
    try {
      const qs = new URLSearchParams({ projectId: projectId.trim(), terrainId: 'default' })
      const res = await fetch(`/api/runtime/terrain-heightfield?${qs.toString()}`, {
        headers: headers(),
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`load ${res.status}`)
      const data = (await res.json()) as { meta?: HeightfieldMeta; mock?: boolean }
      if (data.mock === true) {
        throw new Error('Heightfield API returned mock — forbidden')
      }
      if (data.meta) {
        setMeta(data.meta)
      } else {
        // Auto-create flat heightfield once so brush has a real substrate
        const createRes = await fetch('/api/runtime/terrain-heightfield', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            projectId: projectId.trim(),
            terrainId: 'default',
            create: true,
            resolution: 129,
          }),
        })
        if (!createRes.ok) throw new Error(`create ${createRes.status}`)
        const created = (await createRes.json()) as { meta?: HeightfieldMeta; mock?: boolean }
        if (created.mock === true) throw new Error('Create returned mock — forbidden')
        if (created.meta) setMeta(created.meta)
        notifyHeightfieldChanged()
      }
      setError(null)
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Failed to load heightfield'
      setError(text)
      log.warn('terrain_heightfield_load_failed', { error: text })
    }
  }, [headers, projectId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const applyStroke = useCallback(async () => {
    if (busy) return
    if (!projectId?.trim()) {
      setError('Open a project before applying terrain strokes.')
      return
    }
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/runtime/terrain-heightfield', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          projectId: projectId.trim(),
          terrainId: 'default',
          strokes: [
            {
              u,
              v,
              radius,
              strength: mode === 'sculpt' ? strength : mode === 'smooth' ? strength * 0.5 : strength,
              mode,
              falloff: 2,
            },
          ],
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        meta?: HeightfieldMeta
        mock?: boolean
        error?: string
        message?: string
      }
      if (!res.ok) {
        throw new Error(data.message || data.error || `stroke ${res.status}`)
      }
      if (data.mock === true) {
        throw new Error('Persist returned mock — forbidden')
      }
      if (data.meta) setMeta(data.meta)
      notifyHeightfieldChanged()
      setMessage(
        `Stroke persisted · total ${data.meta?.strokeCount ?? '?'} · ${data.meta?.updatedAt ?? ''}`
      )
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aethel:terrain-heightfield-changed', {
          detail: { terrainId: 'default', strokeCount: data.meta?.strokeCount },
        }))
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Stroke failed'
      setError(text)
      log.warn('terrain_heightfield_stroke_failed', { error: text })
    } finally {
      setBusy(false)
    }
  }, [busy, headers, mode, projectId, radius, strength, u, v])

  return (
    <div className="absolute bottom-3 right-3 z-20 w-[min(100%,18rem)] rounded-md border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent)] p-3 text-xs text-[var(--aethel-text-secondary)] shadow-sm backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-muted)]">
        Terrain heightfield
      </p>
      <p className="mt-1 text-[11px] text-[var(--aethel-text-primary)]">
        {meta
          ? `${meta.resolution}² · ${meta.strokeCount} strokes · disk authority`
          : 'Loading heightfield…'}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-1">
        {(['sculpt', 'flatten', 'smooth'] as BrushMode[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={`rounded border px-1.5 py-1 capitalize ${
              mode === item
                ? 'border-[var(--aethel-accent-primary)] text-[var(--aethel-text-primary)]'
                : 'border-[var(--aethel-border-primary)]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <label className="mt-2 block">
        <span className="text-[var(--aethel-text-muted)]">U {u.toFixed(2)}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={u}
          onChange={(e) => setU(Number(e.target.value))}
          className="mt-1 w-full accent-[var(--aethel-accent-primary)]"
        />
      </label>
      <label className="mt-1 block">
        <span className="text-[var(--aethel-text-muted)]">V {v.toFixed(2)}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={v}
          onChange={(e) => setV(Number(e.target.value))}
          className="mt-1 w-full accent-[var(--aethel-accent-primary)]"
        />
      </label>
      <label className="mt-1 block">
        <span className="text-[var(--aethel-text-muted)]">Radius {radius.toFixed(2)}</span>
        <input
          type="range"
          min={0.02}
          max={0.35}
          step={0.01}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="mt-1 w-full accent-[var(--aethel-accent-primary)]"
        />
      </label>
      <label className="mt-1 block">
        <span className="text-[var(--aethel-text-muted)]">Strength {strength.toFixed(2)}</span>
        <input
          type="range"
          min={-0.4}
          max={0.4}
          step={0.01}
          value={strength}
          onChange={(e) => setStrength(Number(e.target.value))}
          className="mt-1 w-full accent-[var(--aethel-accent-primary)]"
        />
      </label>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void applyStroke()}
          className="flex-1 rounded-md bg-[var(--aethel-accent-primary)] px-2 py-1.5 text-[11px] font-semibold text-[var(--aethel-text-on-accent)] disabled:opacity-50"
        >
          {busy ? 'Persisting…' : 'Apply stroke'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void refresh()}
          className="rounded-md border border-[var(--aethel-border-primary)] px-2 py-1.5 text-[11px] disabled:opacity-50"
        >
          Reload
        </button>
      </div>

      {message ? (
        <p className="mt-2 text-[10px] text-[var(--aethel-success)]">{message}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-[10px] text-[var(--aethel-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
