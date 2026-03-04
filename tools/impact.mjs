#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const DEFAULT_SOURCE_ROOT = path.join(ROOT, 'cloud-web-app', 'web')
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

function parseArgs(argv) {
  const out = {
    plan: '',
    files: '',
    output: path.join(ROOT, 'docs', 'master', 'impact_matrix_core_loop.json'),
    sourceRoot: DEFAULT_SOURCE_ROOT,
  }

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--plan' && argv[i + 1]) {
      out.plan = path.resolve(ROOT, argv[i + 1])
      i += 1
      continue
    }
    if (arg === '--files' && argv[i + 1]) {
      out.files = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--output' && argv[i + 1]) {
      out.output = path.resolve(ROOT, argv[i + 1])
      i += 1
      continue
    }
    if (arg === '--source-root' && argv[i + 1]) {
      out.sourceRoot = path.resolve(ROOT, argv[i + 1])
      i += 1
    }
  }
  return out
}

const DEFAULT_CORE_LOOP_TARGETS = [
  'cloud-web-app/web/app/api/ai/change/apply/route.ts',
  'cloud-web-app/web/app/api/ai/change/rollback/route.ts',
]

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/')
}

function toRootRelative(absPath) {
  return toPosix(path.relative(ROOT, absPath))
}

function normalizeProjectPath(input, sourceRoot) {
  const text = String(input || '').trim()
  if (!text) return ''
  const abs = path.isAbsolute(text) ? text : path.resolve(ROOT, text)

  if (!abs.startsWith(sourceRoot)) return ''
  return toPosix(path.relative(sourceRoot, abs))
}

function parseImportSpecifiers(source) {
  const imports = new Set()
  const importRegex = /\bimport\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g
  const dynamicImportRegex = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g
  const requireRegex = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g

  for (const regex of [importRegex, dynamicImportRegex, requireRegex]) {
    let match
    while ((match = regex.exec(source)) !== null) {
      const spec = String(match[1] || '').trim()
      if (!spec) continue
      imports.add(spec)
    }
  }

  return [...imports]
}

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const rel = toRootRelative(fullPath)

    if (
      entry.isDirectory() &&
      (entry.name === 'node_modules' ||
        entry.name === '.next' ||
        entry.name === 'dist' ||
        entry.name === 'coverage' ||
        entry.name === '.git')
    ) {
      continue
    }

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)))
      continue
    }

    if (!entry.isFile()) continue
    if (!SOURCE_EXTENSIONS.some((ext) => rel.endsWith(ext))) continue
    files.push(fullPath)
  }
  return files
}

function buildResolutionCandidates(base) {
  return [
    base,
    ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...SOURCE_EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ]
}

async function resolveLocalImport(specifier, importerRel, sourceRoot) {
  const isRelative = specifier.startsWith('.')
  const isAlias = specifier.startsWith('@/') || specifier.startsWith('@\\')
  if (!isRelative && !isAlias) return ''

  const bases = []
  if (isRelative) {
    const importerDir = path.dirname(path.join(sourceRoot, importerRel))
    bases.push(path.resolve(importerDir, specifier))
  }

  if (isAlias) {
    const aliasRel = specifier.slice(2)
    bases.push(path.resolve(sourceRoot, aliasRel))
  }

  const candidates = bases.flatMap(buildResolutionCandidates)

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate)
      if (!stat.isFile()) continue
      if (!candidate.startsWith(sourceRoot)) return ''
      return toPosix(path.relative(sourceRoot, candidate))
    } catch {
      // ignore
    }
  }
  return ''
}

function deriveRiskTag(relPath) {
  const p = relPath.toLowerCase()
  if (p.includes('/app/api/auth/') || p.includes('/app/api/billing/') || p.includes('/app/admin/')) return 'high'
  if (p.includes('/app/api/') || p.includes('/lib/server/')) return 'medium'
  return 'low'
}

function inferUiSurfaces(relPath) {
  const surfaces = []
  if (relPath.includes('/app/dashboard/')) surfaces.push('/dashboard')
  if (relPath.includes('/app/ide/')) surfaces.push('/ide')
  if (relPath.includes('/app/admin/')) surfaces.push('/admin')
  if (relPath.includes('/components/ide/')) surfaces.push('ide-component')
  if (relPath.includes('/components/dashboard/')) surfaces.push('dashboard-component')
  if (relPath.includes('/components/nexus/')) surfaces.push('nexus-component')
  return [...new Set(surfaces)]
}

function inferEndpoints(paths) {
  return [...new Set(paths.filter((p) => p.includes('/app/api/')).map((p) => `/${p.split('/app/')[1].replace(/\/route\.[tj]sx?$/, '')}`))]
}

async function loadTargetsFromPlan(planPath, sourceRoot) {
  if (!planPath) return []
  const raw = await fs.readFile(planPath, 'utf8')
  const plan = JSON.parse(raw)
  const candidates = new Set()

  const push = (value) => {
    const normalized = normalizeProjectPath(value, sourceRoot)
    if (normalized) candidates.add(normalized)
  }

  if (Array.isArray(plan?.changes)) {
    for (const change of plan.changes) {
      push(change?.filePath)
      push(change?.path)
      push(change?.file)
    }
  }

  if (Array.isArray(plan?.files)) {
    for (const file of plan.files) push(file)
  }

  if (Array.isArray(plan?.targets)) {
    for (const target of plan.targets) push(target)
  }

  return [...candidates]
}

function loadTargetsFromFilesArg(filesArg, sourceRoot) {
  if (!filesArg) return []
  const files = filesArg.split(',').map((item) => item.trim()).filter(Boolean)
  const normalized = files
    .map((item) => normalizeProjectPath(item, sourceRoot))
    .filter(Boolean)
  return [...new Set(normalized)]
}

async function main() {
  const args = parseArgs(process.argv)
  const sourceRoot = args.sourceRoot
  const sourceRootRel = toRootRelative(sourceRoot)
  const files = await walkFiles(sourceRoot)
  const relFiles = files.map((file) => toPosix(path.relative(sourceRoot, file)))

  const importsMap = new Map()
  const dependentsMap = new Map()

  for (const relFile of relFiles) {
    importsMap.set(relFile, new Set())
    dependentsMap.set(relFile, new Set())
  }

  for (const absFile of files) {
    const relFile = toPosix(path.relative(sourceRoot, absFile))
    const source = await fs.readFile(absFile, 'utf8')
    const specs = parseImportSpecifiers(source)

    for (const spec of specs) {
      const local = await resolveLocalImport(spec, relFile, sourceRoot)
      if (!local) continue
      importsMap.get(relFile)?.add(local)
      dependentsMap.get(local)?.add(relFile)
    }
  }

  const planTargets = await loadTargetsFromPlan(args.plan, sourceRoot)
  const argTargets = loadTargetsFromFilesArg(args.files, sourceRoot)
  let targets = [...new Set([...planTargets, ...argTargets])]

  if (targets.length === 0) {
    targets = loadTargetsFromFilesArg(DEFAULT_CORE_LOOP_TARGETS.join(','), sourceRoot)
  }

  if (targets.length === 0) {
    console.error('[impact] no targets resolved. Use --plan <plan.json> or --files <comma-separated paths>.')
    process.exit(1)
  }

  const entries = targets.map((target) => {
    const imports = [...(importsMap.get(target) ?? new Set())].sort()
    const dependedBy = [...(dependentsMap.get(target) ?? new Set())].sort()
    const related = [target, ...dependedBy]
    const endpointHints = inferEndpoints(related)

    const testHints = [...new Set(
      dependedBy.filter((p) => /\.spec\.[tj]sx?$|\.test\.[tj]sx?$/.test(p))
    )]

    return {
      file: `${sourceRootRel}/${target}`.replace(/\/+/g, '/'),
      dependsOn: imports.map((p) => `${sourceRootRel}/${p}`.replace(/\/+/g, '/')),
      dependedBy: dependedBy.map((p) => `${sourceRootRel}/${p}`.replace(/\/+/g, '/')),
      tests: testHints.map((p) => `${sourceRootRel}/${p}`.replace(/\/+/g, '/')),
      endpoints: endpointHints,
      uiSurfaces: inferUiSurfaces(`/${target}`),
      riskTag: deriveRiskTag(`/${target}`),
    }
  })

  const output = {
    generatedAt: new Date().toISOString(),
    sourceRoot: sourceRootRel,
    targetCount: targets.length,
    graphStats: {
      scannedFiles: relFiles.length,
      totalEdges: [...importsMap.values()].reduce((acc, set) => acc + set.size, 0),
    },
    entries,
  }

  await fs.mkdir(path.dirname(args.output), { recursive: true })
  await fs.writeFile(args.output, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

  console.log(
    `[impact] targets=${targets.length} scannedFiles=${relFiles.length} output=${toRootRelative(args.output)}`
  )
}

main().catch((error) => {
  console.error('[impact] FAIL', error)
  process.exit(1)
})
