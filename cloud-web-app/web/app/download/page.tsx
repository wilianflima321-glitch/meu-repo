'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Cpu, Download, Gauge, HardDrive, Monitor, ShieldCheck, Sparkles, TerminalSquare, Zap } from 'lucide-react'
import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'

type Platform = 'windows' | 'mac' | 'linux'

type RuntimeTarget = {
  label: string
  detail: string
  status: 'ready' | 'beta' | 'planned'
}

const PLATFORMS: Record<Platform, {
  name: string
  artifact: string
  requirements: string
  command: string
}> = {
  windows: {
    name: 'Windows',
    artifact: 'Aethel-Studio-Local-Setup.exe',
    requirements: 'Windows 10+ x64, WebView2, Node 20+, optional NVIDIA/AMD GPU',
    command: 'powershell -ExecutionPolicy Bypass -File installers/windows/install-aethel.ps1',
  },
  mac: {
    name: 'macOS',
    artifact: 'Aethel-Studio-Local-universal.dmg',
    requirements: 'macOS 12+, Apple Silicon or Intel, Metal-capable GPU',
    command: 'cargo tauri build --target universal-apple-darwin',
  },
  linux: {
    name: 'Linux',
    artifact: 'aethel-studio-local.AppImage',
    requirements: 'Ubuntu 22.04+, Fedora 39+, Arch, Vulkan-capable GPU recommended',
    command: 'bash installers/linux/install-aethel.sh --user',
  },
}

const TARGETS: RuntimeTarget[] = [
  {
    label: 'Browser preview',
    detail: 'WebGPU/WebGL2 for fast iteration, share links, and lightweight reviews.',
    status: 'ready',
  },
  {
    label: 'Studio Local',
    detail: 'Tauri native runtime with hardware probe, job recovery, sidecar policy, and local/cloud routing.',
    status: 'beta',
  },
  {
    label: 'Pixel Streaming',
    detail: 'Cloud GPU streaming path for Unreal-grade final demos when local hardware is not enough.',
    status: 'planned',
  },
]

const SIDECARS = [
  'FFmpeg media export',
  'ONNX local inference',
  'WGPU native renderer',
  'Rapier physics',
  'Shader compiler',
  'Asset optimizer',
]

function statusClass(status: RuntimeTarget['status']) {
  if (status === 'ready') return 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
  if (status === 'beta') return 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
  return 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] text-[var(--aethel-text-tertiary)]'
}

export default function DownloadPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('windows')

  useEffect(() => {
    const ua = navigator.userAgent
    if (/Mac OS X|Macintosh/i.test(ua)) setSelectedPlatform('mac')
    else if (/Linux/i.test(ua) && !/Android/i.test(ua)) setSelectedPlatform('linux')
    else setSelectedPlatform('windows')
  }, [])

  const current = PLATFORMS[selectedPlatform]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.1),transparent_30%),var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />

      <main id="main-content" className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_420px] lg:items-start">
          <div className="rounded-[36px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(8,10,16,0.96))] p-6 shadow-[0_28px_90px_rgba(2,6,23,0.42)] sm:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--aethel-info-light)]">
              <Monitor className="h-3.5 w-3.5" />
              Studio Local beta
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.6rem] lg:leading-[1.04]">
              Break past browser limits without leaving Aethel.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)] sm:text-base">
              Studio Local is the native Tauri runtime for heavy rendering, asset processing, shader work, local sidecars, and cloud handoff. Same mission, same project memory, deeper execution target.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact-sales?intent=studio-local-beta"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-lg shadow-[color-mix(in_srgb,var(--aethel-primary)_24%,transparent)] transition hover:brightness-110"
              >
                Request desktop beta
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
              >
                Read setup guide
              </Link>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {TARGETS.map((target) => (
                <div key={target.label} className="rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] p-4">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusClass(target.status)}`}>
                    {target.status}
                  </span>
                  <h2 className="mt-3 text-sm font-semibold">{target.label}</h2>
                  <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{target.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[32px] border border-[var(--aethel-border-primary)] bg-[rgba(8,10,16,0.84)] p-5 shadow-[0_26px_80px_rgba(2,6,23,0.36)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Release channel</p>
                <h2 className="mt-2 text-xl font-semibold">Choose your desktop target</h2>
              </div>
              <Download className="h-5 w-5 text-[var(--aethel-info-light)]" />
            </div>

            <div className="mt-5 grid gap-2">
              {(Object.keys(PLATFORMS) as Platform[]).map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setSelectedPlatform(platform)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${selectedPlatform === platform ? 'border-[color-mix(in_srgb,var(--aethel-info)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]' : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] hover:border-[var(--aethel-border-secondary)]'}`}
                >
                  <span className="text-sm font-semibold">{PLATFORMS[platform].name}</span>
                  <span className="mt-1 block text-xs text-[var(--aethel-text-tertiary)]">{PLATFORMS[platform].requirements}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Artifact</p>
              <p className="mt-2 font-mono text-sm text-[var(--aethel-text-primary)]">{current.artifact}</p>
              <p className="mt-3 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
                Signed installers are published through the release pipeline. Until then, beta users can run the local build command below from the repository checkout.
              </p>
              <code className="mt-3 block overflow-x-auto rounded-xl border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.62)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]">
                {current.command}
              </code>
            </div>
          </aside>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)]">
                <Cpu className="h-5 w-5 text-[var(--aethel-primary-light)]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Native policy engine</p>
                <h2 className="text-xl font-semibold">Local when it is safe. Cloud when it is smarter.</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              The Rust runtime probes GPU, thermal state, storage, AI accelerators, and sidecar availability before routing heavy jobs. Users should see why a task runs in browser, local native, or cloud sandbox.
            </p>
            <div className="mt-5 grid gap-2 text-sm text-[var(--aethel-text-secondary)]">
              {['Hardware probe: Vulkan, DX12, Metal, WebGPU, CUDA, CoreML', 'Job recovery after restart', 'Policy routing by thermal, storage, GPU, and budget', 'HTTP daemon for /health, /probe, /jobs, and cloud sync'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--aethel-success-light)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]">
                <TerminalSquare className="h-5 w-5 text-[var(--aethel-info-light)]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Sidecar matrix</p>
                <h2 className="text-xl font-semibold">The desktop app exposes capabilities, not mystery.</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {SIDECARS.map((item) => (
                <div key={item} className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(2,6,23,0.34)] p-4">
                  <ShieldCheck className="h-4 w-4 text-[var(--aethel-success-light)]" />
                  <p className="mt-3 text-sm font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: Gauge, title: 'Depth modes', body: 'Web Light, Studio Home, Operator Surface, Studio Cloud, and Studio Local share one progressive interface.' },
            { icon: HardDrive, title: 'No storage ceiling', body: 'Large projects can bind to disk and keep shader, asset, and render caches persistent.' },
            { icon: Zap, title: 'Heavy work handoff', body: 'Rendering, video export, simulation, and local inference can move off the browser before the UX collapses.' },
          ].map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[rgba(8,10,16,0.68)] p-5">
                <Icon className="h-5 w-5 text-[var(--aethel-info-light)]" />
                <h2 className="mt-4 text-lg font-semibold">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{card.body}</p>
              </div>
            )
          })}
        </section>

        <section className="mt-6 rounded-[34px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(8,10,16,0.94))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.36)] lg:p-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
                <Sparkles className="h-3.5 w-3.5" />
                Honest launch posture
              </div>
              <h2 className="mt-3 text-2xl font-semibold">Desktop beta first. Signed installers next. No broken download theater.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--aethel-text-secondary)]">
                This page now sells the actual runtime strategy: browser for light work, Studio Local for native depth, and cloud streaming for final-quality demos. When signed artifacts are published, this route becomes the release hub without redesign.
              </p>
            </div>
            <Link
              href="/honest-status"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              See readiness
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
