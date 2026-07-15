# Aethel Engine — Universal IDE Forge Spec (Onda L)

**Version:** 1.1 (Chief Architect — Deepened)  
**Status:** **Binding** — **Onda L (Aethel Forge)** — Universal Software Engineering IDE  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.6  
**Studio cross-links:** L.14 MultiSurfaceContext; S7 cook for agent context
**Extends:** [`AETHEL_AI_FUSION_CREATIVE_SPEC.md`](AETHEL_AI_FUSION_CREATIVE_SPEC.md) (Law XI + XVI + Onda J)  
**Laws:** **XI** (Fusion + validation gates), **XVI** (Creative Fusion custody), **VIII** (airgapped / offline context), **IX** (Cost Guard on sandbox minutes)

---

## Executive mandate

Aethel is a **Universal IDE** — not only games and 3D. Onda L closes the gap vs **Cursor** (code comprehension), **v0 / Lovable** (Agentic UI + live preview), and **Devin** (autonomous engineering in sandbox).

**Engineering cost vs Wedge (binding decision #51):**
- **Now (Ondas A–F):** no Forge ship — only **L-readiness hooks** (preview E2B env vars documented, agent-tool-bus `cloud-sandbox` target reserved).
- **Onda L (parallel post J.1):** native Forge stack — **does NOT delay** Wedge #1, RTv1 Hub, or A.1 terrain.
- **Prerequisite:** **J.1** (`CreativeBridge` + `CreativeCostGuard`) — single agent choke point before any sandbox minute is billed.

**Sandbox billing (binding):** Forge minutes debit **`UsageBucket`** reserve/settle before session start — see [`AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md`](AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md) §4.3. **Minute caps not yet in `plans.ts`** — do not document fictional quotas until Wave 6 / L.1 adds them. Free/Starter = no sandbox until entitlement ships.

**Zero-MVP:** No "Cursor killer," "Devin parity," or "v0-class Agentic UI" marketing until L acceptance suites pass.

---

## Universal IDE Doctrine (binding)

1. **Agent never touches host OS shell** — Decision #48. Human users may use native PTY (Tauri); agents use **ForgeSandboxExecutor** only.
2. **Every agent write passes ProjectValidationGate** — Decision #49. TS/TSX: `typecheck` + `lint`; Rust: `cargo check` + `clippy` + `test`; in **sandbox**, not host.
3. **Every sandbox session is evidence-backed** — stdout/stderr, exit codes, cost, teardown → `task-evidence-ledger`.
4. **Multi-surface context, not code-only RAG** — **L.14 MultiSurfaceContextPack** supersedes standalone **J.3 SceneContextPack** (Decision #50).
5. **Marketing honesty** — Fusion/MoA claims obey Swarm **§0a Canonical Anti-Hype Anchor** (reliability ≠ 5s perfection; Maestro writes nucleus).
5. **Preview ≠ Engineering sandbox** — E2B preview infra is **reused** (Decision #52); Forge adds agent lifecycle, policy, and validation loop.

---

## State today (audit — honest)

| Capability | Status | Evidence |
|------------|--------|----------|
| Agent tool bus + sandbox policy types | **REAL (spec)** | `agent-tool-bus.ts`, `cloud-sandbox` target |
| Agent tool job runner | **REAL (partial)** | `agent-tool-job-runner.ts` — observe/enforced; no sandbox exec |
| E2B preview provision/sync | **REAL (partial)** | `preview-runtime-*`, `runtime-sync` — human preview path |
| Forge sandbox executor | **AUSENTE** | No agent → E2B/Firecracker kernel |
| DevContainer manifest | **AUSENTE** | — |
| Agent on host PTY | **RISK** | `desktop_commands.rs` PTY real — **must not** wire to agent |
| ProjectValidationGate (Law XI hard) | **PARTIAL** | `change-validation.ts` = single-file TS parse; not project typecheck |
| Self-reflection critic | **PARTIAL** | LLM critique only — does not run test suite |
| Repository Cartography | **REAL** | `repository-cartography.ts` |
| Semantic code search | **PARTIAL** | Hash bag-of-words — not RepoGraphRAG |
| VectorIndex SQLite-vec | **AUSENTE** | J.4 planned; `semantic-code-search.ts` hash embed |
| SceneContextPack | **AUSENTE** | → **L.14** |
| Monaco LSP bridge (client) | **REAL** | `monaco-lsp-bridge.ts` |
| Universal LSP server farm | **AUSENTE** | `DEFAULT_LSP_WS_URL` localhost stub |
| Agentic UI (Magic Wand) | **SEED** | `useMagicWand.ts`, `RuntimePreviewSurface` |
| AgenticUIStudio Viewport 2D | **AUSENTE** | No DOM tree / props panel |
| FullStackScaffoldEngine | **AUSENTE** | — |
| AutonomousEngineerLoop | **AUSENTE** | — |
| BrowserOperator Playwright | **PARTIAL** | J.8 CORE governed fetch + ledger (2026-07-11ai); full CDP farm **HELD** |

**Implementation score today:** ~2/10 Universal IDE loop. **Architecture score on paper (post L spec):** ~9/10.

---

## Onda L delivery map

### Pilar L.A — Autonomous Engineering & Secure Sandbox (Devin-class)

| Step | Deliverable | Depends | Ship |
|------|-------------|---------|------|
| **L.1** | **ForgeSandboxExecutor** — agent tool → E2B/Firecracker create/connect/exec/teardown; CostGuard per minute | J.1, E2B preview infra | L |
| **L.2** | **DevContainerManifest** — `.aethel/devcontainer.json` + template registry (Node, Python, Rust, Next, Vite) | L.1 | L |
| **L.3** | **AgentShellPolicy** — agent forbidden on host PTY; network egress allowlist; secrets injection policy | L.1, agent-tool-bus | L |
| **L.4** | **ForgeTerminalBridge** — xterm → sandbox PTY via WSS; stream → evidence ledger | L.1, terminal components | L |
| **L.5** | **ProjectValidationGate** — sandbox typecheck/lint/test; **blocks apply**; **feeds Auto-Heal**; **requires LazyInspector PASS (#66) first** | L.1, Law XI, #66 | L |
| **L.6** | **AutonomousEngineerLoop** — Laws → Maestro/MoA → **LazyInspector (#66)** → **L.5 → Heal×≤3** → APPLY | L.1–L.5, J.1, #60–#62, **#66** | L |

### Pilar L.B — Agentic UI & Viewport 2D (v0 / Lovable-class)

| Step | Deliverable | Depends | Ship |
|------|-------------|---------|------|
| **L.7** | **AgenticUIStudio** — Viewport 2D: DOM tree, props inspector, design token picker, Magic Wand → agent bus | J.2, preview | L |
| **L.8** | **PreviewOrchestrator** — inline / local dev server / E2B HMR; agent selects strategy; sync state in context | L.1, preview runtime | L |
| **L.9** | **FullStackScaffoldEngine** — Next 14 / Vite / static templates; provision sandbox + open preview | L.1, L.2 | L |
| **L.10** | **DesignTokenSync** — prompt → `var(--aethel-*)` + Tailwind; QA `hardcoded-colors` gate | L.7, Law X | L |
| **L.11** | **UIMutationTransaction** — Trava II extension: TSX + CSS + preview DOM in one Yjs undo | J.1 Trava II | L |

### Pilar L.C — Supreme Code Comprehension (Cursor-class)

| Step | Deliverable | Depends | Ship |
|------|-------------|---------|------|
| **L.12** | **RepoGraphRAG** — import/call graph + cartography; **neighborhood slices for packs** (not whole-repo prompt dump); supersedes hash-only RAG | J.4 VectorIndex, cartography | L |
| **L.13** | **UniversalLspFarm** — language server sidecars (Tauri spawn + cloud relay); Monaco bridge auto-connect | B sidecar, Monaco | L |
| **L.14** | **MultiSurfaceContextPack** — code + cartography + scene/VS/terrain + preview DOM + terminal tail + validation errors; **absorbs J.3**; **`tokenBudget` hard truncate** (Decision #54) | J.4, L.12, deep-context | L |

**Parallel to Wedge:** L does **not** block A.1–A.6, RTv1, H, I, or K. **Blocks:** "Universal IDE" / "Devin parity" / "Cursor killer" marketing only.

---

## Architecture (target)

```mermaid
flowchart TB
  subgraph UI["Nexus UI + AgenticUIStudio L.7"]
    Chat[AI Console]
    V2D[Viewport 2D DOM/Props]
    Prev[PreviewOrchestrator L.8]
  end

  subgraph Forge["Onda L — Aethel Forge"]
    SB[ForgeSandboxExecutor L.1]
    DC[DevContainerManifest L.2]
    POL[AgentShellPolicy L.3]
    TERM[ForgeTerminalBridge L.4]
    GATE[ProjectValidationGate L.5]
    LOOP[AutonomousEngineerLoop L.6]
    CTX[MultiSurfaceContextPack L.14]
    RAG[RepoGraphRAG L.12]
    LSP[UniversalLspFarm L.13]
  end

  subgraph J["Onda J — shared choke"]
    Bridge[J.1 CreativeBridge]
    CostG[CreativeCostGuard]
    Yjs[CreativeFusionTransaction]
  end

  subgraph Fusion["Law XI"]
    Actor[Actor]
    Critic[Critic REJECTS]
  end

  UI --> Bridge
  Bridge --> CostG --> SB
  Actor --> SB
  SB --> GATE
  GATE --> Critic
  Critic --> Yjs
  CTX --> Actor
  RAG --> CTX
  LSP --> Actor
  LOOP --> GATE
  TERM --> SB
  Prev --> SB
```

---

## Contracts (binding interfaces)

### `ForgeSandboxSession`

```typescript
export interface ForgeSandboxSession {
  sessionId: string;
  provider: 'e2b' | 'firecracker' | 'local-isolated';
  devcontainerRef?: string;
  projectId: string;
  agentMode: AgentMode;
  networkPolicy: 'none' | 'npm-registry' | 'allowlist';
  costGuardReservationId: string;  // Trava I — required
  evidenceLedgerId: string;
  createdAt: string;
  teardownAt?: string;
}
```

### `ProjectValidationGateResult`

```typescript
export interface ProjectValidationGateResult {
  verdict: 'PASS' | 'BLOCK';
  checks: Array<{
    id: 'typecheck' | 'lint' | 'test' | 'cargo-check' | 'cargo-clippy' | 'cargo-test';
    status: 'pass' | 'fail' | 'skipped';
    logRef: string;  // evidence ledger
  }>;
  sandboxSessionId: string;
}
```

### `MultiSurfaceContextPack` (supersedes J.3 SceneContextPack)

**Modular surfaces (binding):** The pack is **one schema**, not one dump. The pack builder **enables only active surfaces** for the current workspace / task — unused slices stay **omitted** (not empty stubs that burn `tokenBudget`).

| Active work | Surfaces ON (typical) | Surfaces OFF |
|-------------|----------------------|--------------|
| **Game / 3D** | `codeChunks` + `sceneSelection` / VS / terrain + `capabilityScore` + validation | Heavy `previewDomSnapshot` unless editing UI overlay |
| **React / Next site** | `codeChunks` + `previewDomSnapshot` + CSS/token context + preview console errors | Scene/terrain/VS 3D slices |
| **Python / server / CLI** | `codeChunks` + `terminalTail` + `lastValidationGate` | Scene + DOM preview |
| **Mixed mission** | Maestro may attach **multiple** surfaces — still hard-capped by `tokenBudget` (#54) |

**Same MoA / Maestro / L.5 / #66 stack** reads this pack regardless of domain — intelligence does not fork into “game AI” vs “web AI”; **context adapts**, orchestration stays one Fusion spine. Anti-Hype §0a still applies (reliability, not “perfect in 5s”).

```typescript
export interface MultiSurfaceContextPack {
  projectId: string;
  /** Code — cartography + vector + repo graph */
  repositoryManifestId?: string;
  codeChunks: ContextChunk[];
  repoGraphSlice?: { symbol: string; callers: string[]; callees: string[] };
  /** Creative — from engine (J domain) — omit when not in game/3D mode */
  sceneSelection?: string[];
  visualScriptGraphRef?: string;
  terrainChunkRef?: string;
  capabilityScore?: number;
  /** Engineering — Forge domain — omit when not in web/preview mode */
  previewDomSnapshot?: string;
  previewConsoleErrors?: string[];
  /** Terminal — omit when not debugging runtime/CLI */
  terminalTail?: string;
  lastValidationGate?: ProjectValidationGateResult;
  /** Hard cap — pack builder MUST truncate; agent prompts without pack denied (Decision #54) */
  tokenBudget: number;
  /** Measured after build — must be ≤ tokenBudget */
  tokenCount?: number;
  /** Which surfaces were enabled for this build (telemetry + Critic) */
  activeSurfaces?: Array<'code' | 'scene' | 'dom' | 'terminal' | 'validation'>;
}
```

**Default budgets (binding):** chat 2K · Worker 1.5K · Maestro 2.5K · Critic 1.2K · world step 3K. See [`AETHEL_INTELLIGENT_ROUTING_AND_CONTEXT_COMPRESSION.md`](./AETHEL_INTELLIGENT_ROUTING_AND_CONTEXT_COMPRESSION.md) §2.

| Module | Path |
|--------|------|
| Sandbox executor | `lib/production/forge-sandbox-executor.ts` |
| DevContainer registry | `lib/production/devcontainer-manifest.ts` |
| Agent shell policy | `lib/production/agent-shell-policy.ts` |
| Terminal bridge | `lib/server/forge-terminal-bridge.ts` |
| Validation gate | `lib/production/project-validation-gate.ts` |
| Engineer loop | `lib/production/autonomous-engineer-loop.ts` |
| Agentic UI studio | `packages/ide-ui/AgenticUIStudio.tsx` |
| Preview orchestrator | `lib/server/preview-orchestrator.ts` |
| Full-stack scaffold | `lib/production/fullstack-scaffold-engine.ts` |
| Design token sync | `lib/production/design-token-sync.ts` |
| UI mutation tx | `lib/production/ui-mutation-transaction.ts` |
| Repo graph RAG | `lib/server/repo-graph-rag/` |
| LSP farm | `apps/studio-local/src-tauri/src/lsp_farm.rs` + `lib/server/universal-lsp-relay.ts` |
| Multi-surface context | `lib/production/multi-surface-context-pack.ts` |
| **Domain economic router (cx)** | `lib/ai/domain-economic-router-policy.ts` — UI/panels → Sonnet-class; kernel/physics → Grok/Opus/reasoning; CostGuard settle:0 on reject |
| **WeeklyEvolutionPlanner (cx)** | `lib/production/weekly-evolution-planner.ts` — root-cause Master Plan proposals; band-aid ban; Founder approve/reject |
| **HotFixEventBus (cx)** | `lib/production/hot-fix-event-bus.ts` — event-driven hot fixes; continuous Opus polling forbidden |
| **AutonomousEngineerLoop wire (cx)** | `lib/production/autonomous-engineer-loop.ts` — cadence → Apex mission + LazyInspector; L.1 sandbox still HELD |
| **UIMutationTransaction (cx)** | `lib/production/ui-mutation-transaction.ts` — L.11 Trava II TSX+CSS+preview DOM |
| **FounderEvolutionInbox (cx)** | `components/agents/window/FounderEvolutionInbox.tsx` — AgentsWindow Evolution tab (IDE only; Zero-UI in game) |
| **Quality competitor radar (cx)** | `lib/production/quality-competitor-radar.ts` — honesty APIs only; fake Unreal FPS forbidden |
| **Community AAA audit (cx)** | `lib/production/community-publish-aaa-audit.ts` — fail-closed light/mesh suggestions + CreativeBridge/CostGuard offer |

### FinOps + Founder God Mode (letter cx — 2026-07-13)

**Binding thesis:** War room = **Aethel Studio / AgentsWindow** + chat beside viewport — **not** orphan admin dashboards. Economic router keeps Sonnet on UI polish and reserves Grok/Opus for deep kernel/physics. Cadence = **hot-fix event-driven** ∥ **weekly evolution** — never 24/7 Opus polling. Community publish quality elevator = AAA light/mesh audit offer via CreativeBridge + CostGuard (fail-closed).

| CLOSED (cx) | HELD |
|-------------|------|
| Domain lanes + settle:0 reject | L.1 ForgeSandboxExecutor Devin-class |
| WeeklyEvolution + HotFix → L.6 wire | Full AgenticUIStudio L.7 DOM/props Magic Wand |
| L.11 UIMutationTransaction scaffold | RepoGraphRAG L.12 import graph folder |
| FounderEvolutionInbox IDE tab | Universal IDE marketing claim (needs L.6+L.7+L.14) |
| Honesty radar + community AAA audit | Coins / Agones / Nanite / DLSS / fake Unreal FPS |

---

## L acceptance (ship gates)

### L.A — Sandbox & engineering

- [ ] Agent `test-runner` / shell tools execute **only** via ForgeSandboxExecutor — host PTY never invoked by agent
- [ ] Teardown within 60s of session end; no orphan sandboxes in soak test
- [ ] GF: Premium-pin mission delegates peripheral (e.g. lighting) to Swarm — **no Premium debit** on that cell (#61)
- [ ] **Auto-Heal:** seeded compile error → invisible heal ≤3 reaches PASS without user pasting logs (#60)
- [ ] AutonomousEngineerLoop = Maestro∥MoA → L.5 → Heal → apply on seeded bug repo without human shell
- [ ] All sandbox minutes pass CostGuard reserve/settle (Trava I)
- [ ] MoA JobBudget respected (≤3 gens/cell; ≤4 peripheral cells; no MoA on light chat)

### L.B — Agentic UI

- [ ] Prompt → FullStackScaffoldEngine → E2B preview URL < 120s cold start (p95)
- [ ] Magic Wand element edit → UIMutationTransaction → Ctrl+Z restores TSX + preview
- [ ] DesignTokenSync output passes `qa:hardcoded-colors`

### L.C — Code comprehension

- [ ] RepoGraphRAG resolves "who imports X" correctly on Aethel monorepo fixture (≥90% precision)
- [ ] UniversalLspFarm: TS + Python LSP hover/definition work in Monaco desktop export
- [ ] MultiSurfaceContextPack includes scene + code + preview errors in single Actor payload
- [ ] Pack p95 ≤ **2,000 tokens** on GF-FORGE fixtures; agent apply **denied** without pack (Decision #54)
- [ ] L.6 loop stays within Pro-safe JobBudget (Maestro+Critic Premium sparse; Workers Fast)

---

## J.3 / J.4 reconciliation (Decision #50)

| J step | L relationship |
|--------|----------------|
| **J.3 SceneContextPack** | **Superseded by L.14** — creative scene slice becomes `MultiSurfaceContextPack.scene*` fields; do not ship standalone J.3 module |
| **J.4 VectorIndex** | **Shared foundation** — J.4 ships first; L.12 RepoGraphRAG layers graph on top |
| **J.8 BrowserOperator** | Complements L.6 — browser research vs sandbox engineering |
| **Law XI validation** | **Completed by L.5** — not optional LLM critic alone |

**Release Train FORGE-v1:** J.1 → L.1+L.3 → L.5 → J.4 → L.12+L.14 → L.6 → L.7+L.8 → L.9–L.11 → L.13.

---

## Parity & honesty matrix

| Claim | Allowed after | Forbidden until |
|-------|---------------|-----------------|
| Autonomous engineering (Devin-class) | **L.6** acceptance | L.1 hooks only |
| Isolated agent sandbox | **L.1 + L.3** | Agent on host PTY |
| Agentic UI / v0-class preview | **L.7 + L.8** | Inline iframe only |
| Full-stack scaffold from prompt | **L.9** | Manual project create |
| Cursor-class codebase intelligence | **L.12 + L.13** | Hash RAG marketing |
| Universal IDE (combined claim) | **L.6 + L.7 + L.14** | Partial wave ship |

**vs competition (honest):** L targets **governed parity class** with Cursor + v0 + Devin — governance + multi-surface context are moats; raw tab-completion latency may trail Cursor on Day 1 L ship.

---

## L-readiness checklist (Onda A–F PRs touching IDE/agent)

- [ ] Agent tools declare `runtimeTargets` including `cloud-sandbox` — no new host-shell agent paths
- [ ] Preview routes remain human-initiated until L.1 ships
- [ ] Law XI gate hooks extensible to sandbox `ProjectValidationGate`
- [ ] Cartography manifest compatible with future RepoGraphRAG ingest
- [ ] **G-readiness + K-readiness + J-readiness** unchanged

---

## Cross-links

| Document | Relationship |
|----------|--------------|
| `AETHEL_AI_FUSION_CREATIVE_SPEC.md` | J.1 prerequisite; Travas I–II extend to L.11 |
| `AETHEL_INTELLIGENT_ROUTING_AND_CONTEXT_COMPRESSION.md` | Decisions #53–#55; Fusion Auto; ban Nano; TaskDomain; pack budgets |
| `AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md` | K parallel — no conflict |
| `FUTURE_IMPROVEMENTS_REGISTRY.md` | `IMPROVE-AI-003`, `IMPROVE-DESK-002`, `IMPROVE-BRIDGE-001` → Onda L |
| `AI_CRITIQUE_DEBT_REGISTRY.md` | `DEBT-DESK-004`, preview E2B blockers |

---

## Approved decisions (#47–52, v4.6)

| # | Decision |
|---|----------|
| 47 | **Onda L — Aethel Forge** — Universal IDE engineering (Cursor / v0 / Devin parity class) |
| 48 | **AgentShellPolicy** — agents **never** use host OS PTY; sandbox only |
| 49 | **ProjectValidationGate** — project typecheck/lint/test in sandbox **blocks** Critic approval (Law XI completion) |
| 50 | **L.14 MultiSurfaceContextPack** supersedes standalone **J.3 SceneContextPack** |
| 51 | **Onda L parallel post J.1** — does not delay Wedge #1 or A.1 |
| 52 | **Forge reuses E2B preview infra** — engineering sandbox extends, not replaces, preview runtime |
| **53** | **Maestro/Critic prefer Premium elite + Workers = Apex Fusion Auto** |
| **54** | **Compressed MultiSurfaceContextPack hard dependency** of L.6 / multi-file agent apply |
| **55** | **Nano / dumb-fallback banned** |
| **56–#58** | Apex Doctrine · Apex-first · Architecture Laws gate |
| **59–#62** | Maestro Delegation + Adaptive MoA + Auto-Heal — Swarm orchestration v1.3 |
| **66** | **Anti-Laziness Protocol** — truncation ban + LazyInspector pre-L.5 + chunk ≤300 LoC — [`AETHEL_ANTI_LAZINESS_PROTOCOL.md`](./AETHEL_ANTI_LAZINESS_PROTOCOL.md) |

---

## Competitor feature matrix (Cursor / v0 / Devin / Lovable)

| Feature | Cursor | v0 / Lovable | Devin | Aethel L target |
|---------|--------|--------------|-------|-----------------|
| Tab completion | **Leader** | Basic | — | L.13 LSP farm |
| Repo-wide RAG | Strong | Weak | Medium | **L.12 RepoGraphRAG** + L.14 |
| Multi-file edit | Strong | Medium | Strong | L.6 + Law XI |
| Sandbox execution | Local | Cloud preview | **Isolated VM** | **L.1 ForgeSandbox** |
| Validation before apply | Lint partial | Weak | Test suite | **LazyInspector (#66) → L.5** |
| Agentic UI / DOM edit | — | **Leader** | — | **L.7 AgenticUIStudio** |
| Full-stack scaffold | — | **Leader** | Medium | **L.9 FullStackScaffold** |
| Game + 3D context | — | — | — | **L.14 multi-surface moat** |
| Cost governance | BYOK | Platform pay | Opaque | **Trava I CostGuard** |
| Evidence / audit | Medium | Weak | Medium | **task-evidence-ledger leader** |
| Undo AI edits | Partial | Weak | — | **L.11 UIMutationTransaction** |

**Moats vs all three:** governed sandbox + multi-surface context (game + web + code) + evidence ledger.

---

## Known limitations (honest)

| Limitation | Mitigation |
|------------|------------|
| Tab latency may trail Cursor | L.13 local LSP sidecars; cloud relay fallback |
| v0 polish on animations | L.10 design tokens; not Framer clone Day 1 |
| Devin-long autonomous runs cost | CostGuard per minute; max session budget |
| Firecracker not on all hosts | E2B primary; local-isolated dev fallback |
| LSP for Rust in cloud | Tauri LSP farm desktop-first |

---

## Failure modes & mitigations

| Failure | Mitigation |
|---------|------------|
| Agent on host PTY | L.3 policy CI audit; prohibition #42 |
| Orphan sandboxes | L.1 teardown watchdog; 60s max |
| Apply without typecheck | L.5 blocks; prohibition #43 |
| L.5 FAIL shown as success | Auto-Heal or BLOCK only (#60) |
| MoA without JobBudget | CostGuard deny fan-out |
| Preview ≠ sandbox confusion | Decision #52 docs; separate UI labels |
| RepoGraphRAG hallucination | ≥90% precision gate on monorepo fixture |
| Uncompressed 50K prompts | L.14 tokenBudget + router deny (Decision #54) |
| Static Nano / dumb Worker | Decision #55 — Fusion Auto specialists only |
| Worker always on Premium | Decision #53 amended + TaskRiskScore; Fusion Auto under ceiling |

---

## L.0b — Editor ≠ Runtime + WASM Plugin ABI (deepened 2026-07-13bi)

Founder AAA gaps #3 and #7 (plugin half). Forge remains engineering sandbox; **published games must not carry React/Monaco/IDE**.

| Contract | Path | Status |
|----------|------|--------|
| `isEditorSurface` / publish strip boundary | `lib/runtime/editor-runtime-boundary.ts` | Scaffold **CLOSED** |
| Reuses `FORBIDDEN_RUNTIME_PACKAGES` | `publish-pipeline-orchestrator.ts` | Live tree-shake gate |
| V8 isolate + winit desktop host | — | **HELD** |
| WASM Plugin ABI + sandbox load | `lib/plugins/aethel-wasm-abi.ts` | Scaffold **CLOSED** |
| AgentShell alignment (#48) | `agent-shell-policy.ts` | Agents → sandbox only |
| Plugin marketplace | — | **HELD** |

**vs Cursor/Unity (honest):** Cursor is an IDE, not a game runtime — our Forge path mirrors that. Unity/UE ship separate player binaries; Aethel’s web demo may still use R3F for Hub demos, but **published game bundles fail-closed on IDE imports**. Full V8/winit host is the desktop end-state, not claimed now.

**Trust domains:** L Forge sandbox ≠ M.3 WASM Shield guest gameplay — see Immunity §3 + M.0b.

---

## Extended acceptance + golden fixtures

| ID | Suite | Fixture |
|----|-------|---------|
| **L-ACC-01** | Agent never uses host PTY | CI policy scan |
| **L-ACC-02** | Validation gate blocks bad TS | **GF-FORGE-001** |
| **L-ACC-03** | Autonomous fix-test cycle | **GF-FORGE-001** |
| **L-ACC-04** | Prompt → preview URL < 120s p95 | L.9 scaffold |
| **L-ACC-05** | RepoGraphRAG import precision ≥90% | Aethel monorepo slice |
| **L-ACC-06** | MultiSurfaceContextPack payload complete | L.14 integration test |

See [`AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md`](AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md).
