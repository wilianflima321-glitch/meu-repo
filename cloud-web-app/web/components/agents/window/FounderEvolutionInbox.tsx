'use client'

/**
 * Letter cx — Founder Evolution Inbox (IDE only / Zero-UI in game).
 * Approve/reject weekly Master Plan evolution proposals in Studio war room.
 */

import { useCallback, useMemo, useState } from 'react'
import { Check, RefreshCw, X } from 'lucide-react'

import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import { cn } from '@/lib/utils'
import {
  approveEvolutionProposal,
  listEvolutionProposals,
  proposeWeeklyEvolution,
  rejectEvolutionProposal,
  type WeeklyEvolutionProposal,
} from '@/lib/production/weekly-evolution-planner'
import { buildQualityCompetitorRadar } from '@/lib/production/quality-competitor-radar'
import { probeFinOpsFounderHonesty } from '@/lib/production/finops-founder-honesty'
import { DOMAIN_ECONOMIC_ROUTER_WIRED } from '@/lib/ai/domain-economic-router-policy'
import { WEEKLY_EVOLUTION_WIRED } from '@/lib/production/weekly-evolution-planner'

type FounderEvolutionInboxProps = {
  projectId: string
  focusClass?: string
  className?: string
}

function syncProposals(projectId: string): WeeklyEvolutionProposal[] {
  return listEvolutionProposals(projectId)
}

export function FounderEvolutionInbox({
  projectId,
  focusClass = `${CANONICAL_FOCUS} ${CANONICAL_MOTION}`,
  className,
}: FounderEvolutionInboxProps) {
  const [tick, setTick] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const proposals = useMemo(() => {
    void tick
    return syncProposals(projectId)
  }, [projectId, tick])

  const honesty = useMemo(() => probeFinOpsFounderHonesty(), [])
  const radar = useMemo(
    () =>
      buildQualityCompetitorRadar({
        domainEconomicRouterWired: DOMAIN_ECONOMIC_ROUTER_WIRED,
        weeklyEvolutionWired: WEEKLY_EVOLUTION_WIRED,
        finOpsWired: true,
      }),
    [],
  )

  const refresh = useCallback(() => {
    setError(null)
    setTick((n) => n + 1)
  }, [])

  const seedDemoProposal = useCallback(() => {
    const result = proposeWeeklyEvolution({
      projectId,
      title: 'Root-cause: consolidate CostGuard lanes for UI vs kernel',
      rootCause: 'cost-burn-misroute',
      rationale:
        'Repeated hot-fixes burn Opus on panel polish. Evolve Master Plan to enforce Sonnet UI lane and Grok/Opus kernel lane with settle:0 on reject.',
      targetPaths: [
        'cloud-web-app/web/lib/ai/domain-economic-router-policy.ts',
        'cloud-web-app/web/lib/production/autonomous-engineer-loop.ts',
      ],
      domain: 'deep-refactor',
      contextPackId: 'l14-finops-cx',
      estimatedTokenWeight: 12_000,
    })
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setError(null)
    setTick((n) => n + 1)
  }, [projectId])

  const onApprove = useCallback(
    (proposalId: string) => {
      approveEvolutionProposal(proposalId)
      setTick((n) => n + 1)
    },
    [],
  )

  const onReject = useCallback((proposalId: string) => {
    rejectEvolutionProposal(proposalId)
    setTick((n) => n + 1)
  }, [])

  return (
    <div
      className={cn('flex h-full min-h-0 flex-col gap-3 overflow-auto p-3', className)}
      data-evidence-source="forge/finops-founder-evolution"
      data-letter="cx"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
            Founder God Mode · letter cx
          </p>
          <h2 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
            Evolution inbox
          </h2>
          <p className="mt-1 max-w-prose text-[11px] text-[var(--aethel-text-muted)]">
            Weekly Master Plan proposals (root-cause, not band-aids). War room = Studio Agents —
            not an orphan admin dashboard. Hot-fix is event-driven; no 24/7 Opus polling.
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className={cn(
              'rounded-lg border border-[var(--aethel-border-subtle)] px-2 py-1.5 text-[10px] text-[var(--aethel-text-secondary)]',
              focusClass,
            )}
            onClick={refresh}
          >
            <RefreshCw className="mr-1 inline h-3 w-3" aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            className={cn(
              'rounded-lg bg-[var(--aethel-surface-elevated)] px-2 py-1.5 text-[10px] font-semibold text-[var(--aethel-text-primary)]',
              focusClass,
            )}
            onClick={seedDemoProposal}
          >
            Propose sample
          </button>
        </div>
      </header>

      <div className="grid gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-3 sm:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Cadence</p>
          <p className="text-[11px] text-[var(--aethel-text-primary)]">Hot-fix event · Weekly evolution</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Router</p>
          <p className="text-[11px] text-[var(--aethel-text-primary)]">UI→Sonnet · Kernel→Grok/Opus</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Honesty</p>
          <p className="text-[11px] text-[var(--aethel-text-primary)]">
            L1 sandbox HELD · FPS claims HELD
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)]" role="alert">
          {error} (settle:0)
        </p>
      ) : null}

      <section aria-label="Evolution proposals" className="flex min-h-0 flex-1 flex-col gap-2">
        {proposals.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--aethel-border-subtle)] px-3 py-6 text-center text-[11px] text-[var(--aethel-text-muted)]">
            No weekly evolution proposals yet. L.6 AutonomousEngineerLoop proposes root-cause
            refactors here for Founder approve/reject.
          </p>
        ) : (
          proposals.map((p) => (
            <article
              key={p.proposalId}
              className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--aethel-text-primary)]">{p.title}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                    {p.rootCause} · {p.status} · {p.domain}
                  </p>
                </div>
                {p.status === 'proposed' ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg bg-[var(--aethel-surface-elevated)] px-2 py-1 text-[10px] font-semibold text-[var(--aethel-text-primary)]',
                        focusClass,
                      )}
                      onClick={() => onApprove(p.proposalId)}
                    >
                      <Check className="h-3 w-3" aria-hidden />
                      Approve
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] text-[var(--aethel-text-secondary)]',
                        focusClass,
                      )}
                      onClick={() => onReject(p.proposalId)}
                    >
                      <X className="h-3 w-3" aria-hidden />
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-[11px] text-[var(--aethel-text-muted)]">{p.rationale}</p>
              <p className="mt-2 font-mono text-[10px] text-[var(--aethel-text-quaternary)]">
                {p.targetPaths.join(' · ')}
              </p>
            </article>
          ))
        )}
      </section>

      <section
        aria-label="Quality vs competitor radar"
        className="rounded-xl border border-[var(--aethel-border-subtle)] p-3"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
          Quality radar (honest)
        </p>
        <p className="mt-1 text-[10px] text-[var(--aethel-text-muted)]">{radar.claim}</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {radar.axes.map((axis) => (
            <li
              key={axis.axis}
              className="flex items-center justify-between rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] px-2 py-1.5 text-[10px]"
            >
              <span className="text-[var(--aethel-text-secondary)]">{axis.axis}</span>
              <span className="text-[var(--aethel-text-primary)]">
                {axis.status} · {axis.score}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-[var(--aethel-text-quaternary)]">
          {honesty.notes[0]} · continuous Opus polling forbidden
        </p>
      </section>
    </div>
  )
}

export default FounderEvolutionInbox
