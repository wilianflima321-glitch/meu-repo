## Arquitetura proposta — Plataforma de Agentes AI (resumo)

Objetivo: descrever contratos mínimos, componentes e fluxos para tornar `packages/ai-ide` numa plataforma de agentes capaz de executar conversas, orquestrar provedores, suportar streaming, faturamento e pipelines (games/apps/films). Este documento prioriza segurança, testabilidade e integração com CI/visual-regression.

Visão de alto nível

- Orquestrador (Orchestrator)
  - Responsabilidade: receber solicitações de agentes (UI), decidir qual provider(s) usar, combinar ferramentas e memória, delegar chamadas e agregar respostas.
  - Entrada: AgentRequest { id, messages: Message[], contextRefs?: string[], tools?: ToolCall[] }
  - Saída: AgentResponse { id, stream?: AsyncIterable<Delta>, final: LlmProviderResponse }

- Registry de Provedores (LlmProviderRegistry + LlmProviderService)
  - Responsabilidade: manter configs, validar credenciais, escolher provider e expor `sendRequestToProvider(providerId, payload)`.
  - Contrato público simplificado:
    - sendRequestToProvider(providerId: string|undefined, payload: SendRequestOptions): Promise<LlmProviderResponse | StreamingHandle>
    - onDidProviderWarning: Event<ProviderWarning>

- Provedores (ILlmProvider)
  - Interface mínima:
    - send(options: SendRequestOptions): Promise<LlmProviderResponse | StreamingHandle>
    - healthCheck?(): Promise<Health>
    - getMetadata(): ProviderMetadata
  - Streaming: retornar um object com `iterable` e `cancel()` para suportar tokens parciais.

- Memory / RAG Service
  - Responsabilidade: indexação, embedding store (externo ou local), retrieval com TTL e relevância.
  - Expor: addMemory(key, item), queryMemory(query, k)

- Tooling (Tool Registry)
  - Ferramentas executáveis (ex.: Playwright MCP, shell, graph-builder). Cada tool tem um adaptador com entrada/saída e modo seguro (sandboxed).

- Billing / Metering
  - Hook: cada provider-response passa por `calcEstimatedProviderCost(response)` antes de persistir consumo.
  - Emitir eventos: usageEvent { providerId, tokensIn, tokensOut, cost, timestamp, requestId }

- Safety / Moderation
  - Pipeline: pre-send (input sanitization), in-flight filter (para streaming tokens), post-response scanner (safety check). Respostas ofensivas devem ser suprimidas e substituídas por fallback seguro.

Streaming contract (essencial)

- Envelope: { id, seq, delta: string, meta?: { tokensAdded?: number, partial?: boolean } }
- Providers devem suportar backpressure (pause/resume) ou o serviço deve implementar buffer com tamanho limitado.

Observability & Telemetry

- Emitir eventos estruturados: request.start, request.progress (partial), request.end, provider.warning, billing.event
- Correlacionar via requestId (UUID). Recomendado: usar lib `uuid` já adicionada.

Testing strategy

- Unit tests: LlmProviderService, registry and small adaptors (mocks exist em `packages/ai-ide/src/browser/__tests__`).
- Integration: `tools/llm-mock` + Playwright E2E para fluxos UI (criar provider, enviar prompt, verificar usage event).
- Visual regression: usar `tools/ide/visual-regression/*` e as baselines em `tools/ide/visual-regression/baseline`.

Edge cases e guardrails

- Provider failures: aplicar retry com backoff (padrão 3 tentativas) e failover para provider default; não expor credenciais nos logs.
- Partial streaming timeouts: cancelar se nenhum token por X segundos e reportar partial transcript.
- Billing spikes: limites por usuário/organização; bloquear pedidos que excedam hard-limit.

Contrato de mensagens (exemplos mínimos)

- Message
  - { role: 'user'|'assistant'|'system', content: string, metadata?: Record<string,unknown> }

- SendRequestOptions
  - { input: string | Message[], settings?: Record<string, unknown>, tools?: ToolCall[] }

- LlmProviderResponse
  - { status: number, content?: string, tokensIn?: number, tokensOut?: number, meta?: Record<string,unknown> }

Roadmap curto prazo (priorizado)

1) Limpeza conservadora (opção A): remover `as any` inseguros e garantir wrappers de Disposable nas bindings UI (continuar com os batches pequenos já em curso).
2) Implementar StreamingHandle no `LlmProviderService` e um adaptador `CustomHttpProvider` com suporte a AsyncIterable.
3) Integração testável: adicionar testes que usam `tools/llm-mock` para validar billing e flutuação de respostas.
4) Seed visual baselines para os widgets listados em `docs/ai-ui-map.md`.
5) Adicionar um pequeno adaptor “sandboxed tool runner” para executar ferramentas MCP (Playwright) com tempo/recursos limitados.

Next steps recomendados

- Gerar exemplos de payloads JSON em `docs/samples/` (SendRequestOptions, response, streaming deltas).
- Atualizar `packages/ai-ide/src/common/llm-provider.ts` com tipos mais expressivos e documentação inline.
- Planejar política de moderation + tests (unitários + Playwright que verifiquem fallback seguro).

Change log

- 2025-11-04: Documento inicial criado pelo agente de automação; contém resumo de contratos, componentes e roadmap.
