# Claude Master Brief — Aethel Engine

**Version:** 1.1 (2026-06-19)  
**Role:** **Catalog & index companion** — full `DEBT-*`/`IMPROVE-*` lists, wave bundles, source-file map. The human-facing front door is [`master_mission_briefing.md`](./master_mission_briefing.md) (mission, quality bar, phases); this file is its catalog. Extends [`walkthrough.md`](./walkthrough.md).  
**Mode:** Planning **closed**; implementation starts only on explicit **"Execute Wave N"**.  
**North star:** Honest market leadership — **Cursor-class AI + Blender/UE workbench density + Itch-class publish loop + Tauri-native offline moat** — without fake parity claims.

---

## 0. How to use this file (60 seconds)

1. Read **§1–§3** (truth + priorities).
2. Run **Wave 0 preflight** gates (§8).
3. Execute **one Wave** from §6 — never cherry-pick lone `DEBT-*` tickets.
4. Cross-check acceptance criteria; update registry changelog.
5. Re-run gates before closing the session.

**Copy-paste to start Wave 6:**

```
Execute Wave 6 per CLAUDE_MASTER_BRIEF.md §6.6.
Read: contracts_planning.md, implementation_plan.md, billing_security_analysis.md, CLAUDE_MEGA_WAVES.md Wave 6.
Deliver one mega-PR series. npm run qa:enterprise-gate PASS before and after. No micro-PRs.
```

---

## 1. Competitive north star (honest)

| Competitor | What they win on | Aethel must beat them on | What we must NOT fake |
|------------|------------------|--------------------------|------------------------|
| **Cursor** | Agent loop, apply diff, model routing | Fusion + governed tool bus + local ONNX sidecar (Wave 9) | "Full Cursor parity" before Wave 1 done |
| **Unreal / Unity** | Viewport, LOD, physics, netcode | Iteration speed, AI-native workflow, web-first playtest | "Nanite/Lumen" naming on subsample LOD |
| **Itch.io / Roblox** | Publish → play → feedback | Arcade portal + Aethel Pay + bug→task loop (Wave 8) | "Instant global store" before R2/deploy |
| **VS Code + extensions** | Marketplace, LSP, terminal | Unified game IDE + remix + secure sandbox | Plugin install while API is 503 |
| **Zed** | Local speed, collaboration | Tauri PTY on user machine + Yjs spectator viral loop | Desktop terminal on cloud container |

**Moat thesis (defensible):** Generous IDE on Free (all agents/workspaces) + **local unlimited projects** + **BYOK** + **offline AI** + **publish/remix loop** — monetize only **cloud infra** (storage, CDN, MP servers, platform tokens).

---

## 2. Brutal self-critique (2026-06-17)

| Claim we want to make | Truth in code today | Fix Wave | Risk if shipped early |
|----------------------|---------------------|----------|------------------------|
| "Production-ready billing" | Webhook skip downgrade; no token weights; dual plan files | **6** | Opus bleed bankrupts platform |
| "BYOK supported" | Zero implementation | **6b/7** | Legal/trust incident if keys logged |
| "Cloud + local projects" | Dashboard project list is in-memory mock | **7** | Users hit wrong limits |
| "Marketplace install" | `POST /api/plugins/install` → 503 | **8** | Broken trust |
| "Export GLB/USDZ" | Fake job IDs → 503 | **6** | Paid feature placebo |
| "Real-time collab" | Yjs handler doesn't apply updates | **2** | Data loss |
| "Terminal in IDE" | PTY on **server** not user PC | **9** | Security + useless for local dev |
| "Nanite / path trace / VT" | Placebos documented | **3** | Credibility destruction |
| "AI voice / Opus included" | Silent buffer / no 200× weight | **6/8** | Unit economics death |
| "Instant publish to Arcade" | No `/arcade`, no deploy | **8** | Marketing lie |

**Rule:** UI may show `[BETA]` / `[HELD]` with manifest link until Wave acceptance passes.

---

## 3. Document canon (17 files)

| Priority | File | Purpose |
|:--------:|------|---------|
| **0** | [`master_mission_briefing.md`](./master_mission_briefing.md) | **Front door** — mission, AAA quality bar, 3 phases, Honesty Gate, placebo→UI matrix |
| **0.5** | **`CLAUDE_MASTER_BRIEF.md`** | **This file** — catalog + tiers + prompts + source map |
| 1 | [`walkthrough.md`](./walkthrough.md) | Iteration close; Wave 6→9 summary |
| 2 | [`contracts_planning.md`](./contracts_planning.md) | API/Stripe/BYOK/Arcade/Marketplace contracts |
| 3 | [`implementation_plan.md`](./implementation_plan.md) | Wave 6 step-by-step + plan decisions §11 |
| 4 | [`billing_security_analysis.md`](./billing_security_analysis.md) | Unit economics, weights, fail-open §11, BYOK §12 |
| 5 | [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md) | Mega-Waves 0–9 bundles |
| 6 | [`critical_user_experience_audit.md`](./critical_user_experience_audit.md) | 26 UX critiques #1–#26 |
| 7 | [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) | ~89 `DEBT-*` with evidence |
| 8 | [`FUTURE_IMPROVEMENTS_REGISTRY.md`](./FUTURE_IMPROVEMENTS_REGISTRY.md) | ~143 `IMPROVE-*` |
| 9 | [`analysis_results.md`](./analysis_results.md) | Engine severity map |
| 10 | [`user_experience_criticism.md`](./user_experience_criticism.md) | UX economics context |
| 11 | [`audit_frontend_ui_ux.md`](./audit_frontend_ui_ux.md) | A4–A50 UI hitlist → Wave 7 |
| 12 | [`audit_backend_spine.md`](./audit_backend_spine.md) | Backend spine audit |
| 13 | [`aethel_vision_2030.md`](./aethel_vision_2030.md) | Long-term 3DGS / moat |
| 14 | [`aethel_architecture_philosophy.md`](./aethel_architecture_philosophy.md) | Reactor vs shell laws |
| 15 | [`AUDITORIA_V33_CRITICA_DOS_3_MDS.md`](./AUDITORIA_V33_CRITICA_DOS_3_MDS.md) | Historical |

**IGNORE:** `docs/master/*EXECUTION*` (stale 2026-02–04).

---

## 4. Scope inventory (27 items)

### 4.1 UX audit — 26 points

| # | Section | Issue | Primary ID | Wave |
|---|---------|-------|------------|------|
| 1 | A | UsageBucket row lock | `DEBT-FIN-011` | 6 |
| 2 | A | Transfer deadlock | `DEBT-FIN-012` | 6 |
| 3 | A | Stripe webhook cancel gap | `DEBT-FIN-013` | 6 |
| 4 | A | Hourly caps break flow | `IMPROVE-BILLING-005` | 6 |
| 5 | A | Economics policy (BYOK/collab/MP) | `IMPROVE-BILLING-003` etc. | 6–7 |
| 6 | B | Export mock after pay | `IMPROVE-UX-007` | 6–7 |
| 7 | B | Stripe lists unbuilt features | `IMPROVE-BILLING-006` | 6 |
| 8 | C | WebGL while editing Monaco | `IMPROVE-ENG-023` | 7 |
| 9 | C | Git vs Yjs overwrite | `DEBT-YJS-001` | 2 |
| 10 | C | Silent save on WS drop | `IMPROVE-UX-008` | 7 |
| 11 | C | VS port magnetism | `IMPROVE-VS-012` | 7 |
| 12 | C | Console logs from iframe | `IMPROVE-IDE-018` | 7 |
| 13 | C | Console 100 log cap | `IMPROVE-IDE-019` | 7 |
| 14 | C | GLTF flatten destroys rig | `DEBT-ASSET-001` | 4 |
| 15 | C | Film audio narrow inspector | `IMPROVE-FILM-001` | 7 |
| 16 | C | Marketplace install → login | `DEBT-PLUGIN-001` | 8 |
| 17 | C | Dashboard banner stack | `DEBT-UX-DASH-001` | 7 |
| 18 | D | MCP stdio in browser | `DEBT-DB-001` | 6 |
| 19 | D | Deep context substring | `DEBT-SEARCH-002` | 1 |
| 20 | D | No workspace auto-index | `IMPROVE-AI-002` | 1 |
| 21 | E | AI-tunneling dashboard | `IMPROVE-UX-009` | 7 |
| 22 | E | Electron + Tauri duplicate | `DEBT-DESK-007` | 7 |
| 23 | E | Admin orphan 404 routes | `DEBT-ADMIN-002` | 7 |
| 24 | F | CSP blocks localhost | `DEBT-CSP-001` | 7 |
| 25 | F | Fail-closed Upstash | `DEBT-OPS-001` | 7 |
| 26 | F | RenderJob swallowed | `DEBT-RENDER-001` | 6 |

### 4.2 Social layer (+1)

| Item | Spec | Wave |
|------|------|------|
| Arcade + Marketplace remix + asset gateway | `contracts_planning.md` §11–§13 | **8** |

---

## 5. Plan matrix (canonical)

| | Free | Starter | Pro Platform | Pro +IA | Studio Platform | Studio +IA |
|--|------|---------|--------------|---------|---------------|------------|
| **USD/mo** | $0 | $9 | $15 | $29 | $45 | $79 |
| **Cloud projects** | 1 | 3 | ∞ | ∞ | ∞ | ∞ |
| **Local Tauri** | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ |
| **Storage** | 250MB | 2GB | 14GB | 14GB | 60GB | 60GB |
| **AI weighted/mo** | 200K | 1M | BYOK | 4.5M | BYOK | 18M |
| **requests/day** | 50 | 720 | 2880 | 2880 | 7200 | 7200 |
| **BYOK** | ✅ $0 | ✅ | default | optional | default | optional |
| **BYOK rate** | 10/min proxy | same | same | same | same | same |
| **Ultra (200×)** | Wallet/BYOK | Wallet/BYOK | Wallet/BYOK | Wallet/BYOK | Subscription | Subscription |
| **Yjs write** | 0 | 0 | 2 | 2 | 3 | 3 |
| **Yjs spectator** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Agents/workspaces** | All | All | All | All | +Custom | +Custom |
| **CDN** | 24h links | 8→9.6GB | 100GB | 100GB | 500GB | 500GB |
| **MP cloud** | ❌ | P2P/LAN | 1×256MB | 1×256MB | 3×512MB | 3×512MB |

**Closed:** Basic grandfather $29→Pro+IA entitlements; no `starter_trial`; no credit packs; Enterprise = Contact Sales only.

---

## 6. Wave execution map

### 6.0 Preflight (Wave 0)

```bash
cd meu-repo/cloud-web-app/web
npm run qa:enterprise-gate
npm run typecheck
npm test
```

### 6.1 Business track (recommended first — revenue & trust)

| Wave | Name | Duration | Key DEBTs | Key IMPROVEs | Exit criteria |
|------|------|----------|-----------|--------------|---------------|
| **6** | Billing + schema spine | 2–3 wk | FIN-005–013, BILLING-001, RENDER-001, DB-001–003 | BILLING-001, PLATFORM-003, UX-007 | Plans parity; webhook downgrade; weights; BYOK proxy MVP; RenderJob in Prisma |
| **7** | Studio UX + ops + generosity | 4–6 wk | CSP-001, OPS-001, UX-DASH-*, DESK-007, ADMIN-002 | UX-009, BILLING-007, COLLAB-006 | Tiered fail-open; Resume Workspace; no tier agent lock; Electron gone |
| **8** | Arcade + Marketplace + deploy | 3–4 wk | INFRA-001, PLUGIN-001, DB-002 | ARCADE-001, MKT-001/002 | Remix clone API; gateway scan; arcade feedback→task |
| **9** | Desktop native + local AI | Quarter | TERM-001, DESK-002–004, DESK-006 | DESK-001, DESK-004, DESK-005 | PTY on user machine; fs_watch bridge; ONNX path or honest held |

### 6.2 Engine track (parallel after Wave 6 stable)

| Wave | Name | Key DEBTs |
|------|------|-----------|
| **1** | AI spine | AI-001, AI-002, AI-008, AI-012, SEARCH-002 |
| **2** | Collab + netcode | YJS-001, NET-001, WS-002 |
| **3** | Render core | RENDER-003, RT-001, VT-001, NANITE-001, PERF-002 |
| **4** | World sim | FOLIAGE-001, CLOUD-001, PERF-003/004, TERRAIN-001, ASSET-001 |
| **5** | Character sim | MOTION-001, CLOTH-001, DEST-001 |
| **8†** | Audio/VR (mega-waves) | AUDIO-001/002, VR-001 |

† `CLAUDE_MEGA_WAVES.md` Wave 8 = sensory; **business Wave 8** = social — executor follows **business track** for product launch.

---

## 7. Complete `DEBT-*` catalog (~89)

### 7.1 AI & agents (16)

| ID | Summary | Tier |
|----|---------|------|
| `DEBT-AI-001` | 3 LLM stacks | 1 |
| `DEBT-AI-002` | 4 agent runtimes | 1 |
| `DEBT-AI-003` | Heuristic orchestrator fake LLM | 3 |
| `DEBT-AI-005` | Tool-bus observe on legacy writes | 2 |
| `DEBT-AI-006` | Registry evidence seed weak | 2 |
| `DEBT-AI-007` | PT-BR prompts vs EN UI | 3 |
| `DEBT-AI-008` | Validator not wired | 1 |
| `DEBT-AI-009` | Creative providers stub | 2 |
| `DEBT-AI-010` | Zero GA studio tools | 2 |
| `DEBT-AI-011` | Fusion not on all orchestrators | 1 |
| `DEBT-AI-012` | chatStream bypasses hardening | 1 |
| `DEBT-AI-013` | Router misclassification SPOF | 1 |
| `DEBT-AI-014` | JSON repair semantic gap | 2 |
| `DEBT-AI-015` | Fail-closed verify UX freeze | 3 |
| `DEBT-AI-016` | observe default in job runner | 2 |

### 7.2 Billing & finance (14)

| ID | Summary | Tier |
|----|---------|------|
| `DEBT-FIN-001` | Storage release race | 3 |
| `DEBT-FIN-002` | Credit balance O(N) | 2 |
| `DEBT-FIN-003` | Admin finance heap OOM | 2 |
| `DEBT-FIN-004` | storageUsed falsy zero bug | 3 |
| `DEBT-FIN-005` | Webhook no plan downgrade | **1** |
| `DEBT-FIN-006` | Transfer race | **1** |
| `DEBT-FIN-007` | Reservations ignored in balance | **1** |
| `DEBT-FIN-008` | No token weights | **1** |
| `DEBT-FIN-009` | No two-phase AI settle | **1** |
| `DEBT-FIN-010` | plans vs plan-limits drift | **1** |
| `DEBT-FIN-011` | usageBucket row lock | **1** |
| `DEBT-FIN-012` | Transfer deadlock order | **1** |
| `DEBT-FIN-013` | Lazy Stripe reconcile missing | **1** |
| `DEBT-BILLING-001` | BYOK not implemented | **1** |

### 7.3 Data & platform (10)

| ID | Summary | Tier |
|----|---------|------|
| `DEBT-DB-001` | McpServer missing | 2 |
| `DEBT-DB-002` | PluginInstall missing | 2 |
| `DEBT-DB-003` | MCP false 201 | **1** |
| `DEBT-RENDER-001` | RenderJob missing | 2 |
| `DEBT-RENDER-002` | GLB fake job poll 404 | 2 |
| `DEBT-RENDER-003` | AAA render stubs | 2 |
| `DEBT-PLUGIN-001` | Plugin APIs stub | 2 |
| `DEBT-EXT-001` | vm extension host unsafe | **1** |
| `DEBT-INFRA-001` | R2/deploy not wired | 2 |
| `DEBT-SSR-001` | document in asset pipeline | 3 |

### 7.4 Engine & simulation (18)

| ID | Summary |
|----|---------|
| `DEBT-FOLIAGE-001` | removeCluster clears all instances |
| `DEBT-CLOUD-001` | Volumetric clouds placebo |
| `DEBT-MOTION-001` | Motion matching heap + O(N) |
| `DEBT-NET-001` | JSON netcode clone |
| `DEBT-DEST-001` | Fake fracture geometry |
| `DEBT-CLOTH-001` | CPU cloth + GPU no collision |
| `DEBT-PERF-001` | Niagara GC jitter |
| `DEBT-PERF-002` | Sync BVH rebuild |
| `DEBT-PERF-003` | Foliage painter per-mesh |
| `DEBT-PERF-004` | Water CPU Gerstner |
| `DEBT-TERRAIN-001` | Smooth brush identity |
| `DEBT-ASSET-001` | GLTF flatten |
| `DEBT-RT-001` | Path trace flat normals |
| `DEBT-VT-001` | VT feedback never rendered |
| `DEBT-NANITE-001` | Subsample LOD not Nanite |
| `DEBT-NIAGARA-002` | Graph cosmetic only |
| `DEBT-SAVE-001` | Base64 not compression |
| `DEBT-STUDIO-001` | Film/VFX mock UI |

### 7.5 Desktop (8)

| ID | Summary |
|----|---------|
| `DEBT-DESK-001` | Desktop shell not product IDE |
| `DEBT-DESK-002` | Terminal held |
| `DEBT-DESK-003` | fs_watch events discarded |
| `DEBT-DESK-004` | ai_complete unavailable |
| `DEBT-DESK-005` | No zero-copy IPC |
| `DEBT-DESK-006` | native_kernel manifest drift |
| `DEBT-DESK-007` | Electron templates duplicate |
| `DEBT-TERM-001` | PTY on cloud server |

### 7.6 Collab, stream, search (12)

| ID | Summary |
|----|---------|
| `DEBT-YJS-001` | Yjs no applyUpdate |
| `DEBT-WS-001`–`003` | WS split / leak / orphan emits |
| `DEBT-STREAM-001`–`002` | Pixel streaming held |
| `DEBT-SSE-001` | Fleet SSE empty |
| `DEBT-SEARCH-001`–`003` | Ripgrep path / fake embed / 120 file cap |
| `DEBT-LSP-001`–`002` | LSP mock dead / 501 routes |

### 7.7 UX, admin, ops (11)

| ID | Summary |
|----|---------|
| `DEBT-UX-DASH-001` | Banner stack |
| `DEBT-UX-DASH-002` | AI-tunneling |
| `DEBT-UX-DOCK-001` | Dock split broken |
| `DEBT-UX-VS-001` | VS save clipboard only |
| `DEBT-UX-GIT-001` | Git panel empty |
| `DEBT-UX-CANVAS-001` | Nexus canvas deprecated |
| `DEBT-UX-HITLIST-001` | A4–A50 hitlist |
| `DEBT-UX-EV-001` | Visual evidence pipe |
| `DEBT-ADMIN-001`–`002` | Stub generator / orphan routes |
| `DEBT-ROUTE-001` | Route inflation |
| `DEBT-CSP-001` | CSP loopback |
| `DEBT-OPS-001` | Fail-closed rate limit |

### 7.8 Audio / VR / misc (5)

`DEBT-AUDIO-001`, `DEBT-AUDIO-002`, `DEBT-VR-001`, `DEBT-NEXUS-001`, `DEBT-SEQ-001`–`003`, `DEBT-SIDECAR-001`

**Resolved:** `DEBT-AUDIT-001`

Full evidence lines: [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md)

---

## 8. Quality bar & anti-patterns

From [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md) — **non-negotiable:**

| Dimension | Market bar |
|-----------|------------|
| Honesty | Held manifest + gate; no rename placebo |
| Performance | No sync GPU readback in frame loop |
| Data fidelity | No silent loss (foliage, rigs, netcode) |
| Physics | Rapier WASM; no JS fake fragments |
| IDE | Dock persistence, virtualized trees, single AI spine |
| Billing | Weighted tokens; two-phase settle; BYOK never logged |

**Reject:** subsample LOD called Nanite; darken shader called foveation; `clear()` foliage fix; single-file tweak when Wave lists 8+ files.

---

## 9. Key source files (executor map)

| Domain | Paths |
|--------|-------|
| Plans | `lib/plans.ts`, `lib/plan-limits.ts`, `lib/entitlements.ts` |
| Metering | `lib/metering.ts`, `lib/credit-wallet.ts`, `lib/ai/model-cost-weights.ts` (new) |
| Stripe | `lib/stripe.ts`, `app/api/billing/webhook/route.ts`, `checkout/route.ts` |
| Middleware | `middleware.ts` |
| Projects | `app/api/projects/route.ts`, `app/api/quotas/route.ts`, `lib/server/quota-middleware.ts` |
| AI routes | `app/api/ai/chat/route.ts`, `stream/route.ts`, `lib/plan-limits.ts` |
| Marketplace | `app/marketplace/page.tsx`, `app/api/plugins/install/route.ts` |
| Render | `app/api/render/jobs/[jobId]/route.ts`, `prisma/schema.prisma` |
| Dashboard | `components/dashboard/*`, `DashboardEntryIntentBanner.tsx` |
| Collab | `lib/server/websocket/legacy-collaboration-handler.ts` |
| Terminal | `components/terminal/*`, `lib/server/terminal-pty-runtime.ts` |
| Tauri | `apps/studio-local/`, `src-tauri/src/desktop_commands.rs` |
| Delete | `runtime-templates/` (Electron) |

---

## 10. Executor prompts (all Waves)

### Wave 6
```
Execute Wave 6 per CLAUDE_MASTER_BRIEF.md.
Read contracts_planning.md §3–4, implementation_plan.md §1–7, CLAUDE_MEGA_WAVES.md Wave 6.
Unify plans.ts ↔ plan-limits.ts; token weights; two-phase billing; Redis buffer; Stripe webhook downgrade; BYOK proxy MVP; Prisma RenderJob + McpServer.
npm run qa:enterprise-gate PASS before/after. One mega-series.
```

### Wave 7
```
Execute Wave 7 per CLAUDE_MASTER_BRIEF.md.
CSP loopback; tiered fail-open; IDE generosity (agents/workspaces/marketplace); Resume Workspace; cloud/local dashboard; admin orphan fix; remove runtime-templates/.
Reconcile audit #8–17, #21–25. Gate PASS.
```

### Wave 8 (business — Arcade/Marketplace)
```
Execute business Wave 8 per contracts_planning.md §11–13.
Arcade publish + feedback→tasks; marketplace remix clone; asset gateway; honest install path.
IMPROVE-ARCADE-001, IMPROVE-MKT-001/002. Gate PASS.
```

### Wave 9
```
Execute Wave 9 per CLAUDE_MEGA_WAVES.md.
Tauri PTY on user machine; fs_watch bridge; terminal cloud bridge; ONNX sidecar or honest held manifest.
DEBT-TERM-001, DESK-002–004. Gate PASS.
```

### Wave 1 (when billing stable)
```
Execute Wave 1 per CLAUDE_MEGA_WAVES.md.
Unify LLM stacks; single agent loop; wire chatStream hardening; SEARCH-002 embeddings path.
```

---

## 11. `IMPROVE-*` index by business Wave

| Wave | IDs (representative) |
|------|---------------------|
| **6** | `IMPROVE-BILLING-001`, `003`, `005`, `006`, `IMPROVE-PLATFORM-003`, `007`, `IMPROVE-UX-007` |
| **7** | `IMPROVE-UX-008`, `009`, `IMPROVE-BILLING-007`, `IMPROVE-COLLAB-005`, `006`, `IMPROVE-IDE-018`–`022`, `IMPROVE-ENG-023`, `IMPROVE-FILM-001`, `IMPROVE-VS-012` |
| **8** | `IMPROVE-ARCADE-001`, `IMPROVE-MKT-001`, `002`, `IMPROVE-PLATFORM-008` |
| **9** | `IMPROVE-DESK-001`, `003`, `004`, `005`, `IMPROVE-AI-002` |

Full list: [`FUTURE_IMPROVEMENTS_REGISTRY.md`](./FUTURE_IMPROVEMENTS_REGISTRY.md)

---

## 12. Status dashboard

| Layer | Spec | Code | Wave |
|-------|------|------|------|
| Billing/contracts | ✅ 100% | ❌ | 6 |
| UX generosity | ✅ 100% | ❌ | 7 |
| Ops resilience | ✅ 100% | ❌ | 7 |
| Social (Arcade/MKT) | ✅ 100% | ❌ | 8 |
| Desktop native | ✅ 100% | ❌ | 9 |
| AI spine | ✅ 100% | ⚠️ partial | 1 |
| Engine sim | ✅ documented | ❌ placebos | 2–5 |
| Enterprise gate | — | ✅ GREEN | 0 |

---

## 13. Changelog

| Date | Change |
|------|--------|
| 2026-06-17 | v1 — Master brief: competitive north star, full DEBT catalog, wave prompts, self-critique |
