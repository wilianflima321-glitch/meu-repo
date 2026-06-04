'use client'

import {
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Eye,
  Film,
  Layers3,
  Play,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

type ShotStatus = 'reviewed' | 'render-held' | 'draft'
type QualityLane = 'preview' | 'cinematic-review' | 'release-gate'

interface Shot {
  id: string
  title: string
  status: ShotStatus
  continuityScore: number
  qualityLane: QualityLane
  evidenceRefs: string[]
  nextAction: string
}

const SHOTS: Shot[] = [
  {
    id: '01',
    title: 'Opening corridor reveal',
    status: 'reviewed',
    continuityScore: 0.98,
    qualityLane: 'release-gate',
    evidenceRefs: ['shot-continuity-01', 'lighting-match-01'],
    nextAction: 'Lock edit after human review',
  },
  {
    id: '02',
    title: 'Realtime combat beat',
    status: 'render-held',
    continuityScore: 0.92,
    qualityLane: 'cinematic-review',
    evidenceRefs: ['animation-blocking-02', 'perf-trace-needed'],
    nextAction: 'Request Studio Local render evidence',
  },
  {
    id: '03',
    title: 'Environment exploration pass',
    status: 'draft',
    continuityScore: 0.64,
    qualityLane: 'preview',
    evidenceRefs: ['layout-draft-03'],
    nextAction: 'Validate camera path and asset provenance',
  },
]

const STATUS_COPY: Record<ShotStatus, { label: string; className: string }> = {
  reviewed: {
    label: 'reviewed',
    className:
      'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_14%,transparent)] text-[var(--aethel-success)]',
  },
  'render-held': {
    label: 'render held',
    className:
      'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_14%,transparent)] text-[var(--aethel-warning-light)]',
  },
  draft: {
    label: 'draft',
    className:
      'border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)]',
  },
}

const QUALITY_COPY: Record<QualityLane, string> = {
  preview: 'Browser preview',
  'cinematic-review': 'Cinematic review',
  'release-gate': 'Release gate',
}

const READINESS_ITEMS = [
  { label: 'Continuity', value: '3 shots tracked', icon: Film },
  { label: 'Render evidence', value: 'Studio Local required', icon: Clock3 },
  { label: 'Release state', value: 'Human review required', icon: ShieldCheck },
]

function StatusPill({ status }: { status: ShotStatus }) {
  const copy = STATUS_COPY[status]
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${copy.className}`}>
      {copy.label}
    </span>
  )
}

function EvidenceList({ refs }: { refs: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {refs.map(ref => (
        <span
          key={ref}
          className="rounded-md border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2 py-1 text-[10px] font-medium text-[var(--aethel-text-quaternary)]"
        >
          {ref}
        </span>
      ))}
    </div>
  )
}

function ShotCard({ shot }: { shot: Shot }) {
  return (
    <article className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4 shadow-sm shadow-black/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2 py-1 text-[11px] font-bold text-[var(--aethel-text-tertiary)]">
              {shot.id}
            </span>
            <h3 className="truncate text-sm font-semibold text-[var(--aethel-text-primary)]">{shot.title}</h3>
          </div>
          <p className="text-xs text-[var(--aethel-text-quaternary)]">{shot.nextAction}</p>
        </div>
        <StatusPill status={shot.status} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
            <span>Continuity</span>
            <span>{Math.round(shot.continuityScore * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--aethel-surface-tertiary)]">
            <div
              className="h-full rounded-full bg-[var(--aethel-success)]"
              style={{ width: `${Math.round(shot.continuityScore * 100)}%` }}
            />
          </div>
          <EvidenceList refs={shot.evidenceRefs} />
        </div>
        <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">Quality lane</p>
          <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-secondary)]">{QUALITY_COPY[shot.qualityLane]}</p>
        </div>
      </div>
    </article>
  )
}

export default function DirectorMode() {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[var(--aethel-surface-primary)] p-5 text-[var(--aethel-text-primary)]">
      <header className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] p-2">
              <Clapperboard className="h-5 w-5 text-[var(--aethel-info-light)]" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-quaternary)]">Director Mode</p>
              <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Cinematic review board</h2>
              <p className="mt-1 max-w-2xl text-sm text-[var(--aethel-text-tertiary)]">
                Review shots, continuity, receipts, and render status before any release-quality claim.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" icon={<Eye className="h-3.5 w-3.5" />}>
              Preview
            </Button>
            <Button type="button" variant="primary" size="sm" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              Validate continuity
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {READINESS_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
                <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-secondary)]">{item.value}</p>
              </div>
            )
          })}
        </div>
      </header>

      <section className="mt-4 space-y-3" aria-label="Director shot timeline">
        {SHOTS.map(shot => (
          <ShotCard key={shot.id} shot={shot} />
        ))}
      </section>

      <footer className="mt-4 grid gap-3 rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4 md:grid-cols-3">
        <button type="button" className="flex items-center gap-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-3 text-left hover:border-[var(--aethel-border-primary)]">
          <Layers3 className="h-4 w-4 text-[var(--aethel-info-light)]" />
          <span>
            <span className="block text-sm font-semibold text-[var(--aethel-text-secondary)]">Shot layers</span>
            <span className="block text-xs text-[var(--aethel-text-quaternary)]">Camera, audio, assets</span>
          </span>
        </button>
        <button type="button" className="flex items-center gap-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-3 text-left hover:border-[var(--aethel-border-primary)]">
          <AlertCircle className="h-4 w-4 text-[var(--aethel-warning-light)]" />
          <span>
            <span className="block text-sm font-semibold text-[var(--aethel-text-secondary)]">Release holds</span>
            <span className="block text-xs text-[var(--aethel-text-quaternary)]">Runtime and approvals</span>
          </span>
        </button>
        <button type="button" className="flex items-center gap-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-3 text-left hover:border-[var(--aethel-border-primary)]">
          <CheckCircle2 className="h-4 w-4 text-[var(--aethel-success)]" />
          <span>
            <span className="block text-sm font-semibold text-[var(--aethel-text-secondary)]">Evidence packet</span>
            <span className="block text-xs text-[var(--aethel-text-quaternary)]">Ready for review</span>
          </span>
        </button>
      </footer>
    </div>
  )
}
