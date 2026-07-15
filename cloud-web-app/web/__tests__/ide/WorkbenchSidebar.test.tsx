import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const searchParamsState = vi.hoisted(() => ({
  params: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsState.params,
}))

vi.mock('@aethel/ide-ui/FileExplorerPro', () => ({
  default: () => <div data-testid="file-explorer-pro">Explorer</div>,
}))

vi.mock('@aethel/ide-ui/GitIntegration', () => ({
  GitIntegration: () => <div data-testid="git-integration">Git</div>,
}))

import { WorkbenchSidebar } from '@aethel/ide-ui/fullscreen/WorkbenchSidebar'

describe('WorkbenchSidebar', () => {
  it('surfaces lane context from Studio entry triage without hiding file controls', () => {
    searchParamsState.params = new URLSearchParams({
      source: 'home-cloud-devops',
      mission: 'Fix the failing deployment',
    })

    render(
      <WorkbenchSidebar
        sidebarTab="git"
        collaborationPeers={[]}
        onSidebarTabChange={vi.fn()}
        onFileSelect={vi.fn()}
      />,
    )

    expect(screen.getByText('Cloud / DevOps')).toBeInTheDocument()
    expect(screen.getByText('Runtime-first')).toBeInTheDocument()
    expect(screen.getByText('Fix the failing deployment')).toBeInTheDocument()
    expect(screen.getByText(/runtime trust, Git state, and terminal checks hot/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Files' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Git' })).toBeInTheDocument()
    expect(screen.getByTestId('git-integration')).toBeInTheDocument()
  })
})
