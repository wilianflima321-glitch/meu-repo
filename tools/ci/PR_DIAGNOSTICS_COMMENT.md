## CI diagnostics and next steps (auto-draft)

This is a ready-to-post comment summarizing what I reproduced, the low-risk fixes I pushed, and how to proceed with the PR CI.

Summary
-------
- I reproduced Playwright + Jest locally against the mock server and collected diagnostics.
- Implemented small, low-risk CI hardenings on branch `infra/playwright-ci-ensemble-workflow-fix`:
  - Start mock server with `MOCK_DEBUG=true` so `tools/llm-mock/verifier-debug.json` can be produced.
  - Install `tools/llm-mock` dependencies with `npm ci` when a lockfile is present (fallback to `npm install`).
  - Increased health poll robustness (longer total wait) and print `verifier-debug.json` on failure.
  - Upload `tools/llm-mock/server.err.log` artifact on every run.
- Found a malformed top-level `package-lock.json`. I moved it to `package-lock.json.broken` to avoid tooling parse errors and reduce CI flakiness.

What I ran locally
------------------
- Mock: `MOCK_DEBUG=true node tools/llm-mock/server.js` (server bound to 0.0.0.0)
- Jest (mock): `cd tools/llm-mock && npm test` (unit tests passing locally)
- Playwright: `npx playwright test --project=chromium --reporter=html` (report generated in `playwright-report/`)

Artifacts I added to the branch
-----------------------------
- `diagnostics/verifier-debug.json` — verifier output (weapon_present) generated locally for triage
- `diagnostics/PLAYWRIGHT_SUMMARY.txt` — brief local Playwright run summary
- `diagnostics/server.log` — tail of mock server log during local run
- `playwright-report/` — local HTML report

How to repro the failure locally (short)
---------------------------------------
1. Start server: `MOCK_DEBUG=true node tools/llm-mock/server.js`
2. Run Playwright: `npx playwright test --project=chromium --reporter=html`
3. Inspect `tools/llm-mock/verifier-debug.json` and `playwright-report/index.html`

What I need from the PR run
---------------------------
- Please re-run the PR CI (Actions -> the PR -> Re-run jobs). The updated workflow is already on the branch.
- If CI still fails, download the artifacts produced by that run and attach them here (server.log, server.err.log, verifier-debug artifact, playwright-report). I can triage them and propose follow-ups.

Suggested follow-ups (if CI still flakes)
---------------------------------------
1. If health waits still time out occasionally, increase `MAX_ATTEMPTS` and/or add exponential backoff.
2. Add Playwright test retries or run tests with `--retries=1` in CI to reduce flakiness.
3. Add an explicit small `tools/ci/dev-mock-health.sh` script (invoked by CI) that prints helpful debug info before failing.

Draft PR comment (copy/paste)
----------------------------
I reproduced the Playwright/Jest runs locally and pushed low-risk CI hardenings to this branch: enabled `MOCK_DEBUG`, prefer `npm ci` in `tools/llm-mock` when possible, increased health wait, and upload server.err.log. I also moved a malformed top-level `package-lock.json` to `package-lock.json.broken` to avoid JSON parse failures in tooling.

Please re-run the PR checks. If jobs still fail, download the artifacts (server.log, server.err.log, verifier-debug.json, playwright-report) and attach them here; I will triage and supply a minimal follow-up patch.

-- End of draft
