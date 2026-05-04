import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DashboardRepositoryCartographyCard } from '@/components/dashboard/DashboardRepositoryCartographyCard'
import type { RepositoryCartographySnapshot } from '@/components/dashboard/dashboard-repository-cartography'

const snapshot: RepositoryCartographySnapshot = {
  title: 'Repository Cartography',
  status: 'ready',
  statusLabel: 'Ready',
  summary: 'Mapped 12 files with no blocker.',
  nextAction: 'Route agents through handoffs',
  signals: [
    { label: 'Files', value: '12 files / 10 MB', status: 'ready' },
    { label: 'Graphs', value: '6/6', status: 'ready' },
    { label: 'Evidence', value: '1 refs', status: 'ready' },
    { label: 'Risk', value: 'Clear', status: 'ready' },
    { label: 'Context', value: '4 mustRead', status: 'ready' },
  ],
  contextBudget: {
    summary: '12 chunks / 3 batches',
    batches: [
      { label: 'Read', value: '0.1 MB', status: 'ready' },
      { label: 'Summarize', value: '1.2 MB', status: 'ready' },
      { label: 'Index/Mirror', value: '80 MB', status: 'attention' },
      { label: 'Review', value: '0 MB', status: 'attention' },
    ],
  },
  agents: [
    { label: 'Producer Agent', scope: '2 surfaces', status: 'ready' },
    { label: 'QA Agent', scope: '1 surface', status: 'ready' },
  ],
  guardrails: ['Agents must read Project Brain before edits.', 'Large assets stay metadata-first.'],
}

describe('DashboardRepositoryCartographyCard', () => {
  it('keeps scan as one compact primary action', () => {
    const onScanContext = vi.fn()

    render(
      <DashboardRepositoryCartographyCard
        snapshot={snapshot}
        onOpenAiChat={vi.fn()}
        onOpenIde={vi.fn()}
        onScanContext={onScanContext}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /scan context/i }))
    expect(onScanContext).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Agent fleet')).toBeInTheDocument()
    expect(screen.getByText('Reading plan')).toBeInTheDocument()
    expect(screen.getByText(/Index\/Mirror:/)).toBeInTheDocument()
    expect(screen.getByText('Risk')).toBeInTheDocument()
  })

  it('shows scan progress without replacing the next action with a text wall', () => {
    render(
      <DashboardRepositoryCartographyCard
        snapshot={snapshot}
        onOpenAiChat={vi.fn()}
        onOpenIde={vi.fn()}
        onScanContext={vi.fn()}
        scanState="scanning"
        scanNote="Scanning workspace metadata without loading heavy files into chat context."
      />
    )

    expect(screen.getByRole('button', { name: /scanning/i })).toBeDisabled()
    expect(screen.getByText('Scan:')).toBeInTheDocument()
    expect(screen.getByText('Scanning workspace metadata without loading heavy files into chat context.')).toBeInTheDocument()
  })
})
