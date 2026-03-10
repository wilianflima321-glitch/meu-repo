# 18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17
Status: EXECUTABLE HANDOFF
Date: 2026-02-17
Owner: Frontend Platform + Product Design + Critical Agent

## 0. Purpose
This document maps the real interface surfaces in the current Aethel Workbench/Admin stack so another AI (Claude) can improve UI/UX without changing scope.

Non-negotiable:
1. Keep `/ide` as advanced workbench shell (no parallel product shell).
2. `dashboard`/home entry may evolve, but handoff to `/ide` must stay canonical.
3. Keep explicit capability gates (`NOT_IMPLEMENTED`, `DEPRECATED_ROUTE`, `QUEUE_BACKEND_UNAVAILABLE`, `AUTH_NOT_CONFIGURED`).
4. Do not create a second app shell.
5. Do not remove deprecation contracts from legacy routes.

## 1. Core Entry Surfaces
1. Studio entry page: `cloud-web-app/web/app/dashboard/page.tsx`
2. Gateway landing page: `cloud-web-app/web/app/page.tsx`
3. Workbench shell page: `cloud-web-app/web/app/ide/page.tsx`
4. Workbench runtime bridge: `cloud-web-app/web/components/ide/FullscreenIDE.tsx`
5. Workbench layout orchestrator: `cloud-web-app/web/components/ide/IDELayout.tsx`
6. Global style/tokens/focus/compact density: `cloud-web-app/web/app/globals.css`
7. Installed app entry and shortcuts: `cloud-web-app/web/app/manifest.ts`

## 1.1 Nexus Canonical Surfaces
1. Canonical canvas runtime: `cloud-web-app/web/components/nexus/NexusCanvasV2.tsx`
2. Compatibility canvas wrapper: `cloud-web-app/web/components/NexusCanvas.tsx`
3. Canonical chat runtime: `cloud-web-app/web/components/nexus/NexusChatMultimodal.tsx`
4. Compatibility chat wrapper: `cloud-web-app/web/components/NexusChatMultimodal.tsx`

## 2. IDE UI Surfaces (Primary)
### 2.1 Left/center/bottom shell blocks
1. File explorer: `cloud-web-app/web/components/ide/FileExplorerPro.tsx`
2. Preview panel: `cloud-web-app/web/components/ide/PreviewPanel.tsx`
3. Preview runtime toolbar: `cloud-web-app/web/components/ide/PreviewRuntimeToolbar.tsx`
4. AI side panel container: `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx`
5. Command palette (canonical): `cloud-web-app/web/components/ide/CommandPalette.tsx`
6. Redirect adapter for parked routes: `cloud-web-app/web/components/ide/WorkbenchRedirect.tsx`

### 2.2 Editor experience
1. Monaco editor core: `cloud-web-app/web/components/editor/MonacoEditorPro.tsx`
2. Inline edit modal: `cloud-web-app/web/components/editor/InlineEditModal.tsx`
3. Ghost text decorations: `cloud-web-app/web/components/editor/GhostTextDecorations.tsx`
4. Tab and split experience:
- `cloud-web-app/web/components/editor/TabBar.tsx`
- `cloud-web-app/web/components/editor/SplitEditor.tsx`
5. Breadcrumb/navigation context: `cloud-web-app/web/components/editor/Breadcrumbs.tsx`

### 2.3 Terminal and run loop
1. Multi terminal panel: `cloud-web-app/web/components/terminal/XTerminal.tsx`
2. Integrated terminal adapter: `cloud-web-app/web/components/terminal/IntegratedTerminal.tsx`
3. Terminal widget/session UI: `cloud-web-app/web/components/terminal/TerminalWidget.tsx`

## 3. Admin Enterprise Surfaces (High Traffic)
Priority admin pages:
1. `cloud-web-app/web/app/admin/page.tsx`
2. `cloud-web-app/web/app/admin/payments/page.tsx`
3. `cloud-web-app/web/app/admin/apis/page.tsx`
4. `cloud-web-app/web/app/admin/security/page.tsx`
5. `cloud-web-app/web/app/admin/emergency/page.tsx`
6. `cloud-web-app/web/app/admin/analytics/page.tsx`

Admin layout and shared frame:
1. `cloud-web-app/web/app/admin/layout.tsx`

All other admin surface directories:
1. `cloud-web-app/web/app/admin/*/page.tsx`

## 4. API Contracts That Drive UI State
### 4.1 Canonical file authority
1. `cloud-web-app/web/app/api/files/tree/route.ts`
2. `cloud-web-app/web/app/api/files/fs/route.ts`
3. `cloud-web-app/web/app/api/files/raw/route.ts`

### 4.2 Legacy deprecation (must stay explicit)
1. `cloud-web-app/web/app/api/workspace/tree/route.ts`
2. `cloud-web-app/web/app/api/workspace/files/route.ts`
3. `cloud-web-app/web/app/api/auth/sessions/route.ts`
4. `cloud-web-app/web/app/api/auth/sessions/[id]/route.ts`

### 4.3 AI capability gates
1. `cloud-web-app/web/app/api/ai/chat/route.ts`
2. `cloud-web-app/web/app/api/ai/complete/route.ts`
3. `cloud-web-app/web/app/api/ai/action/route.ts`
4. `cloud-web-app/web/app/api/ai/inline-edit/route.ts`
5. `cloud-web-app/web/app/api/ai/change/validate/route.ts`
6. `cloud-web-app/web/app/api/ai/change/apply/route.ts`
7. `cloud-web-app/web/app/api/ai/change/rollback/route.ts`
8. `cloud-web-app/web/lib/server/capability-response.ts`
9. `cloud-web-app/web/lib/ai-chat-advanced-client.ts`

### 4.3.1 Preview runtime observability
1. `cloud-web-app/web/app/api/preview/runtime-health/route.ts`
2. `cloud-web-app/web/app/api/preview/runtime-discover/route.ts`
3. `cloud-web-app/web/components/ide/FullscreenIDE.tsx` runtime status chip + revalidate/auto-discovery controls

### 4.4 Studio orchestration capability gates
1. `cloud-web-app/web/app/api/studio/_lib/studio-gate.ts`
2. `cloud-web-app/web/app/api/studio/session/start/route.ts`
3. `cloud-web-app/web/app/api/studio/session/[id]/route.ts`
4. `cloud-web-app/web/app/api/studio/session/[id]/stop/route.ts`
5. `cloud-web-app/web/app/api/studio/tasks/plan/route.ts`
6. `cloud-web-app/web/app/api/studio/tasks/[id]/run/route.ts`
7. `cloud-web-app/web/app/api/studio/tasks/[id]/validate/route.ts`
8. `cloud-web-app/web/app/api/studio/tasks/[id]/apply/route.ts`
9. `cloud-web-app/web/app/api/studio/tasks/[id]/rollback/route.ts`
10. `cloud-web-app/web/app/api/studio/cost/live/route.ts`
11. `cloud-web-app/web/app/api/studio/access/full/route.ts`
12. `cloud-web-app/web/app/api/studio/access/full/[id]/route.ts`

### 4.5 Payment capability gate
1. `cloud-web-app/web/app/api/billing/checkout/route.ts`
2. `cloud-web-app/web/app/api/admin/payments/gateway/route.ts`

### 4.6 Telemetry/analytics operational baselines
1. `cloud-web-app/web/app/api/analytics/batch/route.ts`
2. `cloud-web-app/web/app/api/admin/analytics/baseline/route.ts`
3. `cloud-web-app/web/components/analytics/WebVitalsReporter.tsx`

## 5. Quality Gates and Scans
Canonical checks (must stay green):
1. `cloud-web-app/web/scripts/interface-critical-gate.mjs`
2. `cloud-web-app/web/scripts/check-canonical-components.mjs`
3. `cloud-web-app/web/scripts/check-route-contracts.mjs`
4. `cloud-web-app/web/scripts/check-no-fake-success.mjs`
5. `cloud-web-app/web/scripts/check-wcag-critical-surfaces.mjs`
6. `cloud-web-app/web/scripts/scan-mojibake.mjs`

Generated evidence docs:
1. `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`
2. `cloud-web-app/web/docs/MOJIBAKE_SCAN.md`

CI workflows:
1. `.github/workflows/ui-audit.yml`
2. `.github/workflows/visual-regression-compare.yml`

## 6. P0 UX Expectations for Any Interface Change
1. Keyboard-first navigation with visible focus.
2. Compact density defaults preserved.
3. Empty/error/loading states explicit and consistent.
4. No blocking browser dialogs.
5. No fake success when capability is unavailable.
6. `/ide` query contract preserved: `file`, `entry`, `projectId`.
7. Optional `/ide` preview bridge query supported: `previewUrl` (http/https only).

## 7. Change Guardrails for Claude
1. Prefer editing canonical components under `components/ide/*` and `components/editor/*`.
2. Do not revive duplicate palette/statusbar variants.
3. Do not route frontend back to `/api/workspace/*`.
4. Keep `not-implemented-ui` explicit for gated capabilities.
5. Run gate suite before claiming completion.

## 8. Delta 2026-02-27 (surface governance)
1. Canonical entry document for interface work is now `docs/master/00_INDEX.md`.
2. Surface-map execution must include structural constraints from `docs/master/22_REPO_CONNECTIVITY_MATRIX_2026-02-27.md`.
3. `/ide` critical path must not rely on mock workspace data in production path.
4. Duplicate surface pairs (e.g., Nexus legacy vs v2) must be explicitly canonicalized before further UX polish.

## 9. Delta 2026-02-28 (coverage closure)
1. Admin emergency surface is now explicit in canonical map and no longer a dangling navigation target.
2. Typed-route gaps for AI change apply/rollback and Studio orchestration APIs are now represented as explicit capability-gated surfaces.

## 10. Delta 2026-03-01 (preview runtime bridge)
1. `cloud-web-app/web/components/ide/FullscreenIDE.tsx` now consumes optional `previewUrl` for external runtime preview handoff.
2. `cloud-web-app/web/components/ide/PreviewPanel.tsx` now supports dual mode:
- inline runtime (`srcDoc`) fallback;
- external dev-server iframe mode (`runtime:dev-server`) when `previewUrl` is provided.
3. `cloud-web-app/web/components/ide/FullscreenIDE.tsx` now auto-opens first viable file from canonical file tree when no `file` query is provided.
4. `cloud-web-app/web/components/ide/FileExplorerPro.tsx` now supports keyboard context-menu interaction (`ContextMenu`/`Shift+F10` + arrow/enter/escape flow).
5. `cloud-web-app/web/components/AethelDashboardRuntime.tsx` forwards persisted `previewUrl` into `/ide` handoff when runtime URL is configured.

## 11. Delta 2026-03-01 (provider setup recovery + compact UX guard)
1. `cloud-web-app/web/components/ai/AIProviderSetupGuide.tsx` is now canonical for provider-missing recovery in chat surfaces.
2. `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx` and `cloud-web-app/web/components/dashboard/DashboardAIChatTab.tsx` now consume the same guided setup UI with active status re-check.
3. `cloud-web-app/web/components/ide/FullscreenIDE.tsx` now includes in-IDE runtime preview controls (apply/clear runtime URL) and compact-viewport warning (`<1024px`) to keep desktop-first behavior explicit.

## 12. Delta 2026-03-01 (settings operationalization)
1. `cloud-web-app/web/app/settings/page.tsx` is now an operational settings surface:
- responsive tab layout;
- real provider status consumption from `/api/ai/provider-status`;
- explicit recovery actions (`/settings?tab=api`, `/docs`) instead of fake API-key cards.
2. Settings now supports deep-link tab contract via query:
- `/settings?tab=editor|profile|billing|api`
- active tab is reflected back to URL for deterministic recovery/handoff.

## 13. Delta 2026-03-01 (chat interruption controls)
1. `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx` now exposes explicit stop action during in-flight generation.
2. `cloud-web-app/web/components/dashboard/DashboardAIChatTab.tsx` now supports stop action in Studio Home chat mode.
3. `cloud-web-app/web/components/AethelDashboardRuntime.tsx` now routes provider setup recovery to `/settings?tab=api` as canonical non-admin path.

## 14. Delta 2026-03-01 (preview health observability)
1. `/ide` runtime settings now display probe status (`checking`, `reachable`, `unreachable`, `unhealthy`) for external preview runtime.
2. Runtime probe uses canonical API surface (`/api/preview/runtime-health`) and keeps inline fallback explicit when runtime is unavailable.
3. `PreviewPanel` now supports health-driven forced fallback to inline runtime with explicit unavailable marker (no silent broken preview).

## 15. Delta 2026-03-01 (editor save visibility)
1. `cloud-web-app/web/components/ide/FullscreenIDE.tsx` now refreshes preview automatically after successful file save.
2. IDE now exposes explicit save status line (`Saving...`, `Saved at ...`, `Ready`) in critical editor flow.

## 16. Delta 2026-03-01 (runtime resilience UX)
1. `/ide` preview runtime rail now supports periodic health polling and manual open-runtime action.
2. `PreviewPanel` now surfaces explicit fallback banner when runtime is unavailable and inline mode is forced.
3. Runtime probe cadence now pauses on hidden tabs and exposes last-check timestamp in runtime rail.

## 17. Delta 2026-03-01 (runtime rail modularization)
1. Runtime rail presentation was extracted to `components/ide/PreviewRuntimeToolbar.tsx`.
2. `FullscreenIDE` now keeps only orchestration callbacks/state for runtime controls.

## 18. Delta 2026-03-01 (chat request parity)
1. `/dashboard` and `/ide` chat paths now use shared helper `lib/ai-chat-advanced-client.ts` for profile inference and fallback retry.
2. Error and capability semantics are aligned between Studio Home and IDE chat surfaces.

## 19. Delta 2026-03-01 (live-preview AI path parity)
1. Dashboard live-preview suggestion flow now reuses shared advanced-chat helper instead of custom fetch path.
2. Single-agent delivery profile is now explicit in helper override for deterministic behavior.

## 20. Delta 2026-03-01 (provider setup metadata parity)
1. `lib/capability-constants.ts` now defines canonical AI provider setup metadata (`setupUrl`, `setupAction`) shared by critical AI capability gates.
2. `lib/ai-chat-advanced-client.ts` now parses and exposes provider setup metadata from capability envelopes.
3. `components/ide/AIChatPanelContainer.tsx` and `components/dashboard/DashboardAIChatTab.tsx` now consume this metadata to avoid hardcoded recovery paths.

## 21. Delta 2026-03-01 (admin analytics baseline surface)
1. Added operational baseline route `app/api/admin/analytics/baseline/route.ts` with 7-day performance/funnel aggregates from canonical analytics ingest.
2. `app/admin/analytics/page.tsx` now consumes this baseline for studio-grade observability (P50/P95, targets, funnel conversion checkpoints).

## 22. Delta 2026-03-01 (state pattern + light token baseline)
1. `styles/globals.css` now includes shared transition-state primitives for loading/error/empty/skeleton patterns.
2. Admin critical surfaces (`admin/apis`, `admin/analytics`) now consume these shared classes for consistent transactional UX.
3. `styles/globals.css` now includes `data-aethel-theme='light'` token overrides as baseline support for light-mode parity.

## 23. Delta 2026-03-01 (cross-surface state adoption)
1. `components/ide/PreviewPanel.tsx` now adopts shared state primitives for fallback/unsupported/empty media scenarios.
2. `components/dashboard/DashboardAIChatTab.tsx` now provides explicit empty chat state and deterministic send gating.
3. `components/ide/AIChatPanelContainer.tsx` stop-generation action now follows shared button style semantics.

## 24. Delta 2026-03-01 (settings provider UX hardening)
1. `app/settings/page.tsx` provider tab now prioritizes canonical guided setup link (`/settings?tab=api`) from provider-status metadata.
2. Admin-only API surface remains secondary action and clearly labeled.
3. Provider tab now uses shared state patterns for empty/error display consistency.

## 25. Delta 2026-03-01 (auth entry + onboarding handoff hardening)
1. `app/(auth)/login/login-v2.tsx` and `app/(auth)/register/register-v2.tsx` now use real auth routes (`/api/auth/login`, `/api/auth/register`) with transactional loading/error states.
2. Register flow now routes to deterministic Studio Home onboarding handoff (`/dashboard?onboarding=1&source=register&mission=...`) instead of direct IDE jump.
3. `components/AethelDashboardRuntime.tsx` now consumes onboarding/source query context to activate first-value guidance on entry.
4. `app/admin/analytics/page.tsx` + `/api/admin/analytics/baseline` now expose signup/login counters in funnel checkpoints.

## 26. Delta 2026-03-01 (collaboration readiness surface)
1. Added admin readiness endpoint `app/api/admin/collaboration/readiness/route.ts` to expose factual realtime-collab status with `PARTIAL` gate semantics.
2. `app/admin/collaboration/page.tsx` now includes operational readiness panel (runtime flags, SLO targets, evidence checklist) plus transactional project controls.
3. Collaboration claim remains blocked for market promotion until stress evidence flips checklist items from pending to verified.

## 27. Delta 2026-03-01 (accessibility evidence baseline)
1. Added critical accessibility evidence document: `cloud-web-app/web/docs/WCAG_CRITICAL_SURFACE_AUDIT.md`.
2. Auth surfaces (`/login`, `/register`) now include skip links, `main` landmarks, and explicit error-to-form accessibility bindings.
3. Accessibility status remains `PARTIAL` until automated WCAG gate and full cross-surface verification are completed.

## 28. Delta 2026-03-01 (collaboration evidence + header action integrity)
1. Added evidence ledger route `app/api/admin/collaboration/evidence/route.ts` for audit-backed PASS/FAIL evidence events.
2. `app/api/admin/collaboration/readiness/route.ts` now returns `evidenceHistory` and `promotionEligible` while keeping capability claim `PARTIAL`.
3. `app/admin/collaboration/page.tsx` now provides transactional evidence controls (mark PASS/FAIL) plus recent evidence timeline.
4. `components/dashboard/DashboardHeader.tsx` now routes IDE action through real callback (`onOpenIde`) and removed ambiguous "Desktop" CTA text.

## 29. Delta 2026-03-01 (responsive entry hardening)
1. `app/landing-v2.tsx` now includes skip-link + `main` landmark and mobile mission shortcuts to reduce first-action friction.
2. `app/dashboard/page.tsx` now shows deterministic loading state while dynamic dashboard shell hydrates.
3. `components/AethelDashboardRuntime.tsx` now exposes explicit auth bootstrap loading state (no blank frame), plus skip-link to main dashboard content.
4. Dashboard toast placement now adapts to small viewports (`left/right` bounded) with `aria-live` status feedback.
5. `components/dashboard/AethelDashboardSidebar.tsx` now has a mobile close control in header and constrained drawer width for phone/tablet ergonomics.

## 30. Delta 2026-03-01 (critical accessibility gate baseline)
1. Added static accessibility QA gate `cloud-web-app/web/scripts/check-wcag-critical-surfaces.mjs`.
2. Gate command: `npm run qa:wcag-critical`.
3. Enterprise freeze chain now includes this gate before build (`qa:enterprise-gate`).
4. Gate scope is intentionally critical-surface/static; full runtime WCAG evidence remains tracked as open.

## 31. Delta 2026-03-01 (collaboration stress-proof gate wiring)
1. Added admin endpoint `app/api/admin/collaboration/evidence/stress-proof/route.ts` for audit-backed stress report attachment.
2. `app/api/admin/collaboration/readiness/route.ts` now includes stress-proof state and requires proof attachment for `promotionEligible=true`.
3. `app/admin/collaboration/page.tsx` now supports stress-proof registration with explicit attached/pending status.

## 32. Delta 2026-03-01 (dashboard runtime weight reduction)
1. `components/dashboard/DashboardOverviewTab.tsx` now lazy-loads `components/LivePreview.tsx` (`ssr:false`) with deterministic loading state.
2. `components/dashboard/tabs/AgentCanvasTab.tsx` now owns React Flow node/edge state internally (parent dashboard no longer carries `@xyflow/react` runtime orchestration).
3. `components/AethelDashboardRuntime.tsx` no longer imports React Flow runtime helpers or global React Flow stylesheet directly.

## 33. Delta 2026-03-04 (onboarding friction + provider preflight hardening)
1. `app/landing-v2.tsx` now always forwards Studio entry with explicit onboarding context (`onboarding=1`, `source=landing-*`) for deterministic first-value activation.
2. `components/dashboard/FirstValueGuide.tsx` now exposes completion progress bar (`0..100%`) and remaining-time hint to reduce ambiguity.
3. `components/AethelDashboardRuntime.tsx` now tracks first-value milestones individually (`first-project`, `first-ai-success`, `first-ide-open`) before final completion metric.
4. `components/ide/AIChatPanelContainer.tsx` and `components/AethelDashboardRuntime.tsx` now run provider preflight (`/api/ai/provider-status`) to show setup gate before first failed prompt.
5. `components/dashboard/DashboardHeader.tsx` now exposes an explicit global CTA (`Configurar IA`) when provider gate is active.

## 34. Delta 2026-03-04 (onboarding observability surface hardening)
1. `app/api/admin/onboarding/stats/route.ts` now returns explicit `IMPLEMENTED` capability contract with:
- first-value funnel counters (`signup -> onboarding entry -> project -> ai -> ide -> completed`);
- conversion rates and median first-value time.
2. `app/admin/onboarding/page.tsx` was rebuilt for operational readability (window selector, conversion cards, searchable action ledger view).
3. `scripts/check-route-contracts.mjs` now enforces onboarding stats contract fields to prevent silent regressions.

## 35. Delta 2026-03-04 (AI monitor core-loop evidence panel)
1. `app/admin/ai-monitor/page.tsx` now reads `/api/ai/change/runs?hours=72&limit=120` and surfaces run-level evidence in the admin monitor.
2. Added summary cards for apply/rollback readiness signals (`applySuccessRate`, `blockedRate`, `regressionRate`, `sandboxCoverage`, `workspaceCoverage`, `total`).
3. Added compact run-group table for last runs (`runId`, window, event types/outcomes, impacted paths) to support operator triage without opening raw logs.

## 36. Delta 2026-03-04 (analytics baseline window selector)
1. `app/admin/analytics/page.tsx` now supports operational time-window selection (`7`, `14`, `30` days) for `/api/admin/analytics/baseline`.
2. Baseline heading/window labels now reflect selected scope instead of fixed `7d`.
3. First-value panel now includes secondary conversion (`project created -> completed`) to reduce blind spots in first-value funnel diagnostics.

## 37. Delta 2026-03-04 (collaboration evidence freshness visibility)
1. `app/api/admin/collaboration/readiness/route.ts` now returns freshness status for evidence bundle (`stale.*`, `maxAgeDays`, `lastPassedAt`).
2. `app/admin/collaboration/page.tsx` now displays stale evidence flags in readiness cards and stress-proof status.
3. Promotion visibility is now time-aware (presence + freshness), reducing false-positive readiness interpretation.

## 38. Delta 2026-03-04 (preview runtime auto-discovery baseline)
1. Added canonical discovery route `app/api/preview/runtime-discover/route.ts` (`IDE_PREVIEW_RUNTIME_DISCOVERY`, `PARTIAL`) with default local candidate scan and explicit candidate-cap semantics.
2. `components/ide/FullscreenIDE.tsx` now supports runtime auto-discovery:
- one-shot automatic scan when preview is enabled and no runtime is configured;
- explicit manual "Auto detectar" action in runtime toolbar.
3. `components/ide/PreviewRuntimeToolbar.tsx` now surfaces runtime discovery state/result messages to avoid silent fallback ambiguity.

## 39. Delta 2026-03-04 (dashboard -> ide runtime continuity hardening)
1. `components/AethelDashboardRuntime.tsx` now attempts runtime discovery during IDE handoff when no persisted runtime URL exists.
2. On successful discovery, handoff now forwards `previewUrl` to `/ide` and persists it in local storage for subsequent sessions.
3. Failure/not-found path remains explicit and non-blocking (handoff continues with inline preview fallback).

## 40. Delta 2026-03-04 (dashboard shell decomposition guard)
1. Added runtime handoff helper `components/dashboard/aethel-dashboard-ide-handoff.ts` to keep shell composition compact.
2. `AethelDashboardRuntime.tsx` keeps orchestration-only role while preserving runtime continuity behavior.

## 41. Delta 2026-03-04 (admin AI monitor production probe control)
1. Added production evidence trigger button in `app/admin/ai-monitor/page.tsx` (`Run Production Probe`).
2. Action calls `/api/admin/ai/core-loop-production-probe` and refreshes readiness/metrics/runs surfaces after completion.

## 42. Delta 2026-03-04 (admin AI monitor operator feedback clarity)
1. `app/admin/ai-monitor/page.tsx` now shows deterministic success/error notice banner after `Run Drill` and `Run Production Probe`.
2. Notices include operational totals (`runs`, `success`, `blocked`, `failed`) and selected probe file when available.
3. Goal: eliminate silent-only console failure mode and keep operator loop transactional in-surface.

## 43. Delta 2026-03-05 (preview runtime managed provision control)
1. Added `app/api/preview/runtime-provision/route.ts` (`IDE_PREVIEW_RUNTIME_PROVISION`, `PARTIAL`) for authenticated runtime provision flow.
2. `components/ide/PreviewRuntimeToolbar.tsx` now exposes `Provisionar runtime` action in runtime strip.
3. `components/ide/FullscreenIDE.tsx` now applies provisioned runtime URL directly and persists it for session continuity.

## 44. Delta 2026-03-05 (onboarding SLO visibility contract)
1. `app/api/admin/onboarding/stats/route.ts` now emits first-value SLO metadata:
- `sampleSize`
- `sloTargetMs`
- `sloStatus` (`pass|fail|insufficient_sample`)
2. `app/admin/onboarding/page.tsx` now renders explicit SLO card with target + verdict.


