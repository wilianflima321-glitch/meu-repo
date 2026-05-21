#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT_DIR, '..')
const routeExperienceScript = path.join(SCRIPT_DIR, 'check-route-experience-spine.mjs')

const result = spawnSync(process.execPath, [routeExperienceScript], {
  cwd: ROOT,
  stdio: 'inherit',
})

if (result.error) {
  console.error(`[routes-inventory] failed to run route experience spine: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
