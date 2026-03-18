'use client'

import Link from 'next/link'
import { ArrowLeft, Gamepad2, Cpu, Box, Volume2, Trophy, Download } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

const GAME_CAPABILITIES = [
  {
    icon: Box,
    title: 'AI-Assisted Asset Generation',
    description: 'Generate 3D models, textures, and sprites using AI. Meshy 3D integration for real-time asset creation.',
    status: 'available',
  },
  {
    icon: Cpu,
    title: 'Physics Engine (Rapier)',
    description: 'WASM-based physics with @dimforge/rapier3d-compat. Rigid bodies, collisions, and constraints.',
    status: 'available',
  },
  {
    icon: Gamepad2,
    title: 'Scene Preview',
    description: 'Real-time 3D scene preview with Three.js. Live editing and hot reload for immediate feedback.',
    status: 'available',
  },
  {
    icon: Volume2,
    title: 'Web Audio API',
    description: 'Spatial audio, sound effects, and music generation for immersive game experiences.',
    status: 'experimental',
  },
  {
    icon: Trophy,
    title: 'Gameplay QA Loop',
    description: 'Automated validators for soft-lock detection, pacing analysis, and balance checking.',
    status: 'experimental',
  },
  {
    icon: Download,
    title: 'Export Pipeline',
    description: 'Export to HTML5 for web deployment. itch.io integration for publishing.',
    status: 'experimental',
  },
]

export default function GamesDocsPage() {
  return (
    <div className="min-h-screen bg-black text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-12 pb-20">
        <Link href="/docs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Back to Docs
        </Link>

        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--aethel-success)]">
          L2 Experimental
        </div>
        <h1 className="text-4xl font-bold">Games Module</h1>
        <p className="mt-3 text-lg text-zinc-400">
          Build games with AI assistance. From 2D platformers to 3D experiences, Aethel provides
          code-based logic generation, physics, and asset pipelines.
        </p>

        <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_5%,transparent)] p-4 text-sm text-[var(--aethel-warning-light)]">
          <strong>Current Maturity: L2 Experimental.</strong> Claims allowed: AI-assisted asset generation,
          scene preview, code-based logic generation. Advanced features are under active development.
        </div>

        <h2 className="mt-10 text-2xl font-semibold">Capabilities</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {GAME_CAPABILITIES.map((cap) => {
            const Icon = cap.icon
            return (
              <div key={cap.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="h-5 w-5 text-[var(--aethel-success)]" />
                  <h3 className="font-semibold">{cap.title}</h3>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${
                    cap.status === 'available' ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success)]' : 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]'
                  }`}>
                    {cap.status}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">{cap.description}</p>
              </div>
            )
          })}
        </div>

        <h2 className="mt-10 text-2xl font-semibold">Quick Start</h2>
        <div className="mt-4 rounded-xl border border-white/10 bg-zinc-900/50 p-6 font-mono text-sm text-zinc-300">
          <p className="text-zinc-500"># Create a new game project</p>
          <p>1. Go to /dashboard and click &quot;New Project&quot;</p>
          <p>2. Select &quot;Games&quot; domain</p>
          <p>3. Choose a template (e.g., 2D Platformer)</p>
          <p>4. Use the AI chat to describe your game logic</p>
          <p>5. Preview in real-time with the 3D/2D preview panel</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
