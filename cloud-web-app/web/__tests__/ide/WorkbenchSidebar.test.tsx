import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const searchParamsState = vi.hoisted(() => ({
  params: new URLSearchParams(),
}))

// Import-preserving mock: WorkbenchSidebar's graph imports only `useSearchParams`
// from `next/navigation`, but keeping the real module's other exports available
// guarantees no transitively-imported sibling ever receives `undefined`. The
// overridden `useSearchParams` reads the mutable `searchParamsState.params` at
// call time so each render sees the params assigned before render.
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    useSearchParams: () => searchParamsState.params,
  }
})

vi.mock('@aethel/ide-ui/FileExplorerPro', () => ({
  default: () => <div data-testid="file-explorer-pro">Explorer</div>,
}))

vi.mock('@aethel/ide-ui/GitIntegration', () => ({
  GitIntegration: () => <div data-testid="git-integration">Git</div>,
}))

import { WorkbenchSidebar } from '@aethel/ide-ui/fullscreen/WorkbenchSidebar'
// Leaf import (not the `@aethel/ide-ui/docking` barrel) for the same reason as
// `register-ide-dock-spine.ts` — WorkbenchSidebar bridges the Docking Engine via
// `useWorkspaceStore`, which requires a <WorkspaceProvider> ancestor (production
// wraps the shell the same way, see ViewportWorkbenchShell.tsx).
import { WorkspaceProvider } from '@aethel/ide-ui/docking/WorkspaceProvider'

describe('WorkbenchSidebar', () => {
  it('surfaces lane context from Studio entry triage without hiding file controls', () => {
    searchParamsState.params = new URLSearchParams({
      source: 'home-cloud-devops',
      mission: 'Fix the failing deployment',
    })

    render(
      <WorkspaceProvider>
        <WorkbenchSidebar
          sidebarTab="git"
          collaborationPeers={[]}
          onSidebarTabChange={vi.fn()}
          onFileSelect={vi.fn()}
        />
      </WorkspaceProvider>,
    )

    expect(screen.getByText('Cloud / DevOps')).toBeInTheDocument()
    expect(screen.getByText('Runtime-first')).toBeInTheDocument()
    expect(screen.getByText('Fix the failing deployment')).toBeInTheDocument()
    expect(screen.getByText(/runtime trust, Git state, and terminal checks hot/i)).toBeInTheDocument()
    // The Docking Engine renders sidebar tabs as proper ARIA tabs
    // (`<button role="tab">` inside `role="tablist"` with `aria-selected`), so
    // the accessible role is `tab`, not `button`.
    expect(screen.getByRole('tab', { name: 'Files' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Git', selected: true })).toBeInTheDocument()
    expect(screen.getByTestId('git-integration')).toBeInTheDocument()
  })
})
