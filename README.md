# Aethel Engine

Canonical source of truth: `audit dicas do emergent usar/00_FONTE_CANONICA.md`.

## Current Product Entry
- Studio Home: `/dashboard`
- Advanced shell: `/ide`
- Main web app code: `cloud-web-app/web`

## Quick Start
```bash
# install web dependencies
npm --prefix cloud-web-app/web ci

# run web app
npm run portal:dev
```

Open `http://localhost:3000`.

## Root Commands
```bash
# repository connectivity gate
npm run qa:repo-connectivity

# web quality gates
npm --prefix cloud-web-app/web run lint
npm --prefix cloud-web-app/web run typecheck
npm --prefix cloud-web-app/web run qa:interface-gate
npm --prefix cloud-web-app/web run qa:architecture-gate
npm --prefix cloud-web-app/web run qa:canonical-components
npm --prefix cloud-web-app/web run qa:route-contracts
npm --prefix cloud-web-app/web run qa:no-fake-success
npm --prefix cloud-web-app/web run qa:mojibake
npm --prefix cloud-web-app/web run qa:enterprise-gate
```

## Repo Layout (Operational)
- `cloud-web-app/web`: active product runtime and API
- `audit dicas do emergent usar`: canonical contracts and audit docs
- `.github/workflows`: CI/CD and quality gates
- `tools`: root automation scripts (includes connectivity scan)
- `src`, `shared`, `scripts`, `tests`: supporting runtime/dev utilities

## Connectivity Policy
- Required references in root scripts/config/workflows must exist.
- Optional references are allowed only when explicitly guarded (for example desktop subtree not present in this branch).
- Generated connectivity matrix: `audit dicas do emergent usar/25_REPO_CONNECTIVITY_MATRIX_2026-02-20.md`.

## Notes
- Legacy routes remain phased with explicit `410 DEPRECATED_ROUTE` contracts.
- Unavailable capabilities must return explicit `NOT_IMPLEMENTED` contracts.
- No fake-success behavior is allowed.
