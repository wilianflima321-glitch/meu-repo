# Handoff 01 — Onda G: Motor de Render Nativo (Rust/Tauri/wgpu) — 6 itens restantes de 7

**Já feito (não refazer):** Item 1/7 World Partition — ver `00_GEMINI_MASTER_HANDOFF.md` §4 e ledger `2026-07-27`.

**Contexto obrigatório antes de começar qualquer item aqui:** todo módulo listado abaixo vive em `packages/aethel-kernel-rust/src/` (kernel puro, sem GPU/janela, compila e testa em qualquer máquina) e opcionalmente tem um wire em `apps/studio-local/src-tauri/src/kernel_X_wire.rs` (camada Tauri/IPC, só compila com toolchain Tauri completo). **A queixa original do Founder é que a matemática existe mas não está "plugada no frame loop/render graph"** — ou seja, mesmo quando o wire existe, ele normalmente só expoãe um probe/soak estático chamado sob demanda, **não** roda a cada frame com dados reais de câmera/cena, e não afeta o pixel final desenhado pelo `wgpu_renderer.rs`. Cada item abaixo diz exatamente o nível real de "plugagem" hoje.

---

## Item 2/7 — Micro-Poly / Nanite-equivalent (decimação QEM)

**Arquivo kernel:** `packages/aethel-kernel-rust/src/nanite_micropolygon_compute_rasterizer.rs` (350 linhas, letter **ip5**, quality **hu**)
**Wire:** **Não existe** (`grep -rl "nanite_micropolygon" apps/studio-local/src-tauri/src/` retorna vazio) — zero exposição Tauri, exatamente como World Partition estava antes do item 1/7.
**Estado real do código:** o módulo já implementa culling de cluster (frustum/backface/HZB) e rasterização de software fixed-point para micro-triângulos — **isso é real**, não é stub. O que falta é exatamente o padrão do item 1/7: um wire novo + verificar se há algum bug de honestidade análogo ao que foi achado em World Partition (leia o código com esse espírito crítico — não assuma que está correto só porque é grande).

**Tarefa:**
1. Releia o arquivo completo, entenda o contrato de `probe_*`/soak existente (se já tiver) ou crie um `run_nanite_micropolygon_compute_rasterizer_soak()` seguindo o padrão de `svo_terrain_world_partition.rs` (múltiplos ticks provando: culling reduz contagem de triângulos visualmente ocultos, HZB rejeita clusters atrás de oclusores, determinismo com mesma seed, rejeição segura de entrada inválida).
2. Crie `apps/studio-local/src-tauri/src/kernel_nanite_micropolygon_compute_rasterizer_wire.rs` com `probe_*_cmd` + `run_kernel_*_soak_cmd`. **Considere** (não obrigatório, mas eleva a qualidade tal como fiz em World Partition) um comando stateful por-frame se fizer sentido para culling de câmera dinâmica.
3. Registre em `lib.rs` + `main.rs` (`.manage` se precisar de estado, + `generate_handler!`).
4. Escolha uma letter nova via grep (não reuse `ip5`, que já é do kernel — o wire pode reusar a mesma letter do kernel, esse é o padrão observado em `ip4`/`gm`).
5. `nanite_ready`/`unreal_nanite_parity_ready` deve ficar **false** — não existe LOD hierárquico de disco (streaming de clusters), não existe atlas de malha comprimido. Documente HELD.

---

## Item 3/7 — GI / Radiance Cascades (upgrade, não do zero)

**Arquivo kernel:** `packages/aethel-kernel-rust/src/radiance_cascades_gi.rs` (716 linhas, letter **gm**) — **já substitui um stub anterior** ("Replaces ZST / println-theater `calculate_cone_tracing_occlusion`"), tem cascatas de probes multi-resolução reais.
**Wire:** **Já existe** — `apps/studio-local/src-tauri/src/kernel_radiance_cascades_gi_wire.rs` (115 linhas). Padrão probe/soak estático clássico (sem estado por-frame).

**O gap real aqui é diferente dos outros:** não é "criar o wire", é **elevar de probe estático para algo que realmente influencia o pixel final**. Isso significa:
1. Verificar em `apps/studio-local/src-tauri/src/wgpu_renderer.rs` se há algum bind group / uniform buffer que consome a saída da cascata de radiância. Hoje, quase certamente **não há** — confirme lendo o arquivo.
2. Se não houver, a tarefa é: (a) adicionar um comando stateful por-frame no wire (mesmo padrão de `world_partition_stream_tick_cmd`) que recebe posição de câmera + geometria simplificada da cena e retorna a irradiância da cascata mais fina; (b) documentar explicitamente que o **consumo real pelo shader/pipeline de shading ainda é HELD** se não for possível fechar o loop completo (WGSL consumindo o buffer) nesta rodada — **não afirme `radianceCascadesGiFrameLoopReady: true` sem provar com um teste que o buffer chega ao shader**.
3. Se conseguir ir além (fechar o loop WGSL), documente exatamente qual shader/pass foi tocado, com nome de arquivo `.wgsl` e nome do bind group.

**Honestidade:** `lumen_gi_parity_ready` continua **false**. Não há screen-space traces, não há surface cache dinâmico como Lumen.

---

## Item 4/7 — VSM (Virtual Shadow Maps)

**Arquivo kernel:** `packages/aethel-kernel-rust/src/virtual_shadow_maps_vsm.rs` (296 linhas, letter **ip7**, quality **hu**) — paginação de 16384×16384 virtual, páginas físicas 128×128, culling/hidratação/clipmap de cascata de profundidade. **Código real, não stub.**
**Wire:** **Não existe** (mesma situação do item 2).

**Tarefa:** mesmo padrão do item 1/7 (World Partition) — este é estruturalmente o mais parecido:
1. Releia o módulo com olhar crítico igual ao que usei em World Partition — **verifique especificamente se a contagem de páginas hidratadas/evictadas é medida por identidade real de página** (análogo ao bug que encontrei) ou por algum proxy que não varia de verdade com movimento de luz/câmera. Isso é exatamente o tipo de bug que este projeto já teve uma vez — procure a mesma classe de erro.
2. Crie `kernel_virtual_shadow_maps_vsm_wire.rs` com probe/soak + (idealmente) comando stateful por-frame recebendo posição de luz.
3. `unreal_vsm_parity_ready` deve continuar **false** até o pipeline de shadow atual em uso pelo renderer ser de fato substituído por este (confirme lendo `wgpu_renderer.rs`/`pbr-shadow-runtime.ts` qual shadow mapping está realmente ativo hoje).

---

## Item 5/7 — USD Export real (.usda)

**Arquivo kernel:** `packages/aethel-kernel-rust/src/usd_universal_exporter.rs` — **APENAS 14 LINHAS**. Isto é literalmente `println!("[USD Exporter] Compilando...")` duas vezes, sem nenhuma serialização real. **Isto é o item mais próximo de "pura fantasia" encontrado nesta auditoria** — mais grave do que o resto da lista original sugeria.
**Referência funcional a espelhar:** `packages/aethel-kernel-rust/src/usd_importer_bridge.rs` (332 linhas, letter **gq**) — **este sim é real**: parser ASCII `#usda` linha-a-linha (`def Xform "Name" { float3 xformOp:translate = ... }`) + caminho binário `PXR-USDC` via `memmap2`. Já tem wire (`kernel_usd_importer_bridge_wire.rs`) e já foi re-verificado/corrigido em 2026-07-25 (ver ledger `cw5d`).

**Tarefa:**
1. **Reescreva `usd_universal_exporter.rs` do zero, de verdade.** Não é um ajuste, é implementação real: serializar a cena (transforms, hierarquia Xform, pelo menos malhas/pontos básicos) para o formato ASCII `.usda` real, espelhando a gramática que o importer já sabe ler (para garantir round-trip: exportar e reimportar deve dar a mesma árvore de Xforms).
2. **Escreva um teste de round-trip real**: monte uma cena sintética pequena (2-3 Xforms com translate/rotate/scale), exporte para `.usda` (string em memória ou arquivo temporário), reimporte usando `UsdImporterBridge` já existente, e assert que a árvore resultante bate com a original. **Isso é a prova de honestidade mínima aceitável aqui.**
3. `.usdc` binário fica explícitamente **HELD** (o próprio log original do Founder já autorizou deferir isso: "binary .usdc explicitly deferred if needed").
4. Crie o wire `kernel_usd_universal_exporter_wire.rs` seguindo o padrão.
5. Escolha uma letter nova (não reuse `gq`, que é do importer).

---

## Item 6/7 — Anisotropic BRDF (Ward/GGX-aniso)

**Arquivo kernel:** `packages/aethel-kernel-rust/src/anisotropic_neural_microfacets.rs` — **APENAS 17 LINHAS**. A "implementação" atual é `light_intensity * (1.0 / (curvature_tensor + 0.01))` — **isto não é GGX anisotrópico, é uma função inventada de uma linha.** Este é o segundo item mais próximo de "pura fantasia" encontrado.

**Tarefa:**
1. Implemente a BRDF anisotrópica de verdade: **GGX anisotrópico** (Burley/Disney ou Heitz — pesquise a formulação padrão da indústria: termo de distribuição `D` com `alpha_x`/`alpha_y` derivados de tangente/bitangente + rugosidade, termo de Fresnel Schlick, termo de geometria Smith). Parâmetros de entrada reais: vetor normal, tangente, bitangente, `alpha_x`, `alpha_y`, vetor de luz, vetor de visão — não um único escalar `curvature_tensor` fake.
2. Escreva testes que provem propriedades físicas conhecidas da BRDF anisotrópica: (a) quando `alpha_x == alpha_y`, o resultado deve convergir para GGX isotrópico padrão (compare com uma implementação de referência isotrópica se já existir uma no kernel, ou derive analiticamente); (b) o highlight deve alongar na direção de menor rugosidade (teste numérico: compare intensidade em duas direções de meio-vetor diferentes); (c) energia não pode explodir/ser negativa para nenhuma combinação razoável de parâmetros de entrada.
3. Crie o wire, letter nova.
4. Documente explicitamente que isso é CPU-side (Rust) — conectar ao shader WGSL do material real (`hair-fur-model.ts`/pipeline de material do wgpu) é outro passo, HELD se não couber nesta rodada.

---

## Ordem sugerida entre os itens 2-6

1. **Item 4 (VSM)** primeiro — mesmo padrão exato do item 1 (World Partition) já comprovado, menor risco de surpresa.
2. **Item 2 (Micro-Poly)** segundo — mesmo padrão, código já real.
3. **Item 5 (USD export)** terceiro — mais trabalho real (reescrever do zero), mas bem delimitado e com referência funcional (`usd_importer_bridge.rs`) para espelhar.
4. **Item 6 (Anisotropic BRDF)** quarto — exige pesquisa de fórmula (mais risco de erro matemático se apressado).
5. **Item 3 (GI upgrade)** último — é o mais ambíguo ("elevar" algo que já existe, não criar do zero) e o de maior risco de conflito com trabalho futuro em `wgpu_renderer.rs` (arquivo tocado por múltiplos itens — nunca trabalhe nele em paralelo com outro item que também o toque).

---

## Prompt pronto (exemplo para o Item 4/7 — VSM; adapte para os demais substituindo nomes)

```
Releia packages/aethel-kernel-rust/src/virtual_shadow_maps_vsm.rs por completo antes de escrever qualquer código. Releia também packages/aethel-kernel-rust/src/svo_terrain_world_partition.rs e apps/studio-local/src-tauri/src/kernel_svo_terrain_world_partition_wire.rs como referência de padrão (commit 937374f76) — replique a mesma qualidade: bug real corrigido se encontrado, soak multi-tick, wire com comando stateful por-frame.

TAREFA:
1. Audite virtual_shadow_maps_vsm.rs procurando a mesma classe de bug já encontrada em World Partition: contadores de página hidratada/evictada que não variam de verdade com movimento real de luz/câmera. Se encontrar, corrija na raiz (não só no wire).
2. Adicione run_virtual_shadow_maps_vsm_soak() com múltiplos ticks provando comportamento real de streaming de páginas.
3. Crie apps/studio-local/src-tauri/src/kernel_virtual_shadow_maps_vsm_wire.rs (probe/soak padrão + comando stateful por-frame se fizer sentido para posição de luz dinâmica).
4. Antes de escolher uma letter, rode: grep -roE "letter \*\*[a-z0-9]+\*\*" packages/aethel-kernel-rust/src/*.rs apps/studio-local/src-tauri/src/*.rs docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md | sort -u — não reuse nenhuma já listada.
5. NÃO toque em: nanite_micropolygon_compute_rasterizer.rs, usd_universal_exporter.rs, anisotropic_neural_microfacets.rs, radiance_cascades_gi.rs, wgpu_renderer.rs (a menos que seja estritamente necessário registrar o novo wire) — esses são os outros itens da mesma lista, em outras rodadas.
6. Rode cd packages/aethel-kernel-rust && cargo check && cargo clippy -- -D warnings && cargo test --lib -- --test-threads=1, depois cd apps/studio-local/src-tauri && cargo check && cargo clippy -- -D warnings.
7. unreal_vsm_parity_ready deve ficar false. Documente HELD honestamente qualquer parte que não fechar.
8. Atualize docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md com uma linha nova no mesmo formato das entradas existentes.

PARE ao final e reporte: bug encontrado (se houver), cobertura de teste, resultado dos gates, hash de commit, o que ficou HELD.
```
