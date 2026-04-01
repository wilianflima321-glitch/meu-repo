# 00_FONTE_CANONICA
Data: 2026-03-03
Status: CANONICAL

## Purpose
This file defines the canonical source of truth for Aethel.
The canonical governance layer lives in `docs/master/`.
The canonical interface layer lives in `AETHEL_INTERFACE_BLUEPRINTS/` when explicitly referenced by `docs/master/`.
Any Markdown outside those chains is historical unless explicitly referenced by a canonical document.

## Mandatory First Read
1. `docs/master/00_INDEX.md`
2. `docs/master/10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md`
3. `docs/master/65_STUDIO_PRODUCT_BLUEPRINT_2026-03-24.md`
4. `docs/master/66_AI_OPERATIONAL_EXPERIENCE_BLUEPRINT_2026-03-24.md`
5. `AETHEL_INTERFACE_BLUEPRINTS/00_INDEX.md`
6. `AETHEL_INTERFACE_BLUEPRINTS/08_WORKBENCH.md`

## Canonical Documents (Execution Scope)
- `docs/master/00_INDEX.md`
- `docs/master/10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md`
- `docs/master/26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28.md`
- `docs/master/31_EXECUTIVE_REALITY_GAP_ALIGNMENT_2026-02-28.md`
- `docs/master/32_GLOBAL_GAP_REGISTER_2026-03-01.md`
- `docs/master/39_STUDIO_UNIFIED_INFORMATION_ARCHITECTURE_2026-03-11.md`
- `docs/master/41_DOCS_NAMING_NORMALIZATION_2026-03-21.md`
- `docs/master/43_ADMIN_SYSTEM_SPEC_2026-03-22.md`
- `docs/master/44_BACKEND_SYSTEM_SPEC_2026-03-22.md`
- `docs/master/45_AI_SYSTEM_SPEC_2026-03-22.md`
- `docs/master/46_LIMITATIONS_2026-03-22.md`
- `docs/master/48_WORKBENCH_SPEC_2026-03-22.md`
- `docs/master/65_STUDIO_PRODUCT_BLUEPRINT_2026-03-24.md`
- `docs/master/66_AI_OPERATIONAL_EXPERIENCE_BLUEPRINT_2026-03-24.md`
- `docs/master/68_L5_UX_HARDENING_DELTA_2026-04-01.md`

## Canonical Interface Layer
The interface, UX, shell, mode, state, and component source of truth is:
- `AETHEL_INTERFACE_BLUEPRINTS/00_INDEX.md`
- `AETHEL_INTERFACE_BLUEPRINTS/08_WORKBENCH.md`
- `AETHEL_INTERFACE_BLUEPRINTS/15_MOBILE_COMPANION.md`
- `AETHEL_INTERFACE_BLUEPRINTS/16_MASTER_FIGMA_PROMPT.md`

These files are not optional references.
They are the active implementation-grade interface contract for Aethel.

## Historical note
- `Relatorio_de_Continuacao_Auditoria_Multi-Agente.md` is historical and contains legacy external-path references; do not use it for current execution decisions.

## Master Contract Policy
- `10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md` is the single execution master.
- `11` and `12` remain historical compatibility records and are superseded by `10`.
- New execution deltas must be appended to `10` and reflected in `13/14/17/18/20` when applicable.
- `65` and `66` define the product and AI-operational experience direction.
- `AETHEL_INTERFACE_BLUEPRINTS/` defines the canonical interface layer.
- If an older UX or workbench document conflicts with the blueprint set, the blueprint set wins for interface decisions.

## Non-Negotiable Rules
- No mock, placeholder, or fake success in critical user journeys.
- Unavailable capability must remain explicit (`NOT_IMPLEMENTED`, `DEPRECATED_ROUTE`, etc.).
- Conflicts between docs are resolved by `00_INDEX` + `10` + latest dated delta.
- Active numerical baseline conflicts are resolved by `26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28.md` until a newer baseline file exists.
- Legacy non-numbered docs in `docs/master/` are not canonical if a numbered replacement exists.
- Legacy non-numbered docs outside the explicit canonical chain are compatibility artifacts only.
- External benchmark claims only enter canonical docs as `EXTERNAL_BENCHMARK_ASSUMPTION` until verified in-repo.
- Operational UX/market claims must align with `31_EXECUTIVE_REALITY_GAP_ALIGNMENT_2026-02-28.md`.
- Repo-wide factual gap counts must align with `32_GLOBAL_GAP_REGISTER_2026-03-01.md`.
- L4/L5 promotion execution must align with `33_L4_L5_CORE_LOOP_PROMOTION_PROGRAM_2026-03-03.md`.

## Execution Baseline
- Entry UX: `dashboard`/home journey; `/ide` remains advanced workbench.
- Product scope is fixed (no new parallel product shell).
- AI capability claims above L3 are blocked without operational evidence.

