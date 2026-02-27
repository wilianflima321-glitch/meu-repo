# 🛠️ PLANO DE IMPLEMENTAÇÃO PROTEUS (HÍBRIDO)
> **Estratégia:** Fusão Visual do Theia Desktop com Next.js Web

Este plano detalha como transformar a interface atual, fragmentada entre Desktop e Web, em uma experiência unificada ("Proteus").

---

## 📅 SPRINT 1: UNIFICAÇÃO VISUAL (Theme Sync)
**Objetivo:** Fazer o Next.js parecer nativo do Theia.

- [ ] **1. CSS Variables Sync (Theia -> Web)**
    - [ ] Criar hook `useTheiaTheme` no Next.js (`studio-ui`).
    - [ ] Configurar Tailwind (`tailwind.config.ts`) para usar variáveis CSS nativas do VS Code:
        - `colors.background` -> `var(--vscode-editor-background)`
        - `colors.primary` -> `var(--vscode-button-background)`
    - [ ] Remover hardcoded colors (`#1e1e1e`) dos componentes React.

- [ ] **2. UI Reset (Design System)**
    - [ ] Implementar `@aethel/ui` (pacote compartilhado).
    - [ ] Substituir inputs e botões padrão do HTML por componentes que imitam o VS Code Toolkit.
    - [ ] Garantir que scrollbars sejam idênticas às do editor.

---

## 📅 SPRINT 2: A PONTE (The Bridge Extension)
**Objetivo:** Permitir que o Theia abra janelas do Next.js.

- [ ] **3. Aethel Bridge Extension (`ide-shell`)**
    - [ ] Criar extensão Theia simples.
    - [ ] Implementar `CustomEditorProvider`.
    - [ ] Ao abrir `*.level` ou `*.bp`, instanciar um `Webview` apontando para `localhost:3000/editor/3d`.

- [ ] **4. Universal Command Palette**
    - [ ] Garantir que comandos do Theia (`F1`) possam disparar ações no Next.js (via `postMessage`).
    - [ ] Exemplo: Usuário digita "Add Cube" no Theia -> Mensagem enviada -> Cubo aparece no Canvas React.

---

## 📅 SPRINT 3: MICRO-INTERAÇÕES & POLISH
**Objetivo:** O "Wow Factor" e Feedback.

- [ ] **5. Skeleton Loading Inteligente**
    - [ ] Enquanto o `iframe` do Next.js carrega: Mostrar um Skeleton escuro (exatamente da cor do editor) para evitar "flash branco".
    - [ ] Adicionar loader sutil na status bar do Theia.

- [ ] **6. Unificação de Ícones**
    - [ ] Adotar `Codicons` (fonte de ícones do VS Code) dentro do Next.js para consistência total.

---

## 🏁 CRITÉRIOS DE ACEITE "PROTEUS"

1.  **Invisible Boundaries:** O usuário não consegue dizer onde termina o HTML nativo do Theia e onde começa o React.
2.  **Shared State:** Se eu salvo o arquivo no Theia, o editor visual para de mostrar a bolinha de "dirty".
3.  **Performance:** A troca de abas entre Editor de Texto e Editor 3D é instantânea (< 200ms).

---
**Prioridade Imediata:** Tarefa 1. Sem as cores sincronizadas, tudo parecerá um remendo.
