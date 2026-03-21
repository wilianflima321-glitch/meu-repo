# 09_BACKEND_SYSTEM_SPEC (LEGACY FILENAME)

## Especificacao do Sistema Backend

**Data:** 21 de Marco de 2026  
**Versao:** 3.0  
**Status:** Canonico e alinhado ao codigo real

---

## 1. Visao Geral

O backend real do Aethel Engine e centrado em `Next.js 14` com `App Router` e `API Routes`, usando:

- `Prisma` como camada de acesso a dados
- `PostgreSQL` como banco principal
- `Redis` para rate limiting, fila e estados operacionais
- `WebSocket` dedicado para colaboracao, terminal e streaming operacional

O sistema nao usa FastAPI, MongoDB ou Kubernetes como arquitetura principal. O contrato canonico atual e:

`Next.js API Routes + Prisma + PostgreSQL + Redis + WS`

---

## 2. Topologia Real

### 2.1 Servicos de runtime

1. **App web principal**
   - Local: `cloud-web-app/web`
   - Framework: `Next.js`
   - Porta de dev: `3000`
   - Responsabilidade: UI, rotas web, API routes, middleware, auth, billing, admin, IDE shell

2. **Servidor WebSocket**
   - Arquivo: `cloud-web-app/web/server/websocket-server.ts`
   - Porta padrao: `3001`
   - Stack: `ws`, `http`, `yjs`
   - Responsabilidade: colaboracao, terminal, LSP, AI streaming, DAP, export events

3. **Runtime server / bootstrap**
   - Arquivo: `cloud-web-app/web/lib/server/bootstrap.ts`
   - Responsabilidade: subir o servidor WS, file watcher, hot reload e terminal runtime

4. **Worker de fila**
   - Arquivo: `cloud-web-app/web/server/workers/build-queue-worker.ts`
   - Responsabilidade: consumir fila Redis para export/build jobs e atualizar estado no DB/Redis

### 2.2 Diagrama logico

```text
Browser / Studio UI
        |
        v
Next.js App Router + API Routes (port 3000)
        |
        +--> Prisma Client --> PostgreSQL
        |
        +--> Redis / Upstash / ioredis
        |
        +--> AI providers / billing / preview integrations
        |
        +--> Runtime orchestration APIs

Separate WebSocket Server (port 3001)
        |
        +--> Yjs collaboration
        +--> Terminal / PTY
        +--> LSP / DAP
        +--> AI streaming / export events

Build Queue Worker
        |
        +--> Redis queue state
        +--> Prisma persistence
        +--> Optional object storage upload
```

---

## 3. Stack Canonica

### 3.1 Core

- `next`: `^14.2.5`
- `react`: `^18.3.1`
- `typescript`: `^5.6.2`

### 3.2 Dados

- `@prisma/client`: `^5.7.0`
- `prisma`: `^5.7.0`
- Banco principal: `PostgreSQL` via `DATABASE_URL`

### 3.3 Redis e fila

- `@upstash/redis`: `^1.34.3`
- `@upstash/ratelimit`: `^2.0.5`
- `ioredis`: `^5.4.2`
- `redis`: `^4.7.1`

### 3.4 Realtime

- `ws`: `^8.18.0`
- `yjs`: `^13.6.18`
- `y-websocket`: `^2.0.4`
- `y-monaco`: `^0.1.6`

### 3.5 Integracoes de backend

- AI: `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`
- Billing: `stripe`
- Storage: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- Preview/runtime: `e2b`
- Observabilidade: `@sentry/nextjs`
- Email: `resend`

---

## 4. Camadas do Sistema

### 4.1 HTTP / API Layer

As APIs sao implementadas como `route.ts` em `cloud-web-app/web/app/api/**`.

Responsabilidades principais:

- autenticacao
- projetos
- arquivos e assets
- AI/chat/stream
- billing e webhooks
- analytics e telemetria
- admin e readiness
- preview/runtime
- health checks

Caracteristicas:

- `NextRequest` / `NextResponse`
- protecao via `middleware.ts`
- rate limiting na borda quando configurado
- respostas JSON e streaming conforme a rota

### 4.2 Auth Layer

O fluxo principal atual e **JWT own-auth**, nao NextAuth como dependencia operacional primaria.

Arquivos de referencia:

- `cloud-web-app/web/lib/auth-server.ts`
- `cloud-web-app/web/app/api/auth/login/route.ts`
- `cloud-web-app/web/middleware.ts`

Contrato atual:

- login gera JWT
- token pode ser enviado por `Authorization: Bearer`
- cookie `token` tambem e usado pelo middleware
- verificacao de auth e ownership acontece no servidor

Observacao:

- `next-auth` existe nas dependencias, mas o contrato real em uso para rotas core e JWT/cookie custom

### 4.3 Data Access Layer

Arquivo de referencia:

- `cloud-web-app/web/lib/db.ts`

Caracteristicas:

- singleton de `PrismaClient`
- evita multiplas instancias em dev
- toda persistencia principal usa Prisma + PostgreSQL

Modelos principais no schema:

- `User`
- `Session`
- `Project`
- `ProjectMember`
- `ChatThread`
- `CopilotWorkflow`
- `AuditLog`
- entidades de billing, suporte, usage e export

### 4.4 Redis Layer

Redis cumpre papeis diferentes no sistema:

1. **Rate limiting / edge enforcement**
   - usado no `middleware.ts`
   - backend preferencial: `Upstash Redis`

2. **Fila e estados operacionais**
   - arquivo: `cloud-web-app/web/lib/redis-queue.ts`
   - backend: `ioredis`
   - usado por worker de build/export

3. **Estados temporarios e sincronizacao**
   - export states
   - backlog/metrics de worker
   - chaves operacionais de runtime

### 4.5 WebSocket / Realtime Layer

Arquivo principal:

- `cloud-web-app/web/server/websocket-server.ts`

O servidor WS nao esta embutido nas API routes do Next. Ele roda como processo separado.

Tipos de conexao suportados:

- `collaboration`
- `terminal`
- `lsp`
- `ai`
- `dap`
- `export`
- `general`

Uso real:

- colaboracao com `Yjs`
- terminal streaming
- eventos de runtime e debugging
- AI streaming operacional

### 4.6 Runtime / Hot Reload Layer

Arquivo principal:

- `cloud-web-app/web/lib/server/bootstrap.ts`

Servicos iniciados:

- WebSocket server
- terminal manager
- file watcher
- hot reload manager

Esse runtime e parte da infraestrutura de preview/editor, nao substitui o app Next.js.

### 4.7 Worker Layer

Arquivo principal:

- `cloud-web-app/web/server/workers/build-queue-worker.ts`

Responsabilidades reais:

- consumir fila Redis `build-queue`
- processar export/build jobs
- atualizar status em Redis e PostgreSQL
- gerar artefatos ZIP/manifest
- fazer upload para storage quando configurado

---

## 5. Storage e Assets

O backend suporta storage compativel com S3.

Dependencias:

- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`

Uso real observado no worker:

- upload opcional de artefatos
- URLs de download/presign
- persistencia de arquivos exportados

Storage e integracao de suporte. Nao e o banco principal do produto.

---

## 6. Observabilidade e Seguranca

### 6.1 Middleware

Arquivo:

- `cloud-web-app/web/middleware.ts`

Funcoes reais:

- security headers
- CORS controlado
- rate limiting
- auth gate para paginas e APIs
- admin gate por role no token

### 6.2 Health e readiness

O backend usa endpoints HTTP de health/readiness em API routes e tambem expostos pelo servidor WS.

### 6.3 Audit e telemetria

As rotas admin/analytics/audit persistem eventos no banco.
O schema Prisma contem `AuditLog`, e o sistema grava eventos operacionais reais.

---

## 7. O que este documento substitui

Este documento substitui qualquer descricao anterior que falasse em:

- FastAPI como backend principal
- MongoDB como banco principal
- Kubernetes como camada obrigatoria
- Celery como worker principal
- arquitetura Python-first

Nada disso representa o contrato atual do repositorio.

---

## 8. Resumo Executivo

O backend atual do Aethel Engine e:

- **Node/TypeScript-first**
- **Next.js-first para HTTP e APIs**
- **Prisma + PostgreSQL para persistencia principal**
- **Redis para rate limiting, fila e estado operacional**
- **WebSocket dedicado para realtime**

Formula canonica:

`Next.js API Routes + Prisma + PostgreSQL + Redis + WS`

---

## 9. Arquivos de Referencia Canonicos

- `cloud-web-app/web/package.json`
- `cloud-web-app/web/prisma/schema.prisma`
- `cloud-web-app/web/lib/db.ts`
- `cloud-web-app/web/lib/auth-server.ts`
- `cloud-web-app/web/app/api/auth/login/route.ts`
- `cloud-web-app/web/middleware.ts`
- `cloud-web-app/web/server/websocket-server.ts`
- `cloud-web-app/web/lib/server/bootstrap.ts`
- `cloud-web-app/web/lib/redis-queue.ts`
- `cloud-web-app/web/server/workers/build-queue-worker.ts`

