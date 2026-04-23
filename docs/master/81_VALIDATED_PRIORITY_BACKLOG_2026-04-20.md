# 81_VALIDATED_PRIORITY_BACKLOG_2026-04-20
Date: 2026-04-20
Last refreshed: 2026-04-22
Status: ACTIVE
Purpose: Registrar, sem deriva e sem inflar claims, o que da auditoria end-to-end realmente confere no repositório atual e qual é a prioridade operacional a partir daqui.

Canonical set reference:
- `docs/master/82_AUDITORIA_V5_AETHEL_ENGINE_DEEP_2026-04-19.md` = rumo principal
- `docs/master/83_AUDITORIA_PROFUNDA_SISTEMAS_INTERFACES_GITHUB_2026-04-22.md` = sistemas e interfaces
- `docs/master/84_AUDITORIA_PROFUNDA_REPOSITORIO_PLANO_DE_ACAO_2026-04-22.md` = repositório, CI/CD e governança operacional

## Executive Summary
- A auditoria de 2026-04-20 está **parcialmente alinhada** com o estado real do repositório.
- O diagnóstico macro continua correto: design system ainda drifta, os god components ainda são o maior gargalo do produto, colaboração/preview ainda não fecharam o loop end-to-end, testes e i18n continuam muito atrás do necessário.
- Alguns números e algumas conclusões dos textos antigos já ficaram **desatualizados** depois do sync com `origin/genspark_ai_developer@5760df694`.
- Este documento é a referência de priorização factual até novo refresh.

## Factual Snapshot Verified On 2026-04-22
- Git tracked files: `5487`
- Git tracked size: `60.91 MB`
- On-disk workspace size after installed dependencies: `2082.77 MB`
- `cloud-web-app/web/app/**/page.tsx`: `80`
- `cloud-web-app/web/app/api/**/route.ts`: `320`
- `cloud-web-app/web/components/**/*.tsx`: `311`
- `cloud-web-app/web/lib/**/*.ts`: `345`
- `cloud-web-app/web/app/admin/**/page.tsx`: `46`
- `docs/master/*`: `106`
- `AETHEL_INTERFACE_BLUEPRINTS/*`: `17`
- `cloud-web-app/web/public/locales/en/*.json` top-level keys: `20`
- `cloud-web-app/web/public/locales/pt-BR/*.json` top-level keys: `12`
- `cloud-web-app/web/tsconfig.json`: `"strict": true`, `"noImplicitAny": false`
- `cloud-web-app/web/jest.config.ts`: `collectCoverage: process.env.CI === 'true' || process.env.COVERAGE === '1'`
- `cloud-web-app/web/lighthouserc.js`: present
- `cloud-web-app/web/prisma/migrations/`: seeded with `migration_lock.toml` + `MIGRATIONS.md`
- root orphan candidates still visible: `20`
- `cloud-web-app/web/scripts/interface-critical-gate.mjs`: green again with `blocking-browser-dialogs=0`

## Audit Claims That Still Match Reality
- The product thesis is coherent: Studio + Workbench + AI + Preview + Billing + Admin under a single shell direction.
- The repo is no longer bloated with vendored forks and duplicate component names have been cleaned.
- The recent GitHub branch sweep removed a large dead-code island from `cloud-web-app/web/lib/**`.
- `cloud-web-app/web/app/api/**` is a large, real platform surface with advanced families like `mcp`, `agents/stream`, `collaboration/rooms`, `lsp`, `render/jobs`, `feature-flags`, `audit`, `usage/status`.
- `components/ide/FullscreenIDE.tsx` and `components/ide/AIChatPanelPro.tsx` are still the two main structural risks.
- The latest refactor wave already extracted bounded responsibilities out of the two monoliths:
  - `cloud-web-app/web/components/ai-chat/useChatContextPreviews.ts`
  - `cloud-web-app/web/components/ide/fullscreen/useWorkbenchFullAccess.ts`
- The current canonical audit set is now explicitly four-part:
  - `82` = direction
  - `83` = systems/interfaces
  - `84` = repository/CI/CD/governance
  - `81` = factual guardrail
- Admin is still too large at `46` pages.
- Tests are still materially insufficient relative to product surface.
- i18n is still materially insufficient.
- Collaboration UI primitives now exist, header-level presence is visible in the workbench shell, and remote cursor overlays are now wired into the Monaco editing surfaces.
- The anti-fake-success policy remains a real differentiator and is enforced by QA scripts.
- `qa:enterprise-gate` now includes billing readiness, preview readiness, lint, and typecheck, and the main CI workflow executes it directly again.

## Audit Claims That Need Correction Or Downgrading
- "503 MB repo" does **not** match the current tracked repository.
  - Current tracked repository size is `53.01 MB`.
  - Any larger number is likely mixing tracked source with `node_modules`, build output, caches or local installs.
- "0 hardcoded hex colours" does **not** match a broad grep of tracked component code.
  - Broad grep still finds many raw hex color usages in tracked TSX files, especially editor/engine-style components.
  - Example family still containing many raw hex values: `cloud-web-app/web/components/audio/SoundCueEditor.tsx`.
- "Storybook seeded but not working" is now stale.
  - Storybook is installed, typechecked, and `storybook:build` is currently passing after the Vite migration.
  - The truthful status now is: `working component lab, still early in coverage breadth`.
- "Collaboration UI shipped" is only **partially true**.
  - `useCollaborationAwareness`, `CollaboratorsBar`, and `RemoteCursorLayer` exist.
  - Workbench header presence is now visible.
  - Remote cursor rendering is now wired into the primary Monaco editing flow.
  - What is still missing is the fully shared editing loop: file-tree presence, text-sync confidence, and wider production proving.
- "15+ aspirational routes visible" is **stale** as phrased.
  - Current scan shows only `5` `page.tsx` files under `20` lines.
  - However, short entry wrappers still exist and route maturity still needs curation.

## Current Structural Risks
### P0
- `cloud-web-app/web/components/ide/FullscreenIDE.tsx` is now down to about `788` lines, but it is still a P0 because it remains the main workbench orchestrator.
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx` is now down to about `549` lines, but it is still a P0 because it still carries too many user-facing flows in one shell.
- `cloud-web-app/web/tsconfig.json` still has `"noImplicitAny": false`.
- tracked `: any` usage in web TS/TSX is still around `1059`.
- coverage pressure exists now, but the suite is still far too small for the surface area.
- collaboration is now visible inside the primary editor canvas, but it is still not a fully proven shared-editing signature path.
- the branch is typechecking again only after restoring a minimal active compatibility surface for `lib/index.ts` and `lib/sequencer-cinematics.ts`.
- CI policy-vs-enforcement improved materially:
  - `qa:enterprise-gate` is now executed directly in `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\.github\workflows\ci.yml`
  - branch protection wording was updated to match actual enforcement semantics
- Remaining CI gap is narrower now:
  - default PR browser pressure now exists through a curated Chromium merge-pressure suite
  - that lane is isolated in `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\playwright.merge.config.ts`
  - the full Playwright matrix is still manual rather than required merge pressure

### P1
- Broad grep still finds roughly `1305` raw hex matches across tracked component TS/TSX files.
- tracked `console.*` still returns roughly `426` matches in `lib` and `172` in `components`.
- Admin remains oversized at `46` page surfaces.
- Root hygiene still needs a cleanup pass over loose files, but the ambiguous dual Playwright config state was resolved:
  - `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\playwright.config.ts` = canonical product E2E
  - `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\playwright.legacy.config.js` = legacy mock/backend suite
- Current short page wrappers still exist in:
  - `cloud-web-app/web/app/page.tsx`
  - `cloud-web-app/web/app/(auth)/login/page.tsx`
  - `cloud-web-app/web/app/(auth)/register/page.tsx`
  - `cloud-web-app/web/app/dashboard/page.tsx`
  - `cloud-web-app/web/app/ide/page.tsx`

### P2
- i18n key depth is still too shallow to support a premium global-first product.
- Collaboration presence is now visible in the editor canvas, but it still lacks file-tree presence and a fully proven shared-text path.
- Preview is still not validated as a reliable public/shareable workflow.

## Verified Collaboration State
- Present:
  - `cloud-web-app/web/hooks/useCollaborationAwareness.ts`
  - `cloud-web-app/web/components/collaboration/CollaboratorsBar.tsx`
  - `cloud-web-app/web/components/collaboration/RemoteCursorLayer.tsx`
  - `cloud-web-app/web/components/ide/fullscreen/useWorkbenchRealtimeCollaboration.ts`
  - tests and stories for these primitives
  - header-level presence integration in:
    - `cloud-web-app/web/components/ide/ModernIDEShell.tsx`
    - `cloud-web-app/web/components/ide/FullscreenIDE.tsx`
  - editor-canvas remote cursor integration in:
    - `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorPane.tsx`
    - `cloud-web-app/web/lib/yjs-collaboration.ts`
- Not yet verified as complete:
  - project-wide presence dots in file tree
  - full shared editing loop with conflict-free text sync as the default path
  - wider production/runtime verification of realtime collaboration connectivity

## Verified Workbench Refactor State
- `cloud-web-app/web/components/ide/fullscreen/useWorkbenchFullAccess.ts` remains active and is now joined by:
  - `cloud-web-app/web/components/ide/fullscreen/useWorkbenchChrome.ts`
  - `cloud-web-app/web/components/ide/fullscreen/useWorkbenchFiles.ts`
- `cloud-web-app/web/components/ai-chat/useChatContextPreviews.ts` remains active and is now joined by:
  - `cloud-web-app/web/components/ai-chat/AIChatHeader.tsx`
  - `cloud-web-app/web/components/ai-chat/AIChatMessagesPane.tsx`
  - `cloud-web-app/web/components/ai-chat/AIChatActivityDeck.tsx`
  - `cloud-web-app/web/components/ai-chat/AIChatComposer.tsx`
  - `cloud-web-app/web/components/ai-chat/AIChatOpsSidebar.tsx`
  - `cloud-web-app/web/components/ai-chat/presets.ts`
- This means the god-component problem is no longer static:
  - `AIChatPanelPro.tsx` has already crossed under the old 1k-line risk band
  - `FullscreenIDE.tsx` has already shed multiple bounded responsibilities
  - the next large workbench files to watch are now:
    - `cloud-web-app/web/components/ide/ModernIDEShell.tsx` has already fallen to roughly `378` lines
    - the real next shell hotspot is now `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellChrome.tsx` at roughly `657` lines
    - `cloud-web-app/web/components/terminal/XTerminal.tsx` has already fallen to roughly `630` lines
    - the next bounded terminal pieces now live in:
      - `cloud-web-app/web/components/terminal/XTerminalChrome.tsx`
      - `cloud-web-app/web/components/terminal/terminalModels.ts`
      - `cloud-web-app/web/components/terminal/terminalWebSocket.ts`

## Verified Test State
- Tracked tests currently found: `45`
- This is better than older snapshots, but it is still far from acceptable given product scope and `320` API routes.
- The curated merge-pressure suite was also validated locally in a real browser run:
  - `npx playwright install chromium`
  - `npm run test:e2e:merge`
  - current result on the local workstation: `5 passed`
  - important nuance: local replay still depends on the web app already running on `:3000`; the canonical CI lane bootstraps that runtime explicitly before running Playwright
- The local runtime blocker caused by `browserTracingIntegration is not a function` was closed by hardening `cloud-web-app/web/lib/sentry.ts`.
- The previous `useContext` null build blocker is now partially narrowed:
  - all tracked `usePathname()` consumers were removed from the shared shell in favor of `cloud-web-app/web/lib/navigation/use-browser-pathname.ts`
  - this reduces the chance of App Router hook leakage from global providers during prerender
  - full production-build parity still remains open until a complete `next build` finishes successfully end-to-end

## Verified Design-System State
- `qa:design-system-consistency`: currently passing
- `qa:interface-gate`: currently passing again with `blocking-browser-dialogs=0`
- `ThemeToggle` now exists and has tests/stories
- This does **not** mean the whole product is free of raw visual drift.
- The design-system gate is useful, but a broad grep still shows raw hex values in tracked components.
- Therefore the right reading is:
  - gate status = green
  - total visual convergence = incomplete

## Verified Anti-Fake-Success State
- `cloud-web-app/web/scripts/check-no-fake-success.mjs` is present and passing.
- The policy is not marketing-only; it is backed by scripts and explicit capability/contract checks.
- Keep this as a product pillar:
  - explicit capability states
  - no fake green states
  - no "implemented" claims without runtime evidence

## Priority Order (Validated)
1. Slice the two god components:
   - `cloud-web-app/web/components/ide/FullscreenIDE.tsx`
   - `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`
   - keep extracting focused hooks/modules rather than rewriting the shells in one shot
   - once these two stabilize, move the same extraction discipline to:
     - `cloud-web-app/web/components/ide/ModernIDEShell.tsx`
     - `cloud-web-app/web/components/terminal/XTerminal.tsx`
2. Turn preview into a reliable shareable workflow:
   - public/shareable preview is still not a proven end-to-end path
   - preview must become something users can trust, not just something we can demo locally
3. Harden collaboration into a true shared-editing path:
   - remote cursors now exist in the real editor
   - file-tree presence, richer awareness, and shared-text confidence remain the next differentiators
4. Turn the recent structural wins into fully lived product quality:
   - keep Storybook green
   - expand story/test coverage
   - keep the new merge-pressure E2E suite stable enough to remain the default PR browser gate
   - make Lighthouse and coverage gates part of the release pressure, not decoration
   - keep policy and CI aligned as we tighten more required checks
5. Turn off implicit drift in TypeScript:
   - move toward `noImplicitAny: true`
   - reduce `: any` from ~`1059`
6. Restore observability discipline:
   - continue `console.*` -> structured logger migration
7. Finish design-system convergence:
   - remove broad raw hex drift
   - continue replacing legacy visual islands with canonical primitives
8. Expand test pressure:
   - enable coverage
   - raise component, API, and E2E coverage in that order
9. Reduce admin sprawl from `46` pages into canonical areas
10. Upgrade i18n from proof-of-concept to product-grade

## What We Should Not Forget
- Do not treat a green gate as proof that the whole category is solved.
- Do not call Storybook, collaboration, preview, or multiplayer "done" before the end-to-end path is green.
- Do not allow new work to land inside the two god components unless it directly helps extract modules out of them.
- Do not let anti-fake-success regress into optimistic wording.

## Working Rule
If a future audit conflicts with this file:
- prefer measured repository state
- prefer current QA output
- prefer active canonical docs over narrative summaries
