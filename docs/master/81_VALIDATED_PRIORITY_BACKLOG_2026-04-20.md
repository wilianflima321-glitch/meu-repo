# 81_VALIDATED_PRIORITY_BACKLOG_2026-04-20
Date: 2026-04-20
Last refreshed: 2026-04-23
Status: ACTIVE
Purpose: factual anti-fake-success guardrail for the current branch state.

Canonical set reference:
- `docs/master/82_AUDITORIA_V5_AETHEL_ENGINE_DEEP_2026-04-19.md` = primary direction
- `docs/master/83_AUDITORIA_PROFUNDA_SISTEMAS_INTERFACES_GITHUB_2026-04-22.md` = systems and interfaces
- `docs/master/84_AUDITORIA_PROFUNDA_REPOSITORIO_PLANO_DE_ACAO_2026-04-22.md` = repo, CI/CD, and governance
- `docs/master/86_AUDITORIA_V6_SEM_PIEDADE_2026-04-21.md` = accountability and execution-gap lens
- `docs/master/85_EXECUTION_STATUS_MAP_2026-04-22.md` = short execution scoreboard

## Executive Summary
- The older audits still describe the right macro story: design-system drift, workbench shell debt, preview and collaboration still needing end-to-end proof, tests and i18n still materially behind.
- Several literal numbers inside older audits are now stale because the branch has moved: workbench monoliths are smaller, deploy-from-IDE is surfaced, inline AI is wired, and collaboration is visible in the canonical IDE.
- This file is the place where measured repository state wins over narrative summaries.

## Factual Snapshot Verified On 2026-04-23
- Git tracked files: `5512`
- Git tracked size: `60.97 MB`
- `cloud-web-app/web/app/**/page.tsx` in the current workspace: `81`
- `cloud-web-app/web/app/api/**/route.ts`: `320`
- `cloud-web-app/web/app/admin/**/page.tsx`: `46`
- `cloud-web-app/web/components/**/*.tsx` in the current workspace: `325`
- `cloud-web-app/web/lib/**/*.ts` in the current workspace: `347`
- `docs/master/*` direct files: `107`
- `docs/master/**/*` recursive files: `131`
- Curated tracked executable test/spec files: `49`
- `cloud-web-app/web/tsconfig.json`: `"strict": true`, `"noImplicitAny": false`
- Git-grep line counts in the current workspace:
  - `: any`: `1056`
  - raw hex in component TS/TSX: `810`
  - `console.*` in `lib`: `269`
  - `console.*` in `components`: `92`
- Current hotspot line counts:
  - `cloud-web-app/web/components/ide/FullscreenIDE.tsx`: `550`
  - `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`: `508`
  - `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx`: `116`
  - `cloud-web-app/web/components/ide/ModernIDEShell.tsx`: `149`
  - `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellPanels.tsx`: `268`
  - `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellChrome.tsx`: `351`
  - `cloud-web-app/web/components/terminal/XTerminal.tsx`: `506`

## Capability Truth Labels
### PARTIAL
- Onboarding funnel:
  - the flow is real across register -> dashboard -> wizard and is instrumented for first-value,
  - but onboarding state is still not durable enough to call fully solved.
- Canonical inline AI editing:
  - `Cmd/Ctrl+K` wiring, validate/apply/rollback, and project-aware context exist,
  - but runtime/provider readiness still gates the full experience.
- Deploy from IDE:
  - the canonical workbench header now surfaces a deploy action and a deploy status page,
  - but the capability remains environment/readiness gated.
- Preview runtime orchestration:
  - discovery, provision, sync, health, toolbar controls, and fallback flows are real,
  - but managed-runtime readiness is still not consistently proven end to end.

### COMPLETE BASELINE
- Live collaboration baseline:
  - presence, collaborator avatars, project-scoped rooms, and remote cursors are wired in the canonical IDE.
  - Treat reliability promotion, reconnect confidence, shared-text proof, and file-tree presence as still open.
- Enterprise, billing, and operator truth surfaces:
  - billing readiness, operator readiness, and anti-fake-success truth UX are already user-facing and should be audited as shipped.

## Claims That Still Match Reality
- The Aethel thesis is coherent: one studio, one workbench, one AI operational layer, one preview lane, one project model.
- Admin is still too large at `46` pages.
- Tests are still too small for the platform surface.
- i18n is still too shallow for a global-first product.
- Storybook is working and useful, but still early in story breadth.
- The default PR browser lane now exists and is useful, but it is not the full Playwright matrix.
- The anti-fake-success policy is real and backed by scripts and runtime-truth surfaces.

## Claims That Need Downgrade Or Correction
- Do not use older repo-size claims like `503 MB` or similar tracked-source numbers from older snapshots. The current tracked repo is `60.97 MB`.
- Do not describe collaboration as absent. Baseline IDE collaboration is shipped; reliability and wider proof are the unfinished part.
- Do not describe deploy as backend-only anymore. The IDE now surfaces deploy and deploy-status UX, but the capability is still readiness gated.
- Do not describe inline AI editing as a dark feature with no trigger. It is now wired, but still partial because runtime/provider readiness can block it.
- Do not describe Storybook as seeded-but-broken. It is working, but not broad enough to count as full design-system coverage.
- Do not describe `AIChatPanelContainer.tsx` as a remaining god component. It is now a thin orchestrator after extracting session context, provider preflight, send pipeline, and session banner modules.

## Production Build Parity Status
- `next build` is still OPEN.
- The latest evidence remains in `cloud-web-app/web/build-latest.log`, `cloud-web-app/web/build-probe-workerthreads-off.log`, plus the older `build-probe-*.log` files.
- Additional mitigations landed on `2026-04-23`:
  - `cloud-web-app/web/next.config.js` now forces `experimental.workerThreads=false`
  - `cloud-web-app/web/components/ClientLayout.tsx` now keeps public/auth surfaces on a lighter provider stack while studio-only providers stay scoped to studio routes
- Current reruns still do not justify closure:
  - repeated local `next build` probes still failed to finish within an extended `15` minute timeout
  - the last fully actionable error log still points to prerender failures around `/404`, `/500`, `/_not-found`, `/login`, `/register`, `/settings`, `/status`, `/terms`, and `/verify-email`
  - a fresh probe after restoring globally stable app providers no longer reproduced those explicit `<Html>` / `useContext` errors before timing out, which is promising but still not enough to mark parity closed
- The active failure classes are:
  - `Error: <Html> should not be imported outside of pages/_document.` while prerendering `/404` and `/500`
  - `TypeError: Cannot read properties of null (reading 'useContext')` while prerendering routes such as `/_not-found`, `/login`, `/register`, `/settings`, `/status`, `/terms`, and `/verify-email`
- Multiple probes already ruled out simple userland explanations:
  - bare `app/layout.tsx`
  - removing `app/error.tsx`
  - removing `app/not-found.tsx`
  - adding temporary `pages/_document.tsx`, `pages/404.tsx`, and `pages/500.tsx`
- Therefore the current truthful read is:
  - App Router hook leakage was mitigated in shared shell code,
  - globally stable app providers were restored in `cloud-web-app/web/components/ClientLayout.tsx` while studio-only UX stayed gated in a smaller enhancement layer,
  - worker-thread concurrency was reduced for Windows build determinism,
  - but full production build parity is still blocked and should not be marked solved.
- Current highest-value suspects to isolate next:
  - `cloud-web-app/web/app/layout.tsx`
  - `cloud-web-app/web/components/ClientLayout.tsx`
  - `cloud-web-app/web/lib/a11y/accessibility.tsx`
  - `cloud-web-app/web/contexts/ThemeContext.tsx`
  - `cloud-web-app/web/components/ui/toast-system.tsx`

## Priority Order (Validated)
1. Close production build parity without regressing the current browser merge-pressure lane.
2. Continue slicing the remaining workbench hotspots:
   - `cloud-web-app/web/components/ide/FullscreenIDE.tsx`
   - `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`
   - `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellChrome.tsx`
   - `cloud-web-app/web/components/terminal/XTerminal.tsx`
3. Turn preview + deploy into a trustworthy shareable workflow.
4. Promote collaboration from baseline presence/cursors to full shared-editing confidence and file-tree presence.
5. Keep moving `console.*` to structured logging.
6. Push toward `noImplicitAny: true` and shrink the `: any` inventory.
7. Finish design-system convergence and remove broad raw-hex drift.
8. Expand tests and coverage pressure.
9. Reduce admin sprawl.
10. Upgrade i18n from proof-of-concept to product-grade.

## Working Rule
If a future audit conflicts with this file:
- prefer measured repository state
- prefer current QA output
- prefer active canonical docs over narrative summaries
