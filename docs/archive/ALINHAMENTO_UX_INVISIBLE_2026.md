# 🧘 Aethel Engine: Filosofia "Invisible UI" & Universal Viewport (2026)

> **Diretriz de Design:** "Complexidade Interna Infinita, Simplicidade Externa Absoluta."
> **Meta:** Superar o Manus sem poluir a tela. O usuário nunca deve trocar de "modo". A interface se adapta via conteúdo, não via layout.

---

## 🚫 O Que Não Vamos Fazer (Correção de Rota)
*   **Não** criaremos botões de "Trocar para Admin Mode".
*   **Não** encheremos a sidebar de ícones para cada funcionalidade (RH, Trading, Browser).
*   **Não** teremos dashboards complexos separados que tiram o foco do código.

## ✨ 1. O Conceito: "The Universal Viewport" (Janela Universal)
A IDE terá apenas **três áreas fundamentais** que cobrem 100% dos casos de uso, do Coding ao Trading, do Design à Gestão.

| Área | Função Universal | Comportamento Adaptativo |
| :--- | :--- | :--- |
| **1. O Chat (Input)** | Comando & Intenção | O usuário pede. Ex: *"Compre cripto"* ou *"Crie um site"* ou *"Pague essa conta"*. |
| **2. O Editor (Logic)** | Estrutura & Regras | Mostra o código (`.ts`), o contrato (`.pdf`), ou a planilha (`.csv`) que define a tarefa. |
| **3. O Live Preview (Output)** | Manifestação Visual | **Aqui está a mágica.** Esta janela muda o *conteúdo* baseada no que a IA está fazendo. |

### Cenários de Adaptação Automática (Sem Clutter)

#### Cenário A: Desenvolvimento (Padrão)
*   **Chat:** "Crie um botão azul."
*   **Editor:** Mostra `Button.tsx`.
*   **Preview:** Mostra o botão renderizado (Web Preview).

#### Cenário B: Trading
*   **Chat:** "Como está o mercado hoje?" (Não existe botão de Trading).
*   **Editor:** Mostra `strategy.json` (Regras de risco).
*   **Preview:** Automaticamente renderiza o **Trading Widget** (Gráficos/Cotações) no lugar do site.

#### Cenário C: Automação Admin (Browser)
*   **Chat:** "Acesse o site da prefeitura e emita a nota."
*   **Editor:** Mostra o script `invoice-bot.spec.ts` (Playwright) sendo gerado em tempo real.
*   **Preview:** Mostra um **Navegador Headless Espelhado** vendo o robô clicar nos botões do site da prefeitura ao vivo.

---

## 🛠️ 2. Arquitetura "Silent Intelligence" (Backend)

Todo o peso sai da UI (Frontend) e vai para o "Cérebro" (Backend).

### 2.1. O "Router de Intenção" (Backend)
No `ChatService`, a IA classifica a intenção do usuário:
*   `INTENT_CODE` -> Aciona Code Generator -> Preview: `MiniBrowser`.
*   `INTENT_BROWSE` -> Aciona Playwright -> Preview: `ScreenCast` do container.
*   `INTENT_TRADING` -> Aciona TradingService -> Preview: `ReactWidget` de Trading.

### 2.2. Consolidação de Interface
*   **Remover**: Ícones excessivos na Activity Bar.
*   **Manter**: Explorer, Search, Source Control, **Aethel AI**.
*   **Aethel AI Panel**: É aqui que tudo acontece.
    *   Se o usuário pede "ver meus servidores", o Chat responde com um **Widget Interativo** dentro da própria conversa (como o Claude Artifacts), e não abre uma nova aba gigante.

---

## 🚀 3. Roteiro Ajustado (Foco em UX Limpa)

1.  **Limpeza da UI Existente**:
    *   Esconder views desnecessárias por padrão.
    *   Focar na tríade: Chat (Esquerda/Direita), Editor (Centro), Preview (Direita/Baixo).

2.  **Universal Preview Provider**:
    *   Em vez de ter uma extensão "Trading" que abre uma view própria, o módulo de Trading deve registrar um *Content Provider* para a view de Preview existente.
    *   Se a IA decidir que o output é financeiro, ela manda um HTML/React de Trading para o Preview.

3.  **Headless Browser Stream**:
    *   Para o "Admin Mode" ser invisível, o usuário não abre o Chrome.
    *   O Backend roda o Chrome.
    *   O Backend envia streams de imagens (MJPEG) ou coordenadas DOM para a janela de Preview da IDE.
    *   Sensação: "O agente está usando meu computador", mas está tudo contido na IDE.

---

## 🎯 Conclusão de Alinhamento
**"Aethel Engine não tem modos. Ela tem inteligência."**
O usuário não configura a ferramenta; a ferramenta se configura para a tarefa do momento. A interface permanece Zen, limpa e focada, enquanto o caos da complexidade é gerenciado pelos Agentes nos bastidores, mostrando apenas o resultado final no Live Preview.
