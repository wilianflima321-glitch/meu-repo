#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const checks = [
  {
    id: 'settings-defaults-to-overview',
    file: 'app/settings/page.tsx',
    required: [
      "useState<Tab>('overview')",
      "queryTab === 'overview'",
      'Workspace settings',
      'SettingsCommandCenter',
      'Advanced editor',
      'grid grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-1',
      'hidden text-[11px]',
    ],
    forbidden: [
      'Configuracoes',
      'Preferencias',
      'Seguranca',
      'Faturamento',
      'Provedores IA',
      'Atualizar',
      'Nenhum provider',
      'Status operacional',
    ],
  },
  {
    id: 'settings-command-center-surface',
    file: 'app/settings/_components/SettingsCommandCenter.tsx',
    required: [
      'data-settings-command-center',
      'Workspace control',
      'Settings should show the next action.',
      'Review security',
      'Advanced controls',
      'Open advanced controls',
    ],
    forbidden: ['configuracao', 'preferencia', 'somente'],
  },
]

const failures = []

for (const check of checks) {
  const absolutePath = path.join(ROOT, check.file)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${check.id}: missing ${check.file}`)
    continue
  }

  const content = fs.readFileSync(absolutePath, 'utf8')
  const missing = check.required.filter((token) => !content.includes(token))
  const forbidden = check.forbidden.filter((token) => content.includes(token))

  if (missing.length > 0) failures.push(`${check.id}: missing ${missing.join(', ')}`)
  if (forbidden.length > 0) failures.push(`${check.id}: forbidden ${forbidden.join(', ')}`)
}

if (failures.length > 0) {
  console.error(`[settings-command-center] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log(`[settings-command-center] PASS checks=${checks.length}`)
