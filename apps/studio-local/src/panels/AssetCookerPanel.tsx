import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useRef, useState } from 'react'

/**
 * Missão Suprema 3 — O "Cooker" de Assets Assíncrono.
 *
 * Frontend surface for the Rust `asset_cooker` background thread: point it
 * at a directory, and every PNG/JPG dropped or edited inside gets picked up
 * by a native `notify` watcher, block-compressed to BC1/DXT1, and written
 * back out as a `.cooked.dds` sitting right next to the source — no upload,
 * no server round trip, all on-device.
 */
type CookedAssetEvent = {
  sourcePath: string
  cookedPath: string
  format: string
}

type CookFailedEvent = {
  sourcePath: string
  error: string
}

type CookLogEntry = {
  id: string
  kind: 'cooked' | 'failed'
  sourcePath: string
  detail: string
}

export function AssetCookerPanel() {
  const [watchPath, setWatchPath] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [log, setLog] = useState<CookLogEntry[]>([])
  const nextId = useRef(0)

  useEffect(() => {
    const unlistenPromises = [
      listen<CookedAssetEvent>('asset_cooked', (event) => {
        const entry: CookLogEntry = {
          id: `cooked-${nextId.current++}`,
          kind: 'cooked',
          sourcePath: event.payload.sourcePath,
          detail: `→ ${event.payload.cookedPath} (${event.payload.format})`,
        }
        setLog((previous) => [entry, ...previous].slice(0, 50))
      }),
      listen<CookFailedEvent>('asset_cook_failed', (event) => {
        const entry: CookLogEntry = {
          id: `failed-${nextId.current++}`,
          kind: 'failed',
          sourcePath: event.payload.sourcePath,
          detail: event.payload.error,
        }
        setLog((previous) => [entry, ...previous].slice(0, 50))
      }),
    ]

    return () => {
      void Promise.all(unlistenPromises).then((unlisteners) => unlisteners.forEach((unlisten) => unlisten()))
    }
  }, [])

  async function startCooking() {
    setError(null)
    try {
      const result = await invoke<{ state: string; reason: string }>('asset_cooker_start', {
        path: watchPath,
      })
      setStatus(result.reason)
    } catch (err) {
      setStatus(null)
      setError(err instanceof Error ? err.message : 'Failed to start the native asset cooker.')
    }
  }

  return (
    <div className="panel asset-cooker-panel">
      <div className="panel-heading">
        <span>Asset Cooker (Native BC1)</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          value={watchPath}
          onChange={(event) => setWatchPath(event.target.value)}
          placeholder="Absolute path to a textures folder"
          style={{ flex: 1 }}
        />
        <button type="button" onClick={() => void startCooking()} disabled={watchPath.trim().length === 0}>
          Start Cooking
        </button>
      </div>

      {status && <p style={{ color: 'var(--muted)' }}>{status}</p>}
      {error && <p style={{ color: '#ff8080' }}>{error}</p>}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 180, overflowY: 'auto' }}>
        {log.map((entry) => (
          <li key={entry.id} style={{ color: entry.kind === 'cooked' ? 'var(--muted)' : '#ff8080', fontSize: 12 }}>
            <strong>{entry.kind === 'cooked' ? 'Cooked' : 'Failed'}</strong> {entry.sourcePath} — {entry.detail}
          </li>
        ))}
        {log.length === 0 && <li style={{ color: 'var(--subtle)', fontSize: 12 }}>No textures cooked yet.</li>}
      </ul>
    </div>
  )
}
