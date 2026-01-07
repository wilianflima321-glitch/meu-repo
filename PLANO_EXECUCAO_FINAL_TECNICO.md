# 🗺️ Plano de Execução Técnica Final & Alinhamento (2026)

> **Status:** Crítico / Execução Imediata
> **Objetivo:** Unificar os módulos "Órfãos" com a IDE, preencher as lacunas de "Phantomware" e preparar para lançamento AAA.

---

## 📊 1. O Grande Inventário (Gap Analysis)

| Módulo | Estado Atual ("O que temos") | O que Falta ("Gaps Críticos") | Ação Necessária |
| :--- | :--- | :--- | :--- |
| **Physics Engine** | ✅ **AAA**. Migrado para `@react-three/rapier`. WebAssembly ativo. | Otimização em WebWorker para cenas gigantes com 10k+ objetos. | Refatorar loop de física para rodar off-thread. |
| **Colaboração** | ⚠️ **Infra Básica**. Servidor WebSocket e Extensão Theia criados (hoje). | **Binding do Editor**. O `y-monaco` não está conectado ao modelo do editor ativo. | Implementar `MonacoBinding` dentro de `CollaborationService`. |
| **AI Brain** | ⚠️ **Desconectado**. `SelfReflectionEngine` criado. | **Integração**. O `TaskHandler` da IDE ignora a auto-reflexão. | Injetar `SelfReflectionEngine` no fluxo de execução de comandos. |
| **Trading System** | 🛑 **Órfão**. Código complexo e completo em `src/common/trading`. | **Wiring**. A IDE não carrega esse código. Não há UI no Theia para ele. | Mover pasta para `packages/ai-ide` e registrar no container Inversify. |
| **Compliance** | 🛑 **Órfão**. `PolicyEngine` completo em `src/common/compliance`. | **Enforcement**. Nenhuma ação do usuário passa pelo crivo das regras. | Adicionar hook `policyEngine.check(action)` antes de cada `executeCommand`. |
| **Backend/Auth** | ❌ **Inexistente**. Apenas `PremiumLock` visual (Fake UI). | **Validação Real**. Servidor não checa tokens ou créditos no banco. | Configurar Supabase/Firebase e middleware de proteção de rotas. |
| **Marketplace** | ⚠️ **Esqueleto**. Pacote `vsx-registry` criado (hoje). | **Busca Real**. A conexão com `open-vsx.org` é um mock. | Implementar client HTTP para baixar `.vsix` e instalar. |

---

## 🛠️ 2. Detalhamento Técnico das Tarefas

### Tarefa 01: "The Grand Wiring" (Conectar Trading & Compliance)
Temos um sistema de trading institucional "solto" na pasta `src/common`. Precisamos trazê-lo para dentro da IDE.

1.  **Migração de Arquivos**:
    *   Mover `src/common/trading` ➡️ `cloud-ide-desktop/.../packages/ai-ide/src/common/trading`.
    *   Mover `src/common/compliance` ➡️ `cloud-ide-desktop/.../packages/ai-ide/src/common/compliance`.
2.  **Injeção de Dependência (Theia/Inversify)**:
    *   No arquivo `ai-ide-frontend-module.ts`, adicionar:
        ```typescript
        bind(TradingService).toSelf().inSingletonScope();
        bind(PolicyEngine).toSelf().inSingletonScope();
        ```
3.  **Criação de UI (Frontend)**:
    *   Criar `TradingWidget.tsx` (React widget dentro do Theia).
    *   Usar o `TradingUIController` existente para popular o widget.

### Tarefa 02: Ativar o Multiplayer (Real-time Collaboration)
A infraestrutura que criei hoje (`server/` + `packages/collaboration`) precisa ser finalizada.

1.  **Monaco Binding**:
    *   Em `collaboration-service.ts`, descomentar e implementar a lógica do `y-monaco`.
    *   Obter referência do editor atual via `EditorService` do Theia.
    *   Vincular: `new MonacoBinding(doc.getText(), editor.getModel(), ...)`
2.  **Cursor Awareness**:
    *   Implementar propagação de posição de cursor e seleção via `y-websocket awareness`.

### Tarefa 03: Implementar a "Consciência" (AI Self-Reflection)
Fazer a IA pensar antes de agir.

1.  **Interceptador de Comandos**:
    *   Localizar onde a IDE executa comandos de terminal gerados por IA.
    *   Inserir passo intermediário:
        ```typescript
        const reflection = await selfReflection.reflect(command);
        if (reflection.approved) execute(command);
        else retry(reflection.corrections);
        ```

### Tarefa 04: Sistema de Créditos Real (Backend)
O `PremiumLock` atual é visual. Se o usuário deletar o componente HTML no DevTools, ele usa de graça.

1.  **Server-Side Metering**:
    *   No novo `server/src/server.ts`, adicionar verificação.
    *   Endpoint `/api/use-credits`.
    *   Integrar com **Stripe** ou banco de dados simples (SQLite para MVP) para persistir saldo.

---

## 📅 3. Roteiro Sugerido (Sprint de Integração)

1.  **Dia 1: Migração e Limpeza**
    *   Mover pastas de `src/common` para dentro dos pacotes Theia.
    *   Corrigir imports quebrados.
    *   Garantir compilação com `yarn build` no `cloud-ide-desktop`.

2.  **Dia 2: Colaboração (Multiplayer)**
    *   Finalizar `CollaborationService`.
    *   Testar sincronia entre duas janelas de navegador locais conectadas ao `ws://localhost:1234`.

3.  **Dia 3: Trading & UI**
    *   Criar o *Widget* do Trading na IDE.
    *   Verificar se o robô "pensa" (logs do TradingService).

4.  **Dia 4: Lançamento Interno**
    *   Dockerizar tudo (unir `server`, `web-app`, `ide` em um `docker-compose.yml` final).
    *   Testar fluxo End-to-End: Login -> Compra de Créditos -> Uso da IDE -> Trading Automático.

---

## 💡 Conclusão
O código que temos é excelente, mas está **fragmentado**. O motor gráfico é de ponta, a IA é avançada, mas a IDE (o produto que o usuário vê) ainda não tem acesso a esses superpoderes.
**O foco agora não é criar nada novo, é CONECTAR o que já existe.**
