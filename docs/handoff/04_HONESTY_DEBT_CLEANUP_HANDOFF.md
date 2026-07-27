# Handoff 04 — Honesty Debt Cleanup (`distinct_from_*: true` e `*_ready: true` hardcoded)

## Estado real (verificado)

O Crítico Adversarial do próprio repo (auditoria 2026-07-19, `docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md` linha ~1079) documentou: **"~340 hard-coded `distinct_from_*: true` remain"**. Isso significa: em vários módulos de kernel, o campo que deveria provar que um resultado é *distinto* de um resultado de outro módulo vizinho (evitando que dois probes retornem o mesmo número por acidente/copy-paste) está fixado em `true` sem nenhuma comparação real por trás — é uma afirmação de honestidade que não é, ela mesma, honesta.

## Como encontrar (comando real, rode você mesmo antes de começar — a contagem pode ter mudado)

```bash
cd packages/aethel-kernel-rust
grep -rn "distinct_from_.*: true" src/*.rs | wc -l
grep -rln "distinct_from_.*: true" src/*.rs
```

Também procure o padrão irmão em `_ready: true` que não vem de uma expressão booleana calculada:

```bash
grep -rn "_ready: true,\?$" src/*.rs
```

(Note: nem todo `_ready: true` é dívida — muitos são o resultado literal de `let ok = a && b && c; ... X_ready: ok` onde `ok` já foi calculado antes. A dívida real é quando o literal `true` aparece **diretamente** no construtor do struct, sem uma variável calculada por cima.)

## Padrão de correção (já usado com sucesso no módulo `volumetric_extinction_medium`, letter `ew`, e no meu próprio item World Partition, letter `ip4`)

Para cada campo `distinct_from_X_field: true` hardcoded:

1. Identifique **qual** módulo vizinho ele afirma ser distinto de (geralmente está no nome do campo ou no comentário ao lado).
2. Calcule um **fingerprint real** de cada um (ex: XOR de alguns campos numéricos do próprio report, ou um hash simples), e compare os dois fingerprints em runtime.
3. Substitua o literal por uma expressão: `distinct_from_x_field: fingerprint_self != fingerprint_x_reference`.
4. Se não houver como calcular isso sem acoplar os dois crates/módulos de forma indevida, **documente explicitamente por que a afirmação é HELD** e troque o campo de `bool` para algo que não pareça uma prova (ex: renomeie para `note: String` explicando a distinção arquitetural, como fiz no wire de World Partition: em vez de inventar um `distinct_from_partition_streaming_ts: true`, eu documentei em texto natural na doc-comment do arquivo e no campo `note` que o caminho Rust nativo é architeturalmente distinto do caminho TS/web — sem fingir uma prova numérica que não existe).

## Regras

- **Não corrija isso em lote/regex automático.** Cada ocorrência precisa de entendimento do que ela realmente afirma. Trabalho mecânico, mas não thoughtless.
- **Um módulo por vez**, dentro do mesmo ritmo de "um item por vez" do resto do repo. Não é desculpa para pular Onda G/L.
- Depois de cada módulo corrigido, rode `cargo test --lib` no kernel — os testes existentes desse módulo devem continuar passando (ou você vai precisar atualizar as asserções que dependiam do hardcode).
- Atualize o ledger com uma linha por lote de módulos corrigidos (pode agrupar vários módulos pequenos numa única entrada, desde que cada um seja listado com antes/depois).

## Prompt pronto (copiar/colar)

```
Releia a auditoria do Crítico em docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md (seção "Critic audit 2026-07-19in", item 3 "Hallucinations / laziness") sobre os ~340 `distinct_from_*: true` hardcoded.

TAREFA: Escolha 5 a 10 ocorrências reais (rode `grep -rn "distinct_from_.*: true" packages/aethel-kernel-rust/src/*.rs` primeiro para confirmar a lista atual, a contagem pode ter mudado). Para cada uma:
1. Identifique o módulo vizinho que ela afirma ser distinta de.
2. Substitua o literal `true` por uma comparação real de fingerprint, OU documente HELD honestamente com uma nota textual se não houver comparação possível sem acoplamento indevido.
3. NÃO toque em módulos relacionados a Onda G (ver lista de exclusão em 01_ONDA_G_RENDER_ENGINE_HANDOFF.md) se outro agente estiver trabalhando neles em paralelo — confira `git status`/`git log` antes.

Rode `cargo check && cargo clippy -- -D warnings && cargo test --lib -- --test-threads=1` em packages/aethel-kernel-rust. Todos os testes existentes devem continuar verdes (ajuste apenas as asserções que dependiam do valor hardcoded, nunca afrouxe uma asserção sem justificar).

Atualize AETHEL_FOCUS1_EXECUTION_PROGRESS.md com a lista exata de campos corrigidos (antes → depois) e quantos hardcodes restam no total.

PARE ao final — não continue para outro lote sem reportar.
```
