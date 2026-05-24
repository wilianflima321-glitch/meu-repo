#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const shellPath = path.join(ROOT, 'app', 'studio', 'CreativeStudioShell.tsx')
const failures = []

if (!fs.existsSync(shellPath)) {
  failures.push('missing app/studio/CreativeStudioShell.tsx')
} else {
  const shell = fs.readFileSync(shellPath, 'utf8')
  const required = [
    'data-studio-mobile-editor-switcher',
    'aria-label="Studio primary surfaces"',
    'hidden min-h-12 items-center gap-2 overflow-x-auto',
    'aria-label="Creative studio modes"',
    'hidden min-h-[72px] flex-col gap-2',
    'Advanced editors ({secondaryCreativeRoutes.length})',
  ]

  for (const token of required) {
    if (!shell.includes(token)) failures.push(`CreativeStudioShell.tsx missing ${token}`)
  }

  const mobileSwitcherCount = (shell.match(/data-studio-mobile-editor-switcher/g) ?? []).length
  if (mobileSwitcherCount !== 1) {
    failures.push(`expected exactly one mobile switcher, found ${mobileSwitcherCount}`)
  }
}

if (failures.length > 0) {
  console.error(`[studio-mobile-compression] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log('[studio-mobile-compression] PASS mobile nav is compact and editor switching is disclosure-first')
