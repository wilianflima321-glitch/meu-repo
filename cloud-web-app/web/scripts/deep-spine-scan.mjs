#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DEFAULT_MAX_FILES = 5_000
const DEFAULT_MAX_BYTES = 512 * 1024 * 1024
const DEFAULT_MAX_HASH_BYTES = 8 * 1024 * 1024
const DEFAULT_MAX_FINDINGS = 80
const ignoredDirectories = new Set([
  '.cache',
  '.git',
  '.next',
  '.turbo',
  '.vercel',
  'coverage',
  'dist',
  'build',
  'node_modules',
  'out',
])
const textExtensions = new Set([
  '.c',
  '.cc',
  '.cpp',
  '.cs',
  '.css',
  '.go',
  '.h',
  '.hpp',
  '.html',
  '.java',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.mdx',
  '.mjs',
  '.py',
  '.rs',
  '.ts',
  '.tsx',
  '.txt',
  '.wgsl',
  '.yaml',
  '.yml',
])
const engineTargets = new Set([
  'world-partition.ts',
  'behavior-tree.ts',
  'skeletal-animation.ts',
  'vfx-graph-editor.ts',
  'hair-fur-system.ts',
  'navigation-ai.ts',
  'particle-system.ts',
  'post-processing-system.ts',
  'sequencer-cinematics.ts',
])
const hardcodedPortuguesePattern = /\b(Configura(?:\u00e7\u00f5es|coes)|P(?:\u00e1|a)gina|Salvar|Cancelar|Excluir|Carregando|Erro|Usu(?:\u00e1|a)rio|Projeto|Arquivo|Pesquisa|Ambiente|Ferramenta|Continuar)\b/g

function parseArgs(argv) {
  const args = {
    mode: 'quick',
    scope: ['.'],
    projectId: 'local-project',
    maxFiles: DEFAULT_MAX_FILES,
    maxBytes: DEFAULT_MAX_BYTES,
    maxHashBytes: DEFAULT_MAX_HASH_BYTES,
    maxFindings: DEFAULT_MAX_FINDINGS,
    write: true,
    json: true,
    strict: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]
    if (arg === '--mode' && next) {
      args.mode = next
      index += 1
    } else if (arg === '--scope') {
      const scopeValues = []
      let cursor = index + 1
      while (cursor < argv.length && !argv[cursor].startsWith('--')) {
        scopeValues.push(...argv[cursor].split(',').map((item) => item.trim()).filter(Boolean))
        cursor += 1
      }
      if (scopeValues.length === 0) {
        throw new Error('Missing value for --scope.')
      }
      args.scope = scopeValues
      index = cursor - 1
    } else if (arg === '--project-id' && next) {
      args.projectId = next
      index += 1
    } else if (arg === '--max-files' && next) {
      args.maxFiles = Number(next)
      index += 1
    } else if (arg === '--max-bytes' && next) {
      args.maxBytes = Number(next)
      index += 1
    } else if (arg === '--max-hash-bytes' && next) {
      args.maxHashBytes = Number(next)
      index += 1
    } else if (arg === '--max-findings' && next) {
      args.maxFindings = Number(next)
      index += 1
    } else if (arg === '--no-write') {
      args.write = false
    } else if (arg === '--strict') {
      args.strict = true
    }
  }

  if (!['quick', 'deep', 'aaa', 'external'].includes(args.mode)) {
    throw new Error(`Invalid --mode ${args.mode}; expected quick, deep, aaa, or external.`)
  }

  return args
}

function normalizeRelative(value) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+/g, '/')
}

function isInsideRoot(root, candidate) {
  const relative = path.relative(root, candidate)
  return !relative.startsWith('..') && !path.isAbsolute(relative)
}

function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(`sha256:${hash.digest('hex')}`))
  })
}

function isTextFile(filePath, sizeBytes) {
  if (sizeBytes > 1024 * 1024) return false
  if (path.basename(filePath) === '.aethelrules') return true
  return textExtensions.has(path.extname(filePath).toLowerCase())
}

async function collectFiles(root, scopes, options) {
  const artifacts = []
  const signals = new Map()
  const textByPath = new Map()
  const skipped = []
  let bytesScanned = 0
  let bytesSkipped = 0
  let truncated = false

  const queue = scopes.map((scope) => {
    const absolutePath = path.resolve(root, scope)
    return { absolutePath, relativePath: normalizeRelative(path.relative(root, absolutePath) || '.'), depth: 0 }
  })

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    if (!isInsideRoot(root, current.absolutePath)) {
      skipped.push({ path: current.relativePath, reason: 'outside-root' })
      continue
    }

    let stat
    try {
      stat = await fs.promises.stat(current.absolutePath)
    } catch {
      skipped.push({ path: current.relativePath, reason: 'stat-failed' })
      continue
    }

    if (stat.isDirectory()) {
      if (ignoredDirectories.has(path.basename(current.absolutePath))) {
        skipped.push({ path: current.relativePath, reason: 'ignored-dir' })
        continue
      }
      const entries = await fs.promises.readdir(current.absolutePath, { withFileTypes: true })
      entries.sort((left, right) => left.name.localeCompare(right.name))
      for (const entry of entries) {
        if (entry.isSymbolicLink()) {
          skipped.push({ path: normalizeRelative(path.join(current.relativePath, entry.name)), reason: 'symlink' })
          continue
        }
        queue.push({
          absolutePath: path.join(current.absolutePath, entry.name),
          relativePath: normalizeRelative(path.relative(root, path.join(current.absolutePath, entry.name))),
          depth: current.depth + 1,
        })
      }
      continue
    }

    if (!stat.isFile()) continue
    if (artifacts.length >= options.maxFiles || bytesScanned + stat.size > options.maxBytes) {
      truncated = true
      bytesSkipped += stat.size
      skipped.push({ path: current.relativePath, reason: 'budget' })
      continue
    }

    const shouldHash = stat.size <= options.maxHashBytes
    const artifact = {
      path: normalizeRelative(path.relative(root, current.absolutePath)),
      sizeBytes: stat.size,
      hash: shouldHash ? await sha256(current.absolutePath) : null,
      lastModified: stat.mtime.toISOString(),
      sourceKind: 'local-workspace',
    }
    artifacts.push(artifact)
    bytesScanned += stat.size

    if (isTextFile(current.absolutePath, stat.size)) {
      const content = await fs.promises.readFile(current.absolutePath, 'utf8')
      const hardcodedMatches = content.match(hardcodedPortuguesePattern)?.length ?? 0
      const signal = {
        path: artifact.path,
        lineCount: content.split(/\r?\n/).length,
        hardcodedCopyMatches: hardcodedMatches,
        hasWebGpuReference: /WebGPURenderer|navigator\.gpu|three\/webgpu|webgpu/i.test(content),
        hasAaaRendererEvidence: [
          'getCapabilityReport',
          'captureFrameEvidence',
          'isReadyForFinalRender',
          'supportsFinalOfflineRender',
        ].every((marker) => content.includes(marker)),
        hasLicenseEvidence: /license/i.test(content),
        hasChecksumEvidence: /sha256|checksum|digest/i.test(content),
        importerCount: 0,
      }
      signals.set(artifact.path, signal)
      textByPath.set(artifact.path, content)
    }
  }

  for (const signal of signals.values()) {
    const basename = path.basename(signal.path)
    if (!engineTargets.has(basename)) continue
    const stem = basename.replace(/\.ts$/, '')
    let count = 0
    for (const [candidatePath, content] of textByPath.entries()) {
      if (candidatePath === signal.path) continue
      if (content.includes(stem) || content.includes(basename)) count += 1
    }
    signal.importerCount = count
  }

  return {
    artifacts,
    signals: Array.from(signals.values()),
    skipped,
    truncated,
    bytesScanned,
    bytesSkipped,
  }
}

function severityRank(severity) {
  return { blocker: 0, high: 1, medium: 2, low: 3 }[severity] ?? 4
}

function finding(input) {
  return {
    id: `finding-${input.category}-${crypto.createHash('sha1').update(`${input.path}:${input.recommendation}`).digest('hex').slice(0, 10)}`,
    severity: input.severity,
    category: input.category,
    path: input.path,
    line: input.line ?? null,
    evidence: input.evidence,
    recommendation: input.recommendation,
    confidence: input.confidence,
    safeAutofix: false,
    requiresHumanReview: input.severity === 'blocker' || input.severity === 'high' || input.category === 'external-provenance',
  }
}

function buildFindings(args, collected) {
  const findings = []
  if (collected.truncated) {
    findings.push(finding({
      severity: 'high',
      category: 'runtime-budget',
      path: 'project',
      evidence: [`maxFiles:${args.maxFiles}`, `maxBytes:${args.maxBytes}`, `skipped:${collected.skipped.length}`],
      recommendation: 'Continue the scan in worker/sidecar batches; do not load the full project into model context.',
      confidence: 0.98,
    }))
  }

  const hasWebGpuEvidence = collected.signals.some((signal) => signal.hasWebGpuReference)
  if (args.mode === 'aaa' && !hasWebGpuEvidence) {
    findings.push(finding({
      severity: 'high',
      category: 'rendering',
      path: 'cloud-web-app/web/lib/render',
      evidence: ['mode:aaa', 'webgpu-reference:missing'],
      recommendation: 'Add a feature-flagged WebGPU probe/fallback before claiming modern browser AAA rendering.',
      confidence: 0.9,
    }))
  }

  for (const signal of collected.signals) {
    if (signal.lineCount >= 950) {
      findings.push(finding({
        severity: 'medium',
        category: 'god-file',
        path: signal.path,
        line: 1,
        evidence: [`line-count:${signal.lineCount}`],
        recommendation: 'Split this file before it crosses the god-file ratchet.',
        confidence: 0.88,
      }))
    }
    if (signal.hardcodedCopyMatches > 0 && /(^|\/)components\//.test(signal.path)) {
      findings.push(finding({
        severity: 'medium',
        category: 'i18n',
        path: signal.path,
        evidence: [`hardcoded-copy-matches:${signal.hardcodedCopyMatches}`],
        recommendation: 'Migrate visible Portuguese copy to locale keys.',
        confidence: 0.86,
      }))
    }
    if (engineTargets.has(path.basename(signal.path)) && signal.importerCount === 0) {
      findings.push(finding({
        severity: 'high',
        category: 'dead-code',
        path: signal.path,
        line: 1,
        evidence: ['engine-target:true', 'importer-count:0'],
        recommendation: 'Wire this engine module through a lightweight adapter or remove it with explicit review.',
        confidence: 0.94,
      }))
    }
    if (/aaa-renderer-impl\.ts$/.test(signal.path) && !signal.hasAaaRendererEvidence) {
      findings.push(finding({
        severity: 'high',
        category: 'rendering',
        path: signal.path,
        line: 1,
        evidence: ['audit-v17:aaa-render-impl-risk', 'renderer-evidence:missing'],
        recommendation: 'Add explicit renderer capability/frame evidence and final-render blockers before marketing AAA render claims.',
        confidence: 0.92,
      }))
    }
  }

  if (args.mode === 'external') {
    const hasLicenseFile = collected.artifacts.some((artifact) => /(^|\/)(license|licence|copying)(\.|$)/i.test(artifact.path))
    for (const artifact of collected.artifacts) {
      if (!artifact.hash || !hasLicenseFile) {
        findings.push(finding({
          severity: 'high',
          category: 'external-provenance',
          path: artifact.path,
          evidence: [artifact.hash ? 'checksum:present' : 'checksum:missing', hasLicenseFile ? 'license:present' : 'license:missing'],
          recommendation: 'Hold external adaptation until license, checksum, source URL, and approval are recorded.',
          confidence: 0.97,
        }))
      }
    }
  }

  return findings
    .sort((left, right) => severityRank(left.severity) - severityRank(right.severity) || left.path.localeCompare(right.path))
    .slice(0, args.maxFindings)
}

function buildManifest(args, collected, findings) {
  const generatedAt = new Date().toISOString()
  const scanId = `deep-spine-${args.projectId}-${args.mode}-${generatedAt}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const bytesTotal = collected.artifacts.reduce((sum, artifact) => sum + artifact.sizeBytes, 0)
  const evidenceRefs = [
    `deep-spine-scan:${scanId}`,
    'policy:no-auto-fix',
    'policy:metadata-first-external-sources',
    `skipped:${collected.skipped.length}`,
  ]
  const readReceipts = [
    `read-receipt:${scanId}:scope`,
    ...collected.artifacts.slice(0, 24).map((artifact) => `read-receipt:${scanId}:surface:${artifact.path}`),
  ]
  const workPackets = findings
    .filter((item) => item.severity === 'blocker' || item.severity === 'high')
    .slice(0, 12)
    .map((item) => ({
      id: `work-${item.id}`,
      title: item.recommendation,
      ownerAgent: item.category === 'rendering' ? 'Performance Agent' : item.category === 'external-provenance' ? 'Legal Reviewer' : 'Producer Agent',
      targetPaths: item.path === 'project' ? [] : [item.path],
      blockedUntil: ['read receipts', 'scope lock', 'rollback/artifact cleanup plan'],
      evidenceRequired: ['deep-spine-scan manifest', ...item.evidence, 'validation result'],
    }))

  return {
    version: 1,
    scanId,
    projectId: args.projectId,
    mode: args.mode,
    generatedAt,
    scope: {
      paths: args.scope.map(normalizeRelative),
      sourceKind: args.mode === 'external' ? 'mixed' : 'local-workspace',
      description: 'Governed local Deep Spine Scan command.',
    },
    budget: {
      maxFiles: args.maxFiles,
      maxBytes: args.maxBytes,
      maxHashBytes: args.maxHashBytes,
      maxTimeMs: 240000,
      maxFindings: args.maxFindings,
      allowCloudIndexing: false,
    },
    sourceRefs: collected.artifacts.slice(0, 120).flatMap((artifact) => [artifact.path, artifact.hash ? `hash:${artifact.hash}` : '']).filter(Boolean),
    filesScanned: collected.artifacts.length,
    bytesScanned: bytesTotal,
    bytesSkipped: collected.bytesSkipped,
    budgetExhausted: collected.truncated,
    findings,
    readReceipts,
    evidenceRefs,
    nextActions: workPackets.length > 0
      ? [...workPackets.map((packet) => `${packet.ownerAgent}: ${packet.title}`), 'Use diff-proposal only after read receipts, scope lock, tests, and rollback evidence exist.']
      : ['No blockers found. Keep the scan manifest as evidence and run focused validation before apply.'],
    blockedActions: [
      'Do not auto-fix from scan output.',
      'Do not download internet packages or models from this scan without license, checksum, source URL, and approval.',
      'Do not run MB/GB indexing, render, asset optimization, shader compile, or browser automation on the browser main thread.',
    ],
    workPackets,
    handoffPrompt: `Deep Spine Scan ${scanId} inspected ${collected.artifacts.length} files and produced ${findings.length} findings. Use generated work packets before edits.`,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const collected = await collectFiles(ROOT, args.scope, args)
  const findings = buildFindings(args, collected)
  const manifest = buildManifest(args, collected, findings)

  if (args.write) {
    const outputDir = path.join(ROOT, '.aethel', 'deep-spine-scan')
    await fs.promises.mkdir(outputDir, { recursive: true })
    await fs.promises.writeFile(path.join(outputDir, `${manifest.scanId}.json`), `${JSON.stringify(manifest, null, 2)}\n`)
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`)
  }

  if (args.strict && findings.some((item) => item.severity === 'blocker' || item.severity === 'high')) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  process.stderr.write(`[deep-spine-scan] FAIL ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
