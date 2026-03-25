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

Opinion:
This sidebar should never try to show two tool families at once.
Doing so would recreate the product fragmentation inside the shell.

### 4. Center Workspace
Purpose:
- the dominant production area
- the user...s main focus surface

This area changes by mode but keeps the same outer shell constraints.
It must always feel dominant over side chrome.

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

### 1. Web Preview
Required tools:
- route selector
- device selector
- refresh
- open in tab
- issue count
- runtime badge

### 2. 3D Viewport
Required tools:
- camera selector
- transform mode
- viewport mode
- lighting or exposure tools
- overlays or gizmo toggles
- play or game view toggle

### 3. Media Preview
Required tools:
- play or pause
- scrubber
- frame position
- zoom
- audio mute or levels
- export state

### 4. Research Preview
Required tools:
- compare references
- source list
- extract notes
- attach to current flow

Critical opinion:
This unified preview engine is what prevents Aethel from splitting into separate tools for app, game, film, and research.
The product must feel like one engine with domain-specific faces.

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
- rollback condition
- primary decision buttons
- optional diff preview teaser

Rule:
- this card must feel serious and high-trust
- destructive actions are visually isolated from neutral actions

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

### Media Preview variant
Controls:
- play/pause
- scrubber
- frame/time readout
- zoom
- mute/levels
- export state

### Research Preview variant
Controls:
- source selector
- compare toggle
- notes/extract action
- attach to flow action

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
- `components/terminal/XTerminal.tsx` for engine depth and session model
- integrated into one bottom-dock shell pattern, not exposed as a free-floating standalone product

Reference-only patterns:
- `IntegratedTerminal.tsx` for toolbar ideas
- `TerminalWidget.tsx` for session/theme ideas
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

## AI Console Section Priority Rules
- conversation is default visible but not allowed to bury approvals
- approvals rise to the top whenever a user decision is blocking progress
- runs stay above memory when there is active execution
- memory/context can collapse to a summary when space is constrained
- live controls appear only when live is explicitly enabled

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
