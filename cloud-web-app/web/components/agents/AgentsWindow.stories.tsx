/**
 * AgentsWindow.stories.tsx — V31 Wave B4
 *
 * 5 canonical states for the AgentsWindow surface.
 *
 * AgentsWindow is the primary agents surface — Fleet, Navigation, Replay.
 * It is accessible via the "Agents" rail inside the IDE's AIChatPanelContainer.
 *
 * Each story uses deterministic fixtures — no MSW, no live API.
 */

import type { Meta, StoryObj } from '@storybook/react'
import {
  AgentWindowError,
  AgentWindowLoading,
  AgentWindowNoProject,
} from './window/AgentWindowStates'
import { AgentFleetPanel } from './window/AgentFleetPanel'
import { AgentReplayPanel } from './window/AgentReplayPanel'
import { AgentWindowTabs } from './window/AgentWindowTabs'
import type {
  AgentFleetMemberSnapshot,
  AgentFleetMemberStatus,
  AgentFleetSnapshot,
  BrowserOperatorRunSummary,
} from './window/types'

// ── Fixtures (deterministic — no API) ────────────────────────────────────────

const FIXTURE_MEMBERS: AgentFleetMemberSnapshot[] = [
  {
    agent: 'Coordinator',
    role: 'senior-coordinator',
    lane: 'auth',
    status: 'ready',
    ownedSurfaceCount: 4,
    activeLockCount: 1,
    lockedSurfacePreview: ['app/(auth)/login/page.tsx'],
    staleSurfaceCount: 0,
    staleSurfacePreview: [],
    nextAction: 'Coordinating auth module refactor',
  },
  {
    agent: 'Tester',
    role: 'specialist',
    lane: 'testing',
    status: 'attention',
    ownedSurfaceCount: 2,
    activeLockCount: 0,
    lockedSurfacePreview: [],
    staleSurfaceCount: 1,
    staleSurfacePreview: ['lib/auth/session.test.ts'],
    nextAction: 'Raise unit test coverage to 80%',
  },
  {
    agent: 'Reviewer',
    role: 'specialist',
    lane: 'review',
    status: 'blocked',
    ownedSurfaceCount: 6,
    activeLockCount: 0,
    lockedSurfacePreview: [],
    staleSurfaceCount: 0,
    staleSurfacePreview: [],
    nextAction: 'Waiting on coordinator approval',
  },
]

const FIXTURE_GROUPED: Record<AgentFleetMemberStatus, AgentFleetMemberSnapshot[]> = {
  ready: [FIXTURE_MEMBERS[0]],
  attention: [FIXTURE_MEMBERS[1]],
  blocked: [FIXTURE_MEMBERS[2]],
  paused: [],
}

const FIXTURE_FLEET: AgentFleetSnapshot = {
  mode: 'coordinator-first',
  paused: false,
  hasManifest: true,
  centralAgent: 'Coordinator',
  summary: '3 agents active on the auth module refactor.',
  composer: {
    primaryMode: 'autonomous',
    switcherHint: 'Alt+A to switch agents',
  },
  members: FIXTURE_MEMBERS,
  blockers: [],
  activeLockCount: 1,
  staleSurfaceCount: 1,
  costReceipt: {
    status: 'available',
    sessionCostCents: 23,
    budgetRemainingCents: 4977,
    label: 'Session cost',
    detail: '$0.23 of $50.00 budget used',
  },
  nextAction: 'Coordinating auth module refactor',
}

const FIXTURE_FLEET_PAUSED: AgentFleetSnapshot = {
  ...FIXTURE_FLEET,
  paused: true,
  mode: 'review-only',
}

const FIXTURE_REPLAY_RUNS: BrowserOperatorRunSummary[] = [
  {
    runId: 'run_storybook_01',
    mission: 'Visited docs.aethel.ai/auth',
    status: 'complete',
    updatedAt: new Date(Date.now() - 1000 * 60).toISOString(),
    stepCount: 12,
    timelineHash: 'hash_run_01',
  },
  {
    runId: 'run_storybook_02',
    mission: 'Checked GitHub issue 142', // issue number (avoid hex-shaped literal)
    status: 'complete',
    updatedAt: new Date(Date.now() - 1000 * 400).toISOString(),
    stepCount: 5,
    timelineHash: 'hash_run_02',
  },
]

const NOOP = () => {}
const FOCUS_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)]'
const STORY_FRAME =
  'h-[600px] w-[380px] overflow-hidden rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]'
const STORY_FRAME_COL = `${STORY_FRAME} flex flex-col`

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Agents/AgentsWindow',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
**AgentsWindow** — primary agents surface (Fleet · Navigation · Replay).

Accessible via IDE chat panel → "Agents" tab (Alt+A).
Owns: fleet view, browser replay, navigation mesh, pause/stop/takeover.
Uses SWR for live data; stories use deterministic fixtures.

V31 status: ✅ 3 sub-panels | ⚠️ entry point is opt-in (A1 ticket: promote to primary)
        `.trim(),
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj

// ── Stories ───────────────────────────────────────────────────────────────────

/**
 * Fleet — running (default).
 * Shows 3 agents: one running, one idle, one complete.
 * Pause + Stop + Takeover actions are all visible.
 */
export const FleetRunning: Story = {
  name: 'Fleet — running',
  parameters: {
    docs: {
      description: { story: 'Default state. Agents running autonomously. Pause/Stop/Takeover available.' },
    },
  },
  render: () => (
    <div className={STORY_FRAME_COL}>
      <AgentWindowTabs
        activeView="fleet"
        setActiveView={NOOP}
        focusClass={FOCUS_CLASS}
      />
      <AgentFleetPanel
        data={FIXTURE_FLEET}
        grouped={FIXTURE_GROUPED}
        topMembers={FIXTURE_FLEET.members}
        latestReplayRun={undefined}
        onTogglePause={NOOP}
        onRefresh={NOOP}
        onStop={NOOP}
        onTakeover={NOOP}
        focusClass={FOCUS_CLASS}
      />
    </div>
  ),
}

/**
 * Fleet — paused (takeover mode).
 * Human took over control. Resume / Dismiss actions visible.
 */
export const FleetPaused: Story = {
  name: 'Fleet — paused (takeover)',
  parameters: {
    docs: {
      description: { story: 'Human has taken over. Fleet is paused in review-only mode.' },
    },
  },
  render: () => (
    <div className={STORY_FRAME_COL}>
      <AgentWindowTabs
        activeView="fleet"
        setActiveView={NOOP}
        focusClass={FOCUS_CLASS}
      />
      <AgentFleetPanel
        data={FIXTURE_FLEET_PAUSED}
        grouped={FIXTURE_GROUPED}
        topMembers={FIXTURE_FLEET.members}
        latestReplayRun={undefined}
        onTogglePause={NOOP}
        onRefresh={NOOP}
        onStop={NOOP}
        onTakeover={NOOP}
        focusClass={FOCUS_CLASS}
      />
    </div>
  ),
}

/**
 * Loading — SWR is fetching the first fleet snapshot.
 * Shows the skeleton loading state, not a spinner.
 */
export const Loading: Story = {
  name: 'Loading — fetching fleet',
  parameters: {
    docs: {
      description: { story: 'Initial data fetch. Shows skeleton, not a spinner.' },
    },
  },
  render: () => (
    <div className={STORY_FRAME}>
      <AgentWindowLoading />
    </div>
  ),
}

/**
 * Error — API unreachable or auth failed.
 * Shows honest error with a retry action.
 */
export const Error: Story = {
  name: 'Error — API unreachable',
  parameters: {
    docs: {
      description: { story: 'Fleet API returned an error. Shows retry CTA, does not crash the IDE shell.' },
    },
  },
  render: () => (
    <div className={STORY_FRAME}>
      <AgentWindowError focusClass={FOCUS_CLASS} onRetry={NOOP} />
    </div>
  ),
}

/**
 * No project — user is in the IDE but no project is active.
 * Most common after fresh sign-up before creating a project.
 */
export const NoProject: Story = {
  name: 'No project — empty state',
  parameters: {
    docs: {
      description: { story: 'No projectId provided. Prompts the user to open a project from the dashboard.' },
    },
  },
  render: () => (
    <div className={STORY_FRAME}>
      <AgentWindowNoProject />
    </div>
  ),
}

/**
 * Replay — browser operator runs.
 * Shows the replay panel with mock run list.
 */
export const Replay: Story = {
  name: 'Replay — browser operator runs',
  parameters: {
    docs: {
      description: { story: 'Replay view. Lists browser operator runs for audit. Click a run to see step-by-step replay.' },
    },
  },
  render: () => (
    <div className={STORY_FRAME_COL}>
      <AgentWindowTabs
        activeView="replay"
        setActiveView={NOOP}
        focusClass={FOCUS_CLASS}
      />
      <AgentReplayPanel
        replayRunId="run_storybook_01"
        setReplayRunId={NOOP}
        replayRuns={FIXTURE_REPLAY_RUNS}
        replayRunsError={null}
        replayRunsLoading={false}
        refreshReplayRuns={NOOP}
        focusClass={FOCUS_CLASS}
      />
    </div>
  ),
}
