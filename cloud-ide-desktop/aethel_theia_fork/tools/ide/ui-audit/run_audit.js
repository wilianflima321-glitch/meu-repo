// UI audit runner: captures screenshots and runs axe accessibility checks using Playwright.
// Usage: node run_audit.js --baseUrl http://localhost:3000

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

async function run() {
  const args = require('minimist')(process.argv.slice(2));
  const baseUrl = args.baseUrl || process.env.BASE_URL || 'http://localhost:3000';
  const pages = readJSON(path.join(__dirname, 'pages.json'));
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const report = [];

  for (const p of pages) {
    const url = new URL(p.path, baseUrl).toString();
    console.log(`Visiting ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (err) {
      console.warn(`  failed to load ${url}: ${err.message}`);
      report.push({ name: p.name, path: p.path, url, error: err.message });
      continue;
    }

    const screenshotPath = path.join(outDir, `${p.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  wrote screenshot ${screenshotPath}`);

    // run axe-core from local dependency (preferred) or fall back to CDN
    try {
      let axeInjected = false;
      try {
        const axe = require('axe-core');
        await page.addScriptTag({ content: axe.source });
        axeInjected = true;
      } catch (e) {
        console.warn('Local axe-core not available, falling back to CDN');
      }
      if (!axeInjected) {
        await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js' });
      }

      const axeResults = await page.evaluate(async () => {
        return await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2aa', 'wcag21aa'] } });
      });
      const axePath = path.join(outDir, `${p.name}-axe.json`);
      fs.writeFileSync(axePath, JSON.stringify(axeResults, null, 2));
      console.log(`  wrote axe results ${axePath}`);
      report.push({ name: p.name, path: p.path, url, screenshot: screenshotPath, axe: axePath, axeSummary: { violations: axeResults.violations.length } });
    } catch (err) {
      console.warn(`  axe run failed for ${url}: ${err.message}`);
      report.push({ name: p.name, path: p.path, url, screenshot: screenshotPath, axeError: err.message });
    }
  }

  await browser.close();
  const reportPath = path.join(outDir, 'ui-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Wrote audit report to ${reportPath}`);
  // console summary
  const totalViolations = report.reduce((acc, r) => acc + ((r.axeSummary && r.axeSummary.violations) || 0), 0);
  console.log(`Audit completed: ${report.length} pages, total axe violations (counted pages): ${totalViolations}`);
}

run().catch(err => { console.error(err); process.exit(1); });
