import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const TARGET_DIRS = ['app', 'components', 'lib']
const OUT = path.join(ROOT, 'docs', 'BUNDLE_BOUNDARIES_AUDIT.md')
const EXTENSIONS = new Set(['.ts', '.tsx'])
const ignoreDirs = new Set(['node_modules', '.next', 'dist', 'build', '__tests__', '__mocks__'])

const BUDGETS = {
  threeDirect: 0,
  reactThreeFiberDirect: 2,
  reactThreeDreiDirect: 0,
  monacoEditorDirect: 0,
  monacoReactDirect: 0,
  framerMotionDirect: 0,
  dynamicImportsMin: 100,
}

const HEAVY_ASYNC_BOUNDARY_MARKER = '@aethel-heavy-async-boundary'

const HEAVY_MODULES = {
  threeDirect: (source) => source === 'three',
  reactThreeFiberDirect: (source) => source === '@react-three/fiber',
  reactThreeDreiDirect: (source) => source === '@react-three/drei',
  monacoEditorDirect: (source) => source === 'monaco-editor' || source.startsWith('monaco-editor/'),
  monacoReactDirect: (source) => source === '@monaco-editor/react',
  framerMotionDirect: (source) => source === 'framer-motion',
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, out)
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(abs)
  }

  return out
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

function extractStaticImports(content) {
  const imports = []
  const importRegex = /^\s*import\s+(type\s+)?(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm
  let match
  while ((match = importRegex.exec(content))) {
    if (match[1]) continue
    imports.push(match[2])
  }
  return imports
}

function resolveLocalImport(importer, source) {
  if (!source.startsWith('.') && !source.startsWith('@/')) return null

  const base = source.startsWith('@/')
    ? path.join(ROOT, source.slice(2))
    : path.resolve(path.dirname(importer), source)

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

function isPublicRouteShell(relativePath) {
  if (!relativePath.startsWith('app/')) return false
  if (relativePath.startsWith('app/api/')) return false
  if (relativePath.startsWith('app/studio/')) return false
  if (relativePath.startsWith('app/ide/')) return false
  if (relativePath.startsWith('app/nexus/')) return false
  return /\/(page|layout|template)\.tsx$/.test(`/${relativePath}`)
}

const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)))
const counts = Object.fromEntries(Object.keys(BUDGETS).map((key) => [key, 0]))
const offenders = Object.fromEntries(Object.keys(HEAVY_MODULES).map((key) => [key, []]))
const asyncBoundaryOffenders = Object.fromEntries(Object.keys(HEAVY_MODULES).map((key) => [key, []]))
const heavyAsyncBoundaries = new Set()
const asyncBoundaryReferences = []
const publicStaticAsyncBoundaryImports = []

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  if (content.includes(HEAVY_ASYNC_BOUNDARY_MARKER)) {
    heavyAsyncBoundaries.add(path.resolve(file))
  }
}

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  const staticImports = extractStaticImports(content)
  const relative = rel(file)
  const isHeavyAsyncBoundary = content.includes(HEAVY_ASYNC_BOUNDARY_MARKER)

  if (!isHeavyAsyncBoundary) {
    for (const source of staticImports) {
      const resolved = resolveLocalImport(file, source)
      if (resolved && heavyAsyncBoundaries.has(path.resolve(resolved))) {
        const reference = {
          file: relative,
          source,
          boundary: rel(resolved),
        }
        asyncBoundaryReferences.push(reference)
        if (isPublicRouteShell(relative)) {
          publicStaticAsyncBoundaryImports.push(reference)
        }
      }
    }
  }

  for (const [key, predicate] of Object.entries(HEAVY_MODULES)) {
    const hits = staticImports.filter(predicate)
    if (hits.length > 0) {
      if (isHeavyAsyncBoundary) {
        asyncBoundaryOffenders[key].push({ file: relative, hits: hits.length })
      } else {
        counts[key] += hits.length
        offenders[key].push({ file: relative, hits: hits.length })
      }
    }
  }

  const dynamicMatches = content.match(/\bdynamic\s*\(|\bimport\s*\(/g)
  counts.dynamicImportsMin += dynamicMatches?.length ?? 0
}

const failures = []
for (const [key, budget] of Object.entries(BUDGETS)) {
  if (key === 'dynamicImportsMin') {
    if (counts[key] < budget) failures.push(`${key}=${counts[key]} below min=${budget}`)
  } else if (counts[key] > budget) {
    failures.push(`${key}=${counts[key]} above max=${budget}`)
  }
}

if (publicStaticAsyncBoundaryImports.length > 0) {
  failures.push(`publicStaticAsyncBoundaryImports=${publicStaticAsyncBoundaryImports.length} must be dynamic imports`)
}

const canonicalPreviewPath = path.join(ROOT, 'components', 'preview', 'CanonicalPreviewSurface.tsx')
const unifiedViewportPath = path.join(ROOT, 'components', 'canvas', 'UnifiedViewport.tsx')
if (fs.existsSync(canonicalPreviewPath)) {
  const canonicalPreview = fs.readFileSync(canonicalPreviewPath, 'utf8')
  if (!canonicalPreview.includes("import UnifiedViewport from '@/components/canvas/UnifiedViewport'")) {
    failures.push('CanonicalPreviewSurface must delegate viewport/canvas work to UnifiedViewport')
  }
}
if (fs.existsSync(unifiedViewportPath)) {
  const unifiedViewport = fs.readFileSync(unifiedViewportPath, 'utf8')
  const requiredDynamicBoundaries = [
    'SceneViewportSurface',
    'CanvasViewportSurface',
  ]
  for (const boundary of requiredDynamicBoundaries) {
    if (!unifiedViewport.includes(`const ${boundary} = dynamic(`)) {
      failures.push(`UnifiedViewport must lazy-load ${boundary}`)
    }
  }
} else {
  failures.push('components/canvas/UnifiedViewport.tsx is required as the single viewport adapter')
}

const report = []
report.push('# BUNDLE_BOUNDARIES_AUDIT.md')
report.push('Generated: deterministic local scan')
report.push('')
report.push(`- Files scanned: ${files.length}`)
report.push(`- Failures: ${failures.length}`)
report.push('')
report.push('## Counts')
for (const [key, value] of Object.entries(counts)) {
  const comparator = key === 'dynamicImportsMin' ? 'min' : 'max'
  report.push(`- ${key}: ${value} (${comparator} ${BUDGETS[key]})`)
}
report.push('')
report.push('## Top Offenders')
for (const [key, items] of Object.entries(offenders)) {
  report.push(`### ${key}`)
  if (items.length === 0) {
    report.push('- none')
    continue
  }
  for (const item of items.slice(0, 25)) {
    report.push(`- ${item.file} (${item.hits})`)
  }
}
report.push('')
report.push('## Async Heavy Boundaries')
report.push(`Files marked with ${HEAVY_ASYNC_BOUNDARY_MARKER} are reported separately because they are split behind explicit dynamic boundaries and are not allowed to be imported by public route shells.`)
for (const [key, items] of Object.entries(asyncBoundaryOffenders)) {
  report.push(`### ${key}`)
  if (items.length === 0) {
    report.push('- none')
    continue
  }
  for (const item of items.slice(0, 25)) {
    report.push(`- ${item.file} (${item.hits})`)
  }
}
report.push('')
report.push('## Async Boundary Import References')
if (asyncBoundaryReferences.length === 0) {
  report.push('- none')
} else {
  for (const item of asyncBoundaryReferences.slice(0, 50)) {
    report.push(`- ${item.file} statically imports ${item.source} -> ${item.boundary}`)
  }
}
report.push('')
report.push('## Public Route Import Violations')
if (publicStaticAsyncBoundaryImports.length === 0) {
  report.push('- none')
} else {
  for (const item of publicStaticAsyncBoundaryImports) {
    report.push(`- ${item.file} statically imports ${item.source} -> ${item.boundary}`)
  }
}
report.push('')
report.push('## Failures')
if (failures.length === 0) report.push('- none')
else failures.forEach((failure) => report.push(`- ${failure}`))
report.push('')
report.push('## Critical Boundaries')
report.push('- CanonicalPreviewSurface delegates viewport/canvas work to UnifiedViewport.')
report.push('- UnifiedViewport lazy-loads SceneViewportSurface and CanvasViewportSurface so runtime/live previews do not eagerly pull viewport/Three code.')

fs.writeFileSync(OUT, `${report.join('\n')}\n`, 'utf8')

if (failures.length > 0) {
  console.error(`[bundle-boundaries] FAIL ${failures.join('; ')} report=${rel(OUT)}`)
  process.exitCode = 1
} else {
  console.log(`[bundle-boundaries] PASS report=${rel(OUT)}`)
}
