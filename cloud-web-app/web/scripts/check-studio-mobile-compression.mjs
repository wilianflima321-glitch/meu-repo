#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const shellPath = path.join(ROOT, 'app', 'studio', 'CreativeStudioShell.tsx')
const studioPagePath = path.join(ROOT, 'app', 'studio', 'page.tsx')
const failures = []

if (!fs.existsSync(shellPath)) {
  failures.push('missing app/studio/CreativeStudioShell.tsx')
} else {
  const shell = fs.readFileSync(shellPath, 'utf8')
  const required = [
    'data-studio-mobile-editor-switcher',
    'hidden min-h-12 items-center gap-2 overflow-x-auto',
    'aria-label="Creative studio modes"',
    'hidden min-h-[72px] flex-col gap-2',
    'Advanced editors ({secondaryCreativeRoutes.length})',
    'Preview ready',
    'Local optimizer optional',
    'Cloud review gated',
  ]

  for (const token of required) {
    if (!shell.includes(token)) failures.push(`CreativeStudioShell.tsx missing ${token}`)
  }

  const mobileSwitcherCount = (shell.match(/data-studio-mobile-editor-switcher/g) ?? []).length
  if (mobileSwitcherCount !== 1) {
    failures.push(`expected exactly one mobile switcher, found ${mobileSwitcherCount}`)
  }

  if (shell.includes('aria-label="Studio primary surfaces"')) {
    failures.push('CreativeStudioShell.tsx still renders duplicate Studio primary navigation')
  }

  for (const jargon of ['Cloud held by capability', 'Heavy runtime gated', 'Local when available']) {
    if (shell.includes(jargon)) failures.push(`CreativeStudioShell.tsx still exposes runtime jargon: ${jargon}`)
  }
}

if (!fs.existsSync(studioPagePath)) {
  failures.push('missing app/studio/page.tsx')
} else {
  const page = fs.readFileSync(studioPagePath, 'utf8')
  for (const token of ['Preview ready', 'Local optimizer optional', 'Cloud review gated']) {
    if (!page.includes(token)) failures.push(`app/studio/page.tsx missing user-facing runtime label: ${token}`)
  }
  for (const jargon of ['Browser: preview', 'Studio Local: held', 'Cloud Stream: held', 'capability is real']) {
    if (page.includes(jargon)) failures.push(`app/studio/page.tsx still exposes old runtime jargon: ${jargon}`)
  }
}

if (failures.length > 0) {
  console.error(`[studio-mobile-compression] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log('[studio-mobile-compression] PASS mobile nav is compact and editor switching is disclosure-first')
