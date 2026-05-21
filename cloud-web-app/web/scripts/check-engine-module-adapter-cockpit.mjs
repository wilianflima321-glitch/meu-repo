#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const REQUIRED_FILES = [
  'components/studio/EngineModuleAdapterCockpit.tsx',
  'components/studio/EngineSpineReadinessPanel.tsx',
  'components/evidence/EvidenceCenter.tsx',
  'lib/studio/engine-spine-modules.ts',
  'docs/ENGINE_MODULE_ADAPTER_COCKPIT_V22.md',
]

function read(file) {
  const abs = path.join(ROOT, file)
  if (!fs.existsSync(abs)) throw new Error(`Missing required file: ${file}`)
  return fs.readFileSync(abs, 'utf8')
}

const failures = []
const sources = new Map()

for (const file of REQUIRED_FILES) {
  try {
    sources.set(file, read(file))
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error))
  }
}

function requireToken(file, token, reason = token) {
  const source = sources.get(file) ?? ''
  if (!source.includes(token)) failures.push(`${file}: missing ${reason}`)
}

requireToken('components/studio/EngineModuleAdapterCockpit.tsx', 'Read-only adapter evidence')
requireToken('components/studio/EngineModuleAdapterCockpit.tsx', 'worker/sidecar/native/cloud')
requireToken('components/studio/EngineModuleAdapterCockpit.tsx', 'not loaded directly')
requireToken('components/studio/EngineModuleAdapterCockpit.tsx', 'getEngineSpinePriorityModules')
requireToken('components/studio/EngineModuleAdapterCockpit.tsx', 'getEngineSpineDecisionMatrix')
requireToken('components/studio/EngineModuleAdapterCockpit.tsx', 'Next safe move')
requireToken('components/studio/EngineSpineReadinessPanel.tsx', 'EngineModuleAdapterCockpit')
requireToken('components/evidence/EvidenceCenter.tsx', 'EngineModuleAdapterCockpit')
requireToken('lib/studio/engine-spine-modules.ts', 'getEngineSpineReadinessModel')
requireToken('lib/studio/engine-spine-modules.ts', 'getEngineSpineDecisionMatrix')
requireToken('lib/studio/engine-spine-modules.ts', 'getEngineSpinePriorityModules')
requireToken('lib/studio/engine-spine-modules.ts', 'must not be loaded directly')
requireToken('docs/ENGINE_MODULE_ADAPTER_COCKPIT_V22.md', 'Read-only adapter evidence')
requireToken('docs/ENGINE_MODULE_ADAPTER_COCKPIT_V22.md', 'No heavy runtime import')
requireToken('docs/ENGINE_MODULE_ADAPTER_COCKPIT_V22.md', 'Evidence Center')

const component = sources.get('components/studio/EngineModuleAdapterCockpit.tsx') ?? ''
if (/from ['"]@\/lib\/production\/engine-module-adapters['"]/.test(component)) {
  failures.push('EngineModuleAdapterCockpit must not import engine-module-adapters because it can pull heavy contracts into client bundles')
}
if (/from ['"]@\/lib\/(aaa-render-system|world|capture|networking|aaa-asset-pipeline)/.test(component)) {
  failures.push('EngineModuleAdapterCockpit must not import heavy runtime modules directly')
}

const moduleSource = sources.get('lib/studio/engine-spine-modules.ts') ?? ''
const highWorkerHeld = [...moduleSource.matchAll(/risk:\s*'high'[\s\S]{0,260}?loadStrategy:\s*'worker-or-sidecar'|loadStrategy:\s*'worker-or-sidecar'[\s\S]{0,260}?risk:\s*'high'/g)].length
if (highWorkerHeld < 2) {
  failures.push('Engine spine must keep high-risk modules behind worker-or-sidecar boundaries')
}

if (failures.length > 0) {
  console.error(`[engine-module-adapter-cockpit] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[engine-module-adapter-cockpit] PASS cockpit=visible evidence=studio+evidence heavy-runtime=held')
