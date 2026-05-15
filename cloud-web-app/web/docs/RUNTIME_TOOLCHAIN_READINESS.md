# Runtime Toolchain Readiness

This document captures the local runtime spine policy for heavy game, film, asset, and render work. It is intentionally separate from the main UI: the browser remains a responsive preview and orchestration shell, while heavy work is routed to sidecar, cloud sandbox, or held states.

## Ready Lanes

The governed local toolchain now covers:

- Media evidence: `ffmpeg`, `ffprobe`.
- DCC and offline render: `blender`.
- Asset optimization: `gltf-transform`, `meshoptimizer`, `gltfpack`.
- GPU texture pipeline: `toktx` from KTX-Software/BasisU.
- Scene interchange metadata: `usdcat` backed by OpenUSD Python bindings.
- External engine bridge baseline: `godot`.
- Native build baseline: `cmake`, `ninja`, `cargo`, `rustc`, `zig`, `zig-cc`, `zig-cxx`.
- Gameplay runtime adapters: `recast-cli` for navmesh/pathfinding and `rapier` for physics validation.

The local probe writes a machine-specific readiness report to `.aethel/toolchain/RUNTIME_TOOLCHAIN_LOCAL_INSTALL_REPORT.md`. That report is ignored by git because it contains local paths and digests.

## Held By Design

The following capabilities are not considered ready until a human explicitly installs, accepts licenses, and confirms target project scope:

- `unreal-export-bridge`: requires Unreal Engine/Epic licensing and a user-selected project.
- `unity-export-bridge`: requires Unity licensing and a user-selected project.
- `ozz-animation`: source is allowed, but the native adapter remains source-only until a bounded build job produces versioned evidence.

Held does not mean broken. It means Aethel can plan, validate, and produce blockers without pretending a final backend exists.

## Non-Negotiable Policy

- No optional tool is downloaded silently.
- Every executable tool needs a probe command, license, checksum policy, and manual-consent policy before production use.
- Heavy render, shader compile, asset optimization, indexing, browser automation, and playtest jobs must never run on the browser main thread.
- Manifest-only render output cannot become `done`; it remains `held` until native or cloud evidence exists.
- Weak devices route heavy jobs to `cloud-sandbox` or `held`.

## Quality Gates

- `npm run qa:runtime-engine-spine` validates the contracts, sidecar model, and runtime safety policy.
- `npm run qa:local-runtime-toolchain` probes this machine and fails if any governed tool is missing or returns a review/error state.
- `npm run typecheck` keeps the TypeScript bridge aligned with the Rust Studio Local contract.

