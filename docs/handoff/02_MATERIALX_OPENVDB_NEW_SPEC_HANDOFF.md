# Handoff 02 — MaterialX / OpenVDB — os únicos 2 itens que precisam de SPEC NOVA

**Diferença fundamental destes 2 itens vs os outros 5 de Onda G:** todos os outros 5 já têm código (real ou stub) e endereço documental dentro dos specs existentes. **MaterialX e OpenVDB não têm nenhum arquivo `.rs` dedicado, e não têm nenhum spec bindings formal ainda.** Confirmado por busca completa:

```
grep -rln "MaterialX\|OpenVDB" --include="*.rs" .   -> nenhum resultado
grep -rn  "MaterialX\|OpenVDB" --include="*.md"  .   -> só menções de passagem no ledger, nenhum spec dedicado
```

**Não pule para código aqui.** A própria diretriz do Founder já identificou isso ("add pointers for MaterialX and OpenVDB integration without additional planning overhead" foi avaliado e rejeitado como insuficiente — eles precisam de planejamento real, não só um ponteiro de 2 linhas).

---

## Contexto que JÁ EXISTE e deve ser aproveitado (não comece do zero)

- **`packages/aethel-kernel-rust/src/volumetric_extinction_medium.rs`** (letter **ew**, CLOSED 2026-07-17) — já implementa um caminho Beer-Lambert real (integração de profundidade óptica ao longo de um raio, transmitância espectral RGB, acoplamento com `internal_voxel_density` letter **eu**). Isso é o **precursor funcional de um volume OpenVDB real** — hoje é uma densidade procedural/interna, não um formato de arquivo sparse-grid padrão da indústria. O próprio módulo já documenta honestamente: `lumen_vdb_volumetric_aaa_ready: false`.
- **`internal_voxel_density`** (letter **eu**) — provavelmente a estrutura de dados de voxel mais próxima de precisar de um formato de arquivo real. Leia este módulo antes de desenhar o spec de OpenVDB.
- O material pipeline atual (uniforms de shader, `hair-fur-model.ts`, `material-editor-models.ts` no lado web) é o ponto de entrada natural para MaterialX — leia esses arquivos para entender que sistema de material JÁ existe antes de desenhar como MaterialX se encaixa (substituindo? complementando? só import/export?).

---

## Fase 0 (obrigatória antes de qualquer código): criar os 2 documentos de spec

### `docs/architecture/AETHEL_MATERIALX_INTEGRATION_SPEC.md`

Deve responder, no mínimo (mesmo formato dos specs binding existentes — use `AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` como template de estrutura: Executive mandate → State today → Delivery map com dependências → Contracts → Acceptance/ship gates → Known limitations):

1. **Escopo real**: MaterialX vai ser (a) só import/export de grafos de material `.mtlx` de/para o sistema de material já existente, ou (b) o próprio motor de avaliação de nós de shader passa a ser MaterialX nativamente? **(a) é dramaticamente mais barato e deve ser a Fase 1 recomendada.**
2. **Crate Rust a usar**: pesquisar se existe um parser MaterialX maduro em Rust (na dúvida, integration_playbook_expert deve ser consultado por quem for implementar — não assuma que existe um crate pronto sem verificar).
3. **Contrato do módulo kernel**: `packages/aethel-kernel-rust/src/materialx_bridge.rs` — nome de funções de import/export, formato do struct de grafo de nós intermediário.
4. **Acceptance gates honestos**: ex. "importa um `.mtlx` de referência da Academy Software Foundation com N nós e produz uma árvore com N nós idem" — nunca "parity total com MaterialX 1.39".
5. **HELD explícito desde o dia 1**: avaliação de shader gráfico completo (nós customizados, functions), suporte a todas as categorias de nó da spec oficial.

### `docs/architecture/AETHEL_OPENVDB_INTEGRATION_SPEC.md`

1. **Escopo real**: leitura/escrita do formato `.vdb` (sparse voxel grid da industry-standard OpenVDB da Academy Software Foundation), conectando ao `volumetric_extinction_medium.rs`/`internal_voxel_density` já existentes como consumidor.
2. **Crate Rust a usar**: pesquisar bindings Rust para a biblioteca OpenVDB (C++) ou um parser Rust-nativo do formato `.vdb` — **isso provavelmente precisa de FFI real para a libopenvdb em C++, o que traz complexidade de build cross-platform (Windows/macOS/Linux) que precisa ser avaliada explicitamente no spec, não descoberta durante a implementação.**
3. **Contrato**: `packages/aethel-kernel-rust/src/openvdb_bridge.rs` — função de leitura que popula a estrutura de `internal_voxel_density` existente a partir de um arquivo `.vdb` real.
4. **Acceptance gates honestos**: ex. "lê um `.vdb` de referência público (ex: nuvem/fumaça de exemplo da OpenVDB) e produz uma densidade voxel que, passada pelo `volumetric_extinction_medium` já existente, produz extinção visível não-trivial".
5. **HELD explícito desde o dia 1**: escrita de `.vdb` (só leitura na Fase 1), simulação de fluidos completa (isso é o domínio de física, não de I/O de formato).

---

## Fase 1 (só depois dos 2 specs aprovados pelo Founder)

Seguir exatamente o padrão de todos os outros itens: módulo kernel com `probe_*`/`run_*_soak`, wire Tauri, testes reais, gates, ledger atualizado, letter nova via grep, PARE ao final.

---

## Prompt pronto (Fase 0 — apenas os specs, NÃO escrever código ainda)

```
TAREFA (só documentação, NÃO escreva código Rust nesta rodada):

Crie docs/architecture/AETHEL_MATERIALX_INTEGRATION_SPEC.md e docs/architecture/AETHEL_OPENVDB_INTEGRATION_SPEC.md seguindo exatamente a estrutura de docs/architecture/AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md (Executive mandate, State today com tabela de capacidades REAL/PARTIAL/AUSENTE, Delivery map com steps numerados e dependências, Contracts com assinaturas de função propostas, Acceptance/ship gates concretos e testáveis, Known limitations honestas).

Antes de escrever, leia:
- packages/aethel-kernel-rust/src/volumetric_extinction_medium.rs (precursor funcional de OpenVDB)
- packages/aethel-kernel-rust/src/internal_voxel_density.rs (se existir com esse nome; confirme via grep)
- O sistema de material atual do lado web (procure material-editor-models.ts, hair-fur-model.ts) para entender o que MaterialX precisa se encaixar em cima de

Pesquise (web search ou integration_playbook_expert, conforme disponível no seu ambiente) se existe um crate Rust maduro para parsing MaterialX (.mtlx, formato MaterialX XML da Academy Software Foundation) e para leitura do formato OpenVDB (.vdb) — documente no spec qual crate/abordagem foi escolhida e por qué, incluindo o risco real de FFI para C++ no caso do OpenVDB.

Cada spec deve deixar explícito o escopo mínimo viável honesto da Fase 1 (import/leitura apenas, sem parity total) e o que fica HELD.

Não crie nenhum arquivo .rs nesta rodada. PARE ao final e apresente os 2 specs para aprovação antes de qualquer implementação.
```
