# Branch Protection Policy (Required)

This repository enforces a strict no-bypass PR policy for production branches.

## Required status checks

For `main` and release branches, configure GitHub branch protection to require:

1. `CI / Web App - Lint & Type Check`
2. `CI / Web App - Build`
3. `CI / Web App - Merge Pressure E2E`
4. `Cloud Web App CI/CD / Test`
5. `UI Audit (Playwright + axe) / ui-audit`
6. `Visual Regression - Compare vs Baseline / compare`
7. `CI / Web App - Lint & Type Check` must execute `npm run qa:enterprise-gate`

## Mandatory gates (must be green)

From `cloud-web-app/web`:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm run qa:interface-gate`
5. `npm run qa:canonical-components`
6. `npm run qa:route-contracts`
7. `npm run qa:no-fake-success`
8. `npm run qa:mojibake`
9. `npm run qa:billing-runtime-readiness`
10. `npm run qa:preview-runtime-readiness`
11. `npm run qa:enterprise-gate`
12. `npm run build`
13. `npm run test:e2e:merge`

## Gate semantics

- `qa:enterprise-gate` is the non-build aggregate gate for PR enforcement.
- `qa:enterprise-release-gate` is the release-grade aggregate (`qa:enterprise-gate` + `build`).
- The CI workflow should keep the non-build aggregate in the lint/typecheck job and the actual Next build in the dedicated build job.
- The default PR E2E pressure should come from the curated Chromium merge-pressure suite (`npm run test:e2e:merge`), while the full Playwright matrix stays manual until its flake budget is proven.

## No-bypass rule

1. Do not allow direct pushes to protected branches.
2. Do not merge with failing/pending required checks.
3. Do not use admin override outside a formally declared incident.
