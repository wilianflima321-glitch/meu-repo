# CI tooling

This folder contains helpers for running and triaging CI locally and from a developer workstation.

Files added:

- `collect_metrics.ps1` - PowerShell helper that downloads `ci-metrics` artifacts from recent workflow runs (via GitHub CLI) and aggregates them into `tools/ci/metrics-archive.json`.

Usage:

1. Make sure you have `gh` installed and authenticated (`gh auth login`).
2. Run the collector to fetch recent runs (example):

```powershell
PS> .\tools\ci\collect_metrics.ps1 -Repo 'wilianflima321-glitch/meu-repo' -LookbackRuns 50
```

This will create or update `tools/ci/metrics-archive.json` with collected metrics.

Suggested next steps:

- Add a scheduled GitHub Action that runs this script nightly and commits `metrics-archive.json` to a `ci-metrics` branch or stores the aggregated JSON as a release/artefact.
- Create a tiny dashboard (static HTML) that reads `metrics-archive.json` to visualize health_wait_ms trends.

Added automation in this repo:

- A scheduled workflow ` .github/workflows/ci-metrics-aggregate.yml` runs nightly (02:00 UTC) and also supports manual `workflow_dispatch`.
	- The Action runs `tools/ci/collect_metrics.ps1` to fetch recent `ci-metrics` artifacts and writes `tools/ci/metrics-archive.json`.
	- If the file changes, the Action commits and pushes it to the `ci-metrics` branch so metrics are persisted.

- A tiny static dashboard is included at `tools/ci/dashboard/index.html`. Copy `tools/ci/metrics-archive.json` next to the dashboard (or serve from the same directory) to visualize recent metrics.

Security note: The workflow uses the repository's `GITHUB_TOKEN` for artifact download and pushing to the `ci-metrics` branch. This keeps the flow contained to the repository.

Next ideas:

- Publish the dashboard via GitHub Pages from the `ci-metrics` branch, or have the Action upload the dashboard + metrics as a release asset.
- Add a small alert step (email/Slack) when health_wait_ms or smoke_failures cross a threshold.
