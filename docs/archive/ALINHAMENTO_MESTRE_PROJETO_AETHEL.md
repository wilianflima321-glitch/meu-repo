# ALINHAMENTO MESTRE: PROJETO AETHEL (Visão Unificada 2026)
**Data:** 13 de Janeiro de 2026
**Status:** Consolidação Definitiva de Auditorias (V1, V2, V3, Supremacia, Proteus)
**Objetivo:** Visualização total do ecossistema, lacunas e roadmap para a "Super IDE".

---

## 1. VISUALIZAÇÃO DO ECOSYSTEMA ATUAL

### ✅ O que JÁ TEMOS (A Base Sólida)
Estes componentes estão implementados, auditados e funcionais. São o alicerce.

| Componente | Status | Detalhe Técnico | Localização |
| :--- | :--- | :--- | :--- |
| **Core Engine 3D** | ✅ Pronto | Three.js + R3F + Rapier3D (Physics) | `cloud-web-app/web/lib/aethel-engine.ts` |
| **Marketplace** | ✅ Pronto | Frontend + Backend + Stripe + Busca | `components/marketplace/*` |
| **Asset Pipeline** | ✅ AAA | Processador LOD + Compressão (Draco/WebP) | `server/src/services/asset-processor.ts` |
| **Audio System** | ✅ AAA | Visualizador Waveform + Sound Cue Editor | `components/audio/SoundCueEditor.tsx` |
| **Virtual Production**| ✅ Oculto | CineLink (Mobile Tracking via Socket) | `server/src/mobile/cine-link-server.ts` |
| **Game Packager** | ✅ Beta | Export Windows/Mac/Linux (Electron/NSIS) | `server/src/services/game-packager.ts` |
| **AI Director** | ✅ Básico | Analisador de Cena e Bridge Ollama | `server/src/ai/ai-director.ts` |
| **Project Templates** | ✅ Básico | Estrutura de scaffolds | `server/src/templates/` |

---

## 2. O QUE FALTA (Gaps Críticos Identificados)
Estes são os "buracos" que impedem o lançamento comercial imediato ou frustrariam o usuário agressivamente.

| Gap | Origem | Gravidade | Solução Planejada |
| :--- | :--- | :--- | :--- |
| **Undo/Redo** | V3 | 🔴 Bloqueador | Implementar Pattern `Command/History` na Store Global. |
| **Multiplayer Logic** | V3 | 🔴 Bloqueador | Integrar `SnapNet` ou `Geckos.io` (Netcode WASM). |
| **UI Editor (Visual)** | Supremacia | 🔴 Bloqueador | Criar "Aethel Interface Designer" (Drag & Drop UI). |
| **i18n (Tradução)** | V3 | 🟠 Alto | Instalar `i18next` e extrair strings hardcoded. |
| **Security Sandbox** | V2 | 🟠 Médio | Mover scripts de usuário para Iframe ou QuickJS isolado. |
| **WebGPU Render** | Supremacia | 🟡 Médio | Migrar de WebGL para WebGPU (Fase 2). |
| **Project Bible Scale**| V3 | 🟡 Médio | Migrar JSON único para Banco Vetorial (ChromaDB). |

---

## 3. O PLANO DE TRANSFORMAÇÃO: "PROTEUS" & "SUPREMACIA"
Aqui definimos como vamos transformar o que temos na "Super IDE" sem limites.

### A. Arquitetura Proteus (O Camaleão)
*O que muda:* O `AethelEngine` atual deixa de ser o "cérebro" e vira apenas um "Cartucho 3D".
*   **Ação:** Refatorar a IDE para carregar engines dinamicamente.
    *   **Cartucho Atual:** Vira o "Aethel 3D Standard".
    *   **Novo Cartucho:** "Aethel 2D" (Pixi.js) para jogos leves.
    *   **Novo Cartucho:** "Aethel UI" (HTML Canvas) para interfaces.

### B. Supremacia AAA (Ousadia Técnica)
*Sugestões sem limites para superar a Unreal:*
1.  **Live Code Lens:** Ao passar o mouse no código `player.hp`, mostrar o valor real do jogo rodando ao lado. Conectar Monaco Editor ao Runtime via WebSocket local.
2.  **AI Dungeon Master:** O `AI Director` deixa de apenas analisar luz e passa a gerar *Quests* e *Diálogos* infinitos enquanto o jogo roda.
3.  **Cloud Build Grid:** O botão "Build" não usa o PC do usuário. Envia o código para um cluster serverless que devolve o `.exe` em 1 minuto.

---

## 4. ROADMAP UNIFICADO: O CAMINHO PARA A LIDERANÇA

### FASE 1: "Quality of Life" (Saneamento Básico) - Mês 1
*Foco: Corrigir os Gaps da V3 para tornar a ferramenta usável profissionalmente.*
1.  [ ] **Implementar Undo/Redo Global** (Prioridade Zero).
2.  [ ] **Expor CineLink e Sound Cue** na Interface (tirar das sombras).
3.  [ ] **Internacionalização (i18n)** básica (PT-BR / EN-US).
4.  [ ] **Starter Kits:** Criar 3 templates funcionais (FPS, Platformer 2D, Racing) para o usuário não começar com tela preta.

### FASE 2: "Proteus Adoption" (Flexibilidade) - Mês 2-3
*Foco: Implementar a Arquitetura de Cartuchos.*
1.  [ ] Abstrair o Viewport da IDE.
2.  [ ] Criar o "Cartucho 2D" (prova de conceito Proteus).
3.  [ ] Implementar o **UI Editor Visual** (UMG Killer) como um "Cartucho de UI".

### FASE 3: "AAA Supremacy" (Poder Bruto) - Mês 4-6
*Foco: Gráficos e Netcode.*
1.  [ ] **WebGPU Renderer:** Portar o sistema de render para WebGPU.
2.  [ ] **Replication System:** Implementar Multiplayer Client-Server.
3.  [ ] **Live Code Lens:** Debugging visual avançado.

---

## 5. SUGESTÕES "SEM LIMITES" (Inovação Radical)

1.  **"Voice-to-World":** Usar o Whisper (OpenAI) local no Electron para permitir construir fases falando: *"Coloque uma floresta densa aqui e faça chover em 30 segundos"*. A AI traduz isso para chamadas de API do Engine.
2.  **"Asset Hallucination":** Se o usuário busca um asset no Marketplace e não encontra, a IA gera o modelo 3D e textura na hora (usando Stable Diffusion 3D / TripoSR) e insere na cena.
3.  **"One-Click Mobile Deploy":** Usar o CineLink Server não só para câmera, mas para **rodar o jogo no celular** instantaneamente via QR Code (Hot Reload via WiFi), sem precisar compilar APK.

---

## VEREDITO FINAL

Temos **80% de uma Engine AAA** construída.
Os 20% que faltam não são "Gráficos", são **Ferramentas de UX** (Undo, UI Editor, Netcode).

Se focarmos na **Fase 1 (Saneamento)** e **Fase 2 (Proteus)**, teremos uma ferramenta superior ao VS Code para gamedev e mais acessível que a Unreal em 3 meses.
