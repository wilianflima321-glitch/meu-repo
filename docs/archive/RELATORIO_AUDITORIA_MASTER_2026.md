# RELATÓRIO MESTRE DE ALINHAMENTO ESTRATÉGICO: AETHEL ENGINE AAA (2026)

**Auditor:** GitHub Copilot (Arquitetura de Sistemas Web/Native)
**Escopo:** Ecossistema Total (Web Client, IDE, Backend Services, AI Agents, Scalability Infra)
**Data:** 07 de Janeiro de 2026
**Confidencialidade:** Interna

---

## SUMÁRIO EXECUTIVO

Este documento consolidado (Docs 1-10) detalha **exatamente** o que deve ser feito para elevar o Aethel Engine de um "Protótipo Impressionante" para uma "Plataforma de Produção AAA" capaz de suportar milhares de usuários simultâneos, projetos de gigabytes e fluxos profissionais.

**O Veredito Geral:**
Temos um motor potente (V8 de Fórmula 1) em um chassi de plástico. Os sistemas core (`rapier`, `three`, `monaco`, `ai-agents`) são de nível empresarial. A integração, UI/UX e Infraestrutura de Escala são amadoras. O foco agora deve mudar de "Criar Features" para "Integrar e Polir".

---

## DOC 1 — VISÃO EXECUTIVA E MAPA DO SISTEMA

### 1.1 Diagrama de Maturidade do Ecossistema
| Subsistema | Estado Atual | Estado Alvo (AAA) | Gap Crítico |
| :--- | :--- | :--- | :--- |
| **Frontend Engine** | Renderização WebGL isolada | Renderização PBR c/ Streaming | **Falta LOD & Cache** |
| **IDE & Code** | Mônaco Pro funcional | Integração total c/ Runtime | **Hot Reload Wasm** |
| **Asset Pipeline** | UI `ContentBrowser` desconectada | Drag & Drop Servidor->Cena | **API de Assets** |
| **Multiplayer** | Local Server (Node) | K8s Cluster + Redis | **Stateless Backend** |
| **AI Agents** | Ferramentas isoladas | Agentes com Consciência de Assets | **Tool: `query_assets`** |

### 1.2 Top 3 Prioridades de Negócio
1.  **Fechar o Ciclo de Assets:** O usuário *tem* que conseguir subir um arquivo e vê-lo na cena sem gambiarras.
2.  **Escalabilidade Infinita:** Sair do modelo "monolito simples" para "microserviços stateless" antes de abrir para 1000 usuários (risco de crash total).
3.  **Experiência Visual:** Unificar o Design System. O software parece Frankenstein (partes bonitas, partes cruas).

---

## DOC 2 — ARQUITETURA WEB E LIMITES TÉCNICOS

### 2.1 PWA e Distribuição Desktop
*   **Achado:** O arquivo `useServiceWorker.tsx` está pronto, mas falta o **Manifesto**.
*   **Ação Obrigatória:**
    *   Criar `app/manifest.ts` para que o botão "Instalar Aethel" apareça na barra do Chrome.
    *   Configurar `CacheStorage` para armazenar `three.js` e `rapier.wasm` offline (reduz load inicial de 5s para 0.5s).

### 2.2 Limites de Memória (O Problema dos 4GB)
*   **Risco:** Browser tabs crasham com >4GB de RAM. Projetos AAA passam disso fácil.
*   **Arquitetura de Solução (Streaming):**
    *   Não carregar *todas* as texturas 4K no início.
    *   Implementar **Texture Streaming**: Carregar versões 64x64px primeiro, e trocar para 4K apenas quando o objeto estiver < 10m da câmera.
    *   **Evidência:** `SceneEditor.tsx` carrega tudo de uma vez hoje (linhas 1-50 de `ContentBrowser` mostram assets de 4MB carregados na UI).

---

## DOC 3 — EDITOR/IDE WEB (DX)

### 3.1 Debugging e LSP
*   **Ponto Forte:** `AdvancedDebug.tsx` e `MonacoEditorPro.tsx` são excelentes.
*   **O que falta:** Conexão real do Debugger Adapter Protocol (DAP) com o container do usuário. Atualmente é uma UI simulada ou parcialmente conectada.
*   **Ação:** Garantir que o `debug/dap-runtime.ts` consiga pausar o processo `node` dentro do container Docker do usuário.

### 3.2 Terminal State
*   **Achado:** `XTerminal.tsx` conecta via WebSocket, mas se a aba recarregar, o histórico some.
*   **Correção:** O backend (`terminal-pty-runtime.ts`) deve manter um buffer circular das últimas 1000 linhas e reenviar ao reconectar (`session restore`).

---

## DOC 4 — PIPELINE DE CONTEÚDO (ASSETS AAA)

### 4.1 O "Content Browser" Real
*   **Diagnóstico:** O componente visual está pronto (`components/assets/ContentBrowser.tsx` com 900+ linhas), mas usa dados mockados (`DEMO_ASSETS`).
*   **Plano de Integração:**
    1.  **Backend:** Criar a rota `GET /api/v1/projects/{id}/assets` (lendo S3 + Postgres).
    2.  **Frontend:** Criar hook `useProjectAssets(projectId)` que substitui o `DEMO_ASSETS`.
    3.  **Drag & Drop:** No `SceneEditor.tsx`, o handler `onDrop` precisa ler o `asset_id` e instanciar o `GLTFLoader` certo.

### 4.2 Importação de Modelos Pesados
*   **Gargalo:** Upload via browser direto trava a UI.
*   **Solução:** Implementar **S3 Presigned URLs**. O browser manda direto para o Bucket.
*   **Processing:** Uma **AWS Lambda** (ou Queue Worker) pega o GLB bruto, comprime (Draco/Meshopt) e gera thumbnail. O Editor só baixa a versão otimizada.

---

## DOC 5 — BACKEND E DADOS DISTRIBUÍDOS

### 5.1 Estado Volátil (Redis)
*   **Evidência:** `websocket-server.ts` guarda clientes em `Map<string, WsClient>`. Isso é memória local.
*   **Problema de Escala:** Se escalarmos para 10 servidores, o Usuário A (Servidor 1) não fala com Usuário B (Servidor 2).
*   **Ação:** Implementar **Redis Pub/Sub Adapter**.
    *   Ao enviar msg no chat: `Redis.publish('room-123', msg)`.
    *   Todos os servidores escutam e repassam para seus clientes locais.

### 5.2 Banco de Dados
*   **Risco:** Autosave a cada 1 segundo = DDoS no Postgres.
*   **Solução:**
    *   Escrever mudanças no Redis (`HSET project:123 changes ...`).
    *   Worker salva no Postgres a cada 30s ("Write-Behind Caching").

---

## DOC 6 — INFRA, CI/CD E OBSERVABILIDADE

### 6.1 Build Farm (Fábrica de Jogos)
*   **Requisito:** "Usuários baixarão jogos de vários GB".
*   **Solução:** Não buildar no servidor web.
    *   Criar fila `build-jobs`.
    *   Cluster de **Spot Instances** pega o job, roda `npm run build:game`, gera `.exe/.zip`, sobe no S3 e notifica o usuário via Email/Webhook.

### 6.2 Docker de Desenvolvimento
*   **Status:** Falta pipeline automática para gerar a imagem base do ambiente do usuário (`aethel-dev-env:latest`).
*   **Ação:** Adicionar no GitHub Actions (`ci.yml`) o build dessa imagem Docker que contém `node`, `python`, `blender-cli` (para processar assets).

---

## DOC 7 — SEGURANÇA E COMPLIANCE

### 7.1 Sandbox de Execução
*   **Risco Crítico:** O código do usuário roda no servidor?
*   **Mitigação:** Uso de **gVisor** ou **Firecracker** para isolar containers. Usuário não pode ter acesso a `process.env` do host.

### 7.2 Assinatura de Código
*   **Compliance:** Para exportar `.exe` sem alerta de vírus, precisamos de um servidor de assinatura (Code Signing) na pipeline de build.

---

## DOC 8 — PRODUTO E UX (ALINHAMENTO VISUAL)

### 8.1 "The Face of the Product"
*   **Ação Imediata:** Remover cores hardcoded de `ContentBrowser.tsx` e `XTerminal.tsx`.
*   **Uniformização:** Tudo deve herdar de var `--background` e `--primary`.
*   **Feedback:** Telas de loading (Skeletons) são obrigatórias em operações de >200ms.

### 8.2 Acessibilidade IA
*   **Inovação:** Adicionar suporte a **ARIA Live Regions** para que o assistente de voz da IA possa "falar" o que está acontecendo na tela ("Compilação finalizada", "Erro na linha 40").

---

## DOC 9 — COMPARATIVO GAP ANALYSIS

| Feature | Aethel Engine (Hoje) | Unreal 5 | Correção Necessária |
| :--- | :--- | :--- | :--- |
| **Asset Browser** | Visual Mockado | Integrado (Bridge) | Conectar API + S3 |
| **Multiplayer** | Básico (P2P/Socket) | Replikation Graph | Redis Adapter |
| **Build** | Indefinido | Cooked Builds | Build Farm Workers |
| **Logic** | Script Typescript | Blueprints/C++ | Hot-Reload de TS |

---

## DOC 10 — PLANO DE AÇÃO TÁTICO E MÉTRICAS

### **SEMANA 1: WIRE-UP (Conectar)**
1.  **Backend:** Configurar Redis local e conectar `websocket-server.ts`.
2.  **API:** Rota de Upload S3 e Listagem de Assets.
3.  **Frontend:** Refatorar `ContentBrowser.tsx` (CSS + API Hook).

### **SEMANA 2: SCALE-UP (Escalar)**
1.  **Infra:** Terraform para cluster K8s.
2.  **Data:** Implementar Throttling no salvamento (Redis Buffer).

### **SEMANA 3: LEVEL-UP (Polir)**
1.  **UX:** Empty States e Skeletons em tudo.
2.  **AI:** Dar ferramenta `query_assets` para o Agente.
3.  **Deploy:** Publicar PWA Manifest.

---

### Conclusão do Auditor
A fundação técnica para "Milhares de Usuários" e "Jogos AAA" existe conceitualmente no código (`lib/server`, `lib/ai`, `components/engine`), mas **não está ligada na tomada**.
A arquitetura de WebSocket atual (`Map` em memória) é o maior risco de escalabilidade. A falta de API de Assets real é o maior risco de produto.
Ataque esses dois pontos primeiro. Visual depois. IA por último.
