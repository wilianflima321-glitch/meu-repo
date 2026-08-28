/**
 * Tests for ide/fullscreen/WorkbenchEntryNotice.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkbenchEntryNotice } from '@aethel/ide-ui/fullscreen/WorkbenchEntryNotice';

describe('WorkbenchEntryNotice', () => {
  it('renders the notice title and description', () => {
    render(
      <WorkbenchEntryNotice
        notice={{ tone: 'info', title: 'LAB DEEPWORK', description: 'Entrando em modo foco.' }}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText('LAB DEEPWORK')).toBeInTheDocument();
    expect(screen.getByText('Entrando em modo foco.')).toBeInTheDocument();
  });

  it('triggers onDismiss when the close button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <WorkbenchEntryNotice
        notice={{ tone: 'info', title: 'X', description: 'Y' }}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /close workbench notice/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders the dismiss button with an accessible aria-label', () => {
    render(
      <WorkbenchEntryNotice
        notice={{ tone: 'warning', title: 'Atenção', description: 'desc' }}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByLabelText('Close workbench notice')).toBeInTheDocument();
  });
});
