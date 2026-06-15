# BACKLOG MASTER — Aethel Engine: V34 The Dominance Wave

> **Generated:** 2026-07-15 (updated with V34 Market Dominance strategy)  
> **Repo:** `wilianflima321-glitch/meu-repo` · `main` · HEAD `17e3a89`  
> **Product:** `cloud-web-app/web/` (Next.js 15, aethel-portal v0.2.0)  
> **Purpose:** Single checklist for Claude + Gemini on any platform

---

## 00 · V34 THE DOMINANCE WAVE

Aethel is no longer just stabilizing. We are competing with the absolute best in the market. The execution standard is now:

1. **The Cursor Standard (Performance & AI):** Ultra-low latency code generation, deep workspace indexing, multi-file editing, and imperceptible `diffReviewCenter` diffing.
2. **The Unreal Standard (Performance Visual & Engine):** Flawless WebGPU framerates in `CreativeWorkbenchShell`. A Rust Kernel (Tauri) that handles heavy processing outside the browser. Node-based visual scripting (Quest/Logic) parity.
3. **The Adobe Standard (UX/Aesthetics):** Premium glassmorphism, native Dark Mode, precise contrasts, and micro-animations. No UI flickers, non-destructive editing history.

Every feature built from here out must meet one of these three bars.

---

## 0 · EXECUTIVE SUMMARY

| Metric | Value |
|---|---|
| `.ts` files | 2,269 |
| `.tsx` files | 916 |
| `.md` files | 336 |
| `.mjs` files | 265 |
| `.rs` files | 12 |
| Prisma models | 51 |
| API routes | 379 |
| Pages | 58 |
| Components | 470 |
| Lib files | 1,363 |
| npm scripts | 246 |
| Prod deps | 73 |
| Tests | 246 |
| **Forensic score** | See §10 (40 gaps) |

> [!CAUTION]
> **IMMEDIATE ACTION before anything else:**
> ```bash
> cd meu-repo/cloud-web-app/web
> npm run typecheck
> npm run qa:internal-spine
> npm run qa:evidence-ledger-coverage
> npm run qa:phase-a-store-coverage
> ```
> Then commit + push the ~57 uncommitted files.

---

## 1 · ROOT — Top-level Folders (what each one actually is)

```
meu-repo/
│
├── 📂 cloud-web-app/         ◀── ⭐ ACTIVE PRODUCT (3290 code files, ~70% of weight)
├── 📂 apps/                  ◀── ⭐ Desktop Tauri (studio-local)
├── 📂 packages/              ◀── ⭐ Internal monorepo (5 SDK packages)
│
├── 📂 src/                   ◀── ⚠️ LEGACY CLI/engine (72 code files; NOT the product)
├── 📂 client/                ◀── ⚠️ 4 code files; probable residue
├── 📂 components/            ◀── ⚠️ 2 code files; top-level residue
├── 📂 lib/                   ◀── ⚠️ 2 code files; top-level residue
├── 📂 tests/                 ◀── ⚠️ 14 code files; separate from web __tests__/
├── 📂 tools/                 ◀── infra QA (77 code files, CI scripts + llm-mock + pr_api)
├── 📂 docs/                  ◀── 336 .md total (gaps/master/samples/tutorials)
├── 📂 runtime-templates/     ◀── Electron templates per OS (linux/macos/windows)
├── 📂 infra/                 ◀── 0 code files; only k8s + monitoring scripts
├── 📂 infra-playwright-ci-agent/ ◀── Dedicated Playwright CI agent
├── 📂 installers/            ◀── linux/ + windows/ shell scripts
├── 📂 AETHEL_INTERFACE_BLUEPRINTS/ ◀── 20 design docs
├── 📂 public/, nginx/, scripts/, shared/, diagnostics/, metrics/, cloud-admin-ia/
│                              ◀── ⚠️ all empty or infra-only
│
└── 📄 Root files (critical):
    ├─ README.md, CONTRIBUTING.md, SECURITY.md
    ├─ MANIFESTO_DESIGN_L5_2026-03-20.md         (10,169 bytes)
    ├─ MANIFESTO_OPERACIONAL_2026-03-20.md       (9,357 bytes)
    ├─ API_DOCUMENTATION_2026-03-20.md           (12,912 bytes)
    ├─ CHANGELOG_ELITE_2026-03-20.md             (10,149 bytes)
    ├─ EXECUTION_LOG.txt
    ├─ .aethel/change-ledger
    ├─ .aethelrules, .cursorrules
    ├─ package.json + package-lock.json
    ├─ docker-compose.yml + docker-compose.prod.yml
    ├─ eslint.config.cjs, tsconfig.json, railway.json
    ├─ playwright.config.ts + playwright.legacy.config.js
    │   + playwright.merge.config.ts              (3 Playwright configs — drift)
    │
    ├─ 🚨 DANGEROUS LEGACY AT ROOT (needs archive):
    │  ├─ server.js                              (23,785 bytes)
    │  ├─ verifier.js + verifier_performance.test.js
    │  ├─ physics.js + 2 physics tests
    │  ├─ proxy-shim.js                          (1,774 bytes)
    │  ├─ workbench-preview.html                 (21,648 bytes)
    │  ├─ accessibility.spec.ts                  (16,659 bytes — test at root!)
    │  ├─ executor.spec.ts, integration-test.spec.ts,
    │  │   soft-warn*.spec.ts, visual-regression.spec.ts
    │  └─ visual-regression.spec.ts-snapshots/
```

### Structural Gap #1 — Root cleanup (✅ COMPLETED)
Root folders `cloud-admin-ia, diagnostics, metrics, shared, infra, components, lib` removed.
Legacy CLI and scripts archived to `packages/aethel-cli-legacy/`.
Test specs consolidated in `tests/e2e/legacy/`.

---

## 2 · cloud-web-app/web/ — THE PRODUCT (complete structure)

### 2.1 App Router (`app/`)

```
app/
├── (auth)/                      route group — login, register
├── admin/                       6 canonical operator areas
│   ├── ai/        page          ← AI ops panel
│   ├── feature-flags/           ← flag management
│   ├── finance/   page+_components/
│   ├── monitoring/page+_components/
│   ├── security/  page
│   ├── users/     page
│   └── + 18 sub-folders WITHOUT page.tsx yet
│     ⚠️ Gap: 18 registered sub-folders, only 6 pages
│
├── api/                         379 route.ts files
│   ├── admin/ (~95 routes)
│   ├── ai/ (22 routes)          chat, complete, agent, 3d, video, music, voice, director
│   ├── agents/ (3 routes)       browser-operator, stream, workforce
│   ├── auth/ (14 routes)        2fa, oauth, magic-link, saml, scim, webauthn
│   ├── billing/ (10 routes)     full Stripe
│   ├── files/ (10 routes)       real fs API (read/write/list/move/copy/rename/raw/tree)
│   ├── git/ (8 routes)          add/branch/checkout/commit/pull/push/status
│   ├── terminal/ (8 routes)     create/execute/close/kill/input/resize/sandbox
│   ├── preview/ (6 routes)      runtime-{discover,health,provision,readiness,sync,sync-file}
│   ├── runtime/ (4 routes)      best-market-internal-spine, local-capabilities,
│   │                            toolchain-readiness, viewport
│   ├── marketplace/ (8 routes)
│   ├── health/ (10 routes)      ai, billing, cache, db, live, metrics, ready,
│   │                            startup, storage, stripe
│   ├── lsp/ (3 routes)          notification, request, catch-all
│   ├── dap/ (4 routes)
│   ├── mcp/ (1 route)           🔴 Gap: only 1 — no MCP-server registry
│   ├── workspace/ (4 routes)
│   ├── render/ (1 route)        🔴 Gap: no job/[id], cancel, logs
│   ├── jobs/ (4 routes)
│   ├── copilot/ (3), chat/ (2), collaboration/ (1), multiplayer/ (3)
│   ├── research/ (2)            🔴 Gap: no real engine
│   ├── exports/ (1)             🔴 Gap: only metrics! No GLB/MP4/USDZ/WAV
│   └── + utility (analytics, telemetry, security, observability)
│
├── studio/                      Creative hub (6 sub-routes)
│   ├── page.tsx                 hub home (uses CreativeStudioShell — LEGACY)
│   ├── CreativeStudioShell.tsx  ⚠️ legacy shell, still at /studio entrypoint
│   ├── StudioGroupedEditorClient.tsx  243 LOC — tool router
│   ├── StudioMissionControl.tsx + .View.tsx + .options.ts + .types.ts
│   ├── StudioGameScopeEvidencePanel.tsx
│   ├── StudioRunboard{Actions,Controls,Header}.tsx
│   ├── StudioRuntimeTruthPanel.tsx
│   ├── creative-studio-routes.ts
│   ├── animation/page          group="character" via StudioGroupedEditorClient ⚠️
│   ├── level/page              group="world" via StudioGroupedEditorClient ⚠️
│   ├── vfx/page                group="fx" via StudioGroupedEditorClient ⚠️
│   ├── film/page               via FilmStudioClient (own wrapper) ⚠️
│   ├── quest/page              CreativeWorkbenchShell direct ✅ CANONICAL PATTERN
│   └── cinematic/              via CloudStreamStudioClient ⚠️ parallel shell
│     ⚠️ Gap: 6 pages, 4 distinct wrapper patterns
│
├── billing/                     5 pages (page, cancel, checkout, invoices, success)
├── dashboard/                   1 page (post-login entrypoint)
├── deploy/[id]/
├── docs/                        9 sub-pages
├── marketplace/ + creator/onboarding/
├── ide/                         1 page → ModernIDEShell
├── evidence/                    1 page — ⚠️ Gap: NO entry in route-maturity-registry
├── nexus/                       1 page ALPHA — ⚠️ duplicates /studio viewport
├── honest-status/               1 page GA (REAL DIFFERENTIATOR)
├── status/_components/
├── trust/, reliability/, compliance/, security/, security-policy/
├── help/, pricing/, settings/ (with _components/)
├── (auth flows): forgot-password, reset-password, verify-email
├── (legal): privacy, terms
├── (public): compare, contact-sales, download, offline, profile
└── (legacy): help, security-policy
```

### 2.2 Components (470 TSX)

| Folder | Count | Role | Notes |
|---|---|---|---|
| `ide/` | 143 | ⭐ Largest cluster | Monaco, AIChatPanel, TaskOps, modern-shell/ |
| `agents/` | 91 | ⭐ NEW canonical folder | AgentsWindow, AgentCard, AgentFleetPanel |
| `ui/` | 66 | Primitives | Button, Modal, Toast + stories |
| `dashboard/` | 48 | 2nd largest | ⚠️ Drift potential |
| `engine/` | 33 | Viewport-aware editors | LevelEditor, AnimationBlueprint, NiagaraVFX |
| `settings/` | 28 | Settings panels | TwoFactorSecurityPanel etc |
| `preview/` | 27 | CanonicalPreviewSurface + 26 satellites | ⚠️ Still fragmented |
| `editor/` | 26 | MonacoEditorPro + TabBar + GitGutter + Minimap | |
| `viewport/` | 18 | AethelViewport3D + chrome + outliner + inspector | |
| `terminal/` | 18 | TerminalPro + utilities | |
| `ai/` | 17 | AISuggestionBubble + AgentFleetCoordinatorStrip | |
| `studio/` | 13 | ⭐ CreativeWorkbenchShell + parts + 8 panels | |
| `animation/` | 11 | KeyframeSystem + AnimationBlueprintEditor | |
| `video/` | 10 | VideoTimeline + media bridge | |
| `character/` | 10 | FacialAnimationEditor + ControlRigEditor | |
| `admin/` | 8 | AdminOpsLayout parts | |
| `narrative/` | 7 | QuestEditor + DialogueEditor | |
| `nexus/` | 4 | ⚠️ Legacy: AethelResearch, DirectorMode, NexusCanvasV2 | |
| `sequencer/` | 4 | SequencerTimeline | |
| *13 folders with 1 file each* | 13 | ⚠️ Dead fragmentation | timeline, telemetry, streaming, search, etc. |
| *4 root orphans* | 4 | ⚠️ Anti-pattern | AethelDashboardRuntime, Onboarding, ServiceWorkerProvider, useAethelDashboardRuntime |

### 2.3 Lib (1,363 files — 6.8× Cursor)

| Folder | Files | Role | Status |
|---|---|---|---|
| `server/` | 137 | ⭐ Largest server cluster | project-file-store ✅, ai-change-apply ✅, websocket-server (1443 LOC) |
| `production/` | 76 | ⭐ Phase A + governance | tool-bus ✅, evidence ✅, receipts ✅, scope-enforcement ✅ |
| `engine/` | 43 | Asset pipeline + LOD + audio + scene-graph + physics | |
| `ai/` | 38 | ⭐ agent-mode/* (8) + advanced-ai-provider* (7) + tools-registry (574 LOC) | |
| `input/` | 30 | InputManager runtime + haptics + keyboard mappings | |
| `debug/` | 30 | Profiler + debug-adapter + DAP utilities | |
| `runtime/` | 23 | ⭐ SPINE V29/V30: v29-internal-spine (496), best-market-spine (463), v30-spine | |
| `hooks/` | 22 | ⚠️ Isolated hooks (should be in `lib/<feature>/hooks`) | |
| `physics/` | 20 | Physics system + ClothSimulation runtime | |
| `viewport/` | 17 | Viewport render pipeline + gizmo system | |
| `ui/` | 14 | ⚠️ premium.tsx 605 LOC (largest in project) | |
| `postprocessing/` | 14 | Bloom, tonemap, SSAO passes | |
| `assets/` | 14 | asset-importer (983 LOC) + manifest + license-policy | |
| `collaboration/` | 13 | Yjs bindings | |
| `capture/`, `editor/`, `environment/`, `state/`, `quests/`, `extensions/` | 13 each | | |
| `pixel-streaming/` | 12 | Session, cost-safety, websocket bridge | |
| `sequencer/` | 11 | ✅ Canonical (grew in Wave C) | |
| `mcp/` | 11 | ⚠️ Host partial — no registry | |
| `agents/` | 9 | ⭐ Runtime + evidence package + spine | |
| `routes/` | 5 | ⭐ route-maturity-registry (58 entries: 14 GA, 11 BETA, 20 ALPHA, 4 PROTOTYPE, 9 ASPIRATIONAL) | |
| `studio/` | 5 | ⭐ studio-registry (146 LOC, 20 tools) | |
| `three/` | 3 | ✅ Lazy gateway (107 LOC) + co-deps | |
| `render-farm/` | 2 | 🔴 Gap: needs providers + queue | |
| `export/` | 2 | 🔴 Gap: needs format adapters | |
| `ai-ondevice/` | 2 | 🔴 Gap: needs face-mesh/voice/pose | |
| `integrations/` | 2 | 🔴 Gap: photogrammetry still absent | |
| *~150+ top-level .ts* | — | Various splits (render-*, sequencer-*, video-encoder-*, nanite-*, etc.) | |

### 2.4 Critical Product Gaps

| # | Gap | Affected file | Severity |
|---|---|---|---|
| 1 | `/studio` home uses legacy `CreativeStudioShell` | `app/studio/page.tsx` | ✅ DONE |
| 2 | 3 different patterns for 6 studio pages | Converged to CreativeWorkbenchShell | ✅ DONE |
| 3 | `AgentsWindow` not wired in `ModernIDEShell` | `ModernIDEShellPanels.tsx` | ✅ DONE |
| 4 | 209 direct `three` imports (gateway `lib/three/index.ts` exists but unused) | 209 files | 🔴 P0 |
| 5 | `/evidence` no entry in `route-maturity-registry` | `lib/routes/route-maturity-registry.ts` | 🟠 |
| 6 | 18 admin sub-folders without `page.tsx` | `app/admin/{ai-agents,ai-monitor,…}` | 🟠 |
| 7 | `lib/render-farm/` only 2 files (no providers) | New structure needed | 🔴 |
| 8 | `lib/export/` only 2 files (no GLB/MP4/USDZ/WAV formats) | New structure needed | 🔴 |
| 9 | `lib/ai-ondevice/` only 2 files | mediapipe/whisper/onnxruntime absent | 🔴 |
| 10 | `lib/integrations/` only placeholder | photogrammetry/usd/datasmith absent | 🔴 |
| 11 | 4 root-orphans in `components/` root | Move to sub-folders | 🟠 |
| 12 | 13 folders in `components/` with 1 file each | Dead fragmentation | 🟠 |
| 13 | 1 MCP route in `app/api/mcp` without server registry | Needs Prisma model + CRUD routes | 🔴 |
| 14 | 1 render route without cancel/logs/[id] | Insufficient API | 🟠 |
| 15 | 1 export route (only metrics!) | No GLB/MP4/USDZ/WAV endpoints | 🔴 |
| 16 | `components/nexus/` 4 live files + `/nexus` route | Duplication | 🟠 |
| 17 | 3 distinct Playwright configs | Test drift | 🟠 |
| 18 | Hooks in `lib/hooks/` (22 files) duplicate scoping | Move to `lib/<feature>/hooks/` | 🟠 |

---

## 3 · apps/studio-local/ — Desktop Tauri

```
apps/studio-local/
├── src/                          (Vite + React frontend)
│   ├── main.tsx                  React entry
│   ├── StudioLocalApp.tsx        (98 LOC) shell: header + sidebar + content + footer
│   ├── styles.css                tokens imported from web
│   ├── desktop-capability-manifest.ts  declares 4 capabilities
│   ├── desktop-bridge/
│   │   └── createDesktopAdapter.ts  IPC bridge for Tauri commands
│   └── panels/
│       ├── CapabilityProbe.tsx      (31 LOC) ⚠️ skeleton
│       ├── CloudHandoffBridge.tsx   (24 LOC) ⚠️ skeleton
│       ├── JobsLane.tsx             (83 LOC) only reasonable one
│       ├── LocalRuntimeStatus.tsx   (30 LOC) ⚠️ skeleton
│       └── SidecarManager.tsx       (34 LOC) ⚠️ skeleton
│
├── src-tauri/                    (Rust kernel)
│   ├── Cargo.toml                🔴 still 3 deps: serde + serde_json + tauri 2
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs, lib.rs
│       ├── contracts.rs          IPC contracts
│       ├── daemon.rs             sidecar daemon
│       ├── desktop_commands.rs   (~160 LOC) fs/terminal/AI commands
│       ├── jobs.rs               job runner
│       ├── native_kernel.rs      ⭐ NEW (not audited in V32)
│       ├── policy.rs             policy gates per lane
│       ├── probe.rs              capability probe
│       ├── runtime_engine.rs     runtime spine
│       └── sidecars.rs           sidecar management
```

### Desktop Gaps

| # | Gap | Severity |
|---|---|---|
| 1 | Cargo deps = 3 (missing tokio/notify/git2/wgpu/ort/ffmpeg-next/portable-pty/tower-lsp/tree-sitter) | 🔴 P0 |
| 2 | 4 panels with <35 LOC each (skeleton, not product) | 🔴 P0 |
| 3 | `native_kernel.rs` newly created — audit implementation | 🟠 |
| 4 | signed-installer and native-renderer `held` in manifest | 🔴 |
| 5 | No `tauri-plugin-updater` for stable/beta/nightly channels | 🔴 |
| 6 | No CI Apple Developer cert + Windows EV cert + sigstore Linux | 🔴 |
| 7 | `runtime-templates/{linux,macos,windows}` in parallel — duplicate runtime | 🟠 |

---

## 4 · packages/ — Internal Monorepo SDK

| Package | Content | Status |
|---|---|---|
| `@aethel/runtime-contracts` | ⭐ Source of truth: STUDIO_LOCAL_ENDPOINTS, RUNTIME_JOB_LANES (9), RUNTIME_EXECUTION_TARGETS (5), NATIVE_GRAPHICS_BACKENDS, NATIVE_AI_EXECUTION_PROVIDERS | ✅ |
| `@aethel/ide-shared` | RuntimeAdapter + FS/Terminal/AI/Notification adapters + `createWebRuntimeAdapter` | ⚠️ Missing `createDesktopRuntimeAdapter` |
| `@aethel/mcp-sdk` | AethelMcpClient interface (50 LOC) | 🔴 No real implementation |
| `@aethel/plugin-sdk` | AethelPlugin interface (50 LOC) | 🔴 No host runtime (`lib/plugins/host.ts` absent) |
| `@aethel/cli` | Prints help + exits 2 on any command | 🔴 No functional commands |

---

## 5 · tools/ — QA Infrastructure (77 code files)

```
tools/
├── ci/                           CI dashboard + tests
├── ide/                          ui-audit + visual-regression
├── llm-mock/                     ⭐ LLM mock server for tests
│   ├── providers/                OpenAI/Anthropic/Groq mocks
│   ├── lib/, __tests__/, playwright/
├── pr_api/                       7 sub-folders run_*_logs
├── tests/
├── bootstrap-*.mjs               billing, local-runtime, operator-token, preview-runtime
├── check-*.mjs (35+)             specific gates
├── codemod-{console-to-logger,legacy-aethel}.mjs
├── e2e-mock-api-server.mjs
└── ~40 more utility scripts
```

---

## 6 · runtime-templates/ — Electron templates per OS

```
runtime-templates/
├── linux/       main.js, package.json, preload.js
├── macos/       main.js, package.json, preload.js
└── windows/     main.js, package.json, preload.js + renderer/
```

> [!WARNING]
> `runtime-templates` is Electron-flavor; `apps/studio-local/` is Tauri. **Two parallel desktop runtimes.** Decide one and archive the other.

---

## 7 · src/ (ROOT) — Legacy CLI/Engine

```
src/                              ⚠️ 72 code files — NOT the web product
├── browser/missions/             browser automation
├── common/
│   ├── agent-system/, supreme-ai/, supreme-orchestrator/
│   ├── cloud-deploy/, context/, credentials/
│   ├── data/, learning-system/, llm/, media/
│   ├── mission-system/, observability/
│   ├── tests/, toolchains/, trading/
│   ├── web-automation/, workflows/
├── components/unreal/            ⚠️ Unreal-themed components (legacy)
├── services/, tests/, ui/components/
```

**Honest decision:** `src/` is legacy CLI/engine, not part of the web product. Has rich features (supreme-ai, supreme-orchestrator, trading, web-automation) that are **NOT** integrated with `cloud-web-app/web/`. Archive to `packages/aethel-cli-legacy/` OR migrate valuable features to `lib/ai/agent-mode/`.

---

## 8 · WHAT CLAUDE ALREADY DID (this conversation)

### Session 1 — Diagnostic + Baseline
- Proved V32 was outdated (repo active, lockfile exists, splits already done)
- Fixed 132 TypeScript errors → green build
- Created `PremiumLoadingState.tsx`, `.cursorrules`
- Identified dead code at root — archival pending approval

### Session 2 — Internal Spine (real code)
- **Governed kernel:** `agent-tool-job-runner.ts` (tool bus + evidence)
- **Persistent ledger:** `task-evidence-ledger-store.ts` + `persist-governed-evidence.ts`
- **ProjectFileStore** (disk + DB) — closes the IDE-reads-disk / agent-writes-DB fork
- **Semantic context for agent:** `assemble-agent-context`, `create-agent-tool-context-provider`
- Competitive analysis (Cursor, Unreal, Adobe, assets/AI)

### Session 3 — V33 + Mowgli (partial, uncommitted)
- Mowgli brief + product decisions (governance, Live, assets, solo-first)
- Bloco 1 V33 start (~57 files):
  - Agents replaces Copilot in bottom tab
  - `AgentStatusPill` with 6 states
  - `/evidence` → GA in registry
  - Evidence required in `CreativeWorkbenchShell`
  - New gates: `qa:evidence-ledger-coverage`, `qa:phase-a-store-coverage`
  - `AgentsWindow` referenced in `ModernIDEShellPanels`

---

## 9 · V33 DEFECT MAP — 25 Items

| # | Defect | Status | Notes |
|---|---|---|---|
| 1 | Wire `AgentsWindow` in IDE | 🟡 Partial | Import exists; slot may still be `children.chat` |
| 2 | Copilot → Agents | ✅ Done locally | |
| 3 | Bottom dock Agents + Terminal simultaneous (55/45) | ❌ | Still either/or |
| 4 | 209 `three` imports → gateway lazy | ❌ | ~180+ files still import directly |
| 5 | `Cargo.toml` desktop with real deps | ❌ | Still 3 deps |
| 6 | 5 desktop panels real (700+ LOC) | ❌ | Skeleton ~30 LOC each |
| 7 | Studio pages standardized | ❌ | Still via `StudioGroupedEditorClient` |
| 8 | `/studio` home uses `CreativeWorkbenchShell` | ❌ | |
| 9 | Validate `/studio/cinematic` | ❓ | |
| 10 | `/nexus` → redirect `/studio` | ❌ | No `middleware.ts` |
| 11 | `/evidence` maturity GA | ✅ Done locally | |
| 12 | `CommandPalette` PT→EN | 🟡 Partial | Verify 3 files |
| 13 | `localStorage` with fallback | ❌ | |
| 14 | `AgentStatusPill` 6 states | ✅ Done locally | |
| 15 | Tool switcher visual in Creative Workbench | ❌ | |
| 16 | Evidence required in shell | ✅ Done locally | |
| 17 | Deep-link + temporal graph in Honest Status | ❌ | |
| 18 | Landing hero with live product (loop) | ❌ | |
| 19 | Outcome chips on landing | ❌ | |
| 20 | Eliminate `components/nexus/` | ❌ | Folder still exists |
| 21 | Delete empty top-level folders | ❌ | |
| 22 | Archive `src/` legacy CLI (72 files) | ❌ | |
| 23 | Residual `components/` + `lib/` at root | ❌ | |
| 24 | Gate `qa:hidden-route-leak` | ❌ | |
| 25 | `enforceToolBus: true` default in production | ✅ | Now enforced by default in prod |

---

## 10 · PRIORITIZED GAPS — 40 Items for execution

### 10.1 — Structural (high pain, low effort)

| # | Where | What to do | Effort |
|---|---|---|---|
| 1 | Root | `git rm -r cloud-admin-ia diagnostics metrics shared infra components lib` | 15 min |
| 2 | Root | `git mv src packages/aethel-cli-legacy/` | 15 min |
| 3 | Root | Move `server.js verifier.js physics*.js proxy-shim.js *.spec.ts workbench-preview.html` to `packages/aethel-cli-legacy/` or `tests/e2e/legacy/` | 30 min |
| 4 | Root | Delete 2 of 3 `playwright.*config*` (keep only `playwright.config.ts`) | 5 min |
| 5 | `components/` | Move 4 root orphans to sub-folders + delete 13 single-file folders | 1h |
| 6 | `app/admin/` | Create `page.tsx` in 18 missing sub-folders OR delete folders | 2h |
| 7 | `runtime-templates/` | Archive: `git mv runtime-templates packages/aethel-cli-legacy/electron-templates/` | 30 min |

### 10.2 — Shell Convergence (medium pain, medium effort)

| # | Where | What to do | Effort |
|---|---|---|---|
| 8 | `app/studio/page.tsx` | Swap `CreativeStudioShell` → `CreativeWorkbenchShell` | 2h |
| 9 | `app/studio/{animation,level,vfx}/page.tsx` | Rewrite to match `quest/page.tsx` pattern (CreativeWorkbenchShell direct + studio-registry) | 4h |
| 10 | `app/studio/film/page.tsx` | Absorb `FilmStudioClient` as tool inside `CreativeWorkbenchShell` | 2h |
| 11 | `app/studio/cinematic/page.tsx` | Absorb `CloudStreamStudioClient` as tool | 2h |
| 12 | `StudioGroupedEditorClient.tsx` | **DELETE** (after #9 above) | 30 min |
| 13 | `ModernIDEShellPanels.tsx` | Wire `AgentsWindow` as chat slot | 4h |
| 14 | `AIChatPanelContainer.tsx` | **DELETE** (after #13) | 30 min |
| 15 | `app/nexus/page.tsx` | **DELETE** + middleware redirect `/nexus` → `/studio?group=Film&tool=director` | 1h |
| 16 | `components/nexus/` | Distribute 4 files: DirectorMode stays, AethelResearch → `components/research/`, NexusCanvasV2 → consolidate into CanonicalPreviewSurface, NexusChatMultimodal → AgentsWindow | 4h |

### 10.3 — Technical Spine (high pain, high effort)

| # | Where | What to do | Effort |
|---|---|---|---|
| 17 | `Cargo.toml` | Add 35 crates (tokio, notify, git2, portable-pty, tower-lsp, tree-sitter, wgpu, ort, ffmpeg-next, rapier3d) | 2h |
| 18 | `panels/*` | Expand 5 panels from ~30 LOC to ~150–250 LOC real (probe, sidecar download UI, jobs queue, status latency/memory, handoff cost) | 1 week |
| 19 | `lib/render-farm/` | Create `providers/{modal,replicate,fly-gpu,runpod}.ts` + `queue/{job-spec,dispatcher,poll,receipts,teardown}.ts` + UI | 2 weeks |
| 20 | `lib/export/` | Create `formats/{glb,usdz,mp4-webcodecs,mp4-ffmpeg,wav,png-sequence,project-zip}.ts` + `pipeline/{plan,progress,receipts}.ts` | 2 weeks |
| 21 | `lib/ai-ondevice/` | Create `face-mesh/mediapipe-bridge.ts`, `voice/whisper-web.ts`, `voice/silero-vad.ts`, `pose/mediapipe-pose.ts`, `text/transformers-summarizer.ts` | 2 weeks |
| 22 | `lib/integrations/` | Create `photogrammetry/{polycam,luma-ai,kiri-engine,meshy}.ts` + `usd/`, `datasmith/` | 1 week |
| 23 | `lib/agents/runtime/` | Implement `orchestrator.ts` (LangGraph), `role-executor.ts`, `tool-bus.ts`, `sandbox-provider.ts`, `vector-store.ts`, `browser-runtime.ts`, `role-eval-suite.ts`, `receipts/*` | 4 weeks |
| 24 | `lib/mcp/host.ts` | Real host using `@modelcontextprotocol/sdk` + Prisma model `McpServer` | 1 week |
| 25 | `lib/plugins/host.ts` | Create implementation of `@aethel/plugin-sdk` | 1 week |
| 26 | `@aethel/cli` | Implement real commands (init, deploy, agent run, viewport export) | 2 weeks |

### 10.4 — Missing APIs

| # | Where to create | What it delivers |
|---|---|---|
| 27 | `app/api/mcp/servers/route.ts` + `[id]/route.ts` | CRUD MCP servers |
| 28 | `app/api/mcp/tools/[server]/call/route.ts` | Call tool with approval gate |
| 29 | `app/api/render/jobs/[id]/route.ts` + `/cancel` + `/logs` | Complete render job lifecycle |
| 30 | `app/api/exports/{glb,usdz,mp4,wav,project}/route.ts` | Real export (5 formats) |
| 31 | `app/api/agents/stream/fleet/route.ts` | SSE stream for real-time `AgentStatusPill` |
| 32 | `app/api/photogrammetry/{polycam,luma,kiri}/route.ts` | Proxy + storage |
| 33 | `app/api/plugins/{install,uninstall,list}/route.ts` | Plugin lifecycle |

### 10.5 — Quality / Tests / Stories

| # | Where | What to do | Effort |
|---|---|---|---|
| 34 | `components/*.stories.tsx` | 8 canonical stories missing (ModernIDEShellPanels, SideColumns, CenterStack, chromeHeader, CreativeStudioShell, AgentNavigationPanel, AgentReplayPanel, AgentFleetPanel) | 2 days |
| 35 | Golden screenshots | Playwright visual-regression for 8 canonical stories + critical flows (login, dashboard, /ide, /studio/quest) | 2 days |
| 36 | `scripts/check-hidden-route-leak.mjs` | Gate: confirm 13 PROTOTYPE/ASPIRATIONAL routes return 404 with flag off | 1 day |
| 37 | `scripts/check-phase-a-store-coverage.mjs` | Gate: validate all fs mutation goes through `ProjectFileStore` | 1 day |
| 38 | `scripts/check-evidence-ledger-coverage.mjs` | Gate: validate all apply operations have ledger entry | 1 day |
| 39 | i18n hard cutover | `npm run i18n:scan-pt` → CSV → migrate to `messages/{pt-BR,en,es}.json` + keep ONE i18n system (drop 2 of 3) | 3 days |
| 40 | `scripts/codemod-three-rewrite.mjs` | Rewrite (not inventory) the 209 imports — V32 §6 provided skeleton | 2 days + manual migration |

---

## 11 · ARCHITECTURE — Real Layers (not declarations)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
│  ┌──────────────────┬─────────────────┬───────────────────────┐    │
│  │ Public surfaces  │ Private product │ Desktop app           │    │
│  │ /, /docs, /docs/*│ /ide, /studio   │ apps/studio-local     │    │
│  │ /honest-status   │ /dashboard      │ (Tauri WebView)       │    │
│  │ /pricing, /trust │ /evidence       │                       │    │
│  │ /compliance      │ /admin (6 areas)│                       │    │
│  └──────────────────┴─────────────────┴───────────────────────┘    │
│                                                                     │
│  Canonical shells (4):                                              │
│  • ModernIDEShell        (components/ide/) — /ide                   │
│  • CreativeWorkbenchShell (components/studio/) — /studio/*          │
│  • AdminOpsLayout        (components/admin/) — /admin/*             │
│  • DashboardShell        (components/dashboard/) — /dashboard       │
│                                                                     │
│  Orphan: /nexus → 🔴 delete, redirect → /studio?group=Film         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (lib/)                          │
│                                                                     │
│  • lib/agents/runtime/        ⚠️ skeleton — orchestrator missing    │
│  • lib/agent-orchestrator.ts  ✅ 29 canonical roles defined          │
│  • lib/production/            ⭐ Phase A: tool-bus, evidence,        │
│                               read-receipts, scope-enforcement       │
│  • lib/server/ai-change-apply/ ✅ mirror-canonical-store             │
│  • lib/server/project-file-store/ ✅ db + disk backends             │
│  • lib/server/agent-run-ledger ✅ persisted ledger                   │
│  • lib/mcp/                   ⚠️ partial host — no registry         │
│  • lib/ai/agent-mode/         ✅ agent mode: phases, memory, prompts │
│  • lib/sequencer/             ✅ canonical (grew in Wave C)          │
│  • lib/three/index.ts         ✅ lazy gateway 107 LOC                │
│  • lib/studio/studio-registry ✅ 20 tools mapped                     │
│  • lib/routes/route-maturity  ✅ 58 entries (14 GA, 11 BETA,         │
│                               20 ALPHA, 4 PROTOTYPE, 9 ASPIRATIONAL) │
│  • lib/runtime/               ✅ v29-spine + v30-spine + best-market │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER (app/api/)                       │
│                                                                     │
│  379 routes in 30+ namespaces:                                      │
│  • /api/ai/*        22 routes — completion, agent, 3d, video, music │
│  • /api/agents/*    3 routes — workforce, stream, browser-operator  │
│  • /api/auth/*      14 routes — WebAuthn, SAML, SCIM, OAuth, 2FA   │
│  • /api/billing/*   10 routes — full Stripe                         │
│  • /api/files/*     10 routes — real fs API                         │
│  • /api/git/*       8 routes                                        │
│  • /api/terminal/*  8 routes — PTY runtime                          │
│  • /api/preview/*   6 routes                                        │
│  • /api/lsp/*       3 routes                                        │
│  • /api/dap/*       4 routes                                        │
│  • /api/mcp         🔴 1 route — no registry                        │
│  • /api/render/jobs 🔴 1 route — no cancel/logs                     │
│  • /api/exports     🔴 1 route — only metrics!                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER (Prisma)                             │
│                                                                     │
│  51 models: User, Project, Organization, Team, Subscription,        │
│  Asset, FileNode, Deployment, AgentRun, AgentReceipt, AgentSession, │
│  TaskEvidenceLedger, FeatureFlag, AuditLog, SupportTicket + 30 more │
│  ⚠️ Gap: schemas for McpServer, RoleEval, RenderJob absent         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                              │
│                                                                     │
│  • Next.js 14.2.5 + Turbopack + Node.js                            │
│  • Redis (Upstash + ioredis) + PostgreSQL (Prisma)                  │
│  • S3 / Cloudflare R2 (asset storage)                               │
│  • Stripe (billing) + Sentry 8.47 (monitoring)                      │
│  • Playwright + Vitest + Jest (testing) + Storybook 9 (45 stories)  │
│  • Yjs + y-websocket + y-monaco + y-indexeddb (CRDT)               │
│  • Monaco 0.55 + xterm 5.3 (IDE)                                    │
│  • Three.js 0.166 + R3F 8.15 + Drei 9.122 (3D)                     │
│  • Tauri 2 (desktop shell)                                          │
│  • Docker + k8s + Railway (deploy)                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 12 · V30 WAVES — Still Pending

| Wave | Objective | Status |
|---|---|---|
| W0 | Lockfiles, EXECUTION_LOG, block new shells | 🟡 Partial |
| W1 | Delete deprecated, PT→0, admin hub, unified loading | 🟡 Partial |
| W2 | 1 IDE shell, Zustand store, break god-components | ❌ |
| W3 | 45 agent/chat components → ~15 in `components/agents/` | 🟡 (`ai-chat/` killed) |
| W4 | Single `CreativeWorkbenchShell` for 16 editors | 🟡 Shell exists, editors not converged |
| W5 | Real desktop frontend | 🟡 Shell 300 LOC, no engine |
| W6 | 150 stories, visual regression 12 routes, perf budgets | ❌ (45 stories) |
| W7 | `lib/` wire or archive (57 modules >1000 LOC) | ❌ |

---

## 13 · SURFACES / PAGES — What's missing per route

| Route | What's missing |
|---|---|
| `/` Landing | Live hero, outcome chips, clean EN, no broken screenshot |
| `/login` `/register` | Linear-style, no internal jargon |
| `/dashboard` | Mission-first: 4 cards (Continue, Blockers, Live agents, Runtime health) |
| `/ide` | Single shell + visible governance |
| `/studio/*` | Convergence + tool switcher |
| `/evidence` | Timeline + share OG unfurl |
| `/honest-status` | Deep links + stuck timeline |
| `/billing` | Stripe Customer Portal or Stripe-style UI |
| `/admin` | 46 routes → 1 hub with 6 tabs |
| `/pricing` | 4 tiers + FAQ + enterprise form |
| `/settings` | Vertical sidebar: Profile, Autonomy, BYOK, Notifications, Labs |

---

## 14 · STRUCTURAL DEBT

| Problem | V30 Ref | Action |
|---|---|---|
| 334 files >500 LOC | §1.3 | Break or archive |
| 923 placeholders/stubs | §1.3 | Wire visible or `lib/archived/` |
| 5 AI entrypoints | §4.4 | 1 only: Agents Window + Composer |
| Prisma 51 models, orphans | §8.2 | UI or delete model |
| 190 QA scripts redundant | §8.3 | Consolidate into 12 gates |
| `lib/` 1363 files (6.8× Cursor) | V33 §7.5 | Wave spine consolidation |
| Orphan NPM deps at root | V30 §5.5 | Remove ccxt, theia, etc. |
| Test drift | todo q6 | Triage + `qa:internal-spine` green |

---

## 15 · RECOMMENDED EXECUTION ORDER

### WEEK 1 — Stabilize + P0 IDE

| # | Task | Track | Effort |
|---|---|---|---|
| 1 | Validate gates + commit ~57 local files | §10.1 | 1 day |
| 2 | Root cleanup (7 dead folders + legacy files) | §10.1 #1–4 | 1h |
| 3 | Bottom dock split 55/45 + AI Console 5 zones | §10.2 #13 | 3 days |
| 4 | `enforceToolBus` prod default + gates coverage | V33 #25 | 1 day |
| 5 | Nexus redirect + hidden route gate | §10.2 #15 + §10.5 #36 | 1 day |

### WEEK 2 — Studio + Landing

| # | Task | Track | Effort |
|---|---|---|---|
| 6 | Studio pages canonical template + tool switcher | §10.2 #8–12 | 3 days |
| 7 | Landing hero + outcome chips (code) | §13 | 2 days |
| 8 | Mowgli: fix frames IDE/Live/Landing | Design | 2 days |

### WEEK 3 — Agent Runtime

| # | Task | Track | Effort |
|---|---|---|---|
| 9 | Single orchestrator + MCP host | §10.3 #23–24 | 5 days |
| 10 | Live mode premium | V33 #9 | 2 days |
| 11 | Preview Deck + Design Mode bridge | Track A2 | 3 days |

### WEEK 4+ — Desktop + Polish

| # | Task | Track | Effort |
|---|---|---|---|
| 12 | `Cargo.toml` + real desktop panels | §10.3 #17–18 | 1–2 weeks |
| 13 | Three.js codemod | §10.5 #40 | 2 days |
| 14 | V30 Waves 6–7 (stories, visual regression, lib archive) | §12 | 2 weeks |
| 15 | Missing APIs (MCP, render, export, plugins) | §10.4 #27–33 | 2 weeks |

---

## 16 · MASTER PROMPT — Copy-paste for Claude/Gemini

```
PROJECT: Aethel — governed AI IDE (web-first). Repo: meu-repo/cloud-web-app/web.
DO NOT hallucinate. Validate every claim against files.

CONTEXT:
- V32/V30 audits are largely outdated; V33 (commit 17e3a89) is the execution source.
- ~57 uncommitted files implement partial Bloco 1 V33 — validate and commit first.
- Product = V34 Dominance Wave. We are competing with Cursor (AI/IDE), Unreal (Engine/Performance), and Adobe (UX/Aesthetics).
- Forensic counts: 2269 .ts, 916 .tsx, 51 Prisma models, 379 API routes, 470 components,
  1363 lib files, 58 pages, 246 npm scripts.

NON-NEGOTIABLES:
- No new shells. 4 max: ModernIDEShell, CreativeWorkbenchShell, DashboardShell, AdminOpsLayout.
- No "Copilot" in UI. Use: Agents Window, Composer, AI Console.
- EN-only user strings. Accent #6AA9FF. Gizmo X/Y/Z = #FF5252/#7CB87A/#6AA9FF.
- No file >500 LOC. Run qa:enterprise-gate before marking done.
- Dead code at root (src/, client/, components/, lib/, runtime-templates/) = DO NOT TOUCH.

P0 TASKS (in order) [V34 THE DOMINANCE WAVE]:
1. IMPLEMENTATION: 18 admin sub-folders missing page.tsx.
2. TAURI RUST KERNEL: Expand Cargo.toml with real dependencies (tokio, wgpu, ffmpeg-next) and replace 30-LOC skeletons.
3. RENDER FARM & EXPORT: Build real providers in lib/render-farm/ and lib/export/ (Modal, RunPod, ffmpeg webcodecs) beyond the current stub endpoints.
4. ON-DEVICE AI: Build mediapipe-bridge and whisper-web in lib/ai-ondevice/.
5. UX POLISH (ADOBE STANDARD): Enforce micro-animations and smooth transitions across ModernIDEShell and CreativeWorkbenchShell. No flickers.

REFERENCE FILES:
- lib/production/agent-tool-job-runner.ts
- lib/production/task-evidence-ledger-store.ts
- lib/server/project-file-store/
- components/agents/AgentsWindow.tsx
- components/agents/AgentsWorkspaceContainer.tsx
- components/ide/modern-shell/ModernIDEShellCenterStack.tsx
- AETHEL_INTERFACE_BLUEPRINTS/08_WORKBENCH.md
- docs/BACKLOG_MASTER.md (this file — 40 gaps in §10)

40 PRIORITIZED GAPS: See docs/BACKLOG_MASTER.md §10 (structural → shell convergence →
  technical spine → missing APIs → quality/tests).

DEFER TO DESIGN (Mowgli/Gemini):
landing hero loop, full page polish, email templates, OG share cards.
```

---

## 17 · ONE-SENTENCE SUMMARY

> You have **real enterprise infrastructure** (tool bus, evidence ledger, file store, 379 APIs, 51 Prisma models, creative depth in 1363 lib files), but the **product doesn't close the loop in the UI**: IDE isn't Cursor-parity, governance isn't default in prod, studio is fragmented across 4 wrapper patterns, desktop is a 3-dep shell, 40k LOC of dead code sits at root, and half of Bloco 1 V33 is on disk with no commit and no green gate.
