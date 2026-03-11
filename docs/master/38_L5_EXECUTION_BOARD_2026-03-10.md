# 38_L5_EXECUTION_BOARD_2026-03-10
Status: ACTIVE MASTER TRACKING BOARD
Date: 2026-03-10
Owner: Platform + Product + UX + Growth

## 1) Objetivo
Centralizar todas as frentes, bloqueios e criterios de saida para levar o Aethel de L3 -> L4 -> L5 sem inflar claims.

Este documento e o checkpoint unico para:
- P0/P1/P2/P3 prioritizados,
- evidencias requeridas para promocao L4/L5,
- credenciais e preflights necessarios,
- ordem canonica de execucao.

## 2) Score Dashboard (factual)
| Dimensao | Score Atual | Meta L4 | Meta L5 | Issue | Status |
|---|---:|---:|---:|---|---|
| Codigo / Qualidade | 9.5 | 9.5 | 9.5 | — | ACTIVE |
| Governanca | 10.0 | 10.0 | 10.0 | — | ACTIVE |
| Arquitetura | 8.7 | 9.0 | 9.5 | — | PARTIAL |
| Core Loop / L4 | 3.0 | 8.0 | 9.5 | P0-01 | BLOCKED |
| Preview / Sandbox | 5.4 | 8.0 | 9.0 | P0-02 | PARTIAL |
| Billing / Stripe | 2.0 | 8.0 | 9.0 | P0-03 | PARTIAL |
| Marketing / GTM | 1.5 | 6.0 | 8.0 | P1-01 | ABSENT |
| Onboarding | 5.2 | 8.0 | 9.0 | P1-02 | PARTIAL |
| RAG + @mentions | 4.0 | 7.5 | 9.5 | P1-03 | PARTIAL |
| UX / Design System | 7.5 | 8.5 | 9.5 | P1-04 | PARTIAL |
| Deploy + Infra | 5.4 | 8.0 | 9.0 | P1-05 | PARTIAL |
| Mobile + A11y | 5.7 | 8.0 | 9.0 | P1-06 | PARTIAL |
| Security / Compliance | 6.5 | 7.5 | 9.0 | P2-01 | PARTIAL |
| Research Agent | 6.0 | 7.5 | 9.0 | P2-02 | PARTIAL |
| Films | 4.2 | — | 7.0 | P3-01 | FROZEN |
| Games | 3.5 | — | 7.0 | P3-02 | FROZEN |
| Media Geral | 6.2 | 8.0 | 9.2 | — | BLOCKED |

## 3) P0 — Bloqueadores Criticos (fazer primeiro)
### P0-01 Core Loop Production Evidence
- Objetivo: `sampleSize >= 100`, `successRate > 0.90`, `feedbackCoverage >= 0.60`.
- Evidencia: `metrics/latest_run-production.json` + `/api/admin/ai/readiness`.
- Preflight necessario:
  - Docker ativo
  - `.env.local` real
  - `DATABASE_URL` funcional
  - `JWT_SECRET` + `CSRF_SECRET`
  - app em `npm run dev`
- Ferramentas:
  - `npm run qa:production-runtime-readiness`
  - `npm run qa:core-loop-production-probe -- --runs 50`

### P0-02 Preview Runtime + HMR Real (E2B)
- Estado: provisionamento E2B wired, sync completo e sync por arquivo implementados.
- Bloqueio: token real + HMR/WS e politicas de allowlist.
- Required:
  - `E2B_API_KEY`
  - `AETHEL_PREVIEW_E2B_TEMPLATE` (ex: `nodejs`)
  - `AETHEL_PREVIEW_E2B_PORT` (ex: `3000`)
  - `AETHEL_PREVIEW_ALLOWED_HOSTS` (ex: `.e2b.app`)

### P0-03 Billing Stripe Completo
- Estado: rotas existentes + readiness + portal, runtime parcial.
- Bloqueio: credenciais Stripe reais + webhook ativo.
- Required:
  - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_*` (starter/basic/pro/studio/enterprise)

## 4) P1 — Alta Prioridade (iniciar apos P0)
### P1-01 Marketing / GTM
- Landing hero + video demo
- Pricing com comparativo e CTAs
- SEO pillars + Product Hunt

### P1-02 Onboarding < 90s
- Demo mode explicito
- Wizard 3 passos
- Templates de dominio
- SLO P50/P95 com telemetria real

### P1-03 RAG + @mentions
- `@Codebase` com pgvector persistente
- `@Docs`, `@Diff`, `@Error` completos
- Fuzzy search < 50ms

### P1-04 UX / Design System
- Tokens semanticos (motion/spacing/type)
- Empty states + skeletons
- Command palette premium

### P1-05 Deploy + Observabilidade
- Deploy one-click (Vercel/Railway)
- Web vitals baselines publicas
- Logging estruturado + health checks

### P1-06 Mobile + WCAG
- Landing + dashboard mobile-first
- Nexus Chat fullscreen mobile
- Axe CI + contrastes light/dark

## 5) P2 — Media Prioridade
### P2-01 Security + Compliance
- Vault criptografia em repouso
- SSO/SAML/OIDC
- Docs GDPR/SOC2
- Bug bounty / security.txt

### P2-02 Research Premium
- Citacoes inline
- Live retrieval
- Export MD/PDF
- Loop research -> code -> deploy visivel

## 6) P3 — Congelado ate Apps L4
### P3-01 Films L2 -> L3
- Kling/Runway, continuidade, NLE basico, export

### P3-02 Games L2 -> L3
- Meshy, Rapier, XState, export

## 7) Criterios de Saida L4
Obrigatorios:
1. `production.sampleSize >= 100`
2. `apply.successRate > 0.90`
3. `regression.rate < 0.05`
4. `learn.feedbackCoverage >= 0.60`
5. Preview managed + HMR funcional
6. Billing checkout + webhook real
7. Onboarding P50 < 90s (evidencia)
8. `qa:enterprise-gate` verde
9. Dossier publicado

## 8) Criterios de Saida L5
Além de L4:
1. Side-effects approval-gated
2. Credentials isoladas (vault)
3. Browser/runtime automation em sandbox
4. RAG production-grade com pgvector
5. Billing enterprise com usage caps
6. SSO/SAML funcional
7. SOC2 Type I iniciado
8. Evidence continua (nao pontual)

## 9) Ordem Canonica de Execucao
1. P0: Core evidence + Preview + Billing
2. P1: Onboarding + RAG + UX + Deploy + Mobile/A11y
3. L4 Exit + Marketing
4. P2: Security + Research
5. P3: Games + Films

## 10) Notas de Alinhamento (2026-03-10)
- Preview E2B agora suporta provisionamento direto, sync completo e sync por arquivo.
- CLI de probe agora suporta `--runs 50` para atingir sample size com menos waves.
- Readiness continua bloqueando promocao sem runtime real.

## 11) Regras Imutaveis
1. Sem fake-success.
2. Sem claim L4/L5 sem evidencia.
3. Games/Films congelados ate Apps L4.
4. Demo sempre rotulado como demo.
5. Usar labels: ABSENT/PARTIAL/BLOCKED/ACTIVE.
