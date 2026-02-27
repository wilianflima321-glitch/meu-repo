# 36_HISTORICAL_MD_ABSORPTION_AND_ORPHAN_TRIAGE_2026-02-22
Status: DECISION-COMPLETE TRIAGE (ANTI-HALLUCINATION)
Date: 2026-02-22
Owner: PM Tecnico + Arquiteto-Chefe + Agente Critico

## 0) Why this file exists
1. Confirm what is already documented from recent conversation.
2. Verify anti-hallucination posture using reproducible scans.
3. Triage historical markdown suggestions and detect loose/orphan pieces.

## 1) Coverage of recent conversation in canonical docs
Covered and published:
1. one-shot closure and wave tracking: `31_ONE_SHOT_CLOSURE_EXECUTION_2026-02-22.md`
2. character/story AAA consistency model: `32_STUDIO_AAA_CHARACTER_STORY_QUALITY_PLAN_2026-02-22.md`
3. full subarea status matrix: `33_COMPLETE_SUBAREA_ALIGNMENT_AND_GAP_MATRIX_2026-02-22.md`
4. web vs local runtime model: `34_WEB_VS_LOCAL_STUDIO_EXECUTION_MODEL_2026-02-22.md`
5. agentic parallel guardrails + manual editing usability: `35_AGENTIC_PARALLEL_CAPABILITIES_AND_USABILITY_GUARDRAILS_2026-02-22.md`

## 2) Anti-hallucination verification snapshot
Executed in this phase:
1. `qa:route-contracts` -> PASS (`checks=38`)
2. `qa:no-fake-success` -> PASS (`files=246`)
3. `typecheck` (`cloud-web-app/web`) -> PASS
4. `lint` (`cloud-web-app/web`) -> PASS
5. `qa:repo-connectivity` -> PASS
6. `qa:canonical-doc-governance` -> PASS

Factual constraints still enforced:
1. capabilities not ready stay explicit (`NOT_IMPLEMENTED`, `DEPRECATED_ROUTE`, etc.).
2. no L4/L5 or full desktop parity claim promoted without evidence.

## 3) Historical markdown absorption status
From governance scans:
1. total markdown files: `3643`
2. canonical markdown: `38`
3. historical/outside canonical: `3605`

Policy lock:
1. historical docs are directional only.
2. external claims must remain tagged as `EXTERNAL_BENCHMARK_ASSUMPTION` until internal proof.
3. no roadmap/promise is promoted from historical docs directly.

## 4) Loose/orphan piece triage (factual)
### 4.1 Repository-level residuals
1. legacy workflow candidate still present:
- `.github/workflows/merge-unrelated-histories.yml` (`LEGACY_CANDIDATE`)
2. near-limit structural debt remains:
- `nearLimitFiles=37` (1100-1199 lines), `oversizedFiles=0`
3. compatibility debt remains explicit:
- `fileCompatWrappers=8`

### 4.2 Empty directory scan (focused product surfaces)
Detected empty directories in active app/components surfaces:
1. `cloud-web-app/web/app/(landing)`
2. `cloud-web-app/web/app/register`
3. `cloud-web-app/web/components/statusbar`
4. `cloud-web-app/web/components/vcs`
5. `cloud-web-app/web/components/_deprecated/command-palette`
6. `cloud-web-app/web/components/_deprecated/git`
7. `cloud-web-app/web/components/_deprecated/layout`
8. `cloud-web-app/web/components/_deprecated/status-bar`

Interpretation:
1. these are structural leftovers; not production capabilities.
2. they should be either removed, archived, or explicitly marked as intentional placeholders.

## 5) P0 actions from this triage
1. keep canonical-only decision policy (already enforced).
2. close empty-directory leftovers in active product tree (`app/components`) with keep/remove decision.
3. keep legacy workflow owner decision explicit (`restrict/archive`).
4. continue near-limit decomposition wave (`37 -> <=30`).
5. keep wrapper-cutoff policy tied to telemetry cycles.

## 6) Non-claims
1. this triage does not claim full closure of all historical content.
2. this triage does not claim all legacy folders are removable without owner decision.
3. this triage does not promote new capabilities; it hardens evidence discipline.

## 7) Delta update 2026-02-22T23:54Z (cleanup execution)
Executed after initial triage:
1. removed focused empty directories previously listed in active product surfaces.
2. introduced enforcement scanner + QA gate:
- `tools/active-surface-hygiene-scan.mjs`
- `qa:active-surface-hygiene`

Verification:
1. active-surface empty directory count is now `0`.
2. residual orphan concerns remain:
- historical markdown volume (`3605`)
- legacy workflow candidate (`merge-unrelated-histories.yml`)
- structural near-limit and compatibility-wrapper debt.

## 8) Delta update 2026-02-25T00:14Z (governance hardening + refreshed factual baseline)
Executed:
1. refreshed governance scans with current canonical set:
- `qa:canonical-doc-governance` -> PASS
- `qa:repo-connectivity` -> PASS
- `qa:workflow-governance` -> PASS.
2. added non-growth hard lock for historical markdown in governance gate:
- `qa:canonical-doc-governance` now runs with `--max-historical-markdown 3603`.

Updated baseline:
1. total markdown files: `3644`
2. canonical markdown files: `41`
3. historical/outside canonical: `3603`
4. missing listed canonical docs: `0`
5. canonical name conflicts outside canonical folder: `0`

Interpretation:
1. historical debt remains high but is now growth-locked.
2. next hygiene waves should target reduction by root (`cloud-admin-ia`, `shared`, `docs`) without altering canonical authority policy.
