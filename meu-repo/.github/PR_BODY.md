Summary
-------

This PR adds deterministic runtime E2E coverage and unit tests for the new ensemble provider feature, plus a non-secret Gemini provider example and some dev-only mock endpoints used to support deterministic testing.

Changes
-------
- tools/llm-mock/server.js
  - Added DELETE /api/llm/providers/:id (test cleanup)
  - Added GET /api/llm/usage (filterable)
  - Added POST /api/llm/dev/run-ensemble/:id (simulates ensemble runs by creating usage events)
- tools/llm-mock/providers/gemini-example.json (new)
- tools/llm-mock/README.md (updated to reference example)
- examples/playwright/tests/ensemble-runtime.spec.ts (new runtime E2E)
- examples/playwright/tests/ensemble.spec.ts (persistence E2E)
- cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/llm-providers/ensemble-provider.test.ts (unit tests)

Testing
-------
- Playwright tests (examples/playwright/tests): both persistence and runtime tests pass locally across Chromium/Firefox/WebKit.
- Jest unit tests for `EnsembleProvider` passed locally.

Notes
-----
- Dev-only endpoints are namespaced under `/api/llm/dev/*` for safety.
- The Gemini example contains placeholder keys; do NOT commit real API keys. Use `/api/llm/secrets/encrypt` for dev-only encryption if needed (gated by `DEV_MODE`).

Checklist
---------
- [ ] Confirm CI runs Playwright + Jest (workflow included in this PR)
- [ ] Security review for mock endpoints (dev-only)
- [ ] Merge into `infra/playwright-ci` after review

How to run locally
-------------------
1. Start the mock server:

```powershell
Start-Process node -ArgumentList 'tools/llm-mock/server.js' -WorkingDirectory 'G:\repo' -NoNewWindow
```

2. Run Playwright tests:

```bash
npx playwright test examples/playwright/tests/ensemble-runtime.spec.ts --config=playwright.config.ts
npx playwright test examples/playwright/tests/ensemble.spec.ts --config=playwright.config.ts
```

3. Run Jest unit tests in the `ai-ide` package:

```bash
cd cloud-ide-desktop/aethel_theia_fork/packages/ai-ide
npx jest --config jest.config.js src/browser/llm-providers/ensemble-provider.test.ts --runInBand
```
