# 41_DOCS_NAMING_NORMALIZATION_2026-03-21 (CANONICAL)

**Data:** 2026-03-22  
**Versao:** 1.1  
**Status:** ACTIVE (aliases criados, legacy marcado como deprecado)

## Objetivo
Padronizar nomes de documentos legados em `docs/master/` sem quebrar referencias. Este documento define o mapa de renomeacao e a estrategia de transicao.

## Estrategia
1. Criar alias canonicamente numerados para os arquivos legacy.
2. Atualizar `00_INDEX.md` para apontar para os novos nomes.
3. Manter o arquivo antigo com um aviso de deprecacao ate o proximo release.
4. Remover o arquivo antigo apenas apos 2 releases com links migrados.

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
