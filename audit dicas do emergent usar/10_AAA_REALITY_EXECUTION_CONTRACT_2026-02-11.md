# 10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11
Status: EXECUTABLE CONTRACT  
Date: 2026-02-11  
Owner: Multi-agent internal review (Product, UX, Frontend, Backend, AI, Infra, PM, Competitive, AAA tools)

## 0. Scope and Source of Truth
This contract is the continuation of the canonical audit folder and is written to be directly executable by another AI/engineer.

Primary canonical sources:
- `meu-repo/audit dicas do emergent usar/00_FONTE_CANONICA.md`
- `meu-repo/audit dicas do emergent usar/00_REALITY_MATRIX_2026-02-04.md`
- `meu-repo/audit dicas do emergent usar/FULL_AUDIT.md`
- `meu-repo/audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md`
- `meu-repo/audit dicas do emergent usar/LIMITATIONS.md`
- `meu-repo/audit dicas do emergent usar/COMPETITIVE_GAP.md`
- `meu-repo/audit dicas do emergent usar/WORKBENCH_SPEC.md`
- `meu-repo/audit dicas do emergent usar/AI_SYSTEM_SPEC.md`
- `meu-repo/audit dicas do emergent usar/EXECUTION_PLAN.md`
- `meu-repo/audit dicas do emergent usar/8_ADMIN_SYSTEM_SPEC.md`
- `meu-repo/audit dicas do emergent usar/9_BACKEND_SYSTEM_SPEC.md`
- `meu-repo/audit dicas do emergent usar/Relatorio_de_Continuacao_Auditoria_Multi-Agente.md`

Implementation evidence also verified in codebase to avoid fake status.

Master contract policy:
- This file is the only execution contract to be updated.
- `11_WEB_USER_OWNER_TRIAGE_2026-02-11.md` and `12_INTERFACE_SYSTEMS_REFACTOR_CONTRACT_2026-02-11.md` are archived into this file.
- No parallel execution contract should be created while this file is active.

## 0.1 Delta Update 2026-02-13 (Critical Sweep)
Implemented in code:
- Workbench now uses non-blocking dialogs for create/rename/delete/open folder/open file (`app/ide/page.tsx`), replacing browser blocking dialogs.
- Explorer context menu rename now routes through Workbench dialog flow (`components/ide/FileExplorerPro.tsx`).
- Workbench panel fallback states are explicit capability gates with milestone tags (`components/ide/IDELayout.tsx`).
- Admin layout now scopes a unified dark compact theme override (`app/admin/layout.tsx` + `app/globals.css`).
- Admin page class tokens were migrated in batch to dark compact equivalents (`app/admin/**/*.tsx`).
- New automated interface debt scan added:
  - script: `cloud-web-app/web/scripts/interface-critical-scan.mjs`
  - command: `npm run qa:interface-critical`
  - report: `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`

Measured by scan (`2026-02-13`):
- `legacy-accent-tokens`: 610 (HIGH)
- `admin-light-theme-tokens`: 0 (HIGH -> resolved in admin scope)
- `blocking-browser-dialogs`: 8 (MEDIUM, down from 14)
- `not-implemented-ui`: 10 (INFO)

Execution stance:
- Keep removing high-severity visual drift before adding new feature surfaces.
- No "studio-level complete" claim while high-severity counts remain at current levels.

## 0.2 Delta Update 2026-02-16 (P0 hardening pass)
Implemented in code:
- Removed remaining API `TODO` markers in critical routes and replaced with explicit operational state:
  - `cloud-web-app/web/app/api/notifications/route.ts` now returns `realtimeDispatch: { delivered: false, reason: 'WEBSOCKET_DISPATCH_DEFERRED' }`.
  - `cloud-web-app/web/app/api/assets/[id]/confirm/route.ts` now returns `postProcessing: { queued: false, reason: 'JOB_QUEUE_NOT_CONFIGURED' }`.
- Reduced `NOT_IMPLEMENTED` literals in UI surfaces by replacing visible labels with explicit capability-gate language:
  - `cloud-web-app/web/components/ide/IDELayout.tsx`
  - `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx`
  - `cloud-web-app/web/components/marketplace/CreatorDashboard.tsx`

Measured with local grep sweep (no full gate run in this pass):
- `todo_api=0` (`rg "TODO" cloud-web-app/web/app/api`)
- `not_impl_api=6` (all references in API contracts, not UI copy)
- `deprecated_route_refs=4` (compatibility routes remain phase-gated)

Additional hardening in the same pass:
- Connected operational events into Workbench shell:
  - `aethel.workspace.openRecent` handled in `cloud-web-app/web/app/ide/page.tsx`
  - `aethel.problems.openLocation` handled end-to-end with editor reveal event
  - `aethel.editor.revealLocation` consumed in `cloud-web-app/web/components/editor/MonacoEditorPro.tsx`
- Removed remaining `TODO` markers in `app/components/lib` scope:
  - `rg "TODO" cloud-web-app/web/app cloud-web-app/web/components cloud-web-app/web/lib` -> no matches

Validation snapshot after this pass (`cloud-web-app/web`):
- `cmd /c npm run lint` -> PASS (0 warnings)
- `cmd /c npm run typecheck` -> PASS
- `cmd /c npm run qa:interface-gate` -> PASS (`not-implemented-ui=5`)
- `cmd /c npm run qa:route-contracts` -> PASS
- `cmd /c npm run build` -> FAIL (`spawn EPERM` in restricted environment)

## 0.3 Delta Update 2026-02-17 (Benchmark absorption + strict PR governance)
Policy locked:
1. External benchmark reports are accepted only as directional input.
2. Any benchmark claim without canonical evidence must be tagged `EXTERNAL_BENCHMARK_ASSUMPTION`.
3. No benchmark claim can override canonical facts in this folder.

Operational baseline (local evidence):
1. `cmd /c npm run lint` -> PASS (0 warnings)
2. `cmd /c npm run qa:interface-gate` -> PASS
3. `cmd /c npm run qa:route-contracts` -> PASS
4. `cmd /c npm run qa:no-fake-success` -> PASS
5. Interface critical summary (`cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`):
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`
- `not-implemented-ui=6`
- `frontend-workspace-route-usage=0`
- `legacy-editor-shell-usage=0`

Implemented in this delta:
1. `capabilityResponse` now returns canonical `metadata` object while preserving compatibility aliases.
2. Preview panel gained explicit large-payload guardrail:
- inline preview is gated above validated threshold (no fake runtime success for oversized files).
3. Admin security overview now authenticates requests explicitly with bearer token, aligning with backend RBAC contract.
4. CI workflow hardening:
- `cloud-web-app.yml` now executes `qa:no-fake-success`.
5. Interface gate tightened:
- `not-implemented-ui` threshold reduced from `10` to `6` to match current validated baseline.
6. Anti fake-success validator expanded to enforce status contracts for:
- `PAYMENT_GATEWAY_NOT_IMPLEMENTED -> 501`
- `AUTH_NOT_CONFIGURED -> 503`
- `QUEUE_BACKEND_UNAVAILABLE -> 503`

Strict PR policy (no bypass) documented as execution rule:
1. Mandatory checks:
- `lint`
- `typecheck`
- `build`
- `qa:interface-gate`
- `qa:canonical-components`
- `qa:route-contracts`
- `qa:no-fake-success`
- `qa:mojibake`
- `qa:enterprise-gate`
2. No manual override outside incident procedure.
3. Branch protection remains required at repository settings level.
4. Operational reference: `.github/BRANCH_PROTECTION_POLICY.md`.

## 0.4 Delta Update 2026-02-17 (Build runtime hardening)
Implemented in code:
1. `cloud-web-app/web/next.config.js` now normalizes/clears both IPC env families:
- `__NEXT_INCREMENTAL_CACHE_IPC_*`
- `__NEXT_PRIVATE_INCREMENTAL_CACHE_IPC_*`
2. Build execution now uses `experimental.workerThreads=true` with IPC env sanitization to avoid local `spawn EPERM` regressions while preserving gate reliability.
3. Visual regression CI now runs without permissive bypass in core capture/compare steps:
- `.github/workflows/visual-regression-compare.yml` removed `continue-on-error` on Playwright install and compare.
- removed `|| true` from screenshot capture and diff compare commands.
4. UI quality workflows now enforce compiler-quality gates before visual jobs:
- `.github/workflows/ui-audit.yml` adds `lint` + `typecheck` pre-audit.
- `.github/workflows/visual-regression-compare.yml` adds `lint` + `typecheck` pre-compare.

Validation snapshot (this delta):
1. `cmd /c npm run lint` -> PASS (0 warnings)
2. `cmd /c npm run qa:no-fake-success` -> PASS
3. `cmd /c npm run qa:interface-gate` -> PASS (`not-implemented-ui=6`)
4. `cmd /c npm run qa:enterprise-gate` -> PASS (includes build/typecheck/interface/contracts)
5. `cmd /c npm run build` -> PASS (non-blocking warning still appears from Next internal IPC revalidate URL: `localhost:undefined`)

Execution interpretation:
1. Build remains a hard gate in CI and cannot be bypassed in PR.
2. Local `spawn EPERM` no longer blocks this branch under current config.
3. Remaining build warning is tracked as runtime-noise risk (non-blocking), pending deeper root-cause isolation.
4. No fake-success policy and explicit capability contracts remain unchanged.

## 0.5 Delta Update 2026-02-17 (Studio UX hardening + canonical alignment)
Implemented in code:
1. Static-heavy API routes now explicitly opt out of static cache generation where operational data is runtime-scoped:
- `cloud-web-app/web/app/api/exports/metrics/route.ts`
- `cloud-web-app/web/app/api/jobs/stats/route.ts`
- `cloud-web-app/web/app/api/multiplayer/health/route.ts`
2. Multiplayer health route copy/comments were normalized to clean ASCII English to remove encoding drift.
3. Global UX accessibility polish:
- stronger `:focus-visible` ring contrast in `cloud-web-app/web/app/globals.css`;
- `prefers-reduced-motion` safety block to disable non-essential animations for reduced-motion users.
4. PWA manifest was aligned with the single-shell contract:
- `start_url` moved to `/ide`;
- shortcuts now route to `/ide` contexts (`entry=explorer|ai`) in `cloud-web-app/web/app/manifest.ts`.

Validation snapshot (local evidence):
1. `cmd /c npm run qa:interface-gate` -> PASS (`not-implemented-ui=6`)
2. `cmd /c npm run qa:canonical-components` -> PASS
3. `cmd /c npm run qa:route-contracts` -> PASS
4. `cmd /c npm run qa:no-fake-success` -> PASS
5. `cmd /c npm run qa:mojibake` -> PASS (`findings=0`)
6. `cmd /c npm run typecheck` -> PASS
7. `cmd /c npm run build` -> PASS with existing non-blocking Next runtime warning (`revalidateTag` URL noise).

Critical interpretation:
1. Core P0 quality gates stay green.
2. The remaining runtime warning is tracked as framework-level noise and does not change operational readiness gates.
3. `NOT_IMPLEMENTED` remains explicit and limited to known capability gates (AI provider unavailable, render cancel, unsupported payment runtime path).

## 0.6 Delta Update 2026-02-17 (Claude handoff map + runtime runbook)
Implemented in canonical docs:
1. New interface handoff map for external AI refactor execution:
- `audit dicas do emergent usar/18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md`
2. New runtime warning/environment runbook:
- `audit dicas do emergent usar/19_RUNTIME_ENV_WARNING_RUNBOOK_2026-02-17.md`
3. Canonical source index updated to include both docs:
- `audit dicas do emergent usar/00_FONTE_CANONICA.md`

Execution interpretation:
1. Interface ownership and file-level targets are now explicit for parallel UI hardening.
2. Runtime warning handling is formalized without weakening hard quality gates.

## 0.7 Delta Update 2026-02-17 (P1/P2 triage finalized)
Implemented in canonical planning:
1. Final P1/P2 execution list generated from interface surface map:
- `audit dicas do emergent usar/20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17.md`
2. Canonical source list updated:
- `audit dicas do emergent usar/00_FONTE_CANONICA.md`

Execution interpretation:
1. Post-P0 work now has strict ordered priorities and done criteria.
2. This closes ambiguity for next execution wave without changing product scope.

## 1. Executive Reality (No Marketing)
1. Full Unreal parity in browser is not technically feasible with current web limits (WebGL/WebGPU, GPU memory, media pipeline limits).  
   Source: `meu-repo/audit dicas do emergent usar/LIMITATIONS.md`
2. The platform can still beat competitors in integrated workflow: AI-native + Workbench shell + one-click deploy + cloud collaboration.
3. Current repo has substantial implementation, but still has explicit `NOT_IMPLEMENTED`, TODO, mock/in-memory paths, and overlapping systems.
4. "AAA quality everywhere" must be redefined as:
- AAA workflow quality (speed, reliability, UX coherence, AI-assisted production)
- Web-AAA output targets (optimized real-time 3D/media for browser constraints)
- Not "desktop engine raw rendering parity"

## 2. Competitor Decomposition and Win Strategy
## 2.1 Unreal / Unity / Premiere / VS Code / Vergent
What they are better at today:
- Unreal/Unity: native desktop rendering stack, mature editor pipelines, advanced timeline/animation tooling.
- Premiere: pro-grade timeline, color/audio post stack, export ecosystem.
- VS Code: editor performance, extension ecosystem, stable developer ergonomics.
- Vergent/Cursor-class: strong AI coding flow and/or agent workflow.

Where we can be superior:
- Single web-native shell with code + preview + terminal + AI + deploy + collaboration.
- Lower setup friction than desktop-first tools.
- Multi-agent orchestration in the same product context.
- Faster "idea -> running URL" loop for web/game prototypes.

Where we must not over-promise:
- Unreal-equivalent rendering feature depth.
- Full Premiere-equivalent video post pipeline.
- Full plugin/ecosystem parity with VS Code from day 1.

## 3. Current Product Reality (Measured)
Measured from repo scan:
- API routes: `221` (`meu-repo/cloud-web-app/web/app/api`)
- App pages: `87` (`meu-repo/cloud-web-app/web/app`)
- Pages using `WorkbenchRedirect`: `17` (explicitly parked flows)
- Files with `NOT_IMPLEMENTED` in `web` TS/TSX: `25`
- `NOT_IMPLEMENTED` lines in `web` TS/TSX: `36`
- `TODO:` lines in API routes: `16`
- Session-disabled lines (`SESSION_AUTH_DISABLED`): `3`
- Top-level API route families include: `admin(50)`, `ai(19)`, `auth(16)`, `projects(14)`, `files(11)`, `marketplace(10)`, `terminal(8)`, `git(8)`, `health(8)`.

Validation status:
- `cmd /c npm run build` -> PASS
- `cmd /c npm run typecheck` -> PASS
- `cmd /c npm run lint` -> not revalidated in this pass
- `cmd /c npx vitest run` -> not revalidated in this pass

Conclusion:
- Core build and type contracts are currently verified in this environment.
- Features with explicit capability gates (`NOT_IMPLEMENTED`) remain non-shippable until implemented.

## 4. Domain Audit (Parallel Agent Synthesis)
## 4.1 Product and UX
Reality:
- Workbench exists in parts (`/app/ide`, `components/ide/*`) but many flows still redirect to `WorkbenchRedirect`.
- Multiple parallel surfaces remain (`AethelDashboard`, legacy pages, dedicated editor subpages), causing UX fragmentation.

Evidence:
- `meu-repo/cloud-web-app/web/components/ide/WorkbenchRedirect.tsx`
- `meu-repo/cloud-web-app/web/app/*/page.tsx` redirect group (17 pages)
- `meu-repo/cloud-web-app/web/app/ide/page.tsx:398`, `:402`, `:406`, `:410`, `:414`

Decision:
- Keep Workbench as single entry shell for all creation/edit/preview/debug terminal tasks.
- Demote legacy entry pages to launchers, not separate tool surfaces.

## 4.2 Frontend and IDE
Reality:
- Core blocks exist: `IDELayout`, `MonacoEditorPro`, `FileExplorerPro`, `PreviewPanel`, terminal panel.
- `IDELayout` still renders `NOT_IMPLEMENTED` fallback states for sidebar/bottom tabs not wired.
- `FileExplorerPro` has malformed literal `\n` text in rename case, likely breaking TS parse/runtime.
- Multiple command palettes and status bars coexist, increasing inconsistency risk.

Evidence:
- `meu-repo/cloud-web-app/web/components/ide/IDELayout.tsx:562`
- `meu-repo/cloud-web-app/web/components/ide/FileExplorerPro.tsx:333`
- `meu-repo/cloud-web-app/web/components/CommandPalette.tsx`
- `meu-repo/cloud-web-app/web/components/CommandPalettePro.tsx`
- `meu-repo/cloud-web-app/web/components/CommandPaletteUnified.tsx`
- `meu-repo/cloud-web-app/web/components/statusbar/StatusBar.tsx`
- `meu-repo/cloud-web-app/web/components/statusbar/StatusBarPro.tsx`

Decision:
- Enforce one command palette and one status bar contract in Workbench.
- Fix parser/runtime blockers before feature expansion.

## 4.3 Backend and Infra
Reality:
- Strong route surface exists (auth/projects/files/terminal/ai/admin/deploy/export etc).
- Critical parts still mixed between real and simulated paths:
  - Jobs endpoints use mock/in-memory state.
  - Admin websocket health returns hardcoded healthy with TODO.
  - Folder/assets APIs include TODO placeholders pending Prisma schema regen.
- File system is split across two paradigms:
  - Real filesystem runtime (`/api/files/fs`, `/api/files/tree`)
  - DB-backed virtual workspace (`/api/workspace/tree`, `/api/workspace/files`)

Evidence:
- `meu-repo/cloud-web-app/web/app/api/jobs/route.ts`
- `meu-repo/cloud-web-app/web/app/api/jobs/[id]/route.ts`
- `meu-repo/cloud-web-app/web/app/api/jobs/start/route.ts`
- `meu-repo/cloud-web-app/web/app/api/admin/status/route.ts:63`
- `meu-repo/cloud-web-app/web/app/api/projects/[id]/folders/route.ts:45`
- `meu-repo/cloud-web-app/web/app/api/projects/[id]/assets/route.ts:146`
- `meu-repo/cloud-web-app/web/app/api/files/fs/route.ts`
- `meu-repo/cloud-web-app/web/app/api/workspace/tree/route.ts`

Decision:
- Unify file authority model immediately (single source for editor operations).
- Remove fake queue/job behavior from user-facing success paths.

## 4.4 AI and Automation
Reality:
- AI endpoints are implemented with quota/metering patterns.
- If providers are not configured, endpoints return explicit `NOT_IMPLEMENTED` (correct behavior).
- L4/L5 agent stack is partially represented but not validated end-to-end.

Evidence:
- `meu-repo/cloud-web-app/web/app/api/ai/chat/route.ts:92`
- `meu-repo/cloud-web-app/web/app/api/ai/complete/route.ts:105`
- `meu-repo/cloud-web-app/web/app/api/ai/action/route.ts:86`
- `meu-repo/cloud-web-app/web/app/api/ai/inline-edit/route.ts:87`
- `meu-repo/cloud-web-app/web/lib/ai-service.ts`

Decision:
- Keep explicit 501 behavior until provider + validation are live.
- Gate agent mode behind feature flags and approval flow only.

## 4.5 Collaboration and DX
Reality:
- Collaboration libraries and server pieces exist (`yjs`, `y-websocket`, collaboration services/client/panel).
- End-to-end operational proof is still missing in canonical validation logs.

Evidence:
- `meu-repo/cloud-web-app/web/lib/collaboration/collaboration-service.ts`
- `meu-repo/cloud-web-app/web/lib/collaboration/collaboration-manager.ts`
- `meu-repo/cloud-web-app/web/server/websocket-server.ts`
- `meu-repo/cloud-web-app/web/components/collaboration/CollaborationPanel.tsx`

Decision:
- Treat collaboration as P1 verified feature only after load/latency/conflict tests pass.

## 4.6 Business and Market
Reality:
- Canonical docs already define cost risks (AI + compute + infra) and required admin/billing controls.
- Without strict plan limits, scale is financially unsafe.

Evidence:
- `meu-repo/audit dicas do emergent usar/LIMITATIONS.md`
- `meu-repo/audit dicas do emergent usar/8_ADMIN_SYSTEM_SPEC.md`

Decision:
- Tie product growth to cost controls and entitlement enforcement.

## 5. Duplications and Conflicts (Code + Canonical)
Each item includes action:

1) Auth model conflict  
- Signals: JWT-only routes coexist with legacy session assumptions.  
- Evidence: `app/api/auth/sessions/route.ts`, `app/api/auth/sessions/[id]/route.ts`  
- Action: REMOVE session-tracking UX/API surfaces; keep JWT single model.

2) File authority conflict  
- Signals: filesystem runtime and DB virtual tree both active.  
- Evidence: `app/api/files/*` vs `app/api/workspace/*`  
- Action: UNIFY single file authority per Workbench operation path.

3) Terminal runtime conflict  
- Signals: PTY session flow and separate command execution/session models.  
- Evidence: `app/api/terminal/create/route.ts`, `app/api/terminal/execute/route.ts`  
- Action: REFACTOR to one terminal orchestration contract.

4) Command/status UX duplication  
- Signals: multiple palette/status implementations.  
- Evidence: `components/CommandPalette*.tsx`, `components/statusbar/*`, `components/_deprecated/*`  
- Action: UNIFY one production implementation; archive others.

5) Preview and tool entry conflict  
- Signals: many standalone tool routes now redirect to Workbench with `NOT_IMPLEMENTED`.  
- Evidence: 17 pages with `WorkbenchRedirect`  
- Action: REFACTOR routing and nav so all editing tools resolve inside Workbench context only.

6) Mock/simulated job pipeline exposure  
- Signals: job queue endpoints with in-memory/mock states.  
- Evidence: `app/api/jobs/route.ts`, `app/api/jobs/[id]/route.ts`, `app/api/jobs/start/route.ts`  
- Action: REMOVE fake success from user path; return explicit `NOT_IMPLEMENTED` or wire real queue.

## 6. Priority File List (Fix Now)
## 6.1 P0 blockers
- `meu-repo/cloud-web-app/web/components/ide/FileExplorerPro.tsx`
  - Fix malformed rename branch literal `\n` text and type-safe callback contract.
- `meu-repo/cloud-web-app/web/components/ide/IDELayout.tsx`
  - Align prop interface vs usage, remove dead/fallback tabs from production path.
- `meu-repo/cloud-web-app/web/app/ide/page.tsx`
  - Replace placeholder actions with real handlers or explicit disabled state in UI.
- `meu-repo/cloud-web-app/web/app/api/files/fs/route.ts`
  - Confirm single source model and path safety for all CRUD actions.
- `meu-repo/cloud-web-app/web/app/api/files/tree/route.ts`
  - Align with same source model chosen for file operations.
- `meu-repo/cloud-web-app/web/app/api/workspace/tree/route.ts`
  - Merge/deprecate according to unified file model decision.
- `meu-repo/cloud-web-app/web/app/api/workspace/files/route.ts`
  - Merge/deprecate according to unified file model decision.

## 6.2 P1 integrity fixes
- `meu-repo/cloud-web-app/web/app/api/jobs/route.ts`
- `meu-repo/cloud-web-app/web/app/api/jobs/[id]/route.ts`
- `meu-repo/cloud-web-app/web/app/api/jobs/start/route.ts`
  - Replace in-memory/mock workflow with real queue-backed implementation or explicit not-implemented.

- `meu-repo/cloud-web-app/web/app/api/projects/[id]/folders/route.ts`
  - Remove placeholder folder data; wire persistent model after Prisma regenerate/migration.

- `meu-repo/cloud-web-app/web/app/api/projects/[id]/assets/route.ts`
  - Remove TODO field fallbacks and align schema fields with persisted asset model.

- `meu-repo/cloud-web-app/web/app/api/admin/status/route.ts`
  - Implement real websocket health probe.

## 7. Missing Files Needed to Close Contract (Create)
These files do not need new product scope; they operationalize already-approved specs:

1. `meu-repo/cloud-web-app/web/docs/contracts/workbench-ui-contract.md`
- Canonical UI contract extracted from `WORKBENCH_SPEC.md` for implementation checks.

2. `meu-repo/cloud-web-app/web/docs/contracts/ai-l1-l3-contract.md`
- API + UX behavior contract extracted from `AI_SYSTEM_SPEC.md`.

3. `meu-repo/cloud-web-app/web/docs/contracts/filesystem-authority-decision.md`
- Single-source decision record: filesystem runtime vs DB virtual tree.

4. `meu-repo/cloud-web-app/web/docs/contracts/no-fake-success-policy.md`
- Uniform response policy for not-yet-wired flows (`NOT_IMPLEMENTED`, status codes, UX state).

5. `meu-repo/cloud-web-app/web/tests/contracts/workbench-smoke.spec.ts`
- Contract test for Workbench shell load, panels, file open/save, preview refresh.

6. `meu-repo/cloud-web-app/web/tests/contracts/ai-provider-gate.spec.ts`
- Contract test for AI behavior with and without configured providers.

7. `meu-repo/cloud-web-app/web/tests/contracts/no-mock-user-path.spec.ts`
- Fails build if mock/in-memory behavior is exposed on production user endpoints.

## 8. Hard Decisions (Immediate)
REMOVE now:
- Session-tracking UX/API expectations.
- User-facing mock success in jobs/export/build surfaces.
- Deprecated duplicated UI components from active paths.

UNIFY now:
- Workbench shell entry and navigation.
- File authority model.
- Command palette and status bar.
- Preview/HMR pathway.

REFACTOR now:
- IDE layout contracts and panel wiring.
- Terminal API contracts to one runtime model.

## 9. Execution Delta Applied (2026-02-11)
Implemented in codebase (no mock success in these flows):

1) Workbench core hardening
- `meu-repo/cloud-web-app/web/components/ide/FileExplorerPro.tsx`
  - Fixed rename action parser/runtime break.
  - Unified explorer fallback fetch to `POST /api/files/tree` (removed dependence on workspace mock tree path for fallback mode).
- `meu-repo/cloud-web-app/web/components/ide/IDELayout.tsx`
  - Aligned props contract (`onNewFolder`, `onOpenFolder`, command palette/settings hooks).
  - Added keyboard handling for core workbench shortcuts.
  - Wired sidebar/bottom tab states to explicit panels/fallbacks.
- `meu-repo/cloud-web-app/web/app/ide/page.tsx`
  - Added real `workspaceRoot` handling and `Open Folder` flow for workbench context.
  - Removed placeholder-style status wording from primary operations.

2) Queue/job fake-success removal
- `meu-repo/cloud-web-app/web/lib/queue-system.ts`
  - Added queue-backed list/get/cancel/retry APIs and safe stats fallback.
  - Added pause/resume all queues operation.
- Replaced mock endpoints with queue-backed endpoints:
  - `meu-repo/cloud-web-app/web/app/api/jobs/route.ts`
  - `meu-repo/cloud-web-app/web/app/api/jobs/[id]/route.ts`
  - `meu-repo/cloud-web-app/web/app/api/jobs/start/route.ts`
  - `meu-repo/cloud-web-app/web/app/api/jobs/stop/route.ts`
  - `meu-repo/cloud-web-app/web/app/api/jobs/stats/route.ts`
  - `meu-repo/cloud-web-app/web/app/api/jobs/[id]/cancel/route.ts`
  - `meu-repo/cloud-web-app/web/app/api/jobs/[id]/retry/route.ts`

Behavior now:
- If queue backend is unavailable, routes return `QUEUE_BACKEND_UNAVAILABLE` (503), not fake success.
- If auth is not configured, routes return explicit `AUTH_NOT_CONFIGURED` (503).

3) Project folders API truthfulness
- `meu-repo/cloud-web-app/web/app/api/projects/[id]/folders/route.ts`
  - Removed placeholder data writes/reads.
  - Returns explicit `NOT_IMPLEMENTED` (501) with required migration actions.

4) Workspace/file authority convergence
- `meu-repo/cloud-web-app/web/app/api/workspace/tree/route.ts`
- `meu-repo/cloud-web-app/web/app/api/workspace/files/route.ts`
  - Replaced DB-only virtual tree source with filesystem runtime source.
  - Both routes now expose `source: filesystem-runtime` in response for traceability.
- Error/loading/empty states across Workbench.

IMPLEMENT now (P0):
- Workbench stable shell + Monaco + file CRUD + preview + terminal + AI L1-L3 + deploy basic.

DEFER consciously:
- Full plugin ecosystem.
- High-end 3D and full media timeline parity.
- Multi-agent L5 default-on.

DEAD SCOPE:
- "Full Unreal-equivalent engine in browser".
- "Full Premiere-equivalent post-production stack in browser".

## 9. AAA Quality Standard (Practical Definition)
To claim "AAA quality" in this product, all must be true:

Product quality:
- One shell only, no broken route hops.
- Keyboard-first flow, stable latency, explicit system states.

Engineering quality:
- No fake success.
- No conflicting authority systems in critical paths.
- Contract tests covering user-critical workflows.

AI quality:
- Predictable behavior under quota/provider failures.
- Inline/chat/actions integrated in editor context.
- Agent mode gated and auditable.

Infra quality:
- Real health checks.
- Real queue semantics where exposed.
- Cost-aware limits enforced by plan.

## 10. 4-Week / 8-Week Execution Contract
## 10.1 Weeks 1-4 (P0)
- Stabilize Workbench core and remove blockers.
- Resolve file authority duplication.
- Wire real actions for open/run/build/debug or disable with explicit capability flags.
- Finalize AI L1-L3 gateway behavior.
- Deploy basic one-click path with explicit status pipeline.

Exit criteria:
- No `NOT_IMPLEMENTED` in core happy path (`/ide` create/edit/preview/save/run).
- No mock/in-memory behavior in user-facing queue/deploy status.
- Contract tests green for Workbench + AI gate + no-fake-success policy.

## 10.2 Weeks 5-8 (P1)
- Collaboration verification (Yjs awareness, conflict handling, load tests).
- Agent mode approval pipeline (L4) with audit trail.
- Admin cost/usage observability and controls.
- RAG basic context for AI.

Exit criteria:
- Multi-user edit/cursor presence validated under target load.
- Agent runs are approval-gated, reversible, and logged.
- Cost dashboard and rate controls active.

## 11. External GitHub PR Review Status
Remote PR audit was requested but network access to GitHub failed in this environment (`github.com:443 unreachable via proxy`).

Action when network is available:
- Pull PR metadata and classify each PR as: keep / squash / close / revert / cherry-pick.
- Apply same no-fake-success and single-shell policy to every open PR.

## 12. Final Direction
This platform should not chase desktop-engine parity claims.  
It should become the strongest web-native AAA workflow IDE by combining:
- VS Code-grade editing ergonomics
- Replit-grade deploy and cloud loop
- Vergent-grade agent parallelism
- Browser-appropriate 3D/media tooling with explicit technical limits

If this contract is followed strictly, the product can be top-tier in execution quality, integration depth, and production speed without false promises.

## 13. Execution Delta Applied (2026-02-11, UI Studio Pass)
Implemented in codebase:

1) Global provider and auth/2FA build stability
- `meu-repo/cloud-web-app/web/components/ClientLayout.tsx`
  - Added `ToastProvider` at global layout level so `useToast` no longer fails in pages/components.
- `meu-repo/cloud-web-app/web/app/api/auth/2fa/route.ts`
  - Removed `bcrypt` runtime require and standardized password check on `bcryptjs` (already used in auth stack).

2) Workbench visual refactor (professional shell)
- `meu-repo/cloud-web-app/web/components/ide/IDELayout.tsx`
  - Refined palette to neutral studio look (reduced bright accent noise).
  - Hardened status bar, panel headers, and command controls for consistent docking UX.
  - Updated non-implemented panel copy to explicit milestone message (`NOT_IMPLEMENTED`).

3) Billing and Verify Email UX hardening
- `meu-repo/cloud-web-app/web/app/billing/page.tsx`
  - Rewritten microcopy and card layout for professional billing UX.
  - Removed inflated marketing tone and fixed checkout error handling.
  - Added deterministic currency/token formatting.
- `meu-repo/cloud-web-app/web/app/verify-email/page.tsx`
  - Rewritten full state UX (loading/success/missing-token/error/resend) with clean copy and no mojibake artifacts.

4) Design system and preview alignment
- `meu-repo/cloud-web-app/web/app/globals.css`
  - Rebased primary/accent tokens from violet-heavy to blue/cyan studio palette.
  - Updated focus, button, badge, and progress visual hierarchy.
- `meu-repo/cloud-web-app/web/app/layout.tsx`
  - Added `metadataBase` and aligned theme colors.
- `meu-repo/workbench-preview.html`
  - Rebuilt preview shell with professional visual baseline (no emoji/icon noise, no corrupted text).

5) Build pipeline reliability
- `meu-repo/cloud-web-app/web/next.config.js`
  - Made standalone output opt-in via `NEXT_STANDALONE=1` to avoid local packaging trace failure.

Validation:
- `npm run typecheck` -> PASS
- `npm run build` -> PASS

Remaining warnings (known, non-blocking for compile):
- Missing runtime env vars (`JWT_SECRET`, `UPSTASH_*`) in local build environment.
- Dynamic server usage logs from API routes that read headers/cookies during static generation paths.

## 11) Delta implementado nesta iteracao (marketplace and reliability hardening)
1. Creator marketplace routes that were missing now exist and are wired with JWT auth (`requireAuth`):
- `meu-repo/cloud-web-app/web/app/api/marketplace/creator/stats/route.ts`
- `meu-repo/cloud-web-app/web/app/api/marketplace/creator/assets/route.ts`
- `meu-repo/cloud-web-app/web/app/api/marketplace/creator/revenue/route.ts`
2. Legacy creator routes were refactored from `next-auth` placeholder behavior to explicit production behavior:
- `meu-repo/cloud-web-app/web/app/api/marketplace/creator/categories/route.ts` now computes category distribution from real `MarketplaceItem` records.
- `meu-repo/cloud-web-app/web/app/api/marketplace/creator/sales/recent/route.ts` now returns explicit `NOT_IMPLEMENTED` (`501`) instead of fake empty success.
3. Marketplace catalog endpoint was upgraded from TODO/empty payload to real database query path:
- `meu-repo/cloud-web-app/web/app/api/marketplace/assets/route.ts` now serves filtered/sorted data from `MarketplaceItem`, with explicit partial-data contract and `POST` returning `NOT_IMPLEMENTED`.
4. Admin health route no longer reports fake websocket healthy status:
- `meu-repo/cloud-web-app/web/app/api/admin/status/route.ts` now marks websocket health as `degraded` or `down` based on available runtime signal, until probe is implemented.
5. Workbench UX and professional polish updates:
- `meu-repo/cloud-web-app/web/app/ide/page.tsx` now shows preview stale state and clearer editor empty-state guidance.
- `meu-repo/cloud-web-app/web/components/ide/WorkbenchRedirect.tsx` now uses a cleaner unified-workbench handoff pattern.
- `meu-repo/cloud-web-app/web/app/(auth)/login/page.tsx` now hides dev-access shortcut unless `NEXT_PUBLIC_ENABLE_DEV_ACCESS=1` (non-production only).
- `meu-repo/cloud-web-app/web/app/contact-sales/page.tsx` removed emoji-style iconography in enterprise cards.
- `meu-repo/cloud-web-app/web/app/status/page.tsx` removed celebratory emoji style copy from uptime incidents panel.

Truth contract:
- Features without real backend support now return explicit capability (`NOT_IMPLEMENTED`) instead of silent success.
- Routes with data available in schema now return real queried data.

## 14) Delta implementado nesta iteracao (master consolidation and admin integrity)
1. Contract consolidation (single source execution):
- `00_FONTE_CANONICA.md` updated with master policy:
  - `10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md` is the only active execution contract.
  - `11_WEB_USER_OWNER_TRIAGE_2026-02-11.md` archived into `10`.
  - `12_INTERFACE_SYSTEMS_REFACTOR_CONTRACT_2026-02-11.md` archived into `10`.
2. Archived documents converted to pointer-only files:
- `11_WEB_USER_OWNER_TRIAGE_2026-02-11.md` now only points to `10`.
- `12_INTERFACE_SYSTEMS_REFACTOR_CONTRACT_2026-02-11.md` now only points to `10`.
3. Admin navigation integrity fixes:
- `cloud-web-app/web/app/admin/layout.tsx`
  - `/admin/infra` -> `/admin/infrastructure`
  - `/admin/settings` -> `/admin/ide-settings`
  - badge style condition updated to support `Ao vivo` and `Live`.
- `cloud-web-app/web/app/admin/page.tsx`
  - `/admin/ai-evolution` -> `/admin/ai-upgrades`
  - page copy normalized to avoid text-encoding artifacts.

## 15) Delta implementado nesta iteracao (API gap closure without fake success)
1. Project folders persistence implemented on real schema:
- `cloud-web-app/web/app/api/projects/[id]/folders/route.ts`
  - `GET` now lists persisted folders from Prisma `Folder`.
  - `POST` now creates folders with path normalization and duplicate protection.
  - `DELETE` now supports guarded delete (`recursive=false`) and subtree delete (`recursive=true`).
  - Auth + entitlement + project access checks are enforced in all methods.
2. Marketplace publishing endpoint implemented:
- `cloud-web-app/web/app/api/marketplace/assets/route.ts` (`POST`)
  - Creates `MarketplaceItem` from validated input (`title/name`, `description`, `category`, `price` or `priceCents`).
  - Returns persisted asset payload (no placeholder success).
3. Creator dashboard data endpoints replaced from `NOT_IMPLEMENTED` to real aggregate outputs:
- `cloud-web-app/web/app/api/marketplace/creator/revenue/route.ts`
  - Returns 30-day estimated revenue/download timeline derived from persisted aggregate metrics.
- `cloud-web-app/web/app/api/marketplace/creator/sales/recent/route.ts`
  - Returns recent aggregate sales entries derived from persisted item-level metrics.
4. `NOT_IMPLEMENTED` API gates now reduced to provider-dependent AI only:
- `/api/ai/chat`
- `/api/ai/complete`
- `/api/ai/action`
- `/api/ai/inline-edit`

Validation for this delta:
- `npm run typecheck` -> PASS
- `npm run build` -> PASS

## 17) Delta implementado nesta iteracao (AAA alignment, compact UX, canonical APIs)
1. Workbench compact hardening and codicon unification:
- `cloud-web-app/web/components/ide/Codicon.tsx` created as the canonical icon wrapper for Workbench UI.
- `cloud-web-app/web/components/ide/IDELayout.tsx` migrated from mixed icon usage to codicon classes, compact density (header/panels/footer), keyboard-first focus feedback, and preview refresh shortcut (`Ctrl+Shift+V`).
- `cloud-web-app/web/components/ide/FileExplorerPro.tsx` refactored to compact rows, codicon-only explorer actions, and skeleton loading state.
- `cloud-web-app/web/components/ide/PreviewPanel.tsx` aligned to compact header + codicon controls.
- `cloud-web-app/web/app/globals.css` updated with compact defaults (`12px` base), sharpened typography, explicit focus rings, VS Code-like scrollbar behavior, and codicon font integration.

2. Command palette canonicalization in `/ide`:
- `cloud-web-app/web/components/ide/CommandPalette.tsx` is now the active canonical provider for Workbench.
- Added custom open event contract: `aethel.commandPalette.open`.
- Added provider handlers for `new/save/toggle/AI/settings` integration points.
- Fixed mojibake in visible command palette key hints.
- `cloud-web-app/web/app/ide/page.tsx` now wraps Workbench in `CommandPaletteProvider` and wires `onCommandPalette` in `IDELayout`.

3. Workbench panel gap closure (no fake behavior):
- `cloud-web-app/web/app/ide/page.tsx` now provides real non-mock panel states for `Search`, `Source Control`, `Output`, `Problems`, `Debug`, and `Ports` tabs instead of generic fallback placeholders in the primary IDE flow.

4. Canonical file API enforcement:
- `cloud-web-app/web/app/api/files/tree/route.ts` now returns `source=filesystem-runtime` and `authority=canonical`.
- `cloud-web-app/web/app/api/files/fs/route.ts` now returns canonical authority metadata in success responses.
- `cloud-web-app/web/app/api/workspace/tree/route.ts` deprecated with explicit `410 DEPRECATED_ROUTE` and replacement `/api/files/tree`.
- `cloud-web-app/web/app/api/workspace/files/route.ts` deprecated with explicit `410 DEPRECATED_ROUTE` and replacement `/api/files/fs` (`action=list`).

5. JWT-only session endpoint decommission hardening:
- `cloud-web-app/web/app/api/auth/sessions/route.ts` now returns explicit `DEPRECATED_ROUTE` with `authModel=jwt`.
- `cloud-web-app/web/app/api/auth/sessions/[id]/route.ts` now returns explicit `DEPRECATED_ROUTE` with `authModel=jwt`.

6. Admin shell visual alignment:
- `cloud-web-app/web/app/admin/layout.tsx` active-state palette moved from purple to blue/cyan family and compact nav sizing for cross-shell consistency with Workbench tokens.

7. QA automation and route inventory reliability:
- Added `cloud-web-app/web/scripts/check-canonical-components.mjs` to fail on imports of deprecated palette/statusbar components.
- Added `cloud-web-app/web/scripts/generate-routes-inventory.mjs` for deterministic route metrics.
- Added scripts in `cloud-web-app/web/package.json`:
  - `qa:canonical-components`
  - `docs:routes-inventory`
- Regenerated `cloud-web-app/web/docs/ROUTES_INVENTORY.md` with real counts and current route list.

Validation for this delta:
- `npm run docs:routes-inventory` -> PASS
- `npm run qa:canonical-components` -> PASS
- `npm run typecheck` -> PASS
- `npm run build` -> PASS

## 16) Delta implementado nesta iteracao (payments, checkout and admin triage)
1. Payment gateway configuration moved to explicit admin-owned contract:
- `cloud-web-app/web/app/api/admin/payments/gateway/route.ts`
  - `GET`/`PUT` protected by RBAC (`ops:settings:view`, `ops:settings:edit`).
  - Persists active gateway and checkout policy in canonical settings key `payment.gateway.config`.
- `cloud-web-app/web/lib/server/payment-gateway-config.ts`
  - Single source for gateway config parsing/normalization (no duplicated parsing across routes).
2. Checkout path unified to a single web shell:
- New canonical web checkout page: `cloud-web-app/web/app/billing/checkout/page.tsx`.
- Billing UI now redirects to web checkout shell:
  - `cloud-web-app/web/app/billing/page.tsx` -> `/billing/checkout?plan=...`.
- Added explicit post-checkout pages expected by API:
  - `cloud-web-app/web/app/billing/success/page.tsx`
  - `cloud-web-app/web/app/billing/cancel/page.tsx`
3. IDE local -> web handoff made explicit:
- `cloud-web-app/web/app/api/billing/checkout-link/route.ts`
  - Authenticated endpoint returning canonical web checkout URL.
  - Respects admin policy flags (`checkoutEnabled`, `allowLocalIdeRedirect`).
4. Billing backend hardening and gateway policy enforcement:
- `cloud-web-app/web/app/api/billing/checkout/route.ts`
  - Uses admin gateway config before creating Stripe session.
  - Returns explicit `CHECKOUT_DISABLED` or `PAYMENT_GATEWAY_NOT_IMPLEMENTED` when policy requires.
- `cloud-web-app/web/app/api/billing/portal/route.ts`
  - Unified with Stripe helper (`getStripe`) and canonical app URL resolution.
  - Explicit `STRIPE_NOT_CONFIGURED` behavior when env is missing.
5. Removed fake/memory payment-adjacent behavior:
- `cloud-web-app/web/app/api/marketplace/cart/route.ts`
  - Replaced in-memory `next-auth` cart with persisted JWT-backed storage in `UserPreferences.preferences.marketplaceCart`.
6. Admin auth consistency fix:
- `cloud-web-app/web/lib/rbac.ts`
  - Admin RBAC now accepts `Authorization: Bearer`, `token` cookie, and legacy `auth_token`.
  - Removes mismatch where admin endpoints were protected by token source different from login cookie.
- `cloud-web-app/web/app/api/admin/stats/route.ts`
  - Unified with RBAC wrapper (`withAdminAuth`) and permission contract.

Validation for this delta:
- `npm run typecheck` -> PASS
- `npm run build` -> PASS

## 18) Delta implementado nesta iteracao (hard cleanup de duplicidades + encoding triage)
1. Legacy duplicate UI components removed from active codebase:
- Deleted:
  - `cloud-web-app/web/components/AethelIDE.tsx`
  - `cloud-web-app/web/components/CommandPalette.tsx`
  - `cloud-web-app/web/components/CommandPalettePro.tsx`
  - `cloud-web-app/web/components/CommandPaletteUnified.tsx`
  - `cloud-web-app/web/components/statusbar/StatusBar.tsx`
  - `cloud-web-app/web/components/statusbar/StatusBarPro.tsx`
- Canonical path preserved:
  - `cloud-web-app/web/components/ide/CommandPalette.tsx`
  - status output via `IDELayout` status slot.

2. Anti-duplication QA guard hardened:
- `cloud-web-app/web/scripts/check-canonical-components.mjs`
  - Scope widened to `app`, `components`, `lib`.
  - Detects banned imports for duplicate palette/statusbar modules.

3. Encoding/mojibake triage automation added:
- New script: `cloud-web-app/web/scripts/scan-mojibake.mjs`
- New npm script: `qa:mojibake`
- Report output: `cloud-web-app/web/docs/MOJIBAKE_SCAN.md`
- Current scan result captured: `137` findings after heuristic refinement (tracked for staged cleanup without fake success).

4. Documentation references updated to canonical implementation:
- `cloud-web-app/web/INDICE_DOCUMENTACAO_MASTER.md`
  - Repointed AethelIDE/CommandPalette references to canonical files.
- `cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md`
  - Updated command palette reference to `components/ide/CommandPalette.tsx`.

Validation for this delta:
- `npm run qa:canonical-components` -> PASS
- `npm run qa:mojibake` -> PASS (report generated)
- `npm run docs:routes-inventory` -> PASS
- `npm run typecheck` -> PASS
- `npm run build` -> PASS

## 19) Delta implementado nesta iteracao (command palette canonical + file API hard unification)
1. Command Palette canônica migrada para Codicons e removido acoplamento Lucide:
- `cloud-web-app/web/components/ide/CommandPalette.tsx`
  - Ícones agora seguem `Codicon` wrapper.
  - Mantido contrato de abertura global (`aethel.commandPalette.open`).
  - Corrigido texto de atalhos sem mojibake.

2. `/ide` atualizado para integração limpa de comandos de layout:
- `cloud-web-app/web/app/ide/page.tsx`
  - `onToggleSidebar`, `onToggleTerminal`, `onAIChat` agora disparam eventos de layout dedicados (sem injeção de `KeyboardEvent`).
- `cloud-web-app/web/components/ide/IDELayout.tsx`
  - Adicionados listeners para:
    - `aethel.layout.toggleSidebar`
    - `aethel.layout.toggleTerminal`
    - `aethel.layout.toggleAI`
  - Mantém atalhos VS Code-like e melhora previsibilidade do estado de painel.

3. Unificação real de File API com wrappers de compatibilidade:
- Rotas de compatibilidade migradas para runtime canônico (`filesystem-runtime`) com resposta explícita:
  - `cloud-web-app/web/app/api/files/read/route.ts`
  - `cloud-web-app/web/app/api/files/write/route.ts`
  - `cloud-web-app/web/app/api/files/delete/route.ts`
  - `cloud-web-app/web/app/api/files/create/route.ts`
  - `cloud-web-app/web/app/api/files/move/route.ts`
  - `cloud-web-app/web/app/api/files/copy/route.ts`
  - `cloud-web-app/web/app/api/files/rename/route.ts`
  - `cloud-web-app/web/app/api/files/list/route.ts`
- Todas retornam metadado de compatibilidade:
  - `authority: "canonical"`
  - `compatibilityRoute`
  - `canonicalEndpoint: "/api/files/fs"`
  - header `x-aethel-route-status: compatibility-wrapper`

4. Deprecação explícita de rotas duplicadas workspace/auth session:
- `cloud-web-app/web/app/api/workspace/tree/route.ts`
- `cloud-web-app/web/app/api/workspace/files/route.ts`
- `cloud-web-app/web/app/api/auth/sessions/route.ts`
- `cloud-web-app/web/app/api/auth/sessions/[id]/route.ts`
- Todas respondem `410` com `DEPRECATED_ROUTE` e header `x-aethel-route-status: deprecated`.

Validation for this delta:
- `npm run docs:routes-inventory` -> PASS
- `npm run qa:canonical-components` -> PASS
- `npm run qa:mojibake` -> PASS (`165` findings no inventário atual)
- `npm run typecheck` -> PASS
- `npm run build` -> PASS

## 20) Delta implementado nesta iteracao (admin shell polish + accessibility hardening)
1. Admin shell refatorado para consistencia visual profissional (dense + neutral):
- `cloud-web-app/web/app/admin/layout.tsx`
  - Reescrito com nomenclatura limpa e texto sem encoding corrompido.
  - Sidebar/header/footer compactos alinhados com densidade Workbench.
  - Paleta neutra com acento blue/cyan e sem gradientes decorativos infantis.
  - Labels operacionais padronizados (Dashboard, Finance, Users, AI Monitor, etc).

2. Command Palette com acessibilidade de producao:
- `cloud-web-app/web/components/ide/CommandPalette.tsx`
  - Dialog semantics adicionada: `role="dialog"`, `aria-modal`, `aria-label`.
  - Lista de resultados com `role="listbox"` e itens com `role="option"` + `aria-selected`.
  - Input com `aria-label` explicito.
  - Mantida base codicon e comportamento keyboard-first.

Validation for this delta:
- `npm run typecheck` -> PASS
- `npm run build` -> PASS
- `npm run qa:canonical-components` -> PASS
- `npm run qa:mojibake` -> PASS (`184` findings no inventario global atual)

## 21) Agente Critico oficializado
1. Documento operacional adicionado:
- `audit dicas do emergent usar/13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md`
2. Funcao:
- Estabelecer gate permanente para qualidades e limitacoes reais (P0/P1/P2).
- Exigir decisao executiva por achado: remover, unificar, refatorar, implementar, adiar, nao fazer.
3. Regra de merge:
- Sem evidencia de arquivo/rota/componente + validacao tecnica, achado nao e considerado resolvido.

## 22) Hardening do agente critico (mojibake gate + limpeza objetiva)
1. Scanner de mojibake refinado para reduzir falso positivo:
- `cloud-web-app/web/scripts/scan-mojibake.mjs`
  - Removeu padrao amplo que confundia acentuacao valida com corrupcao.
  - Mantem apenas assinaturas de alta confianca de encoding quebrado.
  - Ignora `docs/MOJIBAKE_SCAN.md` para evitar auto-referencia no relatorio.
2. Correcao de texto corrompido em pagina publica:
- `cloud-web-app/web/app/status/page.tsx`
  - `Â©` substituido por `&copy;`.
3. Estado atual de qualidade:
- `npm run qa:mojibake` -> PASS com `0` findings.
- `npm run typecheck` -> PASS
- `npm run build` -> PASS

## 23) Isolamento de workspace por usuario/projeto (mitigacao P0)
1. Novo resolvedor de escopo:
- `cloud-web-app/web/lib/server/workspace-scope.ts`
  - Define raiz efetiva por namespace: `.aethel/workspaces/<userId>/<projectId>`.
  - Resolve caminhos virtuais com protecao de boundary.
  - Converte caminho absoluto para caminho virtual (`/`-based) para resposta da API.
2. Endpoints canônicos migrados para escopo:
- `cloud-web-app/web/app/api/files/fs/route.ts`
- `cloud-web-app/web/app/api/files/tree/route.ts`
3. Endpoints de compatibilidade `/api/files/*` alinhados ao mesmo escopo:
- `read`, `write`, `delete`, `create`, `move`, `copy`, `rename`, `list`
4. Resultado de contrato:
- File APIs nao retornam mais caminho absoluto de host como contrato principal.
- Respostas passam a expor paths virtuais por workspace.

Validation for this delta:
- `npm run typecheck` -> PASS
- `npm run build` -> PASS
- `npm run qa:canonical-components` -> PASS
- `npm run qa:mojibake` -> PASS
- `npm run docs:routes-inventory` -> PASS

## 24) Compat route telemetry + critica alinhada
1. Instrumentacao de rotas de compatibilidade:
- Novo modulo:
  - `cloud-web-app/web/lib/server/compatibility-route-telemetry.ts`
- Integrado em:
  - `/api/files/read|write|delete|create|move|copy|rename|list`
  - `/api/workspace/tree`
  - `/api/workspace/files`
  - `/api/auth/sessions`
  - `/api/auth/sessions/[id]`
2. Endpoint admin para leitura de uso:
- `cloud-web-app/web/app/api/admin/compatibility-routes/route.ts`
3. Contrato critico atualizado:
- `audit dicas do emergent usar/13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md`
  - Inclui critica executiva atual e backlog de fechamento real.

Critica executiva atual:
- Forte: canonicidade e validacoes estaveis.
- Falta: telemetria ainda in-memory (nao persistente) e wrappers ainda ativos.
- Decisao: manter fase de coleta curta e remover wrappers por uso real.

## 25) Delta implementado nesta iteracao (multi-agente enterprise audit + UX hardening)
1. Plano multi-agente executado sem mudar escopo de negocio:
- Dimensoes auditadas: Produto/UX, Frontend/IDE, Backend/Infra, IA/Automacao, Colaboracao/DX, Negocio/Mercado.
- Entrega mantida em formato "Plano Executavel + Critica" com corte legado faseado.

2. UX bloqueante removido nas superficies criticas:
- `cloud-web-app/web/components/AethelDashboard.tsx`
- `cloud-web-app/web/components/ChatComponent.tsx`
- `cloud-web-app/web/components/git/GitPanel.tsx`
- `cloud-web-app/web/components/extensions/ExtensionManager.tsx`
- `cloud-web-app/web/components/assets/ContentBrowserConnected.tsx`
- Novo utilitario: `cloud-web-app/web/lib/ui/non-blocking-dialogs.ts`

3. Hardening visual aplicado nos top offenders de acento legado:
- Refactor em 20 componentes principais (incluindo os alvos de character/dashboard/physics/settings/debug/extensions/search/onboarding e superficies _deprecated).
- Resultado: queda de `legacy-accent-tokens` de `610` para `314`.

4. Metricas oficiais apos execucao:
- `legacy-accent-tokens`: **314**
- `admin-light-theme-tokens`: **0**
- `blocking-browser-dialogs`: **0**
- `not-implemented-ui`: **10**
- Fonte: `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`

5. Validacao tecnica desta iteracao:
- `npm run qa:interface-critical` -> PASS
- `npm run qa:canonical-components` -> PASS
- `npm run qa:mojibake` -> PASS
- `npm run docs:routes-inventory` -> PASS
- `npm run typecheck` -> PASS
- `npm run build` -> BLOQUEADO no ambiente atual (`spawn EPERM` em worker do Next.js)

6. Decisao executiva mantida:
- Prosseguir com consolidacao enterprise em modo equilibrado.
- Manter deprecacao faseada por telemetria.
- Nao declarar "studio completo" antes de build gate verde em ambiente sem bloqueio e nova reducao de drift visual.

## 26) Delta implementado nesta iteracao (continue hardening + quality gates)
1. Dialogos bloqueantes zerados nas superficies restantes:
- `components/AethelDashboard.tsx`
- `components/ChatComponent.tsx`
- `components/git/GitPanel.tsx`
- `components/extensions/ExtensionManager.tsx`
- `components/assets/ContentBrowserConnected.tsx`
- utilitario novo: `lib/ui/non-blocking-dialogs.ts`

2. Refatoracao visual adicional dos top offenders:
- 20 arquivos priorizados por `INTERFACE_CRITICAL_SWEEP.md` receberam migracao de tokens legados para paleta blue/cyan/sky.
- Inclui tabs de dashboard, onboarding, componentes de editor, notificacoes, cards e superficies `_deprecated` ainda rastreadas pelo scan.

3. Metricas oficiais apos rodada:
- `legacy-accent-tokens`: **176** (antes 314, antes disso 610)
- `admin-light-theme-tokens`: **0**
- `blocking-browser-dialogs`: **0**
- `not-implemented-ui`: **10**

4. Validacao tecnica:
- `npm run qa:interface-critical` -> PASS
- `npm run qa:canonical-components` -> PASS
- `npm run qa:mojibake` -> PASS
- `npm run docs:routes-inventory` -> PASS
- `npm run typecheck` -> PASS
- `npm run build` -> PASS (via captura em `build_out.txt`)

5. Estado executivo:
- Rodada atual conclui meta P0 de UX bloqueante e supera meta de reducao de acento legado.
- Proxima meta recomendada: `legacy-accent-tokens < 120` mantendo zero regressao em admin/dialogs.

## 27) Delta implementado nesta iteracao (continue 2 - enterprise visual convergence)
1. Nova rodada de reducao de drift visual executada por top offenders do sweep:
- Refatoracao aplicada em 40 arquivos adicionais de `app/` e `components/` com maior concentracao de tokens legados.
- Foco: tabs, onboarding, componentes de editor, notificacoes, settings/public pages e superfices auxiliares.

2. Metricas oficiais apos esta rodada:
- `legacy-accent-tokens`: **43** (antes 176, antes disso 314, baseline 610)
- `admin-light-theme-tokens`: **0**
- `blocking-browser-dialogs`: **0**
- `not-implemented-ui`: **10**

3. Validacao tecnica:
- `npm run qa:interface-critical` -> PASS
- `npm run qa:canonical-components` -> PASS
- `npm run qa:mojibake` -> PASS
- `npm run docs:routes-inventory` -> PASS
- `npm run typecheck` -> PASS
- `npm run build` -> PASS (captura em `cloud-web-app/web/build_out.txt`)

4. Estado executivo atualizado:
- Meta P0 de consolidacao visual foi superada com margem.
- Nucleo enterprise manteve regressao zero em dialogs bloqueantes e tema admin.
- Proxima meta recomendada: `legacy-accent-tokens < 20` sem alterar escopo funcional.

## 28) Delta implementado nesta iteracao (continue 3 - zero high-severity visual debt)
1. Rodada final de convergencia visual aplicada nos restantes top offenders do sweep.
2. Ajustes de estabilidade pos-refactor:
- `components/ide/AIAgentsPanelPro.tsx`: removidas chaves duplicadas em mapa de cores e padronizacao de `agent.color`.
- `components/terminal/TerminalProfiles.tsx`: corrigida chave duplicada em objeto `colors`.

3. Metricas oficiais apos esta rodada:
- `legacy-accent-tokens`: **0**
- `admin-light-theme-tokens`: **0**
- `blocking-browser-dialogs`: **0**
- `not-implemented-ui`: **10**

4. Validacao tecnica:
- `npm run qa:interface-critical` -> PASS
- `npm run qa:canonical-components` -> PASS
- `npm run qa:mojibake` -> PASS
- `npm run typecheck` -> PASS
- `npm run build` -> PASS (captura em `cloud-web-app/web/build_out.txt`)

5. Estado executivo:
- Divida visual de severidade alta foi zerada.
- Gate de qualidade P0 agora depende de manter zero regressao e seguir corte legado faseado.

## 29) Delta implementado nesta iteracao (gate defensivo anti-regressao)
1. Novo gate automatizado criado:
- `cloud-web-app/web/scripts/interface-critical-gate.mjs`
- Faz varredura critica e falha se houver regressao em:
  - `legacy-accent-tokens > 0`
  - `admin-light-theme-tokens > 0`
  - `blocking-browser-dialogs > 0`
  - `not-implemented-ui > 10`

2. Comando adicionado ao pacote:
- `npm run qa:interface-gate`

3. Validacao:
- `npm run qa:interface-gate` -> PASS

4. Efeito executivo:
- A plataforma passa a ter bloqueio tecnico objetivo contra regressao dos 3 zeros de qualidade visual/UX.

## 30) O que falta (backlog factual multi-agente)
Status geral: qualidade visual/UX P0 estabilizada; faltas remanescentes estao concentradas em capacidade funcional P1/P2 e corte legado.

1. Produto/UX (Designer + PM)
- Preservar os 3 zeros de qualidade em todo PR:
  - `legacy-accent-tokens=0`
  - `admin-light-theme-tokens=0`
  - `blocking-browser-dialogs=0`
- Manter `NOT_IMPLEMENTED` explicito ate implementacao real.

2. Frontend/IDE (Plataforma)
- Superficies ainda em `NOT_IMPLEMENTED`:
  - `components/ide/AIChatPanelContainer.tsx`
  - `components/marketplace/CreatorDashboard.tsx`
  - `components/ide/IDELayout.tsx` (gate de area nao pronta)
  - `components/ide/WorkbenchRedirect.tsx` (handoff de capacidade nao pronta)
- Decisao: implementar de fato ou manter gate explicito; nao criar fake success.

3. Backend/Infra
- Consolidar corte legado faseado por telemetria nas rotas deprecadas:
  - `/api/workspace/tree`
  - `/api/workspace/files`
  - `/api/auth/sessions`
  - `/api/auth/sessions/[id]`
- Remocao somente apos janela de uso real e criterio de cutoff definido.

4. IA e automacao
- Permanecem gates explicitos para capacidade dependente de provider:
  - `/api/ai/chat`
  - `/api/ai/complete`
  - `/api/ai/action`
  - `/api/ai/inline-edit`
- Continuar evolucao L1-L3 com prova operacional antes de claims L4/L5.

5. Colaboracao/DX
- Validar estabilidade em cenarios de carga/conflito antes de declarar maturidade completa.
- Manter observabilidade de sessao/erro/custo no admin.

6. Mercado/negocio
- Continuar narrativa factual: "studio-grade workflow web-native", sem promessa de paridade desktop total.

## 31) Delta implementado nesta iteracao (governanca enterprise de contratos de rota)
1. Novo gate de contratos de API:
- `cloud-web-app/web/scripts/check-route-contracts.mjs`
- Verifica contratos obrigatorios em:
  - rotas deprecadas (`DEPRECATED_ROUTE`, status 410, telemetry hit)
  - gates de provider AI (`NOT_IMPLEMENTED`, status 501)

2. Scripts de qualidade atualizados:
- `package.json`:
  - novo `qa:route-contracts`
  - `qa:enterprise-gate` agora inclui `qa:route-contracts`

3. CI reforcado:
- `.github/workflows/cloud-web-app.yml`
  - adicionada etapa `Run API route contract gate`
  - pipeline de PR agora valida interface + canonicidade + contratos de rota + mojibake + typecheck

4. Validacao desta iteracao:
- `npm run qa:route-contracts` -> PASS
- `npm run qa:enterprise-gate` -> PASS

5. Efeito executivo:
- Alem dos 3 zeros de interface, a plataforma agora tem bloqueio automatico para regressao de contratos de rota critica.

## 32) Delta implementado nesta iteracao (cutover de consumidores para File API canonica)
1. Cutover aplicado em consumidores de UI que ainda chamavam rotas legadas:
- `cloud-web-app/web/components/QuickOpen.tsx`:
  - migrou de `/api/workspace/files` para `/api/files/fs` com `action=list`.
  - erro de UX agora referencia endpoint canonico.
- `cloud-web-app/web/components/_deprecated/FileExplorer.tsx`:
  - migrou de `/api/workspace/tree` para `/api/files/tree`.
- `cloud-web-app/web/components/_deprecated/FileTreeExplorer.tsx`:
  - migrou de `/api/workspace/tree` para `/api/files/tree`.

2. Alinhamento de navegacao para shell unica:
- `QuickOpen` e `FileTreeExplorer` agora abrem arquivo em `/ide?file=...` (removendo dependencia de `/editor`).
- `cloud-web-app/web/app/ide/page.tsx` passou a consumir `?file=` no boot e abrir arquivo inicial automaticamente.

3. Estado de duplicidade de superficie:
- Busca em `cloud-web-app/web/components` por `/api/workspace/tree|/api/workspace/files`: **0 ocorrencias**.
- Rotas legadas permanecem apenas no backend como `DEPRECATED_ROUTE` (410) sob estrategia de corte faseado.

4. Validacao tecnica desta iteracao:
- `npm run qa:interface-critical` -> PASS
- `npm run qa:route-contracts` -> PASS
- `npm run typecheck` -> PASS
- `npm run build` -> PASS

5. Efeito executivo:
- Consumidores de frontend foram alinhados ao contrato canonico de arquivos sem quebra abrupta de API.
- Shell unica `/ide` ganha deep-link funcional para abertura de arquivo.

## 33) Delta implementado nesta iteracao (gate expandido + triagem residual)
1. Gate de interface expandido para consolidacao definitiva:
- `cloud-web-app/web/scripts/interface-critical-scan.mjs` ganhou metricas adicionais:
  - `frontend-workspace-route-usage` (uso de `/api/workspace/*` fora de backend API)
  - `legacy-editor-shell-usage` (uso de `/editor?file=`)
- `cloud-web-app/web/scripts/interface-critical-gate.mjs` passou a bloquear regressao nesses dois itens (limite 0).

2. Baseline atualizado de qualidade critica:
- `legacy-accent-tokens`: **0**
- `admin-light-theme-tokens`: **0**
- `blocking-browser-dialogs`: **0**
- `not-implemented-ui`: **10**
- `frontend-workspace-route-usage`: **0**
- `legacy-editor-shell-usage`: **0**

3. Validacao operacional:
- `npm run qa:interface-gate` -> PASS
- `npm run docs:routes-inventory` -> PASS
- `npm run qa:enterprise-gate` -> PASS

4. Triagem residual factual (sem mudar escopo):
- Debt de lint permanece alto (159 warnings), principalmente:
  - `react-hooks/exhaustive-deps`
  - `@next/next/no-img-element`
- Decisao: tratar em trilha P1 de confiabilidade/qualidade sem bloquear P0 de contrato e UX critica.

## 34) Delta implementado nesta iteracao (hardening funcional IDE/Admin sem mudar escopo)
1. Correcoes aplicadas em superficies core:
- `cloud-web-app/web/components/ide/InlineCompletion.tsx`
  - endpoint corrigido de `/api/ai/completion` para `/api/ai/complete` (contrato canonico).
  - leitura de resposta alinhada para `suggestion`.
  - cleanup de efeito ajustado para evitar dependencia instavel de ref no unmount.
- `cloud-web-app/web/components/editor/InlineEditModal.tsx`
  - fluxo de `handleApply` estabilizado com `useCallback` e deps corretas em teclado.
- `cloud-web-app/web/app/admin/moderation/page.tsx`
  - `handleAction` convertido para `useCallback` e integrado no ciclo de atalhos com deps corretas.
- `cloud-web-app/web/components/editor/MonacoEditorPro.tsx`
  - ajuste de deps/estrutura para reduzir ruído de hooks no core do editor.

2. Validacao executada:
- `npm run typecheck` -> PASS
- `npm run lint` -> PASS (warnings nao bloqueantes)
- `npm run qa:enterprise-gate` -> PASS

3. Baseline de debt de lint atualizado:
- warnings totais: **152** (antes 159)
- reducao acumulada nesta fase: **-7**

4. Efeito executivo:
- L1 de autocomplete inline ficou alinhado ao endpoint canonico.
- Fluxos de teclado e acao em Admin/IDE ficaram mais estaveis.
- P0 de contrato/UX segue preservado sem abrir escopo paralelo.

## 35) Delta implementado nesta iteracao (estabilidade de busca/split editor)
1. Ajustes aplicados:
- `cloud-web-app/web/components/search/GlobalSearch.tsx`
  - `search` normalizado para dependencias explicitas (`query`, `options`, `onSearch`).
  - efeito de auto-search passou a depender de `search` explicitamente.
- `cloud-web-app/web/components/editor/SplitEditor.tsx`
  - efeito de sincronizacao de tamanhos refatorado para `setGroupSizes` funcional.
  - dependencia instavel de `groups.length/groupSizes.length` removida.

2. Validacao:
- `npm run lint` -> PASS (warnings remanescentes nao bloqueantes)
- `npm run typecheck` -> PASS
- `npm run qa:enterprise-gate` -> PASS

3. Impacto factual:
- warnings de lint reduzidos de **155** para **152**.
- melhorias focadas em estabilidade de hooks nas superficies de edicao/busca.

## 36) Delta implementado nesta iteracao (Plano Mestre - fechamento acelerado, onda de qualidade)
1. Refatoracao tecnica aplicada para reduzir debt de lint sem mudar escopo funcional:
- migracao em lote de exports default anonimos para export default nomeado em `cloud-web-app/web/lib/**`.
- objetivo: reduzir fragilidade de manutencao e remover ruido de regra `import/no-anonymous-default-export`.

Nota de governanca:
- os numeros de lint nas secoes 33-35 permanecem como snapshot historico.
- o baseline vigente para execucao deve considerar esta secao 36.

2. Baseline factual atualizado desta rodada (ambiente local):
- warnings totais de lint: **56** (antes 105 nesta trilha, antes 139 no baseline do plano).
- distribuicao de warnings:
  - `react-hooks/exhaustive-deps`: **56**
  - `import/no-anonymous-default-export`: **0**
  - `@next/next/no-img-element`: **0**
  - `jsx-a11y/role-supports-aria-props`: **0**

3. Gates validados apos a rodada:
- `cmd /c npm run lint` -> PASS (warnings nao bloqueantes)
- `cmd /c npm run typecheck` -> PASS
- `cmd /c npm run build` -> PASS
- `cmd /c npm run qa:interface-critical` -> PASS
- `cmd /c npm run qa:canonical-components` -> PASS
- `cmd /c npm run qa:route-contracts` -> PASS
- `cmd /c npm run qa:mojibake` -> PASS
- `cmd /c npm run docs:routes-inventory` -> PASS
- `cmd /c npm run qa:enterprise-gate` -> PASS

4. Contratos e limites preservados (sem regressao):
- `legacy-accent-tokens`: **0**
- `admin-light-theme-tokens`: **0**
- `blocking-browser-dialogs`: **0**
- `not-implemented-ui`: **10**
- `frontend-workspace-route-usage`: **0**
- `legacy-editor-shell-usage`: **0**

5. Acao executiva para proxima onda (sem expandir escopo):
- foco unico em `react-hooks/exhaustive-deps` (56 pendencias remanescentes).
- manter corte legado faseado por telemetria para rotas deprecadas.
- manter politica anti-fake-success (`NOT_IMPLEMENTED` explicito onde aplicavel).

## 37) Delta implementado nesta iteracao (Plano Mestre de Ataque Maximo - rodada atual)
1. O1 / P0 nucleo (sem mudar escopo):
- `cloud-web-app/web/components/ide/WorkbenchRedirect.tsx`:
  - removido CTA paralelo para `/dashboard`; agora o handoff aponta somente para `/ide`.
- `cloud-web-app/web/components/ide/IDELayout.tsx`:
  - gate `NOT_IMPLEMENTED` mantido explicito com texto normalizado.
- `cloud-web-app/web/components/marketplace/CreatorDashboard.tsx`:
  - CTA de payout nao pronto foi substituido por badge explicita de capacidade indisponivel (sem acao enganosa).

2. O2 / estabilidade tecnica:
- warnings de lint reduzidos para **37** (meta da onda `<=40` atingida).
- regra remanescente unica: `react-hooks/exhaustive-deps=37`.
- arquivos tratados na rodada:
  - `lib/debug/debug-console.tsx`
  - `lib/events/event-bus-system.tsx`
  - `lib/localization/localization-system.tsx`
  - `lib/plugins/plugin-system.tsx`
  - `lib/world/world-streaming.tsx`

3. O3 / admin enterprise drift:
- scanner expandido para nova metrica:
  - `admin-status-light-tokens` em `cloud-web-app/web/scripts/interface-critical-scan.mjs`.
- gate atualizado para bloquear regressao:
  - `cloud-web-app/web/scripts/interface-critical-gate.mjs` com limite `admin-status-light-tokens=0`.
- unificacao de status light aplicada nas paginas admin (`app/admin/**/*.tsx`), mantendo paleta dark enterprise.

4. O4 / deprecacao faseada (2 ciclos):
- rotas deprecadas agora retornam metadados de ciclo:
  - `deprecatedSince: '2026-02-11'`
  - `removalCycleTarget: '2026-cycle-2'`
  - `deprecationPolicy: 'phaseout_after_2_cycles'`
- arquivos:
  - `app/api/workspace/tree/route.ts`
  - `app/api/workspace/files/route.ts`
  - `app/api/auth/sessions/route.ts`
  - `app/api/auth/sessions/[id]/route.ts`

5. Baseline factual vigente apos rodada:
- `legacy-accent-tokens`: **0**
- `admin-light-theme-tokens`: **0**
- `admin-status-light-tokens`: **0**
- `blocking-browser-dialogs`: **0**
- `not-implemented-ui`: **10**
- `frontend-workspace-route-usage`: **0**
- `legacy-editor-shell-usage`: **0**
- lint warnings: **37** (`react-hooks/exhaustive-deps` only)

6. Validacao executada:
- `cmd /c npm run lint` -> PASS (37 warnings)
- `cmd /c npm run qa:interface-critical` -> PASS
- `cmd /c npm run qa:interface-gate` -> PASS
- `cmd /c npm run qa:canonical-components` -> PASS
- `cmd /c npm run qa:route-contracts` -> PASS
- `cmd /c npm run qa:mojibake` -> PASS
- `cmd /c npm run docs:routes-inventory` -> PASS
- `cmd /c npm run typecheck` -> PASS
- `cmd /c npm run qa:enterprise-gate` -> PASS

7. Proxima acao executiva:
- reduzir `react-hooks/exhaustive-deps` de `37 -> <=20` sem desabilitar regra global e sem regressao nos 0s de interface.

## 38) Delta critico de alinhamento (2026-02-15, varredura maxima)
1. Validacao factual desta rodada:
- `cmd /c npm run lint` -> PASS com **37 warnings** (somente `react-hooks/exhaustive-deps`)
- `cmd /c npm run qa:interface-gate` -> PASS
- `cmd /c npm run qa:route-contracts` -> PASS
- `cmd /c npm run typecheck` -> PASS
- `cmd /c npm run build` -> **FAIL no ambiente local (spawn EPERM)**  
  Nota: falha observada em sandbox/execucao local; nao foi classificada como regressao funcional de codigo nesta rodada.

2. Lacunas P0 descobertas por auditoria de profundidade:
- **L1 ghost text com contrato desalinhado**:
  - consumidor le `text` (`cloud-web-app/web/lib/ai/inline-completion.ts:51`)
  - endpoint retorna `suggestion` (`cloud-web-app/web/app/api/ai/complete/route.ts:124`)
- **Preview ainda estatico**:
  - `PreviewPanel` baseado em `srcDoc` para HTML estatico (`cloud-web-app/web/components/ide/PreviewPanel.tsx:54`)
  - mensagem explicita de suporte parcial (`cloud-web-app/web/components/ide/PreviewPanel.tsx:61`)
- **Handoff legacy sem semantica consumida**:
  - rotas redirecionam para `/ide?entry=...`
  - `/ide` so consome `file` na query (`cloud-web-app/web/app/ide/page.tsx:363`)
- **Projeto ativo nao explicito no shell**:
  - File API suporta `projectId` por request (`cloud-web-app/web/lib/server/workspace-scope.ts:21-22`)
  - chamadas do shell principal nao enviam `projectId` (`cloud-web-app/web/app/ide/page.tsx:398-401`)

3. Decisao executiva para proxima onda (sem mudar escopo):
- **P0-1**: alinhar contrato L1 (`suggestion` no consumidor) + smoke test de inline completion.
- **P0-2**: fechar decisao de preview runtime (implementar minimo JS/TS ou gate explicito no caminho critico).
- **P0-3**: consumir `entry` em `/ide` (telemetria/contexto de abertura) ou remover param nos redirects.
- **P0-4**: explicitar `projectId` na sessao Workbench e propagar para `/api/files/*`.
- **P0-5**: reduzir debt de hooks `37 -> <=20` em terminal/provider/render sem relaxar lint global.

4. Politica mantida:
- sem shell nova fora de `/ide`
- sem quebra abrupta de API
- sem fake success
- sem claims de L4/L5 ou colaboracao avancada sem evidencia operacional

## 39) Delta executado (2026-02-15, fechamento P0 desta rodada)
1. O1 - IA inline contrato canonico alinhado:
- `cloud-web-app/web/lib/ai/inline-completion.ts` agora consome `suggestion` como primario e `text` como fallback.
- `cloud-web-app/web/app/api/ai/complete/route.ts` retorna `suggestion` + alias transitorio `text` (1 ciclo).

2. O2 - Preview ampliado no caminho principal do `/ide`:
- `cloud-web-app/web/components/ide/PreviewPanel.tsx` refatorado para runtime por tipo:
  - `html/htm`, `md`, `json`, `txt`, `css`, `js/ts/tsx/jsx`, `png/jpg/jpeg/svg/webp/gif`, `mp3/wav/ogg`, `mp4/webm`.
- Tipos fora do escopo validado seguem com gate explicito no painel (sem fake success).
- Novo endpoint de midia: `cloud-web-app/web/app/api/files/raw/route.ts` (autenticado + escopo de projeto).

3. O3 - Handoff semantico e escopo de projeto no Workbench:
- `cloud-web-app/web/app/ide/page.tsx` agora suporta e consome formalmente:
  - `?file=`
  - `?entry=`
  - `?projectId=`
- `entry` passa a abrir contexto de painel (sidebar/bottom/AI) via eventos de layout.
- `projectId` vira contexto explicito do shell e e propagado nas chamadas `/api/files/tree` e `/api/files/fs`.
- Persistencia de ultimo projeto adicionada: `aethel.workbench.lastProjectId`.

4. O5 - Hardening de hooks (queda real de debt):
- warnings de lint cairam de **37** para **12** (somente `react-hooks/exhaustive-deps`).
- correcao aplicada em `lib/*` de alto impacto:
  - `capture-system`, `object-inspector`, `profiler-system`, `day-night-cycle`, `weather-system`, `controller-mapper`, `haptics-system`, `replay-system`, `save-manager`, `settings-system`, `notification-system`, `tooltip-system`, `quest-system`, `transport/use-transport`.

5. Gates e validacao desta rodada:
- `cmd /c npm run lint` -> PASS (**12 warnings**)
- `cmd /c npm run qa:interface-gate` -> PASS
- `cmd /c npm run qa:canonical-components` -> PASS
- `cmd /c npm run qa:route-contracts` -> PASS
- `cmd /c npm run qa:mojibake` -> PASS
- `cmd /c npm run typecheck` -> PASS
- `cmd /c npm run build` -> FAIL local por `spawn EPERM` (restricao de ambiente)

6. Baseline factual apos execucao:
- `legacy-accent-tokens`: **0**
- `admin-light-theme-tokens`: **0**
- `admin-status-light-tokens`: **0**
- `blocking-browser-dialogs`: **0**
- `not-implemented-ui`: **10**
- `frontend-workspace-route-usage`: **0**
- `legacy-editor-shell-usage`: **0**

7. Estado executivo:
- Meta P0 da rodada foi atendida: lacunas centrais de IA inline, preview e handoff de contexto foram fechadas sem ampliar escopo.
- Proxima onda fica restrita a debt residual de hooks em terminal/provider/render e validacao de build em ambiente sem bloqueio `EPERM`.

## 40) Delta executado (2026-02-15, hardening final desta onda)
1. Debt de hooks zerado no lint:
- `cmd /c npm run lint` -> PASS sem warnings.
- reducoes aplicadas em:
  - `components/terminal/IntegratedTerminal.tsx`
  - `components/terminal/TerminalWidget.tsx`
  - `components/terminal/XTerminal.tsx`
  - `lib/hooks/useGameplayAbilitySystem.ts`
  - `lib/hooks/useRenderPipeline.ts`
  - `lib/hooks/useRenderProgress.ts`
  - `lib/providers/AethelProvider.tsx`

2. Gates revalidados apos hardening:
- `cmd /c npm run qa:interface-gate` -> PASS
- `cmd /c npm run qa:canonical-components` -> PASS
- `cmd /c npm run qa:route-contracts` -> PASS
- `cmd /c npm run qa:mojibake` -> PASS
- `cmd /c npm run typecheck` -> PASS
- `cmd /c npm run build` -> FAIL local (`spawn EPERM`, restricao de ambiente)

3. Baseline factual vigente:
- `legacy-accent-tokens`: **0**
- `admin-light-theme-tokens`: **0**
- `admin-status-light-tokens`: **0**
- `blocking-browser-dialogs`: **0**
- `not-implemented-ui`: **10**
- `frontend-workspace-route-usage`: **0**
- `legacy-editor-shell-usage`: **0**
- `lint warnings`: **0**

4. Estado executivo atualizado:
- P0 de consolidacao tecnica desta rodada foi concluido com lint limpo e contratos preservados.
- unico bloqueio de gate full enterprise permanece ambiental (`spawn EPERM` no build local).

## 41) Validacao final desta rodada (2026-02-15, gate enterprise completo)
1. Execucao completa do gate enterprise em ambiente sem bloqueio de spawn:
- `npm run qa:enterprise-gate` -> **PASS** (interface gate + canonical components + route contracts + mojibake + typecheck + build).

2. Baseline final fechado:
- `lint warnings`: **0**
- `legacy-accent-tokens`: **0**
- `admin-light-theme-tokens`: **0**
- `admin-status-light-tokens`: **0**
- `blocking-browser-dialogs`: **0**
- `not-implemented-ui`: **10** (gates explicitos, sem fake success)

3. Observacoes operacionais:
- build mostra avisos de ambiente para `UPSTASH_*` nao configurado e fallback de Docker no sandbox.
- esses avisos nao quebraram o gate desta rodada.


## 42) Multi-agent enterprise critical audit delta (2026-02-15)

Scope of this delta:
- Keep business scope unchanged.
- Keep `/ide` as single shell.
- Keep explicit contracts for unavailable capabilities and deprecated routes.

Validated baseline in this round (`cloud-web-app/web`):
- `cmd /c npm run lint` -> PASS, 0 warnings.
- `cmd /c npm run qa:enterprise-gate` -> PASS.
- `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md` remains:
  - `legacy-accent-tokens=0`
  - `admin-light-theme-tokens=0`
  - `admin-status-light-tokens=0`
  - `blocking-browser-dialogs=0`
  - `not-implemented-ui=10`
  - `frontend-workspace-route-usage=0`
  - `legacy-editor-shell-usage=0`

Executive decisions (locked):
1. REMOVE: any claim of "studio complete" while `not-implemented-ui=10` and advanced collab/L4-L5 are not operationally proven.
2. UNIFY: current-state communication in `10`, `13`, `14` to avoid drift vs older documents.
3. REFACTOR: reduce journey noise from legacy handoff routes by continuing phased cutoff with telemetry.
4. IMPLEMENT NOW (P0): preserve quality gates as release blockers (`qa:enterprise-gate`, lint=0, explicit errors).
5. DEFER (P1/P2): advanced collab stability claims, L4/L5 readiness, full AAA media parity.

Critical limitations that remain factual:
1. Browser and media/3D constraints in `LIMITATIONS.md` remain unchanged.
2. Cost/scale constraints (AI + execution + websocket/container concurrency) remain unchanged.
3. Deprecation routes are intentionally still present under 410 contract until telemetry cutoff criteria are met.
4. Build reliability is environment-sensitive; local sandbox can still hit `spawn EPERM`.

Contract note:
- This round is a quality hardening and governance consolidation round, not a scope expansion round.


## 43) Deprecacao faseada em 2 ciclos (telemetria obrigatoria) - 2026-02-15

Rotas em fase de deprecacao (mantidas em 410):
1. `/api/workspace/tree`
2. `/api/workspace/files`
3. `/api/auth/sessions`
4. `/api/auth/sessions/[id]`

Politica travada:
1. Ciclo 1: manter 410 + metadados (`deprecatedSince`, `removalCycleTarget`, `deprecationPolicy`) + telemetria de hit.
2. Ciclo 2: remover somente se criterio de uso for atendido.

Criterio de remocao definitiva:
1. `0` consumo por 14 dias consecutivos (telemetria server-side).
2. `0` consumo de frontend confirmado pelo scanner (`frontend-workspace-route-usage=0`).

Template de relatorio operacional por ciclo:
- Janela observada (data inicio/fim)
- Hits por rota (total, por dia, por origem)
- Confirmacao de uso frontend (sim/nao)
- Decisao: manter deprecada ou remover
- Responsavel tecnico e data de aprovacao


## 44) Wave O1 + O3 execution delta (2026-02-15)

Delivered in this wave:
1. `/ide` gating communication hardening:
- `AIChatPanelContainer` now preserves concrete error codes (`NOT_IMPLEMENTED` only when factual, `AI_REQUEST_FAILED` otherwise).
- `IDELayout` gated panel now includes explicit next-action text without fake-success behavior.
- `WorkbenchRedirect` messaging aligned to shell handoff semantics (no misleading runtime failure text).

2. Admin enterprise actionability hardening:
- `app/admin/page.tsx` upgraded to enterprise console summary + operational cards.
- `app/admin/apis/page.tsx` now fetches with auth header and explicit operational/error states.
- `app/admin/security/page.tsx` copy/state cleanup and actionable audit log filtering.
- `app/admin/payments/page.tsx` gateway state visibility and operational feedback improved.

3. Validation:
- `cmd /c npm run lint` -> PASS (0 warnings)
- `cmd /c npm run qa:enterprise-gate` -> PASS
- `qa:interface-gate` remains with zero critical regressions and `not-implemented-ui=10` explicit.


## 45) CI hardening delta (UI audit + visual regression) - 2026-02-15

Implemented:
1. `.github/workflows/ui-audit.yml`
- upgraded to Node 20 with npm cache.
- installs both root and `cloud-web-app/web` dependencies.
- starts `portal:dev` and falls back to static audit server if startup fails.
- runs audit against `BASE_URL` and uploads runtime logs/artifacts.

2. `.github/workflows/visual-regression-compare.yml`
- upgraded to Node 20 with npm cache.
- installs root + web dependencies.
- starts `portal:dev` with static fallback.
- captures current screenshots against `BASE_URL` and uploads current/diff artifacts + server logs.

3. `tools/ide/ui-audit/pages.json`
- aligned page list with current routes (`/`, `/ide`, `/marketplace`, `/pricing`, `/settings`).

Execution note:
- this wave focuses on CI reliability and deterministic evidence capture; no business scope change.

- CI add-on: both UI workflows now execute `qa:interface-gate` before visual capture/audit to block obvious interface regressions early.

- CI correction: root install step now falls back to `npm install --no-audit --no-fund` when root `package-lock.json` is absent; cache key is bound to `cloud-web-app/web/package-lock.json` to avoid lockfile-missing failures.


## 46) Workbench project scope + CI startup hardening delta - 2026-02-16

Implemented:
1. Workbench now has an explicit `Switch Project Context` action in command palette and File menu.
2. `/ide` applies project switch without fake state:
- reloads tree with target `projectId`,
- clears open tabs and in-memory file buffers,
- persists new `projectId` and updates URL query.
3. `CommandPalette` command contract extended with `onSwitchProject` handler (single canonical implementation).
4. UI audit workflows now fail fast when neither `portal:dev` nor static fallback become reachable; both logs are tailed in failure path for deterministic diagnostics.
5. Deprecated compatibility routes now emit deprecation metadata in response headers:
- `x-aethel-deprecated-since`
- `x-aethel-removal-cycle-target`
- `x-aethel-deprecation-policy`
6. `qa:route-contracts` policy tightened to enforce deprecation body fields + metadata headers contract.
7. Admin API operations page now consumes compatibility telemetry with cutoff readiness (`candidateForRemoval`, `silenceDays`) and explicit cycle metadata for phased deprecation governance.
8. AI chat in `/ide` now enforces text-only P0 UX (`allowAttachments=false`) to avoid unsupported attachment CTA in the critical path.
9. UI-audit and visual-regression workflows now use concurrency cancellation to prevent stale parallel runs on the same ref.

Scope note:
- no business scope expansion;
- this is P0 hardening for multi-project usability and CI reliability only.

## 47) Enterprise gate + residual closure snapshot - 2026-02-16

Executed in `cloud-web-app/web`:
1. `cmd /c npm run qa:enterprise-gate` -> PASS
2. `cmd /c npm run docs:routes-inventory` -> PASS

Current factual baseline:
1. `legacy-accent-tokens=0`
2. `admin-light-theme-tokens=0`
3. `admin-status-light-tokens=0`
4. `blocking-browser-dialogs=0`
5. `not-implemented-ui=5` (API-level only)
6. `frontend-workspace-route-usage=0`
7. `legacy-editor-shell-usage=0`
8. `lint=0 warnings`

Delta implemented in this wave:
1. `/ide` file operations now send explicit `x-project-id` on `/api/files/fs`, aligning body+header scoping.
2. CI workflows were hardened with pre-visual gates:
- `qa:canonical-components`
- `qa:route-contracts`
- `qa:mojibake`
3. Route inventory was regenerated after the latest P0 hardening.

Residual limitations (explicit, no fake success):
1. `NOT_IMPLEMENTED` remains in 6 API contracts:
- `api/ai/chat`, `api/ai/complete`, `api/ai/action`, `api/ai/inline-edit` (provider not configured)
- `api/render/jobs/[jobId]/cancel`
- `api/billing/checkout` (`PAYMENT_GATEWAY_NOT_IMPLEMENTED` branch)
2. Build still emits non-blocking environment warnings:
- missing `UPSTASH_REDIS_REST_URL/TOKEN`
- sandbox Docker fallback
- repeated `revalidateTag` invalid URL warning (`localhost:undefined`) from runtime internals
3. Advanced collaboration and L4/L5 claims remain gated pending operational evidence.

Decision lock (unchanged):
1. Keep `/ide` as single shell.
2. Keep phased deprecation over 2 cycles with telemetry.
3. Keep anti-fake-success policy for all unavailable capabilities.

## 48) AI reality hardening + subsystem triage delta - 2026-02-16

Implemented:
1. AI Thinking endpoint now exposes explicit partial/simulated capability metadata (no hidden maturity signal):
- `cloud-web-app/web/app/api/ai/thinking/[sessionId]/route.ts`
2. AI Director endpoint now exposes explicit heuristic-preview capability metadata:
- `cloud-web-app/web/app/api/ai/director/[projectId]/route.ts`
3. Asset upload no longer reports implicit optimization as guaranteed success:
- `cloud-web-app/web/lib/server/asset-processor.ts`
- `cloud-web-app/web/app/api/assets/upload/route.ts`

Governance update:
1. Added canonical execution analysis for AI limitations and required subsystems:
- `audit dicas do emergent usar/15_AI_LIMITATIONS_SUBSYSTEMS_EXECUTION_2026-02-16.md`

Decision:
1. Keep simulated/heuristic AI surfaces explicit as `PARTIAL` until backed by production-grade orchestration and persistence.
2. Keep anti-fake-success contract prioritized over optimistic UX copy.

## 49) Capability contract hardening + preview/runtime reliability delta - 2026-02-16

Implemented:
1. New canonical capability response helper for unavailable/partial features:
- `cloud-web-app/web/lib/server/capability-response.ts`
2. AI provider-missing gates now use shared capability contract (explicit `NOT_IMPLEMENTED`, status `501`, capability metadata/headers):
- `cloud-web-app/web/app/api/ai/chat/route.ts`
- `cloud-web-app/web/app/api/ai/complete/route.ts`
- `cloud-web-app/web/app/api/ai/action/route.ts`
- `cloud-web-app/web/app/api/ai/inline-edit/route.ts`
3. Render cancel gate now uses shared capability contract with explicit metadata:
- `cloud-web-app/web/app/api/render/jobs/[jobId]/cancel/route.ts`
4. Billing checkout non-stripe branch now returns explicit capability gate metadata:
- `cloud-web-app/web/app/api/billing/checkout/route.ts`
5. Preview runtime hardening:
- `cloud-web-app/web/components/ide/PreviewPanel.tsx` now executes JS preview via serialized source (no raw inline interpolation) and adds explicit TS transpiler-unavailable error.

Governance update:
1. Added subsystem blueprint focused on AI limitations for games/films/apps and required mitigation stack:
- `audit dicas do emergent usar/16_AI_GAMES_FILMS_APPS_SUBSYSTEM_BLUEPRINT_2026-02-16.md`

Decision lock:
1. Keep explicit capability metadata mandatory for every unavailable runtime branch.
2. Keep runtime preview broad but honest (unsupported/failed runtimes remain explicit).

## 50) P0 reliability closure delta (AI validation + assets + capability matrix) - 2026-02-16

Implemented:
1. Deterministic AI change validation route:
- `cloud-web-app/web/app/api/ai/change/validate/route.ts`
- `cloud-web-app/web/lib/server/change-validation.ts`
2. Monaco inline-edit apply now validates full resulting document before apply:
- `cloud-web-app/web/components/editor/MonacoEditorPro.tsx`
- `cloud-web-app/web/components/editor/InlineEditModal.tsx`
3. Ghost-text provider now uses canonical server endpoint instead of direct runtime service call:
- `cloud-web-app/web/lib/ai/ghost-text.ts`
4. Inline-completion compat surface hardened to canonical payload and explicit provider gate:
- `cloud-web-app/web/app/api/ai/inline-completion/route.ts`
5. Asset validation upgraded for game/media classes with explicit partial warnings:
- `cloud-web-app/web/lib/server/asset-processor.ts`
- `cloud-web-app/web/app/api/assets/upload/route.ts`
6. Capability truth map published:
- `audit dicas do emergent usar/17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16.md`
7. Environment bootstrap checklist published:
- `cloud-web-app/web/docs/ENVIRONMENT_CHECKLIST.md`
8. AI runtime SLO baseline published:
- `cloud-web-app/web/docs/AI_RUNTIME_SLO.md`

Decision lock:
1. No AI patch is considered apply-ready without deterministic validation verdict.
2. Asset/media/model pipelines remain explicit as `PARTIAL` where deep runtime checks are absent.

## Delta 2026-02-17 (P0 Reliability Continuation)
- `qa:enterprise-gate`: PASS in this wave (interface/canonical/route/mojibake/typecheck/build completed in pipeline output).
- Interface gate baseline now reports: `not-implemented-ui=6` (previous baseline `10`).
- Implemented reliability hardening:
  - unified app origin resolver: `cloud-web-app/web/lib/server/app-origin.ts`
  - admin infra health URL normalized via request origin fallback
  - invite-link URL generation normalized (no empty-origin construction)
  - checkout-link now enforces explicit gateway gate (`PAYMENT_GATEWAY_NOT_IMPLEMENTED`)
  - AI change validation route standardized on capability envelope.
- Residual environment warnings remain expected in local build without full env:
  - `UPSTASH_REDIS_REST_URL/TOKEN` missing
  - Docker sandbox fallback
- remaining `revalidateTag` invalid URL warning still under investigation (non-blocking to build completion in this run).

## 51) Delta 2026-02-17 V - Advanced agent reliability loop

Implemented:
1. `chat-advanced` now exposes explicit provider capability gates (no ambiguous fallback when provider for model is missing):
- `cloud-web-app/web/app/api/ai/chat-advanced/route.ts`
2. Advanced request contract now supports:
- `qualityMode`: `standard | delivery | studio`
- `enableWebResearch`: benchmark context enrichment for UI/UX tasks
3. Multi-role and single-role prompts now include:
- quality policy
- self-questioning checklist
- optional benchmark references
4. Trace evidence now records:
- `qualityMode`
- benchmark references (when available) as `search` evidence items.

Validation snapshot:
1. `npm run lint` PASS
2. `npm run typecheck` PASS
3. `npm run qa:route-contracts` PASS
4. `npm run qa:no-fake-success` PASS
5. `npm run qa:enterprise-gate` PASS

Decision lock:
1. Keep anti-fake-success as hard rule for all advanced agent paths.
2. Keep benchmark ingestion as best-effort (never a hidden dependency for successful completion).

## 52) Delta 2026-02-17 VI - IDE AI panel moved to advanced orchestration

Implemented:
1. IDE AI sidebar now calls `/api/ai/chat-advanced` instead of `/api/ai/chat`:
- `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx`
2. Runtime profile inference added in UI:
- deep audit/benchmark prompts -> `qualityMode=studio`, `agentCount=3`, web research enabled;
- implementation prompts -> `qualityMode=delivery`, `agentCount=2`;
- normal prompts -> `qualityMode=standard`, `agentCount=1`.
3. Multi-agent plan gates now degrade safely to single-agent in UI when plan limits block agent mode.
4. Project context is now forwarded from `/ide` URL (`projectId`) to advanced chat calls.

Validation snapshot:
1. `npm run lint` PASS
2. `npm run typecheck` PASS
3. `npm run qa:enterprise-gate` PASS

Critical reading:
1. This improves Manus-like orchestration behavior without inflating maturity claims.
2. L4/L5 readiness remains blocked by missing deterministic multi-file validate/apply/rollback pipeline.

## 53) Delta 2026-02-17 VII - Explorer UX hardening in `/ide`

Implemented:
1. File explorer now receives canonical load/error state from `/ide` shell:
- `cloud-web-app/web/app/ide/page.tsx`
- `cloud-web-app/web/components/ide/FileExplorerPro.tsx`
2. Added explicit empty-state action panel in explorer (no silent blank workspace):
- CTA: `New File` and `New Folder`
3. Removed duplicated global loading/error overlays in editor area; explorer is now the single source for its own load/error UX.

Validation snapshot:
1. `npm run lint` PASS
2. `npm run typecheck` PASS
3. `npm run qa:enterprise-gate` PASS

Decision lock:
1. Keep workspace loading/error feedback inside explorer panel to avoid split-state ambiguity.

## 54) Delta 2026-02-17 VIII - Preview media failure transparency

Implemented:
1. Added explicit media runtime failure handling in preview panel:
- `cloud-web-app/web/components/ide/PreviewPanel.tsx`
2. Image/audio/video preview now surfaces actionable `PARTIAL` gate message when runtime decoding/source fails.

Validation snapshot:
1. `npm run lint` PASS
2. `npm run typecheck` PASS
3. `npm run qa:enterprise-gate` PASS

Decision lock:
1. Keep unsupported/failed media runtime states explicit; never imply successful preview render.

## 55) Delta 2026-02-18 IX - Deterministic inline apply/rollback for AI patches

Implemented:
1. Added deterministic server-side apply path for inline AI edits:
- `cloud-web-app/web/app/api/ai/change/apply/route.ts`
2. Added rollback endpoint with expiring token snapshots:
- `cloud-web-app/web/app/api/ai/change/rollback/route.ts`
- `cloud-web-app/web/lib/server/change-apply-runtime.ts`
3. Monaco inline edit apply now prefers server-backed scoped mutation when `path + projectId` exist:
- `cloud-web-app/web/components/editor/MonacoEditorPro.tsx`
- `cloud-web-app/web/app/ide/page.tsx`
4. Apply contract includes:
- stale-context protection (`409 STALE_CONTEXT`);
- validation gate (`422 VALIDATION_BLOCKED`);
- rollback token with TTL metadata.

Validation snapshot:
1. `npm run lint` PASS
2. `npm run typecheck` PASS
3. `npm run qa:route-contracts` PASS
4. `npm run qa:no-fake-success` PASS
5. `npm run qa:enterprise-gate` PASS

Decision lock:
1. Keep local-only editor mutation as fallback only when scoped server apply is unavailable.
2. Do not promote L4/L5 until this deterministic path is expanded from single-file inline edit to broader multi-file workflows.

## 56) Delta 2026-02-18 X - Rollback durability hardening + contract gate expansion

Implemented:
1. Rollback snapshots now persist in runtime temp storage (disk) with TTL in addition to in-memory cache:
- `cloud-web-app/web/lib/server/change-apply-runtime.ts`
2. Rollback flow now validates latest file hash before consume and only invalidates token after safety check:
- `cloud-web-app/web/app/api/ai/change/rollback/route.ts`
3. Route-contract QA now enforces deterministic apply/rollback contract patterns:
- `cloud-web-app/web/scripts/check-route-contracts.mjs`

Validation snapshot:
1. `npm run lint` PASS
2. `npm run typecheck` PASS
3. `npm run qa:route-contracts` PASS (contract checks expanded)
4. `npm run qa:no-fake-success` PASS

Residual limit:
1. Rollback durability is local-runtime persistent, not distributed cross-instance durable yet.

## 57) Delta 2026-02-18 XI - Editor rollback discoverability in command palette

Implemented:
1. Added command palette action `AI: Rollback Last AI Patch` with `Ctrl+Alt+Z` shortcut:
- `cloud-web-app/web/components/ide/CommandPalette.tsx`
2. Wired command action to editor rollback event in `/ide`:
- `cloud-web-app/web/app/ide/page.tsx`
- `cloud-web-app/web/components/editor/MonacoEditorPro.tsx`

Decision lock:
1. Partial/gated capability remains explicit; rollback action only affects server-applied inline patch token.

## 58) Delta 2026-02-18 XII - Capability envelope alignment for apply/rollback errors

Implemented:
1. `AI_CHANGE_APPLY` blocked branches now return via capability envelope helper (`x-aethel-capability*` headers included).
2. `AI_CHANGE_ROLLBACK` blocked branches now return via capability envelope helper.
3. Route contract checks continue enforcing explicit deterministic patterns.

Validation snapshot:
1. `npm run qa:route-contracts` PASS
2. `npm run qa:no-fake-success` PASS

## 59) Delta 2026-02-18 XIII - OpenAPI contract alignment for deterministic AI patch flow

Implemented:
1. Updated public API spec to reflect canonical AI completion payload (`suggestion` + alias `text`).
2. Added documented endpoints:
- `/api/ai/change/validate`
- `/api/ai/change/apply`
- `/api/ai/change/rollback`
3. Added corresponding schemas for capability error and deterministic patch apply/rollback payloads:
- `cloud-web-app/web/lib/openapi-spec.ts`

Validation snapshot:
1. `npm run lint` PASS
2. `npm run typecheck` PASS
3. `npm run qa:route-contracts` PASS
4. `npm run qa:no-fake-success` PASS
5. `npm run build` PASS (with existing non-blocking runtime warnings tracked in runbook)

## 60) Delta 2026-02-18 XIV - Enterprise gate full pass refresh

Implemented:
1. Re-ran full enterprise gate end-to-end with current branch state.
2. Refreshed generated evidence docs:
- `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`
- `cloud-web-app/web/docs/MOJIBAKE_SCAN.md`
- `cloud-web-app/web/docs/ROUTES_INVENTORY.md`

Validation snapshot:
1. `npm run qa:enterprise-gate` PASS
2. `not-implemented-ui=6` remains explicit (API gates only)
3. Critical zeros preserved:
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`

Residual warning inventory remains unchanged and tracked in runbook `19`.

## 61) Delta 2026-02-18 XV - Provider gate hardening for media/3D AI routes

Implemented:
1. Removed implicit provider fallback behavior that could degrade into hidden 500 paths.
2. Added explicit capability gates (`503 PROVIDER_NOT_CONFIGURED`, `capabilityStatus=PARTIAL`) when requested provider is not configured:
- `cloud-web-app/web/app/api/ai/image/generate/route.ts`
- `cloud-web-app/web/app/api/ai/voice/generate/route.ts`
- `cloud-web-app/web/app/api/ai/music/generate/route.ts`
- `cloud-web-app/web/app/api/ai/3d/generate/route.ts`
3. Added capability metadata in these branches:
- `requestedProvider`
- `requiredEnv`
- `availableProviders`
4. Expanded route contract QA coverage for these routes:
- `cloud-web-app/web/scripts/check-route-contracts.mjs`

Decision lock:
1. Requested provider is now explicit-by-contract; runtime no longer auto-switches provider silently.
2. Capability-unavailable branches must remain machine-readable and auditable.

## 62) Delta 2026-02-18 XVI - OpenAPI alignment for media/3D AI generation routes

Implemented:
1. Added OpenAPI path docs for:
- `/api/ai/image/generate`
- `/api/ai/voice/generate`
- `/api/ai/music/generate`
- `/api/ai/3d/generate`
2. Added request/response schemas for these routes in:
- `cloud-web-app/web/lib/openapi-spec.ts`
3. Capability failure path documented as explicit provider-config gate (`503 PROVIDER_NOT_CONFIGURED` + capability envelope).

Decision lock:
1. API behavior and documentation must stay synchronized in the same wave for AI generation surfaces.

## 63) Delta 2026-02-18 XVII - Build warning reduction for Next IPC env serialization

Implemented:
1. Hardened IPC env cleanup in `cloud-web-app/web/next.config.js`:
- invalid incremental-cache IPC keys are now normalized to empty string (instead of delete) to avoid `"undefined"` serialization in subprocess contexts.
2. Revalidated full gate after change:
- `npm run qa:enterprise-gate` PASS.

Observed result:
1. Previous `revalidateTag` invalid URL warning (`localhost:undefined`) no longer appears in build output for this wave.
2. Remaining build warnings are environment-expected only:
- missing `UPSTASH_REDIS_REST_URL/TOKEN`
- Docker sandbox fallback

## 64) Delta 2026-02-18 XVIII - Architecture triage sweep (system complexity alignment)

Implemented:
1. Added architecture-wide critical scan and report generation:
- script: `cloud-web-app/web/scripts/architecture-critical-scan.mjs`
- npm task: `docs:architecture-triage`
- report: `cloud-web-app/web/docs/ARCHITECTURE_CRITICAL_TRIAGE.md`

Factual snapshot from current sweep:
1. API route files: `231`
2. `_deprecated` component files: `10`
3. Frontend compatibility usage of `/api/files/read|write|list|...`: `22`
4. Redirect aliases to `/ide?entry=`: `17`
5. File API compatibility wrappers (`trackCompatibilityRouteHit` under `app/api/files/*`): `8`
6. API `NOT_IMPLEMENTED` markers: `6`
7. Unreferenced candidate found: `components/ide/WorkbenchRedirect.tsx`

Decision lock:
1. Keep compatibility wrappers only with explicit removal-cycle planning.
2. Reduce frontend usage of `/api/files/*` compatibility routes toward canonical `/api/files/fs`.

## 65) Delta 2026-02-18 XIX - Canonical file API cutover on frontend call sites

Implemented:
1. Migrated frontend/lib call sites from compatibility routes (`/api/files/read|write|list|copy|move|delete|create|rename`) to canonical authority `/api/files/fs`.
2. Added shared client helper for canonical file actions:
- `cloud-web-app/web/lib/client/files-fs.ts`
3. Updated top compatibility offenders:
- `cloud-web-app/web/lib/explorer/file-explorer-manager.ts`
- `cloud-web-app/web/lib/ai/tools-registry.ts`
- `cloud-web-app/web/lib/workspace/workspace-manager.ts`
- `cloud-web-app/web/lib/search/search-manager.ts`
- `cloud-web-app/web/lib/problems/problems-manager.ts`
- `cloud-web-app/web/lib/terminal/task-detector.ts`
- `cloud-web-app/web/lib/ai/ai-enhanced-lsp.ts`
4. Removed unreferenced surface component:
- deleted `cloud-web-app/web/components/ide/WorkbenchRedirect.tsx`

Factual snapshot after cutover:
1. `docs:architecture-triage` -> `fileCompatUsage=0` (before `22`)
2. `qa:interface-gate` PASS (`not-implemented-ui=6`, critical zero metrics preserved)
3. `lint` PASS (`0` warnings)
4. `typecheck` PASS
5. `qa:route-contracts` PASS
6. `qa:no-fake-success` PASS

Decision lock:
1. Canonical frontend authority for scoped file operations remains `/api/files/fs`.
2. Compatibility wrappers remain server-side only for phased deprecation telemetry.

## 66) Delta 2026-02-18 XX - Wrapper deprecation metadata hardening + telemetry clarity

Implemented:
1. Added canonical metadata source for file compatibility wrappers:
- `cloud-web-app/web/lib/server/files-compat-policy.ts`
2. Applied deprecation-cycle metadata to all file compatibility wrapper routes (`read|write|list|create|delete|copy|move|rename`):
- response payload now includes `deprecatedSince`, `removalCycleTarget`, `deprecationPolicy`
- telemetry headers include the same metadata via `trackCompatibilityRouteHit`
3. Expanded route contract QA coverage:
- `cloud-web-app/web/scripts/check-route-contracts.mjs` now validates wrapper metadata contract (checks increased to `25`).
4. Improved architecture triage signal:
- scanner now excludes intentional telemetry registry strings from frontend workspace-route usage metric.

Factual snapshot:
1. `qa:route-contracts` PASS (`checks=25`)
2. `docs:architecture-triage` now reports:
- `fileCompatUsage=0`
- `frontend usage of deprecated workspace routes=0`
3. `lint`, `typecheck`, `qa:interface-gate`, `qa:no-fake-success` PASS.

Decision lock:
1. File wrapper routes remain operational only as compatibility bridge with explicit removal-cycle metadata.
2. Admin compatibility dashboard can now use wrappers and deprecated routes under the same 14-day cutoff criterion.

## 67) Delta 2026-02-18 XXI - Deprecated component backlog removed

Implemented:
1. Removed dead `_deprecated` component surface from active codebase:
- `cloud-web-app/web/components/_deprecated/**` deleted
2. Preserved canonical surface only (`/ide` + active components), without route or API behavior change.

Factual snapshot:
1. `docs:architecture-triage` now reports `deprecatedComponents=0` (before `10`)
2. `fileCompatUsage=0` and `frontend workspace-route usage=0` remain preserved
3. `lint`, `typecheck`, `qa:route-contracts`, `qa:no-fake-success`, `qa:interface-gate` PASS

Decision lock:
1. New legacy UI fragments must not be reintroduced under `components/_deprecated`.
2. Backward-compat strategy stays on API contract/telemetry level, not duplicate component trees.

## 68) Delta 2026-02-18 XXII - Redirect alias deduplication to config-level policy

Implemented:
1. Replaced 17 duplicated App Router alias pages (`app/*/page.tsx` doing `redirect('/ide?entry=...')`) with centralized Next redirects:
- `cloud-web-app/web/next.config.js`
2. Added explicit redirect mapping for `/preview` to keep legacy handoff:
- `/preview` -> `/ide?entry=live-preview`
3. Removed obsolete alias pages:
- `app/ai-command/page.tsx`
- `app/animation-blueprint/page.tsx`
- `app/blueprint-editor/page.tsx`
- `app/chat/page.tsx`
- `app/debugger/page.tsx`
- `app/editor-hub/page.tsx`
- `app/explorer/page.tsx`
- `app/git/page.tsx`
- `app/landscape-editor/page.tsx`
- `app/level-editor/page.tsx`
- `app/live-preview/page.tsx`
- `app/niagara-editor/page.tsx`
- `app/playground/page.tsx`
- `app/preview/page.tsx`
- `app/search/page.tsx`
- `app/terminal/page.tsx`
- `app/testing/page.tsx`
- `app/vr-preview/page.tsx`

Factual snapshot after dedup:
1. `docs:architecture-triage` -> `redirectAliases=0` (before `17`)
2. `lint` PASS (`0 warnings`)
3. `typecheck` PASS
4. `qa:route-contracts` PASS (`checks=25`)
5. `qa:interface-gate` PASS (critical zero metrics preserved)

Decision lock:
1. Route aliasing to `/ide` must stay centralized in `next.config.js`; no new one-file redirect pages under `app/*`.
2. Legacy UX handoff remains supported through redirect mapping, not duplicated route components.

## 69) Delta 2026-02-18 XXIII - Studio Home cut-in (chat/preview-first entry)

Implemented:
1. `/dashboard` now defaults to Studio Home entry surface (chat/preview-first), preserving legacy dashboard behind `?legacy=1`:
- `cloud-web-app/web/app/dashboard/page.tsx`
2. Added Studio Home modular surface with:
- mission input
- super-plan actions
- task board (`run/validate/apply/rollback`)
- team live feed
- ops bar (`stop`, `full access`, cost/usage summary)
- one-click IDE handoff
- `cloud-web-app/web/components/studio/StudioHome.tsx`

Decision lock:
1. `/dashboard` is authenticated entry UX.
2. `/ide` remains advanced execution shell.
3. Legacy dashboard stays temporary and explicit (`?legacy=1`) during phased adoption.

## 70) Delta 2026-02-18 XXIV - Studio Home API surface and execution contract

Implemented (new API routes):
1. `POST /api/studio/session/start`
2. `GET /api/studio/session/{id}`
3. `POST /api/studio/session/{id}/stop`
4. `POST /api/studio/tasks/plan`
5. `POST /api/studio/tasks/{id}/run`
6. `POST /api/studio/tasks/{id}/validate`
7. `POST /api/studio/tasks/{id}/apply`
8. `POST /api/studio/tasks/{id}/rollback`
9. `GET /api/studio/cost/live`
10. `POST /api/studio/access/full`
11. `DELETE /api/studio/access/full/{id}`

Backing service:
1. `cloud-web-app/web/lib/server/studio-home-store.ts`
2. Stores Studio session state in `copilotWorkflow.context` for this phase (no schema migration in this wave).

Decision lock:
1. Orchestration roles are fixed (`planner`, `coder`, `reviewer`).
2. Apply remains blocked until validation passes.
3. Full Access is timeboxed and auditable.

## 71) Delta 2026-02-18 XXV - Studio Home hardening + factual gate refresh

Implemented:
1. Fixed Prisma JSON persistence typing in Studio session store:
- `cloud-web-app/web/lib/server/studio-home-store.ts`
2. Hardened Studio Home UX to avoid misleading CTAs:
- task actions now obey deterministic gate states (`run|validate|apply|rollback`)
- `Open IDE` now forwards contextual handoff (`projectId`, `entry`, `sessionId`, `taskId`)
3. Added lightweight operational polling for active studio sessions and dynamic loading for heavy chat/preview blocks:
- `cloud-web-app/web/components/studio/StudioHome.tsx`

Factual snapshot (this wave):
1. `lint` PASS (`0 warnings`)
2. `typecheck` PASS
3. `build` PASS (local non-blocking warnings remain for missing Upstash env and Docker fallback)
4. `qa:canonical-components` PASS
5. `qa:route-contracts` PASS (`checks=28`)
6. `qa:no-fake-success` PASS
7. `qa:interface-gate` PASS with:
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`
- `not-implemented-ui=6`
- `frontend-workspace-route-usage=0`
- `legacy-editor-shell-usage=0`

Decision lock:
1. `not-implemented-ui=6` is explicit and policy-compliant (capability gates), not hidden with fake success.
2. Studio Home remains entry UX; `/ide` remains advanced shell.
3. Capability promotion above `PARTIAL` still requires operational evidence.

## 72) Delta 2026-02-18 XXVI - Studio task-run honesty hardening

Implemented:
1. Studio task-run execution model now avoids random/synthetic telemetry artifacts:
- deterministic seed-based token/cost estimates in `studio-home-store`
- explicit orchestration-only result messaging
2. Validation/apply gating tightened:
- validation passes only from reviewer checkpoint marker (`[review-ok]`)
- apply gate requires reviewer-owned validated checkpoint
3. Route contract tightened:
- `POST /api/studio/tasks/{id}/run` now returns `capabilityStatus='PARTIAL'` with execution metadata.

Factual snapshot:
1. `qa:route-contracts` PASS (`checks=29`)
2. `qa:no-fake-success` PASS
3. `lint`, `typecheck`, `build`, `qa:interface-gate` PASS

Decision lock:
1. Studio Home run/apply controls are orchestration checkpoints, not direct file patch apply.
2. Deterministic file mutation remains anchored in `/ide` and `/api/ai/change/*` flows.

## 73) Delta 2026-02-18 XXVII - Dashboard/IDE continuity and weight control

Implemented:
1. Moved legacy dashboard surface to dedicated route:
- `/dashboard/legacy` (`cloud-web-app/web/app/dashboard/legacy/page.tsx`)
- `/dashboard?legacy=1` now redirects to `/dashboard/legacy`
2. Studio Home now supports lightweight preview mode by default and runtime preview opt-in:
- reduces initial interactive load pressure while preserving preview-first workflow
3. IDE now consumes Studio handoff context query params:
- `sessionId`, `taskId` are ingested and surfaced in workbench status messaging.

Factual snapshot:
1. `lint` PASS
2. `typecheck` PASS
3. `qa:route-contracts` PASS (`checks=29`)
4. `qa:no-fake-success` PASS
5. `build` PASS with split entry weight:
- `/dashboard` -> `5.87 kB` route size (`95.7 kB` first-load JS)
- `/dashboard/legacy` -> `366 kB` route size (`526 kB` first-load JS)

Decision lock:
1. Legacy dashboard stays available only as explicit fallback route.
2. Studio Home remains default entry.
3. IDE handoff context is additive and backward compatible with existing `file/entry/projectId` contract.

## 74) Delta 2026-02-18 XXVIII - Studio session resilience and budget gate

Implemented:
1. Studio Home now restores latest active session on reload via local persistence.
2. Task execution now enforces budget guard in orchestration store:
- run is blocked with explicit message when budget cap is exhausted
3. Planner initial status normalized to `queued` for deterministic first-run path.
4. Full Access grant creation now requires active session state.

Factual snapshot:
1. `lint` PASS
2. `typecheck` PASS
3. Existing enterprise gates remain green in this branch baseline.

Decision lock:
1. Budget cap is an execution gate (not advisory only).
2. Session continuity is resume-only for active sessions (stopped sessions are not auto-resumed).

## 75) Delta 2026-02-18 XXIX - Studio route hardening against false-positive success

Implemented:
1. Hardened Studio task routes with explicit blocked/invalid state responses:
- `tasks/run`: `TASK_RUN_BLOCKED` and `SESSION_NOT_ACTIVE` return `PARTIAL` contract
- `tasks/validate|apply|rollback`: `SESSION_NOT_ACTIVE` explicit contract
- `tasks/rollback`: pre-check now requires prior `applyToken` before attempting rollback
2. Hardened planning route:
- `tasks/plan` now returns `PLAN_ALREADY_EXISTS` unless explicit force behavior is requested
3. Full Access route now returns explicit `SESSION_NOT_ACTIVE` capability response if session is stopped.
4. Route contract scanner expanded:
- `checks=30` (`qa:route-contracts`)

Factual snapshot:
1. `qa:enterprise-gate` PASS
2. `qa:route-contracts` PASS (`checks=30`)
3. `not-implemented-ui=6` remains explicit and unchanged

Decision lock:
1. Blocked orchestration states must not emit `ok: true`.
2. Rollback remains strictly token-based after successful apply only.

## 76) Delta 2026-02-18 XXX - Reviewer gate hardening and replay protection

Implemented:
1. Added preflight gate contracts before task mutation:
- `tasks/run`: rejects invalid states with `TASK_RUN_NOT_ALLOWED`
- `tasks/validate`: reviewer-only + done-state readiness gates
- `tasks/apply`: explicit replay prevention via `APPLY_ALREADY_COMPLETED`
2. Store-level guardrails reinforced to match route contracts:
- non-runnable tasks are ignored by runner
- validation runs only for reviewer tasks with `pending` verdict
- apply ignores re-apply when token already exists
3. UI guard tightened in Studio Home:
- validate/apply/rollback actions now enabled only for reviewer checkpoints
4. Route contract scanner expanded to enforce these gates (`checks=31`).

Factual snapshot:
1. `cmd /c npm run qa:route-contracts` -> PASS (`checks=31`)
2. Existing P0 baseline remains unchanged:
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`
- `not-implemented-ui=6`

Decision lock:
1. Replay or out-of-order studio actions must fail explicitly, never mutate silently.
2. Reviewer remains the only authority for validate/apply/rollback in Studio orchestration.

## 77) Delta 2026-02-18 XXXI - Studio capability envelope normalization

Implemented:
1. Normalized Studio route gate responses to `capabilityResponse` helper for capability headers and metadata parity:
- `tasks/plan`
- `tasks/[id]/run`
- `tasks/[id]/validate`
- `tasks/[id]/apply`
- `tasks/[id]/rollback`
2. Preserved explicit non-capability contracts (`SESSION_ID_REQUIRED`, `TASK_NOT_FOUND`, `STUDIO_SESSION_NOT_FOUND`) for deterministic client handling.

Factual snapshot:
1. `cmd /c npm run qa:enterprise-gate` -> PASS
2. `cmd /c npm run qa:route-contracts` -> PASS (`checks=31`)
3. Interface critical baseline preserved:
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`
- `not-implemented-ui=6`

Decision lock:
1. Studio gated failures must include capability envelope headers (`x-aethel-capability*`) consistently.
2. Capability semantics stay explicit and machine-readable; no success-masking on blocked edges.

## 78) Delta 2026-02-18 XXXII - Route contract gate coverage expansion

Implemented:
1. Extended route-contract scanner coverage for Studio orchestration gates:
- added rollback gate contract assertions
- enforced `capabilityResponse` presence in Studio task/plan gate routes
- enforced validate gate replay/status markers (`VALIDATION_ALREADY_*`)
2. Kept runtime behavior unchanged; this wave increases guardrail strictness.

Factual snapshot:
1. `cmd /c npm run qa:route-contracts` -> PASS (`checks=32`)
2. `cmd /c npm run qa:enterprise-gate` -> PASS
3. Interface baseline unchanged (`not-implemented-ui=6`, other critical zeros preserved).

Decision lock:
1. Future Studio route regressions must fail contract gate earlier in CI.
2. Contract strictness can increase, but must not weaken capability truthfulness semantics.

## 79) Delta 2026-02-18 XXXIII - Rollback token mismatch contract

Implemented:
1. Added explicit rollback token mismatch branch in Studio rollback route:
- `ROLLBACK_TOKEN_MISMATCH` (`409`, `PARTIAL`) when a provided token does not match latest applied checkpoint.
2. Route-contract gate updated to enforce mismatch branch in rollback contract.

Factual snapshot:
1. `cmd /c npm run qa:route-contracts` -> PASS (`checks=32`)
2. `cmd /c npm run qa:enterprise-gate` -> PASS

Decision lock:
1. Rollback attempts with wrong token must fail explicitly and audibly.
2. Token-based rollback remains deterministic and non-ambiguous for support/telemetry.

## 80) Delta 2026-02-18 XXXIV - Security hardening batch (rate limiting + headers)

Implemented:
1. Added shared rate limiter utility with distributed-first mode:
- `cloud-web-app/web/lib/server/rate-limit.ts`
2. Rate-limit backend strategy:
- uses Upstash sliding-window when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are configured
- falls back to in-memory mode when not configured
- falls back to in-memory fail-safe if Upstash is transiently unavailable
3. Applied rate limiting to critical abuse surfaces:
- `app/api/auth/login/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/ai/complete/route.ts`
- `app/api/ai/chat-advanced/route.ts`
- `app/api/billing/checkout/route.ts`
- `app/api/billing/checkout-link/route.ts`
- `app/api/studio/session/start/route.ts`
4. Added platform security response headers in Next config:
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`
5. Added critical CI contract guard:
- `scripts/check-critical-rate-limits.mjs`
- wired into `qa:enterprise-gate` via `qa:critical-rate-limit`

Validation status:
1. Full gate execution intentionally deferred in this wave (user request: run tests later).
2. This delta is marked `PARTIAL_INTERNAL` until enterprise gate rerun.

Decision lock:
1. Rate limiting is now mandatory on critical endpoints and must remain explicit (429 with metadata).
2. Upstash mode is canonical for multi-instance; in-memory remains only fallback/transitional.
