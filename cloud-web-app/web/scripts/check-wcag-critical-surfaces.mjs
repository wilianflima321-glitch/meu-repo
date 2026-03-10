#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const WEB_ROOT = process.cwd()

function read(relativePath) {
  const absolutePath = path.join(WEB_ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing file: ${relativePath}`)
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

const CHECKS = [
  {
    name: 'landing-skip-link',
    file: 'app/landing-v2.tsx',
    patterns: ['href="#landing-mission"', '<main id="landing-mission"'],
  },
  {
    name: 'dashboard-hydration-loading',
    file: 'app/dashboard/page.tsx',
    patterns: ['Carregando Studio Home...', 'role="status"', 'aria-live="polite"'],
  },
  {
    name: 'dashboard-main-skip-link',
    file: 'components/AethelDashboardRuntime.tsx',
    patterns: ['href="#dashboard-main-content"', '<main id="dashboard-main-content"', 'aria-live="polite"'],
  },
  {
    name: 'dashboard-menu-controls',
    file: 'components/dashboard/DashboardHeader.tsx',
    patterns: ['aria-expanded={sidebarOpen}', 'aria-controls="dashboard-sidebar"'],
  },
  {
    name: 'dashboard-sidebar-mobile-close',
    file: 'components/dashboard/AethelDashboardSidebar.tsx',
    patterns: ['id="dashboard-sidebar"', 'aria-label="Fechar navegacao"'],
  },
  {
    name: 'login-accessibility-baseline',
    file: 'app/(auth)/login/login-v2.tsx',
    patterns: ['href="#login-form"', '<main className=', 'aria-describedby={formError ? \'login-form-error\' : undefined}'],
  },
  {
    name: 'register-accessibility-baseline',
    file: 'app/(auth)/register/register-v2.tsx',
    patterns: ['href="#register-form"', '<main className=', 'aria-describedby={formError ? \'register-form-error\' : undefined}'],
  },
  {
    name: 'settings-provider-recovery',
    file: 'app/settings/page.tsx',
    patterns: ['/api/ai/provider-status', "providerStatus?.setupUrl || '/settings?tab=api'"],
  },
]

const failures = []

for (const check of CHECKS) {
  const content = read(check.file)
  for (const pattern of check.patterns) {
    if (!content.includes(pattern)) {
      failures.push(`[${check.name}] pattern not found in ${check.file}: ${pattern}`)
    }
  }
}

if (failures.length > 0) {
  console.error('[wcag-critical] FAIL')
  for (const failure of failures) {
    console.error(` - ${failure}`)
  }
  process.exit(1)
}

console.log(`[wcag-critical] PASS checks=${CHECKS.length}`)
