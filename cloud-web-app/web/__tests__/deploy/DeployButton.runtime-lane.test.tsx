import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useRuntimeLanePolicyMock = vi.fn()

vi.mock('@/hooks/useRuntimeLanePolicy', () => ({
  useRuntimeLanePolicy: (...args: unknown[]) => useRuntimeLanePolicyMock(...args),
}))

import { DeployButton } from '@/components/deploy/DeployButton'

describe('DeployButton runtime lane guard', () => {
  beforeEach(() => {
    useRuntimeLanePolicyMock.mockReset()
    useRuntimeLanePolicyMock.mockReturnValue({
      budget: {
        lane: 'build-export',
        label: 'Build/export',
        maxConcurrent: 1,
        placement: 'cloud-sandbox',
        pauseWhenUserActive: false,
        requiresConfirmation: false,
        maxQueueDepth: 1,
      },
      decision: {
        lane: 'build-export',
        canStart: false,
        placement: 'cloud-sandbox',
        reason: 'Build/export is at its concurrency limit.',
        requiresConfirmation: false,
      },
      route: {
        lane: 'build-export',
        canStart: false,
        target: 'held',
        preferredPlacement: 'cloud-sandbox',
        safety: 'held',
        requiresConfirmation: false,
        reason: 'Build/export is at its concurrency limit.',
        label: 'build export held',
        detail: 'Build/export is at its concurrency limit.',
        nativeBridge: 'missing',
      },
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ canDeploy: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
  })

  it('disables deploy when the build/export lane is unavailable', async () => {
    render(<DeployButton projectName="Aethel Runtime" />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled()
    })

    const button = screen.getByTestId('deploy-button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Build/export is at its concurrency limit.')
  })
})
