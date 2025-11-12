Playwright E2E (manual run)
----------------------------

This folder contains a scaffold for a Playwright test that can open a browser to a running Theia frontend and perform a quick smoke-test:

- set window.__LLM_MOCK_URL in the Theia page
- open the provider configuration UI and add a provider
- open chat UI and send a prompt
- verify the mock received /api/llm/usage events

How to run (locally):

1) Install Playwright (recommended in this folder):

   npm init -y
   npm i -D playwright
   npx playwright install

2) Start your Theia frontend (dev server) and ensure it's accessible at http://localhost:3000 (adjust the test if different)

3) Start the mock server:

   cd tools/llm-mock
   node server.js

4) Run the test (adjust URL via env vars or edit the test):

   THEIA_URL=http://localhost:3000 MOCK_URL=http://localhost:8010/api npx playwright test --config=playwright.config.ts

If this repository doesn't include a `playwright.config.*` with a `chromium` project, run the specific test file instead:

   THEIA_URL=http://localhost:3000 MOCK_URL=http://localhost:8010/api npx playwright test playwright/test.spec.ts

You can also export those env vars in PowerShell like:

   $env:THEIA_URL='http://localhost:3000'; $env:MOCK_URL='http://localhost:8010/api'; npx playwright test --config=playwright.config.ts

Notes:
- The test is a scaffold; selectors and UI flows depend on your Theia build. Update selectors in `test.spec.ts` accordingly.
- If you want, I can fill the test with precise selectors once you point to the Theia app URL and confirm the provider UI selectors.
