/**
 * ViewportWorkbenchShell.stories.tsx — V31 Wave B5
 *
 * 3 canonical modes: viewport-3d, canvas, live-runtime.
 * Shows the tools-in-drawer pattern (no toolbar pollution).
 */

import type { Meta, StoryObj } from '@storybook/react'
import { ViewportWorkbenchShell } from './ViewportWorkbenchShell'

// ── Slot mocks ────────────────────────────────────────────────────────────────

function MockOutliner() {
  const items = [
    { depth: 0, label: 'Scene Root', type: 'group' },
    { depth: 1, label: 'Lighting', type: 'group' },
    { depth: 2, label: 'DirectionalLight', type: 'light' },
    { depth: 2, label: 'AmbientLight', type: 'light' },
    { depth: 1, label: 'Characters', type: 'group' },
    { depth: 2, label: 'PlayerMesh', type: 'mesh', active: true },
    { depth: 1, label: 'Environment', type: 'group' },
    { depth: 2, label: 'Terrain', type: 'mesh' },
    { depth: 2, label: 'SkyDome', type: 'mesh' },
  ]
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--aethel-border-subtle)] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
          Outliner
        </p>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs ${
              item.active
                ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)]'
            }`}
            style={{ paddingLeft: `${12 + item.depth * 14}px` }}
          >
            <span className="text-[10px] opacity-50">
              {item.type === 'group' ? '▸' : '·'}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockInspector() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--aethel-border-subtle)] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
          Inspector — PlayerMesh
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {[
          { section: 'Transform', fields: [['Position', 'X: 0  Y: 0  Z: 0'], ['Rotation', 'X: 0  Y: 0  Z: 0'], ['Scale', 'X: 1  Y: 1  Z: 1']] },
          { section: 'Mesh', fields: [['LOD', '0 (High)'], ['Vertices', '12,843'], ['Material', 'M_Player']] },
          { section: 'Rigidbody', fields: [['Mass', '80 kg'], ['Drag', '0.1'], ['Angular drag', '0.05']] },
        ].map(({ section, fields }) => (
          <div key={section}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)] mb-2">{section}</p>
            {fields.map(([label, value]) => (
              <div key={label} className="flex justify-between py-1 border-b border-[var(--aethel-border-subtle)]">
                <span className="text-[11px] text-[var(--aethel-text-tertiary)]">{label}</span>
                <span className="text-[11px] font-mono text-[var(--aethel-text-secondary)]">{value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MockViewport3D() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--aethel-surface-primary)]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-32 w-32 rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] opacity-40" />
        <p className="text-xs text-[var(--aethel-text-tertiary)]">3D viewport (Three.js / R3F)</p>
        <p className="text-[11px] text-[var(--aethel-text-quaternary)]">Loaded via dynamic import — not in public bundle</p>
      </div>
    </div>
  )
}

function MockCanvasPreview() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--aethel-brand-paper)]">
      <div className="w-64 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <div className="mb-4 h-4 w-32 rounded bg-gray-200" />
        <div className="mb-2 h-3 w-full rounded bg-gray-100" />
        <div className="mb-4 h-3 w-3/4 rounded bg-gray-100" />
        <div className="h-9 w-full rounded-xl bg-blue-600" />
      </div>
    </div>
  )
}

function MockRuntimeOverlay() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-black">
      <div className="flex items-center gap-2 text-xs text-green-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
        Live — localhost:3000
      </div>
      <div className="w-56 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 h-3 w-24 rounded bg-white/20" />
        <div className="h-2 w-full rounded bg-white/10" />
        <div className="mt-2 h-2 w-3/4 rounded bg-white/10" />
      </div>
      <p className="text-[11px] text-white/30">Hot reload — 0.14s</p>
    </div>
  )
}

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Shells/ViewportWorkbenchShell',
  component: ViewportWorkbenchShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**ViewportWorkbenchShell** — canonical preview/viewport surface.

Three modes: \`viewport\` (3D), \`canvas\` (UI preview), \`runtime\` (live app).
Advanced tools hidden in \`<details>\` drawer by default — no toolbar pollution.
Left: Outliner / file tree · Center: the surface · Right: Inspector / properties.
        `.trim(),
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ViewportWorkbenchShell>

export default meta
type Story = StoryObj<typeof meta>

// ── Stories ───────────────────────────────────────────────────────────────────

export const Viewport3D: Story = {
  name: '3D Viewport — game/film editor',
  args: {
    title: 'Level Editor',
    subtitle: 'Select, transform and inspect scene objects. Advanced tools in the drawer.',
    mode: 'viewport',
    center: <MockViewport3D />,
    left: <MockOutliner />,
    right: <MockInspector />,
  },
}

export const CanvasMode: Story = {
  name: 'Canvas — UI preview',
  args: {
    title: 'UI Preview',
    subtitle: 'Live preview of the current UI state. Annotate or generate proposals from the Tools drawer.',
    mode: 'canvas',
    center: <MockCanvasPreview />,
    left: <MockOutliner />,
    right: <MockInspector />,
  },
}

export const LiveRuntime: Story = {
  name: 'Runtime — live app',
  args: {
    title: 'Live Preview',
    subtitle: 'App is running. Hot reload active.',
    mode: 'runtime',
    center: <MockRuntimeOverlay />,
    left: <MockOutliner />,
    right: <MockInspector />,
  },
}
