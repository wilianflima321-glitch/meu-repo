import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import StudioMissionControl from '@/app/studio/StudioMissionControl'

vi.mock('@/lib/analytics', () => ({
  analytics: {
    track: vi.fn(),
  },
}))

const originalFetch = global.fetch

describe('StudioMissionControl', () => {
  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('starts a durable session, runs a compact agent wave, and pauses the session', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/studio/session/start') {
        return Response.json({
          session: {
            id: 'studio_session_123456',
            title: 'Playable scene',
            mission: 'Playable scene',
            mode: 'game',
            status: 'active',
            runtimeTarget: 'cloud-sandbox',
            activeTaskIds: [],
            evidenceRefs: [],
          },
        })
      }
      if (url === '/api/studio/tasks/run-wave') {
        return Response.json({
          taskCount: 3,
          tasks: [
            { id: 'task-1', goal: 'Producer: coordinate mission.' },
            { id: 'task-2', goal: 'QA: validate evidence.' },
            { id: 'task-3', goal: 'Release: prepare checklist.' },
          ],
        })
      }
      if (url === '/api/studio/session/studio_session_123456') {
        return Response.json({
          session: {
            id: 'studio_session_123456',
            title: 'Playable scene',
            mission: 'Playable scene',
            mode: 'game',
            status: 'active',
            runtimeTarget: 'cloud-sandbox',
            activeTaskIds: ['task-1', 'task-2', 'task-3'],
            evidenceRefs: ['mission-ledger://studio_session_123456/task-1'],
          },
        })
      }
      if (url === '/api/studio/session/studio_session_123456/stop') {
        return Response.json({
          session: {
            id: 'studio_session_123456',
            title: 'Playable scene',
            mission: 'Playable scene',
            mode: 'game',
            status: 'stopped',
            runtimeTarget: 'cloud-sandbox',
            activeTaskIds: ['task-1', 'task-2', 'task-3'],
            evidenceRefs: ['mission-ledger://studio_session_123456/task-1'],
          },
        })
      }
      return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
    })

    global.fetch = fetchMock as typeof fetch

    render(<StudioMissionControl />)

    fireEvent.click(screen.getByRole('button', { name: /start session/i }))
    await waitFor(() => expect(screen.getByText('Studio session is active.')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /run 3-agent wave/i }))
    await waitFor(() => expect(screen.getByText('Planned 3 coordinated task(s).')).toBeInTheDocument())
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Producer: coordinate mission.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /pause session/i }))
    await waitFor(() => expect(screen.getByText('Studio session paused.')).toBeInTheDocument())
    expect(screen.getByText('stopped')).toBeInTheDocument()
  })
})
