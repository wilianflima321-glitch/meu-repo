/**
 * Tests for ai-chat/AgentBoard.
 *
 * Covers:
 *  - Renders nothing when the agent list is empty.
 *  - Renders one row per agent with name, role, task.
 *  - Clicking an agent row triggers onAgentClick with the agent id.
 *  - Shows the dependency hint when `dependency` is provided.
 *  - Header reports the total agent count.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentBoard, type AgentInfo } from '../../components/ai-chat/AgentBoard';

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
    ...overrides,
  };
}

describe('AgentBoard', () => {
  it('renders nothing when there are no agents', () => {
    const { container } = render(<AgentBoard agents={[]} onAgentClick={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one row per agent with name and task', () => {
    render(
      <AgentBoard
        agents={[
          agent({ id: '1', name: 'Planner' }),
          agent({ id: '2', name: 'Coder', currentTask: 'Editing App.tsx' }),
        ]}
        onAgentClick={() => {}}
      />,
    );
    expect(screen.getByText('Planner')).toBeInTheDocument();
    expect(screen.getByText('Coder')).toBeInTheDocument();
    expect(screen.getByText('Editing App.tsx')).toBeInTheDocument();
  });

  it('fires onAgentClick with the agent id when clicked', () => {
    const onAgentClick = vi.fn();
    render(
      <AgentBoard
        agents={[agent({ id: 'a-42', name: 'Reviewer' })]}
        onAgentClick={onAgentClick}
      />,
    );
    fireEvent.click(screen.getByText('Reviewer'));
    expect(onAgentClick).toHaveBeenCalledWith('a-42');
  });

  it('renders the dependency hint when provided', () => {
    render(
      <AgentBoard
        agents={[agent({ id: '1', dependency: 'Planner output' })]}
        onAgentClick={() => {}}
      />,
    );
    expect(screen.getByText(/Depende de: Planner output/i)).toBeInTheDocument();
  });

  it('reports the total agent count in the header', () => {
    render(
      <AgentBoard
        agents={[agent({ id: '1' }), agent({ id: '2' }), agent({ id: '3' })]}
        onAgentClick={() => {}}
      />,
    );
    expect(screen.getByText('3 agentes')).toBeInTheDocument();
  });
});
