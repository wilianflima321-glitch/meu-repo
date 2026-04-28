import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useServiceWorker } from '@/hooks/useServiceWorker'

function flushPromises() {
  return Promise.resolve()
}

function ServiceWorkerProbe() {
  const sw = useServiceWorker(true)

  return (
    <div>
      <span data-testid="registered">{String(sw.isRegistered)}</span>
      <button type="button" onClick={sw.skipWaiting}>
        Skip waiting
      </button>
    </div>
  )
}

describe('useServiceWorker', () => {
  let registerMock: ReturnType<typeof vi.fn>
  let updateMock: ReturnType<typeof vi.fn>
  let waitingPostMessageMock: ReturnType<typeof vi.fn>
  let controllerChangeListeners: Set<EventListener>
  let messageListeners: Set<EventListener>
  let visibilityState: DocumentVisibilityState
  let online = true
  let reloadMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    visibilityState = 'visible'
    online = true
    controllerChangeListeners = new Set()
    messageListeners = new Set()
    reloadMock = vi.fn()
    waitingPostMessageMock = vi.fn()
    updateMock = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    })

    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    })

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => online,
    })

    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: vi.fn((callback: IdleRequestCallback) =>
        window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 10)
      ),
    })

    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      writable: true,
      value: vi.fn((handle: number) => window.clearTimeout(handle)),
    })

    const registration = {
      scope: '/',
      waiting: { postMessage: waitingPostMessageMock },
      installing: null,
      update: updateMock,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as ServiceWorkerRegistration

    registerMock = vi.fn().mockResolvedValue(registration)

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: registerMock,
        controller: {
          postMessage: vi.fn(),
        },
        addEventListener: vi.fn((type: string, listener: EventListener) => {
          if (type === 'controllerchange') controllerChangeListeners.add(listener)
          if (type === 'message') messageListeners.add(listener)
        }),
        removeEventListener: vi.fn((type: string, listener: EventListener) => {
          if (type === 'controllerchange') controllerChangeListeners.delete(listener)
          if (type === 'message') messageListeners.delete(listener)
        }),
      },
    })

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        reload: reloadMock,
      },
    })
  })

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers()
    })
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('waits for idle time before registering the service worker', async () => {
    render(<ServiceWorkerProbe />)

    expect(registerMock).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(10)
      await flushPromises()
    })

    expect(registerMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('registered')).toHaveTextContent('true')
  })

  it('only reloads after controllerchange when skipWaiting was explicitly requested', async () => {
    render(<ServiceWorkerProbe />)

    await act(async () => {
      vi.advanceTimersByTime(10)
      await flushPromises()
    })

    act(() => {
      for (const listener of controllerChangeListeners) {
        listener(new Event('controllerchange'))
      }
    })
    expect(reloadMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /skip waiting/i }))
    expect(waitingPostMessageMock).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })

    act(() => {
      for (const listener of controllerChangeListeners) {
        listener(new Event('controllerchange'))
      }
    })
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })
})
