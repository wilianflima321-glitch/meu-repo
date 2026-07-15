# Aethel Engine — Gameplay Framework Spec (Studio Pillar S5)

**Version:** 1.2 (Chief Architect — Deepened + tag taxonomy)  
**Status:** **Binding** — **Studio Pillar S5** — GAS, tags, data assets, mass sim  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.6  
**Laws:** VII (WASM VM), I (SAB), Decision #2 (GAS Rust canonical)

---

## Mandate

UE gameplay = **GAS + Gameplay Tags + Data Registry + Mass Entity + State Tree + Enhanced Input**. Aethel has **GAS Rust IPC** spec — **S5** completes the **framework ecosystem**.

---

## State today (honest)

| Item | Status |
|------|--------|
| `gameplay_ability_system.rs` | partial |
| VS → TS (not WASM) | transpile only |
| Gameplay Tags | **AUSENTE** |
| Data Assets registry | **AUSENTE** |
| Mass Entity / 10k SoA | dual ECS unwired |
| State Tree | J.6 scaffold only |
| Enhanced Input mapping | partial |

### Execution deepen (2026-07-13cw — GPU Mass ECS)

| Probe | Status | Path |
|-------|--------|------|
| Mass SoA buffers (pos/vel/state) | **CLOSED** | `cloud-web-app/web/lib/mass-ecs/mass-soa-buffers.ts` |
| WebGPU one-formula agent step (`mass-ecs-agent-step-v1`) | **CLOSED** soak-gated `gpuMassEcsReady` | `lib/mass-ecs/gpu-mass-step.ts` |
| Nearby LOD CPU upload (interest) | **CLOSED** | `lib/mass-ecs/mass-lod-upload.ts` |
| Synthetic 1k–10k step budget soak | **CLOSED** | `__tests__/mass-ecs/gpu-mass-ecs-cw.test.ts` |
| 100k marketing claim | **HELD** (`mass100kClaimReady: false`) | until Founder-scale soak |
| Unreal Mass parity | **HELD** (`unrealMassParityReady: false`) | — |

**Honest competitor:** Unreal Mass remains more mature. No per-NPC JS Update on the shipped path; 100k is not claimed.

---

## Architecture

```
Gameplay Tags (hierarchical registry)
     ↓
Data Assets (cooked JSON/CAS — abilities, items, curves)
     ↓
GAS (Rust authority) ←IPC→ VS/WASM (frontend)
     ↓
Mass Entity table (SoA Float32Array + SAB)
     ↓
State Tree / BT (J.6 — user wires combat)
```

### Contracts

```typescript
export interface GameplayTag {
  name: string; // "Combat.Melee.Attack.Light"
  parent?: string;
}

export interface DataAssetRef {
  assetId: string;
  cookHash: string;
  schemaVersion: number;
}
```

| Module | Path |
|--------|------|
| Tag registry | `packages/engine/gameplay/gameplay-tag-registry.ts` |
| Data assets | `packages/engine/gameplay/data-asset-registry.ts` |
| GAS Rust | `apps/studio-local/src-tauri/src/gameplay_ability_system.rs` |
| Mass table | `packages/engine/ecs/mass-entity-table.ts` |
| **GPU Mass ECS (letter cw)** | `cloud-web-app/web/lib/mass-ecs/*` — max-real WebGPU SoA path (S5.2 deepen; package target still G) |

---

## Gameplay tag taxonomy (examples — binding pattern)

```
Combat
├── Combat.Melee
│   ├── Combat.Melee.Attack.Light
│   └── Combat.Melee.Attack.Heavy
├── Combat.Ranged
State
├── State.Stunned
├── State.Invulnerable
Item
├── Item.Weapon.Sword
└── Item.Consumable.Potion
```

**Storage:** bitset per entity in Mass table; hierarchical query via parent cache.

**Golden fixtures:** **GF-GAS-001**, **GF-MASS-001**.

---

## Delivery (S5.0 → S5.4)

| Step | Deliverable | Wave |
|------|-------------|------|
| **S5.0** | Tag + data asset schema in cook | C |
| **S5.1** | GAS IPC binary @ 60Hz (Decision #2) | B–C |
| **S5.2** | Mass entity SoA 10k (Law VII WASM executor) | C |
| **S5.3** | Enhanced Input → GAS ability trigger | D |
| **S5.4** | State Tree runtime (post J.6 scaffold) | E–G |

---

## Acceptance

- [ ] 10k entities ticked in worker; main thread free (Law I)
- [ ] Ability activate → GAS → MetaSounds + Entropy cue
- [ ] Tag query < 1µs hot path (bitset)
- [ ] No JSON in GAS IPC loop

---

---

## Competitor baseline (UE5 / Unity 6)

| UE5 capability | Unity 6 | Aethel S5 target | Surpass vector |
|----------------|-----------|------------------|----------------|
| Gameplay Ability System | — (custom) | Rust GAS + IPC | 60Hz binary Decision #2 |
| Gameplay Tags | Tags / Layers | Hierarchical registry | Bitset < 1µs query |
| Data Registry | ScriptableObjects | Cooked CAS assets | Offline Law VIII |
| Mass Entity | DOTS | SoA + SAB 10k | Law VII WASM executor |
| State Tree | Behavior trees | Post J.6 scaffold S5.4 | User wires combat Trava III |
| Enhanced Input | Input System | S5.3 mapping → GAS | Cross-platform web + desktop |

---

## Known limitations (honest)

| Limitation | Platform | Mitigation |
|------------|----------|------------|
| GAS in Rust not Blueprint | all | VS/WASM frontend; TS transpile deprecated C |
| 10k entities on web | webgl2 | Reduced budget Law XV; honest caps |
| Full State Tree ML | — | Rule-based v1; ML = vision 2030 |
| Networked GAS prediction | — | S6 lag compensation required first |

---

## Performance budgets

| Metric | Target |
|--------|--------|
| GAS IPC round-trip | < 1ms p95 @ 60Hz |
| Tag query hot path | < 1µs |
| Mass entity tick 10k | worker; 0 main thread |
| Data asset load | CAS mmap; no JSON parse hot path |

---

## Failure modes & mitigations

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| JSON in IPC | Prohibition #5 | Binary layout CI audit |
| JS closure VM 10k | Law VII violation | WASM executor S5.2 |
| Dual ECS unwired | Sim incoherence | Single Mass table authority |
| VS transpile only | No hot reload | M.3 WASM Shield path |

---

## Extended acceptance suite

- [ ] **S5-ACC-01:** Ability activate → GAS → MetaSounds + Entropy cue same frame
- [ ] **S5-ACC-02:** 10k entities ticked in worker — main thread idle proof
- [ ] **S5-ACC-03:** Tag query benchmark — 1M queries < 1s
- [ ] **S5-ACC-04:** Enhanced Input chord → ability trigger — web + desktop
- [ ] **S5-ACC-05:** State Tree event → BT node — user-wired combat only

---

## Debt & IMPROVE cross-links

| ID | Maps to |
|----|---------|
| `IMPROVE-ENG-005` | Mass SoA ECS |
| `IMPROVE-ENG-006` | WASM instant compile |
| `IMPROVE-ENG-015` | Binary netcode S6 dependency |
| Decision #2 | GAS Rust canonical |

---

## Cross-links

| Doc | Link |
|-----|------|
| `AETHEL_NETCODE_PRODUCTION_SPEC.md` | replication of GAS state |
| `AETHEL_RUNTIME_IMMUNITY_SPEC.md` | WASM Shield for VS logic |
| `AETHEL_METASOUNDS_SPEC.md` | ability audio cues |
