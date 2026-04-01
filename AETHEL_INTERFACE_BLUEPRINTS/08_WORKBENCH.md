# 08_WORKBENCH
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Core Production Surface

## Mission
A single production shell where the user can build, preview, review, create assets and work with AI without switching products.

## Critical Opinion
### What this surface should be
- the real center of Aethel
- a professional workbench with a VS Code-grade mental model
- a place where chat, preview, code, canvas, assets, and review stay connected

### What this surface should not be
- a dashboard in disguise
- a set of unrelated panes with equal weight
- a chat product with an editor bolted on
- a preview page plus an IDE page plus an assets page pretending to be one experience

### What the current repo is already telling us
The codebase already has enough parts for a strong workbench.
The problem is fragmentation:
- too many shells
- too many preview variants
- too many chat variants
- too many routes that imply separate products

This blueprint is intentionally opinionated so the product stops feeling scattered.

## Implementation Reality Check (2026-03-25)
The canonical contract is now stronger than the implementation.
That is useful for direction, but it also means the real frontend still carries drift risk.

### 1. Shell reality
Current production entry:
- `cloud-web-app/web/app/ide/page.tsx`
- `cloud-web-app/web/components/ide/FullscreenIDE.tsx`

Current problem:
- `FullscreenIDE.tsx` still supports two shell paths
- `ModernIDEShell` is gated by `shell=modern`
- `IDELayout` remains a live fallback instead of a historical reference

Critical opinion:
- this is the single biggest architecture leak in the current interface
- a canonical shell cannot remain optional
- while two shell identities stay alive, every downstream surface inherits ambiguity

Concrete implementation gaps:
- `FullscreenIDE.tsx` still branches between `ModernIDEShell` and `IDELayout`
- `shell=modern` is still used as a live switch instead of a migration-only flag
- `IDELayout.tsx` still behaves like an active shell path instead of a historical reference
- `components/_deprecated/layout/IDELayout.tsx` still exists, which increases cognitive and maintenance drift

### 2. Preview reality
Current preview family:
- `cloud-web-app/web/components/preview/CanonicalPreviewSurface.tsx`
- `cloud-web-app/web/components/ide/PreviewRuntimeToolbar.tsx`
- `cloud-web-app/web/components/ide/PreviewPanel.tsx`
- `cloud-web-app/web/components/LivePreview.tsx`
- `cloud-web-app/web/components/VRPreview.tsx`

Current problem:
- `CanonicalPreviewSurface.tsx` is already the correct direction, but it still composes older preview surfaces instead of fully replacing them
- the canonical layer still delegates to `LivePreview` and `PreviewPanel`
- route fragmentation is reduced, but preview still leaks into dashboard and other non-Workbench contexts in ways that can blur the product center

Critical opinion:
- this is a strong transitional architecture, not a fully consolidated one
- the preview engine is on the right path, but it is still acting as a wrapper around multiple preview identities

Concrete implementation gaps:
- `CanonicalPreviewSurface.tsx` still delegates to `LivePreview` and `PreviewPanel`
- runtime state exists both inside `CanonicalPreviewSurface` and inside `usePreviewRuntimeManager` / `PreviewRuntimeToolbar`
- Preview Deck is still a blueprint concept more than a real production surface
- `entry=vr-preview` redirects into `/ide`, but the Workbench entry handling does not clearly honor a VR-specific preview mode
- inline fallback can still disappear behind idle skeleton behavior when runtime URL state is missing

### 3. AI reality
Current AI family:
- `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx`
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`
- `cloud-web-app/web/components/ide/AIChatPanelChrome.tsx`
- `cloud-web-app/web/components/ide/AIChatContextPanels.tsx`
- `cloud-web-app/web/components/ide/InlineAIChat.tsx`
- `cloud-web-app/web/components/nexus/NexusChatMultimodal.tsx`

Current problem:
- the main Workbench AI surface is still structurally chat-first
- `AIChatPanelContainer` is the best canonical foothold, but the visible implementation is still centered on `AIChatPanelPro`
- the operational AI Console model (`Conversation`, `Plan`, `Runs`, `Approvals`, `Memory / Context`) is not yet fully enforced in the live component tree
- `NexusChatMultimodal` still acts like a parallel AI center in another product surface

Critical opinion:
- the current AI UI is capable, but not fully disciplined
- if we stop at "advanced chat panel", we will miss the biggest product advantage

Concrete implementation gaps:
- `AIChatPanelContainer` still renders through `AIChatPanelPro` as the dominant runtime surface
- the live UI does not yet enforce a clear hierarchy of `Approvals` > `Runs` > `Plan` > `Conversation` when execution is active
- `InlineAIChat.tsx` and `NexusChatMultimodal.tsx` keep parallel chat identities alive
- approvals, rollback, memory scope and cost are stronger in docs than in the current visible hierarchy

### 4. Terminal reality
Current terminal family:
- `cloud-web-app/web/components/terminal/XTerminal.tsx`
- `cloud-web-app/web/components/terminal/IntegratedTerminal.tsx`
- `cloud-web-app/web/components/terminal/TerminalWidget.tsx`
- `cloud-web-app/web/components/TerminalPro.tsx`

Current problem:
- the most serious terminal implementation exists, but the product still exposes multiple terminal identities
- the Bottom Dock contract is clearer in the blueprint than in the runtime UI
- the terminal family still reads like a toolkit, not one canonical product surface

Critical opinion:
- terminal fragmentation is smaller than shell fragmentation, but it still weakens the sense of product maturity
- the product needs one dock, one terminal identity, and one diagnostic basin

Concrete implementation gaps:
- `IDELayout.tsx` still exposes a dock contract that diverges from the canonical Bottom Dock tab set
- `XTerminal.tsx`, `IntegratedTerminal.tsx`, `TerminalWidget.tsx`, and `TerminalPro.tsx` still coexist as visible terminal identities
- output/log/runtime surfaces are not yet fully disciplined as one canonical diagnostic basin

### 5. Nexus reality
Current competing surface:
- `cloud-web-app/web/app/nexus/page.tsx`

Current problem:
- Nexus still behaves like a partial alternate studio center with its own canvas, right panel modes, and chat focus
- it carries real value, but it competes with Workbench for conceptual authority

Critical opinion:
- Nexus should become a domain/lab specialization under the Workbench mental model, not a second main product language

Concrete implementation gaps:
- `app/nexus/page.tsx` still carries its own chat/research/director right-panel center of gravity
- Nexus still behaves more like a parallel product surface than a contextual Workbench specialization

## Implementation Gaps That Still Matter
These gaps are no longer conceptual. They are the main reasons the interface can still drift away from the benchmark level we want.

### Missing consolidation outcomes
- one shell path only
- one preview family only
- one AI Console family only
- one terminal family only
- one route identity for serious production work

### Missing runtime behaviors
- full mode persistence across shell states
- fully visible `Connected Flows` as a first-class UI concept
- real `Preview Deck` authority in the active work loop
- approval-first AI operations instead of chat-first emphasis
- explicit stale/outdated propagation when shared assets change
- robust restore into the correct preview variant instead of generic preview enablement only
- one factual runtime status path instead of duplicated preview-health surfaces

### Remaining architectural risks
- preview still being perceived as a secondary widget instead of a sovereign validation surface
- AI still being perceived as a sidebar chat rather than operational control
- dashboard and Nexus still absorbing too much production gravity

## Canonical Structural Decision
Use one workbench shell model built around these permanent zones:
1. Top Bar
2. Left Activity Rail
3. Left Sidebar
4. Center Workspace
5. Right Rail
6. Bottom Dock
7. Status Bar

No other page family is allowed to compete with this shell for the role of main product surface.

## Quality Correction
The current interface still has critical quality gaps that must be treated as first-class product work, not polish work.

### Quality gaps that are currently too important to ignore
- the shell still feels transitional instead of inevitable
- resize and visibility control are not yet explicit enough for a true IDE-grade experience
- too many core components are defined in blueprints more clearly than they exist in the runtime UI
- dark theme direction is present, but it is not yet strict enough, calm enough, or graphite-heavy enough
- too many surfaces still rely on composition shortcuts instead of disciplined component anatomy

### Non-negotiable quality rule
Workbench quality is not achieved by adding more panels.
It is achieved by:
- stronger structural hierarchy
- better resize behavior
- better persistence
- more factual runtime states
- more complete IDE component coverage
- darker, calmer, more serious visual discipline

## Canonical Experience Loop
Workbench should feel excellent not only because of its components, but because the sequence of use is coherent.

### 1. Orient
The user must instantly understand:
- which workspace they are in
- which project is active
- which mode is active
- which flow or artifact is selected
- whether something is blocked, running or outdated

### 2. Focus
One surface must clearly lead:
- editor in Build
- preview in Preview
- canvas in Canvas
- approval/compare in Review
- asset browser in Assets

### 3. Act
The main action surface must have immediate supporting controls nearby:
- AI in the right rail
- diagnostics in the dock
- scope and navigation in top bar or side bar

### 4. Validate
Any meaningful change should become visible without sending the user into another product:
- preview refreshes in place
- approvals appear in place
- stale/outdated states appear in place

### 5. Decide
The product must make risky actions legible:
- semantic diff before raw diff
- risk badge before approval CTA
- rollback or retry paths near the action

### 6. Recover
When something fails, the user must get one obvious next step:
- retry
- rollback
- open logs
- inspect diff

Opinion:
If any one of these phases is weak, the Workbench will feel below benchmark even if individual panels look polished.

## Benchmark Alignment
### From VS Code
Keep:
- workbench shell
- activity rail
- primary sidebar
- editor groups
- bottom panel
- status bar
- workspace restore behavior

### From Firebase Studio
Keep:
- editor assistance inline and via chat
- code and prototyping as one workspace
- preview in the same environment

### From Replit
Keep:
- visible execution loop from idea to output
- deployment and rollback as workflow moments
- project-level preview attached to active work

### From Genspark
Keep:
- one-workspace, many-output ambition
- AI workflows that can move across artifact types without making the user feel lost
- guided creation and save-point mentality for risky generation flows
- a sense that the workspace can expand from prompt into real deliverables

Reject:
- a loose AI-workspace feel with weak shell discipline
- prompt-first ambiguity replacing explicit artifact structure
- too many top-level tool identities competing for attention

### From Unreal
Keep:
- viewport as first-class surface
- toolbar grouped by intent
- game view or scene preview distinction
- preview controls by surface type

### From Adobe Firefly Boards and Premiere
Keep:
- canvas and board logic for ideation
- filmstrip or variants strip
- timeline literacy for media work

## Benchmark Critique Matrix
### Where Aethel must beat VS Code
- stronger AI operations
- multimodal preview as a first-class citizen
- connected flows across app, game, film and assets

### Where Aethel must beat Replit
- stricter shell hierarchy
- stronger non-chat operational truth
- better separation between orientation surfaces and production surfaces

### Where Aethel must beat Genspark
- harder IDE-grade structure
- clearer artifact ownership and preview authority
- less workspace ambiguity when multiple outputs exist

### Benchmark failure conditions
The Workbench is below benchmark if:
- it still feels like a chat panel beside an editor
- preview still feels like a widget instead of a sovereign validation surface
- switching between outputs still feels like changing products
- resize, panel control and artifact focus still feel weaker than a serious IDE

## Canonical Route Rule
The product should conceptually expose one serious production route.
If `/ide` remains as the active route, it should represent Workbench.
Other routes such as preview, live-preview, vr-preview, editor-hub, blueprint-editor or niche editors should be treated as legacy, aliases, or mode-specific entries - not separate product centers.

## Canonical Keep / Merge / Deprecate Map
### Shell
Keep:
- `ModernIDEShell.tsx`
- `FullscreenIDE.tsx`
Reference only:
- `IDELayout.tsx`

### Preview
Keep:
- `CanonicalPreviewSurface.tsx`
- `PreviewRuntimeToolbar.tsx`
Merge into this family or retire as independent surface concepts:
- `PreviewPanel.tsx`
- `LivePreview.tsx`
- `VRPreview.tsx`
- `MiniPreview.tsx`

### AI
Keep:
- `AIChatPanelContainer.tsx`
- `AIChatPanelChrome.tsx`
- `AIChatContextPanels.tsx`
- `InlineAIChat.tsx`
Treat as contextual extensions, not separate product centers:
- `NexusChatMultimodal.tsx`
- route-level chat surfaces outside Workbench

### Terminal
One integrated bottom-dock terminal family must survive.
Four competing terminal identities cannot remain visible in product architecture.

## Critical Quality Audit By Zone
The Workbench still has quality gaps that are not cosmetic. They affect credibility, flow and production confidence.

### Top Bar critique
Current risk:
- top-level orientation is still too vulnerable to becoming a utility dump
- connected flows, breadcrumbs, runtime truth and global command access are not yet enforced as a disciplined hierarchy

What must improve:
- project identity must remain visually dominant over auxiliary actions
- connected flows need stronger chips with selected, outdated and blocked states
- breadcrumbs must remain readable under pressure instead of collapsing into generic labels
- command entry must feel like the operational heart of the shell, not a search afterthought

### Left Activity Rail critique
Current risk:
- rail items still feel more like navigation shortcuts than a serious workbench spine
- blocked, active and attention states are not yet explicit enough

What must improve:
- active state needs stronger structural contrast
- blocked/attention state must be factual, not badge spam
- hover and keyboard affordances should teach predictability, not novelty

### Left Sidebar critique
Current risk:
- sidebar content can still feel like a generic panel stack rather than a domain-specific navigation basin
- collapse and resize behavior is not documented tightly enough in the runtime

What must improve:
- file tree, scene tree and asset tree need disciplined row anatomy
- expansion state should persist per tool family
- resize must be mechanical and forgiving, with visible seam strengthening on hover

### Center Workspace critique
Current risk:
- the center can still feel like a host for multiple widgets instead of a sovereign work surface
- split editor behavior is not yet formal enough to feel IDE-grade

What must improve:
- one surface must clearly lead in every mode
- split groups need explicit controls, remembered proportions and drag seams
- active artifact context must survive mode switches without neutral re-entry

### Right Rail critique
Current risk:
- the rail still risks reading as a chat sidebar instead of operational control
- properties, approvals and AI can compete instead of obeying mode sovereignty

What must improve:
- in Build, AI Console leads
- in Canvas, Properties leads
- in Review, Approval Details leads
- secondary tabs must stay reachable without flattening the main hierarchy

### Bottom Dock critique
Current risk:
- dock behavior still feels toolkit-like rather than canonical
- terminal, logs and runtime do not yet read as one diagnostic basin

What must improve:
- one terminal identity
- one dock tab grammar
- factual counts and problem states in the tab strip
- collapse-by-default with strong persistence of the last useful state

### Status Bar critique
Current risk:
- status truth is still duplicated elsewhere
- it can drift into decorative metadata instead of operational fact

What must improve:
- status bar should carry branch, preview health, AI readiness, environment target and blocked state in a fixed low-noise order
- anything shown there should be factual, compact and actionable

### Seam and resize critique
Current risk:
- the interface still does not yet feel physically adjustable enough for a true IDE
- users need stronger control over visibility without hunting for tiny grips

What must improve:
- every structural seam must be easy to grab from the middle edge
- resize must prioritize the surface the user is actively working in
- seam reset on double-click must exist wherever canonical defaults exist
- expanding one area should not blind adjacent critical context

### Theme critique
Current risk:
- dark styling exists, but not yet with enough graphite discipline
- some surfaces still risk reading as generic dark SaaS or flashy AI tooling

What must improve:
- graphite, slate and cold blue must dominate the workbench chrome
- purple should never be the default emotional color of the runtime
- borders, tabs and rails should feel machined and calm
- contrast should be achieved through structure, not glow

## Shell Anatomy
### 1. Top Bar
Purpose:
- orient the user in the current workspace and flow
- expose the most global actions without clutter

Required elements:
- workspace switcher
- current project name
- current mode badge
- connected flow chips
- breadcrumbs for current file, scene or page
- command access or global search
- share or deploy action
- compact runtime and AI state

Subcomponents:
- WorkspaceSwitcher
- ProjectIdentity
- ModeBadge
- ConnectedFlowChipRow
- Breadcrumbs
- TopBarActionGroup
- StatePills

Opinion:
The top bar must remain lean.
If it becomes a toolbar for everything, the product loses composure immediately.

### 2. Left Activity Rail
Purpose:
- stable navigation between tool families inside Workbench

Canonical items:
- Explorer
- Search
- Source Control
- AI
- Assets
- Timeline
- Deploy

Behavior:
- one active icon at a time
- repeated click collapses or expands sidebar
- keyboard shortcut displayed on hover where relevant
- icons never reorder dynamically

Opinion:
This rail must be predictable like VS Code, not adaptive or magical.
Predictability matters more than novelty here.

### 3. Left Sidebar
Purpose:
- detailed navigation for the active tool family

Panels may include:
- file tree
- scene tree
- page tree
- asset collections
- AI session list
- timeline list

Sidebar width:
- default 300 px
- resizable
- collapsible

Resize contract:
- seam must be draggable from the middle edge, not only through a tiny decorative handle
- default hit area: `8 px`
- hover on seam shows stronger divider state
- drag immediately expands the active working surface without animation lag
- double-click resets to default width
- drag below the minimum threshold should snap back instead of causing accidental collapse
- explicit collapse action is preferred over accidental collapse-by-drag

Opinion:
This sidebar should never try to show two tool families at once.
Doing so would recreate the product fragmentation inside the shell.

### 4. Center Workspace
Purpose:
- the dominant production area
- the user's main focus surface

This area changes by mode but keeps the same outer shell constraints.
It must always feel dominant over side chrome.

Center workspace rules:
- editor groups, preview groups and compare groups must share one split grammar
- the active group must have unmistakable focus treatment
- group headers must support pin, split, close-other and reveal-in-sidebar actions
- switching modes should preserve the most relevant active artifact, not reset to a neutral center

### 5. Right Rail
Purpose:
- contextual intelligence
- AI
- properties
- approvals
- memory
- linked artifacts

Possible modules:
- AI Console
- Memory Capsule
- linked assets
- selected item properties
- approval details
- current run details

Right rail width:
- default 380 px
- resizable
- may collapse to icon rail on tighter widths

Resize contract:
- draggable seam must be obvious when the pointer reaches the center edge
- user must be able to widen the AI Console or Properties area quickly while preserving center workspace context
- right rail must not shrink below real operational usability
- rail should snap back to canonical width on double-click
- collapse should occur only through deliberate threshold or explicit collapse control

Opinion:
This rail is where the product beats a traditional IDE.
It must not degrade into a generic property inspector or generic chat panel.
It has to be context-aware and operational.

### 6. Bottom Dock
Purpose:
- low-level execution and diagnostics

Canonical tabs:
- Terminal
- Problems
- Output
- Logs
- Ports
- Runtime
- Timeline mini when relevant

Dock behavior:
- remembers last open tab per project
- can collapse to tab strip
- can expand higher in Preview and Review modes

Resize contract:
- top seam is always draggable
- drag expands logs/runtime visibility without detaching the dock from the shell
- double-click resets to default height
- dragging must not force a full layout recomposition of the shell
- drag close to the minimum should snap back to the tab-strip state instead of jittering
- full collapse must preserve the active tab so re-open feels continuous

Opinion:
Bottom dock is the right home for terminal and runtime internals.
Those details should not pollute the main canvas.

### 7. Status Bar
Purpose:
- persistent low-noise truth

Shows:
- branch or source state
- active environment
- errors or warnings count
- AI readiness or active run
- preview health
- current selection metadata when useful

Opinion:
The status bar should be boring, precise, and useful.
It is not a decorative strip.

## Core Modes
### Build Mode
Use when the user is editing code, configuration or logic.

Layout:
- center left: editor groups dominate
- center right: smaller live preview
- right rail: compact AI Console and file context
- bottom dock: terminal and problems available

Editor stack:
- Tabs
- Breadcrumbs
- EditorSurface
- InlineDiagnostics
- Optional minimap

Preview stack:
- PreviewHeader mini
- current route or scene label
- runtime state
- open larger preview action

Primary actions:
- edit
- run
- ask AI
- review diff
- open larger preview

Critical opinion:
This is the default mode for apps and most code-heavy work.
If preview grows too dominant here, coding loses its center.
If preview disappears entirely, the product loses its key advantage.
The balance must stay deliberate.

### Preview Mode
Use when the user is validating output.

Layout:
- center: preview or viewport dominates
- below or side: Preview Deck with parallel flows
- right rail: AI Console focused on review, fixes and approvals
- bottom dock: runtime, logs, network, performance

Preview header controls grouped by category:
- navigation: back, route or scene selector
- runtime: refresh, restart, open in tab
- view: device, viewport type, overlays
- diagnostics: issues, logs, perf

Advanced runtime controls belong in a drawer, not in the main canvas.

Critical opinion:
Preview Mode is where Aethel has to feel more like Firebase Studio plus Unreal than like a weak iframe panel.
The main preview must be visually dominant, and the deck of parallel flows must make the project feel alive.

### Canvas Mode
Use when the user is composing layout, scene or storyboard.

Layout:
- center: canvas dominates
- left sidebar: structure, pages, layers, scenes
- right rail: properties and contextual AI
- lower strip: variants or filmstrip

Actions:
- select
- transform
- compare
- sync with code or runtime
- generate variation

Properties panel categories vary by artifact type:
- web: layout, spacing, typography, interactions
- scene: transform, material, lighting, behavior
- media: clip, duration, transition, caption, audio level

Canvas anatomy:
- top contextual toolbar
- dominant canvas/stage
- optional compact left tool palette for selection/insert/transform modes
- left structure panel
- right properties panel
- lower variants/filmstrip strip when applicable
- optional contextual floating palette near selection for high-frequency actions only

Canvas editing rules:
- the canvas should privilege direct manipulation first, property editing second
- floating palettes must stay compact and contextual; they must never replace the main properties rail
- selection handles, bounding boxes and guides must be visible enough for precision without flooding the stage
- insert mode, transform mode and inspect mode must be visually distinct
- the user should always know whether they are selecting, transforming, inserting or comparing

Canvas selection model:
- no selection
- single selection
- multi-selection
- locked item selected
- parent/group selected

Canvas toolbar groups:
- mode: Select, Insert, Transform, Inspect
- edit: Duplicate, Group, Lock, Hide
- compare/sync: Compare, Apply to Code, Sync Runtime
- generation: Generate Variant, Ask AI on Selection

Canvas palette rules:
- the compact tool palette should appear only for high-frequency editing tools
- deeper editing options belong in the properties rail, not in large floating trays
- canvas-specific quick actions must not compete with the top bar or the AI Console

Critical opinion:
Canvas Mode is where Aethel becomes more than an IDE.
But it must still stay in the same workbench shell and language. Otherwise the product fractures again.

### Review Mode
Use when a plan, diff or output must be approved.

Layout:
- center: diff, compare, before-after, impact summary
- right rail: approval card, risk, rollback, comments
- bottom dock: evidence and logs

Primary actions:
- approve
- revise
- reject
- rollback

Review mode UX rules:
- the before/after or active-output context must remain visually reachable while the decision is being made
- semantic impact must lead before raw implementation detail
- risk should be explained in words and structure, not only color
- the user must understand exactly what will change if they approve
- rollback lineage must stay nearby whenever it exists

Review mode states:
- pending approval
- multi-artifact approval
- compare active
- waiting on evidence
- blocked by missing context
- approved
- rejected
- rollback available

Critical opinion:
Review Mode is essential to making AI feel trustworthy.
Without it, the AI layer feels like a chat that edits things in the dark.

### Assets Mode
Use when searching, creating, tagging, transforming or reusing assets.

Layout:
- left sidebar: type filters, collections, tags
- center: asset grid or list
- right rail: metadata, usage map, transformations, insert actions

Asset types:
- image
- video
- audio
- 3D model
- texture
- icon
- motion clip
- reference document

Critical opinion:
Assets Mode must be a workspace library, not a media tab.
Its job is reuse, versioning, and insertion into flows.

### Live Mode
Optional expansion of the AI Console.
It is not a separate product.

When enabled:
- adds voice input
- adds live transcript
- exposes interruption and session state
- keeps the current preview or artifact visible

Critical opinion:
Live is optional by design.
The baseline product must work without it.
If the product depends on live to feel coherent, the chat and AI console architecture is wrong.

## AI Console
The AI Console is always part of the Workbench and always contextual.
It contains five zones.

### 1. Conversation
Elements:
- message list
- rich composer
- attachment picker
- current artifact reference chips
- send and mode controls

Opinion:
Conversation is necessary, but it must not dominate the console. The user is here to get work done, not just talk.

### 2. Plan
Elements:
- objective
- checklist of steps
- current step badge
- expected result panel

Opinion:
This is where the console becomes operational.
The plan must be visible enough to replace ambiguity, but compact enough not to bury conversation and runs.

### 3. Runs
Elements:
- run cards
- agent stack
- cost estimate
- duration
- blockers

Opinion:
If runs are hidden, the product feels opaque.
If runs are oversized, the panel becomes admin-heavy.
Balance matters.

### 4. Approvals
Elements:
- diff summary
- impact area
- risk level
- approve or reject actions

Opinion:
Approvals are the trust layer. They should feel deliberate and premium, not like accept/reject buttons under a chat message.

### 5. Memory and Context
Elements:
- project scope
- connected flows used
- rules active
- recent relevant decisions
- linked artifacts

Opinion:
This is where Aethel can surpass basic AI IDEs.
The user should always understand what context the system is using and why.

## Preview Engine
The Workbench preview engine supports four surface types.

## Unified Preview Context Contract
Preview, viewport, media inspection and research are not separate products or detached pages.
They are navigable faces and layers of the same project-bound preview context.

### Core rule
The user can stay inside one project, one Workbench shell and one preview context while:
- inspecting the active output
- comparing another connected flow
- opening research/reference material
- watching AI research or browser-assisted work progress
- returning to the active output without losing scope

### Preview layer model
The unified preview context may expose:
- active output layer
- reference/source layer
- compare layer
- research/browser-operator layer
- approval overlay

Rules:
- these are layers or navigable states inside the same preview family, not separate top-level surfaces
- moving between layers must preserve project, flow, run and AI scope
- the user should feel they are navigating one intelligent preview space, not jumping between tools

### 1. Web Preview
Required tools:
- route selector
- device selector
- refresh
- open in tab
- issue count
- runtime badge

Web preview UX rules:
- route and device state must stay glanceable at all times
- responsive/device switching should not feel like leaving the current output
- issue count and runtime health should stay close to the preview, not buried in dock-only controls

### 2. 3D Viewport
Required tools:
- camera selector
- transform mode
- viewport mode
- lighting or exposure tools
- overlays or gizmo toggles
- play or game view toggle

3D viewport UX rules:
- camera, transform and view mode controls must remain close to the viewport header
- overlay and gizmo controls should be visible enough for repeated use, not buried in generic menus
- play/game view transitions should preserve the user's mental model of the current scene
- object/scene focus should feel immediate and not require panel hunting

3D viewport anatomy:
- viewport header with camera, transform, view mode and runtime controls
- dominant viewport canvas
- optional scene hierarchy awareness through left sidebar, not overlaid clutter
- selection readout and focus action near viewport chrome
- compact diagnostics strip for FPS/health only when relevant

3D viewport states:
- editor view
- game/play view
- selected object
- no selection
- loading scene
- degraded runtime
- blocked runtime

### 3. Media Preview
Required tools:
- play or pause
- scrubber
- frame position
- zoom
- audio mute or levels
- export state

Media UX rules:
- distinguish clearly between the active output and any reference or source clip
- transport controls must stay visible without competing with the image
- frame/time readout should remain glanceable during scrub
- fit, zoom and compare behaviors should preserve orientation instead of resetting the monitor unexpectedly

Media preview anatomy:
- monitor header with sequence/shot context
- dominant monitor surface
- transport bar with play/pause, scrubber and time readout
- zoom/fit controls
- audio state cluster
- compare or reference toggle when source context exists

Media preview states:
- paused
- playing
- scrubbing
- compare mode
- muted
- render outdated
- export in progress
- blocked media/runtime

### 4. Research Preview
Required tools:
- compare references
- source list
- extract notes
- attach to current flow

Research preview anatomy:
- source rail or source switcher
- dominant board/reference/output surface
- visible provenance row
- extract queue or structured notes tray
- compare lane or compare mode toggle
- action cluster for `Attach to Flow`, `Create Artifact`, `Open Source`

Research preview states:
- browsing sources
- compare mode
- extraction in progress
- evidence ready
- attached to flow
- blocked source
- degraded retrieval

Critical opinion:
This unified preview engine is what prevents Aethel from splitting into separate tools for app, game, film, and research.
The product must feel like one engine with domain-specific faces.

## Preview / Viewport Benchmark Matrix
### From Unreal Engine
Absorb:
- viewport sovereignty; the viewport must feel like a primary work surface, not a media box
- toolbar grouped by intent rather than implementation detail
- explicit separation between navigation, transform, view mode and play/runtime states
- selection focus, camera control and overlay toggles that stay close to the viewport

Apply to Aethel:
- 3D preview should support camera, transform, overlays and play-state without leaving Workbench
- preview toolbars should remain stable while controls swap by surface type
- the viewport should tolerate dense work without becoming visually noisy

Reject:
- scattering viewport controls into distant side panels
- hiding runtime/play state under generic overflow
- treating 3D preview like a slightly richer iframe

### From Adobe Premiere and Firefly Boards
Absorb:
- monitor-first validation: the active output monitor must stay visually dominant
- precise scrub, zoom, frame/time readout and fit controls for media work
- distinction between reference material and the active output
- boards and references as part of the same creative loop, not separate product families

Apply to Aethel:
- media preview should pair playback precision with easy jump-to-source context
- research preview should support reference comparison, note extraction and attach-to-flow behavior
- Preview Deck should function more like a serious sequence/reference strip than a decorative thumbnail row

Reject:
- burying playback controls in generic tool menus
- making references feel detached from production decisions
- forcing the user to leave the main work context to inspect alternative takes or sources

### From Manus-style advanced research workflows
Absorb:
- parallel research subtasks with visible progress
- evidence-first outputs with traceable sources
- research that ends in artifacts, not only summaries
- browser-assisted collection and structured extraction inside the same task context

Apply to Aethel:
- research preview should show source trace, extract queue, compare set and flow-attachment actions
- AI runs for research should expose subtask progress and evidence readiness, not just a final paragraph
- connected flows should allow research outputs to feed landing pages, trailers, assets and scripts directly

Reject:
- long unstructured research transcripts
- source citations hidden behind chat history
- research outputs that do not connect back into flows and artifacts

## Preview Deck
The Preview Deck is mandatory in Preview Mode and available in Build Mode.
It is a set of smaller live previews for parallel flows in the same project.

Each card shows:
- flow title
- flow type
- update time
- run owner or AI owner
- health state
- open in focus

Card actions:
- pin
- compare
- duplicate flow
- open in main preview

Example flows:
- Landing Hero
- Gameplay Loop
- Trailer Shot 03
- Research Board
- Store Page

Critical opinion:
This component is not optional.
Without it, parallel work becomes hidden and the product collapses back into single-output thinking.

## Connected Flow Model
A project has:
- one primary domain
- zero or more connected flows
- one shared asset layer

Example:
- Primary project: Atlas Game
- Connected flows: Trailer, Launch Site, Asset Library, Audio Pack

The user must always see the current scope in:
- top bar
- AI Console
- approval cards when a change affects multiple flows

## Component Connections
- Top Bar shows project, mode, and connected flows
- Left Sidebar selects the working structure for the current mode
- Center Workspace shows the main artifact or preview
- Right Rail explains, augments, or approves what the center is doing
- Bottom Dock exposes runtime truth without taking over the main work surface
- Preview Deck links parallel outputs into the same project narrative
- AI Console always references the currently focused artifact and flow

## Domain Adaptation
### App or Site Project
- default mode: Build
- preview type: Web Preview
- connected flows commonly: Marketing Site, Asset Library, Research Board

### Game Project
- default mode: Build or Preview depending on last playtest
- preview type: 3D Viewport or Runtime Preview
- connected flows commonly: Trailer, Asset Library, Audio Pack

### Film Project
- default mode: Canvas or Preview
- preview type: Media Preview
- connected flows commonly: Storyboard, Asset Library, Launch Site

### Research Project
- default mode: Preview or Canvas
- preview type: Research Preview
- connected flows commonly: Asset Exploration, Landing Concepts, Shot References

## Microinteractions
- changing active mode keeps project, selection and AI context loaded
- switching preview cards updates the main preview without losing chat state
- hover on connected flow chips reveals whether selecting them changes scope or just focuses output
- AI run cards animate only on state transition, not constantly
- opening advanced runtime drawer never obscures the preview entirely on desktop
- file tree selection and rail icon selection must have unmistakable active states
- command palette must open over the shell without shifting layout
- bottom dock resizing must feel direct and reversible

## Button Inventory
### Global
- `Command Palette`
- `Open Preview`
- `Open AI Console`
- `Share`
- `Deploy`

### Build Mode
- `Run`
- `Ask AI`
- `Apply Fix`
- `Open Larger Preview`

### Preview Mode
- `Refresh`
- `Restart Runtime`
- `Open in Tab`
- `Compare Flow`
- `Approve Change`

### Canvas Mode
- `Select`
- `Insert`
- `Transform`
- `Generate Variant`
- `Apply to Code`

### Review Mode
- `Approve`
- `Reject`
- `Request Revision`
- `Rollback`

### Assets Mode
- `Insert into Current Flow`
- `Generate Variation`
- `Attach to Project`
- `Replace Usage`
- `Export`

## Missing IDE-Grade Components That Must Exist
If these components do not become real and cohesive, the product will continue to feel below the benchmark level we want.

### Core shell components
- resize handles on all structural seams
- explicit rail collapse affordances
- tab overflow and pinning controls
- breadcrumbs row with clickable ancestry
- command palette with recent commands and recent files
- status bar slots with stable ordering
- panel snap states and remembered layout ratios
- active group focus ring or header emphasis
- draggable split headers and reset affordances

### Editor workflow components
- split editor manager
- outline/symbols view
- find/replace panel
- search results tree with grouped matches
- diff viewer
- sticky inline approval bar
- inline diagnostics with quick-fix actions
- dirty-state tab markers
- peek overlay for definition, reference or diff snippet
- minimap or structural scroll aid when density requires it

### Preview workflow components
- Preview Deck with real state and compare behavior
- preview compare mode
- surface-specific preview headers
- stale/outdated propagation indicators
- recovery cards at failure points
- preview header intent groups for Navigation, Runtime, View and Diagnostics
- device or camera selector group with persistent last choice
- compare slider or side-by-side variant for validation work

### AI workflow components
- visible plan checklist
- run cards
- approval cards
- memory/context scope controls
- agent cards
- cost/confidence capsules
- rollback action surface
- blocked-state escalation surface
- pinned context strip above the composer

### Dock/runtime workflow components
- Problems tab
- Output tab
- Logs tab
- Ports tab
- Runtime tab
- terminal session tabs
- runtime target/environment indicator
- branch/environment status slot
- long-running task progress row
- restart and recovery controls near failing runtime states

Rule:
This list is not feature creep.
It is the minimum anatomy required for Workbench to feel like a real professional IDE-grade production shell.

## States
### Empty
- focused starter flow dominates

### Healthy
- shell, current file or scene, current preview, AI state all visible

### Degraded
- compact blocker bar near the top or runtime drawer badge

### Blocked
- show one explicit blocker card and offer fallback or recovery path

### Recovery
- if a run failed, show resume, duplicate, rollback or inspect actions

## Accessibility Rules
- keyboard-first shell
- visible focus states
- command access without mouse
- rail and dock navigation accessible from keyboard
- live regions only where meaningful

## What To Avoid
- dashboard-style card overload inside Workbench
- chat that ignores the current artifact
- runtime internals exposed in the main preview by default
- separate products for preview, assets, canvas or live voice


## Detailed Component Specs
### Top Bar: exact slot order
Left to right:
1. WorkspaceSwitcher
2. ProjectIdentity
3. ModeBadge
4. ConnectedFlowChipRow
5. Breadcrumbs
6. Command access or search trigger
7. Share and Deploy actions
8. compact runtime and AI state pills

Rule:
- ProjectIdentity and ModeBadge must always stay visible
- ConnectedFlow chips may collapse to overflow after four visible chips
- state pills should never grow enough to push breadcrumbs away

### WorkspaceSwitcher
Contains:
- current workspace name
- avatar or icon
- dropdown affordance

Behavior:
- switching workspace preserves product shell but changes project scope
- recent workspaces appear in the menu

### ProjectIdentity
Contains:
- current project name
- optional domain badge
- optional environment label

Behavior:
- clicking opens project switcher or project summary drawer

### ModeBadge
Contains current mode only.
Allowed values:
- Build
- Preview
- Canvas
- Review
- Assets
- Live

Behavior:
- clicking opens mode switcher, never a full navigation menu

### ConnectedFlowChipRow
Each chip contains:
- flow title
- type or domain indicator
- active state if focused

Behavior:
- single click focuses flow in current mode if possible
- modified click may open flow in split or compare mode
- hover indicates whether it changes scope or only focus

### Left Activity Rail: exact behavior
Each icon item contains:
- icon
- tooltip label
- active indicator
- optional activity badge

Behavior:
- one selected item only
- clicking active item collapses the sidebar
- keyboard focus ring is explicit
- active indicator is not only color; use shape or background change too

### Left Sidebar by tool family
#### Explorer
- file tree
- folder collapse state
- git state badges
- create file/folder actions
- contextual menu on row

#### Search
- search field
- replace toggle
- result grouping
- file path context

#### Source Control
- changed files list
- staged/unstaged grouping if supported
- commit or apply actions

#### AI
- sessions list
- runs list
- pinned prompts or tasks

#### Assets
- collections
- tags
- asset type filters
- recent insertions

#### Timeline
- sequence list
- shots or clips list
- markers

### Editor Group System
The editor area must support:
- one to three visible groups max in standard layout
- tabs with close, pin and dirty state
- breadcrumbs directly under top editor chrome
- inline diagnostics and quick fix anchors

Rule:
- editor remains visually dominant in Build Mode
- tab height and breadcrumb spacing must stay compact and professional

### Right Rail Zones
The right rail has fixed vertical zones in order:
1. current artifact summary
2. AI Console primary section
3. contextual subpanel (memory, properties, approvals or linked assets)

Rule:
- do not stack too many equally weighted cards
- one zone should visually dominate based on current task

### AI Console: section-level behavior
#### Conversation
- newest messages at bottom
- composer fixed to bottom
- current artifact chips above composer
- inline quick actions near relevant AI outputs

#### Plan
- collapsible but open by default when a run is active
- current step highlighted
- completed steps compressed visually

#### Runs
- run cards sorted by recency or current relevance
- active run pinned to top
- each run card includes run title, status, agent summary, cost, duration, open action

#### Approvals
- hidden when empty
- promoted to top of the rail when approval is required

#### Memory/Context
- hidden behind tabs or accordions when not relevant
- always shows current scope when AI is active

### ApprovalCard: exact anatomy
- requested action title
- impacted area summary
- risk badge
- expected result
- affected flow/project
- visible output or artifact reference
- rollback condition
- primary decision buttons
- optional diff preview teaser
- inspect deeper action
- evidence/log lineage link when available

Rule:
- this card must feel serious and high-trust
- destructive actions are visually isolated from neutral actions
- if the approval changes something the user can see, the card should make that surface obvious

### Preview Header: exact grouped control system
#### Group 1: Navigation
- route selector or scene selector
- back/forward if meaningful

#### Group 2: Runtime
- refresh
- restart runtime
- open in tab

#### Group 3: View
- device selector
- viewport type selector
- overlays toggle
- compare toggle

#### Group 4: Diagnostics
- issue count
- logs shortcut
- performance shortcut

Rule:
- never mix runtime and view controls randomly in one row
- controls stay grouped by intent so the toolbar feels teachable

### Preview Deck: exact card anatomy
Each card contains:
- thumbnail or live miniature
- flow title
- flow type
- freshness timestamp
- health state dot or badge
- owner label if AI or user-updated matters
- quick actions in hover or selected state

Quick actions:
- focus
- pin
- compare
- duplicate

Rule:
- cards stay small enough for scanning, large enough to identify visually
- deck should support horizontal scroll or compact wrap depending on mode

### Bottom Dock: exact tab behavior
Canonical tabs:
- Terminal
- Problems
- Output
- Logs
- Ports
- Runtime
- Timeline mini

Behavior:
- remembers last active tab per project
- opening a tab does not reset scroll/content of other tabs
- dragging resize handle is immediate, no eased animation
- compact unread/activity badges allowed on tabs

### Terminal Decision
The product needs one integrated bottom-dock terminal experience.
Do not expose multiple terminal products in the information architecture.

### Status Bar: exact slot system
Left to right:
- source control state
- current branch or workspace state
- errors/warnings count
- active environment
- preview or runtime badge
- AI state badge
- selection metadata

Rule:
- status bar text must be short and stable
- anything verbose belongs in a dock tab or rail panel, not here

## Mode-to-Mode Transition Rules
### Build -> Preview
- preserve file and selection
- focus latest relevant preview flow
- keep AI console state

### Preview -> Review
- preserve currently focused flow
- promote approval card in right rail
- open relevant diff in center

### Build -> Canvas
- preserve artifact context
- if a file maps to a visual component, open that target directly

### Any Mode -> Live
- keep current artifact visible
- expand AI Console rather than replacing workspace entirely

## Cross-Component Rules
- selecting a file can change editor content, preview context and AI scope simultaneously when relevant
- selecting a preview deck card changes the focused flow across preview header, AI context and breadcrumbs
- approving a run can update preview, status bar and recent run state without a full page reload
- connected flows chips affect AI scope and preview focus but should not silently replace the main project

## Domain-Specific Panel Swaps
### App or Site
- left sidebar favors files, pages, components
- preview header favors route and device controls
- right rail favors AI + layout/component context

### Game
- left sidebar favors files, scenes, assets
- preview favors 3D/runtime controls
- right rail favors AI + scene/object context

### Film
- left sidebar favors shots, sequences, assets
- preview favors media transport controls
- bottom dock favors timeline mini and output

### Research
- left sidebar favors sources, boards, references
- preview favors compare and source view
- right rail favors AI + extracted context


## Panel Geometry
### Desktop default shell
- Top Bar: 56 px high
- Left Activity Rail: 56 px wide
- Left Sidebar: 300 px default, min 260 px, max 360 px
- Right Rail: 380 px default, min 340 px, max 440 px
- Bottom Dock tab strip: 36 px high collapsed
- Bottom Dock content: 260 px default open height, resizable to 360 px
- Status Bar: 30 px high

### Desktop wide shell
- allow editor or preview center to expand, not the rails first
- center workspace should hold the extra width

### Tablet fallback
- left sidebar collapses more aggressively
- right rail becomes drawer or narrower rail depending on mode
- preview deck may shift from horizontal strip to side column or drawer

### Mobile degradation
Workbench is not fully mobile-first.
On small screens:
- one main surface at a time
- AI Console becomes drawer or full-screen sheet
- bottom dock becomes segmented overlay
- editing and preview cannot try to coexist side by side

## Visual Priority By Mode
### Build Mode priority order
1. editor group
2. preview secondary pane
3. AI Console primary section
4. left sidebar
5. bottom dock
6. right-rail secondary details

### Preview Mode priority order
1. main preview surface
2. preview header controls
3. preview deck
4. AI Console review section
5. bottom dock diagnostics
6. left sidebar support navigation

### Canvas Mode priority order
1. canvas surface
2. properties panel
3. structure tree
4. AI contextual assistance
5. filmstrip or variants strip

### Review Mode priority order
1. diff/compare surface
2. approval card
3. impact summary
4. logs/evidence dock

### Assets Mode priority order
1. asset grid/list
2. filter and collections
3. metadata/use map
4. transform/insert actions

## Wireflow: Build Mode
### Center workspace exact order
- top: tab row
- below tabs: breadcrumbs row
- below breadcrumbs: editor surface
- inline inside editor: diagnostics, selection actions, inline AI affordances

### Secondary preview pane exact order
- mini preview header
- preview state row
- main preview body
- footer actions: open bigger, compare, pin

### Right rail exact order
- current artifact summary
- AI Console conversation + plan
- memory/context or linked assets

### Bottom dock priority tabs
- Terminal
- Problems
- Runtime
- Logs

Critical behavior:
- opening the AI Console cannot shrink the editor below usability
- preview secondary pane can be hidden, but the restore affordance must stay obvious

## Wireflow: Preview Mode
### Center workspace exact order
- preview header with grouped controls
- main preview body
- preview deck below

### Right rail exact order
- focused flow summary
- AI review/plan section
- approvals if any
- linked artifacts or context

### Bottom dock priority tabs
- Runtime
- Logs
- Problems
- Output
- Timeline mini when media-related

Critical behavior:
- switching preview deck card updates the main preview and AI context together
- advanced runtime controls stay in a drawer and never replace the main preview body

## Wireflow: Canvas Mode
### Center workspace exact order
- top contextual toolbar
- compact tool palette near canvas edge
- canvas body
- lower filmstrip or variant strip

### Left sidebar exact order
- pages/scenes/layers tree
- search/filter row if needed

### Right rail exact order
- selected object summary
- property groups
- contextual AI
- linked code or asset references

Critical behavior:
- selecting an element updates properties, AI context, and linked artifact references together
- apply-to-code must clearly show what will change before it happens
- selection state must be obvious before transform or generation actions are offered
- the compact tool palette must stay secondary to the stage, never hovering like a second main panel

## Wireflow: Review Mode
### Center workspace exact order
- compare header
- before/after or diff view
- impact summary section

### Right rail exact order
- approval card
- risk and rollback block
- comments/revision request block

Critical behavior:
- review mode must feel deliberate and slower than build mode
- approval is never presented as a casual inline action inside a noisy panel

## Wireflow: Assets Mode
### Center workspace exact order
- search and sort row
- grid/list body
- optional variant compare row

### Left sidebar exact order
- asset types
- collections
- tags
- favorites/recent

### Right rail exact order
- asset preview
- metadata
- usage map
- transformations
- insert/export actions

Critical behavior:
- inserting an asset should let the user target current flow, connected flow, or shared library placement
- replace usage must show scope before applying

## AI Console: Detailed Behavior
### Header block
Contains:
- current task title
- scope chips
- current run status
- optional live status

### Conversation section
Rules:
- newest messages at bottom
- composer remains pinned
- artifact chips are visible above composer
- long tool outputs collapse automatically

### Plan section
Rules:
- hidden only if no active plan exists
- current step uses strongest emphasis
- done steps compress to lighter rows

### Runs section
Rules:
- one active run card pinned first
- finished runs collapse to history list
- each card shows role chips if multi-agent is active

### Approvals section
Rules:
- rises above memory/context when an approval is pending
- should never be buried below long conversation history

### Memory/Context section
Rules:
- shows what context is active, not every possible context
- includes project, connected flows, active rules, and linked artifacts

## AI Console <-> Preview Unification Contract
The AI Console and the active preview/viewport must behave like one working pair, not two adjacent products.

### Core coupling rules
- changing the active preview target updates the AI artifact chips immediately
- changing the selected flow updates both preview scope and AI scope
- selecting an object, shot, route or source should enrich AI context without resetting the conversation
- the AI Console must always know whether the user is looking at:
  - active output
  - reference/source
  - compare state
  - approval state

### Conversation-to-preview rules
- a prompt that targets the active surface should produce a visible scope chip before execution
- if the prompt affects a visible output, the resulting change should be inspectable in the current preview without navigation to another product
- if the prompt affects a non-visible connected flow, the Preview Deck should surface that change immediately
- long chat history must never push preview-critical actions out of reach

### Preview-to-conversation rules
- clicking a route, shot, object or source may update scope chips and suggested actions, but should not clear draft input
- clicking `Compare`, `Inspect`, `Attach to Flow` or `Open Source` should preserve the current AI run context
- preview failure should open local recovery inside the current AI/preview pair, not a detached troubleshooting area
- if AI research or browser-operator work is running, the user should be able to inspect that work inside the same preview context without leaving the active project
- returning from reference/research layers to the active output should feel like navigation inside one workspace, not a route change between products

### Approval-to-preview rules
- approvals that affect a visible preview must keep that preview reachable beside or behind the approval state
- semantic summary and expected result should reference the affected surface explicitly
- rollback should restore the previous visible output when lineage exists

## Surface-Aware AI Behavior
The AI Console must adapt its interaction grammar by active surface type.

### Web Preview + AI
- prompts often target route, component, layout region or responsive state
- scope chips should include route and device when relevant
- AI suggestions should prefer visible UI changes, issue fixes and approval-ready deltas

### 3D Viewport + AI
- prompts often target scene object, camera, transform, lighting or gameplay/runtime state
- scope chips should include scene/object/camera when relevant
- AI should preserve scene focus and avoid ambiguous object references when a selection exists

### Media Preview + AI
- prompts often target shot, sequence, timing beat, audio cue or export variant
- scope chips should include shot/sequence/time context when relevant
- AI suggestions should respect the current frame/segment context and support compare-friendly outcomes

### Research Preview + AI
- prompts often target source sets, extracted findings, comparison hypotheses or artifact generation
- scope chips should include source set and compare context when relevant
- AI should surface provenance-aware outputs and structured extractions instead of freeform prose by default

### Surface-aware quick actions
The console should expose different high-value actions depending on the active surface:
- Web Preview: `Fix visible issue`, `Adjust layout`, `Compare breakpoint`, `Open changed component`
- 3D Viewport: `Focus selected`, `Adjust camera`, `Change lighting`, `Apply transform suggestion`
- Media Preview: `Revise shot`, `Trim beat`, `Adjust pacing`, `Compare take`
- Research Preview: `Extract findings`, `Compare sources`, `Create brief`, `Attach to flow`

Rule:
These actions should feel like accelerators for the current surface, not like a second toolbar fighting the preview header.

### Surface-aware approval language
Approval copy should adapt to the active surface:
- Web Preview: emphasize route, component, responsive state and visible issue outcome
- 3D Viewport: emphasize object, camera, scene, lighting or runtime behavior
- Media Preview: emphasize shot, timing, pacing, audio or export effect
- Research Preview: emphasize source set, extraction quality, evidence coverage or downstream artifact impact

## Preview Header: Surface-specific Variants
### Web Preview variant
Controls:
- route selector
- device selector
- responsive width presets
- refresh
- open in tab
- issue count

### 3D Viewport variant
Controls:
- camera selector
- transform mode
- shading/view mode
- overlays/gizmos
- play/game view toggle
- frame selected or focus action

Priority order:
1. camera selector
2. play/game view
3. transform mode
4. shading/view mode
5. overlays/gizmos
6. focus selected

### Media Preview variant
Controls:
- play/pause
- scrubber
- frame/time readout
- zoom
- mute/levels
- export state

Priority order:
1. play/pause
2. scrubber
3. frame/time readout
4. compare/source toggle when present
5. zoom/fit
6. mute/levels
7. export state

### Research Preview variant
Controls:
- source selector
- compare toggle
- notes/extract action
- attach to flow action

Priority order:
1. source selector
2. compare toggle
3. provenance visibility
4. notes/extract action
5. attach to flow
6. create artifact

Required anatomy:
- source rail or source switcher with visible provenance
- main reference/board/output surface
- extract queue or notes tray
- compare lane for two or more references when active
- direct `Attach to Flow` and `Create Artifact` actions

Research UX rules:
- source provenance must remain visible without opening a separate citations page
- extracts should be collectible into structured insight groups, not only freeform notes
- compare mode should privilege difference and relevance, not only side-by-side screenshots
- a research session should feel capable of feeding the rest of the Workbench, not like a dead-end reading pane

Research run UX rules:
- research runs should expose subtask progress, source collection status and evidence readiness
- citations/provenance should remain reachable from the run and from the preview
- a completed research run should end in one or more usable outputs: extract set, brief, board, flow attachment or generated artifact

## Preview Deck: State Variants
Each card needs variants for:
- idle
- selected
- updating
- degraded
- blocked
- compared
- pinned

## File Tree and Rail States
### File tree row
States:
- default
- hover
- selected
- dirty
- error
- git-modified
- expanded parent

### Activity rail item
States:
- default
- hover
- focused
- selected
- has-notification

## Command Palette
The command palette is mandatory and global inside Workbench.
It must support:
- command mode
- file quick open mode
- recent commands
- recent files
- grouped command categories

Behavior:
- opens centered over the shell
- preserves background context visually
- does not navigate away to a search page

## Figma Frame Requirements For Workbench
Design at minimum these frames:
- Build mode desktop default
- Build mode with AI expanded
- Preview mode with preview deck active
- Preview mode with runtime drawer open
- Canvas mode with selected element
- Review mode with approval card active
- Assets mode with metadata rail open
- Workbench tablet fallback
- Workbench blocked state
- Workbench first-open empty state


## Subcomponent-Level Specs
### File Tree Row
Contains:
- file or folder icon
- title
- dirty indicator
- git state indicator
- optional chevron for folders
- hover actions only if truly necessary

Opinion:
File rows should feel sober and precise.
Do not turn them into action-heavy mini cards.

### Run Card
Contains:
- run title
- status badge
- agent role chips
- cost estimate
- elapsed time
- open details action

Opinion:
Run cards must balance visibility and density.
They should feel operational, not like chat bubbles.

### Flow Chip
Contains:
- flow label
- optional type marker
- active state

Opinion:
Flow chips are navigational scope controls.
They must feel more meaningful than decorative tags.

### Preview Deck Card
Contains:
- thumbnail
- flow title
- update time
- health indicator
- compare/pin/focus actions

Opinion:
This card is the product proof of parallel work.
If it looks like a generic gallery tile, the concept is lost.

### Property Group Panel
Contains:
- group title
- collapsible section
- dense field rows
- apply/reset affordances where needed

Opinion:
Property groups should feel like a disciplined inspector, not like a settings page dropped into the workbench.

### Dock Tab
Contains:
- tab label
- optional unread/activity badge
- selected state

Opinion:
Dock tabs should be extremely legible. Avoid tiny low-contrast labels or decorative icon overload.

## Canonical Shell Contract
The canonical Workbench shell is:
- `FullscreenIDE.tsx` as the route-level container and state owner
- `ModernIDEShell.tsx` as the visual shell contract

Anything else is either:
- a legacy shell
- a mode-specific surface
- a specialized wrapper

This matters because the product cannot tolerate multiple competing shell definitions.
If an implementation detail lives outside this contract, it must plug into the shell, not redefine it.

## Canonical Route Contract
### Primary production route
- `/ide` is the canonical production route

### Allowed route behavior
- `/workbench` may exist only as a future alias to `/ide`
- `/preview`, `/live-preview`, `/vr-preview`, `/editor-hub`, `/blueprint-editor`, `/terminal` are not product centers
- those routes may remain only as:
  - redirecting legacy URLs
  - deep links that open `/ide` in a specific mode
  - internal specialized utilities

### Deep-link contract examples
- preview deep link -> `/ide?mode=preview&flow=landing-hero`
- AI approval deep link -> `/ide?mode=review&run=abc123`
- asset deep link -> `/ide?mode=assets&asset=texture-01`

Opinion:
If preview or live keep their own full route identity in product messaging, fragmentation returns immediately.

## Canonical Terminal Decision
The integrated bottom-dock terminal family should inherit its behavior from the strongest PTY-capable implementation.
Canonical direction:
- merge the strongest PTY runtime spine with the strongest dock chrome and session UX
- integrated into one bottom-dock shell pattern, not exposed as a free-floating standalone product

Reference-only patterns:
- `TerminalWidget.tsx` and `useTerminal.ts` for PTY/runtime behavior
- `XTerminal.tsx` for shell ambition, presentation depth and session UX ideas
- `IntegratedTerminal.tsx` for smaller toolbar ideas
- any standalone terminal page as legacy or utility only

## Top Bar Ordering Contract
Exact order from left to right:
1. workspace switcher
2. project identity
3. mode badge
4. connected flow chips
5. breadcrumbs
6. command/search entry
7. share/deploy group
8. runtime pill
9. AI pill
10. user or overflow controls if present

Overflow rules:
- connected flow chips collapse to `+N` after three visible chips
- breadcrumbs collapse from the left first, keeping the leaf item visible
- share/deploy group collapses before runtime or AI state pills disappear

## Status Bar Ordering Contract
Exact order from left to right:
1. branch or source control state
2. environment/runtime target
3. diagnostics count
4. current selection metadata
5. preview health
6. AI state
7. quota or plan warning only if relevant

Rules:
- diagnostics must remain visible before quota warnings
- transient notifications do not belong in the status bar
- the right side should never exceed two low-priority pills at once

## Mode Persistence Guarantees
Switching modes must preserve all of the following unless the user intentionally resets scope:
- current project
- selected connected flow
- selected file, scene, page, or asset
- current preview target
- current AI run context
- current right rail tab or expanded section
- last active bottom dock tab
- scroll position inside the center workspace where meaningful

### Example
If the user switches from Build to Preview while editing `hero.tsx` inside the `Launch Site` flow:
- the selected `Launch Site` flow chip stays active
- the preview opens the site surface tied to that flow
- the AI Console keeps the same run scope
- returning to Build restores the same file tab and editor position

## AI Console Wiring Contract
### Plan -> Runs
Clicking a plan step can:
- focus the related run card
- filter the conversation to that step context
- highlight the affected artifact in preview or explorer when possible

### Runs -> Preview or Build
Clicking a run card can:
- open its affected flow in preview
- reveal changed files in build mode
- open approval state if the run is waiting on decision

### Approvals -> Diff Viewer
Pending approval always opens:
- diff summary first
- impact summary second
- file or artifact detail third
The user should never have to hunt through conversation history to find what is being approved.

### Approvals -> Visible Output
If an approval affects a visible preview or viewport:
- the affected output remains reachable in the same mode
- before/after or compare state should open without losing the approval card
- the expected result should name the visible surface explicitly

### Memory -> Scope Control
Memory/context items are not passive notes.
They must support:
- include in scope
- exclude from scope
- pin for current run
- inspect source artifact

Opinion:
Without these action paths, the AI Console becomes a beautiful but weak stack of panels.

## Preview Deck Operational Rules
### Refresh behavior
- cards auto-refresh when their owning flow receives a new successful output
- if a flow is currently updating, card state changes to `updating` without replacing the previous thumbnail until the new output is ready
- cards must display freshness based on last successful output time, not only run start time

### Run ownership display
Every card shows:
- flow title
- flow type
- last successful update
- current health
- active run owner when one exists

### Conflict behavior
If two runs target the same flow:
- card shows a compact conflict badge
- clicking the card opens compare or run arbitration details
- the deck never silently replaces one run's output with another without a visible state change

### Card lifecycle
- idle
- updating
- freshly updated
- degraded
- blocked
- compare mode
- pinned

Preview deck UX rules:
- the deck should feel closer to a serious filmstrip/reference strip than to a gallery carousel
- selected state must be unmistakable even at peripheral vision
- the deck must support fast lateral scanning without aggressive hover dependence
- compare entry should be explicit and reversible
- pinned cards should stay physically stable to preserve spatial memory

## AI Console Section Priority Rules
- conversation is default visible but not allowed to bury approvals
- approvals rise to the top whenever a user decision is blocking progress
- runs stay above memory when there is active execution
- memory/context can collapse to a summary when space is constrained
- live controls appear only when live is explicitly enabled

## AI Console By Mode
The AI Console is one family, but its dominant section changes by mode.

### Build Mode AI behavior
- default visible sections: Conversation + Plan + compact Runs
- approval state may interrupt only when directly blocking the current artifact
- quick actions should emphasize fix/apply/open-changed-file flows

### Preview Mode AI behavior
- default visible sections: surface-aware Conversation + compact Approvals + compact Runs
- AI should stay tightly coupled to the current preview target
- quick actions should emphasize compare, inspect, revise and refresh-related actions

### Canvas Mode AI behavior
- default visible sections: compact Conversation + Properties-adjacent suggestions + Plan when generating
- AI should respect the selected object/layer/scene and avoid broad ambiguous instructions when selection exists
- quick actions should emphasize variation, transform, apply-to-code and reuse

### Review Mode AI behavior
- default visible sections: Approvals first, then semantic summary, then Runs/Memory
- conversation becomes secondary support, not the lead
- quick actions should emphasize approve, revise, reject, rollback and inspect evidence

### Assets Mode AI behavior
- default visible sections: compact Conversation + linked usage/context + generation/transform actions
- AI should emphasize insertion scope, replace-usage scope and downstream flow impact
- quick actions should emphasize attach, generate variation, replace usage and inspect dependencies

## Right Rail Tab Contract
Recommended tab order:
1. AI Console
2. Properties
3. Memory
4. Linked Assets
5. Approval Details

Rules:
- AI Console is default when the user enters from an AI action
- Properties is default when the user is working in Canvas or selecting an object-heavy surface
- Approval Details can temporarily take focus if a blocking approval appears

## Mode-by-Mode Default Layout Ratios
### Build Mode
- left sidebar: `300 px`
- center editor: flexible primary area, target `58-68%`
- preview column: target `22-28%`
- right rail: `360-420 px` when expanded
- bottom dock collapsed by default unless terminal/problem state was last active

### Preview Mode
- left sidebar: optional compact navigation `240-280 px`
- center preview: target `68-78%`
- right rail: `360-420 px`
- preview deck: `148-180 px` card lane below or beside preview depending on viewport

### Canvas Mode
- left sidebar: `280-320 px`
- center canvas: target `60-70%`
- right rail: `320-380 px`
- filmstrip/variants strip: `112-140 px` tall below canvas when active

### Review Mode
- left sidebar optional and often collapsed
- center diff and compare area: target `62-72%`
- right rail approval context: `360-420 px`
- bottom dock visible when logs/evidence matter

### Assets Mode
- left sidebar: `280 px`
- center asset browser: target `60-70%`
- right rail metadata/usage: `340-400 px`

## Domain Variants
### App/Site variant
Center priority:
- editor
- web preview
- page/component tree
- deploy and route awareness

### Game variant
Center priority:
- editor
- 3D viewport
- scene tree
- runtime controls
- asset bindings

### Film variant
Center priority:
- canvas/storyboard
- media preview
- timeline
- shot/sequence management
- audio awareness

### Research variant
Center priority:
- source list
- comparison board
- extracted notes
- attach-to-flow actions
- preview of references

## Responsive Fallback Rules
### Tablet
- right rail collapses into tabbed drawer more aggressively
- preview deck may move under preview instead of beside it
- left sidebar can convert to overlay panel in Preview and Review modes

### Mobile
- Workbench is not full-feature parity
- allowed mobile surfaces:
  - AI Console lite
  - preview review
  - approvals
  - recent files or assets access
- full Build and Canvas editing degrade to read-mostly or limited operations unless a mobile-specific editing pattern is defined later

Opinion:
Pretending full IDE parity on mobile would degrade the entire product spec.
Mobile should focus on continuity, approvals, and lightweight inspection.

## Approval Flow Contract
The approval system is not a loose UI pattern. It is a mandatory execution gate whenever AI changes are material.

### Canonical approval flow
1. AI run produces a proposed change set
2. proposal appears in `Approvals`
3. user opens `Approval Details`
4. semantic diff summary is shown first
5. impacted files/artifacts are shown second
6. risk summary is shown third
7. user chooses `Approve`, `Reject`, or `Inspect deeper`
8. if approved, apply action runs and updates preview/build state
9. if rejected, the run is marked accordingly and recovery guidance remains visible
10. if applied change later needs reversal, `Rollback` must remain reachable from the same run lineage

### ApprovalCard detailed anatomy
Contains in exact order:
1. impact area title
2. affected flow/project line
3. risk badge
4. semantic summary
5. impacted files/artifacts summary
6. primary actions: `Approve`, `Reject`
7. secondary actions: `Inspect deeper`, `Rollback` when available

Rules:
- semantic diff leads, raw code does not
- risk badge cannot rely on color only
- rollback is not a hidden admin action; it belongs to the operational lifecycle
- a pending approval must be visible from both AI Console and Review Mode

## Bottom Dock Contract
### Canonical dock tabs
1. Terminal
2. Problems
3. Output
4. Logs
5. Ports
6. Runtime

### Dock persistence rules
- remember the last active tab per project
- remember dock height per project if user resized it
- do not auto-open the dock on every mode switch unless a blocking state requires it
- Preview and Review may temporarily expand the dock when logs or evidence become critical

### Terminal contract
The dock exposes one integrated terminal family only.
Terminal UI variations may exist internally, but product architecture must present one terminal identity, one tab concept, and one interaction model.

## Restore Behavior Contract
If recoverable state exists, Workbench must never open into a neutral empty shell.
It must restore, in order of priority:
1. project
2. selected connected flow
3. mode
4. primary artifact (file, page, scene, asset)
5. AI run context
6. right rail tab
7. bottom dock tab
8. scroll or viewport position when meaningful

If any of these cannot be restored, the shell should degrade gracefully and show the nearest useful fallback, not a blank reset state.

## Critical Drift Risks
- if Preview is allowed to masquerade as a separate product route, the Workbench architecture collapses
- if AI Console loses approval and rollback visibility, it regresses into a generic chat panel
- if the right rail defaults are inconsistent by mode, users lose the sense of a disciplined shell
- if dock/terminal identity splits again, execution surfaces will feel improvised rather than canonical

## AI Console Fixed Zone Contract
The AI Console must always preserve these five zones as product concepts, even if some are collapsed by state:
1. Conversation
2. Plan
3. Runs
4. Approvals
5. Memory / Context

### Zone priority rules
- if there is a blocking approval, `Approvals` outranks passive conversation history
- if there is active execution, `Runs` and `Plan` outrank memory detail
- `Conversation` remains the input surface but is not allowed to bury execution truth
- `Memory / Context` must show active scope, not every possible source

### Conversation contract
- text and optional voice entry
- artifact scope chips above composer
- long tool outputs collapse automatically
- conversation history is subordinate to operational state when execution is active

### Plan contract
- plan appears as a checklist, not paragraph prose
- current step uses strongest emphasis
- completed steps compress visually
- blocked steps must point to the relevant approval or dependency

### Runs contract
- active run card pinned first
- failed runs remain visible long enough to act on them
- each run card shows role, duration, cost, state, and next action

### Memory / Context contract
- show project scope
- show connected flows in scope
- show active rules/SOPs in scope
- show linked assets or artifacts in scope
- allow include/exclude/pin behavior where applicable

## Preview Toolbar Intent Groups
The preview toolbar must be grouped by user intent, not by implementation trivia.

### Group 1: Navigation
- route selector for web
- camera selector for 3D
- source selector for research
- sequence or shot selector for media

### Group 2: Runtime
- refresh
- restart
- runtime state
- performance or health indicator

### Group 3: View
- device selector
- responsive width presets
- shading or overlay modes
- compare toggle where relevant

### Group 4: Diagnostics
- issue count
- logs shortcut
- runtime drawer shortcut
- affected flow freshness state

Rule:
Toolbar group labels and spacing must stay consistent across web, 3D, media and research variants, even when the actual controls differ.

Preview toolbar UX rules:
- the toolbar should stay close enough to the surface to feel like viewport chrome, not global app chrome
- controls with high repetition value must be visible; low-frequency controls may move into overflow
- current mode, current source/camera/route and current health state must remain glanceable
- the user must never wonder whether they are editing the output, viewing a source, or reviewing a reference

## Connected Flow Update Contract
A flow is considered affected when a linked asset, rule, component, scene, sequence, or generated output changes in a way that impacts its visible result.

### Required behavior
- changed upstream asset or artifact marks downstream flows as `outdated` immediately
- Preview Deck must reflect outdated state without waiting for manual navigation
- outdated state must remain visible until the flow is successfully refreshed or regenerated
- if regeneration is in progress, state becomes `updating`
- if regeneration fails, state becomes `degraded` or `blocked` with reason

### Example
If a character model or audio asset changes in Canvas or Assets mode:
- the related game flow preview becomes `outdated`
- the related trailer/media flow preview becomes `outdated`
- the Preview Deck shows this state before the user opens those flows

## Recovery Card Contract
When a run or preview fails, the user must receive a local recovery surface instead of a vague error line.

### RecoveryCard anatomy
1. failure title
2. short factual reason
3. affected flow or artifact
4. primary recovery CTA: `Retry`
5. secondary recovery CTA: `Rollback` when lineage exists
6. inspect action: `Open logs` or `Inspect diff`

### RecoveryCard rules
- recovery must appear near the failed work context
- do not redirect the user to a detached troubleshooting page by default
- retry and rollback must be explicit actions, not hidden in overflow

## Status Truth Contract
The Workbench status bar is a factual surface, not decoration.
It must report low-noise truth about:
- active branch/source state
- preview health
- AI readiness or active run state
- diagnostics count
- current environment/runtime target

If any of these are degraded, the status bar may signal it compactly, but detailed recovery belongs in a local recovery card or relevant drawer.

## Mode Component Matrix
### Build Mode
Visible by default:
- Explorer sidebar
- editor workspace
- compact preview column
- AI Console right rail
- status bar
Optional/collapsed:
- bottom dock
- properties
- approval details

### Preview Mode
Visible by default:
- preview surface
- Preview Deck
- AI Console or approval-focused right rail
- status bar
Optional/collapsed:
- left sidebar
- bottom dock until diagnostics are needed

### Canvas Mode
Visible by default:
- structure/layers sidebar
- canvas surface
- properties right rail
- AI Console accessible by tab or rail
- status bar
Optional/collapsed:
- bottom dock

### Review Mode
Visible by default:
- diff/compare center
- approval details right rail
- status bar
Optional/collapsed:
- left sidebar
- bottom dock shown when evidence/logs matter

### Assets Mode
Visible by default:
- collections/types sidebar
- asset browser center
- metadata/usage right rail
- status bar
Optional/collapsed:
- bottom dock

## Command Palette Contract
The Command Palette is the nervous system of Workbench.
It must support:
- command execution
- quick file open
- quick flow switch
- mode switch
- recent commands
- recent files
- recent flows

High-frequency commands must include at minimum:
- switch to Build
- switch to Preview
- switch to Canvas
- switch to Review
- open AI Console
- focus Preview Deck
- open Terminal
- switch connected flow
- open active approval

## Health Matrix Contract
Workbench requires a compact factual health layer.

### HealthMatrix domains
- API
- AI
- Preview
- Deploy

### Allowed placements
- compact top-bar or mission-context health cluster
- right rail summary
- local recovery cards

### Not allowed
- giant dashboard widgets inside Workbench
- decorative health indicators with no action path

### Health states
- healthy
- degraded
- blocked

Rules:
- degraded means the workflow can continue with caution
- blocked means the primary action cannot continue without recovery
- every degraded or blocked state must expose one clear next step

## Artifact Invalidation Contract
Connected flows share a real project graph. Asset and artifact invalidation must be explicit.

### Invalidation triggers
A flow becomes invalidated when a linked asset or artifact changes materially, including:
- images
- audio
- video clips
- 3D models
- textures
- scene composition data
- generated outputs reused by other flows

### Required UI behavior
- affected flows switch to `outdated` immediately
- the Preview Deck reflects outdated state before navigation
- the currently open preview shows freshness state without pretending to be current
- refresh or regeneration transitions state to `updating`
- failed regeneration transitions state to `degraded` or `blocked`

### Example
If a shared character asset is changed in Canvas or Assets Mode:
- the game runtime preview becomes `outdated`
- the trailer/media preview becomes `outdated`
- any research or marketing flow using that asset should reflect freshness loss too

## ApprovalCard Extension
The ApprovalCard must also include:
- expected result
- rollback availability state

Exact order becomes:
1. action title
2. impact area
3. affected flow/project
4. risk badge
5. expected result
6. semantic summary
7. impacted files/artifacts
8. primary actions
9. secondary actions

## Mode Matrix Summary
### Build Mode defaults
- left: Explorer
- center: editor + compact preview
- right: AI Console
- dock: collapsed

### Preview Mode defaults
- left: route/page/scene navigator
- center: preview + Preview Deck
- right: AI Console or Approval Details
- dock: runtime/logs available

### Canvas Mode defaults
- left: structure/layers
- center: canvas
- right: Properties
- dock: collapsed

### Review Mode defaults
- left: optional/collapsed
- center: diff/compare
- right: Approval Details
- dock: evidence/logs when needed

### Assets Mode defaults
- left: collections/types/tags
- center: asset browser
- right: metadata/usage
- dock: collapsed

## Strict Shell Geometry Contract
The Workbench shell must preserve stable geometry so the interface never feels like it is reassembling itself between modes.

### Fixed shell zones
- Activity Rail: `56 px`
- Left Sidebar: `300 px` default, `260 px` minimum, `360 px` maximum
- Right Rail: `380 px` default operational width
- Bottom Dock: `260 px` default height
- Status Bar: `28 px`

Rules:
- shell chrome dimensions may resize only through explicit user action or responsive breakpoint logic
- mode changes must reconfigure the center workspace first, not destabilize shell chrome
- the Right Rail must remain wide enough to support real AI Console operation; it cannot collapse into a decorative sliver on desktop
- the Bottom Dock must remain the canonical execution/diagnostics basin, not a floating collection of unrelated panels

## Mode Sovereignty Rules
### Build
- editor is sovereign
- preview is secondary but visible
- AI Console is operationally present

### Preview
- preview is sovereign
- Preview Deck is attached to preview context
- runtime internals remain subordinate

### Canvas
- canvas is sovereign
- Properties outrank AI as default right-rail content
- AI remains one tab away, never lost

### Review
- approval and compare state are sovereign
- passive conversation history is subordinate

### Assets
- asset browser is sovereign
- metadata and usage are the default right-rail context

Rule:
A mode must have one obvious center of gravity. If two surfaces appear equally dominant, the mode contract has failed.
