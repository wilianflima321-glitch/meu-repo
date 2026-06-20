# Future Improvements Registry (Post-Debt)

**Purpose:** Canonical backlog of **planned enhancements** — experiences, interfaces, quality bars, and product ideas to implement **only after** technical debts are resolved.  
**Prerequisite:** [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) — Tier 1→3 `DEBT-*` items addressed or explicitly waived with gate evidence.  
**Executor mega-blocks:** [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md) — pair `IMPROVE-*` with debts **inside the same Wave**; do not wait for all 69 debts globally.  
**Companion:** [`audit_frontend_ui_ux.md`](./audit_frontend_ui_ux.md) — tactical UX hitlist (A4–A50); items here may **merge** or **extend** those fronts once debts are clear.  
**Audience:** Claude Opus / future agents — execute **after** debt alignment, not in parallel with critical fixes.  
**Rule:** Cursor **annotates only** from user pastes; no implementation until user asks. Capture every idea with enough detail that nothing is lost.

**Created:** 2026-06-17  
**Last reconciled:** 2026-06-17 (Batch 11 — terminal PTY fracture, dashboard density, route maturity gate).

---

## How this file differs from the Debt Registry

| Aspect | `AI_CRITIQUE_DEBT_REGISTRY.md` | This file |
|--------|-------------------------------|-----------|
| Nature | Bugs, stubs, security gaps, false success | Enhancements, polish, new experiences |
| When | **Now** (Tier 1 first) | **After** debts aligned |
| IDs | `DEBT-*` | `IMPROVE-*` |
| Source | GLM critique + code validation | User / product planning pastes |
| UI debt vs UI dream | Fixes broken/placeholder UI | Elevates UX to market gold standard |

**Hard gate before any `IMPROVE-*` work:**

```bash
cd meu-repo/cloud-web-app/web
npm run qa:enterprise-gate   # must PASS
```

Plus: linked `DEBT-*` blockers for that improvement must be **DONE** or **WAIVED** (document waiver + gate).

---

## How Claude should use this file

1. **Do not start here** if enterprise gate is red or Tier 1 debts are open.
2. For each `IMPROVE-*`: check `blocked_by` DEBT IDs; verify blockers resolved on current branch.
3. Prefer order: **Phase A (foundation)** → **B (interfaces)** → **C (experiences)** → **D (market polish)**.
4. UI work: canonical **EN** copy; tokens `var(--aethel-*)`; no new inline-style surfaces.
5. When user paste overlaps an existing `DEBT-*` or `audit_frontend_ui_ux` front, **cross-link** — do not duplicate as improvement if it is still debt.

---

## ID scheme — `IMPROVE-*`

| Field | Required |
|-------|----------|
| `ID` | `IMPROVE-<AREA>-<NNN>` e.g. `IMPROVE-UX-001`, `IMPROVE-IDE-012` |
| `Title` | Short name |
| `Detail` | Full user intent — screens, flows, acceptance cues |
| `Area` | `ux` \| `ide` \| `studio` \| `viewport` \| `ai` \| `collab` \| `desktop` \| `audio` \| `vfx` \| `quality` \| `platform` |
| `Phase` | A \| B \| C \| D (see below) |
| `blocked_by` | `DEBT-*` list (empty if none) |
| `related_ux` | `audit_frontend_ui_ux` front e.g. A21 (optional) |
| `files` | Known paths if mentioned |
| `acceptance` | How to know it is done (gates, UX checks, demos) |
| `status` | `draft` \| `ready` \| `blocked` \| `done` |

### Phase legend

| Phase | Meaning | Typical timing |
|-------|---------|----------------|
| **A** | Unblocks other improvements (shared primitives, design system, docking infra) | First post-debt slice |
| **B** | Interface surfaces — shells, panels, layouts, navigation | After A |
| **C** | End-to-end experiences — workflows users feel as “product” | After B |
| **D** | Market polish — parity claims, performance delight, competitive demos | Last |

---

## Parallel workflow (user + Cursor + Claude)

| Role | Responsibility |
|------|----------------|
| **User** | Paste future plans, interface needs, quality bars (PT discussion OK) |
| **Cursor** | **Annotate only** — append structured `IMPROVE-*` rows; link `DEBT-*` blockers; no code |
| **Claude Opus** | After debts done — validate, sequence phases, implement with gates |

**Ingest rule:** One user paste → one registry section (batch N). Preserve user wording in `Detail`; normalize into table fields.

---

## 0. Prerequisite snapshot (from debt registry, 2026-06-17)

Do **not** treat improvements as started until these are closed or waived:

| Priority | Representative blockers | Why improvements wait |
|----------|-------------------------|------------------------|
| P0 | `DEBT-YJS-001`, `DEBT-EXT-001`, `DEBT-DB-003`, `DEBT-AI-012` | Collab, security, false success, streaming hardening |
| P1 | `DEBT-AI-001`, `DEBT-AI-002`, `DEBT-SSE-001`, `DEBT-RENDER-003` | Single AI spine, agent loop, live status, real viewport render |
| Engine | `DEBT-ASSET-001`, `DEBT-NIAGARA-002`, `DEBT-PERF-003/004` | Building features on broken/importer/viewport base wastes effort |

Full list: ~57 `DEBT-*` in debt registry.

---

## 1. Improvement backlog (ingest table)

| ID | Title | Area | Phase | blocked_by | related_ux | status | Detail (summary) |
|----|-------|------|-------|------------|------------|--------|------------------|
| `IMPROVE-STUDIO-001` | Hub densidade pro — remover “guia para humanos” | studio | B | — | — | draft | Substituir parágrafos (“Choose the editor…”, maturidade em prosa) por badges atômicas; paddings compactos; tabela hub `rounded-[28px]` → densidade operador |
| `IMPROVE-STUDIO-002` | Workspace docking — abas únicas preservando WebGL | studio | A | `DEBT-RENDER-003` | A21, A36 | draft | Trocar navegação por rotas Next (`/studio/terrain` ↔ `/studio/level?tool=`) por tab/dockview no mesmo shell; **não** desmontar Canvas R3F ao trocar ferramenta |
| `IMPROVE-STUDIO-003` | Mobile editor switcher premium | studio | B | — | — | draft | Remover `<details>` nativo em `CreativeStudioShell.tsx`; dropdown glassmorphic + busca rápida + atalhos teclado |
| `IMPROVE-STUDIO-004` | Transições sem flicker 1–2s | studio | A | `IMPROVE-STUDIO-002` | — | draft | Eliminar reload destrutivo ao alternar tools em `StudioGroupedEditorClient` (`Link ?tool=`) e rotas `creative-studio-routes.ts` |
| `IMPROVE-VS-001` | Visual Script — zero inline styles | studio | B | — | A4 | draft | Migrar 100% `style={{}}` → tokens Tailwind `--aethel-*`; suportar light/dark; grep gate antes/depois |
| `IMPROVE-VS-002` | Visual Script — perf >50 nós | studio | C | `IMPROVE-VS-001` | — | draft | Avaliar layer Canvas/WebGL ou memoização agressiva; hoje DOM+SVG lag no drag ReactFlow |
| `IMPROVE-VS-003` | Catálogo contextual RMB + fuzzy search | studio | C | `IMPROVE-VS-001` | — | draft | Remover painel lateral permanente; menu sob cursor (estilo UE Blueprint) com busca teclado |
| `IMPROVE-VS-004` | Pin type safety + hints visuais | studio | C | `DEBT-UX-VS-001` | — | draft | Bloquear fios incompatíveis (string↔number); highlights dinâmicos nos pinos |
| `IMPROVE-VFX-001` | Niagara gradient builder premium | vfx | C | `DEBT-NIAGARA-002` | A17 | draft | Rampa Color over Lifetime interativa (markers drag, opacity) — não hex/native picker |
| `IMPROVE-VFX-002` | Niagara dope sheet / burst timeline | vfx | C | `DEBT-NIAGARA-002` | A10 | draft | Timeline para bursts e emissões coordenadas |
| `IMPROVE-VFX-003` | Niagara graph honest UX | vfx | B | `DEBT-NIAGARA-002` | — | draft | Ocultar grafo cosmético até compilar para GPU; ou banner “held” explícito |
| `IMPROVE-VFX-004` | Niagara graph↔sim sync | vfx | C | `DEBT-NIAGARA-002`, `DEBT-PERF-001` | U56 | draft | Compilador nós → `emitterConfig`/compute buffers WebGPU |
| `IMPROVE-IDE-001` | Dock inferior resize horizontal | ide | B | `DEBT-UX-DOCK-001` | A21 | draft | Grip entre Agents 55% e Terminal 45% em `ModernIDEShellCenterStack.tsx` |
| `IMPROVE-IDE-002` | Corrigir Tailwind inválido dock | ide | B | `DEBT-UX-DOCK-001` | — | draft | `bg-[var(--aethel-surface-primary)]/2` → `color-mix` ou opacidade válida |
| `IMPROVE-IDE-003` | Virtualizar **todas** árvores de cena | ide | A | — | A8 | draft | `SceneViewportOutliner` já tem virtualizer — estender a outliners mock do studio (Character, Film, hub) e qualquer SceneGraph recursivo |
| `IMPROVE-IDE-004` | Monaco ghost text (inline AI suggest) | ide | C | `DEBT-AI-012`, `DEBT-AI-001` | — | draft | Sugestão em cinza na linha; Tab accept — não só lista dropdown |
| `IMPROVE-IDE-005` | Monaco Inline Composer Ctrl+K | ide | C | `DEBT-AI-001` | Frente 1 | draft | `ContentWidget` flutuante; seleção → edit in place multiarquivo |
| `IMPROVE-IDE-006` | Ghost diff Monaco decorations | ide | B | — | A40 | draft | Holographic pending diff antes de apply; integrar com `useApplyGhostPreview` / apply bridge |
| `IMPROVE-FILM-001` | Inverter slots áudio — SoundCue no viewport | studio | B | `DEBT-STUDIO-001` | — | draft | `FilmStudioClient`: SoundCueEditor ~260px inspector → viewport central quando `tool=audio` |
| `IMPROVE-FILM-002` | AudioMixInspector na lateral estreita | studio | B | `IMPROVE-FILM-001` | — | draft | Mixer levels no inspector; viewport para grafo denso ReactFlow |
| `IMPROVE-ANIM-001` | Expor Rig + Facial editors | studio | B | — | — | draft | `animation/page.tsx` importa `ControlRigEditor`/`FacialAnimationEditor` mas só renderiza `AnimationBlueprint` |
| `IMPROVE-ENV-001` | Foliage sliders funcionais + feedback | studio | C | `DEBT-PERF-003` | — | draft | `FoliagePainterRuntime.tsx`: wind, scale, slope — hoje `readOnly` / `onChange={() => {}}` |
| `IMPROVE-TERRAIN-001` | Brush UX viewport-first | studio | C | `DEBT-TERRAIN-001` | A14 | draft | Atalho B+drag resize brush; menus radiais no cursor; menos ida à sidebar |
| `IMPROVE-UX-001` | PremiumLoadingState + shimmer | quality | A | — | A3, §3 Premium | draft | Substituir ~1300 “Carregando…” ad-hoc; 4 variantes route/data/inline/splash |
| `IMPROVE-TIMELINE-001` | Dope sheet / curves em Canvas 2D | studio | C | — | A10 | draft | Timelines animação/film/audio: abandonar divs React para pan/zoom performático |
| `IMPROVE-QUALITY-001` | Padrão ouro competitivo explícito | quality | D | Tier1 debts | — | draft | Benchmark: UE5/Blender densidade; Cursor/Zed IDE; Figma Dev tokens — **zero** “UX conceitual” |
| `IMPROVE-VS-005` | Nó/paleta — tokens por tipo (tema-aware) | studio | B | `IMPROVE-VS-001` | A4 | draft | `definition.color`/`node.color` inline (~75,220,332,365) → `--aethel-node-*-bg/text`; alto contraste sem texto ilegível |
| `IMPROVE-VS-006` | Context menu — clamp viewport | studio | B | — | — | draft | `style={{ left: x, top: y }}` (~301) sem colisão; flip quando `x+menuW > innerWidth` |
| `IMPROVE-VS-007` | ScrubbableInput + expressões em portas | studio | C | `IMPROVE-VS-001` | — | draft | Substituir `<input type="number">` ~70px (~104–108); drag horizontal + eval `10*3` |
| `IMPROVE-VS-008` | Visual script → AST WASM bake (Frente 6) | studio | D | `DEBT-UX-VS-001` | audit_backend_spine | draft | Grafo JS main-thread → AST compatível compilador WASM; bake binário nativo |
| `IMPROVE-DASH-001` | Dashboard — isolar re-render streaming | platform | A | `DEBT-AI-012` | — | draft | `useDashboardUiState` ~46 `useState`; `dashboardShellProps`/`dashboardMainProps` monolíticos; chat tokens não devem re-renderizar billing/wallet/shell |
| `IMPROVE-UX-002` | AlertBanner em todos erros de superfície | quality | B | — | A6 | draft | `AlertBanner.tsx` V33 ok; billing/auth/rede ainda usam caixas ad-hoc sem dismiss |
| `IMPROVE-IDE-007` | AI Console → Right Rail | ide | B | `DEBT-UX-DOCK-001` | Rule 4, 08_WORKBENCH | draft | Agents sai do bottom dock; Right Rail durante coding; terminal 100% largura na base |
| `IMPROVE-IDE-008` | Bottom dock — aba exclusiva + terminal autônomo | ide | B | `DEBT-UX-DOCK-001` | A21, 08_WORKBENCH | draft | `useModernIDEPanels`: sem chave `terminal`; fechar chat não pode ocultar terminal (`CenterStack` ~103) |
| `IMPROVE-IDE-009` | Honrar `activeBottomPanel` no render | ide | B | `DEBT-UX-DOCK-001` | — | draft | Prop passada em `ModernIDEShellPanels` ~141 mas **ignorada** em `ModernIDEShellCenterStack` destructuring/render |
| `IMPROVE-IDE-010` | Preview — barramento de estado unificado | viewport | A | `DEBT-RENDER-003` | — | draft | `CanonicalPreviewSurface` wrapper; estado duplicado vs `usePreviewRuntimeManager`/`PreviewRuntimeToolbar` |
| `IMPROVE-IDE-011` | AI Console hierarquia operacional | ai | C | `DEBT-AI-001` | Rule 4 | draft | Approvals > Runs > Plan > Conversation; não chat-first 50/50 com preview |
| `IMPROVE-IDE-012` | Unificar superfícies de chat | ide | B | `DEBT-AI-001` | — | draft | `AIChatPanelPro`, `InlineAIChat`, agents `AIChat*` — uma gramática visual/tokens |
| `IMPROVE-IDE-013` | Cmd+K — `InlineComposerWidget` não modal | ide | C | `DEBT-AI-001` | Frente 1 | draft | Widget existe; `MonacoEditorPro.runtime.tsx` ~426 renderiza `InlineEditModal` fullscreen — trocar |
| `IMPROVE-IDE-014` | Diff inline LCS (não line-zip) | ide | B | — | A40 | draft | `computeSimpleDiff` ~411 em `InlineEditModal.tsx` — inserção no topo desalinha 30 linhas |
| `IMPROVE-IDE-015` | UI catálogo de plugins | platform | C | `DEBT-PLUGIN-001` | — | draft | APIs `/api/plugins/*` stub; zero painel front para installed/available |
| `IMPROVE-BLUEPRINT-001` | Matriz conformidade guardrails V33 | quality | D | — | 19_BEST_IN_MARKET | draft | Rule 1 foco, Color Rule machined, feedback conexões VS, hub redirects — drift vs blueprint |
| `IMPROVE-ADMIN-001` | Admin → Card + StudioGlobalNav | platform | B | — | COMPONENT_CONSOLIDATION_MAP | draft | `AdminPageHeader`/`AdminSummaryGrid` estética SaaS genérica vs Studio |
| `IMPROVE-FILM-003` | DirectorMode viewport real | studio | C | `DEBT-RENDER-003` | — | draft | Placeholder “Director Mode (Nexus Deprecated)” em `FilmStudioClient.tsx`/`film/page.tsx` |
| `IMPROVE-STUDIO-005` | LevelEditor — eliminar sidebars embutidos | studio | A | — | Rule 1 | draft | Remover 250px OutlinerMini + 320px DetailsPanelMini de `LevelEditor.tsx` (~345–511); popular slots `outliner`/`inspector` do `CreativeWorkbenchShell` via callbacks |
| `IMPROVE-STUDIO-006` | Studio Home — hub shell minimalista | studio | B | — | 19_BEST_IN_MARKET, 06_STUDIO_HOME | draft | `app/studio/page.tsx` ~203: remover `CreativeWorkbenchShell`; shell hub-only (missões + grid); sem outliner/inspector diagnóstico na primeira dobra |
| `IMPROVE-STUDIO-007` | Maturity gating no hub e middleware | platform | B | — | — | draft | `isRouteVisible()` existe mas **não é consumido**; ALPHA (`/studio/film`, `/studio/vfx`) listados em `PRIMARY_CREATIVE_HREFS`; alinhar hub + `workbench-convergence.ts` |
| `IMPROVE-VS-009` | VS ContextMenu → primitivo global | studio | B | `IMPROVE-VS-006` | — | draft | Substituir `ContextMenu` local (~240) por `components/ui/context-menu.tsx` (`createPortal` + `useEdgeAwarePosition`) |
| `IMPROVE-IDE-016` | Virtualizar FileExplorerTree | ide | A | — | A8 | draft | `FileTreeNode` recursão DOM (~127–144); flatten + `@tanstack/react-virtual` como `WorldOutliner` |
| `IMPROVE-IDE-017` | Command Palette — FZF Wasm/Worker | ide | C | — | — | draft | `fuzzyMatch` JS síncrono (~256) na main thread; port `fzf-wasm` + Web Worker sub-10ms |
| `IMPROVE-UX-003` | Export UI — fail-soft honesto | quality | B | `DEBT-RENDER-001` | Rule robustez | draft | APIs 202 `_pending` receipt stub → UI sem loader infinito; 501/held banner até pipeline real |
| `IMPROVE-FILM-004` | Timeline — clip inspector no shell | studio | B | `IMPROVE-FILM-001` | Rule 1 | draft | `VideoTimelineEditor` painel 280px Inspector/Effects (~317) dentro slot timeline 100–300px; props do clipe → `inspector` do shell |
| `IMPROVE-FILM-005` | Cinematic — inspector contextual | studio | B | `DEBT-STUDIO-001` | — | draft | `tool=cinematic`: `CloudStreamStudioClient` 360px interno + shell `AudioMixInspector` irrelevante (~163); métricas stream → slot inspector |
| `IMPROVE-QUEST-001` | Quest — inspector único | studio | B | `IMPROVE-STUDIO-005` | — | draft | `QuestEditor` `w-80` (~172) + página `QuestInspector` mock (~97) = dois inspetores direita |
| `IMPROVE-STUDIO-008` | Slot bridge API — editores headless | studio | A | `IMPROVE-STUDIO-005` | 08_WORKBENCH | draft | `SoundCueEditor`/`VideoTimelineEditor`/`QuestEditor` despojados de colunas internas; estado selecionado → `outliner`/`inspector` shell via bridge |
| `IMPROVE-STUDIO-009` | Rota `/studio/audio` dedicada | studio | B | `IMPROVE-FILM-001` | — | draft | Sem `app/studio/audio/`; só redirect `creative-studio-routes.ts` → `/studio/film?tool=audio` |
| `IMPROVE-DESK-001` | Tauri — sidecars wgpu/ffmpeg/onnx ativos | desktop | D | `DEBT-SIDECAR-001`, `DEBT-DESK-004` | — | draft | `native_kernel.rs` + `v29-sidecar-lifecycle`: só fs-watch/PTY Available; wgpu/rapier/ffmpeg held; desktop = WebView+cloud |
| `IMPROVE-AI-001` | Agent Client Protocol (ACP) unificado | ai | A | `DEBT-AI-001`, `DEBT-AI-002` | — | draft | Barramento assíncrono único desktop Rust + cloud WSS; agentes criativos/código mesmo protocolo; patches estruturados; substitui chat fragmentado (`IMPROVE-IDE-012`) |
| `IMPROVE-AI-002` | Indexação vetorial contínua (cartography++) | ai | A | `DEBT-SEARCH-002`, `DEBT-DESK-003` | — | draft | Thread baixa prioridade: `fs_watch` → embeddings reais (SQLite-vec/DeltaDB); hoje `repository-cartography.ts` + `embedText` hash bag |
| `IMPROVE-AI-003` | Execução híbrida local-nuvem | ai | C | `DEBT-DESK-004`, `DEBT-AI-012` | — | draft | Estender `policy.rs` `RuntimeJobLane::AiLocalInference` + `agent-tool-job-runner.ts`: autocomplete NPU local <20ms; refactors massivos → E2B/cloud sandbox |
| `IMPROVE-ENG-001` | Pipeline WGSL WebGPU/WGPU 1:1 | viewport | D | `DEBT-SIDECAR-001`, `IMPROVE-DESK-001` | — | draft | Desktop `wgpu` Rust + Web WebGPU mesmo WGSL; paridade cloud/local <2ms submit |
| `IMPROVE-ENG-002` | Gaussian Splatting no pipeline | viewport | D | `IMPROVE-ENG-001` | aethel_vision_2030 | draft | Rasterização splats WebGPU/WGPU; ingest mobile/cloud; −90% storage vs mesh clássica |
| `IMPROVE-ENG-003` | DirectStorage / GPU decompression | desktop | D | `IMPROVE-ENG-001` | aethel_vision_2030 | draft | Kernel Tauri: NVMe→VRAM bypass CPU; zero loading screens mundos abertos |
| `IMPROVE-COLLAB-001` | Spatial P2P mesh + autoridade dinâmica | collab | D | `DEBT-YJS-001` | aethel_vision_2030 | draft | Células espaciais; física delegada a nós capazes; WebRTC ultra-baixa latência; reduz custo AWS MMO |
| `IMPROVE-COLLAB-002` | CRDT cena 3D (Yjs/DeltaDB) | collab | C | `DEBT-YJS-001` | — | draft | Mesmo motor colaboração IDE → transforms/grafo cena; deltas matemáticos sem file lock |
| `IMPROVE-GEN-001` | IA operadora de grafos visuais | ai | C | `DEBT-AI-001`, `IMPROVE-STUDIO-008` | — | draft | Prompt em `SoundCueEditor`/`QuestEditor`/VFX → instancia nós, fia pinos, ajusta params autonomamente |
| `IMPROVE-GEN-002` | Síntese neural áudio/VFX runtime | vfx | D | `IMPROVE-ENG-001` | aethel_vision_2030 | draft | Sintetizadores neurais GPU/NPU in-game; `Audio.synthesize(prompt)`; jogos 150GB→10GB |
| `IMPROVE-DESK-002` | Terminal PTY real (portable-pty) | desktop | A | `DEBT-DESK-002` | — | draft | Substituir `create_held`/`write_held` em `desktop_commands.rs`; stdout→`aethel:pty-data`; xterm.js |
| `IMPROVE-DESK-003` | fs_watch emissão reativa | desktop | A | `DEBT-DESK-003` | — | draft | `Ok(_event)` (~277) → `window.emit("aethel://file-system-event")`; refresh asset tree + editor |
| `IMPROVE-DESK-004` | Inferência local ONNX (ort) | desktop | C | `DEBT-DESK-004`, `DEBT-SIDECAR-001` | — | draft | `ai_complete` hoje `provider_unavailable`; Qwen/Llama Int4 via `probe.rs` NPU/GPU detect |
| `IMPROVE-BRIDGE-001` | Aethel Bridge IPC (WSS loopback) | platform | A | `IMPROVE-DESK-002`, `IMPROVE-DESK-003` | — | draft | Porta efêmera 49152–65535; SCT no OS keyring; JSON-RPC 2.0; Web IDE consome kernel local |
| `IMPROVE-PLATFORM-001` | Workspace unificado 3 janelas | platform | B | `IMPROVE-BRIDGE-001` | 15_MOBILE_COMPANION | draft | Local/Web/Mobile = mesma sessão reativa; não três produtos; hierarquia Workbench center |
| `IMPROVE-PLATFORM-002` | Cross-Device Continuity (`AethelWorkspaceState`) | platform | C | `DEBT-DB-001` | 15_MOBILE_COMPANION | draft | JSON versionado: file, cursor, tool, chat thread, runId; Redis sync; card "Continue where you left off" |
| `IMPROVE-PLATFORM-003` | Prisma `McpServer` + `RenderJob` live | platform | A | `DEBT-DB-001`, `DEBT-RENDER-001`, `DEBT-DB-002` | — | draft | Schema canônico user paste; APIs deixam `(prisma as any)` e 202 stubs |
| `IMPROVE-PLATFORM-004` | Render queue real (BullMQ/Redis) | platform | B | `IMPROVE-PLATFORM-003`, `DEBT-RENDER-001` | — | draft | `queue-system.ts` opcional hoje; wire `POST /api/exports/mp4` → prisma job → worker → S3 |
| `IMPROVE-MOBILE-001` | Gated approval cards (semantic diff) | platform | C | `IMPROVE-IDE-011` | 15_MOBILE_COMPANION | draft | Impact summary + risk level; swipe approve/reject; não diff linha-a-linha no phone |
| `IMPROVE-MOBILE-002` | Captura mobile → Gaussian Splat pipeline | platform | D | `IMPROVE-ENG-002` | 15_MOBILE_COMPANION | draft | Camera/LiDAR → cloud splat train ~3min → asset sync IDE Local asset browser |
| `IMPROVE-MOBILE-003` | AI Composer Lite (voz/vibe-coding) | platform | C | `DEBT-AI-001` | 15_MOBILE_COMPANION | draft | Intenção complexa por voz; cloud processa; preview vídeo comprimido no visor |
| `IMPROVE-STUDIO-010` | Store unificada shell criativo | studio | A | `IMPROVE-STUDIO-008` | — | draft | Estender padrão `workbenchUiStore.ts` (existe IDE) → `creativeWorkbenchStore` para slots inspector/outliner; **nota:** `workbench-store.ts` não existe no repo |
| `IMPROVE-QUALITY-002` | Honesty-first — moat vs Unreal | quality | A | — | aethel_vision_2030 | draft | **Não** competir Nanite/Lumen/Chaos em polígonos; moat = iteração Rust/WASM+IA, 3DGS WebGPU, USD orquestração |
| `IMPROVE-AI-004` | IA integradora USD (não gera malha) | ai | C | `DEBT-SEARCH-002` | I70 | draft | Prompt → `.usda` posiciona Megascans/assets; nunca mesh amorfa Tripo3D; pipeline reativo leve |
| `IMPROVE-AI-005` | Video-to-mechanic → Visual Script | ai | C | `IMPROVE-VS-010`, `DEBT-AI-001` | I70 | draft | Vision-agent extrai física de vídeo 5s → nós pré-configurados em `VisualScriptEditor` |
| `IMPROVE-AI-006` | Asset morphing orquestrado | ai | C | `IMPROVE-AI-004` | I70 | draft | Variantes sem remesh: deformação vértices + shaders musgo/rachadura sobre asset library |
| `IMPROVE-AI-007` | Tree-sitter AST RAG (mobile+IDE) | ai | A | `DEBT-SEARCH-003` | Frente 44 | draft | `web-tree-sitter` + `slicePrompt(symbol)`; vibe-coding móvel sem projeto inteiro no prompt |
| `IMPROVE-AI-008` | Evidência visual headless (before/after) | ai | B | `DEBT-RENDER-001` | Frente 41 | draft | `task-evidence-ledger.ts` + OffscreenCanvas 60f → WebM/GIF em `AgentEvidencePanel` |
| `IMPROVE-ENG-004` | Overlay WGPU nativo child window (B51) | viewport | C | `IMPROVE-ENG-001`, `IMPROVE-DESK-001` | audit_backend B51 | draft | `NativeViewportAnchor` + `aethel://viewport-bounds-changed`; Rust wgpu sobre div âncora; Tauri only |
| `IMPROVE-ENG-005` | Scene bake OOP→ECS (U57/B52) | viewport | C | `DEBT-PERF-004` | audit_backend U57 | draft | Play: hierarquia → `SharedArrayBuffer` Float32 stride 10; Rapier worker + compute 0% GC |
| `IMPROVE-VS-010` | VS JIT compiler Rust→WASM (F6/M69) | studio | C | `DEBT-UX-VS-001` | audit_backend F6 | draft | DAG+topo sort; memória linear; wasm-encoder; syscalls `aethel_sys::*`; substitui `runtime-core/executors.ts` JS |
| `IMPROVE-DESK-005` | Rust VFS local Sled/RocksDB (F2) | desktop | B | `IMPROVE-DESK-001` | audit_backend F2 | draft | Cache offline splats/assets; Prisma só nuvem; `Cargo.toml` sled/rocksdb |
| `IMPROVE-VIEW-001` | Substituir Canvas viewport placebo | viewport | B | `IMPROVE-ENG-004` | — | draft | `CanvasViewportSurface.tsx` `NexusCanvasV2` "deprecated" (~10–16) → anchor ou splat viewport |
| `IMPROVE-PLATFORM-005` | Plugins WASI wasmtime (R64) | platform | C | `DEBT-EXT-001`, `DEBT-PLUGIN-001` | audit_backend R64 | draft | `wasm32-wasi` + fuel 100M + 128MB cap; assinatura marketplace; substitui `vm` host |
| `IMPROVE-ENG-006` | Game logic Rust→WASM instant compile | ide | C | `IMPROVE-VS-010` | — | draft | Scripts gameplay compilam ms; vence UE C++ build loop; alinha agent-first moat |
| `IMPROVE-AI-009` | Browser Operator headless (Manus-grade) | ai | A | `DEBT-AI-001` | UX_MARKET_STANDARD | draft | Playwright/Puppeteer cloud+Tauri sidecar; `AethelResearch` + `BrowserOperatorReplay` Take over → sessão live; progresso stream IDE; hoje `browser-operator-recorder.ts` = Map in-memory sem navegador |
| `IMPROVE-AI-010` | Dynamic RAG pipeline (Perplexity-grade) | ai | A | `DEBT-SEARCH-002` | — | draft | `ai-web-tools.ts` Tavily/Serper existe mas **não** ligado ao painel research; parse runtime, credibility real, evidências → `task-evidence-ledger.ts` |
| `IMPROVE-AI-011` | Full-duplex live voice + barge-in | ai | B | `DEBT-AI-001` | UX_MARKET_STANDARD | draft | Substituir `useVoiceRecording` walkie-talkie WebM+HTTP; WebRTC/WebSocket PCM 16–24kHz; Opus playback; VAD barge-in; canal aberto enquanto agentes trabalham |
| `IMPROVE-AI-012` | Nexus squad orchestrator + Activity Deck | ai | B | `IMPROVE-AI-001`, `DEBT-AI-001` | — | draft | `agent-tool-bus.ts` + `parallel-agent-work-contract.ts` → dispatch Research/Builder/QA; `AIChatActivityDeck` feed horizontal paralelo; injeção voz via live |
| `IMPROVE-PLATFORM-006` | Bidirectional job cancel channel | platform | A | `IMPROVE-PLATFORM-004`, `DEBT-RENDER-001` | — | draft | Redis pub/sub `aethel:job-cancel:{jobId}`; cloud kill ffmpeg/blender; Tauri `child.kill()`; hoje `cancel/route.ts` + `queue-system.ts` = `JOB_ACTIVE_CANNOT_CANCEL` 409; Tauri `jobs.rs` só marca estado |
| `IMPROVE-PLATFORM-007` | Real GLB export pipeline | platform | B | `DEBT-RENDER-001`, `IMPROVE-DESK-001` | — | draft | Tauri `probe.rs` gltf-transform/meshoptimizer/blender detectados; `exports/glb/route.ts` 202 `_pending`; cloud `@gltf-transform/core` + S3 |
| `IMPROVE-ENG-007` | PBR live direct lighting (dead Cook-Torrance) | viewport | A | `DEBT-RENDER-003` | — | draft | `aaa-material-system.shaders.ts` ~256–285 funções GGX/Smith/Fresnel **nunca chamadas**; `main()` ~326 = `albedo*ao+emissive`; `F0` morto ~325 |
| `IMPROVE-ENG-008` | Dynamic GI + shadow maps (Lumen-class honest) | viewport | A | `DEBT-RENDER-003`, `DEBT-PERF-002` | — | draft | `aaa-render-system.ts` SSGI/RTGI/voxelGI stubs vazios; `setupLightProbes` adiciona probes sem bake; `pbr-shadow-runtime.ts` existe mas não wired ao PBR custom; presets CSM em `useRenderPipeline.presets.ts` com `aaaRendererRef=null` |
| `IMPROVE-ENG-009` | GPU-driven Nanite + visibility resolve | viewport | B | `DEBT-NANITE-001`, `DEBT-RENDER-003` | — | draft | `cullMeshlets` CPU TS ~161–219; resolve FS ~371–376 IDs coloridos; Hi-Z shader ~85–100 mas fallback CPU; indirect draw não wired |
| `IMPROVE-ENG-010` | TAA + velocity buffer + SSR/DOF real | viewport | B | `DEBT-RENDER-003` | — | draft | Presets `antialiasing:'taa'` sem implementação; `setupSSR/setupDOF/setupMotionBlur` vazios ~265–280; `postprocessing/system` = bloom/tonemap/grading only — sem SSR/DOF passes |
| `IMPROVE-ENG-011` | Virtual texturing GPU decode (BC7/ASTC) | viewport | C | `DEBT-RENDER-003` | — | draft | `virtual-texture-cache.ts` page table + LRU + feedback **PARTIAL**; sem decode hardware/compressão bloco na GPU |
| `IMPROVE-VFX-005` | GPU compute particles (Niagara + real) | vfx | B | `DEBT-NIAGARA-002`, `DEBT-PERF-001`, `IMPROVE-ENG-001` | U56 | draft | `NiagaraParticleEmitter.runtime.ts` array CPU; `particle-system-real.ts` header "GPU" mas loop `update()` CPU ~202–276; WebGPU compute + WGPU desktop |
| `IMPROVE-AI-013` | Config-driven rendering (AI bypass shaders) | ai | B | `DEBT-RENDER-003`, `IMPROVE-AI-001` | — | draft | IA altera `useRenderPipeline.presets.ts` / JSON params (`bloomIntensity`, `tonemapping:'ACES'`) — nunca edita WGSL/GLSL manual |
| `IMPROVE-AI-014` | Rust AST shader graph compiler | ai | C | `DEBT-RENDER-003` | — | draft | `ShaderGraphCompiler.generateFragmentCode` ~121–125 retorna magenta fixo; validar tipos pin float→vec3 antes de compile; crash-safe |
| `IMPROVE-ENG-012` | Foliage surgical erase + GPU LOD culling | viewport | A | `DEBT-FOLIAGE-001`, `DEBT-PERF-003` | — | draft | Substituir `instancedMesh.clear()` por remoção por instanceId + compact buffer; `cluster.visible` → rebuild instance matrices ou compute cull |
| `IMPROVE-ENG-013` | Volumetric clouds production pipeline | viewport | B | `DEBT-CLOUD-001` | — | draft | Depth blending com scene RT; wire `GodRaysPass.render()`; blue-noise texture; cache resolution — zero `document.querySelector` per frame |
| `IMPROVE-ENG-014` | Motion matching SOA + O(1) pose + two-bone IK | viewport | B | `DEBT-MOTION-001` | — | draft | Poses em `Float32Array` strides; frame index lookup; manter `MotionKDTree` só para search; `FootLockingIK` → two-bone solver |
| `IMPROVE-ENG-015` | Binary netcode + rollback ring buffer | platform | A | `DEBT-NET-001` | — | draft | Bitpack input; struct layout sem JSON; ring buffer `frame % N`; zero `JSON.parse/stringify` em 60Hz path |
| `IMPROVE-ENG-016` | Water Gerstner GPU vertex shader | viewport | B | `DEBT-PERF-004` | — | draft | Mover ~16k vert loop de `WaterEditor.parts-runtime.tsx` ~130–159 para shader; eliminar `position.clone()` per frame |
| `IMPROVE-STUDIO-011` | Foliage painter InstancedMesh | studio | B | `DEBT-PERF-003` | — | draft | `FoliagePainterPanels.runtime.tsx` ~206–254: um `InstancedMesh` por typeId — não N `<mesh>` com `ConeGeometry` novas |
| `IMPROVE-VS-011` | VS keyboard node palette + pin validation | studio | B | `DEBT-UX-VS-001` | A4 | draft | Space/right-click fuzzy palette no cursor; rejeitar conexões bool→mat4 em compile-time |
| `IMPROVE-UX-004` | PremiumLoadingState unification | quality | B | `DEBT-UX-HITLIST-001` | A3 | draft | Substituir ~1300 "Carregando…" ad-hoc por `PremiumLoadingState` shimmer variants |
| `IMPROVE-COLLAB-003` | Yjs authoritative server merge | collab | A | `DEBT-YJS-001` | — | draft | Fallback handler: `Y.applyUpdate(doc, update)` antes de broadcast; reconcile com y-websocket path |
| `IMPROVE-ENG-017` | Async BVH + full RT normal packing | viewport | B | `DEBT-PERF-002`, `DEBT-RT-001` | — | draft | Worker/WebGPU BVH rebuild; `createDataTextures` pack n0/n1/n2; Phong interp in path tracer shader |
| `IMPROVE-ENG-018` | Meshlet QEM decimation WASM | viewport | C | `DEBT-NANITE-001` | — | draft | Substituir `simplifyMeshlets` subsample por libspidr/meshoptimizer WASM; seam-safe LOD clusters |
| `IMPROVE-ENG-019` | VT feedback async + render pass wire | viewport | B | `DEBT-VT-001`, `IMPROVE-ENG-011` | — | draft | Render `feedbackMaterial` to RT each frame; PBO/async readback; wire `VirtualTextureSystem` no viewport |
| `IMPROVE-ENG-020` | Destruction Voronoi + Rapier fragments | viewport | C | `DEBT-DEST-001` | — | draft | Fortune/convex hull 3D; Rapier rigid bodies; não `applyFragmentPhysics` JS translate |
| `IMPROVE-ENG-021` | Cloth GPU + skinned capsule rig | viewport | C | `DEBT-CLOTH-001`, `IMPROVE-ENG-001` | — | draft | Bone capsule colliders from skinned mesh; GPU collision pass; numeric hash grid not string Map |
| `IMPROVE-AI-015` | Real-time voice generation (not silence) | ai | B | `DEBT-AUDIO-002` | — | draft | Wire TTS/neural API; `generateVoice` must fill buffer; lipsync drives visemes |
| `IMPROVE-ENG-022` | WebXR hardware foveation + VRS | viewport | C | `DEBT-VR-001` | — | draft | Call `foveatedRendering.applyToLayer()` in `onXRFrame`; OpenXR variable rate — not darken shader |
| `IMPROVE-TERM-001` | Terminal transport router (local vs cloud) | ide | A | `DEBT-TERM-001`, `DEBT-DESK-002` | A11 | draft | Tauri: `createDesktopAdapter` → portable-pty stdout events; local dev: WS:3001; cloud: honest held + Desktop Bridge CTA — never fake server PTY as user shell |
| `IMPROVE-DASH-002` | Dashboard Linear density — collapse banner stack | platform | B | `DEBT-UX-DASH-001` | — | draft | Merge entry intent + routing notice into dismissible status rail; errors → toast; trial → sidebar chip; zero stacked cards above projects grid |
| `IMPROVE-ROUTE-001` | Route registry prune + hub honesty | platform | B | `DEBT-ROUTE-001`, `DEBT-ADMIN-001` | — | draft | Delete or 301 ASPIRATIONAL pages; wire `isRouteVisible()` in hub; extend gate to count ALPHA stubs; stop admin stub generator |
| `IMPROVE-BILLING-001` | Token weight metering + two-phase AI settle | platform | A | `DEBT-FIN-005`–`009`, `DEBT-FIN-010` | — | draft | `model-cost-weights.ts`; weighted `consumeMeteredUsage`; reserve/settle on chat+stream; Stripe downgrade; transfer FOR UPDATE — see `implementation_plan.md` |
| `IMPROVE-BILLING-002` | BYOK + ultra-premium wallet path | platform | B | `DEBT-BILLING-001` | — | draft | User OpenRouter key encrypted at rest; bypass platform token quota; Opus/o1 wallet-only on subscription |
| `IMPROVE-INFRA-001` | Cloudflare R2 Aethel Deploy CDN | platform | C | `DEBT-INFRA-001` | — | draft | Zero-egress asset delivery; storage $0.015/GB; deploy playtests |
| `IMPROVE-UX-005` | Local unlimited projects / cloud-sync caps | studio | A | — | user_experience_criticism | draft | Enforce `extras.cloudSyncedProjects`; local Tauri unlimited |
| `IMPROVE-UX-006` | AI token weight preview before send | ide | B | `IMPROVE-BILLING-001` | — | draft | InlineComposerWidget shows weighted cost estimate |
| `IMPROVE-UX-007` | Beta/Held badges on stub exports | quality | B | — | critical_user_experience_audit | draft | No Stripe-listed features without gate evidence |
| `IMPROVE-UX-008` | Offline save buffer + sync LED | ide | B | `DEBT-YJS-001` | — | draft | IndexedDB emergency; status bar ●/⚠️ |
| `IMPROVE-UX-009` | Resume Workspace (not AI Chat) from dashboard | studio | B | `DEBT-UX-DASH-002` | — | draft | Persist IDE tabs/panels/scroll; `DashboardEntryIntentBanner` action |
| `IMPROVE-BILLING-007` | IDE generosity unlock — agents/workspaces/marketplace all tiers | platform | B | `contracts_planning.md` §6 | — | draft | Remove `allowedAgents`/`allowedDomains` tier gates; infra-only monetization |
| `IMPROVE-COLLAB-006` | Yjs spectator mode for Free/Starter | collab | B | `contracts_planning.md` §6 | — | draft | Read-only join Pro/Studio rooms; viral upgrade path |
| `IMPROVE-DESK-005` | Local offline AI (WebGPU/ONNX sidecar) | desktop | C | `IMPROVE-DESK-004`, `DEBT-DESK-006` | — | draft | Qwen 1.5B–3B; $0 platform cost; honest `[HELD]` until sidecar live |
| `IMPROVE-ARCADE-001` | Aethel Arcade portal + deploy publish + feedback→tasks | platform | C | `DEBT-INFRA-001`, `contracts_planning.md` §11 | — | draft | `/arcade`, iframe play, Aethel Pay hooks |
| `IMPROVE-MKT-001` | Marketplace remix clone + `aethel://` deep links | platform | C | `DEBT-PLUGIN-001`, `DEBT-DB-002`, `contracts_planning.md` §12 | — | draft | POST remix; private copy invariant; Tauri protocol |
| `IMPROVE-MKT-002` | Asset security gateway (scan/optimize/normalize) | platform | C | `DEBT-ASSET-001`, `contracts_planning.md` §13 | — | draft | Ingest worker; verified badge pipeline |
| `IMPROVE-BILLING-003` | Modular BYOK + $5 addon | platform | B | `DEBT-BILLING-001` | — | draft | BYOK all tiers; paid = cloud/storage/collab |
| `IMPROVE-BILLING-005` | Token bucket rate limits | platform | B | `DEBT-FIN-011` | — | draft | Remove hourly hard caps; monthly weighted cap authoritative |
| `IMPROVE-STUDIO-012` | Workspace profiles Code/Research/Game | studio | B | `IMPROVE-ENG-023` | — | draft | Pause viewport in Code mode |
| `IMPROVE-ENG-023` | Pause R3F loop when viewport inactive | viewport | A | — | — | draft | Zero GPU when Monaco focused |
| `IMPROVE-A11Y-001` | App-level accessibility gate (WCAG 2.2 AA) | platform | 7 | evidence: only `@storybook/addon-a11y` exists; no app CI a11y check | — | draft | jsx-a11y lint + axe on key shells; keyboard nav + focus rings + reduced-motion across studio/dashboard/auth |
| `IMPROVE-COMPLIANCE-001` | Self-serve account deletion + data export (LGPD/GDPR) | platform | 6/7 | impl: API `app/api/account/route.ts` + `app/api/account/export/route.ts`; UI `app/settings/_components/AccountDataPanel.tsx`; policy `docs/architecture/data_retention_policy.md` | — | **done** | Live end-to-end: export download + danger-zone delete (email+DELETE confirm) + written retention policy. Future: async export for huge accounts, backup purge (`IMPROVE-OPS-002`) |
| `IMPROVE-OPS-002` | Disaster recovery: Postgres PITR + restore runbook | platform | 6 | evidence: no backup/cron tooling in repo | — | draft | Automated backups + tested restore + RPO/RTO targets |
| `IMPROVE-OPS-003` | Confirm Sentry wiring + release health + source maps | platform | 7 | evidence: `@sentry/nextjs ^8.47.0` dep present; wiring unverified | — | draft | Verify `sentry.*.config`, tunnel route, PII scrubbing (never log BYOK keys) |

---

## 2. Interface & experience notes (freeform ingest)

### §2.1 Batch 1 — Quality philosophy (user, 2026-06-17)

**Padrão implacável:** Unreal Engine, Blender, Cursor 3.x, Zed, Figma Dev Mode — **não toleram** “qualidade básica” nem “UX conceitual”. Cada tela deve ser analisada sob excelência profissional: densidade de dados, hierarquia visual, feedback imediato, zero placebos de controle.

**Competidores de referência por domínio:**

| Domínio | Referência | O que copiar (honesto) |
|---------|------------|----------------------|
| Creative suite layout | Unreal / Blender | Alta densidade; painéis redimensionáveis; contexto WebGL persistente |
| IDE + AI | Cursor 3.x / Zed | Ghost text, inline composer, docking fluido, virtualized trees |
| Design handoff | Figma Dev Mode | Tokens, compact status, sem parágrafos explicativos |
| VFX | UE Niagara | Grafo que **compila**; gradient ramps; dope sheet |
| Animation | UE Sequencer / Blender NLA | Canvas timelines, não DOM |

---

### §2.2 Creative Studio Shell & Hub (`CreativeStudioShell.tsx`, `studio/page.tsx`, `creative-studio-routes.ts`)

**Críticas (user, validação Cursor):**

1. **Poluição textual / “guia para humanos”**  
   - `studio/page.tsx` ~81: heading “Choose the editor that moves the mission forward.”  
   - `SurfaceQualityShell` subtitles longos (“Resume the active mission…”).  
   - Maturidade em prosa (“Edit here. Heavy jobs wait for runtime”) em vez de badge compacta.  
   - **Intenção:** Status = ícone + badge + tooltip curto; remover parágrafos orientativos em superfícies de trabalho.

2. **Baixa densidade / rounded exagerado**  
   - Grid hub `rounded-[28px]`, `shadow-[0_18px_70px…]`, `px-4 py-6 lg:px-8`, `max-w-5xl` — desperdiça pixels em monitores profissionais.  
   - **Intenção:** Modo “operator density” como default; paddings ~50% menores em tabelas de editores; bordas 8–12px max em painéis de dados.

3. **Mobile `<details>` ad-hoc**  
   - `CreativeStudioShell.tsx` ~103, ~140, ~209: `<details>/<summary>` para navegação mobile — fluxo tosco, não premium.  
   - **Intenção:** `Popover`/`Combobox` estilizado, portal, teclado (↑↓ Enter), busca fuzzy de editores.

4. **Transições de rota destrutivas**  
   - `StudioGroupedEditorClient.tsx` ~88–90: `<Link href={activeHref}?tool=${tool.id}>` — navegação Next full route.  
   - Rotas separadas terrain/foliage/level (`creative-studio-routes.ts`) causam remount do shell + perda estado Three.js (flicker 1–2s citado pelo user).  
   - **Intenção:** Single-page studio com tool state em memória/URL shallow sem remount do viewport root; preservar WebGL context + scene cache.

**Plano de refinamento (user):** Densidade extrema → Docking workspace → Menu troca rápida.  
**IMPROVE IDs:** `IMPROVE-STUDIO-001` … `004`.

---

### §2.3 Visual Scripting (`VisualScriptEditor.tsx`)

**Críticas:**

1. **Inline styles** — `audit_frontend_ui_ux` A4 cita 50+; Cursor grep atual ~9 `style={{` (drift — ainda deve ir a **zero**). Cores fixas `rgba(30,30,30)` quebram theme toggle.  
2. **DOM/SVG scalability** — >50 nós: reconciliação ReactFlow lag no drag.  
3. **Painel lateral estático** — catálogo ocupa largura permanente; UE Blueprint usa RMB + busca contextual.

**Plano:** Fuzzy search contextual RMB; filtro de conexões por tipo; tokens only.  
**IMPROVE IDs:** `IMPROVE-VS-001` … `004`.  
**blocked_by:** Save placebo = `DEBT-UX-VS-001` (debt fixes persist; improvements add UX gold).

---

### §2.4 Niagara VFX (`NiagaraVFX.runtime.tsx`, `NiagaraVFXPanels.runtime.tsx`, `app/studio/vfx`)

**Críticas (alinhado `DEBT-NIAGARA-002`):**

1. **Node graph placebo** — ReactFlow nodes/edges não alimentam `emitterConfig`; só painel lateral/presets.  
2. **Color over Lifetime amador** — hex inputs / native color picker vs rampa visual.  
3. **Sem dope sheet** — bursts/emissões não coordenáveis no tempo.

**Plano:** Gradient builder A17; sync grafo→GPU (U56); timeline efeitos.  
**IMPROVE IDs:** `IMPROVE-VFX-001` … `004`.

---

### §2.5 Scene Outliner & IDE dock (`ModernIDEShellCenterStack.tsx`, outliners)

**Críticas:**

1. **DOM inefficiency** — outliners mock (Character, Film shot list) renderizam lista completa; cena 500+ entidades trava scroll.  
   - **Nota validação:** `SceneViewportOutliner.tsx` **já** usa `@tanstack/react-virtual` — melhoria = **propagar padrão**, não reinventar A8 no viewport IDE principal apenas.

2. **Tailwind inválido** — `bg-[var(--aethel-surface-primary)]/2` linhas ~44, ~144 — opacidade `/2` inválida em CSS var.

3. **Dock rígido 55/45** — Agents vs Terminal sem grip horizontal (`DEBT-UX-DOCK-001`); resize vertical do dock existe (`ResizeHandle` altura), não largura colunas.

**Plano:** Virtualização obrigatória everywhere; draggable grips; fix CSS.  
**IMPROVE IDs:** `IMPROVE-IDE-001` … `003`.

---

### §2.6 Monaco + AI Cursor 3.x style (`MonacoEditorPro.actions.ts`, chat lateral)

**Críticas:**

1. **Sem ghost text inline** — autocomplete só lista Monaco padrão; falta texto cinza na linha + Tab.  
2. **Sem Composer multilinha Ctrl+K** — IA isolada na sidebar; falta widget flutuante sobre seleção.

**Plano:** `InlineComposerWidget` ContentWidget; decorations ghost pré-apply (`IMPROVE-IDE-006` liga A40 + apply bridge existente).  
**Batch 2 confirma:** widget implementado mas **não wired** — runtime usa `InlineEditModal` modal; ver `IMPROVE-IDE-013`, `IMPROVE-IDE-014`.  
**blocked_by:** `DEBT-AI-012`, `DEBT-AI-001` para qualidade AI real.  
**IMPROVE IDs:** `IMPROVE-IDE-004` … `006`, `IMPROVE-IDE-013`, `IMPROVE-IDE-014`.

---

### §2.7 Layout conflicts & placebos (segunda passagem user)

#### Film / Audio sequencer (`FilmStudioClient.tsx`) — **CONFIRMED invertido**

| Slot | Hoje (audio tool) | Problema | Correção |
|------|-------------------|----------|----------|
| viewport | `DirectorMode` placeholder “Nexus Deprecated” | Área central ociosa | `SoundCueEditor` (grafo ReactFlow denso) |
| inspector (~260px) | `SoundCueEditor` | Esmagado, inutilizável | `AudioMixInspector` compacto |

**IMPROVE:** `IMPROVE-FILM-001`, `IMPROVE-FILM-002`.

#### Animation suite (`app/studio/animation/page.tsx`) — **CONFIRMED recursos ocultos**

- Dynamic imports: `ControlRigEditor`, `FacialAnimationEditor` (linhas 17–24).  
- Render: apenas `AnimationBlueprint` no viewport (linhas 111–114).  
- Outliner/inspector = mock estático skeleton — não rig real.

**IMPROVE:** `IMPROVE-ANIM-001` — tabs ou sub-tools dentro do Character studio para rig/facial.

#### Foliage environment (`FoliagePainterRuntime.tsx`) — **CONFIRMED controles travados**

- Múltiplos sliders: `onChange={() => {}}` (~472–574).  
- Inputs `readOnly` (~487, ~497) para escala/inclinação.  
- User move slider → simulação não muda.

**IMPROVE:** `IMPROVE-ENV-001` (pós `DEBT-PERF-003` instancing).

#### Terrain (`TerrainSculptingEditor.runtime.tsx`)

- Sem menu radial / B+drag brush na viewport.  
- Smooth brush debt = `DEBT-TERRAIN-001` (identity fn) — improvement adds UE-style UX **after** debt fixes math.

**IMPROVE:** `IMPROVE-TERRAIN-001`.

#### Navegação destrutiva (reiterado)

- `StudioGroupedEditorClient` + rotas `/studio/world`, `/studio/level?tool=terrain` etc.  
- **IMPROVE-STUDIO-002/004**.

---

### §2.8 Sumário placebos de usabilidade (tabela user + validação)

| Componente | Arquivo | Falha | Impacto | Debt vs Improve |
|------------|---------|-------|---------|-----------------|
| Sequencer Audio | `FilmStudioClient.tsx` | SoundCue no inspector estreito | Alto | **IMPROVE-FILM-001** |
| VFX Node Graph | `NiagaraVFX.runtime.tsx` | Grafo não altera partículas | Alto | **DEBT-NIAGARA-002** then **IMPROVE-VFX-004** |
| Animation Suite | `animation/page.tsx` | Rig/Facial importados, não renderizados | Médio | **IMPROVE-ANIM-001** |
| Visual Scripting | `VisualScriptEditor.tsx` | Inline styles; catálogo fixo | Médio | **IMPROVE-VS-001/003** |
| Foliage Panels | `FoliagePainterRuntime.tsx` | Sliders noop | Alto | **IMPROVE-ENV-001** |
| Loading Global | vários | ~1300 “Carregando…” | Médio | **IMPROVE-UX-001** (A3) |
| Timelines | animação/film | DOM divs não Canvas | Médio–Alto | **IMPROVE-TIMELINE-001** (A10) |
| Outliner 500+ | studio mocks | Sem virtualização | Alto | **IMPROVE-IDE-003** |

---

### §2.9 Batch 2 — Visual Script controls & theme (`VisualScriptEditor.tsx`)

**Críticas (user, validação Cursor 2026-06-17):**

1. **Cores estáticas vs temas** — **CONFIRMED**  
   - `style={{ background: definition.color }}` (~75); `node.color` (~220, 332, 365).  
   - Catálogo usa hex/strings fixas; alto contraste / light mode → texto ilegível em nós de alta luminância.  
   - **Intenção:** tokens por categoria de nó (`--aethel-node-event-bg`, `--aethel-node-event-text`) em vez de inline catalog color.  
   - **IMPROVE:** `IMPROVE-VS-005` (extends `IMPROVE-VS-001` zero-inline goal).

2. **Context menu sem clamp** — **CONFIRMED**  
   - `style={{ left: x, top: y }}` (~301); sem `menuWidth`/`menuHeight` vs `window.innerWidth/innerHeight`.  
   - RMB perto do canto → menu cortado.  
   - **IMPROVE:** `IMPROVE-VS-006`.

3. **Inputs ad-hoc sem value scrubbing** — **CONFIRMED**  
   - Portas constantes: `<input type={port.type === 'number' ? 'number' : 'text'}>` ~104–108, `w-[70px]`.  
   - Sem drag-to-scrub nem eval de expressão (`10*3` → 30).  
   - **IMPROVE:** `IMPROVE-VS-007` (padrão Blender/Unreal).

4. **Frente 6 — WASM AST (futuro)**  
   - `audit_backend_spine.md`: `lib/visual-script/runtime.ts` + editor interpretam no main-thread JS.  
   - Bake deve emitir AST → compilador WASM Aethel.  
   - **IMPROVE:** `IMPROVE-VS-008`; **blocked_by:** persistência/validação = `DEBT-UX-VS-001`.

---

### §2.10 Batch 2 — Dashboard runtime & alertas (`useAethelDashboardRuntime.tsx`, `AlertBanner.tsx`)

**Dashboard re-render cascade** — **CONFIRMED (refinado)**

- Hook orquestra sub-hooks (`useDashboardUiState`, `useDashboardRemoteData`, …) mas ainda exporta **`dashboardShellProps`** e **`dashboardMainProps`** monolíticos (~366, ~493).  
- `useDashboardUiState.ts`: **46× `useState`** (chat, wallet, trials, streaming, tabs, …).  
- `isStreaming` / `chatHistory` updates durante token stream → consumidores do shell inteiro re-renderizam (billing, projetos, terminal lateral).  
- **Correção:** stores isoladas (Zustand com selectors atômicos ou React Context por domínio: `ChatStore`, `WalletStore`, `ShellChromeStore`).  
- **IMPROVE:** `IMPROVE-DASH-001`; **blocked_by:** `DEBT-AI-012` para streaming hardening.

**AlertBanner** — **CONFIRMED premium; adoção incompleta**

- `AlertBanner.tsx`: `color-mix(in_srgb,var(--aethel-error)_8%,transparent)` — padrão V33 correto.  
- Uso hoje: `DashboardShell.tsx`, `DashboardAlertBanners.tsx`, stories — **não** universal em billing/auth/network errors.  
- **IMPROVE:** `IMPROVE-UX-002` (Frente A6 completion).

---

### §2.11 Batch 2 — Blueprint drift vs implementação (`19_BEST_IN_MARKET`, `08_WORKBENCH`)

**Validação Cursor — correções ao paste user:**

| Claim user | Estado código (2026-06-17) | Nota |
|------------|---------------------------|------|
| `FullscreenIDE` ramifica `ModernIDEShell` vs `IDELayout` + `shell=modern` | **Parcialmente resolvido** | `FullscreenIDE.tsx` → só `FullscreenIDEWorkspace` → `ModernIDEShell`; **zero** `shell=modern` grep; **`IDELayout.tsx` ausente** (scripts exigem retired) |
| Blueprint `08_WORKBENCH.md` §Shell reality | **Blueprint desatualizado** | Ainda descreve dual-shell; código convergiu — atualizar blueprint na fase doc, não reintroduzir `IDELayout` |
| `NexusChatMultimodal.tsx` | **Não encontrado** | Fragmentação real: `AIChatPanelPro`, `InlineAIChat`, stack `components/agents/chat/*` |
| 4 terminais ativos (`IntegratedTerminal`, `TerminalWidget`, `TerminalPro`, `XTerminal`) | **Parcialmente resolvido** | Legacy terminals marcados “must stay retired” em `check-workbench-consolidation-source.mjs`; família ativa = `XTerminal`/`BaseXTerminal`/`MultiTerminalPanel` |
| Plugins UI ausente | **CONFIRMED** | `app/api/plugins/list|install|uninstall` → 503/stub; **DEBT-PLUGIN-001** |

**Drifts ainda válidos:**

1. **Preview wrapper** — `CanonicalPreviewSurface.tsx` delega `RuntimePreviewSurface`/`UnifiedViewport`; estado runtime também em `usePreviewRuntimeManager` + `PreviewRuntimeToolbar` → toolbar “running” vs skeleton infinito. **IMPROVE-IDE-010**.

2. **Rule 4 — chat vs preview roommates** — Chat-first em `AIChatPanelPro` / agents workspace; Approvals/Runs em modais secundários. **IMPROVE-IDE-011**.

3. **Rule 1 — superfície dominante** — Hub redirects destrutivos (`/studio/terrain`, etc.) ainda remontam DOM — ver `IMPROVE-STUDIO-002/004`.

4. **Color Rule** — Destaques neon/roxo em minimap/botões vs machined graphite — grep em chrome dock.

5. **Feedback conexões VS** — Conexões inválidas não bloqueiam save JSON — **DEBT-UX-VS-001** (debt); improvement = pin hints `IMPROVE-VS-004`.

**IMPROVE:** `IMPROVE-BLUEPRINT-001` — matriz de conformidade executável pós-dívida.

---

### §2.12 Batch 2 — Bottom dock collapse (`ModernIDEShellCenterStack`, `useModernIDEPanels`, `chromeDockParts`)

**Problema central** — **CONFIRMED** — conflito crítico de usabilidade.

1. **Terminal refém do chat**  
   - `ModernIDEShellCenterStack.tsx` ~103: `{chatOpen && !isCompact && (` — terminal só existe se chat aberto.  
   - Fechar Agents fecha terminal inteiro.  
   - `useModernIDEPanels.ts`: `PanelState` = `sidebar|editor|preview|chat` — **sem** `terminal`.  
   - **IMPROVE:** `IMPROVE-IDE-008`.

2. **Abas placebo**  
   - `chromeDockParts.tsx` `handleBottomDockItemClick`: `terminal`/`chat` chamam `onSelectBottomPanel` (~131–155).  
   - `ModernIDEShellPanels.tsx` passa `activeBottomPanel` (~141).  
   - `ModernIDEShellCenterStack` **não destructure** `activeBottomPanel` nem `onSelectBottomPanel` (~66–77) — sempre render 55% Agents | 45% Terminal.  
   - **IMPROVE:** `IMPROVE-IDE-009`.

3. **Split 55/45 destrói legibilidade**  
   - Terminal ~350–500px em 1080p → word-wrap agressivo em logs webpack/vitest.  
   - Agents esmagado para diffs/blocos de código (~44% altura max do dock).  
   - **Solução layout V33 (user):** Agents → **Right Rail**; Bottom Dock = Terminal **ou** Logs **ou** Problems, **100% largura**, uma aba ativa.  
   - **IMPROVE:** `IMPROVE-IDE-007` + `IMPROVE-IDE-001` (grip horizontal interim) + `DEBT-UX-DOCK-001`.

4. **Violações blueprint**  
   - `08_WORKBENCH.md`: AI Console = Right Rail; Bottom Dock = diagnóstico horizontal exclusivo.  
   - `19_BEST_IN_MARKET` Rule 1: três superfícies competindo na coluna central (editor + agents + terminal).  

---

### §2.13 Batch 2 — Monaco Cmd+K & diff (`MonacoEditorPro.runtime.tsx`, `InlineEditModal.tsx`, `InlineComposerWidget.tsx`)

**Cmd+K modal vs widget** — **CONFIRMED**

- `InlineComposerWidget.tsx` existe — Monaco `ContentWidget` na linha do cursor (Frente 1 / Cursor 3.x).  
- `MonacoEditorPro.runtime.tsx` ~7 importa `InlineEditModal`; ~425–436 renderiza modal `fixed inset-0` com backdrop — bloqueia contexto do arquivo.  
- **IMPROVE:** `IMPROVE-IDE-013` (implementação concreta de `IMPROVE-IDE-005`).

**Naive diff** — **CONFIRMED**

- `InlineEditModal.tsx` ~411 `computeSimpleDiff`: zip linha-i vs linha-i sem LCS.  
- Uma linha inserida no topo → 30 linhas “deletadas” + “adicionadas”.  
- **IMPROVE:** `IMPROVE-IDE-014` (diff-match-patch / jsdiff / port LCS leve).

---

### §2.14 Batch 2 — Studio placebos reconfirmados (Film, Animation, Admin)

**Film DirectorMode** — **CONFIRMED**  
- `FilmStudioClient.tsx` ~18–20, `film/page.tsx` ~15–17: string estática “Director Mode (Nexus Deprecated)”.  
- Áudio invertido já em `IMPROVE-FILM-001/002`; viewport film ainda placebo.  
- **IMPROVE:** `IMPROVE-FILM-003`.

**Animation rigs ocultos** — **CONFIRMED** (Batch 1)  
- `animation/page.tsx` imports `ControlRigEditor`/`FacialAnimationEditor` sem JSX.  
- **IMPROVE:** `IMPROVE-ANIM-001`.

**Admin drift** — **CONFIRMED**  
- `AdminPageHeader.tsx`: layout flex manual `text-2xl sm:text-3xl`, sem `Card` canônico.  
- `COMPONENT_CONSOLIDATION_MAP.md` manda unificar com Studio.  
- **IMPROVE:** `IMPROVE-ADMIN-001`.

---

### §2.15 Batch 2 — Tabela guardrails vs implementação (user + validação)

| Diretriz / Guardrail | Blueprint | Implementação | Drift | ID |
|---------------------|-----------|---------------|-------|-----|
| Foco de superfície (Rule 1) | Uma protagonista/tela | Editor + Agents + Terminal competem na coluna central | **Alto** | `IMPROVE-IDE-007`, `IMPROVE-BLUEPRINT-001` |
| AI Console (Rule 4, 08_WORKBENCH) | Right Rail; Approvals > Runs > Plan | Chat-first; bottom dock 55/45 | **Alto** | `IMPROVE-IDE-011`, `IMPROVE-IDE-007` |
| Bottom Dock (08_WORKBENCH) | Uma aba ativa; largura total | Abas fake; split fixo; `activeBottomPanel` ignorado | **Alto** | `IMPROVE-IDE-008/009`, `DEBT-UX-DOCK-001` |
| Composição de cores | Graphite/slate machined | Neon/roxo em destaques dock/minimap | Médio | `IMPROVE-BLUEPRINT-001` |
| Simplicidade vs profundidade | Entrada limpa → IDE | Redirects `/studio/terrain` remount | Médio | `IMPROVE-STUDIO-002/004` |
| Feedback conexões VS | Bloquear save inválido | JSON salva com wires ruins | Médio | `DEBT-UX-VS-001`, `IMPROVE-VS-004` |
| Plugins extensibilidade | Catálogo + install UI | API stub; zero painel | Alto | `DEBT-PLUGIN-001`, `IMPROVE-IDE-015` |
| Cmd+K inline | Cursor na linha | Modal fullscreen | Alto | `IMPROVE-IDE-013` |
| Dashboard streaming perf | Subpainéis isolados | 46 states → shell props cascade | Alto | `IMPROVE-DASH-001` |
| Alertas erro (A6) | `AlertBanner` dismissible | Parcial no dashboard | Baixo–Médio | `IMPROVE-UX-002` |
| Visual script tema | Tokens | `definition.color` inline | Médio | `IMPROVE-VS-005` |
| WASM visual compile (Frente 6) | Bake nativo | JS main-thread | Alto (futuro) | `IMPROVE-VS-008` |

---

### §2.16 Batch 3 — Quatro sidebars & hub aninhado (`level/page.tsx`, `LevelEditor.tsx`, `studio/page.tsx`)

**Problema central** — **CONFIRMED** — duplicação catastrófica de layout no Level Studio.

**Arquitetura esperada (V30):** `CreativeWorkbenchShell` fornece slots `outliner` | `viewport` | `inspector`; editores alimentam slots — **não** reimplementam moldura.

**Implementação real:**

| Camada | Arquivo | O que renderiza |
|--------|---------|-----------------|
| Shell (página) | `app/studio/level/page.tsx` ~93–104 | `outliner={<WorldOutliner />}` mock estático (Zone_A, World_Root); `inspector={<WorldInspector />}` mock (LOD bias, Culling) |
| Editor (viewport slot) | `components/engine/LevelEditor.tsx` ~344–511 | **Próprio** layout 3-colunas: `OutlinerMini` 250px (~346) + viewport + `DetailsPanelMini` 320px (~504) |

**Resultado visual — “quatro gutters”:**

1. Outliner shell (mock) — esquerda externa  
2. OutlinerMini (dados reais `objects[]`) — esquerda interna  
3. DetailsPanelMini (transform real) — direita interna  
4. WorldInspector (mock StreamRegion_01) — direita externa  

**Impacto:** Viewport WebGL esmagada; dados reais ao lado de mocks; violação Rule 1 e princípio shell-slot do `CreativeWorkbenchShell`.

**Mesmo padrão em grupo:** `StudioGroupedEditorClient.tsx` carrega `LevelEditor` via `renderTool` com `outliner={<StudioToolPicker />}` — sidebars embutidos do editor persistem.

**Plano V33 (user):**

1. Remover colunas fixas de `LevelEditor.tsx`; exportar estado via context/callbacks (`LevelEditorSceneBridge`).  
2. Página (`WorldStudioPage`) injeta `OutlinerMini`/`DetailsPanelMini` nos slots do shell.  
3. Opcional: unificar com `WorldOutliner` virtualizado (já tem `@tanstack/react-virtual`) em vez de `OutlinerMini`.

**IMPROVE:** `IMPROVE-STUDIO-005` (Phase A — desbloqueia outras melhorias studio).

---

### §2.17 Batch 3 — Studio Home como IDE disfarçada (`app/studio/page.tsx`)

**Violação Rule / blueprint** — **CONFIRMED**

- `19_BEST_IN_MARKET`: Studio Home = control room minimalista; continuidade + missões; **não** IDE densa.  
- `app/studio/page.tsx` ~203–222: `CreativeWorkbenchShell` envolve hub inteiro.  
- `outliner={<StudioHubOutliner />}` (~219): lista de **rotas** (`primaryStudioRoutes`) disfarçada de hierarquia de cena.  
- `inspector={<StudioHubInspector />}` (~220): `EngineSpineReadinessPanel` — logs técnicos de prontidão na primeira dobra.  
- Viewport (~221): `StudioHubViewport` com `SurfaceQualityShell` + parágrafos (“Resume the active mission…”) — reitera crítica `IMPROVE-STUDIO-001`.

**Intenção:** Shell hub dedicado (`StudioHomeShell` ou `CreativeStudioShell` hub-only): top bar leve, grid de editores, mission control central — **zero** painéis laterais de edição até abrir editor.

**IMPROVE:** `IMPROVE-STUDIO-006` (complementa `IMPROVE-STUDIO-001` densidade).

---

### §2.18 Batch 3 — Export APIs receipt stubs & UX de confiança

**Debt (não duplicar):** `DEBT-RENDER-001` — Prisma `RenderJob` ausente; poll `/api/render/jobs/[id]` → 503/404.

**Rotas validadas (202 + `_pending`):**

| Rota | Arquivo | `_pending` |
|------|---------|------------|
| Project ZIP | `app/api/exports/project/route.ts` ~48 | `lib/export/formats/project-zip not yet wired` |
| USDZ | `app/api/exports/usdz/route.ts` ~36 | `lib/integrations/usd not yet wired` |
| WAV | `app/api/exports/wav/route.ts` ~43 | `lib/export/formats/wav not yet wired` |
| MP4 | `app/api/exports/mp4/route.ts` ~52 | `lib/render-farm/providers not yet wired` |
| GLB | `app/api/exports/glb/route.ts` ~41 | idem render-farm |

**Comportamento:** `status: 'queued'`, `jobId: export:*:${Date.now().toString(36)}` — UI mostra “Processando…”; job nunca completa.

**Proposta user (pós-debt ou interim):** Fail-soft honesto — 501 + mensagem held/desktop Tauri; **não** 202 falso.  
**IMPROVE:** `IMPROVE-UX-003` (**blocked_by:** `DEBT-RENDER-001` para pipeline real; interim = UI não mente).

---

### §2.19 Batch 3 — Paradoxo rotas Labs vs Studio hub (`workbench-convergence.ts`, `route-maturity-registry.ts`)

**CONFIRMED com nuance:**

1. **`workbench-convergence.ts`** — `ASPIRATIONAL_LAB_EXACT_PATHS`: `/level-editor`, `/niagara-editor`, etc. → `labs-hidden` quando flag off. **`/studio/*` não está no set.**

2. **`route-maturity-registry.ts`** — `isRouteVisible()`: oculta só `PROTOTYPE` + `ASPIRATIONAL`; **ALPHA e BETA passam**.  
   - `/studio/film`, `/studio/vfx`, `/studio/animation` = **ALPHA** mas **visíveis** em produção.  
   - **Grep:** `isRouteVisible` definido mas **não importado** em nenhum componente de navegação.

3. **`creative-studio-routes.ts`** — `PRIMARY_CREATIVE_HREFS` inclui `/studio/animation`, `/studio/vfx`, `/studio/film` (ALPHA) no hub principal `studio/page.tsx`.

**Impacto:** Usuário acessa placebos (4 sidebars, DirectorMode deprecated, Niagara cosmético) via navegação canônica — inconsistente com proteção Labs das rotas legadas.

**Proposta:** Wire `isRouteVisible` no hub outliner/grid; opcionalmente middleware para ALPHA sem flag; ou elevar maturidade só quando `IMPROVE-*` correspondentes done.

**IMPROVE:** `IMPROVE-STUDIO-007`.

---

### §2.20 Batch 3 — Design system drift: ContextMenu global vs Visual Script

**CONFIRMED**

| | `components/ui/context-menu.tsx` | `VisualScriptEditor.tsx` |
|--|----------------------------------|--------------------------|
| Portal | `createPortal(..., document.body)` (~154) | Inline no canvas |
| Edge-aware | `useEdgeAwarePosition` (~71) | `style={{ left: x, top: y }}` (~301) |
| Reuso | Primitivo canônico | `function ContextMenu` local (~240) |

**IMPROVE:** `IMPROVE-VS-009` (supersedes implementação manual de `IMPROVE-VS-006` — clamp vem grátis do primitivo).

---

### §2.21 Batch 3 — File tree & Command Palette performance gaps

**FileExplorerTree** — **CONFIRMED** — sem virtualização

- `components/ide/FileExplorerTree.tsx` ~127–144: recursão `node.children.map` → DOM completo.  
- Zero `@tanstack/react-virtual` (grep negativo).  
- Contraste: `WorldOutliner.tsx` **já** virtualizado (gate `check-editor-virtualization-spine.mjs`).  
- **IMPROVE:** `IMPROVE-IDE-016` (extends `IMPROVE-IDE-003` pattern).

**Command Palette fuzzy** — **CONFIRMED**

- `CommandPalette.parts.tsx` ~256 `fuzzyMatch`: loop char-a-char síncrono na main thread.  
- Repos grandes → lag perceptível em Ctrl+P.  
- **IMPROVE:** `IMPROVE-IDE-017` (fzf-wasm + Worker).

---

### §2.22 Batch 3 — Tabela componentes/APIs (user + validação)

| Rota / API / Componente | Arquivo | Situação | Gravidade | ID |
|----------------------|---------|----------|-----------|-----|
| Level 4 sidebars | `level/page.tsx` + `LevelEditor.tsx` | Shell mock + editor embedded panels | 🔴 Crítico | `IMPROVE-STUDIO-005` |
| Studio Home workbench | `app/studio/page.tsx` | Hub em `CreativeWorkbenchShell` | 🔴 Crítico | `IMPROVE-STUDIO-006` |
| API Export Project | `app/api/exports/project/route.ts` | 202 receipt stub | 🔴 Crítico (debt) | `DEBT-RENDER-001`, `IMPROVE-UX-003` |
| API Export USDZ | `app/api/exports/usdz/route.ts` | 202 receipt stub | 🔴 Crítico (debt) | `DEBT-RENDER-001` |
| API Export WAV | `app/api/exports/wav/route.ts` | 202 receipt stub | 🔴 Crítico (debt) | `DEBT-RENDER-001` |
| API Export MP4 | `app/api/exports/mp4/route.ts` | 202 receipt stub | 🔴 Crítico (debt) | `DEBT-RENDER-001` |
| VS ContextMenu | `VisualScriptEditor.tsx` | Reinvenção sem portal/edge | 🟡 Médio | `IMPROVE-VS-009` |
| Studio routes ALPHA | `creative-studio-routes.ts` + hub | Expostas sem `isRouteVisible` | 🟡 Médio | `IMPROVE-STUDIO-007` |
| File tree | `FileExplorerTree.tsx` | Recursão DOM massiva | 🟡 Médio–Alto | `IMPROVE-IDE-016` |
| Ctrl+P fuzzy | `CommandPalette.parts.tsx` | JS sync main thread | 🟡 Médio | `IMPROVE-IDE-017` |

---

### §2.23 Batch 4 — Colapso tridimensional Film/Audio (`FilmStudioClient.tsx`, `SoundCueEditor.tsx`)

**CONFIRMED** — reforça e quantifica `IMPROVE-FILM-001/002` (Batch 1/3).

**Acoplamento atual** (`FilmStudioClient.tsx`):

```157:164:meu-repo/cloud-web-app/web/app/studio/film/FilmStudioClient.tsx
  const inspector = activeTool.id === 'audio' ? (
    <Suspense fallback={<CreativeStudioLoading label="Audio Studio" />}>
      <SoundCueEditor />
    </Suspense>
  ) : (
    <AudioMixInspector />
  )
```

- Viewport (~140–147): `DirectorMode` placeholder para todos tools exceto `cinematic`.  
- `SoundCueEditor` no slot **inspector** quando `tool=audio`.

**Geometria do colapso:**

| Superfície | Largura interna | Shell constraint |
|------------|-----------------|------------------|
| `SoundCueEditor` catálogo | 240px (~533) | — |
| ReactFlow canvas | flex 1 (comprimido) | — |
| Preview/properties | 260px (~597) | — |
| **Total mínimo** | **~500px+** | `CreativeWorkbenchShell` `rightW.max: 400` (~68) |

**Impacto:** Grafo ReactFlow ilegível; scroll horizontal; viewport central ociosa com “Nexus Deprecated”.

**Rota áudio fantasma** — **CONFIRMED**

- `app/studio/audio/` — **ausente** (glob 0).  
- `creative-studio-routes.ts`: `'/studio/audio': '/studio/film?tool=audio'`.  
- Áudio forçado pelo grupo Film.

**IMPROVE:** `IMPROVE-FILM-001`, `IMPROVE-FILM-002`, `IMPROVE-STUDIO-009`.

---

### §2.24 Batch 4 — Timeline vertical vs dock horizontal (`VideoTimelineEditor.tsx`)

**CONFIRMED**

- Shell timeline: altura **100–300px** default 180 (`CreativeWorkbenchShell.tsx` ~63–69, ~334).  
- `VideoTimelineEditor` main content (~228): `display: flex` row — tracks + **painel direito 280px** (~317) com abas Inspector/Effects.  
- Shell inspector direita: `AudioMixInspector` ou `SoundCueEditor` simultaneamente.

**Conflito:** Dois inspetores em eixos ortogonais (timeline inferior + coluna direita). Padrão UE/Resolve: propriedades do clipe selecionado fluem para **um** inspector global.

**IMPROVE:** `IMPROVE-FILM-004`; integrar em `IMPROVE-STUDIO-008` slot bridge.

---

### §2.25 Batch 4 — Quest inspectores duplicados (`quest/page.tsx`, `QuestEditor.tsx`)

**CONFIRMED** — variante do padrão “four sidebars” (Batch 3) no eixo direito.

| Inspector | Arquivo | Tipo |
|-----------|---------|------|
| Shell `QuestInspector` | `quest/page.tsx` ~97 | Mock estático (quest.intro.01) |
| Editor `QuestInspector` | `QuestEditor.tsx` ~172–186 | Dinâmico (`w-80` = 320px), nó selecionado |

**Impacto:** ~320px + largura shell inspector (~180–400px) devoram grafo ReactFlow de quests.

**IMPROVE:** `IMPROVE-QUEST-001` (mesmo padrão `IMPROVE-STUDIO-005`).

---

### §2.26 Batch 4 — Pixel streaming + inspector irrelevante (`CloudStreamStudioClient.tsx`)

**CONFIRMED**

- `tool=cinematic`: viewport = `<CloudStreamStudioClient embedded />` (~140–142).  
- Client: grid `lg:grid-cols-[minmax(0,1fr)_360px]` (~54) — métricas custo/evidência na coluna interna.  
- Inspector shell quando **não** audio: `AudioMixInspector` (~163) — Master/SFX/Music/Dialogue estáticos.

**Poluição contextual:** Usuário em cloud review vê mixer de áudio irrelevante na extrema direita do shell enquanto métricas de stream ficam **dentro** do viewport.

**Correção:** `inspector` dinâmico por `activeTool.id` — cinematic → painel cloud safety/cost; audio → mix compacto; director → shot/sequence props.

**IMPROVE:** `IMPROVE-FILM-005`.

---

### §2.27 Batch 4 — Paridade nativa Tauri (`native_kernel.rs`, `lib.rs`, sidecar lifecycle)

**CONFIRMED com nuance**

**`native_kernel.rs` manifest** (~41–99):

- Capabilities listadas: `local-daemon-contract` (NeedsReview), `filesystem-watch-contract` (**Available**), `native-pty-contract` (**Available**), `crash-recovery-contract` (NeedsReview), `signed-updater-contract` (Held).  
- **Não lista** wgpu/rapier/onnx no manifest — esses vivem em `v29-sidecar-lifecycle.ts` como sidecars held (`DEBT-SIDECAR-001`).  
- `validate_native_kernel_manifest` (~117–123): só `filesystem-watch-contract` e `native-pty-contract` podem ser `Available`.  
- `prohibited_claims`: `"native renderer ready"`, `"background daemon ready"`, etc.

**`lib.rs` test** (~372–389): `native_kernel_manifest_blocks_unproven_native_claims` — espelha regra acima.

**Contradição documentada:** `DEBT-DESK-006` — `native-pty-contract` Available no manifest vs `DEBT-DESK-002` terminal held em `desktop_commands`.

**Impacto user:** Desktop Tauri = WebView + bridge limitado; jobs pesados → `CloudSandbox` (`lib.rs` test ~367). Sidecars wgpu/ffmpeg/onnx sem artefatos na distribuição.

**IMPROVE:** `IMPROVE-DESK-001` (**blocked_by:** `DEBT-SIDECAR-001`, `DEBT-DESK-004`, `DEBT-DESK-005`).

---

### §2.28 Batch 4 — MCP persistência (`app/api/mcp/servers/route.ts`)

**Debt (não duplicar):** `DEBT-DB-001`, `DEBT-DB-003`.

**CONFIRMED**

- GET ~25–46: `(prisma as any).mcpServer?.findMany(...).catch(() => null)` → `servers: []` + `_meta.schemaPending`.  
- POST ~80–97: `create` falha → **503** honesto (correção parcial vs false 201 em outros paths — ver `DEBT-DB-003`).  
- Modelo `McpServer` ausente em `schema.prisma`.

**Impacto:** Integração MCP — core business IA — sem persistência real em produção.

---

### §2.29 Batch 4 — Plano unificação slots (user handoff)

**Padrão canônico proposto** (estende `IMPROVE-STUDIO-005/008`):

1. **Headless editors** — viewport slot recebe só canvas/grafo/timeline tracks; sem sidebars internas.  
2. **`CreativeWorkbenchSlotBridge`** (context/Zustand) — `selectedEntity`, `inspectorPanel`, `outlinerTree` derivados do editor ativo.  
3. **Inspector único** — shell `inspector` prop consome bridge; timeline clip / quest node / sound node / stream session → mesmo painel direito.  
4. **Tool-aware inspector** — `FilmStudioClient` switch por `activeTool.id`: `audio`→mix compacto, `cinematic`→cloud metrics, `director`→shot list, default→sequence.

**Ordem sugerida pós-dívida:** `IMPROVE-STUDIO-008` (bridge) → `IMPROVE-FILM-001/004/005` → `IMPROVE-QUEST-001` → `IMPROVE-STUDIO-005` (level).

---

### §2.30 Batch 4 — Tabela diagnóstico criativo + infra

| Área | Arquivo | Falha | Gravidade | ID / Debt |
|------|---------|-------|-----------|-----------|
| Audio graph no inspector | `FilmStudioClient` + `SoundCueEditor` | 500px editor em 400px max | 🔴 Crítico | `IMPROVE-FILM-001/002` |
| Viewport film ocioso | `FilmStudioClient` | DirectorMode placeholder | 🔴 Crítico | `IMPROVE-FILM-003`, `DEBT-STUDIO-001` |
| Timeline + inspector duplo | `VideoTimelineEditor` + shell | 280px panel em dock 100–300px | 🔴 Alto | `IMPROVE-FILM-004` |
| Quest dual inspector | `QuestEditor` + `quest/page` | w-80 + shell inspector | 🔴 Alto | `IMPROVE-QUEST-001` |
| Cinematic context pollution | `CloudStreamStudioClient` + shell | AudioMixInspector irrelevante | 🟡 Médio | `IMPROVE-FILM-005` |
| Rota audio ausente | `app/studio/audio` | Só redirect via Film | 🟡 Médio | `IMPROVE-STUDIO-009` |
| Tauri native claims | `native_kernel.rs`, sidecars | wgpu/rapier/ffmpeg held | 🔴 Alto (futuro) | `IMPROVE-DESK-001`, `DEBT-SIDECAR-001` |
| MCP persistência | `mcp/servers/route.ts` | Prisma model missing | 🔴 Crítico (debt) | `DEBT-DB-001`, `DEBT-DB-003` |

---

## 1.1 Vision 2030 roadmap (Batch 5 — strategic north star)

**Source:** [`aethel_vision_2030.md`](./aethel_vision_2030.md) × código atual × paste user 2026-06-17.

**Meta:** Aethel como **motor + IDE que dita regras** — não seguidor de UE5.6 / Cursor 3.2 / Zed 1.0.

| Pilar | Benchmark | Estado repo (2026-06-17) | IMPROVE spine |
|-------|-----------|--------------------------|---------------|
| **I — IDE Agent Runtime** | Cursor 3.2, Zed 1.0 | Chat fragmentado; hash embeddings; policy.rs existe | `IMPROVE-AI-001`–`003`, `IMPROVE-IDE-012` |
| **II — Render fidelity** | UE 5.6 Lumen/Nanite | Web R3F; wgpu sidecar held | `IMPROVE-ENG-001`–`003`, `IMPROVE-DESK-001` |
| **III — Distributed collab** | SpatialOS-style | Yjs fallback broken (`DEBT-YJS-001`) | `IMPROVE-COLLAB-001`–`002` |
| **IV — Generative editors** | Multimodal operators | IA texto lateral; grafos manuais | `IMPROVE-GEN-001`–`002` |

**Prerequisite ladder (user handoff — ordem executável):**

1. **Infra nativa real** — `IMPROVE-DESK-002/003`, `IMPROVE-BRIDGE-001` (PTY, fs emit, loopback IPC)  
2. **Dados reais** — `DEBT-DB-001`, `DEBT-RENDER-001` → `IMPROVE-PLATFORM-003/004`  
3. **Shell sem colapso** — `IMPROVE-STUDIO-008/010` (slot bridge + Zustand)  
4. **Agent spine** — `IMPROVE-AI-001/003` pós `DEBT-AI-001/012`  
5. **Vision 2030** — `IMPROVE-ENG-*`, `IMPROVE-COLLAB-001`, `IMPROVE-GEN-002` (Phase D)

---

### §2.31 Batch 5 — Pilar I: IDE como Runtime de Agentes (ACP + Cartography + Hybrid)

**Ambição (user):** Multi-agente paralelo; protocolo único; indexação semântica contínua; handoff local↔nuvem.

**Estado validado:**

| Componente | Existe | Gap |
|------------|--------|-----|
| `policy.rs` `RuntimeJobLane::AiLocalInference` | **CONFIRMED** | Roteia mas `has_ai_execution_provider` false sem sidecar |
| `probe.rs` | **CONFIRMED** | Hardware probe para decisão local |
| `repository-cartography.ts` | **CONFIRMED** | Manifest estático; não vetorial contínuo |
| `semantic-code-search.ts` `embedText` | **CONFIRMED** | Hash bag — **DEBT-SEARCH-002** |
| `agent-tool-job-runner.ts` | **CONFIRMED** | Cloud runner existe; não unificado com ACP |
| Chat fragmentado | **CONFIRMED** | `IMPROVE-IDE-012`, Batch 2 |

**ACP (Agent Client Protocol) — especificação alvo:**

- Mensagens estruturadas: `context` | `tool_call` | `patch` | `receipt` | `held`  
- Desktop: canal Rust async (Tokio) + bridge WSS (`IMPROVE-BRIDGE-001`)  
- Cloud: WebSocket governado + mesmo schema JSON  
- Agentes criativos (Quest graph, SoundCue, Niagara) = mesmos contratos que agentes de código  
- Sandbox de execução + patches Monaco/graph apply com receipts (`evaluateAgentReadinessForApply`)

**Indexação vetorial contínua:**

- `filesystem-watch-contract` (Available) alimenta indexer após `IMPROVE-DESK-003`  
- Store local: SQLite-vec ou DeltaDB CRDT leve (user spec)  
- Reindex incremental por path; não estourar context window LLM  
- **blocked_by:** embeddings reais (`DEBT-SEARCH-002`), watcher emit (`DEBT-DESK-003`)

**Hybrid execution:**

- Autocomplete/ghost: local ONNX <20ms/token (`IMPROVE-DESK-004`)  
- Multi-file refactor / simulação pesada: `agent-tool-job-runner` → E2B/cloud  
- `resolve_runtime_target(&probe, lane)` único ponto de decisão

**IMPROVE:** `IMPROVE-AI-001`, `IMPROVE-AI-002`, `IMPROVE-AI-003`.

---

### §2.32 Batch 5 — Pilar II: Renderização altíssima fidelidade (WGPU + Splat + DirectStorage)

**Fonte:** `aethel_vision_2030.md` §1–2.

**Estado:** Zero implementação splat/DirectStorage no repo (grep: só docs + terrain splatmap unrelated). `v29-sidecar-lifecycle.ts` lista `wgpu-renderer` held.

**IMPROVE-ENG-001 — WGSL unificado:**

- Shader source único WGSL  
- Desktop: crate `wgpu` Tauri sidecar  
- Web: `navigator.gpu` WebGPU  
- Acceptance: mesmo frame graph ID; screenshot parity gate entre local e web preview

**IMPROVE-ENG-002 — Gaussian Splatting:**

- Pipeline ingest `.ply`/`.splat`  
- Rasterizer GPU (não mesh pipeline)  
- Mobile capture → cloud train → asset (`IMPROVE-MOBILE-002`)  
- Storage target: −90% vs mesh AAA (user claim — medir em gate)

**IMPROVE-ENG-003 — DirectStorage / GPU decompress:**

- Windows DX12 DirectStorage primeiro; macOS/Linux equivalents documented held  
- Assets encrypted/compressed stream NVMe→VRAM  
- CPU livre para IA/física  
- **Phase D** — após `IMPROVE-ENG-001` sidecar real

**IMPROVE:** `IMPROVE-ENG-001`–`003`; blocked `DEBT-SIDECAR-001`, `IMPROVE-DESK-001`.

---

### §2.33 Batch 5 — Pilar III: Spatial P2P + CRDT cena

**Spatial P2P mesh (`IMPROVE-COLLAB-001`):**

- Células espaciais; autoridade física no melhor nó (hardware + RTT)  
- WebRTC data channels entre peers  
- Sem servidor central para física proximidade  
- Reduz custo cloud MMO (vision 2030 §3)

**CRDT cena (`IMPROVE-COLLAB-002`):**

- Extensão Yjs/DeltaDB para transforms 3D, graph edges, propriedades inspector  
- Designers simultâneos no viewport  
- **Prerequisite fix:** `DEBT-YJS-001` (`Y.applyUpdate` no servidor)  
- Alinha com multiplayer editor na Web (`15_MOBILE_COMPANION` workbench continuity)

**IMPROVE:** `IMPROVE-COLLAB-001` (D), `IMPROVE-COLLAB-002` (C).

---

### §2.34 Batch 5 — Pilar IV: IA gerativa acoplada aos editores

**IMPROVE-GEN-001 — Operador visual de grafos:**

- Exemplo user: *"eco túnel metálico passos robô"* → `SoundCueEditor` instancia Delay/Reverb/Spatialization, fia, ajusta attenuation  
- Mesmo para `QuestEditor` (missões ramificadas) e grafos física/VFX  
- Requer `IMPROVE-STUDIO-008` headless + ACP (`IMPROVE-AI-001`)  
- UI: prompt no inspector slot ou inline no grafo — não só chat lateral

**IMPROVE-GEN-002 — Neural audio/VFX synthesis:**

- Runtime sintetizador neural GPU/NPU  
- Positional 3D audio procedural  
- Elimina bibliotecas `.ogg` estáticas massivas (vision §4)  
- **Phase D** — research + held manifest até evidence

**IMPROVE:** `IMPROVE-GEN-001`, `IMPROVE-GEN-002`.

---

### §2.35 Batch 5 — Desktop native spine (placebos → produção)

**CONFIRMED** — alinha `DEBT-DESK-002/003/004` com spec executável.

#### A. Terminal PTY real (`IMPROVE-DESK-002`)

- Hoje: `TerminalSessionStore::create_held` (~55), `write_held` (~74) — **sem shell spawn**  
- Alvo: `portable-pty` → PowerShell/zsh/bash  
- Threads: reader stdout → `window.emit("aethel:pty-data")`; writer stdin ← xterm.js  
- Padrão Zed

#### B. fs_watch reativo (`IMPROVE-DESK-003`)

- Hoje: `Ok(_event) => {}` (~277); comentário "full implementation would emit" (~265)  
- Alvo: `FileChangeEventPayload { path, kind }` → `aethel://file-system-event`  
- Frontend: `@tauri-apps/api/event` `listen` → `triggerAssetRefresh`  
- Padrão Cursor external edit detection

#### C. IA local ONNX (`IMPROVE-DESK-004`)

- Hoje: `ai_complete` → `provider_unavailable` (~360–366)  
- Alvo: `ort` + GGUF Int4; `probe.rs` NPU/CUDA/DirectML  
- Ghost text <20ms; privacidade offline  
- **blocked_by:** `DEBT-SIDECAR-001`, sidecar approval gate

---

### §2.36 Batch 5 — Aethel Bridge IPC (Web consome kernel local)

**IMPROVE-BRIDGE-001** — especificação user (JSON-RPC 2.0 sobre WSS):

| Etapa | Comportamento |
|-------|---------------|
| Boot Tauri | WSS loopback porta efêmera 49152–65535 |
| Auth | SCT 24h no Credential Manager / Keychain |
| Handshake | Web IDE descobre porta + envia SCT HTTPOnly |
| Methods | `aethel.fs.watch`, `aethel.pty.create`, `aethel.compile.*`, push `aethel.fs.onChanged` |
| Payload exemplo | User paste Batch 5 — preservado como contrato alvo |

**Validação:** Bridge **não existe** hoje; Web e Local são superfícies desconectadas exceto Tauri invoke direto.

**Dependências:** `IMPROVE-DESK-002/003` antes de bridge útil.

---

### §2.37 Batch 5 — Três janelas, um Workspace (`IMPROVE-PLATFORM-001`)

**Blueprint:** [`15_MOBILE_COMPANION.md`](../../AETHEL_INTERFACE_BLUEPRINTS/15_MOBILE_COMPANION.md) — mobile **não** é IDE comprimida.

| Superfície | Papel | Capacidades alvo |
|------------|-------|------------------|
| **IDE Local** (Tauri) | Autoridade hardware | PTY, ONNX, wgpu, fs watch, compilação |
| **IDE Web** (Next.js) | Colaboração + governança | Pixel streaming, Yjs, approvals, corporate |
| **Mobile Companion** | Continuidade + capture | Approvals, splat attach, vibe-coding lite |

**Regra:** Uma sessão `workspaceId` — três viewports do mesmo estado (`IMPROVE-PLATFORM-002`).

---

### §2.38 Batch 5 — Cross-Device Continuity Contract (`IMPROVE-PLATFORM-002`)

**Payload canônico `AethelWorkspaceState` (user spec):**

```json
{
  "workspaceId": "ws-aethel-99812",
  "projectId": "proj-nexus-v5",
  "activeSession": {
    "activeFile": ".../FilmStudioClient.tsx",
    "cursor": { "line": 131, "column": 12 },
    "activeToolGroup": "Film",
    "selectedToolId": "audio",
    "activeRunId": "run-compiling-098",
    "aiChat": { "activeThreadId": "...", "draftPrompt": "..." }
  }
}
```

**Sync protocol:**

| Direção | Trigger | Transport |
|---------|---------|-----------|
| Local → Cloud | 30s idle / lock / close | `PUT /api/session/state` → Redis |
| Cloud → Mobile | App open | GET last state → "Continue…" card |
| Mobile → Local | Approval / prompt | WS mutation → desktop hot reload |

**Estado hoje:** Sem endpoint `/api/session/state` unificado documentado; Redis usado em `queue-system.ts` opcional.

**IMPROVE:** `IMPROVE-PLATFORM-002`; mobile flows `IMPROVE-MOBILE-001`–`003`.

---

### §2.39 Batch 5 — Mobile Companion flows

**IMPROVE-MOBILE-001 — Gated Approvals:**

- Semantic impact diff (não syntax no phone)  
- Risk tier + CI receipt badge  
- Swipe approve/reject → mutates workspace state  
- Alinha `IMPROVE-IDE-011` (Approvals > Runs > Plan > Chat)

**IMPROVE-MOBILE-002 — Photogrammetry → Splat:**

- Pipeline user: Camera → multipart upload → cloud GPU train ~3min → `.splat` → sync `IDE Local` asset browser  
- Depende `IMPROVE-ENG-002`

**IMPROVE-MOBILE-003 — AI Composer Lite:**

- Voz/texto intenção alta nível  
- Cloud executor + compressed video preview no device  
- Não substitui Workbench — avança sessão (`15_MOBILE_COMPANION` rule)

---

### §2.40 Batch 5 — Medula de dados + render queue real

**Debt first:** `DEBT-DB-001`, `DEBT-RENDER-001`, `DEBT-DB-002`, `DEBT-DB-003`.

**Schema canônico (user spec — acceptance for `IMPROVE-PLATFORM-003`):**

- `McpServer` — id, userId, name, endpoint, transport, status, lastSeenAt  
- `RenderJob` — id, projectId, requestedBy, status, progress, provider, resolution, fps, codec, outputUrl, receiptRef

**Pipeline alvo (`IMPROVE-PLATFORM-004`):**

```
POST /api/exports/mp4 → prisma.renderJob.create(queued)
  → redis/BullMQ aethel:render-queue
  → branch: local-native (Tauri bridge FFmpeg/wgpu) | cloud-sandbox (GPU container)
  → S3 upload → prisma completed + outputUrl
```

**Estado hoje:**

- `schema.prisma`: **sem** `McpServer` / `RenderJob` (grep negativo)  
- Export routes: 202 receipt stub (`DEBT-RENDER-001`)  
- `queue-system.ts`: BullMQ **opcional** — não wired em exports

---

### §2.41 Batch 5 — Store unificada + prioridades práticas

**Correção nomenclatura:**

- User citou `workbench-store.ts` — **não existe**.  
- Existe `components/ide/fullscreen/stores/workbenchUiStore.ts` (Zustand) — **só IDE panels**.  
- `CreativeWorkbenchShell` não tem store compartilhada — causa painéis duplicados (Batches 3–4).

**IMPROVE-STUDIO-010:**

- `creativeWorkbenchStore` (novo) ou extensão de `workbenchUiStore`  
- Campos: `selectedEntity`, `inspectorContent`, `outlinerTree`, `activeToolId`  
- Consumido por `FilmStudioClient`, `level/page`, `QuestEditor` via `IMPROVE-STUDIO-008` bridge  
- Previne colapso 4 sidebars + SoundCue no inspector 400px

**Prioridades user (próxima fase dev) — mapeadas:**

| # | User priority | IMPROVE / DEBT |
|---|---------------|----------------|
| 1 | Sidecars GPU/Física `native_kernel.rs` | `IMPROVE-DESK-001`, `DEBT-SIDECAR-001` |
| 2 | Zustand unificada shell | `IMPROVE-STUDIO-010`, `IMPROVE-STUDIO-008` |
| 3 | Migração McpServer | `DEBT-DB-001`, `IMPROVE-PLATFORM-003` |
| 4 | PTY + fs_watch (antes DirectStorage) | `IMPROVE-DESK-002/003` |
| 5 | Bridge IPC | `IMPROVE-BRIDGE-001` |
| 6 | Render queue real | `IMPROVE-PLATFORM-004` |

---

### §2.42 Batch 5 — Tabela diagnóstico visão vs código

| Ambição Vision 2030 | Código hoje | Gap | ID |
|---------------------|-------------|-----|-----|
| Multi-agent runtime | Chat fragmentado | Alto | `IMPROVE-AI-001` |
| Semantic index contínuo | Hash embeddings, 120 file cap | Alto | `IMPROVE-AI-002`, `DEBT-SEARCH-002/003` |
| Local ONNX autocomplete | `provider_unavailable` | Alto | `IMPROVE-DESK-004` |
| WGSL 1:1 web/desktop | wgpu sidecar held | Alto | `IMPROVE-ENG-001` |
| Gaussian Splatting | Docs only | Total | `IMPROVE-ENG-002` |
| DirectStorage | Não iniciado | Total | `IMPROVE-ENG-003` |
| Spatial P2P MMO | Não iniciado | Total | `IMPROVE-COLLAB-001` |
| Scene CRDT | Yjs broken | Alto | `IMPROVE-COLLAB-002`, `DEBT-YJS-001` |
| IA opera grafos | Manual only | Alto | `IMPROVE-GEN-001` |
| Neural audio runtime | Não iniciado | Total | `IMPROVE-GEN-002` |
| Terminal nativo | `create_held` placebo | Crítico | `IMPROVE-DESK-002`, `DEBT-DESK-002` |
| fs_watch → UI | Eventos engolidos | Crítico | `IMPROVE-DESK-003`, `DEBT-DESK-003` |
| Web↔Local bridge | Não existe | Alto | `IMPROVE-BRIDGE-001` |
| 3-surface workspace | Fragmentado | Alto | `IMPROVE-PLATFORM-001/002` |
| Mobile approvals | Blueprint only | Médio | `IMPROVE-MOBILE-001` |
| McpServer/RenderJob DB | Schema ausente | Crítico (debt) | `DEBT-DB-001`, `DEBT-RENDER-001` |
| BullMQ render | Opcional não wired | Alto | `IMPROVE-PLATFORM-004` |

---

### §2.43 Batch 6 — Honesty-first: onde a Unreal é inalcançável (hoje)

**Princípio canônico (`IMPROVE-QUALITY-002`):** Aethel **não** compete em renderização clássica de trilhões de polígonos no curto prazo. Marketing e arquitetura devem refletir isso.

| Tecnologia UE 5.6 | Por que inalcançável na Web/Tauri hoje | Postura Aethel |
|-------------------|----------------------------------------|----------------|
| **Nanite** | Virtualized geometry + SW rasterização; WebGPU sem driver low-level | Não perseguir; **3DGS** como formato primeira classe |
| **Lumen** | RT híbrido + denoisers proprietários | Não prometer GI foto-real browser sem held manifest |
| **Chaos physics** | Décadas C++ cloth/destruction/IK | Rapier WASM/sidecar — escopo honesto |
| **R3F/Three.js** | ~15M tri não otimizados engasgam (user claim) | ECS bake + GPU compute; não hero mesh count |

**Gargalos reais de IA generativa 3D (anti-alucinação):**

- Topologia amorfa (Tripo3D/LGM/InstantMesh) — sem UV/quads/rig utilizáveis  
- Latência difusão 3D: 10–60s/modelo H100; cidade inteira = horas  
- **Regra:** IA **não** inventa malhas AAA; IA **orquestra** assets existentes

**IMPROVE:** `IMPROVE-QUALITY-002` — manifesto de produto + gates de marketing.

---

### §2.44 Batch 6 — Estratégia de superioridade real (três moats)

```
         ┌─────────────────────────────────────┐
         │     AETHEL VALUE FOCUS (moat)     │
         └──────────────────┬──────────────────┘
    ┌────────────────────┼────────────────────┐
    ▼                    ▼                    ▼
 USD Integrator      3DGS First-Class     Agent-First IDE
 (IMPROVE-AI-004)    (IMPROVE-ENG-002)    (IMPROVE-AI-001,
                                           IMPROVE-VS-010,
                                           IMPROVE-ENG-006)
```

**A. Ponte de Assets USD (`IMPROVE-AI-004`):**

- User: "Monte vilarejo medieval costeiro"  
- IA escreve `.usda` referenciando biblioteca (Megascans/Sketchfab/internal)  
- Posiciona, rotaciona, escala — **não** modela casas do zero  
- Estado: `openusd-tools` em `runtime-engine-spine.ts` metadata; export `usdz` stub (`DEBT-RENDER-001`)

**B. Gaussian Splatting (`IMPROVE-ENG-002` reforçado):**

- Foto-realismo capturado; render WebGPU rápido; 60fps mobile target  
- UE ignora splats em favor Nanite — janela de diferenciação

**C. Lógica Agent-First (`IMPROVE-ENG-006`, `IMPROVE-VS-010`):**

- Rust → WASM compile ms vs UE C++/Blueprint compile  
- Cursor/Zed-class IDE + agentes no mesmo runtime (`IMPROVE-AI-001`)

---

### §2.45 Batch 6 — Três frentes: engenharia de alta qualidade

#### IDE Local (Powerhouse)

| Frente | Spine ID | Estado | Solução |
|--------|----------|--------|---------|
| WGPU overlay | B51 | WebView gargalo | `IMPROVE-ENG-004` child HWND + anchor |
| VS JIT WASM | F6, M69 | JS `runtime-core/executors.ts` | `IMPROVE-VS-010` |
| Rust VFS | F2 | HTTP/Prisma para assets | `IMPROVE-DESK-005` Sled/RocksDB |

#### IDE Web (Orquestrador)

| Frente | Spine ID | Estado | Solução |
|--------|----------|--------|---------|
| ECS bake | U57, B52 | OOP hierarchy play lag | `IMPROVE-ENG-005` SharedArrayBuffer |
| Visual evidence | 41 | `task-evidence-ledger.ts` existe | `IMPROVE-AI-008` headless 60f GIF |
| ReactFlow editors | Batches 3–4 | Slot collapse | `IMPROVE-STUDIO-008` |

#### Mobile Companion (Gateway)

| Frente | Spine ID | Estado | Solução |
|--------|----------|--------|---------|
| Tree-sitter RAG | 44 | `deep-context-manager.ts` ~277 LoC (spine doc outdated) | `IMPROVE-AI-007` AST slice |
| Multimodal bypass | I70 | Não implementado | `IMPROVE-AI-005/006` |
| Approvals | 15_MOBILE | Blueprint | `IMPROVE-MOBILE-001` |

---

### §2.46 Batch 6 — CanvasViewportSurface placebo — CONFIRMED

```10:16:meu-repo/cloud-web-app/web/components/preview/CanvasViewportSurface.tsx
const NexusCanvasV2 = ({ renderMode }: { renderMode: 'draft' | 'cinematic' }) => (
  <div className="flex h-full w-full items-center justify-center ...">
    Canvas mode (Nexus) deprecated.
```

- Shell `ViewportWorkbenchShell` monta outliner/properties/timeline reais  
- **Centro** = string estática — zero WebGL/WebGPU  
- **Alvo:** `NativeViewportAnchor` (B51) ou splat renderer (`IMPROVE-VIEW-001`)

---

### §2.47 Batch 6 — Visual Script JIT Compiler spec (Frente 6 + M69)

**Estado:** `lib/visual-script/runtime-core/` interpreta nós em JS main thread — **CONFIRMED**.

**Contrato grafo (user spec — acceptance `IMPROVE-VS-010`):**

- `VisualScriptGraph` JSON: nodes, edges, `portType: exec|boolean|number|string|vector3|object`  
- Compilador Rust: DAG → ordenação topológica (Kahn/Tarjan) → abort em ciclos de dados  
- Memória linear WASM: faixas Global/Float/String/Vector/Object refs (offsets estáticos)  
- Codegen: `wasm-encoder` — `math_add` → f64 load/add/store; `action_move_actor` → `Call(SYSTEM_CALL_MOVE_ACTOR)`  
- Syscalls `aethel_sys`: `spawn_actor`, `set_actor_velocity`, `play_sound_cue` via wasmer (desktop) / import object (web)  
- Tick: `instance.exports.on_tick()` em `requestAnimationFrame`

**Relação:** Supersedes detalhe de `IMPROVE-VS-008`; blocked `DEBT-UX-VS-001` para save validation.

---

### §2.48 Batch 6 — WGPU Overlay B51 (arquitetura)

**Fluxo (user mermaid preservado):**

1. React `NativeViewportAnchor` + `ResizeObserver`  
2. `getCurrentWebviewWindow().emit('aethel://viewport-bounds-changed', {x,y,w,h})`  
3. Rust `setup_viewport_overlay` reposiciona child surface  
4. `wgpu_renderer::resize_overlay` — render direto GPU  

**Escopo:** Desktop Tauri **only** — Web mantém R3F/WebGPU (`audit_backend_spine` B51 aviso).

**IMPROVE:** `IMPROVE-ENG-004` + `IMPROVE-VIEW-001`.

---

### §2.49 Batch 6 — ECS Scene Bake U57/B52

**Design mode:** OOP scene graph — user move/inspect  
**Play mode:** Bake → `Float32Array` stride 10 (pos, rot quat, scale) em `SharedArrayBuffer`  
**Consumers:** Rapier3D worker + WebGPU compute — batch update, zero GC pressure  

**IMPROVE:** `IMPROVE-ENG-005`; alinha Niagara compute U56 (futuro).

---

### §2.50 Batch 6 — Multimodal Bypass I70

**Video-to-mechanic (`IMPROVE-AI-005`):**

- Upload vídeo 5s → vision-agent → parábola física → nós VS com valores extraídos  
- Não gera código linha-a-linha para mecânica

**Asset morphing (`IMPROVE-AI-006`):**

- Download asset library quality → morph vértices + material shaders  
- "Casa abandonada" = musgo/rachadura shader — não remesh IA

**Project scanning (I70 spine):** ripgrep + AST — cross-ref `DEBT-SEARCH-*`, `IMPROVE-AI-007`

---

### §2.51 Batch 6 — Plugins WASI wasmtime (`IMPROVE-PLATFORM-005`)

**Problema:** `DEBT-EXT-001` — `vm` + native `require` não é boundary segura.

**Solução Aethel (user spec):**

| Camada | Detalhe |
|--------|---------|
| Runtime | `wasmtime` + `wasmtime_wasi` |
| Sandbox | preopened_dir = project folder only |
| Limits | fuel 100_000_000; heap 128MB; epoch interruption |
| Install | `install/route.ts` → signature SHA256 → VFS Sled (`IMPROVE-DESK-005`) |
| APIs | `aethel_editor.insert_text`, `aethel_renderer.trigger_preview_bake` |
| Resilience | R64 Let-it-crash — plugin trap não derruba IDE; `ErrorBoundary` + disable plugin |

**Relação:** `IMPROVE-IDE-015` = UI catálogo; `IMPROVE-PLATFORM-005` = runtime; `DEBT-PLUGIN-001` = cloud persist.

---

### §2.52 Batch 6 — Tabela diagnóstico honesty + spine

| Área | Realidade | Moat correto | ID |
|------|-----------|--------------|-----|
| vs UE polygons | Perdemos | Não prometer | `IMPROVE-QUALITY-002` |
| IA gera mundo AAA | Alucinação | USD compose | `IMPROVE-AI-004` |
| Neural mesh gen | Amorfo/lento | Morph + library | `IMPROVE-AI-006` |
| Canvas viewport | Texto deprecated | WGPU/splat | `IMPROVE-VIEW-001`, `IMPROVE-ENG-004` |
| VS interpret JS | Latência | JIT WASM | `IMPROVE-VS-010` |
| Plugins vm | RCE risk | WASI wasmtime | `IMPROVE-PLATFORM-005`, `DEBT-EXT-001` |
| Evidence AI 3D | Ledger sem visual | Headless WebM | `IMPROVE-AI-008` |
| Mobile vibe-coding | Token blowup | Tree-sitter slice | `IMPROVE-AI-007` |
| Game compile speed | — | Rust/WASM ms | `IMPROVE-ENG-006` |

---

### §2.53 Batch 7 — Competitive parity thesis (Manus / Perplexity / Gemini Live)

**User intent (2026-06-17):** Abandonar chat estático; evoluir para plataforma de **agentes multimodais com orquestração paralela e voz em tempo real** — paridade de elite vs Manus (navegação autônoma), Perplexity (RAG alta fidelidade), Gemini Live / OpenAI Realtime (conversação full-duplex).

**Três frentes do paste:**

| Frente | Competidor | Lacuna Aethel (código) | ID alvo |
|--------|------------|------------------------|---------|
| Pesquisa + browser autônomo | Manus | `AethelResearch.tsx` mock; recorder sem headless | `IMPROVE-AI-009` |
| RAG dinâmico | Perplexity | Tavily em `ai-web-tools.ts` isolado do painel | `IMPROVE-AI-010` |
| Voz live + barge-in | Gemini Live / OpenAI Realtime | `useVoiceRecording` walkie-talkie; `LiveConversationPanel` texto | `IMPROVE-AI-011` |
| Squad multitarefa | Cursor/Codex parallel | Tool bus + contract existem; UI paralela básica | `IMPROVE-AI-012` |
| Cancel jobs ativos | — | `JOB_ACTIVE_CANNOT_CANCEL` 409; Tauri sem SIGKILL | `IMPROVE-PLATFORM-006` |
| Export GLB real | — | `glb/route.ts` receipt stub | `IMPROVE-PLATFORM-007` |

**Hard gate:** `npm run qa:enterprise-gate` PASS + `DEBT-RENDER-001` / `DEBT-AI-001` resolvidos antes de marketing "agentic-first platform".

---

### §2.54 Batch 7 — Research & autonomous web (`AethelResearch.tsx`)

**CONFIRMED — mock manus-grade UI, não operador real:**

| Evidência | Arquivo | Detalhe |
|-----------|---------|---------|
| Fontes estáticas | `components/nexus/AethelResearch.tsx` ~36–61 | `PRESET_SOURCES` fixo (Cursor docs, OpenAI Realtime, Gemini Live) — **não** depende da query |
| Busca instantânea | ~109–123 | `handleSearch` seta `status: 'complete'` síncrono; summary admite "benchmark pack" |
| Spine held | ~89–106 | `buildResearchRuntimeSpinePlan({ browserReplayEnabled: false, artifactPersistenceEnabled: false })` |
| Take over placebo | ~154–159 | `handleOperatorControl('takeover')` → mensagem "held until live browser replay session" |
| Módulos Held | ~286–310 | Cards Browser replay / Artifacts / Cost = "Held" / "Review" |
| Marker gate | ~165 | `data-research-workspace="manus-grade"` — spine de mercado, não capability |

**PARTIAL — infraestrutura replay/policy (não headless):**

| Evidência | Arquivo | Detalhe |
|-----------|---------|---------|
| Recorder in-memory | `lib/server/browser-operator-recorder.ts` ~65 | `const runs = new Map<string, BrowserOperatorRun>()` — aceita steps via POST, policy via `browser-operator-safety` |
| Replay UI | `components/agents/BrowserOperatorReplay.tsx` | Take over/pause/approve → `/api/agents/browser-operator/runs/[runId]` |
| Tool bus | `lib/production/agent-tool-bus.ts` | `AgentMode: 'Browser Operator'`; `runtimeTargets: 'browser-operator'`; `evaluateBrowserOperatorPolicy` |
| **Ausente** | repo grep | Zero Puppeteer/Playwright **orquestração de agente** em produção (Playwright só QA visual regression) |

**Especificação alvo (`IMPROVE-AI-009`):**

```
[Research query]
      │
      ▼
[Nexus Orchestrator] ──► [Browser Operator Agent]
      │                         │
      │                         ▼
      │              [Headless Playwright/Puppeteer]
      │              cloud sandbox OR Tauri sidecar
      │                         │
      ▼                         ▼
[Dynamic RAG IMPROVE-AI-010]   [Step stream + screenshots]
      │                         │
      └────────► [BrowserOperatorReplay] ◄── Take over (human control)
                         │
                         ▼
              [task-evidence-ledger.ts]
```

**Acceptance:**

- Query em `AethelResearch` dispara run real (não `PRESET_SOURCES`)
- Take over em `AethelResearch` **e** `BrowserOperatorReplay` abre sessão controlável (não toast "held")
- Progresso navegação (URL, screenshot, intent) stream para IDE em tempo real
- CAPTCHA básico: held gate + human takeover — não bypass silencioso
- Cross-ref: `IMPROVE-AI-001` ACP, `IMPROVE-AI-008` evidência visual, `browser-operator-safety.ts`

---

### §2.55 Batch 7 — Dynamic RAG pipeline (`IMPROVE-AI-010`)

**CONFIRMED — busca web existe, painel research não consome:**

| Evidência | Arquivo | Detalhe |
|-----------|---------|---------|
| Tavily/Serper | `lib/ai-web-tools.ts` ~33–155 | `searchTavily`, fallback Serper/DuckDuckGo; requer `TAVILY_API_KEY` |
| Types | `lib/ai-web-tools.types.ts` | `TavilySearchResponse` |
| CSP | `middleware.ts` | `connect-src` inclui `api.tavily.com` |
| Research panel | `AethelResearch.tsx` | **Não importa** `ai-web-tools`; credibility hardcoded em preset |
| Ledger | `lib/production/task-evidence-ledger.ts` | `browser-replay`, `source-citation` evidence slots; gate `evaluateTaskEvidenceReadiness` |
| Handoff | `lib/research-handoff.ts` | Copy prompt / Open in IDE — útil pós-RAG real |

**Ausente vs Perplexity-grade:**

- Exa.ai (user spec) — não referenciado no repo
- Credibility scoring dinâmico (hoje % fixo no preset)
- Parse/extract de trechos em tempo de execução ligado ao ledger do projeto
- Persistência de evidências de pesquisa no `task-evidence-ledger-store.ts`

**Pipeline alvo:**

1. Query → `deep-research` / `source-citation` tools no `agent-tool-bus`
2. Runtime fetch Tavily (+ Exa opcional) → normalize `SearchResult[]`
3. Chunk + relevance score + domain credibility heuristics (não constantes)
4. Append `source:*` + `credibility:*` refs ao ledger; `saveResearchHandoff` só após review
5. UI: substituir `PRESET_SOURCES` por fontes reais com spinner honesto até dados chegarem

**Blocked by:** `DEBT-SEARCH-002` (embeddings hash bag); melhora independente do browser operator mas sinergiza com `IMPROVE-AI-009`.

---

### §2.56 Batch 7 — Live conversational mode (`useVoiceRecording.ts`, `LiveConversationPanel.tsx`)

**CONFIRMED — walkie-talkie, não full-duplex:**

| Evidência | Arquivo | Detalhe |
|-----------|---------|---------|
| Gravação | `useVoiceRecording.ts` ~80–140 | `MediaRecorder` → WebM blob → `onstop` → `POST /api/ai/voice/transcribe` |
| Latência | fluxo | Start → fala → stop → upload → JSON — **3–5s** típico (user spec) |
| SpeechRecognition | ~84–107 | Paralelo opcional (interim) — ainda exige ciclo start/stop |
| Live panel UI | `LiveConversationPanel.tsx` ~26–28 | Comentário "Gemini-Live-style"; `isLiveSpeaking` **hardcoded** `useState(false)` |
| Composer | ~65–108 | Textarea + Send — **sem** microfone streaming, **sem** WebRTC |
| Activity deck | `AIChatActivityDeck.tsx` | `consoleMode === 'live'` monta panel; interrupt button only |
| Spine doc | `UX_MARKET_STANDARD_SPINE.md` | Exige barge-in, native-audio readiness — UI não implementa |

**Arquitetura alvo (`IMPROVE-AI-011`):**

```
[User Mic] ──► PCM 16/24kHz chunks (~100ms)
      │
      ▼
[Client: WebRTC AudioTrack / WebSocket]
      │
      ▼
[Gemini Live / OpenAI Realtime Gateway]
      │◄── Agent processing (tools, file edits, viewport)
      ▼
[Opus audio stream] ──► [AudioContext player] ──► Speaker
      ▲
      └── Barge-in: VAD on mic while AI speaking → stop playback + cancel pending TTS buffer
```

**Requisitos de aceitação:**

- Conexão live permanece aberta em background durante runs paralelos (`IMPROVE-AI-012`)
- Barge-in <200ms perceived: cortar `AudioContext`, sinalizar cancel na cloud
- Transcript bidirecional visível (compact lane per `UX_MARKET_STANDARD_SPINE`)
- Substituir ou coexistir com `useVoiceRecording` — não quebrar fallback HTTP quando Realtime indisponível (503 honesto)
- Cross-ref: `IMPROVE-AI-001` ACP WSS; `AethelProvider.tsx` `RealtimeMessage` WebSocket existe mas não é áudio duplex

---

### §2.57 Batch 7 — Nexus squad & Activity Deck (`IMPROVE-AI-012`)

**PARTIAL — contratos e bus existem; orquestração paralela observável incompleta:**

| Evidência | Arquivo | Detalhe |
|-----------|---------|---------|
| Tool bus | `lib/production/agent-tool-bus.ts` | `AgentMode`: Coordinator, Research, Builder, Creative, QA, Browser Operator, Release |
| Work contract | `lib/production/parallel-agent-work-contract.ts` | Lanes: research, software, validation, browser-operator; tools: `test-runner`, `deep-research`, `browser-operator`, `render-validate` |
| Job runner | `lib/production/agent-tool-job-runner.ts` | Importa bus + ledger; dispatch async |
| Fleet session | `lib/production/agent-fleet-session.ts` | Coordinator-first; "parallel agents aligned without noisy control room" |
| Activity UI | `AIChatActivityDeck.tsx` | `AgentBoard` só se `agentCount > 1`; `RunCard` single run; **não** feed horizontal multi-agente contínuo |
| Local bridge | `lib/device/local-runtime-bridge.ts` | `maxParallelAgents` policy 1–6 |

**Squad alvo (user spec):**

```
[Nexus Orchestrator]
        ├─► Research Agent     → IMPROVE-AI-009/010
        ├─► Software Engineer  → diff-proposal, file-read, shader-compile
        └─► QA & Test Agent    → test-runner, render-validate, playtest-runner
              ▲
              └── agent-tool-bus.ts (shared dispatch)
```

**Activity Deck alvo:**

- Feed horizontal scrollável: cada agente = card com lane, tool ativo, ETA, interrupt/pause
- Usuário injeta observações por voz (`IMPROVE-AI-011`) ou texto sem parar runs
- QA dispara quando Builder commita — via bus, não LLM monolítica

**Blocked by:** `DEBT-AI-001` (chat fragmentado), `IMPROVE-AI-001` (ACP unificado).

---

### §2.58 Batch 7 — Job cancel channel (`cancel/route.ts`) & GLB export (`glb/route.ts`)

#### Cancelamento bidirecional (`IMPROVE-PLATFORM-006`)

**CONFIRMED — jobs ativos não canceláveis:**

| Evidência | Arquivo | Detalhe |
|-----------|---------|---------|
| HTTP 409 | `app/api/render/jobs/[jobId]/cancel/route.ts` ~75–83 | `ACTIVE_STATES` = rendering/processing/running/active → `JOB_ACTIVE_CANNOT_CANCEL` |
| Capability | ~8 | `RENDER_JOB_CANCEL` status `PARTIAL` — honesto no código |
| BullMQ | `lib/queue-system.ts` ~322–323 | `state === 'active'` → mesmo reason |
| Tauri cancel | `apps/studio-local/src-tauri/src/jobs.rs` ~112–121 | `cancel()` só `job.state = Cancelled` — **sem** `child.kill()` |
| Tauri command | `main.rs` ~154 | `jobs_cancel` exposto; `daemon.rs` POST `/jobs/{id}/cancel` |
| Native kernel | `native_kernel.rs` ~75 | Blocker: "persistent crash recovery receipts not written yet" |

**Especificação (user paste, validada):**

```
POST /api/render/jobs/[jobId]/cancel
        │
        ├─► prisma.renderJob.status = cancelled
        ├─► redis.publish(`aethel:job-cancel:${jobId}`, { action: 'SIGINT' })
        │
        ├─► [Cloud GPU worker] kill ffmpeg / blender-headless container
        └─► [Tauri WSS bridge] → child_process.kill() on WGPU/FFmpeg sidecar
```

**Nota:** Não há `DEBT-*` dedicado — limitação documentada como capability PARTIAL. Resolver junto com `IMPROVE-PLATFORM-004` render queue real.

#### Export GLB (`IMPROVE-PLATFORM-007`)

**CONFIRMED — receipt stub:**

| Evidência | Arquivo | Detalhe |
|-----------|---------|---------|
| Stub | `app/api/exports/glb/route.ts` ~30–42 | `jobId` sintético; `_pending: 'lib/render-farm/providers not yet wired'`; 202 |
| Debt | `DEBT-RENDER-001`, `DEBT-RENDER-002` | Prisma `RenderJob` ausente; poll 404 |
| Tauri probe | `apps/studio-local/src-tauri/src/probe.rs` | Detecta `gltf-transform`, `meshoptimizer`, `blender` — **não** wired a export API |
| Test probe | `lib.rs` ~204–235 | `LocalRuntimeAssetTool::GltfTransform`, `BlenderHeadless` em testes |

**Pipeline alvo:**

| Runtime | Stack | Output |
|---------|-------|--------|
| Tauri local | Blender headless ou Rust gltf + meshoptimizer | `.glb` instantâneo no disco do usuário |
| Cloud | Container `@gltf-transform/core`; USD assets S3 → merge → compress → S3 upload | `RenderJob` complete + download URL |

**UX:** até pipeline real, manter `IMPROVE-UX-003` honest held — sem loader infinito em 202 receipt.

---

### §2.59 Batch 7 — Tabela diagnóstico competitive parity

| Área | Realidade (código) | Paridade alvo | ID |
|------|-------------------|---------------|-----|
| Research workspace | PRESET_SOURCES + Held cards | Manus browser + live sources | `IMPROVE-AI-009`, `IMPROVE-AI-010` |
| Browser operator | Recorder Map + policy | Headless Playwright | `IMPROVE-AI-009` |
| Web search RAG | Tavily isolado em `ai-web-tools` | Perplexity-grade + ledger | `IMPROVE-AI-010` |
| Voice input | WebM upload transcribe | Gemini Live duplex | `IMPROVE-AI-011` |
| Live panel | Text composer + fake speaking state | WebRTC + barge-in | `IMPROVE-AI-011` |
| Multi-agent UI | AgentBoard if count>1 | Horizontal Activity Deck | `IMPROVE-AI-012` |
| Tool orchestration | Bus + contract (spine) | Squad dispatch + QA async | `IMPROVE-AI-012`, `IMPROVE-AI-001` |
| Cancel active job | 409 JOB_ACTIVE_CANNOT_CANCEL | Redis pub/sub + SIGKILL | `IMPROVE-PLATFORM-006` |
| GLB export | 202 receipt stub | Local + cloud converter | `IMPROVE-PLATFORM-007`, `DEBT-RENDER-001` |

---

### §2.60 Batch 8 — AAA render pipeline audit (UE 5.6 vs Aethel — honesty-first)

**User intent (2026-06-17):** Crítica estrutural dos pipelines de renderização, geometria, pós-processamento, partículas e materiais — **sem marketing**, cruzando arquivos físicos do repo.

**Regra de ouro (reitera `IMPROVE-QUALITY-002`):** Não competir Nanite/Lumen/Chaos em fidelidade poligonal hoje; documentar gaps reais + moat correto (iteração agent-first, 3DGS, USD, WASM).

**Arquivos âncora validados:**

| Arquivo | Papel |
|---------|-------|
| `lib/aaa-material-system.shaders.ts` | Fragment PBR + funções mortas |
| `lib/aaa-material-system.ts` | `ShaderGraphCompiler` magenta |
| `lib/nanite-virtualized-geometry-renderers.ts` | CPU cull + visibility resolve debug |
| `lib/postprocessing/system/effect-composer.ts` | Bloom/tonemap/grading (funcional) |
| `lib/aaa-render-system.ts` | AAA stubs (SSAO/SSR/DOF/GI vazios) |
| `lib/hooks/useRenderPipeline.ts` + `.presets.ts` | Presets TAA/CSM — renderer null |
| `lib/virtual-texture-cache.ts` | Page table LRU (parcial) |
| `lib/engine/NiagaraParticleEmitter.runtime.ts` | CPU particles |
| `lib/particle-system-real.ts` | CPU sim, comentário "GPU" enganoso |

**Cross-debt:** `DEBT-RENDER-003`, `DEBT-NANITE-001`, `DEBT-PERF-002`, `DEBT-NIAGARA-002`, `DEBT-PERF-001`.

---

### §2.61 Batch 8 — PARTE 1: GI, sombras, path trace (`IMPROVE-ENG-007/008`)

#### O que o código confirma

| Afirmação user | Status | Evidência |
|----------------|--------|-----------|
| Equações Cook-Torrance declaradas mas não usadas em `main()` | **CONFIRMED** | `distributionGGX`, `geometrySmith`, `fresnelSchlick` ~260–285; `main()` termina ~326 `vec3 color = baseAlbedo * ao + emissiveColor` |
| `F0` calculado e ignorado | **CONFIRMED** | ~325 `vec3 F0 = mix(...)` — variável morta |
| Sem loops directional/point/spot no shader custom | **CONFIRMED** | Inclui `lights_pars_begin` ~229 mas **não** `#include <lights_fragment_begin>` nem loop manual |
| `lights: true` no material | **CONFIRMED mas ineficaz** | `aaa-material-system.ts` ~27 — Three.js lighting não aplica a shader custom sem chunks |
| Sem GI dinâmica real | **CONFIRMED** | `setupSSGI/RTGI/VoxelGI` corpos vazios ~325–353; `setupLightProbes` só instancia `THREE.LightProbe` sem irradiance bake |
| Sem lightmaps / path trace offline | **CONFIRMED** | Zero lightmap bake pipeline; `ray-tracing.ts` + `BVHBuilder` existem mas `DEBT-PERF-002` sync main thread; ReSTIR ausente |
| Sem shadow map sampling no PBR shader | **CONFIRMED** | Shader não sample shadow maps |
| CSM/VSM nos presets | **CONFIG THEATER** | `useRenderPipeline.presets.ts` ultra/high: `technique:'cascaded'`, `cascades:4` — mas `useRenderPipeline.ts` ~177–179: `aaaRendererRef.current = null` |

#### Infraestrutura parcial (não ignorar)

| Módulo | Estado |
|--------|--------|
| `lib/pbr-shadow-runtime.ts` | `ShadowMapRenderer` renderiza depth ortho — exportado em `pbr-shader-pipeline.ts` — **não wired** a `AdvancedPBRMaterial` |
| `lib/aaa-render-system.ts` `setupGlobalIllumination` | Switch method existe; implementações stub |
| `lib/day-night-cycle.tsx` | `shadowIntensity` ambiente — não substitui GI |

#### Especificação alvo (`IMPROVE-ENG-007` + `IMPROVE-ENG-008`)

**Fase A — Luz direta mínima honesta:**

1. Em `main()`: loop sobre `NUM_DIR_LIGHTS` / point / spot via Three chunks **ou** uniform buffer explícito
2. Invocar `distributionGGX` + `geometrySmith` + `fresnelSchlick` no BRDF
3. Integrar `ShadowMapRenderer` texture + bias no mesmo pass

**Fase B — GI/sombras escalonadas (pós `IMPROVE-ENG-001` WebGPU):**

| Tier | Técnica | Aceitação |
|------|---------|-----------|
| 1 | SSAO + baked light probes | Cenas estáticas reviewable |
| 2 | SSGI one-bounce | `setupSSGI` implementado |
| 3 | DDGI / voxel cone trace | Held até WebGPU compute |
| 4 | Path trace offline + ReSTIR | Worker BVH async (`DEBT-PERF-002`); cinema export only |

**IA (`IMPROVE-AI-013`):** nunca editar GLSL — só JSON preset deltas.

---

### §2.62 Batch 8 — PARTE 2: Materiais PBR + Nanite (`IMPROVE-ENG-007/009`)

#### Shader graph magenta — CONFIRMED

```121:125:meu-repo/cloud-web-app/web/lib/aaa-material-system.ts
    return `
      vec4 calculateOutput() {
        return vec4(1.0, 0.0, 1.0, 1.0);
      }
    `;
```

`generateFragmentCode` void graph/node/uniforms ~117–119 — editor de grafos = **mock visual**.

#### Parâmetros PBR avançados omitidos — CONFIRMED

| Params | Declarados | Calculados em `main()` |
|--------|------------|------------------------|
| clearcoat, ior, transmission, subsurface, iridescence | uniforms ~177–218 | **Não** |
| albedo, metallic, roughness, normal, ao, emissive | Sim | Parcial (sem lighting) |

#### Nanite virtualized geometry — CONFIRMED + nuance

| Afirmação | Status | Evidência |
|-----------|--------|-----------|
| `cullMeshlets` 100% CPU TypeScript | **CONFIRMED** | Comentário explícito ~159 "CPU fallback"; loop ~177–216 |
| Hi-Z buffer | **PARTIAL** | Shader GLSL ~85–100 `occlusionCull` + `updateHiZBuffer` ~118 — mas culling path principal é CPU |
| Visibility resolve psicodélico | **CONFIRMED** | resolve FS ~371–376 `fragColor = vec4(meshletId%, triangleId%, 0.5, 1.0)` |
| GPU indirect draw | **ABSENT** | `useRenderPipeline` detecta `multiDrawIndirect` ext ~169 mas Nanite não usa |
| Real meshlet decimation | **FALSE per DEBT-NANITE-001** | `simplifyMeshlets` subsample aritmético — não geometria real |

#### Pipeline alvo (`IMPROVE-ENG-009`)

```
[Scene meshes] → meshlet builder (real decimation DEBT-NANITE-001)
       │
       ▼
[WebGPU/WGPU compute pass] frustum + cone + Hi-Z occlusion
       │
       ▼
[Indirect draw] visibility buffer (uint IDs)
       │
       ▼
[Resolve pass] fetch UV/normal/material from buffers → PBR shading (ENG-007)
```

**Honesty UX:** até ENG-009 live, rotular viewport "Nanite" como **held** — alinha `IMPROVE-QUALITY-002`.

---

### §2.63 Batch 8 — PARTE 3: Texturas + pós-processamento (`IMPROVE-ENG-010/011`)

#### O que funciona vs o que falta

| Capacidade | Estado código |
|------------|---------------|
| Bloom, tonemapping, color grading, vignette, film grain, chromatic aberration | **WORKING** — `lib/postprocessing/system/*` wired em `EffectComposer` |
| TAA | **PRESET ONLY** — `QUALITY_PRESETS.ultra.postProcess.antialiasing:'taa'` — sem pass TAA em `postprocessing/system/index.ts` |
| Velocity buffer | **ABSENT** — nenhum RT velocity; `setupMotionBlur` stub em `aaa-render-system.ts` |
| DLSS/FSR/XeSS | **ABSENT** — sem upscaler |
| SSR | **STUB** — `setupSSR()` vazio ~265–268; não em effect-composer |
| DOF bokeh físico | **STUB** — `setupDOF()` vazio ~274–276; sem `dof-pass.ts` em postprocessing |
| Virtual texturing | **PARTIAL** — `PageTable`, `PhysicalTextureAtlas`, `TileCache`, `FeedbackBuffer` em `virtual-texture-cache.ts` — paginação CPU + upload manual; **sem** BC7/ASTC GPU decode |

#### Crítica user refinada

- Aliasing severo: plausível — sem TAA ativo apesar do preset
- VRAM 4K textures: risco real — atlas `Uint8Array` full res sem streaming comprimido
- DOF gaussiano simples: **não encontrado** em `postprocessing/system` — pode existir em outro path; DOF AAA stub está em `aaa-render-system` não implementado. **Correção:** efeito DOF **ausente** no pipeline ativo, não apenas "gaussiano ruim"

#### Especificação (`IMPROVE-ENG-010`)

1. **Velocity MRT** — per-object ou per-pixel motion vectors cada frame
2. **TAA pass** — history buffer + jitter Halton; expor em `EffectComposer`
3. **SSR pass** — usa `depthTexture` + `normalTarget` já previstos em `effect-composer.ts` ~45–54
4. **DOF pass** — CoC from depth + bokeh kernel (não separable gaussian único)
5. **Upscaling** — FSR2 Web opcional; DLSS Tauri only — held gates

#### Especificação (`IMPROVE-ENG-011`)

- Tile request → fetch BC7/ASTC blob → GPU transcode → `PhysicalTextureAtlas.uploadTile`
- Feedback buffer já analisa pixels ~304–345 — wire a loader assíncrono

---

### §2.64 Batch 8 — PARTE 4: Partículas Niagara (`IMPROVE-VFX-005`)

#### CONFIRMED — CPU bottleneck

| Sistema | Simulação | Evidência |
|---------|-----------|-----------|
| `NiagaraParticleEmitter.runtime.ts` | CPU `Particle[]` | `update()` ~32–80 loops JS, `splice`, `Vector3.clone()` |
| `particle-system-real.ts` | CPU apesar do header | `updateParticles` ~202–276 for-loop main thread |
| `NiagaraVFX.runtime.tsx` | Graph UI | Não compila para compute — `DEBT-NIAGARA-002` |

**Nuance:** `particle-system-real` usa `ShaderMaterial` + `THREE.Points` para **draw** GPU — apenas rasterização, não simulação compute.

#### Alvo UE Niagara-class

| Runtime | Stack |
|---------|-------|
| Web | WebGPU compute shader — position/velocity/lifetime buffers |
| Desktop | WGPU sidecar (`IMPROVE-ENG-001`, `IMPROVE-DESK-001`) mesmo WGSL |
| Editor | `IMPROVE-VFX-004` graph → compile → compute kernels |

**Budget:** 5k partículas CPU (user est.) → 500k–1M+ GPU compute (held até profiling gate).

---

### §2.65 Batch 8 — PARTE IV: IA + render (`IMPROVE-AI-013/014`)

#### Config-driven rendering — alinhado ao moat

**Problema:** LLM editando WGSL/GLSL → syntax errors + token blowup.

**Solução validada no repo:**

| Hoje | Alvo |
|------|------|
| `QUALITY_PRESETS` em `useRenderPipeline.presets.ts` | Schema JSON versionado `RenderPresetPatch` |
| Toggles SSR/Bloom no-op se `aaaRendererRef=null` | ACP tool `render-preset-apply` valida keys contra schema |
| Shader graph mock | `IMPROVE-AI-014` Rust AST em sidecar — typecheck pins antes de emit GLSL/WGSL |

**Exemplo patch IA (aceitação):**

```json
{
  "preset": "high",
  "postProcess": { "bloomIntensity": 1.5, "tonemapping": "ACES", "antialiasing": "taa" },
  "gi": { "method": "ssgi", "ssgiSamples": 8 }
}
```

Motor aplica uniforms em <16ms — sem recompilar shader source.

#### Rust AST shader graph (`IMPROVE-AI-014`)

- Input: `ShaderGraph` JSON (mesmo contrato `aaa-material-system.contracts.ts`)
- Validar: `NodeSocket.type` compatibility em cada `ShaderConnection`
- Output: WGSL (WebGPU) + GLSL (WebGL fallback) — substituir `vec4(1,0,1,1)` stub
- Falha: `ErrorBoundary` viewport + ledger entry — não crash IDE

**Blocked by:** `DEBT-RENDER-003`, `IMPROVE-ENG-001` para emit WGSL canônico.

---

### §2.66 Batch 8 — Tabela diagnóstico render vs UE 5.6

| Área UE 5.6 | Realidade Aethel (código) | Moat / caminho | ID |
|-------------|---------------------------|----------------|-----|
| Lumen GI | AO×albedo + emissive | SSGI tiered + honesty held | `IMPROVE-ENG-008` |
| Nanite | CPU cull + ID colors | GPU compute + real LOD | `IMPROVE-ENG-009`, `DEBT-NANITE-001` |
| PBR materials | Dead BRDF functions | Wire lighting loop | `IMPROVE-ENG-007` |
| Material editor | Magenta compile | Rust AST graph | `IMPROVE-AI-014` |
| Virtual Shadow Maps | Preset only | CSM + shadow sampler in PBR | `IMPROVE-ENG-008` |
| TAA/TSR | Preset `taa` unused | Velocity + TAA pass | `IMPROVE-ENG-010` |
| SSR/DOF | Empty setup methods | Real passes in composer | `IMPROVE-ENG-010` |
| Virtual textures | Page table partial | GPU BC7 decode | `IMPROVE-ENG-011` |
| Niagara GPU | CPU arrays | WebGPU/WGPU compute | `IMPROVE-VFX-005` |
| AAA render hook | `aaaRendererRef=null` | Instantiate or hide toggles | `DEBT-RENDER-003` |
| AI tweaks render | — | JSON preset patches only | `IMPROVE-AI-013` |
| Path trace cinema | BVH sync main thread | Worker + ReSTIR held | `DEBT-PERF-002`, `IMPROVE-ENG-008` |

**Ordem sugerida pós-dívida:** `DEBT-RENDER-003` → `IMPROVE-ENG-007` → `IMPROVE-ENG-008` → `IMPROVE-ENG-010` → `IMPROVE-ENG-009` (Nanite marketing off until real) → `IMPROVE-VFX-005` → `IMPROVE-AI-013/014`.

---

### §2.67 Batch 9 — Simulation, animation & netcode audit (`analysis_results.md`)

**User intent (2026-06-17):** Expandir crítica cirúrgica para subsistemas de simulação 3D, motion matching, netcode e atmosfera — arquivo canônico [`analysis_results.md`](./analysis_results.md).

**Decisões estruturais (recomendadas — todas SIM):**

| Pergunta user | Resposta | ID |
|---------------|----------|-----|
| Foliage: erase pontual + GPU LOD culling? | Sim — `clear()` destrói mundo inteiro por tipo hoje | `DEBT-FOLIAGE-001` → `IMPROVE-ENG-012` |
| Clouds: God Rays + depth blend + sem DOM/frame? | Sim — pipeline incompleto | `DEBT-CLOUD-001` → `IMPROVE-ENG-013` |
| Motion: Float32Array SOA + O(1) frame + IK? | Sim — heap GC + `poses.find` hoje | `DEBT-MOTION-001` → `IMPROVE-ENG-014` |
| Netcode: banir JSON no hot path? | Sim — stutter por GC | `DEBT-NET-001` → `IMPROVE-ENG-015` |

**Já em `DEBT-*` (Batch 6 — reconfirmados Batch 9):** `DEBT-PERF-003/004`, `DEBT-TERRAIN-001`, `DEBT-ASSET-001`, `DEBT-AUDIO-001`, `DEBT-YJS-001`, `DEBT-SAVE-001`, `DEBT-PLUGIN-001`, `DEBT-NIAGARA-002`, `DEBT-DESK-*`.

**Novos `DEBT-*` (Batch 9):** `DEBT-FOLIAGE-001`, `DEBT-CLOUD-001`, `DEBT-MOTION-001`, `DEBT-NET-001`, `DEBT-ADMIN-001`. **`DEBT-AUDIT-001` resolved.**

---

### §2.68 Batch 9 — Foliage system (`foliage-system.ts`, `FoliagePainterPanels.runtime.tsx`)

#### CONFIRMED — apagador destrutivo

```252:259:meu-repo/cloud-web-app/web/lib/foliage-system.ts
  removeCluster(clusterId: string): void {
    ...
      instancedMesh.clear(); // Simplified - in production would track individual instances
```

Um cluster apagado → **todas** as instâncias daquele `typeId` somem.

#### CONFIRMED — culling placebo

- `update()` ~293: `cluster.visible = distance < cullDistance`
- Grep: `.visible` **só escrito**, nunca lido — `InstancedMesh` count/matrices inalterados

#### CONFIRMED — painter sem instancing (`DEBT-PERF-003`)

`FoliagePainterPanels.runtime.tsx` ~206–254: `typeInstances.map` → `<mesh>` individual com `ConeGeometry`/`CylinderGeometry` **novas** por instância.

#### Especificação (`IMPROVE-ENG-012` + `IMPROVE-STUDIO-011`)

| Camada | Fix |
|--------|-----|
| Data | `instanceId` estável por planta; sparse delete marca slot `alive=0` |
| Erase | Recompactar `instanceMatrix` attribute — nunca `clear()` global |
| Cull | CPU: rebuild visible index list; GPU: compute pass ou shader discard |
| Painter UI | Um `InstancedMesh` por `typeId`; brush paint = `setMatrixAt` |

---

### §2.69 Batch 9 — Volumetric clouds (`volumetric-clouds.ts`)

| Afirmação | Status | Linha/evidência |
|-----------|--------|-----------------|
| Sem depth blending | **CONFIRMED** | Material `depthWrite: false` ~102; `render()` ~364 desenha quad sem sample depth |
| God Rays desconectados | **CONFIRMED** | `this.godRays = new GodRaysPass()` ~344; `render()` ~360–365 não chama `godRays.render` |
| DOM query per frame | **CONFIRMED** | `document.querySelector('canvas')` ~116 em `update()` |
| Blue noise null | **CONFIRMED** | uniform ~65 `blueNoise: { value: null }` |

**Pipeline alvo (`IMPROVE-ENG-013`):**

1. Passar `depthTexture` da cena para shader clouds (depth-aware raymarch composite)
2. Chamar `GodRaysPass.render(renderer, ...)` após clouds quando `godRaysEnabled`
3. Carregar textura blue-noise 64×64 (ou 128×128) estática
4. `resolution` uniform atualizado no resize handler — **não** no tick

---

### §2.70 Batch 9 — Motion matching (`motion-matching-system.ts`)

#### CONFIRMED — heap / GC

`addAnimation` ~337–349: cada frame → `boneTransforms: new Map(...)` com `.clone()` de cada `Vector3`/`Quaternion`.

#### CONFIRMED — O(N) playback lookup

```531:533:meu-repo/cloud-web-app/web/lib/motion-matching-system.ts
    const pose = this.database.poses.find(
      p => p.animationId === this.currentPose!.animationId && p.frameIndex === frameIndex
    );
```

#### NUANCE — search path

- `buildSearchTree()` + `MotionKDTree.findNearest` ~355, ~436 — **existe** para pose **matching**, não para playback index
- User claim "busca linear O(N)" — **CONFIRMED** no path `getCurrentBoneTransforms`; **PARTIAL** no search path (kd-tree quando `shouldSearch`)

#### CONFIRMED — foot lock sem IK

`FootLockingIK` ~191: `blendedPosition = lockPosition.lerp(position, t)` — sem two-bone IK coxa/joelho.

#### Especificação (`IMPROVE-ENG-014`)

```
[Animation import]
      │
      ▼
[SOA buffers] positions[float*boneCount*frameCount], rotations[quat...]
      │
      ├─► Playback: framePtr = animBase + frameIndex * boneStride  (O(1))
      └─► Search: MotionKDTree on feature vectors (keep)
      │
      ▼
[Foot lock] Two-bone IK per leg before root motion apply
```

---

### §2.71 Batch 9 — Multiplayer netcode (`networking-netcode.ts`, `networking-serializer.ts`)

#### CONFIRMED — JSON clone rollback

```205:205:meu-repo/cloud-web-app/web/lib/networking-netcode.ts
      stateCopy.set(id, JSON.parse(JSON.stringify(state)));
```

#### CONFIRMED — falsa serialização binária

`networking-serializer.ts`: `JSON.stringify` em `customData`, `keys`, `actions`, `payload` + `TextEncoder`.

#### CONFIRMED — rollback find linear

`stateHistory.find(s => s.frame === toFrame)` ~225.

#### Especificação (`IMPROVE-ENG-015`)

| Campo | Layout alvo |
|-------|-------------|
| Player state | Fixed struct: vec3 pos, quat rot, uint16 flags — `DataView` only |
| Input | Bitfield keys — 8–16 bytes max |
| Rollback | Ring buffer `states[frame % N]` — O(1) get/set |
| Clone | `structuredClone` mínimo ou manual copy into pooled objects — **never** JSON |

**Tier 1 debt** — multiplayer claims blocked until `DEBT-NET-001` closed.

---

### §2.72 Batch 9 — UX/UI pages + hitlist (sections 4–5 user paste)

**Reconfirmados (já em registry):**

| Item | ID |
|------|-----|
| Film SoundCue no inspector ~260px | `IMPROVE-FILM-001` §2.23 |
| Studio hub texto + route reload WebGL | `IMPROVE-STUDIO-006`, `IMPROVE-STUDIO-002` |
| VS inline styles + sem palette teclado | `IMPROVE-VS-006`, `IMPROVE-VS-011` |
| Loading strings ad-hoc | `IMPROVE-UX-004` + `DEBT-UX-HITLIST-001` |
| Yjs server state loss | `DEBT-YJS-001` → `IMPROVE-COLLAB-003` |

**Water CPU (tabela user):** `PlaneGeometry(100,100,128,128)` = 129² = **16,641** vértices; loop ~130–159 + `clone()` ~128 — `DEBT-PERF-004` → `IMPROVE-ENG-016`.

---

### §2.73 Batch 9 — Tabela diagnóstico simulation spine

| Área | Realidade | Caminho | ID |
|------|-----------|---------|-----|
| Foliage erase | `clear()` wipe all | Sparse instance buffer | `DEBT-FOLIAGE-001`, `IMPROVE-ENG-012` |
| Foliage cull | Boolean noop | Matrix rebuild / compute | `IMPROVE-ENG-012` |
| Foliage painter | N meshes | InstancedMesh | `DEBT-PERF-003`, `IMPROVE-STUDIO-011` |
| Clouds | Overlay sem depth | Depth composite + god rays | `DEBT-CLOUD-001`, `IMPROVE-ENG-013` |
| Motion poses | Heap Maps | SOA Float32Array | `DEBT-MOTION-001`, `IMPROVE-ENG-014` |
| Motion playback | `poses.find` | O(1) index | `IMPROVE-ENG-014` |
| Foot IK | Lerp | Two-bone | `IMPROVE-ENG-014` |
| Netcode | JSON 60Hz | Binary ring buffer | `DEBT-NET-001`, `IMPROVE-ENG-015` |
| Water waves | CPU 16k verts | GPU shader | `DEBT-PERF-004`, `IMPROVE-ENG-016` |
| Collab | Broadcast-only fallback | `Y.applyUpdate` | `DEBT-YJS-001`, `IMPROVE-COLLAB-003` |
| Admin stubs | Script inflates pages | Real panels or remove script | `DEBT-ADMIN-001` |

---

### §2.74 Batch 10 — Advanced engine systems (RT, Nanite, VT, destruction, cloth, AI voice, VR)

**User intent (2026-06-17):** Auditoria aprofundada `web/lib` — placebos geométricos, GPU stalls, stubs de áudio/VR.

**Reconfirmados (já em debt):** `DEBT-PERF-002` (BVH sync), `DEBT-NANITE-001` (`simplifyMeshlets` subsample).

**Novos `DEBT-*`:** `DEBT-RT-001`, `DEBT-VT-001`, `DEBT-DEST-001`, `DEBT-CLOTH-001`, `DEBT-AUDIO-002`, `DEBT-VR-001`.

**Novos `IMPROVE-*`:** `IMPROVE-ENG-017`–`022`, `IMPROVE-AI-015`.

---

### §2.75 Batch 10 — Ray tracing & BVH (`ray-tracing.ts`, `ray-tracing-bvh.ts`)

| Afirmação | Status | Evidência |
|-----------|--------|-----------|
| `rebuildBVH()` sync main thread | **CONFIRMED** | `ray-tracing.ts` ~118–127; `BVHBuilder.build` + `buildNode` recursive `indices.sort` ~150 |
| Apenas `tri.n0` na textura GPU | **CONFIRMED** | `createDataTextures` ~236–238; triângulos **extraem** n0/n1/n2 ~86–100 mas upload descarta n1/n2 |
| Flat shading em superfícies curvas | **INFERIDO válido** | Sem n1/n2 no shader path → sem interpolação Phong |

**Pesquisa / alvo (`IMPROVE-ENG-017`):**

- BVH rebuild em **Web Worker** ou WebGPU compute (debounce scene changes)
- Pack 3 vértices + 3 normais por triângulo na `triangleTexture`
- Path tracer fragment: barycentric normal interp

**Cross:** `DEBT-PERF-002`, `IMPROVE-ENG-008` (offline RTGI tier 4).

---

### §2.76 Batch 10 — Nanite meshlets (`nanite-meshlet-builder.ts`)

| Afirmação | Status | Evidência |
|-----------|--------|-----------|
| `simplifyMeshlets` sem QEM/decimação | **CONFIRMED** | ~350–368: `targetCount = floor(len*ratio)`; `step` subsample; meshlets copiados intactos |
| Buracos/cracks em LOD distante | **PLAUSÍVEL** | Subsample espacial sem fusão de borda |

**Alvo (`IMPROVE-ENG-018`):** WASM meshoptimizer/libspidr; error metrics por cluster; crack-free transition meshes.

**Honesty:** renomear "Nanite" até `DEBT-NANITE-001` fechado — `IMPROVE-QUALITY-002`.

---

### §2.77 Batch 10 — Virtual texturing (`virtual-texture-system.ts`, `virtual-texture-cache.ts`)

| Afirmação user | Status | Evidência |
|----------------|--------|-----------|
| Feedback buffer pipeline existe | **PARTIAL** | `FeedbackBuffer`, `feedbackFragmentShader`, `VirtualTextureSystem.update()` ~242–246 |
| CPU só adivinha tiles (frustum) | **NOT PRIMARY** | Design é feedback-driven — mas… |
| `readRenderTargetPixels` sync stall | **CONFIRMED** | `virtual-texture-cache.ts` ~304–311 |
| Loop CPU 256×256 scan | **CONFIRMED** | ~316–341 for-loop per pixel |
| Feedback pass render antes do read | **NOT WIRED** | Grep: **zero** viewport/renderer calls `getFeedbackMaterial()` + render to RT |

**Correção crítica:** o gargalo não é só stall — **analyze() lê buffer que nunca foi populado pelo feedback pass** fora do módulo isolado.

**Alvo (`IMPROVE-ENG-019` + `IMPROVE-ENG-011`):**

1. Main pipeline: render scene with `feedbackMaterial` → `feedbackRT`
2. Async PBO readback (n+1 frame latency)
3. Tile loader budget per frame (`maxLoadsPerFrame` já existe ~262)

---

### §2.78 Batch 10 — Destruction & fracture (`destruction-fracture-generator.ts`, `destruction-system.ts`)

| Afirmação | Status | Evidência |
|-----------|--------|-----------|
| Voronoi grade 10³ estática | **CONFIRMED** | `generateCells` ~43–77 |
| Triangulação XZ-only | **CONFIRMED** | `cellToGeometry` ~116–119 `Math.atan2(a.z, a.x)` |
| Runtime vs pre-fractured | **RUNTIME** simplificado | Gera na hora mas geometria fraca |
| Rapier rigid bodies | **ABSENT** | `applyFragmentPhysics` ~71–86: gravity + euler rotation JS |

**Alvo (`IMPROVE-ENG-020`):** convex hull 3D / proper Voronoi; Rapier dynamic colliders per fragment; dust stays particles.

---

### §2.79 Batch 10 — Cloth (`cloth-simulation.ts`, `cloth-simulation-gpu.ts`, `cloth-simulation-collisions.ts`)

| Afirmação | Status | Evidência |
|-----------|--------|-----------|
| Simulação CPU main thread | **CONFIRMED** | `ClothSimulation` uses `ClothCollisionHandler` ~302 |
| String Map hash keys GC | **CONFIRMED** | `getHashKey` ~156–160 `` `${x},${y},${z}` `` per particle/frame |
| Capsule collider type exists | **CONFIRMED** | ~35–36, `handleCapsuleCollision` ~70+ |
| Skinned mesh auto capsule rig | **ABSENT** | Colliders manual `addCollider` — no bone hierarchy extract |
| `GPUClothSimulation` skeleton collision | **ABSENT** | Shader ~74–80: gravity/wind/damping only |

**Alvo (`IMPROVE-ENG-021`):** Extract bone capsules from skinned mesh each frame; GPU collision pass; `Int32Array` spatial hash.

---

### §2.80 Batch 10 — AI audio & WebXR

#### AI audio (`ai-audio-engine.ts`, `ai-audio-engine-sfx.ts`)

| Afirmação | Status | Evidência |
|-----------|--------|-----------|
| `generateVoice()` = silêncio | **CONFIRMED** | ~316–317 `createBuffer` sem fill — zeros default |
| Lipsync quebrado → `sil` | **CONFIRMED** | `energyToViseme` ~349 `energy < 0.01` → `'sil'` |
| SFX só MP3 pré-carregado | **REFUTED** | `ai-audio-engine-sfx.ts` gera footstep/impact/explosion proceduralmente |

**Alvo (`IMPROVE-AI-015`):** TTS provider + buffer fill; manter SFX procedural como moat.

#### WebXR (`webxr-vr-system-core.ts`, `webxr-vr-foveated-rendering.ts`)

| Afirmação | Status | Evidência |
|-----------|--------|-----------|
| Foveation = escurecer periferia | **CONFIRMED** | `getFoveationFactor` ~48–58 retorna attenuation scalar |
| `applyToLayer()` inativo | **CONFIRMED** | `onXRFrame` ~168–203 — sem `foveatedRendering.applyToLayer` |
| Haptics mapeados | **PARTIAL OK** | ~179–181 `hapticActuators` wired |
| ECS integration | **NOT FOUND** | Three.js object updates — não ECS spine |

**Alvo (`IMPROVE-ENG-022`):** `layer.fixedFoveation` via `applyToLayer` each frame; gaze-tracked VRS quando disponível.

---

### §2.81 Batch 10 — Tabela diagnóstico advanced engine

| Área | Realidade | Caminho | ID |
|------|-----------|---------|-----|
| BVH rebuild | Sync JS sort | Worker/WebGPU | `DEBT-PERF-002`, `IMPROVE-ENG-017` |
| RT normals | n0 only upload | Pack n1/n2 + interp | `DEBT-RT-001` |
| Nanite LOD | Subsample meshlets | QEM WASM | `DEBT-NANITE-001`, `IMPROVE-ENG-018` |
| VT feedback | RT never rendered + sync read | Wire pass + async PBO | `DEBT-VT-001`, `IMPROVE-ENG-019` |
| Fracture | Grid Voronoi + XZ fan | 3D hull + Rapier | `DEBT-DEST-001`, `IMPROVE-ENG-020` |
| Cloth | CPU + string hash | GPU + bone capsules | `DEBT-CLOTH-001`, `IMPROVE-ENG-021` |
| AI voice | Silent buffer | TTS wire | `DEBT-AUDIO-002`, `IMPROVE-AI-015` |
| AI SFX | Procedural OK | Keep + cloud presets | `ai-audio-engine-sfx.ts` |
| VR foveation | Darken shader | Hardware foveation | `DEBT-VR-001`, `IMPROVE-ENG-022` |

**Ordem sugerida:** `DEBT-PERF-002`/`DEBT-RT-001` → `DEBT-NANITE-001` → `DEBT-VT-001` → `DEBT-DEST-001` → `DEBT-CLOTH-001` → `DEBT-AUDIO-002` → `DEBT-VR-001`.

---

### §2.82 Batch 11 — Terminal wiring, dashboard density, route maturity (components + scripts)

**Fonte:** user paste 2026-06-17 — `web/components`, `web/scripts`.

**Novos `DEBT-*`:** `DEBT-TERM-001`, `DEBT-UX-DASH-001`, `DEBT-ROUTE-001`.

#### A. Terminal PTY fracture (`BaseXTerminal.tsx`, `useTerminalRuntime.ts`, `terminal-pty-runtime.ts`)

| Claim | Verdict | Evidence |
|-------|---------|----------|
| xterm conecta WS `localhost:3001` / `AETHEL_WS_URL` | **CONFIRMED** | `terminalWebSocket.ts` ~28–33 |
| Backend `node-pty` no processo Node | **CONFIRMED** | `terminal-pty-runtime.ts` ~185 `spawn(shell,...)` |
| Cloud deploy = shell no container, não na máquina do user | **CONFIRMED** | `cwd` = `os.homedir()` do servidor; `/api/terminal/create` |
| Tauri terminal = stub held | **CONFIRMED** | `desktop_commands.rs` `create_held` ~328 |
| xterm **não** usa `createDesktopAdapter` | **CONFIRMED** | zero imports em `components/terminal/*` |

**Cruzamento:** `DEBT-DESK-002` (desktop held) + **`DEBT-TERM-001`** (arquitetura web/cloud).  
**Alvo:** `IMPROVE-TERM-001` + `IMPROVE-DESK-002` + `IMPROVE-BRIDGE-001` — Wave 7 (IDE) + Wave 9 (native).

#### B. Dashboard banner pollution (`DashboardEntryIntentBanner`, `DashboardAlertBanners`)

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Banners poluem primeira dobra | **PARTIAL** | `DashboardShell.tsx` empilha até 4 superfícies: `TrialBanner`, `DashboardRoutingNotice`, `DashboardAlertBanners`, `DashboardEntryIntentBanner` |
| Alertas licença/readiness sempre visíveis | **REFUTED** | `DashboardAlertBanners` só renderiza com `authErrorText`/`billingErrorText`; `EntryIntent` só com `entryMission`/`entrySource` |
| Padrão Linear violado | **CONFIRMED** | Cards grandes `rounded-[24px]` acima do grid de projetos |

**Alvo:** `IMPROVE-DASH-002` (densidade) — distinto de `IMPROVE-UX-002` (propagar AlertBanner a outras superfícies).

#### C. Route maturity gate (`check-hidden-route-leak.mjs`)

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Gate impede leak PROTOTYPE/ASPIRATIONAL no middleware | **CONFIRMED** | script static PASS |
| 40%+ rotas são stubs | **PARTIAL** | 13/62 = **21%** hidden; 33/62 = **53%** se ALPHA contado como parcial |
| Inflação estrutural sem utilidade | **CONFIRMED** | 9 ASPIRATIONAL legacy shells + `DEBT-ADMIN-001` stub generator |

**Alvo:** `IMPROVE-ROUTE-001` + `IMPROVE-STUDIO-007` (hub gating).

#### D. Tabela Batch 11

| Área | Realidade | Caminho | ID |
|------|-----------|---------|-----|
| Terminal web | Server PTY ≠ user machine | Transport router + Bridge | `DEBT-TERM-001`, `IMPROVE-TERM-001` |
| Terminal desktop | `create_held` | portable-pty | `DEBT-DESK-002`, `IMPROVE-DESK-002` |
| Dashboard fold | Banner stack | Linear rail + toasts | `DEBT-UX-DASH-001`, `IMPROVE-DASH-002` |
| Routes | 13 hidden + 20 ALPHA | Prune + hub gating | `DEBT-ROUTE-001`, `IMPROVE-ROUTE-001` |

**Wave mapping:** Terminal → **Wave 7** (IDE dock + xterm) + **Wave 9** (native PTY); Dashboard + routes → **Wave 7**.

---

## 3. Quality bar & alignment (canonical)

*User-defined standards to meet post-debt — e.g. Cursor 3.x IDE fluidity, EN canonical UI, evidence receipts, 60fps viewport budgets. Cursor fills from pastes.*

| Dimension | Target (post-debt) | Source / acceptance |
|-----------|-------------------|---------------------|
| Language | EN canonical in product UI | user rule; gate `qa:i18n-hardcoded-spine` |
| Tokens | `var(--aethel-*)` / `color-mix`; **zero** new inline `style={{}}` on studio surfaces | audit A4; grep ratchet |
| Information density | Operator-first: badges not paragraphs; tables compact; 28px hero radii only on marketing, not work panels | user Batch 1 |
| Navigation | Tool switch **without** WebGL context loss; <100ms perceived; no 1–2s flicker | `IMPROVE-STUDIO-002` |
| Viewport tools | Radial/context menus; keyboard-first (B brush, Ctrl+K composer) | terrain, Monaco |
| Timelines | Canvas 2D/WebGL for dope sheet; 12+ tracks pan/zoom 60fps | A10 |
| Loading | Single `PremiumLoadingState` shimmer; no raw “Carregando…” | A3; ~1300 strings purge |
| VFX honesty | No cosmetic graph without compile path or explicit held gate | DEBT-NIAGARA-002 |
| IDE parity | Cursor 3.x: ghost text, inline composer **on cursor line** (not fullscreen modal), resizable dock, virtualized trees, LCS diff | A21, A40, Frente 1; `IMPROVE-IDE-013/014` |
| Workbench zones | `08_WORKBENCH`: AI Console Right Rail; Bottom Dock exclusive full-width tab | `IMPROVE-IDE-007/008/009` |
| Dashboard perf | Streaming chat updates **only** chat subtree; shell/billing/wallet isolated | `IMPROVE-DASH-001` |
| Alerts | `AlertBanner` + dismiss on all auth/billing/network surfaces | A6; `IMPROVE-UX-002` |
| Gates | `qa:enterprise-gate` green before each phase | debt registry |
| Honesty | No market claim without gate or held manifest | marketing-claims |
| Studio shell | Editors feed `CreativeWorkbenchShell` slots only — **no** embedded 250/320px sidebars inside viewport children | `IMPROVE-STUDIO-005` |
| Creative editors | Graph/timeline editors headless; **one** inspector column; no 240+260+280px inside narrow slots | `IMPROVE-STUDIO-008`, `IMPROVE-FILM-001/004`, `IMPROVE-QUEST-001` |
| Film tool matrix | Inspector switches by `activeTool.id` (audio/cinematic/director) — no irrelevant AudioMix on cloud review | `IMPROVE-FILM-005` |
| Desktop native | Sidecars (wgpu, ffmpeg, rapier, onnx) only after manifest + lifecycle gates green | `IMPROVE-DESK-001`, `DEBT-SIDECAR-001` |
| Studio hub | Control room, not workbench chrome — no outliner/inspector until editor opens | `IMPROVE-STUDIO-006`, Rule 1 |
| Route honesty | ALPHA/placebo surfaces gated in hub when flag off; `isRouteVisible` wired | `IMPROVE-STUDIO-007` |
| Export UX | No infinite loader on receipt stubs; honest held/501 until `DEBT-RENDER-001` closed | `IMPROVE-UX-003` |
| File tree | Virtualized flat list for 10k+ nodes; 60fps scroll in IDE | `IMPROVE-IDE-016`, A8 |
| Command palette | Sub-100ms fuzzy via Wasm worker | `IMPROVE-IDE-017` |
| Competitive bar | “Não passar batido” — UE5/Blender/Cursor/Zed/Figma as **UX bar**, not render fidelity | user Batch 1 |
| Vision 2030 | Market **leader** bar: ACP, WGPU parity, splat pipeline, cross-device workspace — honest held until evidence | `aethel_vision_2030`, Batch 5 |
| Honesty-first vs UE | No Nanite/Lumen parity claims; moat = iteration speed, 3DGS, USD orchestration, agent IDE | `IMPROVE-QUALITY-002`, Batch 6 |
| AI 3D generation | No "world in seconds" marketing; integrator/morph, not amorphous mesh gen | `IMPROVE-AI-004/006` |
| Visual script | JIT WASM + syscalls — not JS interpreter in play mode | `IMPROVE-VS-010` |
| Plugins | WASI wasmtime only — no `vm`/native DLL in process | `IMPROVE-PLATFORM-005`, `DEBT-EXT-001` |
| Viewport | No "deprecated" text in production canvas center | `IMPROVE-VIEW-001` |
| Native desktop | PTY real, fs events to UI, ONNX ghost <20ms — no `create_held` theater | `IMPROVE-DESK-002`–`004` |
| Data spine | `McpServer` + `RenderJob` in Prisma; BullMQ workers — no 202 receipt theater | `IMPROVE-PLATFORM-003/004` |
| Three surfaces | Local + Web + Mobile = one `AethelWorkspaceState`; mobile approves, does not replace IDE | `15_MOBILE_COMPANION`, `IMPROVE-PLATFORM-001/002` |
| Agentic research | No `PRESET_SOURCES` theater; browser operator must be headless or explicit held | `IMPROVE-AI-009/010` |
| Live voice | Full-duplex WebRTC/WebSocket with barge-in — not walkie-talkie WebM upload only | `IMPROVE-AI-011` |
| Parallel agents | Squad dispatch via tool bus; Activity Deck shows all lanes — not single RunCard | `IMPROVE-AI-012` |
| Job lifecycle | Active renders/export jobs cancellable (SIGINT/pub/sub) — no `JOB_ACTIVE_CANNOT_CANCEL` trap | `IMPROVE-PLATFORM-006` |
| GLB export | Real local/cloud conversion — no 202 receipt without worker | `IMPROVE-PLATFORM-007`, `DEBT-RENDER-001` |
| PBR honesty | Cook-Torrance functions must run in `main()` or remove dead code — no albedo×AO theater | `IMPROVE-ENG-007`, `DEBT-RENDER-003` |
| GI/shadows | No CSM/TAA preset without active renderer — hide or wire `aaaRendererRef` | `IMPROVE-ENG-008`, `IMPROVE-ENG-010` |
| Nanite naming | No "Nanite" label while visibility resolve shows ID colors | `IMPROVE-ENG-009`, `DEBT-NANITE-001` |
| Particles | No "GPU particle" header on CPU simulation loops | `IMPROVE-VFX-005` |
| AI render control | JSON preset patches only — never raw shader source from LLM | `IMPROVE-AI-013` |
| Foliage erase | Sparse per-instance delete — never `instancedMesh.clear()` for one brush stroke | `DEBT-FOLIAGE-001`, `IMPROVE-ENG-012` |
| Netcode hot path | No `JSON.parse/stringify` or `TextEncoder` in 60Hz rollback/serialize | `DEBT-NET-001`, `IMPROVE-ENG-015` |
| Motion poses | SOA buffers + O(1) frame index — not `poses.find` per tick | `DEBT-MOTION-001`, `IMPROVE-ENG-014` |
| Volumetric clouds | Depth-aware composite + god rays wired — not fullscreen overlay | `DEBT-CLOUD-001`, `IMPROVE-ENG-013` |
| Path tracing | BVH off main thread; smooth normals in RT pass — not flat n0-only | `DEBT-PERF-002`, `DEBT-RT-001`, `IMPROVE-ENG-017` |
| Virtual texturing | Feedback pass rendered before read; async PBO — no sync stall | `DEBT-VT-001`, `IMPROVE-ENG-019` |
| Destruction | Real 3D fracture + physics engine — not JS translate fragments | `DEBT-DEST-001`, `IMPROVE-ENG-020` |
| AI voice | Audible TTS with working lipsync — not zero-filled buffers | `DEBT-AUDIO-002`, `IMPROVE-AI-015` |
| WebXR foveation | Hardware `fixedFoveation` / VRS — not peripheral darken shader | `DEBT-VR-001`, `IMPROVE-ENG-022` |

### Anti-patterns (explicitly rejected post-debt)

- Parágrafos explicando o que o usuário “pode ou não fazer” em painéis de trabalho  
- `<details>` nativo para navegação principal mobile  
- Sliders/controles que movem UI mas não estado (`onChange={() => {}}`)  
- Grafos visuais desconectados do runtime (Niagara, visual script sem compile)  
- Editores densos (ReactFlow audio) em coluna ~260px  
- Dynamic imports de editores que nunca montam na árvore React  
- Bottom dock tabs que alteram estado mas não alteram render (`activeBottomPanel` ignored)  
- Fullscreen modal para Cmd+K quando `ContentWidget` já existe  
- Line-zip diff que marca offset inteiro como changed  
- Dashboard monolithic prop bags que cascade re-render on every chat token  
- CreativeWorkbenchShell on Studio Home hub (navigation disguised as scene outliner)  
- LevelEditor embedded sidebars duplicating shell outliner/inspector (four gutters)  
- Export buttons that show success spinners on 202 receipt stubs (`DEBT-RENDER-001`)  
- `isRouteVisible` defined but never wired to hub navigation  
- Local ContextMenu reinventions when `components/ui/context-menu.tsx` exists  
- ReactFlow graph editors (audio/quest) squeezed into inspector slot ≤400px with internal 240+260px chrome  
- Video timeline with embedded 280px inspector inside 100–300px horizontal dock  
- Cloud stream viewport + irrelevant AudioMixInspector on shell right column  
- Marketing claims of UE-parity polygon rendering or instant AAA world generation from diffusion  
- Interpreting visual script graphs in JS during play mode  
- Plugin extensions via Node `vm` or unconstrained native DLLs  
- Research workspace returning static `PRESET_SOURCES` regardless of query  
- Take over / Stop buttons that only set handoff toast without live browser session  
- Voice capture that requires stop-then-upload before the agent can hear the user  
- `LiveConversationPanel` with hardcoded `isLiveSpeaking` and no audio stream  
- Export/cancel APIs that block active jobs with 409 while billing CPU/GPU until completion  
- GLB export buttons enqueue 202 receipts with `_pending` and no converter worker  
- PBR shader declaring GGX/Smith/Fresnel but outputting only `albedo * ao + emissive`  
- Quality presets advertising TAA/cascaded shadows while `aaaRendererRef` stays `null`  
- Shader graph compiler returning hardcoded magenta `vec4(1,0,1,1)`  
- Nanite visibility resolve shading meshlet/triangle IDs instead of materials  
- `particle-system-real.ts` "GPU" comment with CPU `for` loop simulation on main thread  
- LLM editing WGSL/GLSL source for bloom/GI tweaks instead of config schema patches  
- Foliage `removeCluster` calling `instancedMesh.clear()` for a single erase stroke  
- `cluster.visible` flags with no instance buffer rebuild (culling theater)  
- One `<mesh>` per foliage instance in painter preview  
- Volumetric clouds rendering without scene depth compositing  
- `GodRaysPass` constructed but never invoked in render loop  
- `document.querySelector('canvas')` inside per-frame cloud `update()`  
- Motion pose database as millions of heap-allocated `Vector3`/`Quaternion` objects  
- `database.poses.find(...)` on every animation playback frame  
- Rollback netcode cloning state via `JSON.parse(JSON.stringify(...))` each tick  
- `NetworkSerializer` wrapping JSON strings as "binary" packets  

---

## 4. Cross-reference index

| Document | Role |
|----------|------|
| [`analysis_results.md`](./analysis_results.md) | Simulation/netcode/cloud audit — Batch 9 validated map |
| [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) | **Must complete first** — `DEBT-*` |
| [`audit_frontend_ui_ux.md`](./audit_frontend_ui_ux.md) | Tactical UX fronts — may promote to `IMPROVE-*` when debt cleared |
| [`aethel_architecture_philosophy.md`](./aethel_architecture_philosophy.md) | DoD / held states — improvements must not violate |
| [`audit_backend_spine.md`](./audit_backend_spine.md) | Frentes B51, F6, M69, U57, I70, F41, F44, R64 — Batch 6 spine map |
| [`AETHEL_INTERFACE_BLUEPRINTS/08_WORKBENCH.md`](../../AETHEL_INTERFACE_BLUEPRINTS/08_WORKBENCH.md) | Zoneamento Right Rail / Bottom Dock — `IMPROVE-IDE-007` |
| [`AETHEL_INTERFACE_BLUEPRINTS/19_BEST_IN_MARKET_CLEAN_UX_GUARDRAILS.md`](../../AETHEL_INTERFACE_BLUEPRINTS/19_BEST_IN_MARKET_CLEAN_UX_GUARDRAILS.md) | Rule 1, Rule 4 — `IMPROVE-BLUEPRINT-001` |
| `cloud-web-app/web/components/COMPONENT_CONSOLIDATION_MAP.md` | Admin unification — `IMPROVE-ADMIN-001` |
| [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) §10.3 | Export receipt stubs — `DEBT-RENDER-001`, `IMPROVE-UX-003` |
| [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) §13.6 | MCP `McpServer` — `DEBT-DB-001`, `DEBT-DB-003` |
| [`aethel_vision_2030.md`](./aethel_vision_2030.md) | Neural geometry, DirectStorage, P2P — `IMPROVE-ENG-*`, `IMPROVE-COLLAB-001` |
| [`AETHEL_INTERFACE_BLUEPRINTS/15_MOBILE_COMPANION.md`](../../AETHEL_INTERFACE_BLUEPRINTS/15_MOBILE_COMPANION.md) | Mobile continuity — `IMPROVE-MOBILE-*`, `IMPROVE-PLATFORM-002` |
| `apps/studio-local/src-tauri/src/desktop_commands.rs` | Native spine placebos — `IMPROVE-DESK-002/003`, `DEBT-DESK-002/003` |
| `apps/studio-local/src-tauri/src/native_kernel.rs` | Capability manifest — `IMPROVE-DESK-001`, `DEBT-DESK-006` |
| `components/nexus/AethelResearch.tsx` | Research mock — `IMPROVE-AI-009/010` |
| `components/agents/BrowserOperatorReplay.tsx` | Replay UI — wire to headless operator `IMPROVE-AI-009` |
| `lib/server/browser-operator-recorder.ts` | In-memory replay — extend to live browser lane |
| `lib/ai-web-tools.ts` | Tavily search — wire to research panel `IMPROVE-AI-010` |
| `components/agents/chat/voice/useVoiceRecording.ts` | Walkie-talkie voice — replace `IMPROVE-AI-011` |
| `components/agents/chat/activity/LiveConversationPanel.tsx` | Live UI shell — duplex audio `IMPROVE-AI-011` |
| `lib/production/agent-tool-bus.ts` | Squad orchestration — `IMPROVE-AI-012` |
| `app/api/render/jobs/[jobId]/cancel/route.ts` | Active cancel blocked — `IMPROVE-PLATFORM-006` |
| `app/api/exports/glb/route.ts` | GLB receipt stub — `IMPROVE-PLATFORM-007` |
| `lib/aaa-material-system.shaders.ts` | Dead PBR BRDF — `IMPROVE-ENG-007` |
| `lib/aaa-material-system.ts` | Magenta shader graph — `IMPROVE-AI-014` |
| `lib/nanite-virtualized-geometry-renderers.ts` | CPU Nanite — `IMPROVE-ENG-009`, `DEBT-NANITE-001` |
| `lib/aaa-render-system.ts` | Empty SSAO/SSR/DOF/GI stubs — `IMPROVE-ENG-008/010`, `DEBT-RENDER-003` |
| `lib/hooks/useRenderPipeline.ts` | `aaaRendererRef=null` — `DEBT-RENDER-003` |
| `lib/postprocessing/system/` | Bloom/tonemap ok; no TAA/SSR/DOF — `IMPROVE-ENG-010` |
| `lib/virtual-texture-cache.ts` | Partial VT — `IMPROVE-ENG-011` |
| `lib/foliage-system.ts` | Erase + cull — `DEBT-FOLIAGE-001`, `IMPROVE-ENG-012` |
| `lib/volumetric-clouds.ts` | Atmosphere pipeline — `DEBT-CLOUD-001`, `IMPROVE-ENG-013` |
| `lib/motion-matching-system.ts` | SOA poses + IK — `DEBT-MOTION-001`, `IMPROVE-ENG-014` |
| `lib/networking-netcode.ts` | Binary rollback — `DEBT-NET-001`, `IMPROVE-ENG-015` |
| `lib/environment/WaterEditor.parts-runtime.tsx` | GPU Gerstner — `DEBT-PERF-004`, `IMPROVE-ENG-016` |
| `lib/ray-tracing-bvh.ts` | Async BVH + normals — `DEBT-PERF-002`, `DEBT-RT-001`, `IMPROVE-ENG-017` |
| `lib/nanite-meshlet-builder.ts` | QEM LOD — `DEBT-NANITE-001`, `IMPROVE-ENG-018` |
| `lib/virtual-texture-system.ts` | VT feedback wire — `DEBT-VT-001`, `IMPROVE-ENG-019` |
| `lib/destruction-fracture-generator.ts` | Rapier fracture — `DEBT-DEST-001`, `IMPROVE-ENG-020` |
| `lib/cloth-simulation-gpu.ts` | Skinned collision — `DEBT-CLOTH-001`, `IMPROVE-ENG-021` |
| `lib/ai-audio-engine.ts` | Voice TTS — `DEBT-AUDIO-002`, `IMPROVE-AI-015` |
| `lib/webxr-vr-system-core.ts` | Hardware foveation — `DEBT-VR-001`, `IMPROVE-ENG-022` |
| `components/terminal/terminalWebSocket.ts` | PTY transport fracture — `DEBT-TERM-001`, `IMPROVE-TERM-001` |
| `lib/server/terminal-pty-runtime.ts` | Server-side node-pty — `DEBT-TERM-001` |
| `apps/studio-local/src-tauri/src/desktop_commands.rs` | Held terminal — `DEBT-DESK-002`, `IMPROVE-DESK-002` |
| `components/dashboard/DashboardShell.tsx` | Banner stack — `DEBT-UX-DASH-001`, `IMPROVE-DASH-002` |
| `lib/routes/route-maturity-registry.ts` | Route inflation — `DEBT-ROUTE-001`, `IMPROVE-ROUTE-001` |
| `scripts/check-hidden-route-leak.mjs` | Maturity gate — `DEBT-ROUTE-001` |
| `apps/studio-local/src-tauri/src/jobs.rs` | Cancel state-only — needs child kill `IMPROVE-PLATFORM-006` |
| `components/ide/fullscreen/stores/workbenchUiStore.ts` | IDE Zustand precedent — `IMPROVE-STUDIO-010` |
| `FUTURE_IMPROVEMENTS_REGISTRY.md` | **This file** — post-debt enhancements |

---

## 5. Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-06-17 | Cursor session | Initial scaffold; post-debt workflow; `IMPROVE-*` schema |
| 2026-06-17 | User Batch 1 | 24 `IMPROVE-*` items; §2.1–2.8 studio/IDE/VFX critique; quality bar expanded |
| 2026-06-17 | User Batch 2 | +18 `IMPROVE-*` (VS-005–008, DASH-001, UX-002, IDE-007–015, BLUEPRINT-001, ADMIN-001, FILM-003); §2.9–2.15; blueprint drift corrections (IDELayout retired, no `shell=modern`) |
| 2026-06-17 | User Batch 3 | +8 `IMPROVE-*` (STUDIO-005–007, VS-009, IDE-016–017, UX-003); §2.16–2.22; four sidebars CONFIRMED; export stubs → `DEBT-RENDER-001`; `isRouteVisible` unwired |
| 2026-06-17 | User Batch 4 | +7 `IMPROVE-*` (FILM-004/005, QUEST-001, STUDIO-008/009, DESK-001); §2.23–2.30; SoundCue 500px in 400px inspector CONFIRMED; MCP → `DEBT-DB-001` |
| 2026-06-17 | User Batch 5 | +22 `IMPROVE-*` (AI-001–003, ENG-001–003, …); §1.1 + §2.31–2.42 Vision 2030 |
| 2026-06-17 | User Batch 6 | +14 `IMPROVE-*` (QUALITY-002, AI-004–008, ENG-004–006, VS-010, DESK-005, VIEW-001, PLATFORM-005); §2.43–2.52 honesty-first + spine; `CanvasViewportSurface` CONFIRMED |
| 2026-06-17 | User Batch 7 | +6 `IMPROVE-*` (AI-009–012, PLATFORM-006/007); §2.53–2.59 Manus/Perplexity/Gemini Live parity; `AethelResearch` PRESET_SOURCES CONFIRMED; `browser-operator-recorder` PARTIAL; Tavily isolated; `useVoiceRecording` walkie-talkie CONFIRMED; `JOB_ACTIVE_CANNOT_CANCEL` + Tauri state-only cancel CONFIRMED; `glb/route.ts` stub CONFIRMED |
| 2026-06-17 | User Batch 8 | +8 `IMPROVE-*` (ENG-007–011, VFX-005, AI-013/014); §2.60–2.66 AAA render audit; dead Cook-Torrance CONFIRMED; magenta shader graph CONFIRMED; CPU Nanite + ID resolve CONFIRMED; TAA preset theater CONFIRMED; `aaaRendererRef=null` CONFIRMED; VT partial; Niagara CPU CONFIRMED |
| 2026-06-17 | User Batch 9 | `analysis_results.md` created; +5 `DEBT-*`; +9 `IMPROVE-*` (ENG-012–016, STUDIO-011, VS-011, UX-004, COLLAB-003); §2.67–2.73 simulation/netcode/cloud |
| 2026-06-17 | User Batch 10 | +6 `DEBT-*` (RT-001, VT-001, DEST-001, CLOTH-001, AUDIO-002, VR-001); +7 `IMPROVE-*` (ENG-017–022, AI-015); §2.74–2.81; VT feedback pass unwired CONFIRMED; AI SFX procedural REFUTED |
| 2026-06-17 | User Batch 11 | +3 `DEBT-*` (TERM-001, UX-DASH-001, ROUTE-001); +3 `IMPROVE-*` (TERM-001, DASH-002, ROUTE-001); §2.82; 40% stub claim PARTIAL (21% hidden, 53% with ALPHA) |
| 2026-06-19 | Cursor session | **Catálogo Vivo + Arcade shipped.** `DEBT-MKT-FRAG-001` → RESOLVED (canonical `lib/marketplace/catalog.ts`, `GET /api/marketplace/catalog`, slug-keyed install/uninstall wired to UI, 402 handling). New `/arcade` surface: `PublishedGame` model, `POST/GET/DELETE /api/projects/[id]/publish`, `GET /api/arcade`, `GET/POST /api/arcade/[slug]`, public list/detail UI + creator publish panel + nav. Follow-ups: `IMPROVE-MKT-VSX-001` (federate Open VSX into the canonical catalog), `IMPROVE-ARC-001` (web-export worker → S3 bundle so published games auto-flip from `pending`→`playable`), `IMPROVE-ARC-002` (publish entry point inside IDE/Studio bound to the real project id). DB migration required before runtime: `npx prisma migrate deploy` (PublishedGame table). |

---

## 6. Quick commands (post-debt validation)

```bash
cd meu-repo/cloud-web-app/web
npm run qa:enterprise-gate
npm run typecheck
npx vitest run __tests__/ai
```
