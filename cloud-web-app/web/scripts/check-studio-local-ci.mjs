#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(process.cwd(), '../..')
const workflowPath = path.join(repoRoot, '.github/workflows/studio-local-ci.yml')
const failures = []

if (!fs.existsSync(workflowPath)) {
  failures.push('.github/workflows/studio-local-ci.yml missing')
} else {
  const workflow = fs.readFileSync(workflowPath, 'utf8')
  for (const pattern of [
    /ubuntu-latest/,
    /macos-latest/,
    /windows-latest/,
    /npm --prefix apps\/studio-local run test/,
    /studio-local-v\*/,
    /npm --prefix apps\/studio-local run build/,
    /actions\/upload-artifact@v4/,
  ]) {
    if (!pattern.test(workflow)) failures.push(`studio-local-ci.yml missing ${pattern}`)
  }
}

const tauriConfig = fs.readFileSync(path.join(repoRoot, 'apps/studio-local/src-tauri/tauri.conf.json'), 'utf8')
if (!/"productName":\s*"Aethel Studio Local"/.test(tauriConfig)) {
  failures.push('tauri.conf.json must keep productName for signed releases')
}

if (failures.length) {
  console.error('[studio-local-ci] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[studio-local-ci] PASS os=3 test=true tagged-build=true')
