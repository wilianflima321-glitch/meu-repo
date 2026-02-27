# Action Plan (Next Steps) — 2026-01-14

Este documento é um **plano de execução** (backlog técnico) baseado nas evidências mais recentes encontradas no repositório. Ele **não** substitui a auditoria final (Docs 1–10) — é um “o que fazer agora” para fechar gaps críticos de produção.

## TL;DR — Gaps críticos (alto impacto)

1) **Export server-side está “enqueue-only”** e aponta para um build farm externo (`wss://build.aethel.io/...`) sem consumer no stack local (Compose/K8s).
2) **Endpoint de status do export prometido não existe**, mas o `statusUrl` é retornado.
3) **BullMQ/Redis/S3 são opcionais (lazy-load)** e podem ficar silenciosamente “desligados” em produção, causando features fantasmas.
4) **Export no frontend é mock** (`dummy video data`) e o facade do engine declara que export não está wired.

---

## A. Export end-to-end (build farm / artifacts)

### A1) Criar o endpoint real de status: `GET /api/projects/[id]/export/[exportId]`
- **Problema:** o comentário documenta um endpoint de status por `exportId`, mas só existe `POST` e `GET` (lista).
- **Evidências:**
  - Comentário promete `GET /api/projects/[id]/export/[exportId]` em [cloud-web-app/web/app/api/projects/[id]/export/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/route.ts#L11)
  - Só existem handlers `POST` e `GET` (lista) em [cloud-web-app/web/app/api/projects/[id]/export/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/route.ts#L113) e [cloud-web-app/web/app/api/projects/[id]/export/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/route.ts#L269)
  - `statusUrl` devolvido aponta para `/export/${exportId}` em [cloud-web-app/web/app/api/projects/[id]/export/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/route.ts#L249)
- **Tarefas:**
  - Criar pasta/rota `app/api/projects/[id]/export/[exportId]/route.ts` com `GET` que:
    - valida auth/permissão
    - consulta Prisma (`exportJob`) + Redis (`export:${id}`) para progress/currentStep
    - normaliza resposta e códigos (404 quando não existe / 403 sem permissão)
  - Alternativa: ajustar o `statusUrl` para apontar para endpoint que existe (menos ideal, porque o contrato já foi publicado).
- **Impacto:** 5/5 (contrato quebrado / UX)
- **Esforço:** 2/5

### A2) Fechar o consumer do export (processar `build-queue` ou BullMQ)
- **Problema:** o `POST` enfileira em Redis list `build-queue` e retorna WS em domínio externo. Não existe consumer/worker no repo/stack local (Compose/K8s) para consumir `build-queue`.
- **Evidências:**
  - Enqueue em Redis list `build-queue`: [cloud-web-app/web/app/api/projects/[id]/export/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/route.ts#L215)
  - `statusUrl` e `websocketUrl` externo: [cloud-web-app/web/app/api/projects/[id]/export/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/route.ts#L249) e [cloud-web-app/web/app/api/projects/[id]/export/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/route.ts#L250)
  - Compose dev não tem worker (só postgres/redis/web/nginx): [docker-compose.yml](docker-compose.yml#L11) … [docker-compose.yml](docker-compose.yml#L75)
  - Compose prod não tem worker (web+runtime+minio etc., sem build-worker): [docker-compose.prod.yml](docker-compose.prod.yml#L6) … [docker-compose.prod.yml](docker-compose.prod.yml#L101)
  - K8s base só deploya web/runtime (sem worker): [cloud-web-app/k8s/base/kustomization.yaml](cloud-web-app/k8s/base/kustomization.yaml#L13-L18)
- **Decisão obrigatória (arquitetura):** escolher UM caminho:
  1) **Aethel Build Farm externo** (build.aethel.io) é um sistema separado (fora do repo): então o repo precisa explicitar isso e fornecer mocks/healthchecks/contratos.
  2) **Worker interno no repo**: implementar deployment + consumer que processa jobs.
- **Tarefas (se for worker interno):**
  - Criar um processo/entrypoint de worker (ex.: `cloud-web-app/web/server/workers/export-worker.ts`).
  - Adicionar serviço `worker` no `docker-compose.yml` e `docker-compose.prod.yml`.
  - Adicionar `worker-deployment.yaml` no K8s (base + overlays) e HPA se necessário.
  - Implementar protocolo de atualização de status em `redis.set(export:${id})` e persistência em `prisma.exportJob`.
  - Implementar upload do artefato (S3/MinIO) e emitir `downloadUrl` + `expiresAt`.
- **Impacto:** 5/5 (feature core não finaliza)
- **Esforço:** 4/5

### A3) Unificar o sistema de filas (Redis list vs BullMQ)
- **Problema:** hoje export usa **Redis list** (`build-queue`), enquanto existe um **Queue System BullMQ** com fila `aethel:export` e helper `queueProjectExport`.
- **Evidências:**
  - BullMQ queue helper export: [cloud-web-app/web/lib/queue-system.ts](cloud-web-app/web/lib/queue-system.ts#L463-L466)
  - Export API usa Redis list `build-queue`: [cloud-web-app/web/app/api/projects/[id]/export/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/route.ts#L215)
- **Tarefas:**
  - Decidir: (a) migrar export API para BullMQ (`queueProjectExport`) **ou** (b) remover BullMQ e padronizar em Redis list.
  - Se migrar para BullMQ: criar worker com `registerWorker(QUEUE_NAMES.EXPORT, ...)` e um processor `export:project`.
  - Se ficar em Redis list: documentar formato do payload e escrever consumer robusto (retry/backoff/idempotência).
- **Impacto:** 4/5 (complexidade e inconsistência operacional)
- **Esforço:** 3/5

---

## B. BullMQ/Redis: “feature flags implícitas” por dependência opcional

### B1) Tornar BullMQ/IORedis explícitos (ou declarar “não suportado”)
- **Problema:** `queue-system` desliga silenciosamente se `bullmq/ioredis` não estiverem instalados.
- **Evidências:**
  - “Queue features disabled”: [cloud-web-app/web/lib/queue-system.ts](cloud-web-app/web/lib/queue-system.ts#L35)
  - “Redis/BullMQ not available”: [cloud-web-app/web/lib/queue-system.ts](cloud-web-app/web/lib/queue-system.ts#L196)
  - Quando indisponível: não enfileira job: [cloud-web-app/web/lib/queue-system.ts](cloud-web-app/web/lib/queue-system.ts#L242)
  - Quando indisponível: não registra worker: [cloud-web-app/web/lib/queue-system.ts](cloud-web-app/web/lib/queue-system.ts#L279)
- **Tarefas:**
  - Se a fila for requisito de produto: adicionar `bullmq` e `ioredis` como dependências obrigatórias e falhar hard no boot se Redis não estiver acessível.
  - Se a fila for opcional de verdade: adicionar feature flag explícita e UX “degradado” claro (admin/status, UI, logs).
- **Impacto:** 4/5 (confiabilidade/operabilidade)
- **Esforço:** 2/5

### B2) Corrigir `infrastructure/status` para não quebrar quando fila está desabilitada
- **Problema:** a rota chama `queueManager.getAllStats()` — se o QueueManager não inicializar filas (por deps ausentes), `getQueueStats` tende a falhar.
- **Evidências:**
  - Uso: [cloud-web-app/web/app/api/admin/infrastructure/status/route.ts](cloud-web-app/web/app/api/admin/infrastructure/status/route.ts#L128)
- **Tarefas:**
  - Antes de ler stats, checar `await queueManager.isAvailable()` e retornar stats “disabled”.
  - Ajustar shape: o código consome `stats.paused` mas `getAllStats()` retorna `{ waiting, active, completed, failed, delayed }`.
- **Impacto:** 3/5 (observabilidade/admin quebra)
- **Esforço:** 1/5

### B3) Padronizar variáveis de ambiente de S3
- **Problema:** infra status checa `AWS_S3_BUCKET`, mas o `s3-client` usa `S3_BUCKET`.
- **Evidências:**
  - `S3_BUCKET`: [cloud-web-app/web/lib/storage/s3-client.ts](cloud-web-app/web/lib/storage/s3-client.ts#L21)
  - `AWS_S3_BUCKET`: [cloud-web-app/web/app/api/admin/infrastructure/status/route.ts](cloud-web-app/web/app/api/admin/infrastructure/status/route.ts#L109)
- **Tarefas:**
  - Unificar (ex.: usar `S3_BUCKET` em todos os lugares ou suportar ambos com precedence).
  - Validar `.env.example` e docs.
- **Impacto:** 3/5
- **Esforço:** 1/5

### B4) Redis cache fallback: definir postura em produção
- **Problema:** `redis-cache` cai para memória se `ioredis` não existir (isso muda comportamento de rate limit/sessões/cache).
- **Evidências:**
  - “in-memory fallback”: [cloud-web-app/web/lib/redis-cache.ts](cloud-web-app/web/lib/redis-cache.ts#L31)
  - `SKIP_REDIS=true` força fallback: [cloud-web-app/web/lib/redis-cache.ts](cloud-web-app/web/lib/redis-cache.ts#L190)
- **Tarefas:**
  - Em produção: ou (a) tornar Redis obrigatório, ou (b) declarar explicitamente quais features degradam e como.
- **Impacto:** 4/5
- **Esforço:** 2/5

---

## C. Export no frontend / engine: mock vs implementação real

### C1) Trocar export UI mock por pipeline real
- **Problema:** `ExportSystem` simula encoding e retorna `dummy video data`.
- **Evidência:** [cloud-web-app/web/components/export/ExportSystem.tsx](cloud-web-app/web/components/export/ExportSystem.tsx#L640)
- **Tarefas:**
  - Decidir estratégia: (a) export no browser via WebCodecs (para vídeos), (b) export server-side (para builds executáveis/zip), ou híbrido.
  - Se browser: usar `cloud-web-app/web/lib/video-encoder-real.ts` como base e integrar com render loop + mux.
  - Se server-side: UI deve só iniciar job e acompanhar status via endpoint/WS.
- **Impacto:** 4/5
- **Esforço:** 3/5

### C2) Wiring do facade do engine para export de vídeo
- **Problema:** o facade explícito joga erro: “not wired”.
- **Evidência:** [cloud-web-app/web/lib/aethel-engine.ts](cloud-web-app/web/lib/aethel-engine.ts#L339)
- **Tarefas:**
  - Implementar `exportVideo(duration, config)` chamando encoder real e capturando frames.
  - Definir compatibilidade (codec support, fallback) e limites (resolução/duração).
- **Impacto:** 3/5
- **Esforço:** 4/5

---

## D. Infra: adicionar o “terceiro plano” (worker/build) oficialmente

### D1) Docker: adicionar serviço worker
- **Problema:** sem worker, `build-queue` nunca é consumida no stack local.
- **Evidências:** [docker-compose.yml](docker-compose.yml#L11) … [docker-compose.yml](docker-compose.yml#L75)
- **Tarefas:**
  - Criar `Dockerfile` target `worker` (ou reutilizar `runtime` com CMD diferente).
  - Criar script `npm run worker:export` / `npm run worker:queues`.
  - Implementar healthcheck e logs.
- **Impacto:** 5/5
- **Esforço:** 3/5

### D2) K8s: criar deployment de worker
- **Problema:** K8s base/overlays não têm worker.
- **Evidências:** [cloud-web-app/k8s/base/kustomization.yaml](cloud-web-app/k8s/base/kustomization.yaml#L13-L18)
- **Tarefas:**
  - Adicionar `worker-deployment.yaml` + ServiceAccount + HPA (se aplicável).
  - Separar recursos/limits (CPU alto, memória, eventualmente GPU se export/render exigir).
- **Impacto:** 5/5
- **Esforço:** 3/5

---

## E. Continuação da auditoria técnica (próximos blocos)

### E1) Pipeline AAA (render)
- **Tarefas:**
  - Provar wiring end-to-end: canvas → renderer → frame loop → postprocess → profiling.
  - Identificar stubs vs implementações (ex.: onde `AAARenderSystem` de fato é instanciado).
  - Definir budgets (frame time, VRAM) e fallback (WebGL/WebGPU).
- **Impacto:** 4/5
- **Esforço:** 3/5

### E2) Engine de rendering no Theia fork
- **Tarefas:**
  - Auditar o “engine/editor” (Theia fork) para: perf (Monaco/LSP), extensões, sandboxing e superfícies de segurança.
- **Impacto:** 3/5
- **Esforço:** 4/5

---

## F. Sugestão de ordem de execução (rápido → destrava produto)

1) Implementar endpoint de status do export (A1) + corrigir contrato (`statusUrl`).
2) Decidir arquitetura de fila (A3) e criar worker mínimo (A2/D1/D2).
3) Fechar artifacts (upload + downloadUrl) e observabilidade.
4) Trocar export UI de mock → real (C1) alinhado com (A2).
5) Retomar AAA/WebGPU e Theia.
