/**
 * Letter bu — Data-Assets item/sword creator persistence via asset-pipeline.
 * IDE-only path; Zero-UI in game runtime. Primary path is visual creator, not JSON-only.
 */

import { ItemBuilder } from '@/lib/inventory/system/item-builder'
import type { ItemDefinition, ItemRarity } from '@/lib/inventory/system/types'
import { getAssetPipeline, type Asset } from '@/lib/asset-pipeline'

export const DATA_ASSET_ITEM_PIPELINE_WIRED = true as const

export interface SwordCreatorDraft {
  id: string
  name: string
  description: string
  rarity: ItemRarity
  damage: number
  weight: number
  modelPath?: string
  iconPath?: string
}

export interface DataAssetPersistResult {
  ok: boolean
  item: ItemDefinition | null
  asset: Asset | null
  path: string
  /** True when persisted through AssetPipeline registry (not JSON-only primary). */
  assetPipelinePersisted: boolean
  notes: string[]
}

const DATA_ASSET_PREFIX = 'data-assets/items/'

/** Build a weapon ItemDefinition from visual creator draft. */
export function buildSwordFromCreatorDraft(draft: SwordCreatorDraft): ItemDefinition {
  return ItemBuilder.create(draft.id)
    .name(draft.name)
    .description(draft.description || `${draft.name} — authored in Studio Data-Asset creator`)
    .type('weapon')
    .rarity(draft.rarity)
    .equipSlot('main_hand')
    .weight(draft.weight)
    .value(Math.max(1, Math.round(draft.damage * 10)))
    .stats({ damage: draft.damage })
    .model(draft.modelPath ?? '')
    .icon(draft.iconPath ?? 'sword')
    .tag('weapon')
    .tag('sword')
    .tag('data-asset')
    .build()
}

/**
 * Persist item definition into AssetPipeline as a `data` asset.
 * Primary studio path — JSON blob is the cooked payload, not the authoring UX.
 */
export function persistItemDataAsset(draft: SwordCreatorDraft): DataAssetPersistResult {
  const notes: string[] = ['Data-Asset UX → ItemBuilder → AssetPipeline (letter bu)']
  let item: ItemDefinition
  try {
    item = buildSwordFromCreatorDraft(draft)
  } catch (e) {
    return {
      ok: false,
      item: null,
      asset: null,
      path: '',
      assetPipelinePersisted: false,
      notes: [...notes, e instanceof Error ? e.message : 'build failed'],
    }
  }

  const path = `${DATA_ASSET_PREFIX}${item.id}.item.json`
  const payload = JSON.stringify(item, null, 2)
  const now = new Date()
  const asset: Asset = {
    id: `item-data-${item.id}`,
    name: item.name,
    type: 'data',
    path,
    size: payload.length,
    mimeType: 'application/json',
    metadata: {
      format: 'aethel-item-data-asset',
    },
    importSettings: {},
    dependencies: draft.modelPath ? [draft.modelPath] : [],
    createdAt: now,
    updatedAt: now,
  }

  const pipeline = getAssetPipeline()
  const registered = pipeline.registerAuthoredDataAsset(asset, item)
  const persisted = Boolean(pipeline.get(registered.id))

  return {
    ok: persisted,
    item,
    asset: registered,
    path,
    assetPipelinePersisted: persisted,
    notes: [
      ...notes,
      persisted ? 'persisted via AssetPipeline.registerAuthoredDataAsset' : 'pipeline register failed',
      'Zero-UI: runtime game does not show creator chrome',
    ],
  }
}

/** List sword/weapon data assets currently in the pipeline. */
export function listItemDataAssets(): Asset[] {
  return getAssetPipeline()
    .getByType('data')
    .filter((a) => a.path.startsWith(DATA_ASSET_PREFIX) || a.metadata.format === 'aethel-item-data-asset')
}
