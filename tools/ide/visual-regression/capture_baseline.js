// Simple visual regression baseline capture using Playwright.
// Usage: node capture_baseline.js --baseUrl http://localhost:3000 --out ./output/baseline

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

async function run() {
  const args = require('minimist')(process.argv.slice(2));
  const baseUrl = args.baseUrl || process.env.BASE_URL || 'http://localhost:3000';
  const outDir = path.resolve(args.out || path.join(__dirname, 'output', 'baseline'));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const pagesFile = path.join(__dirname, '..', 'ui-audit', 'pages.json');
  const pages = fs.existsSync(pagesFile) ? readJSON(pagesFile) : [{name:'home', path:'/'}];

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  for (const p of pages) {
    const url = new URL(p.path, baseUrl).toString();
    console.log('Capturing', url);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (err) {
      console.warn('  failed to load', url, err.message);
      continue;
    }
    const outPath = path.join(outDir, `${p.name}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log('  wrote', outPath);
  }

  await browser.close();
  console.log('Baseline capture complete');
}

run().catch(err=>{ console.error(err); process.exit(1); });
