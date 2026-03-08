# DUPLICATIONS_AND_CONFLICTS
Status: ACTIVE (REFRESHED)
Date: 2026-03-07
Owner: Platform Architecture

## 1) Objective
Keep one factual map of duplication/conflict risk that still affects delivery speed, UX consistency, and L4 promotion evidence.

## 2) Resolved Duplications (kept as locked decisions)
| Area | Previous conflict | Canonical decision | Evidence |
|---|---|---|---|
| File API authority | `/api/files/*` vs `/api/workspace/*` ambiguity | `/api/files/*` is canonical, workspace routes are deprecated (`410`) | `docs/master/17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16.md` |
| Auth sessions | JWT + legacy session endpoints mixed | JWT-only runtime; legacy session routes return explicit deprecation | `docs/master/17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16.md` |
| Explicit `NOT_IMPLEMENTED` debt | UI/API success ambiguity | Active scope normalized to explicit runtime capability (`PARTIAL/503/404`) with `NOT_IMPLEMENTED=0` | `docs/master/32_GLOBAL_GAP_REGISTER_2026-03-01.md` |
| Dashboard shell drift | Large shell + direct coupling risk | Shell split with hard gate (`qa:dashboard-shell`) and canonical component checks | `cloud-web-app/web/scripts/check-dashboard-shell-integrity.mjs` |
| AI provider recovery UX | Dead-end when provider missing | Provider setup guide + explicit setup metadata + demo bridge | `docs/master/17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16.md` |

## 3) Active Conflicts (open)
| ID | Conflict | Current state | Risk | Required closure |
|---|---|---|---|---|
| C-01 | Preview runtime parity vs managed bootstrap | Managed provision exists, real HMR parity is still partial | High UX friction | Decide canonical runtime path (managed sandbox or webcontainer) and ship one default |
| C-02 | L4 claim vs production evidence | Core loop code exists, production sample for promotion is still insufficient | High (claim invalidation) | Grow production evidence and publish readiness dossier |
| C-03 | Billing narrative vs runtime reality | Billing routes are `PARTIAL`, gateway runtime may be unavailable | High (monetization block) | Wire checkout runtime and webhook path for paid plans |
| C-04 | Canonical docs vs historical volume | `docs/master` is clean, but non-canonical markdown volume remains very high | Medium (agent drift) | Continue archive consolidation and keep `00_INDEX` authoritative |
| C-05 | Dashboard shell margin risk | `AethelDashboard.tsx` is bounded but still near threshold | Medium (fast regressions) | Keep decomposition; avoid adding new feature blocks in shell |
| C-06 | Shell authority drift | `AethelDashboardSidebar` is canonical, but `DashboardSidebar`/`DashboardLayout` still exist as parallel legacy primitives | Medium (new drift) | Keep legacy exports explicit, route new work to canonical shell only |
| C-07 | Preview surface fragmentation | `LivePreview`, `PreviewPanel`, `NexusCanvasV2`, and detached `TheForgeUnified` still represent different runtime stories | High UX inconsistency | Collapse preview/runtime authority behind one canonical manager and keep detached shells non-authoritative |
| C-08 | Provider-ready code vs local production runtime | Live provider calls pass, but local authenticated production probe is still blocked by missing `DATABASE_URL`, `JWT_SECRET`, `.env.local`, and inactive Docker daemon | High (false sense of readiness) | Stand up real local/staging runtime and run authenticated production probes before promoting claims |
| C-09 | Security hardening drift vs L5 claim | Some auth/CSRF paths historically accepted fallback secrets even when runtime was not configured | High (unsafe enterprise posture) | Keep fail-closed secret policy across admin/auth/CSRF surfaces and expose readiness blockers explicitly |
| C-10 | Streaming path parity vs chat path | `/api/ai/stream` historically depended on external backend proxy while `/api/ai/chat` already had internal-provider fallback | Medium (UX inconsistency, local-runtime dead end) | Keep direct-provider streaming path as canonical fallback when backend proxy is absent |
| C-11 | Production preflight hidden in operator knowledge | Teams had to discover missing `.env.local`/DB/JWT/Docker state ad hoc | Medium (slow unblock) | Keep explicit runtime preflight script in CI/local workflows |

## 4) Canonical UX Decisions (locked)
1. `/dashboard` stays primary entry.
2. `/ide` stays advanced mode of the same platform.
3. Provider-missing paths must remain explicit; no fake-success.
4. Demo experience must be clearly labeled as demo.
5. Capability contracts remain source of truth for product claims.
6. Product-facing preview routing should prefer `CanonicalPreviewSurface` over direct primitive imports.
7. Shared preview runtime helpers should live in `lib/preview/runtime-manager.ts`; do not duplicate discover/provision/health logic in new surfaces.
8. Preview runtime stateful orchestration should prefer `hooks/usePreviewRuntimeManager.ts` over in-component copies.
9. AI provider configuration truth should prefer `lib/ai-provider-config.ts` over ad-hoc environment checks in routes.
10. AI provider labels/setup wording should prefer `lib/ai-provider-config.ts` over hard-coded product copy.
11. Admin/auth/CSRF routes must fail closed when secrets are missing; no baked-in fallback secrets in production paths.

## 5) Canonical Domain Scope (locked until Apps L4)
1. Apps: primary L4 candidate.
2. Games: L2 experimental, hardening only.
3. Films: L2 experimental, hardening only.
4. No Unreal parity claim in browser scope.

## 6) 14-Day Closure Checklist
1. Keep `qa:enterprise-gate` green on every wave.
2. Keep `not-implemented-ui=0` and `blocking-browser-dialogs=0`.
3. Keep dashboard shell under safe margin with decomposition-only changes.
4. Increase production core-loop evidence (not rehearsal-only).
5. Expand first-value evidence (`signup -> first_ai_success -> first_preview`).
6. Keep all canonical updates mirrored in `00_INDEX` and `17`.

## 7) Non-Negotiable Rules
1. No claim upgrade without evidence.
2. No hidden fallback that looks like real provider success.
3. No new product shell outside `/dashboard` + `/ide`.
4. No policy changes outside canonical docs.
