'use client'

/**
 * Nexus — Research, multimodal orchestration and director workspace.
 *
 * V31 fix: removed all hardcoded fake project/asset placeholder data.
 * Left sidebar now shows honest empty state until a real project is selected.
 * canvasMode and isAIPainting removed as dead state — neither had a setter.
 * NexusCanvasV2 props cleaned: paintingProgress 0 by default, not hardcoded.
 *
 * Next: integrate with projects API so sidebar shows real project context.
 * Ticket: D5 (sandbox provider) + A4 (nexus → research surface)
 */

import { useState } from 'react'
import dynamic from 'next/dynamic'
import NexusChatMultimodal from '@/components/nexus/NexusChatMultimodal'
import AethelResearch from '@/components/nexus/AethelResearch'
import DirectorMode from '@/components/nexus/DirectorMode'
import StudioLayout from '@/components/studio/StudioLayout'
import { isNavLinkActive, STUDIO_PRIMARY_LINKS } from '@/lib/navigation/surfaces'
import { useBrowserPathname } from '@/lib/navigation/use-browser-pathname'
import { FolderOpen } from 'lucide-react'
import Link from 'next/link'

const NexusCanvasV2 = dynamic(() => import('@/components/nexus/NexusCanvasV2'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
      Loading canvas
    </div>
  ),
})

function studioLinkClass(active: boolean): string {
  return active
    ? 'rounded-md border border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--aethel-info-light)]'
    : 'rounded-md border border-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-secondary)]'
}

/** Honest empty state — shown until the projects API returns real data. */
function SidebarEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]">
        <FolderOpen size={18} className="text-[var(--aethel-text-tertiary)]" />
      </div>
      <div>
        <p className="text-xs font-semibold text-[var(--aethel-text-secondary)]">No project selected</p>
        <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">
          Open a project from the dashboard to load context here.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="mt-1 rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
      >
        Go to dashboard
      </Link>
    </div>
  )
}

type RightPanel = 'chat' | 'research' | 'director'

const PANEL_LABELS: Record<RightPanel, string> = {
  chat: 'Chat',
  research: 'Research',
  director: 'Director',
}

export default function NexusPage() {
  const pathname = useBrowserPathname()
  const [rightPanelMode, setRightPanelMode] = useState<RightPanel>('chat')

  const panelNav = (
    <div className="flex items-center rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-1">
      {(Object.keys(PANEL_LABELS) as RightPanel[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setRightPanelMode(mode)}
          className={`rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
            rightPanelMode === mode
              ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]'
              : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
          }`}
          aria-pressed={rightPanelMode === mode}
        >
          {PANEL_LABELS[mode]}
        </button>
      ))}
    </div>
  )

  return (
    <StudioLayout
      title="Nexus"
      subtitle="Research, multimodal orchestration and review."
      actions={panelNav}
      padded={false}
      maxWidth="full"
      className="flex h-[calc(100vh-116px)] flex-col overflow-hidden"
    >
      {/* Surface navigation */}
      <nav
        aria-label="Studio surfaces"
        className="flex items-center gap-2 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-6 py-2"
      >
        {STUDIO_PRIMARY_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={studioLinkClass(isNavLinkActive(pathname, link))}>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — project context (real data pending project API integration) */}
        <aside className="hidden w-64 flex-col border-r border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/30 lg:flex">
          <div className="border-b border-[var(--aethel-border-primary)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
              Project context
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Empty state — replace with real project list from /api/projects */}
            <SidebarEmptyState />
          </div>
        </aside>

        {/* Main canvas — NexusCanvasV2 with no hardcoded state */}
        <main className="flex flex-1 flex-col bg-[var(--aethel-surface-primary)] p-4">
          <NexusCanvasV2
            renderMode="draft"
            isAIPainting={false}
            paintingProgress={0}
          />
        </main>

        {/* Right panel — Chat / Research / Director */}
        <aside className="z-10 flex w-96 flex-col border-l border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]">
          {rightPanelMode === 'chat' && <NexusChatMultimodal />}
          {rightPanelMode === 'research' && <AethelResearch />}
          {rightPanelMode === 'director' && <DirectorMode />}
        </aside>
      </div>
    </StudioLayout>
  )
}
