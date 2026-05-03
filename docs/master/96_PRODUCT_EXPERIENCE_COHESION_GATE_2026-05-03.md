# 96_PRODUCT_EXPERIENCE_COHESION_GATE_2026-05-03

Date: 2026-05-03
Status: ACTIVE
Role: executable guardrail for clean, market-grade product experience

## Why This Exists

The product direction is now broad enough that a future agent could accidentally improve one area while breaking the whole experience. Aethel cannot become:

- a generic SaaS dashboard,
- a prompt-only app builder,
- a heavy IDE dumped on beginners,
- or an Unreal-shaped cockpit on the first screen.

This gate keeps the product aligned around one progressive system:

`Web Entry -> Studio Home -> Studio Cloud -> Studio Local`

The IDE remains inside the product, like Firebase Studio / Code OSS depth, but the first screen stays calm and mission-first.

## Benchmark Anchors

These are behavior anchors, not assets to copy blindly:

- Firebase Studio: prompt-to-workspace continuity, preview, publish, services, observability.
- v0: high-fidelity prompt-to-product flow, one-click deploy, diagnostics, live feedback.
- Replit: workspace home, preview, collaboration, deploy, and task continuity.
- Manus Browser Operator: local browser authorization, cloud browser isolation, monitoring, interruptibility.
- Lovable: natural-language app creation with GitHub sync, collaboration, security, and governance.
- VS Code: command palette, files, editor, terminal, source control, problems, extensions.
- Unreal: viewport authority, world outliner, details panel, sequencer, materials, assets, physics, render/export.

The Aethel improvement target is unification:

- one mission,
- one artifact truth,
- one runtime policy,
- one evidence trail,
- and mode-specific depth only when the task needs it.

## Executable Gate

Run:

```bash
npm run qa:product-experience-cohesion
```

The gate verifies the following product anchors:

- Web Entry has a mission box, a limited starter set, and a Studio handoff.
- Studio Home has mission continuity, Project Brain, Mission Ledger, evidence, and device policy.
- The IDE shell has command palette, sidebar, editor, preview, terminal, and collaborators.
- Preview/review has proposal preview, apply, reject, deploy trust, and canonical preview surfaces.
- Browser operator actions are approval-aware and lane-aware.
- Device runtime routing recognizes NPU/GPU/CPU limits and can hold or cloud-isolate work.
- Game/film depth is mode-specific, not default UI clutter.
- Primary surfaces do not expose demo/stub/fake-success language.

## Honest Limitations

### Browser And NPU Reality

The browser cannot safely promise native NPU acceleration by itself. Aethel should use:

- WebNN/WebGPU when available,
- Studio Local native probes for real NPU/GPU/thermal/memory state,
- cloud isolation when the device is weak, busy, stale, or unsafe,
- and lane scheduling so background agents pause when the user is active.

### Unreal Parity Reality

Aethel should not claim full Unreal parity until the mode-specific systems are wired end to end:

- viewport,
- outliner,
- details panel,
- asset import/validation,
- material/VFX,
- physics/play mode,
- sequencer,
- render/export,
- evidence and rollback.

The web entry must stay simple even if the deeper mode can become dense.

### AI Agent Reality

Agents still need guardrails:

- project rules,
- evidence capture,
- checkpointing,
- rollback,
- budget/cost visibility,
- browser permissions,
- local/cloud runtime routing,
- and durable memory boundaries.

The product should make these controls visible as compact trust rails, not long explanatory text.

## Next Closure Blocks

1. Keep `qa:core-experience-routes` green so the route-level product loop stays real.
2. Keep `qa:product-funnel-telemetry` green so public entry, auth, pricing, mission handoff, and deploy remain measurable.
3. Keep `qa:commercial-access` green so Free tier, trial state, billing usage, and paid gates stay factual.
4. Add visual tests for Web Entry, Studio Home, IDE preview/review, and device runtime card.
5. Keep all new entry surfaces under the one-protagonist rule.
6. Continue wiring game/film tools by mode instead of making them global navigation.
7. Expand Studio Local from capability snapshot into controlled native worker execution.
8. Add more route-level checks for preview/chat proportions and mobile approval flows.

## Verdict

The current direction is strong. The biggest risk is no longer imagination; it is drift. This gate turns the product critique into a repeatable check so Aethel can keep getting more powerful without getting louder.
