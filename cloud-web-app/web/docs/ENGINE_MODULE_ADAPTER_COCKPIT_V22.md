# Engine Module Adapter Cockpit V22

Aethel has large engine systems that are valuable, but they cannot be treated as simple UI imports. The cockpit turns those modules into visible, governed work packets while preserving bundle, runtime, and trust boundaries.

## Product rule

Read-only adapter evidence comes before execution. The UI can show owner surface, risk, module value, next action, and runtime boundary. It must not run heavy systems just because a module exists.

Required copy and behavior:

- Read-only adapter evidence is shown before any write path.
- No heavy runtime import in public, dashboard, or default Studio bundles.
- Worker/sidecar/native/cloud boundaries stay explicit for high-risk modules.
- Evidence Center mirrors the same status so claims remain auditable.
- User-facing action remains "Next safe move", not fake readiness.

## Lanes

| Lane | Use | Runtime rule |
| --- | --- | --- |
| Summary adapter | Read-only contracts, value, limitations, owner surface | Safe in Studio/Evidence UI |
| Dynamic client only | Optional client surface after user intent | Never public bundle by default |
| Worker or sidecar | World scans, capture, networking, heavy asset processing | Requires worker/sidecar capability evidence |
| Native or cloud | Studio Local or Cloud Stream heavy execution | Requires capability, cost, and fallback reason |

## Current acceptance

The cockpit is accepted when:

- Studio hub renders the adapter cockpit through `EngineSpineReadinessPanel`.
- Evidence Center renders the same cockpit in compact mode.
- `lib/studio/engine-spine-modules.ts` exposes the readiness model, priority modules, and decision matrix.
- `qa:engine-module-adapter-cockpit` prevents direct heavy runtime imports.
- The cockpit says what is blocked, held, or adapter-needed without claiming final runtime quality.

## Why this matters

The V19-V22 audits identified a repeated product gap: Aethel owns a serious engine spine, but users only trust what they can see. This cockpit exposes the spine honestly without making the browser pay for every subsystem upfront.
