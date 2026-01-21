# 🌐 AETHEL WEB STANDARD: THE "REPLIT-KILLER" INTERFACE
> **Stack:** Next.js 14 + Tailwind CSS + Framer Motion
> **Referência Visual:** Replit, Vercel Dashboard, Linear.app

Este documento define o padrão visual e comportamental para o **Studio UI** (`cloud-web-app/web`). Esta é a face pública, acessível e colaborativa da engine.

---

## 1. PRINCÍPIOS DA WEB INTERFACE (The Zero-Friction UI)

### 1.1 "Instant On"
*   **Regra:** O usuário deve ver um cursor piscando ou um botão de "Play" em menos de 800ms.
*   **Implementação:**
    *   Uso agressivo de `Next.js SSR` para o shell inicial.
    *   `Skeleton Loaders` que mimetizam exatamente o layout final (nada de spinners genéricos).
    *   Deferimento de scripts pesados (Three.js) para depois da renderização do layout.

### 1.2 "Contextual Workspace" (O Layout Adaptativo)
Não teremos uma barra lateral fixa gigante. Teremos navegação contextual.

```tsx
// Exemplo de Layout Hierárquico:
<WorkspaceLayout>
  <ProjectHeader />  // Breadcrumbs: user / project / main.ts
  <ContextBar />     // [Run] [Deploy] [Share] (Ações do momento)
  <MainArea>
     // O Conteúdo (Editor, Preview, Settings)
  </MainArea>
</WorkspaceLayout>
```

---

## 2. DESIGN SYSTEM & TOKENS (Tailwind Config)

Estenderemos o `tailwind.config.ts` atual para suportar o modo **"Deep Space"** (pretos profundos, não cinzas).

### 2.1 Color Palette Update
*   **Background:** `bg-[#09090b]` (Zinc 950 profundo).
*   **Surface (Cards):** `bg-[#18181b]` (Zinc 900).
*   **Border:** `border-[#27272a]` (Zinc 800 - Sutil).
*   **Primary (Brand):** `text-[#6366f1]` (Indigo 500) -> `text-[#818cf8]` (Indigo 400) no Dark Mode.

### 2.2 Typography
*   **UI:** `Inter var` (Sans-serif, legibilidade máxima).
*   **Code:** `JetBrains Mono` (Ligatures ativadas, altura de linha generosa).
*   **Micro-copy:** Todo texto auxiliar (labels, hints) deve ser `text-zinc-500` e `text-sm`.

---

## 3. COMPONENTES VISUAIS PRINCIPAIS

### 3.1 The "Magic Box" (Input de Criação)
Assim como o ChatGPT ou Claude, a home page deve ser dominada por um input gigante.
*   **Texto:** "O que vamos construir hoje?"
*   **Comportamento:** Ao digitar, não vá para uma lista de pesquisa. Vá direto para o **Wizard de Criação de AI**.

### 3.2 The "Live Preview" Pane
*   **Diferencial Replit:** O Preview é cidadão de primeira classe.
*   **No Aethel:** O Preview 3D ocupa 50% da tela por padrão em projetos de jogos.
*   **Interação:** Botão "Eject" para abrir em nova aba, botão "Reload" com hot-reload instantâneo.

### 3.3 Multiplayer Cursors
*   **Visual:** Cada usuário tem uma cor única (Avatar border + Cursor SVG).
*   **Feedback:** "João está editando player.ts".

---

## 4. INTEGRAÇÃO VISUAL COM A IDE
Para que o usuário sinta que está no mesmo produto:
1.  **Mesmos Ícones:** Usar `lucide-react` em tudo (mesmo set do VS Code Product Icons se possível).
2.  **Mesma Paleta de Sintaxe:** O editor Monaco na Web deve usar o tema "Aethel Dark" (mesmo do Desktop).

---

## 🎯 CHECKLIST DE ALINHAMENTO (WEB)
- [ ] Atualizar `tailwind.config.ts` com cores `Deep Space`.
- [ ] Remover Navbar estilo "Site Institucional". Mudar para "App Toolbar".
- [ ] Implementar `Cmd+K` (Command Menu) centralizado.
- [ ] Criar página `/dashboard` focada em projetos recentes (Grid Visual).
