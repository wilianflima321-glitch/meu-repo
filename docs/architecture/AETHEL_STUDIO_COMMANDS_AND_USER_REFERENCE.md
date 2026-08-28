# Aethel Engine — Central de Comandos, Atalhos, CLI & Manual de Referência Completo

**Versão:** 1.0 GA (Padrão de Mercado Unreal Engine 5.4 / Adobe Creative Cloud)  
**Autoridade:** Aethel Studio Supremacy Index § Ergonomics, Direct Viewport Editing & Engine CLI  
**Compliance:** 16 Leis de Supremacia (Zero-MVP, Zero-Alloc Hot Loops, Pure Web Audio MetaSounds, Law XV Hardware Scalability)

---

## 1. Tabela Mestra de Atalhos Globais da Viewport

Todos os atalhos abaixo podem ser acionados diretamente na Viewport 3D ou consultados a qualquer momento pressionando **`?`** ou **`F1`**.

| Atalho | Ação / Ferramenta | Categoria | Descrição Técnica & Efeito no Motor |
|---|---|---|---|
| **`Ctrl + Space`** | **Toggle Content Drawer** | Assets | Desliza a gaveta de assets no rodapé sem perder a visualização 3D. |
| **`Alt + P`** | **Play in Editor (PIE)** | Simulação | Inicia a simulação da física (60Hz), ticks de jogabilidade e esconde gizmos. |
| **`Esc`** | **Exit Simulation / Close Modal** | Simulação | Interrompe o Play-in-Editor ou fecha o modal de ajuda de atalhos. |
| **`G`** | **Game View Toggle** | Visualização | Oculta 100% dos gizmos e menus para inspeção limpa e cinematográfica da cena. |
| **`F`** | **Frame Selected Asset** | Câmera | Foca e centraliza a câmera suavemente no ator ou malha selecionada. |
| **`Ctrl + D`** | **Duplicate Actor** | Edição | Duplica o objeto selecionado com offset espacial de $+2$ metros $(X+2, Z+2)$. |
| **`Del / Backspace`** | **Delete Actor** | Edição | Remove o ator selecionado da hierarquia da cena ativa. |
| **`Ctrl + S`** | **Save Scene / Yjs Commit** | Arquivo | Persiste atomicamente as alterações de cena no ledger colaborativo. |
| **`Ctrl + Z`** | **Undo Transaction** | Histórico | Desfaz atomicamente a última transação de edição (Lei XVI). |
| **`Ctrl + Y`** | **Redo Transaction** | Histórico | Refaz a última transação desfeita. |
| **`Ctrl + Shift + P`** | **Toggle Stat FPS Profiler** | Profiler | Exibe pílula de telemetria com FPS (60.0), Frametime (16.6ms) e uso de VRAM. |
| **`?` / `F1`** | **Central de Comandos & Manual** | Ajuda | Abre o modal flutuante de referência rápida com 4 abas e busca dinâmica. |

---

## 2. Navegação de Câmera & Mouse na Viewport 3D

| Ação de Mouse & Teclado | Modo de Voo | Descrição |
|---|---|---|
| **`RMB + WASD`** | **Fly Cam (Voo Livre)** | Movimenta a câmera pelo espaço 3D com orientação pelo mouse. |
| **`RMB + Q / E`** | **Descend / Ascend** | Elevação vertical descendente ($Q$) ou ascendente ($E$) da câmera. |
| **`RMB + Mouse Wheel`** | **Camera Speed** | Ajusta a velocidade de cruzeiro do voo da câmera em tempo real. |
| **`Alt + LMB Drag`** | **Tumble / Orbit** | Orbita a câmera ao redor do ponto pivô do ator selecionado. |
| **`Alt + RMB Drag`** | **Dolly Zoom** | Aproxima ou afasta a câmera continuamente do foco. |
| **`Alt + MMB Drag`** | **Pan Camera** | Desloca a câmera no plano de visualização da tela. |
| **`Ctrl + L + Drag`** | **Interactive Sun Scrub** | Ajusta visualmente a direção e elevação solar diretamente na cena. |

---

## 3. Ferramentas de Transformação (Gizmos) & Snapping

| Tecla | Modo | Descrição |
|---|---|---|
| **`Q`** | **Select Mode** | Modo de seleção padrão sem gizmo ativo. |
| **`W`** | **Translate Gizmo** | Ativa o gizmo de translação nos eixos $X$ (vermelho), $Y$ (verde) e $Z$ (azul). |
| **`E`** | **Rotate Gizmo** | Ativa o anel de rotação angular com snapping de $15°, 45°, 90°$. |
| **`R`** | **Scale Gizmo** | Ativa os controles de escala proporcional e não-proporcional. |
| **`Grid Button`** | **Wireframe Overlay** | Alterna a visualização da malha poligonal para inspeção de topologia. |
| **`[` / `]`** | **Grid Snap Step** | Diminui ($[$) ou aumenta ($]$) o passo de encaixe na grade ($10, 50, 100, 500$ cm). |

---

## 4. Marcadores de Câmera 3D (Camera Bookmarks)

| Atalho | Função |
|---|---|
| **`Ctrl + 1` até `Ctrl + 9`** | Salva a posição, altitude e orientação angular atual da câmera no slot 1..9. |
| **`1` até `9`** | Teleporta a câmera de volta para o enquadramento salvo instantaneamente. |

---

## 5. Passes de Renderização (Render View Modes)

Localizados no seletor suspenso no topo da Viewport:

1. **`Lit (PBR Realtime 60Hz)`** — Renderização física completa com luz solar, atmosfera e sombras.
2. **`Unlit (Albedo Only)`** — Exibe apenas as cores difusas das texturas, sem luz ou sombras.
3. **`Wireframe Topology`** — Visualização pura da malha geométrica.
4. **`Nanite Clusters`** — Visualização dos agrupamentos de micro-polígonos gerados na GPU.
5. **`Lumen Radiance Probes`** — Mapa de probes de iluminação global e rebatimento de luz.
6. **`Chaos Collision Bounds`** — Visualização dos volumes de colisão física (*Block, Overlap, Ignore*).

---

## 6. CLI do Motor & Comandos de Console (`~` ou Terminal)

| Comando CLI | Categoria | Descrição Técnica & Parâmetros |
|---|---|---|
| `stat fps` | Profiler | Ativa o contador de FPS, frametime milissegundos e VRAM em tempo real. |
| `stat unit` | Profiler | Decompõe o tempo de quadro entre CPU Game Tick, CPU Render e GPU Draw Calls. |
| `stat gpu` | Profiler | Exibe o tempo de execução por passe (GBuffer, ShadowMap, Radiance, PostProcess). |
| `stat memory` | Profiler | Monitora alocação de memória RAM do processo e VRAM de texturas/malhas. |
| `r.Nanite.Clusters 1/0` | Rendering | Ativa/desativa a visualização de micro-polígonos gerados diretamente na GPU. |
| `r.Lumen.Radiance 1/0` | Lighting | Ativa probes de iluminação global e rebatimento dinâmico em tempo real. |
| `r.Lumen.Reflections 1/0` | Lighting | Calcula reflexos dinâmicos baseados em traçado de raio PBR em tempo real. |
| `r.ShadowQuality 1..4` | Rendering | Ajusta a resolução e filtragem dos mapas de sombra virtual (1 a 4). |
| `r.VolumetricFog 1/0` | Atmosphere | Ativa neblina volumétrica raymarched e dispersão de raios solares (God Rays). |
| `r.PostProcessing.ACES 1/0` | Color | Aplica a curva de mapeamento de tom cinematográfico de referência ACES 1.3. |
| `r.ScreenPercentage 50..200` | Rendering | Ajusta a escala de resolução interna do renderizador (FSR / Super Resolução). |
| `r.SetViewMode <mode>` | Rendering | Muda o passe de renderização ativo (`lit`, `unlit`, `wireframe`, `nanite`, `collision`). |
| `p.Chaos.Debug 1/0` | Physics | Desenha os volumes de colisão física e juntas XPBD Euphoria no viewport. |
| `p.Ragdoll.ActiveMuscle 1/0` | Physics | Ativa atuadores de músculo e equilíbrio dinâmico para Active Ragdolls (Lei III). |
| `p.Gravity <value>` | Physics | Configura a aceleração gravitacional no eixo vertical do mundo (padrão: -9.81 m/s²). |
| `p.Cloth.Simulate 1/0` | Physics | Executa a simulação física de tecidos e malhas flexíveis baseadas em XPBD. |
| `physics.reset` | Physics | Reinicia todos os corpos rígidos, forças e ragdolls para as posições iniciais. |
| `a.SpatialAudio.Debug 1/0` | Audio | Renderiza raios de oclusão acústica e emissores 3D HRTF no espaço. |
| `a.MasterVolume 0.0..1.0` | Audio | Define o ganho mestre de saída do barramento de áudio (0.0 a 1.0). |
| `a.MetaSounds.Recompile` | Audio | Força a recompilação a quente do grafo de nós de síntese sonora. |
| `gas.DebugTags 1/0` | Gameplay | Exibe na tela as tags e estados de jogabilidade (Stunned, Buffs, Debuffs). |
| `ai.BehaviorTree.Debug 1/0` | AI | Ativa a visualização da árvore de decisão de IA e chaves do Blackboard. |
| `game.TimeDilation 0.1..2.0`| Simulation | Altera a escala de tempo da simulação (0.1 para Slow-Mo, 1.0 normal). |
| `wp.GridBounds 1/0` | World | Exibe os limites das células de streaming espacial do mundo aberto. |
| `telemetry.flush` | LiveOps | Envia imediatamente os logs e métricas locais para o pipeline de análise. |

---

## 7. Requisitos de Sistema & Escala de Hardware (Lei XV)

A Aethel Engine possui detecção automática de hardware e adaptação dinâmica com base no **Capability Score (0 a 100)**:

| Nível de Hardware | Configuração Mínima / Recomendada | Capability Score | Recursos Ativos |
|---|---|---|---|
| **Tier 1 — Web / Low-End** | GPU Integrada (Intel Iris / AMD Vega), 4GB RAM, WebGL2 / WebGPU básico | **30 a 55** | Forward Rendering, FSR Upscaling 67%, Sombras Dinâmicas Simples, Áudio HRTF Estéreo. |
| **Tier 2 — Mainstream Desktop** | GPU Dedicada 4GB+ (GTX 1660 / RTX 3050), 8GB RAM, Vulkan / Metal | **56 a 79** | Clustered Shading, Virtual Shadow Maps (VSM), Volumetric Clouds, Active Ragdoll Euphoria. |
| **Tier 3 — High-End & Studio** | GPU Dedicada 8GB+ VRAM (RTX 3070 / RTX 4080 / RX 7800+), 16GB+ RAM, NVMe | **80 a 100** | Micro-Poly Nanite GPU Culling, Lumen Radiance Probes, Raymarched Volumetric Fog, ACES 1.3 4K HDR. |
