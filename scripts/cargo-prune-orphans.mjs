#!/usr/bin/env node
/**
 * CW7 R20 — Cargo Orphan Prune + Content-Addressed (CAS) Cook.
 *
 * Developer-machine disk hygiene (intentionally NOT in CI — it mutates the
 * target tree; CI uses Swatinem/rust-cache instead — see studio-local-ci.yml).
 *
 * Phase A — ORPHAN TREE PRUNE (documented safe):
 *   Deletes unused cargo target trees on the E: drive matching the orphan
 *   pattern `aethel-target-*` EXCEPT the canonical `aethel-target-gnu`
 *   (per apps/studio-local/src-tauri/DISK_AUSTERITY.md — "E:\aethel-target-gnu-*
 *   orphans may be pruned when unused"). Never touches user data; only ever
 *   touches `aethel-target-*` directories directly under E:\.
 *
 * Phase B — CAS COOK (real content-addressed dedup):
 *   Scans the resolved target dir's `deps` trees for byte-identical compiled
 *   artifacts (streamed SHA-256). Every non-canonical copy in a duplicate
 *   group is replaced by a hard link to the canonical blob and its original
 *   mtime is restored so cargo fingerprint/freshness logic is undisturbed.
 *   Physical bytes freed = sum((groupSize - 1) * bytes). If no duplicates
 *   exist, reports 0 honestly (a single-target tree is already weight-optimal).
 *
 * Fail-closed:
 *   - Only files under the target's `deps` dirs with an allowlisted artifact
 *     extension are touched. `.fingerprint`, `incremental`, `.d` and anything
 *     else is NEVER hashed or linked.
 *   - A duplicate is replaced only after a hard link exists at its path and the
 *     size matches; per-file errors are reported and skipped.
 *   - Orphan prune requires the canonical E:/aethel-target-gnu to still exist
 *     (never deletes everything).
 *
 * Usage:
 *   node scripts/cargo-prune-orphans.mjs            # prune + CAS cook (real)
 *   node scripts/cargo-prune-orphans.mjs --dry-run  # report only, no mutation
 *   node scripts/cargo-prune-orphans.mjs --prune-only
 *   node scripts/cargo-prune-orphans.mjs --cook-only
 */

import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const CANONICAL = 'E:/aethel-target-gnu'
const ORPHAN_PREFIX = 'aethel-target-'
const MIN_COOK_SIZE = 4096 // bytes — skip tiny noise files
const COOK_EXTENSIONS = new Set(['.rlib', '.rmeta', '.so', '.dylib', '.a', '.o'])

// ---------------------------------------------------------------------------
// Effective target-dir resolution (shared with check-cargo-target.mjs).
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

function readConfigTargetDir(relPath) {
  const p = path.join(rootDir, relPath)
  if (!fs.existsSync(p)) return null
  return parseBuildTargetDir(fs.readFileSync(p, 'utf8'))
}

function resolveCanonicalTargetDir() {
  const env = process.env.CARGO_TARGET_DIR
  if (env && env.trim() !== '') return env.replace(/\\/g, '/')
  return (
    readConfigTargetDir('apps/studio-local/src-tauri/.cargo/config.toml') ??
    readConfigTargetDir('packages/aethel-kernel-rust/.cargo/config.toml') ??
    (fs.existsSync(CANONICAL) ? CANONICAL : null)
  )
}

// ---------------------------------------------------------------------------
// Phase A — orphan tree prune.
// ---------------------------------------------------------------------------

async function measureTreeSize(dir) {
  let bytes = 0
  let files = 0
  const stack = [dir]
  while (stack.length) {
    const cur = stack.pop()
    let entries
    try {
      entries = await fsp.readdir(cur, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      const full = path.join(cur, e.name)
      if (e.isDirectory()) stack.push(full)
      else if (e.isFile()) {
        try {
          const st = await fsp.stat(full)
          bytes += st.size
          files += 1
        } catch {
          /* skip */
        }
      }
    }
  }
  return { bytes, files }
}

async function listOrphanTrees() {
  if (!fs.existsSync('E:/')) return []
  let entries
  try {
    entries = await fsp.readdir('E:/', { withFileTypes: true })
  } catch {
    return []
  }
  const orphans = []
  for (const e of entries) {
    if (!e.isDirectory()) continue
    if (e.name === 'aethel-target-gnu') continue // canonical — keep
    if (!e.name.startsWith(ORPHAN_PREFIX)) continue
    const abs = path.join('E:/', e.name)
    const { bytes, files } = await measureTreeSize(abs)
    orphans.push({ name: e.name, path: abs, bytes, files })
  }
  return orphans.sort((a, b) => b.bytes - a.bytes)
}

async function pruneOrphans(orphans, dryRun) {
  const totalBytes = orphans.reduce((a, o) => a + o.bytes, 0)
  const totalFiles = orphans.reduce((a, o) => a + o.files, 0)
  if (orphans.length === 0) {
    console.log('[PRUNE] no orphan aethel-target-* trees on E:\\ (canonical aethel-target-gnu kept).')
    return { pruned: 0, bytes: 0, files: 0 }
  }
  for (const o of orphans) {
    const mb = (o.bytes / 1048576).toFixed(1)
    if (dryRun) {
      console.log(`[PRUNE] (dry-run) would delete ${o.name} (${mb} MB, ${o.files} files)`)
      continue
    }
    console.log(`[PRUNE] deleting ${o.name} (${mb} MB, ${o.files} files)`)
    await fsp.rm(o.path, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  }
  console.log(
    `[PRUNE] done — ${dryRun ? 'would free' : 'freed'} ${(totalBytes / 1048576).toFixed(1)} MB across ${orphans.length} tree(s) (${totalFiles} files).`,
  )
  return { pruned: orphans.length, bytes: totalBytes, files: totalFiles }
}

// ---------------------------------------------------------------------------
// Phase B — CAS cook (content-addressed dedup).
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

async function sha256File(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256')
    const s = fs.createReadStream(file)
    s.on('data', (d) => h.update(d))
    s.on('end', () => resolve(h.digest('hex')))
    s.on('error', reject)
  })
}

/** Replace `target` with a hard link to `canonical`, restoring original mtime. */
async function hardLinkReplace(canonical, target, origMtime, origAtime) {
  const tmp = `${target}.${process.pid}.${Date.now().toString(36)}.cas-tmp`
  await fsp.link(canonical, tmp)
  try {
    await fsp.rename(tmp, target)
    await fsp.utimes(target, origAtime, origMtime)
  } catch (err) {
    await fsp.unlink(tmp).catch(() => {})
    throw err
  }
}

async function casCook(targetDir, dryRun) {
  if (!fs.existsSync(targetDir)) {
    console.log(`[COOK] target dir ${targetDir} does not exist — nothing to cook.`)
    return { scanned: 0, duplicateGroups: 0, deduped: 0, freedBytes: 0, groups: [] }
  }

  // Collect candidate files (allowlisted artifact extensions under deps dirs).
  const candidates = []
  for (const depsDir of walkDepsDirs(targetDir)) {
    let entries
    try {
      entries = await fsp.readdir(depsDir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      if (!e.isFile()) continue
      const ext = path.extname(e.name).toLowerCase()
      if (!COOK_EXTENSIONS.has(ext)) continue
      const full = path.join(depsDir, e.name)
      try {
        const st = await fsp.stat(full)
        if (st.size < MIN_COOK_SIZE) continue
        candidates.push({ path: full, size: st.size, mtime: st.mtime, atime: st.atime })
      } catch {
        /* skip */
      }
    }
  }

  const groups = new Map()
  let hashed = 0
  for (const c of candidates) {
    let hash
    try {
      hash = await sha256File(c.path)
    } catch {
      continue
    }
    hashed += 1
    if (!groups.has(hash)) groups.set(hash, [])
    groups.get(hash).push(c)
    if (hashed % 256 === 0) console.log(`[COOK] hashed ${hashed}/${candidates.length} artifacts...`)
  }

  const dupGroups = []
  let deduped = 0
  let freedBytes = 0
  for (const [hash, files] of groups) {
    if (files.length < 2) continue
    files.sort((a, b) => a.path.length - b.path.length)
    const canonical = files[0]
    const duplicates = files.slice(1)
    const size = canonical.size
    const mb = (size / 1048576).toFixed(3)
    dupGroups.push({
      hash: hash.slice(0, 16),
      size,
      count: files.length,
      canonical: path.relative(targetDir, canonical.path),
      duplicates: duplicates.map((d) => path.relative(targetDir, d.path)),
    })
    deduped += duplicates.length
    freedBytes += duplicates.length * size
    if (dryRun) {
      console.log(
        `[COOK] (dry-run) group ${hash.slice(0, 16)}: ${files.length} x ${mb} MB — would hard-link ${duplicates.length} to ${path.relative(targetDir, canonical.path)}`,
      )
      continue
    }
    for (const dup of duplicates) {
      try {
        await hardLinkReplace(canonical.path, dup.path, dup.mtime, dup.atime)
        const st = await fsp.stat(dup.path)
        if (st.size !== size) throw new Error(`size mismatch after link (${st.size} != ${size})`)
        console.log(`[COOK] deduped ${path.relative(targetDir, dup.path)} -> ${path.relative(targetDir, canonical.path)}`)
      } catch (err) {
        console.error(`[COOK] SKIP ${path.relative(targetDir, dup.path)}: ${err.message}`)
      }
    }
  }

  console.log(
    `[COOK] done — ${candidates.length} artifacts scanned, ${dupGroups.length} duplicate group(s), ` +
      `${dryRun ? 'would free' : 'freed'} ${(freedBytes / 1048576).toFixed(1)} MB (${deduped} file(s) hard-linked).`,
  )
  return { scanned: candidates.length, duplicateGroups: dupGroups.length, deduped, freedBytes, groups: dupGroups }
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const pruneOnly = process.argv.includes('--prune-only')
  const cookOnly = process.argv.includes('--cook-only')
  const asJson = process.argv.includes('--json')

  const targetDir = resolveCanonicalTargetDir()
  const report = { dryRun, targetDir, prune: null, cook: null }

  if (!fs.existsSync(CANONICAL)) {
    console.error('[PRUNE] canonical E:/aethel-target-gnu missing — refusing orphan prune (fail-closed).')
    if (asJson) {
      console.log(JSON.stringify({ ...report, error: 'canonical missing' }, null, 2))
    }
    process.exit(1)
  }

  // Phase A — orphan prune.
  if (!cookOnly) {
    const orphans = await listOrphanTrees()
    report.prune = await pruneOrphans(orphans, dryRun)
  }

  // Phase B — CAS cook.
  if (!pruneOnly) {
    if (targetDir) {
      report.cook = await casCook(targetDir, dryRun)
    } else {
      console.log('[COOK] no effective target dir resolved — skipping CAS cook.')
    }
  }

  if (asJson) console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(`[FATAL] ${err.message}`)
  process.exit(1)
})
