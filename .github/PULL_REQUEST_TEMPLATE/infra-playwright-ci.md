<!-- Use this template when adding/updating the infra-playwright-ci-agent or CI wiring -->

## Summary

Describe the change to CI infra and what it enables.

## How to test

1. Run Playwright locally: npx playwright test --config=playwright.config.ts
2. Run the agent in local mode: node infra-playwright-ci-agent/scripts/ci-agent.js

## Notes
- If adding GitHub Actions, ensure secrets.GITHUB_TOKEN is available.
