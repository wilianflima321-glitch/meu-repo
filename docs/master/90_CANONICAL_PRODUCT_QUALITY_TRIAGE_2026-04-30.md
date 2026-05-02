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

## Quality Gates Snapshot
As of this checkpoint:
- `npm run lint` is green,
- `tsc --noEmit` is green,
- `npm run qa:enterprise-gate` is green,
- `npm run qa:canonical-doc-alignment` is green,
- the five public UX contracts for mission intake, Studio handoff, compare trust, pricing readiness, and local continuity pass in Chromium,
- `git diff --check` is green when the repo is validated cleanly.

Known factual residue:
- mojibake scan still reports `41` findings,
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
4. Preview and chat cannot be equal-weight roommates by default.
5. Web Light simplicity must not erase later Studio depth.
6. Operator must eventually feel native to the Studio family.
7. Images can guide quality and hierarchy, but docs and real code remain the source of truth.

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
- remaining mojibake cleanup.

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

The biggest remaining risk is no longer product imagination.
It is disciplined closure:
- platform confidence,
- operator inevitability,
- and viewport-grade review authority.
