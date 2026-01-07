# 🦅 MASTER PLAN 2026: Aethel Engine "Invisible OS" Execution Roadmap

> **Data:** 07/01/2026
> **Missão:** Transcender a categoria de "IDE" para se tornar o Sistema Operacional de Trabalho Autônomo Definitivo.
> **Filosofia:** "Complexidade Interna Infinita, Interface Zen."

---

## 🏗️ 1. Arquitetura "The Unification" (Status Real vs. Meta)

O projeto possui componentes de nível da NASA (Trading Institucional, Física AAA), mas eles vivem em "ilhas". O objetivo agora é construir as pontes.

### 🧩 Inventário de Componentes & Status de Integração

| Componente | Local Atual | Status de Integração | Ação de "Wiring" Necessária (Técnico) |
| :--- | :--- | :--- | :--- |
| **Logic Core (Trading)** | `src/common/trading` | 🟥 **Órfão**. IDE não enxerga. | Mover para `packages/ai-ide/src/modules/trading`. Registrar no Inversify (`.bind(TradingService)`). |
| **Logic Core (Compliance)** | `src/common/compliance` | 🟥 **Órfão**. Sem enforcement. | Mover para `packages/ai-ide/src/modules/compliance`. Injetar no `CommandRegistry`. |
| **Physics Engine** | `cloud-web-app` | 🟢 **Nativo**. Funciona bem. | Criar "Bridge" para que a IDE possa editar a cena em tempo real (Sync Editor <-> Preview). |
| **Multiplayer Hub** | `server/src/server.ts` | 🟡 **Parcial**. Server existe, Client stub. | Implementar `MonacoBinding` no `packages/collaboration` para conectar editor ao WebSocket. |
| **AI Brain (Reflection)** | `lib/ai/self-reflection-engine.ts` | 🟡 **Desconectado**. | Inserir middleware no `AIChatService` que exige aprovação da Reflection antes de executar `shell_exec`. |
| **Admin Arms (Browser)** | *Inexistente* | ⚪ **Conceito**. | Instalar `playwright` no `server/`. Criar endpoint para stream de vídeo/dom para a IDE. |

---

## 🎨 2. A Experiência "Invisible UI" (Detalhado)

Ao invés de criar botões e menus, vamos focar no **Contexto**. A IDE tem 3 janelas. O conteúdo delas muda magicamente.

### A. O "Universal Viewport" (Regras de Adaptação)

1.  **Modo Dev (Default)**
    *   **Chat:** "Corrija o bug no login."
    *   **Editor:** `auth.ts` (Texto).
    *   **Preview:** Webview localhost (App rodando).

2.  **Modo Trading (Detecção: `INTENT_FINANCE`)**
    *   **Chat:** "Compre ETH se romper a resistência."
    *   **Editor:** `strategy.json` (Parâmetros da estratégia, Visível e Editável).
    *   **Preview:** **Widget React de Trading** (Gráfico Candlestick + Order Book) renderizado direto na view de "Preview", substituindo o localhost.
    *   *Implementação:* O `TradingService` emite eventos. O Preview escuta e renderiza componentes React nativos ao invés de HTML.

3.  **Modo Admin (Detecção: `INTENT_BROWSE`)**
    *   **Chat:** "Emita a nota fiscal para o cliente X no site da prefeitura."
    *   **Editor:** Logs de execução passo-a-passo (`Opening browser...`, `Clicking login...`).
    *   **Preview:** **Stream de Vídeo (RFB/MJPEG)** do navegador Headless rodando no servidor. O usuário vê o robô trabalhando como se fosse um filme.

---

## 🛠️ 3. Plano de Execução Técnica (Passo-a-Passo)

### O Passo Zero: "The Grand Wiring" (Hoje/Manhã)
*Não adianta ter recursos se eles não conversam.*

1.  **Reestruturação de Pastas:**
    ```bash
    mv src/common/trading cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/modules/trading
    mv src/common/compliance cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/modules/compliance
    ```
2.  **Registro de Serviços (DI):**
    *   Editar `ai-ide-frontend-module.ts` para importar e bindar os serviços migrados.
    *   Garantir que eles sejam *Singletons* (uma instância viva por sessão).

### O Passo Um: Habilitar "Mãos" (Automação)
*Superar o Manus requer manipular o mundo externo.*

1.  **Setup do Playwright no Servidor:**
    *   No `server/`, adicionar Playwright.
    *   Criar uma rota WebSocket `/browser-stream`.
2.  **Comando de Chat:**
    *   Criar ferramenta `@browser` para o LLM.
    *   Se o usuário disser "Acesse o Google", o LLM chama a tool -> Server abre browser -> Envia stream para o Frontend.

### O Passo Dois: Habilitar "Olhos" (Adaptação da UI)
*A interface deve ser líquida.*

1.  **Dynamic Preview Provider:**
    *   No Theia, criar um `DynamicPreviewWidget`.
    *   Ele aceita inputs de diferentes fontes: `iframe` (Web), `ReactComponent` (Trading), `VideoElement` (Browser Stream).
    *   O `AIChatService` controla qual fonte está ativa baseada na última tool usada.

### O Passo Três: Multiplayer Real (Colaboração)
*Trabalho em equipe "Google Docs style".*

1.  **Frontend Binding:**
    *   Implementar `MonacoBinding` (Yjs) no `packages/collaboration`.
    *   Conectar ao `server` existente.
    *   Testar cursor de outra pessoa aparecendo em tempo real.

---

## 💰 4. Alinhamento de Negócio ("Zero Loss" & Ecossistema)

A arquitetura técnica suporta diretamente o modelo de negócio:

1.  **Cobrança por "Agente" e não por "Seat":**
    *   O uso do **Playwright** (Navegador) gasta muita RAM. Isso é cobrado como "Créditos de Automação".
    *   O uso do **Trading** gasta dados de mercado de baixa latência. Isso é cobrado como "Créditos Financeiros".
    *   *Implementação:* O middleware `PolicyEngine` (agora integrado) intercepta cada chamada dessas tools e debita do saldo central.

2.  **Freelance Mode (Marketplace):**
    *   O usuário pode "Vender" um Agente que ele configurou (ex: "Agente de Notas Fiscais SP").
    *   O arquivo `strategy.json` ou `automation-script.ts` é empacotado e vendido no `vsx-registry` (infraestrutura já criada).

---

## ✅ Checklist de Sucesso (Definition of Done)

- [ ] Código de Trading migrado para `ai-ide` e compilando sem erros.
- [ ] Servidor WebSocket permitindo troca de mensagens textuais.
- [ ] Editor Monaco sincronizando texto entre duas janelas via Yjs.
- [ ] "Preview" capaz de mostrar algo além de HTML (ex: um componente React injetado).
- [ ] Política de "Zero UI Clutter": Nenhuma barra lateral nova adicionada. Tudo flui do Chat.

Este plano transforma o código fragmentado atual em uma máquina coesa de produtividade infinita.
