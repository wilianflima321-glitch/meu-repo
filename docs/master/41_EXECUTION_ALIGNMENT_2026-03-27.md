# EXECUTION_ALIGNMENT_2026-03-27

> **Nota (colisão `41_*`):** Ficheiro `41_EXECUTION_ALIGNMENT_2026-03-27.md` — registo de **alinhamento técnico aplicado**; distinto de `41_AUDITORIA_MAXIMA_*` e `41_DOCS_NAMING_*`. Ver `DEPRECATED_INDEX.md`.

## Objetivo
Registrar o pacote de alinhamento tecnico aplicado para reduzir gaps entre spec, runtime e experiencia real no Studio.

## Escopo aplicado
- HMR bridge unificado com fallback de caminhos Next.js/Vite.
- Canonical Preview Surface conectada ao bridge compartilhado.
- Instrumentacao de first-value SLO no onboarding e no primeiro open de IDE.
- Billing UI ajustada para ler assinatura na rota correta.
- Claims de plano no JWT (`plan`, `isPro`) emitidas em login/register/oauth callback.
- Landing com CTA por intencao (Free -> onboarding, Pro -> billing, Enterprise -> sales).
- Content Browser com visibilidade de readiness de storage (`/api/health/storage`).
- Plan limits alinhados com os limites comerciais atuais.
- AI system spec atualizada para o estado real (implemented/partial/aspirational).

## Dependencias externas ainda obrigatorias
- Chaves Stripe validas + webhook publico.
- Provedor real de preview (E2B ou endpoint gerenciado) com token ativo.
- Storage S3/R2 com credenciais de producao.
- Runtime de embeddings/vetor em producao para RAG persistente.

## Regras de leitura
- Este arquivo resume execucao recente.
- O contrato canonicamente valido continua em `00_INDEX.md` e docs vinculados.
- Nao promover L4/L5 sem evidencia operacional mensuravel.
