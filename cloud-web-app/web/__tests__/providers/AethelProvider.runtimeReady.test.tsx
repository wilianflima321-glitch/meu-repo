import React from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useSWRMock = vi.fn()

vi.mock('swr', () => ({
  default: (...args: unknown[]) => useSWRMock(...args),
}))

import { AethelProvider } from '@/lib/providers/AethelProvider'

describe('AethelProvider runtime gating', () => {
  beforeEach(() => {
    useSWRMock.mockReset()
    useSWRMock.mockImplementation(() => ({ data: undefined, mutate: vi.fn() }))
    window.localStorage.clear()
  })

  it('keeps auth, wallet, and onboarding requests dormant until runtimeReady is true', () => {
    render(
      <AethelProvider runtimeReady={false}>
        <div>child</div>
      </AethelProvider>
    )

    expect(useSWRMock.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(useSWRMock.mock.calls.every((call) => call[0] === null)).toBe(true)
  })
})
