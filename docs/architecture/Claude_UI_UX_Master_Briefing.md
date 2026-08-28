# Aethel Engine — Bíblia Master de Engenharia de UI/UX (Padrão AAA)

**Versão do Documento:** 4.0 (Execução Rigorosa dos 7 Pilares de Interface Restantes)  
**Autoridade:** Gemini 2M Context Architecture & Engine Core  
**Diretriz Primária:** Proibição irrestrita de protótipos, MVPs, placeholders, simplificações visuais e simulações. Cada componente deve ser especificado e construído no nível máximo da indústria (concorrendo e superando Unreal Engine 5.5, Adobe CC, DaVinci Resolve Studio, Steam, Blender 4.2 e Cursor Pro).

---

## 1. Fundamentos Visuais e Regras Invioláveis do Design System

### A. Paleta de Cores e Tokens CSS (Proibição Absoluta de Hexadecimal Puro)
Todo o CSS deve consumir exclusivamente as variáveis `--aethel-*` definidas em `globals.css`:
*   **Superfícies de Fundo (Obsidian Dark Hierarchy):**
    *   `--aethel-surface-primary` (`#0a0a0f`): Fundo principal do editor e da página.
    *   `--aethel-surface-secondary` (`#101622`): Fundo de painéis, barras laterais e docks inferiores.
    *   `--aethel-surface-tertiary` (`#171f2d`): Fundo de cards, inputs e botões secundários.
    *   `--aethel-surface-quaternary` (`#202a3a`): Popovers, menus de contexto flutuantes e modais.
*   **Bordas e Linhas de Separação:**
    *   `--aethel-border-subtle` (`rgba(255, 255, 255, 0.10)`): Bordas padrão de containers estruturais.
    *   `--aethel-border-secondary` (`rgba(148, 163, 184, 0.12)`): Bordas de hover e foco de teclado.
    *   `--aethel-border-primary` (`rgba(148, 163, 184, 0.18)`): Destaque de seleção ativa e foco em inputs.
*   **Acentos e Destaques Semânticos:**
    *   `--aethel-primary` (`#3b82f6` / Electric Indigo): Ações primárias, seleção e estado ativo.
    *   `--aethel-neon-cyan` (`#22d3ee`): Execução de lógica, shaders WGSL e alta performance.
    *   `--aethel-warning` (`#f59e0b`): Alertas de custo de IA, travas de segurança e botões de reset.
    *   `--aethel-success` (`#22c55e`): Status operacional saudável, compilação verde e itens instalados.
    *   `--aethel-error` (`#ef4444`): Falhas de compilação, clipping de áudio e conflitos de nó.
*   **Tipografia:**
    *   Interface Geral: `font-sans` com `tracking-[-0.01em]`.
    *   Código, Coordenadas e Telemetria: `font-mono` com `tabular-nums`.

### B. Ícones e Grafismos
*   **100% Lucide Icons tipados** (`lucide-react`).
*   **Tamanhos Canônicos:**
    *   Micro-botões e chips: `h-3.5 w-3.5` (stroke width 1.75).
    *   Barras de ferramentas e guias: `h-4 w-4` (stroke width 1.75).
    *   Cabeçalhos e destaques de seção: `h-5 w-5` (stroke width 2.0).
*   **PROIBIDO:** Emojis ou ícones não tipados em qualquer elemento de interface.

---

## 2. Área 1: Página Completa do Jogo no Arcade (`app/arcade/[slug]/page.tsx`) — Padrão Steam & Epic Games

O backend de catálogo de jogos, taxonomia (I.5/I.6) e verificação de honestidade F.2 já estão prontos. A experiência da página de detalhe deve atingir paridade total com o Steam:

### Especificações Técnicas e Ergonômicas:
1. **Galeria de Mídia Estilo Steam (`ArcadeMediaGallery`):**
   * Visualizador principal widescreen 16:9 com alternância fluida entre trailer em vídeo (WebM/H.264) e capturas de tela em 4K.
   * Carrossel inferior de miniaturas clicáveis com borda ativa em `var(--aethel-primary)` e suporte a navegação por teclado (`ArrowLeft`, `ArrowRight`).
   * Modo de visualização em tela cheia com backdrop escuro e botão de fechar acessível via `Escape`.
2. **Painel Fixo de Compra e Lançamento (Right-Side Sticky Card):**
   * Card com efeito glassmorphic (`var(--aethel-glass-bg)` + `backdrop-blur-md`) fixado na lateral direita.
   * Botão principal de *"Jogar Agora"* (Instant Play no navegador via WebGL2/WebAssembly) ou *"Baixar para Desktop"* para jogos exclusivos de alta fidelidade (Law XV).
   * Matriz de Requisitos de Hardware em tempo real: compara a GPU/CPU do usuário (Capability Score) com os requisitos mínimos e recomendados do jogo.
   * Metadados honestos: Desenvolvedor, Distribuidor, Data de Lançamento, Tags de Gênero e Classificação Etária.
3. **Linha do Tempo de Changelog e Atualizações (`ArcadeChangelogTimeline`):**
   * Linha do tempo vertical com marcadores de versão (`v1.2.0`, `v1.1.0`), data de publicação, resumo de novidades e lista de correções categorizadas (*Features*, *Performance*, *Bug Fixes*).
4. **Painel de Avaliações com Horas Jogadas Reais (`ArcadeReviewsPanel`):**
   * Exibição das análises dos usuários com tempo real registrado na telemetria F.2 no momento da postagem (*ex: "42.5 horas registradas"*).
   * Filtros por análises *Positivas* / *Negativas* / *Mais Recentes*, badge de *Compra Verificada* e botão de útil/não útil com contador.

---

## 3. Área 2: Card do Marketplace de Assets & Extensões (`app/marketplace/MarketplaceCard.tsx`) — Padrão Unreal Fab

### Especificações Técnicas e Ergonômicas:
1. **Design e Elevação Visual:**
   * Cantos arredondados modernos `rounded-2xl`, borda sutil `border-[var(--aethel-border-subtle)]` e fundo com profundidade `bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)]`.
   * Efeito de elevação ao passar o mouse (`hover:-translate-y-1 hover:shadow-[var(--aethel-shadow-xl)] hover:border-[var(--aethel-border-secondary)]`) com física de transição de 200ms.
2. **Badges de Verificação e Risco:**
   * Selo de verificação de segurança com gradiente e pulso suave (`CheckCircle2` com `text-[var(--aethel-success-light)]` e borda verde sutil).
   * Indicador de nível de risco e análise de permissões de manifesto (Law XI / Law XVI).
3. **Especificações Técnicas de Assets 3D:**
   * Chips com contagem de polígonos/vértices (*ex: 14.8k tris*), mapas PBR inclusos (*Albedo, Normal, Roughness, AO*), e formatos disponíveis (*USD, glTF, FBX*).
4. **Ações de Instalação e Desinstalação:**
   * Botão de *"Instalar"* com estado de carregamento e feedback visual instantâneo ou botão de *"Desinstalar"* com confirmação de segurança.

---

## 4. Área 3: Editor de Terrenos & Escultura 3D (`TerrainSculptingEditor.tsx` & `.parts.tsx`) — Padrão UE5 Landscape

### Especificações Técnicas e Ergonômicas:
1. **Seletor Completo de Modos de Pincel:**
   * Barra de ferramentas com modos dedicados:
     * **Raise (Elevar):** Aumenta a elevação do terreno ao longo da normal.
     * **Lower (Rebaixar):** Diminui a altura com base na força do pincel.
     * **Smooth (Suavizar):** Aplica filtro gaussiano local para eliminar degraus.
     * **Flatten (Aplanar):** Nivela o terreno na altura do clique inicial.
     * **Noise (Ruído Procedural):** Adiciona relevo estocástico e acidentes geográficos.
     * **Erosion (Erosão Hídrica):** Simula canais de chuva e sedimentação natural.
     * **Ramp (Rampa):** Conecta dois pontos com uma inclinação linear contínua.
2. **Curvas de Decaimento (Falloff Buttons):**
   * Seletor visual por botões de ícone: *Linear*, *Smooth*, *Sphere*, *Tip*, *Constant (Flat)*.
3. **Controles Numéricos com Scrubbing:**
   * Raio do pincel (em metros), Força (0 a 100%), Rotação (0° a 360°) e Jitter de dispersão.
4. **Gerenciamento de Camadas de Bioma (Layers Panel):**
   * Lista de camadas PBR (Grama, Rocha, Neve, Areia) com controle de peso de pintura por vértice.

---

## 5. Área 4: Blueprints de Animação & Blend Space 2D (`AnimationBlueprintEditor.tsx`) — Padrão UE5 Persona

### Especificações Técnicas e Ergonômicas:
1. **Grade Interativa de Blend Space 2D (`BlendSpace2DGrid`):**
   * Grade cartesiana com eixos configuráveis (Eixo X: *Direção [-180° a +180°]*, Eixo Y: *Velocidade [0 a 600 cm/s]*).
   * Amostras de animação posicionadas na grade como nós circulares interativos (*Idle no centro, Walk/Run nos extremos*).
   * Cursor de pré-visualização interativo: ao arrastar na grade, exibe o peso de mesclagem em tempo real e calcula a triangulação de Delaunay para interpolação contínua de poses.
2. **Visualizador e Árvore de Retargeting IK (`SkeletonHierarchyTree`):**
   * Árvore hierárquica completa de ossos (*Root → Pelvis → Spine → Clavicle/Thigh → Hand/Foot*).
   * Seleção de cadeia IK com controles de trava de articulação, peso de restrição (*Constraint Weight*) e mapeamento de retargeting de esqueletos externos.
3. **Máquina de Estados e Editor de Transições:**
   * Grafo nodal conectando estados com crossfades em milissegundos e condições booleanas/numéricas configuráveis.

---

## 6. Área 5: Editor de Shaders & Materiais PBR (`MaterialEditor.tsx` & `.runtime.tsx`) — Padrão UE5 Material Graph

### Especificações Técnicas e Ergonômicas:
1. **Nó Master PBR Canônico:**
   * Entradas estritas de alta precisão:
     * `Base Color` (RGB / Texture2D)
     * `Metallic` (Scalar 0..1)
     * `Roughness` (Scalar 0..1)
     * `Specular` (Scalar 0..1)
     * `Normal` (Vector3 / Normal Map com intensidade)
     * `Emissive Color` (RGB com multiplicador de intensidade HDR)
     * `Ambient Occlusion` (Scalar 0..1)
     * `Opacity / Opacity Mask` (Scalar 0..1)
     * `World Position Offset` (Vector3 para deformação de vértices)
2. **Badge de Compilação de Shaders WGSL / GLSL:**
   * Indicador no topo do painel de preview exibindo status da compilação (*WGSL Compiled: 0 warnings, 60 FPS*), contagem de instruções de GPU e tempo de compilação em milissegundos.
3. **Mini-Viewport de Preview 3D com Modos de Geometria:**
   * Alternância entre Esfera, Cubo, Cilindro e Teapot com rotação HDRI em tempo real e visualização de canais separados (*Lit, Unlit, Normal Buffer, Roughness Buffer*).

---

## 7. Área 6: Color Grading & ACES 1.3 HDR Wheels (`ColorGradingWheels.tsx`) — Padrão DaVinci Resolve Studio

### Especificações Técnicas e Ergonômicas:
1. **Rodas de Cores de 3 Vias (Lift, Gamma, Gain, Offset):**
   * Discos vetoriais interativos com indicador de coordenadas sub-pixel, vetor de saturação e anel mestre de luminância na base de cada roda.
   * Controle de precisão com redefinição rápida por duplo-clique.
2. **Ajustes Primários Numéricos:**
   * **Temperatura de Cor (Kelvin):** 2000K (quente/tungstênio) a 12000K (frio/céu azul).
   * **Tint (Matiz Verde/Magenta):** -100 a +100.
   * **Contraste & Pivot:** Curva S de alto alcance dinâmico ACES AP1.
   * **Saturação Master:** 0% (Monocromático) a 200% (Vibrante).
3. **Visualizador de Forma de Onda / Parade Scope RGB:**
   * Renderização gráfica dos canais Vermelho, Verde e Azul garantindo que não haja clipping nos brancos (>100 IRE) ou pretos esmagados (<0 IRE).

---

## 8. Área 7: Design System & Tokens Globais (`globals.css`)

### Especificações Técnicas:
1. **Integridade de Tokens:**
   * Verificação completa para garantir que todas as variáveis `--aethel-*` existam para superfícies, bordas, textos, acentos semânticos, sombras e efeitos de glassmorphism.
   * Eliminação de qualquer dependência de cores arbitrárias fora da escala Obsidian Dark.
2. **Suporte a Acessibilidade WCAG 2.2 AA:**
   * Contraste mínimo de 4.5:1 em todos os textos secundários e terciários em relação às superfícies.
   * Anéis de foco de teclado consistentes (`--aethel-focus-ring`).

---

## 9. Checklist de Entrega e Quality Gates Obrigatórios

```bash
# 1. Checagem de tipagem TypeScript (deve retornar 0 erros)
npm run typecheck

# 2. Varredura de cores hexadecimais (deve retornar 0 violações)
npm run qa:no-hex-in-components

# 3. Gate de integridade de interface e tokens
npm run qa:interface-gate
```
