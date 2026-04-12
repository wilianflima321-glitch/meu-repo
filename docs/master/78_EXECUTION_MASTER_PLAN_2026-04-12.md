# 78_EXECUTION_MASTER_PLAN_2026-04-12
**Título:** Plano Mestre de Execução L5 → 10/10 (Aethel como a melhor IDE/Studio do mercado)

**Autor:** Grok (análise end-to-end + carta branca do Wilian)  
**Data:** 12/04/2026  
**Referências canônicas obrigatórias:**  
- `AETHEL_INTERFACE_BLUEPRINTS/00_INDEX.md` (thesis + Decision 0-5)  
- `docs/master/75_DESIGN_SYSTEM_UNIFICATION_GUIDE_2026-04-10.md`  
- `docs/master/76_AUDITORIA_DEFINITIVA_BENCHMARK_2026-04-11.md` (4.7/10)  
- `docs/master/77_FINAL_10_10_GAP_AUDIT_2026-04-11.md`  

**Objetivo final:** Subir de 4.7/10 médio para **9.5+/10** (acima de Replit 8.7, Figma 8.6, Cursor 7.9).

## Thesis Reafirmada (verbatim do 00_INDEX)
Aethel **não é** dashboard com tools, chat separado, clone de VS Code com AI grudado, produtos separados.  
Aethel **é** one studio system + one workbench shell + one AI operational layer + one preview engine + one connected project model.

## Plano em 4 Fases (executável hoje)

### Fase 0 – Preparação & Parar o Drift (3-5 dias) – P0
1. Executar `npm run qa:design-system-consistency` (já existe).
2. Migrar **todos** os ~40 arquivos listados na 77 para primitives + CSS vars (75 guide).
3. Esconder **todas** as 15 rotas aspiracionais via `route-maturity-registry.ts`.
4. Deletar ou `@deprecated` os componentes legacy.
5. Criar este arquivo 78 e linkar no `00_INDEX.md`.

**Métrica:** 0 arquivos com classes `aethel-*` legacy.

### Fase 1 – Unificação Visual + Workbench Shell (7-10 dias) – Meta 8/10
- Criar **Aethel Canvas Mode** (infinite canvas code-aware + 3D-aware, inspirado em Figma 2026 + Replit 4).  
  Novo arquivo: `components/canvas/AethelCanvasMode.tsx`.
- Implementar Inline AI + Cmd+K + split editor + minimap (Cursor 3 style).
- Transformar `CanonicalPreviewSurface.tsx` em **viewport primário** (gizmos, outliner, real-time generative).
- Aplicar `canonical-spacing.ts` em **todo** o app.

**PR sugerido:** `feat: unify design system + add Aethel Canvas Mode (L5 visual coherence)`

### Fase 2 – AI Operational Layer + Preview Engine (10-14 dias) – Meta 9.5/10
- Decompor `AIChatPanelPro.tsx` (1766 linhas) em módulos pequenos (`ChatMessageList`, `ChatInput`, etc.).
- Adicionar **background + parallel agents** + wide research (Manus + Cursor 3).
- Chat vira **operational layer colado no artefato** (Decision 2).
- Preview 3D ganha gizmos, undo/redo, text-to-texture (Adobe Firefly style).
- Incluir cost tracking + safety/audit logs por conversa.

**PR sugerido:** `feat: ai operational layer + preview viewport primário + parallel agents`

### Fase 3 – Onboarding, Colab, Mobile + Polish (7-10 dias)
- `OnboardingWizard.tsx` → Replit-style (`<60s` com agent demo).
- Collab real-time (cursors múltiplos, presence) — nível Figma 10/10.
- Mobile companion completo (deep link).
- Billing transparente + admin unificado.
- Adicionar: offline-first (Ollama), WCAG 2.2, metrics de tempo economizado.

### Fase 4 – QA Final + Lançamento L5 (5-7 dias)
- Rodar todos os QA gates existentes.
- Visual regression full.
- Deploy Railway + K8s.
- Storybook dos componentes canônicos.

## Métricas de Sucesso 10/10
- Média benchmark ≥ 9.5/10.
- Design coerência: 10/10 (um único language visual).
- Primeiro artefato criado em `<90s`.
- Preview = viewport primário imersivo.
- AI = operational layer agentic colada.

## Ideias Novas Incluídas (carta branca)
- Aethel Canvas Mode
- Background/parallel agents
- Safety/audit logs + cost tracking
- Offline-first
- Export GLTF/PSD nativo
- Plugin ecosystem leve

**Próximo commit obrigatório:** Este arquivo + Fase 0 iniciada.

**Status atual:** 4.7/10 → executando este plano = 10/10.

---
**Aprovado por:** Wilian (12/04/2026)
