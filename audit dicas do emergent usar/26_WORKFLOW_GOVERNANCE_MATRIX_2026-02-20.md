# 26_WORKFLOW_GOVERNANCE_MATRIX_2026-02-20
Status: GENERATED WORKFLOW GOVERNANCE SWEEP
Generated: 2026-02-20T02:02:02.054Z

## Summary
- Total workflows: 14
- Active authority workflows: 5
- Supporting workflows: 8
- Legacy-candidate workflows: 1
- Placeholder workflows: 0
- Governance issues: 0

## Workflow Matrix
| Workflow file | Name | Class | Triggers | Connectivity gate | Enterprise gate | continue-on-error |
| --- | --- | --- | --- | --- | --- | --- |
| `cd-deploy.yml` | CD - Deploy | SUPPORTING | workflow_dispatch, push | no | no | no |
| `ci-metrics-aggregate.yml` | CI Metrics Aggregation | SUPPORTING | workflow_dispatch, schedule | no | no | no |
| `ci-playwright.yml` | CI — Jest and Playwright | SUPPORTING | workflow_dispatch | no | no | no |
| `ci-worker-image.yml` | CI Worker Image | SUPPORTING | workflow_dispatch, pull_request, push | no | no | no |
| `ci.yml` | CI | ACTIVE_AUTHORITY | workflow_dispatch, pull_request, push | yes | no | no |
| `cloud-web-app.yml` | Cloud Web App CI/CD | ACTIVE_AUTHORITY | pull_request, push | yes | no | no |
| `codeql-analysis.yml` | "CodeQL Security Analysis" | SUPPORTING | pull_request, push, schedule | no | no | no |
| `deploy.yml` | Deploy to Production | SUPPORTING | workflow_dispatch, push | no | no | no |
| `ide-quality.yml` | IDE Quality - TypeScript check | SUPPORTING | pull_request, push | yes | no | no |
| `main.yml` | main.yml | ACTIVE_AUTHORITY | workflow_dispatch, pull_request, push | yes | no | no |
| `merge-unrelated-histories.yml` | Merge Unrelated Histories | LEGACY_CANDIDATE | workflow_dispatch | no | no | no |
| `ui-audit.yml` | UI Audit (Playwright + axe) | ACTIVE_AUTHORITY | workflow_dispatch, pull_request, schedule | yes | no | yes |
| `visual-regression-baseline.yml` | Visual Regression - Capture Baseline | SUPPORTING | workflow_dispatch, schedule | no | no | no |
| `visual-regression-compare.yml` | Visual Regression - Compare vs Baseline | ACTIVE_AUTHORITY | workflow_dispatch, pull_request | yes | no | yes |

## Governance Issues
- none

## Policy
1. `ACTIVE_AUTHORITY` workflows must include connectivity gate.
2. Enterprise gate responsibility can be centralized in CI authority workflows and branch protection.
3. `LEGACY_CANDIDATE` workflows must have owner decision (keep, restrict, archive).
