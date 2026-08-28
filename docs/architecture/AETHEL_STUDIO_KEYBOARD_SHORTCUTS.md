# Aethel Engine — Studio Keyboard Shortcuts & Command Reference

**Version:** 1.0 (GA Quality — Unreal Engine & Adobe Creative Parity)  
**Authority:** Aethel Studio Supremacy Index § Ergonomics & Direct Viewport Editing

---

## 1. Visão Geral dos Atalhos Globais da Viewport

Todos os atalhos abaixo podem ser acionados diretamente na Viewport 3D ou consultados a qualquer momento pressionando **`?`** ou **`F1`**.

| Atalho | Ação / Ferramenta | Descrição Técnica |
|---|---|---|
| **`Ctrl + Space`** | **Toggle Content Drawer** | Desliza a gaveta de assets no rodapé sem perder a visualização 3D. |
| **`Alt + P`** | **Play in Editor (PIE)** | Inicia a simulação da física (60Hz), ticks de jogabilidade e esconde gizmos. |
| **`Esc`** | **Exit Simulation** | Interrompe o Play-in-Editor ou fecha o modal de ajuda de atalhos. |
| **`G`** | **Game View Toggle** | Oculta 100% dos gizmos e menus para inspeção limpa e cinematográfica da cena. |
| **`F`** | **Frame Selected Asset** | Foca e centraliza a câmera suavemente no ator ou malha selecionada. |
| **`Ctrl + D`** | **Duplicate Actor** | Duplica o objeto selecionado com offset espacial de +2 metros. |
| **`Ctrl + Shift + P`** | **Toggle Stat FPS Profiler** | Exibe pílula de telemetria com FPS (60.0), Frametime (16.6ms) e uso de VRAM. |
| **`?` / `F1`** | **Shortcuts Cheat Sheet** | Abre o modal flutuante de referência rápida de atalhos. |

---

## 2. Ferramentas de Transformação (Gizmos)

| Tecla | Modo | Descrição |
|---|---|---|
| **`Q`** | **Select Mode** | Modo de seleção padrão sem gizmo ativo. |
| **`W`** | **Translate Gizmo** | Ativa o gizmo de translação nos eixos $X$ (vermelho), $Y$ (verde) e $Z$ (azul). |
| **`E`** | **Rotate Gizmo** | Ativa o anel de rotação angular com snapping de $15°, 45°, 90°$. |
| **`R`** | **Scale Gizmo** | Ativa os controles de escala proporcional e não-proporcional. |
| **`Grid Button`** | **Wireframe Overlay** | Alterna a visualização da malha poligonal para inspeção de topologia. |

---

## 3. Marcadores de Câmera 3D (Camera Bookmarks)

| Atalho | Função |
|---|---|
| **`Ctrl + 1` até `Ctrl + 9`** | Salva a posição, altitude e orientação angular atual da câmera no slot 1..9. |
| **`1` até `9`** | Teleporta a câmera de volta para o enquadramento salvo instantaneamente. |

---

## 4. Passes de Renderização (Render View Modes)

Localizados no seletor suspenso no topo da Viewport:

1. **`Lit (PBR Realtime 60Hz)`** — Renderização física completa com luz solar, atmosfera e sombras.
2. **`Unlit (Albedo Only)`** — Exibe apenas as cores difusas das texturas, sem luz ou sombras.
3. **`Wireframe Topology`** — Visualização pura da malha geométrica.
4. **`Nanite Clusters`** — Visualização dos agrupamentos de micro-polígonos gerados na GPU.
5. **`Lumen Radiance Probes`** — Mapa de probes de iluminação global e rebatimento de luz.
6. **`Chaos Collision Bounds`** — Visualização dos volumes de colisão física (*Block, Overlap, Ignore*).
