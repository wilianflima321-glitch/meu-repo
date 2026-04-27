import { afterEach, describe, expect, it, vi } from 'vitest'

describe('analytics lazy facade', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('does not instantiate the analytics tracker until a facade method is called', async () => {
    vi.resetModules()

    const analyticsModule = await import('@/lib/analytics')
    const getInstanceSpy = vi.spyOn(analyticsModule.AnalyticsTracker, 'getInstance')

    expect(getInstanceSpy).not.toHaveBeenCalled()

    analyticsModule.analytics?.track('performance', 'page_load', {
      label: 'lazy-facade-test',
    })

    expect(getInstanceSpy).toHaveBeenCalledTimes(1)
  })
})
