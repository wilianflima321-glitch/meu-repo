import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}))

import { AethelDashboardSidebar } from '@/components/dashboard/AethelDashboardSidebar'

describe('AethelDashboardSidebar', () => {
  it('keeps the primary flow visible and hides secondary sections until expanded', () => {
    render(
      <AethelDashboardSidebar
        sidebarOpen
        activeTab="overview"
        sessionFilter="all"
        entryMission="Launch the product site"
        onCreateNewSession={vi.fn()}
        onSelectSessionFilter={vi.fn()}
        onSelectTab={vi.fn()}
        onOpenIde={vi.fn()}
        onCloseMobile={vi.fn()}
      />
    )

    expect(screen.getAllByText('Studio Home').length).toBeGreaterThan(0)
    expect(screen.getByText('AI Console')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()

    expect(screen.queryByText('Billing')).not.toBeInTheDocument()
    expect(screen.queryByText('Content creation')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /operations/i }))
    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.getByText('Wallet')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /explore/i }))
    expect(screen.getByText('Templates')).toBeInTheDocument()
    expect(screen.getByText('Content creation')).toBeInTheDocument()
    expect(screen.getByText('Unreal')).toBeInTheDocument()
  })

  it('shows a visible studio depth action', () => {
    const onOpenIde = vi.fn()

    render(
      <AethelDashboardSidebar
        sidebarOpen
        activeTab="projects"
        sessionFilter="all"
        onCreateNewSession={vi.fn()}
        onSelectSessionFilter={vi.fn()}
        onSelectTab={vi.fn()}
        onOpenIde={onOpenIde}
        onCloseMobile={vi.fn()}
      />
    )

    const studioButtons = screen.getAllByRole('button', { name: 'Expand Studio' })
    fireEvent.click(studioButtons[studioButtons.length - 1]!)
    expect(onOpenIde).toHaveBeenCalledTimes(1)
  })
})
