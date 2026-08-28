# Aethel Engine — MetaSounds Spec (Studio Pillar S4)

**Version:** 1.2 (Chief Architect — Deepened + node catalog)  
**Status:** **Binding** — **Studio Pillar S4** — Law IV implementation bible  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.6  
**Extends:** Law IV + Law IX (generative ingest → same runtime)

---

## Mandate

Law IV mandates **one spatial audio core** + **MetaSounds compiler**. Today `SoundCueEditor` **play-log only** — **S4** is the full graph → runtime path vs UE MetaSounds + Quartz.

**Zero-MVP:** No play-log as shipped audio. No fourth audio stack.

**Foley doctrine (Decision #64):** Default SFX = **library fetch + MetaSounds local transform** ($0 gen credits). Generative APIs = Plan B for exclusive sung score + speech only — see [`AETHEL_AUDIO_LIBRARY_FIRST_DOCTRINE.md`](./AETHEL_AUDIO_LIBRARY_FIRST_DOCTRINE.md).

---

## State today (honest)

| Item | Status |
|------|--------|
| `spatial-audio-manager-core.ts` | REAL (423 LoC) |
| Occlusion | partial unwired |
| MetaSounds compiler (web) | **AUSENTE** (Web Audio DAG still open) |
| **Desktop DSP substrate (Rust kernel)** | **REAL — shipped** (see register below) |
| `SoundCueEditor` | UI + play-log |
| VS `audio:play` | stub |
| Generative ingest (Law IX) | HTTP REAL; agent stub |

---

## Shipped desktop kernels (2026-08-14kc reconciliation)

The desktop Rust kernel now carries a **real, soak-gated Law IV substrate** that this
spec's "State today" previously did not reference — reconciled here (ledger-vivo). Each
kernel ships a distinct soak-gated readiness probe with `*_aaa_ready` **HELD false**
(no full UE MetaSounds / MetaHuman-class AAA claim):

| Kernel (letter) | Module | Probe | Evidence |
|------------------|--------|-------|----------|
| **jx** | `metasounds_dsp_compiler` | `metasoundsDspReady` | real 48 kHz DSP graph VM (poly-blep + RBJ + modal + granular + FFT conv + Kelly-Lochbaum + Lighthill + JSON graph) |
| **jx2** | `metasounds_dsp_compiler` | `hybridExportReady` | SIMD FFT convolution + Bouncer 16-bit PCM + 3-mode hybrid export + SidechainDucker/BusTree |
| **ka** | `acoustic_raytracing_solver` | `acousticRaytracingSolverReady` | octave-band absorption, sonic raycast, knife-edge diffraction, bounded IR, voice virtualization |
| **kb** | `sound_physics_duplex` | `soundPhysicsDuplexReady` | blast energy → impedance overpressure → real muscle PD + LBM dust + Beer–Lambert extinction |
| **kc** | `facial_performance` | `facialPerformanceReady` | spectral frame → phoneme → viseme → vocal-muscle → micro-saccade gaze (20-80 Hz) + Lux SSS + multilingual retarget |
| **ej** | `fm_additive_synthesis` | `fmAdditiveSynthesisReady` | physical collision → FM/additive audio buffer |
| **ei** | `acoustic_reverb_geometry` | `acousticReverbGeometryReady` | SDF bounces → RT60 + early reflections |
| **ef** | `acoustic_raytracing_echo` | `acousticRaytracingEchoReady` | discrete echo tap physics |
| **ex** | `sdf_audio_raymarching` | `sdfAudioRaymarchingReady` | SDF occlusion raymarch over WorldSoA |

Studio-local wires: `kernel_metasounds_dsp_compiler_wire`, `kernel_acoustic_raytracing_solver_wire`,
`kernel_sound_physics_duplex_wire`, `kernel_facial_performance_wire`, `kernel_fm_additive_synthesis_wire`,
`kernel_acoustic_reverb_geometry_wire` — Tauri IPC, 2 cmds each. All kernel tests green
(current round kc: **1028/1028**); studio `cargo check --lib` + `cargo clippy -- -D warnings` clean.
`metasounds_aaa_ready: false` (full UE MetaSounds parity HELD) — the web compiler remains **AUSENTE**.

---

## Architecture

```
MetaSounds Graph (authoring)
     ↓ compile (pattern: ability-graph-compiler.ts)
Web Audio node DAG + parameter modulators
     ↓
SpatialAudioSystem (HRTF, occlusion Rapier)
     ↓
Submix bus → master (metering for Cost Guard on generative)
```

### Graph node categories

| Category | Examples |
|----------|----------|
| Sources | wav, procedural oscillator, generative buffer (Law IX) |
| Modulators | LFO, envelope, random, distance curve |
| Effects | reverb send, filter, delay |
| Spatial | HRTF panner, occlusion gain |
| Control | Quartz-style clock, concurrency limit |

**Compiler pattern:** Mirror `ability-graph-compiler.ts` — DAG hash in CI (**GATE-GOLDEN-AUDIO**).

**Golden fixture:** **GF-AUDIO-001** — 10-layer combat mix.

---

## Delivery (S4.0 → S4.3)

| Step | Deliverable | Wave |
|------|-------------|------|
| **S4.0** | Compiler MVP: wav + envelope → Web Audio | E |
| **S4.1** | Modulators + spatial wiring + occlusion | E |
| **S4.2** | VS + Sequencer triggers | E |
| **S4.3** | Generative stem registration (Law IX) — **Plan B only** (#64) | E + J.1 |
| **S4.4** | Library search tool + Treasury/Freesound ingest → MetaSounds source nodes (#64) | E + J + H catalog |

---

## Acceptance

- [ ] 10-layer combat mix @ 60 FPS; 0 GC in audio hot path
- [ ] Occlusion: wall between listener/source attenuates (Rapier ray)
- [ ] Graph edit → compile → hear in viewport < 200ms
- [ ] CI: golden render of node DAG hash

---

## Prohibitions

- Howler / fourth stack — forbidden
- Play-log without compiled graph — forbidden at ship
- Platform-funded generative audio — forbidden (Law IX)

---

---

## Competitor baseline (UE5 / Unity 6)

| UE5 capability | Unity 6 | Aethel S4 target | Surpass vector |
|----------------|-----------|------------------|----------------|
| MetaSounds graph | Audio Mixer + DSP | Web Audio DAG compiler | Single stack web + desktop |
| Quartz timing | — | Clock nodes S4.0+ | Sample-accurate for rhythm games |
| Submix / bus | Mixer groups | Master + send buses | Cost Guard metering Law IX |
| Spatial audio | Spatializer | HRTF + Rapier occlusion | Physics-accurate occlusion |
| Generative stems | — | Law IX ingest → same runtime | BYOK; no platform pay |

---

## Known limitations (honest)

| Limitation | Platform | Mitigation |
|------------|----------|------------|
| Web Audio node count ceiling | web | Graph simplification at cook; bus flattening |
| No low-latency DSP custom WASM v1 | web | Native nodes only; WASM DSP phase 2 |
| Generative latency | cloud | Pre-buffer + Cost Guard reserve |
| Console audio API | desktop | Web Audio in Tauri webview; sidecar optional |

---

## Performance budgets

| Metric | Target |
|--------|--------|
| Combat mix layers @ 60 FPS | 10 layers; 0 GC hot path |
| Graph compile → audible | < 200ms |
| Occlusion ray | ≤ 4 rays/frame/source; worker batch |
| Audio thread CPU | < 10% enthusiast |

---

## Failure modes & mitigations

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| Play-log only | Law IV violation | S4.0 compiler MVP blocker |
| Fourth stack (Howler) | Prohibition #7 | CI import audit |
| GC in modulator loop | Dropouts | Pre-allocated AudioParams |
| VS `audio:play` stub | Silent gameplay | S4.2 wire to compiler output |

---

## Extended acceptance suite

- [ ] **S4-ACC-01:** Edit graph → compile → hear < 200ms
- [ ] **S4-ACC-02:** Wall occlusion attenuates ≥ 20dB (Rapier ray)
- [ ] **S4-ACC-03:** Sequencer MetaSounds track triggers on frame
- [ ] **S4-ACC-04:** GAS ability cue → MetaSounds concurrency respected
- [ ] **S4-ACC-05:** Generative stem (Law IX) → same graph node type as wav

---

## Debt & IMPROVE cross-links

| ID | Maps to |
|----|---------|
| `IMPROVE-FILM-001` | SoundCue viewport layout |
| Law IV | S4 is implementation bible |
| Law IX | S4.3 generative registration |

---

## Cross-links

| Doc | Link |
|-----|------|
| `AETHEL_ANIMATION_CINEMATICS_SPEC.md` | Sequencer audio tracks |
| `AETHEL_GAMEPLAY_FRAMEWORK_SPEC.md` | Ability cues → MetaSounds |
