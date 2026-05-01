# 92_V10_AUDIT_RECONCILIATION_2026-04-30
Date: 2026-04-30
Status: ACTIVE
Role: factual reconciliation layer for the user-provided V10 audit

## Purpose
Use the V10 audit as a strong execution input, but never as an unquestioned truth.

The rule for all future agents is:
- validate with local files before changing architecture,
- keep the product path from `90` and `91`,
- prefer improving existing surfaces over adding duplicate product families,
- measure progress with `npm run qa:product-quality-progress`.

## Verified Local Snapshot
Command used:

```bash
npm run qa:product-quality-progress
```

Current verified readout after the 2026-05-01 quality pass:
- `console.log/info/debug` in app code: `0` -> closed for the measured app-code scope.
- Hardcoded hex in component TSX: `501` -> still a major design-system gap, down from `775`.
- `: any` in app code: `1136` -> still a major strictness gap.
- PT hardcoded component strings: `287` -> still a major i18n/product-language gap.
- Component files over `1000` lines: `27` -> still a major maintainability gap, down from `28`.
- Web unit/spec tests: `64` -> V10 claim of `12` is stale for the current branch.
- E2E specs: `10` -> still below the target of `15`.
- Prisma migration folders: `0` -> confirmed open gap.
- Active-doc absolute local paths: `0` -> closed for active docs in the progress scanner scope.
- Next Image optimization: `PASS` -> V10 claim that `unoptimized: true` is active is stale.
- TypeScript `noImplicitAny`: `false` -> confirmed open gap.
- Jest coverage ratchet: `PASS` -> V10 claim that coverage is disabled is stale.
- Deploy UI wired to `/api/deploy`: `PASS` -> V10 claim that deploy UI is absent is stale.

## Reconciled V10 Claims
### Confirmed Open
- Prisma migrations are still not versioned.
- `noImplicitAny` is still disabled.
- `: any` debt is still too high to enable strictness safely in one step.
- Hardcoded component colors remain a large design-system gap.
- Several engine/media/editor components are still too large.
- E2E coverage is below target.
- Active docs are now clean of local absolute paths in the progress scanner scope; keep this at `0`.

### Stale Or Already Improved
- Next Image optimization is not currently disabled.
- Jest coverage is not absent; it is configured with a progressive ratchet.
- Deploy is not only backend. The IDE topbar already had deploy wiring, and the canonical reusable surface is now `cloud-web-app/web/components/deploy/DeployButton.tsx`.
- Current console debt is much lower than the V10 number when scanning `console.log/info/debug` in app code only.
- Current test count is higher than the V10 number.

## 2026-05-01 Progress Applied
- Design-system consistency warning closed: `qa:design-system-consistency` now reports `0` findings.
- `TerminalWidget.tsx` no longer owns ANSI theme palettes or hex fallbacks; terminal palettes now live in `cloud-web-app/web/lib/terminal/terminal-themes.ts`.
- `SceneEditor.tsx` and `SoundCueEditor.tsx` had component-level hex styling replaced with CSS variables where safe.
- `SoundCueEditor.tsx` is no longer over `1000` lines after extracting `sound-cue-models.ts`.

## Canonical Execution Impact
Do not create another deploy button family.
Use `DeployButton` for all deploy entry points and keep `/api/deploy` as the backend contract.

Do not turn `noImplicitAny` on blindly.
First reduce the top offenders reported by `qa:product-quality-progress`, then ratchet the flag.

Do not create fake migrations without a real database baseline decision.
The migration gap should be closed with an explicit Prisma baseline plan and validation.

Do not chase raw counts by rewriting broad documents blindly.
For docs, clean active product-critical files first; archives are intentionally excluded from the progress scanner.

## Next Highest-ROI Blocks
1. Reduce hardcoded hex in the top TSX offenders reported by the progress script.
2. Reduce `: any` in the top server/runtime extension files.
3. Split the engine/media god components that are actually reachable from current product surfaces.
4. Add five missing E2E specs around first value, deploy, Studio Home, preview/review, and theme/navigation.
5. Create a safe Prisma migration baseline only after confirming the target database state.
