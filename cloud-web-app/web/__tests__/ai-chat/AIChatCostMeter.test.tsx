import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AIChatCostMeter } from '@/components/agents/chat/AIChatCostMeter'

const apiMocks = vi.hoisted(() => ({
  getStudioCostLive: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  AethelAPIClient: apiMocks,
}))

function renderMeter(props: Partial<React.ComponentProps<typeof AIChatCostMeter>> = {}) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <AIChatCostMeter
        projectId="proj-77"
        currentRunEstimate={0.42}
        selectedModelName="GPT-5.4 Codex"
        isAIWorking={false}
        onOpenEconomics={vi.fn()}
        {...props}
      />
    </SWRConfig>
  )
}

describe('AIChatCostMeter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a compact live cost rail with run, wallet, and monthly budget', async () => {
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
        avgCostPerRequestUsd: 0.42,
        updatedAt: '2026-04-28T15:00:00.000Z',
      },
      guidance: ['Keep the wave small.'],
    })

    renderMeter()

    await waitFor(() => {
      expect(screen.getByText(/Live cost/i)).toBeInTheDocument()
    })

    expect(screen.getByText('GPT-5.4 Codex')).toBeInTheDocument()
    expect(screen.getByText('$0.420')).toBeInTheDocument()
    expect(screen.getByText('240')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('opens the deeper economics panel from the compact rail', async () => {
    const onOpenEconomics = vi.fn()
    apiMocks.getStudioCostLive.mockResolvedValue({
      status: 'ready',
      projectId: 'proj-77',
      wallet: {
        balance: 900,
        currency: 'credits',
        lowBalance: false,
        lowBalanceThreshold: 100,
      },
      budget: {
        hourly: { spendUsd: 1, budgetUsd: 10, percent: 10, status: 'healthy' },
        daily: { spendUsd: 4, budgetUsd: 50, percent: 8, status: 'healthy' },
        monthly: { spendUsd: 30, budgetUsd: 200, percent: 15, status: 'healthy' },
      },
      billing: {
        status: 'ready',
        checkoutReady: true,
        portalReady: true,
        webhookReady: true,
        blockers: [],
        providerLabel: 'Stripe',
        setupEnv: [],
      },
      policy: {
        emergencyLevel: 'normal',
        fallbackModel: 'openai/gpt-4.1-mini',
        autoDowngradeOnWarning: true,
        autoShutdownOnCritical: false,
        maxTokensPerRequest: 4096,
        allowedModels: ['openai/gpt-4.1-mini'],
      },
      metrics: {
        totalRequestsToday: 4,
        totalTokensToday: 1000,
        avgCostPerRequestUsd: 0.11,
        updatedAt: '2026-04-28T15:00:00.000Z',
      },
      guidance: [],
    })

    renderMeter({ onOpenEconomics })

    const button = await screen.findByRole('button', { name: /Open live economics/i })
    fireEvent.click(button)

    expect(onOpenEconomics).toHaveBeenCalledTimes(1)
  })
})
