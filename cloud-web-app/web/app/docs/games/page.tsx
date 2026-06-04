'use client'

import Link from 'next/link'
import { ArrowLeft, Gamepad2, Cpu, Box, Volume2, Trophy, Download } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const GAME_CAPABILITIES = [
  {
    icon: Box,
    title: 'Asset Intake',
    description: 'Prepare, review, and track game assets before use.',
    status: 'needs-review',
  },
  {
    icon: Cpu,
    title: 'Physics Engine (Rapier)',
    description: 'Collision and motion support for playable previews.',
    status: 'available',
  },
  {
    icon: Gamepad2,
    title: 'Scene Preview',
    description: 'Inspect scenes while editing gameplay logic.',
    status: 'available',
  },
  {
    icon: Volume2,
    title: 'Audio Pass',
    description: 'Track sound, music, and spatial-audio notes.',
    status: 'experimental',
  },
  {
    icon: Trophy,
    title: 'Gameplay QA Loop',
    description: 'Catch soft-lock, pacing, and balance risks.',
    status: 'experimental',
  },
  {
    icon: Download,
    title: 'Export Pipeline',
    description: 'Package only after checks pass.',
    status: 'experimental',
  },
]

export default function GamesDocsPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-12 pb-20">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]">
          <ArrowLeft className="h-4 w-4" /> Back to Docs
        </Link>

        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--aethel-success)]">
          L2 Experimental
        </div>
        <h1 className="text-4xl font-bold">Games Module</h1>
        <p className="mt-3 text-lg text-[var(--aethel-text-tertiary)]">
          Build playable prototypes with code, assets, physics, and review gates.
        </p>

        <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_5%,transparent)] p-4 text-sm text-[var(--aethel-warning-light)]">
          <strong>L2 Experimental.</strong> Game work stays gated by asset, runtime, and playtest evidence.
        </div>

        <h2 className="mt-10 text-2xl font-semibold">Capabilities</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {GAME_CAPABILITIES.map((cap) => {
            const Icon = cap.icon
            return (
              <div key={cap.title} className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="h-5 w-5 text-[var(--aethel-success)]" />
                  <h3 className="font-semibold">{cap.title}</h3>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${
                    cap.status === 'available' ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success)]' : 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]'
                  }`}>
                    {cap.status}
                  </span>
                </div>
                <p className="text-sm text-[var(--aethel-text-tertiary)]">{cap.description}</p>
              </div>
            )
          })}
        </div>

        <details className="mt-10 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] p-5">
          <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--aethel-text-primary)]">Game setup path</summary>
          <div className="mt-4 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-4 font-mono text-sm text-[var(--aethel-text-secondary)]">
            <p>1. Start from Dashboard or Studio.</p>
            <p>2. Choose Games.</p>
            <p>3. Add logic, assets, and preview checks.</p>
            <p>4. Promote only after QA evidence.</p>
          </div>
        </details>
      </main>
      <PublicFooter />
    </div>
  )
}
