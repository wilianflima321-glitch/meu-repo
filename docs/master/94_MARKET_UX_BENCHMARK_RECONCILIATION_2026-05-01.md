# 94_MARKET_UX_BENCHMARK_RECONCILIATION_2026-05-01
Date: 2026-05-01
Status: ACTIVE
Role: market UX reconciliation for Aethel Web Light, Studio Home, Operator, Workbench, and AAA-aware depth modes

## Purpose
This document keeps the visual arsenal, local audits, and current market references aligned so future work improves Aethel without drifting into generic AI-app chrome.

Aethel should be:
- clearer than Firebase Studio at entry,
- more governed than Manus for browser/account operation,
- more durable than Replit for long projects,
- more integrated than Cursor/GitHub for cloud plus local work,
- more honest than Unreal comparisons by exposing AAA depth only when the system can validate it.

## Sources Checked
- Firebase Studio App Prototyping agent: https://firebase.google.com/docs/studio/get-started-ai
- Firebase Studio preview docs: https://firebase.google.com/docs/studio/preview-apps
- Replit Agent: https://docs.replit.com/core-concepts/agent
- Manus Browser Operator: https://manus.im/docs/features/browser-operator
- Cursor Rules: https://docs.cursor.com/en/context
- Cursor Tools: https://docs.cursor.com/agent/tools
- GitHub Copilot cloud agent: https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent
- Unreal Outliner: https://dev.epicgames.com/documentation/en-us/unreal-engine/outliner-in-unreal-engine

## Benchmark Reading
### Firebase Studio
Firebase's strongest UX pattern is not depth. It is a streamlined creation path:
- natural language and optional images,
- generated blueprint/code/preview,
- publishing and cloud provisioning close to the flow,
- preview as an immediate truth surface.

Aethel response:
- keep Web Light prompt-first,
- keep Studio Home as the continuity layer,
- keep preview/review visible before deep IDE density.

### Replit Agent
Replit's strongest UX pattern is plain-language creation with planning, modes, testing, deployment, and rollback/checkpoints.

Aethel response:
- Project Brain and Mission Ledger must become durable memory/checkpoint surfaces,
- cost/risk/mode should stay visible without making the first screen noisy,
- multi-artifact ambition must be tied to evidence and rollback.

### Manus Browser Operator
Manus's strongest UX pattern is local browser operation through user authorization, existing sessions, logs, and stop/takeover control.

Aethel response:
- local browser/account operation must require explicit permission,
- every operator run needs session status, action log, stop/takeover, and evidence,
- cloud browser and local browser should be separate runtime choices, not hidden implementation details.

### Cursor / GitHub Agents
Cursor's strongest patterns are project rules, tool control, terminal/edit/search actions, memory, and inline review. GitHub's cloud agent pattern adds ephemeral environments, branch/PR flow, metrics, hooks, and explicit limitations.

Aethel response:
- `.aethelrules` should evolve into visible project memory and scoped agent constraints,
- Project Brain should summarize mission, rules, runtime, approvals, budget, and evidence,
- agents need ownership boundaries and validation gates, not just chat history.

### Unreal
Unreal's strongest pattern is professional scene authority: viewport, outliner, details, sequencing, assets, and specialized rooms.

Aethel response:
- do not put Unreal density on Web Light,
- route game/film work into domain rooms,
- keep web claims honest until asset, scene, physics, sequencing, packaging, and playtest contracts are real.

## Implemented In This Pass
- Added a Studio Home Project Brain read model in `cloud-web-app/web/components/dashboard/dashboard-project-brain.ts`.
- Added a compact Project Brain card in `cloud-web-app/web/components/dashboard/DashboardProjectBrainCard.tsx`.
- Wired Project Brain into `cloud-web-app/web/components/dashboard/DashboardOverviewTab.tsx`.
- Added unit coverage in `cloud-web-app/web/__tests__/dashboard/dashboard-project-brain.test.ts`.
- Added five public-route E2E contract specs for mission intake, Studio handoff, buyer comparison, pricing readiness, and local Studio continuity.
- Updated the Download page browser handoff from `/login` to `/ide` so local and web Studio remain one product path.
- Added `tools/e2e-mock-api-server.mjs` so Playwright startup validates against a deterministic contract API instead of a missing legacy server.
- Made `/compare` public in `cloud-web-app/web/middleware.ts`, keeping buyer trust/procurement evaluation available before login.
- Added Project Brain continuity rails for checkpoint, evidence, and permission state, borrowing Replit's rollback discipline and Manus's permission clarity without adding visual noise.
- Typed the level serialization and VS Code language API boundaries enough to reduce app-code `: any` from `1135` to `1011`, which directly helps long game/film/app agents avoid weak runtime assumptions.

## Product Impact
The dashboard now has a compact memory/risk/readiness object that makes the current mission legible before the user opens the deep Studio.

This directly supports:
- Firebase-style low-friction entry,
- Replit-style plan/checkpoint thinking,
- Manus-style operator safety,
- Cursor/GitHub-style persistent project context,
- Unreal-style depth without exposing advanced density too early.

## Remaining Gaps
- Project Brain is currently a read model, not durable storage.
- Mission Ledger still needs states, evidence attachments, approvals, rollback, and acceptance checklist.
- Local Agent Bridge is still a spec-level need.
- E2E spec count now meets the current scanner target and the five public contracts pass in Chromium, but authenticated mission/readiness flows still need deeper execution coverage.
- `: any` and i18n debt still block strictness and localization polish.

## Next Contract
Do not add another dashboard family.

Expand the existing Project Brain into durable mission memory and keep it visually compact. If a future feature cannot fit this compact brain/ledger model, it probably belongs in a deeper Studio room, not on the first screen.
