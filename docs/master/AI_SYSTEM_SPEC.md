# AI_SYSTEM_SPEC (CANONICAL)

**Data:** 2026-03-21
**Versão:** 2.3
**Status:** Contrato de Execução

---

## 1. Visão Geral
O sistema de IA é parte core do Aethel Engine e opera em múltiplas camadas:

- **L1**: Inline (autocomplete, sugestões)
- **L2**: Chat (assistente conversacional)
- **L3**: Actions (comandos estruturados de refactor/fix/test)
- **L4**: Agent (execução supervisionada com apply/rollback)
- **L5**: Multi-agent (orquestração paralela com contratos explícitos)

**Regra canônica**: Sem fake-success. Quando o runtime não estiver configurado, o sistema deve retornar estado `PARTIAL` ou `BLOCKED`.

---

## 2. Arquitetura Real (Runtime Atual)

```
[Workbench UI]
   ├─ Chat / Inline / Agent / Actions
   └─ Contexto (arquivos, seleção, histórico, erros)
        ↓
[Next.js API Routes]
   ├─ /api/ai/chat
   ├─ /api/ai/stream
   ├─ /api/ai/agent
   ├─ /api/ai/action
   ├─ /api/ai/context/*
   └─ /api/ai/core-loop/feedback
        ↓
[Advanced AI Provider]
   ├─ OpenAI
   ├─ OpenRouter
   ├─ Anthropic
   └─ Google Gemini
```

**Fonte de verdade do runtime**: `cloud-web-app/web/lib/ai/advanced-ai-provider.ts`.

---

## 3. Provedores e Modelos Suportados (conforme código)

A lista de modelos é definida no `MODEL_INFO` e em `getAvailableModels()` do provider. Abaixo está o estado **extraído do código** (pode mudar conforme commit):

### OpenRouter (Primário)

**Tier Free (1)**
- `openrouter/free`

**Tier Best (15)**
- `openai/gpt-5.4-pro`
- `openai/gpt-5.4`
- `openai/gpt-5-pro`
- `openai/gpt-5`
- `openai/gpt-5-codex`
- `openai/gpt-5.3-codex`
- `openai/o3`
- `anthropic/claude-opus-4.6`
- `anthropic/claude-sonnet-4.6`
- `anthropic/claude-opus-4.5`
- `anthropic/claude-sonnet-4.5`
- `anthropic/claude-3.7-sonnet`
- `google/gemini-2.5-pro`
- `google/gemini-3.1-pro-preview`
- `openai/gpt-4.1`

**Tier Budget (15)**
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `openai/gpt-5-mini`
- `openai/gpt-5-nano`
- `openai/gpt-4.1-mini`
- `openai/gpt-4.1-nano`
- `openai/o3-mini`
- `openai/o4-mini`
- `openai/o4-mini-high`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-flash-lite`
- `google/gemini-3.1-flash-lite-preview`
- `anthropic/claude-3.5-haiku`
- `openai/gpt-5.1-codex`
- `openai/gpt-5.2-codex`

### OpenAI (fallback direto)
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4-turbo`
- `o1-preview`
- `o1-mini`

### Anthropic (fallback direto)
- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`

### Google Gemini (fallback direto)
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-2.0-flash-exp`

**Observação:** a seleção efetiva depende das chaves configuradas em `.env.local`. O UI exibe custos aproximados por 1M de tokens
e aplica multiplicador quando o usuário ativa multi-agent.

---

## 4. Roteamento de Modelos

O roteamento é baseado em:
- tipo de tarefa (inline/chat/agent)
- custo estimado
- latência esperada
- plano do usuário
- disponibilidade do provedor

O modelo default atual está em:
`cloud-web-app/web/components/dashboard/aethel-dashboard-constants.ts` (usa `google/gemini-2.5-flash-lite`).
Quando o usuário seleciona modelos Free/Budget/Best, o selector exibe tier e custo estimado.

---

## 5. Contexto e RAG

O sistema suporta contexto local (arquivos, seleção, histórico) e prepara a base para RAG semântico. O suporte a vector DB é planejado e não deve ser marcado como `COMPLETE` sem runtime real.

---

## 6. Observabilidade e Evidência

- `POST /api/ai/core-loop/feedback` registra resultados (LEARN)
- métricas publicadas em `metrics/latest_run-production.json`
- dossiê L4 em `metrics/l4-readiness-dossier.json`

---

## 7. Segurança e Guardrails

- Sem fake-success
- Check de provider antes de execução
- Rate limit por rota (quando configurado)
- Logs auditáveis no admin

---

## 8. Notas de Atualização

Este documento é canônico. Se houver divergência com outros specs antigos, este tem precedência.
