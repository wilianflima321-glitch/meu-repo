# Branch Protection Policy (Required)

This repository enforces a strict no-bypass PR policy for production branches.

## Required status checks

For `main` and release branches, configure GitHub branch protection to require:

1. `CI / Web App - Lint & Type Check`
2. `CI / Web App - Build`
3. `Cloud Web App CI/CD / Test`
4. `UI Audit (Playwright + axe) / ui-audit`
5. `Visual Regression - Compare vs Baseline / compare`
6. Any workflow job that runs `qa:enterprise-gate`

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
9. `npm run qa:enterprise-gate`

## No-bypass rule

1. Do not allow direct pushes to protected branches.
2. Do not merge with failing/pending required checks.
3. Do not use admin override outside a formally declared incident.
