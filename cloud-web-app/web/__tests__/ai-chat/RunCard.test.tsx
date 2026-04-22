/**
 * Tests for ai-chat/RunCard.
 *
 * Covers:
 *  - Renders nothing when status is "idle" (no visual noise).
 *  - Renders a "Concluído" label for completed runs.
 *  - Shows an Interrupt button only while running.
 *  - Interrupt button triggers the onInterrupt callback.
 *  - Duration and cost are rendered in the meta row.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunCard } from '../../components/ai-chat/RunCard';

describe('RunCard', () => {
  it('renders nothing when status is idle', () => {
    const { container } = render(
      <RunCard status="idle" duration={0} cost={0} model="gpt-4o" onInterrupt={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "Concluído" for completed runs', () => {
    render(
      <RunCard status="completed" duration={1.25} cost={0.002} model="gpt-4o" onInterrupt={() => {}} />,
    );
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('shows the interrupt button only while running', () => {
    const onInterrupt = vi.fn();
    const { rerender } = render(
      <RunCard status="running" duration={0.4} cost={0.001} model="gpt-4o" onInterrupt={onInterrupt} />,
    );
    const button = screen.getByRole('button', { name: /interromper opera/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onInterrupt).toHaveBeenCalledTimes(1);

    rerender(
      <RunCard status="completed" duration={0.4} cost={0.001} model="gpt-4o" onInterrupt={onInterrupt} />,
    );
    expect(screen.queryByRole('button', { name: /interromper opera/i })).toBeNull();
  });

  it('renders duration and cost in the meta row', () => {
    render(
      <RunCard status="running" duration={2.5} cost={0.0123} model="gpt-4o" onInterrupt={() => {}} />,
    );
    expect(screen.getByText(/2\.50s/)).toBeInTheDocument();
    expect(screen.getByText(/\$0\.0123/)).toBeInTheDocument();
  });
});
