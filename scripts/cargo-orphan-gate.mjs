#!/usr/bin/env node
/**
 * CW7 R20 — Orphan-Prune CI Gate (compile-or-delete discipline).
 *
 * Scans the Rust source trees (apps/studio-local/src-tauri/src and
 * packages/aethel-kernel-rust/src) and computes the set of `.rs` files that are
 * reachable from the crate roots (lib.rs / main.rs) through the `mod` graph.
 * Any `.rs` file under src/ that is NOT reachable is an orphan.
 *
 * Orphans are tolerated ONLY while listed in the baseline allowlist
 * (`scripts/orphan-baseline.json`), which documents source pending the
 * explicit compile-or-delete resolution (Progress §R20 / deep-boot 2026-08-10:
 * 9 orphan kernel wires + rendering/ + physics/ + kernel materialx/openvdb).
 *
 * A NEW orphan (present on disk, not in baseline) FAILS the gate — the author
 * must either wire it (`mod`/`pub mod`) or delete it. No theater, no mocks.
 *
 * Module resolution implemented (matches Rust 2018 semantics for this repo):
 *   - `mod name;` / `pub mod name;` / `pub(crate) mod name;` ->
 *       `<dir>/name.rs` first, else `<dir>/name/mod.rs`.
 *   - `#[path = "rel"] mod name;` -> file `<dir>/rel` (relative to the
 *       declaring file's directory), e.g. `#[path = "desktop/mod.rs"]`.
 *   - Inline `mod name { ... }` -> no file.
 *   - Every `mod` declaration counts as reachable regardless of `#[cfg]`
 *     (conservative — avoids false orphans on feature/test builds).
 *
 * Usage:
 *   node scripts/cargo-orphan-gate.mjs            # enforce against baseline
 *   node scripts/cargo-orphan-gate.mjs --write-baseline   # (re)generate baseline
 *   node scripts/cargo-orphan-gate.mjs --json     # machine-readable report
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const DEFAULT_BASELINE = path.join(__dirname, 'orphan-baseline.json')

// Crates scanned: relative src dir (from repo root) → crate roots inside it.
const CRATES = [
  { name: 'studio-local', src: 'apps/studio-local/src-tauri/src' },
  { name: 'aethel-kernel', src: 'packages/aethel-kernel-rust/src' },
]

// ---------------------------------------------------------------------------
// Rust `mod` declaration parsing.
// ---------------------------------------------------------------------------

// Matches `#[path = "rel"] (vis) mod name;` OR plain `(vis) mod name;`.
// Group 1: path attribute value (if present). Group 2: module name.
const MOD_RE = new RegExp(
  [
    /(?:#\[\s*path\s*=\s*"([^"]*)"\s*\])?/.source, // optional #[path = "..."]
    /\s*(?:\r?\n)?\s*/.source, // whitespace / newline between attr and mod
    /(?:pub(?:\([^)]*\))?\s+)?/.source, // optional visibility
    /mod\s+([A-Za-z_][A-Za-z0-9_]*)\s*;/.source, // `mod name;`
  ].join(''),
  'g',
)

/**
 * Extract the module files declared by `content` (relative to `dir`).
 * Returns an array of absolute file paths (normalized).
 */
function declaredModuleFiles(content, dir) {
  const out = []
  let m
  MOD_RE.lastIndex = 0
  while ((m = MOD_RE.exec(content)) !== null) {
    const pathAttr = m[1]
    const name = m[2]
    if (pathAttr) {
      out.push(path.resolve(dir, pathAttr))
    } else {
      const sameDir = path.join(dir, `${name}.rs`)
      const dirModule = path.join(dir, name, 'mod.rs')
      // Prefer `name.rs`, then `name/mod.rs` (Rust resolution order).
      out.push(fs.existsSync(sameDir) ? sameDir : dirModule)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Reachability walk over a crate's src tree.
// ---------------------------------------------------------------------------

/**
 * @returns {{ reachable: Set<string>, all: string[], orphans: string[] }}
 *   `all` = every `.rs` under srcDir (excluding crate roots); `orphans` = all - reachable.
 */
function scanCrate(relSrc) {
  const srcDir = path.join(repoRoot, relSrc)
  const roots = ['lib.rs', 'main.rs']
    .filter((r) => fs.existsSync(path.join(srcDir, r)))
    .map((r) => path.join(srcDir, r))

  const reachable = new Set()
  const queue = [...roots]
  const visited = new Set()

  while (queue.length > 0) {
    const file = queue.pop()
    const norm = path.normalize(file)
    if (visited.has(norm)) continue
    visited.add(norm)
    reachable.add(norm)
    let content
    try {
      content = fs.readFileSync(norm, 'utf8')
    } catch {
      continue
    }
    for (const child of declaredModuleFiles(content, path.dirname(norm))) {
      const childNorm = path.normalize(child)
      if (fs.existsSync(childNorm)) queue.push(childNorm)
    }
  }

  const all = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile() && entry.name.endsWith('.rs')) {
        all.push(path.normalize(full))
      }
    }
  }
  walk(srcDir)

  const rootSet = new Set(roots.map((r) => path.normalize(r)))
  const orphans = all.filter((f) => !reachable.has(f) && !rootSet.has(f))

  return { reachable, all, orphans, roots }
}

// ---------------------------------------------------------------------------
// Baseline handling + report.
// ---------------------------------------------------------------------------

function toRel(full) {
  return path.relative(repoRoot, full).split(path.sep).join('/')
}

function fromRel(rel) {
  return path.resolve(repoRoot, ...rel.split('/'))
}

function buildReport() {
  const report = {}
  for (const crate of CRATES) {
    const { orphans, all } = scanCrate(crate.src)
    report[crate.name] = {
      src: crate.src,
      totalRs: all.length,
      orphans: orphans.map(toRel).sort(),
    }
  }
  return report
}

function readBaseline(file) {
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    console.error(`[ORPHAN-GATE] baseline ${file} is invalid JSON: ${err.message}`)
    process.exit(2)
  }
}

function main() {
  const args = process.argv.slice(2)
  const writeBaseline = args.includes('--write-baseline')
  const asJson = args.includes('--json')
  const baselinePath = DEFAULT_BASELINE

  const report = buildReport()

  if (writeBaseline) {
    const payload = {
      generated: new Date().toISOString(),
      note:
        'Auto-generated by scripts/cargo-orphan-gate.mjs --write-baseline. ' +
        'Lists .rs files unreachable via the Rust `mod` graph. Resolve via compile-or-delete ' +
        '(Progress §R20 / deep-boot 2026-08-10). Do not hand-edit unless the source changed.',
      crates: report,
    }
    fs.writeFileSync(baselinePath, JSON.stringify(payload, null, 2) + '\n')
    console.log(`[ORPHAN-GATE] baseline written: ${toRel(baselinePath)}`)
    for (const [name, c] of Object.entries(report)) {
      console.log(`[ORPHAN-GATE] ${name}: ${c.totalRs} total .rs, ${c.orphans.length} orphan`)
      for (const o of c.orphans) console.log(`  - ${o}`)
    }
    process.exit(0)
  }

  const baseline = readBaseline(baselinePath)
  if (!baseline) {
    console.error(
      `[ORPHAN-GATE] no baseline found at ${toRel(baselinePath)}. ` +
        `Run once with --write-baseline after auditing the orphan list.`,
    )
    process.exit(2)
  }

  const newOrphans = []
  const totalOrphanCount = {}
  for (const [name, c] of Object.entries(report)) {
    const known = new Set(
      (baseline.crates?.[name]?.orphans ?? []).map((r) => toRel(fromRel(r))),
    )
    totalOrphanCount[name] = c.orphans.length
    for (const o of c.orphans) {
      if (!known.has(o)) newOrphans.push(`${name}: ${o}`)
    }
    // Also flag baseline entries that no longer exist (resolved → baseline stale).
  }

  const stale = []
  for (const [name, bc] of Object.entries(baseline.crates ?? {})) {
    const current = new Set((report[name]?.orphans ?? []).map(toRel))
    for (const o of bc.orphans ?? []) {
      if (!current.has(toRel(fromRel(o)))) stale.push(`${name}: ${o}`)
    }
  }

  if (asJson) {
    console.log(
      JSON.stringify({ pass: newOrphans.length === 0, newOrphans, stale, totalOrphanCount }, null, 2),
    )
  } else {
    for (const [name, c] of Object.entries(report)) {
      console.log(`[ORPHAN-GATE] ${name}: ${c.totalRs} total .rs, ${c.orphans.length} orphan (baseline-known)`)
    }
    if (stale.length > 0) {
      console.log(`[ORPHAN-GATE] baseline is STALE — ${stale.length} entries resolved (compile/deleted):`)
      for (const s of stale) console.log(`  [stale] ${s}`)
      console.log(`[ORPHAN-GATE] re-run with --write-baseline to refresh (recommended).`)
    }
    if (newOrphans.length > 0) {
      console.error(`[ORPHAN-GATE] FAIL — ${newOrphans.length} NEW orphan .rs file(s) not in baseline:`)
      for (const o of newOrphans) console.error(`  [new] ${o}`)
      console.error(
        `[ORPHAN-GATE] wire it via mod (compile) or delete it — do not add to baseline without resolving.`,
      )
      process.exit(1)
    }
    console.log(`[ORPHAN-GATE] PASS — no new orphan .rs files. (${newOrphans.length} new, ${stale.length} stale-baseline)`)
  }
  process.exit(0)
}

main()
