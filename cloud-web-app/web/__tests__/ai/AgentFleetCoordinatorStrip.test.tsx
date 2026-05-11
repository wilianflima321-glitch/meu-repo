import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AgentFleetCoordinatorStrip,
  mapFleetAgentToCommandAgentId,
} from '@/components/ai/AgentFleetCoordinatorStrip'

function responseJson(body: Record<string, unknown>) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

function fleetPayload(centralAgent = 'Producer Agent', mode = 'coordinator-first', paused = false) {
  return {
    snapshot: {
      mode,
      paused,
      hasManifest: true,
      centralAgent,
      summary: `${centralAgent} is coordinating scoped lanes.`,
      composer: {
        primaryMode: `Ask ${centralAgent}`,
        switcherHint: 'Coordinator-first mode keeps the fleet aligned.',
      },
      members: [
        {
          agent: centralAgent,
          role: 'senior-coordinator',
          lane: 'planning',
          status: 'ready',
          ownedSurfaceCount: 2,
          activeLockCount: 1,
          lockedSurfacePreview: ['src/game/combat/BossController.ts'],
          staleSurfaceCount: 0,
          staleSurfacePreview: [],
          nextAction: 'Review Mission Ledger evidence.',
        },
        {
          agent: 'Technical Artist Agent',
          role: 'specialist',
          lane: 'assets',
          status: 'attention',
          ownedSurfaceCount: 3,
          activeLockCount: 0,
          lockedSurfacePreview: [],
          staleSurfaceCount: 1,
          staleSurfacePreview: ['assets/characters/hero.glb'],
          nextAction: 'Validate material and LOD quality.',
        },
        {
          agent: 'Gameplay Engineer Agent',
          role: 'specialist',
          lane: 'gameplay',
          status: 'blocked',
          ownedSurfaceCount: 1,
          activeLockCount: 0,
          lockedSurfacePreview: [],
          staleSurfaceCount: 0,
          staleSurfacePreview: [],
          nextAction: 'Wait for cartography scope approval.',
        },
      ],
      blockers: ['Cartography scope approval required.'],
      activeLockCount: 1,
      staleSurfaceCount: 1,
      lockCoordination: {
        projectId: 'project-1',
        generatedAt: '2026-05-11T10:00:00.000Z',
        activeLockCount: 1,
        lockedPathCount: 1,
        owners: [
          {
            agent: 'Producer Agent',
            ownerUserId: 'user-1',
            lockCount: 1,
            paths: ['src/game/combat/BossController.ts'],
            expiresAt: '2026-05-11T10:15:00.000Z',
          },
        ],
        expiringSoonCount: 0,
        arbitrationRequired: false,
        nextAction: 'Keep the current agent inside its locked surfaces and renew or release after evidence is recorded.',
      },
      nextAction: 'Review Mission Ledger evidence.',
    },
  }
}

function lockPayload() {
  return {
    locks: [
      {
        id: 'lock-1',
        agent: 'Gameplay Engineer Agent',
        ownerUserId: 'user-1',
        paths: ['src/game/combat/BossController.ts'],
        source: 'session',
        reason: 'combat pass',
        expiresAt: '2026-05-11T10:15:00.000Z',
      },
    ],
    snapshot: {
      projectId: 'project-1',
      generatedAt: '2026-05-11T10:01:00.000Z',
      activeLockCount: 1,
      lockedPathCount: 1,
      owners: [
        {
          agent: 'Gameplay Engineer Agent',
          ownerUserId: 'user-1',
          lockCount: 1,
          paths: ['src/game/combat/BossController.ts'],
          expiresAt: '2026-05-11T10:15:00.000Z',
        },
      ],
      expiringSoonCount: 0,
      arbitrationRequired: false,
      nextAction: 'Keep the current agent inside its locked surfaces and renew or release after evidence is recorded.',
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AgentFleetCoordinatorStrip', () => {
  it('keeps the fleet controls compact and coordinator-first', async () => {
    const onSelectAgentId = vi.fn()
    const fetchMock = vi.fn(() => responseJson(fleetPayload()))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AgentFleetCoordinatorStrip
        projectId="project-1"
        selectedAgentId="coder"
        onSelectAgentId={onSelectAgentId}
      />
    )

    expect(await screen.findByLabelText('Agent fleet coordinator')).toBeInTheDocument()
    expect(screen.getByText('Fleet')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Choose senior coordinator agent' })).toHaveValue('Producer Agent')
    expect(screen.getByRole('combobox', { name: 'Choose composer mode' })).toHaveValue('coordinator-first')
    expect(screen.getByText('1 blockers')).toBeInTheDocument()
    expect(screen.getByText('1 lock')).toBeInTheDocument()
    expect(screen.getByText('rescan needed')).toBeInTheDocument()

    await waitFor(() => expect(onSelectAgentId).toHaveBeenCalledWith('universal'))
  })

  it('promotes a specialist to coordinator and maps it to the closest command agent', async () => {
    const onSelectAgentId = vi.fn()
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => responseJson(fleetPayload()))
      .mockImplementationOnce(() => responseJson(fleetPayload('Technical Artist Agent', 'selected-agent')))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AgentFleetCoordinatorStrip
        projectId="project-1"
        selectedAgentId="universal"
        onSelectAgentId={onSelectAgentId}
      />
    )

    const coordinator = await screen.findByRole('combobox', { name: 'Choose senior coordinator agent' })
    fireEvent.change(coordinator, { target: { value: 'Technical Artist Agent' } })

    await waitFor(() => expect(onSelectAgentId).toHaveBeenCalledWith('artist'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const patchInit = fetchMock.mock.calls[1]?.[1] as RequestInit
    expect(patchInit.method).toBe('PATCH')
    expect(patchInit.body).toBe(JSON.stringify({ centralAgent: 'Technical Artist Agent' }))
  })

  it('opens compact scope lock details on demand without cluttering the default strip', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/agent-locks')) return responseJson(lockPayload())
      return responseJson(fleetPayload())
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AgentFleetCoordinatorStrip
        projectId="project-1"
        selectedAgentId="universal"
        onSelectAgentId={vi.fn()}
      />
    )

    expect(await screen.findByText('1 lock')).toBeInTheDocument()
    expect(screen.queryByLabelText('Agent scope lock details')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '1 lock' }))

    const details = await screen.findByLabelText('Agent scope lock details')
    expect(details).toBeInTheDocument()
    expect(screen.getByText('Scoped ownership active')).toBeInTheDocument()
    expect(within(details).getByText('Gameplay Engineer Agent')).toBeInTheDocument()
    expect(within(details).getByText('src/game/combat/BossController.ts')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/project-1/production-state/agent-locks',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('does not render or fetch when there is no real project context', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AgentFleetCoordinatorStrip
        projectId="default"
        selectedAgentId="universal"
        onSelectAgentId={vi.fn()}
      />
    )

    expect(screen.queryByLabelText('Agent fleet coordinator')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps production agents to the closest existing command-center agent', () => {
    expect(mapFleetAgentToCommandAgentId('Software Engineer Agent')).toBe('coder')
    expect(mapFleetAgentToCommandAgentId('Gameplay Engineer Agent')).toBe('game-designer')
    expect(mapFleetAgentToCommandAgentId('Cinematic Editor Agent')).toBe('video-editor')
    expect(mapFleetAgentToCommandAgentId('Producer Agent')).toBe('universal')
  })
})
