# 22_REPO_CONNECTIVITY_MATRIX_2026-02-27
Status: EXECUTION MATRIX
Date: 2026-02-27
Owner: Platform Engineering + PM Técnico

## 1) Objetivo
Registrar conectividade real do repositório, identificar peças soltas e definir ações de correção sem mudar escopo de produto.

## 2) Baseline factual coletado
- `tracked_md_like=3617` (excluindo `node_modules/.next/.git`).
- `docs/master/*.md=35`.
- `docs/archive/**/*.md=236`.
- `cloud-web-app/web` com `21` arquivos `.md` soltos na raiz.
- `cloud-web-app/web/.venv` presente e versionado.
- `package.json` (raiz) com caminhos inexistentes em scripts:
  - `examples/browser-ide-app`
  - `cloud-ide-desktop/desktop-app`
- `tsconfig.json` (raiz) referencia caminho inexistente:
  - `cloud-ide-desktop/aethel_theia_fork/packages/ai-ide`
- `.gitmodules` aponta submódulo ausente:
  - `cloud-ide-desktop/aethel_theia_fork`
- Pressão de manutenção:
  - `55` arquivos `>=1200` linhas em `cloud-web-app/web` (top offender: `components/AethelDashboard.tsx`, `3528` linhas).

## 3) Matriz de risco de conectividade
| Domínio | Evidência | Impacto | Prioridade | Ação |
|---|---|---|---|---|
| Scripts raiz quebrados | paths inexistentes em `package.json` | Onboarding/CI confuso | P0 | Redirecionar scripts para superfícies ativas (`cloud-web-app/web`) ou remover comandos mortos |
| Submódulo órfão | `.gitmodules` sem pasta real | Clone/setup inconsistente | P0 | Remover referência ou restaurar submódulo real com URL válida |
| TS references inválidas | `tsconfig.json` com path inexistente | `tsc --build` instável | P0 | Ajustar `references` para módulos existentes |
| Binários versionados | `.venv` com executáveis no Git | Ruído operacional e risco de segurança | P0 | Remover do versionamento + adicionar ignore |
| Documentação dispersa | muitos `.md` fora de `docs/master` | Decisão por fonte errada | P1 | Consolidar índice e mover docs operacionais para `docs/archive` |
| Componentes monolíticos | `AethelDashboard.tsx` 3k+ linhas | Manutenção e regressão | P1 | Decompor em blocos (header, mission, chat, preview, ops) |
| Duplicatas de superfície | `NexusCanvas` raiz + `nexus/NexusCanvasV2` | Drift visual/funcional | P1 | Declarar canônico e remover legado |

## 3.1) Classificação de diretórios de topo
| Diretório | Classificação | Observação |
|---|---|---|
| `cloud-web-app/` | `ACTIVE` | Superfície principal de produto |
| `docs/master/` | `ACTIVE` | Governança canônica |
| `docs/archive/` | `LEGACY_ACTIVE` | Histórico consultivo, não canônico |
| `src/` | `ACTIVE` | Código TypeScript compartilhado |
| `tests/` | `ACTIVE` | Testes gerais do repositório |
| `infra/` | `LEGACY_ACTIVE` | Infra auxiliar, requer revisão de aderência |
| `infra-playwright-ci-agent/` | `LEGACY_ACTIVE` | Automação CI especializada |
| `meu-repo/` (subpasta interna) | `ORPHAN_CANDIDATE` | Conteúdo auxiliar/duplicado; não participa do runtime principal |

## 4) Decisões travadas desta rodada
1. Fonte canônica de documentação: `docs/master`.
2. Contrato mestre de execução: `10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md`.
3. Sem fake-success; capacidades parciais continuam explícitas.
4. Limpeza estrutural entra antes de expansão de features.

## 5) Backlog imediato (ordem de commit)
1. Corrigir `package.json`, `tsconfig.json`, `.gitmodules` para eliminar referências inválidas.
2. Remover `.venv` do versionamento e reforçar `.gitignore`.
3. Consolidar documentação de entrada (`00_INDEX` + `00_FONTE_CANONICA`) e atualizar referências antigas.
4. Planejar decomposição dos top 10 arquivos gigantes.
5. Unificar superfícies duplicadas (Nexus/Notification/Dashboard).

## 6) Critério de pronto
1. Zero caminho inexistente em scripts/config críticos.
2. Zero binário de ambiente local versionado (`.venv`, artefatos temporários).
3. Índice canônico sem contradição de path/fonte.
4. Top-offenders de tamanho com plano de decomposição e owner definido.

## 7) Incremental closures (2026-02-27)
1. Script path connectivity: fixed (`missing_script_paths=0`).
2. `.venv` artifacts removed from versioned source.
3. Legacy Nexus canvas logic replaced by compatibility wrapper to canonical `NexusCanvasV2` runtime.
4. Added automated connectivity gate script: `tools/check-repo-connectivity.mjs` (`npm run qa:repo-connectivity`).
5. Moved loose web root Markdown docs to `docs/archive/web-status/` (kept `cloud-web-app/web/README.md` only in web root).
6. Nexus chat surface canonicalized to `components/nexus/NexusChatMultimodal.tsx` with compatibility wrapper in legacy import path.
7. Started monolith decomposition in `AethelDashboard` by extracting state/types contract to `components/dashboard/aethel-dashboard-model.ts`.
8. Continued monolith decomposition in `AethelDashboard` by extracting defaults/constants/format helpers to `components/dashboard/aethel-dashboard-defaults.ts`.
9. Enforced root connectivity gate in both visual workflows (`ui-audit.yml`, `visual-regression-compare.yml`) to block path regressions before browser steps.
10. Expanded connectivity scanner coverage for loose web-root markdown, tracked secret-like files, and required canonical-doc presence checks.
11. Continued dashboard split by extracting session-history creation/filter/toggle helpers to `components/dashboard/aethel-dashboard-session-utils.ts`.

## 8) Recalibration snapshot (2026-02-28)
1. Repository markdown inventory:
- `md_total=3641`
- `docs/master/*.md=38`
- `docs/archive/**/*.md=256`
 - legacy path references in canonical folder (`audit dicas do emergent usar/*`): `127` (requires staged cleanup)
2. Structural gate:
- `npm run qa:repo-connectivity` -> PASS
3. Remaining structural pressure:
- high historical markdown volume outside canonical docs,
- monolithic hotspots still present (`cloud-web-app/web/components/AethelDashboard.tsx` > 3000 lines),
- orphan-candidate top-level folders still requiring explicit keep/remove policy.

## 9) Immediate closure actions (no scope change)
1. Keep connectivity gate mandatory in all PR pipelines.
2. Continue dashboard decomposition until no single UI shell file exceeds agreed threshold.
3. Publish explicit policy for orphan-candidate directories (`ACTIVE` vs `ARCHIVE` vs `REMOVE`).

## 10) Incremental closure 2026-02-28 (dashboard split)
1. Dashboard decomposition advanced with:
- `components/dashboard/aethel-dashboard-project-utils.ts`
- `components/dashboard/aethel-dashboard-wallet-utils.ts`
2. Project derivation and wallet metric logic were removed from inline dashboard shell and delegated to shared helpers.
