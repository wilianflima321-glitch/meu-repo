# 25_REPO_CONNECTIVITY_MATRIX_2026-02-20
Status: GENERATED CONNECTIVITY SWEEP
Generated: 2026-02-20T23:58:38.401Z

## Summary
- Total checks: 31
- Resolved references: 31
- Missing required references: 0
- Missing optional references: 0
- Dead script references: 0
- Markdown files (total): 3634
- Markdown files (canonical): 32
- Markdown files (historical/outside canonical): 3602

## Required Missing References
| Source | Key | Path | Status | Notes |
| --- | --- | --- | --- | --- |
| - | - | - | none | - |

## Optional Missing References
| Source | Key | Path | Status | Notes |
| --- | --- | --- | --- | --- |
| - | - | - | none | - |

## Dead Script References
| Source | Source Script | Command Type | Target Script | Target Package | Notes |
| --- | --- | --- | --- | --- | --- |
| - | - | - | - | - | none |

## Top-Level Directory Classification
| Directory | References | Classification |
| --- | ---: | --- |
| `.devcontainer` | 0 | ACTIVE |
| `.github` | 0 | ACTIVE |
| `audit dicas do emergent usar` | 0 | ACTIVE |
| `client` | 0 | ACTIVE |
| `cloud-admin-ia` | 0 | LEGACY_ACTIVE |
| `cloud-web-app` | 9 | ACTIVE |
| `diagnostics` | 0 | ACTIVE |
| `docs` | 0 | ACTIVE |
| `infra` | 1 | ACTIVE |
| `infra-playwright-ci-agent` | 0 | LEGACY_ACTIVE |
| `installers` | 0 | LEGACY_ACTIVE |
| `meu-repo` | 0 | EXTERNAL_ONLY |
| `nginx` | 0 | ACTIVE |
| `public` | 0 | ACTIVE |
| `runtime-templates` | 0 | ACTIVE |
| `scripts` | 0 | ACTIVE |
| `shared` | 0 | ACTIVE |
| `src` | 2 | ACTIVE |
| `tests` | 0 | ACTIVE |
| `tools` | 19 | ACTIVE |
| `visual-regression.spec.ts-snapshots` | 0 | LEGACY_ACTIVE |

## Surface Ownership Matrix
| Surface | Owner | Primary Paths |
| --- | --- | --- |
| dashboard | Frontend Lead Studio Home | cloud-web-app/web/app/dashboard/*, cloud-web-app/web/components/studio/* |
| ide | Frontend Lead IDE | cloud-web-app/web/app/ide/*, cloud-web-app/web/components/ide/* |
| admin | Product Ops + Backend | cloud-web-app/web/app/admin/*, cloud-web-app/web/app/api/admin/* |
| api | Backend Lead API | cloud-web-app/web/app/api/* |
| ai | AI Architect | cloud-web-app/web/app/api/ai/*, cloud-web-app/web/lib/ai* |
| billing | Billing/Entitlement Lead | cloud-web-app/web/app/api/billing/*, cloud-web-app/web/app/api/admin/payments/* |
| governance | PM Tecnico + Plataforma | package.json, .github/workflows/*, tools/repo-connectivity-scan.mjs |

## Rules
1. Required missing references must be fixed before merge.
2. Optional missing references must remain explicitly guarded in scripts/workflows.
3. `ORPHAN_CANDIDATE` and `EXTERNAL_ONLY` directories require owner decision in canonical docs before reuse.
