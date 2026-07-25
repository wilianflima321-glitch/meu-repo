import { describe, expect, it } from 'vitest'

import { planAethelRenderer } from '@/lib/aaa-renderer-webgpu'

describe('Aethel WebGPU renderer plan', () => {
  it('CW3 fail-closed: API+module alone never prefer WebGPU present', () => {
    const plan = planAethelRenderer({
      navigatorGpuAvailable: true,
      webgpuModuleAvailable: true,
      webgpuInitOk: true,
    })
    expect(plan.preferred).toBe('webgl2')
    expect(plan.webgpuPresentClaimAllowed).toBe(false)
    expect(plan.reason).toMatch(/adapter\+device/i)
  })

  it('selects experimental WebGPU factory only with adapter+device (still not canonical present)', () => {
    const plan = planAethelRenderer({
      navigatorGpuAvailable: true,
      webgpuModuleAvailable: true,
      webgpuInitOk: true,
      webgpuAdapterAcquired: true,
      webgpuDeviceReady: true,
    })
    expect(plan.preferred).toBe('webgpu')
    expect(plan.fallback).toBe('webgl2')
    expect(plan.webgpuPresentClaimAllowed).toBe(false)
    expect(plan.reason).toMatch(/canonical present remains R3F\/WebGL2/i)
  })

  it('falls back to WebGL2 when WebGPU is unavailable', () => {
    expect(
      planAethelRenderer({
        navigatorGpuAvailable: false,
      }),
    ).toMatchObject({
      preferred: 'webgl2',
      webgpuPresentClaimAllowed: false,
      reason: 'navigator.gpu is not available',
    })
  })

  it('keeps explicit WebGPU opt-out deterministic', () => {
    expect(
      planAethelRenderer({
        preferWebGPU: false,
        navigatorGpuAvailable: true,
        webgpuModuleAvailable: true,
        webgpuInitOk: true,
        webgpuAdapterAcquired: true,
        webgpuDeviceReady: true,
      }),
    ).toEqual({
      preferred: 'webgl2',
      fallback: null,
      reason: 'webgpu disabled by caller',
      webgpuPresentClaimAllowed: false,
    })
  })
})
