# Aethel Device Runtime And Local AI Strategy

Date: 2026-05-02
Status: Canonical product direction

## Thesis

Aethel should never assume that every user device can run heavy AI, AAA viewport work, browser operation, build jobs, and persistent memory indexing at the same time.

The product needs a runtime governor that chooses the safest execution lane per device:

- Local accelerated when the browser or local app confirms enough compute.
- Hybrid balanced when WebGPU exists but local AI acceleration is uncertain.
- Cloud isolated when heavy work could stall the web shell.
- Safe mode when memory, CPU, storage, or network signals indicate risk.

## Current Implementation

The web shell now has a first-pass device guard:

- `lib/device/device-capability-profile.ts` classifies device capability.
- `lib/device/runtime-lane-scheduler.ts` maps that capability into lane budgets and backpressure decisions.
- `hooks/useDeviceCapabilityProfile.ts` collects browser-side signals without blocking render.
- `hooks/useRuntimeLanePolicy.ts` gives product surfaces a canonical way to ask whether a lane may start right now.
- `components/device/DeviceRuntimeGuardCard.tsx` surfaces the policy in Studio Home and shows live protection state while the user is actively interacting.
- `DashboardOverviewTab.tsx` shows the guard near mission/project continuity, not hidden in settings.
- `components/dashboard/DashboardCreationWorkbench.tsx` now routes AI media generation through the `ai-agents` lane budget instead of blindly stacking jobs.
- `components/deploy/DeployButton.tsx` and `components/preview/usePreviewDeployTrust.ts` now respect the `build-export` lane so users do not stack deploys on top of an already active publish.
- `hooks/usePreviewRuntimeManager.ts` now gates preview runtime discovery/provision through the `browser-operator` lane and runtime sync through the `file-sync` lane.
- `components/ide/PreviewRuntimeToolbar.tsx` now exposes held automation state, preferred placement, and manual-confirmation hints so the user understands why the preview runtime is waiting instead of assuming the product is stalled.
- `components/ai/AgentModePanel.tsx` now exposes `ai-agents` and `browser-operator` lane status directly inside the autonomous panel, blocking new runs when the agent lane is saturated and holding approval of web steps when the browser-operator lane is not available.
- `lib/server/local-runtime-capability-store.ts` and `app/api/runtime/local-capabilities/route.ts` now give the local probe an authenticated file-backed handoff into the user's cloud account, so the web shell can recover the freshest trusted native snapshot even after reload.
- `hooks/useLocalRuntimeBridge.ts` now hydrates from browser cache plus authenticated cloud fallback, syncs fresh native probes back to the account, and tracks whether the local-native bridge has completed its cloud handoff.
- `lib/device/runtime-execution-router.ts` now turns lane policy plus the local bridge state into an explicit execution target: `local-native`, `local-worker`, `local-main-safe`, `cloud-sandbox`, or `held`.
- `hooks/useRuntimeLanePolicy.ts` now returns that route alongside the lane decision, so product surfaces can display and pass the same execution target instead of reinterpreting placement locally.
- `components/ai/AgentModePanel.tsx`, `lib/device/browser-operator-tool-guard.ts`, and deploy UI now carry the resolved execution target into agent web-tool context and user-facing hints.
- `app/api/jobs/route.ts` now accepts a sanitized runtime route, persists it into queue payloads/metadata, exposes `runtimeTarget` when listing jobs, and rejects held routes before work reaches a dispatcher.
- `components/dashboard/DashboardCreationWorkbench.tsx` now passes the resolved AI-agent execution target into music, voice, and 3D generation requests while keeping the jobs rail compact.

Measured policies include:

- Max parallel agents.
- Viewport quality.
- Local model policy.
- Browser operator throttling policy.
- Persistent memory policy.
- Background task budget.
- Runtime lane placement and concurrency for AI agents, browser operator, viewport/render, build/export, memory indexing, and file sync.

## NPU Reality Check

Browser NPU detection is not universally reliable.

WebNN is the browser-facing path intended for neural accelerator use. If `navigator.ml` exists, Aethel can treat that as a strong local AI signal. If only WebGPU exists, Aethel can accelerate viewport and some compute, but should not claim direct NPU use.

For the downloaded local Studio, the correct path is deeper native probing:

- Windows AI Foundry and Windows AI APIs for built-in Copilot+ PC features.
- Windows ML for ONNX inference on CPU, GPU, and NPU.
- DirectML/ONNX Runtime for hardware-accelerated model execution.
- Vendor execution providers where appropriate.

Sources used for this decision:

- WebNN Hardware and NPU: https://webnn.io/en/faq/hardware
- Windows AI Foundry overview: https://learn.microsoft.com/en-gb/windows/ai/overview
- Windows ML overview: https://learn.microsoft.com/en-us/windows/ai/new-windows-ml/overview
- WebGPU API: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API

## Anti-Freeze Runtime Rules

P0 rules:

- Do not run heavy local models unless the device guard says local acceleration is safe.
- Do not let browser operator, build, export, viewport, and indexing jobs compete on the main UI thread.
- Route each heavy work type through a lane budget before it starts.
- Resolve every lane decision into a concrete execution target before it reaches user-facing controls or agent tool payloads.
- Use workers, cloud runtimes, or local sandbox lanes for long-running work.
- Enforce the browser-operator lane inside the tool execution path, not only in surface-level buttons.
- Pass explicit runtime payloads into web tools so local and cloud agent paths return honest block reasons instead of silent failure.
- Accept a native capability probe from Studio Local and merge it with browser signals before deciding concurrency, model placement, and background budgets.
- Treat stale probes and thermal-critical native reports as safety events that push work back toward cloud isolation.
- Cap parallel agents per device profile.
- Pause background indexing during direct user interaction.
- Keep persistent memory compact by default: mission summaries, accepted evidence, file graph deltas, and decisions.
- Store raw high-volume traces only when the user explicitly opts in or enterprise policy allows it.

## Persistent Memory Direction

Aethel memory should be layered:

- Short-term working memory: current task, open files, browser session, pending approvals.
- Project memory: mission ledger, decisions, evidence, accepted diffs, test results, deployment state.
- User memory: preferences, safe defaults, repeated workflows, account-level integrations.
- Local memory cache: embeddings and summaries stored only when device policy allows persistent indexing.
- Cloud memory canonical store: syncable, permissioned, revocable, auditable.

The local app should sync with the cloud account, but it must not become a forked product. It is the same Studio with deeper device-native capabilities.

## Next Blocks

1. Implement the real Studio Local emitter so the desktop runtime sends signed device probes instead of relying on browser-only relay events.
2. Wire the execution route into deeper render/indexing/build workers so the selected target is not only persisted by `/api/jobs`, but actively consumed by the workers.
3. Persist lane pressure telemetry so Aethel can learn safe defaults by device class.
4. Add durable project memory backed by database/files instead of only UI read models.
5. Add safety policy UI for local memory, browser operation, and device-native model execution.
