# RELATÓRIO DE ESCALABILIDADE E INFRAESTRUTURA AAA (2026)

**Objetivo:** Garantir suporte a 10.000+ usuários concorrentes, projetos de 50GB+, e pipelines de build/exportação sem "crash".
**Status Atual:** Arquitetura Monolítica (Funcional para <100 usuários).
**Status Alvo:** Arquitetura Distribuída Cloud-Native (Escala Infinita).

---

## 1. O Desafio dos "Milhares de Usuários" (Concorrência)

### 1.1 O Gargalo do Websocket (Stateful)
*   **Problema Atual:** O servidor de colaboração (`server/index.ts`) e o terminal (`pty`) mantêm conexões persistentes na memória do processo Node.js.
*   **Cenário de Falha:** Se você tiver 5.000 usuários conectados e o servidor reiniciar (deploy ou erro), 5.000 usuários caem instantaneamente. Se um servidor lotar a CPU, a interface trava para todos.
*   **O que falta (Solução):**
    1.  **Redis Pub/Sub:** Implementar uma camada de Redis (Cluster) para que os servidores Websocket sejam "stateless" em relação à mensagem. Se o Servidor A cair, o usuário reconecta no Servidor B e o Redis recupera o estado da sessão.
    2.  **Horizontal Autoscaling:** Configurar Kubernetes (K8s) HPA (Horizontal Pod Autoscaler). Quando a CPU passar de 60%, sobe novos pods automaticamente.

### 1.2 Banco de Dados sob Pressão
*   **Problema Atual:** Prisma com Postgres único.
*   **Cenário de Falha:** Milhares de usuários salvando posições de objetos a 60hz (autosave) vão travar o banco.
*   **O que falta (Solução):**
    1.  **Connection Pooling:** Usar PgBouncer para gerenciar milhares de conexões simultâneas.
    2.  **Read Replicas:** Separar leitura e escrita. O Dashboard lê de réplicas; O Editor grava na Master.
    3.  **Ephemeral State Store:** Não salvar a posição do mouse/objeto no Postgres em tempo real. Salvar no Redis e "persistir" no Postgres a cada 30 segundos (Throttling).

---

## 2. Suporte a Jogos "AAA" de Vários GBs (Storage)

### 2.1 O Problema do Upload/Download Massivo
*   **Problema Atual:** O upload parece passar pelo servidor Next.js API Routes.
*   **Cenário de Falha:** Um usuário sobe uma textura 8K (500MB). O Node.js tem que carregar isso em RAM (Buffer). Com 10 usuários fazendo isso, a memória estoura (OOM Kill).
*   **O que falta (Solução):**
    1.  **Presigned URLs (Direct-to-S3):** O frontend pede ao servidor "permissão para subir". O servidor devolve uma URL assinada. O browser sobe o arquivo **diretamente para o Bucket S3 (AWS/Cloudflare R2)**, ignorando totalmente o seu servidor Node.js.
    2.  **Multipart Uploads:** Para arquivos > 100MB, é obrigatório implementar upload fragmentado (resume support). Se a net cair no meio de um arquivo de 2GB, não pode começar do zero.

### 2.2 Streaming de Assets (Não travar o Browser)
*   **Problema:** Carregar um jogo de 10GB no navegador do usuário vai travar a aba (limite de ~4GB de RAM do V8 Engine).
*   **O que falta (Solução):**
    1.  **LOD (Level of Detail) Pipeline:** Quando o usuário sobe um modelo 4K, uma Cloud Function deve gerar versões Low-Poly automaticamente.
    2.  **Asset Streaming:** O `ContentBrowser` e a `Scene` só devem baixar a versão High-Res quando o objeto estiver perto da câmera. Implementação necessária no `SceneEditor.tsx`.

---

## 3. Pipeline de Build e Exportação (Factory Pattern)

### 3.1 "Baixar o Jogo" (Compilação Remota)
*   **Problema:** O usuário clica em "Exportar para Windows". O navegador não consegue compilar um `.exe` complexo eficientemente.
*   **O que falta (Solução):** Arquitetura de **Build Workers (Filas)**.
    1.  Usuário clica "Build".
    2.  API coloca mensagem na fila `aws-sqs` ou `rabbitmq`.
    3.  Um cluster de **Build Agents** (máquinas potentes e efêmeras) pega o job, baixa os assets do S3, compila (usando Electron/Rust/Unreal tools), zipa o resultado e sobe o `.zip` no S3.
    4.  Usuário recebe notificação: "Seu jogo está pronto. Download aqui."

### 3.2 Containers de Desenvolvimento Isolados
*   **Segurança:** Se um usuário criar um script malicioso (loop infinito ou mineração de cripto), ele não pode afetar os outros.
*   **O que falta:** Recursos de isolamento duro.
    *   **Firecracker MicroVMs:** (Tecnologia usada pela AWS Lambda/Fly.io). Cada sessão de usuário deve rodar em uma MicroVM isolada, não apenas um Docker Container compartilhado. Isso garante que "travar" afete apenas 1 usuário.

---

## 4. Infraestrutura Global (Latência)

### 4.1 Edge Computing
*   **Problema:** Um usuário no Japão acessando servidores no Brasil terá lag no cursor do mouse (colaboração ruim).
*   **O que falta:**
    1.  **Multi-Region Deployment:** O banco de dados e os servidores WebSocket precisam estar replicados em US, EU, ASIA.
    2.  **Global CDN:** Assets (texturas, vídeos, sons) devem ser cacheados na borda (Cloudflare/Cloudfront).

---

## 5. Resumo das Tarefas Técnicas para "Super Escala"

1.  **Infra:** Configurar **Terraform/Pulumi** para orquestrar K8s Cluster + Redis Cluster + Postgres Cluster.
2.  **Backend:** Refatorar `server/index.ts` para usar **Redis Adapter** (socket.io-redis ou similar).
3.  **Frontend:** Implementar **Direct S3 Upload** no `ContentBrowser`.
4.  **Pipeline:** Criar a fila de **Build Workers** separados da API principal.
5.  **Dados:** Migrar states voláteis (posição cursor, seleção) para **Redis** (evitar spam no Postgres).

**Conclusão:**
Para ter fluidez "AAA" com milhares de usuários, o segredo é **desacoplamento**.
- O upload não toca no servidor de aplicação.
- O build não roda no servidor de API.
- A colaboração não depende da memória local.

Se implementarmos esses 5 pontos, o sistema se torna "inquebrável" por carga de uso normal.
