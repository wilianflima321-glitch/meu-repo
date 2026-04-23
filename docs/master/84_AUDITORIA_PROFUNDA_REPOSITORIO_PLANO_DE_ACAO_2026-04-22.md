# 84_AUDITORIA_PROFUNDA_REPOSITORIO_PLANO_DE_ACAO_2026-04-22
Date: 2026-04-22
Last refreshed: 2026-04-23
Status: ACTIVE (PRIMARY COMPLEMENTARY AUDIT - REPO + CI/CD + EXECUTION)
Source: preserved from `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/auditoria-profunda-repositorio-plano-de-acao-2026-04-22.pdf`
Synced against current workspace state on `genspark_ai_developer`

## Role In The Canonical Set
This document is the repo-and-execution companion to the product-facing audits.
It does not replace the other audits; it explains where the house under the product is still costly or ambiguous.

Use the current set like this:
1. `82` = direction, benchmark, and product bar
2. `83` = systems, shell, and interfaces
3. `84` = repo, CI/CD, root hygiene, and policy-vs-enforcement
4. `86` = accountability lens on execution-vs-planning
5. `81` = factual guardrail
6. `85` = concise execution scoreboard

## Source Evidence Preserved
- PDF source:
  - `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/auditoria-profunda-repositorio-plano-de-acao-2026-04-22.pdf`
- Rendered preview pages:
  - `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/page-01.png`
  - `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/page-02.png`
  - `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/page-03.png`
  - `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/page-04.png`
  - `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/page-05.png`

## Reconciled Snapshot On 2026-04-23
- Git tracked files: `5512`
- Git tracked size: `60.97 MB`
- `docs/master` direct files: `107`
- `docs/master` recursive files: `131`
- `cloud-web-app/web/app/**/page.tsx` in the current workspace: `81`
- `cloud-web-app/web/app/api/**/route.ts`: `320`
- `cloud-web-app/web/app/admin/**/page.tsx`: `46`
- `cloud-web-app/web/components/**/*.tsx` in the current workspace: `325`
- `cloud-web-app/web/lib/**/*.ts` in the current workspace: `347`
- Curated tracked executable test/spec files: `49`
- Hotspot line counts:
- `FullscreenIDE.tsx`: `565`
- `WorkbenchEditorPane.tsx`: `537`
- `AIChatPanelPro.tsx`: `508`
- `AIChatPanelContainer.tsx`: `116`
- `ModernIDEShell.tsx`: `161`
- `ModernIDEShellPanels.tsx`: `268`
- `ModernIDEShellChrome.tsx`: `211`
- `chromeSecondaryBars.tsx`: `189`
- `XTerminal.tsx`: `506`

## What This Audit Still Gets Right
### Root hygiene still matters
The root still communicates more ambiguity than a premium monorepo should.
Loose runtime, legacy, and test-adjacent files at the root still raise onboarding cost even after improvements.

Important improvement already landed:
- the old dual-Playwright ambiguity is now explicit instead of confusing:
  - `playwright.config.ts` = canonical product E2E
  - `playwright.legacy.config.js` = legacy suite

### Documentation load is real
The critique remains valid:
- `docs/master` is strong but crowded
- `docs/archive` still carries historical weight
- the project needs a small set of clearly named active documents, not more floating summaries

### Policy-vs-CI improved, but the category is not fully closed
This area has materially improved:
- `qa:enterprise-gate` is directly executed in `.github/workflows/ci.yml`
- the gate now covers billing readiness, preview readiness, lint, and typecheck
- the default PR browser lane now exists through the merge-pressure Playwright suite

What remains open:
- the full Playwright matrix is still not the default required merge pressure
- repo hygiene and build parity still keep CI credibility partially open

### `noImplicitAny: false` is still a real risk
This remains unchanged and is still one of the best repo-level indicators that the platform is not yet fully hardened.

## What Is Now Stale In The Source Audit
### Older repo-size and file-count snapshots
Do not reuse the PDF's older literal repo snapshot as current truth.
Use the refreshed numbers above instead.

### Old giant-file counts
The category remains valid, but the literal numbers in the older PDF are stale.
The workbench monoliths are still too large, but they are materially smaller than the older snapshot claimed.

### "Sentry installed but inert"
This is no longer fair.
Sentry is active, but observability maturity is still incomplete.

### `images.unoptimized: true`
This is no longer current branch truth.
Do not keep auditing it as an active blocker.

## Current Repo/CI Truth
### Merge-pressure browser coverage
- A default PR browser lane now exists.
- It runs `npm run test:e2e:merge` against `tests/e2e/merge-pressure.spec.ts` using `playwright.merge.config.ts`.
- Last documented local Chromium replay: `5 passed`.
- The useful truth is:
  - browser pressure is now real,
  - full-matrix browser pressure is still not the default merge requirement.

### Production build parity
- This remains OPEN.
- The active evidence is still in `cloud-web-app/web/build-latest.log`, `cloud-web-app/web/build-probe-workerthreads-off.log`, and the older `build-probe-*.log` files.
- New mitigation attempts are now part of the repo truth:
  - `cloud-web-app/web/next.config.js` forces `experimental.workerThreads=false`
  - `cloud-web-app/web/components/ClientLayout.tsx` scopes the heavier provider stack to studio routes instead of every public/auth surface
- Current local reruns still did not finish within an extended `15` minute timeout, so the category cannot be promoted.
- Current failure classes include:
  - `<Html> should not be imported outside of pages/_document` for `/404` and `/500`
  - `useContext` null prerender failures across multiple App Router pages such as `/_not-found`, `/login`, `/register`, `/settings`, `/status`, `/terms`, and `/verify-email`
- Probe history already shows that this was not fixed by:
  - a bare root layout
  - removing `app/error.tsx`
  - removing `app/not-found.tsx`
  - adding temporary `pages/_document.tsx`, `pages/404.tsx`, and `pages/500.tsx`
- Current repo-level reading:
  - the simple userland shell-hook leak was mitigated,
  - provider scoping for public/auth versus studio surfaces is tighter,
  - worker-thread concurrency was reduced to improve Windows determinism,
  - but production build parity still cannot be marked solved.

## Repo/Execution Priorities
1. Close the `next build` parity gap.
2. Keep shrinking the remaining workbench monoliths.
3. Reduce root ambiguity and legacy-file drag.
4. Move more Playwright pressure from optional/full-matrix to required/default CI.
5. Continue `console.* -> logger` and `: any` reduction.
6. Keep audits synchronized so repo claims do not drift away from current branch truth.

## Final Reading
`84` should be used whenever the discussion is really about:
- how trustworthy the repo feels
- whether CI enforces what policy promises
- where root/documentation/tooling ambiguity still taxes execution
