# QUARANTINED — Electron runtime templates

**Status:** Quarantined from product ship claims (Block 9 / `DEBT-DESK-007` — **CLOSED** as non-ship).

This tree (`runtime-templates/{windows,macos,linux}`) is a legacy **Electron** game-runtime packaging scaffold.

## Binding rules

- **NOT a ship path** for Aethel Studio / Studio Local.
- Canonical desktop product is **`apps/studio-local/`** (Tauri 2).
- Do not cite these templates as evidence for "desktop ready", signed installers, or sidecar release readiness.
- Keep the tree only as historical / build-queue reference until a dedicated archive move; never wire it as the IDE release channel.

## See also

- `apps/studio-local/src/desktop-capability-manifest.ts` — `runtimeTemplatesPolicy: 'quarantined-not-ship-path'`
- `docs/architecture/AI_CRITIQUE_DEBT_REGISTRY.md` — `DEBT-DESK-007`
