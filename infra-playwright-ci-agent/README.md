# infra-playwright-ci-agent

Small automation helper to collect Playwright artifacts and post a summary to PRs.

Usage

- Install dependencies: npm ci
- Run after Playwright: PLAYWRIGHT_ARTIFACTS=playwright-report GITHUB_REPOSITORY=owner/repo PR_NUMBER=123 GITHUB_TOKEN=*** node scripts/ci-agent.js
- Analyze a report: node scripts/analyze-logs.js path/to/playwright-report/summary.json
