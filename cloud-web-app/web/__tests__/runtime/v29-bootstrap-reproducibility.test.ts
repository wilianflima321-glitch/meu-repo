import { describe, expect, it } from 'vitest'

import {
  buildV29BootstrapDependency,
  buildV29BootstrapReproducibilityReport,
  validateV29BootstrapReproducibilityReport,
  type V29BootstrapWorkspace,
} from '@/lib/runtime/v29-bootstrap-reproducibility'

const WORKSPACES: V29BootstrapWorkspace[] = [
  {
    id: 'web',
    path: 'cloud-web-app/web',
    packageManager: 'npm',
    packageJsonPresent: true,
    lockfilePresent: false,
    evidenceRefs: ['package-json:cloud-web-app/web/package.json'],
  },
  {
    id: 'studio-local-tauri',
    path: 'apps/studio-local/src-tauri',
    packageManager: 'cargo',
    cargoTomlPresent: true,
    lockfilePresent: true,
    evidenceRefs: ['cargo-toml:apps/studio-local/src-tauri/Cargo.toml', 'cargo-lock:apps/studio-local/src-tauri/Cargo.lock'],
  },
]

describe('v29 bootstrap reproducibility', () => {
  it('records missing lockfiles as blockers while keeping release claims held', () => {
    const report = buildV29BootstrapReproducibilityReport({
      generatedAt: '2026-06-07T00:00:00.000Z',
      workspaces: WORKSPACES,
      dependencies: [
        buildV29BootstrapDependency({
          id: 'ffmpeg',
          category: 'binary-toolchain',
          status: 'missing',
          requiredFor: ['video-export', 'cinematic-review'],
          evidenceRefs: ['toolchain-probe:ffmpeg'],
        }),
        buildV29BootstrapDependency({
          id: 'tauri-kernel',
          category: 'rust-workspace',
          status: 'available',
          requiredFor: ['studio-local', 'sidecar-routing'],
          evidenceRefs: ['cargo-toml:apps/studio-local/src-tauri/Cargo.toml'],
        }),
      ],
    })

    expect(validateV29BootstrapReproducibilityReport(report)).toEqual([])
    expect(report.summary.releaseReady).toBe(false)
    expect(report.summary.lockfilesMissing).toBe(1)
    expect(report.summary.missingCriticalDependencies).toBe(1)
    expect(report.blockers).toContain('web: lockfile is missing, reproducible bootstrap is not proven')
    expect(report.blockers).toContain('ffmpeg: required dependency is missing')
    expect(report.claimPolicy.prohibitedClaims).toContain('desktop ready')
    expect(report.claimPolicy.prohibitedClaims).toContain('native renderer ready')
  })

  it('rejects structurally incomplete reports', () => {
    const report = buildV29BootstrapReproducibilityReport({
      workspaces: [
        {
          id: 'web',
          path: '',
          packageManager: 'unknown',
          packageJsonPresent: true,
          lockfilePresent: false,
          evidenceRefs: [],
        },
      ],
      dependencies: [
        buildV29BootstrapDependency({
          id: '',
          category: 'environment',
          status: 'held',
          requiredFor: [],
          evidenceRefs: [],
        }),
      ],
    })

    expect(validateV29BootstrapReproducibilityReport(report)).toEqual(
      expect.arrayContaining([
        'studio-local-tauri workspace must be included',
        'web: workspace path is required',
        'web: package manager is unknown',
        'web: evidence refs are required',
        'dependency id is required',
        ': requiredFor lanes are missing',
        ': evidence refs are required',
      ]),
    )
  })
})
