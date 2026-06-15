# AUDITORIA V33 — Crítica dos 3 MDs + Reconciliação V34

> **Status deste documento:** a auditoria V33 original foi escrita em **2026-07-20** contra
> um HEAD antigo (`7f383b25`). Desde então, boa parte das correções já foi executada.
> A **§0-R (Reconciliação)** abaixo registra o estado REAL atual do repositório e deve ser
> lida ANTES das seções originais — várias "alucinações" e "frentes faltando" já não existem.
>
> Regra suprema mantida: **executar, não auditar de novo.** Não criar V35.

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
| `components/engine/NiagaraVFX.runtime.tsx` | não existe | ⚠️ ainda não — usar `NiagaraVFX.tsx` / `NiagaraVFXPanels.tsx` |
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

### Frente A5 / A8 — estado
- **A5** (dropzone viewport): ✅ JÁ usava tokens (`ViewportAssetDropOverlay`).
- **A8** (Outliner virtualizado): ✅ FEITO 2026-06-15 — `SceneViewportOutliner` usa
  `@tanstack/react-virtual` (`useVirtualizer` + `measureElement`).

### O que GENUINAMENTE falta (bulk real, por ordem de valor)
1. **N5** — unificar os dois motores de física (decisão: Rapier worker como oficial; `@deprecated` no TS).
2. **Frente 44 / B2** — expandir `lib/ai/deep-context-manager.ts` (hoje 277 LoC) para RAG AST com `web-tree-sitter`.
3. **Frente 3** — quebrar god-file `lib/server/websocket-server.ts` (1443 LoC).
4. **Frente A40** — ghost previews (Monaco decorations) em `EditorApplyBridgeContext.tsx`.
5. **Frente A7** — fiar `ScrubbableInput` no Inspector real.
6. **Wave 5 (B51/B52/B54 + Frente 7 wgpu)** — desktop nativo wgpu/git2/rocksdb no `Cargo.toml`.
   Esforço grande (~10 dias). NÃO iniciar em batch rápido.
7. **N3** — arquivar `client/` + `shared/` (seguro: zero imports do produto). **Preservar `runtime-templates/`.**

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
