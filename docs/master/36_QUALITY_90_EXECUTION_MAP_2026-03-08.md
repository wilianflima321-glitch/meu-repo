# 36_QUALITY_90_EXECUTION_MAP_2026-03-08
Status: ACTIVE EXECUTION MAP
Date: 2026-03-08
Owner: Platform + Product + UX + Growth

## 1) Purpose
Define the factual path to lift Aethel to `>=9.0` quality across the dimensions that determine product credibility, operator confidence, and launch readiness.

This document is stricter than roadmap language:
1. it corrects audit drift where text still says `ABSENT` but repo state is already `PARTIAL`;
2. it separates `code existence` from `market-ready execution`;
3. it defines the exact closure order required to move from strong technical base to strong product quality.

## 2) Reality correction map
### 2.1 What is already beyond "absent"
The following areas must no longer be described as `zero` or `missing entirely`:
1. Landing exists and is active at `/` via `app/page.tsx` -> `app/landing-v2.tsx`.
2. Billing exists as a route/UI surface set, but runtime remains `PARTIAL` until Stripe config is live.
3. Mention parsing/resolution exists, but product-grade `@Codebase/@Docs/@Diff/@Error` UX is still `PARTIAL`.
4. RAG/vector infrastructure exists in local/in-memory form, but production-grade persistent indexing and operator UX are still `PARTIAL`.
   - local semantic retrieval now has disk-backed incremental reindex, but production vector infrastructure is still absent.
5. Preview authority is partially centralized via `CanonicalPreviewSurface` + `usePreviewRuntimeManager`, but managed sandbox/HMR parity is still `PARTIAL`.
6. Security secret handling is no longer permissive in critical auth/admin/CSRF paths; it is now fail-closed.

### 2.2 What is still materially below 9.0
1. `Onboarding / First Value`
2. `Mobile`
3. `Accessibility runtime proof`
4. `Performance baselines`
5. `Apps L4 evidence`
6. `Billing runtime`
7. `Managed preview sandbox`
8. `Marketing / GTM`
9. `Games`
10. `Films`
11. `Research UX parity`

## 3) Target quality bar
### 3.1 Required minimum by dimension
| Dimension | Current factual state | 9.0 threshold |
|---|---|---|
| Code quality | Strong | Maintain green gates while reducing shell/monolith risk |
| Architecture | Strong but fragmented | Canonical authority per shell/provider/preview/runtime |
| Design system | Partial | Semantic motion/spacing/type tokens + validated light surfaces |
| Visual UI | Partial | Consistent empty states, skeletons, polish, less shell drift |
| UX | Partial | Keyboard-first, clear flows, no dead ends, no duplicate surfaces |
| Onboarding | Critical gap | Proved first-value P50/P95 and demo bridge |
| Mobile | Critical gap | Entry surfaces + compact IDE mode usable, not warning-only |
| Accessibility | Operational partial | Runtime proof, light-theme contrast proof, axe evidence |
| Performance | No baseline | Published route baselines + alert thresholds |
| Multi-agent | Strong concept, blocked evidence | Real production evidence and operator clarity |
| Apps | L3 beta / L4 candidate | RAG + mentions + preview + deploy + L4 evidence |
| Research | Partial | Source-grounded citations, export, live retrieval |
| Infra/deploy | Partial | Managed preview runtime + one-click deploy |
| Billing | Partial runtime | Live checkout, portal, webhook, status, plan enforcement |
| Security/compliance | Improved but incomplete | Vault plan, readiness, enterprise docs, stronger rate controls |
| Marketing/GTM | Near-zero | Landing, pricing, proof, distribution assets |

### 3.2 Non-negotiable rule
No dimension can be scored `>=9.0` by text alone. It requires:
1. implementation,
2. runtime proof,
3. operator visibility,
4. user-facing coherence.

## 4) Closure order to reach >=9.0
### W1 Apps L4 evidence
This remains first because it validates the product core.

Required:
1. real authenticated runtime (`.env.local`, DB, JWT, CSRF, Docker daemon),
2. production probe runs,
3. apply success rate `>0.90`,
4. feedback coverage `>=0.60`,
5. reproducible readiness dossier.

Note:
`DATABASE_URL present` is not sufficient. Readiness must treat an unreachable database target as blocked runtime, not as ready configuration.

Without W1, Aethel stays below 9.0 overall regardless of UX polish.

### W2 Preview and deploy
Current state is stronger than older audits describe, but still below market bar.

Required:
1. choose a canonical preview default:
   - `E2B`
   - `WebContainers`
   - managed microVM
2. make it the default path instead of operator-discovered runtime URLs,
3. expose lifecycle states:
   - provisioning
   - warming
   - healthy
   - degraded
   - failed over
4. close one-click deploy for generated apps.

### W3 Billing and monetization
Billing is not zero, but still launch-blocking.

Required:
1. Stripe runtime configured end to end,
2. webhook path verified,
3. plan status visible in product,
4. checkout/portal flows verified,
5. usage caps enforced coherently.

### W4 Onboarding and first value
This is the biggest UX gap.

Required:
1. explicit demo mode by default when no provider is configured,
2. domain starter templates:
   - app
   - game
   - film
   - research
3. measured funnel:
   - landing
   - signup
   - onboarding start
   - first AI response
   - first preview
   - first meaningful change
4. canonical SLO target:
   - demo path P50 `< 60s`
   - configured-provider path P50 `< 90s`
5. local/operator evidence must be visible in-product:
   - session start time,
   - milestone timestamps,
   - completion duration,
   - admin `P95` reporting against the same canonical SLO target.

### W5 UX/system polish
This is where 7.x becomes 9.x.

Required:
1. reduce shell duplication and legacy imports,
2. finish empty states and skeleton coverage,
3. finalize command palette categories + fast fuzzy search,
4. stronger toast/undo behavior,
5. motion/spacing/type token formalization,
6. validated light theme on critical surfaces.
7. reduce remaining >1200-line hotspots until shell-level regression risk is low.

### W6 Knowledge/context intelligence
Older audits overstate this as missing; actual gap is production quality.

Required:
1. promote current mention foundation to first-class UX,
2. ship canonical `@Codebase`, `@Docs`, `@Diff`, `@Error`,
3. bind RAG/vector retrieval to actual IDE/research workflows,
4. persist project-level conversation memory safely.

### W7 Research quality
Research must stop looking like "good internal synthesis only".

Required:
1. source citations in output,
2. export to Markdown/PDF,
3. live retrieval mode,
4. research -> plan -> code continuity visible in UX.

### W8 Games and Films
These remain below 9.0 by design until Apps and core product are stronger.

Required:
1. Games:
   - asset generation integration,
   - physics runtime path,
   - state machine baseline,
   - export path.
2. Films:
   - external video generator integration,
   - continuity store baseline,
   - export path,
   - shot/retake orchestration.

## 5) Corrected factual scores
These are not marketing scores. They are repo-and-runtime scores.

| Dimension | Corrected score | Why |
|---|---|---|
| Code quality | 9.5 | Gates green, low fake-success debt, strong hardening |
| Architecture | 8.7 | Better canonical authority than older audits captured, but still fragmented |
| Design system | 7.5 | Strong dark baseline, incomplete semantic system and light validation |
| Visual UI | 7.6 | Better than "rough", still below premium product polish |
| UX | 6.8 | Product works, but first-value/mobile/preview friction remains |
| Onboarding | 5.2 | Demo bridge exists, SLO proof does not |
| Mobile | 5.0 | Entry improved, IDE still not product-grade |
| Accessibility | 6.4 | Static gates exist, runtime proof incomplete |
| Performance | 6.5 | Good dashboard bundle, weak published baselines |
| Multi-agent | 8.3 | Real strength, still blocked by evidence/readiness |
| Games | 3.5 | More surface than empty shell, still experimental |
| Films | 4.2 | Director/workflow exists, generator continuity does not |
| Apps | 7.1 | Strongest domain, still missing proof + RAG/product parity |
| Research | 6.8 | Real differentiation, weak citation/export/live retrieval UX |
| Infra/deploy | 5.4 | Better runtime helpers and readiness visibility, no canonical managed path |
| Billing | 4.5 | Route surface exists; launch runtime still partial |
| Marketing/GTM | 1.5 | Product far ahead of market surface |
| Security/compliance | 7.1 | Improved fail-closed posture, enterprise docs/compliance still absent |
| Documentation/governance | 10.0 | Still elite |
| Execution speed | 10.0 | Still elite |

## 6) 9.0 threshold checklist
### 6.1 Must be true before claiming "Aethel is >L4 quality"
1. Apps L4 evidence is real.
2. Preview default is managed and operator-visible.
3. Billing runtime is live.
4. Onboarding SLO is proven.
5. Landing/pricing/social proof exist publicly.
6. Mentions + RAG are product-visible, not hidden foundations.
7. Accessibility runtime proof exists for critical flows.

### 6.2 Must be true before claiming "Aethel is near L5"
1. external side effects are approval-gated,
2. credentials are scoped and isolated,
3. browser/runtime automation is sandboxed,
4. operator preflight is enforced,
5. production evidence is continuous, not one-off.

## 7) MD alignment rules
### 7.1 All future executive docs must follow these labels
1. `ABSENT`: no meaningful implementation exists.
2. `PARTIAL`: implementation exists but lacks runtime proof or product-grade closure.
3. `BLOCKED`: implementation exists or is close, but promotion/claim is blocked by missing runtime/operator evidence.
4. `ACTIVE`: implemented and evidence-backed enough for current claim boundary.
5. `EXTERNAL_BENCHMARK_ASSUMPTION`: directional comparison, not repo fact.

### 7.2 Specific wording corrections now required
1. Do not say "landing inexistente"; say "landing exists, but market-grade conversion/proof is incomplete".
2. Do not say "billing zero"; say "billing surfaces exist, runtime is still partial".
3. Do not say "mentions absent"; say "mention infrastructure exists, product-grade mention UX is incomplete".
4. Do not say "RAG absent"; say "RAG foundations exist, persistent production-grade indexing is incomplete".
5. Do not say "preview absent"; say "preview authority exists, managed default/HMR parity is incomplete".

## 8) Immediate doc-alignment actions
1. Keep `35_L4_L5_COMPLETION_MAP_2026-03-05.md` as the L4/L5 ordering map.
2. Use this document as the canonical quality-9.0 score correction map.
3. Keep `DUPLICATIONS_AND_CONFLICTS.md` refreshed whenever any audit text drifts from repo fact.
4. Treat any executive score claim below/above these corrected bounds as non-canonical until evidence changes.

## 9) Immediate execution blocks after doc alignment
1. Stand up production-like local runtime and clear preflight blockers.
   - current factual blockers are `DATABASE_UNREACHABLE` and `DOCKER_DAEMON_NOT_RUNNING`;
   - admin + CLI readiness now expose the same instructions and recommended commands for clearing them.
   - production probe execution now also enforces that readiness gate by default, so evidence generation cannot silently bypass a broken runtime.
   - CLI readiness also requires the local app runtime to answer on `AETHEL_BASE_URL`, so `npm run dev` is part of the canonical evidence path.
   - operator-facing aggregation now exists (`qa:operator-readiness`, `/api/admin/operator-readiness`, and `/admin/apis` runtime cards), so the remaining gap is environment closure, not preflight discoverability.
2. Finish managed preview default decision.
   - preview discovery and manual runtime binding now surface provider-aware commands/instructions from the same readiness source, but managed execution is still `PARTIAL`.
   - CLI preview env preflight and `/admin/apis` visibility now exist, so the remaining gap is live managed execution/HMR parity, not setup ambiguity.
3. Finish Stripe runtime closure.
   - CLI billing env preflight plus `setup:billing-runtime` now exist, so remaining billing closure is increasingly about live Stripe runtime/webhook validation, not opaque local setup.
   - placeholder Stripe values no longer count as closure, so preflight truthfulness improved even though runtime is still blocked.
4. Surface starter-template onboarding and first-value measurements.
5. Promote mentions/RAG from hidden foundation to visible workflow capability.
6. Keep the active hotspot set at `0` after the `MediaStudio.tsx` and `SettingsPage.tsx` decompositions.

## 10) Bottom line
Aethel does not need a new vision document.

Aethel needs:
1. less audit drift,
2. more runtime proof,
3. stronger product closure on billing/preview/onboarding,
4. visible context intelligence,
5. stricter claim discipline.

That is the shortest path to `>=9.0` quality without inflating L5 language.
