import type { Meta, StoryObj } from '@storybook/react'
import { CreativeWorkbenchShell } from './CreativeWorkbenchShell'

const ViewportPlaceholder = ({ label }: { label: string }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--aethel-surface-secondary)]">
    <div className="h-20 w-20 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-elevated)] opacity-60" />
    <p className="text-[12px] text-[var(--aethel-text-tertiary)]">{label}</p>
  </div>
)

const OutlinerStub = () => (
  <div className="space-y-1">
    {['Level_Root', 'SpawnPoint_A', 'NavMesh_01', 'AmbientLight', 'Camera_Main'].map((item, i) => (
      <div
        key={item}
        className={`rounded px-2 py-1 text-[11px] font-mono ${i === 0 ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]' : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)]'}`}
      >
        {i === 0 ? item : `- ${item}`}
      </div>
    ))}
  </div>
)

const InspectorStub = () => (
  <div className="space-y-2 text-[11px]">
    {[['Position', 'X: 0 Y: 1.2 Z: 0'], ['Rotation', 'X: 0 Y: 45 Z: 0'], ['Scale', 'X: 1 Y: 1 Z: 1'], ['Visible', 'true']].map(([k, v]) => (
      <div key={k} className="flex items-center justify-between gap-2">
        <span className="text-[var(--aethel-text-tertiary)]">{k}</span>
        <span className="font-mono text-[var(--aethel-text-primary)]">{v}</span>
      </div>
    ))}
  </div>
)

const TimelineStub = () => (
  <div className="h-20 overflow-hidden">
    <div className="flex h-full items-center gap-1 px-2">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="h-8 w-2 shrink-0 rounded-sm bg-[var(--aethel-primary)] opacity-40"
          style={{ opacity: 0.18 + ((i % 8) * 0.07) }}
        />
      ))}
    </div>
  </div>
)

const ReviewQueueStub = () => (
  <div className="space-y-2 p-1 text-[11px] text-[var(--aethel-text-secondary)]">
    {['Asset ledger', 'Perf trace', 'Human review'].map((item) => (
      <div key={item} className="flex justify-between rounded-lg border border-[var(--aethel-border-subtle)] px-2 py-1.5">
        <span>{item}</span>
        <span className="text-[var(--aethel-warning-light)]">held</span>
      </div>
    ))}
  </div>
)

const primaryAction = (
  <button
    type="button"
    disabled
    className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] opacity-90"
  >
    Review held
  </button>
)

const meta = {
  title: 'Shells/CreativeWorkbenchShell',
  component: CreativeWorkbenchShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Canonical creative shell for the Studio groups. It keeps viewport, outliner, timeline, inspector, and review queue in one predictable grammar with collapsible panels and honest evidence states.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', width: '100vw' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CreativeWorkbenchShell>

export default meta
type Story = StoryObj<typeof meta>

export const WorldGroup: Story = {
  name: 'World - Level Studio',
  args: {
    title: 'World Studio',
    mode: 'World',
    primaryAction,
    viewport: <ViewportPlaceholder label="Level Editor viewport" />,
    outliner: <OutlinerStub />,
    inspector: <InspectorStub />,
    timeline: <TimelineStub />,
    renderQueue: <ReviewQueueStub />,
    evidence: [
      { label: 'Maturity', status: 'needs-review', detail: 'Beta workflow with edge cases under review.' },
      { label: 'Export', status: 'held', detail: 'Export requires render receipt and human review.' },
      { label: 'Asset ledger', status: 'needs-review', detail: 'Requires license and provenance sign-off.' },
    ],
  },
}

export const CharacterGroup: Story = {
  name: 'Character - Animation Studio',
  args: {
    title: 'Character Studio',
    mode: 'Character',
    primaryAction,
    viewport: <ViewportPlaceholder label="Animation Blueprint viewport" />,
    outliner: <OutlinerStub />,
    inspector: <InspectorStub />,
    timeline: <TimelineStub />,
    renderQueue: <ReviewQueueStub />,
    evidence: [
      { label: 'Maturity', status: 'held', detail: 'Alpha workflow, review only.' },
      { label: 'Rig', status: 'needs-review', detail: 'IK chains under review.' },
      { label: 'Facial FACS', status: 'held', detail: 'Not ready for production output.' },
    ],
  },
}

export const FXGroup: Story = {
  name: 'FX - VFX Studio',
  args: {
    title: 'FX Studio',
    mode: 'FX',
    primaryAction,
    viewport: <ViewportPlaceholder label="Niagara VFX viewport" />,
    renderQueue: <ReviewQueueStub />,
    evidence: [
      { label: 'Maturity', status: 'held', detail: 'Alpha workflow.' },
      { label: 'Export', status: 'held', detail: 'Review queue is visible but output is not final.' },
    ],
  },
}

export const MinimalViewportOnly: Story = {
  name: 'Viewport only',
  args: {
    title: 'Film Studio',
    mode: 'Film',
    primaryAction,
    viewport: <ViewportPlaceholder label="Film viewport - no panels" />,
    evidence: [],
  },
}

export const AllPanelsOpen: Story = {
  name: 'All panels open',
  args: {
    title: 'Logic Studio',
    mode: 'Logic',
    primaryAction,
    viewport: <ViewportPlaceholder label="Blueprint graph" />,
    outliner: <OutlinerStub />,
    inspector: <InspectorStub />,
    timeline: <TimelineStub />,
    assetBrowser: <div className="p-1 text-[11px] text-[var(--aethel-text-secondary)]">Asset browser content</div>,
    renderQueue: <ReviewQueueStub />,
    evidence: [
      { label: 'Maturity', status: 'needs-review', detail: 'Shared shell preview; release gate still applies.' },
    ],
  },
}
