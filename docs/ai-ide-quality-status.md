# AI IDE Quality Status (2025-11-14)

This document captures the current state of the AI IDE experience, the coverage we have in GitHub Actions, and the concrete follow-ups required to ship a fully polished, professional experience. For the long-horizon roadmap and execution checklist, see `docs/ai-ide-best-in-market-plan.md`.

## Recent verification runs

| Command | Scope | Result | Notes |
| --- | --- | --- | --- |
| `npm run test:ai-ide` | TypeScript build + mocha suite under `cloud-ide-desktop/aethel_theia_fork/packages/ai-ide` | ✅ 38 specs passing | Validates provider registry events, cancellation handling, launch/tool providers. |
| `npm run playwright:install` | Installs browsers/system deps | ✅ | Required before running Playwright locally/CI. |
| `npm run test:e2e` | Playwright smoke tests in `examples/playwright/tests` | ✅ 5 passed / 2 skipped | Skipped specs (`ui-proxy.spec.ts`) are optional proxy tests. Mock server booted via `tools/llm-mock/server.js`. |

## IDE surface checklist

| Area | Key files | Status | Follow-ups |
| --- | --- | --- | --- |
| Branding bar + quick actions | `packages/ai-ide/src/browser/branding/ai-ide-branding-widget.tsx`, `.../style/index.css` | ✅ Uses official Aethel gradient/logo, exposes providers/agents/tools shortcuts. | Bundle the SVG/logo from a shared asset to avoid inline duplication; add responsive tests. |
| Default layout & docking | `packages/ai-ide/src/browser/layout/ai-ide-layout-contribution.ts` | ✅ Auto-opens provider/agent/tool/history widgets with codicon icons. | Persist layout customizations per workspace so users returning keep their setup. |
| Status bar hints | `packages/ai-ide/src/browser/status/ai-ide-status-bar-contribution.ts` | ✅ Shows provider summary and active agent. | Add commands that jump directly into default provider editor/history filters. |
| Provider configuration | `packages/ai-ide/src/browser/ai-configuration/provider-configuration-widget.tsx` | ✅ CRUD for custom/ensemble providers with billing metadata. | Localize strings via `nls`, add validation for duplicate IDs, and enforce secure storage (API keys currently in-memory only). |
| Agent/tool/token widgets | `packages/ai-ide/src/browser/ai-configuration/*` | ✅ Leverage Theia AI services; cancellation coverage in tests. | Styling still falls back to stock Theia; add `ai-ide-*` class hooks so the brand theme applies beyond the hero banner. |
| Billing admin surface | `packages/ai-ide/src/browser/admin/*` | ⚠️ Accessible via widget factory but lacks documentation/tests. | Write a minimal integration test (mocha) and add to branding bar or command palette for discoverability. |
| Font & icon delivery | `packages/ai-ide/src/browser/style/index.css`, `frontend-module.ts` | ⚠️ Fonts pulled from Google Fonts; codicons loaded via CDN. | Bundle fonts/codicons locally (e.g., `@fontsource/inter`, vendored css) for air-gapped installs and CSP compliance. |
| Localization & copy consistency | Multiple widgets | ⚠️ Mixed pt-BR and English strings. | Move all visible strings into `nls.localize` and define a single default locale before translating. |

## GitHub Actions coverage

| Workflow | Trigger | What it runs | Gaps |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | Push/PR to `main`; manual `workflow_dispatch` with `run_e2e` input | Matrix Windows+Ubuntu job running syntax check, ai-ide TS+mocha; optional Ubuntu Playwright job when `run_e2e` = true. | Browser tests are manual-only; consider running on PR labels or nightly cron plus artifact summary (already in `ci.yml`, but auto-trigger still off). |
| `.github/workflows/ci-playwright.yml` | PRs to `main` and selected branches | Installs mock deps, runs mock Jest, ai-ide tests, Playwright suite, uploads diagnostics. | Add JSON summary output + PR comment (use `tools/ci/write-playwright-summary.mjs` for parity with main CI). |
| `.github/workflows/ide-quality.yml` | Push/PR to `main` | `npm run check:ai-ide-ts` (tsc noEmit). | Add Linux + macOS runners if we want platform parity. |
| `.github/workflows/ui-audit.yml` | Manual + daily 04:00 UTC | Starts dev server, runs axe + screenshot audit via `tools/ide/ui-audit/run_audit.js`. | Needs environment variable support for auth flows; add summary artifact for quick triage. |
| `.github/workflows/visual-regression-compare.yml` | Manual | Restores baseline branch, runs compare script, uploads diffs. | Fails silently if no `GH_PAT`; add validation + docs on how to supply a PAT, or switch to GITHUB_TOKEN. |
| `.github/workflows/main.yml` | Placeholder | No-op (placeholder added to keep file valid). | Replace with actual release/build workflow when ready. |

## Outstanding work (priority)

1. **P0 – Localization & copy audit**
   - All `packages/ai-ide/src/browser/**` widgets should fetch strings via `nls`. Currently Portuguese + English mix confuses users.
   - Add a smoke test that asserts `ai-ide-branding-widget` renders the expected English copy when default locale is en-US.

2. **P0 – Offline asset bundling**
   - Vendor Inter/JetBrains fonts and codicons instead of remote `<link>` tags (required for offline Electron builds).
   - Update `frontend-module.ts` to prefer local assets, falling back to CDN only when explicitly enabled.

3. **P1 – Billing/admin discoverability**
   - Add a quick action button or status-bar command to launch `BillingAdminWidget`.
   - Cover it with at least one mocha test verifying the widget factory wiring.

4. **P1 – Automated Playwright diagnostics**
   - Wire `tools/ci/write-playwright-summary.mjs` into `.github/workflows/ci-playwright.yml` so every run uploads `diagnostics/PLAYWRIGHT_SUMMARY.txt` and posts a PR comment.
   - Promote the optional CI e2e job to run nightly via cron to catch regressions without manual dispatches.

5. **P2 – Style hooks for deep widgets**
   - Introduce a shared `ai-ide-panel` class (or CSS module) applied inside `AIAgentConfigurationWidget`, `AIVariableConfigurationWidget`, etc., so the brand palette extends beyond the hero banner.
   - Add a Percy/Playwright visual snapshot once the theme is applied.

6. **P2 – Documentation polish**
   - Expand `README.DEV.md` with the new diagnostics command (`npm run diagnostics:playwright`) and reminder to run `npm install` inside `tools/llm-mock/` before Playwright.
   - Cross-link this status doc from `docs/ai-ide-branding-audit.md` for continuity.

## Suggested verification cadence

| Frequency | Action |
| --- | --- |
| Every PR | `npm run test:ai-ide`, `npm run diagnostics:playwright` (if launcher JSON exists) |
| Daily | `npm run test:e2e` (or dispatch `.github/workflows/ci.yml` with `run_e2e=true`) |
| Weekly | Run `npm run ci:local` to exercise the combined TS + mocha + Playwright pipeline. |
| Before release | Validate UI audits + visual regression workflows to ensure no styling regressions escaped. |

---
Maintaining this checklist alongside `docs/ai-ide-branding-audit.md` gives us a single place to monitor IDE completeness and CI readiness. Update the tables whenever we close a gap or introduce a new surface.
