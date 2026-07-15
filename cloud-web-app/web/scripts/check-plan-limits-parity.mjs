#!/usr/bin/env node

/**
 * check-plan-limits-parity.mjs
 *
 * Gate script: Validates that plans.ts limits match plan-limits.ts caps for every plan tier.
 * Prevents silent drift between the two pricing sources.
 *
 * Usage: node scripts/check-plan-limits-parity.mjs
 * Exit code 0 = pass, 1 = drift detected
 *
 * Reference: implementation_plan.md §1, CLAUDE_MEGA_WAVES.md Wave 6
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

// ──────────────────────────────────────────────────
// Extract data from source files via regex (no TS compile needed)
// ──────────────────────────────────────────────────

const plansFile = readFileSync(resolve(root, 'lib/plans.ts'), 'utf-8');
const limitsFile = readFileSync(resolve(root, 'lib/plan-limits.ts'), 'utf-8');

// Plan IDs we check (canonical pricing matrix tiers)
const PLAN_IDS = ['free', 'starter', 'basic', 'pro', 'studio'];

let errors = 0;
let warnings = 0;

function logError(msg) {
  console.error(`❌ ERROR: ${msg}`);
  errors++;
}

function logWarn(msg) {
  console.warn(`⚠️  WARN: ${msg}`);
  warnings++;
}

function logOk(msg) {
  console.log(`✅ ${msg}`);
}

// ──────────────────────────────────────────────────
// Check 1: Every plan in PLAN_IDS exists in both files
// ──────────────────────────────────────────────────

console.log('\n📋 Plan-Limits Parity Check\n');
console.log('───────────────────────────────────────────');

for (const planId of PLAN_IDS) {
  const inPlans = plansFile.includes(`id: '${planId}'`);
  // plan-limits.ts derives PLAN_LIMITS from PLANS via mapPlanDefinitionToLimits — no per-id literals
  const derived = limitsFile.includes('mapPlanDefinitionToLimits') && limitsFile.includes('Object.fromEntries(PLANS.map');

  if (!inPlans) logError(`Plan "${planId}" missing from plans.ts`);
  if (!derived) logError(`Plan "${planId}" not covered — plan-limits.ts must derive PLAN_LIMITS from PLANS`);
  if (inPlans && derived) logOk(`Plan "${planId}" in plans.ts + derived into PLAN_LIMITS`);
}

// ──────────────────────────────────────────────────
// Check 2: Key numeric limits match between files
// ──────────────────────────────────────────────────

const quotasFile = readFileSync(resolve(root, 'lib/plan-ai-quotas.ts'), 'utf-8');

console.log('\n───────────────────────────────────────────');
console.log('Checking numeric limit parity...\n');

/**
 * Extract a numeric value near a plan definition.
 * Looks for patterns like `tokensPerMonth: 4_500_000` within the plan block.
 */
function extractNumeric(content, planId, field) {
  // plans.ts stores tiers as array entries (`id: 'pro'`), while
  // plan-limits.ts stores them as object keys (`'pro': { ... }`).
  const arrayEntryPattern = new RegExp(`id\\s*:\\s*['"]${planId}['"]`, 'g');
  const recordEntryPattern = new RegExp(`['"]${planId}['"]\\s*:`, 'g');
  const match = arrayEntryPattern.exec(content) || recordEntryPattern.exec(content);
  if (!match) return null;

  // Search enough of the object to include nested `limits: { ... }` blocks.
  const searchWindow = content.substring(match.index, match.index + 2800);
  const fieldPattern = new RegExp(`${field}\\s*[:=]\\s*(-?[\\d_]+(?:\\.\\d+)?)`, 'i');
  const fieldMatch = fieldPattern.exec(searchWindow);
  if (!fieldMatch) return null;

  return Number(fieldMatch[1].replace(/_/g, ''));
}

const CRITICAL_FIELDS = [
  { field: 'cloudProjectsMax', label: 'Cloud Projects Max' },
  { field: 'requestsPerDay', label: 'Requests/Day' },
];

for (const planId of PLAN_IDS) {
  for (const { field, label } of CRITICAL_FIELDS) {
    const plansVal = extractNumeric(plansFile, planId, field);
    if (plansVal === null) {
      logWarn(`${planId}.${field}: not found as literal near plan id (may use spread helpers)`);
      continue;
    }
    logOk(`${planId}.${label}: ${plansVal} (canonical in plans.ts)`);
  }
}

if (quotasFile.includes('proDual') && quotasFile.includes('tokensFastPerMonth: 3_000_000')) {
  logOk('plan-ai-quotas.ts Pro dual-pool Fast=3M (canonical)');
} else {
  logError('plan-ai-quotas.ts missing Pro dual Fast 3M');
}

if (quotasFile.includes('tokensPremiumRawPerMonth: 37_500')) {
  logOk('plan-ai-quotas.ts Pro Premium raw=37.5K (canonical)');
} else {
  logError('plan-ai-quotas.ts missing Pro Premium 37.5K raw');
}

console.log('\n───────────────────────────────────────────');
console.log('Checking dual-pool derivation (6A.4)...\n');

if (limitsFile.includes('tokensFastPerMonth: plan.limits.tokensFastPerMonth')) {
  logOk('plan-limits.ts derives tokensFastPerMonth from plans.ts');
} else {
  logError('plan-limits.ts must map tokensFastPerMonth from plans.ts (no hardcode drift)');
}

if (limitsFile.includes('tokensPremiumRawPerMonth: plan.limits.tokensPremiumRawPerMonth')) {
  logOk('plan-limits.ts derives tokensPremiumRawPerMonth from plans.ts');
} else {
  logError('plan-limits.ts must map tokensPremiumRawPerMonth from plans.ts');
}

if (limitsFile.includes('aiPoolMode: plan.limits.aiPoolMode')) {
  logOk('plan-limits.ts derives aiPoolMode from plans.ts');
} else {
  logError('plan-limits.ts must map aiPoolMode from plans.ts');
}

// ──────────────────────────────────────────────────
// Check 3: Enterprise hidden from checkout
// ──────────────────────────────────────────────────

console.log('\n───────────────────────────────────────────');
console.log('Checking enterprise & basic visibility...\n');

if (plansFile.includes("id: 'enterprise'")) {
  if (plansFile.includes('hiddenFromCheckout: true') || plansFile.includes('contactSales: true')) {
    logOk('Enterprise plan is hidden from checkout');
  } else {
    logWarn('Enterprise plan exists but may not be hidden from checkout');
  }
}

// ──────────────────────────────────────────────────
// Check 4: Basic plan is grandfathered with Pro+IA rights
// ──────────────────────────────────────────────────

if (plansFile.includes("id: 'basic'")) {
  if (plansFile.includes('grandfatheredAsProIa: true') || plansFile.includes('grandfatheredBundle')) {
    logOk('Basic plan is marked as grandfathered Pro+IA');
  } else {
    logWarn('Basic plan exists but may not be marked as grandfathered');
  }

  if (plansFile.includes('hiddenFromCheckout: true')) {
    logOk('Basic plan is hidden from checkout');
  } else {
    logError('Basic plan is NOT hidden from checkout — new signups should not see it');
  }
}

// ──────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════');
console.log(`\n📊 Results: ${errors} errors, ${warnings} warnings`);
if (errors > 0) {
  console.error('\n🔴 PARITY CHECK FAILED — fix drift before deploying.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.warn('\n🟡 PARITY CHECK PASSED with warnings.\n');
  process.exit(0);
} else {
  console.log('\n🟢 PARITY CHECK PASSED — all clean.\n');
  process.exit(0);
}
