# Aethel Continuation Master Plan 2026

Status: active V28 continuation plan
Generated from: local repo scan, V25/V26/V27/V28 audits, and current QA gates
Product principle: one premium action, clear state, evidence near the action, details hidden until needed.

## Current Measured Baseline

| Area | Current | Market-Grade Target | Decision |
| --- | ---: | ---: | --- |
| App pages | 78 | <= 60 visible / legacy hidden | Continue route compression, not feature sprawl. |
| Admin pages | 24 physical | 6 visible areas | Keep redirects/drawer; do not expose 24 items in primary nav. |
| Studio pages | 8 physical | 5 visible groups | World, Character, FX, Film, Logic only. |
| Tests | 210 | 300+ | Add tests around runtime contracts before adding UI. |
| Stories | 30 | 120+ | Build visual confidence for premium surfaces. |
| Large files >800 LOC | 0 | 0 | Keep ratchet. New code must split by contract/adapters/views. |
| Direct heavy imports | high raw count | contained by route boundaries | Keep passing bundle gates; reduce raw imports in next rounds. |
| Product screenshots | partial | real authenticated evidence | Public hero must show real product, not logos or decorative art. |

## Non-Negotiable Product Rules

- Browser is preview and review. Heavy execution belongs to Studio Local or Cloud Render with cost, teardown, and capability evidence.
- No public copy may claim `AAA ready`, `Unreal-grade`, `final asset`, `signed installer`, `Pixel Streaming available`, or `research verified` without receipts.
- Public and authenticated first folds must avoid internal jargon: `readiness`, `cockpit`, `surface`, `capabilityStatus`, `Cloud held`, `Studio Local`.
- EN is the premium default. PT-BR must go through i18n, not hardcoded mixed copy.
- Aethel wins by execution + receipts + governance, not by showing more panels.

## P0: Safety And Platform Spine

### Supply Chain

- Keep `next@14.2.35+` stable while planning a separate Next 16 / React 19 migration branch.
- Do not run forced audit upgrades in the product branch; forced upgrades affect Next, Sentry, Storybook/Vite, Monaco, Jest JUnit, and auth.
- Finish non-breaking overrides first: AWS XML builder, `fast-xml-parser`, `fast-uri`, `flatted`, `ws`, `picomatch`, `brace-expansion`, `i18next-fs-backend`.
- Open a dedicated security migration for remaining audit items:
  - Next 16 App Router compatibility pass.
  - React 19 hydration and client boundary audit.
  - Sentry 10 migration.
  - Storybook 10 / Vite 7 validation.
  - Monaco / DOMPurify risk path.
  - NextAuth/Auth.js modernization path.

### Gates That Must Stay Green

- `npm run lint`
- `npm run typecheck`
- `npm run qa:v28-total-spine`
- `npm run qa:bundle-boundaries`
- `npm run qa:route-experience-spine`
- `npm run qa:preview-surface-canonical`
- `git diff --check`

## P1: Product Navigation Spine

### Canonical Surfaces

Aethel should feel like six products stitched by one spine, not dozens of route experiments:

| Surface | Purpose | Visible Entry |
| --- | --- | --- |
| Home | mission entry and proof | `/` |
| Workspace | active projects and runs | `/dashboard` |
| IDE | code, agents, terminal, preview | `/ide` |
| Canvas/Viewport | visual selection, annotation, 3D review | embedded canonical preview |
| Research | Manus-grade investigation with receipts | `/research` or workspace mode |
| Evidence | receipts, graph, timeline, blockers | `/evidence` |

### Route Compression Tasks

- Keep admin primary nav to 6 areas: people, money, ai, platform, trust, product.
- Keep studio primary nav to 5 groups: World, Character, FX, Film, Logic.
- Legacy routes stay searchable in drawers with redirects/anchors until analytics prove they are unused.
- Remove utility pages that only create volume unless they have a user action, compliance requirement, or receipt.

## P2: IDE And Agents Spine

### Target Experience

Aethel IDE should borrow the calm density of Cursor, the familiar muscle memory of VS Code, and the governed agent receipts that competitors do not expose well enough.

### Required Regions

- Editor: Monaco only inside IDE boundaries, never in public/dashboard/admin shells.
- Preview: one canonical preview authority for runtime app, device preview, canvas artifact, and 3D viewport.
- Agents/chat: one sidecar with mode, model, cost, tools, transcript, voice/live readiness, and handoff hidden behind compact controls.
- Terminal/problems/output: resilient region with local/remote capability state.
- Command palette: the primary way to access deep actions without permanent visual clutter.

### Next Tasks

- Reduce remaining duplicated chat/agent entry points into one sidecar contract.
- Add per-region error boundaries and skeletons where missing.
- Move advanced controls into command palette, context menu, or drawer.
- Add keyboard-first navigation parity: command palette, quick open, go to symbol, problems focus, preview focus, agent focus.
- Add receipts to every agent action: input, tool, cost, output, confidence, rollback path.

## P3: Preview And Viewport Spine

### Minimum Professional Viewport

The viewport cannot look like a demo. It needs a serious editor contract:

- Selection and hover feedback.
- Transform gizmo with W/E/R shortcuts.
- Outliner, inspector, timeline, and proposal overlay.
- Contextual drawer for AI prompt, asset intake, playtest, and export.
- Evidence next to action: capability, cost, perf, provenance, missing runtime.
- No always-open wall of tools.

### Runtime Boundaries

- Three/R3F/Drei must remain behind heavy async boundaries.
- Public, dashboard, admin, pricing, marketplace, auth, and docs route shells must not import heavy runtime directly.
- Scene/asset/viewport modules must export adapters and contracts before UI panels.

## P4: Games And Films Robustness

### Honest Positioning

Aethel should not promise Unreal-grade in the browser. It should offer a governed creative pipeline that can call Studio Local or Cloud Render when real runtime is required.

### Required Pipeline

- Asset quality ledger: provenance, license, prompt/source, version, owner, review state.
- PBR maps: albedo, normal, roughness, metallic, AO, displacement where supported.
- LODs and poly budgets by target platform.
- Rig, animation retargeting, collision, navmesh, physics metadata.
- Sequencer/timeline with shots, audio, camera, dialogue, and render notes.
- Playtest bot plus human approval gate.
- Perf trace and export job receipts.
- Final asset blocked until evidence is complete.

### Next Tasks

- Add tests around asset final evidence, playtest spine, scope orchestrator, export job contracts.
- Add one real demo path: import asset -> inspect quality -> place in viewport -> run playtest -> produce evidence packet.
- Keep missing native/cloud runtime as `held`, not hidden and not marketed as available.

## P5: Research / Manus-Grade Spine

### Required Workspace

- Plan with steps and estimated cost.
- Browser replay with page receipts, timestamps, screenshots, and source metadata.
- Sources table with confidence and contradiction handling.
- Artifacts: brief, table, code, slide, image, or export.
- Stop/takeover controls.
- Final answer only after receipts exist.

### Next Tasks

- Add a research run object that links plan, browser events, evidence receipts, artifacts, and final answer.
- Prevent `research verified` copy unless source receipts pass the gate.
- Add replay UI with compact summary first and full logs in disclosure.

## P6: Desktop / Studio Local Spine

### Required Native Capabilities

- Signed installer path and updater path separated from web preview.
- Native filesystem, terminal, git, local model/runtime, FFmpeg, and render worker capabilities.
- WGPU/native viewport only when capability exists.
- Crash telemetry and update rollback.

### Next Tasks

- Add Tauri updater evidence endpoint and release draft validation without claiming signed installers.
- Add native capability registry: available, held, blocked, provider_unavailable, human_review_required.
- Add CI coverage for Tauri build evidence; signing remains held until certs/secrets exist.

## P7: UX Copy And Visual Cleanliness

### Cleanup Targets

- Auth, compare, docs/help, contact sales, pricing, marketplace, download, evidence, IDE copilot, and viewport first folds.
- Replace long explanatory text with: one headline, one primary action, one evidence chip, one disclosure.
- Hide technical copy in details/drawers/logs.
- Replace decorative gradients/glow/premium variants with consistent typography, spacing, and real screenshots.

### Quality Bar

- Every critical screen has one obvious primary action within 5 seconds.
- No card wall in first fold.
- No mixed PT/EN on premium surfaces.
- No more pages that exist only to make the product look larger.

## Next Execution Order

1. Finish non-breaking supply chain hardening and prove typecheck/lint/gates.
2. Run a route/component utility audit and mark delete/merge/keep for low-utility pages.
3. Compress authenticated dashboard and studio/admin visible nav further without deleting compatibility paths.
4. Harden IDE sidecar and canonical preview contract.
5. Build one games/films proof path with asset ledger and playtest evidence.
6. Build research replay receipts and final answer gating.
7. Increase tests to 300 and stories to 120 for the core primitives and premium surfaces.
8. Plan Next 16 / React 19 in a dedicated migration branch.
