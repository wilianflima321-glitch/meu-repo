import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
      nextAction: 'Review Mission Ledger evidence.',
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
    expect(screen.getByText('1 locks')).toBeInTheDocument()
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
