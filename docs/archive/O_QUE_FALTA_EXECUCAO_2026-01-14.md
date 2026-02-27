# O que falta (execução) — 2026-01-14

Objetivo: lista **direta e acionável** do que ainda falta para deixar o **Export end-to-end** realmente funcional e operável (produção/staging/dev), com **Impacto/Esforço** e evidência.

> Status atual (já existe no repo):
> - API de export **enfileira** e grava status no Redis.
> - Endpoint de status por `exportId` já existe.
> - Worker agora conclui um **export mínimo funcional** (gera ZIP e marca `completed`).
> - Fila já tem **processing queue + ack** (menos risco de “sumir job” em crash, mas ainda falta reaper/timeout).
> - Compose (dev/prod) e K8s base agora incluem worker.

---

## P0 — Bloqueadores (precisa para “Export funciona de verdade”)

### P0.1 Implementar processamento REAL no worker (não pode ser stub)
- **Status:** implementado um **MVP funcional** (gera ZIP com metadata + faz upload S3/MinIO quando disponível ou fallback local em `public/exports`).
- **Evidências:**
  - Producer grava status no Redis: [cloud-web-app/web/app/api/projects/[id]/export/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/route.ts#L207-L214)
  - Producer enfileira em `build-queue`: [cloud-web-app/web/app/api/projects/[id]/export/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/route.ts#L215)
  - Worker processa export e marca `completed`: [cloud-web-app/web/server/workers/build-queue-worker.ts](cloud-web-app/web/server/workers/build-queue-worker.ts#L242-L279)
  - Worker gera ZIP mínimo: [cloud-web-app/web/server/workers/build-queue-worker.ts](cloud-web-app/web/server/workers/build-queue-worker.ts#L171-L215)
- **Tarefas:**
  - Evoluir de “ZIP mínimo” para export real por plataforma (web/windows/etc).
  - Integrar assets do projeto no pacote (hoje é metadata).
- **DoD:** export por plataforma gera artefato final esperado (não só metadata).
- **Impacto:** 5/5
- **Esforço:** 4/5

### P0.2 Tornar a fila “reliable” (evitar perda de job)
- **Problema:** se não existir *processing queue* + ack + requeue, queda/restart pode gerar job preso/perdido.
- **Status:** implementado **processing queue + ack + reaper/timeout** (requeue de travados) e **retry/backoff** (delayed queue) para reduzir “cemitério” e falhas transitórias.
- **Evidências:**
  - Worker move job para processing (BRPOPLPUSH): [cloud-web-app/web/server/workers/build-queue-worker.ts](cloud-web-app/web/server/workers/build-queue-worker.ts#L121-L132)
  - Worker faz ack (LREM): [cloud-web-app/web/server/workers/build-queue-worker.ts](cloud-web-app/web/server/workers/build-queue-worker.ts#L166-L172)
- **Evidências (novo):**
  - Reaper/timeout + requeue de processing: [cloud-web-app/web/server/workers/build-queue-worker.ts](cloud-web-app/web/server/workers/build-queue-worker.ts)
  - Retry/backoff com delayed queue (ZSET): [cloud-web-app/web/server/workers/build-queue-worker.ts](cloud-web-app/web/server/workers/build-queue-worker.ts)
- **Tarefas (opção A — continuar Redis list):**
  - Garantir idempotência forte por `exportId` (não duplicar upload/status em cenários de múltiplos workers).
  - Definir limites/SLAs (timeouts, tentativas) via env vars e documentar.
  - **Env vars (implementadas no worker):** `BUILD_QUEUE_MAX_ATTEMPTS`, `BUILD_QUEUE_PROCESSING_TIMEOUT_MS`, `BUILD_QUEUE_REAPER_INTERVAL_MS`, `BUILD_QUEUE_RETRY_BASE_DELAY_MS`.
- **Tarefas (opção B — migrar p/ BullMQ):**
  - Migrar producer para `aethel:export` e usar worker BullMQ com retries/backoff.
- **DoD:** queda/restart do worker não perde export.
- **Impacto:** 5/5
- **Esforço:** 4/5

### P0.3 Artefatos + downloadUrl (S3/MinIO) no fluxo de export
- **Status:** implementado upload via S3/MinIO quando disponível; fallback local para Compose via `public/exports`.
- **Evidências:** endpoint retorna `websocketUrl` externo (build farm): [cloud-web-app/web/app/api/projects/[id]/export/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/route.ts#L250)
- **Tarefas:**
  - Garantir que **K8s** use S3/MinIO (não há volume compartilhado web<->worker por padrão).
  - Criar limpeza de artefatos expirados (lifecycle no bucket).
- **DoD:** sempre existe `downloadUrl` válido em prod/staging e artefato expira corretamente.
- **Impacto:** 5/5
- **Esforço:** 3/5

### P0.4 Publicar e versionar a imagem do worker no CI/CD (K8s)
- **Problema:** no K8s o worker referencia `ghcr.io/aethel-engine/worker:*`, mas hoje só existe build local no Compose.
- **Evidências:**
  - Dockerfile tem target `worker`: [cloud-web-app/web/Dockerfile](cloud-web-app/web/Dockerfile#L86-L110)
  - K8s usa imagem separada `worker`: [cloud-web-app/k8s/base/worker-deployment.yaml](cloud-web-app/k8s/base/worker-deployment.yaml#L35)
  - Base registra imagem do worker: [cloud-web-app/k8s/base/kustomization.yaml](cloud-web-app/k8s/base/kustomization.yaml#L29)
  - Overlays também esperam worker: [cloud-web-app/k8s/overlays/production/kustomization.yaml](cloud-web-app/k8s/overlays/production/kustomization.yaml#L29) e [cloud-web-app/k8s/overlays/staging/kustomization.yaml](cloud-web-app/k8s/overlays/staging/kustomization.yaml#L29)
- **Tarefas (escolha 1 — imagem separada):**
  - Ajustar pipeline para build/push: `docker build -f cloud-web-app/web/Dockerfile --target worker -t ghcr.io/aethel-engine/worker:<tag> cloud-web-app/web`.
  - Versionar tags no deploy (prod/staging).
- **Tarefas (escolha 2 — reutilizar imagem web):**
  - Trocar Deployment do worker para usar `ghcr.io/aethel-engine/web` e sobrescrever `command`/`args`.
- **DoD:** `kubectl rollout` sobe worker e ele consome jobs.
- **Impacto:** 5/5
- **Esforço:** 2/5

### P0.5 Corrigir contrato “build farm externa vs worker interno”
- **Problema:** a API sempre devolve `wss://build.aethel.io/...` (externo), mas agora existe worker interno; precisa de decisão.
- **Evidências:** retorno do WS externo: [cloud-web-app/web/app/api/projects/[id]/export/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/route.ts#L250)
- **Tarefas:**
  - Definir estratégia oficial:
    - (A) build farm externa é real → documentar e garantir fallback/health.
    - (B) worker interno é a fonte de verdade → trocar para WS interno (ou remover WS e usar polling).
- **DoD:** front sabe onde ouvir status (sem “fantasma externo”).
- **Impacto:** 4/5
- **Esforço:** 2/5

---

## P1 — Produção/Confiabilidade (logo em seguida)

### P1.0 Retry manual (operacional)
- **Problema:** sem retry manual, exports `failed` ficam “mortos” sem caminho oficial de recuperação.
- **Status:** implementado endpoint de retry que re-enfileira o job e reseta estado.
- **Evidências:** [cloud-web-app/web/app/api/projects/[id]/export/[exportId]/retry/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/%5BexportId%5D/retry/route.ts)
- **DoD:** usuário consegue apertar “Retry” no frontend e o job volta para `queued`.
- **Impacto:** 4/5
- **Esforço:** 1/5

### P1.1 Validar e padronizar REDIS_URL no K8s (auth)
- **Problema:** `secrets.template.yaml` define `REDIS_URL` sem senha, mas em prod o Redis pode exigir auth.
- **Evidências:** template atual: [cloud-web-app/k8s/base/secrets.template.yaml](cloud-web-app/k8s/base/secrets.template.yaml#L15)
- **Tarefas:**
  - Padronizar `REDIS_URL` (com senha quando aplicável) e alinhar com o runtime real.
  - (Se usar Redis gerenciado) remover `UPSTASH_*` “fantasma” ou documentar.
- **Impacto:** 4/5
- **Esforço:** 1/5

### P1.2 Unificar env vars de Storage (S3_BUCKET vs AWS_S3_BUCKET)
- **Problema:** health/admin checa `AWS_S3_BUCKET`, mas Compose prod usa `S3_BUCKET`.
- **Evidências:**
  - Admin status usa `AWS_S3_BUCKET`: [cloud-web-app/web/app/api/admin/infrastructure/status/route.ts](cloud-web-app/web/app/api/admin/infrastructure/status/route.ts#L109)
  - Compose prod configura `S3_BUCKET`: [docker-compose.prod.yml](docker-compose.prod.yml#L102-L111)
- **Tarefas:**
  - Definir padrão (ex.: `S3_BUCKET`) e suportar alias compatível.
  - Atualizar checks, docs e exemplos `.env`.
- **Impacto:** 3/5
- **Esforço:** 1/5

> Nota: o check de Storage já foi ajustado para aceitar `S3_BUCKET` **ou** `AWS_S3_BUCKET`.

### P1.3 Observabilidade do worker
- **Problema:** sem métricas/trace, export vira “caixa preta”.
- **Tarefas:**
  - Log estruturado por `exportId` (correlation id).
  - Contadores de sucesso/falha, duração por etapa, backlog size.
  - Alarmes básicos (falhas consecutivas, fila crescendo).
- **Impacto:** 4/5
- **Esforço:** 2/5

### P1.4 Graceful shutdown / drain
- **Problema:** interrupção pode deixar status inconsistente.
- **Tarefas:**
  - Capturar SIGTERM, finalizar job atual (ou marcar “retryable”) e sair.
  - Se usar processing queue (P0.2), requeue seguro.
- **Impacto:** 4/5
- **Esforço:** 2/5

---

## P2 — Produto/UX (importante, mas não bloqueia o worker)

### P2.1 Frontend ainda tem export mock
- **Evidências:** retorna `dummy video data`: [cloud-web-app/web/components/export/ExportSystem.tsx](cloud-web-app/web/components/export/ExportSystem.tsx#L640)
- **Tarefas:**
  - Trocar mock por consumo real do status (`GET /export/[exportId]`) + download.
  - UX: estimativa, tempo restante, logs resumidos, botão retry.
- **Impacto:** 4/5
- **Esforço:** 3/5

### P2.2 Engine facade ainda não está wired para export de vídeo
- **Evidências:** `throw new Error('Video export not wired...')`: [cloud-web-app/web/lib/aethel-engine.ts](cloud-web-app/web/lib/aethel-engine.ts#L338-L339)
- **Tarefas:**
  - Conectar facade ao encoder real ou remover comando/feature flag.
- **Impacto:** 3/5
- **Esforço:** 2/5

---

## O que já foi resolvido (para não repetir)
- Endpoint de status por exportId: [cloud-web-app/web/app/api/projects/[id]/export/[exportId]/route.ts](cloud-web-app/web/app/api/projects/%5Bid%5D/export/%5BexportId%5D/route.ts)
- Worker no Compose dev: [docker-compose.yml](docker-compose.yml#L79-L90)
- Worker no Compose prod: [docker-compose.prod.yml](docker-compose.prod.yml#L86-L131)
- Worker no K8s base: [cloud-web-app/k8s/base/worker-deployment.yaml](cloud-web-app/k8s/base/worker-deployment.yaml)
- Base registra worker: [cloud-web-app/k8s/base/kustomization.yaml](cloud-web-app/k8s/base/kustomization.yaml#L19)
