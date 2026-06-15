# Claude — Aethel Engine Execution Brief

## Ordem de leitura obrigatória

1. **`.aethelrules`** (3.486 bytes) — regras absolutas. NUNCA viole.
2. **`.cursorrules`** (a criar — Frente 0) — convenções específicas para IA.
3. **Este arquivo (`CLAUDE.md`)** — visão geral.
4. **`docs/architecture/aethel_architecture_philosophy.md`** — Leis 1-5. Visão 2030 = NÃO executar.
5. **`docs/architecture/audit_frontend_ui_ux.md`** — Frentes A1-A50.
6. **`docs/architecture/audit_backend_spine.md`** — Frentes 1-50 + B51-B58 + U56-U58 + C59-C63 + R64-R66 + M67-M69 + I70-I72.

## Decisão arquitetural V33 — R3F vs WebGPU

- **Web:** mantém React Three Fiber. Não migrar agora.
- **Desktop (Tauri):** wgpu Rust nativo do zero, sem tocar no R3F.
- As duas trilhas convergem em 6-12 meses, não antes.

## Mapa do repositório (validado 2026-07-20)

### Produto real
- `cloud-web-app/web/` — Next.js 14 App Router
  - 114 pages, 355 API routes, 471 components, 416 lib files
  - 32 MB, 505k LoC
- `apps/studio-local/` — Tauri 2 + Rust
  - Frontend = placeholder HTML estático (não é produto)
  - Backend = 8 Rust files, ~1.300 LoC

### Código morto (NÃO TOQUE — Frente N3 arquivará)
- `src/` (34.5k LoC sem imports)
- `client/` (3.3k LoC trading legacy)
- `lib/` raiz (49 LoC)
- `components/` raiz (54 LoC)
- `runtime-templates/` (2.5k LoC Electron legacy)
- `cloud-admin-ia/`, `shared/`

### Stack canônico (validado)
| Camada | Tecnologia |
|---|---|
| UI | React 18 + Next 14 (App Router) |
| Estilo | Tailwind 4 + tokens `var(--aethel-*)` |
| Ícones | lucide-react |
| 3D Web | Three.js + R3F + Drei + Postprocessing |
| 3D Desktop (planejado) | wgpu + Rust nativo (a fazer) |
| Editor | Monaco |
| Realtime | Yjs + y-websocket + y-monaco |
| State | Zustand |
| Server state | React Query + SWR |
| DB | Prisma + PostgreSQL (51 models) |
| Auth | NextAuth + WebAuthn + magic link |
| Pagamento | Stripe |
| Logger | `createComponentLogger()` em `lib/observability/logger.ts` (NUNCA `console.log`) |
| Tests | Vitest (NÃO Jest) |

### Convenções
- Server Components por padrão; `'use client'` só quando necessário
- Tokens CSS via `var(--aethel-*)`, NUNCA hex direto
- Limite 500 LoC por componente (atualmente 334 violam)
- Sem PT-BR em UI (usar `react-i18next` ou EN canônico)
- Path alias: `@/` aponta para `cloud-web-app/web/`

## 6 erros que Claude NÃO PODE cometer

1. ❌ Criar arquivo `MonacoEditorPro.runtime.tsx` (não existe; usar `MonacoEditorPro.actions.ts`)
2. ❌ Editar `lib/ai/agent-run-ledger.ts` (não existe; usar `lib/production/task-evidence-ledger.ts`)
3. ❌ Tentar "preencher TODOs" em `aaa-render-system.ts` (tem 0 TODOs)
4. ❌ Reescrever `physics-engine.ts` ignorando que `physics-engine-real.ts` (Rapier) existe
5. ❌ Inventar `lib/scene-graph-node.ts` (Frente 57 backend — não existe)
6. ❌ Confundir Frentes duplicadas (54, 55, 56, 57, 68 aparecem 2x — usar renumeração V33 §4.2 B5)

## Sequência de execução proposta

| Wave | Duração | PRs | Frentes |
|---|---|---|---|
| 0 — Bootstrap | 1 dia | 4 | Frente 0, N1, N2, N3 |
| 1 — Interfaces premium | 5 dias | 8 | A4, A5, A8, A13, A20, A29, N4 |
| 2 — IDE convergence | 5 dias | 6 | 1 (Composer), A40 (Ghosts), 68 (Docking) |
| 3 — Backend hardening | 5 dias | 6 | 2 (VFS), 3 (WebSocket), N5 (Physics dual) |
| 4 — Creative spine | 5 dias | 7 | 6 (VS Compiler), 47 (Terrain GPU), 56 (Particle GPU) |
| 5 — Desktop real (wgpu) | 10 dias | 4 | 7 (Window), B51 (wgpu Overlay), B52 (DOTS Rust), B54 (VFS RocksDB) |
| 6 — Resilience + Live | 5 dias | 4 | R64 (Panic), R65 (OOM), M67 (Voice), M69 (Holograms) |

## Respostas para as 10 Perguntas Críticas:
1. **npm, pnpm ou yarn?**: npm
2. **R3F no web ou migrar para WebGPU?**: R3F no web, wgpu no desktop.
3. **i18n**: EN canônico.
4. **Billing**: Stripe Customer Portal.
5. **`/admin` rotas**: 6 super-tabs.
6. **Desktop UI**: UI separada em `apps/studio-local/src/`.
7. **Yjs**: Manter Yjs.
8. **DB**: Postgres cloud + SQLite local.
9. **E2B**: Auditar e remover se não usado.
10. **Sidecars desktop**: ffmpeg + onnxruntime no MVP.
