/**
 * L.9 — ForgeScaffoldWizard interactive surface.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ForgeScaffoldWizard } from '@/components/studio/ForgeScaffoldWizard'

const runInteractiveForgeScaffold = vi.fn()

vi.mock('@/lib/production/forge-scaffold-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/production/forge-scaffold-client')>(
    '@/lib/production/forge-scaffold-client',
  )
  return {
    ...actual,
    runInteractiveForgeScaffold: (...args: unknown[]) => runInteractiveForgeScaffold(...args),
  }
})

vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('ForgeScaffoldWizard (L.9)', () => {
  beforeEach(() => {
    runInteractiveForgeScaffold.mockReset()
  })

  it('renders L.2 template choices and does not claim success before API', () => {
    render(<ForgeScaffoldWizard autoNavigate={false} />)
    expect(screen.getByText(/L\.9 FullStack Scaffold/i)).toBeTruthy()
    expect(screen.getByText('Next.js 14')).toBeTruthy()
    expect(screen.getByText('Vite + React')).toBeTruthy()
    expect(screen.queryByText(/Scaffold complete/i)).toBeNull()
  })

  it('runs scaffold after template + name and surfaces fail-closed gate errors', async () => {
    runInteractiveForgeScaffold.mockResolvedValueOnce({
      ok: false,
      error: 'L8_PREVIEW: Preview URL started but never became reachable',
      code: 'GATE_BLOCKED',
      blockedReasons: ['L8_PREVIEW: Preview URL started but never became reachable'],
      commitGate: {
        ok: false,
        checks: [
          {
            id: 'L8_PREVIEW',
            status: 'fail',
            message: 'Preview URL started but never became reachable',
          },
        ],
      },
      orphanProjectCreated: true,
      projectId: 'proj-1',
    })

    render(<ForgeScaffoldWizard autoNavigate={false} />)

    fireEvent.click(screen.getByText('Next.js 14'))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    fireEvent.change(screen.getByLabelText(/Project name/i), {
      target: { value: 'demo-app' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Scaffold & open/i }))

    await waitFor(() => {
      expect(runInteractiveForgeScaffold).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'demo-app',
          templateId: 'nextjs-14',
        }),
      )
    })

    expect(await screen.findByText(/Scaffold blocked \(fail-closed\)/i)).toBeTruthy()
    expect(screen.getAllByText(/L8_PREVIEW/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/code:\s*GATE_BLOCKED/i)).toBeTruthy()
    expect(screen.queryByText(/Scaffold complete/i)).toBeNull()
  })

  it('invokes onSuccess only when client returns ok:true', async () => {
    const onSuccess = vi.fn()
    runInteractiveForgeScaffold.mockResolvedValueOnce({
      ok: true,
      projectId: 'proj-ok',
      templateId: 'vite-react',
      openUrl: '/ide?projectId=proj-ok',
      previewUrl: 'https://preview.test',
      devContainerPersistOk: true,
      marketingAllowed: false,
    })

    render(<ForgeScaffoldWizard autoNavigate={false} onSuccess={onSuccess} />)

    fireEvent.click(screen.getByText('Vite + React'))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.change(screen.getByLabelText(/Project name/i), {
      target: { value: 'vite-demo' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Scaffold & open/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true, projectId: 'proj-ok' }),
      )
    })
    expect(await screen.findByText(/Scaffold complete/i)).toBeTruthy()
  })
})
