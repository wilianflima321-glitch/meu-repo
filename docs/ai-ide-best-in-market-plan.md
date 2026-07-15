# AI IDE "Best-in-Market" Execution Plan

_Last updated: 2025-11-14_

## Snapshot
- **Baseline strengths:** rich provider/agent/tool configuration, branded layout defaults, billing metadata plumbing, smoke test coverage via `npm run test:ai-ide` and Playwright.
- **Goal:** exceed VS Code/Unreal/Copilot by delivering localized, offline-ready, observable AI workflows with discoverable governance and streaming/moderation guarantees.
- **Guiding principles:** avoid duplicated surfaces, gate risky changes behind feature flags, and document every new command/workflow in `README.DEV.md` and `docs/`.
- **Creative coverage:** use `docs/ai-ide-creative-workflow.md` as the authoritative flow for filmes/jogos/apps/sites; every feature shipped here must keep aquele documento atualizado para garantir que os agentes da IDE executem o pipeline ponta-a-ponta sem lacunas.

## Feature Gap Inventory
| Area | Current State | Gap | Owner Notes |
| --- | --- | --- | --- |
| Localization | Mixed pt-BR/en-US strings hard-coded across widgets | Move all visible copy to `nls.localize`, define `en-US` baseline, add smoke test that asserts branding widget renders expected strings | Touch all `packages/ai-ide/src/browser/**` React widgets; leverage existing `nls` wiring |
| Offline assets | Fonts and codicons imported from CDNs | Vendor Inter/JetBrains fonts + codicons, update `frontend-module.ts` to prefer local bundles | Required for Electron/air-gapped studios |
| Billing discoverability | `BillingAdminWidget` hidden, no tests/docs | Add branding/status-bar entry points, mocha test for widget factory, document in README and `docs/ai-ui-map.md` | Drives enterprise trust |
| Layout persistence | Auto-opening layout lacks workspace persistence | Store per-workspace layout preference (local storage or preference schema) | Aligns with VS Code view customizations |
| Provider security | API keys stored in memory | Integrate Theia secure storage or encrypted file, enforce validation for duplicate IDs | Mandatory for regulated orgs |
| Streaming/moderation | Contracts defined in `docs/ai-agent-architecture.md` but not implemented | Add `StreamingHandle`, moderation pipeline, telemetry events (`request.*`, `billing.*`) | Needed to rival Copilot real-time responses |
| Tool/MCP sandboxing | Tool registry exists but lacks resource guards | Implement timeout/quotas, test via `tools/llm-mock` | Matches Unreal/Blueprint safety |
| Observability | Playwright CI lacks summary/comment | Pipe `tools/ci/write-playwright-summary.mjs`, publish artifacts, nightly cron | Prevents silent regressions |
| Visual regression | UI map lists widgets but baselines missing | Capture Percy/Playwright snapshots for prioritized widgets | Protects against theming regressions |
| Docs/onboarding | `README.DEV.md` missing diagnostics + mock instructions | Document `npm run diagnostics:playwright`, `tools/llm-mock` install, link status/plan docs | Ensures zero-dup guidance |

## CI/Test Coverage Enhancements
1. **Core CI (`.github/workflows/ci.yml`):** promote optional e2e job to nightly cron + label trigger; fail fast on Playwright skip counts.
2. **Playwright pipeline:** integrate summary writer + PR comment, upload `diagnostics/PLAYWRIGHT_SUMMARY.txt` and screenshots.
3. **IDE quality workflow:** add macOS runner and caching for node_modules to mirror user environments.
4. **Visual audits:** automate `tools/ide/ui-audit/run_audit.js` with structured artifacts and PAT validation.
5. **Traceability:** ensure every workflow step references the same scripts to avoid duplicated logic (source-of-truth under `tools/`).

## Remediation Phases
### Phase 0 (secure/ship blockers)
- Localization sweep + smoke test.
- Offline bundling for fonts/codicons.
- Surface billing admin entry points + documentation.

### Detalhamento P0 (execução imediata)
1. **Localização**
	- Migrar todos os textos em `packages/ai-ide/src/browser/**` para `nls.localize`.
	- Definir `en-US` como idioma base e preparar arquivo de strings `pt-BR` reaproveitando traduções já existentes.
	- Criar smoke test mocha para `ai-ide-branding-widget` garantindo que o texto corresponde ao locale ativo.
	- Checklist de revisão: strings, atalhos de teclado, tooltips, mensagens de erro.
2. **Assets offline**
	- Baixar e versionar Inter/JetBrains Mono + codicons em `packages/ai-ide/src/browser/assets/`.
	- Atualizar `frontend-module.ts` para buscar os assets locais por padrão, deixando o fallback CDN protegido por flag.
	- Validar Playwright (`npm run test:e2e`) e `npm run diagnostics:playwright` após a troca para garantir que não houve regressão visual.
3. **Descoberta do Billing Admin**
	- Adicionar uma ação rápida no branding widget e um comando de status-bar que abrem `BillingAdminWidget`.
	- Escrever teste mocha que simula o registro do widget.
	- Atualizar `README.DEV.md` e `docs/ai-ui-map.md` com screenshots/fluxo de acesso.

### Phase 1 (platform depth)
- Secure storage for provider secrets; layout persistence.
- Streaming handle + moderation pipeline with telemetry hooks; add JSON samples in `docs/samples/`.
- Nightly Playwright + diagnostics automation.

### Phase 2 (polish & confidence)
- Style hooks (`ai-ide-panel`), visual baselines per `docs/ai-ui-map.md`.
- Tool sandbox quotas + billing limit alerts.
- Documentation polish and cross-links (README, `docs/ai-ide-quality-status.md`, this plan).

## Immediate Action Checklist (avoid duplication by updating this table after each change)
| Item | Owner | Blocking Dependencies | Verification | Notes |
| --- | --- | --- | --- | --- |
| Extract all user-facing strings in `packages/ai-ide/src/browser/branding` into `nls` | UI squad | None (existing `nls` infra) | `npm run test:ai-ide` + new smoke asserting `ai-ide-branding-widget` text | Update `docs/ai-ide-quality-status.md` once merged |
| Bundle Inter + codicons locally and switch `frontend-module.ts` to local-first | Platform squad | Asset hosting decision | Manual offline launch + Playwright smoke | Document bundle location in README |
| Add quick action + status command for `BillingAdminWidget` + mocha widget test | Admin squad | Billing copy ready | `npm run test:ai-ide` (widget spec) | Also update `docs/ai-ui-map.md` screenshots |
| Wire `tools/ci/write-playwright-summary.mjs` into `ci-playwright.yml` and enable nightly dispatch | CI squad | Access to repo secrets | Dry-run workflow_dispatch, ensure `diagnostics/PLAYWRIGHT_SUMMARY.txt` artifact exists | Link artifact in PR comment |
| Draft secure-storage spike (choose Theia storage vs. vault proxy) | Platform squad | Security review | Architecture doc addendum + PoC unit test | Resolves open question #1 |

> Keep this checklist short-lived: once an item lands, remove it here and update the relevant status docs to avoid multiple sources of truth.

## Verification & Anti-Dup Strategy
- **Single source of truth:** scripts live under `tools/**`; workflows call them instead of duplicating inline logic.
- **Regression gates:** every feature ships with unit + Playwright (or visual) coverage; CI must run relevant suites before merge.
- **Change tracking:** update `docs/ai-ide-quality-status.md` checklist when closing a gap and cross-reference this plan.
- **Audit cadence:** weekly review of localization status, asset bundling checksums, and CI artifact completeness.

## Execution Playbook
1. **Scoping:** confirm the owner, dependencies, and verification method via the Immediate Action Checklist; open a tracking issue referencing this plan section.
2. **Implementation:** keep changes scoped to a single feature gap; if new scripts are required, place them under `tools/**` and reuse them in workflows/tests to prevent duplication.
3. **Validation:** run the relevant commands locally (unit, Playwright, diagnostics) and attach artifact snapshots/screenshots when touching UI/theme files; document any deviations.
4. **Documentation:** update `README.DEV.md`, `docs/ai-ide-quality-status.md`, and this plan (remove the checklist entry) in the same PR; note verification steps in the PR description.
5. **Post-merge:** ensure nightly or cron workflows include the new coverage; monitor the next run for regressions and log findings in `diagnostics/` as needed.

## Open Questions
1. Preferred secure storage backend (Theia secret storage vs. custom key vault proxy)?
2. Target locales after en-US baseline (pt-BR first, then es-ES?).
3. Ownership of nightly Playwright infrastructure (team vs. automation agent).

---
Maintainers should treat this document as the coordination hub for the "make it the best IDE" initiative; update sections as tasks progress to keep contributors aligned and avoid redundant efforts.
