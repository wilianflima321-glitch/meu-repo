'use client'

import type { MediaAsset } from './media-studio-core'

type AssetBinProps = {
  assets: MediaAsset[]
  selectedAssetId: string | null
  onSelectAsset: (assetId: string) => void
}

export function MediaStudioAssetBin({ assets, selectedAssetId, onSelectAsset }: AssetBinProps) {
  return (
    <div className="w-64 border-r border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]">
      <div className="px-3 py-2 text-xs text-[var(--aethel-text-quaternary)] border-b border-[var(--aethel-border-primary)]">Assets</div>
      <div className="p-2 space-y-1 overflow-auto h-full">
        {assets.length === 0 ? (
          <div className="text-sm text-[var(--aethel-text-quaternary)] p-2">
            Import a media file (image, audio, or video) to get started.
          </div>
        ) : (
          assets.map((asset) => (
            <button type="button" aria-label={`Select asset ${asset.name}`}
              key={asset.id}
              onClick={() => onSelectAsset(asset.id)}
              className={
                'w-full text-left px-2 py-1.5 rounded border ' +
                (selectedAssetId === asset.id
                  ? 'bg-[var(--aethel-surface-tertiary)] border-[var(--aethel-border-primary)] text-[var(--aethel-text-primary)]'
                  : 'bg-transparent border-transparent hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_75%,transparent)] text-[var(--aethel-text-secondary)]')
              }
            >
              <div className="text-sm truncate">{asset.name}</div>
              <div className="text-xs text-[var(--aethel-text-quaternary)]">{asset.kind.toUpperCase()}</div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
