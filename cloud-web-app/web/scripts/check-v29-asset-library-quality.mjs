#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const full = path.join(ROOT, relativePath)
  if (!fs.existsSync(full)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (content && !pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

requirePattern('lib/assets/library/catalog/license-policy.ts', /export type AssetLicenseKind/, 'license kind contract')
requirePattern('lib/assets/library/catalog/license-policy.ts', /evaluateAssetLicensePolicy/, 'license policy evaluator')
requirePattern('lib/assets/library/catalog/license-policy.ts', /license\/provenance receipt/, 'license provenance receipt')
requirePattern('lib/assets/library/catalog/license-policy.ts', /marketplace-redistribution/, 'redistribution use case guard')
requirePattern('lib/assets/library/catalog/license-policy.ts', /human_review_required/, 'human review state')

requirePattern('lib/assets/library/catalog/manifest.ts', /export interface AssetLibraryCatalogEntry/, 'catalog entry contract')
requirePattern('lib/assets/library/catalog/manifest.ts', /buildAssetLibraryCatalogEntry/, 'catalog entry builder')
requirePattern('lib/assets/library/catalog/manifest.ts', /PBR texture compression report/, 'PBR proof')
requirePattern('lib/assets/library/catalog/manifest.ts', /LOD0\/LOD1\/LOD2\/LOD3 manifest/, 'LOD proof')
requirePattern('lib/assets/library/catalog/manifest.ts', /collision\/navmesh proxy report/, 'collision and navmesh proof')
requirePattern('lib/assets/library/catalog/manifest.ts', /viewport performance trace/, 'performance trace proof')
requirePattern('lib/assets/library/catalog/manifest.ts', /human art-direction approval/, 'human art direction proof')
requirePattern('lib/assets/library/catalog/manifest.ts', /finalClaimAllowed:\s*false/, 'final claims must stay blocked')

requirePattern('lib/assets/library/sources/polyhaven.ts', /buildPolyHavenSourceAdapter/, 'Poly Haven source adapter')
requirePattern('lib/assets/library/sources/polyhaven.ts', /cc0/, 'Poly Haven CC0 policy')
requirePattern('lib/assets/library/sources/sketchfab.ts', /buildSketchfabSourceAdapter/, 'Sketchfab source adapter')
requirePattern('lib/assets/library/sources/sketchfab.ts', /commercial terms receipt/, 'Sketchfab commercial terms receipt')
requirePattern('lib/assets/library/index.ts', /buildAssetLibraryCatalogEntry/, 'library barrel export')

requirePattern('__tests__/assets/asset-library-quality.test.ts', /evaluateAssetLicensePolicy/, 'license tests')
requirePattern('__tests__/assets/asset-library-quality.test.ts', /buildAssetLibraryCatalogEntry/, 'catalog tests')
requirePattern('__tests__/assets/asset-library-quality.test.ts', /buildSketchfabSourceAdapter/, 'source adapter tests')
requirePattern('lib/runtime/v29-forensic-runtime-backlog.ts', /qa:v29-asset-library-quality/, 'forensic backlog gate')
requirePattern('scripts/check-v29-total-spine.mjs', /check-v29-asset-library-quality\.mjs/, 'V29 total gate inclusion')
requirePattern('package.json', /qa:v29-asset-library-quality/, 'package script')
requirePattern('tsconfig.typecheck-runtime-spine.json', /lib\/assets\/library\/\*\*\/\*\.ts/, 'runtime typecheck include')

if (failures.length) {
  console.error('[v29-asset-library-quality] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-asset-library-quality] PASS catalog=governed sources=2 final-claim=blocked')
