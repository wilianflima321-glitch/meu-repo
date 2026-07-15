# Aethel Engine: Filosofia, Arquitetura e Robustez Interna

Este manifesto define os **Princípios Imutáveis** (A Filosofia) que guiam o desenvolvimento do núcleo da Aethel Engine. Qualquer decisão técnica futura, seja escrita por um humano ou por uma Inteligência Artificial, deve ser submetida a estas leis. Se uma linha de código violar estas diretrizes, ela deve ser sumariamente rejeitada.

---

## 1. A Filosofia Híbrida: "O Reator e a Casca"
Aethel não tenta reinventar a roda construindo interfaces gráficas do zero em C++, nem tenta fazer cálculos termodinâmicos complexos em JavaScript. A arquitetura obedece à separação radical:
- **A Casca (React/TS):** A interface do usuário é apenas um "Painel de Controle" de luxo. É efêmera, focada exclusivamente em acessibilidade, usabilidade e beleza (Design Tokens, Glassmorphism, Virtualização).
- **O Reator (Rust/C++):** Todo o peso bruto fica escondido. Física, renderização (wgpu), alocação de assets na memória, networking P2P.
> **Lei 1:** O Frontend (Casca) nunca deve calcular lógicas de mundo ou iterar sobre vetores massivos de jogo. O Frontend envia a *Intenção* (Ex: "Crie 1000 árvores"), e o Backend (Reator) faz a matemática e devolve o resultado final para a tela.

## 2. Robustez de Memória: Data-Oriented Design (DoD)
O desenvolvimento de jogos AAA abandonou a Orientação a Objetos (OOP) convencional para performance extrema. Aethel abraça o *Data-Oriented Design* através de seu Entity-Component-System (ECS) nativo.
- **Chega de Objetos:** Entidades não são Classes instanciadas cheias de métodos. Uma Entidade é apenas um número (ID).
- **Arrays Contíguos:** Os componentes (Posição, Velocidade, Vida) são armazenados em arrays lineares apertados (`Float32Array` ou arrays nativos em Rust). Isso evita que a CPU salte pela memória RAM (Pointer Chasing), maximizando o *Cache Hit* do processador.
> **Lei 2:** Ao iterar sobre 100.000 objetos na cena, o sistema deve iterar sobre a memória contígua (ECS puro). Código que tenta percorrer objetos com métodos encapsulados em `for loops` de larga escala é considerado antípadrão.

## 3. O Paradigma da IA: A Piloto, não a Máquina
No universo Aethel, as Inteligências Artificiais não são entidades mágicas que escrevem "Engine inteira em 1 clique". Elas são operários hiper-competentes orquestrando uma máquina determinística.
- **AST Limits:** A IA não tem permissão para adivinhar onde o código está. Ela usa ferramentas para mapear a Árvore de Sintaxe Abstrata (AST) e edita funções específicas de forma cirúrgica.
- **Validação Autônoma:** A IA opera em um *Ledger* de confiança (Frente 41).
> **Lei 3:** O código da IA nunca entra em produção na versão local do jogo sem antes ter sido "compilado na sombra" (Headless Testing) e validado pelo motor de física para provar que a alteração não destrói as leis do mundo virtual.

## 4. Filosofia "Crash-Only" e Resiliência Ativa
Engines web e híbridas têm a tendência de "engolir" erros e deixar o sistema em um estado semi-quebrado, onde um botão para de funcionar mas o resto parece normal.
- **Deixe Quebrar (Let it Crash):** Aethel segue o modelo *Erlang/Actor*. Se uma thread do Worker de Física entrar em um estado corrompido, ela não tenta "remendar" o erro. A thread sofre pânico intencional e morre.
- **Auto-Cura Oculta (Self-Healing):** O Orquestrador principal intercepta a morte dessa thread, reinicia a simulação imediatamente partindo do último *Snapshot* do ECS salvo no Yjs, e simultaneamente joga o *Stack Trace* do erro na mesa de um Agente de IA para criar o *hot-fix*. O usuário vê, no máximo, um engasgo de 1 frame.
> **Lei 4 — DEPENDÊNCIAS:**
>
> Antes de "Auto-Cura" funcionar:
> 1. Frente 31 (Memory Layout SoA com SharedArrayBuffer)
> 2. Frente 66 (Snapshotting Contínuo)
> 3. Integração ECS↔Yjs (não existe hoje — só Monaco↔Yjs)
## 5. A Verdade Única: O Virtual File System (VFS)
Caminhos locais (C:/Users/.../textura.png) são veneno para a portabilidade.
- **Absolutismo de UUID:** Absolutamente todos os recursos de projeto não são "arquivos", mas *Objetos Binários* mapeados por UUIDs.
- O sistema de Banco de Dados local (RocksDB/Sled em Rust) atua como a única ponte entre o código, os bytes do arquivo e a placa de vídeo (Zero-Copy). O Prisma existe apenas para autenticação e nuvem.
> **Lei 5 — ESTADO ATUAL: ASPIRACIONAL**
>
> A implementação completa exige adicionar ao `apps/studio-local/src-tauri/Cargo.toml`:
> - `rocksdb = "0.21"` OU `sled = "0.34"`
> - `uuid = { version = "1.6", features = ["v4"] }`
> - `memmap2 = "0.9"`
>
> Implementação real fica em `apps/studio-local/src-tauri/src/vfs.rs` (arquivo a criar).
> Esta lei só vale após as Frentes 35 (Ingestão Rust) e 48 (Asset Registry).
---

# Lei 6: O Que NÃO Fazer Agora

NeRFs, DirectStorage, MMO P2P Spatial Mesh, Audio Neural e Verificação Formal
são alvos de **5–7 anos**. Claude NÃO deve abrir PR sobre esses tópicos no sprint atual.
Eles existem apenas para guiar decisões arquiteturais (ex.: "isto bloqueia DirectStorage? evitar.").

---

### O FIM DO ACHISMO
Este documento sela o conceito da "Robustez Interna". Programadores (Humanos ou IAs) que implementam na Aethel não precisam mais perder horas em debates arquitetônicos. As fundações de **Performance, Segurança e Autonomia** estão gravadas nestas leis absolutas.
