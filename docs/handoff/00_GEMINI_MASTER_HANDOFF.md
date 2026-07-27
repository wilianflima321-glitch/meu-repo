# Gemini Master Handoff — Aethel Engine/Platform, caminho para 100%

**Gerado em:** 2026-07-27, por um agente (E2/Emergent) após auditoria real do repositório completo (não é plano teórico — cada afirmação abaixo foi verificada lendo o código-fonte real, contando linhas, checando se existe wire/IPC, e rodando `cargo check`/`clippy`/`test` onde possível).

**Por que este documento existe:** o Founder pediu para outro agente (Gemini) continuar o trabalho sem alucinar. Este documento é o **índice mestre** — ele não substitui os specs existentes, ele aponta exatamente qual spec ler, qual arquivo tocar, o que já é real vs isolado vs fantasia, e em que ordem. **Nunca invente escopo além do que os specs citados definem.**

---

## 0. Regra de ouro (não negociável, herdada da cultura já existente do repo)

1. **Um item por vez.** Nunca abra 3+ frentes em paralelo no mesmo crate/área — o próprio ledger (`docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md`) registra que 4 subagentes paralelos em Onda G já causaram estouro de uso e trabalho perdido (ver linha ~298 do ledger). Termine, teste, documente, **então** peça o próximo item.
2. **Zero-MVP / Zero fantasia.** Nunca implemente um stub que só imprime texto (`println!`) ou retorna uma fórmula fake fingindo ser a matemática real. Se não der para implementar a fundo nesta rodada, marque **HELD** explicitamente no ledger — não finja.
3. **Todo módulo de kernel segue o padrão `probe_X()` + `run_X_soak()`** em `packages/aethel-kernel-rust/src/*.rs`, e opcionalmente um wire `apps/studio-local/src-tauri/src/kernel_X_wire.rs` com `probe_X_cmd` + `run_kernel_X_soak_cmd` (`#[tauri::command]`), registrado em `lib.rs` (`pub mod kernel_X_wire;`) e `main.rs` (`use ...::kernel_X_wire::*;` + entradas em `generate_handler![]`).
4. **Nunca hardcode `distinct_from_*: true` ou qualquer `*_ready: true` sem uma asserção real por trás.** Isso é a dívida #1 do projeto (~340 ocorrências catalogadas, ver documento `04_HONESTY_DEBT_CLEANUP_HANDOFF.md`). Não adicione mais dívida desse tipo.
5. **Antes de escolher uma "letter" (identificador de 2 letras tipo `gm`, `ip4`, `jw`) para um módulo novo, GREP primeiro:**
   ```
   grep -roE "letter \*\*[a-z0-9]+\*\*" packages/aethel-kernel-rust/src/*.rs apps/studio-local/src-tauri/src/*.rs docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md | sort -u
   ```
   Não reutilize uma letter já usada. Isso já causou colisão real no passado (ver ledger, Domínios 1-3 remap ha-hg).
6. **Gates obrigatórios antes de considerar um item terminado:**
   - Kernel: `cd packages/aethel-kernel-rust && cargo check && cargo clippy -- -D warnings && cargo test --lib -- --test-threads=1`
   - Desktop/Tauri: `cd apps/studio-local/src-tauri && cargo check && cargo clippy -- -D warnings && cargo test --lib -- --test-threads=1` (no Windows do Founder, usar `$env:CARGO_TARGET_DIR="E:\aethel-target-gnu"` — ver `DISK_AUSTERITY.md`; `--test-threads=1` é **obrigatório** nesse crate por contenção real de adaptador GPU entre testes)
   - Web (`cloud-web-app/web`): `npm run typecheck && npm run lint` nos arquivos tocados + Vitest relevante
7. **Sempre atualize `docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md`** com uma linha nova na tabela final, no mesmo formato honesto das entradas existentes (o que foi CLOSED, o que ficou PARTIAL/HELD e por quê, contagem real de testes, comando de gate rodado). **Não crie um novo arquivo .md de progresso** — é sempre esse mesmo arquivo.
8. **`.cursorrules` é lei.** Releia antes de tocar em qualquer coisa relacionada a agentes/shell/sandbox — em particular a Decisão #48 ("agent tools MUST NOT use host PTY — sandbox only after L.1", já cumprida) e as demais decisões numeradas.
9. **PARE depois de cada item** (não encadeie automaticamente para o próximo) e reporte: o que foi implementado de verdade, cobertura de teste (passou/falhou), resultado dos gates, hash de commit, o que ficou HELD e por quê.

---

## 1. Mapa dos dois universos de documentação (não confundir)

Este repositório tem **duas culturas de documentação paralelas** que não se cruzam automaticamente:

| Universo | Localização | Cobre | Fonte de verdade para |
|---|---|---|---|
| **Engine/Desktop (Rust/Tauri/wgpu)** | `docs/architecture/*.md` | Kernel de física/render (`packages/aethel-kernel-rust`), app desktop nativo (`apps/studio-local/src-tauri`) | Onda G (AAA graphics), Onda J (AI release train), Onda L (Aethel Forge / Universal IDE) — ledger vivo em `AETHEL_FOCUS1_EXECUTION_PROGRESS.md` |
| **Web/Cloud (Next.js/Prisma/TS)** | `cloud-web-app/web/docs/*.md` | Portal web, IDE web, billing, marketplace, colaboração | `CONTINUATION_MASTER_PLAN_2026.md` (V28, plano ativo), `BEST_IN_MARKET_GAP_MATRIX_2026-05-22.md`, `GAP_ANALYSIS_VS_VSCODE_UNREAL.md` |

**Os arquivos `docs/gaps/00_ROADMAP_MASTER.md` e `01-06_*_GAPS.md` (raiz do repo) estão DEFASADOS (datados 2025-01-04, 77.5% médio).** Não confie nos percentuais deles — sirvem só de contexto histórico. Use sempre o ledger vivo (`AETHEL_FOCUS1_EXECUTION_PROGRESS.md`) e o `CONTINUATION_MASTER_PLAN_2026.md` como fonte real de estado atual.

---

## 2. Ordem de prioridade recomendada (visão geral — detalhe em cada handoff)

1. **`01_ONDA_G_RENDER_ENGINE_HANDOFF.md`** — 6 itens restantes do motor nativo (micro-poly/Nanite, GI upgrade, VSM, USD export, anisotropia BRDF, + limpeza). Risco técnico alto, mas bem especificado, e é exatamente o que o Founder pediu no log original.
2. **`03_ONDA_L_FORGE_IDE_HANDOFF.md`** — 8 gaps 0% do Universal IDE + 1 item PARTIAL (L.5 Rust). Já tem spec binding completo (`AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md`), ordem de dependência já definida pelo próprio spec ("Release Train FORGE-v1").
3. **`02_MATERIALX_OPENVDB_NEW_SPEC_HANDOFF.md`** — os únicos 2 itens que precisam de spec NOVA antes de código. Não pule direto para código aqui.
4. **`04_HONESTY_DEBT_CLEANUP_HANDOFF.md`** — dívida sistêmica (~340 `distinct_from_*: true` hardcoded). Trabalho mecânico mas de alto valor de credibilidade — fazer em paralelo baixa-prioridade, um módulo por vez, nunca como desculpa para não avançar itens 1-3.
5. **`05_WEB_PLATFORM_POINTERS.md`** — ponteiro para o plano já existente do lado web (não duplicar), com a lista real dos CW1-CW7 (Consolidation Wave) que estão todos **PARTIAL**, nenhum DONE.

---

## 3. Como escrever o prompt para cada item (formato exigido)

Cada handoff abaixo já vem com um **prompt pronto para copiar/colar**, no mesmo estilo que o Founder já usa (visto no log original: tarefa + spec a reler + exclusão de arquivos + gates a rodar + STOP explícito). **Não invente um formato de prompt diferente** — siga o padrão dos exemplos. Estrutura mínima de qualidade exigida em cada prompt:

1. Qual spec/documento reler antes de codar (nunca "invente o escopo")
2. Contrato exato (assinatura de função, campos de report, letter a usar)
3. Lista explícita do que NÃO tocar (arquivos de outros itens em andamento)
4. Testes obrigatórios a escrever (não apenas "adicione testes" — descrever o que cada teste deve provar)
5. Gates exatos a rodar (comando literal)
6. Instrução de HELD honesto para o que não couber nesta rodada
7. STOP explícito no final — não encadear

---

## 4. O que já foi feito nesta sessão (não refazer)

- **Onda G item 1/7 — World Partition**: `packages/aethel-kernel-rust/src/svo_terrain_world_partition.rs` (bug real de hydrate/evict corrigido) + `apps/studio-local/src-tauri/src/kernel_svo_terrain_world_partition_wire.rs` (novo, com comando stateful por-frame `world_partition_stream_tick_cmd`). Commit local `937374f76` (branch `main`). Letter usada: **ip4**. Ver ledger, entrada `2026-07-27`.
- Bônus: `unused_mut` real + 2 `manual_clamp` + 1 `#[allow(too_many_arguments)]` documentado em `entropy_gpu_particles.rs` (débito do commit anterior "Wave G.3", não relacionado ao item 1/7, mas corrigido de passagem pois bloqueava o clippy gate do crate inteiro).

**Próximo item real: Onda G item 2/7 (ver `01_ONDA_G_RENDER_ENGINE_HANDOFF.md`, seção Micro-Poly/Nanite ou GI, o que estiver mais maduro).**
