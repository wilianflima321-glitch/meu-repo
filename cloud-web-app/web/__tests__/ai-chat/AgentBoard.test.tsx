/**
 * Tests for agents/chat/activity/AgentBoard.
 *
 * Covers:
 *  - Renders nothing when the agent list is empty.
 *  - Renders one row per agent with name, role, task.
 *  - Clicking an agent row triggers onAgentClick with the agent id.
 *  - Shows the dependency hint when `dependency` is provided.
 *  - Header reports the total agent count.
 */

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AgentBoard, type AgentInfo } from '../../components/agents/chat/activity'

function agent(overrides: Partial<AgentInfo> & { id: string }): AgentInfo {
  return {
    id: overrides.id,
    role: 'Planner',
    name: `Agent ${overrides.id}`,
    currentTask: 'Breaking down the request',
    progress: 25,
    confidence: 80,
    cost: 0.0123,
    status: 'working',
    telemetry: 'live',
    ...overrides,
  }
}

describe('AgentBoard', () => {
  it('renders nothing when there are no agents', () => {
    const { container } = render(<AgentBoard agents={[]} onAgentClick={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders one row per agent with name and task', () => {
    render(
      <AgentBoard
        agents={[
          agent({ id: '1', name: 'Planner' }),
          agent({ id: '2', name: 'Coder', currentTask: 'Editing App.tsx' }),
        ]}
        onAgentClick={() => {}}
      />,
    )
    expect(screen.getAllByText('Planner').length).toBeGreaterThan(0)
    expect(screen.getByText('Coder')).toBeInTheDocument()
    expect(screen.getByText('Editing App.tsx')).toBeInTheDocument()
  })

  it('fires onAgentClick with the agent id when clicked', () => {
    const onAgentClick = vi.fn()
    render(<AgentBoard agents={[agent({ id: 'a-42', name: 'Reviewer' })]} onAgentClick={onAgentClick} />)
    fireEvent.click(screen.getByText('Reviewer'))
    expect(onAgentClick).toHaveBeenCalledWith('a-42')
  })

  it('renders the dependency hint when provided', () => {
    render(<AgentBoard agents={[agent({ id: '1', dependency: 'Planner output' })]} onAgentClick={() => {}} />)
    expect(screen.getByText(/Depends on: Planner output/i)).toBeInTheDocument()
  })

  it('reports the total agent count in the header', () => {
    render(
      <AgentBoard
        agents={[agent({ id: '1' }), agent({ id: '2' }), agent({ id: '3' })]}
        onAgentClick={() => {}}
      />,
    )
    expect(screen.getByText('3 agents')).toBeInTheDocument()
  })

  it('shows an honest partial-telemetry state when detailed agent metrics are unavailable', () => {
    render(
      <AgentBoard
        agents={[
          agent({
            id: '1',
            telemetry: 'unavailable',
            progress: undefined,
            confidence: undefined,
            cost: undefined,
            status: 'queued',
          }),
        ]}
        onAgentClick={() => {}}
      />,
    )

    expect(screen.getByText('Partial telemetry')).toBeInTheDocument()
    expect(screen.getByText('No detailed telemetry')).toBeInTheDocument()
    expect(screen.getByText(/Per-agent telemetry is not available/i)).toBeInTheDocument()
  })
})
