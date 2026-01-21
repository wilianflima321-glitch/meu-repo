# 🌉 AETHEL UNIFIED BRIDGE SYSTEM (PROTEUS)
> **Meta:** Unir Web (Next.js) e Desktop (Theia) em uma única "Hyper-IDE".

Este documento explica **COMO** os dois padrões (`WEB_STANDARD.md` e `IDE_STANDARD.md`) se conectam tecnicamente e visualmente para o usuário final.

---

## 1. O CONCEITO "PROTEUS" (A Interface Camaleão)
O Aethel não tem "duas interfaces". Ele tem **um Cérebro (IDE Shell)** e **vários Rostos (Viewports)**.

### 1.1 Diagrama de Fusão
```mermaid
graph TD
    User[Usuário] --> Shell[IDE Shell (Base)]
    Shell --> |Edição de Texto| Monaco[Monaco Editor (Nativo)]
    Shell --> |Edição Visual| WebView[Proteus Viewport (React/Web)]
    
    WebView --> |Renderiza| LevelEd[Level Editor 3D]
    WebView --> |Renderiza| BPEd[Blueprint Editor]
    WebView --> |Renderiza| UIEd[UI Designer]
    
    subgraph "Visual Consistency Layer"
    Style[Tokens de Design Compartilhados]
    Theme[Tema VS Code Sincronizado]
    end
    
    Shell -.-> Style
    WebView -.-> Style
```

---

## 2. REGRAS DE OURO DA UNIFICAÇÃO

Para evitar a sensação de "Frankenstein" (peças costuradas):

### 2.1 Regra da Sincronia de Tema (Theme Sync)
*   **O Líder:** O Shell (Theia) dita o tema.
*   **O Seguidor:** O Web Viewport (Next.js) obedece.
*   **Mecanismo:**
    1.  Theia detecta mudança de tema (ex: "Light Mode").
    2.  Theia envia mensagem `POST_MESSAGE: UPDATE_THEME` com JSON de cores.
    3.  Next.js aplica as cores em variáveis CSS `:root` instantaneamente.
    *Resultado:* A interface web muda de cor junto com a IDE, sem piscar.

### 2.2 Regra da Navegação (Router Bridge)
*   Se o usuário clica num link interno no Dashboard Web (ex: "Abrir Projeto X"), a IDE Desktop deve interceptar e abrir a pasta real, não navegar o iframe.
*   **Implementação:** `window.parent.postMessage({ type: 'OPEN_FOLDER', path: '/projects/x' }, '*')`

---

## 3. COMPONENTES HÍBRIDOS (Build once, Run Everywhere)
Criaremos uma biblioteca de componentes `@aethel/ui` que funciona nos dois mundos.

| Componente | No Web (Next.js) | No Desktop (Theia Panel) |
| :--- | :--- | :--- |
| **Button** | `<button class="aethel-btn">` | Mesmo HTML/CSS |
| **Input** | `<input class="aethel-input">` | Mesmo HTML/CSS |
| **Icon** | `<LucideIcon />` | `<Codicon />` (Mapeado para SVG igual) |

---

## 4. O FLUXO DO USUÁRIO UNIFICADO

1.  **Start:** Usuário abre o App Desktop.
2.  **Home:** Carrega o `Next.js Dashboard` (Web) dentro da janela principal. Parece nativo.
3.  **Create:** Usuário clica "Novo Jogo" no Dashboard Web.
4.  **Action:** Dashboard manda comando p/ Desktop criar pastas.
5.  **Edit:** Desktop abre a workspace e carrega o layout da IDE.
6.  **Visual:** Usuário abre `fase1.level`. Desktop abre aba com `Next.js Level Editor`.

**Conclusão:** Para o usuário, não existe "Web" ou "Desktop". Existe apenas "Aethel".
