# Reproducing CI locally and contributing guidance

This short guide explains how to reproduce the CI environment locally, run the mock with debug enabled, and collect artifacts useful for debugging Playwright and mock failures.

Prerequisites
 - Node 18+ installed
 - npm
 - (optional) Playwright and its browsers: `npx playwright install --with-deps`
 - (optional) GitHub CLI `gh` if you want to re-run workflows from local

Start the mock with debug enabled

PowerShell / Bash (from repo root):

```powershell
$env:MOCK_DEBUG = 'true'
node tools/llm-mock/server.js
```

or (Unix shell):

```bash
export MOCK_DEBUG=true
node tools/llm-mock/server.js
```

Run mock unit tests

```bash
cd tools/llm-mock
npm install
npm test
```

Run the CI smoke checks (as used in GitHub Actions)

```bash
bash tools/ci/smoke_ci.sh
```

Run Playwright locally

```bash
# Curated default merge-pressure suite (what PRs should feel by default):
npm run test:e2e:merge
# Canonical product E2E:
npx playwright test --config=playwright.config.ts --reporter=html
# Public-marketing-only smoke:
npm run test:e2e:smoke
# Legacy root-level mock/backend specs:
npx playwright test --config=playwright.legacy.config.js --reporter=html
# Or run a single test file directly if you don't have a config with projects:
npx playwright test playwright/test.spec.ts --reporter=html
# report will be in playwright-report/
```

Collect debug artifacts

- `tools/llm-mock/verifier-debug.json` — verifier debug output (when MOCK_DEBUG=true)
- `tools/llm-mock/server.log` and `tools/llm-mock/server.err.log`
- `tools/ci/smoke_ci.log`
- `playwright-report/` (HTML report)

Generate a Playwright summary text file

1. Run Playwright with the JSON reporter enabled, for example:

	```bash
	npx playwright test --config=playwright.legacy.config.js --reporter="line,json=test-results/playwright.json,html"
	```

2. Convert the JSON results into the tracked summary file:

	```bash
	npm run diagnostics:playwright
	```

	This writes/updates `diagnostics/PLAYWRIGHT_SUMMARY.txt` and can also be used by CI to attach a lightweight summary to workflow artifacts.

If you reproduce an issue, attach the artifacts above to the PR or paste them in the issue to speed triage.

Current CI intent:

- `CI / Web App - Merge Pressure E2E` is the default PR browser gate and runs the curated Chromium suite from `tests/e2e/merge-pressure.spec.ts`.
- That suite uses `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\playwright.merge.config.ts`, which intentionally depends only on the web app runtime instead of the heavier full-matrix server orchestration.
- The full Playwright matrix remains available as a manual workflow path while we keep hardening flake resistance and runtime stability.
- `Legacy Playwright Diagnostics` is now explicitly diagnostic/legacy rather than part of the default PR path.

Latest local verification snapshot:

- `npx playwright install chromium` completed successfully on the local workstation.
- `npm run test:e2e:merge` was validated locally against a live portal runtime after:
  - making the merge-pressure suite use relative URLs + warm-up requests
  - fixing the Sentry runtime bootstrap in `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\lib\sentry.ts`
  - wiring explicit labels/ids on the contact-sales form in `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\app\contact-sales\page.tsx`
- The current local result for the curated merge-pressure suite is `5 passed`.
