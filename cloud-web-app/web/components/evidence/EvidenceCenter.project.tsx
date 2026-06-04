'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ProductionBiblePlanSummary } from './EvidenceCenter.types'

type EvidenceProjectReceiptsPanelProps = {
  projectName: string
  objective: string
  isReady: boolean
  creativeStyle: string
  creativeTone: string
  preferredTarget: string
  fallbackTarget: string
  maxConcurrentHeavyJobs: number
  productionBiblePlan: ProductionBiblePlanSummary | null
  nextAction: string
  needsHumanApproval: boolean
}

export function EvidenceProjectReceiptsPanel({
  projectName,
  objective,
  isReady,
  creativeStyle,
  creativeTone,
  preferredTarget,
  fallbackTarget,
  maxConcurrentHeavyJobs,
  productionBiblePlan,
  nextAction,
  needsHumanApproval,
}: EvidenceProjectReceiptsPanelProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
              Project context
            </p>
            <h2 className="mt-1 text-xl font-semibold">{projectName}</h2>
          </div>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            {isReady ? 'Ready' : 'Needs work'}
          </span>
        </div>
        <p className="mt-4 text-sm leading-7 text-[var(--aethel-text-secondary)]">
          {objective}
        </p>
        <details className="mt-5 rounded-lg border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.16)] p-3">
          <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--aethel-text-secondary)]">
            Project rules
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--aethel-border-subtle)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                Creative direction
              </p>
              <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
                {creativeStyle}
              </p>
              <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
                {creativeTone}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--aethel-border-subtle)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                Execution target
              </p>
              <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
                Preferred {preferredTarget}; fallback {fallbackTarget}
              </p>
              <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
                Max heavy jobs: {maxConcurrentHeavyJobs}
              </p>
            </div>
          </div>
        </details>
        {productionBiblePlan ? (
          <div className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_22%,var(--aethel-border-subtle))] bg-[color-mix(in_srgb,var(--aethel-primary)_7%,transparent)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-primary-light)]">
                Production plan preview
              </p>
              <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                {productionBiblePlan.releaseState}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">
              {productionBiblePlan.uxDisclosure}
            </p>
            <details className="mt-3 rounded-lg border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.16)] p-2">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-semibold text-[var(--aethel-text-secondary)]">
                <span>Open production plan details</span>
                <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                  {productionBiblePlan.productionGraphs.slice(0, 6).length}{' '}
                  checks
                </span>
              </summary>
              <div className="mt-3 space-y-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">
                <p>
                  Genre: {productionBiblePlan.genrePack.label} |{' '}
                  {productionBiblePlan.genrePack.cameraModel} |{' '}
                  {productionBiblePlan.genrePack.inputModel}
                </p>
                <p>
                  Core loop:{' '}
                  {productionBiblePlan.genrePack.coreLoop
                    .slice(0, 5)
                    .join(' -> ')}
                </p>
                <p>
                  Playtest: {productionBiblePlan.playtestSpine.state};{' '}
                  {productionBiblePlan.playtestSpine.scenarios.length}{' '}
                  scenario(s), human review required.
                </p>
                <p>
                  Cinematic checks:{' '}
                  {productionBiblePlan.cinematicEvidence.state};{' '}
                  {productionBiblePlan.cinematicEvidence.lanes.length} lane(s),{' '}
                  {productionBiblePlan.cinematicEvidence.copy.cloudCost}.
                </p>
                <p>
                  Plan pillars:{' '}
                  {productionBiblePlan.productionBible.pillars
                    .slice(0, 5)
                    .join(', ')}
                  . {productionBiblePlan.productionBible.firstUserDecision}
                </p>
                <p>
                  Scene plan:{' '}
                  {productionBiblePlan.productionBible.deepBible.scenes.length}{' '}
                  scene beats,{' '}
                  {
                    productionBiblePlan.productionBible.deepBible.characters
                      .length
                  }{' '}
                  character notes,{' '}
                  {
                    productionBiblePlan.productionBible.deepBible.evidenceModel
                      .requiredEvidence.length
                  }{' '}
                  checks.
                </p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {productionBiblePlan.productionGraphs
                  .slice(0, 6)
                  .map((graph) => (
                    <div
                      key={graph.id}
                      className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.18)] p-2"
                    >
                      <p className="text-xs font-semibold text-[var(--aethel-text-primary)]">
                        {graph.id}
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">
                        {graph.userValue}
                      </p>
                    </div>
                  ))}
              </div>
            </details>
            <p className="mt-3 text-[11px] text-[var(--aethel-warning-light)]">
              {productionBiblePlan.nextAction}
            </p>
          </div>
        ) : null}
      </div>
      <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
          Next action
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
          {nextAction}
        </p>
        <div className="mt-4 rounded-2xl border border-[var(--aethel-border-subtle)] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
            Human approval
          </p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--aethel-text-secondary)]">
            {needsHumanApproval ? (
              <AlertTriangle className="h-4 w-4 text-[var(--aethel-warning-light)]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[var(--aethel-success-light)]" />
            )}
            {needsHumanApproval
              ? 'Review required before execution'
              : 'No blocking approval required'}
          </p>
        </div>
      </div>
    </section>
  )
}
