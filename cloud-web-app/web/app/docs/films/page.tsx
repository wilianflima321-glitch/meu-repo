'use client'

import Link from 'next/link'
import { ArrowLeft, Film, Camera, Scissors, Palette, Clock, Download } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const FILM_CAPABILITIES = [
  {
    icon: Film,
    title: 'Storyboarding Assistance',
    description: 'AI-generated storyboards from script descriptions. Visual shot planning with automated layout.',
    status: 'available',
  },
  {
    icon: Camera,
    title: 'Shot Description Generation',
    description: 'Detailed shot descriptions including camera angles, lighting, and composition from natural language.',
    status: 'available',
  },
  {
    icon: Palette,
    title: 'Static Asset Preview',
    description: 'Preview generated visual assets in context. Scene composition visualization.',
    status: 'available',
  },
  {
    icon: Scissors,
    title: 'NLE Timeline',
    description: 'Basic non-linear editing timeline. Visual trim, transitions, and shot ordering.',
    status: 'experimental',
  },
  {
    icon: Clock,
    title: 'Continuity Engine',
    description: 'Character identity and prop continuity tracking across scenes. Shot coherence validation.',
    status: 'experimental',
  },
  {
    icon: Download,
    title: 'Video Export',
    description: 'Export to MP4 via server-side ffmpeg. Post-process quality gates for technical validation.',
    status: 'planned',
  },
]

export default function FilmsDocsPage() {
  return (
    <div className="min-h-screen bg-black text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-12 pb-20">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Back to Docs
        </Link>

        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
          L2 Experimental
        </div>
        <h1 className="text-4xl font-bold">Films Module</h1>
        <p className="mt-3 text-lg text-zinc-400">
          AI-assisted filmmaking tools. From storyboarding to shot descriptions and basic NLE capabilities.
        </p>

        <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_5%,transparent)] p-4 text-sm text-[var(--aethel-warning-light)]">
          <strong>Current Maturity: L2 Experimental.</strong> Claims allowed: Storyboarding assistance,
          shot description generation, static asset preview. Video generation and NLE are under development.
        </div>

        <h2 className="mt-10 text-2xl font-semibold">Capabilities</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {FILM_CAPABILITIES.map((cap) => {
            const Icon = cap.icon
            return (
              <div key={cap.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="h-5 w-5 text-purple-400" />
                  <h3 className="font-semibold">{cap.title}</h3>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${
                    cap.status === 'available' ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success)]' :
                    cap.status === 'experimental' ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]' :
                    'bg-zinc-500/20 text-zinc-400'
                  }`}>
                    {cap.status}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">{cap.description}</p>
              </div>
            )
          })}
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
