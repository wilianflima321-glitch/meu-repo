#!/usr/bin/env node
/**
 * CW7 R20 — Weight-Duplication Gate (CAS companion; CI-safe, read-only).
 *
 * The single-target rule (check-cargo-target.mjs) is NECESSARY but not
 * SUFFICIENT: both Rust crates (apps/studio-local/src-tauri and
 * packages/aethel-kernel-rust) must ALSO resolve to the SAME physical target
 * directory, otherwise cargo compiles identical dependency versions twice —
 * two full trees = duplicated weight (the CW7 "no weight duplication"
 * requirement).
 *
 * Checks:
 *   1. Per-crate effective target-dir (env -> crate .cargo/config.toml) must
 *      be IDENTICAL after normalization. FAIL otherwise:
 *        - one crate resolves a target-dir, the other does not  -> FAIL
 *          (divergent trees possible on the local workstation).
 *        - both resolve, but different paths                     -> FAIL
 *          (two trees = weight duplication).
 *        - both resolve to the same path                          -> PASS.
 *        - both resolve to nothing (CI: no env, no committed config)
 *          -> PASS (CI uses default target/ + Swatinem rust-cache; only the
 *          studio-local crate is built in CI, the kernel crate is not).
 *   2. Scans the shared target dir's `deps` trees and reports a duplicate
 *      fingerprint metric: the same crate name compiled into N distinct
 *      `-<hash>` artifacts under the SAME profile/triple dir. These are
 *      byte-level duplicate candidates that the CAS cook
 *      (cargo-prune-orphans.mjs) collapses; the gate reports the count and
 *      fails in `--strict` when any group has >1 distinct fingerprint AND the
 *      artifacts are byte-identical in size (a true duplicate the cook should
 *      have deduped).
 *
 * This script NEVER mutates anything and does NOT require E: — it is safe to
 * run on every CI platform (Linux / macOS / Windows) and locally.
 *
 * Usage:
 *   node scripts/check-cargo-weight-duplication.mjs             # enforce
 *   node scripts/check-cargo-weight-duplication.mjs --strict    # + byte-dup fail
 *   node scripts/check-cargo-weight-duplication.mjs --json      # machine report
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const CRATES = [
  { name: 'studio-local', config: 'apps/studio-local/src-tauri/.cargo/config.toml' },
  { name: 'aethel-kernel', config: 'packages/aethel-kernel-rust/.cargo/config.toml' },
]

// ---------------------------------------------------------------------------
// Per-crate effective target-dir.
// ---------------------------------------------------------------------------

function parseBuildTargetDir(content) {
  const sections = content.split(/^\s*\[([^\]]+)\]\s*$/m)
  for (let i = 1; i < sections.length; i += 2) {
    if (sections[i].trim() === 'build') {
      const body = sections[i + 1] ?? ''
      const m = body.match(/\btarget-dir\s*=\s*['"]([^'"]+)['"]/)
      if (m) return m[1].replace(/\\/g, '/')
      return null
    }
  }
  return null
}

function crateEffectiveTargetDir(crate) {
  const env = process.env.CARGO_TARGET_DIR
  if (env && env.trim() !== '') return { source: 'env', value: env.replace(/\\/g, '/') }
  const p = path.join(rootDir, crate.config)
  if (fs.existsSync(p)) {
    const td = parseBuildTargetDir(fs.readFileSync(p, 'utf8'))
    if (td) return { source: 'config', value: td }
  }
  return { source: 'default', value: null }
}

function normalizeTargetDir(p) {
  const n = p.replace(/\\/g, '/')
  // Lowercase drive letter so E:/x == e:/x.
  const drive = n.match(/^([A-Za-z]):\//)
  return drive ? `${drive[1].toLowerCase()}:/${n.slice(drive[0].length)}` : n
}

// ---------------------------------------------------------------------------
// Deps duplicate-fingerprint scan (read-only metric).
// ---------------------------------------------------------------------------

function walkDepsDirs(dir, out = []) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue
    if (e.name === 'deps') out.push(path.join(dir, e.name))
    else if (e.name !== 'incremental' && e.name !== '.fingerprint') walkDepsDirs(path.join(dir, e.name), out)
  }
  return out
}

/**
 * @returns {Map<string, {dir:string, name:string, size:number}[]>}
 *   Key = `<crateName>|<dir>` — fingerprints per crate per profile/triple dir.
 */
function scanDepsFingerprints(targetDir) {
  const groups = new Map()
  for (const depsDir of walkDepsDirs(targetDir)) {
    let entries
    try {
      entries = fs.readdirSync(depsDir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      if (!e.isFile()) continue
      const m = e.name.match(/^lib(.+?)-([0-9a-f]{8,})\.(?:rlib|rmeta)$/)
      if (!m) continue
      const crateName = m[1]
      const full = path.join(depsDir, e.name)
      const size = fs.statSync(full).size
      const key = `${crateName}|${depsDir}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push({ dir: depsDir, name: e.name, size })
    }
  }
  return groups
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

function main() {
  const strict = process.argv.includes('--strict')
  const asJson = process.argv.includes('--json')

  const resolved = Object.fromEntries(
    CRATES.map((c) => {
      const { source, value } = crateEffectiveTargetDir(c)
      return [c.name, { source, value: value ? normalizeTargetDir(value) : null, raw: value }]
    }),
  )

  // --- Check 1: both crates share one target dir. -------------------------
  const [studio, kernel] = [resolved['studio-local'], resolved['aethel-kernel']]
  const bothNull = studio.value === null && kernel.value === null
  const oneNull = (studio.value === null) !== (kernel.value === null)
  const different = !oneNull && studio.value !== kernel.value

  const sharedTargetDir = studio.value ?? kernel.value
  const passShared = !oneNull && !different

  // --- Check 2: duplicate fingerprint metric (read-only). -----------------
  const dupGroups = []
  let totalRlibs = 0
  if (sharedTargetDir && fs.existsSync(sharedTargetDir)) {
    const groups = scanDepsFingerprints(sharedTargetDir)
    for (const [key, files] of groups) {
      totalRlibs += files.length
      if (files.length > 1) {
        const sizes = new Set(files.map((f) => f.size))
        const byteDup = sizes.size === 1
        dupGroups.push({
          crate: key.split('|')[0],
          dir: key.split('|')[1],
          fingerprints: files.length,
          byteIdenticalSizes: byteDup,
          bytes: files.reduce((a, f) => a + f.size, 0),
        })
      }
    }
  }

  const byteDupGroups = dupGroups.filter((g) => g.byteIdenticalSizes)
  const strictFail = strict && byteDupGroups.length > 0
  const pass = passShared && !strictFail

  const report = {
    pass,
    sharedTargetDir,
    crates: resolved,
    checks: {
      bothResolveNothing: bothNull,
      oneResolvesOnly: oneNull,
      differentTargetDirs: different,
      shareSingleTargetDir: passShared,
    },
    depsScan: {
      scanned: sharedTargetDir && fs.existsSync(sharedTargetDir) ? sharedTargetDir : null,
      totalRlibOrRmeta: totalRlibs,
      duplicateFingerprintGroups: dupGroups.length,
      byteIdenticalDuplicateGroups: byteDupGroups.length,
      duplicateFingerprintBytes: dupGroups.reduce((a, g) => a + g.bytes, 0),
    },
    strict,
    failReasons: [
      oneNull
        ? `One crate resolves a target-dir but the other does not (${resolved['studio-local'].source}/${resolved['aethel-kernel'].source}) — divergent trees possible.`
        : null,
      different
        ? `Crates resolve to DIFFERENT target dirs: ${resolved['studio-local'].value} vs ${resolved['aethel-kernel'].value}.`
        : null,
      strictFail ? `${byteDupGroups.length} byte-identical duplicate fingerprint group(s) not collapsed by CAS cook.` : null,
    ].filter(Boolean),
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`[WEIGHT] studio-local target: ${resolved['studio-local'].value ?? '(default)'} (${resolved['studio-local'].source})`)
    console.log(`[WEIGHT] aethel-kernel target: ${resolved['aethel-kernel'].value ?? '(default)'} (${resolved['aethel-kernel'].source})`)
    if (oneNull || different) {
      console.error(`[WEIGHT] FAIL — ${report.failReasons.join(' ')}`)
      process.exit(1)
    }
    console.log(`[WEIGHT] shared single target: ${sharedTargetDir ?? '(default per crate — CI)'}`)
    if (report.depsScan.scanned) {
      console.log(
        `[WEIGHT] deps scan: ${report.depsScan.totalRlibOrRmeta} rlib/rmeta, ` +
          `${report.depsScan.duplicateFingerprintGroups} duplicate-fingerprint group(s) ` +
          `(${report.depsScan.byteIdenticalDuplicateGroups} byte-identical), ` +
          `${(report.depsScan.duplicateFingerprintBytes / 1048576).toFixed(1)} MB total duplicate candidates`,
      )
      if (strictFail) {
        console.error(`[WEIGHT] FAIL (--strict) — ${byteDupGroups.length} byte-identical duplicate group(s); run cargo-prune-orphans.mjs CAS cook.`)
        process.exit(1)
      }
    }
    console.log(`[WEIGHT] PASS — no weight duplication (both crates share one target dir).`)
  }
  process.exit(pass ? 0 : 1)
}

main()
