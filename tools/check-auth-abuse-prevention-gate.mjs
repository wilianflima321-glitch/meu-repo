import { existsSync, readdirSync, readFileSync } from 'node:fs';

const checks = [];

function read(path) {
  return readFileSync(path, 'utf8');
}

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message });
}

function listFiles(dir, predicate) {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...listFiles(path, predicate));
      continue;
    }

    if (entry.isFile() && predicate(path)) {
      files.push(path);
    }
  }

  return files;
}

const guardPath = 'cloud-web-app/web/lib/server/turnstile-guard.ts';
const guardTestPath = 'cloud-web-app/web/__tests__/server/turnstile-guard.test.ts';
const loginRoutePath = 'cloud-web-app/web/app/api/auth/login/route.ts';
const registerRoutePath = 'cloud-web-app/web/app/api/auth/register/route.ts';
const triageDocPath = 'docs/master/90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md';
const checklistDocPath = 'docs/master/91_PRODUCT_QUALITY_EXECUTION_CHECKLIST_2026-04-30.md';
const authRoutesDir = 'cloud-web-app/web/app/api/auth';
const authRoutePaths = listFiles(authRoutesDir, (path) => path.endsWith('/route.ts'));

for (const path of [
  guardPath,
  guardTestPath,
  loginRoutePath,
  registerRoutePath,
  triageDocPath,
  checklistDocPath,
]) {
  assert(existsSync(path), `${path} exists`);
}

const guard = existsSync(guardPath) ? read(guardPath) : '';
const guardTest = existsSync(guardTestPath) ? read(guardTestPath) : '';
const loginRoute = existsSync(loginRoutePath) ? read(loginRoutePath) : '';
const registerRoute = existsSync(registerRoutePath) ? read(registerRoutePath) : '';
const triageDoc = existsSync(triageDocPath) ? read(triageDocPath) : '';
const checklistDoc = existsSync(checklistDocPath) ? read(checklistDocPath) : '';

assert(authRoutePaths.length >= 20, 'auth route inventory is broad enough for regression scanning');

for (const phrase of [
  'TURNSTILE_RESPONSE_KEYS',
  'CLOUDFLARE_TURNSTILE_SECRET_KEY',
  'TURNSTILE_REQUIRED',
  'TURNSTILE_FAILED',
  'TURNSTILE_NOT_CONFIGURED',
  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  'remoteip',
]) {
  assert(guard.includes(phrase), `turnstile guard includes "${phrase}"`);
}

for (const [label, source] of [
  ['login route', loginRoute],
  ['register route', registerRoute],
]) {
  assert(source.includes('enforceTurnstile'), `${label} enforces Turnstile before auth work`);
  assert(!/console\.(log|warn|error|info|debug)\(/.test(source), `${label} has no direct console usage`);
}

for (const path of authRoutePaths) {
  const route = read(path);
  assert(!/console\.(log|warn|error|info|debug)\(/.test(route), `${path} has no direct console usage`);
}

assert(!loginRoute.includes('(user as any).role'), 'login route removed unsafe role any-cast');
assert(!read('cloud-web-app/web/app/api/auth/profile/route.ts').includes('as any'), 'profile route has no unsafe any-casts');
assert(guardTest.includes('turnstileToken'), 'turnstile tests cover request body token alias');
assert(guardTest.includes('not_configured'), 'turnstile tests cover local dev bypass when not configured');
assert(guardTest.includes('TURNSTILE_REQUIRED'), 'turnstile tests cover missing token denial');
assert(guardTest.includes('timeout-or-duplicate'), 'turnstile tests cover provider failure codes');
assert(triageDoc.includes('Auth abuse prevention gate'), 'product triage docs mention auth abuse prevention gate');
assert(checklistDoc.includes('qa:auth-abuse-prevention'), 'execution checklist includes auth abuse prevention gate');

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  console.error('Auth abuse prevention gate failed:');
  for (const check of failed) console.error(`- ${check.message}`);
  process.exit(1);
}

console.log(`Auth abuse prevention gate passed (${checks.length} checks).`);
