# 17_STUDIO_LOCAL
Date: 2026-04-29
Status: BLUEPRINT
Surface Type: Native / Local Depth Mode

## Mission
Provide a downloadable Aethel Studio that removes browser ceilings without creating a second product.

## Product Role
Studio Local exists to unlock:
- real filesystem access
- stronger device trust
- heavier preview/runtime workloads
- longer-lived local execution
- richer local integrations

It does not exist to replace Studio Cloud.
It exists to deepen the same product.

## What this surface should be
- the native depth mode of Aethel
- visually and behaviorally continuous with Studio Cloud
- more trusted for local work, heavier runtimes, and device-bound workflows

## What this surface should not be
- a forked desktop app with different IA
- a feature graveyard for everything that does not fit the browser
- a different shell identity

## Canonical Relationship To Studio Cloud
Shared:
- mission
- project
- AI scope
- evidence
- approvals
- costs
- outputs
- navigation grammar
- component language

Local-only depth unlocks:
- local workspace bind
- native file operations
- stronger terminal and process integration
- larger/heavier runtime envelopes
- better offline resilience

## Why This Exists
Canonical limitations already documented in:
- `docs/master/46_LIMITATIONS_2026-03-22.md`
- `docs/master/88_AI_ARSENAL_AND_DOMAIN_SUPERIORITY_BLUEPRINT_2026-04-28.md`

Relevant truths:
- browser filesystem is bounded
- local execution is bounded in-browser
- heavy runtimes and large binaries are not browser-native forever
- not every serious workflow should depend on one browser tab

## Canonical Layout
Use the same shell grammar as Workbench:
1. Top Bar
2. Left Activity Rail
3. Left Sidebar
4. Center Workspace
5. Right Rail
6. Bottom Dock
7. Status Bar

## Local-Specific UI Objects

### Workspace Bind Capsule
Shows:
- bound local project root
- sync state
- local-only warnings
- handoff to cloud state when relevant

### Runtime Depth Capsule
Shows:
- local runtime active
- runtime type
- local process health
- fallback to cloud if necessary

### Local Tool Access Capsule
Shows:
- terminal access
- file permissions
- process/network constraints
- extension or helper service health if applicable

## Entry Paths
### From Web Light
- never direct by default
- only offered when the user explicitly needs depth

### From Studio Home
- `Open in Studio`
- `Download Local Studio` when local depth is the better answer

### From Studio Cloud
- `Continue locally`
- `Open locally for heavier runtime`

## Primary User Questions
- Do I need local mode?
- What becomes better locally?
- Will I lose mission context if I switch?
- Is this still the same Aethel?

## Primary CTA
- `Continue Locally`

## Secondary CTA
- `Stay in Cloud Studio`

## Non-Negotiable UX Rules
1. Local mode must never feel like a separate brand or separate product.
2. The user must understand why local mode exists in one sentence.
3. Switching depth modes must preserve mission continuity.
4. Local mode must increase trust and capability, not increase confusion.

## Critical Visual Rule
Local mode should feel slightly more grounded and device-serious than cloud mode, but not visually different enough to look forked.

## Final Reading
Studio Local is how Aethel beats the browser ceiling.
It is not how Aethel abandons the browser product.
