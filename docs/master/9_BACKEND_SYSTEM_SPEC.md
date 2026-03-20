# 09_BACKEND_SYSTEM_SPEC (LEGACY FILENAME)
## Especificação Completa do Sistema Backend
**Data:** Março 2026  
**Versão:** 2.0 (Atualizada)  
**Status:** Contrato de Execução (Alinhado com Realidade)

---

## 1. VISÃO GERAL

O backend é a fundação da plataforma, responsável por:
- Autenticação e autorização (via NextAuth.js)
- Gestão de projetos e arquivos (via Prisma ORM)
- Execução de código em ambientes isolados (E2B/WebContainers)
- Serviços de AI (via OpenAI, Anthropic, Google APIs)
- Deploy e hosting (integrado com Vercel/Next.js)
- Colaboração real-time (via Yjs)
- Admin e billing (via Stripe)

### 1.1 MODOS DE OPERAÇÃO (HÍBRIDO)

A plataforma opera em dois modos distintos para garantir viabilidade econômica e performance AAA:

1.  **Modo Cloud (Web-Native):**
    - Execução em ambientes isolados (E2B para Pro/Enterprise, WebContainers para Free).
    - Foco: Coding, Live Preview, IA Agents, Colaboração.
    - Custo: Deduzido da Wallet do usuário (Pay-as-you-go).

2.  **Modo Local (Bridge):**
    - Execução na máquina do usuário (via CLI/Desktop Bridge).
    - Foco: Builds pesados (Unreal/Unity), Renderização 4K, Jogos AAA.
    - Custo: Zero infraestrutura para a plataforma (BYOD - Bring Your Own Device).

---

## 2. ARQUITETURA GERAL

### 2.1 Diagrama de Serviços

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER                                  │
│                           (Vercel / CloudFlare)                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                              NEXT.JS APP                                    │
│                         (API Routes / Pages)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Middleware: Auth │ Rate Limit │ CORS │ Logging │ Error Handling    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└───────────┬─────────────┬─────────────┬─────────────┬───────────────────────┘
            │             │             │             │
    ┌───────▼───┐ ┌───────▼───┐ ┌───────▼───┐ ┌───────▼───┐
    │  NEXTAUTH │ │  PROJECT  │ │   FILE    │ │    AI     │
    │  (AUTH)   │ │  (PRISMA) │ │  (S3/R2)  │ │  (LLMs)   │
    └───────────┘ └───────────┘ └───────────┘ └───────────┘
            │             │             │             │
    ┌───────▼───┐ ┌───────▼───┐ ┌───────▼───┐ ┌───────▼───┐
    │ EXECUTION │ │  DEPLOY   │ │  COLLAB   │ │   ADMIN   │
    │  (E2B/WC) │ │  (VERCEL) │ │  (YJS)    │ │  (PRISMA) │
    └───────────┘ └───────────┘ └───────────┘ └───────────┘
            │             │             │             │
┌───────────▼─────────────▼─────────────▼─────────────▼───────────────────────┐
│                            DATA LAYER                                       │
│  ┌────────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ PostgreSQL │  │  Redis  │  │   S3    │  │ pgvector│  │  Queue  │          │
│  │  (Prisma)  │  │ (Upstash)│  │ (Cloudflare)│  │ (Prisma)│  │ (BullMQ)│          │
│  └────────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnológico

```yaml
# Core Framework
framework: Next.js 14.2.5
typescript_version: "5.6+"
react_version: "18+"

# Database
primary_db: PostgreSQL (via Prisma 5.7)
cache: Redis (via @upstash/redis, ioredis)
search: PostgreSQL (via pgvector)
vector_db: pgvector (integrado ao PostgreSQL)

# Storage
file_storage: S3 / R2 (Cloudflare R2)
cdn: CloudFlare

# Queue / Workers
task_queue: BullMQ / Next.js API Routes (Serverless)
scheduler: Cron jobs (Vercel/Cloudflare Workers)

# Containers
container_runtime: E2B / WebContainers
orchestration: Vercel Serverless Functions
isolation: Firecracker (via E2B)

# Real-time
websocket: Yjs + y-websocket (para colaboração)
collab: Yjs + y-monaco

# AI
providers: OpenAI 4.73, Anthropic 0.30, Google Generative AI 0.21
streaming: Server-Sent Events (SSE) via Next.js API Routes
```

---

## 3. SERVIÇOS DETALHADOS

### 3.1 Auth Service (NextAuth.js)

**Localização:** `/cloud-web-app/web/app/api/auth/[...nextauth]/route.ts`

**Descrição:** Gerenciamento de autenticação e autorização utilizando NextAuth.js. Suporta provedores de OAuth (GitHub, Google, etc.) e credenciais (email/senha). Integra-se com Prisma para persistência de usuários e sessões.

**Funcionalidades:**
- Login/Logout
- Registro de Usuários
- Refresh de Tokens
- Proteção de Rotas (Middleware)
- RBAC (Role-Based Access Control) integrado com `advanced-config.ts`

### 3.2 Project Service (Prisma)

**Localização:** `/cloud-web-app/web/app/api/projects/route.ts` e `/cloud-web-app/web/app/api/projects/[id]/route.ts`

**Descrição:** CRUD completo para gerenciamento de projetos. Utiliza Prisma ORM para interagir com o banco de dados PostgreSQL. Inclui lógica para membros do projeto e permissões.

**Funcionalidades:**
- Criar, Ler, Atualizar, Deletar Projetos
- Listar Projetos por Usuário/Time
- Gerenciamento de Membros do Projeto
- Validação de Esquema (Zod)

### 3.3 File Service (S3/R2)

**Localização:** `/cloud-web-app/web/app/api/storage/route.ts`

**Descrição:** API para upload e gerenciamento de arquivos. Integra-se com Cloudflare R2 (compatível com S3) para armazenamento de objetos. Utilizado para assets de Games, Films, thumbnails, etc.

**Funcionalidades:**
- Upload de Arquivos (pré-assinados)
- Download de Arquivos
- Listagem de Arquivos
- Deleção de Arquivos
- Otimização de Imagens (via Next.js Image Optimization)

### 3.4 AI Service (LLMs)

**Localização:** `/cloud-web-app/web/app/api/ai/chat/route.ts` e `/cloud-web-app/web/app/api/ai/stream/route.ts`

**Descrição:** Integração com múltiplos provedores de Large Language Models (LLMs) como OpenAI, Anthropic e Google Generative AI. Inclui roteamento inteligente de modelos e fallback chain. Suporta streaming de respostas via Server-Sent Events (SSE).

**Funcionalidades:**
- Geração de Código (Autocomplete, Actions)
- Chat Conversacional
- Agentes Autônomos
- RAG (Retrieval Augmented Generation) com pgvector
- Streaming de Respostas

### 3.5 Execution Service (E2B/WebContainers)

**Localização:** `/cloud-web-app/web/lib/e2b-runtime.ts` e `/cloud-web-app/web/lib/webcontainers-runtime.ts`

**Descrição:** Provisão de ambientes de execução isolados para Live Preview e testes de código. E2B é utilizado para ambientes mais robustos (Pro/Enterprise) com Firecracker, enquanto WebContainers oferece uma solução leve e client-side para o tier Free.

**Funcionalidades:**
- Criação de Ambientes Virtuais
- Execução de Código
- Live Preview com HMR (Hot Module Replacement)
- Instalação de Dependências
- Acesso ao Filesystem Virtual

### 3.6 Deploy Service (Vercel)

**Localização:** `/cloud-web-app/web/app/api/deploy/route.ts`

**Descrição:** Gerenciamento do ciclo de vida de deploys. Integra-se com a API da Vercel para iniciar builds, monitorar status e obter URLs de deploy. Suporta feedback em tempo real via `RealtimeSyncManager`.

**Funcionalidades:**
- Iniciar Deploy
- Monitorar Status de Deploy
- Obter Logs de Build
- Rollback (via Vercel API)
- Integração com Git (GitHub/GitLab)

### 3.7 Collab Service (Yjs)

**Localização:** `/cloud-web-app/web/lib/yjs-provider.ts`

**Descrição:** Habilita colaboração em tempo real em documentos e código. Utiliza Yjs para CRDTs (Conflict-free Replicated Data Types) e `y-websocket` para sincronização via WebSocket. Integrado com Monaco Editor (`y-monaco`).

**Funcionalidades:**
- Edição Colaborativa (Monaco Editor)
- Cursores de Colaboradores
- Sincronização de Estado em Tempo Real
- Histórico de Versões (parcial)

### 3.8 Admin Service (Prisma)

**Localização:** `/cloud-web-app/web/app/api/admin/route.ts`

**Descrição:** APIs para funcionalidades administrativas, incluindo gerenciamento de usuários, planos, logs de auditoria e configurações do sistema. Utiliza Prisma para acesso ao banco de dados.

**Funcionalidades:**
- Gerenciamento de Usuários (CRUD)
- Gerenciamento de Planos e Assinaturas
- Acesso a Logs de Auditoria
- Configurações Globais do Sistema

---

## 4. DATA LAYER

### 4.1 PostgreSQL (Prisma ORM)

**Descrição:** Banco de dados relacional primário para persistência de dados estruturados. Gerenciado via Prisma ORM, que fornece um cliente de banco de dados type-safe e migrações. Inclui extensão `pgvector` para RAG.

**Uso:**
- Usuários, Projetos, Times
- Billing, Assinaturas, Transações
- Logs de Auditoria
- Vetores de Embeddings (para RAG)

### 4.2 Redis (Upstash/ioredis)

**Descrição:** Cache distribuído e message broker. Utilizado para caching de respostas de API, rate limiting, sessões de usuário e Pub/Sub para comunicação em tempo real.

**Uso:**
- Caching de Consultas Frequentes
- Rate Limiting Global
- Sessões de Usuário (NextAuth.js)
- Pub/Sub para WebSockets (Yjs)
- Fila de Background Jobs (BullMQ)

### 4.3 S3 / R2 (Cloudflare R2)

**Descrição:** Armazenamento de objetos escalável e durável para arquivos estáticos e assets gerados. Cloudflare R2 é compatível com a API S3, oferecendo latência baixa e custos reduzidos.

**Uso:**
- Assets de Games e Films (modelos 3D, texturas, vídeos)
- Imagens de Perfil, Thumbnails de Projeto
- Logs de Build, Artefatos de Deploy

### 4.4 Queue (BullMQ)

**Descrição:** Sistema de fila de background jobs para processamento assíncrono de tarefas que não precisam de resposta imediata. Utiliza Redis como backend.

**Uso:**
- Processamento de Imagens/Vídeos
- Geração de Builds Complexas
- Envio de Emails Transacionais
- Tarefas de Manutenção de Banco de Dados

---

## 5. INTEGRAÇÕES E FERRAMENTAS

- **Next.js 14.2.5:** Framework React para web applications.
- **TypeScript 5.6:** Linguagem de programação.
- **React 18:** Biblioteca JavaScript para UI.
- **Prisma 5.7:** ORM para Node.js e TypeScript.
- **NextAuth.js 5 (Auth.js):** Autenticação para Next.js.
- **@upstash/redis, ioredis:** Clientes Redis.
- **Monaco Editor 0.55.1:** Editor de código.
- **Three.js, @react-three/fiber:** Renderização 3D.
- **Yjs, y-monaco, y-websocket:** Colaboração em tempo real.
- **Stripe 16:** Processamento de pagamentos.
- **E2B 2.0.1:** Ambientes de execução isolados.
- **OpenAI 4.73, @anthropic-ai/sdk 0.30, @google/generative-ai 0.21:** Provedores de LLMs.
- **@xyflow/react:** UI para fluxos e diagramas.
- **Framer Motion, Sonner, Radix/Headless UI:** Bibliotecas de UI/UX.
- **Sentry 8.47:** Monitoramento de erros.
- **Resend:** Envio de emails transacionais.
- **i18next:** Internacionalização.
- **ESLint 9:** Linter de código.
- **xterm.js 5:** Terminal web.

---

## 6. CRÍTICAS E RESOLUÇÕES

### 6.1 Crítica #1 — Inconsistência Arquitetural Grave

**Problema:** O documento `9_BACKEND_SYSTEM_SPEC.md` descrevia uma arquitetura FastAPI + MongoDB + Kubernetes + Celery, enquanto o código real usa Next.js + Prisma + PostgreSQL.

**Resolução:** Este documento foi **completamente reescrito** para refletir a arquitetura real do Aethel Engine: Next.js (API Routes) + Prisma + PostgreSQL. O diagrama de serviços e a stack tecnológica foram atualizados para garantir 100% de alinhamento com o código base. Referências a FastAPI/MongoDB foram removidas.

### 6.2 Crítica #2 — Modelos de IA Desatualizados

**Problema:** `AI_SYSTEM_SPEC.md` especificava modelos de IA desatualizados (Claude 3.5 Sonnet, GPT-4o).

**Resolução:** A `AI_SYSTEM_SPEC.md` será atualizada na próxima fase para incluir os modelos mais recentes disponíveis em Março de 2026 (e.g., Claude 3.7 Sonnet, Claude 4 em desenvolvimento, GPT-4.5/5, Gemini 2.0 Flash/2.5). O router de modelos será ajustado para priorizar esses modelos e o `FALLBACK_CHAIN` será revisado para otimizar custo/performance.

---

## 7. PRÓXIMOS PASSOS (Roadmap)

Este documento serve como a nova fonte canônica para a arquitetura de backend. Os próximos passos incluem a atualização da especificação de IA, o fechamento dos gaps críticos de produto (Billing, Preview), a implementação de RAG e Storage, e a refatoração de código para garantir a máxima qualidade e alinhamento com o mercado L5.

