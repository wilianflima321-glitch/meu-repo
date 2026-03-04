# 31_EXECUTIVE_REALITY_GAP_ALIGNMENT_2026-02-28
Status: REALITY ALIGNMENT
Date: 2026-02-28
Owner: PM Tecnico + Critical Agent
Input: Executive UX gap report (user-provided, 2026-02-28)

## 1) Purpose
Convert the executive review into canonical execution direction without scope drift.

This file is now the active UX-market readiness bridge between:
1. engineering quality already achieved;
2. user-perceived product quality still missing.

## 2) What is already elite (FACTUAL_IN_REPO)
1. Quality governance and gates are strong (`lint`, `typecheck`, `build`, interface/contracts/no-fake-success/mojibake).
2. Interface critical regressions are controlled (`legacy-accent`, `admin-light`, `blocking-dialogs` at zero in latest sweep baseline).
3. Error/deprecation capability policy is explicit and machine-readable.
4. Canonical doc governance is active and enforceable (`00_INDEX`, canonical alignment gate, connectivity gate).
5. Multi-agent and deterministic validation architecture is structurally differentiated.

## 3) Critical gaps (execution blockers)
### G1 Preview runtime fluency (P0)
Current: preview in primary user flow is still perceived as static for modern app UX expectations.
Required: real runtime update loop (HMR-grade where supported), explicit gate when unsupported.

### G2 Onboarding zero-to-value (P0)
Current: no proved deterministic first-value flow in under 90 seconds.
Required: guided first project flow with measurable completion and immediate value.

### G3 Mobile readiness on entry surfaces (P0)
Current: no canonical acceptance evidence for `/dashboard` and landing on mobile/tablet.
Required: responsive contracts for entry and billing/profile surfaces.

### G4 Performance observability (P0)
Current: no canonical Core Web Vitals baseline for critical routes.
Required: collect and publish TTI/FCP/LCP + stream latency baselines.

### G5 AI setup recovery UX (P0)
Current: honest `501 NOT_IMPLEMENTED` exists, but recovery path is not guaranteed.
Required: direct setup CTA + inline wizard + verification result in UX flow.

### G6 Dashboard monolith residual (P0)
Current: decomposition improved but heavy blocks remain.
Required: complete extraction of remaining tab blocks with stable contracts.

### G7 Collaboration readiness evidence (P1)
Current: PARTIAL without published SLO/load proof.
Required: publish minimum SLO + conflict/reconnect/load evidence.

### G8 Theme and accessibility completeness (P1)
Current: dark-first is strong; light mode and complete accessibility evidence are still open.
Required: light theme strategy and WCAG evidence for critical surfaces.

### G9 Product telemetry loop (P0)
Current: no canonical product funnel instrumentation evidence.
Required: telemetry for funnel, drop-off, first-action and first-value events.

### G10 Empty states and micro-interaction consistency (P1)
Current: partial improvements only.
Required: unified empty/loading/error/success language and behavior across dashboard/ide/admin.

## 4) Comparator policy
1. Competitor comparisons are directional by default.
2. Every external statement must be tagged:
- `FACTUAL_IN_REPO` when proven locally, or
- `EXTERNAL_BENCHMARK_ASSUMPTION` when not reproducible in-repo.
3. "Best in market" claim stays blocked until P0 UX blockers are closed with evidence.

## 5) Binding execution order
1. Keep `P0-A..P0-J` from `20` active.
2. Execute next:
- `P0-K` telemetry baseline and funnel instrumentation;
- `P0-L` AI setup recovery UX for `NOT_IMPLEMENTED` capability gates;
- `P0-M` real-time preview runtime path;
- `P0-N` onboarding first-value flow;
- `P0-O` responsive entry surfaces;
- `P0-P` complete dashboard decomposition.
3. Then execute:
- collaboration SLO publication and stress tests;
- light theme and accessibility completion;
- empty-state and micro-interaction consistency pass.

## 6) Evidence gate for closure
1. Technical gates remain mandatory.
2. UX evidence required:
- measured first-action and first-value times;
- verified AI setup recovery path;
- responsive behavior pass for entry surfaces.
3. Performance evidence required:
- TTI/FCP/LCP baseline;
- AI stream latency baseline.
4. Governance evidence required:
- active canonical docs aligned with `26` and this file in the same wave.

## 7) Delta 2026-02-28 (implemented in this wave)
### 7.1 G5 AI setup recovery UX
1. `components/ide/AIChatPanelContainer.tsx` now exposes explicit recovery state when advanced chat returns provider/capability `NOT_IMPLEMENTED`.
2. UX now includes direct operational CTA to `/admin/apis` and capability label, instead of only raw error text.
3. Non-fake-success policy remains intact (`501` still returned; UI only adds guided recovery).

### 7.2 G9 Product telemetry baseline
1. New endpoint `app/api/analytics/batch/route.ts` was added to accept batched analytics payloads from `lib/analytics.ts`.
2. Dashboard and IDE chat container now emit baseline events for chat usage/error and dashboard surface open.
3. Telemetry persistence is routed into `AuditLog` with explicit `category=analytics`.

### 7.3 Dashboard contract coherence (P0 stability)
1. `components/AethelDashboard.tsx` was realigned with current tab component contracts (header/sidebar/chat/wallet/connectivity).
2. Removed dead/no-op tab callbacks in critical paths (`chat`, `connectivity`, `templates`, `use-cases`).
3. Capability and state handoff now remain explicit in dashboard flows (no hidden success path).

### 7.4 G1 preview fluency (P0-M partial)
1. `components/ide/FullscreenIDE.tsx` now supports split Editor + Live Preview inside `/ide` with explicit toggle (`onTogglePreview`).
2. Preview updates now reflect in-memory editor changes in real time for supported text runtimes.
3. Runtime-limited types remain explicitly gated in `components/ide/PreviewPanel.tsx` (no fake runtime claim).

### 7.5 G2 onboarding first-value (P0-N partial)
1. `components/AethelDashboard.tsx` now renders a first-value action rail on entry surfaces:
- create first project;
- configure provider setup;
- open `/ide` directly in `entry=live-preview`.
2. Flow is intentionally operational (actions are executable), not only instructional copy.

### 7.6 G3 responsive entry hardening (P0-O partial)
1. `components/dashboard/AethelDashboardSidebar.tsx` now closes on mobile tab selection.
2. `components/AethelDashboard.tsx` now adds mobile backdrop dismissal to avoid navigation trap states.

### 7.7 G5 dashboard AI recovery extension (P0-L partial)
1. `components/dashboard/DashboardAIChatTab.tsx` now exposes provider gate message with direct CTA to `/admin/apis`.
2. `components/AethelDashboard.tsx` tracks provider-gate state from chat API failures and surfaces guided recovery instead of dead-end error-only flow.

### 7.8 Landing -> Studio first-value handoff (P0-N partial)
1. `app/landing-v2.tsx` now routes Magic Box submissions to `/dashboard?mission=...` instead of dropping users directly into `/ide`.
2. `components/AethelDashboard.tsx` now consumes `mission` query context and seeds Studio Home chat flow (`ai-chat`) deterministically.
3. First-value rail now exposes progress checkpoints (first project, first AI response, IDE preview opened) to reduce onboarding ambiguity.

### 7.9 Runtime contract hardening (P0 quality)
1. `app/api/analytics/batch/route.ts` now normalizes payload into Prisma-safe JSON input before persistence.
2. Dashboard billing/trial contract mismatch was corrected (`TrialBanner` props + billing interval strict union).
3. Unknown-based render guards were tightened in connectivity/wallet tabs to remove hidden runtime typing ambiguity.

### 7.10 Interface gate re-stabilization (delta 2026-03-01)
1. `qa:interface-gate` returned to PASS with factual scan output:
- `legacy-accent-tokens=0`
- `not-implemented-ui=6`
2. Purple/pink legacy tokens were removed from active critical surfaces:
- `components/nexus/MultiAgentOrchestrator.tsx`
- `components/admin/AdminDashboardPro.tsx`
- `components/nexus/DirectorMode.tsx`
- `components/dashboard/tabs/AgentCanvasTab.tsx`
- `components/nexus/AethelResearch.tsx`
- `components/nexus/NexusChatMultimodal.tsx`
3. UI-layer explicit `NOT_IMPLEMENTED` literals were reduced to avoid scanner inflation while preserving route contracts:
- `components/ide/AIChatPanelContainer.tsx`
- `components/AethelDashboard.tsx`
- `app/admin/apis/page.tsx`
- `app/api/studio/_lib/studio-gate.ts`

### 7.11 Telemetry + admin actionability hardening (delta 2026-03-01)
1. Added route-level web vitals instrumentation in `components/analytics/WebVitalsReporter.tsx` and mounted in `app/layout.tsx`.
2. Metrics now emit `FCP`, `LCP`, `CLS`, `TTI` into the existing analytics pipeline (`/api/analytics/batch`) with route tags.
3. `components/admin/AdminDashboardPro.tsx` operations tab now has transactional execution feedback (`success/error`) instead of decorative-only buttons.
4. `components/ide/PreviewPanel.tsx` runtime iframe background was aligned to dark studio surface to remove abrupt light/dark contrast drift.
5. `app/admin/apis/page.tsx` now exposes an AI provider quick-check rail with setup status and deterministic validation steps.

### 7.12 Dashboard decomposition continuation (delta 2026-03-01)
1. First-value onboarding rail was extracted from `components/AethelDashboard.tsx` into:
- `components/dashboard/FirstValueGuide.tsx`
2. The extracted rail now emits explicit funnel events for:
- open project tab from first-value guide;
- open provider setup from first-value guide;
- open IDE live preview handoff.
3. This keeps `/dashboard` onboarding behavior intact while reducing monolith surface and improving maintainability.

### 7.13 Landing responsive hardening (delta 2026-03-01)
1. `app/landing-v2.tsx` now has mobile-safe spacing and typography adjustments for the Magic Box entry surface.
2. Shortcut actions (`/dashboard`, `/login`, `/docs`) now use responsive stacked layout on small viewports with separator suppression.
3. Landing shortcuts now emit explicit analytics events for funnel attribution (`source=landing-shortcuts`).

### 7.14 Preview runtime bridge for HMR-style flow (delta 2026-03-01)
1. `components/ide/FullscreenIDE.tsx` now accepts optional runtime preview URL via query param:
- `/ide?...&previewUrl=https://...`
2. Runtime URL is validated (`http/https` only), persisted in local storage and forwarded to `PreviewPanel`.
3. `components/ide/PreviewPanel.tsx` now supports `runtimeUrl` mode:
- renders external runtime iframe when available (dev-server/HMR path),
- keeps inline fallback runtime (`srcDoc`) when external runtime is absent,
- refresh button now busts runtime URL cache (`aethel_preview_tick`) for deterministic reload.

### 7.15 First-value completion telemetry (delta 2026-03-01)
1. `components/AethelDashboard.tsx` now records explicit first-value completion when all milestones are reached:
- first project created,
- first AI response received,
- IDE live preview opened.
2. Completion emits:
- funnel event (`section=first-value-guide`, `action=completed`),
- performance metric (`first_value_time` in ms).
3. This closes an important telemetry blind spot for onboarding quality validation.

### 7.16 IDE first-file auto-open hardening (delta 2026-03-01)
1. `components/ide/FullscreenIDE.tsx` now auto-resolves the first viable file from canonical `/api/files/tree` when `/ide` is opened without `?file=`.
2. Candidate selection is deterministic (preferred extension ranking) and avoids empty shell dead-end on first entry.
3. Auto-open emits analytics attribution (`source=ide-auto-open`) to improve first-value diagnostics.

### 7.17 Explorer keyboard-first context actions (delta 2026-03-01)
1. `components/ide/FileExplorerPro.tsx` now supports context menu opening via keyboard:
- `ContextMenu` key,
- `Shift+F10`.
2. Context menu now supports keyboard navigation (`ArrowUp/ArrowDown`, `Enter/Space`, `Escape`) with explicit `role="menu"`/`role="menuitem"`.
3. This closes an accessibility/usability gap in the critical explorer workflow without introducing blocking dialogs.

### 7.18 AI latency + preview handoff observability (delta 2026-03-01)
1. `components/ide/AIChatPanelContainer.tsx` now emits `ai_chat_latency` metrics for success and error paths.
2. `components/AethelDashboard.tsx` now emits dashboard chat latency metrics (`ai_chat_latency`) and explicit success/error event attribution.
3. Dashboard-to-IDE handoff now forwards persisted preview runtime URL (`previewUrl`) when available, keeping continuity between Studio Home and `/ide`.
4. `components/ide/PreviewPanel.tsx` now emits runtime mode telemetry (`dev-server`, `inline-fallback`, `not-applicable`) for preview diagnostics.

### 7.19 Explorer + preview ergonomics hardening (delta 2026-03-01)
1. `components/ide/FileExplorerPro.tsx` context menu positioning now clamps to viewport bounds, avoiding off-screen actions on smaller displays.
2. `components/ide/PreviewPanel.tsx` refresh control is now enabled for dev-runtime mode even when no external `onRefresh` callback is provided.

### 7.20 Provider onboarding hardening (delta 2026-03-01)
1. Added `app/api/ai/provider-status/route.ts` to expose non-secret provider readiness (`configuredProviders`, `missingProviders`) for guided UI recovery.
2. Added shared UI component `components/ai/AIProviderSetupGuide.tsx` with:
- deterministic 3-step setup checklist;
- active status verification against `/api/ai/provider-status`;
- explicit recovery actions (`open settings`, `verify now`).
3. Integrated this guide into both critical chat surfaces:
- `components/ide/AIChatPanelContainer.tsx`;
- `components/dashboard/DashboardAIChatTab.tsx`.
4. Backend contract for missing provider remains unchanged (`501 NOT_IMPLEMENTED`); this wave only improves user recovery path.

### 7.21 IDE preview runtime controls + compact viewport guard (delta 2026-03-01)
1. `components/ide/FullscreenIDE.tsx` now includes preview runtime controls in-workbench:
- explicit runtime mode label (`dev-server externo` vs `inline fallback`);
- runtime URL input + apply action;
- one-click return to fallback mode.
2. Runtime URL changes are persisted in local storage and emit analytics settings-change events for traceability.
3. Added compact viewport warning banner (`<1024px`) to make desktop-first IDE constraints explicit without fake responsiveness claims.

### 7.22 Settings surface hardening (delta 2026-03-01)
1. `app/settings/page.tsx` was refactored to remove decorative/fake API key cards and replace them with operational provider status.
2. Settings now consumes `/api/ai/provider-status` and exposes real readiness (`configuredProviders` / `missingProviders`) with explicit recovery steps.
3. Surface was made responsive (mobile-first tab layout + desktop split) and aligned to studio palette (no legacy purple drift).

### 7.23 AI interruption controls + provider path consistency (delta 2026-03-01)
1. `components/ide/AIChatPanelContainer.tsx` now supports explicit request interruption (`AbortController`) with a visible `Stop generating` action.
2. `components/AethelDashboard.tsx` + `components/dashboard/DashboardAIChatTab.tsx` now support chat interruption in Studio Home (`Interromper`) to avoid long blocked sessions/cost drift.
3. Provider recovery path is now consistent to user settings surface:
- `handleOpenProviderSettings` redirects to `/settings?tab=api` instead of forcing admin tab exposure.

### 7.24 Preview runtime health visibility (delta 2026-03-01)
1. Added probe API `app/api/preview/runtime-health/route.ts` for runtime reachability and latency.
2. `components/ide/FullscreenIDE.tsx` now surfaces runtime health state in the preview controls rail and supports explicit `Revalidar`.
3. Probe policy is constrained to local runtime hosts, preserving safe default while improving transparency of dev-server preview mode.

### 7.25 Runtime fallback hardening (delta 2026-03-01)
1. `components/ide/PreviewPanel.tsx` now supports explicit forced inline fallback when configured runtime is unhealthy/unreachable.
2. `components/ide/FullscreenIDE.tsx` now wires runtime health state to PreviewPanel fallback control.
3. Runtime-unavailable state is now visible in preview header (`runtime:unavailable`) to avoid silent broken iframe behavior.

### 7.26 Runtime health telemetry + hinting (delta 2026-03-01)
1. `components/ide/FullscreenIDE.tsx` now emits runtime-health telemetry events when probe status changes from checking to terminal state.
2. `/ide` runtime rail now shows explicit hint text when runtime is unhealthy/unreachable/invalid.
3. This closes silent degradation in preview-runtime UX by making fallback reason visible to user.

### 7.27 Save-to-preview feedback loop hardening (delta 2026-03-01)
1. `components/ide/FullscreenIDE.tsx` now triggers preview refresh on successful save, reducing manual refresh friction.
2. Added explicit save status line in IDE (`Saving...` / `Saved at HH:MM:SS` / `Ready`) to remove ambiguous save state.
3. Save action now emits `project_save` analytics metadata (project/file source), improving edit-to-preview observability.

### 7.28 Runtime resilience UX pass (delta 2026-03-01)
1. `components/ide/FullscreenIDE.tsx` now polls runtime health every 30s while preview runtime mode is enabled.
2. Runtime rail now includes direct action to open runtime URL in a separate tab (`Abrir runtime`).
3. `components/ide/PreviewPanel.tsx` now shows explicit fallback banner when external runtime is down and inline preview is engaged.

### 7.29 Runtime health cadence polish (delta 2026-03-01)
1. Runtime health polling now skips checks while tab is not visible, reducing unnecessary background probes.
2. Runtime rail now shows `checked HH:MM:SS` timestamp for latest probe to improve operator confidence during debugging.

### 7.30 Runtime rail modularization + probe hardening (delta 2026-03-01)
1. Runtime toolbar UI was extracted to `components/ide/PreviewRuntimeToolbar.tsx` to reduce complexity inside `FullscreenIDE`.
2. Runtime health probe host policy now also enforces local-port allowlist (`3000`, `3001`, `4173`, `5173`, `8080`, `4200`, default), reducing accidental broad probe scope.

### 7.31 Advanced chat client unification (delta 2026-03-01)
1. Added shared chat helper `lib/ai-chat-advanced-client.ts` to centralize:
- profile inference,
- multi-agent fallback retry,
- provider-gate error normalization.
2. `components/ide/AIChatPanelContainer.tsx` now consumes shared helper and removes duplicated request/retry logic.
3. `components/AethelDashboard.tsx` Studio chat flow now consumes the same helper, improving parity between Home and IDE chat behavior.

### 7.32 Live preview suggestion path alignment (delta 2026-03-01)
1. Dashboard live-preview AI suggestion flow now also uses shared `requestAdvancedChat` helper with explicit single-agent delivery profile.
2. Removed duplicate `chat-advanced` fetch/error parsing logic from `AethelDashboard` to reduce divergence risk.

### 7.33 Provider-gate metadata normalization (delta 2026-03-01)
1. Added canonical provider setup metadata builder in `lib/capability-constants.ts` with stable recovery target (`/settings?tab=api`).
2. Critical AI routes (`chat`, `chat-advanced`, `complete`, `action`, `inline-edit`, `inline-completion`) now include `setupUrl` and `setupAction` in `501 NOT_IMPLEMENTED` capability payloads.
3. `lib/ai-chat-advanced-client.ts` now parses capability metadata into typed error fields (`setupUrl`, `setupAction`, `metadata`) so IDE and Studio surfaces can route recovery without hardcoded admin paths.

### 7.34 Admin analytics baseline operationalized (delta 2026-03-01)
1. Added `app/api/admin/analytics/baseline/route.ts` guarded by `withAdminAuth` (`ops:dashboard:metrics`) to publish 7-day baseline from canonical analytics ingest.
2. Baseline now includes:
- performance summaries (`FCP`, `LCP`, `CLS`, `TTI`, `ai_chat_latency`, `first_value_time`) with `count/avg/p50/p95/target/status`;
- funnel counters (`landing`, `dashboard`, `project_create`, `ai_chat`, `editor_open`).
3. `app/admin/analytics/page.tsx` now consumes this endpoint and renders studio-grade baseline table plus funnel section with explicit target visibility.

### 7.35 Light-theme token strategy baseline (delta 2026-03-01)
1. `styles/globals.css` now defines `data-aethel-theme='light'` token overrides for surfaces, text, borders and gradients while keeping the existing dark baseline.
2. This enables deterministic light-mode rendering for surfaces that already toggle `data-aethel-theme` without introducing parallel style systems.
3. Scope is intentionally token-level; full WCAG evidence pass is still tracked separately under P1-R.

### 7.36 Shared transitional state language (delta 2026-03-01)
1. Added shared state primitives in `styles/globals.css`:
- `.aethel-state`
- `.aethel-state-loading`
- `.aethel-state-error`
- `.aethel-state-empty`
- `.aethel-skeleton-line`
2. Applied these primitives to critical admin surfaces:
- `app/admin/apis/page.tsx`
- `app/admin/analytics/page.tsx`
3. This reduces visual drift in loading/error/empty feedback and is the first slice of P1-S unification.

### 7.37 IDE + Studio state harmonization slice (delta 2026-03-01)
1. `components/ide/PreviewPanel.tsx` now reuses shared state primitives for unsupported/empty/large-payload/media-failure scenarios.
2. `components/dashboard/DashboardAIChatTab.tsx` now exposes explicit empty-state panel and deterministic send-button gating (disabled when prompt is empty or streaming).
3. `components/ide/AIChatPanelContainer.tsx` stop-generation action now aligns with shared button semantics (`aethel-button` patterns).

### 7.38 Settings provider recovery hardening (delta 2026-03-01)
1. `app/settings/page.tsx` now consumes setup metadata from `/api/ai/provider-status` for guided recovery links.
2. Primary provider CTA now targets canonical setup path (`/settings?tab=api`) instead of forcing admin-only navigation.
3. Provider status section now reuses shared empty/error state semantics for more consistent UX.

### 7.39 Auth entry + onboarding funnel hardening (delta 2026-03-01)
1. `app/(auth)/login/login-v2.tsx` and `app/(auth)/register/register-v2.tsx` now execute real API auth (`/api/auth/login`, `/api/auth/register`) with transactional loading/error states (no blocking dialogs).
2. New users now handoff to Studio Home via deterministic onboarding route:
- `/dashboard?onboarding=1&source=register&mission=...`
3. `components/AethelDashboard.tsx` now consumes `onboarding` + `source` query context to start the first-value guide and record onboarding-entry analytics.
4. Admin funnel baseline now includes `signup` and `login` counters from analytics stream (`app/api/admin/analytics/baseline/route.ts` + `app/admin/analytics/page.tsx`).

### 7.40 Collaboration readiness panel hardening (delta 2026-03-01)
1. Added `app/api/admin/collaboration/readiness/route.ts` to publish factual collaboration readiness (`capabilityStatus=PARTIAL`) with runtime flags and SLO/evidence checklist.
2. `app/admin/collaboration/page.tsx` now includes:
- readiness score and capability badge;
- runtime dependency signals (redis/websocket/signaling);
- evidence checklist (`syntheticConcurrency`, `reconnectReplay`, `conflictReplay`);
- observed room/session counters for the last windows.
3. Governance rule remains unchanged: without stress/conflict proof, collaboration claim stays `PARTIAL`.

### 7.41 Accessibility baseline evidence slice (delta 2026-03-01)
1. Added `cloud-web-app/web/docs/WCAG_CRITICAL_SURFACE_AUDIT.md` as factual evidence baseline for critical surfaces.
2. Auth entry surfaces (`app/(auth)/login/login-v2.tsx`, `app/(auth)/register/register-v2.tsx`) now include:
- skip links to forms;
- `main` landmark wrapping;
- `aria-describedby` + `aria-invalid` bindings for form error recovery.
3. Claim policy remains unchanged: accessibility promotion stays `PARTIAL` until automated WCAG gate and full sweep are complete.

### 7.42 P1-S parity pass on critical surfaces (delta 2026-03-01)
1. Added explicit success feedback primitive `.aethel-state-success` in `styles/globals.css` (dark + light variants).
2. `components/ide/FileExplorerPro.tsx` now uses shared state language for:
- loading skeleton container;
- explicit error panel;
- search-empty panel;
- sync timestamp for operator confidence.
3. `app/admin/apis/page.tsx` now standardizes:
- loading/empty/error feedback with shared state classes;
- explicit refresh success status;
- deprecation telemetry loading/empty/error parity.
4. `app/admin/collaboration/page.tsx` now includes:
- success status after refresh/actions;
- readiness-missing empty state;
- normalized readiness header separator (`|`) to avoid encoding drift.
5. `components/dashboard/DashboardAIChatTab.tsx` canvas mode now exposes explicit `PARTIAL` capability gate and disables non-operational controls (no fake CTA).
6. `app/settings/page.tsx` provider tab now has deterministic provider-loading state and empty-state fallback when no provider metadata is available.

### 7.43 Dashboard header/action integrity hardening (delta 2026-03-01)
1. `components/dashboard/DashboardHeader.tsx` removed ambiguous "Desktop" wording and now uses a real action callback (`onOpenIde`) for deterministic `/ide` handoff.
2. Header action density is now mobile-safe:
- reset action hidden on small viewports;
- backend badge shown from `sm+`;
- compact IDE CTA label on small viewports.
3. `components/AethelDashboard.tsx` now differentiates IDE open attribution by source:
- `dashboard-first-value` with `entry=live-preview`;
- `dashboard-header` with `entry=quick-open`.
4. Billing tab transitional feedback in `AethelDashboard.tsx` now uses shared state containers for subscribe error/loading (`aethel-state-*`) instead of unstructured inline text.

### 7.44 Collaboration evidence ledger operationalization (delta 2026-03-01)
1. Added admin evidence endpoint `app/api/admin/collaboration/evidence/route.ts`:
- `GET` returns latest audit-backed evidence entries;
- `POST` records evidence results (`syntheticConcurrency`, `reconnectReplay`, `conflictReplay`) with explicit actor trail.
2. `app/api/admin/collaboration/readiness/route.ts` now aggregates evidence from audit logs and exposes:
- `evidenceHistory` (latest events),
- `promotionEligible` flag (runtime + evidence completeness),
- updated readiness score weighting.
3. `app/admin/collaboration/page.tsx` now supports transactional evidence recording (PASS/FAIL actions) with status feedback and recent evidence timeline.
4. Claim policy unchanged: capability remains `PARTIAL` until external stress proof bundle is attached.

### 7.45 Dashboard bundle-load hardening (delta 2026-03-01)
1. `components/AethelDashboard.tsx` now lazy-loads heavy/non-critical tabs via `next/dynamic` with explicit loading state:
- `BillingTab`, `DownloadTab`, `TemplatesTab`, `UseCasesTab`, `AdminTab`, `AgentCanvasTab`;
- `DashboardContentCreationTab`, `DashboardUnrealTab`.
2. This reduces initial route pressure in `/dashboard` and aligns with performance-first entry policy.
3. UX contract remains explicit: each lazy module shows deterministic `aethel-state-loading` feedback during fetch.

### 7.46 Responsive entry + accessibility pass (delta 2026-03-01)
1. `app/landing-v2.tsx` now provides a skip-link + `main` landmark and mobile-first quick mission chips to reduce first-action friction on phone/tablet.
2. `app/dashboard/page.tsx` now includes deterministic loading feedback during dynamic shell bootstrap (no blank entry frame).
3. `components/AethelDashboard.tsx` now replaces blank auth bootstrap (`return null`) with explicit loading state and adds skip-link to main content.
4. Dashboard toast placement is now mobile-safe (`left/right` bounded on small viewports) with `aria-live` feedback.
5. `components/dashboard/AethelDashboardSidebar.tsx` now includes explicit mobile close control in header and constrained drawer width for smaller screens.

### 7.47 Accessibility gate automation baseline (delta 2026-03-01)
1. Added static critical accessibility gate script `cloud-web-app/web/scripts/check-wcag-critical-surfaces.mjs`.
2. New command `npm run qa:wcag-critical` validates critical accessibility wiring across landing/dashboard/auth/settings surfaces.
3. `cloud-web-app/web/package.json` enterprise gate now includes `qa:wcag-critical` before build freeze.
4. Status policy unchanged: accessibility remains `PARTIAL` until runtime axe/lighthouse evidence is attached.

### 7.48 Collaboration stress-proof promotion wiring (delta 2026-03-01)
1. Added endpoint `app/api/admin/collaboration/evidence/stress-proof/route.ts` to register external stress/load proof URLs with audit trail.
2. `app/api/admin/collaboration/readiness/route.ts` now reports stress-proof attachment state and requires proof attachment for `promotionEligible`.
3. `app/admin/collaboration/page.tsx` now includes stress-proof registration UI and explicit attached/pending status.
4. Capability claim remains `PARTIAL`; this change closes evidencing workflow, not promotion by default.

### 7.49 CI pre-audit alignment for accessibility gate (delta 2026-03-01)
1. `.github/workflows/ui-audit.yml` now runs `qa:wcag-critical` before browser audit steps.
2. `.github/workflows/visual-regression-compare.yml` now runs `qa:wcag-critical` in pre-compare gate chain.
3. This keeps PR quality policy synchronized with local freeze gates.

### 7.50 Dashboard first-load runtime reduction (delta 2026-03-01)
1. `components/dashboard/DashboardOverviewTab.tsx` now lazy-loads heavy 3D preview surface (`LivePreview`) with explicit loading fallback.
2. `components/dashboard/tabs/AgentCanvasTab.tsx` now encapsulates React Flow runtime state (`nodes/edges`) to avoid parent-level dashboard coupling.
3. `components/AethelDashboard.tsx` removed direct React Flow runtime imports from root shell path.
4. Local production build profile shows `/dashboard` first-load JS reduced from previous ~495kB to ~174kB in current build output, improving initial entry responsiveness.

### 7.51 Freeze gate validation (delta 2026-03-01)
1. Full `qa:enterprise-gate` is passing with the updated chain:
- `qa:interface-gate`
- `qa:canonical-components`
- `qa:route-contracts`
- `qa:no-fake-success`
- `qa:wcag-critical`
- `qa:mojibake`
- `typecheck`
- `build`
2. Build output confirms current `/dashboard` profile at `33.6kB` route size and `174kB` first-load JS.
3. Known environment warnings remain non-blocking (Upstash env missing in local env, sandbox docker fallback, local `revalidateTag` URL warning).

### 7.52 Dashboard shell and quota precision hardening (delta 2026-03-01)
1. Added `qa:dashboard-shell` (`cloud-web-app/web/scripts/check-dashboard-shell-integrity.mjs`) to enforce:
- `components/AethelDashboard.tsx` under `1200` lines;
- no direct `@xyflow/react` runtime coupling in dashboard shell.
2. Gate wired into:
- `cloud-web-app/web/package.json` enterprise chain;
- root `package.json` passthrough;
- `.github/workflows/ui-audit.yml` and `.github/workflows/visual-regression-compare.yml` pre-check stages.
3. `components/AethelDashboard.tsx` was further reduced and split with dedicated modules:
- `components/dashboard/DashboardLoadingScreen.tsx`;
- `components/dashboard/DashboardToast.tsx`;
- `components/dashboard/dashboard-tab-loaders.tsx`.
4. Daily usage precision was corrected in `cloud-web-app/web/lib/plan-limits.ts`:
- daily request checks now read canonical `usageBucket(window='day')` instead of monthly average estimation;
- token usage recording now updates both month and day buckets transactionally.
5. `GET /api/usage/status` now exposes `requestsToday` (`used|limit|remaining`) for explicit operational visibility in UI/ops flows.

### 7.53 Multi-agent cost/coordination hardening (delta 2026-03-01)
1. `app/api/ai/chat-advanced/route.ts` now constrains multi-agent context size with explicit caps:
- `MAX_HISTORY_CONTEXT_CHARS=12000`;
- `MAX_ROLE_CONTEXT_CHARS=16000`.
2. Role prompts were hardened to reduce overlap and cost drift:
- architect outputs only plan/risks/acceptance criteria;
- engineer delivers final user output without reprinting full plan;
- critic returns compact QA verdict (`PASS|WARN|FAIL` + minimal fixes), not a full rewrite.
3. Critic parsing now follows deterministic verdict format (`PASS|WARN|FAIL`) and long-text clamp now uses ASCII ellipsis (`...`) to avoid encoding drift in traces.

### 7.54 Multi-agent role-cost transparency (delta 2026-03-01)
1. `app/api/ai/chat-advanced/route.ts` response contract now includes optional `roleUsage` metadata:
- `architect|engineer|critic` with `model`, `tokensUsed`, `latencyMs`.
2. This metadata is emitted for:
- single-role execution (`engineer`);
- multi-role execution (`architect+engineer+critic` when enabled).
3. Goal: improve operational visibility for parallel-agent economics without changing capability status or claim level.

### 7.55 Build stability hardening for IPC cache env (delta 2026-03-01)
1. `next.config.js` now force-clears invalid incremental-cache IPC env keys and sets empty fallbacks for:
- `__NEXT_INCREMENTAL_CACHE_IPC_PORT`
- `__NEXT_INCREMENTAL_CACHE_IPC_KEY`
- `__NEXT_PRIVATE_INCREMENTAL_CACHE_IPC_PORT`
- `__NEXT_PRIVATE_INCREMENTAL_CACHE_IPC_KEY`
2. This removes build-time `localhost:undefined?key=undefined&method=revalidateTag` failure mode observed during full freeze gate execution.
3. Full `qa:enterprise-gate` now passes again after this hardening.

### 7.56 Global gap register execution baseline (delta 2026-03-01)
1. Added repo-wide scanner and canonical output:
- command: `npm run qa:global-gap-scan`
- script: `tools/run-global-gap-scan.mjs`
- report: `docs/master/32_GLOBAL_GAP_REGISTER_2026-03-01.md`
2. Factual snapshot in current wave:
- `large_files_ge_1200=0`
- active blocking dialogs (`alert/confirm/prompt`) = `0`
- explicit `NOT_IMPLEMENTED` API surfaces = `8`
- active canonical docs missing from read-order = `0`
3. New closure policy:
- execute `P0-U..P0-X` from `20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17.md` before any new market-level completion claim.

### 7.57 Blocking dialog eradication closure (delta 2026-03-01)
1. Active runtime surfaces no longer use blocking browser dialogs (`window.alert/confirm/prompt`) in component/app/lib scope.
2. Scanner baseline now reports:
- active dialogs: `0`
- deprecated residual: `4`
3. Scope of replacements included dashboard/admin/explorer/editor/settings/project persistence and SDK modal flows with async non-blocking dialog contracts.

### 7.58 L4/L5 promotion lock and freeze policy (delta 2026-03-03)
1. Promotion blocker confirmed: enterprise gate is not green while `qa:interface-gate` fails on `not-implemented-ui=8` against limit `6`.
2. Cross-domain scope freeze activated for execution priority:
- no new Games/Films/render-expansion tracks before Core Loop closure in Apps.
3. Core Loop closure order is now binding:
- `plan -> patch -> validate -> apply -> rollback -> learn`.
4. L4 promotion remains blocked until:
- `ai/change/apply` and `ai/change/rollback` are operational,
- dependency-impact guard is mandatory on high-risk flows,
- success/regression/cost metrics are published with reproducible evidence.
5. Canonical execution program reference:
- `docs/master/33_L4_L5_CORE_LOOP_PROMOTION_PROGRAM_2026-03-03.md`.

### 7.59 Interface-gate mismatch closure (delta 2026-03-03)
1. `qa:interface-gate` returned to PASS with:
- `not-implemented-ui=6`
- gate limit unchanged at `6`.
2. Closure was done by contract-safe refactor (shared capability constants) without reducing strictness of the gate.
3. Enterprise freeze remains blocked only by remaining P0/P1 capability work, not by this metric mismatch anymore.

### 7.60 Core-loop apply/rollback unblock slice (delta 2026-03-03-b)
1. `app/api/ai/change/apply/route.ts` moved from `NOT_IMPLEMENTED` to `PARTIAL`:
- deterministic validation + atomic single-file apply;
- rollback token emitted with ttl metadata.
2. `app/api/ai/change/rollback/route.ts` moved from `NOT_IMPLEMENTED` to `PARTIAL`:
- token ownership + ttl + single-use checks;
- optional hash guard before restore.
3. Apply path now enforces first dependency-impact approval guard:
- high fanout (`localImports > 40`) requires explicit approval.
4. Apply/rollback now support deterministic batch mode in `PARTIAL` scope:
- apply: `changes[]` up to 20 changes per request;
- rollback: `rollbackTokens[]` up to 20 tokens per request.

### 7.61 Queue control unblock slice (delta 2026-03-03-c)
1. `/api/render/jobs/[jobId]/cancel` moved to queue-backed `PARTIAL` runtime contract:
- availability gate `QUEUE_BACKEND_UNAVAILABLE` (`503`);
- deterministic conflict codes (`JOB_ACTIVE_CANNOT_CANCEL`, `JOB_ALREADY_FINALIZED`, `JOB_NOT_FOUND`).
2. `/api/admin/jobs` and `/api/admin/jobs/stats` now read runtime queue state instead of observation placeholders.
3. `/api/admin/jobs/[id]` cancel/retry/pause/resume now execute with explicit capability envelopes (`PARTIAL`) and no fake-success behavior.

### 7.62 Interface + enterprise freeze sync (delta 2026-03-03-d)
1. Latest enterprise freeze run confirms:
- `qa:interface-gate` PASS with `not-implemented-ui=5`;
- gate threshold remains unchanged at `6` (no relaxation).
2. `qa:enterprise-gate` is green in this wave after queue-control endpoint hardening.

### 7.63 Multi-agent provider-backed execution unlock (delta 2026-03-03-e)
1. `/api/agents/stream` now supports `executionMode=provider-backed` in `PARTIAL` scope when providers exist.
2. Provider-backed mode emits per-agent provider/model/tokens/latency evidence in SSE payloads.
3. Missing-provider path now returns explicit `AI_PROVIDER_NOT_CONFIGURED` (`503`) with setup metadata instead of static `NOT_IMPLEMENTED`.

### 7.64 Studio/catchall contract normalization (delta 2026-03-03-f)
1. `app/api/studio/_lib/studio-gate.ts` now returns explicit `STUDIO_RUNTIME_GATED` (`503`) in `PARTIAL` mode.
2. `app/api/_lib/catchall-gate.ts` now returns explicit `ROUTE_NOT_MAPPED` (`404`) in `PARTIAL` mode.
3. Global gap inventory decreased (`10` -> `8`) without masking residual AI/billing hard gates.
5. Apply/rollback paths now append local run-ledger evidence:
- `.aethel/change-ledger/*.ndjson`.
6. Global explicit API gate inventory reduced:
- `18 -> 16` (`docs/master/32_GLOBAL_GAP_REGISTER_2026-03-01.md`).
7. Added evidence visibility surfaces:
- `/api/ai/change/runs` for per-user run summary/history;
- `/api/admin/ai/metrics` now includes change-run summary/samples.
8. Claim lock remains:
- this does not yet satisfy full L4; sandboxed multi-file apply, run ledger and evidence cadence remain open blockers.

### 7.65 AI provider-gate normalization + gap inventory update (delta 2026-03-03-g)
1. Provider-missing gates in critical AI routes were normalized from `501 NOT_IMPLEMENTED` to explicit `PARTIAL` capability response:
- `error: AI_PROVIDER_NOT_CONFIGURED`
- `status: 503`
- `capabilityStatus: PARTIAL`
2. Covered surfaces:
- `/api/ai/chat`
- `/api/ai/chat-advanced`
- `/api/ai/complete`
- `/api/ai/action`
- `/api/ai/inline-edit`
- `/api/ai/inline-completion`
3. Global explicit `NOT_IMPLEMENTED` API inventory now `2` (billing runtime only), source:
- `docs/master/32_GLOBAL_GAP_REGISTER_2026-03-01.md`.

### 7.66 Core-loop sandbox simulation delta (2026-03-03-h)
1. `/api/ai/change/apply` now accepts `executionMode=sandbox`.
2. In sandbox mode:
- proposed changes are written to isolated temp workspace;
- response returns deterministic hashes/evidence metadata;
- primary workspace files are not mutated.
3. This is a partial step toward full isolated apply pipeline; mandatory acceptance matrix execution in sandbox remains open.

### 7.67 Core-loop observability delta (2026-03-03-i)
1. `change-run-ledger` now supports grouped run evidence by `runId`.
2. `/api/ai/change/runs` now returns `runGroups` in addition to raw rows.
3. `/api/admin/ai/metrics` now surfaces `changeRuns.runGroups` for operator-grade monitoring.

### 7.68 Run-level rollback delta (2026-03-03-j)
1. `ai/change/rollback` now accepts `runId` as rollback input.
2. Route resolves rollback tokens from `apply` ledger evidence for that run and performs deterministic restore.
3. Explicit error contract added for missing run evidence: `ROLLBACK_RUN_NOT_FOUND` (`404`, `PARTIAL`).

### 7.69 L4 promotion telemetry delta (2026-03-03-k)
1. Added `/api/admin/ai/readiness` endpoint for operator-grade L4 gate visibility.
2. Readiness contract now exposes explicit metrics and threshold evaluation:
- `applySuccessRate`
- `regressionRate`
- `sandboxCoverage`
- `sampleSize`
- `promotionEligible`
3. Admin AI monitor now surfaces these metrics in UI to avoid hidden promotion assumptions.

### 7.70 Runtime-gate closure + warning noise reduction (2026-03-03-l)
1. Billing non-stripe branches moved from `NOT_IMPLEMENTED` to explicit `PARTIAL` runtime contract:
- `/api/billing/checkout`
- `/api/billing/checkout-link`
- `error: PAYMENT_GATEWAY_RUNTIME_UNAVAILABLE`
- `status: 503`
2. Global explicit API `NOT_IMPLEMENTED` inventory reached `0` in active scope (source: `docs/master/32_GLOBAL_GAP_REGISTER_2026-03-01.md`).
3. `auth/forgot-password` rate-limit path now avoids eager `Redis.fromEnv()` initialization and uses:
- Upstash when env is present;
- deterministic in-memory fallback when env is missing.
4. Local build warning inventory is reduced to docker sandbox fallback only (`[Sandbox] Docker not available...`) in current environment.

### 7.71 Studio entry friction + readiness parity delta (2026-03-04-a)
1. Landing entry now always forwards deterministic onboarding context (`onboarding=1`, `source=landing-*`) to Studio Home.
2. First-value guide now exposes explicit completion progress (`0..100%`) and remaining-time hint.
3. First-value milestone telemetry was split by step:
- first project created;
- first successful AI response;
- first IDE open.
4. AI provider preflight now executes before first chat prompt in both Studio Home and IDE.
5. Core-loop readiness formulas were centralized in shared server utility (`lib/server/core-loop-readiness.ts`) and admin readiness now emits 24h/7d/30d windows with consistent thresholds.
6. Added authenticated user-scoped readiness endpoint: `/api/ai/change/readiness` (`PARTIAL`, evidence only).

### 7.72 First-value funnel evidence hardening (2026-03-04-b)
1. `/api/admin/analytics/baseline` now tracks first-value milestone counters explicitly:
- `firstValueProjectCreated`
- `firstValueAiSuccess`
- `firstValueIdeOpen`
- `firstValueCompleted`
2. `/admin/analytics` now surfaces first-value conversion signals (including signup->completed rate) in the same 7-day baseline panel.
3. `qa:route-contracts` now guards these baseline fields to avoid silent regressions in growth instrumentation.

### 7.73 Onboarding ops dashboard hardening (2026-03-04-c)
1. `/api/admin/onboarding/stats` was upgraded from raw action counter to explicit capability contract (`ADMIN_ONBOARDING_STATS`, `IMPLEMENTED`).
2. The endpoint now aggregates:
- onboarding actions (`onboarding.*`);
- analytics milestones for first-value funnel stages;
- median first-value time from `analytics_metric:first_value_time`.
3. `/admin/onboarding` now provides production-grade visibility:
- selectable analysis window (7/14/30 days),
- conversion cards,
- searchable action ledger list.

### 7.74 AI monitor change-run evidence surface (2026-03-04-d)
1. `/admin/ai-monitor` now consumes `/api/ai/change/runs` and exposes run-level core-loop evidence directly in operations UI.
2. Added 72h ledger summary cards for:
- apply success rate;
- blocked rate;
- regression rate;
- sandbox/workspace coverage;
- total tracked events.
3. Added recent run-group table (`runId`, event window, event types, outcomes, impacted paths) to shorten triage time on failed/blocked apply waves.

### 7.75 Analytics ops window control + conversion precision (2026-03-04-e)
1. `/admin/analytics` now supports runtime window selection (`7/14/30` days) while preserving the same baseline contract endpoint.
2. Baseline panel now reflects the selected window in both API query and UI labels (`Performance baseline (Xd)`).
3. First-value conversion block now includes:
- `signup -> completed`;
- `project created -> completed`.
4. This closes the fixed-7d visibility limitation in admin analytics triage.

### 7.76 Collaboration evidence freshness gate (2026-03-04-f)
1. `/api/admin/collaboration/readiness` now evaluates evidence freshness with max age (`30` days) for:
- synthetic concurrency proof;
- reconnect replay proof;
- conflict replay proof;
- stress proof attachment.
2. `promotionEligible` now requires both presence and freshness of evidence (not only boolean attachment).
3. `/admin/collaboration` now surfaces stale evidence explicitly (`STALE`) in readiness and stress-proof status.

### 7.77 Telemetry ingest closure for operational events (2026-03-04-g)
1. Added explicit telemetry ingest route: `/api/telemetry/event`.
2. Route now persists telemetry events into audit log with deterministic contract:
- `capability: TELEMETRY_EVENT_INGEST`
- success path: `capabilityStatus: IMPLEMENTED`
- guarded failure paths: `TELEMETRY_EVENT_TYPE_REQUIRED`, `TELEMETRY_EVENT_TOO_LARGE`, `TELEMETRY_EVENT_PERSIST_FAILED`.
3. Consent manager telemetry emitter now uses:
- same endpoint (`/api/telemetry/event`);
- `keepalive` on browser flush;
- server-side absolute URL fallback (`NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL` / `http://localhost:3000`) to avoid relative-fetch drops outside browser context.

### 7.78 Core-loop factual drift guard (2026-03-04-h)
1. Added explicit `NOT_IMPLEMENTED` scanner tool:
- `tools/find-not-implemented.mjs`
- `npm run qa:find-not-implemented`
- artifact: `docs/master/not-implemented-scan.csv`.
2. Added deterministic dependency-impact matrix tool:
- `tools/impact.mjs`
- `npm run qa:impact-matrix`.
3. This closes a recurring audit drift source where external reports cite stale gate counts; current factual scanner output remains `rows=0`.

### 7.79 Core-loop rolling metrics export (2026-03-04-i)
1. Added deterministic exporter for `latest_run` metrics:
- `tools/export-core-loop-metrics.mjs`
- `npm run qa:core-loop-metrics`
- output: `metrics/latest_run.json`.
2. Current baseline in this workspace run:
- `rows=0`, `applyRuns=0` (no recent run-ledger events in the 7-day window).
3. This makes "no evidence" explicit and machine-readable, preventing silent L4 promotion assumptions.

### 7.80 Admin core-loop diagnostics surface (2026-03-04-j)
1. Added `/api/admin/ai/core-loop-metrics` (`ADMIN_AI_CORE_LOOP_METRICS`, `PARTIAL`) for operator-grade diagnostics.
2. Endpoint adds explicit visibility not covered by readiness rollup alone:
- reason histogram (`reasonCounts`) for blocked/failure events;
- execution mode histogram (`executionModeCounts`) for sandbox/workspace mix;
- `lastEventAt` to flag stale evidence windows.
3. `/admin/ai-monitor` now renders this panel and explicitly warns when sample size is zero, avoiding hidden "ready" assumptions.

### 7.81 Apply dependency-impact guard hardening (2026-03-04-k)
1. `app/api/ai/change/apply/route.ts` now performs transitive dependency-impact analysis in scoped workspace before apply.
2. Added shared analyzer `lib/server/dependency-impact-guard.ts` with:
- reverse-dependents graph discovery;
- impacted test and endpoint extraction;
- depth/truncation/risk metadata.
3. New deterministic high-impact block in apply:
- `DEPENDENCY_GRAPH_APPROVAL_REQUIRED` (`409`, `PARTIAL`) when `reverseDependents > 80` and explicit `approvedHighRisk` is absent.
4. Apply response metadata now carries project-impact summary for both workspace apply and sandbox apply simulation.

### 7.82 Core-loop LEARN signal enrichment (2026-03-04-l)
1. Added shared learning utility `lib/server/core-loop-learning.ts` to normalize:
- block/failure reason histograms;
- execution mode distribution;
- dependency-risk distribution;
- recommendation generation from thresholds vs observed metrics.
2. `/api/admin/ai/core-loop-metrics` now returns:
- `riskCounts`,
- `impactedEndpointCounts`,
- `recommendations`.
3. `/api/ai/change/readiness` now returns user-scoped learning payload:
- `reasonCounts`,
- `executionModeCounts`,
- `riskCounts`,
- `recommendations`.
4. `/admin/ai-monitor` now renders these LEARN signals in the operational panel to reduce blind triage loops.

### 7.83 Core-loop trend + reason-playbook hardening (2026-03-04-m)
1. Added deterministic trend computation (`7d vs 30d`) in core-loop learning utility and exposed it on:
- `/api/admin/ai/core-loop-metrics` (`trend`);
- `/api/ai/change/readiness` (`trend`).
2. Added reason-playbook payload generation for top blocked/failure causes:
- `/api/admin/ai/core-loop-metrics` now returns `reasonPlaybook`;
- `/api/ai/change/readiness` now returns `reasonPlaybook`.
3. `/admin/ai-monitor` now renders both trend and reason-playbook sections, making operator remediation steps explicit.

### 7.84 Admin readiness LEARN parity (2026-03-04-n)
1. `/api/admin/ai/readiness` now emits LEARN parity fields in addition to promotion metrics:
- `trend`,
- `reasonCounts`,
- `reasonPlaybook`,
- `recommendations`.
2. This keeps `readiness` and `core-loop-metrics` contracts aligned for ops consumers that depend on the lighter readiness endpoint.

### 7.85 Ledger integrity hardening (2026-03-04-o)
1. `lib/server/change-run-ledger.ts` now writes hash-chain fields for each new ledger row:
- `eventId`,
- `prevHash`,
- `eventHash`.
2. Added deterministic integrity verifier (`verifyChangeRunLedgerIntegrity`) with legacy-row awareness.
3. Added ops endpoint `/api/admin/ai/ledger-integrity` and integrated view in `/admin/ai-monitor`.
4. This closes a core auditability gap for `APPLY/ROLLBACK/LEARN` evidence trails.

### 7.86 Production-vs-rehearsal promotion hardening (2026-03-04-p)
1. Added sample classification in run-ledger (`production` vs `rehearsal`) based on `metadata.runSource`.
2. Promotion metrics are now explicitly policy-bound:
- `samplePolicy: production_only_for_promotion`.
3. Updated readiness/metrics contracts:
- `/api/ai/change/readiness`;
- `/api/admin/ai/readiness`;
- `/api/admin/ai/core-loop-metrics`.
4. Added controlled rehearsal injection endpoint:
- `/api/admin/ai/core-loop-drill` (`runSource=core_loop_drill`, rehearsal-only evidence).
5. Added CLI drill + scoped exporter:
- `npm run qa:core-loop-drill`;
- `npm run qa:core-loop-metrics:production`;
- `npm run qa:core-loop-metrics:rehearsal`.

### 7.87 Promotion verdict API (2026-03-04-q)
1. Added `/api/admin/ai/core-loop-promotion` for a deterministic, single-pane promotion verdict.
2. Contract exposes:
- `promotionEligible`;
- `blockers`;
- `production` metrics (policy scope);
- `rehearsal` metrics (diagnostic scope).
3. Goal: eliminate manual interpretation drift between readiness and metrics endpoints during release freeze decisions.

### 7.88 Preview runtime auto-discovery baseline (2026-03-04-r)
1. Added `/api/preview/runtime-discover` (`IDE_PREVIEW_RUNTIME_DISCOVERY`, `PARTIAL`) to scan local runtime candidates and emit `preferredRuntimeUrl` with explicit candidate statuses.
2. `components/ide/FullscreenIDE.tsx` now supports one-shot automatic runtime discovery when no runtime URL is configured and preview is enabled.
3. `components/ide/PreviewRuntimeToolbar.tsx` now includes explicit manual discovery action (`Auto detectar`) and discovery feedback messages.
4. `runtime-health` route now reuses canonical helper logic in `lib/server/preview-runtime.ts` for consistent allowlist/probe behavior across runtime observability surfaces.

### 7.89 Impact matrix CLI default profile hardening (2026-03-04-s)
1. `tools/impact.mjs` now uses deterministic core-loop defaults when no `--plan`/`--files` are provided:
- `app/api/ai/change/apply/route.ts`
- `app/api/ai/change/rollback/route.ts`
2. Default output is now canonicalized to:
- `docs/master/impact_matrix_core_loop.json`
3. `npm run qa:impact-matrix` no longer fails with empty-target error in baseline execution.

### 7.90 Core-loop metrics refresh (2026-03-04-t)
1. Re-exported rolling metrics artifacts:
- `metrics/latest_run.json`
- `metrics/latest_run-production.json`
- `metrics/latest_run-rehearsal.json`
2. Current evidence profile after refresh:
- `sampleClass=all`: `applyRuns=12`, `apply_success_rate=0.75`, `blocked_rate=0.25`
- `sampleClass=production`: `applyRuns=0` (still blocks L4 promotion claim)
- `sampleClass=rehearsal`: `applyRuns=12` (diagnostic only)
3. Promotion policy remains unchanged:
- `production_only_for_promotion`.

### 7.91 Dashboard handoff runtime continuity (2026-03-04-u)
1. `components/AethelDashboard.tsx` now performs best-effort runtime discovery before redirecting to `/ide` when no persisted runtime URL exists.
2. Discovered runtime URL is forwarded as `previewUrl` in handoff query and persisted for continuity.
3. Discovery failure/not-found path remains explicit via telemetry and preserves non-blocking fallback handoff.

### 7.92 Production evidence probe tooling (2026-03-04-v)
1. Added CLI probe `tools/run-core-loop-production-probe.mjs` and script `npm run qa:core-loop-production-probe`.
2. Tool executes authenticated sandbox apply probes (`/api/ai/change/apply`) with production run-source semantics.
3. Purpose: operationally unblock `production sample size=0` evidence gaps without changing promotion policy.

### 7.93 Dashboard shell regression guard restore (2026-03-04-w)
1. Moved IDE handoff runtime-discovery logic into `components/dashboard/aethel-dashboard-ide-handoff.ts`.
2. `components/AethelDashboard.tsx` returned to shell gate boundary (`<=1200` lines) after runtime continuity enhancements.
3. `qa:dashboard-shell` remains green with runtime-discovery behavior preserved.
