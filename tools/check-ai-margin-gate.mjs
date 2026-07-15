import { readFileSync, existsSync } from 'node:fs';

const checks = [];

function read(path) {
  return readFileSync(path, 'utf8');
}

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message });
}

const routePath = 'cloud-web-app/web/app/api/admin/finance/metrics/route.ts';
const pagePath = 'cloud-web-app/web/app/admin/finance/page.tsx';
const panelPath = 'cloud-web-app/web/components/admin/AIMarginSnapshotPanel.tsx';
const drilldownPanelPath = 'cloud-web-app/web/components/admin/AIMarginDrilldownPanel.tsx';
const recommendationsPanelPath = 'cloud-web-app/web/components/admin/AIMarginRecommendationsPanel.tsx';
const testPath = 'cloud-web-app/web/__tests__/api/admin-finance-metrics-route.test.ts';
const rootPackagePath = 'package.json';
const measurePath = 'tools/measure-product-quality.mjs';
const docPath = 'docs/master/101_AI_MARGIN_GOVERNANCE_GATE_2026-05-03.md';

assert(existsSync(routePath), 'admin finance metrics route exists');
assert(existsSync(pagePath), 'admin finance page exists');
assert(existsSync(panelPath), 'AI margin snapshot panel exists');
assert(existsSync(drilldownPanelPath), 'AI margin drilldown panel exists');
assert(existsSync(recommendationsPanelPath), 'AI margin recommendations panel exists');
assert(existsSync(testPath), 'AI margin route test exists');
assert(existsSync(docPath), 'AI margin governance doc exists');

const route = existsSync(routePath) ? read(routePath) : '';
const page = existsSync(pagePath) ? read(pagePath) : '';
const panel = existsSync(panelPath) ? read(panelPath) : '';
const drilldownPanel = existsSync(drilldownPanelPath) ? read(drilldownPanelPath) : '';
const recommendationsPanel = existsSync(recommendationsPanelPath) ? read(recommendationsPanelPath) : '';
const test = existsSync(testPath) ? read(testPath) : '';
const rootPackage = existsSync(rootPackagePath) ? read(rootPackagePath) : '';
const measure = existsSync(measurePath) ? read(measurePath) : '';

assert(route.includes('aiMarginSnapshot'), 'route returns aiMarginSnapshot');
assert(route.includes('aiMarginDrilldown'), 'route returns aiMarginDrilldown');
assert(route.includes('aiMarginRecommendations'), 'route returns aiMarginRecommendations');
assert(route.includes('periodRevenue') && route.includes('periodAiCost'), 'route exposes period revenue and AI cost');
assert(route.includes('grossMarginAfterAiPercent'), 'route computes gross margin after AI percent');
assert(route.includes('aiCostRatio'), 'route computes AI cost ratio');
assert(route.includes('projectedMonthlyAiCost'), 'route computes projected monthly AI cost');
assert(route.includes("entryType: { in: ['ai_chat', 'ai_generation', 'usage'] }"), 'route includes ai_chat usage ledger entries');
assert(route.includes('revenueByUserGroups') && route.includes('topUsers'), 'route computes per-user AI margin drilldown');
assert(route.includes('topWorkspaces') && route.includes('projectId'), 'route computes per-workspace AI margin drilldown');
assert(route.includes('buildAiMarginRecommendations'), 'route computes margin recommendations');
assert(route.includes('model-routing policy'), 'route recommends model routing when model cost is concentrated');
assert(route.includes('workspace budget guardrail'), 'route recommends workspace budget guardrails');
assert(route.includes('inputPerMillion') && route.includes('/ 1_000_000'), 'route prices tokens with per-million model pricing');
assert(route.includes('createComponentLogger'), 'route uses structured logger');
assert(!/console\.(log|warn|error|info|debug)\(/.test(route), 'route has no console usage');
assert(!route.includes('as any'), 'route has no as any casts');

assert(page.includes('AIMarginSnapshotPanel'), 'finance page renders AI margin panel');
assert(page.includes('AIMarginDrilldownPanel'), 'finance page renders AI margin drilldown panel');
assert(page.includes('AIMarginRecommendationsPanel'), 'finance page renders AI margin recommendations panel');
assert(page.includes('aiMarginSnapshot: AIMarginSnapshot'), 'finance page types AI margin snapshot');
assert(page.includes('aiMarginDrilldown: AIMarginDrilldown'), 'finance page types AI margin drilldown');
assert(page.includes('aiMarginRecommendations: AIMarginRecommendation'), 'finance page types AI margin recommendations');
assert(panel.includes('AI margin control'), 'AI margin panel has user-visible heading');
assert(panel.includes('grossMarginAfterAi') && panel.includes('aiCostRatio'), 'panel surfaces margin and ratio');
assert(drilldownPanel.includes('AI margin by user') && drilldownPanel.includes('AI margin by workspace'), 'drilldown panel surfaces users and workspaces');
assert(drilldownPanel.includes('marginAfterAi') && drilldownPanel.includes('topModel'), 'drilldown panel exposes margin and top model');
assert(recommendationsPanel.includes('AI margin next actions'), 'recommendations panel surfaces next actions');
assert(recommendationsPanel.includes('Expected impact'), 'recommendations panel explains expected impact');
assert(!/#[0-9a-fA-F]{3,8}/.test(panel), 'panel has no hardcoded hex colors');
assert(!/#[0-9a-fA-F]{3,8}/.test(drilldownPanel), 'drilldown panel has no hardcoded hex colors');
assert(!/#[0-9a-fA-F]{3,8}/.test(recommendationsPanel), 'recommendations panel has no hardcoded hex colors');
assert(!/console\.(log|warn|error|info|debug)\(/.test(panel), 'panel has no console usage');
assert(!/console\.(log|warn|error|info|debug)\(/.test(drilldownPanel), 'drilldown panel has no console usage');
assert(!/console\.(log|warn|error|info|debug)\(/.test(recommendationsPanel), 'recommendations panel has no console usage');

assert(test.includes('periodAiCost') && test.includes('status).toBe(\'risk\')'), 'test covers AI cost and risk status');
assert(test.includes('aiMarginDrilldown.topUsers') && test.includes('aiMarginDrilldown.topWorkspaces'), 'test covers user and workspace drilldown');
assert(test.includes('aiMarginRecommendations'), 'test covers AI margin recommendations');
assert(rootPackage.includes('qa:ai-margin-governance'), 'root package exposes qa:ai-margin-governance');
assert(rootPackage.includes('check-ai-margin-gate.mjs'), 'product quality progress runs AI margin gate');
assert(measure.includes('aiMarginGovernanceConfigured'), 'product quality measure tracks AI margin gate');

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  console.error('AI margin governance gate failed:');
  for (const check of failed) {
    console.error(`- ${check.message}`);
  }
  process.exit(1);
}

console.log(`AI margin governance gate passed (${checks.length} checks).`);
