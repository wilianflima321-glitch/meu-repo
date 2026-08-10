/**
 * CW7 — Disk austerity honesty probe (docs + example config; not CI-enforced).
 * Fail-closed: do not claim DONE without orphan prune + CAS cook + single-target CI.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('disk-austerity-honesty')

export const CW7_OVERALL_STATUS = 'PARTIAL' as const
export const CW7_RECOMMENDED_TARGET_DIR = 'E:/aethel-target-gnu' as const

export type DiskAusterityArtifact = {
  id: string
  relativePath: string
  exists: boolean
  kind: 'doc' | 'example-config' | 'env'
}

export type DiskAusterityHonestyReport = {
  wave: 'CW7'
  overallStatus: typeof CW7_OVERALL_STATUS
  cargoTargetDirEnv: string | null
  cargoTargetDirMatchesRecommended: boolean
  artifacts: DiskAusterityArtifact[]
  orphanPruneEnforced: false
  casCookEnforced: false
  ciSingleTargetEnforced: false
  marketingAllowed: false
  stamp: 'PARTIAL'
  heldReason: 'cw7_orphan_prune_cas_ci_open'
  notes: string[]
}

function repoRelative(fromWebRoot: string): string {
  return path.resolve(process.cwd(), fromWebRoot)
}

function probeArtifact(
  id: string,
  relativePath: string,
  kind: DiskAusterityArtifact['kind'],
): DiskAusterityArtifact {
  const abs = repoRelative(relativePath)
  return {
    id,
    relativePath,
    exists: fs.existsSync(abs),
    kind,
  }
}

/**
 * Probe trackable CW7 artifacts from the web package (no destructive disk ops).
 */
export function probeDiskAusterityHonesty(): DiskAusterityHonestyReport {
  const cargoTargetDirEnv = String(process.env.CARGO_TARGET_DIR || '').trim() || null
  const normalized = cargoTargetDirEnv?.replace(/\\/g, '/').toLowerCase() ?? ''
  const recommended = CW7_RECOMMENDED_TARGET_DIR.replace(/\\/g, '/').toLowerCase()
  const cargoTargetDirMatchesRecommended =
    normalized.length > 0 &&
    (normalized === recommended ||
      normalized.endsWith('/aethel-target-gnu') ||
      normalized.endsWith('\\aethel-target-gnu'))

  const artifacts: DiskAusterityArtifact[] = [
    probeArtifact(
      'studio-local-cargo-example',
      '../../apps/studio-local/src-tauri/.cargo/config.toml.example',
      'example-config',
    ),
    probeArtifact(
      'kernel-rust-disk-doc',
      '../../packages/aethel-kernel-rust/DISK_AUSTERITY.md',
      'doc',
    ),
    probeArtifact(
      'studio-local-disk-doc',
      '../../apps/studio-local/src-tauri/DISK_AUSTERITY.md',
      'doc',
    ),
  ]

  const notes = [
    'Copy .cargo/config.toml.example → gitignored config.toml locally (never commit E: path to CI).',
    'Set CARGO_TARGET_DIR=E:/aethel-target-gnu for single cargo target on workstation.',
    'Orphan prune + CAS cook + CI-enforced single target remain OPEN — CW7 not DONE.',
  ]

  log.info('disk_austerity_honesty_probed', {
    docsPresent: artifacts.filter((a) => a.kind === 'doc' && a.exists).length,
    examplePresent: artifacts.some((a) => a.id === 'studio-local-cargo-example' && a.exists),
    cargoTargetDirSet: Boolean(cargoTargetDirEnv),
  })

  return {
    wave: 'CW7',
    overallStatus: CW7_OVERALL_STATUS,
    cargoTargetDirEnv,
    cargoTargetDirMatchesRecommended,
    artifacts,
    orphanPruneEnforced: false,
    casCookEnforced: false,
    ciSingleTargetEnforced: false,
    marketingAllowed: false,
    stamp: 'PARTIAL',
    heldReason: 'cw7_orphan_prune_cas_ci_open',
    notes,
  }
}
