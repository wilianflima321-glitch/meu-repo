# AUDITORIA V33 — Crítica dos 3 MDs + Reconciliação V34

> **Status deste documento:** a auditoria V33 original foi escrita em **2026-07-20** contra
> um HEAD antigo (`7f383b25`). Desde então, boa parte das correções já foi executada.
> A **§0-R (Reconciliação)** abaixo registra o estado REAL atual do repositório e deve ser
> lida ANTES das seções originais — várias "alucinações" e "frentes faltando" já não existem.
>
> **Passe de correção 2026-07-03 (§0-S):** uma segunda verificação cruzada encontrou itens da
> própria §0-R que já estavam desatualizados (a Frente 3 do websocket, citada abaixo como
> "genuinamente falta", **já estava concluída**; a linha do NiagaraVFX também estava errada).
> **A §0-S abaixo tem precedência sobre a §0-R onde divergirem.** Isso não é uma crítica cosmética:
> um executor que confiasse cegamente na §0-R teria reaberto um refactor de risco médio-alto
> (god-file WebSocket) que não existe mais, desperdiçando um ciclo inteiro de trabalho.
>
> Regra suprema mantida: **executar, não auditar de novo.** Não criar V35 — continuar
> corrigindo este documento in-place quando novas divergências forem achadas.

---

## 0-R. RECONCILIAÇÃO COM O ESTADO ATUAL (validado 2026-06-15)

### Decisão arquitetural — CONFIRMADA e em vigor
- **Web:** mantém React Three Fiber. Não migrar para WebGPU agora.
- **Desktop (Tauri):** wgpu Rust nativo do zero, sem tocar no R3F.
- Convergência em 6-12 meses. Registrada em `CLAUDE.md`.

### Frentes de bootstrap (V33 §5) — estado real
| Frente | V33 dizia | Estado atual (validado) |
|---|---|---|
| **Frente 0** — Setup Claude | faltando | ✅ FEITO — `.cursorrules` + `CLAUDE.md` + `.aethelrules` existem |
| **N1** — Lockfiles | faltando | ✅ FEITO — 4 lockfiles commitados (web, root, studio-local, Cargo.lock) |
| **N2** — Next/Image | faltando | ✅ FEITO — `next.config.js` tem `formats avif/webp` + `remotePatterns` + `deviceSizes` |
| **N3** — Arquivar código morto | faltando | 🟡 PARCIAL — `src/`, `cloud-admin-ia/` já sumiram. `client/` (4 arquivos) e `shared/` (vazio) ainda na raiz. **`runtime-templates/` NÃO é morto** (referenciado por `apps/studio-local/src/desktop-capability-manifest.ts` como evidence path) |
| **N4** — Loading PT-BR | faltando | ✅ FEITO — `PremiumLoadingState.tsx` + stories existem; `Carregando` em `app/` = **0 ocorrências** |
| **N5** — Unificar physics | faltando | ⏳ PENDENTE — dualidade `physics-engine.ts` (TS) vs `physics-engine-real.ts` (Rapier) + `workers/physics-worker.ts` ainda coexistem |

### As 13 "alucinações" (V33 §2) — estado real
| Arquivo | V33 dizia | Estado atual |
|---|---|---|
| `components/viewport/ViewportAssetDropOverlay.tsx` | não existe | ✅ EXISTE (usa tokens corretos) |
| `components/ui/PremiumLoadingState.tsx` | não existe | ✅ EXISTE + stories |
| `components/engine/NiagaraVFX.runtime.tsx` | não existe | ✅ **CORRIGIDO 2026-07-03** — EXISTE, mas em `cloud-web-app/packages/engine/NiagaraVFX.runtime.tsx` (não em `components/engine/`). A versão `web/components/engine/NiagaraVFX.tsx` (sem `.runtime`) também existe e é o painel React puro; o `.runtime.tsx` no pacote `engine` é a violação ativa citada em §0-S.1 abaixo. |
| `lib/scene-graph-node.ts` | não existe | ⚠️ ainda não existe — NÃO inventar |
| `components/error/ErrorBoundary.tsx` | path certo | ✅ EXISTE (crash receipts + auto-retry — Frente R64) |
| `components/editor/MonacoEditorPro.runtime.tsx` | não existe | ⚠️ continua não existindo — usar `MonacoEditorPro.actions.ts`. **Existe `lib/editor/MonacoEditorPro.runtime.tsx`** (local diferente) |
| `desktop_commands.rs` | não existe | ✅ EXISTE em `apps/studio-local/src-tauri/src/` (testes Rust verdes) |
| Demais paths errados (§2.2) | remapear | usar paths canônicos da tabela em `CLAUDE.md` / §B `.cursorrules` |

### Frente 1 (Inline Composer) — correção aplicada 2026-06-15
- O fluxo Cursor-style Ctrl+K **já existe e funciona**: `aethel.inlineEdit` → `InlineEditModal`
  (quick actions, API `/api/ai/inline-edit`, diff, apply).
- A action redundante `aethel.inline-composer` foi **removida** — duplicava `inlineEdit` e
  **colidia** com `aethel.deleteLine` em `Ctrl+Shift+K`.
- `InlineComposerWidget.tsx` permanece como primitivo isolado (com story), **não é o caminho real**.

### Frente A4 (VisualScriptEditor) — concluída 2026-06-15
- 31 → 9 estilos inline (os 9 restantes são data-driven/ReactFlow, não tokenizáveis).
- Labels/aria-labels/empty-state PT-BR → EN.

### Frente A5 / A7 / A8 — estado
- **A5** (dropzone viewport): ✅ JÁ usava tokens (`ViewportAssetDropOverlay`).
- **A8** (Outliner virtualizado): ✅ FEITO 2026-06-15 — `SceneViewportOutliner` usa
  `@tanstack/react-virtual` (`useVirtualizer` + `measureElement`).
- **A7** (Inspector scrubbing + math): ✅ FEITO 2026-06-15 — `SceneViewportInspector`
  edita Position/Rotation/Scale via `Vector3Input` (drag-scrub + expressões math + EN).
  Corrigido bug de cor de eixo no `Vector3Input` (classe Tailwind concatenada dinamicamente).

### Frente N5 — estado
- ✅ FEITO 2026-06-15: Rapier é o caminho canônico (`lib/physics-engine-real.ts` +
  `workers/physics-worker.ts`). O motor TS `lib/engine/physics-engine.ts` está
  **órfão (0 imports)** e recebeu banner `@deprecated`. Física nativa do desktop = Wave 5 / Frente 9.

### Frente A40 — estado
- ✅ FEITO 2026-06-15: ghost preview holográfico do diff staged no Monaco.
  - `lib/ai/diff-line-ops.ts` (LCS) → ranges removidos + blocos adicionados.
  - `components/ide/useApplyGhostPreview.ts` pinta decorations (linhas removidas, vermelho)
    + view zones verdes (adições) enquanto há `pendingDiff` no arquivo ativo; auto-limpa.
  - Bônus: `buildChatDiffFile` agora gera diff unificado real (LCS) — contagens de
    "linhas alteradas" deixaram de ser infladas (chat ledger, proposal, tray, overlay).

### Frente 44 (deep-context-manager) — reclassificada
- O audit dizia "stub de 78 LoC". REAL: `lib/ai/deep-context-manager.ts` tem **319 LoC**
  e já é um banco de memória semântica evidence-gated com scoring/recall. NÃO é stub.
  O que o audit pedia (skeleton AST / slice de símbolo via `web-tree-sitter`) é um
  **concern de contexto de código** separado, com dep WASM frágil — adiar até haver
  integração real no pipeline de tools (não criar dead code).

### O que GENUINAMENTE falta (bulk real, por ordem de valor) — ver correção §0-S.2
0. **🔴 P0 NOVO (2026-07-03, ver §0-T) — `npm run build`/`npm run typecheck` FALHAM HOJE.** 152 erros
   `TS2307` de módulo não encontrado, incluindo `app/layout.tsx` (`GlobalCommandSurface`, afeta
   TODA página). Causa: extração para `packages/*` nunca atualizou os ~50 pontos de import em
   `web/`. Nenhum arquivo está perdido — todos existem em `packages/{ide-ui,runtime,export,
   visual-scripting}/`. Isto precede qualquer outra prioridade da lista abaixo — sem isto, nada
   builda. Ver §0-T para o inventário completo e o padrão de correção já validado.
1. ~~**Frente 3** — quebrar god-file `lib/server/websocket-server.ts` (1443 LoC).~~
   **❌ REMOVIDO 2026-07-03 — JÁ ESTÁ FEITO.** Ver §0-S.2. Não reabrir.
2. **Frente 44 / B2** — contexto AST de código (`web-tree-sitter`) — só com integração real no `tools-registry`.
3. **Wave 5 (B51/B52/B54 + Frente 7 wgpu)** — desktop nativo wgpu/git2/rocksdb no `Cargo.toml`.
   Esforço **menor do que estimado** — ver inventário real em §0-S.3 (18 arquivos `.rs` já existem,
   incluindo `wgpu_renderer.rs` com device/surface/swapchain reais). Continua sendo o maior programa
   restante, mas não é "do zero".
4. **N3** — arquivar `client/` + `shared/` (seguro: zero imports do produto). **Preservar `runtime-templates/`.**
5. **NOVO — Cost guard + ledger financeiro** — ver §0-S.1. Esforço **baixo** (wiring, não build).
6. **NOVO — `packages/engine` viola a regra "Pure ECS sem React"** — ver §0-S.1. 7 arquivos `.tsx`
   a mover/reescrever.

---

## §0-S. Segunda Reconciliação (validada 2026-07-03) — precedência sobre §0-R

Esta seção corrige divergências encontradas **dentro da própria §0-R** e nos 6 documentos
`cloud-web-app/CLAUDE_*`, verificadas linha a linha contra o HEAD atual do repositório.

### §0-S.1 — Achados novos que NENHUM dos 7 documentos (§0-R + os 6 CLAUDE_*) catalogava

| # | Achado | Evidência | Ação requerida |
|---|--------|-----------|-----------------|
| 1 | `packages/engine/services/RedisLedgerClient.ts` é um **segundo mock financeiro não catalogado**. O nome sugere Redis real; a implementação usa `pendingTokens` estático em memória e tem `// await prisma.user.update(...)` **comentado** — nunca persiste de verdade. | Leitura direta do arquivo, linhas 12–51. | Adicionar à lista de mocks a destruir junto com `payouts.ts#getCreatorEarningsSummary`. Nenhum dos 6 planos `CLAUDE_*` menciona este arquivo. |
| 2 | `lib/observability/cost-guard.ts` reimplementa Token Bucket em `Map()` **apesar de** `@upstash/redis@^1.34.3` já estar em `web/package.json` (dependência instalada, não usada) e **apesar de** já existir `lib/redis-cache.ts` — uma classe `RedisCache` madura com `ioredis` lazy-load, fallback em memória e decorator `createCachedDecorator`. | `grep @upstash/redis web/package.json` → presente. Leitura de `lib/redis-cache.ts`. | R1.3 (V8) não é "adicionar Redis" — é "conectar `cost-guard.ts` e `RedisLedgerClient.ts` à infra já existente". Reclassificar de `Build` para `Wire`, esforço baixo. |
| 3 | `packages/engine` (o pacote que a Architecture Spec §11.1 exige ser "Pure ECS, proibido `.tsx`") tem **7 arquivos `.tsx` hoje**: `NiagaraVFX.runtime.tsx`, `NiagaraVFXPanels.runtime.tsx`, `LevelEditor.viewport-runtime.tsx`, `LandscapeEditor.runtime.tsx`, `LandscapeEditor.scene-runtime.tsx`, `GameViewport.runtime.tsx`, `ui/InlineComposer.tsx`. | `Glob **/*.tsx` em `cloud-web-app/packages/engine`. | Violação ativa da própria regra documentada. Mover os componentes de controle React para `packages/ide-ui`, deixar apenas a matemática/estado em `packages/engine`. Não é dead code — são paineis funcionais, então é um refactor de separação, não uma exclusão. |
| 4 | `apps/studio-local/src-tauri/tauri.conf.json` **NÃO tem `csp: null`** nem `fs.scope: ["**"]` como a V8 (§0.P) afirma. O CSP real já é restrito (`default-src 'self' customprotocol: asset:`, sem wildcard de FS). Não existe pasta `capabilities/` (Tauri v2), então não há allowlist de FS amplo configurada — o padrão v2 já é restritivo. | Leitura direta de `tauri.conf.json`. | A postura de segurança do Desktop é **melhor** do que o V8 descreve. O que de fato falta: `updater` config e assinatura de código (não encontrados) — isso continua válido. |

### §0-S.2 — Frente 3 (god-file WebSocket): confirmado como CONCLUÍDO

`lib/server/websocket-server.ts` tem **435 linhas** (não 1443) e já importa de 10 módulos
extraídos: `websocket-server-collaboration.ts`, `websocket-server-lifecycle.ts`,
`websocket-server-file-events.ts`, `websocket-server-routing.ts`, `websocket-server-snapshots.ts`,
`websocket-server-modern.ts`, `websocket/auth.ts`, `websocket/event-bus.ts`,
`websocket-runtime-codecs.ts`, `websocket-runtime-contracts.ts`. **`docs/architecture/audit_backend_spine.md`
linha 24-25 ainda cita "1.443 LoC" — esse arquivo também precisa de correção**, mas não deve ser
reescrito por completo (fora do escopo desta auditoria); apenas essa linha específica está obsoleta.

### §0-S.3 — Desktop (`apps/studio-local/`): inventário real (V8 §0.P está desatualizado)

V8 descreve o Desktop como "1 arquivo `.rs`, 32 linhas, sem renderização/PTY/FS watcher/job queue/ML".
Isso descrevia um estado anterior. **Hoje existem 18 arquivos Rust:**

```
main.rs                  wgpu_renderer.rs         sidecars.rs
runtime_engine.rs         probe.rs                 policy.rs
plugin_sandbox.rs         physics_kernel.rs        physics_commands.rs
native_kernel.rs          lib.rs                   jobs.rs
gi_sdf.rs                 geometry_clusterizer.rs   desktop_commands.rs
daemon.rs                 contracts.rs              build.rs
```

`Cargo.toml` já declara `wgpu 0.19`, `rapier3d 0.18`, `portable-pty 0.8`, `notify 6.1`, `winit 0.29`,
`ort` (ONNX, opcional/feature `local-ai`). `wgpu_renderer.rs` já implementa
`WgpuRenderer::mount_on_window` com device/surface/swapchain reais via `instance.request_adapter` +
`request_device` — **não é um stub**. `physics_kernel.rs` e `gi_sdf.rs` sugerem que fatias de R3.1
(física nativa, SDF/GI) já têm fundação.

**Isto NÃO significa que R3 (Desktop) está pronto** — não há paridade com o Web, não há
`NativeIDEBackend` ligando os 89 painéis do `ide-ui`, e as capacidades reais desses 18 arquivos
não foram auditadas função a função nesta passada. **Significa apenas que a premissa "greenfield
total" do V8 §0.P está errada** e pode levar um executor a recriar `wgpu_renderer.rs`,
`physics_kernel.rs` ou `jobs.rs` do zero desnecessariamente. Antes de iniciar qualquer fase de R3,
um agente deve ler os 18 arquivos existentes e produzir um inventário função-a-função — isso não
foi feito aqui por estar fora do escopo (é trabalho de Rust profundo, não de reconciliação de docs).

---

## §0-T. Terceira Reconciliação (execução 2026-07-03): build está quebrado hoje

Esta seção documenta o achado mais crítico encontrado durante a **primeira rodada de execução real**
(sessão "pôr a mão na massa", não apenas auditoria de documentos). Precede em severidade tudo o que
está listado em §0-R e §0-S: **não é dívida técnica, é um build quebrado agora.**

### O que foi verificado
Rodado `npm run typecheck` (que é `tsc --noEmit`) em `cloud-web-app/web` duas vezes nesta sessão:
**exit code 2, 152 erros** (após uma correção pontual já aplicada, ver abaixo; eram 156 antes).
`next.config.js` tem `typescript: { ignoreBuildErrors: false }` — ou seja, `npm run build` falha
com o mesmo conjunto de erros. Isto não é uma amostra ou estimativa: é a saída real do compilador
contra o HEAD do repositório nesta data.

### Causa raiz (confirmada, não é hipótese)
A extração de código para `cloud-web-app/packages/*` (documentada em §0-S como "já aconteceu")
moveu os arquivos fisicamente, mas **nunca atualizou os pontos de import em `web/` que apontavam
para os caminhos antigos**, e os pacotes nunca foram ligados a `web/` via npm workspaces (isso já
era conhecido — ver R1.1 em `CLAUDE_MASTER_EXECUTION_PLAN_V8.md`). O que **não** estava documentado
até agora é a escala: são **~50 especificadores de módulo distintos, ~150 pontos de import**,
distribuídos em pelo menos 4 árvores inteiras:

| Import antigo (quebrado em `web/`) | Localização real (existe, verificado) | Nº specifiers |
|---|---|---|
| `@/components/ide/*` | `packages/ide-ui/*.tsx` | 13 |
| `@/lib/runtime/*` | `packages/runtime/*.ts` | 16 |
| `@/lib/export/*` | `packages/export/*.ts` | 2 |
| `components/visual-scripting/*` | `packages/visual-scripting/*.tsx` | 2 |
| `@/lib/engine/*.runtime`, `scene-graph-*`, `auto-lod-pipeline` | `packages/engine/*` | ~8 |

Destaques de impacto: `app/layout.tsx` importa `GlobalCommandSurface` de `@/components/ide/*` — como
é o root layout, isso está a montante de **toda página do app** no grafo de tipos. Os 5 handlers em
`app/api/exports/{glb,mp4,wav,usdz,project}/route.ts` importam `enqueueExportJob` de
`@/lib/export/enqueue-export-job`, que não existe em `web/` — a feature de export inteira está
quebrada, não apenas sem rate limit (rate limit foi adicionado nesta sessão às 5 rotas mesmo assim,
pois é código correto e independente; só não pode ser testado end-to-end até o import ser corrigido).
A tabela de arquivos canônicos do `.cursorrules`/`CLAUDE.md` também precisa de nota: ela afirma que
`components/visual-scripting/VisualScriptEditor.tsx` (689 LoC) existe em `web/` — na verdade está em
`packages/visual-scripting/VisualScriptEditor.tsx`.

### Prova de conceito da correção (executada e validada nesta sessão)
Corrigido `web/components/preview/CanvasViewportSurface.tsx` (3 imports quebrados: `Outliner3D`,
`PropertiesPanel3D`, `Timeline3D` — este arquivo é alcançável em runtime via
`components/canvas/UnifiedViewport.tsx`, que faz `dynamic(() => import(...))` dele quando o usuário
seleciona "Canvas Mode"; ou seja, não era teórico, quebrava a feature ao vivo). Padrão aplicado:

1. Trocar o import quebrado por caminho relativo direto para `packages/ide-ui/*` (não criar um novo
   alias `@aethel/ide-ui` no `tsconfig.json` sem testar — o alias `@aethel/runtime-contracts` que já
   existe lá não é usado por nenhum arquivo hoje, então não há prova de que a resolução webpack
   funciona; caminho relativo é garantido por qualquer bundler).
2. Isso expôs um segundo problema: arquivos em `packages/ide-ui/*.tsx` importam `lucide-react` (bare
   specifier), que só existe em `web/node_modules` — `packages/ide-ui` é *irmão* de `web`, não
   descendente, então a resolução Node por diretórios ancestrais nunca encontra o pacote.
   Corrigido adicionando `lucide-react` (mesma versão de `web/package.json`, `^0.294.0`) ao
   `packages/ide-ui/package.json` (antes um stub `{name, version, main}` sem dependências) e rodando
   `npm install --no-save --no-audit --no-fund` **escopado dentro de `packages/ide-ui/` apenas**
   (10s, 4 pacotes, zero efeito em `web/node_modules`).
3. Resultado: 156 → 152 erros, **zero novas quebras em qualquer outro arquivo** (confirmado
   comparando a lista completa de erros antes/depois). O padrão é repetível para os ~140 erros
   restantes: por pacote consumido, (a) trocar caminho de import quebrado por relativo até
   `packages/<pkg>/`, (b) adicionar ao `package.json` daquele pacote qualquer bare specifier que
   falte e rodar `npm install --no-save` só naquela pasta.

### Por que a migração completa (`workspaces` field) não foi feita nesta sessão
Esta máquina **não tem `git` instalado/no PATH** (comando retorna "não é reconhecido"). Não há como
tirar um checkpoint nem reverter com segurança um `npm install` que reorganiza hoisting de
`node_modules` do monorepo inteiro sob um `workspaces` field. **Ação recomendada antes da próxima
rodada: garantir `git` disponível e commitar um checkpoint antes de tocar em `workspaces`.** Até lá,
usar o padrão per-package acima (mais lento, porém com raio de explosão zero).

### Reclassificação de severidade
R1.1 deixa de ser "higiene arquitetural para fazer eventualmente" e passa a ser **bloqueador P0**:
sem isso, `npm run build` não produz artefato implantável hoje. Qualquer outra frente priorizada na
próxima rodada deve reservar tempo dedicado para levar os ~50 especificadores a verde usando o
padrão comprovado acima — ver texto completo da correção em
`cloud-web-app/CLAUDE_MASTER_EXECUTION_PLAN_V8.md`, seção R1.1.

---

## Apêndice — Auditoria V33 original (referência histórica)

As seções originais (§1 bifurcação R3F/WebGPU, §2 alucinações, §3 fatos backend, §4 as 15
correções, §5 as 6 frentes, §6 crítica estilística, §7 CLAUDE.md, §8-9 perguntas, §10 prompt,
§11-12 código pronto, §13 sumário) permanecem válidas como **racional**. Onde divergirem do
estado atual, **a §0-R acima prevalece**.

Pontos da V33 que continuam corretos e NÃO foram alterados:
- §1.3 caminho híbrido (web R3F / desktop wgpu).
- §3.2 `aaa-render-system.ts` tem 0 TODOs — é Three.js funcional, não esqueleto vazio.
- §3.1 dualidade de física é real (Frente N5 acima).
- §6 evitar termos de marketing ("AAA", "Padrão Adobe") sem critério mensurável.
- "Padrão Cursor" = sempre "Cursor 3.x Composer 2".
