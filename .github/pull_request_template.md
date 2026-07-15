## Summary

<!-- What changed and why -->

## Scope

- [ ] No new product/shell added outside `/ide`
- [ ] No business-scope expansion in this PR
- [ ] Legacy behavior remains phased (no abrupt removal without telemetry policy)

## Validation Evidence

Paste command outputs or links to workflow runs.

```bash
npm --prefix cloud-web-app/web run lint
npm --prefix cloud-web-app/web run typecheck
npm --prefix cloud-web-app/web run qa:interface-gate
npm --prefix cloud-web-app/web run qa:canonical-components
npm --prefix cloud-web-app/web run qa:route-contracts
npm --prefix cloud-web-app/web run qa:no-fake-success
npm --prefix cloud-web-app/web run qa:mojibake
```

## Contract Compliance (Required)

- [ ] No `success: true` returned together with error payloads
- [ ] `NOT_IMPLEMENTED` paths return explicit non-2xx status
- [ ] Deprecated routes keep `410 DEPRECATED_ROUTE` with deprecation metadata
- [ ] No fake/placeholder success states in UX critical paths

## Risk & Rollback

<!-- Main risk and rollback steps -->

## Screenshots / UX Notes (if UI changed)

<!-- Before/after images or concise UX deltas -->
