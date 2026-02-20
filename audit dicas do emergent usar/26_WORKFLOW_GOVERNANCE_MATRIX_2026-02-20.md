# 26_WORKFLOW_GOVERNANCE_MATRIX_2026-02-20
Status: GENERATED WORKFLOW GOVERNANCE SWEEP
Generated: 2026-02-20T23:18:45.804Z

## Summary
- Total workflows: 14
- Active authority workflows: 5
- Supporting workflows: 8
- Legacy-candidate workflows: 1
- Placeholder workflows: 0
- Stale trigger path filters: 0
- Governance issues: 0

## Workflow Matrix
| Workflow file | Name | Class | Triggers | Connectivity gate | Enterprise gate | continue-on-error | stale trigger paths |
| --- | --- | --- | --- | --- | --- | --- | ---: |
| `cd-deploy.yml` | CD - Deploy | SUPPORTING | workflow_dispatch, push | no | no | no | 0 |
| `ci-metrics-aggregate.yml` | CI Metrics Aggregation | SUPPORTING | workflow_dispatch, schedule | no | no | no | 0 |
| `ci-playwright.yml` | CI - Jest and Playwright | SUPPORTING | workflow_dispatch | no | no | no | 0 |
| `ci-worker-image.yml` | CI Worker Image | SUPPORTING | workflow_dispatch, pull_request, push | no | no | no | 0 |
| `ci.yml` | CI | ACTIVE_AUTHORITY | workflow_dispatch, pull_request, push | yes | no | no | 0 |
| `cloud-web-app.yml` | Cloud Web App CI/CD | ACTIVE_AUTHORITY | pull_request, push | yes | no | no | 0 |
| `codeql-analysis.yml` | "CodeQL Security Analysis" | SUPPORTING | pull_request, push, schedule | no | no | no | 0 |
| `deploy.yml` | Deploy to Production | SUPPORTING | workflow_dispatch, push | no | no | no | 0 |
| `ide-quality.yml` | IDE Quality - TypeScript check | SUPPORTING | pull_request, push | yes | no | no | 0 |
| `main.yml` | main.yml | ACTIVE_AUTHORITY | workflow_dispatch, pull_request, push | yes | no | no | 0 |
| `merge-unrelated-histories.yml` | Merge Unrelated Histories | LEGACY_CANDIDATE | workflow_dispatch | no | no | no | 0 |
| `ui-audit.yml` | UI Audit (Playwright + axe) | ACTIVE_AUTHORITY | workflow_dispatch, pull_request, schedule | yes | no | yes | 0 |
| `visual-regression-baseline.yml` | Visual Regression - Capture Baseline | SUPPORTING | workflow_dispatch, schedule | no | no | no | 0 |
| `visual-regression-compare.yml` | Visual Regression - Compare vs Baseline | ACTIVE_AUTHORITY | workflow_dispatch, pull_request | yes | no | yes | 0 |

## Stale Trigger Path Filters
| Workflow file | Path filter |
| --- | --- |
| - | none |

## Governance Issues
- none

## Policy
1. `ACTIVE_AUTHORITY` workflows must include connectivity gate.
2. Enterprise gate responsibility can be centralized in CI authority workflows and branch protection.
3. `LEGACY_CANDIDATE` workflows must have owner decision (keep, restrict, archive).
