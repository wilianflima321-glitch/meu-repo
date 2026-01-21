# 🗺️ PROTEUS INTERFACE SPECIFICATION (HÍBRIDA)
> **Referência Técnica para a Fusão Theia (Shell) + Next.js (Visual Modules)**

Esta especificação define como o **Proteus** adapta a interface baseada no contexto do usuário, utilizando uma arquitetura híbrida de contêineres web (`iframes` inteligentes) dentro de um shell nativo.

---

## 1. O SHELL PROTEUS (IDE CORE)
*Implementação: Theia / Electron*

O "Shell" é a moldura imutável que provê as ferramentas de "Hard Core Development".

```
+---------------------------------------------------------------+
|  GLOBAL MENU BAR (File, Edit, View...)                        |
+-----+---------------------------------------------------------+
|  A  |                                                         |
|  C  |  +---------------------------------------------------+  |
|  T  |  |  TAB BAR (Main.ts | Level1.level | Enemy.bp)      |  |
|  I  |  +---------------------------------------------------+  |
|  V  |  |                                                   |  |
|  I  |  |  VIEWPORT AREA (Context Sensitive)                |  |
|  T  |  |                                                   |  |
|  Y  |  |  [Renderiza Monaco Editor OU Next.js Module]      |  |
|     |  |                                                   |  |
|  B  |  |                                                   |  |
|  A  |  |                                                   |  |
|  R  |  +---------------------------------------------------+  |
|     |                                                         |
+-----+---------------------------------------------------------+
|  STATUS BAR (Language Server: Ready | Proteus: 3D Mode)       |
+---------------------------------------------------------------+
```

### 1.1 Activity Bar (Esquerda)
Deve conter APENAS o essencial. Ferramentas específicas de contexto devem ser removidas daqui e movidas para dentro do Viewport ou Side Panels dinâmicos.
*   ✅ Explorer
*   ✅ Search
*   ✅ Source Control
*   ✅ Extensions
*   ✅ **Aethel AI (Chat)**

---

## 2. OS CARTUCHOS VISUAIS (VIEWPORTS)
*Implementação: React / Next.js (Rend. Remota ou Local)*

Quando o usuário abre um arquivo especial (`.level`, `.bp`, `.shader`), o Shell oculta o editor de texto e carrega um **Next.js Viewport**.

### 2.1 Cartucho 3D (Level Editor)
**Gatilho:** Abrir arquivo `.level` ou `.scene`.
**Layout Interno (Next.js):**
*   **Centro:** Three.js Canvas (Interativo).
*   **Overlay Topo:** Toolbar flutuante (Move, Rotate, Scale, Snap).
*   **Overlay Direita:** Properties Panel (Inspector) - *Glassmorphism*.
*   **Overlay Esquerda:** Scene Hierarchy (Outliner) - *Glassmorphism*.

### 2.2 Cartucho Visual Scripting (Blueprints)
**Gatilho:** Abrir arquivo `.bp` ou `.graph`.
**Layout Interno (Next.js):**
*   **Centro:** React Flow Infinite Canvas.
*   **Context Menu:** Botão direito abre buscador de nós.
*   **Minimap:** Canto inferior direito para navegação rápida.

### 2.3 Cartucho UI Designer (WYSIWYG)
**Gatilho:** Abrir arquivo `.gui` ou `.tsx` (modo design).
**Layout Interno (Next.js):**
*   **Centro:** Renderização do componente React isolado.
*   **Esquerda:** Paleta de Componentes (Drag & Drop).
*   **Direita:** CSS Inspector visual (Padding, Margin, Color).

---

## 3. A PONTE (THE BRIDGE) - INTEGRAÇÃO VISUAL

Para que o usuário não perceba a troca de tecnologias:

### 3.1 CSS Variables Sync
O Next.js deve injetar no seu `:root` as variáveis lidas do Theia Host:
```css
:root {
  --bg-primary: var(--vscode-editor-background);
  --text-primary: var(--vscode-editor-foreground);
  --border-color: var(--vscode-panel-border);
  --focus-ring: var(--vscode-focusBorder);
}
```
*Ação:* Criar um `ThemeSynchronizer.tsx` no projeto Next.js que escuta mensagens `postMessage` do Theia com atualizações de tema.

### 3.2 Comunicação de Eventos
*   ✅ **Save:** Quando o usuário aperta `Ctrl+S` no Theia, o Theia manda `CMD_SAVE` para o iframe. O Next.js serializa o estado e devolve o JSON para o Theia salvar no disco.
*   ✅ **Undo/Redo:** O Theia gerencia a pilha de comandos.

---

## 4. O MODO "PLAY" (LIVE PREVIEW)

O Proteus introduz o **Universal Play Button** (Canto superior direito).
*   Se o Cartucho é 3D -> Inicia o Game Loop no Canvas.
*   Se o Cartucho é App -> Abre o Web Preview em Painel Lateral.
*   Se o Cartucho é Script -> Roda o Script no Terminal Integrado.

**Meta UX:** "One Button to Rule Them All". O usuário nunca configura "Run Configurations". O Proteus adivinha.
