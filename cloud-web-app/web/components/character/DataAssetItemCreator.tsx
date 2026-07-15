'use client'

/**
 * Letter bu — Studio IDE Data-Asset sword/item creator (Zero-UI in game runtime).
 * Visual primary path; persists via AssetPipeline — not JSON-only authoring.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  listItemDataAssets,
  persistItemDataAsset,
  type SwordCreatorDraft,
} from '@/lib/character/data-asset-item-pipeline'
import type { ItemRarity } from '@/lib/inventory/system/types'

const RARITIES: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export default function DataAssetItemCreator() {
  const [draft, setDraft] = useState<SwordCreatorDraft>({
    id: 'sword-iron-01',
    name: 'Iron Longsword',
    description: '',
    rarity: 'common',
    damage: 12,
    weight: 3.5,
    modelPath: '',
    iconPath: 'sword',
  })
  const [status, setStatus] = useState<string>('Author in Studio — runtime stays Zero-UI')
  const [lastPath, setLastPath] = useState<string>('')

  const existing = useMemo(() => listItemDataAssets(), [lastPath])

  const onPersist = useCallback(() => {
    const result = persistItemDataAsset(draft)
    if (result.ok && result.assetPipelinePersisted) {
      setLastPath(result.path)
      setStatus(`Persisted via AssetPipeline: ${result.path}`)
    } else {
      setStatus(result.notes.join(' · ') || 'Persist failed')
    }
  }, [draft])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        maxWidth: 480,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <header>
        <h2 style={{ margin: 0, fontSize: 18 }}>Data-Asset Item Creator</h2>
        <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: 13 }}>
          Visual sword/item authoring → AssetPipeline. Not a JSON-first workflow.
        </p>
      </header>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Id
        <input
          value={draft.id}
          onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Name
        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Description
        <textarea
          rows={2}
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Rarity
        <select
          value={draft.rarity}
          onChange={(e) => setDraft((d) => ({ ...d, rarity: e.target.value as ItemRarity }))}
        >
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Damage
        <input
          type="number"
          min={0}
          value={draft.damage}
          onChange={(e) => setDraft((d) => ({ ...d, damage: Number(e.target.value) || 0 }))}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Weight
        <input
          type="number"
          min={0}
          step={0.1}
          value={draft.weight}
          onChange={(e) => setDraft((d) => ({ ...d, weight: Number(e.target.value) || 0 }))}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Model path (optional)
        <input
          value={draft.modelPath ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, modelPath: e.target.value }))}
        />
      </label>

      <button type="button" onClick={onPersist} style={{ padding: '8px 12px', cursor: 'pointer' }}>
        Persist to AssetPipeline
      </button>

      <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }} role="status">
        {status}
      </p>

      {existing.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
          {existing.map((a) => (
            <li key={a.id}>
              {a.name} — {a.path}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
