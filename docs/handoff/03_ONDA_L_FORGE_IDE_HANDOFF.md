# Handoff 03 — Onda L: Aethel Forge / Universal IDE — 8 gaps 0% + 1 PARTIAL

**Spec binding único e completo:** `docs/architecture/AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` (v1.1). **Leia o documento inteiro antes de tocar em qualquer item L — ele já define contratos de interface (`ForgeSandboxSession`, `ProjectValidationGateResult`, `MultiSurfaceContextPack`), ordem de dependência oficial ("Release Train FORGE-v1"), e acceptance gates específicos por pilar (L.A/L.B/L.C).**

## Estado real confirmado (não confie em nenhum outro resumo, isto foi verificado linha a linha no ledger)

| Item | Nome | Status real | Depende de |
|---|---|---|---|
| L.1 | ForgeSandboxExecutor | **DONE** (round 3) | J.1 |
| L.2 | DevContainerManifest | **GAP (0%)** | L.1 — **agora desbloqueado** |
| L.3 | AgentShellPolicy | **DONE** — provado load-bearing (nega sessão se L.1 indisponível, teste `J-ACC L1-03b`) | L.1 |
| L.4 | ForgeTerminalBridge | **GAP (0%)** | L.1 |
| L.5 | ProjectValidationGate | **PARTIAL** — TS typecheck+lint real; **Rust (`cargo check`/`clippy`/`test`) ainda BLOQUEADO** (`rust-gate-unavailable.ts` não foi reconectado ao `execInForgeSandbox` do L.1) | L.1, Law XI |
| L.6 | AutonomousEngineerLoop | **DONE (CORE)** | L.1-L.5 |
| L.7 | AgenticUIStudio | **GAP (0%)** | J.2, preview |
| L.8 | PreviewOrchestrator | **GAP (0%)** | L.1, preview runtime |
| L.9 | FullStackScaffoldEngine | **GAP (0%)** | L.1, L.2 |
| L.10 | DesignTokenSync | **GAP (0%)** | L.7, Law X |
| L.11 | UIMutationTransaction | **DONE (CORE)** | J.1 Trava II |
| L.12 | RepoGraphRAG | **GAP (0%)** | J.4 VectorIndex, cartography |
| L.13 | UniversalLspFarm | **GAP (0%)** | B sidecar, Monaco |
| L.14 | MultiSurfaceContextPack | **DONE** | J.4, L.12, deep-context |

**Ordem oficial do próprio spec (§"Release Train FORGE-v1", linha ~301):**
`J.1 → L.1+L.3 → L.5 → J.4 → L.12+L.14 → L.6 → L.7+L.8 → L.9–L.11 → L.13`

Como J.1, L.1, L.3, J.4, L.14, L.6, L.11 já estão DONE, a **ordem real recomendada agora é**:

1. **L.5 (fechar o gap Rust)** — menor escopo, maior desbloqueio (é o único item PARTIAL, e destrava PRs de agente tocando `.rs`)
2. **L.12 (RepoGraphRAG)** — dependências já prontas (J.4 done)
3. **L.2 (DevContainerManifest)** — dependência (L.1) já pronta
4. **L.9 (FullStackScaffoldEngine)** — depende de L.1+L.2 (após L.2 fechar)
5. **L.7 + L.8 (AgenticUIStudio + PreviewOrchestrator)** — par acoplado pelo próprio spec
6. **L.10 (DesignTokenSync)** — depende de L.7
7. **L.4 (ForgeTerminalBridge)** — pode ser feito em paralelo a qualquer momento após L.1 (independente dos demais)
8. **L.13 (UniversalLspFarm)** — último na ordem oficial

---

## L.5 — Fechar o gap Rust (PARTIAL → DONE)

**Arquivos exatos envolvidos (confirmados no ledger, entrada `2026-07-25 j-l-audit`):**
- `lib/production/rust-gate-unavailable.ts` — hoje faz **block honesto** (fail-closed) para qualquer arquivo `.rs` no pipeline de apply de IA
- `lib/production/forge-sandbox-executor.ts` — já tem a primitiva genérica `execInForgeSandbox` capaz de rodar um comando `cargo` allowlisted dentro de uma raiz de projeto confinada (construída no round 3 de L.1, **mas nunca conectada**)
- `lib/production/project-l5-gate.ts` — gate combinado TS (typecheck→lint) que precisa ganhar um branch Rust

**Tarefa:** conectar `rust-gate-unavailable.ts` para de fato chamar `execInForgeSandbox` rodando `cargo check && cargo clippy -- -D warnings && cargo test` dentro do sandbox L.1, substituindo o bloqueio honesto atual por uma validação real. Só remova o "fail-closed BLOCK" quando a chamada real funcionar — nunca deixe passar `.rs` sem gate real.

**Teste obrigatório:** um patch `.rs` com erro de compilação intencional deve ser **negado** pelo L.5 via sandbox real (não só bloqueado por política genérica); um patch `.rs` válido deve **passar**.

---

## L.2 — DevContainerManifest

**Contrato do spec (linha 73):** `.aethel/devcontainer.json` + registro de templates (Node, Python, Rust, Next, Vite).

**Tarefa:** definir o schema JSON do manifest (base image/toolchain por template), criar o registro de templates em `lib/production/` (nome sugerido: `dev-container-manifest.ts`, seguindo a convenção de nomes já usada nos outros arquivos `lib/production/*.ts`), e conectar ao `ForgeSandboxExecutor` (L.1) para que a criação de sessão escolha o template certo. **Não invente um schema do zero — pesquise o formato real de `devcontainer.json` (spec pública da Microsoft/Dev Containers) e adapte, documentando explicitamente onde o Aethel diverge.**

---

## L.12 — RepoGraphRAG

**Contrato do spec (linha 93):** grafo de import/call + cartografia; "neighborhood slices for packs" (não dump de repo inteiro no prompt); substitui o RAG hash-only atual.
**Já existe para reaproveitar:** `repository-cartography.ts` (REAL, per "State today" table), `semantic-code-search.ts` (hash bag-of-words, PARTIAL — isto é o que L.12 substitui), J.4 VectorIndex (`lib/server/vector-index/`, DONE).

**Acceptance gate exato do spec (linha 284):** "resolves 'who imports X' correctly on Aethel monorepo fixture (≥90% precision)".

**Tarefa:** construir o grafo real de import/call a partir da cartografia existente, indexar no VectorIndex (J.4) para busca semântica combinada com grafo, e implementar a função de "neighborhood slice" que dado um arquivo/símbolo retorna vizinhança relevante (n á saltos no grafo) em vez do repo inteiro. **Escreva o fixture de teste real no próprio monorepo** (ex: escolha um arquivo com import conhecido e confirme que o grafo resolve corretamente) para provar o ≥90% de precisão — não afirme o número sem medir.

---

## L.7 + L.8 — AgenticUIStudio + PreviewOrchestrator (par acoplado)

**L.7 contrato (linha 83):** Viewport 2D com DOM tree, props inspector, design token picker, Magic Wand → agent bus.
**Já existe (seed):** `useMagicWand.ts`, `RuntimePreviewSurface`.
**L.8 contrato (linha 84):** inline / local dev server / E2B HMR; agente escolhe estratégia; sincroniza estado no contexto.

**Acceptance gates exatos (linhas 278-280):**
- Prompt → FullStackScaffoldEngine (L.9) → URL de preview E2B < 120s cold start (p95)
- Edição de elemento via Magic Wand → `UIMutationTransaction` (L.11, já DONE) → Ctrl+Z restaura TSX + preview
- Saída do `DesignTokenSync` (L.10) passa `qa:hardcoded-colors`

**Tarefa:** como L.9 (scaffold engine) ainda não existe, o acceptance gate completo de L.7/L.8 depende de L.9 também. **Faça L.8 (PreviewOrchestrator) primeiro** de forma isolada (decide estratégia de preview: inline iframe vs dev server local vs E2B, reaproveitando `preview-runtime-*`/`runtime-sync` já REAL/PARTIAL), depois L.7 (Viewport 2D DOM tree + props inspector) consumindo L.8. Não afirme o acceptance gate de "<120s cold start" completo até L.9 também estar pronto — documente PARTIAL nesse meio tempo.

---

## L.9 — FullStackScaffoldEngine

**Contrato (linha 85):** templates Next 14 / Vite / static; provisiona sandbox + abre preview.

**Tarefa:** usar L.1 (sandbox) + L.2 (devcontainer manifest, feche esse primeiro) para provisionar um projeto novo a partir de um template, rodar install/build inicial dentro do sandbox, e abrir a URL de preview via L.8. Teste real: prompt sintético → projeto Next.js mínimo criado → preview acessível.

---

## L.10 — DesignTokenSync

**Contrato (linha 86):** prompt → `var(--aethel-*)` + Tailwind; gate de QA `hardcoded-colors`.
**Já existe para reaproveitar:** o próprio ledger diz "CW5 design-system government row covers *manual* token migration, not an automated sync engine" (linha 340) — ou seja, já há trabalho manual de migração de tokens (CW5, ver `05_WEB_PLATFORM_POINTERS.md`) que pode servir de referência de quais tokens existem, mas **o motor automático de sync não existe**.

**Tarefa:** dado um trecho de código gerado por agente com cores hex, mapear automaticamente para o token `--aethel-*` mais próximo (ou criar um novo token se não houver correspondência, com aprovação), e garantir que a saída passe o gate `npm run qa:hardcoded-colors` (ou nome equivalente — confirme o nome exato do script em `cloud-web-app/web/package.json`).

---

## L.4 — ForgeTerminalBridge

**Contrato (linha 75):** xterm → sandbox PTY via WSS; stream → evidence ledger.
**Já existe para reaproveitar:** componentes de terminal já mencionados no spec ("terminal components"), `desktop_commands.rs` (PTY real do lado nativo — **cuidado, esse é host PTY, NUNCA conecte agente a ele, só humano**, Decisão #48).

**Tarefa:** criar o bridge WSS que conecta o xterm.js do lado web/IDE à sessão de sandbox do L.1 (não ao host PTY), streamando stdout/stderr para o `task-evidence-ledger` (mesmo ledger que L.1 já usa — reaproveite `getForgeSandboxLedger`).

---

## L.13 — UniversalLspFarm

**Contrato (linha 94):** sidecars de language server (spawn via Tauri + relay cloud); auto-connect do bridge Monaco.
**Já existe para reaproveitar:** `monaco-lsp-bridge.ts` (REAL, client-side). **O que falta é o servidor** — hoje `DEFAULT_LSP_WS_URL` é um stub localhost.
**Acceptance gate exato (linha 285):** "TS + Python LSP hover/definition work in Monaco desktop export".

**Tarefa:** hospedar/spawnar servidores LSP reais (typescript-language-server, pylsp ou pyright) como sidecar processes (via Tauri no desktop, via relay no cloud), conectar ao bridge Monaco existente. Teste real: hover sobre um símbolo TS conhecido retorna tooltip correto; "go to definition" em Python funciona.

---

## Prompt pronto (exemplo para L.5 — adapte para os demais)

```
Releia docs/architecture/AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md §"Contracts" (ProjectValidationGateResult) e a entrada do ledger docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md linha ~335 (L.5) e ~457 (nota específica sobre rust-gate-unavailable.ts não reconectado).

TAREFA: Conecte lib/production/rust-gate-unavailable.ts para chamar de verdade execInForgeSandbox (já existente em lib/production/forge-sandbox-executor.ts) rodando `cargo check && cargo clippy -- -D warnings && cargo test` dentro do sandbox L.1, para qualquer patch de agente tocando arquivos .rs. Substitua o bloqueio fail-closed atual por uma execução real — só remova o BLOCK quando a chamada de fato funcionar; nunca deixe um patch .rs passar sem gate real.

Escreva 2 testes: (1) um patch .rs com erro de compilação intencional deve ser NEGADO pelo L.5 via sandbox real; (2) um patch .rs válido deve PASSAR.

Não toque em nenhum arquivo relacionado a Onda G (packages/aethel-kernel-rust/src/*, apps/studio-local/src-tauri/src/kernel_*_wire.rs) nesta rodada.

Rode npm run typecheck && npm run lint (cloud-web-app/web) nos arquivos tocados, e a suite Vitest relevante a lib/production/rust-gate-unavailable.ts e project-l5-gate.ts.

Atualize docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md marcando L.5 PARTIAL → DONE (ou mantendo PARTIAL com o motivo exato se algo não fechar).

PARE ao final e reporte.
```
