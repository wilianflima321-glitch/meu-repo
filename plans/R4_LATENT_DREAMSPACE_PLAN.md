# Round R4 — Aethel Latent Dreamspace & Protocolo de Bytecode Espacial (.asbc)

**Modo:** Architect → Code (implementação backend/kernel somente — **Iron Wall: zero UI/UX/frontend**)
**Autor:** Backend/Kernel Engineer (DeepSeek)
**Data:** 2026-08-18
**Baseline confirmado em disco:** R3 physics pillars fechado (letras `kz`/`la`/`lb`), harness kernel **1561/1561**, studio **243 lib + 80 bin**, wire-check **138=138/27 Active**, ipc-check **156 bijection Public=122**, wire_reachability **27 probes** (drift runtime 26), G.% = 15, `product_present_ready = false`.

---

## 1. Mandato do Founder (diretiva ativa — Latent Dreamspace / .asbc / Onda N)

> **"deixe os mds alinhados cuida so do beckend"** — manter os MDs alinhados (planos + ledgers + Onda N = HELD) e implementar **somente backend/kernel**.

O Founder propôs a **Aethel Latent Dreamspace & Protocolo de Bytecode Espacial (.asbc)**: substituir comunicação espacial de agentes por **texto/JSON** por **bytecode binário de 32 bytes zero-copy**, com um **Micro-Sonho GPU** (pré-simulação de impacto em grid SDF antes de aplicar à cena real) e um **Tensor Holográfico de Cena** (estado da cena em 512 bytes para o Maestro ler em 1ms). Mais **6 Pilares da Inteligência Viva**. E o diagnóstico da **Onda N (Quantitative Finance)** com decisão vinculante de **DEFER para pós-launch**.

**Critério de prontidão (Zero-MVP / Anti-Mock):** nenhum `ready` sem soak determinístico completo; flags AAA permanecem `false` (HELD) — estes são solvers de backend determinísticos, não shipments AAA. O Pillar 6 (Custo Zero de Hardware) é um **invariante transversal** (SoA contíguo + zero-alloc hot loop + budgets 1ms/2ms fail-closed), não um kernel separado.

---

## 2. Padrão a replicar (medido em disco — R3 `celestial_orbital_dynamics` / R2-K `cinema_hot_loop_composition`)

Cada kernel segue **exatamente** o padrão estabelecido:

1. **Substrate** `packages/aethel-kernel-rust/src/<module>.rs` (~900–1600L):
   - Header doc (letra, round, gap fechado, honestidade), constantes `*_FP_SEED`/`*_FP_FOLD`/`*_EVIDENCE_KIND` com a letra na constante.
   - Estruturas `#[repr(C)]` SoA / solver determinístico, `serde::{Serialize, Deserialize}` no report.
   - Struct `Measured` interna (contadores reais, **nada mockado**), `evidence_fingerprint()` (cadeia `hash_mix` com seed+fold), `readiness()` (soak-gated: TODOS os invariantes), `run_measured_pass()`, `Report` (campos `distinct_from_*` para todos os peers + irmãos R4 + flags AAA sempre `false` + `coins/agones/quic` false).
   - `pub fn run_<module>_soak()` (passa duas vezes, compara fingerprint bit-a-bit) + `pub fn probe_<module>()` (delega ao soak).
   - `#[cfg(test)] mod tests` — suíte AAA (≥11 testes): invariantes matemáticos exatos, determinismo, rollback/branching, zero-alloc keep-capacity, budget fail-closed, finite/bounded, edge-fail-safes, distinctness.
2. **Wire** `apps/studio-local/src-tauri/src/kernel_<module>_wire.rs` (~380–450L): `WireReport` camelCase + `to_report`, `probe_<module>_wire()` (mede `wire_on_surface` via `ipc_surface::acl_for` nos 2 comandos), `#[tauri::command] probe_<module>_cmd`, `SoakWireReport` + `soak_to_wire`, `#[tauri::command] run_kernel_<module>_soak_cmd`, 3 testes (wire honesto = espelha kernel; nunca reivindica AAA; soak delega ao kernel).
3. **Registro:** `kernel_registry.rs` (+1 entrada `Active`, bump `REGISTRY_VERSION`, `WIRES_ON_DISK`/`REACHABLE_WIRE_COUNT`/`ACTIVE_WIRE_MODULES`) + `ipc_surface.rs` (+2 ACL `Public`/`KernelWire` não-hot, bump counts/versão) + `wire_reachability.rs` (+1 probe por wire → `ACTIVE_WIRE_PROBE_CMDS`, drift runtime) + studio `lib.rs` (`pub mod kernel_<module>_wire;` + macro `register_commands!` +2) + kernel `lib.rs` (`pub mod <module>;` anexado ao FINAL, após L862).

**Anti-padrões a rejeitar (Deep Executor Critique):** `f32::signum(+0.0)=1.0` (zero-guard explícito), iteração determinística (nunca `while` sem teto), alloc no hot loop, fingerprint que omite invariante, `ready` sem soak duplo bit-idêntico, budget sem `fail-closed cut`, f16 sem tolerância de quantização provada.

---

## 3. Os 3 sistemas core

### 3.1 Fase A — `latent_dreamspace_bytecode.rs` (letra **lc**, R4-A) — Protocolo de Bytecode Espacial (.asbc)

**Gap:** comunicação espacial de agentes por texto/JSON — **ZERO bytecode binário espacial** em disco.

**Conteúdo:**
- **`SpatialBytecodeEntity`** — `#[repr(C, align(32))]`, **32 bytes exatos** (layout verificado por `size_of`/`align_of` + `offset_of` em teste):
  | Campo | Tipo | Offset | Bytes |
  |---|---|---|---|
  | `entity_id` | `u32` | 0 | 4 |
  | `position_fp16` | `[u16; 3]` | 4 | 6 |
  | `rotation_quat` | `[u16; 4]` | 10 | 8 |
  | `velocity_fp16` | `[u16; 3]` | 18 | 6 |
  | `matter_id` | `u16` | 24 | 2 |
  | `semantic_tag_flags` | `u32` | 26 | 4 |
  | `spatial_hash` | `u32` | 28 | 4 |
  | **total** | | | **32** |
- **Quantização f16 ↔ f32 determinística** (range-aware por eixo: posição `[-1e4, 1e4]` m, quaternion normalizado com `w ≥ 0`, velocidade `[-1e3, 1e3]` m/s); encode/decode round-trip com **erro de quantização limitado e provado** (tolerância determinística).
- **Batch SoA contíguo de 10.000 entidades ≈ 320 KB** — conversão `&[SpatialBytecodeEntity]` ↔ fat pointer `as_bytes`/`from_bytes` **zero-copy** (semântica memmap2/SharedArrayBuffer, sem alocação no hot loop).
- **Spatial hash** FNV-1a derivado de (célula grid, matter_id, flags) — determinístico.
- **Decode fail-closed** (magic/version/tamanho/alinhamento inválidos → erro, nunca UB/panic).
- **Medição de latência de leitura** (assert budget 0.1ms em passagens determinísticas via contador de passes).

**Invariantes de teste (≥11):** `size_of == 32 && align_of == 32` + offsets exatos; round-trip f16 com erro ≤ tolerância; batch 10.000 ≈ 320 KB exato; zero-copy `from_bytes`/`as_bytes` bit-idêntico; hash espacial determinístico e sensível à célula; decode fail-closed (magic/tamanho/alinhamento); determinismo bit-a-bit; zero-alloc hot loop keep-capacity; budget 0.1ms; finite/bounded; soak deterministico + probe==soak; distinctness ≥ peers.

### 3.2 Fase B — `micro_dream_gpu_pass.rs` (letra **ld**, R4-B) — Micro-Sonho GPU (Dream Pass)

**Gap:** nenhuma pré-simulação de impacto "no sonho" antes de aplicar à cena real — **ZERO**.

**Conteúdo:**
- **Grid volumétrico SDF de sonho 64³ (128³ no tier High Law XV)** — compõe `sdf_contact_blending` (**kq**) + `stochastic_virtual_sdf` (**eo**) + `four_dimensional_time_sdf` (**dv**) como substratos reais (Espectro Sólido vs Metamorfo — **zero edição de substrato**).
- **Hard budget 1ms fail-closed**: `run_dream_pass` mede o custo; estouro → **corta (fail-closed)**, retorna parcial com flag `budget_cut`, e **nunca** aplica parcial à cena real.
- **10 physics ticks de preview**: compõe `physics_world`/`physics_world_solvers` (S-17, 240 Hz) — simula 10 ticks determinísticos no "sonho" e só aplica à cena real se estável (`apply_dream_to_scene` fail-closed).
- **Composição câmera/luz + impacto físico** (camera/light composition + impact preview): vetores `camera_compose`/`light_compose`/`impact_preview` determinísticos.
- **Tier Law XV**: `capability` → grid 64³/128³, ticks 10, budget 1ms (escala de hardware real, nunca exclusão).

**Invariantes de teste (≥11):** grid 64³ densidade finita; SDF contact via kq compõe; budget 1ms respeitado no tick nominal; estouro → `budget_cut` fail-closed sem aplicar; 10 ticks preview determinísticos; `apply_dream_to_scene` só com estável; composição câmera/luz finita; tier High usa 128³; determinismo bit-a-bit; zero-alloc keep-capacity; finite/bounded; soak deterministico + probe==soak; distinctness.

### 3.3 Fase C — `holographic_scene_tensor.rs` (letra **le**, R4-C) — Tensor Holográfico de Cena

**Gap:** o Maestro não lê o estado da cena em 1ms — só JSON pesado. **ZERO tensor latente**.

**Conteúdo:**
- **Tensor latente de cena: 256 valores `f32` / 512 bytes** — `#[repr(C, align(64))]`, `serde` no report.
- **5 famílias determinísticas** (cada uma ~51 valores → 256 total): `Densidade_Espacial`, `Tensao_Dramatica`, `Indice_Oclusao`, `Calor_Iluminacao`, `Caos_Fisico`.
- **Condensação determinística da cena real** (contagens de entidades, densidade por célula, oclusão média, iluminação média, caos físico via desvio de energia) — **nada mockado**; consome o grid R4-B (`micro_dream_gpu_pass`) + SDF.
- **Redução O(1)** (mean/max/energy por família) + **serialização binária 512B** para o Maestro ler em 1ms.
- **Distância de similaridade entre tensores** (para o Maestro comparar estados) determinística.

**Invariantes de teste (≥11):** `size_of == 512 && align_of == 64`; 5 famílias somam exatamente 256 valores; valores bounded/finite para cena estática vs caótica; tensão dramática sobe com energia; oclusão monótona com densidade; determinismo bit-a-bit; redução O(1) sem alloc; distância determinística (idêntico = 0, distinto > 0); soak deterministico + probe==soak; distinctness.

---

## 4. Os 6 Pilares da Inteligência Viva

### 4.1 Fase D — `multiverse_rollback_branching.rs` (letra **lf**, R4-D) — Ramificação de Multiverso

**Gap:** rollback existe (`deterministic_rollback` **g21**) mas **sem ramificação de múltiplos futuros** — ZERO.

**Conteúdo:**
- Compõe `deterministic_rollback` (**g21**): `RollbackJournal` + `WorldCheckpoint` + `rollback_to` + re-sim.
- **4 futuros paralelos** a partir de um checkpoint pai, cada um com policy divergente determinística (agressivo / cauteloso / neutro / caótico); re-sim **bit-idêntica por branch**.
- **Cinematic Tension Index (CTI)** — score por futuro (energia cinética, proximidade de colisão, delta de estado) → seleção do branch de melhor tensão.
- **Hard budget 2ms fail-closed** (mesma regra do micro-dream: estouro → corta, nunca aplica parcial).
- Rollback ao checkpoint pai após seleção; **divergência medida** entre branches.

**Invariantes de teste (≥11):** 4 branches re-sim determinísticos bit-idênticos; cada branch diverge com sua policy; CTI ordena branches (agressivo > cauteloso em energia); branch de maior CTI é selecionável; budget 2ms; estouro fail-closed; rollback ao pai bit-idêntico; determinismo cross-seed; zero-alloc keep-capacity; finite/bounded; soak deterministico + probe==soak; distinctness.

### 4.2 Fase E — `synesthetic_resonance_matrix.rs` (letra **lg**, R4-E) — Acoplamento Sinestésico

**Gap:** áudio↔luz↔matéria sem matriz de ressonância acoplada — ZERO.

**Conteúdo:**
- Compõe `synesthetic_sensory_remap` (**dx**: density+freq → acoustic_gain/radiation_proxy/tremor_amplitude) + `living_sky_fluid_ocean_buoyancy` (**jy**) + `aethel_matter_model` (**jv**) + iluminação.
- **Matriz 3×3 de acoplamento**: Audio→Light, Audio→Matter, Light→Audio, Light→Matter, Matter→Audio, Matter→Light + auto-ramos (diagonal), com ganhos por **faixa de frequência** (baixa/média/alta) e envelope de tempo determinístico.
- **Composição provada** via feeds diretos dos campos de saída dos substratos reais (energia ressoa através dos canais).

**Invariantes de teste (≥11):** matriz 3×3 determinística (9 células); Audio→Light eleva brilho em faixa correspondente; Matter→Audio eleva ganho acústico em impacto; diagonal auto-resonância bounded; envelope temporal decai; determinismo bit-a-bit; zero-alloc keep-capacity; finite/bounded; fail-closed (canais inválidos); soak deterministico + probe==soak; distinctness.

### 4.3 Fase F — `gaze_intent_anticipation.rs` (letra **lh**, R4-F) — Predição de Olhar & Intenção

**Gap:** foveação existe (`gaze_foveated_reprojection` + `gaze_foveated_ui_collapse`) mas **sem antecipação de intenção 300ms** — ZERO.

**Conteúdo:**
- Compõe `gaze_foveated_reprojection` + `gaze_foveated_ui_collapse`.
- **Look-ahead 300ms**: de posição/velocidade/aceleração do olhar → ponto focal futuro (projeção parabólica **clampada em 300ms**), consumido pela reprojeção foveada.
- **Classificação de intenção determinística** (fixação / varredura / antecipação) via estatísticas de saccade.
- **Focal rendering hint** (região de alta prioridade) para o renderer foveado.
- **Fail-closed**: olhar inválido → sem predição (nunca extrapola lixo).

**Invariantes de teste (≥11):** look-ahead ≤ 300ms sempre; olhar estático → predição = mesmo ponto; olhar com velocidade → ponto avança na direção; saccade → classifica antecipação; fail-closed (zero/infinito → sem predição); determinismo bit-a-bit; zero-alloc keep-capacity; finite/bounded; soak deterministico + probe==soak; distinctness.

### 4.4 Fase G — `narrative_tension_clock.rs` (letra **li**, R4-G) — Relógio de Tensão Narrativa

**Gap:** nenhum relógio narrativo harmônico — ZERO.

**Conteúdo:**
- **Oscilador harmônico 0.1 Hz** (período 10s) com fase determinística e **phase machine**: `calmaria` → `antecipação` → `clímax` → `resolução` (ciclo contínuo).
- **`tension(t)`** = função harmônica de fase (senoidal + envelope por evento); `narrative_phase()` classifica a fase corrente.
- **Impulso de tensão** por eventos de gameplay via integração determinística (acoplável ao CTI do R4-D e ao micro-dream do R4-B).
- Determinismo, zero-alloc, fail-closed (fase/tempo inválidos → clamp).

**Invariantes de teste (≥11):** período 0.1 Hz (10s) provado (retorna à fase após 10s); sequência de fases cíclica correta; `tension` bounded [0,1]; impulso eleva tensão e decai; determinismo bit-a-bit; zero-alloc keep-capacity; fail-closed (dt inválido → no-op); finite/bounded; soak deterministico + probe==soak; distinctness.

### 4.5 Fase H — `matter_memory_scarring.rs` (letra **lj**, R4-H) — Memória de Matéria & Cicatrizes

**Gap:** destruição existe (`composite_fracture` **kh** / `voronoi_destruction_3d` **ip2** / `mnemonic_matter_entropy` **dw**) mas **sem memória persistente/cicatrizes** — ZERO.

**Conteúdo:**
- Compõe `mnemonic_matter_entropy` (**dw**) + `composite_fracture` (**kh**) + `voronoi_destruction_3d` (**ip2**).
- **Memória de matéria persistente**: `ScarMap` hash celular → (danos acumulados, last_impact_time, severity) que **NÃO se regenera** — decay determinístico (o mundo lembra).
- **`apply_impact` / `scar_query` / `decay_scars`**: impacto registra cicatriz; query lê severidade; decay desbota com tempo mas nunca zera a memória.
- **Persistência**: serialização binária do mapa de cicatrizes (Zero Amnesia — save/reload).

**Invariantes de teste (≥11):** impacto registra dano; dano acumulado (2 impactos > 1); sem regeneração espontânea (decay não zera memória); determinismo bit-a-bit; round-trip de persistência bit-idêntico; zero-alloc keep-capacity; fail-closed (célula inválida); finite/bounded; soak deterministico + probe==soak; distinctness.

### 4.6 Pillar 6 — Custo Zero de Hardware (invariante transversal)

- **SoA contíguo** em TODOS os kernels lc→lj; hot loops **zero-alloc com `keep_capacity`**; **sem JSON no hot path**; **budgets 1ms/2ms fail-closed**.
- Verificado por **teste de zero-alloc** + **teste de budget** em cada kernel (padrão R3 já estabelecido).

---

## 5. Onda N — Quantitative Finance (DECISÃO VINCULANTE: HELD / pós-launch)

Diagnóstico do Founder (alinhado com `cloud-web-app/web/lib/server/quant/`, 21 arquivos já existentes):

- **`vanguardQuantReady = false`**, **`investmentGrade = HELD`** — finance NÃO é investment-grade.
- **5 gaps reais**: ① broker connectors; ② modelos ONNX time-series; ③ backtest Monte Carlo 10 anos; ④ isolamento VRAM GPU; ⑤ zero-knowledge key vault.
- **Decisão:** **DEFER para pós-launch** — Onda N opt-in; **prioridade atual = Rounds R2–R6 + Launch Hard Gate #72**. **NÃO construir/alterar os 21 arquivos agora.**
- **Alinhamento MD:** registrar `vanguardQuantReady = false` / `investmentGrade = HELD` / "Onda N deferred pós-launch" no Progress + Master Map + Index (feito na rodada).

---

## 6. Integração (Fases A–H — idêntico, por kernel)

| Arquivo | Edição |
|---|---|
| `packages/aethel-kernel-rust/src/lib.rs` | +8 `pub mod <module>;` anexados ao FINAL (após L862, com doc comment de carta) |
| `packages/aethel-kernel-rust/src/kernel_registry.rs` | +8 entradas `Active` (alfabética), `WIRES_ON_DISK` 138→**146**, `REACHABLE_WIRE_COUNT` 27→**35**, `ACTIVE_WIRE_MODULES` 27→**35**, `REGISTRY_VERSION` bump, notas R4 no header |
| `apps/studio-local/src-tauri/src/ipc_surface.rs` | +16 ACL (`probe_<module>_cmd` + `run_kernel_<module>_soak_cmd`, `Public`/`KernelWire`/não-hot, alfabética), `REGISTERED_COMMAND_COUNT` 156→**172**, `PUBLIC` 122→**138**, `IPC_SURFACE_VERSION` bump, header doc |
| `apps/studio-local/src-tauri/src/wire_reachability.rs` | +8 probes → `ACTIVE_WIRE_PROBE_CMDS` **35**, drift runtime 34, testes de contagem |
| `apps/studio-local/src-tauri/src/lib.rs` | +8 `pub mod kernel_<module>_wire;` + macro `register_commands!` (+16 comandos) |
| `apps/studio-local/src-tauri/src/main.rs` | via `register_commands!` (nenhuma edição manual) |

---

## 7. Gates Law XI (obrigatórios — após cada Fase)

```text
Kernel:  set "CARGO_TARGET_DIR=E:\aethel-target-gnu"
         cd packages/aethel-kernel-rust
         cargo check
         cargo clippy --lib -- -D warnings     # zero warnings
         cargo test --lib                      # harness do kernel = verde

Studio:  cd apps/studio-local/src-tauri
         cargo clippy --all-targets -- -D warnings
         cargo test
         cargo xtask wire-check   # (raiz, via .cargo/config.toml) 146-35
         cargo xtask ipc-check    # 172-138
```

---

## 8. Ledgers (Zero Amnesia — alinhar MDs ao fechar, via PowerShell)

> **ATENÇÃO (lição R3):** os 3 MDs grandes (Progress 2057L, Master Map 1514L, Index 659L) **FALHAM apply_diff** ("above the size limit"). Usar a técnica PowerShell `insert_ledger_row.ps1` + snippet .txt (ASCII-only), preservando BOM/CRLF vs LF/UTF-8.

- `docs/architecture/AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md` — changelog **1.4ci** (R4 Latent Dreamspace) inserido na **L1343** (após 1.4ch L1342, antes de 1.4ce L1343 atual — novo 1.4ci entra entre eles, mantendo o grupo R3/R4 contíguo).
- `docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md` — linha do Session-log inserida na **L202** (após r3-physics-pillars L201, antes de `---` L203) com R4-A..R4-H + Onda N HELD.
- `docs/architecture/AETHEL_STUDIO_SUPREMACY_INDEX.md` — changelog novo inserido na **L577** (newest-first, acima de r3-physics-pillars L577 atual → o novo entra antes) com R4 + Onda N `investmentGrade = HELD`.
- Registrar `G.% stays 15`, `product_present_ready false`, `vanguardQuantReady false`, `investmentGrade HELD`, contagens finais pós-gates (wire-check **146-35**, ipc-check **172-138**, kernel test count, studio test count).

---

## 9. Critério de fechamento do Round R4

1. 8 substrates lc→lj implementados com suítes AAA (≥11 testes cada), soak duplo bit-idêntico, flags AAA fail-closed HELD.
2. 8 wires studio (probe + soak + 3 testes each) + `pub mod` no studio `lib.rs`.
3. Registry **146/35**, IPC **172/138**, wire_reachability **35 probes** (drift 34), kernel `lib.rs` +8.
4. **Gates Law XI ALL GREEN** (kernel clippy -D warnings + test; studio clippy --all-targets + test; xtask wire-check + ipc-check).
5. Ledgers alinhados (Master Map 1.4ci, Progress row, Index changelog) + Onda N = HELD documentado.
6. `G.% stays 15`; `product_present_ready false`; próximo: Focus 2 / G.% next band.
