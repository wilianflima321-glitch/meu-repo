# 90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30
Date: 2026-04-30
Status: ACTIVE
Role: no-drift product-quality checkpoint that aligns the audits, blueprints, visual arsenal, and current repo reality

## Why This Exists
The repo already has:
- strong audits,
- strong blueprints,
- curated images,
- and real implementation progress.

What was still easy to lose was the exact answer to four practical questions:
1. what Aethel is now trying to be,
2. what is already good enough to preserve,
3. what still needs tightening,
4. and how future work should stay aligned without inventing new product families.

This document is the current anti-drift checkpoint.

## Canonical Inputs Used
This checkpoint was reconciled against:
- `docs/master/76_AUDITORIA_DEFINITIVA_BENCHMARK_2026-04-11.md`
- `docs/master/82_AUDITORIA_V5_AETHEL_ENGINE_DEEP_2026-04-19.md`
- `docs/master/83_AUDITORIA_PROFUNDA_SISTEMAS_INTERFACES_GITHUB_2026-04-22.md`
- `docs/master/84_AUDITORIA_PROFUNDA_REPOSITORIO_PLANO_DE_ACAO_2026-04-22.md`
- `docs/master/85_EXECUTION_STATUS_MAP_2026-04-22.md`
- `docs/master/87_PARALLEL_SLICING_AND_BENCHMARK_WAVE_2026-04-24.md`
- `docs/master/88_AI_ARSENAL_AND_DOMAIN_SUPERIORITY_BLUEPRINT_2026-04-28.md`
- `docs/master/89_WEB_LIGHT_STUDIO_CLOUD_LOCAL_ARCHITECTURE_2026-04-29.md`
- `AETHEL_INTERFACE_BLUEPRINTS/00_INDEX.md`
- `AETHEL_INTERFACE_BLUEPRINTS/01_HOME.md`
- `AETHEL_INTERFACE_BLUEPRINTS/06_STUDIO_HOME.md`
- `AETHEL_INTERFACE_BLUEPRINTS/08_WORKBENCH.md`
- `AETHEL_INTERFACE_BLUEPRINTS/17_STUDIO_LOCAL.md`
- `AETHEL_INTERFACE_BLUEPRINTS/18_DEPTH_MODES_AND_HANDOFFS.md`
- `AETHEL_INTERFACE_BLUEPRINTS/19_BEST_IN_MARKET_CLEAN_UX_GUARDRAILS.md`
- local UX arsenal folder `AETHEL_UX_ARSENAL_2026-04-29/00_ARSENAL_INDEX.md` when present outside the repo
- local reference image `2 imagen ide aethel.png` when present outside the repo
- local Vercel dashboard reference image from the UX arsenal when present outside the repo

## Canonical Product Reading
The current product should be read as:
- `Web Light` for low-anxiety mission intake,
- `Studio Home` for current-task continuity inside the same Studio shell,
- `Studio Cloud` for deeper creation, review, and operator work,
- `Studio Local` as a depth unlock when browser ceilings matter.

This replaces the older mental model of:
- landing,
- then dashboard,
- then a separate IDE.

The IDE is not a later product.
It is already present in the initial area as a lighter Studio state that deepens when needed.

## Current Quality Readout
These ratings are intentionally strict.

### 1. Web Light
Status: STRONG DIRECTION, PARTIAL COMPLETION

What is aligned:
- mission-first entry exists,
- copy has been reduced,
- the surface reads more like an AI app than a SaaS landing,
- the path toward Studio is clearer.

What still needs tightening:
- connected tools and operator affordances should remain visible but restrained,
- buyer-proof and trust surfaces still need slightly stronger continuity from entry,
- the shell must avoid regrowing feature-grid behavior.

### 2. Studio Home
Status: STRONG

What is aligned:
- the old dashboard behavior is being replaced by `Studio Home`,
- triage now affects the shell,
- `Expand Studio` is the right mental model,
- the user is not being pushed into a visibly different product.

What still needs tightening:
- secondary lanes must stay subordinate to the mission hero,
- operations and exploration should stay progressive, not equal-weight,
- Project Brain is now visible as a compact read model but still needs durable storage and mission-ledger backing.

### 3. Studio Cloud
Status: STRONG DIRECTION, PARTIAL COMPLETION

What is aligned:
- contextual entry triage exists,
- preview-first presets now change by lane,
- the Studio shell is becoming less generic,
- AI, Git, and preview are more connected.

What still needs tightening:
- the viewport still needs more authority,
- operator behavior still needs to feel less accessory-like,
- review surfaces need to feel even more inevitable than the rails.

### 4. Studio Local
Status: BLUEPRINT-ONLY

What is aligned:
- the product thesis is correct,
- local is correctly defined as a depth unlock, not a fork.

What still needs tightening:
- implementation contract is still mostly conceptual,
- local-specific affordances need real product sequencing later.

### 5. Operator Surface
Status: OPEN DIRECTION, PARTIAL FOUNDATIONS

What is aligned:
- the browser/operator lane is part of the intended system,
- audits and arsenal correctly treat it as a first-class need.

What still needs tightening:
- operator must become a more visible, governed surface,
- approvals, action ledger, and takeover grammar still need stronger product inevitability.

### 6. Preview / Review / Artifact Truth
Status: STRONG DIRECTION, PARTIAL COMPLETION

What is aligned:
- proposal preview exists,
- trust/readiness grammar exists,
- compact trust chrome is improving,
- the artifact is increasingly the review stage.

What still needs tightening:
- viewport dominance,
- less rail text,
- stronger live vs proposal authority,
- tighter operator and runtime handoff inside the same visual stage.

### 7. AI / Evidence / Economics
Status: STRONG DIRECTION, PARTIAL COMPLETION

What is aligned:
- evidence, economics, and execution grammar are in the product,
- AI is no longer just a generic transcript surface.

What still needs tightening:
- the AI layer must keep compressing into operational rails,
- evidence and approvals still need even tighter artifact linkage.

### 8. Buyer / Trust / Docs
Status: PARTIAL BUT REAL

What is aligned:
- trust, compare, customers, roadmap, and procurement surfaces exist,
- the buyer path is no longer missing.

What still needs tightening:
- proof depth,
- case-study quality,
- public docs/search continuity,
- and cleaner linkage from entry into trust and procurement.

### 9. Platform Confidence
Status: STILL OPEN

What is aligned:
- lint, typecheck, enterprise gate, and canonical doc alignment are healthy,
- shell quality is materially higher,
- major fake-success patterns have been removed.

What still needs tightening:
- build confidence remains a product-level trust issue,
- compile freshness is not the same as full prerender parity,
- the platform must keep earning confidence, not borrowing it from UX.

## 2026-05-01 Project Brain Update
Studio Home now includes a compact Project Brain readout that summarizes mission, domain, runtime, AI setup, review approvals, budget, and next action. This aligns the dashboard with the benchmark pattern from Firebase/Replit/Manus/Cursor without adding another dashboard family.

## 2026-05-02 Continuity And Runtime Typing Update
Project Brain now shows compact continuity rails for checkpoint, evidence, and permission state. This keeps the first screen simple while making long-running agent work safer and closer to Replit-style checkpoint discipline plus Manus-style permission clarity.

The level serialization and VS Code language API boundaries were typed to remove their direct `: any` contribution. The app-code `: any` metric moved from `1135` to `1011`; this is still a gap, but it is now moving in the right direction without fake strictness.

Mission Ledger now appears in Studio Home as a compact state/evidence/checklist surface. This is not durable mission storage yet, but it gives users and agents a visible contract before deeper work starts. The VS Code workspace API boundary was also typed, moving app-code `: any` from `1011` to `984`.

The VS Code window API boundary was typed next, removing another direct IDE/runtime weak-type seam. App-code `: any` moved from `984` to `963`; this is still not strict enough for a 10/10 agentic IDE, but the debt is shrinking without masking remaining hotspots.

The extension host runtime, local Yjs declaration boundary, build/export worker, chat surface, unified SDK, and AI tools registry were tightened next. The measured app-code `: any` ratchet moved from `963` to `732`; the remaining gap is still large, but the highest-risk agent/IDE seams now have explicit contracts instead of broad `any`.

The debug adapter protocol, language server protocol API, LSP server base, C++/Rust LSP mocks, AI debug payloads, and debug integration boundary were typed next. The measured app-code `: any` ratchet moved from `732` to `661`; this directly strengthens the IDE layer that agents use for debugging, completions, hover, definitions, code actions, and local/cloud tool continuity.

The remaining LSP language servers, legacy DAP adapter base, Node/Python/Java/Go debug adapters, SWR resilience helpers, and API integration facade were tightened next. The measured app-code `: any` ratchet moved from `661` to `505`; the product is still not ready for `noImplicitAny`, but the editor/debug/runtime substrate now has far fewer weak seams for long-running agents.

The AI chat/complete route contracts, editor integration bridge, extension runtime/loader, gateway hook, WebSocket server, queue runtime, debug adapter, and autonomous agent mode were tightened next. The measured app-code `: any` ratchet moved from `505` to `390`; this directly reduces the weak seams around mission chat, tool execution, local/cloud gateway continuity, websocket collaboration, jobs, debug control, and long-running personal agents.

Device runtime triage was added next so Studio Home can adapt work to the user's actual machine instead of blindly running every agent, viewport, browser, memory, and AI job locally. The first guard classifies WebNN/WebGPU/CPU/RAM/storage/network signals into accelerated-local, hybrid, cloud-isolated, or safe-mode policies.

Runtime lane scheduling was added on top of the device guard. AI agents, browser operator, viewport/render, build/export, memory indexing, and file sync now have explicit budgets, placements, confirmation needs, and pause-on-user-input rules so future execution can route heavy work without freezing the UI.

The scheduler is no longer only descriptive. The creation workbench now blocks new AI media jobs when the `ai-agents` lane is saturated, and deploy surfaces now obey the `build-export` lane so users do not unknowingly queue overlapping publishes from multiple entry points.

Preview runtime automation now also obeys the same governor. Runtime discovery/provision flows are held when the `browser-operator` lane is blocked or requires manual confirmation on the current device profile, while runtime sync now respects the `file-sync` lane. The toolbar surfaces the hold state and placement hints directly inside the preview stage so users see policy, not silent failure.

Agent mode now reflects the same runtime grammar. The panel exposes `ai-agents` and `browser-operator` placement directly in the shell, blocks fresh runs when the agent lane is saturated, and prevents approval of web-search/fetch steps when the browser-operator lane is held. That keeps autonomous internet work aligned with device policy instead of turning approval UX into a fake green light.

The browser-operator guard now also lives in the real tool execution path instead of only the approval chrome. Local and server `AutonomousAgent` flows auto-register the web tools registry, pass a runtime payload into `web_search`, `fetch_url`, `search_docs`, and `web_scrape`, and return explicit runtime block codes when the device policy says those steps must wait or require confirmation.

The runtime profile is now no longer browser-only. A local-native bridge can publish a capability probe from Studio Local into the web shell, and the scheduler, Project Brain, Device Guard, Agent Mode, and runtime boot policy all consume the merged profile. That gives Aethel a real path to recognize native NPU/GPU capacity, stale probes, and thermal pressure before deciding where agent work should run.

That bridge now also has an authenticated cloud handoff. Fresh native capability probes sync into a per-user runtime snapshot route/store, and the web shell can rehydrate from that trusted snapshot after reload instead of pretending the browser alone always knows the machine. This closes an important continuity gap between Studio Home in the web and Studio Local on the device.

Runtime routing now has a canonical decision layer as well. Lane policy plus the local bridge snapshot resolves into an explicit execution target (`local-native`, `local-worker`, `local-main-safe`, `cloud-sandbox`, or `held`) before deploy hints and autonomous web-tool payloads use it. This keeps the product aligned around one runtime truth instead of letting each surface guess where work should run.

The jobs dispatcher now preserves that same runtime truth. `/api/jobs` sanitizes incoming execution routes, rejects `held` work before it enters BullMQ, stores the target on queue payloads and metadata, and returns `runtimeTarget` when listing jobs. The creation workbench also sends its AI-agent route into music, voice, and 3D generation calls, so device policy is no longer only visible chrome; it is becoming part of the end-to-end dispatch contract.

The database and TypeScript gates were tightened next. Prisma now has a versioned baseline migration folder (`20260502161641_init`), and `noImplicitAny` is enabled while keeping typecheck green. This closes two platform-confidence gaps from the V10 audit without pretending the remaining explicit `: any` debt is solved.

The next strictness sweep removed explicit `: any` from collaboration/Yjs presence, settings, dialogue/cutscene, S3, Pixel Streaming, Redis, marketplace ingestion, LSP runtime, system health parsing, sandbox output, advanced input, quest custom events, and world streaming seams. The measured app-code `: any` ratchet moved from `379` to `246`; the remaining hotspots are now smaller and more isolated instead of spread across core runtime foundations.

The follow-up strictness sweep removed explicit `: any` from AI-enhanced LSP, the 3D properties panel, infrastructure Prisma metrics, self-reflection context, legacy live preview input/joystick handling, the credit wallet ledger path, systems integration tests, render progress websocket messages, keybinding contexts, websocket payloads, LSP/DAP clients, E2B runtime sandbox boundaries, AI agent/stream/director routes, asset CRUD errors, chat clone/merge copy paths, copilot action/context routes, project invite-link delegates, engine/settings panels, web-search parsing, audio events, and git response parsing. The measured app-code `: any` ratchet moved from `246` to `134`; the remaining gap is still above the target of `50`, but the weak seams are now mostly small endpoint/library edges rather than broad IDE/runtime foundations.

The final strictness pass for this block typed the remaining high-volume app-code seams across admin pages, admin APIs, asset/download/presign flows, OAuth email parsing, backup/git error handling, chat/copilot/search/test routes, notification and terminal persistence, extension hooks, preview/runtime bridges, LSP/hot-reload/localization/collaboration providers, RAG/vector embeddings, storage adapters, telemetry, test adapters, and worker meshlet execution. The measured app-code `: any` ratchet moved from `134` to `13`, passing the current quality gate target of `<50` without disabling typecheck, lint, tests, or build.

The UX copy hygiene pass removed the measured Portuguese hardcoded action/status strings from component TSX surfaces. The `PT hardcoded UX strings in components` quality gate moved from `287` to `0`, so the active dashboard, IDE, billing, marketplace, security, multiplayer, loading, and error surfaces no longer carry the audited PT action/status debt. This does not replace full i18n work; it closes the current hardcoded-string gate while preserving the existing visual hierarchy and behavior.

The market UX benchmark and mojibake cleanup pass rewrote `cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md` as a clean Aethel-specific contract across web entry, Studio Home, IDE, desktop/local runtime, mobile companion, VS Code-style tooling, and Unreal/game/film mode. The mojibake scanner is now deterministic and failing, and `qa:product-quality-progress` tracks `mojibake corruption findings` as a zero-tolerance metric. The measured mojibake gate moved from `41` findings to `0`.

## 2026-05-03 Product Experience Cohesion Gate
The product now has an executable cohesion gate for the experience contract instead of relying only on prose review. `tools/check-product-experience-cohesion.mjs` verifies that Web Entry, Studio Home, the internal IDE, preview/review truth, browser-operator approvals, device runtime routing, and game/film mode depth stay wired to real files and documented anchors. This protects the Firebase/v0/Replit/Manus-style entry path while preserving VS Code-grade IDE depth and Unreal-style mode depth without forcing that complexity onto first-time users.

The route-level core loop was tightened next. `/api/workspace/create` no longer returns random simulated workspace success; it now either creates a real authenticated `Project` with mission settings or returns an explicit auth handoff URL that preserves the mission for Studio Home. `tools/check-core-experience-routes.mjs` verifies the route chain from Web Entry through Studio Home, IDE, preview runtime, jobs runtime target, Studio Local download, and Mobile Companion continuity.

The V12 telemetry critique is now converted into an executable product gate instead of another prose-only warning. `ProductTelemetry` is mounted at the root layout, captures route-level `page_load` context, and delegates CTA tracking through `data-analytics-*` attributes so the UI stays clean. Landing mission intake, pricing, auth OAuth starts, deploy click/success/failure, public header CTAs, and `/api/analytics/batch` logger usage are now covered by `tools/check-product-funnel-telemetry.mjs`.

## 2026-05-03 Commercial Access Gate
The V12 distribution critique is now also executable. A canonical `free` plan exists, registration creates a factual `trialEndsAt` for a 14-day Starter trial, expired trials fall back to Free instead of hard-blocking the core Studio loop, and billing usage normalizes trial/unknown plan state through canonical plan definitions. `tools/check-commercial-access-gate.mjs` keeps this from regressing into a prose-only pricing promise.

## 2026-05-03 Economics Transparency Gate
The V12 cost-visibility critique is now executable inside the AI loop. `AIChatCostMeter` renders a compact cost transparency rail in the chat with live run estimate, wallet, monthly budget pressure, active model, and a handoff into the deeper economics panel. `/api/auth/me` now exposes trial state and days remaining, while `/api/billing/portal` uses structured logging for customer portal self-service. `tools/check-economics-transparency-gate.mjs` keeps these surfaces factual without turning chat into a finance dashboard.

## 2026-05-03 AI Margin Governance Gate
The V12 operator-side margin critique is now executable in admin finance. `/api/admin/finance/metrics` returns `aiMarginSnapshot` with period revenue, period AI cost, gross margin after AI, AI cost ratio, average AI cost per call, projected monthly AI run-rate, top risk model, and `healthy/watch/risk` status. It also returns `aiMarginDrilldown` so admins can see the top users and workspaces by AI cost, revenue pressure, token volume, and attribution quality. `aiMarginRecommendations` translates those facts into next actions: budget guardrails, model-routing policy, user plan review, and ledger attribution repair. `AIMarginSnapshotPanel`, `AIMarginRecommendationsPanel`, and `AIMarginDrilldownPanel` render this compactly inside `/admin/finance`, and `tools/check-ai-margin-gate.mjs` prevents a future dashboard from showing revenue without AI margin.

## 2026-05-03 Email/auth transactional readiness
The V12 email-risk critique is now partially executable instead of remaining a warning. Registration stores a hashed verification token, starts the factual 14-day Starter trial, sends both `welcome` and `verify_email` templates, and returns `emailVerificationRequired` so the client can guide the next step. The email runtime auto-selects Resend when `RESEND_API_KEY` is present, fails explicitly when a real provider lacks a key, and keeps auth/email routes on structured logger instead of direct console calls. `tools/check-auth-email-gate.mjs` protects this path so signup, verification, password reset, and the generic email API do not silently drift back into mock-only production behavior.

## 2026-05-03 User trust audit log gate
The V12 trust/audit-log critique is now visible to the final user, not only to admins. `/api/me/audit-log` returns account-scoped audit events for actions performed by the user, admin/system events targeting that user, and target-email matches. The response redacts admin identity, masks IP addresses, and exposes only allowlisted metadata. `UserAuditLogPanel` renders this inside the Settings security tab as a compact account activity surface, and `tools/check-user-audit-log-gate.mjs` protects the endpoint/UI/test/docs contract from becoming a raw admin log dump.

## 2026-05-04 Public Trust Center Gate
The V12 buyer/trust critique is now also protected by a public route and an executable gate. `/trust` is the single due-diligence map for security, compliance, status, privacy, terms, responsible disclosure, and contact-sales handoff. It links into `/security`, `/security-policy`, `/compliance`, `/status`, `/privacy`, and `/terms` without adding more noise to the first-use Studio flow. `tools/check-public-trust-center-gate.mjs` prevents fake certification language, invented uptime, hardcoded colors, console usage, and footer/nav/sitemap drift. The page uses `SOC 2 preparation`, `responsible disclosure`, and `audit activity` language deliberately so the product can earn trust without overclaiming.

## 2026-05-04 Security Disclosure Safe Harbor Gate
The responsible-disclosure gap is now more than a footer link. `/security-policy` names `safe harbor`, good-faith coordinated testing, in-scope surfaces, out-of-scope destructive behavior, AI/agent-specific risk, and response targets that are explicitly not contractual SLA or formal bounty promises. `/security-policy`, `/security-acknowledgments`, and `/trust` now link as one public security-review journey. `tools/check-security-disclosure-gate.mjs` protects that contract so the product can accept vulnerability reports without inviting unsafe testing or fake bug-bounty maturity.

## 2026-05-04 Reliability Incident Response Gate
The V12 reliability/SLO/SLA critique is now protected by a public route and an executable gate. `/reliability` explains public status checks, incident response, Sev 1/Sev 2/Sev 3 grammar, response targets, and enterprise handoff while explicitly stating that no rolling uptime and public incident history are still open gaps. `tools/check-reliability-incident-gate.mjs` prevents fake uptime percentages, five-nines language, guaranteed uptime, hardcoded colors, console usage, and sitemap/footer/trust drift.

## 2026-05-04 AI Game/Film Production Contract
The game/film ambition now has an executable anti-drift contract instead of another broad aspiration. `docs/master/106_AI_GAME_FILM_PRODUCTION_CONTRACT_2026-05-04.md` defines the end-to-end spine agents need: Mission Brief, Creative Bible, Technical Bible, Asset Graph, Scene/World Graph, Gameplay Graph, Shot/Film Graph, Validation Graph, Evidence Graph, and Release Graph. `tools/check-ai-game-film-production-contract.mjs` protects the rule that we improve existing anchors, keep game/film depth mode-specific, require license/provenance, playtest/render evidence, human approval, and avoid Unreal parity or autonomous AAA claims without proof.

## 2026-05-04 Repository Cartography Update
The next limitation is now represented in code instead of staying as product prose: agents must understand giant repos, scenes, assets, timelines, and external packs before they edit. `cloud-web-app/web/lib/production/repository-cartography.ts` creates a typed manifest for GB-scale work with domain classification, source kind, context strategy, duplicate groups, license/provenance gaps, `mustReadFirst`, `doNotInvent`, `external-mirror`, and `agentHandoffs`.

This matters because the best-market Aethel experience cannot let AI invent missing lore, duplicate assets, ignore licensing, download huge Hugging Face or marketplace packs blindly, or claim game/film quality from partial context. Repository Cartography feeds the same Project Brain, Mission Ledger, and production graphs so the visible Studio can stay clean while the internal agent context becomes much more complete.

## Quality Gates Snapshot
As of this checkpoint:
- `npm run lint` is green,
- `tsc --noEmit` is green,
- `npm run qa:enterprise-gate` is green,
- `npm run qa:core-experience-routes` is green,
- `npm run qa:product-funnel-telemetry` is green,
- `npm run qa:commercial-access` is green,
- `npm run qa:economics-transparency` is green,
- `npm run qa:ai-margin-governance` is green,
- `npm run qa:auth-email` is green,
- `npm run qa:user-audit-log` is green,
- `npm run qa:public-trust-center` is green,
- `npm run qa:security-disclosure` is green,
- `npm run qa:reliability-incident` is green,
- `npm run qa:ai-game-film-production` is green,
- `npm run qa:canonical-doc-alignment` is green,
- the five public UX contracts for mission intake, Studio handoff, compare trust, pricing readiness, and local continuity pass in Chromium,
- `git diff --check` is green when the repo is validated cleanly.

Known factual residue:
- mojibake scan reports `0` findings and is tracked as a zero-tolerance gate,
- platform/build parity is still not a closed story,
- Studio Local is still blueprint-grade rather than product-ready.

## Persona Triage Without Gaps
This is the current product triage that should drive every top-level decision.

### 1. Leigo / Solo Builder
Needs:
- one mission box,
- one clear continuation path,
- very low anxiety,
- no dashboard overload.

Must experience:
- `Web Light -> Studio Home -> Expand Studio`

Must not experience:
- admin dashboard feelings,
- too many tabs,
- early professional-tool overload.

### 2. Developer / Operator
Needs:
- predictable Studio shell,
- files, Git, runtime, preview, and AI connected,
- fast shift from mission into deeper execution.

Must experience:
- `Studio Home -> Studio Cloud`

Must not experience:
- preview and chat frozen in weak 50/50,
- operator hidden as a secondary novelty.

### 3. Researcher
Needs:
- mission,
- evidence,
- outputs,
- structure,
- confidence.

Must experience:
- AI and evidence as one operational lane,
- not a generic chat transcript.

### 4. Game / Media Creator
Needs:
- stronger viewport or canvas authority,
- deeper artifact and review lanes,
- less text overhead.

Must experience:
- `Studio Home -> Studio Cloud` with the artifact already in charge.

Must not experience:
- app-builder defaults controlling 3D or media work.

### 5. Team Lead / Enterprise Champion
Needs:
- trust,
- approvals,
- governance,
- procurement clarity,
- cost awareness,
- evidence of seriousness.

Must experience:
- continuity from product shell to proof surfaces.

Must not experience:
- marketing detours,
- fake customer proof,
- or a product that looks powerful but operationally vague.

## Image Alignment Without Drift
The images are illustrative, not product truth by themselves.

### Firebase references
Use for:
- app-like entry,
- prompt-first mission intake,
- low-text clarity,
- light shell behavior.

Do not use for:
- shallow depth,
- weak review surfaces,
- or a product that becomes only a prompt box.

### `2 imagen ide aethel.png`
Use for:
- dense cockpit ambition,
- clear lane roles,
- professional tooling seriousness,
- connected execution surfaces.

Do not use for:
- overloading the initial experience,
- or turning every surface into one dense workstation from the first second.

### Vercel dashboard design-language reference
Use for:
- one design language,
- density discipline,
- card restraint,
- cleanliness under pressure.

Do not use for:
- generic metrics-first dashboard behavior.

### Unreal references in the arsenal
Use for:
- viewport authority,
- inspector seriousness,
- high-density creative production expectations.

Do not use for:
- default entry UX for general users.

## Non-Negotiable Current Rules
1. `Studio Home` is the canonical name for the initial logged-in control surface.
2. The initial shell already belongs to the Studio family.
3. Each screen must have one protagonist.
4. One primary action per surface.
5. Preview and chat cannot be equal-weight roommates by default.
6. Web Light simplicity must not erase later Studio depth.
7. Operator must eventually feel native to the Studio family.
8. Images can guide quality and hierarchy, but docs and real code remain the source of truth.

## What We Keep Instead Of Re-Inventing
These are the directions to improve, not replace:
- the `landing-v3` mission shell,
- the `Studio Home` transition model,
- dashboard entry triage,
- contextual Studio entry triage,
- preview trust and proposal review,
- buyer/trust/procurement surfaces,
- blueprint-driven shell unification.

## What Still Needs Work
This is the shortest honest list of important open gaps.

### Priority 1
- platform confidence,
- build/parity trust,
- keep mojibake at zero with the failing scanner,
- keep commercial access truthful with Free plus a 14-day trial gate.
- keep chat economics visible with a compact cost meter and billing portal truth.
- keep registration email/verification factual through the auth email gate.
- keep user-facing audit activity redacted, scoped, and visible in security settings.
- keep the public trust center factual, linked, and free of fake certification or SLO/SLA claims.
- keep responsible disclosure safe-harbor language explicit and non-destructive before inviting security researchers.
- keep reliability and incident response factual through `/reliability`, without fake uptime, five-nines language, or contractual SLA claims before evidence and contract.
- keep game/film creation grounded in Project Brain, Mission Ledger, asset/scene/gameplay/shot/validation/evidence graphs, not generic chat or extra top-level UI.

### Priority 2
- viewport dominance,
- operator inevitability,
- stronger review-first artifact behavior.

### Priority 3
- deeper buyer-proof and docs continuity,
- stronger Studio Local implementation path,
- more explicit domain-depth handoffs for games, media, and cloud.

## Canonical Future Rule
If future work conflicts with older UX language, use this order:
1. real repo state,
2. `90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md`,
3. `91_PRODUCT_QUALITY_EXECUTION_CHECKLIST_2026-04-30.md`,
4. `89_WEB_LIGHT_STUDIO_CLOUD_LOCAL_ARCHITECTURE_2026-04-29.md`,
5. `AETHEL_INTERFACE_BLUEPRINTS/`,
6. curated arsenal references,
7. older historical UX docs.

## Short Verdict
The product is now clearly moving toward the right category:
- one Studio system,
- one shell,
- one progressive depth model,
- one artifact-first thesis.

## 2026-05-04 Durable Agentic Production State Update
Project Brain and Mission Ledger are no longer only dashboard read models. `cloud-web-app/web/lib/production/agentic-production-state.ts` defines a durable v1 state stored in `Project.settings.aethelProductionState`.

The state includes Project Brain memory, Mission Ledger entries, Asset Graph, Scene/World Graph, Gameplay Graph, Shot/Film Graph, Validation Graph, Evidence Graph, Release Graph, and runtime policy for local/cloud/held placement.

`/api/projects/[id]/production-state` now reads and patches that state without adding another top-level product surface. Studio Home stays compact: it only surfaces graph coverage, durable checkpoint state, evidence refs, and the next safe action.

Remaining gap: this is the durable spine. The next wave must attach real asset import events, playtest/render evidence, Browser Operator replays, and Studio Local execution probes into this state automatically.

The biggest remaining risk is no longer product imagination.
It is disciplined closure:
- platform confidence,
- operator inevitability,
- and viewport-grade review authority.

## 2026-05-04 Best-In-Market Benchmark V14 Update
The reconciled benchmark now lives in `docs/master/107_AETHEL_BEST_IN_MARKET_BENCHMARK_2026-05-04.md`. It treats the external V13 audit as historical input and locks the current measured state before comparing Aethel against Cursor 3, Replit Agent 4, Figma MCP, Manus, Genspark, Unreal UE5, Adobe Firefly/Premiere, and Linear.

The new benchmark is intentionally realistic: copy experience patterns, not inflated technical claims. It names the key Aethel opportunity as a unified web-first production Studio with IDE depth, agent fleet, Project Brain, Mission Ledger, Repository Cartography, viewport/game/film depth, Browser Operator governance, and cloud/local runtime routing.

## 2026-05-04 Linear Best-In-Market Backlog Update
The V14 benchmark now has a machine-readable Linear backlog export at `docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_BACKLOG.linear.json` and a creation playbook at `docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_BACKLOG.md`.

Historical note: the first V14 backlog export was created before callable Linear tools were available in this Codex session. That limitation was superseded by the Linear Remote Creation Update below.

This keeps the next execution wave grounded: when Linear access is available, create the project `Aethel Best-In-Market 2026-2027`, create the labels, then create the ten canonical epics and their child issues from the JSON source without rewriting the plan.

## 2026-05-04 Linear Remote Creation Update
Linear access became available and the canonical V14 backlog was created in the `Aethel meu repo` Linear team.

Project URL: https://linear.app/aethel-meu-repo/project/aethel-best-in-market-2026-2027-640e25cb2dd1

Created:
- 8 missing labels, reusing `enterprise`, `mobile`, and `design-system`,
- 10 epic parent issues, `AET-49` through `AET-58`,
- 35 child issues, `AET-59` through `AET-93`,
- a sync report at `docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_SYNC_REPORT.md`,
- a creation report comment on `AET-49`.

Execution should start with `AET-61`, `AET-62`, `AET-63`, `AET-66`, and `AET-67` because they make the Repository Cartography, Agent Fleet, and Studio Home spine visible first.

## 2026-05-04 Studio Home Cartography Visibility Update
The first execution slice after Linear creation is now in code. Studio Home exposes Repository Cartography as a compact card instead of another heavy dashboard: users see context gates, graph coverage, evidence refs, risk state, agent lanes, guardrails, and the next handoff without opening a giant graph UI.

Implemented:
- `cloud-web-app/web/components/dashboard/dashboard-repository-cartography.ts` converts durable Project Brain/Mission Ledger/cartography state into a small dashboard snapshot.
- `cloud-web-app/web/components/dashboard/DashboardRepositoryCartographyCard.tsx` renders the snapshot as a low-noise context and Agent Fleet card.
- `cloud-web-app/web/components/dashboard/DashboardOverviewTab.tsx` connects the card after Project Brain and Mission Ledger, keeping mission, evidence, repository context, runtime, and preview in one clean starting flow.
- `cloud-web-app/web/lib/production/repository-cartography.ts` now classifies root folders such as `docs/` correctly; this prevents agents from treating root-level story/contract docs as unknown surfaces.
- `cloud-web-app/web/__tests__/dashboard/dashboard-repository-cartography.test.ts` and `cloud-web-app/web/__tests__/production/repository-cartography.test.ts` protect this behavior.

This advances `AET-61`, `AET-62`, `AET-63`, `AET-66`, and `AET-67`: Aethel is starting to show the internal anti-hallucination spine directly in the initial Studio experience, without adding clutter or pretending Unreal/Adobe parity exists today.

## 2026-05-04 Repository Cartography Scanner Update
Repository Cartography now has a metadata-safe workspace scanner and a scoped API route instead of only a hand-built manifest contract.

Implemented:
- `cloud-web-app/web/lib/production/repository-cartography-scanner.ts` walks a workspace with max-file, max-depth, ignore-dir, symlink, hash-size, MIME, size, mtime, and truncation safeguards.
- The scanner skips heavy build folders such as `node_modules`, `.git`, `.next`, `dist`, `build`, and cache folders.
- Small files can be hashed for duplicate detection; large files remain metadata-only so agents do not freeze the UI or pour GB payloads into chat context.
- `cloud-web-app/web/app/api/projects/[id]/production-state/cartography/route.ts` scans the scoped workspace, builds a Repository Cartography manifest, merges it into Project Brain/Mission Ledger/production graphs, and persists it to `Project.settings`.
- Studio Home now exposes a compact `Scan context` action on the Repository Cartography card, with progress/error/success copy that stays short.
- `cloud-web-app/web/__tests__/production/repository-cartography-scanner.test.ts` and `cloud-web-app/web/__tests__/api/production-state-cartography-route.test.ts` cover scanner behavior and the permissioned route.
- `cloud-web-app/web/__tests__/dashboard/DashboardRepositoryCartographyCard.test.tsx` protects the compact scan action from becoming a noisy dashboard surface.

This is still not full source mirror parity. Hugging Face/GitHub/S3/marketplace adapters are the next layer. The important product improvement is that Aethel now has a real path to see big local workspaces bit by bit through metadata and evidence before any agent edits.

## 2026-05-04 Agent Handoff Packet Update
Repository Cartography is now reusable after the scan instead of being only a response payload.

Implemented:
- `cloud-web-app/web/lib/production/repository-cartography.ts` persists the latest manifest under `aethelRepositoryCartographyManifest`.
- `cloud-web-app/web/app/api/projects/[id]/production-state/cartography/route.ts` now saves both the durable production state and the latest cartography manifest.
- `cloud-web-app/web/lib/production/agent-handoff-packet.ts` creates a factual packet for each agent with mission objective, latest ledger state, runtime policy, manifest id, must-read files, no-invention rules, indexing policy, owned surfaces, critical gaps, duplicate groups, graph evidence, acceptance checks, blockers, and next actions.
- `cloud-web-app/web/app/api/projects/[id]/production-state/agent-handoff/route.ts` exposes that packet to authenticated project users.
- Tests now cover manifest persistence, packet generation, safe fallback without a manifest, and the handoff API route.

This is an important best-market foundation: agents can resume long-running work from scoped evidence instead of rereading the whole repository or relying on chat memory. The next gap is enforcement: AI generation/apply routes must request or require these packets before editing large projects.

## 2026-05-04 AI Route Handoff Enforcement Update
The agent handoff packet is now consumed by core AI routes instead of only existing as a separate API.

Implemented:
- `cloud-web-app/web/lib/production/agent-handoff-context.ts` loads Project Brain, Mission Ledger, persisted Repository Cartography, and agent handoff packets for a project-scoped AI request.
- `/api/ai/chat`, `/api/ai/inline-edit`, and `/api/ai/complete` now inject compact handoff context into the system prompt when a `projectId` is present and the project is accessible.
- The context includes mission objective, latest ledger, runtime policy, must-read files, do-not-invent guardrails, owned surfaces, critical gaps, duplicate risk groups, acceptance evidence, and next actions.
- Agent inference now routes prompts toward Producer, Software Engineer, Gameplay Engineer, Cinematic Editor, Asset Librarian, QA, Release, or Performance context without adding a new visible interface.
- `/api/ai/chat` returns lightweight `agentHandoff` metadata so the UI can show when a response was grounded by a manifest.

This closes the first real enforcement gap: agents no longer depend only on chat memory when operating inside a known project. They receive scoped, factual, anti-duplication and anti-hallucination instructions before generating or editing.

Remaining gap: this is prompt enforcement, not a hard blocker yet. The next layer should require a fresh manifest for high-risk broad edits, add stale-manifest warnings after file changes, and attach the same packet to change-apply/background-agent routes.

## 2026-05-04 Parallel Agent Work Contract Update
Parallel AI work now has a product contract instead of relying on a loose "many agents in chat" pattern.

Implemented:
- `cloud-web-app/web/lib/production/parallel-agent-work-contract.ts` defines per-agent work lanes, toolbelts, scope locks, parallel safety rules, approval gates, research policy, Browser Operator policy, and required evidence.
- Agent Handoff Packets now include `workContract`, so every long-running agent knows whether it is orchestration, research, software, gameplay, creative, asset, validation, release, Browser Operator, or performance work.
- Scope defaults to `read-only` when Repository Cartography is missing and upgrades to `diff-only` only for owned surfaces when a manifest exists.
- Toolbelts now separate roles clearly: Gameplay gets playtest/viewport tools, Browser Operator gets replay/approval tools, Research gets source-citation and mirror tools, Release gets deployment evidence, and Performance gets runtime routing.
- AI prompt context now includes the work lane, allowed toolbelt, parallel safety rules, approval requirements, research policy, and Browser Operator policy.

Why this matters:
- Multiple agents can run in parallel without silently touching the same file, asset, scene, shot, cloud account, or deployment surface.
- Deep research and Browser Operator work become evidence lanes that feed implementation, not uncontrolled autonomous apply lanes.
- Large repositories and GB-scale creative projects are handled through manifests, summaries, hashes, thumbnails, metadata mirrors, and scoped ownership instead of dumping everything into context.

Remaining gap: this is a contract and prompt/scope layer. The next wave must enforce it at tool execution time: exclusive file locks, apply-time surface checks, Browser Operator replay storage, and hard blocks for unapproved cloud/account actions.

## 2026-05-04 Apply-Time Agent Scope Enforcement Update
The parallel work contract now protects the first critical write path.

Implemented:
- `cloud-web-app/web/lib/production/agent-scope-enforcement.ts` evaluates whether an apply request is allowed under the current Agent Handoff Packet and work contract.
- `/api/ai/change/apply` now requires Repository Cartography for broad multi-file applies and for explicit agent-scoped applies.
- Applies are blocked when the packet is blocked, when the agent is read-only, or when target paths are outside the agent's declared owned surfaces.
- Scope blocks are recorded in the Change Run Ledger before returning to the client.
- Focused tests cover legacy single-file fallback, missing-manifest broad-edit blocking, owned-surface success, outside-scope blocking, and the apply route pre-QA block.

This is the first server-side guard behind the prompt contract. It means Aethel no longer relies only on model obedience for broad edits: the apply route itself can refuse unsafe multi-file work before QA, write, deploy, or rollback paths run.

Remaining gap: extend the same enforcement to Browser Operator irreversible actions, long-running background agent runs, exclusive surface locks, and stale-manifest checks based on file modification time before allowing high-impact apply.

## 2026-05-04 Agent Tool Scope Enforcement Update
The scope contract now protects direct AI tool writes, not only the `/api/ai/change/apply` path.

Implemented:
- `cloud-web-app/web/lib/ai-tools-registry.ts` now checks explicit agent-scoped `create_file` and `edit_file` executions against the current Agent Handoff Packet before the tool writes to project files.
- Agent-scoped tool execution requires a project-scoped Repository Cartography manifest. Missing manifests return `AGENT_SCOPE_MANIFEST_REQUIRED` before file upsert.
- Tool writes are blocked when the packet is read-only, blocked, or outside declared owned surfaces, using the same `agent-scope-enforcement` helper as apply.
- `cloud-web-app/web/lib/ai-agent-system.ts` now forwards agent identity and optional scope enforcement into tool calls.
- `/api/ai/chat-advanced` and `AICommandCenter` opt project-scoped agent runs into that enforcement without adding new UI.
- `cloud-web-app/web/__tests__/production/ai-tools-agent-scope.test.ts` covers missing-manifest blocking, owned-surface success, and legacy unscoped single-tool compatibility.

Why this matters:
- Parallel agents now have a hard write guard on the tool layer, which is the path most likely to create duplicate files or edit the wrong game/film/app surface when a repo is large.
- The visible product can stay clean and mission-first while the internal agent runtime refuses unsafe writes before they become UI clutter, bad diffs, or false evidence.
- Legacy single-file tool use remains compatible unless the run explicitly opts into agent scope, so existing flows are not broken while we migrate toward fully scoped agent sessions.

Remaining gap: add exclusive file/surface locks per live agent session, stale manifest gates after file changes, and the same approval enforcement for Browser Operator account/cloud actions.

## 2026-05-04 Agent Fleet Coordinator UX Contract Update
Parallel agent work now has a coordinator model that matches how users expect senior-led teams to behave: one primary coordinator keeps the mission coherent while specialists work in bounded lanes.

Implemented:
- `cloud-web-app/web/lib/production/agent-fleet-session.ts` defines durable Agent Fleet preferences and a compact Agent Fleet snapshot.
- The snapshot includes central coordinator, fleet mode, paused state, composer mode, switcher hint, controls, member lanes, scope mode, owned-surface count, blockers, and next action.
- Users can keep `Producer Agent` as the default senior coordinator or promote a specialist such as `Gameplay Engineer Agent`, `Cinematic Editor Agent`, or `Software Engineer Agent` for focused work.
- `cloud-web-app/web/app/api/projects/[id]/production-state/agent-fleet/route.ts` exposes `GET` and `PATCH` for the compact fleet state without adding another heavy dashboard.
- Viewer collaborators cannot change fleet preferences; owners/editors can switch coordinator, pause/resume, and change mode.
- `cloud-web-app/web/__tests__/production/agent-fleet-session.test.ts` and `cloud-web-app/web/__tests__/api/production-state-agent-fleet-route.test.ts` cover coordinator-first planning, specialist-as-senior mode, permission checks, and persistence.

Why this matters:
- Cursor-style parallel agents become understandable: the user talks to one coordinator by default, delegates to specialists only when needed, and reviews evidence instead of juggling noisy independent chats.
- Manus/Genspark-style broad research stays an evidence lane; it does not silently become an apply lane.
- Game/film work can promote the right senior agent for the moment without losing Project Brain, Mission Ledger, Repository Cartography, or owned-surface scope.

Remaining gap: wire this snapshot into a compact UI switcher in chat/Agent Mode, add exclusive live locks under each member, and attach cost/output/review state to each agent session.

## 2026-05-04 Agent Fleet Compact Chat UX Update
The Agent Fleet coordinator is now visible where the user actually works: inside the AI command surface, as a compact control strip instead of a separate noisy dashboard.

Implemented:
- `cloud-web-app/web/components/ai/AgentFleetCoordinatorStrip.tsx` fetches the project Agent Fleet snapshot and renders coordinator, composer mode, pause/resume, lane status chips, blockers, and next action in a single compact strip.
- `cloud-web-app/web/components/ai/AICommandCenter.tsx` wires the strip into the command surface when a real `projectId` exists.
- The strip maps production-grade fleet roles to the closest existing command-center agent so users can promote a senior coordinator or specialist without learning a second chat model.
- The command center now executes suggestion clicks with the intended agent immediately instead of relying on async state updates.
- `cloud-web-app/web/__tests__/ai/AgentFleetCoordinatorStrip.test.tsx` covers compact rendering, coordinator promotion, project-context hiding, and production-role mapping.

Why this matters:
- Users can choose who leads the work, pause the fleet, and switch between coordinator/specialist/review modes without leaving the mission flow.
- Cursor-style parallel agents become understandable for non-experts: one senior coordinator remains the default, specialists are only promoted for scoped work, and blockers stay visible as compact evidence.
- The UI stays aligned with Firebase/Gemini/Manus cleanliness: short controls, small status chips, and no giant agent dashboard by default.

Remaining gap: persist live session output/cost/review state per fleet member, add exclusive live locks for each owned surface, and add e2e coverage for `choose coordinator -> delegate specialist -> review evidence -> approve`.

## 2026-05-04 Agent Surface Locks + Stale Manifest Enforcement Update
Parallel agent work now has two additional hard safety rails for large repos, game worlds, film timelines, and app monorepos.

Implemented:
- `cloud-web-app/web/lib/production/agent-surface-locks.ts` adds runtime Agent Surface Locks with TTL, nested-path conflict detection, same-owner renewal, and explicit conflict metadata.
- `cloud-web-app/web/lib/production/agent-handoff-packet.ts` now carries `manifestGeneratedAt` and surface `lastModified` so scoped agents can detect stale Repository Cartography.
- `cloud-web-app/web/lib/production/agent-scope-enforcement.ts` now blocks stale target paths with `AGENT_SCOPE_STALE_MANIFEST` before apply/tool writes.
- `/api/ai/change/apply` now passes target mtimes into scope evaluation and acquires surface locks for agent-scoped/broad applies before writing.
- `cloud-web-app/web/lib/ai-tools-registry.ts` now checks file `updatedAt`, blocks stale scoped tool writes, and acquires surface locks for agent-scoped `create_file` / `edit_file` before DB mutation.
- Added `cloud-web-app/web/__tests__/production/agent-surface-locks.test.ts` and expanded scope/tool tests for stale manifests and lock conflicts.

Why this matters:
- Two parallel agents can no longer silently write the same file, scene folder, asset directory, or nested surface in the same runtime window.
- Agents cannot keep editing from an old Repository Cartography snapshot after a target file changed.
- Large game/film/app projects move closer to senior-team workflow: map context, own surfaces, lock active work, write only with fresh evidence, then review/approve.

Remaining gap: persist locks in Redis/DB for multi-instance deployments, expose stale/locked state in the compact Agent Fleet strip, and add e2e coverage for `agent A locks surface -> agent B blocked -> rescan -> approval`.

## 2026-05-04 Agent Fleet Lock/Stale Visibility Update
The compact Agent Fleet UI now reflects the backend safety rails without adding a new dashboard.

Implemented:
- `cloud-web-app/web/lib/production/agent-surface-locks.ts` now exposes active runtime locks for project-scoped fleet snapshots.
- `cloud-web-app/web/lib/production/agent-fleet-session.ts` adds `activeLockCount`, `lockedSurfacePreview`, `staleSurfaceCount`, and `staleSurfacePreview` to each fleet member, plus aggregate lock/stale counts on the snapshot.
- `GET/PATCH /api/projects/[id]/production-state/agent-fleet` includes active lock signals from the current runtime instance.
- `cloud-web-app/web/components/ai/AgentFleetCoordinatorStrip.tsx` shows compact `locks` and `rescan needed` badges, plus tiny per-agent `L`/`S` chips for locked/stale lanes.
- Focused tests cover snapshot lock/stale summaries, route lock signals, and compact UI badges.

Why this matters:
- Users can see when a parallel agent is actively holding a surface or when Repository Cartography must be refreshed before more work.
- The UX stays clean: one slim fleet strip with badges instead of a dense project-management dashboard.
- This closes the loop between backend protection and user trust: blocked agents are not mysterious; they are explained as lock/rescan state.

Remaining gap: persist locks across multi-instance deployments and add e2e coverage for lock conflict resolution from the UI.

## 2026-05-04 Repository Context Budget Update
Repository Cartography now includes an explicit Context Budget so agents can work on GB-scale repos, game projects, film timelines, and external asset/model sources without dumping everything into chat context.

Implemented:
- `cloud-web-app/web/lib/production/repository-cartography.ts` adds `contextBudget` with bytes by retrieval strategy, estimated chunk count, largest context risks, retrieval batches, and guardrails.
- Retrieval batches separate canonical direct reads, medium-text summaries, heavy-surface indexes, external metadata mirrors, and manual/license review queues.
- `cloud-web-app/web/lib/production/agent-handoff-packet.ts` carries the Context Budget into every agent handoff packet.
- `cloud-web-app/web/lib/production/agent-handoff-context.ts` injects compact budget, retrieval batches, and context-risk surfaces into AI system context before agents act.
- `cloud-web-app/web/lib/production/parallel-agent-work-contract.ts` adds `context-budget` as a first-class tool and requires agents to follow budget batches before requesting extra files, downloads, or previews.
- Focused tests cover cartography budget generation, handoff packet propagation, AI context injection, and work-contract rules.

Why this matters:
- Agents now have an explicit anti-overload plan: read canonical contracts first, summarize medium surfaces, index heavy/binary surfaces, mirror Hugging Face/GitHub/S3 metadata before GB downloads, and hold unapproved media for review.
- This directly reduces hallucination, duplicate creation, repo confusion, and UI freezes in huge app/game/film projects.
- The visible UX can remain clean while the internal runtime behaves more like a senior technical producer: choose the right context slice before doing work.

Remaining gap: persist retrieval batch execution state, add source-specific mirrors for Hugging Face/GitHub/S3, and connect batch progress to the compact Agent Fleet/Repository Cartography UI.

## 2026-05-04 Repository Context Budget UI Update
The Studio Home cartography card now shows how agents will read large projects before they work.

Implemented:
- `cloud-web-app/web/components/dashboard/dashboard-repository-cartography.ts` now derives a compact `contextBudget` snapshot from the persisted Repository Cartography manifest.
- `cloud-web-app/web/components/dashboard/DashboardRepositoryCartographyCard.tsx` renders a small `Reading plan` row with Read, Summarize, Index/Mirror, and Review chips.
- `cloud-web-app/web/components/dashboard/DashboardOverviewTab.tsx` passes the persisted manifest into the snapshot builder so the UI reflects the same budget agents receive in handoff packets.
- Dashboard tests now cover the compact reading-plan UI and manifest-backed budget summary.

Why this matters:
- Users can see, in one row, whether the system will read, summarize, index/mirror, or hold surfaces for review before the AI touches a repo/game/film project.
- This keeps the Firebase-style Studio Home clean while exposing the safety model that prevents agents from getting lost in GB-scale projects.

Remaining gap: make each batch chip open its exact surfaces and execution state once retrieval batch persistence exists.

## 2026-05-04 Repository Context Budget Execution State Update
Repository Context Budget is now operational, not just descriptive.

Implemented:
- `cloud-web-app/web/lib/production/repository-context-budget-execution.ts` adds durable execution state for each retrieval batch with status, progress, evidence refs, blockers, manifest identity, and reset/preserve behavior.
- `POST /api/projects/[id]/production-state/cartography` now persists a fresh Context Budget execution state whenever Repository Cartography is scanned.
- `GET/PATCH /api/projects/[id]/production-state/context-budget` exposes permissioned batch execution state so agents and UI can mark Read/Summarize/Index/Mirror/Review work as pending, running, complete, or blocked.
- `GET /api/projects/[id]/production-state/agent-handoff` now returns the persisted Context Budget execution state alongside the handoff packet.
- AI handoff context now includes `Context budget execution` so agents know which retrieval work has actually happened before they act.
- Studio Home uses persisted execution state when available, showing compact progress such as `1/4 batches done` and per-batch progress chips.

Why this matters:
- Agents can no longer treat a plan as completed evidence. Each context retrieval lane has explicit status and evidence.
- Long game/film/app projects gain memory of what was read, summarized, indexed, mirrored, or blocked, reducing duplicate research, repeated downloads, hallucinated context, and UI freezes.
- This is the practical bridge from “repo cartography exists” to “parallel agents can work like a coordinated senior team.”

Remaining gap: execute real source-specific retrieval workers for Hugging Face/GitHub/S3/marketplace, then attach generated summaries, thumbnails, manifests, and citations to these batches.

## 2026-05-04 Viewport Gizmo Operation Contract Update
The viewport gizmo is now treated as an auditable production operation, not only a visual transform handle. `cloud-web-app/web/lib/viewport/gizmo-transform-operation.ts` defines the v1 transform contract with before/after snapshots, deltas, source (`user` or `agent`), snap profile, evidence refs, validation blockers/warnings, and exact rollback targets.

`cloud-web-app/web/components/viewport/AethelViewport3D.tsx` now emits this contract for both direct user gizmo drags and AI text-to-action transforms. This matters for game/film quality because agents can no longer silently move, rotate, or scale scene objects without a reason, validation state, evidence hook, and rollback path. The next step is to attach these operations to Mission Ledger/Evidence Graph with viewport screenshots and optional approval gates for risky transforms.

## 2026-05-04 Viewport Gizmo Persistence Update
Gizmo operations now have a persistence path into the durable production state. `cloud-web-app/web/lib/production/gizmo-production-state.ts` merges a gizmo operation into Mission Ledger, Scene/World Graph, Evidence Graph, and Validation Graph. Safe user transforms can complete, agent transforms move to review, and unsafe transforms become blocked with their validation blockers preserved.

`POST /api/projects/[id]/production-state/gizmo-transform` now accepts the same operation contract emitted by the viewport, validates/coerces it, enforces project write access, and stores the resulting production state in `Project.settings.aethelProductionState`. This closes a key game/film gap: viewport edits can now become durable, reviewable, rollbackable production memory instead of disposable UI state.

## 2026-05-04 Viewport Gizmo Auto-Persistence Update
The 3D preview shell now has a client persistence bridge for gizmo operations. `cloud-web-app/web/lib/viewport/gizmo-transform-persistence.ts` builds the authenticated request, injects compact viewport evidence refs, and refuses to fake persistence for `local-project` / non-persisted contexts. `cloud-web-app/web/hooks/useGizmoTransformPersistence.ts` exposes that behavior to the client without adding another visible panel.

`CanonicalPreviewSurface -> SceneViewportSurface -> SceneViewportStage -> AethelViewport3D` now carries an optional `projectId`, and `WorkbenchPreviewPane` passes the real workbench project id into the scene viewport. This means real IDE viewport transforms can flow from gizmo action to Mission Ledger/production graphs through the persistence route while local/dashboard-only previews remain safe and silent instead of claiming durable memory they do not have.

## 2026-05-04 Viewport Gizmo Review Chip Update
The 3D viewport now exposes a compact gizmo memory chip instead of a new dashboard panel. `cloud-web-app/web/lib/viewport/gizmo-transform-persistence.ts` maps persistence status into a small chip model (`saving`, `saved`, `local-only`, `error`) and `cloud-web-app/web/components/viewport/AethelViewport3D.tsx` renders it near the transform toolbar only when there is something useful to say.

This keeps the Firebase/Gemini-style low-noise surface while still giving professional feedback: users can tell whether a transform was written to Mission Ledger, skipped because the preview is local-only, or failed because the project route rejected it.

## 2026-05-04 Viewport Gizmo Review Packets Update
Gizmo history can now be read back as compact review packets for agents and UI. `cloud-web-app/web/lib/production/gizmo-review-packets.ts` converts persisted gizmo Mission Ledger entries and their Scene/Evidence/Validation graph nodes into a small status packet: `ready`, `needs-approval`, `needs-evidence`, or `blocked`.

`GET /api/projects/[id]/production-state/gizmo-transform` now returns those packets, a summary, and the current production readiness without mutating project settings. `POST` also returns the latest packet after persistence. This closes the next practical loop for game/film work: agents can inspect recent viewport edits, see whether evidence is missing, know if approval is required, and avoid duplicating or forgetting scene transforms.

## 2026-05-05 Expensive AI Generation Guard Update
The expensive creative generation routes now have a plan-aware hard cap before provider execution. `cloud-web-app/web/lib/server/ai-expensive-generation-guard.ts` estimates media-generation cost for image, 3D, music, and voice jobs, requires a plan with the `creative` domain, consumes metered usage before the provider call, and returns compact quota headers for UI transparency.

The guarded routes are `cloud-web-app/web/app/api/ai/image/generate/route.ts`, `cloud-web-app/web/app/api/ai/3d/generate/route.ts`, `cloud-web-app/web/app/api/ai/music/generate/route.ts`, and `cloud-web-app/web/app/api/ai/voice/generate/route.ts`. This directly closes the audit risk where trial/free users could hit high-cost media providers with only IP rate limits. Free/basic users now receive an explicit upgrade response instead of burning provider cost.

## 2026-05-05 - Auth abuse prevention gate

- Status: implemented as a product-quality guard, not a visual promise.
- What changed: login and register now pass through server-side Cloudflare Turnstile verification when `CLOUDFLARE_TURNSTILE_SECRET_KEY` (or compatible secret env) is configured.
- Safety behavior: local/dev remains unblocked when no secret exists; `AETHEL_REQUIRE_TURNSTILE=true` fails closed if the secret is missing.
- Why it matters: this closes a P0 trial-farm/brute-force gap from the repo audit while keeping the Studio onboarding clean and low-friction.
- Validation: `qa:auth-abuse-prevention`, focused Turnstile tests, and the product quality progress gate.
- 2026-05-05 hardening pass: the gate now inventories every `cloud-web-app/web/app/api/auth/**/route.ts`, rejects direct `console.*` usage across auth, and protects the profile route from unsafe `any` casts while preserving typed `role` exposure.

## 2026-05-05 - Zero `any` and zero component hex debt

- Status: implemented and measured.
- What changed: app/components/hooks/lib explicit `: any` debt is now `0`, and component TSX hardcoded hex debt is now `0`.
- Why it matters: this removes two recurring audit gaps that made agent changes riskier in export queues, asset pipeline, hot reload, LSP config, support updates, secure upload, creative viewport color paths, and collaboration cursors.
- Product rule: color input values that require a browser `#RRGGBB` value are now generated at runtime instead of stored as component hex literals.

## 2026-05-05 - Studio Local Runtime Kernel

- Status: implemented as a first executable kernel contract, not a fake desktop claim.
- What changed: `apps/studio-local` now exists as the Tauri + Rust Studio Local shell, `packages/runtime-contracts` defines the shared local/cloud job/probe contract, and root desktop scripts no longer skip a missing app.
- Runtime truth: the first kernel exposes health, probe, jobs, job cancel, and cloud sync endpoints as Rust contract code; native OS probes are still the next block, not claimed as complete.
- Why it matters: this is the foundation for heavy game/film/app/agent work without freezing the web shell and without pretending the browser is Unreal.
- Validation: `qa:studio-local-runtime` and product quality progress gate.
