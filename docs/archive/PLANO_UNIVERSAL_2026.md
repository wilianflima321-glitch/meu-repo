# 🌍 Aethel Engine: Plano de Dominação Global & Estação de Trabalho Universal (2026)

> **Visão:** Deixar de ser apenas uma "IDE de Programação" para se tornar a **Plataforma Definitiva de Trabalho Digital**. Superar o **Manus** (autonomia) e o **Cursor** (UX) integrando fluxos de trabalho administrativos, criativos e financeiros em um único ecossistema adaptável.

---

## 🏗️ 1. O Conceito: "Polymorphic Workstation"
O Aethel Engine não é mais estático. Ele detecta a intenção do usuário e o plano contratado, transformando a interface e os agentes disponíveis.

| Persona / Modo | Público Alvo | Interface (UX) | Agentes Ativos |
| :--- | :--- | :--- | :--- |
| **Dev Mode** | Programadores | Theia Padrão (VS Code-like) | Code Completion, Refactoring, Debugger |
| **Admin Mode** | Assistentes Virtuais, RH | Dashboard de Dados, Browser Embutido | *Browser Automator*, Email Manager, CRM Sync |
| **Trader Mode** | Investidores | Gráficos, Terminais de Execução | *TradingService*, Risk Manager, News Sentinel |
| **Creative Mode** | Designers, Editores | Viewport 3D (Rapier/Three.js), Timeline | Asset Generator, Render Optimizer |
| **Freelance Mode** | Gig Workers | Kanban de Tarefas, Time Tracker | *Bid Sniper* (Upwork/Fiverr), Auto-Invoicing |

---

## 📊 2. Gap Analysis: Do Estado Atual à Liderança de Mercado

| Recurso | Estado Atual ("Aethel") | Concorrente ("Manus/Cursor") | **A Ação de Superação (O Pulo do Gato)** |
| :--- | :--- | :--- | :--- |
| **Autonomia** | ⚠️ Agentes reativos (esperam comando). | Manus: "Faça isso e me avise quando acabar". | **Autonomous Loops**: Implementar `TaskRunner` persistente que opera navegador headless para tarefas administrativas (preencher planilhas, sites governamentais). |
| **Adaptação** | 🛑 Estática. Interface fixa. | Cursor: Adapta sugestões ao repo. | **Adaptive UX**: O `SelfReflectionEngine` analisará o comportamento do usuário. Se ele abre muitos CSVs, a IDE sugere mudar para *Admin Mode* e ativa ferramentas de dados automaticamente. |
| **Colaboração** | ⚠️ Básico (WebSocket criado hoje). | Replit: Multiplayer de código. | **Universal Multiplayer**: Colaboração não só em código, mas em *missões*. Um humano revisa enquanto o Agente executa. |
| **Monetização** | ⚠️ `PremiumLock` (Visual). | Cursor: Assinatura fixa. | **Skill Marketplace**: Vender "Habilidades" (ex: "Pacote Agente de Vendas") além da assinatura base. Zero prejuízo garantido pelo `CreditDisplay`. |

---

## 🛠️ 3. Execução Técnica & Integração (Roadmap Prioritário)

### Fase 1: A "Grande Unificação" (Base Tecnológica)
*Objetivo: Conectar os sistemas órfãos (Trading/Compliance) para provar que a Engine suporta múltiplos domínios.*

1.  **Migração Modular ("The Grand Wiring")**:
    *   Mover `src/common/trading` e `src/common/compliance` para `packages/ai-ide/src/modules/`.
    *   **Inovação**: Criar um `ModuleManager` no Theia que carrega esses módulos dinamicamente. Se o usuário for "Trader", carrega o módulo. Se for "Dev", não carrega (economiza RAM).
2.  **Ativar Colaboração Real-time**:
    *   Conectar o `CollaborationService` (criado hoje) ao editor Monaco via `y-monaco`.
    *   Isso permite que um Freelancer e seu Cliente vejam o trabalho sendo feito ao vivo.

### Fase 2: O Agente Universal (Superando o Manus)
*Objetivo: Dar "mãos" à IA para realizar trabalhos fora do código.*

1.  **Browser Control Infrastructure**:
    *   Integrar **Playwright** ou **Puppeteer** no backend da IDE (`server/`).
    *   Criar o comando `/browser open [url]`: O agente abre um navegador headless, lê o DOM, clica em botões e extrai dados.
    *   *Uso Real*: "Acesse o site da Receita, emita a nota fiscal para este cliente e salve o PDF na pasta `docs/`."
2.  **File System Intelligence**:
    *   O Agente deve ser capaz de ler PDFs, DOCX e Planilhas Excel nativamente (usando libs como `pdf-parse`, `xlsx`).

### Fase 3: A Interface Adaptativa (UX AAA)
*Objetivo: Fazer o usuário sentir que o software foi feito para ele.*

1.  **Workspaces Dinâmicos**:
    *   Criar layouts JSON predefinidos para cada Persona.
    *   Ao detectar login de um usuário "Admin", esconder o Terminal e mostrar o "Browser View" e "Task Kanban".
2.  **Self-Correction Loop (A Consciência)**:
    *   Usar o `SelfReflectionEngine` não apenas para erro de código, mas para **eficiência de trabalho**.
    *   *Exemplo*: "Vi que você faz essa tarefa repetitiva todo dia às 9h. Quer que eu crie um Agente Cron para fazer isso?"

---

## 💰 4. Viabilidade & Planos de Negócio

Para garantir que somos viáveis e lucrativos (Zero Prejuízo):

1.  **Camada Gratuita ("The Hook")**:
    *   Acesso ao *Dev Mode* básico.
    *   Agentes passivos (sem Browser Automation).
2.  **Plano Pro ("The Freelancer")**:
    *   Acesso a *Admin Mode* e *Freelance Mode*.
    *   300 Créditos de Autonomia (Agente navega na web por você).
3.  **Plano Enterprise ("The Agency")**:
    *   Colaboração Multiplayer ilimitada.
    *   Agentes 24/7 (não param quando você fecha a janela).
    *   Marketplace de Agentes Customizados.

---

## 🚀 Próximos Passos Imediatos (Técnico)
1.  **Executar a "Tarefa 01" (Wiring)**: Conectar o código de Trading já existente para provar o conceito de "Módulos Dinâmicos".
2.  **Instalar Playwright no Server**: Dar ao agente a capacidade de navegar na web (primeiro passo para ser "Admin Universal").
3.  **Atualizar o `TaskHandler`**: Permitir que ele aceite comandos de linguagem natural que não sejam apenas código (ex: "Resuma este PDF").

**Conclusão**: Com essa arquitetura, o Aethel Engine deixa de brigar apenas com o VS Code e passa a brigar com toda a força de trabalho digital humana e sintética.
