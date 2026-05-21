# Editor Scale Readiness V22

This guard makes the large creative editors honest about scale before they become slow or visually misleading.

## Protected Surfaces

- `world-outliner`: scene hierarchy scale, backed by virtualization.
- `details-panel`: inspector/property scale, backed by progressive disclosure and future panel splitting.
- `content-browser`: asset library scale, backed by virtualized grid/list rows.

## Status Model

- `ready`: the surface is inside the interactive budget.
- `watch`: the surface is healthy, but the project is large enough to monitor interaction cost.
- `guarded`: the surface is at high-scale risk and must keep heavy panels virtualized, collapsed, or moved behind sidecar/runtime boundaries.

## Budgets

- `world-outliner`: ready through 1,000 scene objects; watch through 5,000; guarded above that.
- `details-panel`: ready through 80 properties; watch through 240; guarded above that.
- `content-browser`: ready through 1,000 assets; watch through 5,000; guarded above that.

## Product Rule

Editors may show high-scale content, but they must not pretend every project remains cheap. The UI should show scale readiness, and any future heavy execution must stay behind Studio Local, worker, or cloud capability checks.

## Gate

Run `npm run qa:editor-scale-readiness`.
