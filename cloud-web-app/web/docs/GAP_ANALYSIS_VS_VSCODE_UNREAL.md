# GAP ANALYSIS: Aethel IDE vs VS Code, Unreal Engine, and AI App Builders

**Date:** 2026-05-03
**Version:** 2.0
**Owner:** Aethel Product Quality Triage
**Purpose:** Keep the IDE and product experience aligned with the best market references without overloading the UI.

---

## Executive Summary

Aethel must not be a generic AI dashboard with an IDE hidden inside it. The winning product shape is a calm mission-first web entry, a powerful internal IDE, and a local/cloud runtime layer that lets agents work safely without freezing the user's device.

The current direction is valid, but the product must keep tightening five experience promises:

1. One protagonist per screen.
2. Chat and preview must stay close, but one of them must clearly lead depending on the user mode.
3. The IDE must feel professional, not like a demo shell.
4. Browser/operator automation must always show permission, evidence, and interrupt controls.
5. Advanced game/film tooling must be discoverable without overwhelming first-time web users.

---

## Market Benchmark Lens

| Reference | What Aethel should copy | What Aethel should improve |
|---|---|---|
| Firebase Studio | Seamless transition from prompting to full Code OSS-style control, browser previews, rollback, cloud services, and observability. | Do not depend on a single cloud vendor path. Keep local desktop and cloud account continuity as a first-class model. |
| Replit Project Editor | Home base with prompt, live preview, task board, threads, import paths, collaboration, and deploy from the same workspace. | Avoid noisy panels. Aethel should expose mission state and next action before raw admin metrics. |
| v0 | High-fidelity UI generation, one-click deploy, diagnostics, and a chat-led production path. | Aethel must go deeper than web UI: IDE, agents, browser operator, games, films, assets, and local runtime. |
| Cursor | Agent work with codebase context, terminal execution, review diffs, and background agent visibility. | Aethel should make multi-agent governance visible earlier: cost, risk, evidence, rollback, and owner approval. |
| Manus Browser Operator | Local browser access for logged-in tools, cloud browser isolation, one-time authorization, live monitoring, and interruptibility. | Aethel should unify browser operator with project memory, evidence, and device policy instead of treating it as a separate add-on. |
| Lovable | Natural-language full-stack creation with real code, GitHub sync, collaboration, security, and governance. | Aethel should make quality gates, deploy readiness, and runtime diagnostics clearer before publish. |

---

## Aethel Experience Contract

### Web Entry

The initial web experience should feel closer to Firebase Studio, Gemini, Manus, and v0 than to an admin console.

Required behavior:

1. Show a single mission input as the hero.
2. Offer small domain starters only after the main prompt is clear.
3. Keep the visible copy short.
4. Surface account, runtime, and billing state as quiet status rails, not heavy dashboards.
5. Make the path to Studio obvious without forcing advanced IDE chrome on new users.

Failure modes to avoid:

1. Too many equal-weight cards.
2. Dashboard metrics before the user has a mission.
3. Long explanatory paragraphs on the first screen.
4. Admin terminology in learner-facing flows.
5. Multiple primary buttons competing for attention.

### Studio Home

Studio Home should act like the mission control layer before the IDE opens.

Required behavior:

1. Current mission, preview, agents, evidence, deploy readiness, and next action must be visible.
2. Every agent run must leave an artifact trail.
3. Risk and approval must be visible before destructive or costly actions.
4. Device capability should influence whether work runs local, hybrid, cloud-isolated, or safe-mode.
5. The user should understand what will happen next without reading logs.

### IDE

The IDE must remain an internal professional surface, similar in density to VS Code/Firebase Studio, with Unreal-inspired panels only when the user is in game/film mode.

Required behavior:

1. Editor, file tree, terminal, preview, assistant, and status bar must stay coherent.
2. Code changes need review surfaces, diffs, and rollback paths.
3. Multi-agent work must not pollute the editor; it belongs in a sidecar/timeline.
4. Viewport work needs hierarchy, details, transform tools, timeline, and asset browser.
5. Game/film tools should load by mode, not all at once.

### Desktop/Local Runtime

The desktop/local app should provide device-aware acceleration and safe isolation.

Required behavior:

1. Detect GPU, WebGPU, WebNN/NPU capability, CPU, RAM, storage, and network.
2. Prefer local acceleration only when it will not freeze the machine.
3. Use cloud-isolated execution for risky, long, untrusted, or high-memory jobs.
4. Keep local browser operator actions permissioned and interruptible.
5. Preserve memory, workspace state, and project rules across web and desktop.

### Mobile Companion

Mobile should not try to be the full IDE by default.

Required behavior:

1. Mission review, approvals, evidence, notifications, and lightweight chat.
2. Background-agent launch and monitoring.
3. Preview review and deploy approval.
4. Emergency stop, rollback, and budget alerts.
5. Minimal code viewing only when useful.

---

## VS Code Gap Triage

| Feature | Current direction | UX priority | Notes |
|---|---|---:|---|
| Command Palette | Present | High | Keep command density high but descriptions short. |
| Quick Open | Present | High | Must remain fast and keyboard-first. |
| Inline AI | Present | High | Needs clear apply/review/rollback controls. |
| Git panel | Present | High | Add gutter and timeline polish when implementation bandwidth allows. |
| Debug panel | Present | High | Add breakpoint conditions, watch expressions, and call-stack navigation. |
| Breadcrumbs | Partial | Medium | Symbol outline improves professional feel without adding visual clutter. |
| Source control timeline | Partial | Medium | Useful for trust and rollback. |
| Problems panel | Present | Medium | Should stay compact and connected to fix actions. |

---

## Unreal/Game/Film Gap Triage

| System | Current direction | UX priority | Notes |
|---|---|---:|---|
| 3D viewport | Present | Critical | Must become mode-primary for game/film tasks, not a tiny preview. |
| World outliner | Present/aspirational | Critical | Needs to be visible in game/film mode and connected to selection. |
| Details panel | Present/aspirational | Critical | Required for professional scene editing. |
| Asset browser | Present | Critical | Needs import state, validation, thumbnails, and pipeline evidence. |
| Sequencer/timeline | Present | High | Should be available for animation/film mode only. |
| Materials/VFX | Present | High | Needs clean progressive disclosure. |
| Physics/gameplay | Partial | High | Must be testable in viewport with clear play/edit state. |
| Render/export | Partial | Medium | Needs job progress, artifacts, and cost/runtime policy. |

---

## Interface Quality Rules

These rules are the product guardrails for future implementation.

1. One primary action per surface.
2. No screen should need more than one sentence to explain itself.
3. Empty states must teach the next action, not list features.
4. Status details belong in expandable rails.
5. Enterprise/security/billing information should be visible but quiet.
6. Agent actions must expose risk, cost, permission, and rollback.
7. Preview should be large when the user is evaluating output.
8. Code should be large when the user is editing implementation.
9. Viewport should be large when the user is editing worlds, scenes, animation, or films.
10. Mobile should approve and monitor more than it edits.

---

## Executable Cohesion Gate

The benchmark contract is now backed by `tools/check-product-experience-cohesion.mjs`, `tools/check-core-experience-routes.mjs`, and `tools/check-product-funnel-telemetry.mjs`.

This gate is intentionally narrow and practical. It does not pretend to judge visual beauty from code. It verifies that the core product promises still have live anchors:

1. Web Entry remains mission-first.
2. Studio Home keeps mission, evidence, project brain, and device policy visible.
3. The internal IDE keeps professional files/editor/preview/terminal/collaboration primitives.
4. Preview/review keeps proposal, apply, reject, and deploy-trust paths.
5. Browser operator actions remain governed by approval and runtime policy.
6. NPU/GPU/CPU work routes through a safe device runtime policy.
7. Game/film depth stays mode-specific instead of becoming default clutter.
8. Public entry, auth, pricing, mission handoff, and deploy remain measurable without adding UI noise.

The route chain is also protected by `tools/check-core-experience-routes.mjs`, which verifies that the mission box does not fake workspace creation and that the user-visible loop stays connected through Studio Home, IDE, preview runtime, jobs, Studio Local, and Mobile Companion continuity.

The commercial funnel is protected by `tools/check-product-funnel-telemetry.mjs`, which verifies that Aethel can learn from route views, CTAs, mission intake, pricing selection, auth starts, and deploy outcomes instead of relying on guesses.

---

## Immediate Execution Backlog

| Priority | Work | Why it matters |
|---:|---|---|
| 1 | Keep mojibake at zero with a failing gate. | Broken text instantly lowers trust and visual quality. |
| 2 | Keep `qa:product-experience-cohesion` green for first-run web, Studio Home, IDE, browser operator, device runtime, and viewport. | Prevents future UI clutter and product-family drift. |
| 3 | Keep `qa:core-experience-routes` green so `/ -> intake -> Studio Home -> IDE -> runtime/local/mobile` stays factual. | Prevents fake success in the first mission loop. |
| 4 | Keep `qa:product-funnel-telemetry` green for public entry, auth, pricing, mission handoff, and deploy. | Prevents commercial blindness while preserving clean UI. |
| 5 | Continue i18n beyond the hardcoded-string gate. | English default is clean, but real localization still matters. |
| 6 | Add compact benchmark screenshots/notes to the UX arsenal when source assets are available. | Helps future agents preserve the intended product feel. |
| 7 | Strengthen preview/chat layout tests. | Protects the Firebase/Replit-style core experience. |
| 8 | Make local/cloud runtime policy visible in more action surfaces. | Prevents device freezes and improves user trust. |
| 9 | Wire more game/film tools by mode instead of always-visible navigation. | Keeps the web experience simple while preserving IDE depth. |

---

## Conclusion

The product thesis remains strong: Aethel should combine the approachable mission-first entry of the best AI app builders, the real IDE depth of VS Code/Firebase Studio, the browser automation trust model of Manus, and the world-building ambition of Unreal.

The gap is not more raw UI. The gap is disciplined hierarchy, visible evidence, device-aware execution, and mode-specific depth. Every future change should make the product feel calmer at entry and more powerful only when the user asks for power.
