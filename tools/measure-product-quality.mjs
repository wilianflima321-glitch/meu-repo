#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const jsonOutput = args.has('--json');
const strict = args.has('--strict');

const ignore = [
  '**/.git/**',
  '**/.next/**',
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/reports/**',
  '**/test-results/**',
  '**/docs/archive/**',
  '**/*.map',
  '**/*.d.ts',
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

async function list(patterns) {
  const found = await glob(patterns, { ignore, nodir: true, cwd: ROOT });
  return found.sort((a, b) => a.localeCompare(b));
}

function countRegexInFiles(files, regex) {
  let total = 0;
  const top = [];

  for (const file of files) {
    const content = read(file);
    const matches = content.match(regex);
    const count = matches?.length ?? 0;
    if (count > 0) {
      total += count;
      top.push({ file, count });
    }
  }

  top.sort((a, b) => b.count - a.count);
  return { total, top: top.slice(0, 10) };
}

function lineCount(file) {
  return read(file).split(/\r?\n/).length;
}

function stripJsComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function statusFor(value, target, direction) {
  if (direction === 'lte') return value <= target ? 'PASS' : 'GAP';
  if (direction === 'gte') return value >= target ? 'PASS' : 'GAP';
  return value === target ? 'PASS' : 'GAP';
}

const appCode = await list([
  'cloud-web-app/web/app/**/*.{ts,tsx}',
  'cloud-web-app/web/components/**/*.{ts,tsx}',
  'cloud-web-app/web/hooks/**/*.{ts,tsx}',
  'cloud-web-app/web/lib/**/*.{ts,tsx}',
]);
const tsxComponents = await list(['cloud-web-app/web/components/**/*.tsx']);
const docs = await list([
  'docs/master/**/*.md',
  'AETHEL_INTERFACE_BLUEPRINTS/**/*.md',
]);
const unitTests = await list([
  'cloud-web-app/web/**/*.test.{ts,tsx,js,jsx}',
  'cloud-web-app/web/**/*.spec.{ts,tsx,js,jsx}',
]);
const e2eTests = await list([
  'tests/e2e/**/*.spec.ts',
  'cloud-web-app/web/tests/e2e/**/*.spec.ts',
]);

const consoleCalls = countRegexInFiles(appCode, /\bconsole\.(?:log|info|debug)\b/g);
const hexInTsx = countRegexInFiles(tsxComponents, /#[0-9a-fA-F]{3,8}\b/g);
const anyTypes = countRegexInFiles(appCode, /:\s*any\b/g);
const ptHardcoded = countRegexInFiles(
  tsxComponents,
  /\b(?:Carregando|Salvar|Cancelar|Publicando|Falha|Erro|Concluido|Configurar)\b/g
);
const activeAbsolutePaths = countRegexInFiles(
  docs,
  /(?:C:\\Users\\|Grosarik|Desktop\\Aethel engine)/g
);
const webTextFiles = await list([
  'cloud-web-app/web/app/**/*.{ts,tsx,md,css}',
  'cloud-web-app/web/components/**/*.{ts,tsx,md,css}',
  'cloud-web-app/web/lib/**/*.{ts,tsx,md,css}',
  'cloud-web-app/web/docs/**/*.md',
]);
const mojibakeFindings = countRegexInFiles(
  webTextFiles.filter((file) => file !== 'cloud-web-app/web/docs/MOJIBAKE_SCAN.md'),
  /(?:\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\uFFFD)/g
);

const godComponents = tsxComponents
  .map((file) => ({ file, lines: lineCount(file) }))
  .filter((entry) => entry.lines > 1000)
  .sort((a, b) => b.lines - a.lines);

const migrationsPath = path.join(ROOT, 'cloud-web-app/web/prisma/migrations');
const prismaMigrations = fs.existsSync(migrationsPath)
  ? fs.readdirSync(migrationsPath, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length
  : 0;

const nextConfig = exists('cloud-web-app/web/next.config.js')
  ? read('cloud-web-app/web/next.config.js')
  : '';
const nextConfigWithoutComments = stripJsComments(nextConfig);
const nextImageOptimized =
  /\bimages\s*:/.test(nextConfigWithoutComments) &&
  !/\bunoptimized\s*:\s*true\b/.test(nextConfigWithoutComments);

const tsconfig = exists('cloud-web-app/web/tsconfig.json')
  ? JSON.parse(read('cloud-web-app/web/tsconfig.json'))
  : {};
const noImplicitAny = tsconfig.compilerOptions?.noImplicitAny === true;

const jestConfig = exists('cloud-web-app/web/jest.config.ts')
  ? read('cloud-web-app/web/jest.config.ts')
  : '';
const jestCoverageEnabled =
  /collectCoverage\s*:/.test(jestConfig) && /coverageThreshold\s*:/.test(jestConfig);

const deployUiPresent =
  exists('cloud-web-app/web/components/deploy/DeployButton.tsx') ||
  exists('cloud-web-app/web/components/ide/modern-shell/deployTopbarAction.tsx');

const packageJson = exists('package.json') ? read('package.json') : '';
const productExperienceCohesionConfigured =
  exists('tools/check-product-experience-cohesion.mjs') &&
  exists('docs/master/96_PRODUCT_EXPERIENCE_COHESION_GATE_2026-05-03.md') &&
  packageJson.includes('qa:product-experience-cohesion');
const coreExperienceRoutesConfigured =
  exists('tools/check-core-experience-routes.mjs') &&
  exists('docs/master/97_CORE_EXPERIENCE_ROUTE_CONTRACT_2026-05-03.md') &&
  packageJson.includes('qa:core-experience-routes');
const productFunnelTelemetryConfigured =
  exists('tools/check-product-funnel-telemetry.mjs') &&
  exists('docs/master/98_PRODUCT_FUNNEL_TELEMETRY_GATE_2026-05-03.md') &&
  packageJson.includes('qa:product-funnel-telemetry');
const commercialAccessConfigured =
  exists('tools/check-commercial-access-gate.mjs') &&
  exists('docs/master/99_COMMERCIAL_ACCESS_GATE_2026-05-03.md') &&
  packageJson.includes('qa:commercial-access');
const economicsTransparencyConfigured =
  exists('tools/check-economics-transparency-gate.mjs') &&
  exists('docs/master/100_ECONOMICS_TRANSPARENCY_GATE_2026-05-03.md') &&
  packageJson.includes('qa:economics-transparency');
const aiMarginGovernanceConfigured =
  exists('tools/check-ai-margin-gate.mjs') &&
  exists('docs/master/101_AI_MARGIN_GOVERNANCE_GATE_2026-05-03.md') &&
  packageJson.includes('qa:ai-margin-governance');
const authEmailConfigured =
  exists('tools/check-auth-email-gate.mjs') &&
  exists('cloud-web-app/web/__tests__/lib/email-system.test.ts') &&
  packageJson.includes('qa:auth-email');
const userAuditLogConfigured =
  exists('tools/check-user-audit-log-gate.mjs') &&
  exists('docs/master/102_USER_TRUST_AUDIT_LOG_GATE_2026-05-03.md') &&
  exists('cloud-web-app/web/app/api/me/audit-log/route.ts') &&
  packageJson.includes('qa:user-audit-log');
const publicTrustCenterConfigured =
  exists('tools/check-public-trust-center-gate.mjs') &&
  exists('docs/master/103_PUBLIC_TRUST_CENTER_GATE_2026-05-04.md') &&
  exists('cloud-web-app/web/app/trust/page.tsx') &&
  packageJson.includes('qa:public-trust-center');

const metrics = [
  { id: 'console_calls', label: 'console.log/info/debug in app code', value: consoleCalls.total, target: 50, direction: 'lte' },
  { id: 'hex_in_tsx', label: 'hardcoded hex colors in component TSX', value: hexInTsx.total, target: 50, direction: 'lte' },
  { id: 'any_types', label: ': any in app code', value: anyTypes.total, target: 50, direction: 'lte' },
  { id: 'pt_hardcoded', label: 'PT hardcoded UX strings in components', value: ptHardcoded.total, target: 0, direction: 'lte' },
  { id: 'god_components', label: 'component files over 1000 lines', value: godComponents.length, target: 0, direction: 'lte' },
  { id: 'unit_tests', label: 'unit/spec tests in web app', value: unitTests.length, target: 40, direction: 'gte' },
  { id: 'e2e_tests', label: 'e2e specs', value: e2eTests.length, target: 15, direction: 'gte' },
  { id: 'prisma_migrations', label: 'Prisma migration folders', value: prismaMigrations, target: 1, direction: 'gte' },
  { id: 'active_doc_absolute_paths', label: 'absolute local paths in active docs', value: activeAbsolutePaths.total, target: 0, direction: 'lte' },
  { id: 'mojibake_findings', label: 'mojibake corruption findings', value: mojibakeFindings.total, target: 0, direction: 'lte' },
  { id: 'next_image_optimized', label: 'Next Image optimization enabled', value: nextImageOptimized ? 1 : 0, target: 1, direction: 'eq' },
  { id: 'no_implicit_any', label: 'TypeScript noImplicitAny enabled', value: noImplicitAny ? 1 : 0, target: 1, direction: 'eq' },
  { id: 'jest_coverage', label: 'Jest coverage ratchet configured', value: jestCoverageEnabled ? 1 : 0, target: 1, direction: 'eq' },
  { id: 'deploy_ui', label: 'Deploy UI wired to /api/deploy', value: deployUiPresent ? 1 : 0, target: 1, direction: 'eq' },
  { id: 'product_experience_cohesion', label: 'Product experience cohesion gate configured', value: productExperienceCohesionConfigured ? 1 : 0, target: 1, direction: 'eq' },
  { id: 'core_experience_routes', label: 'Core experience route contract configured', value: coreExperienceRoutesConfigured ? 1 : 0, target: 1, direction: 'eq' },
  { id: 'product_funnel_telemetry', label: 'Product funnel telemetry gate configured', value: productFunnelTelemetryConfigured ? 1 : 0, target: 1, direction: 'eq' },
  { id: 'commercial_access', label: 'Commercial access/free trial gate configured', value: commercialAccessConfigured ? 1 : 0, target: 1, direction: 'eq' },
  { id: 'economics_transparency', label: 'Chat economics transparency gate configured', value: economicsTransparencyConfigured ? 1 : 0, target: 1, direction: 'eq' },
  { id: 'ai_margin_governance', label: 'AI margin governance gate configured', value: aiMarginGovernanceConfigured ? 1 : 0, target: 1, direction: 'eq' },
  { id: 'auth_email', label: 'Auth email verification gate configured', value: authEmailConfigured ? 1 : 0, target: 1, direction: 'eq' },
  { id: 'user_audit_log', label: 'User-facing audit log gate configured', value: userAuditLogConfigured ? 1 : 0, target: 1, direction: 'eq' },
  { id: 'public_trust_center', label: 'Public trust center gate configured', value: publicTrustCenterConfigured ? 1 : 0, target: 1, direction: 'eq' },
].map((metric) => ({
  ...metric,
  status: statusFor(metric.value, metric.target, metric.direction),
}));

const result = {
  generatedAt: new Date().toISOString(),
  root: path.relative(process.cwd(), ROOT) || '.',
  metrics,
  top: {
    consoleCalls: consoleCalls.top,
    hexInTsx: hexInTsx.top,
    anyTypes: anyTypes.top,
    mojibakeFindings: mojibakeFindings.top,
    godComponents: godComponents.slice(0, 10),
    activeAbsolutePaths: activeAbsolutePaths.top,
  },
};

if (jsonOutput) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  console.log('=== AETHEL PRODUCT QUALITY PROGRESS ===');
  console.log(`Generated: ${result.generatedAt}`);
  console.log('');
  console.log('Metric | Current | Target | Status');
  console.log('--- | ---: | ---: | ---');

  for (const metric of metrics) {
    console.log(`${metric.label} | ${metric.value} | ${metric.target} | ${metric.status}`);
  }

  console.log('');
  console.log('Top component files over 1000 lines:');
  for (const entry of godComponents.slice(0, 10)) {
    console.log(`- ${entry.lines} ${entry.file}`);
  }
}

if (strict && metrics.some((metric) => metric.status !== 'PASS')) {
  process.exit(1);
}
