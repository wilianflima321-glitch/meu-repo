#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const webRoot = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), 'utf8')
const failures = []

const requirePattern = (text, pattern, message) => {
  if (!pattern.test(text)) failures.push(message)
}

const hookFile = 'components/performance/useVirtualWindow.ts'
const outlinerFile = 'components/engine/WorldOutliner.tsx'
const browserFile = 'components/engine/EngineContentBrowser.tsx'
const keyframeFile = 'components/animation/KeyframeSystem.tsx'
const keyframeCanvasFile = 'components/animation/KeyframeSystem.canvas.ts'
const packageFile = 'package.json'

for (const file of [hookFile, outlinerFile, browserFile, keyframeFile, keyframeCanvasFile]) {
  if (!fs.existsSync(path.join(webRoot, file))) failures.push(`Missing virtualization spine file: ${file}`)
}

const hookText = fs.existsSync(path.join(webRoot, hookFile)) ? read(hookFile) : ''
const outlinerText = fs.existsSync(path.join(webRoot, outlinerFile)) ? read(outlinerFile) : ''
const browserText = fs.existsSync(path.join(webRoot, browserFile)) ? read(browserFile) : ''
const keyframeText = fs.existsSync(path.join(webRoot, keyframeFile)) ? read(keyframeFile) : ''
const keyframeCanvasText = fs.existsSync(path.join(webRoot, keyframeCanvasFile)) ? read(keyframeCanvasFile) : ''
const keyframeSurfaceText = `${keyframeText}\n${keyframeCanvasText}`
const packageText = read(packageFile)

requirePattern(
  hookText,
  /export function useVirtualWindow/,
  'Shared virtualization hook must be exported for editor surfaces.',
)
requirePattern(
  hookText,
  /ResizeObserver/,
  'Virtualization hook must observe viewport resize instead of hard-coding dimensions.',
)
requirePattern(
  hookText,
  /return \(\) => observer\.disconnect\(\)/,
  'Virtualization hook must clean up ResizeObserver.',
)
requirePattern(
  hookText,
  /return \(\) => window\.removeEventListener\('resize', updateViewport\)/,
  'Virtualization hook must clean up resize fallback listener.',
)
requirePattern(
  outlinerText,
  /useVirtualWindow\(/,
  'WorldOutliner must virtualize the flattened scene tree.',
)
requirePattern(
  outlinerText,
  /virtualTreeItems\.map/,
  'WorldOutliner must render only virtual tree rows.',
)
requirePattern(
  outlinerText,
  /OUTLINER_ROW_HEIGHT/,
  'WorldOutliner must pin a deterministic row height for virtualization.',
)
requirePattern(
  browserText,
  /assetVirtualRows/,
  'EngineContentBrowser must compute virtual rows for large asset collections.',
)
requirePattern(
  browserText,
  /ResizeObserver/,
  'EngineContentBrowser must measure asset viewport dimensions.',
)
requirePattern(
  browserText,
  /ASSET_GRID_ROW_HEIGHT/,
  'EngineContentBrowser grid view must use deterministic virtual row height.',
)
requirePattern(
  browserText,
  /ASSET_LIST_ROW_HEIGHT/,
  'EngineContentBrowser list view must use deterministic virtual row height.',
)
requirePattern(
  browserText,
  /displayedAssets\.slice\(\s*rowIndex \* gridColumns/,
  'EngineContentBrowser grid view must slice only assets for the visible row.',
)
requirePattern(
  browserText,
  /displayedAssets\[assetIndex\]/,
  'EngineContentBrowser list view must read only visible rows.',
)
requirePattern(
  keyframeSurfaceText,
  /timelineRows/,
  'KeyframeSystem must flatten tracks into deterministic timeline rows.',
)
requirePattern(
  keyframeSurfaceText,
  /visibleTimelineRange/,
  'KeyframeSystem must track the visible canvas range for draw culling.',
)
requirePattern(
  keyframeSurfaceText,
  /findScrollableParent/,
  'KeyframeSystem must detect scroll containers for viewport-aware drawing.',
)
requirePattern(
  keyframeSurfaceText,
  /TIMELINE_DRAW_OVERSCAN/,
  'KeyframeSystem must use explicit overscan when culling canvas drawing.',
)
requirePattern(
  keyframeSurfaceText,
  /sortedKeyframesByProperty/,
  'KeyframeSystem must pre-sort keyframes instead of sorting during every draw row.',
)
requirePattern(
  keyframeSurfaceText,
  /row\.kind === ['"]property['"]/,
  'KeyframeSystem must draw and hit-test only property rows when needed.',
)
requirePattern(
  keyframeSurfaceText,
  /segmentRight >= visibleLeft && segmentLeft <= visibleRight/,
  'KeyframeSystem must skip easing segments outside the visible horizontal range.',
)
requirePattern(
  packageText,
  /qa:editor-virtualization-spine/,
  'package.json must expose qa:editor-virtualization-spine.',
)

const report = [
  '# Editor Virtualization Spine Audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `- Shared hook: ${hookFile}`,
  `- Virtualized editors: ${outlinerFile}, ${browserFile}`,
  `- Canvas-culling editor: ${keyframeFile} + ${keyframeCanvasFile}`,
  `- Failures: ${failures.length}`,
  '',
  ...failures.map((failure) => `- ${failure}`),
].join('\n')

fs.writeFileSync(path.join(webRoot, 'docs/EDITOR_VIRTUALIZATION_SPINE_AUDIT.md'), report)

if (failures.length) {
  console.error(report)
  process.exit(1)
}

console.log('Editor virtualization spine gate passed')
