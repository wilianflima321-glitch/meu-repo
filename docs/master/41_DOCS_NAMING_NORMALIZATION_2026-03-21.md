# 41_DOCS_NAMING_NORMALIZATION_2026-03-21 (CANONICAL)

> **Nota (colisão `41_*`):** Este ficheiro é a **política de nomes**; não confundir com `41_AUDITORIA_MAXIMA_*` nem `41_EXECUTION_ALIGNMENT_*`. Ver `DEPRECATED_INDEX.md`.

**Data:** 2026-03-22  
**Versao:** 1.1  
**Status:** ACTIVE (transition incomplete; aliases exist, but legacy drift still requires enforcement)

## Objetivo
Padronizar nomes de documentos legados em `docs/master/` sem quebrar referencias. Este documento define o mapa de renomeacao e a estrategia de transicao.

## Reality Correction
The naming transition is only partially complete.
The directory still contains legacy compatibility files and a numeric collision:
- `41_AUDITORIA_MAXIMA_2026-03-20.md`
- `41_DOCS_NAMING_NORMALIZATION_2026-03-21.md`

For canonical interpretation:
- `41_DOCS_NAMING_NORMALIZATION_2026-03-21.md` is the active normalization authority.
- `41_AUDITORIA_MAXIMA_2026-03-20.md` is a historical draft and must not be treated as primary authority.

## Estrategia
1. Criar alias canonicamente numerados para os arquivos legacy.
2. Atualizar `00_INDEX.md` para apontar para os novos nomes.
3. Manter o arquivo antigo com um aviso de deprecacao ate o proximo release.
4. Remover o arquivo antigo apenas apos 2 releases com links migrados.

## Canonical Interpretation Rules
- Prefer numbered canonical documents over legacy aliases in all citations.
- Prefer `AETHEL_INTERFACE_BLUEPRINTS/` for interface-layer decisions when referenced by `00_INDEX.md`.
- Do not treat a legacy alias as canonical if the numbered replacement already exists.
- Do not use the presence of an old file as evidence that its naming transition is still authoritative.

## Mapa de Renomeacao (Aplicado)
| Atual | Novo (alvo) | Status |
| --- | --- | --- |
| `8_ADMIN_SYSTEM_SPEC.md` | `43_ADMIN_SYSTEM_SPEC_2026-03-22.md` | APLICADO |
| `9_BACKEND_SYSTEM_SPEC.md` | `44_BACKEND_SYSTEM_SPEC_2026-03-22.md` | APLICADO |
| `AI_SYSTEM_SPEC.md` | `45_AI_SYSTEM_SPEC_2026-03-22.md` | APLICADO |
| `LIMITATIONS.md` | `46_LIMITATIONS_2026-03-22.md` | APLICADO |
| `COMPETITIVE_GAP.md` | `47_COMPETITIVE_GAP_2026-03-22.md` | APLICADO |
| `WORKBENCH_SPEC.md` | `48_WORKBENCH_SPEC_2026-03-22.md` | APLICADO |
| `EXECUTION_PLAN.md` | `49_EXECUTION_PLAN_2026-03-22.md` | APLICADO |
| `MASTER_PLAN_ALINHAMENTO_ESTRUTURAL.md` | `50_MASTER_PLAN_ALINHAMENTO_ESTRUTURAL_2026-03-22.md` | APLICADO |
| `DUPLICATIONS_AND_CONFLICTS.md` | `51_DUPLICATIONS_AND_CONFLICTS_2026-03-22.md` | APLICADO |
| `FULL_AUDIT.md` | `52_FULL_AUDIT_2026-03-22.md` | APLICADO |
| `AUDITORIA_CRITICA_P0.md` | `53_AUDITORIA_CRITICA_P0_2026-03-22.md` | APLICADO |
| `BENCHMARK_SUPERACAO_IA_AAA.md` | `54_BENCHMARK_SUPERACAO_IA_AAA_2026-03-22.md` | APLICADO |
| `Relatorio_de_Continuacao_Auditoria_Multi-Agente.md` | `55_RELATORIO_CONTINUACAO_AUDITORIA_MULTIAGENTE_2026-03-22.md` | APLICADO |
| `AETHEL_AI_LOGIC_ENGINE_WASM.md` | `56_AETHEL_AI_LOGIC_ENGINE_WASM_2026-03-22.md` | APLICADO |
| `AETHEL_ECONOMIC_ENGINE_STRATEGY.md` | `57_AETHEL_ECONOMIC_ENGINE_STRATEGY_2026-03-22.md` | APLICADO |
| `AETHEL_IDEA_DISTILLER.md` | `58_AETHEL_IDEA_DISTILLER_2026-03-22.md` | APLICADO |
| `AETHEL_SUPERIORITY_ARCHITECTURE.md` | `59_AETHEL_SUPERIORITY_ARCHITECTURE_2026-03-22.md` | APLICADO |
| `AETHEL_TRANSFORMACAO_TECNICA_FINAL.md` | `60_AETHEL_TRANSFORMACAO_TECNICA_FINAL_2026-03-22.md` | APLICADO |
| `AETHEL_VISUAL_BRIDGE_SPEC.md` | `61_AETHEL_VISUAL_BRIDGE_SPEC_2026-03-22.md` | APLICADO |
| `FORGE_SUPERIORITY_ARCHITECTURE.md` | `62_FORGE_SUPERIORITY_ARCHITECTURE_2026-03-22.md` | APLICADO |
| `GATEWAY_SUPERIORITY_ARCHITECTURE.md` | `63_GATEWAY_SUPERIORITY_ARCHITECTURE_2026-03-22.md` | APLICADO |
| `NEXUS_SUPERIORITY_ARCHITECTURE.md` | `64_NEXUS_SUPERIORITY_ARCHITECTURE_2026-03-22.md` | APLICADO |

## Notas
- Este plano nao altera conteudo funcional, apenas nomes.
- A migracao foi feita em lote unico para evitar links quebrados.
- Documentos ja numerados seguem o padrao `NN_TITULO_DATA.md`.
- Arquivos antigos permanecem com aviso de deprecacao ate o proximo release.
- A camada de interface agora tem sua propria fonte de verdade operacional em `AETHEL_INTERFACE_BLUEPRINTS/`.
- Este documento governa naming normalization, not interface authority.
