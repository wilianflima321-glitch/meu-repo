# Arquitetura Crítica V24: Execução de Baixo Nível (Ordens para o Claude)

> [!CAUTION]
> **SUPERSEDED (2026-07-11) — DO NOT EXECUTE FROM THIS FILE**  
> Use `docs/architecture/AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md` + pillar specs (Immunity / Forge / World).  
> Nav: `docs/architecture/AETHEL_STUDIO_SUPREMACY_INDEX.md` § Document Authority. Historical archive only.

Este documento foi elevado de um "alinhamento conceitual" para um **Guia de Execução Sênior**. As 5 lacunas arquitetônicas críticas abaixo ditam EXATAMENTE **O Que** o Claude deve fazer, **Como** fazer (Sem Mocks, Sem Placebos) e **Onde** (Arquivos) no repositório.

## 1. Hot-Module Replacement Nativo (Dynamic Library Swap)
* **O Que Queremos:** Zero tempo de compilação em desenvolvimento nativo. C++ e Rust têm tempos de compilação terríveis, o que mata o "Live Coding".
* **Como Fazer:** O núcleo da engine deve rodar isolado da lógica do jogo. Você implementará suporte a *Dynamic Library Swapping* (`.dll`/`.so`) usando `libloading` no Rust. Apenas o pacote de gameplay do usuário será recompilado no background e injetado na memória quente (Memory Hot-Swap) no próximo frame, mantendo o ponteiro do Scene Graph intacto.
* **Onde Fazer:**
  * **Rust/Desktop:** `src-tauri/src/hmr_swapper.rs` (Criar este arquivo para gerenciar ponteiros C-ABI).
  * **Web:** Modificar `web/lib/server/file-watcher-runtime.ts` para ejetar o V8 cache e empurrar o WASM atualizado direto para a thread do Web Worker.

## 2. ECS Orientado a Dados Extremos (SoA + WebGPU Direct Map)
* **O Que Queremos:** Destruir a UE5 em uso de CPU. Se o ECS tiver desalinhamento de memória (Cache Misses), não adianta ser em Float32Array.
* **Como Fazer:** Sem arrays de objetos. Você forçará o layout **Structure of Arrays (SoA)** obrigatório. As matrizes de Transformação (Posição/Rotação/Escala) dos 100.000 nós da cena devem residir em um único `SharedArrayBuffer` contíguo. Esse buffer será passado DIRETAMENTE como `Storage Buffer` para os Compute Shaders do WebGPU. Zero serialização de objetos JS. Zero Garbage Collection.
* **Onde Fazer:**
  * Modificar `web/lib/game-engine-core.ts` e `web/lib/engine/scene-graph.ts`.
  * Excluir instâncias espalhadas de `new THREE.Vector3()` no loop de atualização. Criar a classe `SoA_TransformManager`.

## 3. Amnésia da Inteligência Artificial (Episodic Vector DB)
* **O Que Queremos:** O sistema de IA (Agentes) não pode esquecer de por que escrevemos um código há 6 meses. O Cursor sofre com isso. A nossa engine não vai sofrer.
* **Como Fazer:** Você implementará um banco de dados vetorial embutido local rodando via Tauri. Cada alteração crítica no projeto (diff do AST) será salva como Embedding. Antes do Orquestrador LLM responder a um pedido do usuário, ele faz uma RAG-query no Banco Vetorial Local recuperando o contexto histórico (Por que a classe X foi escrita dessa forma).
* **Onde Fazer:**
  * **Rust/Desktop:** Criar integração com SQLite-vec ou LanceDB em `src-tauri/src/ai_memory.rs`.
  * **Web/Orquestrador:** Modificar `web/lib/ai-trace-store.ts` para enviar e consultar os *embeddings* no Backend Vetorial antes de gerar o prompt final.

## 4. Compilador AST Nativo para Visual Scripting
* **O Que Queremos:** O Visual Scripting atual (`web/lib/VisualScriptCompiler.ts`) não pode usar concatenação de strings `eval()`. Isso é um lixo de performance e segurança.
* **Como Fazer:** O Visual Scripting da Aethel vai compilar para código nativo. Cada vez que uma conexão (Edge) for feita no nó, você irá compilar o grafo diretamente em **Bytecode de Rust (WASM)** ou **WebGPU Compute Shaders** dependendo se a lógica for de Gameplay ou de Gráficos.
* **Onde Fazer:**
  * **Refatoração Total:** Modificar `web/packages/visual-scripting/VisualScriptCompiler.ts`. Substituir todo o gerador de JS por um construtor de AST do Rust usando o pacote `swc` ou emissores WASM diretos. A performance deve igualar 100% C++ puro.

## 5. Renderização Desacoplada (Interpolação GPU a 240Hz)
* **O Que Queremos:** A física da rede corre a 60 Ticks fixos (Rollback Netcode). A câmera e a tela do usuário rodam a 240Hz. Se não houver desacoplamento, a tela vai tremer (Micro-Stutters).
* **Como Fazer:** A física rodará no Web Worker, alimentando um `Ring Buffer` com Snapshot 1 e Snapshot 2. O Renderizador (Na thread principal ou GPU nativa) lerá ambos os Snapshots simultaneamente. Você passará o tempo `alpha` (a fração de interpolação entre o tick 1 e 2) diretamente para o Vertex Shader. A placa de vídeo calculará a posição exata, aliviando a CPU e entregando fluidez perfeita a qualquer taxa de quadros (FPS Desbloqueado).
* **Onde Fazer:**
  * Modificar `web/lib/networking/rollback-netcode-manager.ts` para expor o `alpha` tick.
  * Modificar `web/lib/engine/renderer/WebGPUContext.ts` para aceitar buffers de instâncias de 2 Ticks consecutivos e realizar a interpolação SLERP nos shaders GLSL/WGSL nativos.

## 5. O Expurgo Final das Alucinações (Reality Check Absoluto)
Fiz uma varredura cruzada em todos os planos em busca de promessas de "marketing mágico". Identifiquei três alucinações estruturais que, se codificadas como descritas anteriormente, fariam a engine crashar ou os usuários odiarem o software. Eis as correções técnicas definitivas (Reality Checks):

### 5.1. Alucinação de "Cloud Baking Invisível" (O Problema de Memória)
* **A Alucinação (V30):** Eu disse que a nuvem comprimiria uma textura gigantesca em KTX2 e a substituiria no projeto "invisivelmente". 
* **O Reality Check:** A nuvem não pode ejetar um arquivo de 50MB na memória RAM da aba do navegador. O `IndexedDB` tem limites estritos e trava a Main Thread.
* **A Execução Estrita:** O Claude usará a **API OPFS (Origin Private File System)** no navegador. O servidor manda um WebSocket `[BAKE_READY]`. Um *Service Worker* (Thread de background) faz o streaming dos bytes diretamente para o disco rígido do usuário via OPFS. Quando o salvamento termina, o motor apenas atualiza o ponteiro (*Handle*) no WebGPU. Zero uso de RAM excedente, zero travamentos (Stuttering).

### 5.2. Alucinação do "Git Visual e CRDT" (O Problema do OOM)
* **A Alucinação (Architecture Spec 28):** Eu disse que usaríamos `YJS` (CRDT) acoplado ao `git-manager.ts` para dar uma "Máquina do Tempo" de commits.
* **O Reality Check:** O algoritmo CRDT grava todo o histórico de tudo na memória. Se o mundo 3D tiver 1 Milhão de entidades, a memória do YJS chegaria a 2 Gigabytes em 30 minutos e o navegador crasharia (*Out of Memory - OOM*).
* **A Execução Estrita:** O Claude está proibido de colocar o mundo 3D inteiro no CRDT. O YJS sincronizará apenas os **Deltas de Alteração** da cena atual. O histórico da "Máquina do Tempo" será dumpeado no OPFS local. O `git-manager.ts` lerá do disco (SQLite local), e não da RAM.

### 5.3. Alucinação do "Jogo 100% Offline com Llama" (O Problema do Bloatware)
* **A Alucinação (Architecture Spec 29):** Eu prometi que os jogos exportados iriam embutir `llama.cpp` e o Llama-3-8B (IA) no executável para não dependerem da nuvem.
* **O Reality Check:** O Llama 8B, mesmo hiper-comprimido (Q4), pesa 4.5 Gigabytes de RAM/VRAM. Se um desenvolvedor fizer um joguinho de plataforma 2D de 50MB, nós forçaríamos o jogador a baixar 5GB e fritaríamos a placa de vídeo dele só para um NPC conversar. O jogo receberia *Review Bomb*.
* **A Execução Estrita:** O Protocolo de Independência usará uma **Matriz Escalonável de IA**.
  - O desenvolvedor pode escolher modelos minúsculos como o `Qwen-1.5-0.5B` (pesa apenas 350MB).
  - Mais importante: O Claude programará um **Graceful Fallback**. Se a placa de vídeo do jogador final não suportar a IA, a Engine destrói a dependência do `llama.cpp` e faz um Fallback invisível para **Árvores de Decisão Clássicas (Behavior Trees)**. O NPC perde a criatividade LLM, mas usa diálogos roteirizados. O jogo roda até num Pentium de 2012 e a UX do jogador permanece intacta.

### 5.4. Alucinação do "Multiplayer Perfeito" (O Problema do Determinismo)
* **A Alucinação (V24/V30):** Eu disse que usaríamos `Rapier3D` (Física) aliado ao *Rollback Netcode* para multiplayer sincronizado.
* **O Reality Check:** O *Rapier3D* e o JavaScript operam com Ponto Flutuante (Floating-Point Math). Processadores Intel, AMD e Celulares ARM calculam "vírgulas" de formas ligeiramente diferentes. Se a física for Float, uma granada jogada no iPhone quica 1 centímetro diferente do PC. Em 5 segundos, o Multiplayer perde o sincronismo (*Desync*) e o jogo quebra.
* **A Execução Estrita:** O Claude está terminantemente proibido de basear o Netcode Competitivo em Floats. O motor de física multiplayer usará **Fixed-Point Math (Matemática de Ponto Fixo)**. Valores de posição e rotação serão calculados como Números Inteiros multiplicados por fatores de precisão, garantindo 100% de determinismo cravado independentemente se o jogador está num iPhone 8 ou num PC da NASA.

### 5.5. Alucinação do "Importe seu FBX" (O Gargalo de Ingestão)
* **A Alucinação:** Achar que o criador joga um arquivo `.fbx` ou `.obj` de 300MB de um software legado na aba da IDE e a WebGPU "engole" e renderiza perfeitamente.
* **O Reality Check:** Modelos FBX usam protocolos proprietários, materiais quebrados e explodem o DOM. Motores web que tentam ler FBX nativamente travam ou perdem texturas.
* **A Execução Estrita:** A Engine terá um **Ingestion Pipeline Rigoroso**. A Aethel WebGPU lerá internamente **apenas** `glTF 2.0` (Para jogos) e `.USDZ` (Para Enterprise). Quando o usuário soltar um arquivo `.fbx`, um Módulo WASM de Ingestão fará o *Transcoding* (Conversão) nos bastidores, consertará UVs, gerará o arquivo glTF e o entregará pronto para o Kernel da Engine.

### 5.6. Alucinação do "Infraestrutura do Zero" (O Problema do Retrabalho Fantasma) — NOVA (2026-07-03)
* **A Alucinação:** Os próprios planos de execução (V7, V8) tratam repetidamente infraestrutura já existente como trabalho a ser construído do zero. Isso não é um erro de arquitetura — é um erro de **auditoria de estado**, mas tem o mesmo efeito prático: um agente executor gasta ciclos caros recriando o que já existe, ou pior, cria uma segunda implementação divergente ao lado da primeira.
* **O Reality Check (3 casos confirmados por leitura direta do código em 2026-07-03):**
  1. **Cost Guard "do zero":** V7/V8 pedem "adicionar `@upstash/redis`". A dependência **já está instalada** (`web/package.json`, `^1.34.3`), e já existe `lib/redis-cache.ts` — uma classe `RedisCache` completa com `ioredis` lazy-load, fallback em memória e decorator. `lib/observability/cost-guard.ts` ignora ambos e usa `Map()`.
  2. **God-file WebSocket "a quebrar":** `docs/architecture/audit_backend_spine.md` (Frente 3) descreve `lib/server/websocket-server.ts` como um arquivo de 1.443 LoC a ser fatiado. O arquivo real tem 435 linhas e já importa de 10 módulos extraídos. A tarefa já foi concluída por algum ciclo anterior sem que o documento fosse atualizado.
  3. **Desktop "vazio" (32 linhas, 1 arquivo):** V8 §0.P descreve o Desktop Tauri como um esqueleto de `println!`. Hoje existem **18 arquivos Rust**, incluindo um `wgpu_renderer.rs` que monta device/surface/swapchain reais via `wgpu::Instance` → `request_adapter` → `request_device`, e um `Cargo.toml` com `rapier3d`, `portable-pty`, `notify`, `ort` (ONNX) já declarados.
* **A Execução Estrita:** Nenhum agente pode tratar uma afirmação de "isto não existe" ou "isto está vazio" de qualquer documento `CLAUDE_*` como verdade absoluta sem primeiro rodar uma verificação de leitura direta (`Glob`/`Grep`/`Read`) no caminho citado. **Regra obrigatória antes de qualquer tarefa de "Build":** confirmar com uma busca real que o artefato realmente não existe; se existir parcialmente, reclassificar a tarefa de `Build` para `Wire` ou `Harden` e reduzir a estimativa de esforço de acordo. Isso vale retroativamente para qualquer nova frente que apareça em documentos futuros — a auditoria de estado é parte do trabalho, não uma etapa opcional antes dele.

---

**Protocolo de Aceitação Final:** Nenhum desses itens admite uso de `Mock` de dados ou soluções temporárias (Local Storage/Strings/Floats em Netcode). Cada componente tocará o bare-metal do navegador (SharedArrayBuffer), o sistema nativo (Tauri Rust API) e a matemática pura de Inteiros com total precisão. Não existem mais alucinações técnicas. O escopo atingiu a muralha da realidade física. **Atualização 2026-07-03:** a muralha da realidade física agora também inclui a muralha da realidade *documental* — nenhum plano deve ser executado sem antes confirmar, por leitura direta, que o estado que ele descreve ainda é verdade.
