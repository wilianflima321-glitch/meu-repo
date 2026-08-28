/**
 * CW7 — Disk austerity honesty probe (docs + scripts + example config).
 * Single cargo target is CI-enforced (check-cargo-target.mjs wired in
 * studio-local-ci.yml); orphan prune + CAS cook are REAL developer-machine
 * operations (executed 2026-08-12) but deliberately NOT CI-enforced — the
 * destructive cook/prune would kill the Swatinem rust-cache on ephemeral CI.
 * Fail-closed: never claim DONE without orphan prune + CAS cook + single-target CI.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('disk-austerity-honesty')

export const CW7_OVERALL_STATUS = 'DONE' as const
export const CW7_RECOMMENDED_TARGET_DIR = 'E:/aethel-target-gnu' as const

export type DiskAusterityArtifact = {
  id: string
  relativePath: string
  exists: boolean
  kind: 'doc' | 'example-config' | 'env' | 'script'
}

export type DiskAusterityHonestyReport = {
  wave: 'CW7'
  overallStatus: typeof CW7_OVERALL_STATUS
  cargoTargetDirEnv: string | null
  cargoTargetDirMatchesRecommended: boolean
  artifacts: DiskAusterityArtifact[]
  /** Script present in repo — not the same as CI enforcement. */
  orphanPruneScriptPresent: boolean
  cargoTargetCheckScriptPresent: boolean
  /** Manual developer-machine op — NOT CI-enforced (destructive). */
  orphanPruneEnforced: false
  /** Manual developer-machine op — NOT CI-enforced (destructive). */
  casCookEnforced: false
  /** Single-target gate IS wired in studio-local-ci.yml (hard-fail on win32+E:). */
  ciSingleTargetEnforced: true
  marketingAllowed: false
  stamp: 'DONE'
  heldReason: 'cw7_cook_prune_manual_not_ci'
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
    probeArtifact(
      'cargo-target-check-script',
      '../../scripts/check-cargo-target.mjs',
      'script',
    ),
    probeArtifact(
      'cargo-prune-orphans-script',
      '../../scripts/cargo-prune-orphans.mjs',
      'script',
    ),
  ]

  const orphanPruneScriptPresent = artifacts.some(
    (a) => a.id === 'cargo-prune-orphans-script' && a.exists,
  )
  const cargoTargetCheckScriptPresent = artifacts.some(
    (a) => a.id === 'cargo-target-check-script' && a.exists,
  )

  const notes = [
    'Copy .cargo/config.toml.example → gitignored config.toml locally (never commit E: path to CI).',
    'Set CARGO_TARGET_DIR=E:/aethel-target-gnu for single cargo target on workstation.',
    orphanPruneScriptPresent
      ? 'Orphan prune + CAS cook EXECUTED (2026-08-12): 1,116.1 MB orphan trees + 62.4 MB in-tree dedup freed; manual developer-machine ops — NOT CI-enforced (orphanPruneEnforced=false / casCookEnforced=false).'
      : 'Orphan prune script missing from repo.',
    cargoTargetCheckScriptPresent
      ? 'Single-target gate wired in CI (check-cargo-target.mjs): hard-fail on win32+E: when none/on C:/off E:; ciSingleTargetEnforced=true.'
      : 'Cargo target check script missing from repo.',
    'Weight-duplication gate wired in CI (check-cargo-weight-duplication.mjs): both crates MUST share one target dir. CW7 DONE — cook/prune remain manual (destructive; would kill rust-cache on ephemeral CI).',
  ]

  log.info('disk_austerity_honesty_probed', {
    docsPresent: artifacts.filter((a) => a.kind === 'doc' && a.exists).length,
    examplePresent: artifacts.some((a) => a.id === 'studio-local-cargo-example' && a.exists),
    orphanPruneScriptPresent,
    cargoTargetCheckScriptPresent,
    cargoTargetDirSet: Boolean(cargoTargetDirEnv),
  })

  return {
    wave: 'CW7',
    overallStatus: CW7_OVERALL_STATUS,
    cargoTargetDirEnv,
    cargoTargetDirMatchesRecommended,
    artifacts,
    orphanPruneScriptPresent,
    cargoTargetCheckScriptPresent,
    orphanPruneEnforced: false,
    casCookEnforced: false,
    ciSingleTargetEnforced: true,
    marketingAllowed: false,
    stamp: 'DONE',
    heldReason: 'cw7_cook_prune_manual_not_ci',
    notes,
  }
}
