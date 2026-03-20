# 42_RELATORIO_COMPLETO_PENDENCIAS_2026-03-20.md

**Documento:** Relatório Completo de Pendências e Críticas (baseado em evidências do repositório)  
**Data:** 2026-03-20  
**Status:** Atualizado conforme métricas reais e código em `main`

---

## 1) Resumo Executivo (com evidência)

- **L4 Evidence:** `metrics/latest_run-production.json` mostra **sampleSize=115**, **successRate=1.0** e **feedbackCoverage=0.8957** (gerado em 2026-03-14).  
- **Dossier L4:** `metrics/l4-readiness-dossier.json` está **PARTIAL** com bloqueadores externos (Stripe/E2B/DB).  
- **Gates de Código:** `npm run typecheck` passou localmente após os últimos ajustes.  
- **Dashboard shell:** `useAethelDashboardRuntime.tsx` foi decomposto e está **1112 linhas** (gate <=1200).  

**Conclusão factual:** O core loop **atingiu evidência de produção**, mas a promoção L4 continua **bloqueada** por credenciais externas e validações operacionais (Stripe + E2B + DB + medições de onboarding).

---

## 2) Bloqueadores Reais (P0)

### P0.1 — Billing Stripe real (bloqueio L4)
**Evidência:** `metrics/l4-readiness-dossier.json` ? `billingCheckoutWebhook.met=false`.  
**O que falta:** chaves reais + webhook validado + checkout E2E.  
**Arquivos envolvidos:**
- `cloud-web-app/web/app/api/billing/*`
- `cloud-web-app/web/components/billing/BillingIntegration.tsx`

**Ação pendente:** configurar envs Stripe e rodar `qa:billing-runtime-readiness`.

### P0.2 — E2B Preview Managed + HMR
**Evidência:** `metrics/l4-readiness-dossier.json` ? `previewManagedHMR.met=false`.  
**O que falta:** `AETHEL_PREVIEW_PROVISION_TOKEN` real e teste E2B.  
**Arquivos envolvidos:**
- `cloud-web-app/web/app/api/preview/runtime-provision/route.ts`
- `cloud-web-app/web/lib/preview/hmr-bridge.ts`
- `cloud-web-app/web/lib/preview/webcontainers-bridge.ts`

### P0.3 — DB/runtime estável (Docker/Neon)
**Evidência:** Dossier L4 exige DB real com readiness.  
**O que falta:** runtime com DB conectado e `qa:production-runtime-readiness` verde.  

---

## 3) Pendências Altas (P1)

### P1.1 — Onboarding SLO (<90s) com medição
**Evidência:** `metrics/l4-readiness-dossier.json` ? `onboardingP50Under90s.met=false`.  
**O que falta:** medir P50/P95 e registrar eventos.  
**Arquivos:**
- `cloud-web-app/web/components/onboarding/OnboardingWizard.tsx`
- `cloud-web-app/web/lib/analytics/*`

### P1.2 — RAG + @mentions (pgvector)
**Status:** implementação **não confirmada** em produção.  
**O que falta:** storage vetorial persistente e índice.  

### P1.3 — UX / Design System / Studio coeso
**Status:** melhorado, mas ainda existem superfícies heterogêneas.  
**O que falta:** consolidar Studio layout em todas as telas, padronizar Empty/Skeleton/Toast e remover redundâncias.

### P1.4 — Landing canônica (v3)
**Status:** `landing-v2.tsx` removida, `app/page.tsx` aponta para v3.  
**O que falta:** completar hero video, social proof e pricing com CTA real.

---

## 4) Pendências Médias (P2)

### P2.1 — Segurança enterprise
**Evidência:** Dossier mostra GDPR endpoints presentes, mas falta SSO/SAML real + vault em produção.  
**O que falta:** SSO configurado + rate limiting enterprise + vault ativo.

### P2.2 — Research premium
**Status:** melhorias descritas em docs, mas sem evidência de live retrieval + export pdf verificado.  

---

## 5) Pendências Baixas (P3)

### Games L2 ? L3 e Films L2 ? L3
**Status:** bloqueado até Apps L4 completo.  
**O que falta:** APIs externas e pipeline real.

---

## 6) Estado Atual das Documentações Críticas

### Alinhado
- `docs/master/9_BACKEND_SYSTEM_SPEC.md` atualizado para Next.js/Prisma/Postgres.  
- `docs/master/AI_SYSTEM_SPEC.md` atualizado com modelos reais do router.  

### Ainda necessário
- Padronizar legacy docs para nomenclatura canônica.  
- Consolidar documentação pública de usuário final (guia do IDE, games, films).

---

## 7) TypeScript / QA

- `npm run typecheck` passou localmente.  
- Ainda faltam testes E2E, visual regression e Lighthouse CI documentados no plano, mas **não há evidência de execução ainda**.

---

## 8) Lista de Pendências Objetivas (checklist executável)

**P0**
- [ ] Stripe: chaves + webhook + checkout real  
- [ ] E2B: token e teste HMR  
- [ ] Runtime DB: readiness verde  

**P1**
- [ ] Onboarding: medir P50/P95 e SLO real  
- [ ] RAG: pgvector + indexação  
- [ ] Landing: hero video + social proof + pricing com CTA real  

**P2**
- [ ] SSO real + vault ativo  
- [ ] Research: live retrieval + export PDF  

**P3**
- [ ] Games/Films L3 (após L4 completo)  

---

## 9) Arquivos-chave (para revisão técnica)

- `metrics/latest_run-production.json`
- `metrics/l4-readiness-dossier.json`
- `cloud-web-app/web/components/useAethelDashboardRuntime.tsx`
- `cloud-web-app/web/components/dashboard/DashboardShell.tsx`
- `cloud-web-app/web/app/page.tsx`
- `cloud-web-app/web/app/landing-v3.tsx`
- `docs/master/AI_SYSTEM_SPEC.md`
- `docs/master/9_BACKEND_SYSTEM_SPEC.md`

---

**Fim do relatório.**
