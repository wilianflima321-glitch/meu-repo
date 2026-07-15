# Aethel Engine — Technical Depth & Internal Robustness Gap

**Version:** 1.1 (Chief Architect — cross-link UX Alignment Master)  
**Status:** **Binding** — every Block/Wave must deepen until competitor bar is met or honestly `[HELD]`  
**Audit date:** 2026-07-09  
**Scope:** `cloud-web-app/web/` + `apps/studio-local/` only (dead root code ignored)

**Companions:**
- [`AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md`](./AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md) — execution blocks
- [`AETHEL_SUPREMACY_ROADMAP.md`](./AETHEL_SUPREMACY_ROADMAP.md) — 16 Laws
- [`AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md`](./AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md) — GF fixtures + PR tree
- [`AETHEL_STUDIO_SUPREMACY_INDEX.md`](./AETHEL_STUDIO_SUPREMACY_INDEX.md) — S-readiness
- [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) — DEBT evidence

---

## 0. Brutal verdict

| Layer | Planning depth | Code maturity | Best-in-market? |
|-------|----------------|---------------|-----------------|
| Specs / Laws / Ondas | **~100%** | N/A | Planning yes |
| Billing / metering | 100% | **~4/10** | **No** — dual debit, no spend-resolver, wallet unpaid |
| AI / Law XVI Fusion | 100% | **~4/10** | **No** — 3 binding files **missing** |
| Collab / netcode | 100% | **~4/10** | **No** — Yjs OK; Agones simulated |
| Render AAA | 100% | **~3/10** | **No** — WebGL2 preview ≠ UE |
| Desktop Rust | 100% | **~5/10** | **Partial** — foundations real, not integrated |
| Infra / ops | 100% | **~5/10** | **No** — no OTEL export, workers unclear |
| Publish / Hub / commerce | 100% | **~4/10** | **No** — H.0 lanes missing |
| Security | 100% | **~5/10** | **No** — BYOK contract split |

**Overall shipped depth vs 24-month wedge:** **~3.5/10**.  
**Plans are best-in-market. Product integration is not — yet.** Zero-MVP doctrine forbids shipping the gap as “done.”

### Competitor parity (honest)

| Competitor | Domain | Aethel today | Target to **surpass** |
|------------|--------|--------------|------------------------|
| **Cursor** | IDE + agents + billing | ~35% | Single apply+bill+undo kernel; Usage UX 6H; BYOK Free |
| **Stripe** | Payments robustness | ~40% | Idempotent webhooks + spend-resolver + live wallet settle |
| **Roblox** | Publish + play + MP | ~25% | Real fleet or honest P2P-only; Hub + H.0 lanes |
| **UE5** | Render / editor tools | ~15% | Desktop wgpu frame graph; never fake Nanite on WebGL2 |
| **Itch/Steam** | Distribution trust | ~20% | One-click cook workers + maturity badges |

---

## 1. Depth bar definition (what “best-in-market” means)

A subsystem is **best-in-market** only when **all** are true:

1. **Single choke path** — one entry for money / AI write / render submit / net tick  
2. **Fail-closed** — no `success: true` + empty artifact; no silent overage  
3. **Evidence** — ledger / receipt / golden fixture hash  
4. **Load tested** — concurrent agents, 50× chat, or GF soak as applicable  
5. **Honest naming** — no Nanite/Lumen/unlimited AI labels without acceptance  
6. **Integrated** — not a library sitting unwired next to the product path  
7. **Ops** — logs via `createComponentLogger`; metrics/traces for money & AI paths  

If any fail → status = **PARTIAL** or **`[HELD]`** — never “shipped.”

---

## 2. Area audits (plans × code)

### 2.1 Billing & metering — vs Stripe / Cursor

| Claim | Code reality | Score |
|-------|--------------|-------|
| Dual-pool Fast/Premium | `metering.ts`, `plan-limits.ts` LIVE | 7 |
| Credit wallet reserve/settle | `credit-wallet.ts` LIVE | 6 |
| Stripe webhook | `billing/webhook` signature + plan | 6 |
| Single `spend-resolver` | **MISSING** | 0 |
| Wallet Stripe Checkout | `checkoutUrl: null` | 2 |
| PAYG + spend caps | Spec only | 0 |
| Emergency `cost-guard.ts` | **Unwired** | 1 |
| Unified weights | Duplicate `credit-wallet-costs` vs `model-cost-weights` | 4 |

**Dual debit confirmed:** `app/api/ai/chat/route.ts` calls both `consumeMeteredUsage` and `reserveCredits`.

**Surpass bar:** Cursor Usage + Stripe idempotency — Block **6A–6H** in Execution Map.

---

### 2.2 AI / Law XVI — vs Cursor / Devin

| Claim | Code reality | Score |
|-------|--------------|-------|
| `intelligent-model-router` | LIVE task scoring | 7 |
| `agent-tool-bus` + job runner | Policy + governed apply | 6 |
| `task-evidence-ledger` | Partial persistence | 5 |
| **`creative-artifact-bridge.ts`** | **DOES NOT EXIST** | 0 |
| **`creative-cost-guard.ts`** | **DOES NOT EXIST** | 0 |
| **`creative-fusion-transaction.ts`** | **DOES NOT EXIST** | 0 |
| Creative agent tools | Honest fail-closed stubs | 2 |
| HTTP `/api/ai/*` without Bridge | Can hit providers | 3 |

**Largest doc/code divergence in the repo.** Law XVI is binding in `.cursorrules` / Fusion spec — files absent.

**Surpass bar:** Every creative/LLM write: Intent → Bridge → CostGuard → Provider → Yjs Tx → Evidence. No parallel HTTP escape hatch.

**New Block requirement:** **Block 1b / J.1** must create the three files before any “AI-native” marketing.

---

### 2.3 Collab / netcode — vs Roblox / UE

| Claim | Code reality | Score |
|-------|--------------|-------|
| Yjs scene/Monaco | `yjs-collaboration.ts` | 6 |
| Netcode helpers | input buffer, rollback helpers | 5 |
| Serializer | ad-hoc DataView + JSON | 4 |
| Dedicated servers | **Simulated** without Agones URL | 3 |
| CreativeFusion Yjs undo | Missing (depends on Law XVI file) | 0 |

**Surpass bar:** Versioned binary protocol + real authority **or** product copy = P2P-only until G.2. Never market cross-play early.

---

### 2.4 Render — vs UE5

| Claim | Code reality | Score |
|-------|--------------|-------|
| `aaa-render-system.ts` | Large surface; many empty `setup*` | 3 |
| `aaa-renderer-impl.ts` | WebGL2 post stack; `finalRenderSafe: false` | 5 |
| Nanite path | Partial meshlets; SSBO/Hi-Z incomplete | 3 |
| Ray tracing | WebGL fragment path tracer | 2 |
| Desktop `wgpu_renderer.rs` | Surface mount real | 5 |
| `gpu_culling.rs` | Compute frustum real | 6 |
| `scalable-render-graph/` | **3B.1 CORE** — blueprint registry live; node executors HELD | 4 |
| `hardware-profile.ts` | **3B.1 CORE** — Capability Score 0–100 web probe + Auto Fidelity | 6 |

**Surpass bar:** Desktop frame graph + Capability Score first. **Rename or gate** Nanite/RT until GF-MESH-001 / GF-RAD-001 pass. Web = honest WebGL2 + baked light.

**Execution note (2026-07-11z — Block 3A CORE):** Product UI stripped Nanite/RT placebo toggles; single **Fidelity** control maps to real R3F knobs; `finalRenderSafe` surfaced as `[HELD]` in honesty badge/API; R3F pauses when hidden. Full `AAARenderSystem` wire + `scalable-render-graph` remain **Block 3B**.

**Execution note (2026-07-11ab — Block 3B.1 CORE):** `packages/engine/render/hardware-profile.ts` + `scalable-render-graph/` shipped — real Capability Score drives Auto Fidelity and honesty badge. SRG nodes all `[HELD]` until 3B.2 retained wgpu frame graph. Do not claim dual live GPU / GPU culling in frame / Cook-Torrance.

---

### 2.5 Desktop Tauri — vs Cursor desktop / UE editor

| Claim | Code reality | Score |
|-------|--------------|-------|
| wgpu mount | Real | 5 |
| PTY sandboxed | `portable_pty` on Studio Local | 8 |
| wasmtime hot reload | Real | 5 |
| GAS SoA | Library; **no IPC to editor** | 4 |
| Sidecars | Capability probes + health module; releaseReady false | 5 |
| Agent vs user PTY policy | **AgentShellPolicy #48** + CI gate (2026-07-11ah) | 8 |

**Surpass bar:** Viewport → wgpu frame graph; GAS IPC 60Hz; sidecar supervisor; agent tools never host PTY.

**Execution note (2026-07-11ah — Block 9 CORE):** AgentShellPolicy fail-closed; desktop vs cloud PTY honesty badge/API; Electron templates quarantined; fs-watch emit live with latency helper (budget evidence HELD until sampled); ONNX/ai_complete still HELD.

---

### 2.6 Infra / observability — vs Vercel / Stripe ops

| Claim | Code reality | Score |
|-------|--------------|-------|
| Prisma richness | UsageBucket, CreditLedger, RenderJob, McpServer, PublishedGame | 7 |
| Redis + fallback | Upstash + memory | 5 |
| Structured logger | `createComponentLogger` | 6 |
| OTEL export | Traceparent parse only — **no exporter** | 2 |
| Billing stream worker | Exists; always-on deploy unclear | 4 |
| Storage enforcement | Present | 5 |

**Surpass bar:** OTEL traces on AI + billing + deploy; SLO dashboards; worker health checks; Redis flush under 50× parallel chat (6G.1).

---

### 2.7 Publish / Hub / commerce — vs Roblox / Itch

| Claim | Code reality | Score |
|-------|--------------|-------|
| Publish orchestrator | Planner + Law XV `baked-lighting` fail-closed gate (2026-07-11ag); cook workers still deepen | 5 |
| Vercel deploy | Real client, token-gated | 5 |
| Arcade listing | `PublishedGame` API + playable/`[HELD]` chrome (no fake install) | 6 |
| Marketplace routes | ~21 routes | 6 |
| Payouts math | 88/12 present | 6 |
| **H.0 RevenueLane** 30/70 vs 12% | **MISSING** | 0 |

**Surpass bar:** Cook worker mesh + H.0 lanes before checkout UI + Hub discovery with telemetry gate.

---

### 2.8 Security — vs Cursor / Stripe

| Claim | Code reality | Score |
|-------|--------------|-------|
| CSP middleware | Restrictive + rate limit | 6 |
| BYOK client vault | AES-GCM local + Tauri | 6 |
| `User.byokKey` server field | **Contradicts** zero-knowledge | 3 |
| JWT / WebAuthn modules | Present | 5 |
| WS guest fallback | Dangerous if prod misconfig | 3 |

**Surpass bar:** One BYOK contract (client-only); audit all AI routes; session revocation; nonce CSP where possible.

---

## 3. Top 20 deepeners (ordered for Claude)

| # | Deepener | Beats | Block | Acceptance |
|---|----------|-------|-------|------------|
| 1 | `lib/ai/spend-resolver.ts` — single debit | Stripe/Cursor | 6A | No dual debit; B6-ACC-01/02 |
| 2 | Law XVI trio files (Bridge, CostGuard, FusionTx) | Cursor agents | **J.1 / 1b** | All creative via Bridge |
| 3 | Wallet → Stripe Checkout → settle | Stripe | 6B | Real `checkoutUrl` |
| 4 | Unify weights; delete duplicate multipliers | Finance | 6A | One formula |
| 5 | Wire or delete `observability/cost-guard.ts` | Ops | 6G | Emergency cap live |
| 6 | PAYG + mandatory spend caps + Usage UX | Cursor | 6C+6H | B6-ACC-09–14 |
| 7 | BYOK single contract + route audit | Trust | 6E | Zero server key persist |
| 8 | H.0 `RevenueLane` enum | Legal/commerce | 6G / H.0 | 30/70 ≠ 12% |
| 9 | Publish cook workers (not planner-only) | Itch | 6 / S7 | Artifact on disk |
| 10 | OTEL exporter on AI+billing | Stripe ops | 6G | Traces in collector |
| 11 | Versioned netcode protocol | Roblox | 2 | GF-NET-001 path |
| 12 | Agones real **or** P2P-only product copy | Honesty | 2 | No fake dedicated |
| 13 | wgpu frame graph + Capability Score | UE desktop | 3 / B.1 | hardware-profile + SRG |
| 14 | Gate Nanite/RT names until GF pass | Honesty | 3 | Marketing audit |
| 15 | GAS + physics IPC to play mode | UE gameplay | 5 | 60Hz binary |
| 16 | Sidecar process supervisor | Desktop | 9 | Health + restart |
| 17 | AgentShellPolicy tests — no host PTY | Security | 9 / L | **CLOSED 2026-07-11ah** — `agent-shell-policy` + `qa:agent-shell-policy` |
| 18 | Creative Wallet ≠ LLM pool | Fairness | 6F | Video ≠ burn Premium |
| 19 | Golden fixtures on disk (`test-fixtures/supremacy/`) | Playbook | 0→A.1 | GF-* files exist |
| 20 | Maturity badges on all ASPIRATIONAL routes | Trust | 7 | route-maturity gate |

---

## 4. Internal robustness checklist (every subsystem)

Claude must prove for each Block exit:

| Check | Evidence |
|-------|----------|
| Single entry choke | Architecture note + grep shows one call site family |
| Concurrent safety | Test: parallel 2× money or AI |
| Abort / cancel | Stream cancel releases reservation |
| Idempotency | Webhook replay safe |
| Observability | Structured logs + (post-6G) traces |
| Failure UX | Calm EN; IDE open; `[HELD]` if incomplete |
| No dead library | Feature reachable from product UI or deleted |
| Dual-stack gates | `typecheck`+`lint`+`test`; if `.rs` → cargo trio |
| Competitor bar named | PR description cites Cursor/UE/Roblox/Stripe criterion |

---

## 5. What is already strong (do not rewrite — deepen)

- Dual-pool math + `plan-ai-quotas.ts` / `plans.ts` alignment  
- Agent tool-bus **policy** design (Cursor-adjacent)  
- Fail-closed creative stubs (honest)  
- Prisma billing models  
- Desktop: wgpu mount, GPU cull compute, PTY sandbox, wasmtime  
- CSP + structured logger culture  

**Pattern to break:** excellent scaffolding → unwired → marketing name.  
**Pattern to enforce:** wire → fixture → gate → then name.

---

## 6. Executor mandate (copy for Claude)

```
Read AETHEL_TECHNICAL_DEPTH_AND_ROBUSTNESS_GAP.md v1.0
     + AETHEL_UX_AND_ROBUSTNESS_ALIGNMENT_MASTER.md v1.0
     + AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md v1.3.
Cross every task with depth scores (§2–§3) and critique matrix (Alignment §1).
Exit only when UX-G* + RB-G* gates are green or honest [HELD].
Do not claim best-in-market until the Depth bar (§1) is green.
Prefer integrating/wiring existing modules over new parallel systems.
Law XVI trio and spend-resolver are non-negotiable before AI-native or billing-complete claims.
Zero-MVP: no stubs in ship path; use [HELD] + maturity badge instead.
```

---

## 7. Changelog

| Date | Ver | Change |
|------|-----|--------|
| 2026-07-09 | 1.0 | Full plans×code audit; competitor %, top 20 deepeners, depth bar |
| 2026-07-09 | 1.1 | Cross-link UX Alignment Master; executor mandate includes UX-G*/RB-G* |
| 2026-07-15 | 1.2 | Add Section 8 detailing technical implications of AAA AI-Generation Pipeline |

---

## 8. Implicações Técnicas Reais do Pipeline AAA de Geração

Para que o Aethel entregue qualidade AAA gerando mundos e personagens com velocidade, a engenharia do motor deve resolver quatro gargalos físicos fundamentais no hardware e na infraestrutura:

### 8.1 O Gargalo de Latência e Volume de Dados (Texturas de Alta Resolução)
* **A Implicação**: Texturas de nível AAA (4K PBR contendo mapas de Albedo, Normal, Roughness e Displacement) pesam dezenas de megabytes cada. Gerar isso de forma puramente neural a cada requisição de prompt esgota a banda de rede, satura as APIs e demora minutos por textura.
* **A Solução (Ingestão Procedural via GPU)**: O orquestrador da IA gera apenas **vetores matemáticos e parâmetros de ruído procedurais** (como ruídos de Perlin/Simplex, mapas de gradiente e coordenadas de repetição). A GPU local lê esses metadados e compila as texturas AAA em milissegundos usando fragment shaders do [`aaa-material-system.ts`](file:///e:/Aethel%20engine/cloud-web-app/web/lib/aaa-material-system.ts), reduzindo o download de megabytes de imagens de nuvem para apenas bytes de dados lógicos.

### 8.2 A Fricção de Rigging/Skinning de Personagens Não-Humanoides
* **A Implicação**: NPCs exóticos (monstros com pernas extras, corcundas, criaturas deformadas) gerados pela IA não possuem esqueleto padrão correspondente na biblioteca. Um rig incorreto estica e quebra a malha nas articulações durante a animação, destruindo a ilusão AAA.
* **A Solução (Projeção Baricêntrica Dinâmica)**: O importador de malhas local detecta as extremidades geométricas (usando algoritmos de detecção de junções) e projeta dinamicamente as influências dos pesos de vértices contra a árvore 3D mais próxima do esqueleto nativo (`motion-matching-system.ts`). Se uma deformidade ultrapassa o limite tolerado pelas equações de cosseno da perna, o sistema a isola como geometria estática ou física passiva.

### 8.3 O Gargalo de Consistência Artística e Estilo (Style Drift)
* **A Implicação**: Um jogo AAA precisa de uniformidade estética. Sem restrição, a geração sequencial de assets cria um caos visual (um carro futurista realista ao lado de uma casa em cartoon).
* **A Solução (Injeção de DNA de Estilo)**: A IA mestre (Maestro) armazena um **Style Seed DNA** no início da sessão do projeto. Esse DNA é um vetor matemático latente que é inserido em cada chamada do pipeline local de geração de imagem. Ele força as IAs locais a usarem a mesma paleta de cores, contraste geral de luz, intensidade de sombras e contornos, garantindo consistência visual.

### 8.4 O Limite do Netcode e Processamento Físico de Larga Escala (NPCs Simultâneos)
* **A Implicação**: Sincronizar 1.000 NPCs gerados dinamicamente via rede com física de tecidos ativa consumiria toda a CPU do servidor de multiplayer.
* **A Solução (Zoneamento de Inteligência por Instâncias)**: A engine implementa o desdobramento lógico de NPCs:
  * **NPCs Ativos (Proximidade)**: NPCs perto do jogador executam a inteligência comportamental completa do Behavior Tree, rodam física de tecidos no [`cloth-simulation.ts`](file:///e:/Aethel%20engine/cloud-web-app/web/lib/cloth-simulation.ts) e têm replicação de rede ativa em 60Hz.
  * **NPCs Inativos (Simulados)**: NPCs longe do jogador são destruídos na memória gráfica da GPU e passam a existir apenas como vetores de coordenadas e dados matemáticos lógicos simples na CPU local (sem renderização, sem física de tecidos), economizando hardware.
