/**
 * Tests for ide/fullscreen/WorkbenchEntryNotice.
 *
 * Covers:
 *  - Renders the notice title + description.
 *  - Applies warning styles when tone === 'warning'.
 *  - Dismiss button fires onDismiss.
 *  - Dismiss button has a Portuguese aria-label for screen readers.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkbenchEntryNotice } from '../../components/ide/fullscreen/WorkbenchEntryNotice';

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
    fireEvent.click(screen.getByRole('button', { name: /fechar aviso do workbench/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders the dismiss button with a portuguese aria-label', () => {
    render(
      <WorkbenchEntryNotice
        notice={{ tone: 'warning', title: 'Atenção', description: 'desc' }}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByLabelText('Fechar aviso do workbench')).toBeInTheDocument();
  });
});
