Diagnostics artifacts produced locally for PR `infra/playwright-ci-ensemble-workflow-fix`.

Files added here:
- PLAYWRIGHT_SUMMARY.txt — short human-readable summary of the local Playwright run. Generate/refresh it with `npm run diagnostics:playwright` (after running Playwright with the JSON reporter) or let CI create it automatically via `tools/ci/write-playwright-summary.mjs`.
- server.log — tail of the mock server logs during the run.

How to use:
- Review `PLAYWRIGHT_SUMMARY.txt` for quick pass/fail counts.
- Download and open `playwright-report/index.html` locally to inspect test-level details (the report is generated in the workspace; not checked into git).
 - When CI finishes, check the `playwright-diagnostics` artifact for the auto-generated summary plus the raw JSON reporter output.

Next steps I can take:
- Commit and push these diagnostics files to the branch so they appear in the PR.
- Re-run the GitHub Actions jobs for the PR (requires GH auth) and triage server artifacts produced by CI
- If you want me to force a `verifier-debug.json`, tell me which verifier scenario to run and I'll execute it locally and commit the result.
