# Aethel Engine — Supremacy Execution Playbook

**Version:** 1.1 (Chief Architect — Planning 100%)  
**Status:** Operational companion — **how** to execute Ondas A→M + Studio S1→S7 + Platform H/I  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.7  
**Completeness:** [`AETHEL_PLANNING_COMPLETENESS.md`](AETHEL_PLANNING_COMPLETENESS.md) — **A.0 100%**
**Master index:** [`AETHEL_STUDIO_SUPREMACY_INDEX.md`](AETHEL_STUDIO_SUPREMACY_INDEX.md) v1.2  
**Checklist:** [`.cursor/plans/blueprint_de_supremacia_aaa_a7b2ca8f.plan.md`](../../.cursor/plans/blueprint_de_supremacia_aaa_a7b2ca8f.plan.md)

---

## Purpose

Planning specs define **what** and **why**. This playbook defines **how executors ship without regressing supremacy laws** — golden fixtures, test pyramid, PR decision tree, and cross-wave integration gates.

**Audience:** Implementing agents, reviewers, Chief Architect gatekeepers.

---

## Executor decision tree (every PR)

```
PR opened
  │
  ├─ Touches dead code (src/, client/, root lib/)? → REJECT (Frente N3)
  │
  ├─ Touches .rs? → cargo check + clippy + test REQUIRED (Law XI)
  │
  ├─ Touches creative/agent? → Trava I + II (+ III if video)
  │
  ├─ Touches render/sim? → G-readiness + K.0 + M.0 hooks
  │
  ├─ Touches material/world/anim/audio/gameplay/net/content?
  │     └─ Matching S-readiness checklist (Studio Index)
  │
  ├─ Introduces mock/stub in ship path? → REJECT (Zero-MVP)
  │
  ├─ Marketing copy in UI/docs exceeds Platform Reality? → REJECT
  │
  └─ All gates green → merge + ledger evidence if agent-driven
```

---

## Golden fixture catalog (binding test assets)

Every acceptance suite references **fixed fixtures** stored under `cloud-web-app/web/test-fixtures/supremacy/` (create on first wave PR).

| Fixture ID | Domain | Used by | Acceptance |
|------------|--------|---------|------------|
| **GF-MAT-001** | Hero PBR 20-layer material graph | S1, G.3, M.1 | WGSL hash stable; ΔE < 5 vs reference PNG |
| **GF-WORLD-001** | 1 km² partition + PCG dungeon graph | S2 | ≥ 500 instances; cell load p95 |
| **GF-WORLD-002** | 50 km² desktop soak (generated) | S2, M.2 | 30min fly-through OOM=0 |
| **GF-ANIM-001** | 60s cinematic (cam+light+skel) | S3, J.9 | MP4 evidence export |
| **GF-ANIM-002** | Mocap retarget pair (2 skeletons) | S3, S7 | Golden clip hash |
| **GF-AUDIO-001** | 10-layer combat MetaSounds graph | S4 | 0 GC @ 60 FPS |
| **GF-GAS-001** | 3 abilities + tags + data assets | S5 | IPC binary @ 60Hz |
| **GF-MASS-001** | 10k entity SoA scene | S5, M.3 | Main thread idle |
| **GF-NET-001** | 100-player seeded soak | S6, G.2 | 1h desync hash=0 |
| **GF-USD-001** | Hero character USD (no capsule) | S7, J.7 | Cook < 60s |
| **GF-MESH-001** | 1M meshlet stress scene | G.3a | 60 FPS RTX 3060 1080p |
| **GF-RAD-001** | Dynamic sun GI scene | G.3b–c | No black probes; 4ms GPU |
| **GF-ENT-001** | 100k GPU particles + fracture | G.3d–e | 0 GC sim path |
| **GF-PSO-001** | Biome material permutation set | M.1 | ≤1 spike >8ms with vault |
| **GF-SPLAT-001** | Hero 1M splat + Micro-Poly occluder | K.3 | Depth correct occlusion |
| **GF-XR-001** | Quest-class test scene | K.4 | 90 FPS discrete blueprint |
| **GF-FORGE-001** | Seeded bug Next.js repo | L.6 | Autonomous fix-test cycle |
| **GF-AI-001** | 3 game-production spine graphs | J.12 | Evidence-complete missions |
| **GF-COMMERCE-001** | Purchase → backpack → equip flow | H.3–H.5 | End-to-end Playwright |
| **GF-COMMERCE-002** | Chargeback revoke simulation | H.8 | Item removed < 60s |
| **GF-COMMERCE-003** | Universal cosmetic stat-neutral | H.4 | GAS stats unchanged |
| **GF-COMMERCE-004** | Blue/green match drain | H.7 | Zero mid-combat disconnect |
| **GF-COMMERCE-005** | Oversize asset cook reject | H.2 | 403 publish |
| **GF-HUB-001** | Discovery launch guarantee | I.1 | 2k impressions logged |
| **GF-HUB-002** | Verified review gate | I.2 | Blocked < 7200s |
| **GF-HUB-003** | Web demo slice ≤150 MB | I.3 | Playable in browser |
| **GF-HUB-004** | Deep link join session | I.4 | Friend join success |
| **GF-HUB-005** | Cross-save round-trip | I.7 | Blob hash match |
| **GF-HUB-006** | Showcase page vitrine | I.6 | All blocks render |

**Rule:** No marketing claim for domain X until **GF-* for X** passes in CI nightly.

---

## Golden fixture file structure (create on A.1)

```
cloud-web-app/web/test-fixtures/supremacy/
├── README.md                    # fixture index + hash update procedure
├── gf-mat-001/
│   ├── graph.json               # Material graph source
│   ├── expected.wgsl.hash       # SHA256 golden
│   └── reference.png            # ΔE comparison
├── gf-world-001/
│   ├── partition.json
│   ├── pcg-graph.json
│   └── min-instances.json       # { desktop: 500, web: 50 }
├── gf-commerce-001/
│   └── purchase-flow.spec.ts    # Playwright
└── manifest.json                # { fixtureId, version, specs[] }
```

**Hash update protocol:** Chief Architect or QA lead approves golden hash changes in dedicated PR — never silent drift.

---

## Test pyramid (Onda G.1 extends Vitest)

| Tier | Scope | Runs when | Examples |
|------|-------|-----------|----------|
| **L0 Unit** | Pure functions, compilers, hash golden | Every PR | Material WGSL hash, MetaSounds DAG hash, tag bitset |
| **L1 Integration** | Module wiring, IPC, cook stages | Every PR touching domain | GAS IPC round-trip, terrain → partition |
| **L2 Viewport** | Headless WebGPU/wgpu render | Nightly | GF-MESH-001 visibility buffer hash |
| **L3 E2E** | Playwright studio flows | Nightly + release | Publish pipeline, Hub demo play |
| **L4 Soak** | Long-run memory/net | Weekly | GF-WORLD-002, GF-NET-001 |
| **L5 Chaos** | Fault injection | Pre-release | WASM trap recovery, sandbox orphan, DS fallback |

---

## Full wave integration matrix

| Wave | Primary deliverable | S hooks | G hooks | K/M/L/J hooks | Blockers |
|------|---------------------|---------|---------|---------------|----------|
| **A.1** | Terrain wire | S2.0 | cook meshlets path | — | `DEBT-RENDER-003` partial |
| **A.2** | Cook manifest v2 | S7.0 | meshlet pages | M.0 slots | — |
| **A.5** | Agent bus UI | — | — | J.2, L-readiness | `DEBT-AI-012` |
| **B** | Tauri gateway + SAB | S5 IPC prep | bindless init | M.2 IO sidecar | COOP/COEP |
| **C** | Render Graph + bindless | S1.0, S5.0, S6.0 | **foundation** | K.0 velocity, M.0 PSO | Law V |
| **D** | TAA/SSR + VT | S1.1–S1.2, S2.2–S2.3, S3.0 | RT node | K.0 async compute | — |
| **E** | AAA subsystems | S3.1–S3.3, S4.*, S5.3 | Entropy prep | — | Law III |
| **F** | LiveOps + telemetry | — | G.1 pyramid | H.0 revenue lanes | F.2 playtime |
| **G** | Nuclear + netcode | S1.3, S2.4, S5.4, S6.* | **G.3 ship** | K permutations in vault | DEBT-NANITE |
| **H** | Treasury + Backpack | S7.4 | — | — | `payouts.ts` 12% vs 30% |
| **I** | Game Hub | — | G.2 cross-play | — | F.2 reviews |
| **J** | Creative Nexus | S7.1 USD | preset tuning only | L.14 absorbs J.3 | J.1 split |
| **L** | Universal IDE | multi-surface | — | post J.1 | E2B |
| **M** | Runtime immunity | S1 fingerprints | G.3 PSO enum | S5 WASM | post C |
| **K** | Vanguard | S2 splat pages | non-regress G | M.1 optional set | post G |

---

## Effort guidance (planning — not commitments)

Rough **engineering-weeks** per milestone for staffing models (1 senior + 1 mid parallel):

| Milestone | Weeks | Critical skill |
|-----------|-------|----------------|
| A.1–A.6 | 4–6 | Full-stack + R3F |
| B | 3–4 | Rust/wgpu |
| C | 6–8 | GPU + render graph |
| D | 4–6 | Shaders + VT |
| E | 5–7 | Animation + audio |
| G.3 nuclear | 10–14 | GPU + Rust |
| S1–S7 STUDIO-ζ | 12–16 | Tools + pipeline (parallel C→G) |
| J AI-v1 | 8–10 | Agents + providers |
| L FORGE-v1 | 10–12 | Sandbox + LSP |
| M IMMUNITY-v1 | 6–8 | Rust IO + WASM |
| K Vanguard | 8–10 | ONNX + XR |

**Launch Hard Gate #72 (doctrine 2026-08-12) supersedes "Wedge #1 ships without G".** No public launch at **A.5 + partial I** without G, K, L, M, STUDIO-ζ — and P2/P3/P4 — acceptance-green **together**. Capability trains still run in parallel; the **launch** waits for the gate.

---

## CI gate registry (extend `package.json` scripts)

| Gate ID | Command | Blocks |
|---------|---------|--------|
| **GATE-TS** | `npm run typecheck && npm run lint && npm run test` | All web PRs |
| **GATE-RUST** | `cargo check && cargo clippy && cargo test` | All `.rs` PRs |
| **GATE-QA-COLORS** | `npm run qa:hardcoded-colors` | UI/render PRs |
| **GATE-QA-DS** | `npm run qa:design-system-consistency` | UI PRs |
| **GATE-GOLDEN-WGSL** | `npm run qa:golden-wgsl` (add S1) | Material PRs |
| **GATE-GOLDEN-AUDIO** | `npm run qa:golden-metasounds` (add S4) | Audio PRs |
| **GATE-ANTI-MOCK** | `npm run qa:anti-mock-ship-path` (add) | All PRs |
| **GATE-PSO-FP** | `npm run qa:pso-fingerprint-export` (add M.0) | Render PRs |
| **GATE-COMMERCE** | `npm run qa:commerce-e2e` (add H) | Commerce PRs |
| **GATE-HUB** | `npm run qa:hub-discovery` (add I) | Hub PRs |
| **GATE-CAPABILITY** | `npm run qa:capability-score-manifest` (add XV) | Export PRs |
| **GATE-ENTERPRISE** | `npm run qa:enterprise-gate` | IMPROVE-* work |

---

## PR evidence requirements (agent-driven changes)

When PR originates from Fusion/Forge agent:

1. `task-evidence-ledger` entry ID in PR description
2. `CreativeFusionTransaction` id if manifest/viewport touched
3. CostGuard reservation + settle ids if generative
4. Screenshot or WebM for viewport-visible changes (J.9)
5. Golden hash delta if compiler output changed

---

## Rollback & migration policy

| Change type | Policy |
|-------------|--------|
| G-buffer layout | Versioned `GBufferLayoutId`; migration shader pass |
| Cook manifest v2 | Backward read v1 for 2 releases |
| PSO vault blob | `wgpuCacheFormatVersion` bump → re-download, never crash |
| WASM module ABI | Syscall version table; old modules rejected with clear error |
| Yjs schema | CRDT — forward compatible; no destructive migrations |

---

## Cross-links

| Document | Role |
|----------|------|
| `AETHEL_STUDIO_SUPREMACY_INDEX.md` | Spec map + risks |
| `AI_CRITIQUE_DEBT_REGISTRY.md` | DEBT blockers |
| `FUTURE_IMPROVEMENTS_REGISTRY.md` | IMPROVE after debts |
| `AETHEL_AAA_PARITY_TARGETS.md` | G.3 nuclear acceptance |
| All `AETHEL_*_SPEC.md` | Domain depth |
| `AETHEL_PLANNING_COMPLETENESS.md` | 100% planning certificate |
| `AETHEL_UE5_ARTIST_MIGRATION_GUIDE.md` | Artist onboarding |

**Planning status:** Playbook v1.1 — **planning 100% complete**. Implementation of GF-* files begins at A.1.
