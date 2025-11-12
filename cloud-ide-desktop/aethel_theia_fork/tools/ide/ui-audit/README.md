# UI Audit

This folder contains a small Playwright-based UI audit tool that:

- Captures screenshots for a list of pages (`pages.json`).
- Runs axe-core accessibility checks (via CDN) and writes a JSON results file per page.

Usage (local):

1. Make sure Playwright is installed in the repository (the project already includes Playwright in many places). If not, install it locally: `npm install -D playwright`.

2. Start your app locally (for example `npm start` or the local dev server) so the pages are available.

3. Run the audit:

```powershell
PS> node tools/ide/ui-audit/run_audit.js --baseUrl http://localhost:3000
```

Output:

- `tools/ide/ui-audit/output/*.png` - screenshots captured
- `tools/ide/ui-audit/output/*-axe.json` - axe results per page
- `tools/ide/ui-audit/output/ui-audit-report.json` - small summary report

Notes and limitations:

- The script injects `axe-core` from a CDN at runtime (best-effort). CI environments with restricted egress may block this and axe checks will fail. If needed, add `axe-core` to repo dependencies and change the script to load local bundle.
- The default `pages.json` contains placeholder routes. Update it to match your real app routes before running.
