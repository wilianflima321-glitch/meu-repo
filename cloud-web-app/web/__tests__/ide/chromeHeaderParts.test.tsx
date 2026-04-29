import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HeaderWorkspaceControls } from '@/components/ide/modern-shell/chromeHeaderParts'
import type { PanelState } from '@/components/ide/modern-shell/types'

const panelState: PanelState = {
  sidebar: { open: true, size: 280, minSize: 220, maxSize: 440 },
  preview: { open: true, size: 520, minSize: 360, maxSize: 820 },
  chat: { open: true, size: 320, minSize: 260, maxSize: 520 },
}

describe('HeaderWorkspaceControls', () => {
  it('renders the command center bar and dispatches the right palette modes', () => {
    const onOpenCommandPalette = vi.fn()

    render(
      <HeaderWorkspaceControls
        panelState={panelState}
        activeBottomPanel="chat"
        onTogglePanel={vi.fn()}
        onSelectBottomPanel={vi.fn()}
        onOpenCommandPalette={onOpenCommandPalette}
      />,
    )

    expect(screen.getByText('Command Center')).toBeInTheDocument()
    expect(
      screen.getByText('Pergunte, navegue e execute sem sair do cockpit.'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Abrir command center' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir quick open de arquivos' }))

    expect(onOpenCommandPalette).toHaveBeenNthCalledWith(1, 'commands')
    expect(onOpenCommandPalette).toHaveBeenNthCalledWith(2, 'files')
  })
})
