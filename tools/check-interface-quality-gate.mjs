#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const failures = [];
const checks = [];

function read(file) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${file}: missing`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function expectIncludes(file, needles) {
  const content = read(file);
  for (const needle of needles) {
    checks.push(`${file} includes ${needle}`);
    if (!content.includes(needle)) {
      failures.push(`${file}: expected to include ${needle}`);
    }
  }
  return content;
}

function expectNoMatch(file, regex, label) {
  const content = read(file);
  checks.push(`${file} excludes ${label}`);
  const match = content.match(regex);
  if (match) {
    failures.push(`${file}: unexpected ${label} (${match[0]})`);
  }
}

expectIncludes('cloud-web-app/web/components/ui/Button.tsx', [
  'min-h-[40px]',
  'motion-safe:transition-all',
  'Working...',
]);

expectIncludes('cloud-web-app/web/components/ui/PremiumEmptyState.tsx', [
  'Start your first project',
  'focus-visible:ring-2',
  'text-balance',
  'min-h-11',
]);

expectIncludes('cloud-web-app/web/components/ui/PublicHeader.tsx', [
  'Primary navigation',
  'Talk to sales',
  'Start free',
  'Open menu',
  'min-h-10',
]);

expectIncludes('cloud-web-app/web/components/dashboard/DashboardHeader.tsx', [
  'Operations, AI, preview',
  'Open IDE',
  'Reset view',
  'Working...',
]);

expectIncludes('cloud-web-app/web/components/dashboard/DashboardMainContent.tsx', [
  'aria-labelledby',
  'Preparing Studio overview',
  'Processing {subscribingPlan} plan',
]);

expectIncludes('cloud-web-app/web/app/studio/CreativeStudioShell.tsx', [
  'overflow-x-auto',
  'aria-current',
  'Creative studio modes',
  'whitespace-nowrap',
]);

expectIncludes('cloud-web-app/web/app/studio/page.tsx', [
  'Open editor',
  'focus-visible:ring-2',
  'flex h-full flex-col',
]);

expectIncludes('docs/master/109_INTERFACE_QUALITY_TRIAGE_2026-05-11.md', [
  'Marketing',
  'Studio Home',
  'IDE/Workbench',
  'Creative Studio',
  'Trust/Billing',
  'Mobile',
  'Admin',
  'Spacing',
  'Density',
  'Accessibility',
  'Progressive disclosure',
]);

const highSignalFiles = [
  'cloud-web-app/web/components/ui/PublicHeader.tsx',
  'cloud-web-app/web/components/ui/PremiumEmptyState.tsx',
  'cloud-web-app/web/components/dashboard/DashboardHeader.tsx',
  'cloud-web-app/web/components/dashboard/DashboardMainContent.tsx',
  'cloud-web-app/web/app/studio/CreativeStudioShell.tsx',
  'cloud-web-app/web/app/studio/page.tsx',
];

const bannedPt = /\b(?:Aguarde|Abrir IDE|Redefinir painel|Processando plano|Navegacao principal|Falar com vendas|Entrar|Comecar gratis|Abrir menu|Operacao, IA|governanca|superficie|Nenhum projeto|Criar primeiro projeto)\b/i;
for (const file of highSignalFiles) {
  expectNoMatch(file, bannedPt, 'primary-surface mixed PT/EN copy');
}

if (failures.length > 0) {
  console.error('Interface quality gate failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Interface quality gate passed (${checks.length} checks).`);
