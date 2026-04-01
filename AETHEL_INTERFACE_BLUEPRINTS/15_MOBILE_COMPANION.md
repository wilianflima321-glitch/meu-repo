# 15_MOBILE_COMPANION
Date: 2026-03-25
Status: CANONICAL BLUEPRINT
Surface Type: Workbench Operational Variant

## Mission
Preserve creative flow continuity and deliver fast approvals, preview inspection and lightweight intervention away from the desktop Workbench.
The Mobile Companion is not a full IDE. It is the constrained, high-clarity extension of the Aethel Workbench for prompt-driven progress, mobile preview validation, asset attachment and unblock actions in motion.

## Critical Opinion
### What this surface should be
- a focused mirror of the active Workbench state
- a prompt-first operational surface
- approval-heavy and context-rich
- fast to resume, fast to exit, fast to hand back to desktop

### What this surface should not be
- a compressed desktop IDE
- a second product family
- a dense canvas editor on a handheld screen
- an admin-heavy monitoring app

### Product rule
Mobile exists to advance or protect the current work session.
If a task requires sustained multi-file editing, dense canvas manipulation or deep system administration, the product should steer the user back to desktop Workbench.

## Strategic Intent
### Workbench continuity rule
The Workbench remains the absolute center of the Aethel ecosystem.
The Mobile Companion must reinforce that hierarchy:
- continue an existing flow
- inspect a live output
- approve or reject changes
- direct AI with scoped prompts
- attach or review assets
- return to desktop for deep production work

### Mobile vibe-coding rule
Mobile build interaction is prompt-first.
The user primarily expresses intent through the AI Composer Lite.
The system returns:
- semantic impact
- preview changes
- approval-ready output
- optional lightweight code inspection

Raw source exists as an inspection layer, not as the primary handheld editing surface.

## Benchmark Alignment
### From mobile-first professional tools
Absorb:
- one dominant action per screen
- clear top bar context
- low-friction return into the exact active state
- bottom sheets and drawers instead of permanent dense panels

### From Firebase Studio and Replit patterns
Absorb:
- prompt-to-preview loop
- continuous execution tied to current project state
- AI and preview always attached to the same active context

### From Genspark-style AI workspace patterns
Absorb:
- confidence that one mobile context can still access multiple output types
- fast jump from notification or prompt intent into the exact artifact that needs attention

Reject:
- turning mobile into a generic AI prompt launcher
- letting a broad AI workspace replace tight approval and preview tasks
- flooding the handheld surface with tool-choice decisions before the current task is clear

### From Unreal / Adobe / Manus
Absorb:
- Unreal: viewport sovereignty even on constrained screens; keep camera/view controls close to the surface
- Adobe: monitor-first playback clarity with precise transport and compare behavior
- Manus: evidence-aware research with visible provenance and extractable findings

Reject:
- shrinking desktop preview chrome into unreadable mobile clutter
- hiding source/reference context behind separate pages
- letting research collapse into a plain chat transcript on mobile

### What to avoid
- trying to replicate full desktop panel density
- chat history dominating the screen over the current task
- canvas or editor complexity that exceeds handheld precision

## Canonical Mobile Shell
The Mobile Companion uses a constrained Workbench shell.
It shares the same project model, run model, preview model and AI scope model as desktop.

### Shell zones
1. Mobile Top Bar
2. Main Surface
3. Context Drawer Layer
4. Bottom Sheet Layer
5. Compact Status Strip

### Mobile Top Bar
Height: `56 px`

Contains:
- back or project context affordance
- current mode label
- connected flow indicator
- compact runtime/AI health
- overflow actions

Rules:
- project and mode must remain visible at a glance
- do not overcrowd with desktop-grade controls
- mode switch, if visible, must remain secondary to the current task

### Main Surface
Only one dominant surface may lead at a time.
Allowed dominant surfaces:
- AI Composer Lite
- Preview Surface
- Approval Card
- Asset Browser

Rule:
Do not split mobile into multiple equal-weight panels.
One surface leads. Drawers and sheets support it.

### Context Drawer Layer
Used for:
- lightweight code inspection
- artifact details
- flow context
- run details
- task-relevant settings only

Rules:
- drawers support the main action
- drawers are secondary and dismissible
- drawers do not become alternate mini-workspaces

### Bottom Sheet Layer
Used for:
- runtime logs
- output
- AI step details
- flow switching
- quick actions

Rules:
- sheets should feel temporary and contextual
- no sheet should require the user to stay inside it as the main work area for long sessions

### Compact Status Strip
Used for:
- run progress
- preview health
- approval required state
- low-connectivity state

Rules:
- compact, factual, low-noise
- not a toast system replacement

## Mobile Design Rules
### Web-first implementation rules
- animations limited to `transform` and `opacity`
- avoid layout-heavy transitions
- avoid nested dense panels
- prioritize stable layout regions to reduce rendering churn
- use drawers, sheets and stacked surfaces for focus

### Geometry and touch rules
- minimum hit target: `44 px`
- page gutter: `16 px` for dense operational screens
- page gutter: `24 px` for softer entry/public-like mobile surfaces where applicable
- one primary CTA per screen
- persistent selected states for mode, flow and approval context

## Canonical Mobile Modes
### 1. Build Lite
Mission:
Allow fast prompt-driven iteration with immediate contextual feedback.

Primary surface:
- AI Composer Lite

Secondary surfaces:
- compact preview
- code impact drawer
- run status sheet

Contains:
- project chip
- connected flow chip
- artifact context chip
- text and voice entry
- current run summary
- semantic impact summary
- quick inspect action

Rules:
- the composer is the main action zone
- raw code is secondary and drawer-based
- AI must present impact areas before source details
- prompt actions should update preview without manual build rituals when possible

### 2. Preview
Mission:
Validate outputs quickly and inspect parallel flows.

Primary surface:
- preview viewport

Secondary surfaces:
- horizontal Preview Deck
- AI contextual sheet or drawer
- runtime logs sheet

Contains:
- preview header
- viewport
- flow switcher
- issue count
- refresh/open actions
- Preview Deck

Rules:
- preview remains visually sovereign
- runtime internals stay behind a sheet
- deck cards must support selected, updating, blocked and compared states
- viewport or monitor controls should feel closer to a serious monitor/viewport than a generic mobile media embed
- source/reference context must remain distinguishable from the active output

Preview UX rules:
- web preview should privilege route/device clarity over decorative framing
- 3D preview should keep camera and view-mode access near the viewport
- media preview should keep transport, frame/time and mute controls persistently readable
- research preview should preserve provenance and compare behavior even on a constrained screen

### 3. Review
Mission:
Approve or reject AI-driven changes with minimum ambiguity.

Primary surface:
- Approval Card

Approval Card anatomy:
- impact area
- affected project or flow
- risk badge
- summary of change
- semantic diff preview
- `Approve`
- `Reject`
- `Inspect deeper`
- `Rollback` when lineage exists

Rules:
- decision CTAs are large and obvious
- risk must be explicit before the action row
- diff is semantic-first, code-second
- pending approval state outranks background conversation history
- if the approval concerns a preview-visible change, the active output should remain reachable without losing the decision state

### 4. Assets Lite
Mission:
Browse, tag, inspect and attach assets to active flows.

Primary surface:
- asset browser

Contains:
- search
- type filters
- recent and linked assets
- quick preview
- attach to current flow
- tag or metadata edit

Rules:
- browse-and-insert first
- deep editing remains desktop-first
- preserve active project and flow scope during insert

## AI Composer Lite
The AI Composer Lite is the primary mobile production control.

Contains:
- project chip
- flow chip
- artifact chip
- text input
- voice trigger
- run status summary
- latest plan step
- approval shortcut when relevant

Rules:
- composer always knows the active project and flow
- scope chips must be visible before sending input
- pending approvals rise above long chat history
- live voice expands the same composer; it never creates a separate product mode family

## Mobile AI <-> Preview Contract
On mobile, chat and preview must feel tightly coupled because screen space is scarce.

Rules:
- the composer must always know whether the user is acting on an active output, a reference/source, or an approval state
- if the user is in Preview mode, prompts should target the visible preview by default unless scope is changed explicitly
- if a prompt updates a non-visible connected flow, the Preview Deck must surface that state immediately
- opening a preview detail, approval detail or source detail must not discard the draft prompt
- review decisions should keep the affected output reachable in one gesture, not behind a full mode reset

## Preview Deck Mobile
The Preview Deck is a horizontal swipe strip for parallel flows inside the same project.

Each card contains:
- thumbnail
- flow title
- state
- last update
- active run indicator

Card states:
- idle
- selected
- updating
- blocked
- conflict
- compared

Rules:
- touch targets remain comfortable
- selected state is unmistakable
- deck refreshes must not cause layout jumps
- conflict state must be visible if two runs target the same flow

## Cross-Device Continuity Contract
### Desktop -> mobile restore
Mobile must restore:
- workspace
- project
- selected flow
- current mode
- current run
- pending approval
- preview target

### Mobile -> desktop restore
Desktop must restore:
- flow scope
- approval state
- run context
- composer context
- inspected artifact

### Deep-link contract
Examples:
- `/ide?mode=review&run=abc123`
- `/ide?mode=preview&flow=landing-hero`
- `/ide?mode=build&flow=marketing-site`
- `/ide?mode=assets&asset=hero-video-02`

Rule:
These links open the same Workbench context in a constrained handheld presentation.
They do not define a second product family.

## Mobile States
Required states:
- empty
- loading
- healthy
- degraded
- blocked
- approval required
- low connectivity
- offline inspection only

Rules:
- each state keeps one dominant next action
- low connectivity must downgrade gracefully to inspection, cached context and queued actions where possible
- blocked states must route clearly to recovery or desktop escalation

## Mobile Restrictions
The Mobile Companion does not aim for:
- full multi-file editing
- full desktop canvas parity
- dense admin monitoring
- terminal-first workflows
- full governance control surfaces

It is optimized for:
- continuity
- approvals
- prompt-driven execution
- preview validation
- lightweight asset handling
- unblock and handoff

## Component Map
### Shared canonical components adapted to mobile
- MobileTopBar <- derived from Workbench Top Bar
- AIComposerLite <- derived from AI Console conversation/composer layer
- ApprovalCard <- derived from Review mode approval surface
- MobilePreviewHeader <- derived from Preview header system
- MobilePreviewDeck <- derived from Preview Deck family
- CompactStatusStrip <- derived from Status and runtime summary families

## Figma Frame Requirements
- Mobile Build Lite default
- Mobile Build Lite with code impact drawer
- Mobile Preview default
- Mobile Preview with Preview Deck active
- Mobile Review approval required
- Mobile Assets Lite
- Mobile blocked state
- Mobile low-connectivity state
- Mobile handoff-from-desktop state

## Critical Drift Risks
- if mobile attempts full desktop editing parity, the experience becomes dense and unreliable
- if Preview and Review are treated as separate mobile products, continuity breaks
- if the AI Composer loses scope chips, mobile prompt actions become opaque and unsafe
- if approval actions are buried under chat history, mobile loses its strongest reason to exist

## Mobile Positioning Rule
The Mobile Companion is not a reduced IDE.
It is a continuity, approval, preview and prompt-control surface.

### Mobile priorities
- review and approve
- inspect previews
- monitor active runs
- issue prompt-driven instructions
- attach lightweight assets

### Mobile non-goals
- sustained multi-file editing
- dense canvas manipulation
- terminal-first workflows
- full admin/governance parity

## Mobile Mode Critique
### Build Lite
If raw source becomes the dominant mobile surface, the mode has failed.
It should stay prompt-first and impact-first.

### Preview
If runtime internals dominate the handheld viewport, mobile preview becomes a debugging screen instead of a validation surface.

### Review
If approval actions are not visually dominant, the mobile companion loses its highest-value workflow.

### Assets Lite
If asset management becomes deep-edit heavy on mobile, the experience will become fragile and slow.
