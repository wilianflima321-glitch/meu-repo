import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, 'app');
const API_DIR = path.join(APP_DIR, 'api');
const OUTPUT_FILE = path.join(ROOT, 'docs', 'ROUTES_INVENTORY.md');

const skipDirs = new Set(['node_modules', '.next', 'dist', 'build']);
const NONCRITICAL_NOT_IMPLEMENTED_API_ROUTES = new Set([
  '/api/ai/query',
  '/api/ai/stream',
]);

function walk(dir, predicate, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, predicate, out);
      continue;
    }
    if (predicate(abs)) out.push(abs);
  }
  return out;
}

function normalizeRouteFromPage(pagePath) {
  const rel = path.relative(APP_DIR, pagePath).replace(/\\/g, '/');
  const routeBase = rel.replace(/\/page\.tsx$/, '').replace(/^page\.tsx$/, '');
  const segments = routeBase
    .split('/')
    .filter(Boolean)
    .filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')));
  return `/${segments.join('/')}`.replace(/\/+/g, '/');
}

const pageFiles = walk(
  APP_DIR,
  (abs) => abs.endsWith(path.join('page.tsx')) && !abs.includes(`${path.sep}api${path.sep}`)
);

const apiRouteFiles = walk(API_DIR, (abs) => abs.endsWith(`${path.sep}route.ts`) || abs.endsWith(`${path.sep}route.tsx`));

const routeEntries = pageFiles
  .map((file) => ({
    file,
    route: normalizeRouteFromPage(file),
    content: fs.readFileSync(file, 'utf8'),
  }))
  .sort((a, b) => a.route.localeCompare(b.route));

const adminRoutes = routeEntries.filter((r) => r.route === '/admin' || r.route.startsWith('/admin/')).length;
const authRoutes = routeEntries.filter((r) => {
  return ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(r.route);
}).length;
const coreWorkbenchRoutes = routeEntries.filter((r) => r.route === '/ide').length;
const redirectToWorkbench = routeEntries.filter((r) => /redirect\(['"]\/ide/.test(r.content) || /WorkbenchRedirect/.test(r.content)).length;

function normalizeApiRouteFromFile(filePath) {
  const rel = path.relative(API_DIR, filePath).replace(/\\/g, '/');
  const route = rel.replace(/\/route\.tsx?$/, '').replace(/^route\.tsx?$/, '');
  return `/api/${route}`.replace(/\/+/g, '/');
}

let apiNotImplemented = 0;
let apiNotImplementedCritical = 0;
let apiNotImplementedNoncritical = 0;
let paymentGatewayNotImplemented = 0;

for (const file of apiRouteFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const route = normalizeApiRouteFromFile(file);
  const notImplementedMatches = (content.match(/NOT_IMPLEMENTED/g) || []).length;
  const paymentGatewayMatches = (content.match(/PAYMENT_GATEWAY_NOT_IMPLEMENTED/g) || []).length;

  apiNotImplemented += notImplementedMatches;
  paymentGatewayNotImplemented += paymentGatewayMatches;

  if (notImplementedMatches > 0) {
    if (NONCRITICAL_NOT_IMPLEMENTED_API_ROUTES.has(route)) {
      apiNotImplementedNoncritical += notImplementedMatches;
    } else {
      apiNotImplementedCritical += notImplementedMatches;
    }
  }
}

const lines = [];
lines.push('# ROUTES_INVENTORY.md');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');
lines.push('## Summary');
lines.push(`- Total routes: ${routeEntries.length}`);
lines.push(`- Admin routes: ${adminRoutes}`);
lines.push(`- Auth routes: ${authRoutes}`);
lines.push(`- Core workbench routes: ${coreWorkbenchRoutes}`);
lines.push(`- Workbench redirect routes: ${redirectToWorkbench}`);
lines.push('');
lines.push('## API Gate Status');
lines.push(`- Remaining NOT_IMPLEMENTED API markers (total): ${apiNotImplemented}`);
lines.push(`- Critical NOT_IMPLEMENTED markers: ${apiNotImplementedCritical}`);
lines.push(`- Non-critical NOT_IMPLEMENTED markers: ${apiNotImplementedNoncritical}`);
lines.push(`- PAYMENT_GATEWAY_NOT_IMPLEMENTED markers: ${paymentGatewayNotImplemented}`);
lines.push('- Canonical file API: `/api/files/tree` + `/api/files/fs`');
lines.push('- Deprecated file API: `/api/workspace/tree` + `/api/workspace/files` (410 DEPRECATED_ROUTE)');
lines.push('- Checkout canonical web path: `/billing/checkout`');
lines.push('- IDE-local handoff endpoint: `/api/billing/checkout-link`');
lines.push('');
lines.push('## Full Route List');
for (const entry of routeEntries) {
  const rel = path.relative(APP_DIR, entry.file).replace(/\\/g, '/');
  lines.push(`- ${entry.route} (${rel})`);
}

fs.writeFileSync(OUTPUT_FILE, `${lines.join('\n')}\n`, 'utf8');
console.log(`[routes-inventory] written: ${path.relative(ROOT, OUTPUT_FILE).replace(/\\/g, '/')}`);
