# Aethel Engine — Netcode Production Spec (Studio Pillar S6)

**Version:** 1.2 (Chief Architect — Deepened + replication taxonomy)  
**Status:** **Binding** — **Studio Pillar S6** — G.2 implementation bible  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.6  
**Prerequisite:** Onda C deterministic sim hooks (Decision #6)

---

## Mandate

Roadmap G.2 listed 6 rows — **insufficient** for UE **Iris / Replication Graph** class claims. **S6** defines production multiplayer architecture.

**Zero-MVP:** No cross-play marketing before G.2 + S6 acceptance (existing prohibition #25).

---

## State today (honest)

| Item | Status |
|------|--------|
| `networking-multiplayer.ts` | partial P2P/lobby |
| Rollback | blocked — no deterministic sim |
| Dedicated server | stubs |
| Anti-cheat | **AUSENTE** |
| Lag compensation | partial |
| Replication graph | **AUSENTE** |

---

## Architecture

```
Authority Model (export policy)
├── Listen Server
├── Dedicated Server (orchestrated)
└── P2P (honesty badge — limited)

Replication Graph
├── Owner-relevant actors (always)
├── Spatial grid cells (S2 partition)
└── GAS state deltas (S5 — quantized)

Transport
├── UDP + reliability layer
└── WebRTC for browser demos (I.3)

Lag Compensation
├── Input timeline + rewind (hitscan)
└── Interpolation buffer

Anti-Cheat (server)
├── Rate limits + anomaly detection
└── GAS validation hooks (S5)
```

### Determinism (Decision #6)

- Rapier deterministic path **required** before ranked/competitive claims
- Input log → replay for esports debug

---

## Replication category taxonomy (S6.0+)

| Category | Policy | Frequency |
|----------|--------|-----------|
| **OwnerAlways** | Player pawn, inventory | every tick |
| **SpatialCell** | World props in S2 cell | on change + proximity |
| **GASDelta** | Ability cooldowns, tags | quantized delta |
| **Rare** | Quest state, cutscene flags | reliable event |
| **Never** | Client-only VFX | local only |

**Golden fixture:** **GF-NET-001** — 100-player 1h soak.

---

## Delivery (S6.0 → S6.5)

| Step | Deliverable | Wave |
|------|-------------|------|
| **S6.0** | Replication intent API in sim (hooks C) | C |
| **S6.1** | Authority export policy + lobby hardening | F |
| **S6.2** | Lag compensation + interpolation | G.2 |
| **S6.3** | Dedicated server orchestration | G.2 |
| **S6.4** | Anti-cheat + validation | G.2 |
| **S6.5** | 1000-player soak + replay | G.2 |

---

## Acceptance

- [ ] 100-player soak: no desync hash mismatch over 1h seeded
- [ ] Hitscan rewind: golden unit tests
- [ ] Cross-play honesty badge until S6.2 passes
- [ ] Web demo: separate budget — not full competitive tier

---

---

## Competitor baseline (UE5 / Unity 6)

| UE5 capability | Unity 6 / others | Aethel S6 target | Surpass vector |
|----------------|------------------|----------------|----------------|
| Iris replication | Netcode for Entities | Replication Graph + GAS deltas | Spatial cells from S2 |
| Dedicated server | Multiplay / custom | Orchestrated G.2 | Hub-hosted demos I |
| Lag compensation | Various | Input timeline + rewind | Golden unit tests |
| Anti-cheat | EAC / custom | Server validation S5 hooks | GAS ability sanity |
| Rollback netcode | GGPO class | Requires Decision #6 determinism | Honest badge until green |
| Web multiplayer | WebRTC demos | I.3 transport | Separate budget tier |

---

## Known limitations (honest)

| Limitation | Platform | Mitigation |
|------------|----------|------------|
| No competitive web tier v1 | web | Honesty badge; P2P demo only |
| 1000-player MMO | — | S6.5 soak target; not MMO claim |
| Console cross-play | — | G.4 + platform SDKs |
| Full EAC integration | — | Server-side validation v1; client AC phase 2 |

---

## Performance budgets

| Metric | Target |
|--------|--------|
| 100-player desync | 0 hash mismatch / 1h seeded |
| Hitscan rewind | < 150ms RTT tolerance |
| Bandwidth per player | ≤ 64 kbps p95 (quantized GAS) |
| Dedicated server tick | 60Hz stable |

---

## Failure modes & mitigations

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| No deterministic sim | Rollback blocked | Block S6.2 until Rapier path green |
| JSON net messages | `DEBT-NET-001` | `IMPROVE-ENG-015` binary layout |
| Cross-play marketing early | Prohibition #25 | Honesty badge UI |
| P2P cheat | Exploit | Dedicated authority for ranked |

---

## Extended acceptance suite

- [ ] **S6-ACC-01:** 100-player 1h soak — desync hash 0
- [ ] **S6-ACC-02:** Hitscan rewind golden tests pass
- [ ] **S6-ACC-03:** Replication graph — owner always; spatial cull verified
- [ ] **S6-ACC-04:** WebRTC demo — 8 players; honesty badge visible
- [ ] **S6-ACC-05:** Replay from input log — bit-identical final state

---

## Debt & IMPROVE cross-links

| ID | Maps to |
|----|---------|
| `DEBT-NET-001` | Binary netcode |
| `IMPROVE-ENG-015` | Rollback ring buffer |
| G.2 (roadmap) | S6 implementation bible |
| Decision #6 | Determinism prerequisite |

---

## Cross-links

| Doc | Link |
|-----|------|
| `AETHEL_GAMEPLAY_FRAMEWORK_SPEC.md` | GAS replication |
| `AETHEL_WORLD_SYSTEMS_SPEC.md` | spatial replication cells |
| `AETHEL_GAME_HUB_PLATFORM_GROWTH_SPEC.md` | I.8 cross-play |
