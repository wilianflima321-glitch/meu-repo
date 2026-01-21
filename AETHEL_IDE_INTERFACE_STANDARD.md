# 🖥️ AETHEL IDE STANDARD: THE "UNREAL-KILLER" SHELL
> **Stack:** Theia (Electron/Web) + React (Viewports)
> **Referência Visual:** VS Code, Unreal Engine 5, Godot 4

Este documento define o padrão visual para o **IDE Shell** (`cloud-ide-desktop`). Esta é a "Workstation" pesada, onde o trabalho duro acontece. 

---

## 1. PRINCÍPIOS DA IDE INTERFACE (The Power User UI)

### 1.1 "Density & Clarity"
*   **Regra:** Profissionais precisam de densidade de informação, mas sem ruído.
*   **Implementação:**
    *   Barras de ferramentas compactas (24px height).
    *   Ícones monocromáticos (nada de ícones coloridos "cartoon").
    *   Contraste alto apenas no que importa (o código e a viewport).

### 1.2 "Docking Freedom" (Layout Unreal)
O usuário deve poder arrastar qualquer painel para qualquer lugar.
*   **Default Layout (Game Dev):**
    *   **Esquerda:** Outliner (Hierarquia da Cena).
    *   **Centro:** 3D Viewport (Grande).
    *   **Direita:** Details Panel (Propriedades).
    *   **Baixo:** Content Drawer (Assets) + Output Log.

---

## 2. THEME & STYLING (Theia CSS)

O tema do Theia deve ser **idêntico** ao da Web para manter a consistência.

### 2.1 The "Aethel Dark" Theme
Criaremos uma extensão de tema VS Code real (`theme-aethel`).
*   **Editor Background:** `#09090b` (Igual Web).
*   **SideBar Background:** `#09090b` (Continuidade visual).
*   **Activity Bar:** `#09090b` (Borda direita sutil `#27272a`).
*   **StatusBar:** `#6366f1` (Indigo - Marca Aethel) ou `#18181b` (Stealth Mode default).

### 2.2 Iconografia (Codicons)
*   Usar exclusivamente **Codicons** (fonte nativa do VS Code).
*   Não misturar com FontAwesome ou Material Icons. Consistência é rei.

---

## 3. FERRAMENTAS ESPECÍFICAS (O Diferencial)

### 3.1 O "Content Drawer" (Gaveta de Conteúdo)
Em vez de uma árvore de arquivos chata (VS Code), imitaremos a **Unreal Engine**:
*   **Atalho:** `Ctrl+Space`.
*   **Visual:** Uma gaveta que sobe da parte inferior mostrando THUMBNAILS de assets (Modelos, Texturas, Blueprint).
*   **Tecnologia:** React Component rodando dentro de uma Webview Theia.

### 3.2 O "Visual Scripting Graph"
*   **Visual:** Nós com cantos arredondados, conexões curvas (Bézier), cores por tipo de dado (Float=Verde, Vector=Amarelo, Ref=Azul).
*   **Fundo:** Grid infinito com pontos (Dot Grid) sutil.

---

## 4. INTEGRAÇÃO VISUAL COM A WEB
O Desktop hosteia a Web, então a transição deve ser invisível.
1.  **Sem Loading Spinners:** Quando abrir um editor Web, mostre um "Snapshot" do último estado.
2.  **Mesmos Atalhos:** `Ctrl+P` no Desktop deve funcionar igual ao `Cmd+K` na Web.

---

## 🎯 CHECKLIST DE ALINHAMENTO (IDE)
- [ ] Criar extensão `theme-aethel` para VS Code/Theia com as cores Zinc 950.
- [ ] Configurar layout padrão do Theia para esconder menus desnecessários ("Zen Mode" default).
- [ ] Implementar o "Content Drawer" como Webview React.
- [ ] Unificar a fonte do terminal para `JetBrains Mono`.
