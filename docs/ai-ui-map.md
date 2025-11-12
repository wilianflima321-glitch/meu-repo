## Mapa de UI — AI/Chat (resumo)

Objetivo: mapear widgets React relevantes para a superfície de UI do subsistema AI/chat, indicar onde aparecem (barra lateral, painel, configurações) e anotar responsabilidades e notas rápidas para testes/visual-regression.

Principais widgets identificados (localização relativa ao workspace)

- `packages/ai-ide/src/browser/ai-configuration/agent-configuration-widget.tsx`
  - Widget: AIAgentConfigurationWidget
  - Propósito: configuração de agentes (lista / detalhes / criação)
  - Local provável: Viewlet / preferences area
  - Notas: capturar screenshots de: lista vazia, criação de agent, edição de agent

- `packages/ai-ide/src/browser/ai-configuration/provider-configuration-widget.tsx`
  - Widget: ProviderConfigurationWidget
  - Propósito: UI para adicionar/editar provedores LLM (id, url, apiKey, settings)
  - Local provável: settings / extensible providers panel
  - Notas: fluxos a testar: criar provider via UI, testar conexão, validar form errors

- `packages/ai-ide/src/browser/ai-configuration/token-usage-configuration-widget.tsx`
  - Widget: AITokenUsageConfigurationWidget
  - Propósito: mostrar consumo / métricas de tokens
  - Notas: gerar baseline com dados vazios e com dados de exemplo

- `packages/ai-ide/src/browser/ai-configuration/variable-configuration-widget.tsx`
  - Widget: AIVariableConfigurationWidget
  - Propósito: variáveis de template/prompt

- `packages/ai-ide/src/browser/ai-configuration/model-aliases-configuration-widget.tsx`
  - Widget: ModelAliasesConfigurationWidget
  - Propósito: mapear/alias de modelos entre provedores

- `packages/ai-ide/src/browser/ai-configuration/prompt-fragments-configuration-widget.tsx`
  - Widget: AIPromptFragmentsConfigurationWidget
  - Propósito: fragmentos reutilizáveis de prompt (UI snippet management)

- `packages/ai-ide/src/browser/ai-configuration/tools-configuration-widget.tsx`
  - Widget: AIToolsConfigurationWidget
  - Propósito: registrar/editar ferramentas (tooling) que agentes podem chamar

- `packages/ai-ide/src/browser/ai-configuration/mcp-configuration-widget.tsx`
  - Widget: AIMCPConfigurationWidget
  - Propósito: configurar MCP servers (Playwright / other runtimes)

- `packages/ai-ide/src/browser/admin/billing-admin-widget.tsx`
  - Widget: BillingAdminWidget
  - Propósito: painel administrativo para billing / custo por provider
  - Notas: capturar baseline com billing desativado e com dados de exemplo

- Chat UI (separado - widgets relacionados ao fluxo de conversa)
  - `packages/ai-chat-ui/src/browser/chat-input-widget.tsx` — AIChatInputWidget (entrada de mensagens)
  - `packages/ai-history/src/browser/ai-history-widget.tsx` — AIHistoryView (histórico/threads)

Recomendações para visual-regression baselines

- Prioridade alta (seed baselines): ProviderConfigurationWidget (form flow), AIChatInputWidget (empty, typing state), AIHistoryView (empty + with messages), BillingAdminWidget (admin screens)
- Capturar variações: light/dark theme, narrow viewport (mobile), desktop wide. Incluir accessibility snapshot (axe) se possível.
- Integrar capture scripts com `tools/ide/visual-regression/capture_baseline.js` e adicionar cases financeiros (billing) e provider-creation.

Como usar este mapa

- Cada alteração visual em widgets listados deve atualizar baseline correspondente em `tools/ide/visual-regression/baseline`.
- Para novos widgets `extends ReactWidget` relacionados a AI/chat, adicione uma linha neste documento com propósito e casos de teste sugeridos.

Change log

- 2025-11-04: Documento inicial criado pelo agente de automação com base em varredura do workspace.
