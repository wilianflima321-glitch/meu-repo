import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const TARGET_DIRS = ['app', 'components', 'lib']
const OUT = path.join(ROOT, 'docs', 'BUNDLE_BOUNDARIES_AUDIT.md')
const EXTENSIONS = new Set(['.ts', '.tsx'])
const ignoreDirs = new Set(['node_modules', '.next', 'dist', 'build'])

const BUDGETS = {
  threeDirect: 46,
  reactThreeFiberDirect: 3,
  reactThreeDreiDirect: 2,
  monacoEditorDirect: 4,
  monacoReactDirect: 4,
  framerMotionDirect: 18,
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

const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)))
const counts = Object.fromEntries(Object.keys(BUDGETS).map((key) => [key, 0]))
const offenders = Object.fromEntries(Object.keys(HEAVY_MODULES).map((key) => [key, []]))
const asyncBoundaryOffenders = Object.fromEntries(Object.keys(HEAVY_MODULES).map((key) => [key, []]))

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  const staticImports = extractStaticImports(content)
  const relative = rel(file)
  const isHeavyAsyncBoundary = content.includes(HEAVY_ASYNC_BOUNDARY_MARKER)

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

const canonicalPreviewPath = path.join(ROOT, 'components', 'preview', 'CanonicalPreviewSurface.tsx')
if (fs.existsSync(canonicalPreviewPath)) {
  const canonicalPreview = fs.readFileSync(canonicalPreviewPath, 'utf8')
  const requiredDynamicBoundaries = [
    'SceneViewportSurface',
    'CanvasViewportSurface',
  ]
  for (const boundary of requiredDynamicBoundaries) {
    if (!canonicalPreview.includes(`const ${boundary} = dynamic(`)) {
      failures.push(`CanonicalPreviewSurface must lazy-load ${boundary}`)
    }
  }
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
report.push('## Failures')
if (failures.length === 0) report.push('- none')
else failures.forEach((failure) => report.push(`- ${failure}`))
report.push('')
report.push('## Critical Boundaries')
report.push('- CanonicalPreviewSurface lazy-loads SceneViewportSurface and CanvasViewportSurface so runtime/live previews do not eagerly pull viewport/Three code.')

fs.writeFileSync(OUT, `${report.join('\n')}\n`, 'utf8')

if (failures.length > 0) {
  console.error(`[bundle-boundaries] FAIL ${failures.join('; ')} report=${rel(OUT)}`)
  process.exitCode = 1
} else {
  console.log(`[bundle-boundaries] PASS report=${rel(OUT)}`)
}
