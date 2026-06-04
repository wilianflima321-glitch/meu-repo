#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(file) {
  const abs = path.join(ROOT, file)
  if (!fs.existsSync(abs)) {
    failures.push(`${file}: missing`)
    return ''
  }
  return fs.readFileSync(abs, 'utf8')
}

function mustInclude(file, tokens) {
  const content = read(file)
  for (const token of tokens) {
    if (!content.includes(token)) failures.push(`${file}: missing ${token}`)
  }
  return content
}

const deletedLegacyFiles = [
  'components/LivePreview.tsx',
  'components/MiniPreview.tsx',
  'components/SimpleMini3DPreview.tsx',
  'components/ide/PreviewViewport3D.tsx',
  'components/ide/ProfessionalViewport3D.tsx',
  'components/ide/IDELayout.tsx',
]

for (const file of deletedLegacyFiles) {
  if (fs.existsSync(path.join(ROOT, file))) failures.push(`${file}: legacy preview surface must stay deleted`)
}

const registry = mustInclude('components/preview/previewSurfaceRegistry.ts', [
  "export type PreviewSurfaceKind = 'scene' | 'canvas' | 'runtime' | 'device' | 'console'",
  'PREVIEW_SURFACE_REGISTRY',
  "owner: 'CanonicalPreviewSurface'",
  "owner: 'WorkbenchPreviewPane'",
  "detailPolicy: 'contextual-drawer'",
  "detailPolicy: 'runtime-toolbar'",
  "detailPolicy: 'console-panel'",
])

const registryIds = [...registry.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]).sort()
const expectedIds = ['canvas', 'console', 'device', 'runtime', 'viewport3d']
if (registryIds.join(',') !== expectedIds.join(',')) {
  failures.push(`components/preview/previewSurfaceRegistry.ts: expected canonical ids ${expectedIds.join(', ')} but found ${registryIds.join(', ')}`)
}

mustInclude('components/preview/CanonicalPreviewSurface.tsx', [
  "import UnifiedViewport from '@/components/canvas/UnifiedViewport'",
  "data-canonical-preview-surface=\"scene\"",
  "data-canonical-preview-surface=\"canvas\"",
  "data-canonical-preview-surface=\"runtime\"",
])

mustInclude('components/canvas/UnifiedViewport.tsx', [
  'UNIFIED_VIEWPORT_SURFACES',
  "dynamic(() => import('@/components/preview/SceneViewportSurface')",
  "dynamic(() => import('@/components/preview/CanvasViewportSurface')",
  'data-unified-viewport="true"',
  "id: 'scene'",
  "id: 'character'",
  "id: 'material'",
  "id: 'cinematic'",
  "id: 'audio'",
])

mustInclude('components/preview/SceneViewportSurface.tsx', [
  "from '@/components/viewport/AethelViewport3D'",
  'SceneViewportInspector',
  'SceneViewportOutliner',
  'SceneViewportStage',
  'TimelineOverlay',
  'ViewportWorkbenchShell',
])

mustInclude('components/preview/ViewportWorkbenchShell.tsx', [
  'data-viewport-tools-drawer="collapsed-by-default"',
  'data-viewport-primary-action="contextual-drawer"',
  'Generate proposal',
  'Animate selected',
])

mustInclude('components/ide/fullscreen/WorkbenchPreviewPane.tsx', [
  "import CanonicalPreviewSurface from '@/components/preview/CanonicalPreviewSurface'",
  'previewMode === \'viewport3d\'',
  'previewMode === \'canvas\'',
])

mustInclude('components/ide/fullscreen/WorkbenchPreviewRuntimeSurface.tsx', [
  "import CanonicalPreviewSurface from '@/components/preview/CanonicalPreviewSurface'",
  'variant="runtime"',
])

const vrPreview = read('components/VRPreview.tsx')
if (vrPreview && !vrPreview.includes("NEXT_PUBLIC_LABS_VR !== 'true'")) {
  failures.push('components/VRPreview.tsx: VR preview must stay behind NEXT_PUBLIC_LABS_VR')
}
if (vrPreview && !vrPreview.includes('@aethel-heavy-async-boundary')) {
  failures.push('components/VRPreview.tsx: heavy viewport must stay behind explicit async boundary')
}

function listSourceFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(abs))
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      results.push(path.relative(ROOT, abs).replaceAll(path.sep, '/'))
    }
  }
  return results
}

const files = listSourceFiles(path.join(ROOT, 'components'))

const directViewportImports = []
for (const file of files) {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8')
  if (
    content.includes("from '@/components/viewport/AethelViewport3D'") &&
    !file.startsWith('components/preview/') &&
    !file.startsWith('components/viewport/')
  ) {
    directViewportImports.push(file)
  }
}
if (directViewportImports.length > 0) {
  failures.push(`AethelViewport3D imports must stay inside preview/viewport adapters: ${directViewportImports.join(', ')}`)
}

const reportPath = path.join(ROOT, '.next', 'aethel-audits', 'PREVIEW_SURFACE_CANONICAL_AUDIT.md')
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(
  reportPath,
  `# Preview Surface Canonical Audit

- Canonical registry IDs: ${registryIds.join(', ')}
- Legacy preview files deleted: ${deletedLegacyFiles.every((file) => !fs.existsSync(path.join(ROOT, file))) ? 'yes' : 'no'}
- VR preview labs-gated: ${vrPreview.includes("NEXT_PUBLIC_LABS_VR !== 'true'") ? 'yes' : 'no'}
- Direct AethelViewport3D imports outside SceneViewportSurface: ${directViewportImports.length}

Status: ${failures.length ? 'FAIL' : 'PASS'}
`,
)

if (failures.length > 0) {
  console.error(`[preview-surface-canonical] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log(`[preview-surface-canonical] PASS ids=${registryIds.join(',')}`)
