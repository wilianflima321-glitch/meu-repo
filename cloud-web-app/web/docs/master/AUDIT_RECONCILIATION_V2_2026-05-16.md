# Audit Reconciliation V2 - 2026-05-16

This note reconciles the refreshed end-to-end audit with the current working tree. It is intentionally short: the goal is direction for agents, not another archive pile.

## Closed In This Work Block

- Source encoding: BOM removed from TS/TSX/MJS sources and guarded by `npm run qa:source-encoding`.
- Route resilience: global `app/error.tsx`, global `app/loading.tsx`, and critical segment boundaries now exist for admin, IDE, billing, profile, marketplace, pricing, studio, and deploy.
- Route UX gate: `npm run qa:route-experience-spine` now blocks missing critical loading/error boundaries and page-size regressions.
- Large routes: `/admin/apis` and `/deploy/[id]` were split into route-local parts.
- Deep repository scan: `npm run spine:scan` and `deep-spine-scan` Tool Bus governance exist for MB/GB-scale inspection without auto-fix.
- PT inventory: `npm run i18n:scan-pt` generates `docs/PT_HARDCODED_INVENTORY.csv` with file, line, string, and domain.
- Production validation: `npm run build` passes after the boundary and encoding changes.

## Audit Claims That Are Stale Or Partially Closed

- `error.tsx = 0`: stale. Global and critical segment error boundaries now exist.
- `loading.tsx = 1`: stale. Global and critical segment loading boundaries now exist.
- `BOM = 58`: stale for source files. The source encoding gate currently reports zero BOM files.
- `risk-firewall missing`: partially stale. `high-risk-action-firewall`, `browser-operator-safety`, and Tool Bus integration exist. Remaining work is UI replay review and approval UX depth.
- `/admin/apis` monolith: stale. It is now split under `app/admin/apis/page.parts.tsx`.
- `/deploy/[id]` monolith: stale. It is now split under `app/deploy/[id]/page.parts.tsx`.

## Still True And High Priority

- Admin has too many physical routes. Registry consolidation exists, but the UX still needs a true six-area operating model.
- i18n is still not finished. The new inventory shows 743 component findings, led by product, IDE, and dashboard domains.
- Render reality is still the biggest honesty risk. Contracts are strong; real WebGPU/path tracing/sidecar evidence needs a separate proof matrix.
- Game/film AAA must stay labeled as R&D alpha until asset graph, validation graph, playtest evidence, performance evidence, and release approval are all first-class.
- Performance needs a dependency-boundary audit: Three/Monaco should stay isolated to IDE/studio/viewport surfaces or lazy-loaded.
- Marketplace needs licensing, provenance, payout history, and anti-fraud evidence before a serious creator launch.

## Next Audit Packets

1. `AUDIT_ADMIN_OPERATING_MODEL_V3`: reduce the user-facing admin experience to six areas while preserving legacy route compatibility.
2. `AUDIT_I18N_ZERO_PT_V3`: migrate the 743 PT findings by domain with ratchets that only go down.
3. `AUDIT_RENDER_REALITY_MATRIX_V1`: mark render files as `functional`, `contract`, `stub`, or `external`, then build one real WebGPU proof.
4. `AUDIT_AGENT_WORKFORCE_ROI_V1`: canonicalize roles, cost class, handoff targets, quality metrics, and scopes.
5. `AUDIT_BROWSER_OPERATOR_REPLAY_V1`: verify replay storage, pause/takeover, approval UI, and high-risk action review UX.
6. `AUDIT_MARKETPLACE_TRUST_V1`: license engine, provenance trail, payout history, anti-fraud, and refund evidence.
7. `AUDIT_BUNDLE_BOUNDARIES_V1`: enforce heavy dependency isolation for Three, Monaco, R3F, and Framer Motion.
8. `AUDIT_GAME_FILM_ALPHA_HONESTY_V1`: align marketing copy with production reality: apps/research production, game/film alpha.

## Recommended Next Execution Order

1. Split `/admin/god-view`, `/admin/collaboration`, and `/profile` using the same route-local parts pattern.
2. Migrate `product`, `ide`, and `dashboard` rows from `PT_HARDCODED_INVENTORY.csv` into locale catalogs first.
3. Add a render reality matrix and one executable WebGPU smoke proof before adding more AAA claims.
4. Add bundle-boundary scan for direct `three` and `monaco-editor` imports outside approved surfaces.
5. Add marketplace license/provenance evidence before expanding creator distribution.
