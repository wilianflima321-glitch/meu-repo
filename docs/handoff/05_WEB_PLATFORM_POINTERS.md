# Handoff 05 — Plataforma Web (cloud-web-app) — ponteiros, não duplicação

## Aviso importante

Esta sessão **não auditou profundamente** o código do `cloud-web-app/web` (Next.js/Prisma) — o foco foi o motor nativo (Rust/Tauri), a pedido explícito do Founder (continuar o log do Cursor). O que segue é o que foi **confirmado existir e ser a fonte de verdade real** para o lado web, não uma nova auditoria do zero.

## Não recrie o plano — ele já existe e está ativo

- **`cloud-web-app/web/docs/CONTINUATION_MASTER_PLAN_2026.md`** — "V28 continuation plan", atualizado em 2026-07-15. Este é o plano mestre real do lado web: baseline medido (páginas, testes, stories, arquivos >800 LOC), regras de produto não-negociáveis (ex: "Browser é preview/review, execução pesada é Studio Local ou Cloud Render"; "nenhuma copy pública pode afirmar `AAA ready`/`Unreal-grade`/`final asset` sem evidência"), e um P0 de supply chain (Next 14.2.35+, migrações pendentes de Next 16/React 19/Sentry 10/Storybook 10).
- **`cloud-web-app/web/docs/BEST_IN_MARKET_GAP_MATRIX_2026-05-22.md`** — matriz de gaps vs concorrência.
- **`cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md`** — gap específico vs VSCode/Unreal.
- Há **dezenas de outros audits específicos** em `cloud-web-app/web/docs/*_AUDIT.md` (i18n, WCAG, bundle, effect cleanup, marketing claims, routes inventory, marketplace, etc.) — **leia o índice completo antes de assumir que algo não foi auditado.**

## Estado real dos "Consolidation Waves" (CW1-CW7) — ledger do lado engine, mas cobre features web/Agents

Todos **PARTIAL**, nenhum **DONE**, confirmado em `docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md` (linhas ~244-250):

| Item | O que cobre | Gap real restante |
|---|---|---|
| CW1 | Matriz de verdade do produto (claim × path × status) | Matriz completa de 15 painéis + colunas de benchmark ainda OPEN |
| CW2 | Kernels além do soak (SPH/XPBD/LBM/fracture) em escala real | GPU memory matrix RTX 3060 completa; Chaos Destruction AAA `false` |
| CW3 | Unificar render path (R3F vs WebGPU vs wgpu nativo) | WebView exclusive + RHI unificado ainda OPEN/HELD |
| CW4 | Persistência de UI (localStorage exception-only) | Dual-write ainda tem debt não-crítico; multi-tab lock ainda falta |
| CW5 | Design-system government (tokens, stories, skeletons) | Storybook completo + governo total de tokens Figma ainda OPEN |
| CW6 | Agents work-OS (receipts, task graph, merge governance) | Cursor Composer parity, J.11 ACP, J.12 OrchestratorProd ainda HELD |
| CW7 | Disk austerity (target único, CAS cook) | Prune de órfãos + CAS cook + enforcement de CI ainda faltam |

## O que fazer antes de tocar no lado web

1. Leia `CONTINUATION_MASTER_PLAN_2026.md` do início ao fim.
2. Rode os gates do lado web para ver o baseline real atual (pode ter mudado desde 07-15):
   ```bash
   cd cloud-web-app/web
   npm run typecheck
   npm run lint
   npm test # ou o comando de vitest configurado
   ```
3. Escolha o item CW mais próximo de DONE (menor gap restante) e siga o mesmo princípio de "um item por vez, sem MVP, sem fingir completude".
4. **Não misture trabalho Rust (Onda G/L) com trabalho web (CW) na mesma rodada/commit** — são dois `cargo`/`npm` completamente separados; misturar dificulta rollback e revisão.

## Nota honesta sobre esta lacuna do handoff

Este documento é intencionalmente um **ponteiro**, não uma auditoria de código. Se o Founder quiser profundidade real equivalente ao que foi feito no lado Rust (linha por linha, bug real encontrado, teste novo escrito), isso precisa ser um item de trabalho dedicado no lado web, escolhido a partir da lista CW acima ou de um dos `*_AUDIT.md`.
