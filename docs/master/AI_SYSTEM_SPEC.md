# AI_SYSTEM_SPEC (CANONICAL)

**Data:** 2026-03-28  
**Versao:** 2.4  
**Status:** Contrato de execucao

## 1. Escopo
Este documento descreve o estado real da camada de IA no web app (`cloud-web-app/web`) sem promessas aspiracionais.

## 2. Arquitetura real (implemented now)

```text
UI (dashboard + IDE)
  -> /api/ai/chat, /api/ai/stream, /api/ai/agent, /api/ai/action
  -> Advanced AI Provider (OpenRouter / OpenAI / Anthropic / Gemini)
  -> Telemetria (analytics + core-loop feedback)
```

Fontes de verdade:
- `cloud-web-app/web/lib/ai/advanced-ai-provider.ts`
- `cloud-web-app/web/lib/ai/openrouter-models.ts`
- `cloud-web-app/web/lib/plan-limits.ts`

## 3. Matriz de maturidade

### Implemented now
- Router multi-provider com fallback.
- Catalogo OpenRouter em tiers (`best`, `budget`, `free`) com custo/contexto por modelo.
- Selector de modelos no Studio baseado em plano e disponibilidade.
- Claims de plano no JWT (`plan`, `isPro`) para enforcement server-side.
- Mencoes no chat (`@codebase`, `@docs`, `@diff`, `@error`) com parser dedicado.

### Partial
- RAG persistente com vetor em producao (estrutura existe, operacao depende de runtime/credenciais).
- Evidencia L4/L5 completa para rollback/workspace coverage.
- Execucao totalmente isolada de agent/runtime para cenarios enterprise.

### Aspirational target
- Memoria persistente cross-workspace com governanca enterprise completa.
- Orquestracao multi-agent com dependencia/custo/risco totalmente visual no fluxo.

## 4. Catalogo de modelos
O catalogo canonico fica em `openrouter-models.ts`.

Estado atual no codigo:
- OpenRouter Best: 15 modelos.
- OpenRouter Budget: 15 modelos.
- OpenRouter Free: 1 rota (`openrouter/free`).
- Fallbacks diretos em `advanced-ai-provider.ts` para OpenAI/Anthropic/Gemini.

Default atual do dashboard:
- `DEFAULT_OPENROUTER_MODEL_ID = google/gemini-2.5-flash-lite`

## 5. Politica de roteamento
A selecao de modelo considera:
- tipo de tarefa (chat/action/agent)
- custo estimado
- contexto necessario
- plano do usuario (plan limits)
- saude/credencial do provider

Sem credencial valida, a resposta deve permanecer em estado `PARTIAL` ou `BLOCKED` (regra anti-fake-success).

## 6. Telemetria e evidencias
Eventos usados no ciclo principal:
- `editor_open`
- `first_value_time` (incluindo falha de SLO > 90s)
- `core-loop feedback` via endpoints de IA

## 7. Regras de atualizacao
- Atualizar este documento junto com mudancas em `advanced-ai-provider.ts`, `openrouter-models.ts` ou `plan-limits.ts`.
- Nao promover L4/L5 por inferencia: somente com evidencias de runtime real.

## Addendum 2026-04-01 (AI UX hardening)
- IDE chat and inline assistant surfaces are now localized and use Aethel tokens.
- Provider readiness remains a hard gate; missing provider keeps chat in setup mode.
- Mention and context surfaces now show explicit preview of retrieval results in the IDE composer.
