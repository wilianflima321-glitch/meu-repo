# Blueprint de Supremacia AAA — Execution Checklist v4.7

**Status:** Planning **100% complete** (A.0 Certificate). **Next:** A.1 execution.  
**Canonical:** [`docs/architecture/AETHEL_SUPREMACY_ROADMAP.md`](../docs/architecture/AETHEL_SUPREMACY_ROADMAP.md) v4.7  
**Certificate:** [`docs/architecture/AETHEL_PLANNING_COMPLETENESS.md`](../docs/architecture/AETHEL_PLANNING_COMPLETENESS.md)

---

## Release trains (parallel — do not serialize unnecessarily)

| Train | Scope | Start gate |
|-------|-------|------------|
| **A.1–A.6** | Wire dead AAA libs to production | A.0 ✅ |
| **RTv1** | Hub checkout (H.0 blocker) | H audit |
| **AI-v1** | J.1 CreativeBridge + J.2 evidence | A.5 |
| **FORGE-v1** | L.1–L.14 Universal IDE | post J.1 |
| **IMMUNITY-v1** | M.1–M.3 runtime defects | post C hooks |
| **STUDIO-v1** | S1.0→S7.4 production tools | parallel A.1 |
| **B→D→G** | Desktop AAA + nuclear G.3 | B after A |
| **K** | Neural / 3DGS / XR | post G acceptance |

---

## Wedge #1 (24 months — irrevocable)

1. DX Criação (web-first studio)
2. Publish Web instant
3. Vitrine Indie (Hub I)
4. IA criativa evidence-backed (Law XVI)

**Does NOT block on:** K, L full ship, M full ship, STUDIO-ζ.

---

## Execution order (recommended)

### Phase 1 — Foundation wires (Onda A)

- [ ] **A.1** Wire `terrain-engine-runtime` → LandscapeEditor (S2.0)
- [ ] **A.2** Cook manifest schema v2 (S7.0)
- [ ] **A.3** LocalAssetDepot offline import path
- [ ] **A.4** Premium IDE chrome (Law X tokens)
- [ ] **A.5** Agent tool bus + evidence ledger → Agents UI (J.2)
- [ ] **A.6** Publish pipeline baked-lighting gate

### Phase 2 — Render + gameplay spine (Onda B–C)

- [ ] **B** Tauri LocalApiGateway + wgpu init
- [ ] **C** Render Graph + bindless + S1.0/S5.0/S6.0 hooks
- [ ] **C** K.0 velocity MRT foundation
- [ ] **C** M.0 PSO fingerprint + async IO + WASM boundary hooks

### Phase 3 — Studio pillars β–γ (STUDIO-v1)

- [ ] **S1.1** Material graph → WGSL viewport
- [ ] **S2.1** World Partition streaming
- [ ] **S2.2** PCG non-empty output (Anti-Mock)
- [ ] **S3.0** Sequencer track schema (fix DEBT-SEQ)
- [ ] **S5.1** GAS IPC binary @ 60Hz

### Phase 4 — AI + IDE (parallel after A.5)

- [ ] **J.1** CreativeBridge unify agent/API split
- [ ] **J.7** UsdIntegrator (S7.1)
- [ ] **L.1** ForgeSandboxExecutor
- [ ] **L.5** ProjectValidationGate (Law XI)

### Phase 5 — Production depth (Onda D–E + STUDIO-δ)

- [ ] **D** TAA/SSR/DOF + S1.2/S2.3
- [ ] **E** S3 animation + S4 MetaSounds compiler
- [ ] **E** Law III muscle sim

### Phase 6 — Nuclear + platform (Onda F–G + STUDIO-ε/ζ)

- [ ] **G.3** Micro-Poly + Radiance + Entropy (AAA Parity Targets)
- [ ] **G.2 + S6** Netcode soak + anti-cheat
- [ ] **H** Treasury + marketplace
- [ ] **I** Game Hub discovery

### Phase 7 — Vanguard + full immunity (post-G)

- [ ] **K.1–K.4** Neural / 3DGS / XR
- [ ] **M.1–M.3** PSO Vault + DirectStorage + WASM Shield
- [ ] **STUDIO-ζ** S1–S7 full acceptance

---

## Quality gates (every PR)

### Web
```bash
cd cloud-web-app/web
npm run typecheck && npm run lint && npm run test
npm run qa:design-system-consistency
npm run qa:hardcoded-colors
npm run qa:button-types
```

### Rust (if `.rs` touched)
```bash
cd apps/studio-local/src-tauri
cargo check && cargo clippy -- -D warnings && cargo test
```

### Readiness
- [ ] G + K + L + M + **S-readiness** per touched pillar
- [ ] Zero-MVP: no mock/stub in ship path
- [ ] Law XVI: no empty creative artifacts

---

## Marketing honesty gates

| Claim | Required |
|-------|----------|
| Industry standard | G + H + I + J |
| Full studio parity | S1–S7 + G.3 enthusiast |
| Universal IDE | L.6 + L.7 + L.14 |
| Runtime immunity | M.1 + M.2 + M.3 |
| Neural / 3DGS / XR | K acceptance |
| Production multiplayer | S6 + G.2 |

---

## Spec library (all v1.1 where applicable)

| Spec | Path |
|------|------|
| Roadmap | `docs/architecture/AETHEL_SUPREMACY_ROADMAP.md` |
| **Execution Playbook** | `docs/architecture/AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md` |
| Studio Index | `docs/architecture/AETHEL_STUDIO_SUPREMACY_INDEX.md` |
| S1–S7 | `docs/architecture/AETHEL_*_SPEC.md` |
| AAA G.3 | `docs/architecture/AETHEL_AAA_PARITY_TARGETS.md` |
| Vanguard K | `docs/architecture/AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md` |
| Forge L | `docs/architecture/AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` |
| Immunity M | `docs/architecture/AETHEL_RUNTIME_IMMUNITY_SPEC.md` |
| AI J | `docs/architecture/AETHEL_AI_FUSION_CREATIVE_SPEC.md` |
| Debts / Improvements | `docs/architecture/AI_CRITIQUE_DEBT_REGISTRY.md`, `FUTURE_IMPROVEMENTS_REGISTRY.md` |
