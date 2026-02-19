# 23_EXTERNAL_BENCHMARK_ABSORPTION_2026-02-19

Status: ACTIVE
Owner: PM Tecnico + Agente Critico
Scope: Absorver feedback externo sem inflar claims, mantendo contrato canonico atual.

## 1) Fonte de entrada
1. Relatorio externo fornecido pelo usuario em 2026-02-19 com comparativos de mercado (Unity/Unreal/VS Code/Cursor/GitHub Copilot/Sora/Veo/Hailuo).
2. Este documento NAO substitui a fonte canonica.
3. Regras de absorcao:
- Se houver evidencia no repositorio/codigo/docs canonicos: marcar `VERIFIED_INTERNAL`.
- Se for benchmark plausivel sem prova interna: marcar `EXTERNAL_BENCHMARK_ASSUMPTION`.
- Se conflitar com escopo/limitacoes: marcar `OUT_OF_SCOPE_OR_BLOCKED`.

## 2) Matriz de validacao rapida
| Item do relatorio externo | Classificacao | Evidencia/Observacao |
|---|---|---|
| Entrada Studio Home chat/preview-first + IDE avancada | VERIFIED_INTERNAL | `cloud-web-app/web/components/studio/StudioHome.tsx`, `cloud-web-app/web/app/ide/page.tsx`, docs `21`, `22` |
| Multi-agent com papeis `Planner/Coder/Reviewer` | VERIFIED_INTERNAL | `cloud-web-app/web/lib/server/studio-home-store.ts`, `app/api/studio/tasks/run-wave/route.ts` |
| Apply serial com validacao e rollback | VERIFIED_INTERNAL | endpoints `tasks/validate`, `tasks/apply`, `tasks/rollback`, docs `10`, `21` |
| Capability envelope explicito (NOT_IMPLEMENTED/PARTIAL) | VERIFIED_INTERNAL | `cloud-web-app/web/lib/server/capability-response.ts`, docs `17` |
| Deprecacao faseada com 410 + metadados | VERIFIED_INTERNAL | rotas `/api/workspace/*`, `/api/auth/sessions*`, docs `10`, `17` |
| Interface principal baseada em Jupyter Notebook como definicao do produto | OUT_OF_SCOPE_OR_BLOCKED | Nao e definicao canonica atual do Aethel Workbench |
| "11 regressions visuais abertas #52/#53..." como baseline atual | EXTERNAL_BENCHMARK_ASSUMPTION | Requer conferir tracker externo; nao entra como fato sem evidencia local |
| Paridade desktop total Unreal/Premiere | OUT_OF_SCOPE_OR_BLOCKED | Bloqueado por `LIMITATIONS.md` |
| L4/L5 IA pronta para claim comercial imediato | OUT_OF_SCOPE_OR_BLOCKED | Bloqueado sem evidencia operacional canonica |
| KPI/ROI numericos de mercado (MRR, churn, etc.) | EXTERNAL_BENCHMARK_ASSUMPTION | Nao ha telemetria financeira canonica suficiente nesta rodada |

## 3) Gaps reais absorvidos para backlog executavel

### P0 (acao imediata)
1. Garantir zero CTA enganoso em capacidades parciais no Studio Home/IDE/Admin.
2. Preservar contrato explicito de erro/capability em todas as rotas criticas.
3. Manter politicas de custo com entitlement duplo (tempo x consumo) sem fallback caro oculto.
4. Endurecer Full Access (escopo por plano + TTL + auditoria + feedback claro no UI).

### P1 (proxima onda)
1. Gate de readiness para colaboracao avancada (locks/conflitos/reconexao/SLO).
2. Telemetria operacional para custo por sessao/agente/ferramenta no Studio Home.
3. Hardening de sessao longa (virtualizacao de listas/feed e reconexao robusta).
4. Revisao de acessibilidade de alto impacto no fluxo Studio Home -> IDE.

### P2 (sem prometer nesta fase)
1. Subsistemas dedicados de consistencia temporal/espacial para filmes e assets 3D.
2. Toolchain avancada de render/physics beyond web constraints (sem claim de paridade desktop).
3. Expansao para colaboracao enterprise plena apenas apos evidencia de estabilidade em carga.

## 4) Claims proibidos nesta fase
1. "Melhor que Unreal/Premiere desktop em tudo".
2. "L4/L5 multi-agent pronto para producao" sem gate factual.
3. "Colaboracao total enterprise" sem SLO e testes de concorrencia.
4. Qualquer numero de KPI financeiro/mercado sem fonte operacional interna auditavel.

## 5) Entregas obrigatorias associadas
1. Manter sincronia entre `10`, `13`, `14`, `17`, `21`, `22` a cada delta tecnico.
2. Toda melhoria de UX/capability deve ter rastreio em contrato e scanner de regressao aplicavel.
3. O que vier de benchmark externo deve ser rotulado como `EXTERNAL_BENCHMARK_ASSUMPTION` ate validacao.

## 6) Estado desta atualizacao
1. Documento criado para absorver o relatorio externo sem lacunas de governanca.
2. Onda atual executou apenas gates de interface para correção de baseline e calibracao de metricas.

## 7) Snapshot factual da onda atual
1. `qa:interface-critical`:
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`
- `not-implemented-ui=6`
- `not-implemented-noncritical=2`
2. `qa:interface-gate`: PASS com thresholds atualizados para os dois trilhos de `NOT_IMPLEMENTED`.
3. Lacunas que permanecem para fechamento de fase:
- rerun consolidado do gate enterprise completo
- validacao operacional de Upstash em ambiente de deploy
- fechamento de claims `PARTIAL_INTERNAL` em `10`/`22` somente com evidencia de gate final
