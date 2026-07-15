# Future Improvements Registry (Post-Debt)

**Purpose:** Canonical backlog of **planned enhancements** â€” experiences, interfaces, quality bars, and product ideas to implement **only after** technical debts are resolved.  
**Prerequisite:** [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) â€” Tier 1â†’3 `DEBT-*` items addressed or explicitly waived with gate evidence.  
**Executor mega-blocks:** [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md) â€” pair `IMPROVE-*` with debts **inside the same Wave**; do not wait for all 69 debts globally.  
**Companion:** [`audit_frontend_ui_ux.md`](./audit_frontend_ui_ux.md) â€” tactical UX hitlist (A4â€“A50); items here may **merge** or **extend** those fronts once debts are clear.  
**Audience:** Claude Opus / future agents â€” execute **after** debt alignment, not in parallel with critical fixes.  
**Rule:** Cursor **annotates only** from user pastes; no implementation until user asks. Capture every idea with enough detail that nothing is lost.

**Created:** 2026-06-17  
**Last reconciled:** 2026-07-07 â€” v4.6.2. **IMPROVE-AI-001â†’015** â†’ Onda J ([`AETHEL_AI_FUSION_CREATIVE_SPEC.md`](./AETHEL_AI_FUSION_CREATIVE_SPEC.md) v1.2). **Studio S1â†’S7** â†’ pillar specs v1.2 ([`AETHEL_STUDIO_SUPREMACY_INDEX.md`](./AETHEL_STUDIO_SUPREMACY_INDEX.md)). **Golden fixtures + CI gates** â†’ [`AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md`](./AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md). Do not implement as orphan backlog.

---

## Studio Pillar mapping (S1â†’S7 â€” v1.2)

Use this table before creating new `IMPROVE-*` rows â€” prefer extending pillar specs over duplicating.

| Pillar | Canonical spec | Representative DEBT | Representative IMPROVE |
|--------|----------------|----------------------|----------------------|
| **S1** Material | [`AETHEL_MATERIAL_SUBSTRATE_SPEC.md`](./AETHEL_MATERIAL_SUBSTRATE_SPEC.md) | `DEBT-RENDER-003` | `IMPROVE-ENG-007`, `IMPROVE-ENG-011`, `IMPROVE-ENG-019` |
| **S2** World | [`AETHEL_WORLD_SYSTEMS_SPEC.md`](./AETHEL_WORLD_SYSTEMS_SPEC.md) | `DEBT-FOLIAGE-001`, `DEBT-NANITE-001` | `IMPROVE-ENG-012`, `IMPROVE-ENG-016` |
| **S3** Animation | [`AETHEL_ANIMATION_CINEMATICS_SPEC.md`](./AETHEL_ANIMATION_CINEMATICS_SPEC.md) | `DEBT-SEQ-001/002/003`, `DEBT-MOTION-001` | `IMPROVE-ENG-014`, `IMPROVE-FILM-003/005` |
| **S4** MetaSounds | [`AETHEL_METASOUNDS_SPEC.md`](./AETHEL_METASOUNDS_SPEC.md) | Law IV play-log | `IMPROVE-FILM-001` |
| **S5** Gameplay | [`AETHEL_GAMEPLAY_FRAMEWORK_SPEC.md`](./AETHEL_GAMEPLAY_FRAMEWORK_SPEC.md) | â€” | `IMPROVE-ENG-005`, `IMPROVE-ENG-006` |
| **S6** Netcode | [`AETHEL_NETCODE_PRODUCTION_SPEC.md`](./AETHEL_NETCODE_PRODUCTION_SPEC.md) | `DEBT-NET-001` | `IMPROVE-ENG-015` |
| **S7** Content | [`AETHEL_CONTENT_PIPELINE_SPEC.md`](./AETHEL_CONTENT_PIPELINE_SPEC.md) | `DEBT-ASSET-001`, `DEBT-NANITE-001` | `IMPROVE-ENG-018` |
| **G.3** Render nuclear | [`AETHEL_AAA_PARITY_TARGETS.md`](./AETHEL_AAA_PARITY_TARGETS.md) | `DEBT-RENDER-003`, `DEBT-PERF-*` | `IMPROVE-ENG-008/009/010`, `IMPROVE-VFX-005` |
| **K** Vanguard | [`AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md`](./AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md) | â€” | `IMPROVE-ENG-002`, `IMPROVE-ENG-010` (K.0) |
| **L** Forge IDE | [`AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md`](./AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md) | `DEBT-AI-*` | `IMPROVE-IDE-*`, `IMPROVE-STUDIO-*` |
| **H** Commerce | [`AETHEL_NETWORK_COMMERCE_LIVEOPS_SPEC.md`](./AETHEL_NETWORK_COMMERCE_LIVEOPS_SPEC.md) v1.2 | `payouts.ts` lanes | H.0 blocker |
| **Unit economics** | [`AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md`](./AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md) | IMPROVE-BILLING-* | All cloud quotas |
| **I** Game Hub | [`AETHEL_GAME_HUB_PLATFORM_GROWTH_SPEC.md`](./AETHEL_GAME_HUB_PLATFORM_GROWTH_SPEC.md) v1.1 | F.2 playtime | `IMPROVE-STUDIO-*` hub UX |

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
3. Prefer order: **Phase A (foundation)** â†’ **B (interfaces)** â†’ **C (experiences)** â†’ **D (market polish)**.
4. UI work: canonical **EN** copy; tokens `var(--aethel-*)`; no new inline-style surfaces.
5. When user paste overlaps an existing `DEBT-*` or `audit_frontend_ui_ux` front, **cross-link** â€” do not duplicate as improvement if it is still debt.

---

## ID scheme â€” `IMPROVE-*`

| Field | Required |
|-------|----------|
| `ID` | `IMPROVE-<AREA>-<NNN>` e.g. `IMPROVE-UX-001`, `IMPROVE-IDE-012` |
| `Title` | Short name |
| `Detail` | Full user intent â€” screens, flows, acceptance cues |
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
| **B** | Interface surfaces â€” shells, panels, layouts, navigation | After A |
| **C** | End-to-end experiences â€” workflows users feel as â€œproductâ€ | After B |
| **D** | Market polish â€” parity claims, performance delight, competitive demos | Last |

---

## Parallel workflow (user + Cursor + Claude)

| Role | Responsibility |
|------|----------------|
| **User** | Paste future plans, interface needs, quality bars (PT discussion OK) |
| **Cursor** | **Annotate only** â€” append structured `IMPROVE-*` rows; link `DEBT-*` blockers; no code |
| **Claude Opus** | After debts done â€” validate, sequence phases, implement with gates |

**Ingest rule:** One user paste â†’ one registry section (batch N). Preserve user wording in `Detail`; normalize into table fields.

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
| `IMPROVE-STUDIO-001` | Hub densidade pro â€” remover â€œguia para humanosâ€ | studio | B | â€” | â€” | draft | Substituir parÃ¡grafos (â€œChoose the editorâ€¦â€, maturidade em prosa) por badges atÃ´micas; paddings compactos; tabela hub `rounded-[28px]` â†’ densidade operador |
| `IMPROVE-STUDIO-002` | Workspace docking â€” abas Ãºnicas preservando WebGL | studio | A | `DEBT-RENDER-003` | A21, A36 | draft | Trocar navegaÃ§Ã£o por rotas Next (`/studio/terrain` â†” `/studio/level?tool=`) por tab/dockview no mesmo shell; **nÃ£o** desmontar Canvas R3F ao trocar ferramenta |
| `IMPROVE-STUDIO-003` | Mobile editor switcher premium | studio | B | â€” | â€” | draft | Remover `<details>` nativo em `CreativeStudioShell.tsx`; dropdown glassmorphic + busca rÃ¡pida + atalhos teclado |
| `IMPROVE-STUDIO-004` | TransiÃ§Ãµes sem flicker 1â€“2s | studio | A | `IMPROVE-STUDIO-002` | â€” | draft | Eliminar reload destrutivo ao alternar tools em `StudioGroupedEditorClient` (`Link ?tool=`) e rotas `creative-studio-routes.ts` |
| `IMPROVE-VS-001` | Visual Script â€” zero inline styles | studio | B | â€” | A4 | draft | Migrar 100% `style={{}}` â†’ tokens Tailwind `--aethel-*`; suportar light/dark; grep gate antes/depois |
| `IMPROVE-VS-002` | Visual Script â€” perf >50 nÃ³s | studio | C | `IMPROVE-VS-001` | â€” | draft | Avaliar layer Canvas/WebGL ou memoizaÃ§Ã£o agressiva; hoje DOM+SVG lag no drag ReactFlow |
| `IMPROVE-VS-003` | CatÃ¡logo contextual RMB + fuzzy search | studio | C | `IMPROVE-VS-001` | â€” | draft | Remover painel lateral permanente; menu sob cursor (estilo UE Blueprint) com busca teclado |
| `IMPROVE-VS-004` | Pin type safety + hints visuais | studio | C | `DEBT-UX-VS-001` | â€” | draft | Bloquear fios incompatÃ­veis (stringâ†”number); highlights dinÃ¢micos nos pinos |
| `IMPROVE-VFX-001` | Niagara gradient builder premium | vfx | C | `DEBT-NIAGARA-002` | A17 | draft | Rampa Color over Lifetime interativa (markers drag, opacity) â€” nÃ£o hex/native picker |
| `IMPROVE-VFX-002` | Niagara dope sheet / burst timeline | vfx | C | `DEBT-NIAGARA-002` | A10 | draft | Timeline para bursts e emissÃµes coordenadas |
| `IMPROVE-VFX-003` | Niagara graph honest UX | vfx | B | `DEBT-NIAGARA-002` | â€” | draft | Ocultar grafo cosmÃ©tico atÃ© compilar para GPU; ou banner â€œheldâ€ explÃ­cito |
| `IMPROVE-VFX-004` | Niagara graphâ†”sim sync | vfx | C | `DEBT-NIAGARA-002`, `DEBT-PERF-001` | U56 | draft | Compilador nÃ³s â†’ `emitterConfig`/compute buffers WebGPU |
| `IMPROVE-IDE-001` | Dock inferior resize horizontal | ide | B | `DEBT-UX-DOCK-001` | A21 | draft | Grip entre Agents 55% e Terminal 45% em `ModernIDEShellCenterStack.tsx` |
| `IMPROVE-IDE-002` | Corrigir Tailwind invÃ¡lido dock | ide | B | `DEBT-UX-DOCK-001` | â€” | draft | `bg-[var(--aethel-surface-primary)]/2` â†’ `color-mix` ou opacidade vÃ¡lida |
| `IMPROVE-IDE-003` | Virtualizar **todas** Ã¡rvores de cena | ide | A | â€” | A8 | draft | `SceneViewportOutliner` jÃ¡ tem virtualizer â€” estender a outliners mock do studio (Character, Film, hub) e qualquer SceneGraph recursivo |
| `IMPROVE-IDE-004` | Monaco ghost text (inline AI suggest) | ide | C | `DEBT-AI-012`, `DEBT-AI-001` | â€” | draft | SugestÃ£o em cinza na linha; Tab accept â€” nÃ£o sÃ³ lista dropdown |
| `IMPROVE-IDE-005` | Monaco Inline Composer Ctrl+K | ide | C | `DEBT-AI-001` | Frente 1 | draft | `ContentWidget` flutuante; seleÃ§Ã£o â†’ edit in place multiarquivo |
| `IMPROVE-IDE-006` | Ghost diff Monaco decorations | ide | B | â€” | A40 | draft | Holographic pending diff antes de apply; integrar com `useApplyGhostPreview` / apply bridge |
| `IMPROVE-FILM-001` | Inverter slots Ã¡udio â€” SoundCue no viewport | studio | B | `DEBT-STUDIO-001` | â€” | draft | `FilmStudioClient`: SoundCueEditor ~260px inspector â†’ viewport central quando `tool=audio` |
| `IMPROVE-FILM-002` | AudioMixInspector na lateral estreita | studio | B | `IMPROVE-FILM-001` | â€” | draft | Mixer levels no inspector; viewport para grafo denso ReactFlow |
| `IMPROVE-ANIM-001` | Expor Rig + Facial editors | studio | B | â€” | â€” | draft | `animation/page.tsx` importa `ControlRigEditor`/`FacialAnimationEditor` mas sÃ³ renderiza `AnimationBlueprint` |
| `IMPROVE-ENV-001` | Foliage sliders funcionais + feedback | studio | C | `DEBT-PERF-003` | â€” | draft | `FoliagePainterRuntime.tsx`: wind, scale, slope â€” hoje `readOnly` / `onChange={() => {}}` |
| `IMPROVE-TERRAIN-001` | Brush UX viewport-first | studio | C | `DEBT-TERRAIN-001` | A14 | draft | Atalho B+drag resize brush; menus radiais no cursor; menos ida Ã  sidebar |
| `IMPROVE-UX-001` | PremiumLoadingState + shimmer | quality | A | â€” | A3, Â§3 Premium | draft | Substituir ~1300 â€œCarregandoâ€¦â€ ad-hoc; 4 variantes route/data/inline/splash |
| `IMPROVE-TIMELINE-001` | Dope sheet / curves em Canvas 2D | studio | C | â€” | A10 | draft | Timelines animaÃ§Ã£o/film/audio: abandonar divs React para pan/zoom performÃ¡tico |
| `IMPROVE-QUALITY-001` | PadrÃ£o ouro competitivo explÃ­cito | quality | D | Tier1 debts | â€” | draft | Benchmark: UE5/Blender densidade; Cursor/Zed IDE; Figma Dev tokens â€” **zero** â€œUX conceitualâ€ |
| `IMPROVE-VS-005` | NÃ³/paleta â€” tokens por tipo (tema-aware) | studio | B | `IMPROVE-VS-001` | A4 | draft | `definition.color`/`node.color` inline (~75,220,332,365) â†’ `--aethel-node-*-bg/text`; alto contraste sem texto ilegÃ­vel |
| `IMPROVE-VS-006` | Context menu â€” clamp viewport | studio | B | â€” | â€” | draft | `style={{ left: x, top: y }}` (~301) sem colisÃ£o; flip quando `x+menuW > innerWidth` |
| `IMPROVE-VS-007` | ScrubbableInput + expressÃµes em portas | studio | C | `IMPROVE-VS-001` | â€” | draft | Substituir `<input type="number">` ~70px (~104â€“108); drag horizontal + eval `10*3` |
| `IMPROVE-VS-008` | Visual script â†’ AST WASM bake (Frente 6) | studio | D | `DEBT-UX-VS-001` | audit_backend_spine | draft | Grafo JS main-thread â†’ AST compatÃ­vel compilador WASM; bake binÃ¡rio nativo |
| `IMPROVE-DASH-001` | Dashboard â€” isolar re-render streaming | platform | A | `DEBT-AI-012` | â€” | draft | `useDashboardUiState` ~46 `useState`; `dashboardShellProps`/`dashboardMainProps` monolÃ­ticos; chat tokens nÃ£o devem re-renderizar billing/wallet/shell |
| `IMPROVE-UX-002` | AlertBanner em todos erros de superfÃ­cie | quality | B | â€” | A6 | draft | `AlertBanner.tsx` V33 ok; billing/auth/rede ainda usam caixas ad-hoc sem dismiss |
| `IMPROVE-IDE-007` | AI Console â†’ Right Rail | ide | B | `DEBT-UX-DOCK-001` | Rule 4, 08_WORKBENCH | draft | Agents sai do bottom dock; Right Rail durante coding; terminal 100% largura na base |
| `IMPROVE-IDE-008` | Bottom dock â€” aba exclusiva + terminal autÃ´nomo | ide | B | `DEBT-UX-DOCK-001` | A21, 08_WORKBENCH | draft | `useModernIDEPanels`: sem chave `terminal`; fechar chat nÃ£o pode ocultar terminal (`CenterStack` ~103) |
| `IMPROVE-IDE-009` | Honrar `activeBottomPanel` no render | ide | B | `DEBT-UX-DOCK-001` | â€” | draft | Prop passada em `ModernIDEShellPanels` ~141 mas **ignorada** em `ModernIDEShellCenterStack` destructuring/render |
| `IMPROVE-IDE-010` | Preview â€” barramento de estado unificado | viewport | A | `DEBT-RENDER-003` | â€” | draft | `CanonicalPreviewSurface` wrapper; estado duplicado vs `usePreviewRuntimeManager`/`PreviewRuntimeToolbar` |
| `IMPROVE-IDE-011` | AI Console hierarquia operacional | ai | C | `DEBT-AI-001` | Rule 4 | draft | Approvals > Runs > Plan > Conversation; nÃ£o chat-first 50/50 com preview |
| `IMPROVE-IDE-012` | Unificar superfÃ­cies de chat | ide | B | `DEBT-AI-001` | â€” | draft | `AIChatPanelPro`, `InlineAIChat`, agents `AIChat*` â€” uma gramÃ¡tica visual/tokens |
| `IMPROVE-IDE-013` | Cmd+K â€” `InlineComposerWidget` nÃ£o modal | ide | C | `DEBT-AI-001` | Frente 1 | draft | Widget existe; `MonacoEditorPro.runtime.tsx` ~426 renderiza `InlineEditModal` fullscreen â€” trocar |
| `IMPROVE-IDE-014` | Diff inline LCS (nÃ£o line-zip) | ide | B | â€” | A40 | draft | `computeSimpleDiff` ~411 em `InlineEditModal.tsx` â€” inserÃ§Ã£o no topo desalinha 30 linhas |
| `IMPROVE-IDE-015` | UI catÃ¡logo de plugins | platform | C | `DEBT-PLUGIN-001` | â€” | draft | APIs `/api/plugins/*` stub; zero painel front para installed/available |
| `IMPROVE-BLUEPRINT-001` | Matriz conformidade guardrails V33 | quality | D | â€” | 19_BEST_IN_MARKET | draft | Rule 1 foco, Color Rule machined, feedback conexÃµes VS, hub redirects â€” drift vs blueprint |
| `IMPROVE-ADMIN-001` | Admin â†’ Card + StudioGlobalNav | platform | B | â€” | COMPONENT_CONSOLIDATION_MAP | draft | `AdminPageHeader`/`AdminSummaryGrid` estÃ©tica SaaS genÃ©rica vs Studio |
| `IMPROVE-FILM-003` | DirectorMode viewport real | studio | C | `DEBT-RENDER-003` | â€” | draft | Placeholder â€œDirector Mode (Nexus Deprecated)â€ em `FilmStudioClient.tsx`/`film/page.tsx` |
| `IMPROVE-STUDIO-005` | LevelEditor â€” eliminar sidebars embutidos | studio | A | â€” | Rule 1 | draft | Remover 250px OutlinerMini + 320px DetailsPanelMini de `LevelEditor.tsx` (~345â€“511); popular slots `outliner`/`inspector` do `CreativeWorkbenchShell` via callbacks |
| `IMPROVE-STUDIO-006` | Studio Home â€” hub shell minimalista | studio | B | â€” | 19_BEST_IN_MARKET, 06_STUDIO_HOME | draft | `app/studio/page.tsx` ~203: remover `CreativeWorkbenchShell`; shell hub-only (missÃµes + grid); sem outliner/inspector diagnÃ³stico na primeira dobra |
| `IMPROVE-STUDIO-007` | Maturity gating no hub e middleware | platform | B | â€” | â€” | draft | `isRouteVisible()` existe mas **nÃ£o Ã© consumido**; ALPHA (`/studio/film`, `/studio/vfx`) listados em `PRIMARY_CREATIVE_HREFS`; alinhar hub + `workbench-convergence.ts` |
| `IMPROVE-VS-009` | VS ContextMenu â†’ primitivo global | studio | B | `IMPROVE-VS-006` | â€” | draft | Substituir `ContextMenu` local (~240) por `components/ui/context-menu.tsx` (`createPortal` + `useEdgeAwarePosition`) |
| `IMPROVE-IDE-016` | Virtualizar FileExplorerTree | ide | A | â€” | A8 | draft | `FileTreeNode` recursÃ£o DOM (~127â€“144); flatten + `@tanstack/react-virtual` como `WorldOutliner` |
| `IMPROVE-IDE-017` | Command Palette â€” FZF Wasm/Worker | ide | C | â€” | â€” | draft | `fuzzyMatch` JS sÃ­ncrono (~256) na main thread; port `fzf-wasm` + Web Worker sub-10ms |
| `IMPROVE-UX-003` | Export UI â€” fail-soft honesto | quality | B | `DEBT-RENDER-001` | Rule robustez | draft | APIs 202 `_pending` receipt stub â†’ UI sem loader infinito; 501/held banner atÃ© pipeline real |
| `IMPROVE-FILM-004` | Timeline â€” clip inspector no shell | studio | B | `IMPROVE-FILM-001` | Rule 1 | draft | `VideoTimelineEditor` painel 280px Inspector/Effects (~317) dentro slot timeline 100â€“300px; props do clipe â†’ `inspector` do shell |
| `IMPROVE-FILM-005` | Cinematic â€” inspector contextual | studio | B | `DEBT-STUDIO-001` | â€” | draft | `tool=cinematic`: `CloudStreamStudioClient` 360px interno + shell `AudioMixInspector` irrelevante (~163); mÃ©tricas stream â†’ slot inspector |
| `IMPROVE-QUEST-001` | Quest â€” inspector Ãºnico | studio | B | `IMPROVE-STUDIO-005` | â€” | draft | `QuestEditor` `w-80` (~172) + pÃ¡gina `QuestInspector` mock (~97) = dois inspetores direita |
| `IMPROVE-STUDIO-008` | Slot bridge API â€” editores headless | studio | A | `IMPROVE-STUDIO-005` | 08_WORKBENCH | draft | `SoundCueEditor`/`VideoTimelineEditor`/`QuestEditor` despojados de colunas internas; estado selecionado â†’ `outliner`/`inspector` shell via bridge |
| `IMPROVE-STUDIO-009` | Rota `/studio/audio` dedicada | studio | B | `IMPROVE-FILM-001` | â€” | draft | Sem `app/studio/audio/`; sÃ³ redirect `creative-studio-routes.ts` â†’ `/studio/film?tool=audio` |
| `IMPROVE-DESK-001` | Tauri â€” sidecars wgpu/ffmpeg/onnx ativos | desktop | D | `DEBT-SIDECAR-001`, `DEBT-DESK-004` | â€” | draft | `native_kernel.rs` + `v29-sidecar-lifecycle`: sÃ³ fs-watch/PTY Available; wgpu/rapier/ffmpeg held; desktop = WebView+cloud |
| `IMPROVE-AI-001` | Agent Client Protocol (ACP) unificado | ai | A | `DEBT-AI-001`, `DEBT-AI-002` | â€” | **â†’ Onda J.11** | Barramento assÃ­ncrono Ãºnico desktop Rust + cloud WSS |
| `IMPROVE-AI-002` | IndexaÃ§Ã£o vetorial contÃ­nua (cartography++) | ai | A | `DEBT-SEARCH-002`, `DEBT-DESK-003` | â€” | draft | Thread baixa prioridade: `fs_watch` â†’ embeddings reais (SQLite-vec/DeltaDB); hoje `repository-cartography.ts` + `embedText` hash bag |
| `IMPROVE-AI-003` | ExecuÃ§Ã£o hÃ­brida local-nuvem | ai | **L.1â€“L.6** | `DEBT-DESK-004`, `DEBT-AI-012` | â€” | **â†’ Onda L** | ForgeSandboxExecutor + AutonomousEngineerLoop; E2B agent kernel â€” `AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` |
| `IMPROVE-ENG-001` | Pipeline WGSL WebGPU/WGPU 1:1 | viewport | D | `DEBT-SIDECAR-001`, `IMPROVE-DESK-001` | â€” | draft | Desktop `wgpu` Rust + Web WebGPU mesmo WGSL; paridade cloud/local <2ms submit |
| `IMPROVE-ENG-002` | Gaussian Splatting no pipeline | viewport | **K.3** | `IMPROVE-ENG-001`, G.3a | aethel_vision_2030 | **â†’ Onda K.3** | Hybrid mesh+splat; GPU radix sort; spherical quant cook â€” spec `AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md` |
| `IMPROVE-ENG-003` | DirectStorage / GPU decompression | desktop | **M.2** | `IMPROVE-ENG-001` | aethel_vision_2030 | **â†’ Onda M.2** | Tauri `direct_storage_loader.rs` + GPU decompress compute; Win first â€” `AETHEL_RUNTIME_IMMUNITY_SPEC.md` |
| `IMPROVE-COLLAB-001` | Spatial P2P mesh + autoridade dinÃ¢mica | collab | D | `DEBT-YJS-001` | aethel_vision_2030 | draft | CÃ©lulas espaciais; fÃ­sica delegada a nÃ³s capazes; WebRTC ultra-baixa latÃªncia; reduz custo AWS MMO |
| `IMPROVE-COLLAB-002` | CRDT cena 3D (Yjs/DeltaDB) | collab | C | `DEBT-YJS-001` | â€” | draft | Mesmo motor colaboraÃ§Ã£o IDE â†’ transforms/grafo cena; deltas matemÃ¡ticos sem file lock |
| `IMPROVE-GEN-001` | IA operadora de grafos visuais | ai | C | `DEBT-AI-001`, `IMPROVE-STUDIO-008` | â€” | draft | Prompt em `SoundCueEditor`/`QuestEditor`/VFX â†’ instancia nÃ³s, fia pinos, ajusta params autonomamente |
| `IMPROVE-GEN-002` | SÃ­ntese neural Ã¡udio/VFX runtime | vfx | D | `IMPROVE-ENG-001` | aethel_vision_2030 | draft | Sintetizadores neurais GPU/NPU in-game; `Audio.synthesize(prompt)`; jogos 150GBâ†’10GB |
| `IMPROVE-DESK-002` | Terminal PTY real (portable-pty) | desktop | A | `DEBT-DESK-002` | â€” | draft | Substituir `create_held`/`write_held` em `desktop_commands.rs`; stdoutâ†’`aethel:pty-data`; xterm.js |
| `IMPROVE-DESK-003` | fs_watch emissÃ£o reativa | desktop | A | `DEBT-DESK-003` | â€” | draft | `Ok(_event)` (~277) â†’ `window.emit("aethel://file-system-event")`; refresh asset tree + editor |
| `IMPROVE-DESK-004` | InferÃªncia local ONNX (ort) | desktop | **K.1** | `DEBT-DESK-004`, `DEBT-SIDECAR-001` | â€” | **â†’ Onda K.1** | Neural Upscale node; wgpu zero-copy; K.0 hooks in Câ€“D only until G stable |
| `IMPROVE-BRIDGE-001` | Aethel Bridge IPC (WSS loopback) | platform | A | `IMPROVE-DESK-002`, `IMPROVE-DESK-003` | â€” | draft | Porta efÃªmera 49152â€“65535; SCT no OS keyring; JSON-RPC 2.0; Web IDE consome kernel local |
| `IMPROVE-PLATFORM-001` | Workspace unificado 3 janelas | platform | B | `IMPROVE-BRIDGE-001` | 15_MOBILE_COMPANION | draft | Local/Web/Mobile = mesma sessÃ£o reativa; nÃ£o trÃªs produtos; hierarquia Workbench center |
| `IMPROVE-PLATFORM-002` | Cross-Device Continuity (`AethelWorkspaceState`) | platform | C | `DEBT-DB-001` | 15_MOBILE_COMPANION | draft | JSON versionado: file, cursor, tool, chat thread, runId; Redis sync; card "Continue where you left off" |
| `IMPROVE-PLATFORM-003` | Prisma `McpServer` + `RenderJob` live | platform | A | `DEBT-DB-001`, `DEBT-RENDER-001`, `DEBT-DB-002` | â€” | draft | Schema canÃ´nico user paste; APIs deixam `(prisma as any)` e 202 stubs |
| `IMPROVE-PLATFORM-004` | Render queue real (BullMQ/Redis) | platform | B | `IMPROVE-PLATFORM-003`, `DEBT-RENDER-001` | â€” | draft | `queue-system.ts` opcional hoje; wire `POST /api/exports/mp4` â†’ prisma job â†’ worker â†’ S3 |
| `IMPROVE-MOBILE-001` | Gated approval cards (semantic diff) | platform | C | `IMPROVE-IDE-011` | 15_MOBILE_COMPANION | draft | Impact summary + risk level; swipe approve/reject; nÃ£o diff linha-a-linha no phone |
| `IMPROVE-MOBILE-002` | Captura mobile â†’ Gaussian Splat pipeline | platform | D | `IMPROVE-ENG-002` | 15_MOBILE_COMPANION | draft | Camera/LiDAR â†’ cloud splat train ~3min â†’ asset sync IDE Local asset browser |
| `IMPROVE-MOBILE-003` | AI Composer Lite (voz/vibe-coding) | platform | C | `DEBT-AI-001` | 15_MOBILE_COMPANION | draft | IntenÃ§Ã£o complexa por voz; cloud processa; preview vÃ­deo comprimido no visor |
| `IMPROVE-STUDIO-010` | Store unificada shell criativo | studio | A | `IMPROVE-STUDIO-008` | â€” | draft | Estender padrÃ£o `workbenchUiStore.ts` (existe IDE) â†’ `creativeWorkbenchStore` para slots inspector/outliner; **nota:** `workbench-store.ts` nÃ£o existe no repo |
| `IMPROVE-QUALITY-002` | [SUPERSEDED] Honesty-first â€” moat vs Unreal | quality | A | â€” | aethel_vision_2030 | draft | **SUPERSEDED** by v4.2 / AETHEL_AAA_PARITY_TARGETS.md (Decisions #40-42) |
| `IMPROVE-AI-004` | IA integradora USD (não gera malha) | ai | C | `DEBT-SEARCH-002` | I70 | **→ Onda J.7 CORE** | Prompt → library placement via `usd-integrator.ts`; no Tripo-only AAA; USD viewer HELD |
| `IMPROVE-AI-005` | Video-to-mechanic → Visual Script | ai | C | `IMPROVE-VS-010`, `DEBT-AI-001` | I70 | **→ Onda J.6 CORE** | Scaffold extractor + FusionTx operator + `/api/ai/video/scaffold`; Trava III — no auto-physics |
| `IMPROVE-AI-006` | Asset morphing orquestrado | ai | C | `IMPROVE-AI-004` | I70 | draft | Variantes sem remesh: deformaÃ§Ã£o vÃ©rtices + shaders musgo/rachadura sobre asset library |
| `IMPROVE-AI-007` | Tree-sitter AST RAG (mobile+IDE) | ai | A | `DEBT-SEARCH-003` | Frente 44 | draft | `web-tree-sitter` + `slicePrompt(symbol)`; vibe-coding mÃ³vel sem projeto inteiro no prompt |
| `IMPROVE-AI-008` | EvidÃªncia visual headless (before/after) | ai | B | `DEBT-RENDER-001` | Frente 41 | draft | `task-evidence-ledger.ts` + OffscreenCanvas 60f â†’ WebM/GIF em `AgentEvidencePanel` |
| `IMPROVE-ENG-004` | Overlay WGPU nativo child window (B51) | viewport | C | `IMPROVE-ENG-001`, `IMPROVE-DESK-001` | audit_backend B51 | draft | `NativeViewportAnchor` + `aethel://viewport-bounds-changed`; Rust wgpu sobre div Ã¢ncora; Tauri only |
| `IMPROVE-ENG-005` | Scene bake OOPâ†’ECS (U57/B52) | viewport | C | `DEBT-PERF-004` | audit_backend U57 | draft | Play: hierarquia â†’ `SharedArrayBuffer` Float32 stride 10; Rapier worker + compute 0% GC |
| `IMPROVE-VS-010` | VS JIT compiler Rustâ†’WASM (F6/M69) | studio | C | `DEBT-UX-VS-001` | audit_backend F6 | draft | DAG+topo sort; memÃ³ria linear; wasm-encoder; syscalls `aethel_sys::*`; substitui `runtime-core/executors.ts` JS |
| `IMPROVE-DESK-005` | Rust VFS local Sled/RocksDB (F2) | desktop | B | `IMPROVE-DESK-001` | audit_backend F2 | draft | Cache offline splats/assets; Prisma sÃ³ nuvem; `Cargo.toml` sled/rocksdb |
| `IMPROVE-VIEW-001` | Substituir Canvas viewport placebo | viewport | B | `IMPROVE-ENG-004` | â€” | draft | `CanvasViewportSurface.tsx` `NexusCanvasV2` "deprecated" (~10â€“16) â†’ anchor ou splat viewport |
| `IMPROVE-PLATFORM-005` | Plugins WASI wasmtime (R64) | platform | C | `DEBT-EXT-001`, `DEBT-PLUGIN-001` | audit_backend R64 | draft | `wasm32-wasi` + fuel 100M + 128MB cap; assinatura marketplace; substitui `vm` host |
| `IMPROVE-ENG-006` | Game logic Rustâ†’WASM instant compile | ide | C | `IMPROVE-VS-010` | â€” | draft | Scripts gameplay compilam ms; vence UE C++ build loop; alinha agent-first moat |
| `IMPROVE-AI-009` | Browser Operator headless (Manus-grade) | ai | A | `DEBT-AI-001` | UX_MARKET_STANDARD | **→ Onda J.8 CORE** | Governed fetch/snapshot + CostGuard + ledger **DONE** 2026-07-11ai; full Playwright/CDP farm + live Take over **HELD** |
| `IMPROVE-AI-010` | Dynamic RAG pipeline (Perplexity-grade) | ai | A | `DEBT-SEARCH-002` | â€” | draft | `ai-web-tools.ts` Tavily/Serper existe mas **nÃ£o** ligado ao painel research; parse runtime, credibility real, evidÃªncias â†’ `task-evidence-ledger.ts` |
| `IMPROVE-AI-011` | Full-duplex live voice + barge-in | ai | B | `DEBT-AI-001` | UX_MARKET_STANDARD | **→ Onda J.10 CORE** | PTT/generate→play + CostGuard + ledger **DONE** 2026-07-11aj; full-duplex WebRTC/PCM room + VAD barge-in **HELD** |
| `IMPROVE-AI-012` | Nexus squad orchestrator + Activity Deck | ai | B | `IMPROVE-AI-001`, `DEBT-AI-001` | â€” | draft | `agent-tool-bus.ts` + `parallel-agent-work-contract.ts` â†’ dispatch Research/Builder/QA; `AIChatActivityDeck` feed horizontal paralelo; injeÃ§Ã£o voz via live |
| `IMPROVE-PLATFORM-006` | Bidirectional job cancel channel | platform | A | `IMPROVE-PLATFORM-004`, `DEBT-RENDER-001` | â€” | draft | Redis pub/sub `aethel:job-cancel:{jobId}`; cloud kill ffmpeg/blender; Tauri `child.kill()`; hoje `cancel/route.ts` + `queue-system.ts` = `JOB_ACTIVE_CANNOT_CANCEL` 409; Tauri `jobs.rs` sÃ³ marca estado |
| `IMPROVE-PLATFORM-007` | Real GLB export pipeline | platform | B | `DEBT-RENDER-001`, `IMPROVE-DESK-001` | â€” | draft | Tauri `probe.rs` gltf-transform/meshoptimizer/blender detectados; `exports/glb/route.ts` 202 `_pending`; cloud `@gltf-transform/core` + S3 |
| `IMPROVE-ENG-007` | PBR live direct lighting (dead Cook-Torrance) | viewport | A | `DEBT-RENDER-003` | â€” | draft | `aaa-material-system.shaders.ts` ~256â€“285 funÃ§Ãµes GGX/Smith/Fresnel **nunca chamadas**; `main()` ~326 = `albedo*ao+emissive`; `F0` morto ~325 |
| `IMPROVE-ENG-008` | Dynamic GI + shadow maps (Lumen-class honest) | viewport | A | `DEBT-RENDER-003`, `DEBT-PERF-002` | â€” | draft | `aaa-render-system.ts` SSGI/RTGI/voxelGI stubs vazios; `setupLightProbes` adiciona probes sem bake; `pbr-shadow-runtime.ts` existe mas nÃ£o wired ao PBR custom; presets CSM em `useRenderPipeline.presets.ts` com `aaaRendererRef=null` |
| `IMPROVE-ENG-009` | GPU-driven Nanite + visibility resolve | viewport | B | `DEBT-NANITE-001`, `DEBT-RENDER-003` | â€” | draft | `cullMeshlets` CPU TS ~161â€“219; resolve FS ~371â€“376 IDs coloridos; Hi-Z shader ~85â€“100 mas fallback CPU; indirect draw nÃ£o wired |
| `IMPROVE-ENG-010` | TAA + velocity buffer + SSR/DOF real | viewport | **C (K.0)** | `DEBT-RENDER-003` | â€” | **â†’ Onda C + K.0** | Velocity MRT = K.0 foundation; TAA/SSR/DOF ship Onda D; neural upscale needs velocity first |
| `IMPROVE-ENG-011` | Virtual texturing GPU decode (BC7/ASTC) | viewport | C | `DEBT-RENDER-003` | â€” | draft | `virtual-texture-cache.ts` page table + LRU + feedback **PARTIAL**; sem decode hardware/compressÃ£o bloco na GPU |
| `IMPROVE-VFX-005` | GPU compute particles (Niagara + real) | vfx | B | `DEBT-NIAGARA-002`, `DEBT-PERF-001`, `IMPROVE-ENG-001` | U56 | draft | `NiagaraParticleEmitter.runtime.ts` array CPU; `particle-system-real.ts` header "GPU" mas loop `update()` CPU ~202â€“276; WebGPU compute + WGPU desktop |
| `IMPROVE-AI-013` | Config-driven rendering (AI bypass shaders) | ai | B | `DEBT-RENDER-003`, `IMPROVE-AI-001` | â€” | draft | IA altera `useRenderPipeline.presets.ts` / JSON params (`bloomIntensity`, `tonemapping:'ACES'`) â€” nunca edita WGSL/GLSL manual |
| `IMPROVE-AI-014` | Rust AST shader graph compiler | ai | C | `DEBT-RENDER-003` | â€” | draft | `ShaderGraphCompiler.generateFragmentCode` ~121â€“125 retorna magenta fixo; validar tipos pin floatâ†’vec3 antes de compile; crash-safe |
| `IMPROVE-ENG-012` | Foliage surgical erase + GPU LOD culling | viewport | A | `DEBT-FOLIAGE-001`, `DEBT-PERF-003` | â€” | **done 2026-07-11ac** | `removeCluster` surgical + `setInstanceVisible`; painter InstancedMesh |
| `IMPROVE-ENG-013` | Volumetric clouds production pipeline | viewport | B | `DEBT-CLOUD-001` | — | **closed** | Depth blending + GodRays wired (2026-07-13by); full volumetric AAA marketing still HELD |
| `IMPROVE-ENG-014` | Motion matching SOA + O(1) pose + two-bone IK | viewport | B | `DEBT-MOTION-001` | â€” | **CLOSED 2026-07-11ad** | Poses em `Float32Array` strides; frame index lookup; manter `MotionKDTree` sÃ³ para search; `FootLockingIK` â†’ two-bone solver |
| `IMPROVE-ENG-015` | Binary netcode + rollback ring buffer | platform | A | `DEBT-NET-001` | â€” | draft | Bitpack input; struct layout sem JSON; ring buffer `frame % N`; zero `JSON.parse/stringify` em 60Hz path |
| `IMPROVE-ENG-016` | Water Gerstner GPU vertex shader | viewport | B | `DEBT-PERF-004` | â€” | draft | Mover ~16k vert loop de `WaterEditor.parts-runtime.tsx` ~130â€“159 para shader; eliminar `position.clone()` per frame |
| `IMPROVE-STUDIO-011` | Foliage painter InstancedMesh | studio | B | `DEBT-PERF-003` | â€” | **done 2026-07-11ac** | `FoliagePainterPanels.runtime.tsx`: um `InstancedMesh` por typeId |
| `IMPROVE-VS-011` | VS keyboard node palette + pin validation | studio | B | `DEBT-UX-VS-001` | A4 | draft | Space/right-click fuzzy palette no cursor; rejeitar conexÃµes boolâ†’mat4 em compile-time |
| `IMPROVE-UX-004` | PremiumLoadingState unification | quality | B | `DEBT-UX-HITLIST-001` | A3 | draft | Substituir ~1300 "Carregandoâ€¦" ad-hoc por `PremiumLoadingState` shimmer variants |
| `IMPROVE-COLLAB-003` | Yjs authoritative server merge | collab | A | `DEBT-YJS-001` | â€” | draft | Fallback handler: `Y.applyUpdate(doc, update)` antes de broadcast; reconcile com y-websocket path |
| `IMPROVE-ENG-017` | Async BVH + full RT normal packing | viewport | B | `DEBT-PERF-002`, `DEBT-RT-001` | â€” | draft | Worker/WebGPU BVH rebuild; `createDataTextures` pack n0/n1/n2; Phong interp in path tracer shader |
| `IMPROVE-ENG-018` | Meshlet QEM decimation WASM | viewport | C | `DEBT-NANITE-001` | â€” | draft | Substituir `simplifyMeshlets` subsample por libspidr/meshoptimizer WASM; seam-safe LOD clusters |
| `IMPROVE-ENG-019` | VT feedback async + render pass wire | viewport | B | `DEBT-VT-001`, `IMPROVE-ENG-011` | â€” | draft | Render `feedbackMaterial` to RT each frame; PBO/async readback; wire `VirtualTextureSystem` no viewport |
| `IMPROVE-ENG-020` | Destruction Voronoi + Rapier fragments | viewport | C | `DEBT-DEST-001` | â€” | **PARTIAL 2026-07-11ad** | Convex hull cell mesh + Rapier session; Fortune 3D HELD; JS translate never production |
| `IMPROVE-ENG-021` | Cloth GPU + skinned capsule rig | viewport | C | `DEBT-CLOTH-001`, `IMPROVE-ENG-001` | â€” | **PARTIAL 2026-07-11ad** | Numeric hash + bone capsules CPU; GPU collision pass HELD |
| `IMPROVE-AI-015` | Real-time voice generation (not silence) | ai | B | `DEBT-AUDIO-002` | â€” | **PARTIAL 2026-07-11ag** | Formant audible + Bridge TTS attempt CLOSED AUDIO-002; neural lipsync polish remains |
| `IMPROVE-ENG-022` | WebXR hardware foveation + VRS | viewport | **K.4** | `DEBT-VR-001` | â€” | **PARTIAL 2026-07-11ag** | `applyToLayer` in onXRFrame; viewport entry + VRS gaze still HELD â†’ Onda K.4 |
| `IMPROVE-TERM-001` | Terminal transport router (local vs cloud) | ide | A | `DEBT-TERM-001`, `DEBT-DESK-002` | A11 | draft | Tauri: `createDesktopAdapter` â†’ portable-pty stdout events; local dev: WS:3001; cloud: honest held + Desktop Bridge CTA â€” never fake server PTY as user shell |
| `IMPROVE-DASH-002` | Dashboard Linear density â€” collapse banner stack | platform | B | `DEBT-UX-DASH-001` | â€” | **done (2026-07-11ae)** | `DashboardIntentRail` merges entry + routing + auth/billing/trial chips |
| `IMPROVE-ROUTE-001` | Route registry prune + hub honesty | platform | B | `DEBT-ROUTE-001`, `DEBT-ADMIN-001` | â€” | draft | Delete or 301 ASPIRATIONAL pages; wire `isRouteVisible()` in hub; extend gate to count ALPHA stubs; stop admin stub generator |
| `IMPROVE-BILLING-001` | Token weight metering + two-phase AI settle | platform | A | `DEBT-FIN-005`â€“`009`, `DEBT-FIN-010` | â€” | draft | `model-cost-weights.ts`; weighted `consumeMeteredUsage`; reserve/settle on chat+stream; Stripe downgrade; transfer FOR UPDATE â€” see `implementation_plan.md` |
| `IMPROVE-BILLING-002` | BYOK + ultra-premium wallet path | platform | B | `DEBT-BILLING-001` | â€” | draft | User OpenRouter key encrypted at rest; bypass platform token quota; Opus/o1 wallet-only on subscription |
| `IMPROVE-INFRA-001` | Cloudflare R2 Aethel Deploy CDN | platform | C | `DEBT-INFRA-001` | â€” | draft | Zero-egress asset delivery; storage $0.015/GB; deploy playtests |
| `IMPROVE-UX-005` | Local unlimited projects / cloud-sync caps | studio | A | â€” | user_experience_criticism | draft | Enforce `extras.cloudSyncedProjects`; local Tauri unlimited |
| `IMPROVE-UX-006` | AI token weight preview before send | ide | B | `IMPROVE-BILLING-001` | â€” | draft | InlineComposerWidget shows weighted cost estimate |
| `IMPROVE-UX-007` | Beta/Held badges on stub exports | quality | B | â€” | critical_user_experience_audit | draft | No Stripe-listed features without gate evidence |
| `IMPROVE-UX-008` | Offline save buffer + sync LED | ide | B | `DEBT-YJS-001` | â€” | draft | IndexedDB emergency; status bar â—/âš ï¸ |
| `IMPROVE-UX-009` | Resume Workspace (not AI Chat) from dashboard | studio | B | `DEBT-UX-DASH-002` | â€” | **done (2026-07-11ae)** | `entry=resume` + `aethel.ide.session.v1` + dock persist; Resume opens IDE not agents |
| `IMPROVE-BILLING-007` | IDE generosity unlock â€” agents/workspaces/marketplace all tiers | platform | B | `contracts_planning.md` Â§6 | â€” | draft | Remove `allowedAgents`/`allowedDomains` tier gates; infra-only monetization |
| `IMPROVE-COLLAB-006` | Yjs spectator mode for Free/Starter | collab | B | `contracts_planning.md` Â§6 | â€” | draft | Read-only join Pro/Studio rooms; viral upgrade path |
| `IMPROVE-DESK-005` | Local offline AI (WebGPU/ONNX sidecar) | desktop | C | `IMPROVE-DESK-004`, `DEBT-DESK-006` | â€” | draft | Qwen 1.5Bâ€“3B; $0 platform cost; honest `[HELD]` until sidecar live |
| `IMPROVE-ARCADE-001` | Aethel Arcade portal + deploy publish + feedbackâ†’tasks | platform | C | `DEBT-INFRA-001`, `contracts_planning.md` Â§11 | â€” | **PARTIAL 2026-07-11ag** | Listing + playable/HELD chrome + bake gate; feedbackâ†’tasks / Pay hooks remain |
| `IMPROVE-MKT-001` | Marketplace remix clone + `aethel://` deep links | platform | C | `DEBT-PLUGIN-001`, `DEBT-DB-002`, `contracts_planning.md` Â§12 | â€” | draft | POST remix; private copy invariant; Tauri protocol |
| `IMPROVE-MKT-002` | Asset security gateway (scan/optimize/normalize) | platform | C | `DEBT-ASSET-001`, `contracts_planning.md` Â§13 | â€” | draft | Ingest worker; verified badge pipeline |
| `IMPROVE-BILLING-003` | Modular BYOK + $5 addon | platform | B | `DEBT-BILLING-001` | â€” | draft | BYOK all tiers; paid = cloud/storage/collab |
| `IMPROVE-BILLING-004` | Creative Wallet lane (separate from LLM pool) | platform | A | `GAP-FUSION-02` | Wave 6b | draft | Image/3D/video debits own USD-priced wallet; stops one video burning Pro Premium pool |
| `IMPROVE-BILLING-005` | Token bucket rate limits | platform | B | `DEBT-FIN-011` | â€” | draft | Remove hourly hard caps; monthly weighted cap authoritative |
| `IMPROVE-STUDIO-012` | Workspace profiles Code/Research/Game | studio | B | `IMPROVE-ENG-023` | â€” | **done (2026-07-11ae)** | Code profile → frameloop never via workspace-profile + switcher |
| `IMPROVE-ENG-023` | Pause R3F loop when viewport inactive | viewport | A | â€” | â€” | **done (2026-07-11ae)** | visibility + Code profile forcePause; cross-route canvas keep-alive still HELD |
| `IMPROVE-A11Y-001` | App-level accessibility gate (WCAG 2.2 AA) | platform | 7 | evidence: only `@storybook/addon-a11y` exists; no app CI a11y check | â€” | draft | jsx-a11y lint + axe on key shells; keyboard nav + focus rings + reduced-motion across studio/dashboard/auth |
| `IMPROVE-COMPLIANCE-001` | Self-serve account deletion + data export (LGPD/GDPR) | platform | 6/7 | impl: API `app/api/account/route.ts` + `app/api/account/export/route.ts`; UI `app/settings/_components/AccountDataPanel.tsx`; policy `docs/architecture/data_retention_policy.md` | â€” | **done** | Live end-to-end: export download + danger-zone delete (email+DELETE confirm) + written retention policy. Future: async export for huge accounts, backup purge (`IMPROVE-OPS-002`) |
| `IMPROVE-OPS-002` | Disaster recovery: Postgres PITR + restore runbook | platform | 6 | evidence: no backup/cron tooling in repo | â€” | draft | Automated backups + tested restore + RPO/RTO targets |
| `IMPROVE-OPS-003` | Confirm Sentry wiring + release health + source maps | platform | 7 | evidence: `@sentry/nextjs ^8.47.0` dep present; wiring unverified | â€” | draft | Verify `sentry.*.config`, tunnel route, PII scrubbing (never log BYOK keys) |

---

## 2. Interface & experience notes (freeform ingest)

### Â§2.1 Batch 1 â€” Quality philosophy (user, 2026-06-17)

**PadrÃ£o implacÃ¡vel:** Unreal Engine, Blender, Cursor 3.x, Zed, Figma Dev Mode â€” **nÃ£o toleram** â€œqualidade bÃ¡sicaâ€ nem â€œUX conceitualâ€. Cada tela deve ser analisada sob excelÃªncia profissional: densidade de dados, hierarquia visual, feedback imediato, zero placebos de controle.

**Competidores de referÃªncia por domÃ­nio:**

| DomÃ­nio | ReferÃªncia | O que copiar (honesto) |
|---------|------------|----------------------|
| Creative suite layout | Unreal / Blender | Alta densidade; painÃ©is redimensionÃ¡veis; contexto WebGL persistente |
| IDE + AI | Cursor 3.x / Zed | Ghost text, inline composer, docking fluido, virtualized trees |
| Design handoff | Figma Dev Mode | Tokens, compact status, sem parÃ¡grafos explicativos |
| VFX | UE Niagara | Grafo que **compila**; gradient ramps; dope sheet |
| Animation | UE Sequencer / Blender NLA | Canvas timelines, nÃ£o DOM |

---

### Â§2.2 Creative Studio Shell & Hub (`CreativeStudioShell.tsx`, `studio/page.tsx`, `creative-studio-routes.ts`)

**CrÃ­ticas (user, validaÃ§Ã£o Cursor):**

1. **PoluiÃ§Ã£o textual / â€œguia para humanosâ€**  
   - `studio/page.tsx` ~81: heading â€œChoose the editor that moves the mission forward.â€  
   - `SurfaceQualityShell` subtitles longos (â€œResume the active missionâ€¦â€).  
   - Maturidade em prosa (â€œEdit here. Heavy jobs wait for runtimeâ€) em vez de badge compacta.  
   - **IntenÃ§Ã£o:** Status = Ã­cone + badge + tooltip curto; remover parÃ¡grafos orientativos em superfÃ­cies de trabalho.

2. **Baixa densidade / rounded exagerado**  
   - Grid hub `rounded-[28px]`, `shadow-[0_18px_70pxâ€¦]`, `px-4 py-6 lg:px-8`, `max-w-5xl` â€” desperdiÃ§a pixels em monitores profissionais.  
   - **IntenÃ§Ã£o:** Modo â€œoperator densityâ€ como default; paddings ~50% menores em tabelas de editores; bordas 8â€“12px max em painÃ©is de dados.

3. **Mobile `<details>` ad-hoc**  
   - `CreativeStudioShell.tsx` ~103, ~140, ~209: `<details>/<summary>` para navegaÃ§Ã£o mobile â€” fluxo tosco, nÃ£o premium.  
   - **IntenÃ§Ã£o:** `Popover`/`Combobox` estilizado, portal, teclado (â†‘â†“ Enter), busca fuzzy de editores.

4. **TransiÃ§Ãµes de rota destrutivas**  
   - `StudioGroupedEditorClient.tsx` ~88â€“90: `<Link href={activeHref}?tool=${tool.id}>` â€” navegaÃ§Ã£o Next full route.  
   - Rotas separadas terrain/foliage/level (`creative-studio-routes.ts`) causam remount do shell + perda estado Three.js (flicker 1â€“2s citado pelo user).  
   - **IntenÃ§Ã£o:** Single-page studio com tool state em memÃ³ria/URL shallow sem remount do viewport root; preservar WebGL context + scene cache.

**Plano de refinamento (user):** Densidade extrema â†’ Docking workspace â†’ Menu troca rÃ¡pida.  
**IMPROVE IDs:** `IMPROVE-STUDIO-001` â€¦ `004`.

---

### Â§2.3 Visual Scripting (`VisualScriptEditor.tsx`)

**CrÃ­ticas:**

1. **Inline styles** â€” `audit_frontend_ui_ux` A4 cita 50+; Cursor grep atual ~9 `style={{` (drift â€” ainda deve ir a **zero**). Cores fixas `rgba(30,30,30)` quebram theme toggle.  
2. **DOM/SVG scalability** â€” >50 nÃ³s: reconciliaÃ§Ã£o ReactFlow lag no drag.  
3. **Painel lateral estÃ¡tico** â€” catÃ¡logo ocupa largura permanente; UE Blueprint usa RMB + busca contextual.

**Plano:** Fuzzy search contextual RMB; filtro de conexÃµes por tipo; tokens only.  
**IMPROVE IDs:** `IMPROVE-VS-001` â€¦ `004`.  
**blocked_by:** Save placebo = `DEBT-UX-VS-001` (debt fixes persist; improvements add UX gold).

---

### Â§2.4 Niagara VFX (`NiagaraVFX.runtime.tsx`, `NiagaraVFXPanels.runtime.tsx`, `app/studio/vfx`)

**CrÃ­ticas (alinhado `DEBT-NIAGARA-002`):**

1. **Node graph placebo** â€” ReactFlow nodes/edges nÃ£o alimentam `emitterConfig`; sÃ³ painel lateral/presets.  
2. **Color over Lifetime amador** â€” hex inputs / native color picker vs rampa visual.  
3. **Sem dope sheet** â€” bursts/emissÃµes nÃ£o coordenÃ¡veis no tempo.

**Plano:** Gradient builder A17; sync grafoâ†’GPU (U56); timeline efeitos.  
**IMPROVE IDs:** `IMPROVE-VFX-001` â€¦ `004`.

---

### Â§2.5 Scene Outliner & IDE dock (`ModernIDEShellCenterStack.tsx`, outliners)

**CrÃ­ticas:**

1. **DOM inefficiency** â€” outliners mock (Character, Film shot list) renderizam lista completa; cena 500+ entidades trava scroll.  
   - **Nota validaÃ§Ã£o:** `SceneViewportOutliner.tsx` **jÃ¡** usa `@tanstack/react-virtual` â€” melhoria = **propagar padrÃ£o**, nÃ£o reinventar A8 no viewport IDE principal apenas.

2. **Tailwind invÃ¡lido** â€” `bg-[var(--aethel-surface-primary)]/2` linhas ~44, ~144 â€” opacidade `/2` invÃ¡lida em CSS var.

3. **Dock rÃ­gido 55/45** â€” Agents vs Terminal sem grip horizontal (`DEBT-UX-DOCK-001`); resize vertical do dock existe (`ResizeHandle` altura), nÃ£o largura colunas.

**Plano:** VirtualizaÃ§Ã£o obrigatÃ³ria everywhere; draggable grips; fix CSS.  
**IMPROVE IDs:** `IMPROVE-IDE-001` â€¦ `003`.

---

### Â§2.6 Monaco + AI Cursor 3.x style (`MonacoEditorPro.actions.ts`, chat lateral)

**CrÃ­ticas:**

1. **Sem ghost text inline** â€” autocomplete sÃ³ lista Monaco padrÃ£o; falta texto cinza na linha + Tab.  
2. **Sem Composer multilinha Ctrl+K** â€” IA isolada na sidebar; falta widget flutuante sobre seleÃ§Ã£o.

**Plano:** `InlineComposerWidget` ContentWidget; decorations ghost prÃ©-apply (`IMPROVE-IDE-006` liga A40 + apply bridge existente).  
**Batch 2 confirma:** widget implementado mas **nÃ£o wired** â€” runtime usa `InlineEditModal` modal; ver `IMPROVE-IDE-013`, `IMPROVE-IDE-014`.  
**blocked_by:** `DEBT-AI-012`, `DEBT-AI-001` para qualidade AI real.  
**IMPROVE IDs:** `IMPROVE-IDE-004` â€¦ `006`, `IMPROVE-IDE-013`, `IMPROVE-IDE-014`.

---

### Â§2.7 Layout conflicts & placebos (segunda passagem user)

#### Film / Audio sequencer (`FilmStudioClient.tsx`) â€” **CONFIRMED invertido**

| Slot | Hoje (audio tool) | Problema | CorreÃ§Ã£o |
|------|-------------------|----------|----------|
| viewport | `DirectorMode` placeholder â€œNexus Deprecatedâ€ | Ãrea central ociosa | `SoundCueEditor` (grafo ReactFlow denso) |
| inspector (~260px) | `SoundCueEditor` | Esmagado, inutilizÃ¡vel | `AudioMixInspector` compacto |

**IMPROVE:** `IMPROVE-FILM-001`, `IMPROVE-FILM-002`.

#### Animation suite (`app/studio/animation/page.tsx`) â€” **CONFIRMED recursos ocultos**

- Dynamic imports: `ControlRigEditor`, `FacialAnimationEditor` (linhas 17â€“24).  
- Render: apenas `AnimationBlueprint` no viewport (linhas 111â€“114).  
- Outliner/inspector = mock estÃ¡tico skeleton â€” nÃ£o rig real.

**IMPROVE:** `IMPROVE-ANIM-001` â€” tabs ou sub-tools dentro do Character studio para rig/facial.

#### Foliage environment (`FoliagePainterRuntime.tsx`) â€” **CONFIRMED controles travados**

- MÃºltiplos sliders: `onChange={() => {}}` (~472â€“574).  
- Inputs `readOnly` (~487, ~497) para escala/inclinaÃ§Ã£o.  
- User move slider â†’ simulaÃ§Ã£o nÃ£o muda.

**IMPROVE:** `IMPROVE-ENV-001` (pÃ³s `DEBT-PERF-003` instancing).

#### Terrain (`TerrainSculptingEditor.runtime.tsx`)

- Sem menu radial / B+drag brush na viewport.  
- Smooth brush debt = `DEBT-TERRAIN-001` (identity fn) â€” improvement adds UE-style UX **after** debt fixes math.

**IMPROVE:** `IMPROVE-TERRAIN-001`.

#### NavegaÃ§Ã£o destrutiva (reiterado)

- `StudioGroupedEditorClient` + rotas `/studio/world`, `/studio/level?tool=terrain` etc.  
- **IMPROVE-STUDIO-002/004**.

---

### Â§2.8 SumÃ¡rio placebos de usabilidade (tabela user + validaÃ§Ã£o)

| Componente | Arquivo | Falha | Impacto | Debt vs Improve |
|------------|---------|-------|---------|-----------------|
| Sequencer Audio | `FilmStudioClient.tsx` | SoundCue no inspector estreito | Alto | **IMPROVE-FILM-001** |
| VFX Node Graph | `NiagaraVFX.runtime.tsx` | Grafo nÃ£o altera partÃ­culas | Alto | **DEBT-NIAGARA-002** then **IMPROVE-VFX-004** |
| Animation Suite | `animation/page.tsx` | Rig/Facial importados, nÃ£o renderizados | MÃ©dio | **IMPROVE-ANIM-001** |
| Visual Scripting | `VisualScriptEditor.tsx` | Inline styles; catÃ¡logo fixo | MÃ©dio | **IMPROVE-VS-001/003** |
| Foliage Panels | `FoliagePainterRuntime.tsx` | Sliders noop | Alto | **IMPROVE-ENV-001** |
| Loading Global | vÃ¡rios | ~1300 â€œCarregandoâ€¦â€ | MÃ©dio | **IMPROVE-UX-001** (A3) |
| Timelines | animaÃ§Ã£o/film | DOM divs nÃ£o Canvas | MÃ©dioâ€“Alto | **IMPROVE-TIMELINE-001** (A10) |
| Outliner 500+ | studio mocks | Sem virtualizaÃ§Ã£o | Alto | **IMPROVE-IDE-003** |

---

### Â§2.9 Batch 2 â€” Visual Script controls & theme (`VisualScriptEditor.tsx`)

**CrÃ­ticas (user, validaÃ§Ã£o Cursor 2026-06-17):**

1. **Cores estÃ¡ticas vs temas** â€” **CONFIRMED**  
   - `style={{ background: definition.color }}` (~75); `node.color` (~220, 332, 365).  
   - CatÃ¡logo usa hex/strings fixas; alto contraste / light mode â†’ texto ilegÃ­vel em nÃ³s de alta luminÃ¢ncia.  
   - **IntenÃ§Ã£o:** tokens por categoria de nÃ³ (`--aethel-node-event-bg`, `--aethel-node-event-text`) em vez de inline catalog color.  
   - **IMPROVE:** `IMPROVE-VS-005` (extends `IMPROVE-VS-001` zero-inline goal).

2. **Context menu sem clamp** â€” **CONFIRMED**  
   - `style={{ left: x, top: y }}` (~301); sem `menuWidth`/`menuHeight` vs `window.innerWidth/innerHeight`.  
   - RMB perto do canto â†’ menu cortado.  
   - **IMPROVE:** `IMPROVE-VS-006`.

3. **Inputs ad-hoc sem value scrubbing** â€” **CONFIRMED**  
   - Portas constantes: `<input type={port.type === 'number' ? 'number' : 'text'}>` ~104â€“108, `w-[70px]`.  
   - Sem drag-to-scrub nem eval de expressÃ£o (`10*3` â†’ 30).  
   - **IMPROVE:** `IMPROVE-VS-007` (padrÃ£o Blender/Unreal).

4. **Frente 6 â€” WASM AST (futuro)**  
   - `audit_backend_spine.md`: `lib/visual-script/runtime.ts` + editor interpretam no main-thread JS.  
   - Bake deve emitir AST â†’ compilador WASM Aethel.  
   - **IMPROVE:** `IMPROVE-VS-008`; **blocked_by:** persistÃªncia/validaÃ§Ã£o = `DEBT-UX-VS-001`.

---

### Â§2.10 Batch 2 â€” Dashboard runtime & alertas (`useAethelDashboardRuntime.tsx`, `AlertBanner.tsx`)

**Dashboard re-render cascade** â€” **CONFIRMED (refinado)**

- Hook orquestra sub-hooks (`useDashboardUiState`, `useDashboardRemoteData`, â€¦) mas ainda exporta **`dashboardShellProps`** e **`dashboardMainProps`** monolÃ­ticos (~366, ~493).  
- `useDashboardUiState.ts`: **46Ã— `useState`** (chat, wallet, trials, streaming, tabs, â€¦).  
- `isStreaming` / `chatHistory` updates durante token stream â†’ consumidores do shell inteiro re-renderizam (billing, projetos, terminal lateral).  
- **CorreÃ§Ã£o:** stores isoladas (Zustand com selectors atÃ´micos ou React Context por domÃ­nio: `ChatStore`, `WalletStore`, `ShellChromeStore`).  
- **IMPROVE:** `IMPROVE-DASH-001`; **blocked_by:** `DEBT-AI-012` para streaming hardening.

**AlertBanner** â€” **CONFIRMED premium; adoÃ§Ã£o incompleta**

- `AlertBanner.tsx`: `color-mix(in_srgb,var(--aethel-error)_8%,transparent)` â€” padrÃ£o V33 correto.  
- Uso hoje: `DashboardShell.tsx`, `DashboardAlertBanners.tsx`, stories â€” **nÃ£o** universal em billing/auth/network errors.  
- **IMPROVE:** `IMPROVE-UX-002` (Frente A6 completion).

---

### Â§2.11 Batch 2 â€” Blueprint drift vs implementaÃ§Ã£o (`19_BEST_IN_MARKET`, `08_WORKBENCH`)

**ValidaÃ§Ã£o Cursor â€” correÃ§Ãµes ao paste user:**

| Claim user | Estado cÃ³digo (2026-06-17) | Nota |
|------------|---------------------------|------|
| `FullscreenIDE` ramifica `ModernIDEShell` vs `IDELayout` + `shell=modern` | **Parcialmente resolvido** | `FullscreenIDE.tsx` â†’ sÃ³ `FullscreenIDEWorkspace` â†’ `ModernIDEShell`; **zero** `shell=modern` grep; **`IDELayout.tsx` ausente** (scripts exigem retired) |
| Blueprint `08_WORKBENCH.md` Â§Shell reality | **Blueprint desatualizado** | Ainda descreve dual-shell; cÃ³digo convergiu â€” atualizar blueprint na fase doc, nÃ£o reintroduzir `IDELayout` |
| `NexusChatMultimodal.tsx` | **NÃ£o encontrado** | FragmentaÃ§Ã£o real: `AIChatPanelPro`, `InlineAIChat`, stack `components/agents/chat/*` |
| 4 terminais ativos (`IntegratedTerminal`, `TerminalWidget`, `TerminalPro`, `XTerminal`) | **Parcialmente resolvido** | Legacy terminals marcados â€œmust stay retiredâ€ em `check-workbench-consolidation-source.mjs`; famÃ­lia ativa = `XTerminal`/`BaseXTerminal`/`MultiTerminalPanel` |
| Plugins UI ausente | **CONFIRMED** | `app/api/plugins/list|install|uninstall` â†’ 503/stub; **DEBT-PLUGIN-001** |

**Drifts ainda vÃ¡lidos:**

1. **Preview wrapper** â€” `CanonicalPreviewSurface.tsx` delega `RuntimePreviewSurface`/`UnifiedViewport`; estado runtime tambÃ©m em `usePreviewRuntimeManager` + `PreviewRuntimeToolbar` â†’ toolbar â€œrunningâ€ vs skeleton infinito. **IMPROVE-IDE-010**.

2. **Rule 4 â€” chat vs preview roommates** â€” Chat-first em `AIChatPanelPro` / agents workspace; Approvals/Runs em modais secundÃ¡rios. **IMPROVE-IDE-011**.

3. **Rule 1 â€” superfÃ­cie dominante** â€” Hub redirects destrutivos (`/studio/terrain`, etc.) ainda remontam DOM â€” ver `IMPROVE-STUDIO-002/004`.

4. **Color Rule** â€” Destaques neon/roxo em minimap/botÃµes vs machined graphite â€” grep em chrome dock.

5. **Feedback conexÃµes VS** â€” ConexÃµes invÃ¡lidas nÃ£o bloqueiam save JSON â€” **DEBT-UX-VS-001** (debt); improvement = pin hints `IMPROVE-VS-004`.

**IMPROVE:** `IMPROVE-BLUEPRINT-001` â€” matriz de conformidade executÃ¡vel pÃ³s-dÃ­vida.

---

### Â§2.12 Batch 2 â€” Bottom dock collapse (`ModernIDEShellCenterStack`, `useModernIDEPanels`, `chromeDockParts`)

**Problema central** â€” **CONFIRMED** â€” conflito crÃ­tico de usabilidade.

1. **Terminal refÃ©m do chat**  
   - `ModernIDEShellCenterStack.tsx` ~103: `{chatOpen && !isCompact && (` â€” terminal sÃ³ existe se chat aberto.  
   - Fechar Agents fecha terminal inteiro.  
   - `useModernIDEPanels.ts`: `PanelState` = `sidebar|editor|preview|chat` â€” **sem** `terminal`.  
   - **IMPROVE:** `IMPROVE-IDE-008`.

2. **Abas placebo**  
   - `chromeDockParts.tsx` `handleBottomDockItemClick`: `terminal`/`chat` chamam `onSelectBottomPanel` (~131â€“155).  
   - `ModernIDEShellPanels.tsx` passa `activeBottomPanel` (~141).  
   - `ModernIDEShellCenterStack` **nÃ£o destructure** `activeBottomPanel` nem `onSelectBottomPanel` (~66â€“77) â€” sempre render 55% Agents | 45% Terminal.  
   - **IMPROVE:** `IMPROVE-IDE-009`.

3. **Split 55/45 destrÃ³i legibilidade**  
   - Terminal ~350â€“500px em 1080p â†’ word-wrap agressivo em logs webpack/vitest.  
   - Agents esmagado para diffs/blocos de cÃ³digo (~44% altura max do dock).  
   - **SoluÃ§Ã£o layout V33 (user):** Agents â†’ **Right Rail**; Bottom Dock = Terminal **ou** Logs **ou** Problems, **100% largura**, uma aba ativa.  
   - **IMPROVE:** `IMPROVE-IDE-007` + `IMPROVE-IDE-001` (grip horizontal interim) + `DEBT-UX-DOCK-001`.

4. **ViolaÃ§Ãµes blueprint**  
   - `08_WORKBENCH.md`: AI Console = Right Rail; Bottom Dock = diagnÃ³stico horizontal exclusivo.  
   - `19_BEST_IN_MARKET` Rule 1: trÃªs superfÃ­cies competindo na coluna central (editor + agents + terminal).  

---

### Â§2.13 Batch 2 â€” Monaco Cmd+K & diff (`MonacoEditorPro.runtime.tsx`, `InlineEditModal.tsx`, `InlineComposerWidget.tsx`)

**Cmd+K modal vs widget** â€” **CONFIRMED**

- `InlineComposerWidget.tsx` existe â€” Monaco `ContentWidget` na linha do cursor (Frente 1 / Cursor 3.x).  
- `MonacoEditorPro.runtime.tsx` ~7 importa `InlineEditModal`; ~425â€“436 renderiza modal `fixed inset-0` com backdrop â€” bloqueia contexto do arquivo.  
- **IMPROVE:** `IMPROVE-IDE-013` (implementaÃ§Ã£o concreta de `IMPROVE-IDE-005`).

**Naive diff** â€” **CONFIRMED**

- `InlineEditModal.tsx` ~411 `computeSimpleDiff`: zip linha-i vs linha-i sem LCS.  
- Uma linha inserida no topo â†’ 30 linhas â€œdeletadasâ€ + â€œadicionadasâ€.  
- **IMPROVE:** `IMPROVE-IDE-014` (diff-match-patch / jsdiff / port LCS leve).

---

### Â§2.14 Batch 2 â€” Studio placebos reconfirmados (Film, Animation, Admin)

**Film DirectorMode** â€” **CONFIRMED**  
- `FilmStudioClient.tsx` ~18â€“20, `film/page.tsx` ~15â€“17: string estÃ¡tica â€œDirector Mode (Nexus Deprecated)â€.  
- Ãudio invertido jÃ¡ em `IMPROVE-FILM-001/002`; viewport film ainda placebo.  
- **IMPROVE:** `IMPROVE-FILM-003`.

**Animation rigs ocultos** â€” **CONFIRMED** (Batch 1)  
- `animation/page.tsx` imports `ControlRigEditor`/`FacialAnimationEditor` sem JSX.  
- **IMPROVE:** `IMPROVE-ANIM-001`.

**Admin drift** â€” **CONFIRMED**  
- `AdminPageHeader.tsx`: layout flex manual `text-2xl sm:text-3xl`, sem `Card` canÃ´nico.  
- `COMPONENT_CONSOLIDATION_MAP.md` manda unificar com Studio.  
- **IMPROVE:** `IMPROVE-ADMIN-001`.

---

### Â§2.15 Batch 2 â€” Tabela guardrails vs implementaÃ§Ã£o (user + validaÃ§Ã£o)

| Diretriz / Guardrail | Blueprint | ImplementaÃ§Ã£o | Drift | ID |
|---------------------|-----------|---------------|-------|-----|
| Foco de superfÃ­cie (Rule 1) | Uma protagonista/tela | Editor + Agents + Terminal competem na coluna central | **Alto** | `IMPROVE-IDE-007`, `IMPROVE-BLUEPRINT-001` |
| AI Console (Rule 4, 08_WORKBENCH) | Right Rail; Approvals > Runs > Plan | Chat-first; bottom dock 55/45 | **Alto** | `IMPROVE-IDE-011`, `IMPROVE-IDE-007` |
| Bottom Dock (08_WORKBENCH) | Uma aba ativa; largura total | Abas fake; split fixo; `activeBottomPanel` ignorado | **Alto** | `IMPROVE-IDE-008/009`, `DEBT-UX-DOCK-001` |
| ComposiÃ§Ã£o de cores | Graphite/slate machined | Neon/roxo em destaques dock/minimap | MÃ©dio | `IMPROVE-BLUEPRINT-001` |
| Simplicidade vs profundidade | Entrada limpa â†’ IDE | Redirects `/studio/terrain` remount | MÃ©dio | `IMPROVE-STUDIO-002/004` |
| Feedback conexÃµes VS | Bloquear save invÃ¡lido | JSON salva com wires ruins | MÃ©dio | `DEBT-UX-VS-001`, `IMPROVE-VS-004` |
| Plugins extensibilidade | CatÃ¡logo + install UI | API stub; zero painel | Alto | `DEBT-PLUGIN-001`, `IMPROVE-IDE-015` |
| Cmd+K inline | Cursor na linha | Modal fullscreen | Alto | `IMPROVE-IDE-013` |
| Dashboard streaming perf | SubpainÃ©is isolados | 46 states â†’ shell props cascade | Alto | `IMPROVE-DASH-001` |
| Alertas erro (A6) | `AlertBanner` dismissible | Parcial no dashboard | Baixoâ€“MÃ©dio | `IMPROVE-UX-002` |
| Visual script tema | Tokens | `definition.color` inline | MÃ©dio | `IMPROVE-VS-005` |
| WASM visual compile (Frente 6) | Bake nativo | JS main-thread | Alto (futuro) | `IMPROVE-VS-008` |

---

### Â§2.16 Batch 3 â€” Quatro sidebars & hub aninhado (`level/page.tsx`, `LevelEditor.tsx`, `studio/page.tsx`)

**Problema central** â€” **CONFIRMED** â€” duplicaÃ§Ã£o catastrÃ³fica de layout no Level Studio.

**Arquitetura esperada (V30):** `CreativeWorkbenchShell` fornece slots `outliner` | `viewport` | `inspector`; editores alimentam slots â€” **nÃ£o** reimplementam moldura.

**ImplementaÃ§Ã£o real:**

| Camada | Arquivo | O que renderiza |
|--------|---------|-----------------|
| Shell (pÃ¡gina) | `app/studio/level/page.tsx` ~93â€“104 | `outliner={<WorldOutliner />}` mock estÃ¡tico (Zone_A, World_Root); `inspector={<WorldInspector />}` mock (LOD bias, Culling) |
| Editor (viewport slot) | `components/engine/LevelEditor.tsx` ~344â€“511 | **PrÃ³prio** layout 3-colunas: `OutlinerMini` 250px (~346) + viewport + `DetailsPanelMini` 320px (~504) |

**Resultado visual â€” â€œquatro guttersâ€:**

1. Outliner shell (mock) â€” esquerda externa  
2. OutlinerMini (dados reais `objects[]`) â€” esquerda interna  
3. DetailsPanelMini (transform real) â€” direita interna  
4. WorldInspector (mock StreamRegion_01) â€” direita externa  

**Impacto:** Viewport WebGL esmagada; dados reais ao lado de mocks; violaÃ§Ã£o Rule 1 e princÃ­pio shell-slot do `CreativeWorkbenchShell`.

**Mesmo padrÃ£o em grupo:** `StudioGroupedEditorClient.tsx` carrega `LevelEditor` via `renderTool` com `outliner={<StudioToolPicker />}` â€” sidebars embutidos do editor persistem.

**Plano V33 (user):**

1. Remover colunas fixas de `LevelEditor.tsx`; exportar estado via context/callbacks (`LevelEditorSceneBridge`).  
2. PÃ¡gina (`WorldStudioPage`) injeta `OutlinerMini`/`DetailsPanelMini` nos slots do shell.  
3. Opcional: unificar com `WorldOutliner` virtualizado (jÃ¡ tem `@tanstack/react-virtual`) em vez de `OutlinerMini`.

**IMPROVE:** `IMPROVE-STUDIO-005` (Phase A â€” desbloqueia outras melhorias studio).

---

### Â§2.17 Batch 3 â€” Studio Home como IDE disfarÃ§ada (`app/studio/page.tsx`)

**ViolaÃ§Ã£o Rule / blueprint** â€” **CONFIRMED**

- `19_BEST_IN_MARKET`: Studio Home = control room minimalista; continuidade + missÃµes; **nÃ£o** IDE densa.  
- `app/studio/page.tsx` ~203â€“222: `CreativeWorkbenchShell` envolve hub inteiro.  
- `outliner={<StudioHubOutliner />}` (~219): lista de **rotas** (`primaryStudioRoutes`) disfarÃ§ada de hierarquia de cena.  
- `inspector={<StudioHubInspector />}` (~220): `EngineSpineReadinessPanel` â€” logs tÃ©cnicos de prontidÃ£o na primeira dobra.  
- Viewport (~221): `StudioHubViewport` com `SurfaceQualityShell` + parÃ¡grafos (â€œResume the active missionâ€¦â€) â€” reitera crÃ­tica `IMPROVE-STUDIO-001`.

**IntenÃ§Ã£o:** Shell hub dedicado (`StudioHomeShell` ou `CreativeStudioShell` hub-only): top bar leve, grid de editores, mission control central â€” **zero** painÃ©is laterais de ediÃ§Ã£o atÃ© abrir editor.

**IMPROVE:** `IMPROVE-STUDIO-006` (complementa `IMPROVE-STUDIO-001` densidade).

---

### Â§2.18 Batch 3 â€” Export APIs receipt stubs & UX de confianÃ§a

**Debt (nÃ£o duplicar):** `DEBT-RENDER-001` â€” Prisma `RenderJob` ausente; poll `/api/render/jobs/[id]` â†’ 503/404.

**Rotas validadas (202 + `_pending`):**

| Rota | Arquivo | `_pending` |
|------|---------|------------|
| Project ZIP | `app/api/exports/project/route.ts` ~48 | `lib/export/formats/project-zip not yet wired` |
| USDZ | `app/api/exports/usdz/route.ts` ~36 | `lib/integrations/usd not yet wired` |
| WAV | `app/api/exports/wav/route.ts` ~43 | `lib/export/formats/wav not yet wired` |
| MP4 | `app/api/exports/mp4/route.ts` ~52 | `lib/render-farm/providers not yet wired` |
| GLB | `app/api/exports/glb/route.ts` ~41 | idem render-farm |

**Comportamento:** `status: 'queued'`, `jobId: export:*:${Date.now().toString(36)}` â€” UI mostra â€œProcessandoâ€¦â€; job nunca completa.

**Proposta user (pÃ³s-debt ou interim):** Fail-soft honesto â€” 501 + mensagem held/desktop Tauri; **nÃ£o** 202 falso.  
**IMPROVE:** `IMPROVE-UX-003` (**blocked_by:** `DEBT-RENDER-001` para pipeline real; interim = UI nÃ£o mente).

---

### Â§2.19 Batch 3 â€” Paradoxo rotas Labs vs Studio hub (`workbench-convergence.ts`, `route-maturity-registry.ts`)

**CONFIRMED com nuance:**

1. **`workbench-convergence.ts`** â€” `ASPIRATIONAL_LAB_EXACT_PATHS`: `/level-editor`, `/niagara-editor`, etc. â†’ `labs-hidden` quando flag off. **`/studio/*` nÃ£o estÃ¡ no set.**

2. **`route-maturity-registry.ts`** â€” `isRouteVisible()`: oculta sÃ³ `PROTOTYPE` + `ASPIRATIONAL`; **ALPHA e BETA passam**.  
   - `/studio/film`, `/studio/vfx`, `/studio/animation` = **ALPHA** mas **visÃ­veis** em produÃ§Ã£o.  
   - **Grep:** `isRouteVisible` definido mas **nÃ£o importado** em nenhum componente de navegaÃ§Ã£o.

3. **`creative-studio-routes.ts`** â€” `PRIMARY_CREATIVE_HREFS` inclui `/studio/animation`, `/studio/vfx`, `/studio/film` (ALPHA) no hub principal `studio/page.tsx`.

**Impacto:** UsuÃ¡rio acessa placebos (4 sidebars, DirectorMode deprecated, Niagara cosmÃ©tico) via navegaÃ§Ã£o canÃ´nica â€” inconsistente com proteÃ§Ã£o Labs das rotas legadas.

**Proposta:** Wire `isRouteVisible` no hub outliner/grid; opcionalmente middleware para ALPHA sem flag; ou elevar maturidade sÃ³ quando `IMPROVE-*` correspondentes done.

**IMPROVE:** `IMPROVE-STUDIO-007`.

---

### Â§2.20 Batch 3 â€” Design system drift: ContextMenu global vs Visual Script

**CONFIRMED**

| | `components/ui/context-menu.tsx` | `VisualScriptEditor.tsx` |
|--|----------------------------------|--------------------------|
| Portal | `createPortal(..., document.body)` (~154) | Inline no canvas |
| Edge-aware | `useEdgeAwarePosition` (~71) | `style={{ left: x, top: y }}` (~301) |
| Reuso | Primitivo canÃ´nico | `function ContextMenu` local (~240) |

**IMPROVE:** `IMPROVE-VS-009` (supersedes implementaÃ§Ã£o manual de `IMPROVE-VS-006` â€” clamp vem grÃ¡tis do primitivo).

---

### Â§2.21 Batch 3 â€” File tree & Command Palette performance gaps

**FileExplorerTree** â€” **CONFIRMED** â€” sem virtualizaÃ§Ã£o

- `components/ide/FileExplorerTree.tsx` ~127â€“144: recursÃ£o `node.children.map` â†’ DOM completo.  
- Zero `@tanstack/react-virtual` (grep negativo).  
- Contraste: `WorldOutliner.tsx` **jÃ¡** virtualizado (gate `check-editor-virtualization-spine.mjs`).  
- **IMPROVE:** `IMPROVE-IDE-016` (extends `IMPROVE-IDE-003` pattern).

**Command Palette fuzzy** â€” **CONFIRMED**

- `CommandPalette.parts.tsx` ~256 `fuzzyMatch`: loop char-a-char sÃ­ncrono na main thread.  
- Repos grandes â†’ lag perceptÃ­vel em Ctrl+P.  
- **IMPROVE:** `IMPROVE-IDE-017` (fzf-wasm + Worker).

---

### Â§2.22 Batch 3 â€” Tabela componentes/APIs (user + validaÃ§Ã£o)

| Rota / API / Componente | Arquivo | SituaÃ§Ã£o | Gravidade | ID |
|----------------------|---------|----------|-----------|-----|
| Level 4 sidebars | `level/page.tsx` + `LevelEditor.tsx` | Shell mock + editor embedded panels | ðŸ”´ CrÃ­tico | `IMPROVE-STUDIO-005` |
| Studio Home workbench | `app/studio/page.tsx` | Hub em `CreativeWorkbenchShell` | ðŸ”´ CrÃ­tico | `IMPROVE-STUDIO-006` |
| API Export Project | `app/api/exports/project/route.ts` | 202 receipt stub | ðŸ”´ CrÃ­tico (debt) | `DEBT-RENDER-001`, `IMPROVE-UX-003` |
| API Export USDZ | `app/api/exports/usdz/route.ts` | 202 receipt stub | ðŸ”´ CrÃ­tico (debt) | `DEBT-RENDER-001` |
| API Export WAV | `app/api/exports/wav/route.ts` | 202 receipt stub | ðŸ”´ CrÃ­tico (debt) | `DEBT-RENDER-001` |
| API Export MP4 | `app/api/exports/mp4/route.ts` | 202 receipt stub | ðŸ”´ CrÃ­tico (debt) | `DEBT-RENDER-001` |
| VS ContextMenu | `VisualScriptEditor.tsx` | ReinvenÃ§Ã£o sem portal/edge | ðŸŸ¡ MÃ©dio | `IMPROVE-VS-009` |
| Studio routes ALPHA | `creative-studio-routes.ts` + hub | Expostas sem `isRouteVisible` | ðŸŸ¡ MÃ©dio | `IMPROVE-STUDIO-007` |
| File tree | `FileExplorerTree.tsx` | RecursÃ£o DOM massiva | ðŸŸ¡ MÃ©dioâ€“Alto | `IMPROVE-IDE-016` |
| Ctrl+P fuzzy | `CommandPalette.parts.tsx` | JS sync main thread | ðŸŸ¡ MÃ©dio | `IMPROVE-IDE-017` |

---

### Â§2.23 Batch 4 â€” Colapso tridimensional Film/Audio (`FilmStudioClient.tsx`, `SoundCueEditor.tsx`)

**CONFIRMED** â€” reforÃ§a e quantifica `IMPROVE-FILM-001/002` (Batch 1/3).

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

- Viewport (~140â€“147): `DirectorMode` placeholder para todos tools exceto `cinematic`.  
- `SoundCueEditor` no slot **inspector** quando `tool=audio`.

**Geometria do colapso:**

| SuperfÃ­cie | Largura interna | Shell constraint |
|------------|-----------------|------------------|
| `SoundCueEditor` catÃ¡logo | 240px (~533) | â€” |
| ReactFlow canvas | flex 1 (comprimido) | â€” |
| Preview/properties | 260px (~597) | â€” |
| **Total mÃ­nimo** | **~500px+** | `CreativeWorkbenchShell` `rightW.max: 400` (~68) |

**Impacto:** Grafo ReactFlow ilegÃ­vel; scroll horizontal; viewport central ociosa com â€œNexus Deprecatedâ€.

**Rota Ã¡udio fantasma** â€” **CONFIRMED**

- `app/studio/audio/` â€” **ausente** (glob 0).  
- `creative-studio-routes.ts`: `'/studio/audio': '/studio/film?tool=audio'`.  
- Ãudio forÃ§ado pelo grupo Film.

**IMPROVE:** `IMPROVE-FILM-001`, `IMPROVE-FILM-002`, `IMPROVE-STUDIO-009`.

---

### Â§2.24 Batch 4 â€” Timeline vertical vs dock horizontal (`VideoTimelineEditor.tsx`)

**CONFIRMED**

- Shell timeline: altura **100â€“300px** default 180 (`CreativeWorkbenchShell.tsx` ~63â€“69, ~334).  
- `VideoTimelineEditor` main content (~228): `display: flex` row â€” tracks + **painel direito 280px** (~317) com abas Inspector/Effects.  
- Shell inspector direita: `AudioMixInspector` ou `SoundCueEditor` simultaneamente.

**Conflito:** Dois inspetores em eixos ortogonais (timeline inferior + coluna direita). PadrÃ£o UE/Resolve: propriedades do clipe selecionado fluem para **um** inspector global.

**IMPROVE:** `IMPROVE-FILM-004`; integrar em `IMPROVE-STUDIO-008` slot bridge.

---

### Â§2.25 Batch 4 â€” Quest inspectores duplicados (`quest/page.tsx`, `QuestEditor.tsx`)

**CONFIRMED** â€” variante do padrÃ£o â€œfour sidebarsâ€ (Batch 3) no eixo direito.

| Inspector | Arquivo | Tipo |
|-----------|---------|------|
| Shell `QuestInspector` | `quest/page.tsx` ~97 | Mock estÃ¡tico (quest.intro.01) |
| Editor `QuestInspector` | `QuestEditor.tsx` ~172â€“186 | DinÃ¢mico (`w-80` = 320px), nÃ³ selecionado |

**Impacto:** ~320px + largura shell inspector (~180â€“400px) devoram grafo ReactFlow de quests.

**IMPROVE:** `IMPROVE-QUEST-001` (mesmo padrÃ£o `IMPROVE-STUDIO-005`).

---

### Â§2.26 Batch 4 â€” Pixel streaming + inspector irrelevante (`CloudStreamStudioClient.tsx`)

**CONFIRMED**

- `tool=cinematic`: viewport = `<CloudStreamStudioClient embedded />` (~140â€“142).  
- Client: grid `lg:grid-cols-[minmax(0,1fr)_360px]` (~54) â€” mÃ©tricas custo/evidÃªncia na coluna interna.  
- Inspector shell quando **nÃ£o** audio: `AudioMixInspector` (~163) â€” Master/SFX/Music/Dialogue estÃ¡ticos.

**PoluiÃ§Ã£o contextual:** UsuÃ¡rio em cloud review vÃª mixer de Ã¡udio irrelevante na extrema direita do shell enquanto mÃ©tricas de stream ficam **dentro** do viewport.

**CorreÃ§Ã£o:** `inspector` dinÃ¢mico por `activeTool.id` â€” cinematic â†’ painel cloud safety/cost; audio â†’ mix compacto; director â†’ shot/sequence props.

**IMPROVE:** `IMPROVE-FILM-005`.

---

### Â§2.27 Batch 4 â€” Paridade nativa Tauri (`native_kernel.rs`, `lib.rs`, sidecar lifecycle)

**CONFIRMED com nuance**

**`native_kernel.rs` manifest** (~41â€“99):

- Capabilities listadas: `local-daemon-contract` (NeedsReview), `filesystem-watch-contract` (**Available**), `native-pty-contract` (**Available**), `crash-recovery-contract` (NeedsReview), `signed-updater-contract` (Held).  
- **NÃ£o lista** wgpu/rapier/onnx no manifest â€” esses vivem em `v29-sidecar-lifecycle.ts` como sidecars held (`DEBT-SIDECAR-001`).  
- `validate_native_kernel_manifest` (~117â€“123): sÃ³ `filesystem-watch-contract` e `native-pty-contract` podem ser `Available`.  
- `prohibited_claims`: `"native renderer ready"`, `"background daemon ready"`, etc.

**`lib.rs` test** (~372â€“389): `native_kernel_manifest_blocks_unproven_native_claims` â€” espelha regra acima.

**ContradiÃ§Ã£o documentada:** `DEBT-DESK-006` â€” `native-pty-contract` Available no manifest vs `DEBT-DESK-002` terminal held em `desktop_commands`.

**Impacto user:** Desktop Tauri = WebView + bridge limitado; jobs pesados â†’ `CloudSandbox` (`lib.rs` test ~367). Sidecars wgpu/ffmpeg/onnx sem artefatos na distribuiÃ§Ã£o.

**IMPROVE:** `IMPROVE-DESK-001` (**blocked_by:** `DEBT-SIDECAR-001`, `DEBT-DESK-004`, `DEBT-DESK-005`).

---

### Â§2.28 Batch 4 â€” MCP persistÃªncia (`app/api/mcp/servers/route.ts`)

**Debt (nÃ£o duplicar):** `DEBT-DB-001`, `DEBT-DB-003`.

**CONFIRMED**

- GET ~25â€“46: `(prisma as any).mcpServer?.findMany(...).catch(() => null)` â†’ `servers: []` + `_meta.schemaPending`.  
- POST ~80â€“97: `create` falha â†’ **503** honesto (correÃ§Ã£o parcial vs false 201 em outros paths â€” ver `DEBT-DB-003`).  
- Modelo `McpServer` ausente em `schema.prisma`.

**Impacto:** IntegraÃ§Ã£o MCP â€” core business IA â€” sem persistÃªncia real em produÃ§Ã£o.

---

### Â§2.29 Batch 4 â€” Plano unificaÃ§Ã£o slots (user handoff)

**PadrÃ£o canÃ´nico proposto** (estende `IMPROVE-STUDIO-005/008`):

1. **Headless editors** â€” viewport slot recebe sÃ³ canvas/grafo/timeline tracks; sem sidebars internas.  
2. **`CreativeWorkbenchSlotBridge`** (context/Zustand) â€” `selectedEntity`, `inspectorPanel`, `outlinerTree` derivados do editor ativo.  
3. **Inspector Ãºnico** â€” shell `inspector` prop consome bridge; timeline clip / quest node / sound node / stream session â†’ mesmo painel direito.  
4. **Tool-aware inspector** â€” `FilmStudioClient` switch por `activeTool.id`: `audio`â†’mix compacto, `cinematic`â†’cloud metrics, `director`â†’shot list, defaultâ†’sequence.

**Ordem sugerida pÃ³s-dÃ­vida:** `IMPROVE-STUDIO-008` (bridge) â†’ `IMPROVE-FILM-001/004/005` â†’ `IMPROVE-QUEST-001` â†’ `IMPROVE-STUDIO-005` (level).

---

### Â§2.30 Batch 4 â€” Tabela diagnÃ³stico criativo + infra

| Ãrea | Arquivo | Falha | Gravidade | ID / Debt |
|------|---------|-------|-----------|-----------|
| Audio graph no inspector | `FilmStudioClient` + `SoundCueEditor` | 500px editor em 400px max | ðŸ”´ CrÃ­tico | `IMPROVE-FILM-001/002` |
| Viewport film ocioso | `FilmStudioClient` | DirectorMode placeholder | ðŸ”´ CrÃ­tico | `IMPROVE-FILM-003`, `DEBT-STUDIO-001` |
| Timeline + inspector duplo | `VideoTimelineEditor` + shell | 280px panel em dock 100â€“300px | ðŸ”´ Alto | `IMPROVE-FILM-004` |
| Quest dual inspector | `QuestEditor` + `quest/page` | w-80 + shell inspector | ðŸ”´ Alto | `IMPROVE-QUEST-001` |
| Cinematic context pollution | `CloudStreamStudioClient` + shell | AudioMixInspector irrelevante | ðŸŸ¡ MÃ©dio | `IMPROVE-FILM-005` |
| Rota audio ausente | `app/studio/audio` | SÃ³ redirect via Film | ðŸŸ¡ MÃ©dio | `IMPROVE-STUDIO-009` |
| Tauri native claims | `native_kernel.rs`, sidecars | wgpu/rapier/ffmpeg held | ðŸ”´ Alto (futuro) | `IMPROVE-DESK-001`, `DEBT-SIDECAR-001` |
| MCP persistÃªncia | `mcp/servers/route.ts` | Prisma model missing | ðŸ”´ CrÃ­tico (debt) | `DEBT-DB-001`, `DEBT-DB-003` |

---

## 1.1 Vision 2030 roadmap (Batch 5 â€” strategic north star)

**Source:** [`aethel_vision_2030.md`](./aethel_vision_2030.md) Ã— cÃ³digo atual Ã— paste user 2026-06-17.

**Meta:** Aethel como **motor + IDE que dita regras** â€” nÃ£o seguidor de UE5.6 / Cursor 3.2 / Zed 1.0.

| Pilar | Benchmark | Estado repo (2026-06-17) | IMPROVE spine |
|-------|-----------|--------------------------|---------------|
| **I â€” IDE Agent Runtime** | Cursor 3.2, Zed 1.0 | Chat fragmentado; hash embeddings; policy.rs existe | `IMPROVE-AI-001`â€“`003`, `IMPROVE-IDE-012` |
| **II â€” Render fidelity** | UE 5.6 Lumen/Nanite | Web R3F; wgpu sidecar held | `IMPROVE-ENG-001`â€“`003`, `IMPROVE-DESK-001` |
| **III â€” Distributed collab** | SpatialOS-style | Yjs fallback broken (`DEBT-YJS-001`) | `IMPROVE-COLLAB-001`â€“`002` |
| **IV â€” Generative editors** | Multimodal operators | IA texto lateral; grafos manuais | `IMPROVE-GEN-001`â€“`002` |

**Prerequisite ladder (user handoff â€” ordem executÃ¡vel):**

1. **Infra nativa real** â€” `IMPROVE-DESK-002/003`, `IMPROVE-BRIDGE-001` (PTY, fs emit, loopback IPC)  
2. **Dados reais** â€” `DEBT-DB-001`, `DEBT-RENDER-001` â†’ `IMPROVE-PLATFORM-003/004`  
3. **Shell sem colapso** â€” `IMPROVE-STUDIO-008/010` (slot bridge + Zustand)  
4. **Agent spine** â€” `IMPROVE-AI-001/003` pÃ³s `DEBT-AI-001/012`  
5. **Vision 2030** â€” `IMPROVE-ENG-*`, `IMPROVE-COLLAB-001`, `IMPROVE-GEN-002` (Phase D)

---

### Â§2.31 Batch 5 â€” Pilar I: IDE como Runtime de Agentes (ACP + Cartography + Hybrid)

**AmbiÃ§Ã£o (user):** Multi-agente paralelo; protocolo Ãºnico; indexaÃ§Ã£o semÃ¢ntica contÃ­nua; handoff localâ†”nuvem.

**Estado validado:**

| Componente | Existe | Gap |
|------------|--------|-----|
| `policy.rs` `RuntimeJobLane::AiLocalInference` | **CONFIRMED** | Roteia mas `has_ai_execution_provider` false sem sidecar |
| `probe.rs` | **CONFIRMED** | Hardware probe para decisÃ£o local |
| `repository-cartography.ts` | **CONFIRMED** | Manifest estÃ¡tico; nÃ£o vetorial contÃ­nuo |
| `semantic-code-search.ts` `embedText` | **CONFIRMED** | Hash bag â€” **DEBT-SEARCH-002** |
| `agent-tool-job-runner.ts` | **CONFIRMED** | Cloud runner existe; nÃ£o unificado com ACP |
| Chat fragmentado | **CONFIRMED** | `IMPROVE-IDE-012`, Batch 2 |

**ACP (Agent Client Protocol) â€” especificaÃ§Ã£o alvo:**

- Mensagens estruturadas: `context` | `tool_call` | `patch` | `receipt` | `held`  
- Desktop: canal Rust async (Tokio) + bridge WSS (`IMPROVE-BRIDGE-001`)  
- Cloud: WebSocket governado + mesmo schema JSON  
- Agentes criativos (Quest graph, SoundCue, Niagara) = mesmos contratos que agentes de cÃ³digo  
- Sandbox de execuÃ§Ã£o + patches Monaco/graph apply com receipts (`evaluateAgentReadinessForApply`)

**IndexaÃ§Ã£o vetorial contÃ­nua:**

- `filesystem-watch-contract` (Available) alimenta indexer apÃ³s `IMPROVE-DESK-003`  
- Store local: SQLite-vec ou DeltaDB CRDT leve (user spec)  
- Reindex incremental por path; nÃ£o estourar context window LLM  
- **blocked_by:** embeddings reais (`DEBT-SEARCH-002`), watcher emit (`DEBT-DESK-003`)

**Hybrid execution:**

- Autocomplete/ghost: local ONNX <20ms/token (`IMPROVE-DESK-004`)  
- Multi-file refactor / simulaÃ§Ã£o pesada: `agent-tool-job-runner` â†’ E2B/cloud  
- `resolve_runtime_target(&probe, lane)` Ãºnico ponto de decisÃ£o

**IMPROVE:** `IMPROVE-AI-001`, `IMPROVE-AI-002`, `IMPROVE-AI-003`.

---

### Â§2.32 Batch 5 â€” Pilar II: RenderizaÃ§Ã£o altÃ­ssima fidelidade (WGPU + Splat + DirectStorage)

**Fonte:** `aethel_vision_2030.md` Â§1â€“2.

**Estado:** Zero implementaÃ§Ã£o splat/DirectStorage no repo (grep: sÃ³ docs + terrain splatmap unrelated). `v29-sidecar-lifecycle.ts` lista `wgpu-renderer` held.

**IMPROVE-ENG-001 â€” WGSL unificado:**

- Shader source Ãºnico WGSL  
- Desktop: crate `wgpu` Tauri sidecar  
- Web: `navigator.gpu` WebGPU  
- Acceptance: mesmo frame graph ID; screenshot parity gate entre local e web preview

**IMPROVE-ENG-002 â€” Gaussian Splatting:**

- Pipeline ingest `.ply`/`.splat`  
- Rasterizer GPU (nÃ£o mesh pipeline)  
- Mobile capture â†’ cloud train â†’ asset (`IMPROVE-MOBILE-002`)  
- Storage target: âˆ’90% vs mesh AAA (user claim â€” medir em gate)

**IMPROVE-ENG-003 â€” DirectStorage / GPU decompress:**

- Windows DX12 DirectStorage primeiro; macOS/Linux equivalents documented held  
- Assets encrypted/compressed stream NVMeâ†’VRAM  
- CPU livre para IA/fÃ­sica  
- **Phase D** â€” apÃ³s `IMPROVE-ENG-001` sidecar real

**IMPROVE:** `IMPROVE-ENG-001`â€“`003`; blocked `DEBT-SIDECAR-001`, `IMPROVE-DESK-001`.

---

### Â§2.33 Batch 5 â€” Pilar III: Spatial P2P + CRDT cena

**Spatial P2P mesh (`IMPROVE-COLLAB-001`):**

- CÃ©lulas espaciais; autoridade fÃ­sica no melhor nÃ³ (hardware + RTT)  
- WebRTC data channels entre peers  
- Sem servidor central para fÃ­sica proximidade  
- Reduz custo cloud MMO (vision 2030 Â§3)

**CRDT cena (`IMPROVE-COLLAB-002`):**

- ExtensÃ£o Yjs/DeltaDB para transforms 3D, graph edges, propriedades inspector  
- Designers simultÃ¢neos no viewport  
- **Prerequisite fix:** `DEBT-YJS-001` (`Y.applyUpdate` no servidor)  
- Alinha com multiplayer editor na Web (`15_MOBILE_COMPANION` workbench continuity)

**IMPROVE:** `IMPROVE-COLLAB-001` (D), `IMPROVE-COLLAB-002` (C).

---

### Â§2.34 Batch 5 â€” Pilar IV: IA gerativa acoplada aos editores

**IMPROVE-GEN-001 â€” Operador visual de grafos:**

- Exemplo user: *"eco tÃºnel metÃ¡lico passos robÃ´"* â†’ `SoundCueEditor` instancia Delay/Reverb/Spatialization, fia, ajusta attenuation  
- Mesmo para `QuestEditor` (missÃµes ramificadas) e grafos fÃ­sica/VFX  
- Requer `IMPROVE-STUDIO-008` headless + ACP (`IMPROVE-AI-001`)  
- UI: prompt no inspector slot ou inline no grafo â€” nÃ£o sÃ³ chat lateral

**IMPROVE-GEN-002 â€” Neural audio/VFX synthesis:**

- Runtime sintetizador neural GPU/NPU  
- Positional 3D audio procedural  
- Elimina bibliotecas `.ogg` estÃ¡ticas massivas (vision Â§4)  
- **Phase D** â€” research + held manifest atÃ© evidence

**IMPROVE:** `IMPROVE-GEN-001`, `IMPROVE-GEN-002`.

---

### Â§2.35 Batch 5 â€” Desktop native spine (placebos â†’ produÃ§Ã£o)

**CONFIRMED** â€” alinha `DEBT-DESK-002/003/004` com spec executÃ¡vel.

#### A. Terminal PTY real (`IMPROVE-DESK-002`)

- Hoje: `TerminalSessionStore::create_held` (~55), `write_held` (~74) â€” **sem shell spawn**  
- Alvo: `portable-pty` â†’ PowerShell/zsh/bash  
- Threads: reader stdout â†’ `window.emit("aethel:pty-data")`; writer stdin â† xterm.js  
- PadrÃ£o Zed

#### B. fs_watch reativo (`IMPROVE-DESK-003`)

- Hoje: `Ok(_event) => {}` (~277); comentÃ¡rio "full implementation would emit" (~265)  
- Alvo: `FileChangeEventPayload { path, kind }` â†’ `aethel://file-system-event`  
- Frontend: `@tauri-apps/api/event` `listen` â†’ `triggerAssetRefresh`  
- PadrÃ£o Cursor external edit detection

#### C. IA local ONNX (`IMPROVE-DESK-004`)

- Hoje: `ai_complete` â†’ `provider_unavailable` (~360â€“366)  
- Alvo: `ort` + GGUF Int4; `probe.rs` NPU/CUDA/DirectML  
- Ghost text <20ms; privacidade offline  
- **blocked_by:** `DEBT-SIDECAR-001`, sidecar approval gate

---

### Â§2.36 Batch 5 â€” Aethel Bridge IPC (Web consome kernel local)

**IMPROVE-BRIDGE-001** â€” especificaÃ§Ã£o user (JSON-RPC 2.0 sobre WSS):

| Etapa | Comportamento |
|-------|---------------|
| Boot Tauri | WSS loopback porta efÃªmera 49152â€“65535 |
| Auth | SCT 24h no Credential Manager / Keychain |
| Handshake | Web IDE descobre porta + envia SCT HTTPOnly |
| Methods | `aethel.fs.watch`, `aethel.pty.create`, `aethel.compile.*`, push `aethel.fs.onChanged` |
| Payload exemplo | User paste Batch 5 â€” preservado como contrato alvo |

**ValidaÃ§Ã£o:** Bridge **nÃ£o existe** hoje; Web e Local sÃ£o superfÃ­cies desconectadas exceto Tauri invoke direto.

**DependÃªncias:** `IMPROVE-DESK-002/003` antes de bridge Ãºtil.

---

### Â§2.37 Batch 5 â€” TrÃªs janelas, um Workspace (`IMPROVE-PLATFORM-001`)

**Blueprint:** [`15_MOBILE_COMPANION.md`](../../AETHEL_INTERFACE_BLUEPRINTS/15_MOBILE_COMPANION.md) â€” mobile **nÃ£o** Ã© IDE comprimida.

| SuperfÃ­cie | Papel | Capacidades alvo |
|------------|-------|------------------|
| **IDE Local** (Tauri) | Autoridade hardware | PTY, ONNX, wgpu, fs watch, compilaÃ§Ã£o |
| **IDE Web** (Next.js) | ColaboraÃ§Ã£o + governanÃ§a | Pixel streaming, Yjs, approvals, corporate |
| **Mobile Companion** | Continuidade + capture | Approvals, splat attach, vibe-coding lite |

**Regra:** Uma sessÃ£o `workspaceId` â€” trÃªs viewports do mesmo estado (`IMPROVE-PLATFORM-002`).

---

### Â§2.38 Batch 5 â€” Cross-Device Continuity Contract (`IMPROVE-PLATFORM-002`)

**Payload canÃ´nico `AethelWorkspaceState` (user spec):**

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

| DireÃ§Ã£o | Trigger | Transport |
|---------|---------|-----------|
| Local â†’ Cloud | 30s idle / lock / close | `PUT /api/session/state` â†’ Redis |
| Cloud â†’ Mobile | App open | GET last state â†’ "Continueâ€¦" card |
| Mobile â†’ Local | Approval / prompt | WS mutation â†’ desktop hot reload |

**Estado hoje:** Sem endpoint `/api/session/state` unificado documentado; Redis usado em `queue-system.ts` opcional.

**IMPROVE:** `IMPROVE-PLATFORM-002`; mobile flows `IMPROVE-MOBILE-001`â€“`003`.

---

### Â§2.39 Batch 5 â€” Mobile Companion flows

**IMPROVE-MOBILE-001 â€” Gated Approvals:**

- Semantic impact diff (nÃ£o syntax no phone)  
- Risk tier + CI receipt badge  
- Swipe approve/reject â†’ mutates workspace state  
- Alinha `IMPROVE-IDE-011` (Approvals > Runs > Plan > Chat)

**IMPROVE-MOBILE-002 â€” Photogrammetry â†’ Splat:**

- Pipeline user: Camera â†’ multipart upload â†’ cloud GPU train ~3min â†’ `.splat` â†’ sync `IDE Local` asset browser  
- Depende `IMPROVE-ENG-002`

**IMPROVE-MOBILE-003 â€” AI Composer Lite:**

- Voz/texto intenÃ§Ã£o alta nÃ­vel  
- Cloud executor + compressed video preview no device  
- NÃ£o substitui Workbench â€” avanÃ§a sessÃ£o (`15_MOBILE_COMPANION` rule)

---

### Â§2.40 Batch 5 â€” Medula de dados + render queue real

**Debt first:** `DEBT-DB-001`, `DEBT-RENDER-001`, `DEBT-DB-002`, `DEBT-DB-003`.

**Schema canÃ´nico (user spec â€” acceptance for `IMPROVE-PLATFORM-003`):**

- `McpServer` â€” id, userId, name, endpoint, transport, status, lastSeenAt  
- `RenderJob` â€” id, projectId, requestedBy, status, progress, provider, resolution, fps, codec, outputUrl, receiptRef

**Pipeline alvo (`IMPROVE-PLATFORM-004`):**

```
POST /api/exports/mp4 â†’ prisma.renderJob.create(queued)
  â†’ redis/BullMQ aethel:render-queue
  â†’ branch: local-native (Tauri bridge FFmpeg/wgpu) | cloud-sandbox (GPU container)
  â†’ S3 upload â†’ prisma completed + outputUrl
```

**Estado hoje:**

- `schema.prisma`: **sem** `McpServer` / `RenderJob` (grep negativo)  
- Export routes: 202 receipt stub (`DEBT-RENDER-001`)  
- `queue-system.ts`: BullMQ **opcional** â€” nÃ£o wired em exports

---

### Â§2.41 Batch 5 â€” Store unificada + prioridades prÃ¡ticas

**CorreÃ§Ã£o nomenclatura:**

- User citou `workbench-store.ts` â€” **nÃ£o existe**.  
- Existe `components/ide/fullscreen/stores/workbenchUiStore.ts` (Zustand) â€” **sÃ³ IDE panels**.  
- `CreativeWorkbenchShell` nÃ£o tem store compartilhada â€” causa painÃ©is duplicados (Batches 3â€“4).

**IMPROVE-STUDIO-010:**

- `creativeWorkbenchStore` (novo) ou extensÃ£o de `workbenchUiStore`  
- Campos: `selectedEntity`, `inspectorContent`, `outlinerTree`, `activeToolId`  
- Consumido por `FilmStudioClient`, `level/page`, `QuestEditor` via `IMPROVE-STUDIO-008` bridge  
- Previne colapso 4 sidebars + SoundCue no inspector 400px

**Prioridades user (prÃ³xima fase dev) â€” mapeadas:**

| # | User priority | IMPROVE / DEBT |
|---|---------------|----------------|
| 1 | Sidecars GPU/FÃ­sica `native_kernel.rs` | `IMPROVE-DESK-001`, `DEBT-SIDECAR-001` |
| 2 | Zustand unificada shell | `IMPROVE-STUDIO-010`, `IMPROVE-STUDIO-008` |
| 3 | MigraÃ§Ã£o McpServer | `DEBT-DB-001`, `IMPROVE-PLATFORM-003` |
| 4 | PTY + fs_watch (antes DirectStorage) | `IMPROVE-DESK-002/003` |
| 5 | Bridge IPC | `IMPROVE-BRIDGE-001` |
| 6 | Render queue real | `IMPROVE-PLATFORM-004` |

---

### Â§2.42 Batch 5 â€” Tabela diagnÃ³stico visÃ£o vs cÃ³digo

| AmbiÃ§Ã£o Vision 2030 | CÃ³digo hoje | Gap | ID |
|---------------------|-------------|-----|-----|
| Multi-agent runtime | Chat fragmentado | Alto | `IMPROVE-AI-001` |
| Semantic index contÃ­nuo | Hash embeddings, 120 file cap | Alto | `IMPROVE-AI-002`, `DEBT-SEARCH-002/003` |
| Local ONNX autocomplete | `provider_unavailable` | Alto | `IMPROVE-DESK-004` |
| WGSL 1:1 web/desktop | wgpu sidecar held | Alto | `IMPROVE-ENG-001` |
| Gaussian Splatting | Docs only | Total | `IMPROVE-ENG-002` |
| DirectStorage | NÃ£o iniciado | Total | `IMPROVE-ENG-003` |
| Spatial P2P MMO | NÃ£o iniciado | Total | `IMPROVE-COLLAB-001` |
| Scene CRDT | Yjs broken | Alto | `IMPROVE-COLLAB-002`, `DEBT-YJS-001` |
| IA opera grafos | Manual only | Alto | `IMPROVE-GEN-001` |
| Neural audio runtime | NÃ£o iniciado | Total | `IMPROVE-GEN-002` |
| Terminal nativo | `create_held` placebo | CrÃ­tico | `IMPROVE-DESK-002`, `DEBT-DESK-002` |
| fs_watch â†’ UI | Eventos engolidos | CrÃ­tico | `IMPROVE-DESK-003`, `DEBT-DESK-003` |
| Webâ†”Local bridge | NÃ£o existe | Alto | `IMPROVE-BRIDGE-001` |
| 3-surface workspace | Fragmentado | Alto | `IMPROVE-PLATFORM-001/002` |
| Mobile approvals | Blueprint only | MÃ©dio | `IMPROVE-MOBILE-001` |
| McpServer/RenderJob DB | Schema ausente | CrÃ­tico (debt) | `DEBT-DB-001`, `DEBT-RENDER-001` |
| BullMQ render | Opcional nÃ£o wired | Alto | `IMPROVE-PLATFORM-004` |

---

### Â§2.43 Batch 6 â€” Honesty-first: onde a Unreal Ã© inalcanÃ§Ã¡vel (hoje)

**PrincÃ­pio canÃ´nico (`IMPROVE-QUALITY-002`):** Aethel **nÃ£o** compete em renderizaÃ§Ã£o clÃ¡ssica de trilhÃµes de polÃ­gonos no curto prazo. Marketing e arquitetura devem refletir isso.

| Tecnologia UE 5.6 | Por que inalcanÃ§Ã¡vel na Web/Tauri hoje | Postura Aethel |
|-------------------|----------------------------------------|----------------|
| **Nanite** | Virtualized geometry + SW rasterizaÃ§Ã£o; WebGPU sem driver low-level | NÃ£o perseguir; **3DGS** como formato primeira classe |
| **Lumen** | RT hÃ­brido + denoisers proprietÃ¡rios | NÃ£o prometer GI foto-real browser sem held manifest |
| **Chaos physics** | DÃ©cadas C++ cloth/destruction/IK | Rapier WASM/sidecar â€” escopo honesto |
| **R3F/Three.js** | ~15M tri nÃ£o otimizados engasgam (user claim) | ECS bake + GPU compute; nÃ£o hero mesh count |

**Gargalos reais de IA generativa 3D (anti-alucinaÃ§Ã£o):**

- Topologia amorfa (Tripo3D/LGM/InstantMesh) â€” sem UV/quads/rig utilizÃ¡veis  
- LatÃªncia difusÃ£o 3D: 10â€“60s/modelo H100; cidade inteira = horas  
- **Regra:** IA **nÃ£o** inventa malhas AAA; IA **orquestra** assets existentes

**IMPROVE:** `IMPROVE-QUALITY-002` â€” manifesto de produto + gates de marketing.

---

### Â§2.44 Batch 6 â€” EstratÃ©gia de superioridade real (trÃªs moats)

```
         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
         â”‚     AETHEL VALUE FOCUS (moat)     â”‚
         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
    â–¼                    â–¼                    â–¼
 USD Integrator      3DGS First-Class     Agent-First IDE
 (IMPROVE-AI-004)    (IMPROVE-ENG-002)    (IMPROVE-AI-001,
                                           IMPROVE-VS-010,
                                           IMPROVE-ENG-006)
```

**A. Ponte de Assets USD (`IMPROVE-AI-004`):**

- User: "Monte vilarejo medieval costeiro"  
- IA escreve `.usda` referenciando biblioteca (Megascans/Sketchfab/internal)  
- Posiciona, rotaciona, escala â€” **nÃ£o** modela casas do zero  
- Estado: `openusd-tools` em `runtime-engine-spine.ts` metadata; export `usdz` stub (`DEBT-RENDER-001`)

**B. Gaussian Splatting (`IMPROVE-ENG-002` reforÃ§ado):**

- Foto-realismo capturado; render WebGPU rÃ¡pido; 60fps mobile target  
- UE ignora splats em favor Nanite â€” janela de diferenciaÃ§Ã£o

**C. LÃ³gica Agent-First (`IMPROVE-ENG-006`, `IMPROVE-VS-010`):**

- Rust â†’ WASM compile ms vs UE C++/Blueprint compile  
- Cursor/Zed-class IDE + agentes no mesmo runtime (`IMPROVE-AI-001`)

---

### Â§2.45 Batch 6 â€” TrÃªs frentes: engenharia de alta qualidade

#### IDE Local (Powerhouse)

| Frente | Spine ID | Estado | SoluÃ§Ã£o |
|--------|----------|--------|---------|
| WGPU overlay | B51 | WebView gargalo | `IMPROVE-ENG-004` child HWND + anchor |
| VS JIT WASM | F6, M69 | JS `runtime-core/executors.ts` | `IMPROVE-VS-010` |
| Rust VFS | F2 | HTTP/Prisma para assets | `IMPROVE-DESK-005` Sled/RocksDB |

#### IDE Web (Orquestrador)

| Frente | Spine ID | Estado | SoluÃ§Ã£o |
|--------|----------|--------|---------|
| ECS bake | U57, B52 | OOP hierarchy play lag | `IMPROVE-ENG-005` SharedArrayBuffer |
| Visual evidence | 41 | `task-evidence-ledger.ts` existe | `IMPROVE-AI-008` headless 60f GIF |
| ReactFlow editors | Batches 3â€“4 | Slot collapse | `IMPROVE-STUDIO-008` |

#### Mobile Companion (Gateway)

| Frente | Spine ID | Estado | SoluÃ§Ã£o |
|--------|----------|--------|---------|
| Tree-sitter RAG | 44 | `deep-context-manager.ts` ~277 LoC (spine doc outdated) | `IMPROVE-AI-007` AST slice |
| Multimodal bypass | I70 | NÃ£o implementado | `IMPROVE-AI-005/006` |
| Approvals | 15_MOBILE | Blueprint | `IMPROVE-MOBILE-001` |

---

### Â§2.46 Batch 6 â€” CanvasViewportSurface placebo â€” CONFIRMED

```10:16:meu-repo/cloud-web-app/web/components/preview/CanvasViewportSurface.tsx
const NexusCanvasV2 = ({ renderMode }: { renderMode: 'draft' | 'cinematic' }) => (
  <div className="flex h-full w-full items-center justify-center ...">
    Canvas mode (Nexus) deprecated.
```

- Shell `ViewportWorkbenchShell` monta outliner/properties/timeline reais  
- **Centro** = string estÃ¡tica â€” zero WebGL/WebGPU  
- **Alvo:** `NativeViewportAnchor` (B51) ou splat renderer (`IMPROVE-VIEW-001`)

---

### Â§2.47 Batch 6 â€” Visual Script JIT Compiler spec (Frente 6 + M69)

**Estado:** `lib/visual-script/runtime-core/` interpreta nÃ³s em JS main thread â€” **CONFIRMED**.

**Contrato grafo (user spec â€” acceptance `IMPROVE-VS-010`):**

- `VisualScriptGraph` JSON: nodes, edges, `portType: exec|boolean|number|string|vector3|object`  
- Compilador Rust: DAG â†’ ordenaÃ§Ã£o topolÃ³gica (Kahn/Tarjan) â†’ abort em ciclos de dados  
- MemÃ³ria linear WASM: faixas Global/Float/String/Vector/Object refs (offsets estÃ¡ticos)  
- Codegen: `wasm-encoder` â€” `math_add` â†’ f64 load/add/store; `action_move_actor` â†’ `Call(SYSTEM_CALL_MOVE_ACTOR)`  
- Syscalls `aethel_sys`: `spawn_actor`, `set_actor_velocity`, `play_sound_cue` via wasmer (desktop) / import object (web)  
- Tick: `instance.exports.on_tick()` em `requestAnimationFrame`

**RelaÃ§Ã£o:** Supersedes detalhe de `IMPROVE-VS-008`; blocked `DEBT-UX-VS-001` para save validation.

---

### Â§2.48 Batch 6 â€” WGPU Overlay B51 (arquitetura)

**Fluxo (user mermaid preservado):**

1. React `NativeViewportAnchor` + `ResizeObserver`  
2. `getCurrentWebviewWindow().emit('aethel://viewport-bounds-changed', {x,y,w,h})`  
3. Rust `setup_viewport_overlay` reposiciona child surface  
4. `wgpu_renderer::resize_overlay` â€” render direto GPU  

**Escopo:** Desktop Tauri **only** â€” Web mantÃ©m R3F/WebGPU (`audit_backend_spine` B51 aviso).

**IMPROVE:** `IMPROVE-ENG-004` + `IMPROVE-VIEW-001`.

---

### Â§2.49 Batch 6 â€” ECS Scene Bake U57/B52

**Design mode:** OOP scene graph â€” user move/inspect  
**Play mode:** Bake â†’ `Float32Array` stride 10 (pos, rot quat, scale) em `SharedArrayBuffer`  
**Consumers:** Rapier3D worker + WebGPU compute â€” batch update, zero GC pressure  

**IMPROVE:** `IMPROVE-ENG-005`; alinha Niagara compute U56 (futuro).

---

### Â§2.50 Batch 6 â€” Multimodal Bypass I70

**Video-to-mechanic (`IMPROVE-AI-005`):**

- Upload vÃ­deo 5s â†’ vision-agent â†’ parÃ¡bola fÃ­sica â†’ nÃ³s VS com valores extraÃ­dos  
- NÃ£o gera cÃ³digo linha-a-linha para mecÃ¢nica

**Asset morphing (`IMPROVE-AI-006`):**

- Download asset library quality â†’ morph vÃ©rtices + material shaders  
- "Casa abandonada" = musgo/rachadura shader â€” nÃ£o remesh IA

**Project scanning (I70 spine):** ripgrep + AST â€” cross-ref `DEBT-SEARCH-*`, `IMPROVE-AI-007`

---

### Â§2.51 Batch 6 â€” Plugins WASI wasmtime (`IMPROVE-PLATFORM-005`)

**Problema:** `DEBT-EXT-001` â€” `vm` + native `require` nÃ£o Ã© boundary segura.

**SoluÃ§Ã£o Aethel (user spec):**

| Camada | Detalhe |
|--------|---------|
| Runtime | `wasmtime` + `wasmtime_wasi` |
| Sandbox | preopened_dir = project folder only |
| Limits | fuel 100_000_000; heap 128MB; epoch interruption |
| Install | `install/route.ts` â†’ signature SHA256 â†’ VFS Sled (`IMPROVE-DESK-005`) |
| APIs | `aethel_editor.insert_text`, `aethel_renderer.trigger_preview_bake` |
| Resilience | R64 Let-it-crash â€” plugin trap nÃ£o derruba IDE; `ErrorBoundary` + disable plugin |

**RelaÃ§Ã£o:** `IMPROVE-IDE-015` = UI catÃ¡logo; `IMPROVE-PLATFORM-005` = runtime; `DEBT-PLUGIN-001` = cloud persist.

---

### Â§2.52 Batch 6 â€” Tabela diagnÃ³stico honesty + spine

| Ãrea | Realidade | Moat correto | ID |
|------|-----------|--------------|-----|
| vs UE polygons | Perdemos | NÃ£o prometer | `IMPROVE-QUALITY-002` |
| IA gera mundo AAA | AlucinaÃ§Ã£o | USD compose | `IMPROVE-AI-004` |
| Neural mesh gen | Amorfo/lento | Morph + library | `IMPROVE-AI-006` |
| Canvas viewport | Texto deprecated | WGPU/splat | `IMPROVE-VIEW-001`, `IMPROVE-ENG-004` |
| VS interpret JS | LatÃªncia | JIT WASM | `IMPROVE-VS-010` |
| Plugins vm | RCE risk | WASI wasmtime | `IMPROVE-PLATFORM-005`, `DEBT-EXT-001` |
| Evidence AI 3D | Ledger sem visual | Headless WebM | `IMPROVE-AI-008` |
| Mobile vibe-coding | Token blowup | Tree-sitter slice | `IMPROVE-AI-007` |
| Game compile speed | â€” | Rust/WASM ms | `IMPROVE-ENG-006` |

---

### Â§2.53 Batch 7 â€” Competitive parity thesis (Manus / Perplexity / Gemini Live)

**User intent (2026-06-17):** Abandonar chat estÃ¡tico; evoluir para plataforma de **agentes multimodais com orquestraÃ§Ã£o paralela e voz em tempo real** â€” paridade de elite vs Manus (navegaÃ§Ã£o autÃ´noma), Perplexity (RAG alta fidelidade), Gemini Live / OpenAI Realtime (conversaÃ§Ã£o full-duplex).

**TrÃªs frentes do paste:**

| Frente | Competidor | Lacuna Aethel (cÃ³digo) | ID alvo |
|--------|------------|------------------------|---------|
| Pesquisa + browser autÃ´nomo | Manus | `AethelResearch.tsx` mock; recorder sem headless | `IMPROVE-AI-009` |
| RAG dinÃ¢mico | Perplexity | Tavily em `ai-web-tools.ts` isolado do painel | `IMPROVE-AI-010` |
| Voz live + barge-in | Gemini Live / OpenAI Realtime | `useVoiceRecording` walkie-talkie; `LiveConversationPanel` texto | `IMPROVE-AI-011` |
| Squad multitarefa | Cursor/Codex parallel | Tool bus + contract existem; UI paralela bÃ¡sica | `IMPROVE-AI-012` |
| Cancel jobs ativos | â€” | `JOB_ACTIVE_CANNOT_CANCEL` 409; Tauri sem SIGKILL | `IMPROVE-PLATFORM-006` |
| Export GLB real | â€” | `glb/route.ts` receipt stub | `IMPROVE-PLATFORM-007` |

**Hard gate:** `npm run qa:enterprise-gate` PASS + `DEBT-RENDER-001` / `DEBT-AI-001` resolvidos antes de marketing "agentic-first platform".

---

### Â§2.54 Batch 7 â€” Research & autonomous web (`AethelResearch.tsx`)

**CONFIRMED â€” mock manus-grade UI, nÃ£o operador real:**

| EvidÃªncia | Arquivo | Detalhe |
|-----------|---------|---------|
| Fontes estÃ¡ticas | `components/nexus/AethelResearch.tsx` ~36â€“61 | `PRESET_SOURCES` fixo (Cursor docs, OpenAI Realtime, Gemini Live) â€” **nÃ£o** depende da query |
| Busca instantÃ¢nea | ~109â€“123 | `handleSearch` seta `status: 'complete'` sÃ­ncrono; summary admite "benchmark pack" |
| Spine held | ~89â€“106 | `buildResearchRuntimeSpinePlan({ browserReplayEnabled: false, artifactPersistenceEnabled: false })` |
| Take over placebo | ~154â€“159 | `handleOperatorControl('takeover')` â†’ mensagem "held until live browser replay session" |
| MÃ³dulos Held | ~286â€“310 | Cards Browser replay / Artifacts / Cost = "Held" / "Review" |
| Marker gate | ~165 | `data-research-workspace="manus-grade"` â€” spine de mercado, nÃ£o capability |

**PARTIAL â€” infraestrutura replay/policy (nÃ£o headless):**

| EvidÃªncia | Arquivo | Detalhe |
|-----------|---------|---------|
| Recorder in-memory | `lib/server/browser-operator-recorder.ts` ~65 | `const runs = new Map<string, BrowserOperatorRun>()` â€” aceita steps via POST, policy via `browser-operator-safety` |
| Replay UI | `components/agents/BrowserOperatorReplay.tsx` | Take over/pause/approve â†’ `/api/agents/browser-operator/runs/[runId]` |
| Tool bus | `lib/production/agent-tool-bus.ts` | `AgentMode: 'Browser Operator'`; `runtimeTargets: 'browser-operator'`; `evaluateBrowserOperatorPolicy` |
| **Ausente** | repo grep | Zero Puppeteer/Playwright **orquestraÃ§Ã£o de agente** em produÃ§Ã£o (Playwright sÃ³ QA visual regression) |

**EspecificaÃ§Ã£o alvo (`IMPROVE-AI-009`):**

```
[Research query]
      â”‚
      â–¼
[Nexus Orchestrator] â”€â”€â–º [Browser Operator Agent]
      â”‚                         â”‚
      â”‚                         â–¼
      â”‚              [Headless Playwright/Puppeteer]
      â”‚              cloud sandbox OR Tauri sidecar
      â”‚                         â”‚
      â–¼                         â–¼
[Dynamic RAG IMPROVE-AI-010]   [Step stream + screenshots]
      â”‚                         â”‚
      â””â”€â”€â”€â”€â”€â”€â”€â”€â–º [BrowserOperatorReplay] â—„â”€â”€ Take over (human control)
                         â”‚
                         â–¼
              [task-evidence-ledger.ts]
```

**Acceptance:**

- Query em `AethelResearch` dispara run real (nÃ£o `PRESET_SOURCES`)
- Take over em `AethelResearch` **e** `BrowserOperatorReplay` abre sessÃ£o controlÃ¡vel (nÃ£o toast "held")
- Progresso navegaÃ§Ã£o (URL, screenshot, intent) stream para IDE em tempo real
- CAPTCHA bÃ¡sico: held gate + human takeover â€” nÃ£o bypass silencioso
- Cross-ref: `IMPROVE-AI-001` ACP, `IMPROVE-AI-008` evidÃªncia visual, `browser-operator-safety.ts`

---

### Â§2.55 Batch 7 â€” Dynamic RAG pipeline (`IMPROVE-AI-010`)

**CONFIRMED â€” busca web existe, painel research nÃ£o consome:**

| EvidÃªncia | Arquivo | Detalhe |
|-----------|---------|---------|
| Tavily/Serper | `lib/ai-web-tools.ts` ~33â€“155 | `searchTavily`, fallback Serper/DuckDuckGo; requer `TAVILY_API_KEY` |
| Types | `lib/ai-web-tools.types.ts` | `TavilySearchResponse` |
| CSP | `middleware.ts` | `connect-src` inclui `api.tavily.com` |
| Research panel | `AethelResearch.tsx` | **NÃ£o importa** `ai-web-tools`; credibility hardcoded em preset |
| Ledger | `lib/production/task-evidence-ledger.ts` | `browser-replay`, `source-citation` evidence slots; gate `evaluateTaskEvidenceReadiness` |
| Handoff | `lib/research-handoff.ts` | Copy prompt / Open in IDE â€” Ãºtil pÃ³s-RAG real |

**Ausente vs Perplexity-grade:**

- Exa.ai (user spec) â€” nÃ£o referenciado no repo
- Credibility scoring dinÃ¢mico (hoje % fixo no preset)
- Parse/extract de trechos em tempo de execuÃ§Ã£o ligado ao ledger do projeto
- PersistÃªncia de evidÃªncias de pesquisa no `task-evidence-ledger-store.ts`

**Pipeline alvo:**

1. Query â†’ `deep-research` / `source-citation` tools no `agent-tool-bus`
2. Runtime fetch Tavily (+ Exa opcional) â†’ normalize `SearchResult[]`
3. Chunk + relevance score + domain credibility heuristics (nÃ£o constantes)
4. Append `source:*` + `credibility:*` refs ao ledger; `saveResearchHandoff` sÃ³ apÃ³s review
5. UI: substituir `PRESET_SOURCES` por fontes reais com spinner honesto atÃ© dados chegarem

**Blocked by:** `DEBT-SEARCH-002` (embeddings hash bag); melhora independente do browser operator mas sinergiza com `IMPROVE-AI-009`.

---

### Â§2.56 Batch 7 â€” Live conversational mode (`useVoiceRecording.ts`, `LiveConversationPanel.tsx`)

**CONFIRMED â€” walkie-talkie, nÃ£o full-duplex:**

| EvidÃªncia | Arquivo | Detalhe |
|-----------|---------|---------|
| GravaÃ§Ã£o | `useVoiceRecording.ts` ~80â€“140 | `MediaRecorder` â†’ WebM blob â†’ `onstop` â†’ `POST /api/ai/voice/transcribe` |
| LatÃªncia | fluxo | Start â†’ fala â†’ stop â†’ upload â†’ JSON â€” **3â€“5s** tÃ­pico (user spec) |
| SpeechRecognition | ~84â€“107 | Paralelo opcional (interim) â€” ainda exige ciclo start/stop |
| Live panel UI | `LiveConversationPanel.tsx` ~26â€“28 | ComentÃ¡rio "Gemini-Live-style"; `isLiveSpeaking` **hardcoded** `useState(false)` |
| Composer | ~65â€“108 | Textarea + Send â€” **sem** microfone streaming, **sem** WebRTC |
| Activity deck | `AIChatActivityDeck.tsx` | `consoleMode === 'live'` monta panel; interrupt button only |
| Spine doc | `UX_MARKET_STANDARD_SPINE.md` | Exige barge-in, native-audio readiness â€” UI nÃ£o implementa |

**Arquitetura alvo (`IMPROVE-AI-011`):**

```
[User Mic] â”€â”€â–º PCM 16/24kHz chunks (~100ms)
      â”‚
      â–¼
[Client: WebRTC AudioTrack / WebSocket]
      â”‚
      â–¼
[Gemini Live / OpenAI Realtime Gateway]
      â”‚â—„â”€â”€ Agent processing (tools, file edits, viewport)
      â–¼
[Opus audio stream] â”€â”€â–º [AudioContext player] â”€â”€â–º Speaker
      â–²
      â””â”€â”€ Barge-in: VAD on mic while AI speaking â†’ stop playback + cancel pending TTS buffer
```

**Requisitos de aceitaÃ§Ã£o:**

- ConexÃ£o live permanece aberta em background durante runs paralelos (`IMPROVE-AI-012`)
- Barge-in <200ms perceived: cortar `AudioContext`, sinalizar cancel na cloud
- Transcript bidirecional visÃ­vel (compact lane per `UX_MARKET_STANDARD_SPINE`)
- Substituir ou coexistir com `useVoiceRecording` â€” nÃ£o quebrar fallback HTTP quando Realtime indisponÃ­vel (503 honesto)
- Cross-ref: `IMPROVE-AI-001` ACP WSS; `AethelProvider.tsx` `RealtimeMessage` WebSocket existe mas nÃ£o Ã© Ã¡udio duplex

---

### Â§2.57 Batch 7 â€” Nexus squad & Activity Deck (`IMPROVE-AI-012`)

**PARTIAL â€” contratos e bus existem; orquestraÃ§Ã£o paralela observÃ¡vel incompleta:**

| EvidÃªncia | Arquivo | Detalhe |
|-----------|---------|---------|
| Tool bus | `lib/production/agent-tool-bus.ts` | `AgentMode`: Coordinator, Research, Builder, Creative, QA, Browser Operator, Release |
| Work contract | `lib/production/parallel-agent-work-contract.ts` | Lanes: research, software, validation, browser-operator; tools: `test-runner`, `deep-research`, `browser-operator`, `render-validate` |
| Job runner | `lib/production/agent-tool-job-runner.ts` | Importa bus + ledger; dispatch async |
| Fleet session | `lib/production/agent-fleet-session.ts` | Coordinator-first; "parallel agents aligned without noisy control room" |
| Activity UI | `AIChatActivityDeck.tsx` | `AgentBoard` sÃ³ se `agentCount > 1`; `RunCard` single run; **nÃ£o** feed horizontal multi-agente contÃ­nuo |
| Local bridge | `lib/device/local-runtime-bridge.ts` | `maxParallelAgents` policy 1â€“6 |

**Squad alvo (user spec):**

```
[Nexus Orchestrator]
        â”œâ”€â–º Research Agent     â†’ IMPROVE-AI-009/010
        â”œâ”€â–º Software Engineer  â†’ diff-proposal, file-read, shader-compile
        â””â”€â–º QA & Test Agent    â†’ test-runner, render-validate, playtest-runner
              â–²
              â””â”€â”€ agent-tool-bus.ts (shared dispatch)
```

**Activity Deck alvo:**

- Feed horizontal scrollÃ¡vel: cada agente = card com lane, tool ativo, ETA, interrupt/pause
- UsuÃ¡rio injeta observaÃ§Ãµes por voz (`IMPROVE-AI-011`) ou texto sem parar runs
- QA dispara quando Builder commita â€” via bus, nÃ£o LLM monolÃ­tica

**Blocked by:** `DEBT-AI-001` (chat fragmentado), `IMPROVE-AI-001` (ACP unificado).

---

### Â§2.58 Batch 7 â€” Job cancel channel (`cancel/route.ts`) & GLB export (`glb/route.ts`)

#### Cancelamento bidirecional (`IMPROVE-PLATFORM-006`)

**CONFIRMED â€” jobs ativos nÃ£o cancelÃ¡veis:**

| EvidÃªncia | Arquivo | Detalhe |
|-----------|---------|---------|
| HTTP 409 | `app/api/render/jobs/[jobId]/cancel/route.ts` ~75â€“83 | `ACTIVE_STATES` = rendering/processing/running/active â†’ `JOB_ACTIVE_CANNOT_CANCEL` |
| Capability | ~8 | `RENDER_JOB_CANCEL` status `PARTIAL` â€” honesto no cÃ³digo |
| BullMQ | `lib/queue-system.ts` ~322â€“323 | `state === 'active'` â†’ mesmo reason |
| Tauri cancel | `apps/studio-local/src-tauri/src/jobs.rs` ~112â€“121 | `cancel()` sÃ³ `job.state = Cancelled` â€” **sem** `child.kill()` |
| Tauri command | `main.rs` ~154 | `jobs_cancel` exposto; `daemon.rs` POST `/jobs/{id}/cancel` |
| Native kernel | `native_kernel.rs` ~75 | Blocker: "persistent crash recovery receipts not written yet" |

**EspecificaÃ§Ã£o (user paste, validada):**

```
POST /api/render/jobs/[jobId]/cancel
        â”‚
        â”œâ”€â–º prisma.renderJob.status = cancelled
        â”œâ”€â–º redis.publish(`aethel:job-cancel:${jobId}`, { action: 'SIGINT' })
        â”‚
        â”œâ”€â–º [Cloud GPU worker] kill ffmpeg / blender-headless container
        â””â”€â–º [Tauri WSS bridge] â†’ child_process.kill() on WGPU/FFmpeg sidecar
```

**Nota:** NÃ£o hÃ¡ `DEBT-*` dedicado â€” limitaÃ§Ã£o documentada como capability PARTIAL. Resolver junto com `IMPROVE-PLATFORM-004` render queue real.

#### Export GLB (`IMPROVE-PLATFORM-007`)

**CONFIRMED â€” receipt stub:**

| EvidÃªncia | Arquivo | Detalhe |
|-----------|---------|---------|
| Stub | `app/api/exports/glb/route.ts` ~30â€“42 | `jobId` sintÃ©tico; `_pending: 'lib/render-farm/providers not yet wired'`; 202 |
| Debt | `DEBT-RENDER-001`, `DEBT-RENDER-002` | Prisma `RenderJob` ausente; poll 404 |
| Tauri probe | `apps/studio-local/src-tauri/src/probe.rs` | Detecta `gltf-transform`, `meshoptimizer`, `blender` â€” **nÃ£o** wired a export API |
| Test probe | `lib.rs` ~204â€“235 | `LocalRuntimeAssetTool::GltfTransform`, `BlenderHeadless` em testes |

**Pipeline alvo:**

| Runtime | Stack | Output |
|---------|-------|--------|
| Tauri local | Blender headless ou Rust gltf + meshoptimizer | `.glb` instantÃ¢neo no disco do usuÃ¡rio |
| Cloud | Container `@gltf-transform/core`; USD assets S3 â†’ merge â†’ compress â†’ S3 upload | `RenderJob` complete + download URL |

**UX:** atÃ© pipeline real, manter `IMPROVE-UX-003` honest held â€” sem loader infinito em 202 receipt.

---

### Â§2.59 Batch 7 â€” Tabela diagnÃ³stico competitive parity

| Ãrea | Realidade (cÃ³digo) | Paridade alvo | ID |
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

### Â§2.60 Batch 8 â€” AAA render pipeline audit (UE 5.6 vs Aethel â€” honesty-first)

**User intent (2026-06-17):** CrÃ­tica estrutural dos pipelines de renderizaÃ§Ã£o, geometria, pÃ³s-processamento, partÃ­culas e materiais â€” **sem marketing**, cruzando arquivos fÃ­sicos do repo.

**Regra de ouro (reitera `IMPROVE-QUALITY-002`):** NÃ£o competir Nanite/Lumen/Chaos em fidelidade poligonal hoje; documentar gaps reais + moat correto (iteraÃ§Ã£o agent-first, 3DGS, USD, WASM).

**Arquivos Ã¢ncora validados:**

| Arquivo | Papel |
|---------|-------|
| `lib/aaa-material-system.shaders.ts` | Fragment PBR + funÃ§Ãµes mortas |
| `lib/aaa-material-system.ts` | `ShaderGraphCompiler` magenta |
| `lib/nanite-virtualized-geometry-renderers.ts` | CPU cull + visibility resolve debug |
| `lib/postprocessing/system/effect-composer.ts` | Bloom/tonemap/grading (funcional) |
| `lib/aaa-render-system.ts` | AAA stubs (SSAO/SSR/DOF/GI vazios) |
| `lib/hooks/useRenderPipeline.ts` + `.presets.ts` | Presets TAA/CSM â€” renderer null |
| `lib/virtual-texture-cache.ts` | Page table LRU (parcial) |
| `lib/engine/NiagaraParticleEmitter.runtime.ts` | CPU particles |
| `lib/particle-system-real.ts` | CPU sim, comentÃ¡rio "GPU" enganoso |

**Cross-debt:** `DEBT-RENDER-003`, `DEBT-NANITE-001`, `DEBT-PERF-002`, `DEBT-NIAGARA-002`, `DEBT-PERF-001`.

---

### Â§2.61 Batch 8 â€” PARTE 1: GI, sombras, path trace (`IMPROVE-ENG-007/008`)

#### O que o cÃ³digo confirma

| AfirmaÃ§Ã£o user | Status | EvidÃªncia |
|----------------|--------|-----------|
| EquaÃ§Ãµes Cook-Torrance declaradas mas nÃ£o usadas em `main()` | **CONFIRMED** | `distributionGGX`, `geometrySmith`, `fresnelSchlick` ~260â€“285; `main()` termina ~326 `vec3 color = baseAlbedo * ao + emissiveColor` |
| `F0` calculado e ignorado | **CONFIRMED** | ~325 `vec3 F0 = mix(...)` â€” variÃ¡vel morta |
| Sem loops directional/point/spot no shader custom | **CONFIRMED** | Inclui `lights_pars_begin` ~229 mas **nÃ£o** `#include <lights_fragment_begin>` nem loop manual |
| `lights: true` no material | **CONFIRMED mas ineficaz** | `aaa-material-system.ts` ~27 â€” Three.js lighting nÃ£o aplica a shader custom sem chunks |
| Sem GI dinÃ¢mica real | **CONFIRMED** | `setupSSGI/RTGI/VoxelGI` corpos vazios ~325â€“353; `setupLightProbes` sÃ³ instancia `THREE.LightProbe` sem irradiance bake |
| Sem lightmaps / path trace offline | **CONFIRMED** | Zero lightmap bake pipeline; `ray-tracing.ts` + `BVHBuilder` existem mas `DEBT-PERF-002` sync main thread; ReSTIR ausente |
| Sem shadow map sampling no PBR shader | **CONFIRMED** | Shader nÃ£o sample shadow maps |
| CSM/VSM nos presets | **CONFIG THEATER** | `useRenderPipeline.presets.ts` ultra/high: `technique:'cascaded'`, `cascades:4` â€” mas `useRenderPipeline.ts` ~177â€“179: `aaaRendererRef.current = null` |

#### Infraestrutura parcial (nÃ£o ignorar)

| MÃ³dulo | Estado |
|--------|--------|
| `lib/pbr-shadow-runtime.ts` | `ShadowMapRenderer` renderiza depth ortho â€” exportado em `pbr-shader-pipeline.ts` â€” **nÃ£o wired** a `AdvancedPBRMaterial` |
| `lib/aaa-render-system.ts` `setupGlobalIllumination` | Switch method existe; implementaÃ§Ãµes stub |
| `lib/day-night-cycle.tsx` | `shadowIntensity` ambiente â€” nÃ£o substitui GI |

#### EspecificaÃ§Ã£o alvo (`IMPROVE-ENG-007` + `IMPROVE-ENG-008`)

**Fase A â€” Luz direta mÃ­nima honesta:**

1. Em `main()`: loop sobre `NUM_DIR_LIGHTS` / point / spot via Three chunks **ou** uniform buffer explÃ­cito
2. Invocar `distributionGGX` + `geometrySmith` + `fresnelSchlick` no BRDF
3. Integrar `ShadowMapRenderer` texture + bias no mesmo pass

**Fase B â€” GI/sombras escalonadas (pÃ³s `IMPROVE-ENG-001` WebGPU):**

| Tier | TÃ©cnica | AceitaÃ§Ã£o |
|------|---------|-----------|
| 1 | SSAO + baked light probes | Cenas estÃ¡ticas reviewable |
| 2 | SSGI one-bounce | `setupSSGI` implementado |
| 3 | DDGI / voxel cone trace | Held atÃ© WebGPU compute |
| 4 | Path trace offline + ReSTIR | Worker BVH async (`DEBT-PERF-002`); cinema export only |

**IA (`IMPROVE-AI-013`):** nunca editar GLSL â€” sÃ³ JSON preset deltas.

---

### Â§2.62 Batch 8 â€” PARTE 2: Materiais PBR + Nanite (`IMPROVE-ENG-007/009`)

#### Shader graph magenta â€” CONFIRMED

```121:125:meu-repo/cloud-web-app/web/lib/aaa-material-system.ts
    return `
      vec4 calculateOutput() {
        return vec4(1.0, 0.0, 1.0, 1.0);
      }
    `;
```

`generateFragmentCode` void graph/node/uniforms ~117â€“119 â€” editor de grafos = **mock visual**.

#### ParÃ¢metros PBR avanÃ§ados omitidos â€” CONFIRMED

| Params | Declarados | Calculados em `main()` |
|--------|------------|------------------------|
| clearcoat, ior, transmission, subsurface, iridescence | uniforms ~177â€“218 | **NÃ£o** |
| albedo, metallic, roughness, normal, ao, emissive | Sim | Parcial (sem lighting) |

#### Nanite virtualized geometry â€” CONFIRMED + nuance

| AfirmaÃ§Ã£o | Status | EvidÃªncia |
|-----------|--------|-----------|
| `cullMeshlets` 100% CPU TypeScript | **CONFIRMED** | ComentÃ¡rio explÃ­cito ~159 "CPU fallback"; loop ~177â€“216 |
| Hi-Z buffer | **PARTIAL** | Shader GLSL ~85â€“100 `occlusionCull` + `updateHiZBuffer` ~118 â€” mas culling path principal Ã© CPU |
| Visibility resolve psicodÃ©lico | **CONFIRMED** | resolve FS ~371â€“376 `fragColor = vec4(meshletId%, triangleId%, 0.5, 1.0)` |
| GPU indirect draw | **ABSENT** | `useRenderPipeline` detecta `multiDrawIndirect` ext ~169 mas Nanite nÃ£o usa |
| Real meshlet decimation | **FALSE per DEBT-NANITE-001** | `simplifyMeshlets` subsample aritmÃ©tico â€” nÃ£o geometria real |

#### Pipeline alvo (`IMPROVE-ENG-009`)

```
[Scene meshes] â†’ meshlet builder (real decimation DEBT-NANITE-001)
       â”‚
       â–¼
[WebGPU/WGPU compute pass] frustum + cone + Hi-Z occlusion
       â”‚
       â–¼
[Indirect draw] visibility buffer (uint IDs)
       â”‚
       â–¼
[Resolve pass] fetch UV/normal/material from buffers â†’ PBR shading (ENG-007)
```

**Honesty UX:** atÃ© ENG-009 live, rotular viewport "Nanite" como **held** â€” alinha `IMPROVE-QUALITY-002`.

---

### Â§2.63 Batch 8 â€” PARTE 3: Texturas + pÃ³s-processamento (`IMPROVE-ENG-010/011`)

#### O que funciona vs o que falta

| Capacidade | Estado cÃ³digo |
|------------|---------------|
| Bloom, tonemapping, color grading, vignette, film grain, chromatic aberration | **WORKING** â€” `lib/postprocessing/system/*` wired em `EffectComposer` |
| TAA | **PRESET ONLY** â€” `QUALITY_PRESETS.ultra.postProcess.antialiasing:'taa'` â€” sem pass TAA em `postprocessing/system/index.ts` |
| Velocity buffer | **ABSENT** â€” nenhum RT velocity; `setupMotionBlur` stub em `aaa-render-system.ts` |
| DLSS/FSR/XeSS | **ABSENT** â€” sem upscaler |
| SSR | **STUB** â€” `setupSSR()` vazio ~265â€“268; nÃ£o em effect-composer |
| DOF bokeh fÃ­sico | **STUB** â€” `setupDOF()` vazio ~274â€“276; sem `dof-pass.ts` em postprocessing |
| Virtual texturing | **PARTIAL** â€” `PageTable`, `PhysicalTextureAtlas`, `TileCache`, `FeedbackBuffer` em `virtual-texture-cache.ts` â€” paginaÃ§Ã£o CPU + upload manual; **sem** BC7/ASTC GPU decode |

#### CrÃ­tica user refinada

- Aliasing severo: plausÃ­vel â€” sem TAA ativo apesar do preset
- VRAM 4K textures: risco real â€” atlas `Uint8Array` full res sem streaming comprimido
- DOF gaussiano simples: **nÃ£o encontrado** em `postprocessing/system` â€” pode existir em outro path; DOF AAA stub estÃ¡ em `aaa-render-system` nÃ£o implementado. **CorreÃ§Ã£o:** efeito DOF **ausente** no pipeline ativo, nÃ£o apenas "gaussiano ruim"

#### EspecificaÃ§Ã£o (`IMPROVE-ENG-010`)

1. **Velocity MRT** â€” per-object ou per-pixel motion vectors cada frame
2. **TAA pass** â€” history buffer + jitter Halton; expor em `EffectComposer`
3. **SSR pass** â€” usa `depthTexture` + `normalTarget` jÃ¡ previstos em `effect-composer.ts` ~45â€“54
4. **DOF pass** â€” CoC from depth + bokeh kernel (nÃ£o separable gaussian Ãºnico)
5. **Upscaling** â€” FSR2 Web opcional; DLSS Tauri only â€” held gates

#### EspecificaÃ§Ã£o (`IMPROVE-ENG-011`)

- Tile request â†’ fetch BC7/ASTC blob â†’ GPU transcode â†’ `PhysicalTextureAtlas.uploadTile`
- Feedback buffer jÃ¡ analisa pixels ~304â€“345 â€” wire a loader assÃ­ncrono

---

### Â§2.64 Batch 8 â€” PARTE 4: PartÃ­culas Niagara (`IMPROVE-VFX-005`)

#### CONFIRMED â€” CPU bottleneck

| Sistema | SimulaÃ§Ã£o | EvidÃªncia |
|---------|-----------|-----------|
| `NiagaraParticleEmitter.runtime.ts` | CPU `Particle[]` | `update()` ~32â€“80 loops JS, `splice`, `Vector3.clone()` |
| `particle-system-real.ts` | CPU apesar do header | `updateParticles` ~202â€“276 for-loop main thread |
| `NiagaraVFX.runtime.tsx` | Graph UI | NÃ£o compila para compute â€” `DEBT-NIAGARA-002` |

**Nuance:** `particle-system-real` usa `ShaderMaterial` + `THREE.Points` para **draw** GPU â€” apenas rasterizaÃ§Ã£o, nÃ£o simulaÃ§Ã£o compute.

#### Alvo UE Niagara-class

| Runtime | Stack |
|---------|-------|
| Web | WebGPU compute shader â€” position/velocity/lifetime buffers |
| Desktop | WGPU sidecar (`IMPROVE-ENG-001`, `IMPROVE-DESK-001`) mesmo WGSL |
| Editor | `IMPROVE-VFX-004` graph â†’ compile â†’ compute kernels |

**Budget:** 5k partÃ­culas CPU (user est.) â†’ 500kâ€“1M+ GPU compute (held atÃ© profiling gate).

---

### Â§2.65 Batch 8 â€” PARTE IV: IA + render (`IMPROVE-AI-013/014`)

#### Config-driven rendering â€” alinhado ao moat

**Problema:** LLM editando WGSL/GLSL â†’ syntax errors + token blowup.

**SoluÃ§Ã£o validada no repo:**

| Hoje | Alvo |
|------|------|
| `QUALITY_PRESETS` em `useRenderPipeline.presets.ts` | Schema JSON versionado `RenderPresetPatch` |
| Toggles SSR/Bloom no-op se `aaaRendererRef=null` | ACP tool `render-preset-apply` valida keys contra schema |
| Shader graph mock | `IMPROVE-AI-014` Rust AST em sidecar â€” typecheck pins antes de emit GLSL/WGSL |

**Exemplo patch IA (aceitaÃ§Ã£o):**

```json
{
  "preset": "high",
  "postProcess": { "bloomIntensity": 1.5, "tonemapping": "ACES", "antialiasing": "taa" },
  "gi": { "method": "ssgi", "ssgiSamples": 8 }
}
```

Motor aplica uniforms em <16ms â€” sem recompilar shader source.

#### Rust AST shader graph (`IMPROVE-AI-014`)

- Input: `ShaderGraph` JSON (mesmo contrato `aaa-material-system.contracts.ts`)
- Validar: `NodeSocket.type` compatibility em cada `ShaderConnection`
- Output: WGSL (WebGPU) + GLSL (WebGL fallback) â€” substituir `vec4(1,0,1,1)` stub
- Falha: `ErrorBoundary` viewport + ledger entry â€” nÃ£o crash IDE

**Blocked by:** `DEBT-RENDER-003`, `IMPROVE-ENG-001` para emit WGSL canÃ´nico.

---

### Â§2.66 Batch 8 â€” Tabela diagnÃ³stico render vs UE 5.6

| Ãrea UE 5.6 | Realidade Aethel (cÃ³digo) | Moat / caminho | ID |
|-------------|---------------------------|----------------|-----|
| Lumen GI | AOÃ—albedo + emissive | SSGI tiered + honesty held | `IMPROVE-ENG-008` |
| Nanite | CPU cull + ID colors | GPU compute + real LOD | `IMPROVE-ENG-009`, `DEBT-NANITE-001` |
| PBR materials | Dead BRDF functions | Wire lighting loop | `IMPROVE-ENG-007` |
| Material editor | Magenta compile | Rust AST graph | `IMPROVE-AI-014` |
| Virtual Shadow Maps | Preset only | CSM + shadow sampler in PBR | `IMPROVE-ENG-008` |
| TAA/TSR | Preset `taa` unused | Velocity + TAA pass | `IMPROVE-ENG-010` |
| SSR/DOF | Empty setup methods | Real passes in composer | `IMPROVE-ENG-010` |
| Virtual textures | Page table partial | GPU BC7 decode | `IMPROVE-ENG-011` |
| Niagara GPU | CPU arrays | WebGPU/WGPU compute | `IMPROVE-VFX-005` |
| AAA render hook | `aaaRendererRef=null` | Instantiate or hide toggles | `DEBT-RENDER-003` |
| AI tweaks render | â€” | JSON preset patches only | `IMPROVE-AI-013` |
| Path trace cinema | BVH sync main thread | Worker + ReSTIR held | `DEBT-PERF-002`, `IMPROVE-ENG-008` |

**Ordem sugerida pÃ³s-dÃ­vida:** `DEBT-RENDER-003` â†’ `IMPROVE-ENG-007` â†’ `IMPROVE-ENG-008` â†’ `IMPROVE-ENG-010` â†’ `IMPROVE-ENG-009` (Nanite marketing off until real) â†’ `IMPROVE-VFX-005` â†’ `IMPROVE-AI-013/014`.

---

### Â§2.67 Batch 9 â€” Simulation, animation & netcode audit (`analysis_results.md`)

**User intent (2026-06-17):** Expandir crÃ­tica cirÃºrgica para subsistemas de simulaÃ§Ã£o 3D, motion matching, netcode e atmosfera â€” arquivo canÃ´nico [`analysis_results.md`](./analysis_results.md).

**DecisÃµes estruturais (recomendadas â€” todas SIM):**

| Pergunta user | Resposta | ID |
|---------------|----------|-----|
| Foliage: erase pontual + GPU LOD culling? | Sim â€” `clear()` destrÃ³i mundo inteiro por tipo hoje | `DEBT-FOLIAGE-001` â†’ `IMPROVE-ENG-012` |
| Clouds: God Rays + depth blend + sem DOM/frame? | Sim â€” pipeline incompleto | `DEBT-CLOUD-001` â†’ `IMPROVE-ENG-013` |
| Motion: Float32Array SOA + O(1) frame + IK? | Sim â€” heap GC + `poses.find` hoje | `DEBT-MOTION-001` â†’ `IMPROVE-ENG-014` |
| Netcode: banir JSON no hot path? | Sim â€” stutter por GC | `DEBT-NET-001` â†’ `IMPROVE-ENG-015` |

**JÃ¡ em `DEBT-*` (Batch 6 â€” reconfirmados Batch 9):** `DEBT-PERF-003/004`, `DEBT-TERRAIN-001`, `DEBT-ASSET-001`, `DEBT-AUDIO-001`, `DEBT-YJS-001`, `DEBT-SAVE-001`, `DEBT-PLUGIN-001`, `DEBT-NIAGARA-002`, `DEBT-DESK-*`.

**Novos `DEBT-*` (Batch 9):** `DEBT-FOLIAGE-001`, `DEBT-CLOUD-001`, `DEBT-MOTION-001`, `DEBT-NET-001`, `DEBT-ADMIN-001`. **`DEBT-AUDIT-001` resolved.**

---

### Â§2.68 Batch 9 â€” Foliage system (`foliage-system.ts`, `FoliagePainterPanels.runtime.tsx`)

#### CONFIRMED â€” apagador destrutivo

```252:259:meu-repo/cloud-web-app/web/lib/foliage-system.ts
  removeCluster(clusterId: string): void {
    ...
      instancedMesh.clear(); // Simplified - in production would track individual instances
```

Um cluster apagado â†’ **todas** as instÃ¢ncias daquele `typeId` somem.

#### CONFIRMED â€” culling placebo

- `update()` ~293: `cluster.visible = distance < cullDistance`
- Grep: `.visible` **sÃ³ escrito**, nunca lido â€” `InstancedMesh` count/matrices inalterados

#### CONFIRMED â€” painter sem instancing (`DEBT-PERF-003`)

`FoliagePainterPanels.runtime.tsx` ~206â€“254: `typeInstances.map` â†’ `<mesh>` individual com `ConeGeometry`/`CylinderGeometry` **novas** por instÃ¢ncia.

#### EspecificaÃ§Ã£o (`IMPROVE-ENG-012` + `IMPROVE-STUDIO-011`)

| Camada | Fix |
|--------|-----|
| Data | `instanceId` estÃ¡vel por planta; sparse delete marca slot `alive=0` |
| Erase | Recompactar `instanceMatrix` attribute â€” nunca `clear()` global |
| Cull | CPU: rebuild visible index list; GPU: compute pass ou shader discard |
| Painter UI | Um `InstancedMesh` por `typeId`; brush paint = `setMatrixAt` |

---

### Â§2.69 Batch 9 â€” Volumetric clouds (`volumetric-clouds.ts`)

| AfirmaÃ§Ã£o | Status | Linha/evidÃªncia |
|-----------|--------|-----------------|
| Sem depth blending | **CONFIRMED** | Material `depthWrite: false` ~102; `render()` ~364 desenha quad sem sample depth |
| God Rays desconectados | **CONFIRMED** | `this.godRays = new GodRaysPass()` ~344; `render()` ~360â€“365 nÃ£o chama `godRays.render` |
| DOM query per frame | **CONFIRMED** | `document.querySelector('canvas')` ~116 em `update()` |
| Blue noise null | **CONFIRMED** | uniform ~65 `blueNoise: { value: null }` |

**Pipeline alvo (`IMPROVE-ENG-013`):**

1. Passar `depthTexture` da cena para shader clouds (depth-aware raymarch composite)
2. Chamar `GodRaysPass.render(renderer, ...)` apÃ³s clouds quando `godRaysEnabled`
3. Carregar textura blue-noise 64Ã—64 (ou 128Ã—128) estÃ¡tica
4. `resolution` uniform atualizado no resize handler â€” **nÃ£o** no tick

---

### Â§2.70 Batch 9 â€” Motion matching (`motion-matching-system.ts`)

#### CONFIRMED â€” heap / GC

`addAnimation` ~337â€“349: cada frame â†’ `boneTransforms: new Map(...)` com `.clone()` de cada `Vector3`/`Quaternion`.

#### CONFIRMED â€” O(N) playback lookup

```531:533:meu-repo/cloud-web-app/web/lib/motion-matching-system.ts
    const pose = this.database.poses.find(
      p => p.animationId === this.currentPose!.animationId && p.frameIndex === frameIndex
    );
```

#### NUANCE â€” search path

- `buildSearchTree()` + `MotionKDTree.findNearest` ~355, ~436 â€” **existe** para pose **matching**, nÃ£o para playback index
- User claim "busca linear O(N)" â€” **CONFIRMED** no path `getCurrentBoneTransforms`; **PARTIAL** no search path (kd-tree quando `shouldSearch`)

#### CONFIRMED â€” foot lock sem IK

`FootLockingIK` ~191: `blendedPosition = lockPosition.lerp(position, t)` â€” sem two-bone IK coxa/joelho.

#### EspecificaÃ§Ã£o (`IMPROVE-ENG-014`)

```
[Animation import]
      â”‚
      â–¼
[SOA buffers] positions[float*boneCount*frameCount], rotations[quat...]
      â”‚
      â”œâ”€â–º Playback: framePtr = animBase + frameIndex * boneStride  (O(1))
      â””â”€â–º Search: MotionKDTree on feature vectors (keep)
      â”‚
      â–¼
[Foot lock] Two-bone IK per leg before root motion apply
```

---

### Â§2.71 Batch 9 â€” Multiplayer netcode (`networking-netcode.ts`, `networking-serializer.ts`)

#### CONFIRMED â€” JSON clone rollback

```205:205:meu-repo/cloud-web-app/web/lib/networking-netcode.ts
      stateCopy.set(id, JSON.parse(JSON.stringify(state)));
```

#### CONFIRMED â€” falsa serializaÃ§Ã£o binÃ¡ria

`networking-serializer.ts`: `JSON.stringify` em `customData`, `keys`, `actions`, `payload` + `TextEncoder`.

#### CONFIRMED â€” rollback find linear

`stateHistory.find(s => s.frame === toFrame)` ~225.

#### EspecificaÃ§Ã£o (`IMPROVE-ENG-015`)

| Campo | Layout alvo |
|-------|-------------|
| Player state | Fixed struct: vec3 pos, quat rot, uint16 flags â€” `DataView` only |
| Input | Bitfield keys â€” 8â€“16 bytes max |
| Rollback | Ring buffer `states[frame % N]` â€” O(1) get/set |
| Clone | `structuredClone` mÃ­nimo ou manual copy into pooled objects â€” **never** JSON |

**Tier 1 debt** â€” multiplayer claims blocked until `DEBT-NET-001` closed.

---

### Â§2.72 Batch 9 â€” UX/UI pages + hitlist (sections 4â€“5 user paste)

**Reconfirmados (jÃ¡ em registry):**

| Item | ID |
|------|-----|
| Film SoundCue no inspector ~260px | `IMPROVE-FILM-001` Â§2.23 |
| Studio hub texto + route reload WebGL | `IMPROVE-STUDIO-006`, `IMPROVE-STUDIO-002` |
| VS inline styles + sem palette teclado | `IMPROVE-VS-006`, `IMPROVE-VS-011` |
| Loading strings ad-hoc | `IMPROVE-UX-004` + `DEBT-UX-HITLIST-001` |
| Yjs server state loss | `DEBT-YJS-001` â†’ `IMPROVE-COLLAB-003` |

**Water CPU (tabela user):** `PlaneGeometry(100,100,128,128)` = 129Â² = **16,641** vÃ©rtices; loop ~130â€“159 + `clone()` ~128 â€” `DEBT-PERF-004` â†’ `IMPROVE-ENG-016`.

---

### Â§2.73 Batch 9 â€” Tabela diagnÃ³stico simulation spine

| Ãrea | Realidade | Caminho | ID |
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

### Â§2.74 Batch 10 â€” Advanced engine systems (RT, Nanite, VT, destruction, cloth, AI voice, VR)

**User intent (2026-06-17):** Auditoria aprofundada `web/lib` â€” placebos geomÃ©tricos, GPU stalls, stubs de Ã¡udio/VR.

**Reconfirmados (jÃ¡ em debt):** `DEBT-PERF-002` (BVH sync), `DEBT-NANITE-001` (`simplifyMeshlets` subsample).

**Novos `DEBT-*`:** `DEBT-RT-001`, `DEBT-VT-001`, `DEBT-DEST-001`, `DEBT-CLOTH-001`, `DEBT-AUDIO-002`, `DEBT-VR-001`.

**Novos `IMPROVE-*`:** `IMPROVE-ENG-017`â€“`022`, `IMPROVE-AI-015`.

---

### Â§2.75 Batch 10 â€” Ray tracing & BVH (`ray-tracing.ts`, `ray-tracing-bvh.ts`)

| AfirmaÃ§Ã£o | Status | EvidÃªncia |
|-----------|--------|-----------|
| `rebuildBVH()` sync main thread | **CONFIRMED** | `ray-tracing.ts` ~118â€“127; `BVHBuilder.build` + `buildNode` recursive `indices.sort` ~150 |
| Apenas `tri.n0` na textura GPU | **CONFIRMED** | `createDataTextures` ~236â€“238; triÃ¢ngulos **extraem** n0/n1/n2 ~86â€“100 mas upload descarta n1/n2 |
| Flat shading em superfÃ­cies curvas | **INFERIDO vÃ¡lido** | Sem n1/n2 no shader path â†’ sem interpolaÃ§Ã£o Phong |

**Pesquisa / alvo (`IMPROVE-ENG-017`):**

- BVH rebuild em **Web Worker** ou WebGPU compute (debounce scene changes)
- Pack 3 vÃ©rtices + 3 normais por triÃ¢ngulo na `triangleTexture`
- Path tracer fragment: barycentric normal interp

**Cross:** `DEBT-PERF-002`, `IMPROVE-ENG-008` (offline RTGI tier 4).

---

### Â§2.76 Batch 10 â€” Nanite meshlets (`nanite-meshlet-builder.ts`)

| AfirmaÃ§Ã£o | Status | EvidÃªncia |
|-----------|--------|-----------|
| `simplifyMeshlets` sem QEM/decimaÃ§Ã£o | **CONFIRMED** | ~350â€“368: `targetCount = floor(len*ratio)`; `step` subsample; meshlets copiados intactos |
| Buracos/cracks em LOD distante | **PLAUSÃVEL** | Subsample espacial sem fusÃ£o de borda |

**Alvo (`IMPROVE-ENG-018`):** WASM meshoptimizer/libspidr; error metrics por cluster; crack-free transition meshes.

**Honesty:** renomear "Nanite" atÃ© `DEBT-NANITE-001` fechado â€” `IMPROVE-QUALITY-002`.

---

### Â§2.77 Batch 10 â€” Virtual texturing (`virtual-texture-system.ts`, `virtual-texture-cache.ts`)

| AfirmaÃ§Ã£o user | Status | EvidÃªncia |
|----------------|--------|-----------|
| Feedback buffer pipeline existe | **PARTIAL** | `FeedbackBuffer`, `feedbackFragmentShader`, `VirtualTextureSystem.update()` ~242â€“246 |
| CPU sÃ³ adivinha tiles (frustum) | **NOT PRIMARY** | Design Ã© feedback-driven â€” masâ€¦ |
| `readRenderTargetPixels` sync stall | **CONFIRMED** | `virtual-texture-cache.ts` ~304â€“311 |
| Loop CPU 256Ã—256 scan | **CONFIRMED** | ~316â€“341 for-loop per pixel |
| Feedback pass render antes do read | **NOT WIRED** | Grep: **zero** viewport/renderer calls `getFeedbackMaterial()` + render to RT |

**CorreÃ§Ã£o crÃ­tica:** o gargalo nÃ£o Ã© sÃ³ stall â€” **analyze() lÃª buffer que nunca foi populado pelo feedback pass** fora do mÃ³dulo isolado.

**Alvo (`IMPROVE-ENG-019` + `IMPROVE-ENG-011`):**

1. Main pipeline: render scene with `feedbackMaterial` â†’ `feedbackRT`
2. Async PBO readback (n+1 frame latency)
3. Tile loader budget per frame (`maxLoadsPerFrame` jÃ¡ existe ~262)

---

### Â§2.78 Batch 10 â€” Destruction & fracture (`destruction-fracture-generator.ts`, `destruction-system.ts`)

| AfirmaÃ§Ã£o | Status | EvidÃªncia |
|-----------|--------|-----------|
| Voronoi grade 10Â³ estÃ¡tica | **CONFIRMED** | `generateCells` ~43â€“77 |
| TriangulaÃ§Ã£o XZ-only | **CONFIRMED** | `cellToGeometry` ~116â€“119 `Math.atan2(a.z, a.x)` |
| Runtime vs pre-fractured | **RUNTIME** simplificado | Gera na hora mas geometria fraca |
| Rapier rigid bodies | **ABSENT** | `applyFragmentPhysics` ~71â€“86: gravity + euler rotation JS |

**Alvo (`IMPROVE-ENG-020`):** convex hull 3D / proper Voronoi; Rapier dynamic colliders per fragment; dust stays particles.

---

### Â§2.79 Batch 10 â€” Cloth (`cloth-simulation.ts`, `cloth-simulation-gpu.ts`, `cloth-simulation-collisions.ts`)

| AfirmaÃ§Ã£o | Status | EvidÃªncia |
|-----------|--------|-----------|
| SimulaÃ§Ã£o CPU main thread | **CONFIRMED** | `ClothSimulation` uses `ClothCollisionHandler` ~302 |
| String Map hash keys GC | **CONFIRMED** | `getHashKey` ~156â€“160 `` `${x},${y},${z}` `` per particle/frame |
| Capsule collider type exists | **CONFIRMED** | ~35â€“36, `handleCapsuleCollision` ~70+ |
| Skinned mesh auto capsule rig | **ABSENT** | Colliders manual `addCollider` â€” no bone hierarchy extract |
| `GPUClothSimulation` skeleton collision | **ABSENT** | Shader ~74â€“80: gravity/wind/damping only |

**Alvo (`IMPROVE-ENG-021`):** Extract bone capsules from skinned mesh each frame; GPU collision pass; `Int32Array` spatial hash.

---

### Â§2.80 Batch 10 â€” AI audio & WebXR

#### AI audio (`ai-audio-engine.ts`, `ai-audio-engine-sfx.ts`)

| AfirmaÃ§Ã£o | Status | EvidÃªncia |
|-----------|--------|-----------|
| `generateVoice()` = silÃªncio | **CONFIRMED** | ~316â€“317 `createBuffer` sem fill â€” zeros default |
| Lipsync quebrado â†’ `sil` | **CONFIRMED** | `energyToViseme` ~349 `energy < 0.01` â†’ `'sil'` |
| SFX sÃ³ MP3 prÃ©-carregado | **REFUTED** | `ai-audio-engine-sfx.ts` gera footstep/impact/explosion proceduralmente |

**Alvo (`IMPROVE-AI-015`):** TTS provider + buffer fill; manter SFX procedural como moat.

#### WebXR (`webxr-vr-system-core.ts`, `webxr-vr-foveated-rendering.ts`)

| AfirmaÃ§Ã£o | Status | EvidÃªncia |
|-----------|--------|-----------|
| Foveation = escurecer periferia | **CONFIRMED** | `getFoveationFactor` ~48â€“58 retorna attenuation scalar |
| `applyToLayer()` inativo | **CONFIRMED** | `onXRFrame` ~168â€“203 â€” sem `foveatedRendering.applyToLayer` |
| Haptics mapeados | **PARTIAL OK** | ~179â€“181 `hapticActuators` wired |
| ECS integration | **NOT FOUND** | Three.js object updates â€” nÃ£o ECS spine |

**Alvo (`IMPROVE-ENG-022`):** `layer.fixedFoveation` via `applyToLayer` each frame; gaze-tracked VRS quando disponÃ­vel.

---

### Â§2.81 Batch 10 â€” Tabela diagnÃ³stico advanced engine

| Ãrea | Realidade | Caminho | ID |
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

**Ordem sugerida:** `DEBT-PERF-002`/`DEBT-RT-001` â†’ `DEBT-NANITE-001` â†’ `DEBT-VT-001` â†’ `DEBT-DEST-001` â†’ `DEBT-CLOTH-001` â†’ `DEBT-AUDIO-002` â†’ `DEBT-VR-001`.

---

### Â§2.82 Batch 11 â€” Terminal wiring, dashboard density, route maturity (components + scripts)

**Fonte:** user paste 2026-06-17 â€” `web/components`, `web/scripts`.

**Novos `DEBT-*`:** `DEBT-TERM-001`, `DEBT-UX-DASH-001`, `DEBT-ROUTE-001`.

#### A. Terminal PTY fracture (`BaseXTerminal.tsx`, `useTerminalRuntime.ts`, `terminal-pty-runtime.ts`)

| Claim | Verdict | Evidence |
|-------|---------|----------|
| xterm conecta WS `localhost:3001` / `AETHEL_WS_URL` | **CONFIRMED** | `terminalWebSocket.ts` ~28â€“33 |
| Backend `node-pty` no processo Node | **CONFIRMED** | `terminal-pty-runtime.ts` ~185 `spawn(shell,...)` |
| Cloud deploy = shell no container, nÃ£o na mÃ¡quina do user | **CONFIRMED** | `cwd` = `os.homedir()` do servidor; `/api/terminal/create` |
| Tauri terminal = stub held | **CONFIRMED** | `desktop_commands.rs` `create_held` ~328 |
| xterm **nÃ£o** usa `createDesktopAdapter` | **CONFIRMED** | zero imports em `components/terminal/*` |

**Cruzamento:** `DEBT-DESK-002` (desktop held) + **`DEBT-TERM-001`** (arquitetura web/cloud).  
**Alvo:** `IMPROVE-TERM-001` + `IMPROVE-DESK-002` + `IMPROVE-BRIDGE-001` â€” Wave 7 (IDE) + Wave 9 (native).

#### B. Dashboard banner pollution (`DashboardEntryIntentBanner`, `DashboardAlertBanners`)

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Banners poluem primeira dobra | **PARTIAL** | `DashboardShell.tsx` empilha atÃ© 4 superfÃ­cies: `TrialBanner`, `DashboardRoutingNotice`, `DashboardAlertBanners`, `DashboardEntryIntentBanner` |
| Alertas licenÃ§a/readiness sempre visÃ­veis | **REFUTED** | `DashboardAlertBanners` sÃ³ renderiza com `authErrorText`/`billingErrorText`; `EntryIntent` sÃ³ com `entryMission`/`entrySource` |
| PadrÃ£o Linear violado | **CONFIRMED** | Cards grandes `rounded-[24px]` acima do grid de projetos |

**Alvo:** `IMPROVE-DASH-002` (densidade) â€” distinto de `IMPROVE-UX-002` (propagar AlertBanner a outras superfÃ­cies).

#### C. Route maturity gate (`check-hidden-route-leak.mjs`)

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Gate impede leak PROTOTYPE/ASPIRATIONAL no middleware | **CONFIRMED** | script static PASS |
| 40%+ rotas sÃ£o stubs | **PARTIAL** | 13/62 = **21%** hidden; 33/62 = **53%** se ALPHA contado como parcial |
| InflaÃ§Ã£o estrutural sem utilidade | **CONFIRMED** | 9 ASPIRATIONAL legacy shells + `DEBT-ADMIN-001` stub generator |

**Alvo:** `IMPROVE-ROUTE-001` + `IMPROVE-STUDIO-007` (hub gating).

#### D. Tabela Batch 11

| Ãrea | Realidade | Caminho | ID |
|------|-----------|---------|-----|
| Terminal web | Server PTY â‰  user machine | Transport router + Bridge | `DEBT-TERM-001`, `IMPROVE-TERM-001` |
| Terminal desktop | `create_held` | portable-pty | `DEBT-DESK-002`, `IMPROVE-DESK-002` |
| Dashboard fold | Banner stack | Linear rail + toasts | `DEBT-UX-DASH-001`, `IMPROVE-DASH-002` |
| Routes | 13 hidden + 20 ALPHA | Prune + hub gating | `DEBT-ROUTE-001`, `IMPROVE-ROUTE-001` |

**Wave mapping:** Terminal â†’ **Wave 7** (IDE dock + xterm) + **Wave 9** (native PTY); Dashboard + routes â†’ **Wave 7**.

---

## 3. Quality bar & alignment (canonical)

*User-defined standards to meet post-debt â€” e.g. Cursor 3.x IDE fluidity, EN canonical UI, evidence receipts, 60fps viewport budgets. Cursor fills from pastes.*

| Dimension | Target (post-debt) | Source / acceptance |
|-----------|-------------------|---------------------|
| Language | EN canonical in product UI | user rule; gate `qa:i18n-hardcoded-spine` |
| Tokens | `var(--aethel-*)` / `color-mix`; **zero** new inline `style={{}}` on studio surfaces | audit A4; grep ratchet |
| Information density | Operator-first: badges not paragraphs; tables compact; 28px hero radii only on marketing, not work panels | user Batch 1 |
| Navigation | Tool switch **without** WebGL context loss; <100ms perceived; no 1â€“2s flicker | `IMPROVE-STUDIO-002` |
| Viewport tools | Radial/context menus; keyboard-first (B brush, Ctrl+K composer) | terrain, Monaco |
| Timelines | Canvas 2D/WebGL for dope sheet; 12+ tracks pan/zoom 60fps | A10 |
| Loading | Single `PremiumLoadingState` shimmer; no raw â€œCarregandoâ€¦â€ | A3; ~1300 strings purge |
| VFX honesty | No cosmetic graph without compile path or explicit held gate | DEBT-NIAGARA-002 |
| IDE parity | Cursor 3.x: ghost text, inline composer **on cursor line** (not fullscreen modal), resizable dock, virtualized trees, LCS diff | A21, A40, Frente 1; `IMPROVE-IDE-013/014` |
| Workbench zones | `08_WORKBENCH`: AI Console Right Rail; Bottom Dock exclusive full-width tab | `IMPROVE-IDE-007/008/009` |
| Dashboard perf | Streaming chat updates **only** chat subtree; shell/billing/wallet isolated | `IMPROVE-DASH-001` |
| Alerts | `AlertBanner` + dismiss on all auth/billing/network surfaces | A6; `IMPROVE-UX-002` |
| Gates | `qa:enterprise-gate` green before each phase | debt registry |
| Honesty | No market claim without gate or held manifest | marketing-claims |
| Studio shell | Editors feed `CreativeWorkbenchShell` slots only â€” **no** embedded 250/320px sidebars inside viewport children | `IMPROVE-STUDIO-005` |
| Creative editors | Graph/timeline editors headless; **one** inspector column; no 240+260+280px inside narrow slots | `IMPROVE-STUDIO-008`, `IMPROVE-FILM-001/004`, `IMPROVE-QUEST-001` |
| Film tool matrix | Inspector switches by `activeTool.id` (audio/cinematic/director) â€” no irrelevant AudioMix on cloud review | `IMPROVE-FILM-005` |
| Desktop native | Sidecars (wgpu, ffmpeg, rapier, onnx) only after manifest + lifecycle gates green | `IMPROVE-DESK-001`, `DEBT-SIDECAR-001` |
| Studio hub | Control room, not workbench chrome â€” no outliner/inspector until editor opens | `IMPROVE-STUDIO-006`, Rule 1 |
| Route honesty | ALPHA/placebo surfaces gated in hub when flag off; `isRouteVisible` wired | `IMPROVE-STUDIO-007` |
| Export UX | No infinite loader on receipt stubs; honest held/501 until `DEBT-RENDER-001` closed | `IMPROVE-UX-003` |
| File tree | Virtualized flat list for 10k+ nodes; 60fps scroll in IDE | `IMPROVE-IDE-016`, A8 |
| Command palette | Sub-100ms fuzzy via Wasm worker | `IMPROVE-IDE-017` |
| Competitive bar | â€œNÃ£o passar batidoâ€ â€” UE5/Blender/Cursor/Zed/Figma as **UX bar**, not render fidelity | user Batch 1 |
| Vision 2030 | Market **leader** bar: ACP, WGPU parity, splat pipeline, cross-device workspace â€” honest held until evidence | `aethel_vision_2030`, Batch 5 |
| Honesty-first vs UE | No Nanite/Lumen parity claims; moat = iteration speed, 3DGS, USD orchestration, agent IDE | `IMPROVE-QUALITY-002`, Batch 6 |
| AI 3D generation | No "world in seconds" marketing; integrator/morph, not amorphous mesh gen | `IMPROVE-AI-004/006` |
| Visual script | JIT WASM + syscalls â€” not JS interpreter in play mode | `IMPROVE-VS-010` |
| Plugins | WASI wasmtime only â€” no `vm`/native DLL in process | `IMPROVE-PLATFORM-005`, `DEBT-EXT-001` |
| Viewport | No "deprecated" text in production canvas center | `IMPROVE-VIEW-001` |
| Native desktop | PTY real, fs events to UI, ONNX ghost <20ms â€” no `create_held` theater | `IMPROVE-DESK-002`â€“`004` |
| Data spine | `McpServer` + `RenderJob` in Prisma; BullMQ workers â€” no 202 receipt theater | `IMPROVE-PLATFORM-003/004` |
| Three surfaces | Local + Web + Mobile = one `AethelWorkspaceState`; mobile approves, does not replace IDE | `15_MOBILE_COMPANION`, `IMPROVE-PLATFORM-001/002` |
| Agentic research | No `PRESET_SOURCES` theater; browser operator must be headless or explicit held | `IMPROVE-AI-009/010` |
| Live voice | Full-duplex WebRTC/WebSocket with barge-in â€” not walkie-talkie WebM upload only | `IMPROVE-AI-011` |
| Parallel agents | Squad dispatch via tool bus; Activity Deck shows all lanes â€” not single RunCard | `IMPROVE-AI-012` |
| Job lifecycle | Active renders/export jobs cancellable (SIGINT/pub/sub) â€” no `JOB_ACTIVE_CANNOT_CANCEL` trap | `IMPROVE-PLATFORM-006` |
| GLB export | Real local/cloud conversion â€” no 202 receipt without worker | `IMPROVE-PLATFORM-007`, `DEBT-RENDER-001` |
| PBR honesty | Cook-Torrance functions must run in `main()` or remove dead code â€” no albedoÃ—AO theater | `IMPROVE-ENG-007`, `DEBT-RENDER-003` |
| GI/shadows | No CSM/TAA preset without active renderer â€” hide or wire `aaaRendererRef` | `IMPROVE-ENG-008`, `IMPROVE-ENG-010` |
| Nanite naming | No "Nanite" label while visibility resolve shows ID colors | `IMPROVE-ENG-009`, `DEBT-NANITE-001` |
| Particles | No "GPU particle" header on CPU simulation loops | `IMPROVE-VFX-005` |
| AI render control | JSON preset patches only â€” never raw shader source from LLM | `IMPROVE-AI-013` |
| Foliage erase | Sparse per-instance delete â€” never `instancedMesh.clear()` for one brush stroke | `DEBT-FOLIAGE-001`, `IMPROVE-ENG-012` |
| Netcode hot path | No `JSON.parse/stringify` or `TextEncoder` in 60Hz rollback/serialize | `DEBT-NET-001`, `IMPROVE-ENG-015` |
| Motion poses | SOA buffers + O(1) frame index â€” not `poses.find` per tick | `DEBT-MOTION-001`, `IMPROVE-ENG-014` |
| Volumetric clouds | Depth-aware composite + god rays wired â€” not fullscreen overlay | `DEBT-CLOUD-001`, `IMPROVE-ENG-013` |
| Path tracing | BVH off main thread; smooth normals in RT pass â€” not flat n0-only | `DEBT-PERF-002`, `DEBT-RT-001`, `IMPROVE-ENG-017` |
| Virtual texturing | Feedback pass rendered before read; async PBO â€” no sync stall | `DEBT-VT-001`, `IMPROVE-ENG-019` |
| Destruction | Real 3D fracture + physics engine â€” not JS translate fragments | `DEBT-DEST-001`, `IMPROVE-ENG-020` |
| AI voice | Audible TTS with working lipsync â€” not zero-filled buffers | `DEBT-AUDIO-002`, `IMPROVE-AI-015` |
| WebXR foveation | Hardware `fixedFoveation` / VRS â€” not peripheral darken shader | `DEBT-VR-001`, `IMPROVE-ENG-022` |

### Anti-patterns (explicitly rejected post-debt)

- ParÃ¡grafos explicando o que o usuÃ¡rio â€œpode ou nÃ£o fazerâ€ em painÃ©is de trabalho  
- `<details>` nativo para navegaÃ§Ã£o principal mobile  
- Sliders/controles que movem UI mas nÃ£o estado (`onChange={() => {}}`)  
- Grafos visuais desconectados do runtime (Niagara, visual script sem compile)  
- Editores densos (ReactFlow audio) em coluna ~260px  
- Dynamic imports de editores que nunca montam na Ã¡rvore React  
- Bottom dock tabs que alteram estado mas nÃ£o alteram render (`activeBottomPanel` ignored)  
- Fullscreen modal para Cmd+K quando `ContentWidget` jÃ¡ existe  
- Line-zip diff que marca offset inteiro como changed  
- Dashboard monolithic prop bags que cascade re-render on every chat token  
- CreativeWorkbenchShell on Studio Home hub (navigation disguised as scene outliner)  
- LevelEditor embedded sidebars duplicating shell outliner/inspector (four gutters)  
- Export buttons that show success spinners on 202 receipt stubs (`DEBT-RENDER-001`)  
- `isRouteVisible` defined but never wired to hub navigation  
- Local ContextMenu reinventions when `components/ui/context-menu.tsx` exists  
- ReactFlow graph editors (audio/quest) squeezed into inspector slot â‰¤400px with internal 240+260px chrome  
- Video timeline with embedded 280px inspector inside 100â€“300px horizontal dock  
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
| [`analysis_results.md`](./analysis_results.md) | Simulation/netcode/cloud audit â€” Batch 9 validated map |
| [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) | **Must complete first** â€” `DEBT-*` |
| [`audit_frontend_ui_ux.md`](./audit_frontend_ui_ux.md) | Tactical UX fronts â€” may promote to `IMPROVE-*` when debt cleared |
| [`aethel_architecture_philosophy.md`](./aethel_architecture_philosophy.md) | DoD / held states â€” improvements must not violate |
| [`audit_backend_spine.md`](./audit_backend_spine.md) | Frentes B51, F6, M69, U57, I70, F41, F44, R64 â€” Batch 6 spine map |
| [`AETHEL_INTERFACE_BLUEPRINTS/08_WORKBENCH.md`](../../AETHEL_INTERFACE_BLUEPRINTS/08_WORKBENCH.md) | Zoneamento Right Rail / Bottom Dock â€” `IMPROVE-IDE-007` |
| [`AETHEL_INTERFACE_BLUEPRINTS/19_BEST_IN_MARKET_CLEAN_UX_GUARDRAILS.md`](../../AETHEL_INTERFACE_BLUEPRINTS/19_BEST_IN_MARKET_CLEAN_UX_GUARDRAILS.md) | Rule 1, Rule 4 â€” `IMPROVE-BLUEPRINT-001` |
| `cloud-web-app/web/components/COMPONENT_CONSOLIDATION_MAP.md` | Admin unification â€” `IMPROVE-ADMIN-001` |
| [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) Â§10.3 | Export receipt stubs â€” `DEBT-RENDER-001`, `IMPROVE-UX-003` |
| [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) Â§13.6 | MCP `McpServer` â€” `DEBT-DB-001`, `DEBT-DB-003` |
| [`aethel_vision_2030.md`](./aethel_vision_2030.md) | Neural geometry, DirectStorage, P2P â€” `IMPROVE-ENG-*`, `IMPROVE-COLLAB-001` |
| [`AETHEL_INTERFACE_BLUEPRINTS/15_MOBILE_COMPANION.md`](../../AETHEL_INTERFACE_BLUEPRINTS/15_MOBILE_COMPANION.md) | Mobile continuity â€” `IMPROVE-MOBILE-*`, `IMPROVE-PLATFORM-002` |
| `apps/studio-local/src-tauri/src/desktop_commands.rs` | Native spine placebos â€” `IMPROVE-DESK-002/003`, `DEBT-DESK-002/003` |
| `apps/studio-local/src-tauri/src/native_kernel.rs` | Capability manifest â€” `IMPROVE-DESK-001`, `DEBT-DESK-006` |
| `components/nexus/AethelResearch.tsx` | Research mock â€” `IMPROVE-AI-009/010` |
| `components/agents/BrowserOperatorReplay.tsx` | Replay UI â€” wire to headless operator `IMPROVE-AI-009` |
| `lib/server/browser-operator-recorder.ts` | In-memory replay â€” extend to live browser lane |
| `lib/ai-web-tools.ts` | Tavily search â€” wire to research panel `IMPROVE-AI-010` |
| `components/agents/chat/voice/useVoiceRecording.ts` | Walkie-talkie voice â€” replace `IMPROVE-AI-011` |
| `components/agents/chat/activity/LiveConversationPanel.tsx` | Live UI shell â€” duplex audio `IMPROVE-AI-011` |
| `lib/production/agent-tool-bus.ts` | Squad orchestration â€” `IMPROVE-AI-012` |
| `app/api/render/jobs/[jobId]/cancel/route.ts` | Active cancel blocked â€” `IMPROVE-PLATFORM-006` |
| `app/api/exports/glb/route.ts` | GLB receipt stub â€” `IMPROVE-PLATFORM-007` |
| `lib/aaa-material-system.shaders.ts` | Dead PBR BRDF â€” `IMPROVE-ENG-007` |
| `lib/aaa-material-system.ts` | Magenta shader graph â€” `IMPROVE-AI-014` |
| `lib/nanite-virtualized-geometry-renderers.ts` | CPU Nanite â€” `IMPROVE-ENG-009`, `DEBT-NANITE-001` |
| `lib/aaa-render-system.ts` | Empty SSAO/SSR/DOF/GI stubs â€” `IMPROVE-ENG-008/010`, `DEBT-RENDER-003` |
| `lib/hooks/useRenderPipeline.ts` | `aaaRendererRef=null` â€” `DEBT-RENDER-003` |
| `lib/postprocessing/system/` | Bloom/tonemap ok; no TAA/SSR/DOF â€” `IMPROVE-ENG-010` |
| `lib/virtual-texture-cache.ts` | Partial VT â€” `IMPROVE-ENG-011` |
| `lib/foliage-system.ts` | Erase + cull â€” `DEBT-FOLIAGE-001`, `IMPROVE-ENG-012` |
| `lib/volumetric-clouds.ts` | Atmosphere pipeline â€” `DEBT-CLOUD-001`, `IMPROVE-ENG-013` |
| `lib/motion-matching-system.ts` | SOA poses + IK â€” `DEBT-MOTION-001`, `IMPROVE-ENG-014` |
| `lib/networking-netcode.ts` | Binary rollback â€” `DEBT-NET-001`, `IMPROVE-ENG-015` |
| `lib/environment/WaterEditor.parts-runtime.tsx` | GPU Gerstner â€” `DEBT-PERF-004`, `IMPROVE-ENG-016` |
| `lib/ray-tracing-bvh.ts` | Async BVH + normals â€” `DEBT-PERF-002`, `DEBT-RT-001`, `IMPROVE-ENG-017` |
| `lib/nanite-meshlet-builder.ts` | QEM LOD â€” `DEBT-NANITE-001`, `IMPROVE-ENG-018` |
| `lib/virtual-texture-system.ts` | VT feedback wire â€” `DEBT-VT-001`, `IMPROVE-ENG-019` |
| `lib/destruction-fracture-generator.ts` | Rapier fracture â€” `DEBT-DEST-001`, `IMPROVE-ENG-020` |
| `lib/cloth-simulation-gpu.ts` | Skinned collision â€” `DEBT-CLOTH-001`, `IMPROVE-ENG-021` |
| `lib/ai-audio-engine.ts` | Voice TTS â€” `DEBT-AUDIO-002`, `IMPROVE-AI-015` |
| `lib/webxr-vr-system-core.ts` | Hardware foveation â€” `DEBT-VR-001`, `IMPROVE-ENG-022` |
| `components/terminal/terminalWebSocket.ts` | PTY transport fracture â€” `DEBT-TERM-001`, `IMPROVE-TERM-001` |
| `lib/server/terminal-pty-runtime.ts` | Server-side node-pty â€” `DEBT-TERM-001` |
| `apps/studio-local/src-tauri/src/desktop_commands.rs` | Held terminal â€” `DEBT-DESK-002`, `IMPROVE-DESK-002` |
| `components/dashboard/DashboardShell.tsx` | Banner stack â€” `DEBT-UX-DASH-001`, `IMPROVE-DASH-002` |
| `lib/routes/route-maturity-registry.ts` | Route inflation â€” `DEBT-ROUTE-001`, `IMPROVE-ROUTE-001` |
| `scripts/check-hidden-route-leak.mjs` | Maturity gate â€” `DEBT-ROUTE-001` |
| `apps/studio-local/src-tauri/src/jobs.rs` | Cancel state-only â€” needs child kill `IMPROVE-PLATFORM-006` |
| `components/ide/fullscreen/stores/workbenchUiStore.ts` | IDE Zustand precedent â€” `IMPROVE-STUDIO-010` |
| `FUTURE_IMPROVEMENTS_REGISTRY.md` | **This file** â€” post-debt enhancements |

---

## 5. Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-06-17 | Cursor session | Initial scaffold; post-debt workflow; `IMPROVE-*` schema |
| 2026-06-17 | User Batch 1 | 24 `IMPROVE-*` items; Â§2.1â€“2.8 studio/IDE/VFX critique; quality bar expanded |
| 2026-06-17 | User Batch 2 | +18 `IMPROVE-*` (VS-005â€“008, DASH-001, UX-002, IDE-007â€“015, BLUEPRINT-001, ADMIN-001, FILM-003); Â§2.9â€“2.15; blueprint drift corrections (IDELayout retired, no `shell=modern`) |
| 2026-06-17 | User Batch 3 | +8 `IMPROVE-*` (STUDIO-005â€“007, VS-009, IDE-016â€“017, UX-003); Â§2.16â€“2.22; four sidebars CONFIRMED; export stubs â†’ `DEBT-RENDER-001`; `isRouteVisible` unwired |
| 2026-06-17 | User Batch 4 | +7 `IMPROVE-*` (FILM-004/005, QUEST-001, STUDIO-008/009, DESK-001); Â§2.23â€“2.30; SoundCue 500px in 400px inspector CONFIRMED; MCP â†’ `DEBT-DB-001` |
| 2026-06-17 | User Batch 5 | +22 `IMPROVE-*` (AI-001â€“003, ENG-001â€“003, â€¦); Â§1.1 + Â§2.31â€“2.42 Vision 2030 |
| 2026-06-17 | User Batch 6 | +14 `IMPROVE-*` (QUALITY-002, AI-004â€“008, ENG-004â€“006, VS-010, DESK-005, VIEW-001, PLATFORM-005); Â§2.43â€“2.52 honesty-first + spine; `CanvasViewportSurface` CONFIRMED |
| 2026-06-17 | User Batch 7 | +6 `IMPROVE-*` (AI-009â€“012, PLATFORM-006/007); Â§2.53â€“2.59 Manus/Perplexity/Gemini Live parity; `AethelResearch` PRESET_SOURCES CONFIRMED; `browser-operator-recorder` PARTIAL; Tavily isolated; `useVoiceRecording` walkie-talkie CONFIRMED; `JOB_ACTIVE_CANNOT_CANCEL` + Tauri state-only cancel CONFIRMED; `glb/route.ts` stub CONFIRMED |
| 2026-06-17 | User Batch 8 | +8 `IMPROVE-*` (ENG-007â€“011, VFX-005, AI-013/014); Â§2.60â€“2.66 AAA render audit; dead Cook-Torrance CONFIRMED; magenta shader graph CONFIRMED; CPU Nanite + ID resolve CONFIRMED; TAA preset theater CONFIRMED; `aaaRendererRef=null` CONFIRMED; VT partial; Niagara CPU CONFIRMED |
| 2026-06-17 | User Batch 9 | `analysis_results.md` created; +5 `DEBT-*`; +9 `IMPROVE-*` (ENG-012â€“016, STUDIO-011, VS-011, UX-004, COLLAB-003); Â§2.67â€“2.73 simulation/netcode/cloud |
| 2026-06-17 | User Batch 10 | +6 `DEBT-*` (RT-001, VT-001, DEST-001, CLOTH-001, AUDIO-002, VR-001); +7 `IMPROVE-*` (ENG-017â€“022, AI-015); Â§2.74â€“2.81; VT feedback pass unwired CONFIRMED; AI SFX procedural REFUTED |
| 2026-06-17 | User Batch 11 | +3 `DEBT-*` (TERM-001, UX-DASH-001, ROUTE-001); +3 `IMPROVE-*` (TERM-001, DASH-002, ROUTE-001); Â§2.82; 40% stub claim PARTIAL (21% hidden, 53% with ALPHA) |
| 2026-06-19 | Cursor session | **CatÃ¡logo Vivo + Arcade shipped.** `DEBT-MKT-FRAG-001` â†’ RESOLVED (canonical `lib/marketplace/catalog.ts`, `GET /api/marketplace/catalog`, slug-keyed install/uninstall wired to UI, 402 handling). New `/arcade` surface: `PublishedGame` model, `POST/GET/DELETE /api/projects/[id]/publish`, `GET /api/arcade`, `GET/POST /api/arcade/[slug]`, public list/detail UI + creator publish panel + nav. Follow-ups: `IMPROVE-MKT-VSX-001` (federate Open VSX into the canonical catalog), `IMPROVE-ARC-001` (web-export worker â†’ S3 bundle so published games auto-flip from `pending`â†’`playable`), `IMPROVE-ARC-002` (publish entry point inside IDE/Studio bound to the real project id). DB migration required before runtime: `npx prisma migrate deploy` (PublishedGame table). |

---

## 6. Quick commands (post-debt validation)

```bash
cd meu-repo/cloud-web-app/web
npm run qa:enterprise-gate
npm run typecheck
npx vitest run __tests__/ai
```

