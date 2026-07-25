# ⚠️ DEPRECATION NOTICE — AETHEL CLI LEGACY (Phase P1 Consolidation)

**Status:** `DEPRECATED` — superseded by `packages/aethel-kernel-rust` and `apps/studio-local`.

## Migration Mapping

| Legacy File | Canonical Successor | Description |
|---|---|---|
| `physics.js` | `packages/aethel-kernel-rust/src/position_based_dynamics.rs` | Migrated from JS physics to native 60FPS Rust XPBD physics. |
| `server.js` | `cloud-web-app/web/lib/server/websocket-server.ts` | Migrated to Next.js / WebSocket server architecture. |
| `verifier.js` | `packages/aethel-kernel-rust/src/formal_logic_verifier.rs` | Migrated to formal logic verification kernel in Rust. |
| `proxy-shim.js` | `apps/studio-local/src-tauri/src/sidecars.rs` | Migrated to Tauri native sidecar management. |

This directory is preserved for reference only and is no longer part of active runtime builds.
