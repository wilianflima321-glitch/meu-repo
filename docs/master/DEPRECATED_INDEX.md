# Indice de docs e superficies deprecadas

Referencia rapida para evitar releitura de specs obsoletos e para nao reintroduzir shells antigos.

Auditoria reconciliada mais recente: `docs/master/73_AUDIT_RECONCILIATION_2026-04-08.md`.

## Documentacao

| Legado ou colisao | Substituido por ou notas |
| --- | --- |
| `docs/master/39_STUDIO_UNIFIED*` | Direcao absorvida pelos blueprints de produto e por `65_STUDIO_PRODUCT_BLUEPRINT` |
| `docs/master/48_WORKBENCH_SPEC*` | `AETHEL_INTERFACE_BLUEPRINTS/08_WORKBENCH.md` |
| `docs/master/28_UX_SUPERIORITY*` | `65`, `66` e `AETHEL_INTERFACE_BLUEPRINTS/*` |
| Serie historica `docs/master/41*.md` | Colisao resolvida: `41_AUDITORIA_MAXIMA_2026-03-20`, `41a_DOCS_NAMING_NORMALIZATION_2026-03-21` e `41b_EXECUTION_ALIGNMENT_2026-03-27` |

## Codigo UI e layout

| Item | Estado |
| --- | --- |
| `components/ide/IDELayout.tsx` | Deprecated; o workbench canonico e `ModernIDEShell` dentro de `FullscreenIDE` |
| `components/ide/index.ts` export de `IDELayout` | Removido para evitar reintroduzir o shell legado por imports indiretos |
| `components/NexusCanvas.tsx` | Deprecated como wrapper; use `components/nexus/NexusCanvasV2.tsx` |
| `components/NotificationCenter.tsx` | Deprecated; o fluxo ativo de notificacao esta no dashboard e em `NotificationSystem` quando integrado |
| `components/NotificationSystem.tsx` | Deprecated como superficie React; a referencia ativa e `lib/ui/notification-system.tsx` |
| `components/editor/` e `components/editors/` | Pastas distintas por dominio: Monaco e fluxo de codigo vs editores de jogo e VFX; ver `components/editors/index.ts` |

## Rotas e ambiente

| Comportamento | Variavel |
| --- | --- |
| Mostrar labs aspiracionais em producao | `NEXT_PUBLIC_SHOW_ASPIRATIONAL_ROUTES=true` |
| Ocultar labs tambem em desenvolvimento | `NEXT_PUBLIC_SHOW_ASPIRATIONAL_ROUTES=false` |

Implementacao: `lib/routes/workbench-convergence.ts` e `middleware.ts`. Avisos ao usuario: `DashboardRoutingNotice` via query `?notice=`.

Atualize este indice sempre que um doc, rota ou superficie for formalmente retirada do caminho principal.
