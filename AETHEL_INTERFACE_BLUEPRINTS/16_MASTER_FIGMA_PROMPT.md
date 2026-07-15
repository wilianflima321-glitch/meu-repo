# 16_MASTER_FIGMA_PROMPT
Date: 2026-03-25
Status: EXECUTION ARTIFACT
Surface Type: Figma / Design Generation Master Prompt

## Purpose
This file is the single prompt to use with design-generation AI inside Figma or a similar design system assistant.
It translates the canonical Aethel blueprints into one execution-grade instruction set.
It must be used together with the per-surface blueprints in this folder, but it is written to work as a standalone master prompt.

## How To Use
- paste the full prompt into the design-generation tool
- generate the full product architecture first, not isolated screens
- require one consistent system across all surfaces
- do not accept generic dashboard outputs or chat-first layouts
- if the tool struggles with prompt length, split it by the sections already defined below in this exact order

## Master Prompt
```text
You are designing the full interface system of Aethel Engine.

Aethel is not a dashboard with features.
Aethel is not a chat app with side panels.
Aethel is not a clone of VS Code with AI glued on.
Aethel is not a collection of separate products for app, game, film, assets, preview, docs and admin.

Aethel is:
- one studio system
- one workbench shell
- one AI operational layer
- one unified preview engine
- one connected project model with parallel flows
- one governance layer that supports, not pollutes, production

Your job is to create a premium, coherent, category-defining interface system that feels more operationally integrated than VS Code, more continuous than Firebase Studio, more execution-aware than Replit Agent, more viewport-serious than Unreal, and more compositionally mature than a typical builder UI.

Do not design generic SaaS dashboards.
Do not design a chat-first product.
Do not create disconnected screens that look like separate tools.
Do not invent extra core surfaces.
Do not create heavy decorative gradients, purple-on-black clichés, or futuristic clutter.
Do not over-explain the product with text.
Do not let cards, panels and banners compete equally for attention.
Do not make preview and chat share equal weight by default.
Do not make Studio Local look like a separate product.

Use the following product architecture exactly.

AETHEL PRODUCT ARCHITECTURE
Core surfaces only:
1. Home
2. Pricing
3. Contact Sales
4. Auth
5. Onboarding
6. Studio Home
7. Projects
8. Workbench
9. Billing
10. Settings
11. Profile / Team
12. Status
13. Admin / Monitoring
14. Docs / Help
15. Mobile Companion
16. Studio Local
17. Depth Modes and Handoffs

AETHEL PRODUCT LAYERS
1. Public layer
2. Entry layer
3. Studio layer
4. Workbench layer
5. Governance layer
6. Mobile Companion as constrained Workbench variant
7. Local Studio as depth-unlock variant of Workbench

AETHEL DEPTH MODES
1. Web Light
2. Studio Home
3. Operator Surface
4. Studio Cloud
5. Studio Local

CRITICAL PRODUCT DECISIONS
1. Workbench is the center. Everything else must either get the user into Workbench, return the user to Workbench, or govern what happens around Workbench.
2. Chat stays with the work. AI belongs beside the active artifact, preview, run or approval, not on a detached chat page.
3. Live is optional. Voice/live expands the same AI Console. It is not a separate product family.
4. Preview is unified. Web preview, 3D viewport, media preview and research preview are variants of one preview engine.
5. Projects have connected flows. One project may contain one primary domain, multiple connected flows, one shared asset layer and one shared AI scope model.
6. Mobile is a constrained Workbench variant. It preserves context, approvals, previews and prompt-driven control, and returns the user to desktop for dense production work.
7. Local is not a fork. Studio Local is the same product identity with deeper local execution, stronger filesystem trust, and heavier runtime support.

BENCHMARK PRINCIPLES TO ABSORB
From VS Code:
- predictable shell
- activity rail + sidebar + editor + bottom panel + status bar
- workspace restore behavior
- keyboard-first ergonomics
Do not copy the visual language literally. Absorb the structural discipline.

From Firebase Studio:
- editor and AI in one workspace
- preview in the same environment
- prototyping and coding as one loop
- low-friction, app-like entry
Do not let the product feel like AI wrapped around a weak shell or reduce Aethel to a prompt box.

From Replit Agent:
- visible execution steps
- idea to preview to publish as one flow
- approvals, runs and deployment as workflow moments
Do not reduce this to a chat transcript.

From Genspark:
- one-workspace, many-output ambition
- confidence that AI can move from prompt to multiple artifact types without context loss
- guided creation and save-point mentality for risky generation flows
Do not let this degrade into a loose AI workspace with weak shell discipline or too many top-level tools.

From Manus:
- advanced research should feel parallel, evidence-heavy and connected to deliverables
- browser-assisted collection, extraction and structured outputs should remain in the same task context
- research should be able to feed real artifacts, not end as a transcript
- operator-style internet work should feel useful immediately
Do not let research become a dead-end reading pane or a detached AI report page.

From Unreal Viewport:
- viewport as a first-class surface
- toolbar grouped by user intent
- preview controls that change by surface type
Do not let preview feel like an iframe widget.

From Adobe Firefly Boards and Premiere:
- canvas and board logic for ideation
- filmstrip and variants
- timeline literacy for media work
Do not turn these into separate products; they are modes inside the same Workbench.

GLOBAL VISUAL DIRECTION
Design a premium, calm, high-density system with:
- dark, controlled surfaces
- graphite-heavy chrome
- gray and blue as the dominant runtime palette
- purple only as a rare supporting accent, never as the emotional default
- clear hierarchy
- intentional negative space
- strong typographic scale
- visible depth through surface layers, not noisy effects
- borders and separators that feel machined, not glossy
- zero toy-like motion
- zero over-ornamentation

FOUNDATION TOKENS
Use the following as canonical design-system truth.
Color tokens:
- --aethel-surface-canvas: #0A0D12
- --aethel-surface-panel: #11161D
- --aethel-surface-elevated: #161D26
- --aethel-surface-overlay: rgba(7, 10, 15, 0.84)
- --aethel-surface-muted: #1E2631
- --aethel-surface-sidebar: #0F141B
- --aethel-surface-dock: #121821
- --aethel-surface-input: #151B24
- --aethel-border-default: rgba(148, 163, 184, 0.16)
- --aethel-border-strong: rgba(148, 163, 184, 0.28)
- --aethel-border-active: rgba(96, 165, 250, 0.48)
- --aethel-text-primary: #F5F7FB
- --aethel-text-secondary: #B8C0CE
- --aethel-text-tertiary: #8893A7
- --aethel-text-disabled: #5F697A
- --aethel-primary-500: #6AA9FF
- --aethel-primary-600: #4D96F3
- --aethel-primary-700: #357AD1
- --aethel-accent-500: #6F8FB4
- --aethel-success-500: #3DDC97
- --aethel-warning-500: #F2B94B
- --aethel-error-500: #F36A7F
- --aethel-info-500: #73BDF7

Typography tokens:
- Display/headline family: Sora or Space Grotesk style tone
- UI family: Inter
- Mono family: JetBrains Mono
- Hero: 56/60 700
- H1: 40/44 700
- H2: 32/36 700
- H3: 24/30 650
- Title: 18/24 650
- Body large: 16/24 500
- Body: 14/22 500
- Label: 12/16 600
- Micro: 11/14 600

Spacing tokens:
- 8, 12, 16, 20, 24, 32, 40, 48

Radius tokens:
- 10, 14, 18, 24, pill

Motion tokens:
- fast 140ms
- base 200ms
- slow 280ms
- standard easing only
- no bounce
- no looping glow

DENSITY TIERS
Public:
- open, calm, high-clarity
Studio:
- guided and operational
Workbench:
- dense, controlled, professional
Governance:
- audit-friendly and sober
Mobile Companion:
- focused, reduced, one dominant action per screen

WORKBENCH SHELL CONTRACT
The Workbench is the primary production shell.
Use one fixed seven-zone shell:
1. Top Bar
2. Left Activity Rail
3. Left Sidebar
4. Center Workspace
5. Right Rail
6. Bottom Dock
7. Status Bar

Strict geometry:
- Activity Rail: 56px
- Left Sidebar: 300px default, 260px minimum, 360px maximum
- Right Rail: 380px operational width
- Bottom Dock: 260px default height
- Status Bar: 28px

EDGE DRAG AND RESIZE CONTRACT
- every structural seam must be draggable
- hit area for seam drag: 8px
- visible divider: subtle 2px line
- seams must exist between sidebar and center, center and right rail, center and bottom dock, and split editor groups
- dragging a seam must immediately increase visibility of the surface the user is working in
- double-click on a seam resets the associated panel to canonical default size
- resize feedback must be mechanical and immediate, never springy
- expanding one surface must not fully destroy adjacent critical context

Top Bar exact order:
1. workspace switcher
2. project identity
3. mode badge
4. connected flow chips
5. breadcrumbs
6. command/search entry
7. share/deploy group
8. runtime pill
9. AI pill
10. user/overflow controls

Left Activity Rail items exactly:
- Explorer
- Search
- Source Control
- AI
- Assets
- Timeline
- Deploy

WORKBENCH MODE CONTRACTS
Build mode:
- editor is sovereign
- compact preview stays visible
- AI Console lives in Right Rail
- dock collapsed unless needed

Preview mode:
- preview is sovereign
- Preview Deck attached to preview context
- AI Console or Approval Details in Right Rail
- runtime/logs available in Bottom Dock
- viewport/monitor chrome must feel closer to Unreal and Adobe monitor discipline than to a generic iframe wrapper

Canvas mode:
- canvas is sovereign
- left sidebar becomes structure/layers
- right rail defaults to Properties
- AI remains available, not dominant by default
- a compact tool palette may sit near the canvas edge for high-frequency actions only

Review mode:
- compare/approval is sovereign
- Right Rail defaults to Approval Details
- Bottom Dock can expand for logs/evidence

Assets mode:
- asset browser is sovereign
- right rail defaults to metadata/usage
- left sidebar defaults to collections/types/tags

WORKBENCH RIGHT RAIL CONTRACT
Recommended tab order:
1. AI Console
2. Properties
3. Memory
4. Linked Assets
5. Approval Details

MISSING IDE-GRADE COMPONENTS THAT MUST BE DESIGNED
- shell resize handles
- breadcrumbs row
- split editor controls
- tab overflow and pinning
- active group focus treatment
- panel snap states and remembered resize ratios
- command palette with recent files and recent commands
- outline/symbols panel
- inline diagnostics and quick-fix affordances
- diff viewer
- approval bar
- Preview Deck
- compare mode
- Problems / Output / Logs / Ports / Runtime dock tabs
- terminal session tabs
- recovery cards for preview/runtime failure
- stale/outdated state badges
- memory/context scope chips
- run cards
- approval cards
- cost/confidence capsules

Do not hand-wave these away as implementation details.
They must appear as real components in the design system and in the Workbench frames.

AI CONSOLE CONTRACT
The AI Console is not a simple chat panel.
It has five fixed conceptual zones:
1. Conversation
2. Plan
3. Runs
4. Approvals
5. Memory / Context

Zone priority rules:
- blocking approvals outrank passive conversation history
- active execution outranks passive memory detail
- conversation remains the input surface but cannot bury execution truth
- memory/context shows active scope, not everything possible

Conversation:
- text input
- optional voice input
- artifact scope chips
- long tool outputs collapse

Plan:
- checklist of steps
- current step emphasized
- completed steps compressed
- blocked steps point to dependencies or approvals

Runs:
- active run card pinned first
- failed runs remain visible long enough for action
- each run shows role, duration, cost, state and next action

Approvals:
- semantic diff first
- impact summary second
- file/artifact detail third
- user should never hunt in chat for what needs approval

Memory / Context:
- current project scope
- connected flows in scope
- active rules/SOPs
- linked artifacts and assets

AI CONSOLE <-> PREVIEW UNITY CONTRACT
The AI Console and the active preview/viewport must feel like one working pair.
Rules:
- changing the active preview target updates AI scope chips immediately
- selecting a route, object, shot or source enriches AI context without resetting conversation
- prompts that affect the visible output must be inspectable in the current preview context
- prompts that affect another connected flow must surface that change through the Preview Deck
- approvals affecting a visible output must keep that output reachable beside or behind the approval state
- long chat history must never bury preview-critical actions or approval truth

Surface-aware AI quick actions:
- Web Preview: fix visible issue, adjust layout, compare breakpoint, open changed component
- 3D Viewport: focus selected, adjust camera, change lighting, apply transform suggestion
- Media Preview: revise shot, trim beat, adjust pacing, compare take
- Research Preview: extract findings, compare sources, create brief, attach to flow

AI CONSOLE BY MODE
Build:
- Conversation + Plan lead
- compact Runs visible
- approvals interrupt only when directly blocking current work

Preview:
- surface-aware Conversation stays tied to the visible output
- compact Approvals and Runs stay reachable

Canvas:
- Properties remains primary in the right rail
- AI acts as contextual generator/assistant for the current selection

Review:
- Approvals lead
- semantic summary and expected result stay above raw detail
- conversation is secondary support

Assets:
- AI emphasizes insertion scope, dependency impact, generation and replace-usage decisions

CANVAS EDITING RULES
- direct manipulation leads, property editing supports
- compact tool palette is allowed only for high-frequency tools such as Select, Insert, Transform, Inspect
- floating palettes must stay compact and contextual; they cannot replace the properties rail
- selection state must be unmistakable before transform, compare or generate actions appear
- canvas-specific buttons should prefer compact secondary and tertiary controls instead of a wall of primaries

RESEARCH PREVIEW CONTRACT
Research Preview is part of the same preview engine, not a detached report tool.
It must support:
- source selector or source rail
- compare references
- visible provenance
- extract queue or notes tray
- attach-to-flow and create-artifact actions

Research Preview should learn from Manus in depth and evidence flow, and from Adobe boards in visual compare and reference handling.
- include/exclude/pin controls

APPROVAL CARD CONTRACT
Approval Card exact order:
1. action title
2. impact area
3. affected flow/project
4. risk badge
5. expected result
6. semantic summary
7. impacted files/artifacts
8. primary actions: Approve, Reject
9. secondary actions: Inspect deeper, Rollback when available

Rules:
- semantic diff leads
- risk cannot rely on color only
- rollback remains reachable from the same run lineage
- pending approval must be visible from AI Console and Review mode
- if the approval affects a visible output, that output must remain reachable in the same review context

PREVIEW ENGINE CONTRACT
There is one preview engine with four surface variants:
1. Web Preview
2. 3D Viewport
3. Media Preview
4. Research Preview

UNIFIED PREVIEW CONTEXT RULE
All of these are faces and layers of the same project-bound preview context.
The user must be able to remain inside one project and one Workbench shell while:
- inspecting the active output
- comparing another connected flow
- opening references/research
- watching AI/browser-assisted research progress
- returning to the active output without losing scope

Allowed preview layers inside the same context:
- active output
- reference/source
- compare
- research/browser-operator
- approval overlay

Do not design these as separate top-level products or disconnected pages.

Preview UX goals:
- learn viewport sovereignty from Unreal
- learn monitor precision and compare literacy from Adobe
- learn evidence-rich research flow from Manus
- never feel like a generic embed or a detached report panel

Preview toolbar intent groups:
Group 1 Navigation:
- route selector for web
- camera selector for 3D
- source selector for research
- sequence or shot selector for media

Group 2 Runtime:
- refresh
- restart
- runtime state
- performance or health indicator

Group 3 View:
- device selector
- responsive width presets
- shading/overlay modes
- compare toggle when relevant

Group 4 Diagnostics:
- issue count
- logs shortcut
- runtime drawer shortcut
- affected flow freshness state

Viewport and monitor rules:
- the active output must remain visually dominant
- source/reference context must be distinguishable from the active output
- controls with high repetition value must stay visible
- overflow is for low-frequency actions only
- toolbar chrome should feel attached to the surface, not to the whole app shell

3D Viewport anatomy:
- viewport header with camera, transform, view mode and runtime controls
- dominant viewport canvas
- nearby selection/focus actions
- optional compact diagnostics strip

Media Preview anatomy:
- monitor header with sequence/shot context
- dominant monitor surface
- transport bar with play/pause, scrubber and frame/time readout
- zoom/fit controls
- audio state cluster
- compare/source toggle when relevant

Research Preview anatomy:
- source rail or source switcher
- dominant reference/board/output surface
- visible provenance row
- extract queue or structured notes tray
- compare lane or compare toggle
- attach-to-flow and create-artifact actions

Research run behavior:
- show subtask progress
- show source collection status
- show evidence readiness
- end in usable outputs, not only prose

PREVIEW DECK CONTRACT
The Preview Deck is mandatory.
It represents parallel flows inside the same project.
Each card contains:
- thumbnail
- flow title
- flow type
- last update
- current health
- active run owner when one exists

Card states:
- idle
- selected
- updating
- freshly updated
- degraded
- blocked
- compare mode
- pinned
- outdated
- conflict

Preview Deck UX rules:
- treat the deck more like a serious filmstrip/reference strip than a gallery carousel
- selected state must be obvious in peripheral vision
- pinned cards must preserve spatial stability
- compare entry must be explicit and reversible

CONNECTED FLOW DATA CONTRACT
Connected flows are part of one shared project model.
Every project may contain:
- one primary domain
- multiple connected flows
- one shared asset layer
- one shared AI scope model
- one shared run lineage

Shared asset layer rules:
- assets belong to the project or workspace layer, not to a single preview only
- if an asset changes, every affected flow must receive an explicit freshness change
- affected flows move to outdated, updating or degraded states
- no flow may pretend to be current when a linked asset changed materially

Artifact invalidation triggers include:
- images
- audio
- video clips
- 3D models
- textures
- scene composition data
- generated outputs reused by other flows

Example behavior:
If a shared character model or audio asset changes in Canvas or Assets mode:
- the game runtime preview becomes outdated
- the trailer/media preview becomes outdated
- any research or marketing flow using that asset reflects freshness loss too
- the Preview Deck shows this before the user navigates to the flow

HEALTH AND RECOVERY CONTRACT
Workbench needs a factual health layer.
Domains:
- API
- AI
- Preview
- Deploy

Health states:
- healthy
- degraded
- blocked

Rules:
- degraded means workflow can continue with caution
- blocked means primary action cannot continue without recovery
- every degraded or blocked state exposes one clear next step

Recovery Card exact order:
1. failure title
2. short factual reason
3. affected flow or artifact
4. primary recovery CTA: Retry
5. secondary CTA: Rollback when lineage exists
6. inspect CTA: Open logs or Inspect diff

Rules:
- recovery appears near failed work context
- do not redirect users to detached troubleshooting pages by default
- retry and rollback are explicit actions, not hidden in overflow

STATUS TRUTH CONTRACT
The status bar is factual, low-noise truth.
It must report:
- active branch/source state
- preview health
- AI readiness or active run
- diagnostics count
- current environment/runtime target

HOMEPAGE CONTRACT
Home must sell the category in one glance.
It must show:
- one dominant hero headline
- one dominant screenshot of the Workbench
- one short subheadline
- one primary CTA
- one secondary CTA
- workflow proof in three steps
- differentiation against chat, IDE and builder products
- compact pricing teaser

The hero screenshot must prove in one composition:
- editor or canvas
- preview
- AI Console
- connected flow cue or Preview Deck

STUDIO HOME CONTRACT
Studio Home is the continuity shell, not a dashboard.
It must answer quickly:
- what is my main project
- what should I do next
- what is already running
- what connected flows exist
- is anything blocked

Required modules:
- StudioTopBar
- MissionHeaderCard
- ConnectedFlowRail
- LiveStrip
- RecentWorkList
- QuickActionPanel
- RuntimeSummaryMatrix

Continue Work is a restore contract.
It restores:
- workspace
- project
- selected flow
- current mode
- active artifact
- current run or pending approval
- preview target
- viewport or scroll position when meaningful

PROJECTS CONTRACT
Projects is a serious catalog, not a gallery.
Each project card or row must expose:
- title
- primary domain
- phase
- objective line
- connected flows
- preview or AI state
- Open Workbench
- Open Preview

AUTH AND ONBOARDING CONTRACT
Auth must be fast, trustworthy and visually tied to the product.
Onboarding must get the user from blank state to meaningful first project in under 90 seconds.
Use step-based decisions, not giant forms.

BILLING, SETTINGS, PROFILE, STATUS, ADMIN, DOCS
Billing:
- current plan first
- usage second
- invoices/payment third
- issues local and actionable

Settings:
- providers
- models
- security
- preferences
- danger zone
- persistent save bar

Profile/Team:
- identity first
- member table second
- role matrix third
- activity context last

Status:
- factual, timestamped, non-marketing
- service matrix + incident timeline + maintenance

Admin:
- dense and operational
- tables and drilldowns over vanity charts
- monitoring, AI runs, users, payments, audit logs unified

Docs/Help:
- search-first
- task-first
- article pages must link back into the product
- in-product help callouts are part of the system

MOBILE COMPANION CONTRACT
Mobile is a constrained Workbench variant, not a reduced IDE.
Primary purpose:
- continue current work
- inspect previews
- approve/reject changes
- issue prompt-driven instructions
- attach lightweight assets
- return to desktop for deep production work

Mobile shell zones:
1. Mobile Top Bar
2. Main Surface
3. Context Drawer Layer
4. Bottom Sheet Layer
5. Compact Status Strip

Mobile modes:
- Build Lite
- Preview
- Review
- Assets Lite

Mobile rules:
- one dominant surface per screen
- one primary CTA per screen
- minimum touch target 44px
- no dense desktop parity
- live voice expands the AI Composer, not a separate mobile product family

KEYBOARD-FIRST CONTRACT
Command Palette is the nervous system of Workbench.
It must support:
- command execution
- quick file open
- quick flow switch
- mode switch
- recent commands
- recent files
- recent flows

High-frequency commands must include:
- switch to Build
- switch to Preview
- switch to Canvas
- switch to Review
- open AI Console
- focus Preview Deck
- open Terminal
- switch connected flow
- open active approval

FIGMA FILE STRUCTURE
Create exactly these pages:
1. 00 Foundations
2. 01 Public
3. 02 Entry
4. 03 Studio
5. 04 Workbench
6. 05 Governance
7. 06 Components
8. 07 States
9. 08 Motion
10. 09 Mobile Companion

FOUNDATION FRAMES
- typography scale
- color system
- spacing and density
- shadow/elevation
- buttons
- inputs and fields
- badges and chips
- toasts and banners

PUBLIC FRAMES
- Home desktop
- Home mobile
- Pricing desktop
- Pricing mobile
- Contact Sales desktop
- Contact Sales mobile
- Docs landing desktop
- Status public desktop

ENTRY FRAMES
- Auth desktop
- Auth mobile
- Onboarding step 1
- Onboarding step 2
- Onboarding step 3
- Onboarding provider/demo state
- Onboarding success/provisioning

STUDIO FRAMES
- Studio Home healthy
- Studio Home first-project empty
- Studio Home blocked
- Projects grid
- Projects list
- Projects empty

WORKBENCH FRAMES
- Build mode app/site
- Preview mode app/site
- Canvas mode app/site
- Build mode game
- Preview mode game
- Canvas mode game
- Preview mode film
- Canvas mode film
- Review mode
- Assets mode
- AI Console expanded
- command palette
- runtime drawer
- approval state

GOVERNANCE FRAMES
- Billing default
- Billing payment issue
- Settings providers/models
- Settings security
- Profile/Team
- Status healthy
- Status degraded
- Admin monitoring
- Admin AI monitor

MOBILE FRAMES
- Mobile Build Lite default
- Mobile Build Lite with code impact drawer
- Mobile Preview default
- Mobile Preview with Preview Deck active
- Mobile Review approval required
- Mobile Assets Lite
- Mobile blocked state
- Mobile low-connectivity state
- Mobile handoff-from-desktop state

COMPONENT SETS
Create canonical component sets for:
- PublicHeader
- PublicFooter
- SurfaceHeader
- Buttons
- Inputs
- Cards
- ProjectCard
- FlowCard
- AI Console sections
- Preview Deck cards
- Toolbar groups
- Status badges
- Tables
- Empty states
- Error blocks
- Toasts
- ApprovalCard
- RecoveryCard
- MobileTopBar
- AIComposerLite
- CompactStatusStrip

VARIANT REQUIREMENTS
Every critical component needs:
- default
- hover
- focus
- active or selected
- disabled
- loading when relevant
- error when relevant
- degraded or blocked when relevant

ANNOTATION RULES
Every major frame must annotate:
- component names
- primary action
- hierarchy order
- why the component exists
- what it connects to
- default state
- progressive disclosure behavior
- hidden-by-default parts

DESIGN RULES
- no page-local palettes
- no one-off spacing systems
- no loose hex colors when tokens exist
- no decorative health widgets in production surfaces
- no neutral loading shells when restore context exists
- no separate product families for preview, live, assets or review
- no chat-first workbench layouts

OUTPUT GOAL
Produce one coherent interface system where:
- the base mental model feels like a serious IDE
- the preview layer feels like a professional validation engine
- the AI layer feels operational, not conversational-only
- the studio layer feels like continuity, not reporting
- the governance layer feels sober, factual and useful
- mobile feels like a tactical companion, not a broken desktop clone

The final result should feel like a premium production shell that can credibly stand beside VS Code, Firebase Studio, Unreal-style viewport tooling, and Replit Agent-level execution visibility, while remaining one unified Aethel product.
```

## Recommended Execution Order
1. Foundations
2. Workbench shell and core modes
3. AI Console and Approval system
4. Preview Engine and Preview Deck
5. Studio Home and Projects
6. Public surfaces
7. Governance surfaces
8. Mobile Companion
9. Component sets
10. States and motion

## Validation Checklist
Use this checklist against the generated design:
- Does Workbench clearly feel like the product center?
- Is there one obvious center of gravity per mode?
- Is AI operational rather than just conversational?
- Does Preview feel like one engine with surface variants?
- Are connected flows visible and meaningful?
- Does Studio Home orient instead of dashboarding?
- Are governance surfaces sober and factual?
- Does mobile preserve continuity instead of imitating desktop badly?
- Are tokens, spacing and motion consistent across all frames?
- Could a developer implement this without inventing major architecture?

