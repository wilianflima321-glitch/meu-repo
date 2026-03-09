# 35_L4_L5_COMPLETION_MAP_2026-03-05
Status: ACTIVE COMPLETION MAP
Date: 2026-03-05
Owner: Chief Architecture + Platform + PM

## 1) Purpose
Consolidate the single execution map required to move Aethel from the current asymmetrical state to:
1. `L4` in `Apps`
2. evidence-backed `PARTIAL` readiness in `Preview`, `Onboarding`, `Collaboration`, and `Accessibility`
3. `L5` foundations without inflating claims for Games/Films/browser render parity

This document is a decision map, not a marketing roadmap.

## 2) Current factual state
### 2.1 Product/domain state
1. `Apps`: `L3 Production Ready (Beta)` from `27_DOMAIN_READINESS_SCORECARDS_2026-02-28.md`
2. `Games`: `L2 Experimental`
3. `Films`: `L2 Experimental`
4. Explicit API `NOT_IMPLEMENTED` inventory in active scope: `0`
5. `qa:enterprise-gate`: `PASS`

### 2.2 Core loop evidence state
From `metrics/latest_run-production.json` and `metrics/latest_run-rehearsal.json`:
1. Production sample size: `0`
2. Rehearsal sample size: `24`
3. Rehearsal apply success rate: `0.75`
4. Rehearsal regression rate: `0`
5. Rehearsal feedback coverage: `0.5`
6. L4 promotion is therefore blocked by missing production evidence, insufficient LEARN coverage threshold (`0.6`), and insufficient success rate.

### 2.3 UX/runtime state
1. Managed preview runtime provisioning exists and is `PARTIAL`.
2. Preview runtime now supports:
- auto-discovery
- authenticated provision
- warm-up polling
- multi-endpoint failover
3. Managed HMR parity is still not implemented.
4. First-value telemetry exists, but `<90s` is not yet proven as a canonical achieved SLO.
5. Collaboration has SLO targets documented, but no stress/conflict proof bundle.
6. Accessibility has static gate coverage, but runtime evidence remains `PARTIAL`.
7. Research-to-Forge continuity improved (`Nexus Research -> /ide` handoff payload), but remains `PARTIAL` until end-to-end source-grounded code flow is evidenced in production metrics.
8. Multi-agent UX now supports explicit runtime mode selection (`heuristic` vs `provider-backed`), but provider-backed reliability remains `PARTIAL` pending production evidence.

## 3) Hard truth map
### 3.1 What is actually blocking L4
1. `production_only_for_promotion` has `sampleSize=0`.
2. `LEARN` exists, but production `feedbackCoverage` is effectively `0`.
3. `apply` and `rollback` are operational `PARTIAL`, but not yet evidence-proven at L4 thresholds.
4. Unified acceptance evidence is still spread across gates and run artifacts, not yet a fully operator-closed promotion dossier.

### 3.2 What is not blocking L4 but still blocks market claim quality
1. Managed preview is not HMR-grade.
2. First-value onboarding is instrumented but not yet friction-closed.
3. Collaboration is still claim-gated by missing proof.
4. Runtime accessibility proof is incomplete.
5. Mobile readiness is still not strong enough for broad market-parity claim.

### 3.3 What must stay frozen
1. Games/Films expansion beyond factual L2 execution.
2. Unreal/Sora parity language.
3. New product shells or scope expansion outside `/dashboard` + `/ide`.

## 4) Completion order
### A) L4 Apps closure
1. Generate production evidence through controlled real runs, not drills.
2. Raise production `sampleSize` to promotion floor and then to representative volume.
3. Raise `learnFeedbackCoverage` to at least `0.6`.
4. Raise apply success rate above `0.9`.
5. Keep regression rate below `0.05`.
6. Publish a single operator-readable readiness dossier from existing readiness endpoints and run artifacts.

### B) First-value closure
1. Keep demo mode as the no-provider bridge.
2. Prove first-value SLO with measured windows.
3. Remove remaining runtime friction from preview setup.
4. Ensure provider recovery and preview provisioning remain in-flow, never dead-end.

### C) Market-readiness closure
1. Publish collaboration evidence bundle.
2. Publish runtime accessibility evidence bundle.
3. Close responsive/mobile evidence for entry surfaces.
4. Only after A/B/C are complete, move to market-parity narrative tightening.

### D) L5 foundations
1. Browser/tool automation runtime in sandbox.
2. Credential vault with scoped permissions.
3. Approval policy for external side effects.
4. Cost hard-stop per agent/session.
5. Retry/circuit-breaker/provider-fallback policy.

L5 work starts only after Apps L4 evidence is real.

## 5) Workstreams and exact next steps
### W1 Core Loop evidence
1. Use production probe and real operator flows to create production-sample apply runs.
2. Surface missing LEARN feedback directly after apply/rollback outcomes until coverage target is met.
3. Tighten acceptance-matrix visibility per run:
- lint
- typecheck
- build/smoke
- contract gates
4. Publish rolling evidence snapshots in `metrics/` and admin readiness surfaces.

### W2 Preview runtime
1. Keep current managed provision path as canonical.
2. Treat current state as `managed runtime bootstrap`, not `real HMR parity`.
3. Next preview milestone:
- provisioned runtime lifecycle visibility
- frontend backoff/circuit behavior
- stable operator telemetry for failover attempts
4. Separate future HMR decision from current readiness claim:
- `webcontainer`
- `managed sandbox`
- custom microVM

### W3 Onboarding and first value
1. Keep demo mode enabled path explicit and budgeted.
2. Tie first-value funnel to:
- signup
- onboarding entry
- first project
- first AI success
- first IDE open
- completed first value
3. First-value guidance should surface live preview readiness and adapt preview CTA/instructions to `managed`, `local`, or `inline` mode instead of assuming preview is equally ready for every user.
4. Publish actual P50/P95 first-value timing before claiming closure.

### W4 Collaboration
1. Produce evidence for:
- synthetic concurrency
- reconnect replay
- conflict replay
2. Attach proof through existing admin evidence surfaces.
3. Keep claim at `PARTIAL` until reproducible proof exists.

### W5 Accessibility and mobile
1. Runtime evidence for critical flows:
- landing -> auth -> dashboard
- dashboard -> ide -> preview
2. Reduce runtime WCAG threshold over time from permissive baseline.
3. Treat light theme as foundation only until critical-surface contrast evidence exists.

## 6) L4 exit criteria
Apps may be promoted to `L4` only when all are true:
1. production sample is non-zero and representative
2. apply success rate > `0.90`
3. regression rate < `0.05`
4. feedback coverage >= `0.60`
5. apply/rollback evidence is reproducible
6. cost variance is measured and within target
7. enterprise gates remain green during the same wave

## 7) L5 entry criteria
L5 work may be claimed only when:
1. Apps L4 is already evidence-backed
2. external side effects are approval-gated
3. credentials are isolated in scoped vault
4. browser/tool actions run in sandbox
5. audit and rollback are explicit for external actions

## 8) Claim boundaries
### Allowed now
1. `Apps` is the primary L4 candidate.
2. Preview/bootstrap, onboarding, collaboration, and accessibility are active `PARTIAL` closure programs.
3. Games/Films are valuable pre-production and prototyping surfaces, not production engines.

### Prohibited now
1. `Aethel is already L4`
2. `Aethel is L5`
3. `Unreal parity in browser`
4. `Sora/Kling parity`
5. `enterprise-grade collaboration` without proof bundle

## 9) Canonical execution rule
If work competes with this order:
1. Core loop production evidence wins.
2. First-value friction wins next.
3. Collaboration/accessibility/mobile proof comes before new domain ambition.
4. Games/Films remain frozen beyond factual L2 hardening until Apps L4 is closed.

## 10) Delta 2026-03-07
1. First-value path improved with explicit local demo bridge on IDE chat when provider is missing and server demo mode is off.
2. Dashboard shell margin improved (`AethelDashboard.tsx` moved from `1199` to `1190` lines) by extracting initial-state logic to a dedicated helper module.
3. `DUPLICATIONS_AND_CONFLICTS.md` is refreshed and active again; conflict map now tracks open blockers with explicit IDs (`C-01..C-05`).
4. L4 block conditions remain unchanged:
   - production evidence still required;
   - readiness thresholds still mandatory;
   - no claim upgrade allowed by rehearsal-only metrics.
5. IDE chat mention handling now avoids silent degradation:
   - unsupported mention tags are surfaced explicitly as `MENTION_NOT_SUPPORTED`;
   - empty prompts after mention sanitization are blocked before provider call;
   - only documented profile-routing tags remain active (`@studio`, `@delivery`, `@fast`, `@web`, `@agents:1|2|3`).
6. Async polling compatibility aliases were added for generator APIs that already expose `checkStatusUrl`:
   - `GET /api/ai/music/status` now maps to canonical `GET /api/ai/music/generate`;
   - `GET /api/ai/3d/status` now maps to canonical `GET /api/ai/3d/generate`.
7. Audio/music stack remains marked as integration-incomplete at product level:
   - generation endpoints exist;
   - editor-grade audio components exist;
   - end-to-end orchestration in the canonical workbench is still `PARTIAL`.
8. Dashboard `content-creation` surface now moved from placeholder cards to a unified workbench shell:
   - canonical local `Project Graph` store (`assets/scenes/timeline/shots/jobs/audio-policy`);
   - single three-panel workspace (`graph`, `scene/timeline/preview`, `jobs/policy/inspector`);
   - async AI generation queue orchestration for `music`, `voice`, `3d` with status polling and graph import hooks.
9. Product-shell drift remains an active quality risk and must stay explicit:
   - `AethelDashboardSidebar` and `DashboardSidebar` still coexist;
   - `TheForgeUnified.tsx` remains detached from the canonical dashboard path;
   - `LivePreview`, `PreviewPanel`, and `NexusCanvasV2` still represent different preview paradigms.
10. Media orchestration is improved but not yet fully canonical:
   - `MediaStudio.tsx` now supports controlled operation from the `Project Graph` shell;
   - timeline/assets selection can flow through the canonical workbench path;
   - however, full domain unification is still pending because non-media surfaces are not yet bound to the same contract depth;
   - therefore timeline/editor parity should remain `PARTIAL`, not claimed as complete.
11. Preview authority is now partially centralized for dashboard-facing surfaces:
   - `CanonicalPreviewSurface.tsx` now fronts `live`, `scene`, and `runtime` preview variants;
   - dashboard overview, creation workbench, and `/ide` now route through this preview authority instead of importing primitives directly;
   - shared runtime helpers now exist in `lib/preview/runtime-manager.ts` for normalize/discover/provision/health/persist flows;
   - `/ide` runtime state/orchestration is now routed through `hooks/usePreviewRuntimeManager.ts` instead of remaining fully inline in `FullscreenIDE.tsx`;
   - preview auto-behavior now follows canonical runtime readiness (`recommendedAction`) instead of blindly attempting managed provision whenever a token exists;
   - preview toolbar now exposes a single recommended runtime action, reducing operator ambiguity between managed/local/inline paths;
   - preview consolidation remains `PARTIAL` because dashboard handoff/bootstrap and detached legacy shells are still not fully collapsed into one runtime authority.
12. Provider integration coverage improved:
   - `OPENROUTER_API_KEY` is now recognized as a first-class configured provider in runtime/admin status surfaces;
13. Codebase-context execution improved beyond visible mention chips:
   - canonical semantic context route now exists at `POST /api/ai/context/search`;
   - advanced chat `@codebase` mention resolution now uses transient local semantic retrieval in the active project scope when available, with repository fallback otherwise;
   - IDE chat composer now surfaces codebase-context preview cards before send when `@codebase` is present, making retrieval visible instead of hidden-only prompt wiring;
   - preview cards can now open matched files directly in `/ide` and reveal the matched line range, reducing dead-end context inspection;
   - canonical file mutations now invalidate transient semantic cache for the scoped project, reducing stale `@codebase` retrieval after write/delete/move operations;
   - composer preview now exposes indexed file/chunk counts plus a manual refresh path for semantic context, improving operator trust when context may have changed;
   - IDE file saves now emit a scoped mutation event so `@codebase` preview can auto-refresh when the active project changes during an open chat session;
   - claim remains `PARTIAL` because retrieval is still local-transient (no persistent vector DB, no cross-session memory, no incremental production index pipeline).
14. Public pricing/billing narrative is now tied to live readiness instead of static copy:
   - pricing page consumes canonical billing readiness and surfaces live checkout/portal/webhook state plus missing Stripe env blockers;
   - claim remains `PARTIAL` because runtime activation of monetization still depends on real Stripe environment configuration.
13. Dashboard shell margin improved again; current local line count is `1189`, not `1190`.
14. Executive audit language must now distinguish `ABSENT` from `PARTIAL` more strictly:
   - landing exists,
   - billing exists as route/UI surface set,
   - mentions exist as parser/foundation,
   - RAG/vector infra exists in local/in-memory form,
   - preview authority exists as canonical partial.
15. Local production proof remains blocked by runtime preflight:
   - missing `.env.local`,
   - missing `DATABASE_URL`,
   - missing `JWT_SECRET`,
   - missing `CSRF_SECRET`,
   - inactive Docker daemon.
16. Chat/stream parity improved:
   - `/api/ai/chat` and `/api/ai/stream` now both enforce explicit model/provider gating,
   - `/api/ai/stream` now has internal-provider fallback when external backend proxy is absent,
   - provider-missing flows remain explicit and non-fake-success.
17. Public product surface improved:
   - `/` landing is now stronger as a public-facing product entry, with clearer claims, pricing CTA, workflow framing, and explicit scope boundaries;
   - metadata now reflects the multi-agent software-studio positioning more accurately than the older game-engine-only copy.
18. SEO/discovery baseline improved:
   - `app/robots.ts` and `app/sitemap.ts` now exist,
   - public discovery setup is still `PARTIAL` because proof/social/distribution are still missing.
19. IDE context UX improved:
   - mention suggestions/chips/quick-insert controls are now visible in the chat composer,
20. First-value evidence quality improved:
   - dashboard first-value tracking now persists a session summary with start time, milestone timestamps, completion duration, and target window;
   - `FirstValueGuide` now surfaces this session evidence directly instead of relying on hidden analytics only;
   - admin onboarding stats now expose both median and `P95` first-value time plus the latest completion timestamp;
   - admin analytics baseline now uses the canonical first-value SLO target from shared server config instead of a divergent hard-coded `15s` target;
   - claim remains `PARTIAL` because the evidence is still local/admin-level until representative production samples exist.
21. Operator runtime proof is now more visible in admin AI monitoring:
   - core-loop readiness UI now surfaces production runtime preflight state (`.env.local`, DB, JWT, CSRF, authReady, probeReady);
   - blockers no longer require reading the raw readiness payload or separate scripts first;
   - claim remains `BLOCKED` until the runtime blockers are actually cleared and production probes run successfully.
22. Production preflight accuracy improved:
   - local bootstrap now exists via `npm run setup:local-runtime`, creating `cloud-web-app/web/.env.local` with generated local secrets when missing;
   - local bootstrap now also creates/synchronizes root `.env` for `docker compose`, keeping compose credentials and `DATABASE_URL` aligned;
   - deterministic preflight now reads `.env.local` directly and no longer depends on exported shell env only;
   - database readiness now requires basic target reachability, not just `DATABASE_URL` presence;
   - current local blockers therefore moved from file/secret absence to factual runtime blockers such as `DATABASE_UNREACHABLE` and `DOCKER_DAEMON_NOT_RUNNING`.
23. Local database bring-up path is now explicit:
   - `npm run setup:local-db` now codifies the canonical local path (`docker compose up -d postgres redis` -> `prisma db push`);
   - `--dry-run` exposes the exact actions and target without requiring Docker to be active;
   - claim remains `BLOCKED` until the actual stack is reachable, but the repo now contains a deterministic path to clear `DATABASE_UNREACHABLE`.
24. Preview runtime configuration is now more operator-legible:
   - readiness now surfaces an explicit managed provider label when configured;
   - toolbar and first-value guidance can show the declared managed preview provider instead of only raw endpoint counts;
   - `.env.local.example` now includes canonical preview runtime env keys for managed provisioning;
   - claim remains `PARTIAL` because provider identity is now clearer, but sandbox/HMR parity is still not product-complete.
25. Managed preview provider authority is now less fragmented:
   - preview provider parsing and setup-env rules now live in a shared server config module instead of remaining duplicated between readiness and provision paths;
   - `runtime-provision` now emits provider-aware metadata and explicitly blocks browser-side-only providers like `webcontainers` instead of pretending route-based provisioning can serve them;
   - claim remains `PARTIAL` because provider authority is cleaner, but no managed sandbox path is yet fully production-backed by default.
26. Billing provider authority is now more explicit:
   - billing runtime now exposes provider label, canonical setup env keys, and webhook path through a shared provider/runtime authority instead of leaving public and dashboard billing surfaces to infer setup only from generic Stripe env failure;
   - `/pricing` and dashboard billing can now surface provider-specific setup requirements directly;
   - `.env.local.example` now includes the Stripe price env keys expected by readiness checks;
   - claim remains `PARTIAL` because real Stripe runtime is still not configured end-to-end in a live environment.
27. Mention transparency now extends beyond `@codebase`:
   - explicit mention tags such as `@docs:*`, `@file:*`, `@folder:*`, and `@git:*` now have a dedicated preview path in the composer instead of being invisible until prompt assembly on the server;
   - `/api/ai/context/mentions` now provides authenticated structured mention previews from the same mention-resolution authority used by advanced chat;
   - claim remains `PARTIAL` because mention memory, ranking, and persistent retrieval are still not product-complete.
28. Stripe readiness is now more granular:
   - Stripe readiness now distinguishes secret key, publishable key, and price coverage instead of collapsing all monetization gaps into one generic missing-env bucket;
   - status, pricing, and billing lifecycle surfaces now expose provider plus price-coverage state to reduce operator ambiguity;
   - claim remains `PARTIAL` because live Stripe runtime is still not configured end-to-end.
29. Admin integration ops now include billing runtime visibility:
   - `/admin/apis` now includes a billing runtime quick check alongside provider env checks;
   - admin operators can now see provider label, checkout/portal/webhook readiness, publishable-key state, price coverage, webhook path, and missing env keys in one place;
   - claim remains `PARTIAL` because visibility improved, but live Stripe configuration is still not complete.
31. Admin payments now mirrors billing runtime truth:
   - `/admin/payments` now shows billing runtime status, provider label, checkout/portal/webhook readiness, publishable-key state, price coverage, and missing env alongside gateway controls;
   - admin payment controls are now less likely to imply that gateway toggles alone make billing live;
   - claim remains `PARTIAL` because real Stripe activation still depends on runtime configuration and webhook closure.
32. IDE shell hotspot risk reduced:
   - `AIChatPanelPro.tsx` was decomposed by extracting context and chrome sub-surfaces into dedicated components, bringing the shell back below the `>=1200` hotspot threshold;
   - global gap scan now reports `2` large-file hotspots in `cloud-web-app/web` instead of `3`;
   - claim remains `PARTIAL` because additional hotspots (`MediaStudio.tsx`, `SettingsPage.tsx`) still require decomposition.
33. Active large-file hotspot set cleared:
   - `MediaStudio.tsx` has been decomposed into `MediaStudioPanels.tsx`, reducing the shell to `781` lines while preserving controlled project-graph behavior;
   - `SettingsPage.tsx` now delegates sidebar/content structure to `SettingsPageSections.tsx`, reducing the shell to `1092` lines;
   - the global gap scan now reports `0` files at or above the `>=1200` hotspot threshold inside `cloud-web-app/web`;
   - claim remains `PARTIAL` because runtime evidence, managed preview, and live billing are still blocking higher-level promotion.
34. Runtime preflight parity improved:
   - server-side production readiness now reports Docker CLI presence, Docker daemon state, human-readable instructions, and recommended commands in addition to env/database/auth facts;
   - admin AI monitoring now surfaces the same runtime next actions that the CLI preflight emits, removing guesswork from the L4 evidence path;
   - current factual blockers remain `DATABASE_UNREACHABLE` and `DOCKER_DAEMON_NOT_RUNNING`, but the operator path is now explicit rather than implicit.
35. Preview-provider affordances are less misleading:
   - preview readiness now exposes provider label plus whether route-based provisioning is actually supported;
   - the IDE preview toolbar now disables direct provisioning when the declared provider is browser-side-only (`webcontainers`) instead of advertising a route path that must fail;
   - claim remains `PARTIAL` because managed sandbox execution still is not the default working path.
37. Preview setup guidance is now actionable:
   - preview readiness now returns provider mode and recommended commands in addition to blockers and env keys;
   - dashboard first-value guidance and IDE preview toolbar now surface those next-step commands directly;
   - `.env.local.example` and `README.md` now distinguish route-managed (`e2b`) from browser-side-only (`webcontainers`) preview declarations.
38. Billing setup guidance is now actionable:
   - billing runtime readiness now returns explicit blockers, instructions, and recommended commands instead of only booleans;
   - public pricing/readiness and dashboard billing surfaces now show the same next-step guidance for Stripe closure;
   - claim remains `PARTIAL` because live Stripe runtime still depends on real envs, webhook registration, and end-to-end validation.
39. Production-probe ergonomics are now fail-closed:
   - `tools/run-core-loop-production-probe.mjs` now checks `/api/admin/ai/readiness` before attempting probe execution;
   - when `probeReady=false`, the probe exits with explicit blockers, instructions, and recommended commands instead of failing deeper in the flow;
   - `npm run qa:core-loop-production-probe:force` exists for operator override, but the canonical default path now enforces readiness first.
40. Preview discovery guidance now comes from the same readiness authority:
   - `/api/preview/runtime-discover` now returns structured guidance (`strategy`, provider label/mode, instructions, recommended commands) alongside discovery results;
   - client runtime helpers expose discovery details, and the IDE manual discovery path now shows provider-aware next steps instead of a generic "run dev" hint;
   - claim remains `PARTIAL` because guidance improved, but managed preview is still not the default live path.
41. Local production preflight now includes app-runtime reachability:
   - CLI readiness now checks `AETHEL_BASE_URL` (default `http://localhost:3000`) through `/api/health/live` before declaring the local environment probe-ready;
   - production-probe execution now fails early with explicit `npm run dev` guidance instead of surfacing a raw fetch failure when the web app is down;
   - claim remains `BLOCKED` until the local app, database, and Docker-backed prerequisites are all live together.
42. Dashboard-to-IDE handoff now follows canonical preview readiness:
   - dashboard handoff no longer blindly attempts route-based provisioning before local discovery;
   - it now consults preview readiness first, skips unsupported route provisioning for browser-side providers, and respects inline/discover recommendations;
   - claim remains `PARTIAL` because managed preview still is not the default live path, but handoff drift is lower.
43. Physics dependency conflict is removed from the active web package:
   - `@react-three/cannon` is no longer present in `cloud-web-app/web/package.json`;
   - the active dependency set now matches the factual Rapier-first runtime path better and removes one false signal from older audits;
   - claim remains `PARTIAL` because games maturity is still far below product-grade parity.
44. Billing now has a CLI env preflight:
   - `npm run qa:billing-runtime-readiness` validates local Stripe env closure (`secret`, `publishable`, `webhook`, canonical price IDs) from `.env.local`;
   - this is explicitly env-only validation and does not claim live gateway/webhook success, but it closes another operator ambiguity before runtime testing;
   - claim remains `PARTIAL` because live Stripe checkout and webhook registration still require real environment validation.
45. Preview now has a CLI env preflight and admin visibility:
   - `npm run qa:preview-runtime-readiness` validates local preview-provider env closure, provider mode, route-provision support, and provisioning-token expectations from `.env.local`;
   - `/admin/apis` now surfaces preview runtime status, strategy, provider/mode, blockers, and recommended commands alongside AI and billing readiness;
   - claim remains `PARTIAL` because this closes setup ambiguity, not managed preview execution itself.
46. Operator readiness is now aggregatable:
   - `npm run qa:operator-readiness` aggregates production runtime, billing runtime, and preview runtime preflights into one operator-facing summary;
   - `/api/admin/operator-readiness` now provides the same aggregate payload for product/admin surfaces;
   - `/admin/apis` now consumes that aggregate readiness instead of stitching together three separate runtime fetches client-side;
   - claim remains `PARTIAL` because aggregation improves operator flow, not runtime maturity itself.
47. AI monitor now reflects the stricter production preflight:
   - `/admin/ai-monitor` now shows app-runtime reachability and `AETHEL_BASE_URL` next to DB/auth/Docker facts inside the production preflight panel;
   - this closes another gap between CLI readiness and admin observability;
   - claim remains `PARTIAL` because visibility improved, but the runtime is still blocked until the app, DB, and Docker stack are live.
48. Runtime setup now has canonical bootstrap helpers:
   - `npm run setup:preview-runtime` seeds managed-preview env placeholders in `cloud-web-app/web/.env.local`;
   - `npm run setup:billing-runtime` seeds Stripe env placeholders and canonical price IDs in the same local env file;
   - claim remains `PARTIAL` because these helpers reduce setup ambiguity, not live provider validation.
49. Placeholder env values no longer count as runtime readiness:
   - Stripe readiness now rejects placeholder/test scaffold values like `sk_test_...`, `whsec_...`, and `price_*_replace_me` instead of treating them as live closure;
   - preview readiness now rejects placeholder tokens and `example.com` endpoints instead of marking managed preview as ready from scaffolding alone;
   - claim remains `PARTIAL` because this improves anti-fake-success, not runtime maturity.
36. Local semantic retrieval now supports incremental reindex:
   - semantic code search now reuses unchanged file chunks from the disk-backed local cache during refresh/reindex instead of rebuilding every file from scratch;
   - IDE codebase-context preview now surfaces changed vs reused file counts and flags that incremental local reindex is active;
   - claim remains `PARTIAL` because production vector infrastructure, richer ranking, and true cross-workspace persistence are still absent.
30. Local semantic retrieval now persists across process restarts:
   - semantic code search now uses a lightweight disk-backed cache under `.aethel/cache/semantic-code-search` instead of memory-only indexing;
   - this upgrades codebase retrieval from session-only transient behavior to local persistent cache behavior without claiming vector-DB parity;
   - claim remains `PARTIAL` because incremental reindex, ranking depth, and production vector infrastructure are still absent.
   - profile-routing tags (`@studio`, `@delivery`, `@fast`, `@web`, `@agents:n`) are now stripped without deleting contextual mention tags,
   - contextual tags like `@codebase`, `@docs:*`, and `@git:*` now survive message normalization instead of being treated as unsupported by default.
20. Billing visibility improved:
   - Stripe runtime readiness is now exposed explicitly through `GET /api/billing/readiness`,
   - `GET /api/health/stripe` now exists and closes the previous health-check gap,
   - billing tabs can now explain why checkout is still partial instead of failing as an opaque runtime surprise,
   - dashboard billing can now fetch canonical subscription status and use default checkout/portal actions when no custom handler is injected.
21. Pricing/public consistency improved:
   - `/pricing` now reflects canonical plans from `lib/plans.ts` instead of parallel public tiers,
   - public pricing language is now aligned with the actual system contract,
   - monetization claim remains `PARTIAL` until live Stripe runtime is configured.
22. Public anti-fake-success posture improved:
   - `/status` no longer presents invented uptime/incidents and now reads from public health/billing readiness endpoints;
   - `/contact-sales` no longer simulates successful submission and now uses an explicit email-draft flow instead of fake delivery confirmation;
   - public marketing surfaces are more consistent with the product's anti-fake-success contract.
23. Billing runtime guard is now more canonical:
   - checkout, portal, webhook, readiness, and Stripe health now read from a shared `lib/server/billing-runtime.ts` authority;
   - billing surfaces can distinguish `checkoutReady`, `portalReady`, and `webhookReady` instead of collapsing all runtime failure into one opaque billing state;
   - monetization remains `PARTIAL` until real Stripe runtime is configured, but billing drift is lower.
24. Billing lifecycle pages are now more honest:
   - `/billing/invoices` now reads live portal data plus readiness state and avoids treating portal access as implicitly available;
   - `/billing/success` and `/billing/cancel` now reflect live readiness/subscription state instead of assuming billing state from navigation alone;
   - billing lifecycle remains `PARTIAL` because production Stripe runtime is still not configured end-to-end.
25. Mention workflow improved beyond UI-only signaling:
   - `/api/ai/chat-advanced` now resolves contextual mention tags such as `@codebase`, `@docs:*`, `@file:*`, `@folder:*`, and `@git:*` into explicit server-side context blocks;
   - mention tags are now reflected in trace evidence, reducing the gap between visible mention UX and actual model context;
   - mention workflow still remains `PARTIAL` because persistent semantic retrieval/memory is not yet product-grade.
26. Preview strategy is now more explicit:
   - `/api/preview/runtime-readiness` now exposes whether preview is effectively running in `managed`, `local`, or `inline` mode;
   - IDE runtime toolbar now shows strategy and blockers instead of presenting runtime controls without readiness context;
   - runtime readiness now also surfaces concrete operator instructions plus local discovery/configuration counts, reducing dead-end preview setup;
   - preview remains `PARTIAL` because managed sandbox/HMR default is still not shipped as the single product path.
   - `aiService` now supports OpenRouter through the OpenAI-compatible API path with explicit `provider: openrouter`;
   - `aiService.selectProvider()` now prefers OpenRouter when it is the only configured provider instead of falsely failing with "Nenhum provider";
   - `lib/ai/advanced-ai-provider.ts` and `lib/ai/inline-completion.ts` now also recognize OpenRouter instead of keeping older OpenAI-only assumptions in deeper AI infrastructure layers;
   - live direct validation succeeded for routed models `google/gemini-3.1-flash-lite-preview`, `openai/gpt-4o-mini`, and `anthropic/claude-3.5-haiku`;
   - low-cost real completion was validated against a live OpenRouter model (`google/gemini-3.1-flash-lite-preview`);
   - setup and settings UX now surface OpenRouter as a first-class operator-facing option instead of backend-only support;
   - `inline-edit` provider validation now accepts `openrouter`;
   - IDE chat model presets and provider gate messaging now include OpenRouter-oriented defaults so the product shell is less biased toward direct OpenAI-only wording;
   - provider cost metadata now includes routed OpenRouter variants in `aiService` and emergency-mode controls so cost/allowance logic is less inconsistent;
   - `plan-limits.ts` now normalizes provider-prefixed/routed model identifiers so `checkModelAccess` no longer rejects OpenRouter-backed models that the UX exposes;
   - readiness and promotion routes now count `OPENROUTER_API_KEY` as factual provider configuration instead of under-reporting configured state in core-loop/admin surfaces;
   - default AI settings now bias toward routed OpenRouter models in operator-facing settings surfaces instead of hard-defaulting to direct OpenAI choices;
   - provider configuration truth is now centralized in `lib/ai-provider-config.ts` and consumed by health/provider-status/readiness routes to reduce future env-check drift;
   - provider labels/setup wording now also draw from centralized provider config so demo/setup copy is less likely to drift from runtime truth;
   - this improves factual provider readiness but does not change L4 promotion criteria, which still require production evidence.
13. Local production-style validation remains blocked by environment prerequisites:
   - direct provider validation is real and passing, but full protected-route validation still requires a real app runtime with `DATABASE_URL`, `JWT_SECRET`, and a valid authenticated token for `/api/admin/ai/core-loop-production-probe`;
   - current local environment still lacks `cloud-web-app/web/.env.local`, does not expose `DATABASE_URL`/`JWT_SECRET`, and does not have a running Docker daemon for the heavier sandbox path;
   - therefore provider readiness improved materially, but production readiness remains `PARTIAL` until authenticated end-to-end probes run against a live runtime.
14. Security/readiness hardening improved:
   - `lib/rbac.ts` no longer accepts an implicit fallback admin JWT secret and now fails closed with `AUTH_NOT_CONFIGURED` instead of silently trusting a baked-in development secret;
   - `lib/rbac-middleware.ts` now also fails closed when `JWT_SECRET` is absent instead of accepting `aethel-secret-key`;
   - `lib/security/csrf-middleware.ts` no longer signs tokens with a fallback secret and now reports `CSRF_NOT_CONFIGURED` when server secrets are absent;
   - `app/api/admin/ai/readiness/route.ts` now exposes runtime prerequisites through `runtimeReadiness` so admin operators can distinguish provider readiness from real production-probe readiness.
15. AI chat/stream runtime consistency improved:
   - `/api/ai/chat` now enforces model access checks for requested models and returns explicit provider-setup capability metadata when a model implies an unavailable provider;
   - `/api/ai/stream` no longer hard-depends on `NEXT_PUBLIC_API_URL`; it can now stream directly through internal providers when no external AI backend proxy is configured;
   - `/api/ai/stream` also mirrors demo-mode/provider-missing behavior instead of failing as a backend-only dead-end, which reduces one production readiness gap for the local runtime path.
16. Production preflight is now executable instead of implicit:
   - `tools/check-production-runtime-readiness.mjs` provides a deterministic local preflight for `.env.local`, `DATABASE_URL`, `JWT_SECRET`, `CSRF_SECRET`, Docker CLI, and Docker daemon state;
   - `npm run qa:production-runtime-readiness` now fails with explicit blockers instead of leaving operators to infer why production probes cannot start.
