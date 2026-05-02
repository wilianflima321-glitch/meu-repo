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
- `components/device/DeviceRuntimeGuardCard.tsx` surfaces the policy in Studio Home and shows live protection state while the user is actively interacting.
- `DashboardOverviewTab.tsx` shows the guard near mission/project continuity, not hidden in settings.

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
- Use workers, cloud runtimes, or local sandbox lanes for long-running work.
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

1. Add native local Studio probe contract for CPU/GPU/NPU/RAM/storage and expose it to the web account.
2. Wire the lane scheduler into real agent/browser/build/render/indexing execution paths.
3. Persist lane pressure telemetry so Aethel can learn safe defaults by device class.
4. Add durable project memory backed by database/files instead of only UI read models.
5. Add safety policy UI for local memory, browser operation, and device-native model execution.
