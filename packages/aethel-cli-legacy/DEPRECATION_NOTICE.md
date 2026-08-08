# ⚠️ NON-PRODUCTION / HELD — AETHEL CLI LEGACY

**Status:** `HELD` · `DEPRECATED` · **not a ship path**

Superseded by `packages/aethel-kernel-rust`, `apps/studio-local`, and `cloud-web-app/web`.

This directory is preserved for reference only. It is **not** part of active runtime builds, npm product scripts, or Release Trains.

## Fail-closed entrypoint (P2b HIGH #13)

`server.js` **always exits 1**. The former `mock-core` LLM backend is removed from the boot path so it cannot emit mock `success` as a default production-shaped service.

Explicit local mock tooling (if needed for archaeology) lives under `tools/llm-mock/`, not this package.

## P2b MEDIUM #34–#35 (latent TODOs)

Legacy `context-store.ts` / `llm-integration-bridge.ts` TODOs for auth context, vector search, and cache hit-rate tracking are marked **HELD** — they are not product debt. Canonical successors: Next.js auth + J.4 vector index + production LLM bridge under `cloud-web-app/web`.

## Migration Mapping

| Legacy File | Canonical Successor | Description |
|---|---|---|
| `physics.js` | `packages/aethel-kernel-rust/src/position_based_dynamics.rs` | Migrated from JS physics to native Rust XPBD physics. |
| `server.js` | `cloud-web-app/web` + `tools/llm-mock/server.js` | Product APIs in Next.js; explicit local mock tooling only. |
| `verifier.js` | `packages/aethel-kernel-rust/src/formal_logic_verifier.rs` | Migrated to formal logic verification kernel in Rust. |
| `proxy-shim.js` | `apps/studio-local/src-tauri/src/sidecars.rs` | Migrated to Tauri native sidecar management. |

**Do not** market, deploy, or default-start this package as a backend.
