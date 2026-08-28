import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import WorkbenchEditorToolbar from '@aethel/ide-ui/fullscreen/WorkbenchEditorToolbar'
import type { WorkbenchCollaborationStatus } from '@aethel/ide-ui/fullscreen/types'
import type { RemotePeer } from '../../hooks/useCollaborationAwareness'

function buildStatus(
  overrides: Partial<WorkbenchCollaborationStatus> = {}
): WorkbenchCollaborationStatus {
  return {
    state: 'disabled',
    tone: 'neutral',
    label: 'Solo',
    detail: 'Entre com sua conta para sincronizar cursores e presenca.',
    peerCount: 0,
    liveCursorCount: 0,
    ...overrides,
  }
}

function buildPeer(overrides: Partial<RemotePeer> = {}): RemotePeer {
  return {
    clientId: 1,
    id: 'peer-1',
    name: 'Ada Lovelace',
    color: '#3b82f6',
    lastActivity: Date.now(),
    ...overrides,
  }
}

function renderToolbar({
  collaborationConnected = false,
  collaborationStatus = buildStatus(),
  collaborationPeers = [],
}: {
  collaborationConnected?: boolean
  collaborationStatus?: WorkbenchCollaborationStatus
  collaborationPeers?: RemotePeer[]
} = {}) {
  return render(
    <WorkbenchEditorToolbar
      isCompactViewport={false}
      collaborationConnected={collaborationConnected}
      collaborationStatus={collaborationStatus}
      collaborationPeers={collaborationPeers}
      splitEditorOpen={false}
      nextOpenTarget="primary"
      splitDirection="horizontal"
      showIntelliSense={false}
      showOutline={false}
      showDiagnostics={false}
      setNextOpenTarget={vi.fn()}
      setSplitDirection={vi.fn()}
      setShowIntelliSense={vi.fn()}
      setShowOutline={vi.fn()}
      setShowDiagnostics={vi.fn()}
      onFind={vi.fn()}
      onReplace={vi.fn()}
      onToggleSplitEditor={vi.fn()}
    />
  )
}

describe('WorkbenchEditorToolbar', () => {
  it('shows a solo collaboration chip when the session is disabled', () => {
    renderToolbar()

    expect(screen.getByText('Solo')).toBeInTheDocument()
    expect(
      screen.getByText('Entre com sua conta para sincronizar cursores e presenca.')
    ).toBeInTheDocument()
    expect(screen.queryByTestId('collaborators-bar')).not.toBeInTheDocument()
  })

  it('keeps the toolbar in syncing mode until document sync is confirmed', () => {
    renderToolbar({
      collaborationConnected: true,
      collaborationStatus: buildStatus({
        state: 'syncing',
        tone: 'warning',
        label: 'Sincronizando',
        detail: 'Canal conectado; aguardando sync do documento com 2 peers.',
        peerCount: 2,
      }),
      collaborationPeers: [buildPeer(), buildPeer({ clientId: 2, id: 'peer-2', name: 'Grace Hopper' })],
    })

    expect(screen.getByText('Sincronizando')).toBeInTheDocument()
    expect(
      screen.getByText('Canal conectado; aguardando sync do documento com 2 peers.')
    ).toBeInTheDocument()
    expect(screen.queryByTestId('collaborators-bar')).not.toBeInTheDocument()
  })

  it('shows live collaborators only after sync is confirmed', () => {
    renderToolbar({
      collaborationConnected: true,
      collaborationStatus: buildStatus({
        state: 'live',
        tone: 'success',
        label: 'Ao vivo',
        detail: '2 peers conectados - 1 cursor ativo',
        peerCount: 2,
        liveCursorCount: 1,
      }),
      collaborationPeers: [
        buildPeer({ cursor: { x: 10, y: 12, line: 3, column: 4 } }),
        buildPeer({ clientId: 2, id: 'peer-2', name: 'Grace Hopper' }),
      ],
    })

    expect(screen.getByText('2 peers conectados - 1 cursor ativo')).toBeInTheDocument()
    expect(screen.getByTestId('collaborators-bar')).toBeInTheDocument()
  })

  it('surfaces sync errors without pretending the session is live', () => {
    renderToolbar({
      collaborationStatus: buildStatus({
        state: 'error',
        tone: 'danger',
        label: 'Sync com erro',
        detail: 'Connection timeout',
        errorMessage: 'Connection timeout',
      }),
    })

    expect(screen.getByText('Sync com erro')).toBeInTheDocument()
    expect(screen.getByText('Connection timeout')).toBeInTheDocument()
    expect(screen.queryByTestId('collaborators-bar')).not.toBeInTheDocument()
  })
})
