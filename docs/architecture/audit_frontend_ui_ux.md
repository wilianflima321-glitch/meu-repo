# Auditoria de UX/UI: Frontend (Padrão Cursor 3.x)

Este documento centraliza todas as críticas estéticas e de usabilidade (UX/UI) encontradas no frontend do Aethel e mapeia o plano de execução para que possamos atingir o Padrão V33.

---

## 🗺️ MAPEAMENTO TÁTICO FINAL UX/UI (THE HITLIST PARA O CLAUDE)
> **INSTRUÇÃO PARA O AGENTE EXECUTOR (CLAUDE):** As interfaces desta engine são cirúrgicas. Você está expressamente proibido de inventar componentes ou alucinar caminhos. Abra exatamente os arquivos abaixo e aplique as lógicas descritas.

### 🎯 ALVOS DA FASE 1 & 2 (Limpeza Visual e Virtualização)
- **Frente A4 (Visual Script):** Arquivo: `components/visual-scripting/VisualScriptEditor.tsx`. Remova estilos inline. Use variáveis `--aethel-surface-primary`. Validar com `grep` antes de executar.
- **Frente A8 (Outliner Virtualizado):** Arquivo: `components/viewport/SceneViewportOutliner.tsx`. Instale `@tanstack/react-virtual` para renderizar as divs da lista de entidades.

### 🎯 ALVOS DA FASE 3 & 4 (DX e Espaço de Trabalho Fluido)
- **Frente A21 e 36 (Windowing / Dockview):** Arquivo: `components/ide/modern-shell/ModernIDEShellPanels.tsx`. Remova o Flexbox fixo. Envolva o `slots.sidebar` e `slots.chat` num provider de Docking.
- **Frente A40 (Ghost Previews Holográficos):** Arquivo: `components/ide/EditorApplyBridgeContext.tsx`. Ao receber o `pendingDiff` da IA, injete *Decorations* nativas no Monaco (`className: 'bg-green-500/20'`) antes de aplicar o código real.

### 🎯 ALVOS DA FASE 5 (O Padrão Ouro: Live, HMR e Performance Bruta)
- **Preview HMR (Zero-Flicker):** Arquivo: `components/preview/RuntimePreviewSurface.tsx`. Bloqueie a desmontagem inteira do React Tree quando o código alterar.
- **Ancoragem Espacial (Spatial Copilot):** Arquivo: `components/preview/MagicWandChat.tsx`. Adicione a propriedade `draggable={true}`. Quando o usuário soltar a varinha mágica sobre o `components/viewport/ViewportSceneCanvas.tsx`.
- **Anti-Lag Automático (Dynamic Resolution):** Arquivo: `components/viewport/AethelViewport3D.tsx`. Capture o evento de arrasto da câmera e ajuste `pixelRatio`.
- **Timeline de Voz (Gemini Live):** Arquivo: `components/ide/AIChatPanelChrome.tsx`. Oculte a barra de `TextInput`. Implemente um `<canvas>` de *Audio Visualizer*.

---

## 1. A Tela de Login (`login-v2.tsx`) - ✅ CONCLUÍDO
A tela usava HTML legado e tags `<details>`. Foi reconstruída usando primitivos UI absolutos.

## 2. O IDE Shell (`ModernIDEShellCenterStack.tsx`) - ✅ CONCLUÍDO
O painel do terminal e agentes continha javascript injetando cores estáticas, quebrando o Dark Mode. Tudo foi migrado para CSS Tokens.

## 3. O Carregamento Global (`PremiumLoadingState.tsx`) — 🔵 TODO
### 🔴 A Crítica
Hoje o repo **não tem** um componente premium de loading. As páginas usam strings ad-hoc como "Carregando Studio Home..." (PT-BR sem acento) e spinners CSS arbitrários. Há aproximadamente 1.300 ocorrências de "Carregando..." espalhadas.
### ⚡ O Plano de Execução
Criar `cloud-web-app/web/components/ui/PremiumLoadingState.tsx` com 4 variantes: `route`, `data`, `inline`, `splash`. Adicionar shimmer no `tailwind.config.ts`.
Substituir os ~1.300 spinners ad-hoc nas páginas críticas listadas em §5.5.
Aplicar o mesmo padrão de honestidade nos itens 1 e 2 antes de marcar ✅.

---

# ⚠️ FASE 2: NOVAS DESCOBERTAS (O QUE FALTA FAZER)

## A4. Visual Scripting Editor (Editor de Nós - Estilo Unreal)
### 🔴 A Crítica (Padrão Unreal Engine)
Ao auditar `components/visual-scripting/VisualScriptEditor.tsx`, encontrei **690 linhas de código infestadas com Estilos Inline massivos**.
### ⚡ O Plano de Ação
- **Validação Prévia:** `grep -c "style={{" cloud-web-app/web/components/visual-scripting/VisualScriptEditor.tsx`. Se >= 50, prossiga com a refatoração para Tailwind. Se < 10, pare.
- **Refatoração Radical:** Remover o objeto `ui` hardcoded do arquivo e converter 100% dos `style={{...}}` para classes do Tailwind.

## A5. Viewport Asset Dropzone
### 🔴 A Crítica
O arquivo `components/viewport/AethelViewport3D.tsx` usa cores chumbadas para a caixa de drop.
### ⚡ O Plano de Ação
- **Tokenização do Glassmorphism:** Alterar para `bg-[color-mix(in_srgb,var(--aethel-surface-elevated)_90%,transparent)]`.

## A6. O Dashboard Master (`DashboardShell.tsx`)
### 🔴 A Crítica
O tratamento dos Alertas de Erro (Auth Error / Billing Error) usa marcações soltas de cores direto na prop `className`.
### ⚡ O Plano de Ação
- **Isolamento de Componentes:** Criar componentes como `<AlertBanner variant="error">` dentro de `components/ui/`.

---

## A7. O Inspetor de Propriedades (Inspector Panel)
### ⚡ O Plano de Ação
- **Value Scrubbing & Expressões Math:** Implementar campos de input numéricos que aceitam contas matemáticas (ex: `10 * 2.5`) e suporte a arrastar o mouse para alterar valores rapidamente.

## A8. O Outliner e Árvore de Cena (Virtualization)
### ⚡ O Plano de Ação
- **Virtual Scrolling Obrigatório:** A árvore de hierarquia (`SceneGraph`) DEVE usar listas virtualizadas (`@tanstack/react-virtual`).

## A9. O Navegador de Assets (Content Browser)
### ⚡ O Plano de Ação
- **Thumbnails Gerados no Worker:** Implementar um WebWorker que abre os modelos GLTF em um canvas Offscreen minúsculo, tira uma foto do modelo e salva o cache no IndexedDB.

## A10. O Editor de Curvas e Timeline (Animation)
### ⚡ O Plano de Ação
- **Dope Sheet em WebGL/Canvas:** A *Timeline* e o *Graph Editor* (Curvas de Bezier de animação) devem ser desenhados puramente em uma tag `<canvas>` HTML5 dedicada (via Canvas API 2D).

## A11. O Console / Terminal (Log Virtualization)
### ⚡ O Plano de Ação
- **Terminal xTerm.js/Canvas:** Em vez de imprimir logs em `<div>` React, o Console deve integrar a biblioteca `xterm.js` rodando em WebGL addon.

## A12. O Profiler Gráfico (Flamegraphs)
### ⚡ O Plano de Ação
- **Flamegraphs em Tempo Real:** Ler dados de *OpenTelemetry* e desenhar fatias de tempo em cores neon com zoom dinâmico.

## A13. O Command Palette (Cmd+P)
### ⚡ O Plano de Ação
- **Fuzzy Finder (fzf-wasm):** O campo de busca de comandos usará um port Wasm do algoritmo de *Fuzzy Search* do FZF ou ripgrep.
- **Critério de Aceite (Mensurável):** Tempo entre keypress e widget visível < 100ms.

## A14. O Editor de Terreno (Brush UI)
### ⚡ O Plano de Ação
- **Radial Menus e Teclas de Atalho Ocultas:** Implementar atalhos contextuais (Ex: segurar `B` e arrastar o mouse muda o tamanho do brush dinamicamente na tela 3D).

## A15. Feedback e Sistema de Notificações
### ⚡ O Plano de Ação
- **Event Center Integrado na Status Bar:** Exportações e builds vivem silenciosas como Barras de Progresso mínimas na barra inferior (Status Bar).

## A16. O Chat de IA (Streaming Jitter)
### ⚡ O Plano de Ação
- **Auto-Scroll Suave:** Implementar `overflow-anchor: none` com monitoramento manual de âncora.

## A17. O Editor de Partículas (Gradient Builders)
### ⚡ O Plano de Ação
- **Rampa de Cores Interativa:** Construir um componente de interface de Gradiente Linear interativo, onde o usuário clica para adicionar chaves de cor.

## A18. O Sistema de Docking Visual (Window Tiling UI)
### ⚡ O Plano de Ação
- **Ghosting Renderizado Manualmente:** Substituir o HTML5 Drag API por eventos mouses `pointerdown/move` que desenham um "Fantasma" perfeitamente translúcido da Janela com bordas de acoplamento.

## A19. A Bússola e Gizmos Interativos
### ⚡ O Plano de Ação
- **Cubo de Visualização 3D:** Desenhar um pequeno cubo WebGL que o usuário pode clicar em uma das faces para travar a visão Ortográfica.

## A20. O Menu de Contexto (Right Click)
### ⚡ O Plano de Ação
- **Menu Nativo Interceptado:** Cancelar o `contextmenu` do navegador e renderizar um portal React em Absolute Bounds.

---

## A21 a A50: Otimizações Finas
- **A21:** Presets de Área de Trabalho (Workspace Layouts).
- **A22:** Seletor de Cores HDR.
- **A23:** Histórico Visual de Desfazer (Undo Stack UX).
- **A24:** Wheel/Gesture API para Pan e Zoom (Sem rolagem da página).
- **A25:** Tipografia Fira Code/JetBrains Mono com `font-variant-ligatures: contextual`.
- **A26:** Animações com curva Spring (`framer-motion`).
- **A27:** Ícones rigorosamente de 1.5px (Lucide Icons).
- **A28:** Widget 3D de Bússola ativo.
- **A29:** Modais com Focus Trap (`backdrop-blur-md`).
- **A30:** Keyboard First (ARIA).
- **A31:** Settings híbrido (GUI / JSON Split-View).
- **A32:** Gerenciador global de atalhos de teclado (Zustand).
- **A33:** Project Bootstrapper (Templates prontas).
- **A34:** i18n Nativo (Inglês como canônico).
- **A35:** Tooltips de vídeo nativos em `.webm`.
- **A47:** Compact Mode Atômico para componentes UI (`min-h-[24px]`).
- **A48:** ScrubbableNumber Inputs com Pointer Lock API.
- **A49:** Context Menus via `React.createPortal`.
- **A50:** Zero Prop-Drilling (Local State Buffer + `onBlur` submit).
