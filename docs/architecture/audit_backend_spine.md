# Auditoria Arquitetural de Backend: V33 (Native, ECS, Cloud)

Este documento dita as frentes de trabalho para o Backend em Rust, TypeScript, e a camada nativa (Tauri).

---

## 🏔️ FRENTE 1: Inline Composer (Padrão Cursor 3.x)
### Onde executar (validado)
- **Arquivo principal:** `cloud-web-app/web/components/editor/MonacoEditorPro.tsx`
- **Actions registry:** `cloud-web-app/web/components/editor/MonacoEditorPro.actions.ts`
- **NÃO CRIAR** `MonacoEditorPro.runtime.tsx` — esse arquivo não existe e os actions já têm o lugar canônico.
### Plano refinado
1. Em `MonacoEditorPro.actions.ts`, adicionar action `'aethel.inline-composer'` com binding `monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK`.
2. Criar `components/editor/InlineComposerWidget.tsx` (ContentWidget do Monaco).
3. A action triggera o widget na linha do cursor.
4. Widget chama API existente `lib/ai/inline-completion.ts`.
### Critério de aceite (mensurável)
- [ ] Ctrl+K dentro do Monaco abre widget visualmente.
- [ ] Tempo entre keypress e widget visível < 100ms.

## 🏔️ FRENTE 2: Rust VFS (RocksDB/Sled)
- **Objetivo:** Adicionar `rocksdb = "0.21"` ou `sled = "0.34"` no Cargo.toml e escrever o módulo de VFS no Tauri que se comunica com o Rust para armazenar assets como binários sem usar o Prisma (Prisma = apenas nuvem).

## 🏔️ FRENTE 3: God-File WebSocket
- **Objetivo:** Quebrar o arquivo `lib/server/websocket-server.ts` (1.443 LoC) em módulos menores de sincronização em tempo real.

## 🏔️ FRENTE 6: Visual Script Compiler
- **O Gargalo:** `lib/visual-script/runtime.ts` e `components/visual-scripting/VisualScriptEditor.tsx`.
- **A Solução:** Em vez de interpretar os nós visuais no JavaScript, transpilar a árvore lógica em WASM para execução atômica em Runtime.

## 🏔️ FRENTE 7: Tauri Window Configuration
### Como aplicar (validado contra tauri.conf.json real)
O arquivo NÃO tem a chave `decorations` definida. **Adicione** (não edite):
```json
{
  "app": {
    "windows": [
      {
        "title": "Aethel Studio Local",
        "decorations": false,
        "transparent": true,
        "fullscreen": false,
        "resizable": true,
        "width": 1400,
        "height": 900
      }
    ]
  }
}
```

## 🏔️ FRENTE 8: Workspace Manager
- **Objetivo:** Otimizar `lib/workspace/workspace-manager.ts` para carregar diretórios virtuais sem bloquear a main thread.

## 🏔️ FRENTE 9: Rapier Physics WASM Worker
- **Objetivo:** `workers/physics-worker.ts` será mantido como o motor oficial web. Em modo Desktop (Tauri), utilizar sidecar Nativo Rapier, mas somente após wgpu funcionar (Frente B51). Esta tarefa deve seguir a **Frente N5 (Resolver dualidade)** em CLAUDE.md.

## 🏔️ FRENTE 14: Git2 Nativo no Tauri
- **Pré-requisito:** Instruir Cargo para adicionar `git2 = "0.18"`. Nenhuma ligação Git2 deve ser feita antes de colocar a dependência.

## 🏔️ FRENTE 41: Agent Ledger — Provas de Confiança (Evidence-Based AI)
### 🔴 O Gargalo Atual
O sistema já tem espinha de ledger em `lib/production/`:
- `task-evidence-ledger.ts` (168 LoC)
- `agent-read-receipts.ts` (415 LoC)
- `agentic-production-state.ts` (532 LoC)
- `agent-tool-bus.ts` (420 LoC)
O que falta é o **pipeline visual de evidências 3D**.
### ⚡ Plano de Execução
1. Em `lib/production/task-evidence-ledger.ts`, adicionar método `attachVisualEvidence(taskId, mediaUrl, frameCount)`.
2. Criar `lib/production/visual-evidence-generator.ts` que: Dispara render headless via Three.js OffscreenCanvas (60 frames). Gera `.webm`/`.gif`.
3. Na UI: `components/agents/AgentEvidencePanel.tsx` mostra o gif before/after.

## 🏔️ FRENTE 44: Contexto de Agente Escalonável (Tree-Sitter RAG)
### 🔴 O Gargalo Atual
O arquivo `lib/ai/deep-context-manager.ts` existe mas tem apenas 78 LoC — é praticamente um stub. Não há montagem cirúrgica de contexto AST hoje.
### ⚡ Plano de Execução
1. Expandir `lib/ai/deep-context-manager.ts` para 600+ LoC.
2. Adicionar deps: `npm install web-tree-sitter @tree-sitter-grammars/tree-sitter-typescript`
3. Implementar 3 métodos: `buildProjectSkeleton()`, `slicePrompt(symbol, depth)`, `compactImports()`.
4. Integrar com `lib/ai/tools-registry.ts` (574 LoC).

---

## 🏔️ FRENTE B51: Overlay Nativo WGPU
- **Aviso:** Aplicar apenas para Desktop (Tauri). Não abandonar R3F no Web.
- **Plano:** Construir um sidecar wgpu no Rust para renderização em janela local transparente acima do HTML.

## 🏔️ FRENTE B52: DOTS Rust
- **Objetivo:** Adotar Data-Oriented Design (DoD) estrito no ECS. Sincronizar buffers `Float32Array` contíguos com o Rust nativo.

## 🏔️ FRENTE B54: Motor de Física TypeScript Delegado
- **Aviso:** O motor `lib/engine/physics-engine.ts` existe e é TS puro, mas temos também `lib/physics-engine-real.ts` que usa Rapier3D. Seguir resolução da Frente N5.

## 🏔️ FRENTE B55: O Esqueleto de Renderização AAA (WebGPU/Deferred)
### 🔴 O Gargalo Atual
O sistema de importação de assets é espetacular e já otimiza malhas e gera thumbnails perfeitamente. Porém, o pipeline `lib/aaa-render-system.ts` (1051 LoC) é baseado em Three.js.
### ⚡ Plano de Execução
O Claude NÃO deve preencher TODOs imaginários em `aaa-render-system.ts`. Ele é um sistema Three.js funcional. O salto de WebGPU/Deferred será construído no lado Desktop/Rust primeiro (wgpu nativo).

## 🏔️ FRENTE U56: GPU Compute para Partículas (Niagara)
### 🔴 O Gargalo Atual
O editor visual de partículas (Niagara) usa TypeScript no Loop para física.
### ⚡ Plano de Execução
- **WebGPU Compute Shaders:** O grafo visual do Niagara deve compilar seu resultado diretamente em um `Compute Shader`. As partículas não tocam a memória TS.

## 🏔️ FRENTE U57: A Ponte OOP ↔ DOTS (Scene Graph Sync)
### 🔴 O Gargalo Atual
A Engine possui hierarquia OOP clássica e motor ECS. 
### ⚡ Plano de Execução
- **Baking Direto (Sub-Scene Sync):** Congelar o Scene Graph do Editor (quando der Play) e fazer o "Bake" para matrizes brutas ECS `Float32Array`. 

## 🏔️ FRENTE R64: Panic Handler (Let it Crash)
- Modificar `components/error/ErrorBoundary.tsx` para ser resiliente a travamentos puros do ECS usando o Padrão Erlang.

## 🏔️ FRENTE R65: Sentinel de Memória (OOM)
- Instalar um sentinel no WebWorker (como `workers/oom-sentinel.worker.ts`) que mata abas que excederem o limite V8 (3GB) de forma graciosa e avisa o Cloud.

## 🏔️ FRENTE M67: O Motor Neural de Áudio
- `ai-audio-engine.ts`: Adicionar geração procedural via IA local para lip-sync e vozes.

## 🏔️ FRENTE M69: O Gargalo do Blueprint WebAssembly
- JIT Compilation de visual nodes para WASM em milissegundos.

## 🏔️ FRENTE I70: O Paradoxo da Escala "AAA" e Multimodal Bypass (O Ladrão de Jogos)
Se um usuário pedir: *"Crie um jogo nível Red Dead Redemption"*... Se os agentes tentarem **digitar o código** para isso do zero, o contexto colapsará.
A Aethel usa o `AgentOrchestrator` para **clonar e reengenhar**.
- **Video-to-Mechanic:** O usuário fornece um vídeo. O `vision-agent` analisa a parábola, traduzindo o vídeo diretamente para Nodos de Visual Scripting. Sem digitar código.
- **Project Scanning:** Fazer upload de um projeto gigante de Unity/Unreal. O agente usa `rg` (ripgrep) e AST Parsers para mapear os componentes.
- **Asset Morphing:** Engine baixa *Megascans* genéricos e aplica morphing.
