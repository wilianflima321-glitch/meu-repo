# 41_DOCS_NAMING_NORMALIZATION_2026-03-21 (CANONICAL)

**Data:** 2026-03-21  
**Versao:** 1.0  
**Status:** PARTIAL (documentacao legacy ainda com nomes antigos)

## Objetivo
Padronizar nomes de documentos legados em `docs/master/` sem quebrar referencias. Este documento define o mapa de renomeacao e a estrategia de transicao.

## Estrategia
1. Criar alias canonicamente numerados para os arquivos legacy.
2. Atualizar `00_INDEX.md` para apontar para os novos nomes.
3. Manter o arquivo antigo com um aviso de deprecacao ate o proximo release.
4. Remover o arquivo antigo apenas apos 2 releases com links migrados.

## Mapa de Renomeacao (Proposto)
| Atual | Novo (alvo) | Status |
| --- | --- | --- |
| `8_ADMIN_SYSTEM_SPEC.md` | `08_ADMIN_SYSTEM_SPEC_2026-03-21.md` | PLANEJADO |
| `9_BACKEND_SYSTEM_SPEC.md` | `09_BACKEND_SYSTEM_SPEC_2026-03-21.md` | PLANEJADO |
| `AI_SYSTEM_SPEC.md` | `10_AI_SYSTEM_SPEC_2026-03-21.md` | PLANEJADO |
| `LIMITATIONS.md` | `11_LIMITATIONS_2026-03-21.md` | PLANEJADO |
| `COMPETITIVE_GAP.md` | `12_COMPETITIVE_GAP_2026-03-21.md` | PLANEJADO |
| `WORKBENCH_SPEC.md` | `13_WORKBENCH_SPEC_2026-03-21.md` | PLANEJADO |

## Notas
- Este plano nao altera conteudo funcional, apenas nomes.
- A migracao sera feita em lote unico para evitar links quebrados.
- Documentos ja numerados seguem o padrao `NN_TITULO_DATA.md`.
