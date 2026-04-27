import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDeferredRuntimeActivation } from '@/components/providers/runtime/useDeferredRuntimeActivation'

function RuntimeActivationProbe({ enabled = true }: { enabled?: boolean }) {
  const state = useDeferredRuntimeActivation(enabled)

  return (
    <div>
      <span data-testid="session">{String(state.sessionTrackingReady)}</span>
      <span data-testid="telemetry">{String(state.telemetryReady)}</span>
      <span data-testid="service-worker">{String(state.serviceWorkerReady)}</span>
      <span data-testid="ambient">{String(state.ambientUiReady)}</span>
    </div>
  )
}

describe('useDeferredRuntimeActivation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: vi.fn((callback: IdleRequestCallback) =>
        window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 0)
      ),
    })
    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      writable: true,
      value: vi.fn((handle: number) => window.clearTimeout(handle)),
    })
  })

  afterEach(() => {
    act(() => {
      vi.clearAllTimers()
    })
    vi.useRealTimers()
  })

  it('stages runtime effects instead of enabling all background activity immediately', () => {
    render(<RuntimeActivationProbe />)

    expect(screen.getByTestId('session')).toHaveTextContent('false')
    expect(screen.getByTestId('telemetry')).toHaveTextContent('false')
    expect(screen.getByTestId('service-worker')).toHaveTextContent('false')
    expect(screen.getByTestId('ambient')).toHaveTextContent('false')

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(screen.getByTestId('session')).toHaveTextContent('true')
    expect(screen.getByTestId('telemetry')).toHaveTextContent('true')
    expect(screen.getByTestId('service-worker')).toHaveTextContent('false')
    expect(screen.getByTestId('ambient')).toHaveTextContent('false')

    act(() => {
      vi.advanceTimersByTime(1800)
    })
    expect(screen.getByTestId('service-worker')).toHaveTextContent('true')

    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(screen.getByTestId('ambient')).toHaveTextContent('true')
  })

  it('activates the remaining runtime effects on user intent', () => {
    render(<RuntimeActivationProbe />)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      vi.runOnlyPendingTimers()
    })

    expect(screen.getByTestId('service-worker')).toHaveTextContent('true')
    expect(screen.getByTestId('ambient')).toHaveTextContent('true')
  })
})
