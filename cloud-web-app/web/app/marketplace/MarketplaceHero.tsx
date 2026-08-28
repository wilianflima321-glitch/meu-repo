'use client'

import {
  Boxes,
  Cpu,
  Layers,
  Lock,
  Package,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'

export function MarketplaceHero() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-8 shadow-[var(--aethel-shadow-xl)] backdrop-blur-xl lg:p-10">
        {/* Background ambient lighting mesh */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_10%,transparent)] blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_12%,transparent)] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--aethel-neon-cyan)] shadow-sm">
            <ShieldCheck className="h-4 w-4" /> Universal Asset & Extension Depot
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl font-extrabold tracking-[-0.03em] text-[var(--aethel-text-primary)] sm:text-5xl">
            Verified Assets, Tools & Extensions.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--aethel-text-secondary)] sm:text-base">
            Every package is verified for cryptographic provenance, permission scopes, and zero-stutter engine integration.
          </p>

          {/* Quick Stats / Highlights Bar */}
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[var(--aethel-border-subtle)] pt-6 sm:grid-cols-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--aethel-text-primary)]">
                <ShieldCheck className="h-4 w-4 text-[var(--aethel-success-light)]" />
                <span>Audited Integrity</span>
              </div>
              <p className="text-[11px] text-[var(--aethel-text-tertiary)]">Strict manifest review</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--aethel-text-primary)]">
                <Boxes className="h-4 w-4 text-[var(--aethel-primary-light)]" />
                <span>Instant Studio Inject</span>
              </div>
              <p className="text-[11px] text-[var(--aethel-text-tertiary)]">Zero-copy asset depot</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--aethel-text-primary)]">
                <Zap className="h-4 w-4 text-[var(--aethel-neon-cyan)]" />
                <span>WASM / Native wgpu</span>
              </div>
              <p className="text-[11px] text-[var(--aethel-text-tertiary)]">Universal runtime ready</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--aethel-text-primary)]">
                <Lock className="h-4 w-4 text-[var(--aethel-warning-light)]" />
                <span>Rollback Guarantee</span>
              </div>
              <p className="text-[11px] text-[var(--aethel-text-tertiary)]">Deterministic rollback</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
