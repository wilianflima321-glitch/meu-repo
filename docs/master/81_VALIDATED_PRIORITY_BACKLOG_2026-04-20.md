# 81_VALIDATED_PRIORITY_BACKLOG_2026-04-20
Date: 2026-04-20
Status: ACTIVE
Purpose: Registrar, sem deriva e sem inflar claims, o que da auditoria end-to-end realmente confere no repositório atual e qual é a prioridade operacional a partir daqui.

## Executive Summary
- A auditoria de 2026-04-20 está **parcialmente alinhada** com o estado real do repositório.
- O diagnóstico macro continua correto: design system ainda drifta, os god components ainda são o maior gargalo do produto, colaboração/preview ainda não fecharam o loop end-to-end, testes e i18n continuam muito atrás do necessário.
- Alguns números e algumas conclusões do texto já estão **desatualizados ou otimistas demais** para o estado atual do código.
- Este documento é a referência de priorização factual até novo refresh.

## Factual Snapshot Verified On 2026-04-20
- Git tracked files: `5453`
- Git tracked size: `53.01 MB`
- On-disk workspace size after installed dependencies: `2082.77 MB`
- `cloud-web-app/web/app/**/page.tsx`: `80`
- `cloud-web-app/web/app/api/**/route.ts`: `320`
- `cloud-web-app/web/components/**/*.tsx`: `304`
- `cloud-web-app/web/lib/**/*.ts`: `363`
- `cloud-web-app/web/app/admin/**/page.tsx`: `46`
- `docs/master/*`: `101`
- `AETHEL_INTERFACE_BLUEPRINTS/*`: `17`
- `cloud-web-app/web/public/locales/en/*.json` top-level keys: `20`
- `cloud-web-app/web/public/locales/pt-BR/*.json` top-level keys: `12`
- `cloud-web-app/web/tsconfig.json`: `"strict": true`, `"noImplicitAny": false`
- `cloud-web-app/web/jest.config.ts`: `collectCoverage: false`

## Audit Claims That Still Match Reality
- The product thesis is coherent: Studio + Workbench + AI + Preview + Billing + Admin under a single shell direction.
- The repo is no longer bloated with vendored forks and duplicate component names have been cleaned.
- `cloud-web-app/web/app/api/**` is a large, real platform surface with advanced families like `mcp`, `agents/stream`, `collaboration/rooms`, `lsp`, `render/jobs`, `feature-flags`, `audit`, `usage/status`.
- `components/ide/FullscreenIDE.tsx` and `components/ide/AIChatPanelPro.tsx` are still the two main structural risks.
- Admin is still too large at `46` pages.
- Tests are still materially insufficient relative to product surface.
- i18n is still materially insufficient.
- Collaboration UI primitives now exist, but the UX is still not fully integrated in the editor shell.
- The anti-fake-success policy remains a real differentiator and is enforced by QA scripts.

## Audit Claims That Need Correction Or Downgrading
- "503 MB repo" does **not** match the current tracked repository.
  - Current tracked repository size is `53.01 MB`.
  - Any larger number is likely mixing tracked source with `node_modules`, build output, caches or local installs.
- "0 hardcoded hex colours" does **not** match a broad grep of tracked component code.
  - Broad grep still finds many raw hex color usages in tracked TSX files, especially editor/engine-style components.
  - Example family still containing many raw hex values: `cloud-web-app/web/components/audio/SoundCueEditor.tsx`.
- "Storybook ready" should be treated as **seeded / partially integrated**, not complete.
  - Storybook is now installed and typechecked.
  - Static build still fails and needs a builder/runtime compatibility pass.
- "Collaboration UI shipped" is only **partially true**.
  - `useCollaborationAwareness`, `CollaboratorsBar`, and `RemoteCursorLayer` exist.
  - They are not yet fully wired into the central workbench/editor experience as a visible default flow.
- "15+ aspirational routes visible" is **stale** as phrased.
  - Current scan shows only `5` `page.tsx` files under `20` lines.
  - However, short entry wrappers still exist and route maturity still needs curation.

## Current Structural Risks
### P0
- `cloud-web-app/web/components/ide/FullscreenIDE.tsx` is still `1697` lines.
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx` is still `1694` lines.
- `cloud-web-app/web/tsconfig.json` still has `"noImplicitAny": false`.
- `git grep ': any'` over tracked web TS/TSX still returns `1098` matches.
- `cloud-web-app/web/jest.config.ts` still has `collectCoverage: false`.
- Storybook static build is still failing even after dependency integration.

### P1
- Broad grep still finds `810` raw hex matches across tracked component TS/TSX files.
- `git grep 'console\\.'` over tracked files still returns `399` matches in `lib` and `169` in `components`.
- Admin remains oversized at `46` page surfaces.
- Current short page wrappers still exist in:
  - `cloud-web-app/web/app/page.tsx`
  - `cloud-web-app/web/app/(auth)/login/page.tsx`
  - `cloud-web-app/web/app/(auth)/register/page.tsx`
  - `cloud-web-app/web/app/dashboard/page.tsx`
  - `cloud-web-app/web/app/ide/page.tsx`

### P2
- i18n key depth is still too shallow to support a premium global-first product.
- Collaboration presence primitives are present, but not yet a default signature UX.
- Preview is still not validated as a reliable public/shareable workflow.

## Verified Collaboration State
- Present:
  - `cloud-web-app/web/hooks/useCollaborationAwareness.ts`
  - `cloud-web-app/web/components/collaboration/CollaboratorsBar.tsx`
  - `cloud-web-app/web/components/collaboration/RemoteCursorLayer.tsx`
  - tests and stories for these primitives
- Not yet verified as complete:
  - default rendering inside the active workbench/editor shell
  - project-wide presence dots in file tree
  - full shared editing loop with visible remote cursors in the primary editing experience

## Verified Test State
- Tracked tests currently found: `16`
- This is better than older snapshots that cited `12`, but it is still far from acceptable given product scope.

## Verified Design-System State
- `qa:design-system-consistency`: currently passing
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
2. Make Storybook truthful and green:
   - keep typecheck green
   - fix static build
   - only then call it production-ready
3. Turn off implicit drift in TypeScript:
   - move toward `noImplicitAny: true`
   - reduce `: any` from `1098`
4. Restore observability discipline:
   - continue `console.*` -> structured logger migration
5. Finish design-system convergence:
   - remove broad raw hex drift
   - continue replacing legacy visual islands with canonical primitives
6. Expand test pressure:
   - enable coverage
   - raise component, API, and E2E coverage in that order
7. Wire collaboration into the real editor loop
8. Validate preview/deploy as an actually shareable product workflow
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

