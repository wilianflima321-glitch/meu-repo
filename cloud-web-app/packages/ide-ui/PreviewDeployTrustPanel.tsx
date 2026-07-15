'use client'

import type {
  PreviewDeployReadiness,
  PreviewReviewTarget,
} from '../../web/components/preview/previewDeployTrust'
import {
  previewToolbarButtonInfo,
  previewToolbarButtonSecondary,
  previewToolbarButtonSuccess,
  ToolbarChip,
} from './PreviewRuntimeToolbar.types'

export function PreviewDeployTrustPanel({
  deployReadiness,
  deployStateClass,
  deployStatusLabel,
  deployHint,
  qaBlockerSummary,
  reviewTarget,
  reviewTargetBadge,
  reviewTargetToneClass,
  reviewActionLabel,
  deployFeedback,
  deployStatusHref,
  deployUrl,
  evidenceHref,
  isDeploySubmitting,
  isDeployRefreshing,
  onStartDeploy,
  onOpenDeployStatus,
  onOpenDeploySite,
  onCopyShareLink,
  onRefreshDeploy,
}: {
  deployReadiness: PreviewDeployReadiness | null
  deployStateClass: string
  deployStatusLabel: string
  deployHint: string
  qaBlockerSummary: string | null
  reviewTarget: PreviewReviewTarget | null
  reviewTargetBadge: string | null
  reviewTargetToneClass: string
  reviewActionLabel: string
  deployFeedback: string | null
  deployStatusHref: string | null
  deployUrl: string | null
  evidenceHref: string
  isDeploySubmitting: boolean
  isDeployRefreshing: boolean
  onStartDeploy: () => void
  onOpenDeployStatus: () => void
  onOpenDeploySite: () => void
  onCopyShareLink: () => void
  onRefreshDeploy: () => void
}) {
  const deployReadyTone =
    deployReadiness?.canDeploy === false
      ? 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]'
      : 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]'

  return (
    <details className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
            Publish
          </span>
          <ToolbarChip toneClass={deployStateClass}>{deployStatusLabel}</ToolbarChip>
          <ToolbarChip toneClass={deployReadyTone}>
            {deployReadiness?.canDeploy === false ? 'Deploy blocked' : 'Deploy ready'}
          </ToolbarChip>
        </span>
        <span className="text-[10px] font-medium text-[var(--aethel-text-quaternary)]">
          Receipts
        </span>
      </summary>
      <div className="border-t border-[var(--aethel-border-primary)] px-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[220px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {qaBlockerSummary ? (
                <ToolbarChip toneClass="border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]">
                  QA: {qaBlockerSummary}
                </ToolbarChip>
              ) : null}
              {reviewTarget && reviewTargetBadge ? (
                <ToolbarChip toneClass={reviewTargetToneClass}>
                  {reviewTargetBadge}: {reviewTarget.label}
                </ToolbarChip>
              ) : null}
            </div>
            <div className="mt-1.5 text-[10px] leading-4 text-[var(--aethel-text-tertiary)]">
              {reviewTarget?.summary ?? deployHint}
            </div>
            {deployFeedback ? (
              <div className="mt-1.5 text-[10px] text-[var(--aethel-text-secondary)]">{deployFeedback}</div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onStartDeploy}
              disabled={isDeploySubmitting || deployReadiness?.canDeploy === false}
              aria-label="Create deploy from preview lane"
              className={previewToolbarButtonSuccess}
            >
              {isDeploySubmitting ? 'Publishing...' : 'Deploy now'}
            </button>
            <a
              href={evidenceHref}
              aria-label="Open evidence package for this preview"
              className={previewToolbarButtonInfo}
            >
              Review package
            </a>
            <details className="relative">
              <summary className={previewToolbarButtonSecondary}>Deploy tools</summary>
              <div className="absolute right-0 z-20 mt-2 grid min-w-44 gap-2 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-2 shadow-[0_22px_70px_rgba(2,8,23,0.36)]">
                {deployStatusHref ? (
                  <button
                    type="button"
                    onClick={onOpenDeployStatus}
                    aria-label="Open deploy status page"
                    className={previewToolbarButtonSecondary}
                  >
                    Status
                  </button>
                ) : null}
                {deployUrl ? (
                  <button
                    type="button"
                    onClick={onOpenDeploySite}
                    aria-label="Open deployed site"
                    className={previewToolbarButtonSecondary}
                  >
                    Open deploy
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onCopyShareLink}
                  disabled={!reviewTarget?.href}
                  aria-label={reviewActionLabel}
                  className={previewToolbarButtonSecondary}
                >
                  {reviewActionLabel}
                </button>
                {deployStatusHref ? (
                  <button
                    type="button"
                    onClick={onRefreshDeploy}
                    disabled={isDeployRefreshing}
                    aria-label="Refresh deploy status"
                    className={previewToolbarButtonSecondary}
                  >
                    {isDeployRefreshing ? 'Refreshing...' : 'Refresh deploy'}
                  </button>
                ) : null}
              </div>
            </details>
          </div>
        </div>
      </div>
    </details>
  )
}
