# CI workflow templates

This folder ships CI/CD workflows that require the repository maintainer to
copy them into `.github/workflows/` manually (the GitHub App used by the
automation layer does not hold the `workflows` permission, so it cannot
create or update files under `.github/workflows/` via pull-request).

## How to activate

```bash
# From the repo root (not from cloud-web-app/web):
cp cloud-web-app/web/docs/ci-templates/lighthouse.yml .github/workflows/
git add .github/workflows/lighthouse.yml
git commit -m "ci: enable lighthouse CI workflow"
git push
```

## Available templates

| File | Purpose | Blocking? |
|---|---|---|
| `lighthouse.yml` | Runs Lighthouse CI on every PR (perf / a11y / SEO / best-practices). | Soft-gate today, will ratchet up per round. |

## Why templates instead of direct commits?

The `workflows` permission is intentionally restricted so that an automated
agent cannot silently rewrite release/security workflows. All workflow
changes remain the purview of a human maintainer. When a template here
changes, the PR description will say so and a maintainer is expected to
re-copy the file in a follow-up commit.
