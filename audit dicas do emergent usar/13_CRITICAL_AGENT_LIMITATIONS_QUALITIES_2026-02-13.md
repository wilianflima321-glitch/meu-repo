# 13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13

## Escopo e evidencias
Fontes canonicas usadas:
- `audit dicas do emergent usar/00_FONTE_CANONICA.md`
- `audit dicas do emergent usar/10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md`
- `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`

Superficies auditadas nesta rodada:
- `cloud-web-app/web/components/AethelDashboard.tsx`
- `cloud-web-app/web/components/ChatComponent.tsx`
- `cloud-web-app/web/components/git/GitPanel.tsx`
- `cloud-web-app/web/components/extensions/ExtensionManager.tsx`
- `cloud-web-app/web/components/assets/ContentBrowserConnected.tsx`
- `cloud-web-app/web/components/**` (top offenders de acento legado)

## Snapshot critico atualizado (2026-02-14)
Metricas oficiais:
- `legacy-accent-tokens`: **0** (antes 610)
- `admin-light-theme-tokens`: **0** (mantido)
- `admin-status-light-tokens`: **0** (novo gate enterprise)
- `blocking-browser-dialogs`: **0** (antes 8)
- `not-implemented-ui`: **10** (mantido explicito)
- `frontend-workspace-route-usage`: **0** (consumidores de UI migrados para `/api/files/*`)
- `legacy-editor-shell-usage`: **0** (cutover para `/ide` preservado)

## Snapshot incremental (2026-02-16)
Evidencia de hardening adicional nesta rodada:
1. `TODO` em API critica foi zerado (`rg "TODO" cloud-web-app/web/app/api` -> sem matches).
2. Estados que antes estavam em comentario/placeholder agora retornam payload explicito e auditavel:
- `notifications` com `realtimeDispatch`.
- `assets confirm` com `postProcessing`.
3. `NOT_IMPLEMENTED` saiu de copy de componentes e ficou restrito ao contrato de APIs.

Metricas incrementais (grep local):
- `todo_api`: **0**
- `not_impl_api`: **6**
- `deprecated_route_refs`: **4**
- `todo_app_components_lib`: **0**

Validacao tecnica incremental (2026-02-16):
- `lint`: PASS (0 warnings)
- `typecheck`: PASS
- `qa:interface-gate`: PASS com `not-implemented-ui=5`
- `qa:route-contracts`: PASS
- `build`: FAIL por `spawn EPERM` (restricao de ambiente, nao erro funcional confirmado de codigo)

Integracoes fechadas nesta rodada:
1. Workspace recent handoff conectado ao `/ide`.
2. Problems panel agora abre localizacao no editor via evento dedicado.
3. Terminal/widget/workspace/agents com placeholders trocados por comportamento explicito (sem TODO aberto).

Leitura executiva:
1. Dialogos bloqueantes foram zerados nas superficies criticas.
2. Drift visual legado caiu para abaixo do alvo da rodada anterior e do novo alvo P0 (<250).
3. Admin segue sem regressao de tema claro.
4. `NOT_IMPLEMENTED` segue explicito e coerente com politica anti-fake-success.

Debt tecnico atualizado:
1. `npm run lint` segue PASS com **37 warnings** (baseline anterior do plano: 139).
2. Debt atual esta totalmente concentrado em `react-hooks/exhaustive-deps` (**37**).
3. Regras antes criticas nesta trilha ficaram zeradas:
- `import/no-anonymous-default-export = 0`
- `@next/next/no-img-element = 0`
- `jsx-a11y/role-supports-aria-props = 0`

## Snapshot incremental (2026-02-17) - benchmark externo sob controle canonico
Regra aplicada:
1. Benchmark externo nao substitui baseline canonico.
2. Claim sem evidencia local passa a ser tratado como `EXTERNAL_BENCHMARK_ASSUMPTION`.
3. Claims proibidos:
- paridade desktop total Unreal/Premiere no browser
- promocao L4/L5 sem evidencia operacional
- colaboracao avancada sem SLO/limites testados

Validacao local executada:
1. `cmd /c npm run lint` -> PASS (0 warnings)
2. `cmd /c npm run qa:interface-gate` -> PASS
3. `cmd /c npm run qa:route-contracts` -> PASS
4. `cmd /c npm run qa:no-fake-success` -> PASS

Metricas criticas atuais:
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`
- `not-implemented-ui=6`
- `frontend-workspace-route-usage=0`
- `legacy-editor-shell-usage=0`

Delta tecnico (2026-02-17, rodada atual):
1. `next.config.js` endurecido para limpar variaveis IPC invalidas (`__NEXT_*` e `__NEXT_PRIVATE_*`) que causavam ruido de revalidate IPC em runtime de build.
2. `experimental.workerThreads=true` foi restaurado com sanitizacao de IPC env para evitar `spawn EPERM` sem perder estabilidade de gate.
3. Workflow de regressao visual endurecido:
- sem `continue-on-error` na instalacao de Playwright;
- sem bypass `|| true` em captura/comparacao.
4. Workflows de auditoria visual agora exigem `lint` e `typecheck` antes da execucao dos checks visuais.

Lacunas reais abertas (fato):
1. Colaboracao avancada ainda `PARTIAL` para prontidao enterprise.
2. Render cancel continua em gate explicito `NOT_IMPLEMENTED`.
3. Build local voltou a passar nesta trilha; risco residual atual e ruido de runtime interno do Next (`revalidateTag` com URL IPC invalida) sem quebrar o gate.

## Validacao tecnica desta rodada
Executado em `cloud-web-app/web`:
- `npm run qa:interface-critical` -> PASS
- `npm run qa:interface-gate` -> PASS
- `npm run qa:canonical-components` -> PASS
- `npm run qa:route-contracts` -> PASS
- `npm run qa:mojibake` -> PASS
- `npm run docs:routes-inventory` -> PASS
- `npm run typecheck` -> PASS
- `npm run build` -> PASS
- `npm run qa:enterprise-gate` -> PASS
- `npm run lint` -> PASS com warnings (debt nao bloqueante)

## Limitacoes e qualidades (agente critico)
Qualidades confirmadas:
1. Workbench permanece shell principal sem abrir segundo app.
2. UX de acoes destrutivas ficou enterprise (dialogs nao bloqueantes).
3. Contratos de erro explicito foram preservados.

Limitacoes atuais reais:
1. `NOT_IMPLEMENTED` permanece em superficies P1/P2 (intencional, mas lacuna funcional real).
2. Ha rotas legadas que ainda dependem do corte faseado por telemetria.
3. Cutover de consumidores de UI para File API canonica foi concluido; rotas legadas ficaram restritas ao backend de compatibilidade.
4. Existe debt de qualidade tecnica em lint warnings (37), concentrado em dependencias de hooks.
5. Core IDE/Admin recebeu hardening funcional sem mudanca de escopo (InlineCompletion endpoint canonico, atalhos/admin action deps, estabilidade de cleanup em hooks).

## Decisoes executivas desta rodada
1. `REMOVER`: uso de `window.prompt/window.confirm` nas superficies criticas (concluido).
2. `UNIFICAR`: linguagem visual para continuar reduzindo acento legado.
3. `REFATORAR`: top offenders restantes sem alterar escopo de negocio.
4. `MANTER`: erro explicito para capacidade nao pronta.
5. `NAO FAZER`: promessas de paridade desktop total Unreal/Premiere.

## Backlog critico remanescente (P0/P1)
P0:
1. Preservar `legacy-accent-tokens = 0` sem regressao.
2. Preservar `admin-light-theme-tokens = 0` e `blocking-browser-dialogs = 0`.

P1:
1. Fechar deprecacao faseada de rotas legadas com telemetria real.
2. Consolidar matriz L1-L5 de IA com evidencia operacional continua.
3. Atualizar inventario de rotas/public docs para refletir que UI nao consome mais `/api/workspace/*`.
4. Reduzir `react-hooks/exhaustive-deps` em ondas: `37 -> <=20`, sem fallback cosmetico e sem desabilitar regra global.

## Gate de merge do agente critico
Aprovar mudancas somente se:
1. Nao introduzirem duplicidade de superficie para mesma capacidade.
2. Preservarem erro explicito para capacidades indisponiveis.
3. Mantiverem `qa:interface-critical` sem regressao de severidade alta.
4. Mantiverem `qa:interface-gate` verde.
5. Mantiverem `/ide` como shell principal.

---

## Delta critico adicional (2026-02-15) - varredura de profundidade
Evidencias executadas nesta rodada (workspace `cloud-web-app/web`):
- `cmd /c npm run lint` -> PASS com **37 warnings** (`react-hooks/exhaustive-deps` only)
- `cmd /c npm run qa:interface-gate` -> PASS
- `cmd /c npm run qa:route-contracts` -> PASS
- `cmd /c npm run typecheck` -> PASS
- `cmd /c npm run build` -> **FAIL (spawn EPERM no ambiente local/sandbox)**

### Lacunas reais confirmadas (sem alucinacao)
1. **L1 inline completion com risco funcional real de retorno vazio**
- `lib/ai/inline-completion.ts` le `data?.text` (`cloud-web-app/web/lib/ai/inline-completion.ts:51`)
- endpoint canonico retorna `suggestion` (`cloud-web-app/web/app/api/ai/complete/route.ts:124`)
- impacto: ghost text pode falhar silenciosamente no editor.

2. **Preview ainda nao e runtime real com HMR**
- `PreviewPanel` usa `iframe srcDoc` e declara suporte atual apenas para HTML estatico
  (`cloud-web-app/web/components/ide/PreviewPanel.tsx:54`, `cloud-web-app/web/components/ide/PreviewPanel.tsx:61`)
- impacto: gap direto contra objetivo de preview studio-grade em ciclo rapido.

3. **Cutover de entrada legacy sem efeito semantico**
- 17 rotas redirecionam para `/ide?entry=...` (ex.: `cloud-web-app/web/app/debugger/page.tsx:4`)
- `/ide` hoje interpreta apenas `file` em query (`cloud-web-app/web/app/ide/page.tsx:363`)
- impacto: contexto da origem nao e consumido; handoff existe mas sem estado util.

4. **Projeto ativo nao esta explicito no shell**
- File API aceita `projectId` por body/header/query (`cloud-web-app/web/lib/server/workspace-scope.ts:21-22`)
- `/ide` chama `/api/files/tree` sem `projectId` (`cloud-web-app/web/app/ide/page.tsx:398-401`)
- impacto: uso tende ao projeto `default`, reduzindo previsibilidade multi-projeto.

5. **Debt de hooks ainda concentrado em superficies criticas**
- warnings remanescentes focam terminal, provider websocket e hooks de render/pipeline.
- impacto: risco de regressao silenciosa em sessao longa e hot updates.

### Qualidades confirmadas e preservadas
1. Contratos de deprecacao seguem explicitos com `410 DEPRECATED_ROUTE`.
2. Contratos de indisponibilidade seguem explicitos (`NOT_IMPLEMENTED`, `QUEUE_BACKEND_UNAVAILABLE`, `AUTH_NOT_CONFIGURED`).
3. Gates de interface continuam em zero para regressao visual critica:
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`

### Acoes P0 recomendadas (proxima onda)
1. Corrigir contrato de resposta L1 (`suggestion` vs `text`) e adicionar teste de smoke do ghost text.
2. Implementar preview de runtime para JS/TS (ou gate explicito por tipo de arquivo no shell principal).
3. Consumir `entry` em `/ide` (telemetria + foco de painel) ou remover parametro de redirecionamento.
4. Tornar `projectId` explicito na sessao do Workbench e propagar em File API calls.
5. Reduzir `react-hooks/exhaustive-deps` de 37 para <=20 sem desabilitar regra global.

---

## Delta critico executado (2026-02-15, fechamento desta rodada)
1. Lacunas P0 fechadas nesta execucao:
- contrato L1 alinhado (`suggestion` primario + fallback `text`);
- `/ide` passou a consumir `entry` e `projectId`;
- chamadas de arquivos no shell passaram a enviar `projectId`;
- preview do Workbench ganhou cobertura real para texto, codigo, imagem, audio e video;
- endpoint canonicamente autenticado para media preview: `/api/files/raw`.

2. Debt tecnico de hooks reduzido:
- `npm run lint` agora retorna **12 warnings** (antes 37), todos em `react-hooks/exhaustive-deps`.
- reducao feita sem desabilitar regra global.

3. Gates apos hardening:
- `qa:interface-gate` PASS com `not-implemented-ui=10`;
- `qa:route-contracts` PASS;
- `qa:canonical-components` PASS;
- `qa:mojibake` PASS;
- `typecheck` PASS;
- `build` segue bloqueado localmente por `spawn EPERM` (ambiente).

4. Limitacoes residuais reais (mantidas):
- warnings restantes concentram-se em terminal/provider/render (`IntegratedTerminal`, `TerminalWidget`, `XTerminal`, `useGameplayAbilitySystem`, `useRenderPipeline`, `useRenderProgress`, `AethelProvider`).
- colaboracao avancada e L4/L5 continuam sem claim de prontidao operacional.
- limites de escala/custo seguem os mesmos de `LIMITATIONS.md`.

---

## Delta critico executado (2026-02-15, hardening complementar)
1. Debt de hooks residual foi fechado:
- `npm run lint` agora retorna **0 warnings**.
- correcoes aplicadas nas superficies criticas de terminal, provider e hooks de render/GAS.

2. Gates apos fechamento:
- `qa:interface-gate` PASS;
- `qa:route-contracts` PASS;
- `qa:canonical-components` PASS;
- `qa:mojibake` PASS;
- `typecheck` PASS;
- `build` segue com bloqueio local por `spawn EPERM`.

3. Limitacao real remanescente desta rodada:
- nao ha debt de lint bloqueante no codigo;
- permanece somente restricao ambiental para `next build` local.

---

## Delta critico final (2026-02-15, gate enterprise fechado)
1. `npm run qa:enterprise-gate` foi executado com sucesso completo.
2. Qualidade tecnica final desta onda:
- lint: **0 warnings**
- typecheck: PASS
- build: PASS
- contratos de interface/rota/canonicidade/mojibake: PASS
3. Limitacoes mantidas (fora desta rodada):
- `not-implemented-ui=10` continua explicito por politica anti-fake-success;
- L4/L5 e colaboracao avancada seguem dependentes de evidencia operacional dedicada.


## Delta critico consolidado (2026-02-15, auditoria 6 dimensoes)

### 1) Produto and UX
Findings:
1. Core shell is consolidated in `/ide` and critical UX gates are green.
2. There is still explicit functional gap in user-visible surfaces (`not-implemented-ui=10`).
3. Canonical set still has historical drift: `FULL_AUDIT.md` describes an older pre-implementation state and can confuse current-state reading.

Decision:
- Keep anti-fake-success policy and explicitly label older baseline docs as historical baseline when conflicting with current execution deltas.

### 2) Frontend and IDE
Findings:
1. High-severity visual debt gates are zero (`legacy-accent`, `admin-light`, `admin-status-light`, `blocking-dialogs`).
2. Workbench remains single entry and legacy editor route usage is zero.
3. Remaining UX gap is not visual debt but functional gating where capability is not fully delivered.


## Delta critico adicional (2026-02-16, P0 usabilidade e confiabilidade)
1. Contexto de projeto no shell:
- comando canonico `Switch Project Context` adicionado ao Command Palette e menu File;
- troca de projeto agora limpa estado local de abas/buffers e recarrega arvore no `projectId` alvo;
- URL do `/ide` passa a refletir o `projectId` ativo apos troca.

2. Confiabilidade de CI:
- `ui-audit` e `visual-regression-compare` agora validam readiness apos fallback estatico;
- pipeline falha de forma explicita quando nenhuma superficie sobe, com tail de logs para diagnostico imediato.

3. Deprecacao observavel:
- rotas `410 DEPRECATED_ROUTE` passaram a emitir headers de ciclo (`x-aethel-deprecated-since`, `x-aethel-removal-cycle-target`, `x-aethel-deprecation-policy`) para governanca operacional.
4. Admin actionability:
- `admin/apis` passou a exibir readiness de cutoff por rota (`candidateForRemoval`, `silenceDays`) e candidatos consolidados por ciclo.
5. UX de IA P0 sem CTA enganosa:
- anexos foram desativados no painel de chat do Workbench (`allowAttachments=false`) para manter escopo text-only nesta fase.

6. Limitacao residual mantida:
- `not-implemented-ui=10` continua explicito por politica anti-fake-success e nao foi inflado nesta onda.

Decision:
- Prioritize closure of user-path gaps before any new UI surface expansion.

### 3) Backend and Infra
Findings:
1. File API authority is unified (`/api/files/*`) with no frontend consumption of deprecated workspace routes.
2. Deprecated routes remain explicit (`410`) and observable; this is correct for phased cutoff.
3. Infra constraints from `LIMITATIONS.md` remain hard limits: cold start, AI costs, websocket/container concurrency.

Decision:
- Keep phased cutoff by telemetry; do not remove compatibility routes without usage evidence window.

### 4) AI and Automation
Findings:
1. L1-L3 path is the only defensible runtime claim for current phase.
2. Error contracts for unavailable provider paths remain explicit and compliant with anti-fake-success policy.
3. L4/L5 still need operational evidence; keep claim gate locked.

Decision:
- Keep editor-native AI priority and block maturity claims above L3 without evidence.

### 5) Collaboration and DX
Findings:
1. Collaboration remains scoped and does not have enterprise-scale stability proof in canonical evidence.
2. Debug-collab and advanced conflict behavior are still partial from a runtime-proof standpoint.

Decision:
- Keep collaboration as P1 with explicit SLO/acceptance criteria before claim upgrade.

### 6) Business and Market
Findings:
1. Competitive position stays strongest on integrated web-native workflow (`ide + ai + preview + deploy`).
2. Hard limitations prevent desktop parity claims (Unreal/Premiere full parity remains out of scope).
3. Main barrier remains operational economics (AI + compute) and reliability at scale.

Decision:
- Position as web-native studio workflow with explicit boundaries, not desktop replacement marketing.

### Critical recommendation set (next wave)
P0:
1. Preserve gate baseline: lint=0 and enterprise gate green.
2. Keep explicit NOT_IMPLEMENTED and DEPRECATED_ROUTE contracts accurate to runtime.
3. Resolve documentation drift by prioritizing `10`, `13`, `14` as current execution truth in all new deltas.

P1:
1. Publish telemetry-window evidence for deprecated route removal criteria.
2. Publish collaboration readiness matrix with measurable limits.
3. Publish L4/L5 claim gates with concrete evidence thresholds.


## Matriz factual IA L1-L5 (2026-02-15)

| Nivel | Escopo | Status factual atual | Evidencia canonica | Gate de claim |
|---|---|---|---|---|
| L1 | Inline completion | IMPLEMENTED/PARTIAL | APIs `/api/ai/complete` + editor inline com fallback explicito | So pode ser vendido como L1 com provider configurado |
| L2 | Chat contextual | IMPLEMENTED/PARTIAL | `/api/ai/chat` + painel AI no Workbench | Sem provider, retorno 501 `NOT_IMPLEMENTED` |
| L3 | Quick actions (fix/explain/refactor) | PARTIAL | Endpoints de action/inline-edit com contrato explicito | Claim apenas para acoes com retorno real, sem fallback fake |
| L4 | Agent mode single | NOT_IMPLEMENTED para prontidao enterprise | Sem prova operacional de estabilidade no canone | Bloqueado ate evidencia de execucao em carga + auditoria |
| L5 | Multi-agent paralelo | NOT_IMPLEMENTED para prontidao enterprise | Planejado em specs, sem prova de producao | Bloqueado ate feature flag + metrica de sucesso operacional |

Regras travadas de claim:
1. Nenhum nivel acima de L3 pode ser anunciado como pronto sem evidencias de execucao, confiabilidade e custo.
2. Qualquer indisponibilidade de provider deve retornar erro explicito; proibido fallback silencioso.

## Matriz factual Colaboracao e DX readiness (2026-02-15)

| Dimensao | Status atual | Lacuna real | Criterio minimo para promover status |
|---|---|---|---|
| Multiusuario realtime | PARTIAL | Sem prova de estabilidade enterprise em carga | Testes concorrentes + SLO publicados |
| Locks e conflitos | PARTIAL | Politica de conflito/autoridade ainda nao fechada no canone executivo | Definir lock strategy + testes de merge/conflito |
| Versionamento colaborativo | PARTIAL | Fluxo de revisao colaborativa nao validado ponta-a-ponta | Cenarios E2E com auditoria de historico |
| Debug colaborativo | NOT_IMPLEMENTED para claim | Sem evidencia operacional em ambiente real | Fluxo de debug compartilhado com acceptance tests |
| DX de setup colaborativo | PARTIAL | Friccao de ambiente e observabilidade de sessao | Checklist de readiness + runbook de suporte |

SLO proposto para promover "real-time ready":
1. P95 latencia de sync colaborativo <= 250ms em carga alvo definida.
2. Reconexao automatica <= 5s apos queda curta de rede.
3. Zero perda silenciosa de edicao em cenarios de conflito reproduziveis.


## Delta critico de implementacao (2026-02-15, O1/O3 fechado)

Implementado:
1. Comunicacao de erro IA no Workbench refinada para reduzir ambiguidade operacional.
2. Mensageria de gates no layout reforcada com orientacao de proxima acao.
3. Admin (home/apis/security/payments) endurecido para operacao enterprise com estados de erro/atualizacao e feedback transacional mais claro.

Validado:
- `lint` PASS com 0 warnings
- `qa:enterprise-gate` PASS
- `qa:interface-gate` PASS com `not-implemented-ui=10` preservado como gate explicito

Leitura critica:
1. Qualidade visual/tecnica P0 permanece forte.
2. Residual de produto segue funcional (gates declarados), nao regressao tecnica.


## Delta critico CI (2026-02-15)

Quality risk addressed:
1. Workflow drift vs real app topology (root vs `cloud-web-app/web`) was reduced by explicit dual-install and startup fallback strategy.
2. Visual evidence pipelines now target current route map and preserve logs for post-failure diagnosis.

Residual limitation:
1. CI still depends on environment capabilities for browser install/network and can fallback to static site when runtime app is unavailable.

2. Workflow install path now tolerates missing root lockfile, reducing false CI breakage.

## Delta critico maximo (2026-02-16, pos gate enterprise)

Validacao executada:
1. `cmd /c npm run qa:enterprise-gate` -> PASS
2. `cmd /c npm run docs:routes-inventory` -> PASS

Snapshot factual atualizado:
1. `lint=0` (sem warnings)
2. `not-implemented-ui=5` (todas ocorrencias em API, nao em copy de UI)
3. `todo_total=0` em `app/components/lib`
4. `frontend-workspace-route-usage=0`
5. `deprecated_route_refs_api=4` (somente rotas faseadas 410)

Criticas objetivas de maior impacto residual:
1. **Aviso de runtime cache/revalidate no build**:
- erro recorrente `Failed to parse URL from http://localhost:undefined?...revalidateTag...`
- nao bloqueia build, mas indica configuracao ambiental/runtime incompleta que pode mascarar problema operacional.
2. **Configuracao de infra ausente por padrao**:
- `UPSTASH_REDIS_REST_URL/TOKEN` ausentes geram warnings previsiveis.
- manter erro explicito esta correto, mas exige checklist de bootstrap para ambientes enterprise.
3. **Gates de capacidade ainda reais**:
- IA depende de provider configurado para sair de `501 NOT_IMPLEMENTED`.
- `render/jobs/[jobId]/cancel` e branch de pagamento sem gateway seguem com gate explicito.
4. **Deriva documental interna**:
- secoes antigas em `10/13/14` ainda carregam baselines historicos (ex.: `not-implemented-ui=10`) junto do estado atual (`5`), exigindo leitura cuidadosa.

Backlog critico imediato (P0 sem mudar escopo):
1. Tratar alerta `revalidateTag` (origem e mitigacao) e registrar em contrato.
2. Formalizar checklist de ambiente minimo (Upstash/Docker/runtime) para eliminar warning operacional recorrente.
3. Manter limpeza documental: toda nova delta deve sobrescrever baseline numerica mais antiga em `10/13/14`.

Backlog P1 (travado por evidencia):
1. Colaboracao avancada com SLO e carga real.
2. Gate de claim L4/L5 com provas operacionais reproduziveis.

## Delta critico adicional (2026-02-16, anti-fake-success IA/media)

Mudancas executadas:
1. `app/api/ai/thinking/[sessionId]/route.ts`
- endpoint marcado explicitamente como `PARTIAL` + `simulated_preview` em payload/headers.
2. `app/api/ai/director/[projectId]/route.ts`
- endpoint marcado explicitamente como `PARTIAL` + `heuristic_preview` em payload/headers.
3. `lib/server/asset-processor.ts` + `app/api/assets/upload/route.ts`
- upload passou a diferenciar `uploaded` de `optimized` com razao explicita quando backend de otimizacao nao esta configurado.

Leitura critica:
1. Isto reduz risco de claim inflado em IA e pipeline de assets.
2. Mantem experiencia funcional, mas sem reportar maturidade inexistente.
3. Proximo passo obrigatorio e migrar preview/simulacao para runtime persistente e validado.

## Delta critico adicional II (2026-02-16, contratos de capacidade + preview safety)

Mudancas executadas:
1. Contrato unificado de capability response criado:
- `cloud-web-app/web/lib/server/capability-response.ts`
2. Rotas AI de provider-gate migradas para contrato unico (`NOT_IMPLEMENTED`, `501`, metadata/headers):
- `app/api/ai/chat/route.ts`
- `app/api/ai/complete/route.ts`
- `app/api/ai/action/route.ts`
- `app/api/ai/inline-edit/route.ts`
3. `app/api/render/jobs/[jobId]/cancel/route.ts` migrada para contrato de capability gate.
4. `app/api/billing/checkout/route.ts` passou a devolver metadata explicita em branch de gateway nao suportado.
5. `components/ide/PreviewPanel.tsx` endurecido para runtime JS/TS:
- JS preview com source serializado (evita quebra por interpolacao direta).
- TS preview com erro explicito quando transpiler nao carrega.

Critica objetiva:
1. Reduz ambiguidade operacional e melhora rastreabilidade de lacunas reais.
2. Evita que falhas de runtime parecam "silenciosas" no preview.
3. Mantem escopo P0/P1 sem inflar claims de maturidade.

## Delta critico adicional III (2026-02-16, anti-alucinacao deterministica)

Mudancas executadas:
1. Novo validador deterministico para mudancas de IA:
- `app/api/ai/change/validate/route.ts`
- `lib/server/change-validation.ts`
2. Aplicacao de inline edit passou a depender de validacao antes do apply:
- `components/editor/MonacoEditorPro.tsx`
- `components/editor/InlineEditModal.tsx`
3. Pipeline de ghost text migrou para endpoint canonico com quota/auth/rate contract:
- `lib/ai/ghost-text.ts` -> `/api/ai/inline-completion`
4. Validacao de asset evoluida para classes game/media/model com avisos `PARTIAL` explicitos:
- `lib/server/asset-processor.ts`
- `app/api/assets/upload/route.ts`

Critica objetiva:
1. O risco de patch quebrado por alucinacao caiu no caminho de edicao inline.
2. O risco de "asset aceito sem sinal de limite" caiu via warnings de classe/pipeline.
3. Persistem lacunas de nivel enterprise para verificacao multi-arquivo profunda e carga colaborativa.

## Delta 2026-02-17 - Critical Sweep Update
1. Updated factual gate baseline:
- `blocking-browser-dialogs=0`
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `not-implemented-ui=6` (improved from prior baseline 10)
2. Reliability gaps still open:
- local env dependency warnings (`UPSTASH_*`, Docker fallback)
- unresolved `revalidateTag` invalid URL warning during build finalization path.
3. Claim policy unchanged:
- no promotion beyond L3 without operational evidence;
- no fake success for gated capabilities.

## Delta 2026-02-17 II - UX/accessibility and shell coherence pass
Implemented:
1. Runtime-scoped API routes were hardened with `force-dynamic` to avoid static-cache ambiguity in ops metrics/health surfaces:
- `app/api/exports/metrics/route.ts`
- `app/api/jobs/stats/route.ts`
- `app/api/multiplayer/health/route.ts`
2. Multiplayer health route copy was normalized to clean English ASCII (removed encoding drift risk).
3. Global accessibility quality improved in `app/globals.css`:
- stronger focus ring visibility;
- reduced-motion fallback to disable non-essential animations when requested by user preference.
4. Manifest shell alignment completed in `app/manifest.ts`:
- `/ide` is now the default app entrypoint;
- shortcuts now resolve to `/ide` contexts.

Validation:
1. `qa:interface-gate` PASS (`not-implemented-ui=6`).
2. `qa:canonical-components` PASS.
3. `qa:route-contracts` PASS.
4. `qa:no-fake-success` PASS.
5. `qa:mojibake` PASS (`findings=0`).
6. `typecheck` PASS.
7. `build` PASS with existing non-blocking Next runtime warning.

Residual critical gaps:
1. The `revalidateTag` invalid URL warning is still present at build finalization and remains tracked as framework/runtime noise.
2. `NOT_IMPLEMENTED` remains intentionally explicit in AI provider gates, render cancel, and unsupported payment runtime paths.

## Delta 2026-02-17 III - Handoff and runbook hardening
Implemented:
1. Canonical interface map created for external AI improvement workflow:
- `18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md`
2. Runtime warning/environment runbook created:
- `19_RUNTIME_ENV_WARNING_RUNBOOK_2026-02-17.md`
3. Canonical source index updated to include both docs:
- `00_FONTE_CANONICA.md`

Critical reading:
1. Interface improvement ownership is now explicit and auditable by file path.
2. Runtime warning handling is tracked operationally without lowering quality gates.

## Delta 2026-02-17 IV - Critical execution ordering (P1/P2)
Implemented:
1. Priority execution artifact added:
- `20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17.md`

Critical reading:
1. P1/P2 ambiguity is removed; each item now has explicit file scope and done criteria.
2. This reduces execution drift risk for external AI collaborators.
