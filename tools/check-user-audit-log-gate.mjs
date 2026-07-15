import { existsSync, readFileSync } from 'node:fs';

const checks = [];

function read(path) {
  return readFileSync(path, 'utf8');
}

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message });
}

const routePath = 'cloud-web-app/web/app/api/me/audit-log/route.ts';
const panelPath = 'cloud-web-app/web/components/settings/UserAuditLogPanel.tsx';
const settingsPath = 'cloud-web-app/web/app/settings/page.tsx';
const testPath = 'cloud-web-app/web/__tests__/api/me-audit-log-route.test.ts';
const docPath = 'docs/master/102_USER_TRUST_AUDIT_LOG_GATE_2026-05-03.md';
const rootPackagePath = 'package.json';
const measurePath = 'tools/measure-product-quality.mjs';

for (const path of [routePath, panelPath, settingsPath, testPath, docPath]) {
  assert(existsSync(path), `${path} exists`);
}

const route = existsSync(routePath) ? read(routePath) : '';
const panel = existsSync(panelPath) ? read(panelPath) : '';
const settings = existsSync(settingsPath) ? read(settingsPath) : '';
const test = existsSync(testPath) ? read(testPath) : '';
const doc = existsSync(docPath) ? read(docPath) : '';
const rootPackage = existsSync(rootPackagePath) ? read(rootPackagePath) : '';
const measure = existsSync(measurePath) ? read(measurePath) : '';

assert(route.includes('requireAuth(request)'), 'audit route requires authentication');
assert(route.includes('Prisma.AuditLogWhereInput'), 'audit route uses typed Prisma where input');
assert(route.includes('{ targetEmail: auth.email }'), 'audit route scopes target email to authenticated user');
assert(route.includes('sanitizeMetadata'), 'audit route sanitizes metadata');
assert(route.includes('SAFE_METADATA_KEYS'), 'audit route has metadata allowlist');
assert(route.includes('maskIpAddress'), 'audit route masks IP addresses');
assert(route.includes("adminIdentity: 'redacted'"), 'audit route redacts admin identity');
assert(route.includes('createComponentLogger'), 'audit route uses structured logger');
assert(!/console\.(log|warn|error|info|debug)\(/.test(route), 'audit route has no console usage');
assert(!route.includes('as any'), 'audit route has no as-any casts');

assert(panel.includes('Atividade auditavel da conta'), 'settings panel surfaces account audit activity');
assert(panel.includes('/api/me/audit-log?limit=12'), 'settings panel fetches user audit log endpoint');
assert(panel.includes('metadataPreview'), 'settings panel summarizes metadata without dumping raw payloads');
assert(panel.includes('IP mascarado') || panel.includes('IP {data.privacy.ipAddress}'), 'settings panel communicates IP masking');
assert(!/#[0-9a-fA-F]{3,8}/.test(panel), 'settings panel has no hardcoded hex colors');
assert(!/console\.(log|warn|error|info|debug)\(/.test(panel), 'settings panel has no console usage');

assert(settings.includes('UserAuditLogPanel') && settings.includes('<UserAuditLogPanel />'), 'settings security tab renders user audit panel');
assert(test.includes('must-not-leak'), 'test verifies sensitive metadata does not leak');
assert(test.includes('returns 401'), 'test covers unauthenticated access');
assert(test.includes('ipAddress: \'masked\''), 'test covers privacy contract');
assert(doc.includes('/api/me/audit-log') && doc.includes('redact admin identity'), 'doc captures user audit contract');
assert(rootPackage.includes('qa:user-audit-log'), 'root package exposes qa:user-audit-log');
assert(rootPackage.includes('check-user-audit-log-gate.mjs'), 'product quality progress runs user audit log gate');
assert(measure.includes('userAuditLogConfigured'), 'product quality measure tracks user audit log gate');

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  console.error('User audit log gate failed:');
  for (const check of failed) console.error(`- ${check.message}`);
  process.exit(1);
}

console.log(`User audit log gate passed (${checks.length} checks).`);
