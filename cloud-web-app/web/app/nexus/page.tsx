'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import NexusCanvas from '@/components/NexusCanvas'
import NexusChatMultimodal from '@/components/nexus/NexusChatMultimodal'
import AethelResearch from '@/components/nexus/AethelResearch'
import DirectorMode from '@/components/nexus/DirectorMode'
import StudioLayout from '@/components/studio/StudioLayout'
import { isNavLinkActive, STUDIO_PRIMARY_LINKS } from '@/lib/navigation/surfaces'
import {
  Activity,
  Layout,
  Shield,
} from 'lucide-react'
import Link from 'next/link'

function studioLinkClass(active: boolean): string {
  return active
    ? 'rounded-md border border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--aethel-info-light)]'
    : 'rounded-md border border-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-secondary)]'
}

export default function NexusPage() {
  const pathname = usePathname()
  const [isAIPainting] = useState(false)
  const [canvasMode] = useState<'3d' | 'ui' | 'code'>('3d')
  const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'research' | 'director'>('chat')

  const actions = (
    <div className="flex items-center gap-4">
      <div className="mr-4 flex items-center rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-1">
        <button
          onClick={() => setRightPanelMode('chat')}
          className={`rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
            rightPanelMode === 'chat' ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
          }`}
        >
          Nexus Chat
        </button>
        <button
          onClick={() => setRightPanelMode('research')}
          className={`rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
            rightPanelMode === 'research' ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
          }`}
        >
          Pesquisa
        </button>
        <button
          onClick={() => setRightPanelMode('director')}
          className={`rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
            rightPanelMode === 'director' ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
          }`}
        >
          Direção
        </button>
      </div>
      <button className="rounded-lg bg-[var(--aethel-primary-dark)] px-4 py-1.5 text-xs font-bold text-[var(--aethel-text-primary)] shadow-lg shadow-blue-900/20 transition-all hover:bg-[var(--aethel-primary)]">
        Deploy
      </button>
    </div>
  )

  return (
    <StudioLayout
      title="Nexus"
      subtitle="Orquestração multimodal e renderização em tempo real."
      actions={actions}
      padded={false}
      maxWidth="full"
      className="flex h-[calc(100vh-116px)] flex-col overflow-hidden"
    >
      {/* Sub-navigation for Nexus contexts */}
      <div className="flex items-center gap-2 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-6 py-2">
        {STUDIO_PRIMARY_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={studioLinkClass(isNavLinkActive(pathname, link))}>
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Assets & Context */}
        <div className="hidden w-64 flex-col border-r border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/30 lg:flex">
          <div className="border-b border-[var(--aethel-border-primary)] p-4">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[var(--aethel-text-tertiary)]">Contexto do projeto</h2>
            <div className="space-y-1">
              <button className="flex w-full items-center gap-3 rounded-lg border border-[var(--aethel-primary)]/20 bg-[var(--aethel-primary)]/5 px-3 py-2 text-xs text-[var(--aethel-primary-light)]">
                <Layout size={14} /> <span>Aethel Engine V2</span>
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[var(--aethel-surface-secondary)]">
                <Activity size={14} /> <span>Reality Matrix</span>
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[var(--aethel-surface-secondary)]">
                <Shield size={14} /> <span>Quality Gates</span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[var(--aethel-text-tertiary)]">Assets ao vivo</h2>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="group flex cursor-pointer items-center gap-3 rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2 transition-all hover:border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--aethel-surface-tertiary)] font-mono text-[10px] text-[var(--aethel-text-tertiary)] transition-colors group-hover:bg-[var(--aethel-primary-dark)]/20 group-hover:text-[var(--aethel-primary-light)]">
                    3D
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-bold transition-colors group-hover:text-[var(--aethel-primary-light)]">Asset_Prototype_0{item}.obj</p>
                    <p className="text-[9px] uppercase text-[var(--aethel-text-tertiary)]">Otimizado</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex flex-1 flex-col bg-[var(--aethel-surface-primary)] p-4">
          <NexusCanvas
            mode={canvasMode}
            onSelectElement={(id, pos) => console.log('Selected:', id, pos)}
            isAIPainting={isAIPainting}
            content={null}
          />
        </div>

        {/* Right Panel: Chat / Research / Director */}
        <div className="z-10 flex w-96 flex-col border-l border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
          {rightPanelMode === 'chat' && <NexusChatMultimodal />}
          {rightPanelMode === 'research' && <AethelResearch />}
          {rightPanelMode === 'director' && <DirectorMode />}
        </div>
      </div>
    </StudioLayout>
  )
}
