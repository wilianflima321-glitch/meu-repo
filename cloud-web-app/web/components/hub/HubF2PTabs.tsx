'use client'

import {
  HUB_MICRO_TAGS,
  HUB_PRIMARY_TABS,
  type HubPrimaryTabId,
} from '@/lib/hub/taxonomy'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'

type HubF2PTabsProps = {
  activeTab: HubPrimaryTabId
  onTabChange: (tab: HubPrimaryTabId) => void
  activeMicroTag: string | null
  onMicroTagChange: (tagId: string | null) => void
  presentMicroTagIds?: string[]
  /** When true, New & Rising drops [HELD] chrome (I.1 engine live). */
  discoveryFeedReady?: boolean
}

/**
 * Hub I.5 — primary F2P tabs + sidebar micro-tags over real catalog filters.
 */
export function HubF2PTabs({
  activeTab,
  onTabChange,
  activeMicroTag,
  onMicroTagChange,
  presentMicroTagIds,
  discoveryFeedReady = false,
}: HubF2PTabsProps) {
  const present = new Set(presentMicroTagIds ?? [])

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Hub catalog tabs"
        className="flex flex-wrap gap-2"
      >
        {HUB_PRIMARY_TABS.map((tab) => {
          const selected = activeTab === tab.id
          const discoveryHeldChrome =
            tab.discoveryHeld === true && discoveryFeedReady !== true
          const heldHint = discoveryHeldChrome || tab.cosmeticsHeld
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onTabChange(tab.id)}
              className={`rounded-full border px-3.5 py-2 text-xs font-semibold tracking-wide transition ${CANONICAL_FOCUS} ${
                selected
                  ? 'border-[color-mix(in_srgb,var(--aethel-info)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] text-[var(--aethel-info-light)]'
                  : 'border-[var(--aethel-border-subtle)] bg-transparent text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-secondary)]'
              }`}
            >
              {tab.label}
              {heldHint ? (
                <span className="ml-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-warning-light)]">
                  [HELD]
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
          Tags
        </span>
        <button
          type="button"
          onClick={() => onMicroTagChange(null)}
          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${CANONICAL_FOCUS} ${
            activeMicroTag === null
              ? 'border-[var(--aethel-border-secondary)] text-[var(--aethel-text-secondary)]'
              : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-quaternary)]'
          }`}
        >
          Any
        </button>
        {HUB_MICRO_TAGS.map((tag) => {
          const selected = activeMicroTag === tag.id
          const hasMatches = present.size === 0 || present.has(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onMicroTagChange(selected ? null : tag.id)}
              disabled={!hasMatches && present.size > 0}
              title={
                hasMatches
                  ? tag.label
                  : `${tag.label} — no published games with this tag yet`
              }
              style={
                selected
                  ? {
                      borderColor: tag.theme.accent,
                      background: tag.theme.accentMuted,
                      color: tag.theme.accent,
                    }
                  : undefined
              }
              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${CANONICAL_FOCUS} ${
                selected
                  ? ''
                  : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-secondary)]'
              }`}
            >
              {tag.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default HubF2PTabs
