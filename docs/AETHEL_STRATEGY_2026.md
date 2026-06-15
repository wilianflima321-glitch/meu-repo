# AETHEL ENGINE 2026: STRATEGIC EXECUTION MASTERPLAN

> **Classification:** STRATEGIC ROADMAP — ENGINEERING & PRODUCT LEADERSHIP
> **Generated:** 2026-06-15
> **Target:** Surpass Cursor 3.5, Unreal 5.5, Replit Agent 4, and Adobe Firefly
> **Goal:** Create the ultimate, governed, AI-first creative IDE.

This document transcends a simple checklist. It provides a **battle-tested, competitive gap matrix**, **acceptance criteria for all major engineering gaps**, **risk scoring**, **KPIs**, and a **dependency graph** to ensure parallel, risk-mitigated execution by any autonomous AI agent.

---

## 1. COMPETITIVE POSTURE & GAP MATRIX

Based on deep 2026 market analysis, Aethel’s strategic thesis survives because **no competitor delivers all domains simultaneously** (IDE + AAA Creative Suite + Governed Desktop/Cloud + Enterprise Trust). However, we are currently losing on *cohesion and execution*. 

### Feature-by-Feature Battlefield

| Capability | Market Leader (2026) | Aethel Current State | Strategic Gap / Action to Win |
|---|---|---|---|
| **Unified Agent Orchestration** | **Cursor 3.5 / Windsurf** | 🔴 Fragmented (5 chat components) | **P0:** Wire `AgentsWindow` as the sole orchestrator. Implement LangGraph for multi-agent loops. |
| **Plan-Then-Execute Mode** | **Cursor (Shift+Tab)** | 🔴 Missing | **P0:** Implement `StudioMissionControl` to enforce planning before mutation. |
| **Cloud Agent Execution** | **Replit Agent 4** | 🟡 `e2b` sandbox installed, no runtime | **P1:** Build WebContainer/sandbox backend for isolated build-test-fix loops. |
| **Information Density & Chrome** | **Linear** | 🔴 3 competing shells | **P0:** Deprecate `IDELayout` and `ModernIDEShell`, enforce `FullscreenIDE` + Radix UI primitives. |
| **Unified Creative Subsystems** | **Unreal Engine 5.5** | 🔴 10 independent editors | **P1:** Consolidate all `/studio/*` routes into `CreativeWorkbenchShell` via `studio-registry.ts`. |
| **One-Click Deployment** | **Firebase / Bolt.new** | 🔴 Missing | **P2:** Build `lib/production/cloud-deploy` pipeline for instant URLs. |
| **Generative Creative AI** | **Adobe Firefly** | 🔴 Missing | **P2:** Wire `lib/render-farm` with `replicate`/`runpod` for text-to-3D/video. |
| **Governed File Mutation** | **(No clear leader)** | 🟡 Phase A `ProjectFileStore` | **AETHEL MOAT:** Enforce `task-evidence-ledger-store` on all changes to prove provenance. |

---

## 2. CORE KPIs & PERFORMANCE BUDGETS

To beat the market, Aethel must strictly adhere to these engineering budgets:

| Metric | Target | Warning Threshold | Remediation |
|---|---|---|---|
| **LCP (Largest Contentful Paint)** | `< 1.2s` | `> 2.0s` | Enable Next/Image, optimize `Three.js` lazy loading. |
| **INP (Interaction to Next Paint)** | `< 50ms` | `> 100ms` | Keyboard-first shortcuts; move heavy React state to Zustand (`workbench-store.ts`). |
| **Agent Time-to-First-Token** | `< 400ms` | `> 800ms` | Edge-hosted streaming APIs (`/api/agents/stream`). |
| **Codebase Architecture Size** | `< 250 files/layer` | `> 400 files` | Consolidate `lib/` (currently 1,363 files!) via automated codemods. |
| **Test Coverage (Spine/Kernel)** | `100%` | `< 95%` | `qa:enterprise-gate` blocks merge on `agent-tool-bus` or `project-file-store`. |

---

## 3. EXECUTION DEPENDENCY GRAPH (MERMAID)

Execute tasks in this exact order to prevent regression blocks.

```mermaid
graph TD
    %% Phase 1: Stabilization
    subgraph Phase 1: Foundation [Days 1-3]
        A[Cleanup Root: 7 dead folders, legacy CLI to packages] --> B[Pass: typecheck & qa:internal-spine]
        B --> C[Commit 57 Bloco 1 V33 Files]
    end

    %% Phase 2: Shell & Governance
    subgraph Phase 2: Core UX & Rules [Days 4-8]
        C --> D[Consolidate to FullscreenIDE]
        D --> E[Wire AgentsWindow as default bottom-left]
        C --> F[enforceToolBus: true in Production]
        F --> G[ProjectFileStore coverage 100%]
    end

    %% Phase 3: Creative Studio Convergence
    subgraph Phase 3: Studio & Three.js [Days 9-14]
        D --> H[CreativeWorkbenchShell for all /studio/*]
        H --> I[Tool Switcher Visual (20 tools)]
        H --> J[Lazy Load Three.js 209 imports]
    end

    %% Phase 4: Native Desktop Kernel
    subgraph Phase 4: Desktop Tauri [Days 15-21]
        C --> K[Cargo.toml: Add 35 crates]
        K --> L[Native Kernel & 5 Real Panels]
        L --> M[Signed Installer & Updater]
    end

    %% Phase 5: Advanced AI Runtime
    subgraph Phase 5: The Moat [Days 22-30]
        E --> N[LangGraph Orchestrator]
        G --> N
        N --> O[MCP Host + Prisma Registry]
        O --> P[Render Farm Providers + Job API]
    end
```

---

## 4. THE STRATEGIC EPIC (40-POINT BACKLOG W/ ACCEPTANCE CRITERIA)

*Risk Scores: 🟢 Low, 🟡 Med, 🔴 High*

### TRACK A: Root & Repo Health (The Baseline)
| # | Task | Risk | Acceptance Criteria |
|---|---|---|---|
| 1 | **Root Cleanup** | 🟢 | `cloud-admin-ia`, `metrics`, `components`, `lib`, `shared` deleted from root. |
| 2 | **Archive Legacy CLI** | 🟢 | `src/`, `server.js`, `physics.js` moved to `packages/aethel-cli-legacy/`. |
| 3 | **Playwright Consolidation** | 🟢 | Only 1 `playwright.config.ts` remains. Tests run successfully. |
| 4 | **Fix 57 Uncommitted Files** | 🔴 | `npm run typecheck`, `qa:internal-spine`, and `qa:evidence-ledger-coverage` pass. Changes pushed. |

### TRACK B: IDE Shell Convergence (Beating Linear)
| # | Task | Risk | Acceptance Criteria |
|---|---|---|---|
| 5 | **Nuke `IDELayout.tsx`** | 🟡 | `IDELayout` deleted. All routing points to `FullscreenIDE` or `ModernIDEShell`. |
| 6 | **Wire `AgentsWindow`** | 🔴 | Replaces `children.chat`. Bottom dock split 55% Agents / 45% Terminal simultaneously (no tab toggling). |
| 7 | **Right-Rail AI Console** | 🟡 | 380px panel with 5 zones: Approvals > Runs > Plan > Conversation > Memory. |
| 8 | **Delete `/nexus`** | 🟢 | Route deleted. Middleware redirects to `/studio?group=Film&tool=director`. |

### TRACK C: Creative Studio Convergence (Beating Unreal 5.5)
| # | Task | Risk | Acceptance Criteria |
|---|---|---|---|
| 9 | **`CreativeWorkbenchShell` Standard** | 🔴 | `/studio/animation`, `/level`, `/vfx`, `/film` all use the exact same layout pattern as `/quest`. |
| 10 | **Deprecate `StudioGroupedEditor`** | 🟡 | `StudioGroupedEditorClient` is deleted after Step 9. |
| 11 | **Studio Home Hub** | 🟢 | `/studio` uses `CreativeWorkbenchShell` with "Coming Soon" cards for unbuilt editors. |
| 12 | **Three.js Lazy Loading** | 🔴 | `lib/three/index.ts` gateway used. Direct `from 'three'` imports reduced from 209 to < 50. |

### TRACK D: The Governance Kernel (The Aethel Moat)
| # | Task | Risk | Acceptance Criteria |
|---|---|---|---|
| 13 | **Production ToolBus Enforcement** | 🔴 | `enforceToolBus` defaults to `true` if `NODE_ENV=production`. Request fails safely if bypassed. |
| 14 | **ProjectFileStore Coverage** | 🔴 | `scripts/check-phase-a-store-coverage.mjs` passes. No raw `fs.writeFile` in IDE APIs. |
| 15 | **Evidence Ledger Wire** | 🔴 | Every code change commits to `TaskEvidenceLedger`. |
| 16 | **Agent Approval Card** | 🟡 | UI component shows semantic diff + Approve/Reject for agent runs (no auto-retry loops). |

### TRACK E: Advanced AI Runtime (Beating Replit & Cursor)
| # | Task | Risk | Acceptance Criteria |
|---|---|---|---|
| 17 | **Single Orchestrator** | 🔴 | Implement LangGraph in `lib/agents/runtime/orchestrator.ts`. Retire parallel loops. |
| 18 | **MCP Host + Prisma Model** | 🔴 | `McpServer` model added to `schema.prisma`. CRUD APIs in `/api/mcp/servers`. Tools callable with approval gate. |
| 19 | **Render Farm Skeleton** | 🟡 | `lib/render-farm/` includes API adapters for Modal/Replicate and job queue logic. |
| 20 | **Live Mode Premium** | 🟡 | Upgraded `LiveConversationPanel` with 4 states: Listening / Speaking / Working / Approval Interrupt. |

### TRACK F: Desktop Tauri (studio-local)
| # | Task | Risk | Acceptance Criteria |
|---|---|---|---|
| 21 | **Cargo.toml Real Deps** | 🔴 | 35 crates added (tokio, notify, git2, wgpu, ort, etc.). App builds successfully. |
| 22 | **5 Real Panels** | 🔴 | `CapabilityProbe`, `SidecarManager`, `JobsLane`, `LocalRuntimeStatus`, `CloudHandoff` expanded from 30 LOC to ~150 LOC each. |
| 23 | **Capability Probe JSON** | 🟡 | `probe.rs` returns actual hardware capabilities (GPU/Codec/ML). |

---

## 5. ENGINEERING STANDARDS & SAFEGUARDS

*If an AI Agent is reading this, follow these rules or fail the `qa:enterprise-gate`.*

1. **NO NEW SHELLS:** We have 4 (ModernIDEShell, CreativeWorkbenchShell, DashboardShell, AdminOpsLayout). If you build a new one, you will be rejected.
2. **NO "COPILOT":** The term is banned. Use `Agents Window`, `Composer`, or `AI Console`.
3. **NO PORTUGUESE STRINGS:** Scan with `npm run i18n:scan-pt`. User-facing strings must be English.
4. **NO FILES > 500 LOC:** Hard limit. Split files into `<feature>/` directories before extending.
5. **DOMPURIFY EVERYTHING:** Any use of `dangerouslySetInnerHTML` must pass through isomorphic-dompurify.

---

> **"Aethel is not an IDE. It is an enterprise evidence machine wrapped in a creative suite."** 
> *End of Strategy Document.*
