#!/usr/bin/env node
/**
 * CW7 R20 — Single Cargo Target Gate (fail-closed, CI-safe).
 *
 * Enforces the Single Cargo Target Rule (CW7 Disk Austerity):
 *   - Canonical target for this workstation: E:/aethel-target-gnu
 *   - BOTH Rust crates (apps/studio-local/src-tauri and
 *     packages/aethel-kernel-rust) MUST resolve to a single target directory
 *     on the external E: drive — never C: (this workstation keeps C: near-full).
 *   - The committed config (config.toml.example) must NEVER carry an absolute
 *     E: path (breaks Linux CI — see DISK_AUSTERITY.md). The E: target is
 *     provided by the developer's CARGO_TARGET_DIR env (preferred) or a
 *     gitignored local .cargo/config.toml override (the root .gitignore
 *     ignores every .cargo/config.toml and allows .cargo/config.toml.example).
 *
 * Effective target-dir resolution (matches cargo config precedence for repo):
 *   1. CARGO_TARGET_DIR env
 *   2. apps/studio-local/src-tauri/.cargo/config.toml   [build] target-dir
 *   3. packages/aethel-kernel-rust/.cargo/config.toml   [build] target-dir
 *
 * Fail-closed semantics (never lets C: fill up silently):
 *   - Local Windows workstation (E: drive present) + no effective target-dir
 *     -> HARD FAIL (Cargo would write target/ under C:).
 *   - Local Windows workstation + effective target-dir NOT on the E: drive
 *     -> HARD FAIL (canonical is E:/aethel-target-gnu).
 *   - Local Windows workstation + effective target-dir on C: -> HARD FAIL.
 *   - CI (no E: drive) or non-Windows -> soft pass: CI runners use their own
 *     CARGO_TARGET_DIR or the default target/ + Swatinem rust-cache (intended;
 *     an E:-absolute config is never committed, so there is nothing to enforce).
 *
 * Usage:
 *   node scripts/check-cargo-target.mjs            # enforce
 *   node scripts/check-cargo-target.mjs --json     # machine-readable report
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Effective target-dir resolution.
// ---------------------------------------------------------------------------

/** Parse `target-dir` from the `[build]` section of a cargo config.toml. */
function parseBuildTargetDir(content) {
  const sections = content.split(/^\s*\[([^\]]+)\]\s*$/m)
  // sections layout: [before, 'build', afterBuild, 'profile.x', afterX, ...]
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

function readConfigTargetDir(relPath) {
  const p = path.join(rootDir, relPath)
  if (!fs.existsSync(p)) return null
  return parseBuildTargetDir(fs.readFileSync(p, 'utf8'))
}

/** Env wins, then the two project configs (studio-local, then kernel). */
function resolveEffectiveTargetDir() {
  const env = process.env.CARGO_TARGET_DIR
  if (env && env.trim() !== '') return env.replace(/\\/g, '/')
  return (
    readConfigTargetDir('apps/studio-local/src-tauri/.cargo/config.toml') ??
    readConfigTargetDir('packages/aethel-kernel-rust/.cargo/config.toml') ??
    null
  )
}

// ---------------------------------------------------------------------------
// Path / drive helpers.
// ---------------------------------------------------------------------------

function normalizeSlashes(p) {
  return p.replace(/\\/g, '/')
}

/** Lowercased drive letter of an absolute Windows path, or null. */
function driveOf(p) {
  const n = normalizeSlashes(p)
  const m = n.match(/^([a-z]):\//i)
  return m ? m[1].toLowerCase() : null
}

// ---------------------------------------------------------------------------
// Gate.
// ---------------------------------------------------------------------------

function main() {
  const asJson = process.argv.includes('--json')
  const effective = resolveEffectiveTargetDir()
  const drive = effective ? driveOf(effective) : null
  const hasE = fs.existsSync('E:/')
  const isWin = process.platform === 'win32'

  let pass = true
  const reasons = []

  if (isWin && hasE) {
    // Local workstation signature (E: present). Enforce strictly.
    if (!effective) {
      pass = false
      reasons.push(
        'No effective target-dir resolved (CARGO_TARGET_DIR unset and no gitignored .cargo/config.toml). ' +
          'Cargo would write target/ under C:. Set CARGO_TARGET_DIR=E:\\aethel-target-gnu or add ' +
          'apps/studio-local/src-tauri/.cargo/config.toml (gitignored).',
      )
    } else if (drive === 'c') {
      pass = false
      reasons.push(`Effective target-dir ${effective} is on the C: drive — disk austerity violation.`)
    } else if (drive !== 'e') {
      pass = false
      reasons.push(
        `Effective target-dir ${effective} is on drive ${drive?.toUpperCase() ?? '?'}, not the canonical E:. ` +
          'Canonical is E:/aethel-target-gnu.',
      )
    }
  } else if (isWin) {
    // Windows CI runner without E: — nothing local to enforce; informational.
    reasons.push('Windows CI (no E: drive) — soft pass (runner-local CARGO_TARGET_DIR or default target/).')
  } else {
    // Linux/macOS CI — soft pass.
    reasons.push('Non-Windows platform — soft pass (CI CARGO_TARGET_DIR or default target/).')
  }

  const report = {
    pass,
    platform: process.platform,
    windowsWorkstationWithE: isWin && hasE,
    effectiveTargetDir: effective ?? null,
    effectiveDrive: drive ?? null,
    canonical: 'E:/aethel-target-gnu',
    sources: {
      env: process.env.CARGO_TARGET_DIR ?? null,
      studioLocalConfig: fs.existsSync(path.join(rootDir, 'apps/studio-local/src-tauri/.cargo/config.toml'))
        ? 'present'
        : 'absent',
      kernelConfig: fs.existsSync(path.join(rootDir, 'packages/aethel-kernel-rust/.cargo/config.toml'))
        ? 'present'
        : 'absent',
    },
    reasons,
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    if (effective) {
      console.log(`[TARGET] effective target-dir: ${effective} (drive ${drive?.toUpperCase() ?? 'n/a'})`)
    } else {
      console.log(`[TARGET] effective target-dir: (none resolved)`)
    }
    for (const r of reasons) console.log(`[TARGET] ${r}`)
    if (pass) {
      console.log(`[TARGET] PASS — single cargo target rule satisfied.`)
    } else {
      console.error(`[TARGET] FAIL — ${reasons.join(' ')}`)
    }
  }

  process.exit(pass ? 0 : 1)
}

main()
