import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { AIChatEconomicsPanel } from '../../components/agents/chat/economics'

const apiMocks = vi.hoisted(() => ({
  getStudioCostLive: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  AethelAPIClient: apiMocks,
}))

function renderPanel(props: React.ComponentProps<typeof AIChatEconomicsPanel>) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <AIChatEconomicsPanel {...props} />
    </SWRConfig>
  )
}

describe('AIChatEconomicsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders wallet, run estimate, and cost guidance when live data is available', async () => {
    apiMocks.getStudioCostLive.mockResolvedValue({
      status: 'attention',
      projectId: 'proj-77',
      wallet: {
        balance: 240,
        currency: 'credits',
        lowBalance: false,
        lowBalanceThreshold: 100,
      },
      budget: {
        hourly: { spendUsd: 4.2, budgetUsd: 10, percent: 42, status: 'healthy' },
        daily: { spendUsd: 36, budgetUsd: 50, percent: 72, status: 'warning' },
        monthly: { spendUsd: 140, budgetUsd: 200, percent: 70, status: 'warning' },
      },
      billing: {
        status: 'partial',
        checkoutReady: true,
        portalReady: false,
        webhookReady: true,
        blockers: ['STRIPE_PORTAL_DISABLED'],
        providerLabel: 'Stripe',
        setupEnv: ['STRIPE_SECRET_KEY'],
      },
      policy: {
        emergencyLevel: 'warning',
        fallbackModel: 'openai/gpt-4.1-mini',
        autoDowngradeOnWarning: true,
        autoShutdownOnCritical: false,
        maxTokensPerRequest: 4096,
        allowedModels: ['openai/gpt-4.1-mini'],
      },
      metrics: {
        totalRequestsToday: 22,
        totalTokensToday: 5400,
        avgCostPerRequestUsd: 0.37,
        updatedAt: '2026-04-28T15:00:00.000Z',
      },
      guidance: ['Budget is under attention: use review-first execution, fewer agents, and less web research before the next wave.'],
    })

    renderPanel({ projectId: 'proj-77', currentRunEstimate: 0.42 })

    await waitFor(() => {
      expect(screen.getByText(/Cost guard/i)).toBeInTheDocument()
    })

    expect(screen.getByText('240')).toBeInTheDocument()
    expect(screen.getByText('$0.420')).toBeInTheDocument()
    expect(screen.getByText(/STRIPE_PORTAL_DISABLED/i)).toBeInTheDocument()
    expect(screen.getByText(/Budget is under attention/i)).toBeInTheDocument()
  })

  it('renders an unavailable state when the cost guard request fails', async () => {
    apiMocks.getStudioCostLive.mockRejectedValue(new Error('offline'))

    renderPanel({ projectId: 'proj-404' })

    await waitFor(() => {
      expect(screen.getByText(/Cost guard unavailable/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Could not load live cost, wallet, and payment setup/i)).toBeInTheDocument()
  })
})
