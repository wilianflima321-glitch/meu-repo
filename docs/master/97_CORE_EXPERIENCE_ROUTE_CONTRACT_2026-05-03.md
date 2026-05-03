# 97_CORE_EXPERIENCE_ROUTE_CONTRACT_2026-05-03

Date: 2026-05-03
Status: ACTIVE
Role: route-level contract for the user-visible Aethel product loop

## Why This Exists

The previous gate protects product cohesion by checking key surfaces. This document and its script protect the actual route path users touch:

`/ -> /api/workspace/create -> /dashboard -> /ide -> preview/runtime -> jobs/deploy -> local/mobile continuity`

The goal is simple: no fake green lights. If the Web Entry claims it starts a mission, the route must either create a real authenticated project or explicitly hand the user into Studio Home with preserved mission context.

## Executable Gate

Run:

```bash
npm run qa:core-experience-routes
```

This runs `tools/check-core-experience-routes.mjs`.

## Protected Contracts

### 1. Root To Web Entry

`cloud-web-app/web/app/page.tsx` must render `landing-v3`, not a generic dashboard. The first user contact remains mission-first.

### 2. Mission Box To Intake

`cloud-web-app/web/app/landing-v3-mission-box.tsx` must call `/api/workspace/create` and handle:

- `workspaceId` for authenticated creation,
- `handoffUrl` for unauthenticated mission continuity,
- and fallback navigation that preserves the mission.

### 3. Workspace Create Route

`cloud-web-app/web/app/api/workspace/create/route.ts` must:

- reject empty missions,
- return explicit auth handoff for unauthenticated users,
- enforce entitlements for authenticated users,
- create a real `Project`,
- store mission/source/template in project settings,
- and avoid simulation, random workspace IDs, fake delays, or console logging.

### 4. Studio Home

`/dashboard` must hydrate `DashboardPageClient` and preserve mission intent through `useDashboardEntryIntent`, `DashboardShell`, Project Brain, Mission Ledger, and Device Runtime Guard.

### 5. Internal IDE

`/ide` must load the internal workbench dynamically and preserve the Studio-family IDE. The IDE is not a separate product or a hidden afterthought.

### 6. Preview Runtime

Preview must keep discover, provision, health, readiness, and sync routes present so the review surface is not just decorative.

### 7. Runtime And Device Continuity

Local capability snapshots must connect Studio Local to the web runtime policy. This is the foundation for NPU/GPU-aware routing without freezing the user's device.

### 8. Jobs Runtime Target

Background jobs must preserve `runtimeRoute` and `runtimeTarget`, and reject held work before it enters the queue.

### 9. Studio Local Download

The download page must position Studio Local as continuity and depth unlock, not as a second product family.

### 10. Mobile Companion

Mobile remains approval, preview, prompt-control, and continuity. It must not drift into full IDE parity.

## Benchmark Relevance

This closes a practical gap against:

- Firebase Studio: prompt-to-workspace continuity.
- v0: prompt-to-live artifact path.
- Replit: workspace, preview, deploy and task continuity.
- Manus: explicit handoff and permission boundaries.
- Cursor/Codex-like agents: reviewable work instead of hidden action.

## Current Closure

The route contract now passes `11/11`.

The biggest next gaps are:

1. Add browser-level Playwright coverage for the mission handoff path.
2. Add authenticated API tests around project creation and entitlement limits.
3. Add mobile companion route or PWA shell once the implementation is ready.
4. Add richer Studio Local installer/probe evidence when native packaging becomes available.
