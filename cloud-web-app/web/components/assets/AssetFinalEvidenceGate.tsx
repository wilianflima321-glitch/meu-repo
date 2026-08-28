'use client'

/**
 * AssetFinalEvidenceGate  -  Asset Quality Promotion Modal (V24-005)
 *
 * PURPOSE: Prevents AI-draft assets from becoming "final" without passing
 * a technical evidence checklist. The "Mark as Final" CTA is locked until
 * the sidecar confirms each evidence item. Addresses BEST_IN_MARKET gap:
 * "Asset quality: gate inescapable."
 *
 * DESIGN: One protagonist: the asset preview (mini-viewport or thumbnail).
 * Checklist on the side. Quantum Cyan = confirmed. Warning = pending. Error = missing.
 * HONESTY: Never fakes a confirmed status. Each item requires a real receipt prop.
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// --- Types ---

export type EvidenceStatus = 'confirmed' | 'pending' | 'missing' | 'not-applicable'

export interface AssetEvidenceItem {
  id: string
  label: string
  description: string
  status: EvidenceStatus
  /** Sidecar receipt ID or URL */
  receiptRef?: string
}

export interface AssetForPromotion {
  assetId: string
  name: string
  currentLane: 'ai-draft' | 'curated-asset' | 'studio-local-optimized'
  thumbnailUrl?: string
  polyCount?: number
  textureSizeMb?: number
  evidenceItems: AssetEvidenceItem[]
}

interface AssetFinalEvidenceGateProps {
  asset: AssetForPromotion
  onConfirmFinal: (assetId: string) => void
  onDismiss: () => void
}

// --- Constants ---

const STATUS_CONFIG: Record<EvidenceStatus, { icon: string; color: string; label: string }> = {
  confirmed:      { icon: '?', color: 'var(--aethel-info)',                  label: 'Confirmed' },
  pending:        { icon: '?', color: 'var(--aethel-warning)',    label: 'Pending'   },
  missing:        { icon: '?', color: 'var(--aethel-error)',       label: 'Missing'   },
  'not-applicable':{ icon: ' - ', color: 'var(--aethel-text-tertiary)', label: 'N/A'  },
}

const LANE_META = {
  'ai-draft':               { label: 'AI Draft',          color: 'var(--aethel-warning)', note: 'AI-generated. Not suitable for final builds.' },
  'curated-asset':          { label: 'Curated',           color: 'var(--aethel-primary)', note: 'Sourced from verified provider with license.' },
  'studio-local-optimized': { label: 'Studio Optimized',  color: 'var(--aethel-info)',               note: 'Processed by local sidecar (meshopt/LOD/PBR).' },
}

// --- Helpers ---

function allConfirmed(items: AssetEvidenceItem[]) {
  return items.every((item) => item.status === 'confirmed' || item.status === 'not-applicable')
}

// --- Sub-components ---

function EvidenceRow({ item }: { item: AssetEvidenceItem }) {
  const cfg = STATUS_CONFIG[item.status]
  return (
    <motion.div
      layout
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
        item.status === 'confirmed'
          ? 'border-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_6%,transparent)]'
          : item.status === 'missing'
          ? 'border-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_5%,transparent)]'
          : 'border-[var(--aethel-border-subtle)] bg-transparent',
      )}
    >
      <span
        className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold"
        style={{
          color: cfg.color,
          background: `color-mix(in srgb, ${cfg.color} 15%, transparent)`,
          border: `1px solid color-mix(in srgb, ${cfg.color} 30%, transparent)`,
        }}
        aria-label={cfg.label}
      >
        {cfg.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[var(--aethel-text-primary)]">{item.label}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--aethel-text-tertiary)]">{item.description}</p>
        {item.receiptRef && (
          <p className="mt-1 truncate font-mono text-[9px] text-[var(--aethel-text-tertiary)]">{item.receiptRef}</p>
        )}
      </div>
    </motion.div>
  )
}

// --- Main ---

export function AssetFinalEvidenceGate({ asset, onConfirmFinal, onDismiss }: AssetFinalEvidenceGateProps) {
  const canFinalize = allConfirmed(asset.evidenceItems)
  const confirmed = asset.evidenceItems.filter((i) => i.status === 'confirmed' || i.status === 'not-applicable').length
  const total = asset.evidenceItems.length
  const progress = total > 0 ? (confirmed / total) * 100 : 0
  const laneMeta = LANE_META[asset.currentLane]

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] backdrop-blur-lg"
      data-surface="asset-final-evidence-gate"
      role="dialog"
      aria-label={`Promote ${asset.name} to Final`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--aethel-text-primary)]">Promote to Final</h2>
          <p className="mt-0.5 text-[11px] text-[var(--aethel-text-tertiary)]">
            All required evidence must be confirmed before this asset can be marked final.
          </p>
        </div>
        <button
          type="button"
          id="asset-gate-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-lg p-1.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
        >
          ?
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden md:flex-row">
        {/* Left: Asset preview */}
        <div className="flex flex-col gap-4 border-b border-[var(--aethel-border-subtle)] p-5 md:w-56 md:border-b-0 md:border-r">
          {/* Thumbnail */}
          <div className="relative h-40 w-full overflow-hidden rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]">
            {asset.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.thumbnailUrl} alt={asset.name} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl" aria-hidden>??</div>
            )}
            <span
              className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
              style={{
                color: laneMeta.color,
                background: `color-mix(in srgb, ${laneMeta.color} 15%, transparent)`,
                border: `1px solid color-mix(in srgb, ${laneMeta.color} 30%, transparent)`,
              }}
            >
              {laneMeta.label}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="truncate text-sm font-semibold text-[var(--aethel-text-primary)]">{asset.name}</p>
            <p className="text-[10px] leading-relaxed text-[var(--aethel-text-tertiary)]">{laneMeta.note}</p>
          </div>

          {/* Tech stats */}
          <div className="flex flex-col gap-1 rounded-lg border border-[var(--aethel-border-subtle)] p-2.5">
            {asset.polyCount !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--aethel-text-tertiary)]">Polygons</span>
                <span className="font-mono text-[11px] text-[var(--aethel-text-primary)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {asset.polyCount.toLocaleString()}
                </span>
              </div>
            )}
            {asset.textureSizeMb !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--aethel-text-tertiary)]">Textures</span>
                <span className="font-mono text-[11px] text-[var(--aethel-text-primary)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {asset.textureSizeMb.toFixed(1)} MB
                </span>
              </div>
            )}
          </div>

          {/* Progress */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] text-[var(--aethel-text-tertiary)]">Evidence</span>
              <span className="font-mono text-[10px] text-[var(--aethel-text-secondary)]">{confirmed}/{total}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--aethel-surface-secondary)]">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: canFinalize ? 'var(--aethel-info)' : 'var(--aethel-warning)',
                  width: `${progress}%`,
                }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 30 }}
              />
            </div>
          </div>
        </div>

        {/* Right: Evidence checklist */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--aethel-text-tertiary)]">
            Required Evidence
          </p>
          {asset.evidenceItems.map((item) => (
            <EvidenceRow key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-between gap-4 border-t border-[var(--aethel-border-subtle)] p-4">
        <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
          {canFinalize
            ? 'All evidence confirmed. You may promote this asset to Final.'
            : `${total - confirmed} item${total - confirmed !== 1 ? 's' : ''} pending. Run the sidecar pipeline to complete.`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            id="asset-gate-dismiss-btn"
            onClick={onDismiss}
            className="rounded-xl border border-[var(--aethel-border-subtle)] px-4 py-2 text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] transition-colors"
          >
            Cancel
          </button>
          <motion.button
            type="button"
            id="asset-gate-confirm-btn"
            onClick={() => canFinalize && onConfirmFinal(asset.assetId)}
            disabled={!canFinalize}
            whileHover={canFinalize ? { scale: 1.02 } : undefined}
            whileTap={canFinalize ? { scale: 0.97 } : undefined}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={cn(
              'rounded-xl px-5 py-2 text-sm font-semibold transition-all',
              canFinalize
                ? 'border border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)]'
                : 'cursor-not-allowed border border-[var(--aethel-border-subtle)] bg-transparent text-[var(--aethel-text-tertiary)] opacity-50',
            )}
            style={canFinalize ? { boxShadow: '0 0 16px color-mix(in srgb, var(--aethel-info) 20%, transparent)' } : undefined}
          >
            Mark as Final
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default AssetFinalEvidenceGate
