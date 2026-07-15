# Aethel Engine — Animation & Cinematics Spec (Studio Pillar S3)

**Version:** 1.2 (Chief Architect — Deepened + track catalog)  
**Status:** **Binding** — **Studio Pillar S3** — Control Rig, Sequencer, MetaHuman-class  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.6  
**Laws:** III (Euphoria / muscle sim), VII (WASM for gameplay anim graphs)  
**Closes:** `DEBT-SEQ-001/002/003`, capsule proxy (J.7)

---

## Mandate

UE animation = **Control Rig + IK Rig + Pose Search + Sequencer + MetaHuman**. Law III covers **muscle sim** — **S3** covers the **full animation authoring + cinematic pipeline**.

**Zero-MVP:** No shipped character as capsule proxy. Sequencer must drive more than `fov`.

---

## State today (honest)

| System | Status |
|--------|--------|
| `motion-matching-system.ts` | 575 LoC — **unwired** |
| Sequencer runtime | **fov only** (`DEBT-SEQ-002`) |
| Control Rig | **AUSENTE** |
| IK foot lock | partial |
| MetaHuman-class | capsule proxy |
| Active muscle sim (Law III) | **AUSENTE** |
| Take recorder | **AUSENTE** |

---

## Architecture

```
Skeletal mesh (USD import S7)
     ↓
Control Rig graph → bone constraints + IK targets
     ↓
Animation Blueprint / Motion Matching selector
     ↓
Law III: Muscle sim + balance on Rapier (native, not WASM)
     ↓
Sequencer tracks → cutscene + in-engine
     ↓
ACES export (G.3 cinematic row)
```

### Sequencer track schema (binding)

| Track type | Properties |
|------------|------------|
| Transform | position, rotation, scale keys |
| Camera | fov, focus, spline follow |
| Light | intensity, color, temperature |
| Skeletal | animation asset, blend weight |
| MetaSounds | cue trigger, parameter |
| Visual Script | event fire |
| Subtitle / marker | narrative beats |

### Control Rig (phase 1 scope)

- FK/IK chains, two-bone IK, foot lock to terrain (S2 heightfield sample)
- Retarget: skeleton mapping table cook asset
- **Not Day 1:** full ML Deformer (vision 2030 — do not execute)

---

## Control Rig node catalog (S3.2+)

| Node | Purpose |
|------|---------|
| FKChain | Forward kinematics |
| TwoBoneIK | Limb IK |
| FootLock | Sample S2 heightfield |
| AimConstraint | Look-at target |
| RetargetMap | Skeleton pair cook asset |

**Golden fixtures:** **GF-ANIM-001**, **GF-ANIM-002**.

---

## Delivery (S3.0 → S3.4)

| Step | Deliverable | Wave |
|------|-------------|------|
| **S3.0** | Sequencer track schema + fix `applyValue` | D |
| **S3.1** | Motion matching wired to terrain + mocap ingest | E |
| **S3.2** | Control Rig MVP + retarget | E |
| **S3.3** | Law III muscle + balance controller | E |
| **S3.4** | MetaHuman-class USD facial rig (extends J.7) | E–G |

---

## Acceptance

- [ ] 60s cinematic: camera + light + character anim — export MP4/WebM evidence (J.9)
- [ ] Hit reaction: impulse → muscle → balance recover (Law III)
- [ ] No capsule proxy in dogfood demo (G.8)
- [ ] Sequencer: binary search keyframes (`DEBT-SEQ-001` closed)

---

## Competitor baseline (UE5 / Unity 6)

| UE5 capability | Unity 6 | Aethel S3 target | Surpass vector |
|----------------|-----------|------------------|----------------|
| Control Rig | Animation Rigging | FK/IK + foot lock S3.2 | Terrain sample from S2 |
| Sequencer | Timeline | Full track schema S3.0 | MetaSounds + VS tracks |
| Motion Matching | — (emerging) | Wire `motion-matching-system.ts` | SOA poses `IMPROVE-ENG-014` |
| MetaHuman | — | USD facial S3.4 + J.7 | No capsule proxy |
| Take Recorder | Recorder | Phase 2 post-S3.3 | Evidence J.9 export |
| Euphoria / muscle | — | Law III native Rapier | WASM excluded for muscle |

---

## Known limitations (honest)

| Limitation | Platform | Mitigation |
|------------|----------|------------|
| ML Deformer | all | vision 2030 — not executed |
| MetaHuman neural | all | USD rig only; no Epic license dependency |
| Full facial mocap iPhone | mobile | S7 ingest; optional cloud |
| 100+ character crowd sim | web | Mass Entity S5; reduced on web — **GPU Mass ECS (cw)** soak-gated `gpuMassEcsReady` (1k–10k); **100k claim HELD** |

---

## Performance budgets

| Metric | Target |
|--------|--------|
| Sequencer evaluate (60s timeline) | < 2ms main thread |
| Motion matching search | worker; 0 main thread |
| Muscle sim characters on screen | ≤ 8 enthusiast; ≤ 2 web |
| Retarget cook | < 30s per skeleton pair |

---

## Failure modes & mitigations

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| `fov`-only sequencer | `DEBT-SEQ-002` | S3.0 schema + fix `applyValue` |
| Capsule proxy ship | J.7 violation | S7.1 + S3.4 block publish |
| Inert ragdoll | Law III violation | Muscle + balance before G.8 demo |
| Keyframe search O(n) | `DEBT-SEQ-001` | Binary search in S3.0 |

---

## Extended acceptance suite

- [ ] **S3-ACC-01:** 60s cinematic — camera + light + skeletal + MetaSounds — J.9 MP4 evidence
- [ ] **S3-ACC-02:** Hit impulse → muscle → balance recover within 2s
- [ ] **S3-ACC-03:** Foot IK locks to S2 heightfield on slope ≤ 45°
- [ ] **S3-ACC-04:** Retarget mocap → second skeleton — visually acceptable golden clip
- [ ] **S3-ACC-05:** No capsule in dogfood demo G.8

---

## Debt & IMPROVE cross-links

| ID | Maps to |
|----|---------|
| `DEBT-SEQ-001/002/003` | S3.0 |
| `DEBT-MOTION-001` | S3.1 motion matching |
| `IMPROVE-ENG-014` | SOA poses + IK |
| `IMPROVE-FILM-003/005` | DirectorMode + cinematic inspector |

---

## Cross-links

| Doc | Link |
|-----|------|
| `AETHEL_AI_FUSION_CREATIVE_SPEC.md` | cinematic-director squad |
| `AETHEL_CONTENT_PIPELINE_SPEC.md` | USD skeleton import |
| `AETHEL_METASOUNDS_SPEC.md` | Sequencer audio tracks |
