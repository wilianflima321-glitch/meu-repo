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
