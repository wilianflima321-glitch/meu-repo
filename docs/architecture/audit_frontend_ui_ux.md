# Auditoria de UX/UI: Frontend (Padrão Adobe & Cursor)

Este documento centraliza todas as críticas estéticas e de usabilidade (UX/UI) encontradas no frontend do Aethel e mapeia o plano de execução para que possamos atingir o Padrão V34 Dominance Wave (nível Adobe/Cursor).

---

## 1. A Tela de Login (`login-v2.tsx`) - ✅ CONCLUÍDO
### 🔴 A Crítica Resolvida
A tela usava HTML legado e tags `<details>`. Foi reconstruída usando primitivos UI absolutos.

## 2. O IDE Shell (`ModernIDEShellCenterStack.tsx`) - ✅ CONCLUÍDO
### 🔴 A Crítica Resolvida
O painel do terminal e agentes continha javascript injetando cores estáticas (`rgba`), quebrando o Dark Mode. Tudo foi migrado para CSS Tokens.

## 3. O Carregamento Global (`PremiumLoadingState.tsx`) - ✅ CONCLUÍDO
### 🔴 A Crítica Resolvida
Skeletons duros e feios. Injetado um Shimmer Premium no `tailwind.config.ts`.

---

# ⚠️ FASE 2: NOVAS DESCOBERTAS (O QUE FALTA FAZER)

> [!WARNING]
> **Atenção:** As interfaces abaixo foram auditadas agora e possuem dívidas técnicas graves na camada visual que quebram a regra do "Padrão Adobe".

## 4. Visual Scripting Editor (Editor de Nós - Estilo Unreal)
### 🔴 A Crítica (Padrão Unreal Engine)
Ao auditar `components/visual-scripting/VisualScriptEditor.tsx`, encontrei **690 linhas de código infestadas com Estilos Inline massivos**.
- **O Problema:** A Paleta de Nós (`NodePalette`), os menus de contexto (`ContextMenu`) e até os botões da UI estão desenhados com `style={{ background: ui.surface, border: ... }}`.
- **A Consequência:** A página fica inviabilizada para o padrão Tailwind (que usa o compilador JIT). Isso gera atraso de renderização no navegador (paint time) e impossibilita o override rápido de temas.

### ⚡ O Plano de Ação
- **Refatoração Radical:** Remover o objeto `ui` hardcoded do arquivo e converter 100% dos `style={{...}}` para classes do Tailwind (`className="bg-[var(--aethel-surface-primary)] border-[var(--aethel-border-secondary)]"`).

## 5. Viewport Asset Dropzone
### 🔴 A Crítica (Padrão Figma/Adobe)
O arquivo `components/viewport/ViewportAssetDropOverlay.tsx` usa `bg-[rgba(7,12,20,0.9)]`. Esta é uma cor chumbada (hardcoded) sem aderência a nenhuma variável CSS global (Design Token). Se o Aethel for lançado num tema Light, essa caixa preta vai cegar o usuário no meio de uma tela branca.

### ⚡ O Plano de Ação
- **Tokenização do Glassmorphism:** Alterar para `bg-[color-mix(in_srgb,var(--aethel-surface-elevated)_90%,transparent)]` garantindo que a caixa de "Drop Assets" respeite a inteligência do tema do projeto.

## 6. O Dashboard Master (`DashboardShell.tsx`)
### 🔴 A Crítica
A estrutura do Dashboard (`components/dashboard/DashboardShell.tsx`) é sólida e respeita o uso de Tokens (como `var(--aethel-surface-primary)`). No entanto, o tratamento dos Alertas de Erro (Auth Error / Billing Error) usa marcações soltas de cores: `bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)]` direto na prop `className`.
- Isso fere o princípio DRY (Don't Repeat Yourself). Esses alertas devem ser componentizados para manter uma UI imaculada.

### ⚡ O Plano de Ação
- **Isolamento de Componentes:** Criar componentes como `<AlertBanner variant="error">` dentro de `components/ui/` e remover esse HTML poluído do topo do `DashboardShell.tsx`.

---

---

## 7. O Inspetor de Propriedades (Inspector Panel)
### 🔴 A Crítica (Padrão Unity/Blender)
O painel de propriedades (`PropertiesPanel`) costuma ser estático na maioria das engines web. Campos numéricos (X, Y, Z de um Vector3) não possuem "Value Scrubbing" (arrastar o mouse lateralmente no número para aumentá-lo/diminuí-lo).
### ⚡ O Plano de Ação
- **Value Scrubbing & Expressões Math:** Implementar campos de input numéricos que aceitam contas matemáticas (ex: `10 * 2.5`) e suporte a arrastar o mouse para alterar valores rapidamente, idêntico ao Blender.

## 8. O Outliner e Árvore de Cena (Virtualization)
### 🔴 A Crítica (Padrão Unreal)
Se a cena tiver 100.000 objetos, carregar isso numa árvore HTML `<ul>` normal fará o navegador crashar instantaneamente.
### ⚡ O Plano de Ação
- **Virtual Scrolling Obrigatório:** A árvore de hierarquia (`SceneGraph`) DEVE usar listas virtualizadas (ex: `@tanstack/react-virtual`). Renderizando no DOM apenas as 40 linhas que estão visíveis na tela, permitindo drag-and-drop instantâneo de milhões de nós sem *lag* visual.

## 9. O Navegador de Assets (Content Browser)
### 🔴 A Crítica (Padrão Windows Explorer)
Engines baseadas na nuvem geralmente mostram ícones genéricos para modelos 3D ou dependem de URLs lentas. O *grid* não redimensiona suavemente.
### ⚡ O Plano de Ação
- **Thumbnails Gerados no Worker:** Implementar um WebWorker que abre os modelos GLTF em um canvas Offscreen minúsculo, tira uma foto do modelo e salva o cache no IndexedDB para mostrar no *Content Browser* instantaneamente, acompanhado de um controle deslizante de zoom no rodapé para alterar o tamanho dos ícones fluidamente.

## 10. O Editor de Curvas e Timeline (Animation)
### 🔴 A Crítica (Padrão After Effects)
Editores de curvas no browser costumam usar SVG, que escala mal quando há milhares de *keyframes*.
### ⚡ O Plano de Ação
- **Dope Sheet em WebGL/Canvas:** A *Timeline* e o *Graph Editor* (Curvas de Bezier de animação) não podem usar divs ou SVGs para linhas. Devem ser desenhados puramente em uma tag `<canvas>` HTML5 dedicada (via Canvas API 2D) para permitir rolagem de sub-pixel a 144Hz.

## 11. O Console / Terminal (Log Virtualization)
### 🔴 A Crítica (Padrão VSCode)
Quando o compilador de shaders estoura milhares de avisos no console, a interface de debug trava a interface principal do editor.
### ⚡ O Plano de Ação
- **Terminal xTerm.js/Canvas:** Em vez de imprimir logs em `<div>` React, o Console deve integrar a biblioteca `xterm.js` rodando em WebGL addon, suportando códigos de escape ANSI e performance O(1) de inserção textual.

## 12. O Profiler Gráfico (Flamegraphs)
### 🔴 A Crítica
Análise de performance com barras estáticas ou números não diz o que está engasgando o frame.
### ⚡ O Plano de Ação
- **Flamegraphs em Tempo Real:** Uma nova interface de painel que lê os dados de *OpenTelemetry* da Frente 18 do Backend, desenhando as fatias de tempo da CPU e da GPU (Flamegraphs) em cores neon com zoom dinâmico.

## 13. O Command Palette (Cmd+P)
### 🔴 A Crítica (Padrão Cursor/Raycast)
O input de pesquisa de arquivos ou comandos precisa ser a experiência mais fluida do aplicativo. Filtros `Array.filter` em JavaScript engasgam com 50.000 caminhos de arquivos.
### ⚡ O Plano de Ação
- **Fuzzy Finder (fzf-wasm):** O campo de busca de comandos não usará JS puro. Usará um port Wasm do algoritmo de *Fuzzy Search* do FZF ou ripgrep para retornar os arquivos relevantes num raio de 1 milissegundo com sublinhado nos trechos compatíveis.

## 14. O Editor de Terreno (Brush UI)
### 🔴 A Crítica
A UI dos controles de escova (Tamanho, Opacidade, Dureza) usa botões distantes do mouse.
### ⚡ O Plano de Ação
- **Radial Menus e Teclas de Atalho Ocultas:** Implementar atalhos contextuais (Ex: segurar `B` e arrastar o mouse muda o tamanho do brush dinamicamente na tela 3D), e exibir um anel visual ao redor do cursor sem poluir a *sidebar*.

## 15. Feedback e Sistema de Notificações
### 🔴 A Crítica
Pequenos alertas (`Toast`) brotam aleatoriamente pela tela cobrindo ferramentas importantes.
### ⚡ O Plano de Ação
- **Event Center Integrado na Status Bar:** Exportações e builds não devem jogar caixas na cara do usuário. Elas vivem silenciosas como Barras de Progresso mínimas na barra inferior (Status Bar). Um clique abre a central de notificações, mantendo o *layout* mestre estrito e limpo.

## 16. O Chat de IA (Streaming Jitter)
### 🔴 A Crítica
Quando o Copilot responde tokens pela rede, a rolagem do chat treme e perde a estabilidade (*Scroll Jittering*).
### ⚡ O Plano de Ação
- **Auto-Scroll Suave:** Implementar `overflow-anchor: none` com monitoramento manual de âncora. Enquanto os *chunks* de MarkDown e blocos de código renderizam com *Syntax Highlighting*, a aba empurra suavemente a rolagem para o fim.

## 17. O Editor de Partículas (Gradient Builders)
### 🔴 A Crítica
Sistemas de partículas precisam de edição visual de mudança de cor ao longo do tempo (Color over Lifetime).
### ⚡ O Plano de Ação
- **Rampa de Cores Interativa:** Construir um componente de interface de Gradiente Linear interativo, onde o usuário clica para adicionar chaves de cor que emitem *deltas* imediatos pro WebGPU.

## 18. O Sistema de Docking Visual (Window Tiling UI)
### 🔴 A Crítica
Arrastar abas no navegador é tosco e usa a "imagem fantasma" padrão do HTML5 Drag API.
### ⚡ O Plano de Ação
- **Ghosting Renderizado Manualmente:** Substituir o `draggable=true` do HTML5 por eventos mouses `pointerdown/move` que desenham um "Fantasma" perfeitamente translúcido da Janela com bordas de acoplamento (Docking Hints) aparecendo nos limites da tela, copiando o sentimento do Windows Snap.

## 19. A Bússola e Gizmos Interativos
### 🔴 A Crítica
No canto superior direito da tela de cena, o indicador X/Y/Z não pode ser apenas um desenho estático.
### ⚡ O Plano de Ação
- **Cubo de Visualização 3D:** Desenhar um pequeno cubo WebGL (estilo Autodesk Maya/Blender) que o usuário pode clicar em uma das faces para travar a visão Ortográfica (Topo, Lado, Frente).

## 20. O Menu de Contexto (Right Click)
### 🔴 A Crítica
Menu de botão direito do navegador é horrendo. Muitos apps fazem menus React que quebram com o limite inferior do monitor ou são lentos.
### ⚡ O Plano de Ação
- **Menu Nativo Interceptado:** Cancelar o `contextmenu` do navegador. Renderizar um portal React em Absolute Bounds, garantindo que menus com subníveis abram na direção correta caso a tela termine, com sombras (`drop-shadow-2xl`) de padrão altíssimo (Glassmorphism + Border-Radii minimalista de 6px).

---

## 21. Presets de Área de Trabalho (Workspace Layouts)
### 🔴 A Crítica (Padrão Adobe Premiere)
Ficar abrindo e fechando painéis dependendo da tarefa é exaustivo. Uma engine genérica mantém a mesma interface sempre.
### ⚡ O Plano de Ação
- **Layouts Hot-Swappable:** Implementar um seletor no topo da tela com presets: "Coding", "Level Design", "Animation", "Audio". Ao clicar, o sistema de *Docking* (Frente 18) reposiciona as janelas instantaneamente.

## 22. O Falso Color Picker (Seletor de Cores HDR)
### 🔴 A Crítica (Padrão Unreal Engine)
Seletores de cor HTML padrão (`<input type="color">`) ou bibliotecas React fracas não suportam cores HDR (valores RGB acima de 255) usadas para materiais Emissivos (Bloom).
### ⚡ O Plano de Ação
- **Color Picker Engine-Grade:** Criar um Color Picker customizado que suporta espaços de cor HSV/HSL, permite digitar "Intensidade" (ex: 5.0) para gerar neon/glow em WebGL, e integra a `EyeDropper API` do navegador para "chupar" cores de qualquer lugar do monitor.

## 23. Histórico Visual de Desfazer (Undo Stack UX)
### 🔴 A Crítica (Padrão Photoshop)
Apertar `Ctrl+Z` cegamente sem saber o que está sendo desfeito gera pânico em cenas complexas.
### ⚡ O Plano de Ação
- **Painel de Histórico (Action Stack):** Uma aba que lista as últimas 50 ações (`Moveu Cubo`, `Deletou Luz`, `IA Editou Script`). O usuário pode clicar em qualquer ponto da lista para fazer o *Rollback* visual no ato.

## 24. Gestos e Trackpads (Pinch-to-Zoom e Panning)
### 🔴 A Crítica (Padrão Figma)
Navegar no Node Editor (Visual Script) usando barras de rolagem ou mouse com scroll comum parece arcaico.
### ⚡ O Plano de Ação
- **Wheel/Gesture API:** Interceptar nativamente os eventos do Trackpad (MacBook) e mouses de alta precisão. O Pan (arrastar tela) e o Zoom nos editores 2D devem ser baseados no eixo X/Y do trackpad com suavização matemática, sem rolar a página web por engano.

## 25. Tipografia Padrão AAA (Ligatures e Kerning)
### 🔴 A Crítica
Usar "Arial" ou "Courier New" em um editor de código destrói a percepção de luxo da ferramenta.
### ⚡ O Plano de Ação
- **Fontes com Ligatures:** O Editor Monaco deve forçar fontes como *Fira Code* ou *JetBrains Mono* com `font-variant-ligatures: contextual` habilitado (para transformar `!==` em um símbolo matemático limpo). A UI geral usará *Inter* com kerning apertado.

## 26. Micro-Animações e Feedback Cinético
### 🔴 A Crítica
Interfaces web que "piscam" ou mudam de estado em 0 milissegundos parecem "secas" e pouco naturais.
### ⚡ O Plano de Ação
- **Spring Animations:** Toda janela modal abrindo, botão sendo clicado ou painel colapsando deve ter uma curva de animação de "Mola" (`spring` física via *Framer Motion* ou CSS avançado). Feedback cinético passa a sensação de software nativo pesado.

## 27. Ícones e Simbologia (Stroke-Consistency)
### 🔴 A Crítica
Se uma tela usa um ícone "Sólido" e outra usa um ícone "Linha" de 2px, a interface parece um Frankenstein.
### ⚡ O Plano de Ação
- **Iconografia Rigorosa:** Adotar um pacote unificado (Ex: *Lucide Icons*). A espessura do traço (`stroke-width`) DEVE ser matematicamente de `1.5px` em absolutamente 100% da plataforma. Cores de ícones devem herdar do `--aethel-text-muted` por padrão.

## 28. O Mini-Map 3D (Scene Compass)
### 🔴 A Crítica
Em mundos de 10km², o desenvolvedor se perde fácil e não sabe para onde a câmera está apontada em relação ao "Norte" (Z+).
### ⚡ O Plano de Ação
- **Widget de Bússola Ativo:** No Viewport 3D, um pequeno widget 3D no canto superior direito renderiza os eixos X, Y e Z. Clicar nas setas move a câmera em arco suave para visões ortográficas topo/lateral.

## 29. Gerenciamento de Janelas Modais (Focus Trap)
### 🔴 A Crítica
Ao abrir uma janela de confirmação ("Deseja deletar?"), o usuário ainda pode clicar no fundo da tela ou acionar atalhos de teclado.
### ⚡ O Plano de Ação
- **Focus Lock & Backdrop Blur:** Toda Modal deve aplicar um filtro pesado de `backdrop-blur-md` escurecendo a IDE. O foco do teclado (`Tab`) DEVE ficar preso dentro da Modal. Pressionar `Esc` deve fechar instantaneamente. Sem popups nativos do navegador (`alert()`).

## 30. Acessibilidade Agressiva (A11y e ARIA)
### 🔴 A Crítica
Se o usuário usa o teclado para navegar, o editor provavelmente quebra porque `<div>` com cliques não possuem `tabIndex`.
### ⚡ O Plano de Ação
- **Keyboard First:** Todos os menus de contexto, árvores de pastas e botões da barra de ferramentas devem suportar `Enter`, `Space`, setas direcionais e devem ter `aria-labels` definidos. Uma IDE de elite é controlável sem o uso do mouse.

---

## 31. O Command Center de Configurações (Settings JSON/GUI)
### 🔴 A Crítica (Padrão VSCode)
Telas de configuração (`Settings`) baseadas apenas em cliques limitam usuários *power-users*. Mas obrigar o uso de arquivos de texto assusta iniciantes.
### ⚡ O Plano de Ação
- **Configurações Híbridas:** Implementar um painel de configurações *Split-View*. O lado esquerdo é uma interface gráfica limpa (GUI) e o lado direito é o arquivo JSON (`settings.json`). Mudar o botão altera o JSON em tempo real e vice-versa, com validação de esquema nativa.

## 32. Gerenciador de Atalhos de Teclado (Keybindings API)
### 🔴 A Crítica
A maioria dos atalhos no React são "Hardcoded" nos componentes (`onKeyDown`). Isso impede que um artista acostumado com o Maya reconfigure as teclas para o seu gosto.
### ⚡ O Plano de Ação
- **Global Shortcut Manager:** Criar uma janela dedicada de *Keybindings* com detecção de conflitos. Uma API centralizada no Zustand onde o usuário pode apertar qualquer combinação de teclas e remapear toda a engine. Os perfis podem ser salvos e exportados (ex: `Maya_Preset`, `Blender_Preset`).

## 33. O Fluxo de Integração (Onboarding & Templates)
### 🔴 A Crítica
Começar um projeto com uma tela vazia causa "Paralisia de Análise" no usuário (Síndrome da Folha em Branco).
### ⚡ O Plano de Ação
- **Project Bootstrapper:** A tela de novo projeto da Aethel deve oferecer *Templates* robustos (FPS, 3D Platformer, Empty 2D, Mobile AR). Ao invés de um mundo vazio, o projeto já abre com um personagem controlável, luzes configuradas e um *Visual Script* básico conectado. O usuário entra já jogando.

## 34. Localização do Editor (i18n Nativo)
### 🔴 A Crítica
Muitas engines são 100% em inglês. Isso limita o acesso a estudantes e desenvolvedores fora do eixo principal, criando uma barreira de entrada oculta.
### ⚡ O Plano de Ação
- **i18n System-Wide:** Utilizar o `next-i18next` não apenas para a página web, mas para todas as barras de ferramentas da IDE Local. Permitir tradução instantânea da interface (Português, Espanhol, Japonês) sem precisar reiniciar o programa.

## 35. Tooltips de Documentação (Inline Help)
### 🔴 A Crítica
Ir para o Google procurar o que faz o nó "Dot Product" no Visual Script quebra o "Flow State" (Estado de Fluxo) do desenvolvedor.
### ⚡ O Plano de Ação
- **Rich Tooltips Interativas:** Quando o usuário pausar o mouse sobre um componente complexo, um pequeno vídeo em `.webm` ou gif deve aparecer no Tooltip demonstrando a função visualmente em 3 segundos, acompanhado de um link "Ver Mais" que abre a documentação *dentro* do painel do editor, sem abrir o navegador web.

---

# ⚠️ FASE 7: A FUNDAÇÃO "AAA" NO FRONTEND

## 🏔️ FRENTE 68: IDE-Grade Primitives (Otimização do Docking)
### 🔴 O Gargalo Atual
A estrutura de Docking/Painéis (estilo Golden Layout) **já foi construída** em `components/ide/modern-shell/` (`ModernIDEShell.tsx`, `chromeBottomDock.tsx`, etc). O gargalo não é criar o sistema de painéis, mas sim o **Render Cycle** do React. Quando o usuário arrasta a aba do Viewport 3D, o React recalcula a árvore do DOM inteira, causando engasgos massivos na Renderização do WebGL e do Viewport.
### ⚡ Plano de Execução
- **React Portal Escape:** Os painéis pesados (Viewport 3D, Visual Scripting, Outliner) devem ser desvinculados do Ciclo de Vida do React durante o redimensionamento. Usar `IntersectionObserver` e `ResizeObserver` puramente em JavaScript baunilha para alterar os tamanhos dos Canvas, sem dar *trigger* em `setState` globais.

## 🏔️ FRENTE 69: O Gargalo do Blueprint (Visual Scripting)
### 🔴 O Gargalo Atual
A Engine já possui um formidável **Sistema de Blueprints e Visual Scripting** construído em `lib/blueprint-system.ts` e `components/visual-scripting/VisualScriptEditor.tsx`. Ele possui *Nodes* padrão, Execução de Eventos, e Variáveis. O gargalo é que o `BlueprintRuntime` avalia a lógica usando um interpretador JavaScript puro (switch-case no `executeNode`). Em um jogo complexo, interpretar nós visuais frame a frame na thread principal do JS vai afogar o FPS a zero.
### ⚡ Plano de Execução
- **WASM JIT Compilation para Blueprints:** O `blueprint-system.ts` não deve "interpretar" a lógica no Runtime. Quando o usuário clica em "Compile" no Editor Visual, a Engine deve transpilá-lo para um Array de Bytes ou direto para **WebAssembly (WASM)**. Assim, a execução visual roda na mesma velocidade do código C++ nativo.

## 36. O Motor de Docas Universal (Windowing System)
### 🔴 A Crítica
Se o usuário quiser puxar o painel do "Chat da IA" para o segundo monitor dele e deixar o Viewport 3D em tela cheia no primeiro monitor, o CSS fixo atual (`Flexbox`/`Grid`) não permite.
### ⚡ O Plano de Ação
- **Tiling & Tearing (Dockview):** Substituir o Grid estático por uma biblioteca profissional de *Docking* (ex: `dockview` ou `golden-layout`). O usuário pode clicar e arrastar a aba do Copiloto, dividindo a tela na vertical, horizontal, ou arrancando-a da IDE para virar uma janela flutuante solta no Windows/Mac. Liberdade absoluta de organização.

## 37. O Copiloto Espacial (Flutuante vs Ancorado)
### 🔴 A Crítica
Manter o Chat da IA sempre esmagado na barra lateral direita polui a tela, mesmo quando você só quer olhar pro 3D.
### ⚡ O Plano de Ação
- **Omni-Chat de Vidro:** O Chat da IA deve ter dois modos. 1. *Sidebar Docked* (Tradicional). 2. *Spotlight Mode*. Ao apertar `Cmd+J`, uma barra de pesquisa translúcida (*Glassmorphism*) surge no centro exato da tela por cima de tudo (como o Alfred/Raycast do Mac). O usuário faz o pedido, a IA executa, e a janela some instantaneamente. Zero poluição visual em tempo de ócio.

## 38. Estado de Foco Contextual (Auto-Zen Mode)
### 🔴 A Crítica
Editar código com 10 abas de ferramentas 3D brilhando em volta rouba a atenção do cérebro (Sobrecarga Cognitiva).
### ⚡ O Plano de Ação
- **Recolhimento Inteligente:** Quando o usuário clica dentro do editor de código (Monaco), os painéis de Propriedades, Assets e a aba do Viewport devem deslizar suavemente para fora da tela ou colapsar em ícones minimalistas. Se ele clica no Viewport 3D, o código some. A interface "respira" e só exibe as ferramentas relevantes à ação do milissegundo atual.

## 39. Hierarquia de Desfoque (Inactivity Dimming)
### 🔴 A Crítica
Saber "qual janela está focada" no Blender ou na Unity muitas vezes exige procurar uma pequena borda laranja fina na tela.
### ⚡ O Plano de Ação
- **Focus Dimming:** Painéis inativos não ficam apenas sem a borda; eles escurecem cerca de 15% e o texto perde contraste de forma orgânica. O painel onde o mouse do usuário está pairando se ilumina suavemente. Isso guia o olho humano diretamente para a área ativa sem uso de cores fortes ou neon agressivo.

## 40. Navegação e Pré-Visualização de Agentes (Ghost Previews)
### 🔴 A Crítica
Quando o Copiloto (Manus/Claude) diz "Estou alterando o script de física", o usuário não tem ideia do que ele está fazendo até ele terminar e quebrar o jogo.
### ⚡ O Plano de Ação
- **Hologramas de Código (Fluidex):** Conforme a IA raciocina e planeja edições, a tela deve exibir *Ghost Previews* (Código sombreado em verde/vermelho translúcido flutuando direto na tela). O usuário não apenas lê no chat "Estou fazendo", ele **vê** as letras sendo apagadas e reescritas como "Hologramas" no editor antes de aprovar. A IA trabalha de forma fluida e visível, passando confiança absoluta.

---

# ⚠️ FASE 5: A INTERFACE "GEMINI LIVE" (VOICE & HOLOGRAPHY)
> A experiência clássica de Chatbox (digitar e esperar) já está morta. Analisando arquivos como `AIChatPanelChrome.tsx` e `MagicWandChat.tsx`, a Aethel ainda segue esse padrão ultrapassado. Nós vamos elevar a IDE para o padrão "Live", onde a IA é um copiloto de voz que trabalha junto com o usuário em tempo real.

## 41. O HUD "Gemini Live" (Microfone e Ondas Sonoras)
### 🔴 A Crítica
O usuário precisa parar de mexer no mouse, clicar numa caixa de texto, digitar um comando e apertar Enter. Isso quebra o "Flow State" do artista 3D.
### ⚡ O Plano de Ação
- **Live Voice HUD:** O componente de chat atual será redesenhado. Ao acionar o atalho global, o painel exibe uma animação fluida de Ondas Sonoras (Voice Visualizer) indicando que o microfone está aberto e a IA está ouvindo. O usuário literalmente conversa com a engine: *"Aumente o brilho do sol e afaste a montanha"*. A engine responde em voz e já executa a ação. Não há caixas de texto ou botões de "Send".

## 42. Non-blocking UI Overlay (Trabalho Cooperativo)
### 🔴 A Crítica
Enquanto o `MagicWandChat` processa um comando longo, a IDE congela ou o botão fica girando, impedindo o usuário de continuar o que estava fazendo.
### ⚡ O Plano de Ação
- **Thread Invisível na Interface:** Quando o modelo multimodal recebe a voz e começa a programar as mudanças em *background*, a IDE não pode mostrar um "Loading" tela cheia. O usuário continua arrastando objetos no Viewport normalmente. Uma pequena notificação pulsante no canto inferior (ex: "🤖 Copilot reescrevendo sistema de física...") indica que a IA está trabalhando como um parceiro invisível.

---

# ⚠️ FASE 6: O POLIMENTO DAS FERRAMENTAS AAA (TOOLING QUALITY)
> Uma engine é medida pelas suas ferramentas de autor. Observando a arquitetura (`components/materials`, `components/timeline`, `components/terrain`), as interfaces ainda parecem "formulários web". Para cruzar a linha final e esmagar a Unreal, o Claude deve polir essas áreas para o Padrão Ouro.

## 43. Asset Browser Nativo (Dynamic Thumbnails)
### 🔴 A Crítica
O explorador de arquivos mostra ícones genéricos de "Arquivo" para malhas 3D (`.fbx`) e materiais. O artista precisa arrastar para a cena para ver como é.
### ⚡ O Plano de Ação
- **Offscreen WebGL Thumbnailer:** Quando o explorador abre, um Worker oculto carrega as malhas e renderiza um *Snapshot* (Thumbnail) em 3D de cada modelo. A UI salva essa imagem no IndexedDB e exibe. O *Asset Browser* deixa de ser um "Google Drive" e vira uma Galeria Profissional onde cada arquivo tem o seu ícone visual exato.

## 44. O Editor de Curvas de Animação (Bezier Graph)
### 🔴 A Crítica
A pasta `components/timeline` provavelmente tem um sequenciador linear (Dope Sheet). Interpolar animações em linha reta (Linear) gera movimentos robóticos.
### ⚡ O Plano de Ação
- **Curve Editor (Canvas API):** Construir um editor de Curvas Bezier em cima de um `<canvas>` 2D. O usuário poderá clicar na linha de transição de um Keyframe e curvar a linha usando *Handles* (Tangentes) para gerar animações fluidas (`Ease-in/Ease-out`), idêntico ao Graph Editor do Blender.

## 45. O Editor de Materiais (PBR Sphere Preview)
### 🔴 A Crítica
Fazer Shaders usando sliders e *inputs* hexadecimais é trabalhar no escuro.
### ⚡ O Plano de Ação
- **Shader Graph com Live Preview:** O editor de material (Visual Script) precisa de uma janela flutuante no canto mostrando uma Esfera renderizada em tempo real (PBR Material Preview). Se o usuário ligar o nó "Metallic", a Esfera ganha reflexo no mesmo frame, sem precisar aplicar no jogo para testar.

## 46. Sculpting Tátil de Terreno (Pointer Events)
### 🔴 A Crítica
Ferramentas de terreno (`components/terrain`) que exigem que o usuário digite "Altura: 50" em um Input Box.
### ⚡ O Plano de Ação
- **Brush API Sensível à Pressão:** Usar a API nativa de `PointerEvents` do navegador para suportar Canetas Stylus/Tablets (Wacom/iPad). O usuário seleciona a ferramenta "Montanha" e pinta direto no Viewport 3D. A força com que ele pressiona o tablet define a altura da montanha na cena via *Raycasting*.

---

# ⚠️ FASE 7: A FUNDAÇÃO ATÔMICA (IDE-GRADE PRIMITIVES)
> Inspecionei a pasta `components/ui/`. A Aethel Engine está sofrendo da "Síndrome de Web App". Componentes como o `Input.tsx` possuem `min-h-[42px]` e `px-4`. Isso é desenhado para o dedo humano num celular, não para um Editor 3D denso. Se não refatorarmos os sub-componentes atômicos, a aba de Propriedades vai exigir *scroll* constante, esgotando a paciência do desenvolvedor.

## 47. Alta Densidade de Dados (Compact Mode)
### 🔴 A Crítica
Formulários web usam muito "respiro" (whitespace) e padding gigante. Numa engine, espaço na tela é dinheiro.
### ⚡ O Plano de Ação
- **Refatoração Atômica:** O Claude deverá reescrever todos os componentes em `components/ui` (`Input`, `Select`, `Button`) para suportar um `variant="ide-compact"`. Isso reduz a altura para `24px`, as margens para `2px` e a fonte para `11px`. Isso dobra a quantidade de propriedades visíveis na tela simultaneamente.

## 48. Scrubbable Number Inputs (O Padrão Blender/Unreal)
### 🔴 A Crítica
Para mudar a posição X de um objeto 3D, o usuário precisa clicar no input numérico, apagar "10", digitar "15" e dar Enter.
### ⚡ O Plano de Ação
- **Pointer Lock Dragging:** Criar um sub-componente `ScrubbableInput.tsx`. O usuário clica em cima do nome ("X") e arrasta o mouse infinitamente para a direita ou esquerda. A engine captura o `MovementX` do mouse (usando a Pointer Lock API nativa) e aumenta o número em tempo real sem o mouse bater na borda da tela.

## 49. Context Menus de Interface Nativa (Right-Click)
### 🔴 A Crítica
O sub-componente `context-menu.tsx` atual pode estar sofrendo cortes de tela (overflow hidden) dependendo de onde o usuário clica com o botão direito.
### ⚡ O Plano de Ação
- **Portals e Absolute Escaping:** Refatorar o Context Menu base para usar `React.createPortal` e anexar as divs do clique direito diretamente na tag `<body>`. Isso impede que menus sejam cortados por contêineres menores e garante um comportamento idêntico a um menu nativo do Windows/Mac.

## 50. O Fim do "Prop-Drilling" Latente (Optimistic UI)
### 🔴 A Crítica
Se o `Slider.tsx` dispara o `onChange` a cada pixel movido, e esse evento sobe por 10 componentes até o Estado Global do React, o FPS do Viewport despenca.
### ⚡ O Plano de Ação
- **Local State Buffer:** Todo input e slider deve possuir um estado local isolado. Ao ser arrastado, ele atualiza apenas a si mesmo (Zero Latência). Apenas no evento `onBlur` ou `onPointerUp` ele dispara a mutação (Mutation) pesada para o banco de dados/ECS, garantindo a performance da ferramenta enquanto está sendo manipulada.

---

## 🗺️ MAPEAMENTO TÁTICO FINAL UX/UI (THE HITLIST PARA O CLAUDE)
> **INSTRUÇÃO PARA O AGENTE EXECUTOR (CLAUDE):** As interfaces desta engine são cirúrgicas. Você está expressamente proibido de inventar componentes ou alucinar caminhos. Abra exatamente os arquivos abaixo e aplique as lógicas descritas.

### 🎯 ALVOS DA FASE 1 & 2 (Limpeza Visual e Virtualização)
- **Frente 4 (Visual Script):** Arquivo: `components/visual-scripting/VisualScriptEditor.tsx`. Remova estilos inline. Use variáveis `--aethel-surface-primary`.
- **Frente 8 (Outliner Virtualizado):** Arquivo: `components/viewport/SceneViewportOutliner.tsx`. Instale `@tanstack/react-virtual` para renderizar as divs da lista de entidades, evitando lag com 10.000 objetos.

### 🎯 ALVOS DA FASE 3 & 4 (DX e Espaço de Trabalho Fluido)
- **Frente 21 e 36 (Windowing / Dockview):** Arquivo: `components/ide/modern-shell/ModernIDEShellPanels.tsx`. Remova o Flexbox fixo. Envolva o `slots.sidebar` e `slots.chat` num provider de Docking para permitir janelas destacáveis.
- **Frente 40 (Ghost Previews Holográficos):** Arquivo: `components/ide/EditorApplyBridgeContext.tsx`. Ao receber o `pendingDiff` da IA, injete *Decorations* nativas no Monaco (`className: 'bg-green-500/20'`) antes de aplicar o código real.

### 🎯 ALVOS DA FASE 5 (O Padrão Ouro: Live, HMR e Performance Bruta)
- **Preview HMR (Zero-Flicker):** Arquivo: `components/preview/RuntimePreviewSurface.tsx`. Bloqueie a desmontagem inteira do React Tree quando o código alterar. Atualize os *Props* via AST injeção para manter a câmera parada onde o usuário deixou.
- **Ancoragem Espacial (Spatial Copilot):** Arquivo: `components/preview/MagicWandChat.tsx`. Adicione a propriedade `draggable={true}`. Quando o usuário soltar a varinha mágica sobre o `ViewportSceneCanvas.tsx`, passe o `UUID` do objeto intersectado para o contexto do prompt da IA.
- **Anti-Lag Automático (Dynamic Resolution):** Arquivo: `components/viewport/AethelViewport3D.tsx`. Capture o evento de arrasto da câmera (OrbitControls `onChange`). Enquanto o usuário estiver arrastando, chame `renderer.setPixelRatio(0.5)`. No evento `onEnd`, volte para `renderer.setPixelRatio(window.devicePixelRatio)`.
- **Timeline de Voz (Gemini Live):** Arquivo: `components/ide/AIChatPanelChrome.tsx`. Oculte a barra de `TextInput`. Implemente um `<canvas>` de *Audio Visualizer* conectado ao WebRTC.

---
> [!CAUTION]
> **ORDEM EXECUTIVA FINAL (Antigravity):**
> A Aethel não aceitará um código "bom o suficiente". Cada *Commit* gerado por você (Claude) nestes arquivos deve mirar na performance bruta do Rust e na fluidez do Figma. Não feche a aba sem testar se o *Dynamic Resolution* cravou em 120FPS. Inicie a execução.
