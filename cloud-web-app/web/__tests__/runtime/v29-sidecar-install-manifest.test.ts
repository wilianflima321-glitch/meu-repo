import { describe, expect, it } from 'vitest'

import {
  buildV29SidecarInstallArtifact,
  buildV29SidecarInstallManifest,
  validateV29SidecarInstallManifest,
} from '@aethel/runtime/v29-sidecar-install-manifest'

function completeArtifact(os: 'windows' | 'macos' | 'linux') {
  return buildV29SidecarInstallArtifact({
    os,
    state: 'available',
    templatePath: `runtime-templates/${os}`,
    packageName: `@aethel/game-runtime-${os}`,
    version: '1.0.0',
    artifactPatterns: [`aethel-${os}-*.zip`],
    buildCommands: [`npm run build:${os}`],
    checksumRef: `checksum:${os}`,
    signatureRef: `signature:${os}`,
    smokeTestRef: `install-smoke:${os}`,
    rollbackRef: `rollback:${os}`,
    evidenceRefs: [`runtime-template:${os}`, `installer:${os}`],
  })
}

describe('v29 sidecar install manifest', () => {
  it('accepts complete install/update evidence while keeping release held', () => {
    const manifest = buildV29SidecarInstallManifest({
      generatedAt: '2026-06-07T00:00:00.000Z',
      artifacts: [completeArtifact('windows'), completeArtifact('macos'), completeArtifact('linux')],
    })

    expect(validateV29SidecarInstallManifest(manifest)).toEqual([])
    expect(manifest.summary.osTargets).toBe(3)
    expect(manifest.summary.checksumCoverage).toBe(3)
    expect(manifest.summary.signatureCoverage).toBe(3)
    expect(manifest.summary.smokeCoverage).toBe(3)
    expect(manifest.summary.releaseReady).toBe(false)
    expect(manifest.claimPolicy.prohibitedClaims).toContain('signed installer')
    expect(manifest.claimPolicy.prohibitedClaims).toContain('public download ready')
  })

  it('keeps template-only OS artifacts blocked from public release claims', () => {
    const manifest = buildV29SidecarInstallManifest({
      artifacts: [
        buildV29SidecarInstallArtifact({
          os: 'windows',
          templatePath: 'runtime-templates/windows',
          packageName: 'aethel-game-runtime',
          version: '1.0.0',
          artifactPatterns: ['${productName}-${version}-win.${ext}'],
          buildCommands: ['npm run build'],
          evidenceRefs: ['runtime-template:windows'],
        }),
        completeArtifact('macos'),
        completeArtifact('linux'),
      ],
    })

    expect(validateV29SidecarInstallManifest(manifest)).toEqual([])
    expect(manifest.blockers).toEqual(
      expect.arrayContaining([
        'windows: install artifact is template-only',
        'windows: checksum receipt is missing',
        'windows: signature receipt is missing',
        'windows: install smoke test receipt is missing',
        'windows: rollback receipt is missing',
      ]),
    )
    expect(manifest.summary.releaseReady).toBe(false)
  })

  it('rejects manifests missing OS targets', () => {
    const manifest = buildV29SidecarInstallManifest({
      artifacts: [completeArtifact('windows')],
    })

    expect(validateV29SidecarInstallManifest(manifest)).toContain('missing required install OS target: macos')
  })
})
