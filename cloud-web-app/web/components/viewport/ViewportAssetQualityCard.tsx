'use client'

import { useState } from 'react'
import { ArrowRight, BadgeCheck, ShieldAlert, Sparkles } from 'lucide-react'

import {
  buildGameAssetQualityPipeline,
  evaluateGameAssetQualityReadiness,
  type GameAssetQualityTier,
} from '@/lib/production/game-asset-quality-pipeline'
import {
  buildQualityOrchestrationPlan,
  nextQualityUpgradeLane,
} from '@/lib/production/ai-quality-orchestrator'
import {
  buildViewportAssetQualityEvidenceRefs,
  formatViewportAssetSize,
  inferViewportAssetQualityTier,
  type ViewportAssetImportMetadata,
} from '@/lib/viewport/viewport-asset-import'

const tierTone: Record<GameAssetQualityTier, string> = {
  'ai-draft': 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]',
  'curated-marketplace': 'border-[color-mix(in_srgb,var(--aethel-info)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]',
  'studio-local-optimized': 'border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]',
  'cloud-render-grade': 'border-[color-mix(in_srgb,var(--aethel-primary)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] text-[var(--aethel-primary-light)]',
}

type ViewportAssetQualityCardProps = {
  asset: ViewportAssetImportMetadata
}

export function ViewportAssetQualityCard({ asset }: ViewportAssetQualityCardProps) {
  const [planExpanded, setPlanExpanded] = useState(false)
  const pipeline = buildGameAssetQualityPipeline()
  const tier = inferViewportAssetQualityTier(asset)
  const lane = pipeline.lanes.find((candidate) => candidate.tier === tier)
  const readiness = evaluateGameAssetQualityReadiness({
    tier,
    evidenceRefs: buildViewportAssetQualityEvidenceRefs(asset),
  })
  const upgradePlan = buildQualityOrchestrationPlan({
    goal: `Plan quality upgrade for ${asset.fileName}`,
    domain: tier === 'ai-draft' ? 'asset' : 'character',
    targetQuality: nextQualityUpgradeLane(tier),
    budgetUsd: 5,
    runtimeCapabilities: {
      'license-provenance-scanner': asset.licenseStatus === 'approved',
    },
    evidenceRefs: buildViewportAssetQualityEvidenceRefs(asset),
    assetMetadata: {
      fileName: asset.fileName,
      licenseStatus: asset.licenseStatus,
      qualityTier: tier,
      triangleBudgetEstimate: lane?.maxPreviewTriangles,
    },
  })
  const missingPreview = readiness.missingEvidence.slice(0, 4)
  const upgradeBlocked = upgradePlan.status === 'blocked' || upgradePlan.status === 'held'

  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">Asset Quality</p>
          <p className="truncate font-medium text-[var(--aethel-text-primary)]">{asset.fileName}</p>
          <p className="mt-1 text-[var(--aethel-text-secondary)]">
            {asset.format.toUpperCase()} - {formatViewportAssetSize(asset.sizeBytes)}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${tierTone[tier]}`}>
          <Sparkles className="h-3 w-3" />
          {lane?.label ?? tier}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-[11px] text-[var(--aethel-text-secondary)]">
        <p>
          License: <span className="font-medium text-[var(--aethel-warning-light)]">{asset.licenseStatus}</span>
        </p>
        <p>
          Runtime lane: <span className="font-medium text-[var(--aethel-text-primary)]">{lane?.runtimeTargets.join(' + ') ?? 'held'}</span>
        </p>
        <p>
          Hero budget: <span className="font-medium text-[var(--aethel-text-primary)]">{lane ? lane.maxHeroTriangles.toLocaleString('en-US') : 'held'} tris</span>
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] p-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--aethel-text-primary)]">
          {readiness.state === 'held' ? <ShieldAlert className="h-3.5 w-3.5 text-[var(--aethel-warning-light)]" /> : <BadgeCheck className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" />}
          {readiness.state === 'held' ? 'Quality upgrade held' : 'Ready for art-direction review'}
        </div>
        <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">{readiness.nextAction}</p>
        {missingPreview.length > 0 ? (
          <ul className="mt-2 space-y-1 text-[10px] text-[var(--aethel-text-quaternary)]">
            {missingPreview.map((item) => (
              <li key={item}>Missing: {item}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
              Upgrade plan
            </p>
            <p className="mt-1 text-[11px] text-[var(--aethel-text-primary)]">
              {upgradePlan.recommendedLane} - ${upgradePlan.estimatedCostUsd.toFixed(2)} - {upgradePlan.estimatedMinutes} min
            </p>
            <p className="mt-1 text-[10px] text-[var(--aethel-text-tertiary)]">
              Source lane: {upgradePlan.assetSourcingPlan.recommendedLane}; {upgradePlan.assetSourcingPlan.status}.
            </p>
          </div>
          <button
            type="button"
            disabled={upgradeBlocked}
            onClick={() => setPlanExpanded((value) => !value)}
            className="rounded-lg border border-[var(--aethel-border-subtle)] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-secondary)] disabled:cursor-not-allowed disabled:opacity-55"
            title={upgradePlan.nextAction}
          >
            Plan quality upgrade
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">{upgradePlan.nextAction}</p>
        <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-[var(--aethel-text-quaternary)]">
          <span>{upgradePlan.copy.draftWarning}</span>
          <span>{upgradePlan.copy.studioLocal}</span>
          <span>{upgradePlan.copy.cloudCost}</span>
          <span>{upgradePlan.copy.humanReview}</span>
        </div>
        {planExpanded ? (
          <ul className="mt-2 space-y-1 text-[10px] text-[var(--aethel-text-quaternary)]">
            {upgradePlan.requiredCapabilities.map((capability) => (
              <li key={capability}>Capability: {capability}</li>
            ))}
            {upgradePlan.missingEvidence.slice(0, 4).map((item) => (
              <li key={item}>Evidence: {item}</li>
            ))}
            {upgradePlan.assetSourcingPlan.searchQueries.slice(0, 2).map((query) => (
              <li key={query}>Search: {query}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-[var(--aethel-text-quaternary)]">
        <span>Draft</span>
        <ArrowRight className="h-3 w-3" />
        <span>Curated</span>
        <ArrowRight className="h-3 w-3" />
        <span>Optimized</span>
        <ArrowRight className="h-3 w-3" />
        <span>Render grade</span>
      </div>
      <p className="mt-2 truncate text-[10px] text-[var(--aethel-text-quaternary)]">{asset.evidenceRef}</p>
    </div>
  )
}
