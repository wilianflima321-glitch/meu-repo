# 24_MAXIMUM_CLOSURE_BACKLOG_2026-02-19
Status: ACTIONABLE BACKLOG (POST-WAVE)
Owner: PM Tecnico + Plataforma + Agente Critico

## 0) Purpose
Consolidar o que ainda falta para fechamento de fase com qualidade enterprise, sem expandir escopo de negocio.

## 1) Baseline factual desta rodada
1. Branch ativa: `add-report-summary`.
2. Interface gate: PASS com trilha dupla de `NOT_IMPLEMENTED`:
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`
- `not-implemented-ui=6`
- `not-implemented-noncritical=2`
3. Deltas canônicos continuam `PARTIAL_INTERNAL` até rerun completo de gates enterprise.

## 2) P0 de fechamento (bloqueadores)
### P0-01 Consolidacao final de gates
1. Rodar e anexar evidencias de:
- `lint`
- `typecheck`
- `build`
- `qa:interface-gate`
- `qa:canonical-components`
- `qa:route-contracts`
- `qa:critical-rate-limit`
- `qa:no-fake-success`
- `qa:mojibake`
- `qa:enterprise-gate`
2. Atualizar `10` e `22` removendo status parcial onde houver evidencia fechada.

### P0-02 Validacao operacional de rate limiting em deploy
1. Confirmar Upstash ativo em ambiente de producao (nao apenas fallback local).
2. Registrar resultado no runbook e contrato mestre.
Arquivos:
- `audit dicas do emergent usar/19_RUNTIME_ENV_WARNING_RUNBOOK_2026-02-17.md`
- `audit dicas do emergent usar/10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md`

### P0-03 Trilha de capacidades `NOT_IMPLEMENTED` critica
1. Manter os 6 endpoints criticos explicitamente gated, sem CTA enganoso.
2. Se qualquer endpoint migrar para implementado, atualizar scanner e matriz de capability.
Arquivos:
- `cloud-web-app/web/app/api/ai/chat/route.ts`
- `cloud-web-app/web/app/api/ai/complete/route.ts`
- `cloud-web-app/web/app/api/ai/action/route.ts`
- `cloud-web-app/web/app/api/ai/inline-completion/route.ts`
- `cloud-web-app/web/app/api/ai/inline-edit/route.ts`
- `cloud-web-app/web/app/api/render/jobs/[jobId]/cancel/route.ts`

## 3) P1 imediato (alto impacto)
### P1-01 Persistencia dedicada de Studio Session
1. Migrar estado de sessao/tarefas/runs/custos para tabelas dedicadas.
2. Reduzir risco de concorrencia e perda de estado em sessoes longas.
Arquivos-alvo:
- `cloud-web-app/web/lib/server/studio-home-store.ts`
- `cloud-web-app/web/prisma/schema.prisma`
- `cloud-web-app/web/app/api/studio/**/route.ts`

### P1-02 Telemetria de cutoff legado por ciclo
1. Publicar painel/relatorio de consumo para rotas `410`.
2. Manter criterio de remocao: `0 consumo por 14 dias + 0 consumo frontend`.
Arquivos:
- `cloud-web-app/web/lib/server/compatibility-route-telemetry.ts`
- `audit dicas do emergent usar/10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md`

### P1-03 Consolidacao de componentes duplicados
1. Revisar e convergir duplicidades de superficie para reduzir drift:
- `components/Breadcrumbs.tsx` vs `components/editor/Breadcrumbs.tsx`
- `components/GitPanel.tsx` vs `components/git/GitPanel.tsx`
- `components/OutputPanel.tsx` vs `components/output/OutputPanel.tsx`
- `components/QuickOpen.tsx` vs `components/explorer/QuickOpen.tsx`
- `components/assets/ContentBrowser.tsx` vs `components/engine/ContentBrowser.tsx`

### P1-04 Hardening de visual regression pipeline
1. Remover caminho de "compare skip" quando baseline nao existir; exigir baseline oficial por branch/pipeline.
Arquivos:
- `.github/workflows/visual-regression-compare.yml`
- `.github/workflows/ui-audit.yml`

## 4) P2 (sem prometer nessa fase)
1. Readiness gate de colaboracao avancada (locks, conflitos, reconexao, SLO).
2. Gate formal de promocao L4/L5 com evidencia operacional reproduzivel.
3. Expansao de media/3D somente dentro dos limites documentados em `LIMITATIONS.md`.

## 5) Regras de execucao
1. Sem fake success.
2. Sem bypass de gates.
3. Sem claim acima de evidencia.
4. Toda mudanca deve atualizar `10`, `13`, `14`, `17`, `21`, `22` quando impactar contrato.
