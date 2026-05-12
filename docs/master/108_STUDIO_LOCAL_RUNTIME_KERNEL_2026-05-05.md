# 108_STUDIO_LOCAL_RUNTIME_KERNEL_2026-05-05

Date: 2026-05-05
Status: ACTIVE
Role: canonical execution contract for Aethel Studio Local as the heavy native runtime behind the clean web Studio.

## Why This Exists

Aethel should keep the browser experience clean, but heavy app, game, film, asset, Browser Operator, local AI, build, render, playtest, and indexing work needs a stronger local runtime.

The chosen base is Tauri + Rust. The first implementation focus is the Runtime Kernel, not a new visual shell.

This document does not claim Unreal parity. Unreal remains the benchmark for renderer/editor gaps such as world partition, LOD and streaming, lighting tiers, Sequencer, Niagara, Control Rig, Movie Render Queue, profiling, packaging, and playtest evidence. Aethel's stronger path is hybrid orchestration: Project Brain, Mission Ledger, Repository Cartography, runtime routing, evidence, approvals, and local/cloud execution.

## Implemented Kernel Anchors

- `apps/studio-local` is the Studio Local app shell.
- `apps/studio-local/src-tauri` contains the Rust runtime kernel and Tauri configuration.
- `packages/runtime-contracts` contains shared TypeScript contracts for web, local app, workers, and agent payloads.
- Root `desktop:dev`, `desktop:build`, and `desktop:test` now point at Studio Local instead of fake-skipping a missing desktop app.
- `qa:studio-local-runtime` prevents the local runtime from drifting back into prose-only or skipped desktop behavior.

## Runtime Endpoints

The local kernel contract exposes these local endpoints:

- `GET /health`
- `POST /probe`
- `POST /jobs`
- `GET /jobs/:id`
- `POST /jobs/:id/cancel`
- `POST /sync/cloud`

The local probe records OS, architecture, CPU core count, memory/storage signals where available, GPU/NPU signals, Windows ML/DirectML/ONNX indicators, FFmpeg/Rapier/browser automation availability, thermal state, storage pressure, preferred executor, timestamp, and signature.

## Runtime Targets

Every heavy action must resolve to one of these targets before execution:

- `local-native`: Studio Local native runtime may use GPU/NPU/native sidecars safely.
- `local-worker`: local worker lane, not the UI main thread.
- `local-main-safe`: tiny local work that is safe in the app shell.
- `cloud-sandbox`: isolate heavy work away from the user device.
- `held`: do not start until user/device/policy conditions change.

## Job Lanes

The native runtime lane vocabulary is:

- `ai-local-inference`
- `memory-indexing`
- `asset-import`
- `viewport-render`
- `build-export`
- `browser-operator`
- `file-sync`
- `playtest`
- `render-queue`

Browser Operator, build/export, and render queue lanes require human approval when risk is present. Thermal critical or storage critical states must hold work instead of pretending the machine can continue safely.

## Agent Robustness Rules

- Producer/Senior Agent coordinates parallel agents, but every local job still needs Project Brain, Mission Ledger, Repository Cartography, scope lock, evidence requirements, rollback, runtime target, and cost limit.
- Giant repositories and asset packs require cartography before edits or downloads.
- Agents must not edit the same ownership area blindly.
- Browser Operator work must provide plan, approval, replay, pause/takeover, and evidence before risky logged-in actions.
- Game/film work must attach Asset Graph, Scene/World Graph, Gameplay Graph or Shot/Film Graph state plus validation evidence before done.

## Next Implementation Blocks

1. Replace environment-signal probe placeholders with OS-native probes for RAM, disk, GPU, Windows ML, DirectML, ONNX Runtime, FFmpeg, browser automation, and thermal state.
2. Add a signed cloud sync handshake so `/api/runtime/local-capabilities` can verify fresh native probes from Studio Local.
3. Wire local job creation into existing `runtime-execution-router` and background job APIs.
4. Add asset sidecars for FFmpeg, thumbnails, proxy media, mesh optimization, texture compression, and playtest/render evidence capture.
5. Add recovery storage so interrupted jobs can resume and preserve Mission Ledger evidence after crash.

## Validation

Run:

- `npm run qa:studio-local-runtime`
- `npm run qa:product-quality-progress`
- `npm run qa:enterprise-gate`
- `npm --prefix apps/studio-local run test` once Rust and Tauri are installed locally.

## 2026-05-05 Cloud Bridge Update

The cloud bridge now accepts both legacy browser/native reports and the Studio Local Runtime Kernel probe contract. `cloud-web-app/web/lib/device/local-runtime-bridge.ts` normalizes `generatedAt`, `cpuLogicalCores`, memory/storage MB, GPU/NPU flags, Windows ML, DirectML, ONNX, thermal state, storage pressure, and `held` executor decisions into the existing device policy model.

This matters because Studio Local can now POST a kernel probe to `/api/runtime/local-capabilities` without the cloud Studio treating the report as invalid or falling back to browser-only assumptions.

Additional test coverage:

- `cloud-web-app/web/__tests__/device/local-runtime-bridge.test.ts` validates strong native probes and degraded `held` probes.
- `cloud-web-app/web/__tests__/api/local-runtime-capabilities-route.test.ts` validates API sync of the Runtime Kernel payload.
- `tools/check-studio-local-runtime-gate.mjs` now fails if the cloud bridge stops recognizing Studio Local probe fields.

## 2026-05-09 Signed Cloud Sync

Studio Local sync now has a signed cloud sync contract for `api-sync` probes. When `AETHEL_STUDIO_LOCAL_SYNC_SECRET` is configured, `/api/runtime/local-capabilities` requires a fresh HMAC signature over the user id, device id, nonce, signed timestamp, and raw probe payload before accepting Studio Local Runtime Kernel reports.

This closes an important trust gap: the cloud Studio can keep accepting unsigned legacy browser/native bridge reports in development, but production can require signed local runtime evidence before using `local-native`, `cloud-sandbox`, or `held` routing decisions.

Acceptance evidence:

- `cloud-web-app/web/lib/server/studio-local-sync-signature.ts` defines deterministic payload signing and verification.
- `cloud-web-app/web/app/api/runtime/local-capabilities/route.ts` rejects unsigned or stale signed `api-sync` probes when the secret is configured.
- `cloud-web-app/web/__tests__/server/studio-local-sync-signature.test.ts` covers stable payloads, valid signatures, stale signatures, and tampered payloads.
- `cloud-web-app/web/__tests__/api/local-runtime-capabilities-route.test.ts` covers unsigned rejection and signed acceptance.

## 2026-05-09 Job Crash Recovery

Studio Local now has a durable job store primitive for native runtime lanes. `RuntimeJobStore` can persist a compact JSON snapshot to disk and recover it after a restart without pretending interrupted work is complete.

Recovery policy:

- `Queued`, `Running`, and `NeedsApproval` jobs recover as `Held` with a blocker that requires user or cloud confirmation before resuming.
- `Cancelled`, `Complete`, and `Failed` jobs keep their terminal state.
- Compact logs, evidence references, rollback plans, allowed paths, denied paths, and Mission Ledger references in the request are preserved with the recovered job.
- Persistence errors are captured via `last_persistence_error()` so the shell/cloud bridge can surface them instead of fake-successing.

This is not a full render/build executor yet. It is the crash-safe substrate needed before long-running `asset-import`, `viewport-render`, `build-export`, `browser-operator`, `playtest`, and `render-queue` jobs can be trusted for professional game, film, and app work.

Acceptance evidence:

- `apps/studio-local/src-tauri/src/jobs.rs` defines `RuntimeJobStoreSnapshot`, `from_persistence_path`, `recover_from_disk`, and `persist_snapshot`.
- `apps/studio-local/src-tauri/src/lib.rs` includes tests for interrupted jobs recovering as `Held` and cancelled jobs staying cancelled.
- `tools/check-studio-local-runtime-gate.mjs` fails if the crash recovery primitives or tests are removed.

Gate phrase: job crash recovery.

## 2026-05-12 Native Capability Matrix

Studio Local now records a lane-aware Native Capability Matrix instead of treating GPU/NPU as one generic boolean. This is the next step toward a real internal spine for large apps, games, films, local AI, and Browser Operator work without changing the clean product interface.

New probe dimensions:

- `nativeGraphicsBackends`: `vulkan`, `directx12`, `metal`, `webgpu`, or `opengl`.
- `aiExecutionProviders`: `cpu`, `cuda`, `tensorrt`, `directml`, `coreml`, `openvino`, `qnn`, `xnnpack`, `webgpu`, or `webnn`.
- `localToolchain`: `ffmpeg`, `ffprobe`, `rapier`, `browser-automation`, `asset-optimizer`, or `shader-compiler`.

Runtime policy now gates work by lane:

- `ai-local-inference` falls back to `cloud-sandbox` when no ONNX Runtime, DirectML, CoreML, CUDA, WebNN, or equivalent provider is confirmed.
- `viewport-render` falls back when no native graphics backend is confirmed. The target implementation path is `wgpu`, because it can sit above Vulkan, DirectX 12, Metal, OpenGL, WebGPU, and WebGL2 without creating four separate renderer cores.
- `render-queue` falls back when FFmpeg is not confirmed locally.
- `browser-operator` falls back to an approved sandbox when local browser automation is missing.
- critical thermal or storage pressure still returns `held` before any lane-specific optimism.

This does not claim Unreal parity. Unreal still owns Nanite/Lumen-grade renderer depth. The Aethel spine is different: route the right job to the right local/cloud executor, preserve Mission Ledger evidence, and prevent agents from pretending a weak device can perform AAA-scale work.

Acceptance evidence:

- `apps/studio-local/src-tauri/src/contracts.rs` defines `NativeGraphicsBackend`, `NativeAiExecutionProvider`, and `LocalRuntimeToolchainFeature`.
- `apps/studio-local/src-tauri/src/probe.rs` populates the capability matrix from explicit Studio Local env signals and available local tools.
- `apps/studio-local/src-tauri/src/policy.rs` performs lane-specific fallback for AI inference, viewport render, render queue, and Browser Operator.
- `packages/runtime-contracts/src/index.ts` mirrors the same capability vocabulary for web, workers, and cloud sync.
- `cloud-web-app/web/lib/device/local-runtime-bridge.ts` preserves these fields when normalizing Studio Local probes.
- `apps/studio-local/src-tauri/src/lib.rs` includes policy tests for missing FFmpeg, AI execution provider, graphics backend, and browser automation.
- `tools/check-studio-local-runtime-gate.mjs` fails if the capability matrix is removed.

Gate phrase: Native Capability Matrix.


## 2026-05-12 Sidecar Execution Manifest

Studio Local now has an explicit Sidecar Execution Manifest so heavy lanes cannot pretend to run locally without the required native base.

| Lane | Required local sidecars | Fallback rule |
| --- | --- | --- |
| `ai-local-inference` | ONNX Runtime / provider bridge | If no execution provider is confirmed, route to `cloud-sandbox`. |
| `viewport-render` | wgpu renderer, shader compiler, Rapier physics | If the renderer stack is incomplete, keep the web shell responsive and isolate heavy work. |
| `asset-import` | asset optimizer, ffprobe | If optimizer/probe tooling is missing, process assets in cloud sandbox with evidence. |
| `render-queue` | FFmpeg, ffprobe | If local encode/probe tooling is missing, route render queue encoding to cloud. |
| `browser-operator` | isolated browser automation runtime | If unavailable locally, require approval and use a sandbox. |
| `playtest` | wgpu renderer, Rapier physics | If local simulation/render cannot be proven safe, use cloud sandbox. |
| `build-export` | asset optimizer | If export tooling is incomplete, route to isolated execution. |

This is the internal guardrail that keeps the product honest: the user sees a clean Studio, but the runtime knows whether a job belongs on the device, in a worker, in a native sidecar, or in cloud isolation.

Acceptance evidence:

- `apps/studio-local/src-tauri/src/contracts.rs` defines `RuntimeSidecarKind` and `RuntimeSidecarCapability`.
- `apps/studio-local/src-tauri/src/sidecars.rs` maps each heavy lane to required sidecars.
- `apps/studio-local/src-tauri/src/policy.rs` routes missing sidecar lanes to `cloud-sandbox`.
- `packages/runtime-contracts/src/index.ts` exposes `RUNTIME_SIDECAR_KINDS`, `RUNTIME_LANE_SIDECAR_REQUIREMENTS`, `buildRuntimeSidecarManifest`, and `missingRuntimeSidecarsForLane`.
- `tools/check-studio-local-runtime-gate.mjs` blocks regressions in the sidecar manifest.

Gate phrase: Sidecar Execution Manifest.
