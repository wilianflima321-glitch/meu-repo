# DUPLICATIONS_AND_CONFLICTS
Status: ACTIVE (REFRESHED)
Date: 2026-03-10
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
| C-04 | Canonical docs vs historical volume | `docs/master` is clean, non-canonical markdown has been archived to `docs/archive/bulk-2026-03-10` | Low (agent drift) | Keep archive consolidation and keep `00_INDEX` authoritative |
| C-05 | Dashboard shell margin risk | `AethelDashboard.tsx` is now a thin shell; runtime lives in `AethelDashboardRuntime.tsx` (1191 lines) | Medium (fast regressions) | Keep runtime decomposition; avoid re-bloating shell |
| C-06 | Shell authority drift | `AethelDashboardSidebar` is canonical, but `DashboardSidebar`/`DashboardLayout` still exist as parallel legacy primitives | Medium (new drift) | Keep legacy exports explicit, route new work to canonical shell only |
| C-07 | Preview surface fragmentation | `LivePreview`, `PreviewPanel`, `NexusCanvasV2`, and detached `TheForgeUnified` still represent different runtime stories | High UX inconsistency | Collapse preview/runtime authority behind one canonical manager and keep detached shells non-authoritative |
| C-08 | Provider-ready code vs local production runtime | Live provider calls pass, but local authenticated production probe is still blocked by missing `DATABASE_URL`, `JWT_SECRET`, `.env.local`, and inactive Docker daemon | High (false sense of readiness) | Stand up real local/staging runtime and run authenticated production probes before promoting claims |
| C-09 | Security hardening drift vs L5 claim | Some auth/CSRF paths historically accepted fallback secrets even when runtime was not configured | High (unsafe enterprise posture) | Keep fail-closed secret policy across admin/auth/CSRF surfaces and expose readiness blockers explicitly |
| C-10 | Streaming path parity vs chat path | `/api/ai/stream` historically depended on external backend proxy while `/api/ai/chat` already had internal-provider fallback | Medium (UX inconsistency, local-runtime dead end) | Keep direct-provider streaming path as canonical fallback when backend proxy is absent |
| C-11 | Production preflight hidden in operator knowledge | Teams had to discover missing `.env.local`/DB/JWT/Docker state ad hoc | Medium (slow unblock) | Keep explicit runtime preflight script in CI/local workflows |
| C-12 | Executive audit text drift vs repo fact | Some audits still describe landing, billing, mentions, RAG, and preview as absent when repo state is already partial | Medium (wrong prioritization, claim confusion) | Force canonical labels (`ABSENT/PARTIAL/BLOCKED/ACTIVE`) in new executive texts and route score corrections through `36_QUALITY_90_EXECUTION_MAP_2026-03-08.md` |

## 3.1 Recent closure progress
1. Landing/public-entry drift reduced:
- public surface is no longer just a minimal magic-box shell; pricing/navigation/value framing are now stronger.
2. Mention UX drift reduced:
- hidden mention foundations are now surfaced in the IDE composer through suggestions/chips/quick insert controls.
3. Remaining gap:
- mention UX is still not equivalent to Cursor-grade semantic codebase context until persistent retrieval and richer resolution are fully wired.
4. Billing narrative drift reduced:
- pricing page now uses canonical plan definitions,
- billing runtime readiness is surfaced explicitly,
- remaining risk is operational Stripe configuration, not plan-definition ambiguity.
5. Public anti-fake-success drift reduced:
- `/status` now reports real public health/readiness checks instead of static uptime/incidents.
- `/contact-sales` now avoids fake submission success and uses explicit manual email handoff.
6. Billing runtime drift reduced:
- checkout, portal, webhook, readiness, and health now share a billing runtime authority instead of repeating slightly different Stripe/gateway checks.
- dashboard billing now consumes canonical subscription status and can perform default checkout/portal redirects without requiring ad-hoc parent wiring.
- remaining gap is live Stripe configuration, not route-level disagreement about readiness.
7. Public pricing drift reduced:
- `/pricing` now consumes canonical billing readiness instead of relying only on static explanatory copy.
- remaining gap is still runtime monetization readiness, not pricing-page ambiguity.
8. Billing lifecycle drift reduced:
- `/billing/invoices`, `/billing/success`, and `/billing/cancel` now surface live readiness/subscription state instead of implying billing success from navigation alone.
- remaining gap is still production Stripe configuration, not lifecycle-page ambiguity.
9. Mention execution drift reduced:
- visible mention chips/autocomplete are now backed by server-side context resolution in advanced chat for core tags (`@codebase`, `@docs:*`, `@file:*`, `@folder:*`, `@git:*`).
- `@codebase` now routes through canonical transient semantic retrieval (`/api/ai/context/search`) instead of overview-only context.
- remaining gap is persistent semantic retrieval/memory, not total absence of mention execution.
10. Preview runtime transparency improved:
- toolbar now exposes preview strategy (`managed`, `local`, `inline`) and current blockers from a shared readiness endpoint.
- runtime auto-selection now follows canonical readiness recommendation instead of provision-first guesswork.
- preview readiness now exposes concrete operator instructions plus local discovery/configuration counts in the IDE toolbar.
- first-value onboarding now reads preview readiness too, reducing drift between dashboard guidance and actual preview path.
- remaining gap is still product-level managed sandbox/HMR as default, not lack of visibility.
11. Codebase-context visibility improved:
- `@codebase` no longer hides retrieval entirely behind prompt assembly; IDE composer now previews semantic matches before send.
- preview cards can open files directly into the IDE and reveal the matched line range instead of stopping at passive text preview.
- canonical file writes now invalidate scoped transient semantic cache, reducing stale retrieval after edits.
- composer preview now shows indexed file/chunk counts and supports a manual context refresh path.
- active IDE file saves now trigger scoped context refresh events when `@codebase` is present in the composer.
- remaining gap is persistent retrieval quality and richer navigation, not invisible execution.
12. First-value evidence drift reduced:
- dashboard first-value guidance now exposes in-session evidence (start time, milestone timings, completion duration, target window) instead of relying on hidden analytics alone.
- admin onboarding stats now report both median and `P95` first-value time using the canonical target source, reducing SLO-target disagreement across admin surfaces.
- remaining gap is representative production evidence, not missing local/operator visibility.
13. Runtime-preflight visibility drift reduced:
- admin AI monitoring now surfaces the same runtime blockers used by readiness logic (`.env.local`, DB, JWT, CSRF, auth/probe readiness) instead of requiring operators to infer them from backend failures.
- remaining gap is still environment closure, not discoverability of the blockers.
14. Runtime-preflight strictness improved:
- local bootstrap now creates `.env.local` and generated local secrets when missing.
- local bootstrap now also creates root `.env` and aligns compose credentials with app `DATABASE_URL`.
- readiness no longer treats `DATABASE_URL` presence alone as sufficient; database reachability is now part of the block decision.
- remaining gap is real infrastructure availability, not configuration-file absence alone.
15. Local database bring-up ambiguity reduced:
- repo now exposes a single local-db path (`npm run setup:local-db`) instead of requiring operators to remember compose + Prisma steps separately.
- `--dry-run` provides a deterministic runbook even when Docker is not active yet.
- remaining gap is still actual database availability, not lack of a canonical local bring-up path.
15b. Runtime-preflight parity improved:
- CLI preflight and admin AI monitoring now expose the same Docker/database blockers, instructions, and recommended commands.
- remaining gap is environment closure, not conflicting readiness stories between operator surfaces.
16. Preview-provider ambiguity reduced:
- managed preview readiness now exposes an explicit provider label plus canonical env keys in `.env.local.example`.
- first-value guidance and runtime toolbar can now distinguish configured managed-provider intent from generic endpoint-only setup.
- remaining gap is actual managed sandbox execution quality, not operator ambiguity about which preview path is intended.
17. Preview-provider rule drift reduced:
- provider parsing and setup-env rules now come from a shared preview-provider config instead of ad-hoc logic split across readiness and provision routes.
- route-based provision now reports browser-side-only providers explicitly as unsupported in that path, rather than degrading into generic managed-endpoint language.
- preview toolbar now suppresses the route-provision affordance for browser-side-only providers instead of advertising an action that must fail.
- preview readiness now returns recommended commands and provider mode so onboarding and IDE surfaces can show the same next-step setup guidance.
- remaining gap is live managed preview execution, not provider-rule inconsistency.
18. Billing-provider rule drift reduced:
- billing readiness surfaces now consume provider metadata from shared billing runtime/provider authority instead of treating Stripe env absence as the only operator-visible explanation.
- `.env.local.example` now includes the Stripe price env keys expected by readiness, reducing billing setup ambiguity.
- billing readiness now returns blockers, instructions, and recommended commands so public and dashboard billing surfaces can show the same closure path.
- remaining gap is live Stripe runtime configuration, not provider/setup-env inconsistency.
19. Mention-preview opacity reduced:
- composer now exposes structured previews for non-codebase contextual mentions (`@docs:*`, `@file:*`, `@folder:*`, `@git:*`) through a dedicated authenticated preview route.
- advanced-chat mention execution and composer mention visibility now share the same mention-resolution authority.
- remaining gap is persistent context memory/ranking, not hidden execution of explicit mentions.
20. Stripe-readiness ambiguity reduced:
- Stripe readiness now reports publishable-key state and price coverage separately instead of only generic missing-env output.
- status, public pricing, and billing lifecycle surfaces can now explain whether monetization is blocked by secret, publishable, or price-id gaps.
- remaining gap is live Stripe configuration, not opaque readiness reporting.
21. Admin billing visibility improved:
- `/admin/apis` now surfaces billing runtime readiness from the same public/runtime authority instead of leaving billing setup split between admin payments, status, and public pricing only.
- remaining gap is live billing activation, not admin visibility of the blockers.
22. Admin payments drift reduced:
- `/admin/payments` now surfaces billing runtime readiness next to gateway controls, reducing the risk of treating config toggles as sufficient proof that Stripe is live.
- remaining gap is live runtime closure, not visibility of that gap inside admin payments.
23. Hotspot pressure reduced:
- `AIChatPanelPro.tsx` has been decomposed enough to leave the `>=1200` hotspot set.
- `MediaStudio.tsx` and `SettingsPage.tsx` were decomposed into leaf sections, and the active `>=1200` hotspot set is now `0`.
- remaining gap is keeping future shell growth out of the hotspot set, not current large-file pressure.
22. Semantic-retrieval volatility reduced:
- semantic code search now uses a lightweight disk-backed cache in addition to memory cache, reducing full reindex churn across process restarts.
- local semantic search now reuses unchanged file chunks during refresh/reindex, so the remaining gap is production vector quality rather than lack of incremental local reuse.
23. Production-probe operator drift reduced:
- `qa:core-loop-production-probe` now checks readiness first and exits with explicit blockers/instructions/commands instead of failing later with a less actionable error.
- a force variant exists for deliberate operator override, but the default path now matches the runtime-evidence contract.
24. Preview-discovery guidance drift reduced:
- `/api/preview/runtime-discover` now returns provider-aware guidance from the same readiness source used by the toolbar and onboarding.
- manual discovery in the IDE now shows concrete next steps from server guidance instead of only a generic local-dev suggestion.
25. Local probe-runtime drift reduced:
- CLI production preflight now checks whether the app runtime itself is reachable on `AETHEL_BASE_URL` before declaring the local environment probe-ready.
- production-probe execution now fails with an explicit `npm run dev` next step instead of bubbling up a generic fetch failure when the app is not running.
26. Dashboard handoff preview drift reduced:
- dashboard-to-IDE handoff now reads canonical preview readiness before deciding whether to provision, discover, or stay inline.
- browser-side-only providers like `webcontainers` no longer trigger a pointless route-provision attempt during handoff.
27. Billing local-setup ambiguity reduced:
- repo now exposes `qa:billing-runtime-readiness` for env-level Stripe closure checks before operators jump into dashboard/public billing surfaces.
- remaining gap is live Stripe runtime validation, not uncertainty about which local env keys are still missing.
28. Physics package drift reduced:
- `@react-three/cannon` has been removed from the active web dependency set, aligning package metadata with the factual Rapier-first path already present in code.
29. Preview setup ambiguity reduced:
- repo now exposes `qa:preview-runtime-readiness` for env-level preview-provider closure checks before operators rely on toolbar/onboarding hints alone.
- `/admin/apis` now surfaces preview runtime readiness next to AI and billing setup, reducing cross-surface setup drift.
30. Operator setup drift reduced:
- repo now exposes `qa:operator-readiness` to aggregate production runtime, billing runtime, and preview runtime preflights in one CLI summary.
- repo now also exposes `/api/admin/operator-readiness` as the canonical server-side aggregate for product/admin surfaces.
- `/admin/apis` now mirrors that direction by surfacing production, billing, and preview runtime checks from one aggregate read instead of composing three separate runtime calls in the client.
31. AI monitor/runtime drift reduced:
- `/admin/ai-monitor` now surfaces app-runtime reachability and app base URL in the same preflight panel that already showed DB/auth/Docker blockers.
- remaining gap is runtime closure, not a mismatch between CLI and admin preflight facts.
32. Runtime setup ambiguity reduced:
- repo now exposes `setup:preview-runtime` and `setup:billing-runtime` so operators can seed canonical preview/Stripe placeholders without hand-editing every env key from scratch.
- remaining gap is still live provider/runtime validation, not knowing which env keys must exist.
33. Placeholder readiness drift reduced:
- Stripe and preview readiness no longer treat scaffold placeholders as proof of live configuration.
- remaining gap is still real secret/endpoint closure, not false-positive readiness from helper-generated example values.
34. Non-canonical markdown archive completed:
- moved 3,233 `.md` files from `cloud-admin-ia/` and `shared/tools/` into `docs/archive/bulk-2026-03-10`,
- remaining gap is ensuring agents never treat archive as canonical.
35. Operator readiness preflight captured:
- production runtime blockers: `DATABASE_UNREACHABLE`, `APP_RUNTIME_UNREACHABLE`, `DOCKER_DAEMON_NOT_RUNNING`,
- billing runtime blockers: missing Stripe secret/publishable/webhook + price IDs,
- preview runtime blocker: `AETHEL_PREVIEW_PROVISION_TOKEN_MISSING`,
- remaining gap is runtime closure, not visibility of blockers.

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
