import { existsSync, readFileSync } from 'node:fs';

const checks = [];

function read(path) {
  return readFileSync(path, 'utf8');
}

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message });
}

const emailSystemPath = 'cloud-web-app/web/lib/email-system.ts';
const registerRoutePath = 'cloud-web-app/web/app/api/auth/register/route.ts';
const forgotRoutePath = 'cloud-web-app/web/app/api/auth/forgot-password/route.ts';
const verifyRoutePath = 'cloud-web-app/web/app/api/auth/verify-email/route.ts';
const emailRoutePath = 'cloud-web-app/web/app/api/email/route.ts';
const testPath = 'cloud-web-app/web/__tests__/lib/email-system.test.ts';
const productDocsPath = 'docs/master/90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md';

for (const path of [emailSystemPath, registerRoutePath, forgotRoutePath, verifyRoutePath, emailRoutePath, testPath]) {
  assert(existsSync(path), `${path} exists`);
}

const emailSystem = existsSync(emailSystemPath) ? read(emailSystemPath) : '';
const registerRoute = existsSync(registerRoutePath) ? read(registerRoutePath) : '';
const forgotRoute = existsSync(forgotRoutePath) ? read(forgotRoutePath) : '';
const verifyRoute = existsSync(verifyRoutePath) ? read(verifyRoutePath) : '';
const emailRoute = existsSync(emailRoutePath) ? read(emailRoutePath) : '';
const test = existsSync(testPath) ? read(testPath) : '';
const docs = existsSync(productDocsPath) ? read(productDocsPath) : '';

assert(emailSystem.includes('RESEND_API_KEY') && emailSystem.includes("resendKey ? 'resend' : 'mock'"), 'email system auto-selects Resend when configured');
assert(emailSystem.includes('configured without an API key'), 'email system fails explicitly when real provider lacks API key');
assert(emailSystem.includes("log.error('[Email] Send failed'"), 'email system uses structured logger for send failures');
assert(!/console\.(log|warn|error|info|debug)\(/.test(emailSystem), 'email system has no direct console usage');

assert(registerRoute.includes('verificationToken: verification.hash'), 'register stores hashed verification token');
assert(registerRoute.includes('verificationTokenExpiry'), 'register stores verification token expiry');
assert(registerRoute.includes("sendTemplate(\n      'welcome'") && registerRoute.includes("sendTemplate(\n      'verify_email'"), 'register sends welcome and verify email templates');
assert(registerRoute.includes('emailVerificationRequired: true'), 'register response marks email verification required');
assert(registerRoute.includes('createComponentLogger'), 'register uses structured logger');
assert(!/console\.(log|warn|error|info|debug)\(/.test(registerRoute), 'register route has no direct console usage');

for (const [label, source] of [
  ['forgot password route', forgotRoute],
  ['verify email route', verifyRoute],
  ['email API route', emailRoute],
]) {
  assert(source.includes('createComponentLogger'), `${label} uses structured logger`);
  assert(!/console\.(log|warn|error|info|debug)\(/.test(source), `${label} has no direct console usage`);
}

assert(test.includes('auto-selects Resend'), 'email tests cover Resend auto-selection');
assert(test.includes('configured without a key'), 'email tests cover missing key failure');
assert(docs.includes('Email/auth transactional readiness'), 'product triage docs mention auth email readiness');

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  console.error('Auth email gate failed:');
  for (const check of failed) console.error(`- ${check.message}`);
  process.exit(1);
}

console.log(`Auth email gate passed (${checks.length} checks).`);
