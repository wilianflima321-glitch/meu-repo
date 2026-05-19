import { describe, expect, it } from 'vitest'

import { planAethelRenderer } from '@/lib/aaa-renderer-webgpu'

describe('Aethel WebGPU renderer plan', () => {
  it('selects WebGPU when the browser and module can initialize it', () => {
    expect(
      planAethelRenderer({
        navigatorGpuAvailable: true,
        webgpuModuleAvailable: true,
        webgpuInitOk: true,
      }),
    ).toEqual({
      preferred: 'webgpu',
      fallback: 'webgl2',
      reason: null,
    })
  })

  it('falls back to WebGL2 when WebGPU is unavailable', () => {
    expect(
      planAethelRenderer({
        navigatorGpuAvailable: false,
      }),
    ).toMatchObject({
      preferred: 'webgl2',
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
      }),
    ).toEqual({
      preferred: 'webgl2',
      fallback: null,
      reason: 'webgpu disabled by caller',
    })
  })
})
