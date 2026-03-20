# AI_SYSTEM_SPEC.md — Atualização Março 2026
## Especificação Completa do Sistema de IA
**Data:** Março 2026  
**Versão:** 2.0 (Atualizada para Modelos 2026)  
**Status:** Contrato de Execução

---

## 1. VISÃO GERAL

O sistema de IA do Aethel Engine integra múltiplos provedores de Large Language Models (LLMs) para oferecer capacidades de geração de código, chat, agentes autônomos e análise de contexto. O sistema é projetado para ser resiliente, eficiente em custos e adaptável a novos modelos conforme eles são lançados.

### 1.1 Objetivos Principais

1. **Geração de Código de Alta Qualidade** — Autocomplete, actions, refactoring
2. **Chat Conversacional Inteligente** — Com contexto de projeto
3. **Agentes Autônomos** — Execução de tarefas complexas
4. **RAG (Retrieval Augmented Generation)** — Contexto real do projeto do usuário
5. **Custo-Eficiência** — Roteamento inteligente entre modelos
6. **Resiliência** — Fallback automático entre provedores

---

## 2. MODELOS DISPONÍVEIS (Março 2026)

### 2.1 OpenAI

| Modelo | Versão | Capacidade | Custo | Latência | Contexto | Recomendação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GPT-4.5** | Latest | Excelente | Alto | Médio | 128K | Análise complexa, Agentes |
| **GPT-4o** | Stable | Muito Bom | Médio-Alto | Médio | 128K | Geração de código, Chat |
| **GPT-4o mini** | Stable | Bom | Baixo | Rápido | 128K | Autocomplete, Tarefas simples |
| **GPT-4 Turbo** | Legacy | Bom | Alto | Médio | 128K | Fallback para GPT-4.5 |

### 2.2 Anthropic (Claude)

| Modelo | Versão | Capacidade | Custo | Latência | Contexto | Recomendação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Claude 4** | Beta | Excelente | Muito Alto | Médio | 200K | Análise profunda, Agentes avançados |
| **Claude 3.7 Sonnet** | Stable | Excelente | Médio | Rápido | 200K | Geração de código, Chat, RAG |
| **Claude 3.5 Haiku** | Stable | Bom | Baixo | Muito Rápido | 200K | Autocomplete, Tarefas rápidas |
| **Claude 3 Opus** | Legacy | Muito Bom | Alto | Médio | 200K | Fallback |

### 2.3 Google (Gemini)

| Modelo | Versão | Capacidade | Custo | Latência | Contexto | Recomendação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Gemini 2.5 Flash** | Latest | Excelente | Baixo | Muito Rápido | 1M | Geração de código, Multimodal |
| **Gemini 2.0 Flash** | Stable | Muito Bom | Baixo | Rápido | 1M | Chat, Análise, RAG |
| **Gemini 1.5 Pro** | Stable | Bom | Médio | Médio | 1M | Análise complexa |
| **Gemini 1.5 Flash** | Legacy | Bom | Baixo | Rápido | 1M | Fallback |

### 2.4 Open Source (via Hugging Face / Ollama)

| Modelo | Versão | Capacidade | Custo | Latência | Contexto | Recomendação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Llama 3.1 405B** | Latest | Excelente | Muito Baixo* | Lento | 128K | Fallback de custo zero, On-premise |
| **Mistral Large** | Stable | Muito Bom | Muito Baixo* | Médio | 32K | Geração de código leve |
| **Code Llama 70B** | Stable | Bom | Muito Baixo* | Médio | 100K | Especializado em código |

*Custo zero se auto-hospedado; custo baixo via APIs como Together.ai, Replicate

---

## 3. ROTEADOR DE MODELOS (MODEL ROUTER)

### 3.1 Estratégia de Roteamento

O sistema utiliza uma estratégia de roteamento inteligente que considera:
- **Tipo de Tarefa** (Autocomplete, Chat, Geração, Análise)
- **Contexto de Projeto** (Tamanho, Complexidade)
- **Plano do Usuário** (Free, Pro, Enterprise)
- **Custo Estimado** vs. **Qualidade Esperada**
- **Latência Aceitável** (Real-time vs. Background)

### 3.2 Matriz de Roteamento

```typescript
// /cloud-web-app/web/lib/ai-model-router.ts

interface ModelRoutingConfig {
  task: 'autocomplete' | 'chat' | 'generation' | 'analysis' | 'agent'
  userPlan: 'free' | 'pro' | 'enterprise'
  contextSize: number
  priority: 'speed' | 'quality' | 'cost'
}

type ModelSelection = {
  primary: string
  fallback: string[]
  timeout: number
  maxTokens: number
}

const MODEL_ROUTING_TABLE: Record<string, ModelSelection> = {
  // AUTOCOMPLETE (Speed > Quality)
  'autocomplete:free': {
    primary: 'gpt-4o-mini',
    fallback: ['claude-3.5-haiku', 'gemini-2.5-flash'],
    timeout: 1000,
    maxTokens: 50,
  },
  'autocomplete:pro': {
    primary: 'gpt-4o',
    fallback: ['claude-3.7-sonnet', 'gemini-2.5-flash'],
    timeout: 1500,
    maxTokens: 100,
  },
  'autocomplete:enterprise': {
    primary: 'gpt-4.5',
    fallback: ['claude-4-beta', 'gemini-2.5-flash'],
    timeout: 2000,
    maxTokens: 150,
  },

  // CHAT (Balance)
  'chat:free': {
    primary: 'claude-3.5-haiku',
    fallback: ['gpt-4o-mini', 'gemini-2.0-flash'],
    timeout: 3000,
    maxTokens: 500,
  },
  'chat:pro': {
    primary: 'claude-3.7-sonnet',
    fallback: ['gpt-4o', 'gemini-2.5-flash'],
    timeout: 5000,
    maxTokens: 2000,
  },
  'chat:enterprise': {
    primary: 'claude-4-beta',
    fallback: ['gpt-4.5', 'gemini-2.5-flash'],
    timeout: 10000,
    maxTokens: 4000,
  },

  // GENERATION (Quality > Cost)
  'generation:free': {
    primary: 'gpt-4o-mini',
    fallback: ['claude-3.5-haiku', 'gemini-2.5-flash'],
    timeout: 5000,
    maxTokens: 2000,
  },
  'generation:pro': {
    primary: 'gpt-4o',
    fallback: ['claude-3.7-sonnet', 'gemini-2.5-flash'],
    timeout: 10000,
    maxTokens: 4000,
  },
  'generation:enterprise': {
    primary: 'gpt-4.5',
    fallback: ['claude-4-beta', 'gemini-2.5-flash'],
    timeout: 15000,
    maxTokens: 8000,
  },

  // ANALYSIS (Quality > Speed)
  'analysis:free': {
    primary: 'claude-3.5-haiku',
    fallback: ['gpt-4o-mini', 'gemini-2.0-flash'],
    timeout: 10000,
    maxTokens: 2000,
  },
  'analysis:pro': {
    primary: 'claude-3.7-sonnet',
    fallback: ['gpt-4o', 'gemini-2.5-flash'],
    timeout: 15000,
    maxTokens: 4000,
  },
  'analysis:enterprise': {
    primary: 'claude-4-beta',
    fallback: ['gpt-4.5', 'gemini-2.5-flash'],
    timeout: 30000,
    maxTokens: 8000,
  },

  // AGENT (Quality + Autonomy)
  'agent:free': {
    primary: 'gpt-4o-mini',
    fallback: ['claude-3.5-haiku'],
    timeout: 30000,
    maxTokens: 4000,
  },
  'agent:pro': {
    primary: 'gpt-4o',
    fallback: ['claude-3.7-sonnet'],
    timeout: 60000,
    maxTokens: 8000,
  },
  'agent:enterprise': {
    primary: 'gpt-4.5',
    fallback: ['claude-4-beta'],
    timeout: 120000,
    maxTokens: 16000,
  },
}

export function selectModel(config: ModelRoutingConfig): ModelSelection {
  const key = `${config.task}:${config.userPlan}`
  const selection = MODEL_ROUTING_TABLE[key]
  
  if (!selection) {
    throw new Error(`No model routing found for ${key}`)
  }

  // Ajustar baseado em prioridade
  if (config.priority === 'speed') {
    selection.timeout = Math.min(selection.timeout, 2000)
  } else if (config.priority === 'quality') {
    selection.timeout = Math.max(selection.timeout, 10000)
  }

  return selection
}
```

### 3.3 Fallback Chain

O sistema implementa um fallback chain automático que tenta múltiplos modelos em caso de falha:

```typescript
async function callAIWithFallback(
  config: ModelRoutingConfig,
  prompt: string
): Promise<string> {
  const selection = selectModel(config)
  const models = [selection.primary, ...selection.fallback]

  for (const model of models) {
    try {
      const response = await callModel(model, prompt, {
        timeout: selection.timeout,
        maxTokens: selection.maxTokens,
      })
      return response
    } catch (error) {
      console.warn(`Model ${model} failed, trying next...`, error)
      continue
    }
  }

  throw new Error(`All models failed for task ${config.task}`)
}
```

---

## 4. CASOS DE USO E MODELOS RECOMENDADOS

### 4.1 Autocomplete

**Objetivo:** Completar código em tempo real enquanto o usuário digita.

**Requisitos:**
- Latência: <1s
- Qualidade: Boa (não precisa ser perfeita)
- Custo: Baixo (muitas chamadas)

**Recomendação:**
- **Primary:** `gpt-4o-mini` (rápido, barato)
- **Fallback:** `claude-3.5-haiku`, `gemini-2.5-flash`

### 4.2 Chat

**Objetivo:** Conversa interativa com o usuário sobre o projeto.

**Requisitos:**
- Latência: <5s
- Qualidade: Muito Boa (contexto importante)
- Custo: Médio

**Recomendação:**
- **Primary:** `claude-3.7-sonnet` (melhor para chat)
- **Fallback:** `gpt-4o`, `gemini-2.5-flash`

### 4.3 Geração de Código

**Objetivo:** Gerar código funcional a partir de descrições em linguagem natural.

**Requisitos:**
- Latência: <10s
- Qualidade: Excelente (código deve funcionar)
- Custo: Médio-Alto

**Recomendação:**
- **Primary:** `gpt-4o` (excelente para código)
- **Fallback:** `claude-3.7-sonnet`, `gemini-2.5-flash`

### 4.4 Análise de Código

**Objetivo:** Analisar código para bugs, performance, segurança.

**Requisitos:**
- Latência: <15s
- Qualidade: Excelente (análise profunda)
- Custo: Alto (contexto grande)

**Recomendação:**
- **Primary:** `claude-4-beta` (melhor análise)
- **Fallback:** `gpt-4.5`, `gemini-2.5-flash`

### 4.5 Agentes Autônomos

**Objetivo:** Executar tarefas complexas de forma autônoma (multi-step).

**Requisitos:**
- Latência: <60s (background)
- Qualidade: Excelente (raciocínio crítico)
- Custo: Alto (múltiplas iterações)

**Recomendação:**
- **Primary:** `gpt-4.5` (raciocínio superior)
- **Fallback:** `claude-4-beta`

---

## 5. RAG (RETRIEVAL AUGMENTED GENERATION)

### 5.1 Contexto do Projeto

O sistema utiliza pgvector (extensão PostgreSQL) para armazenar embeddings de:
- Arquivos de código do projeto
- Documentação
- Histórico de commits
- Erros anteriores

### 5.2 Fluxo de RAG

```typescript
// /cloud-web-app/web/lib/rag-system.ts

async function generateWithRAG(
  userPrompt: string,
  projectId: string,
  userPlan: string
): Promise<string> {
  // 1. Embedar o prompt do usuário
  const promptEmbedding = await embedText(userPrompt)

  // 2. Buscar contexto relevante do projeto
  const relevantContext = await searchProjectContext(
    projectId,
    promptEmbedding,
    limit: userPlan === 'free' ? 3 : userPlan === 'pro' ? 10 : 50
  )

  // 3. Construir prompt aumentado
  const augmentedPrompt = buildAugmentedPrompt(userPrompt, relevantContext)

  // 4. Chamar modelo com contexto
  const config: ModelRoutingConfig = {
    task: 'generation',
    userPlan,
    contextSize: augmentedPrompt.length,
    priority: 'quality',
  }

  return callAIWithFallback(config, augmentedPrompt)
}
```

### 5.3 @mentions System

Usuários podem usar `@mentions` para fornecer contexto explícito:

- `@Codebase` — Buscar em todos os arquivos do projeto
- `@Docs` — Buscar em documentação
- `@Diff` — Buscar em mudanças recentes
- `@Error` — Buscar em logs de erro
- `@File:nome.ts` — Buscar em arquivo específico

---

## 6. STREAMING E REAL-TIME

### 6.1 Server-Sent Events (SSE)

O sistema suporta streaming de respostas via SSE para melhor UX:

```typescript
// /cloud-web-app/web/app/api/ai/stream/route.ts

export async function POST(request: Request) {
  const { prompt, projectId, userPlan } = await request.json()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const config: ModelRoutingConfig = {
          task: 'generation',
          userPlan,
          contextSize: prompt.length,
          priority: 'quality',
        }

        const model = selectModel(config).primary
        const response = await streamModel(model, prompt)

        for await (const chunk of response) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        }

        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

---

## 7. CUSTO E OTIMIZAÇÃO

### 7.1 Estimativa de Custos (Março 2026)

| Modelo | Custo (1K tokens) | Uso Típico |
| :--- | :--- | :--- |
| GPT-4.5 | $0.15 | Enterprise, Agentes |
| GPT-4o | $0.03 | Pro, Geração |
| GPT-4o mini | $0.0001 | Free, Autocomplete |
| Claude 4 Beta | $0.20 | Enterprise, Análise |
| Claude 3.7 Sonnet | $0.01 | Pro, Chat |
| Claude 3.5 Haiku | $0.0008 | Free, Autocomplete |
| Gemini 2.5 Flash | $0.00005 | Free, Fallback |

### 7.2 Estratégia de Custo-Eficiência

1. **Free Tier:** Usar modelos mais baratos (mini, Haiku, Gemini Flash)
2. **Pro Tier:** Balance entre qualidade e custo (GPT-4o, Claude Sonnet)
3. **Enterprise Tier:** Usar melhores modelos (GPT-4.5, Claude 4)
4. **Caching:** Armazenar respostas frequentes em Redis
5. **Batch Processing:** Agrupar requisições para descontos

---

## 8. MONITORAMENTO E OBSERVABILIDADE

### 8.1 Métricas Importantes

- **Latência:** Tempo de resposta por modelo
- **Taxa de Sucesso:** % de requisições bem-sucedidas
- **Custo Médio:** Custo por requisição
- **Qualidade:** Feedback do usuário, taxa de edição

### 8.2 Alertas

- Modelo com taxa de erro > 5%
- Latência > threshold (ex: 5s para chat)
- Custo diário > budget
- Fallback chain esgotada

---

## 9. ROADMAP (Próximos 6 Meses)

- **Abril 2026:** Integrar Claude 4 Beta quando disponível
- **Maio 2026:** Implementar fine-tuning customizado para domínios específicos
- **Junho 2026:** Adicionar suporte a modelos open-source (Llama 3.1, Mistral)
- **Julho 2026:** Otimizar RAG com embeddings customizados
- **Agosto 2026:** Implementar multi-modal (imagem→código)

---

## 10. CONCLUSÃO

O sistema de IA do Aethel Engine é projetado para ser flexível, resiliente e eficiente em custos. Com o roteador de modelos inteligente e o fallback chain automático, o sistema garante que os usuários sempre recebam respostas de alta qualidade, independentemente de qual modelo está disponível. A atualização para os modelos de 2026 (GPT-4.5, Claude 4, Gemini 2.5) posiciona o Aethel como uma plataforma de elite no mercado.

