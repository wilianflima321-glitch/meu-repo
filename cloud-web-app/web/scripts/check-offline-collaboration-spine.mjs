#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const webRoot = process.cwd()
const read = (rel) => fs.readFileSync(path.join(webRoot, rel), 'utf8')
const failures = []

const yjsFile = 'lib/yjs-collaboration.ts'
const workbenchHookFile = 'components/ide/fullscreen/useWorkbenchRealtimeCollaboration.ts'
const yjsText = read(yjsFile)
const hookText = read(workbenchHookFile)

const requirePattern = (text, pattern, message) => {
  if (!pattern.test(text)) failures.push(message)
}

requirePattern(
  yjsText,
  /import\s+type\s+\{\s*IndexeddbPersistence\s*\}\s+from\s+'y-indexeddb'/,
  'Canonical Yjs collaboration must type-import IndexeddbPersistence.',
)
requirePattern(
  yjsText,
  /import\('y-indexeddb'\)/,
  'Canonical Yjs collaboration must dynamically load y-indexeddb for browser-safe offline persistence.',
)
requirePattern(
  yjsText,
  /persistenceEnabled\?:\s*boolean/,
  'CollaborationConfig must expose persistenceEnabled.',
)
requirePattern(
  yjsText,
  /persistenceName\?:\s*string/,
  'CollaborationConfig must expose persistenceName.',
)
requirePattern(
  yjsText,
  /whenSynced\.then/,
  'Offline persistence must observe IndexedDB initial sync.',
)
requirePattern(
  yjsText,
  /isOfflinePersistenceSynced\(\):\s*boolean/,
  'CollaborationSession must expose offline persistence sync status.',
)
requirePattern(
  yjsText,
  /clearOfflineData\(\):\s*Promise<void>/,
  'CollaborationSession must expose support/debug offline cache clearing.',
)
requirePattern(
  yjsText,
  /this\.persistence\?\.destroy\(\)/,
  'CollaborationSession destroy must clean up IndexedDB persistence.',
)
requirePattern(
  yjsText,
  /clearConnectionTimeout\(\):\s*void/,
  'CollaborationSession must centralize connection timeout cleanup.',
)
requirePattern(
  yjsText,
  /clearTimeout\(this\.connectionTimeout\)/,
  'CollaborationSession must clear connection timeout handles.',
)
requirePattern(
  hookText,
  /persistenceEnabled:\s*collaborationEnabled/,
  'Workbench collaboration must only persist real project sessions.',
)
requirePattern(
  hookText,
  /persistenceName:\s*collaborationEnabled\s*\?\s*`workbench:\$\{projectId\}`/,
  'Workbench collaboration must use a stable project-scoped persistence key.',
)
requirePattern(
  hookText,
  /isPersistenceSynced/,
  'Workbench collaboration status must surface offline cache readiness.',
)

const report = [
  '# Offline Collaboration Spine Audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `- Canonical module: ${yjsFile}`,
  `- Workbench hook: ${workbenchHookFile}`,
  `- Failures: ${failures.length}`,
  ...failures.map((failure) => `- ${failure}`),
  '',
].join('\n')

fs.writeFileSync(path.join(webRoot, 'docs/OFFLINE_COLLABORATION_SPINE_AUDIT.md'), report)

if (failures.length) {
  console.error(report)
  process.exit(1)
}

console.log('Offline collaboration spine gate passed')
