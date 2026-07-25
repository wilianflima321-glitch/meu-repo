/**
 * CreativeWorkbenchShell.stories.tsx — V31 Wave B6
 *
 * Canonical creative workbench stories.
 * Shows the 4 most important workbench configurations.
 *
 * CreativeWorkbenchShell is the shared grammar for all Studio editors:
 * World, Character, FX, Film, Logic.
 * It provides: viewport, outliner, inspector, timeline, assetBrowser, renderQueue.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { CreativeWorkbenchShell } from './CreativeWorkbenchShell'

// ── Slot content mocks ────────────────────────────────────────────────────────

const MockViewport = ({ label }: { label: string }) => (
  <div className="flex h-full items-center justify-center bg-[var(--aethel-surface-primary)] text-xs text-[var(--aethel-text-quaternary)]">
    {label}
  </div>
)

const MockOutliner = () => (
  <div className="h-full overflow-y-auto">
    {['Root', '  Character', '    Skeleton', '    Mesh', '  Props', '    Sword'].map((item, i) => (
      <div key={i} className={`px-3 py-1.5 text-xs ${i === 3 ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] text-[var(--aethel-primary-light)]' : 'text-[var(--aethel-text-secondary)]'}`}>
        {item}
      </div>
    ))}
  </div>
)

const MockInspector = () => (
  <div className="h-full overflow-y-auto p-3 space-y-2">
    {[['Position', 'X: 0  Y: 1.8  Z: 0'], ['Rotation', 'X: 0  Y: 0  Z: 0'], ['Scale', '1  1  1']].map(([k, v]) => (
      <div key={k} className="flex justify-between py-1.5 border-b border-[var(--aethel-border-subtle)]">
        <span className="text-[11px] text-[var(--aethel-text-tertiary)]">{k}</span>
        <span className="text-[11px] font-mono text-[var(--aethel-text-secondary)]">{v}</span>
      </div>
    ))}
  </div>
)

const MockTimeline = () => (
  <div className="flex h-full items-center gap-6 px-4 overflow-x-auto">
    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((t) => (
      <div key={t} className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className={`w-0.5 h-3 ${t === 30 ? 'bg-[var(--aethel-primary)]' : 'bg-[var(--aethel-border-secondary)]'}`} />
        <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{t}</span>
      </div>
    ))}
  </div>
)

const MockAssetBrowser = () => (
  <div className="h-full overflow-y-auto p-3">
    <div className="grid grid-cols-3 gap-2">
      {['Idle', 'Walk', 'Run', 'Jump', 'Attack', 'Death'].map((anim) => (
        <div key={anim} className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] p-2 text-center">
          <div className="h-8 w-full rounded bg-[var(--aethel-surface-secondary)] mb-1" />
          <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{anim}</span>
        </div>
      ))}
    </div>
  </div>
)

const MockRenderQueue = () => (
  <div className="h-full overflow-y-auto p-3 space-y-2">
    {[
      { label: 'Render preview', status: 'held', reason: 'Needs LOD rig' },
      { label: 'Export FBX', status: 'held', reason: 'Review pending' },
      { label: 'Capture screenshot', status: 'available' },
    ].map((item) => (
      <div key={item.label} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]/40 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--aethel-text-primary)]">{item.label}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${item.status === 'available' ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-warning-light)]'}`}>
            {item.status}
          </span>
        </div>
        {item.reason && <p className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">{item.reason}</p>}
      </div>
    ))}
  </div>
)

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Shells/CreativeWorkbenchShell',
  component: CreativeWorkbenchShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**CreativeWorkbenchShell** — shared creative editor grammar (V30/V31 canonical).

All Studio editors (World, Character, FX, Film, Logic) consume this shell.
Provides 6 resizable slots: viewport, outliner, inspector, timeline, assetBrowser, renderQueue.
Keyboard shortcuts: Alt+1-5 toggle panels. Resize state persisted in localStorage.

V31 status: ✅ shell exists | ⚠️ 3/5 studio pages still use StudioGroupedEditorClient instead
        `.trim(),
      },
    },
  },
  tags: ['autodocs'],
  args: {
    title: 'Creative Workbench',
    mode: 'Character',
    primaryAction: (
      <button className="rounded-lg bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--aethel-text-inverse)]">
        Render
      </button>
    ),
    viewport: <MockViewport label="Viewport" />,
    evidence: [{ label: 'Storybook fixture', status: 'needs-review', detail: 'Deterministic shell story evidence.' }],
  },
} satisfies Meta<typeof CreativeWorkbenchShell>

export default meta
type Story = StoryObj<typeof meta>

// ── Stories ───────────────────────────────────────────────────────────────────

export const CharacterEditor: Story = {
  name: 'Character editor — all panels',
  args: {
    viewport: <MockViewport label="Character viewport — Three.js / R3F loaded via dynamic()" />,
    outliner: <MockOutliner />,
    inspector: <MockInspector />,
    timeline: <MockTimeline />,
    assetBrowser: <MockAssetBrowser />,
    renderQueue: <MockRenderQueue />,
  },
}

export const ViewportOnly: Story = {
  name: 'Viewport only — maximised focus',
  args: {
    viewport: <MockViewport label="Maximised viewport — no side panels" />,
  },
}

export const WithRenderQueue: Story = {
  name: 'With render / export queue',
  args: {
    viewport: <MockViewport label="Viewport" />,
    outliner: <MockOutliner />,
    renderQueue: <MockRenderQueue />,
  },
}
