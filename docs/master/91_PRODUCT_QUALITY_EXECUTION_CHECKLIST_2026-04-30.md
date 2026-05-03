# 91_PRODUCT_QUALITY_EXECUTION_CHECKLIST_2026-04-30
Date: 2026-04-30
Status: ACTIVE
Role: execution checklist derived from the canonical quality triage

## Purpose
Turn `90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md` into a practical execution board.

This document is intentionally short.
It should guide improvement of what already exists instead of inventing new product families.

## Source Of Truth
Use this checklist only with:
- `docs/master/90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md`
- `docs/master/89_WEB_LIGHT_STUDIO_CLOUD_LOCAL_ARCHITECTURE_2026-04-29.md`
- `AETHEL_INTERFACE_BLUEPRINTS/00_INDEX.md`
- `AETHEL_INTERFACE_BLUEPRINTS/19_BEST_IN_MARKET_CLEAN_UX_GUARDRAILS.md`
- `docs/master/92_V10_AUDIT_RECONCILIATION_2026-04-30.md`
- local UX arsenal folder `AETHEL_UX_ARSENAL_2026-04-29/00_ARSENAL_INDEX.md` when present outside the repo

## Current Product Order
The canonical product path is:
1. `Web Light`
2. `Studio Home`
3. `Studio Cloud`
4. `Operator`
5. `Studio Local`

The user should never feel that they moved from one product into another.

## Execution Rules
1. Improve existing surfaces before creating new ones.
2. Preserve `Studio Home` as the initial logged-in Studio shell.
3. Keep each surface to one dominant protagonist.
4. Use images as quality references, not literal design truth.
5. Reduce visible text before adding new explanatory copy.
6. Treat platform confidence as product quality, not only engineering debt.

## P0 Checklist
### Platform Confidence
Goal:
- make the product feel repeatably trustworthy.

Do:
- keep `npm run qa:enterprise-gate` green,
- keep `npm run qa:canonical-doc-alignment` green,
- run `npm run qa:product-quality-progress` before accepting broad audit claims,
- keep `git diff --check` clean,
- continue isolating build/prerender blockers honestly.

Do not:
- claim full platform confidence from UX-only improvements.

### Mojibake And Text Cleanliness
Goal:
- remove visible encoding and copy-quality defects from product-critical docs and UI.

Do:
- reduce the `docs/MOJIBAKE_SCAN.md` finding count,
- prioritize public, Studio Home, AI, preview, and docs surfaces.

Do not:
- rewrite broad content just to make the count look lower.

## P1 Checklist
### Viewport And Review Authority
Goal:
- make the artifact feel like the decision stage.

Do:
- tighten `WorkbenchPreviewPane.tsx`,
- tighten `WorkbenchPreviewRuntimeSurface.tsx`,
- keep trust/readiness visible but compact,
- make live vs proposal states unmistakable.

Do not:
- let preview become a small widget beside chat.

### Operator Inevitability
Goal:
- make internet/browser work feel native and governed.

Do:
- bring operator states into the same Studio grammar,
- expose plan, approvals, evidence, and takeover controls,
- connect operator actions back to mission and artifact review.

Do not:
- present browser automation as hidden magic.

### AI To Artifact Loop
Goal:
- keep AI work tied to visible output, evidence, diff, and approval.

Do:
- continue consolidating `AI -> diff -> review -> apply`,
- keep evidence and economics near the work,
- compress AI telemetry into operational rails.
- keep `AIChatCostMeter` user-facing and `AIMarginSnapshotPanel`/`AIMarginDrilldownPanel` operator-facing so token spending is visible without polluting the main flow.

Do not:
- grow a second generic chat product inside the Studio.
- show revenue dashboards without AI margin context.

## P2 Checklist
### Buyer And Trust Continuity
Goal:
- make serious buyers understand proof, governance, and roadmap without leaving the product story.

Do:
- improve case-study depth,
- improve docs search and procurement path,
- keep claims grounded in real capabilities.

Do not:
- add fake customer proof or inflated compliance language.

### Studio Local
Goal:
- turn the local Studio blueprint into a concrete implementation contract.

Do:
- define local install, sync, filesystem, runtime, and rollback boundaries,
- preserve the same shell grammar as Studio Cloud.

Do not:
- create a separate desktop-product identity.

### Domain Depth
Goal:
- make apps, research, cloud, games, and media feel specialized without fragmenting the product.

Do:
- use triage to choose default surfaces,
- keep one shared project model,
- add validators and review grammar per domain.

Do not:
- create separate navigation families for every domain.

## Visual Reference Rules
### Firebase
Use for:
- first-use clarity,
- mission input,
- low copy.

Never use for:
- lowering Studio depth.

### Vercel / Linear
Use for:
- density discipline,
- scanning,
- consistent product language.

Never use for:
- generic analytics dashboards.

### Aethel cockpit image
Use for:
- integrated professional tooling ambition.

Never use for:
- forcing dense cockpit UI onto first-time users.

### Unreal
Use for:
- viewport authority,
- inspector seriousness,
- advanced domain density.

Never use for:
- beginner Web Light or Studio Home defaults.

## Ready For Implementation Definition
A future implementation wave is aligned when it can answer:
- which canonical surface is being improved,
- which user persona benefits,
- which dominant surface should win,
- which existing files are being improved,
- which validation proves it did not regress,
- and which open gap remains afterward.

## Current Next Best Work
The next implementation waves should prioritize:
1. platform confidence and mojibake cleanup,
2. viewport/review/operator authority,
3. AI-to-artifact consolidation,
4. buyer proof and docs continuity,
5. Studio Local implementation contract.
