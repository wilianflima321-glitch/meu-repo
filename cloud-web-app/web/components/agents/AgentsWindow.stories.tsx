/**
 * Deterministic AgentsWindow stories.
 *
 * These stories avoid live APIs by installing a tiny fetch fixture per story.
 * Keep this self-contained so Storybook works without MSW setup.
 */

import type { Decorator, Meta, StoryObj } from '@storybook/react'
import type {
  AgentFleetMemberSnapshot,
  AgentFleetSnapshot,
  BrowserOperatorRunSummary,
  ResearchNavigationMeshSnapshot,
} from './window/types'
import { AgentsWindow } from './AgentsWindow'

const MEMBER_READY: AgentFleetMemberSnapshot = {
  agent: 'coordinator-01',
  role: 'senior-coordinator',
  lane: 'web-research',
  status: 'ready',
  ownedSurfaceCount: 3,
  activeLockCount: 1,
  lockedSurfacePreview: ['app/dashboard/page.tsx'],
  staleSurfaceCount: 0,
  staleSurfacePreview: [],
  nextAction: 'Awaiting task assignment',
}

const MEMBER_RUNNING: AgentFleetMemberSnapshot = {
  agent: 'specialist-02',
  role: 'specialist',
  lane: 'code-edit',
  status: 'attention',
  ownedSurfaceCount: 5,
  activeLockCount: 2,
  lockedSurfacePreview: ['components/ide/ModernIDEShell.tsx', 'lib/studio/studio-registry.ts'],
  staleSurfaceCount: 1,
  staleSurfacePreview: ['app/studio/film/page.tsx'],
  nextAction: 'Writing StudioGroupedEditorClient migration',
}

const MEMBER_BLOCKED: AgentFleetMemberSnapshot = {
  agent: 'specialist-03',
  role: 'specialist',
  lane: 'qa-gate',
  status: 'blocked',
  ownedSurfaceCount: 0,
  activeLockCount: 0,
  lockedSurfacePreview: [],
  staleSurfaceCount: 4,
  staleSurfacePreview: ['scripts/codemod-three-imports.mjs'],
  nextAction: 'Waiting for qa:enterprise-gate to pass',
}

const FLEET_IDLE: AgentFleetSnapshot = {
  members: [MEMBER_READY],
  paused: false,
  mode: 'coordinator-first',
  hasManifest: true,
  centralAgent: 'coordinator-01',
  summary: 'Fleet ready. No active tasks.',
  composer: { primaryMode: 'default', switcherHint: '' },
  blockers: [],
  activeLockCount: 1,
  staleSurfaceCount: 0,
  costReceipt: {
    status: 'held',
    label: 'Cost pending',
    detail: 'Fleet-level cost is held until the metering ledger is attached to this snapshot.',
  },
  nextAction: 'Assign a task to start',
}

const FLEET_RUNNING: AgentFleetSnapshot = {
  ...FLEET_IDLE,
  members: [MEMBER_READY, MEMBER_RUNNING],
  summary: 'Wave A in progress - 2 agents active, 1 file locked.',
  activeLockCount: 3,
}

const FLEET_BLOCKED: AgentFleetSnapshot = {
  ...FLEET_RUNNING,
  members: [MEMBER_READY, MEMBER_RUNNING, MEMBER_BLOCKED],
  summary: 'Specialist blocked on qa:enterprise-gate.',
  blockers: ['qa:enterprise-gate returned exit 1'],
  nextAction: 'Fix typecheck before continuing',
}

const FLEET_PAUSED: AgentFleetSnapshot = {
  ...FLEET_RUNNING,
  paused: true,
  summary: 'Fleet paused by user. Resume when ready.',
}

const NAV_MESH: ResearchNavigationMeshSnapshot = {
  version: 1,
  capability: 'AETHEL_RESEARCH_NAVIGATION_MESH',
  capabilityStatus: 'available',
  missionKind: 'code-quality',
  recommendedLane: 'code-edit',
  lanes: [
    {
      laneId: 'web-research',
      label: 'Web research',
      status: 'available',
      bestFor: ['market analysis', 'competitor research'],
      missingCapabilities: [],
      requiredEvidence: [],
      blockers: [],
      guardrails: ['no PII collection'],
      nextAction: 'Ready',
    },
    {
      laneId: 'code-edit',
      label: 'Code edit',
      status: 'available',
      bestFor: ['file editing', 'refactoring', 'migration'],
      missingCapabilities: [],
      requiredEvidence: ['project-id'],
      blockers: [],
      guardrails: ['no direct DB write without migration'],
      nextAction: 'Ready',
    },
  ],
  requiredEvidence: ['project-id'],
  marketParityCoverage: ['Cursor:agents', 'Replit:canvas'],
  limitations: ['git worktrees are still held for Wave F'],
  nextAction: 'Assign mission',
}

const RUNS: BrowserOperatorRunSummary[] = [
  {
    runId: 'run-abc-001',
    mission: 'Inspect preview element at /studio/film',
    status: 'completed',
    updatedAt: '2026-06-09T12:00:00.000Z',
    stepCount: 12,
    timelineHash: 'sha256:abc001',
  },
]

type FixtureOptions = {
  fleet?: AgentFleetSnapshot
  fleetError?: boolean
}

function responseJson(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: init?.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
}

function createFixtureFetch({ fleet = FLEET_IDLE, fleetError = false }: FixtureOptions): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    if (url.includes('/production-state/agent-fleet')) {
      if (fleetError) return responseJson({ error: 'fixture failure' }, { status: 500 })
      const nextFleet = init?.method === 'PATCH' ? { ...fleet, paused: !fleet.paused } : fleet
      return responseJson({ snapshot: nextFleet })
    }

    if (url.includes('/api/agents/browser-operator/runs')) {
      return responseJson({ runs: RUNS })
    }

    if (url.includes('/api/research/navigation-mesh')) {
      return responseJson(NAV_MESH)
    }

    return responseJson({ error: `No fixture for ${url}` }, { status: 404 })
  }
}

function withFixtureFetch(options: FixtureOptions): Decorator {
  const FixtureFetchDecorator: Decorator = (Story) => {
    globalThis.fetch = createFixtureFetch(options)
    return <Story />
  }
  return FixtureFetchDecorator
}

const AgentsStoryFrame: Decorator = (Story) => (
  <div
    style={{
      height: '640px',
      width: '360px',
      background: 'var(--aethel-surface-primary)',
      overflow: 'hidden',
    }}
  >
    <Story />
  </div>
)

const meta = {
  title: 'Shells/AgentsWindow',
  component: AgentsWindow,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Canonical agent surface. Stories use deterministic fetch fixtures; no live API required.',
      },
    },
  },
  decorators: [AgentsStoryFrame],
} satisfies Meta<typeof AgentsWindow>

export default meta
type Story = StoryObj<typeof meta>

export const NoProject: Story = {
  name: 'No project',
  args: { projectId: undefined },
}

export const FleetIdle: Story = {
  name: 'Fleet idle',
  args: { projectId: 'demo-idle' },
  decorators: [withFixtureFetch({ fleet: FLEET_IDLE })],
}

export const ParallelRun: Story = {
  name: 'Parallel run',
  args: { projectId: 'demo-running' },
  decorators: [withFixtureFetch({ fleet: FLEET_RUNNING })],
}

export const AgentBlocked: Story = {
  name: 'Agent blocked',
  args: { projectId: 'demo-blocked' },
  decorators: [withFixtureFetch({ fleet: FLEET_BLOCKED })],
}

export const FleetPaused: Story = {
  name: 'Fleet paused',
  args: { projectId: 'demo-paused' },
  decorators: [withFixtureFetch({ fleet: FLEET_PAUSED })],
}

export const NetworkError: Story = {
  name: 'Network error',
  args: { projectId: 'demo-error' },
  decorators: [withFixtureFetch({ fleetError: true })],
}
