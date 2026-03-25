# 06_STUDIO_HOME
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Studio

## Mission
Orient the user immediately and make the next action obvious.
Studio Home is not a reporting dashboard.
It is the continuity layer between the public product and the Workbench.

## Critical Opinion
### What this page should be
- a mission control page for the current workspace
- a fast resume surface
- a place to understand project focus, connected flows, and current next step

### What this page should not be
- a mini IDE
- a generic metrics dashboard
- a catch-all page for every feature the product has
- a full AI chat surface

### Current repo risk this blueprint must prevent
The current dashboard family has enough tabs and utilities to easily become a fragmented control center.
This blueprint forces the page back to its real role: orient, prioritize, and send the user into Workbench.

## Primary CTA
- `Continue Work`

## Secondary CTA
- `Open Workbench`
- `New Project`

## Questions This Page Must Answer
- What is my main project right now?
- What should I do next?
- What is already running?
- What related flows exist?
- Is anything blocked?

## Layout Grid
- max inner width: 1600 px
- stacked row model
- row spacing: 24 px
- main row cards use 24 px internal padding
- connected flow rail cards use 16 px internal padding

## Layout Anatomy
### Row 1: Global studio header
Contains:
- workspace switcher
- global search
- `New Project`
- `Open Workbench`
- compact status pills
- user/team menu

### Row 2: Mission header
This is the dominant card of the page.
Fields:
- project title
- primary domain badge
- current phase badge
- one sentence current objective
- one-line progress or blocker status
- primary CTA
- secondary CTA
- optional tertiary action: `Open Preview`

### Row 3: Connected flows rail
A horizontal rail of compact cards.
Each card shows:
- flow title
- flow type
- freshness or update time
- current state
- open action

Recommended connected flow types:
- Trailer
- Launch Site
- Asset Library
- Audio Pack
- Research Board

### Row 4: Live and AI strip
This is not a full chat.
It is an operational strip showing:
- runs active
- approvals pending
- agent count
- last output updated
- quick action: `Open AI Console`

### Row 5: Recent work and quick actions
Left side:
- recent files, scenes, pages, assets, or runs
Right side:
- recommended next actions as a compact stack

### Row 6: Runtime and health summary
Compact health matrix only.
Domains:
- Preview
- AI
- Billing
- Deploy
- Sync
This row can never outrank the mission header.

## Component Tree
### StudioTopBar
Subcomponents:
- WorkspaceSwitcher
- SearchField
- PrimaryActions
- UtilityPills
- UserMenu

Opinion:
This bar must feel lighter than Workbench chrome.
It should not look like an admin top bar.

### MissionHeaderCard
Subcomponents:
- ProjectIdentityBlock
- ProgressBlock
- CTACluster
- SupportingSignals

Opinion:
This is the emotional and operational center of the page.
If this card is weak, the page becomes a dashboard again.

### ConnectedFlowRail
Subcomponents:
- FlowCard
- rail scroll or arrow affordance if necessary
- `Open All in Workbench` secondary action optional

Opinion:
This rail is the key to avoiding product fragmentation.
It visually proves that site, trailer, assets, and research are connected production contexts, not separate products.

### FlowCard
Subcomponents:
- FlowIcon
- FlowTitle
- FlowTypeBadge
- UpdateTime
- StateBadge
- OpenButton

Opinion:
These cards should be compact and dense.
They should not look like marketing tiles or file cards.
They are operational units.

### LiveStrip
Subcomponents:
- ActiveRunsPill
- PendingApprovalsPill
- AgentCountPill
- LastUpdatedBadge
- OpenConsoleButton

Opinion:
This strip must stay shallow.
If it expands into a full conversation feed, Studio Home loses focus.

### RecentWorkList
Subcomponents:
- RecentItemRow
- ItemTypeIcon
- ItemTitle
- ItemContext
- ResumeAction

Opinion:
This list should feel like a resume queue, not a report.
It exists to get the user back into the flow quickly.

### QuickActionPanel
Actions may include:
- create page
- open preview
- generate asset
- review pending diff
- start trailer flow

Opinion:
Quick actions must be tightly curated.
If there are more than five visible at once, prioritization has failed.

### RuntimeSummaryMatrix
Subcomponents:
- compact health rows
- short state labels
- open detailed status action

Opinion:
Health belongs here only in compact form.
Anything larger becomes internal noise.

## Resume Logic
The primary CTA label changes by last useful state:
- `Continue in Build`
- `Continue in Preview`
- `Continue in Canvas`
- `Resume AI Run`

The destination is never a neutral shell.
It should restore:
- project
- mode
- current file or scene
- active preview focus
- current run if one exists

## Interactions Between Components
- clicking the MissionHeader primary CTA opens Workbench in the most useful resumed mode
- clicking a ConnectedFlowCard changes the next Workbench entry scope
- clicking a recent item can open directly into file, scene, run, or preview focus
- clicking `Open AI Console` should open Workbench with AI console expanded and the relevant run selected
- RuntimeSummaryMatrix rows should deep-link to Status or a Workbench drawer, not spawn detached pages

## Microinteractions
- connected flow cards reveal stronger open affordance on hover
- active run pills pulse subtly only when state changes, not continuously
- recent work rows allow single-click resume and hover preview detail
- status pills in the header should update quietly, without aggressive animation
- the MissionHeaderCard primary CTA must feel strongest visually at all times

## Button Inventory
- `Continue Work`
- `Open Workbench`
- `New Project`
- `Open AI Console`
- `Open Flow`
- `Open Preview`

## States
### Empty
- first project callout dominates the screen
- connected flows rail is replaced with starter templates

### Healthy
- current project and next action dominate

### Degraded
- one compact blocker card appears above runtime summary
- mission card still remains dominant

### No recent work
- quick-start cards replace recent work list

### Blocked
- a single blocker card explains the blocker and the best recovery action
- no cascade of warnings

## What To Avoid
- dashboard-as-reporting
- ten cards with equal prominence
- full AI chat embedded on this page
- health widgets larger than project context
- treating connected flows like separate products


## Detailed Component Specs
### StudioTopBar: exact slot order
Left to right:
1. WorkspaceSwitcher
2. SearchField
3. `New Project`
4. `Open Workbench`
5. utility pills
6. notifications or alerts if relevant
7. user menu

Rule:
- search stays central enough to feel global
- `Open Workbench` must stay visually stronger than utility pills
- utility health cannot crowd the right side with more than three visible pills

### MissionHeaderCard: exact structure
Left zone:
- project title
- project domain badge
- current phase badge
- one sentence current objective

Middle zone:
- one progress line or one blocker line
- optional tiny metrics row only if directly actionable

Right zone:
- primary CTA
- secondary CTA
- tertiary utility if needed

Rule:
- never place more than three visible actions in this card
- never stack two dense metadata rows under the title
- if there is a blocker, it replaces progress copy instead of being appended below it

### ConnectedFlowRail: exact card anatomy
Each FlowCard contains:
- leading icon or domain mark
- flow title
- small type label
- freshness timestamp
- one state badge
- one open action

Optional row below title:
- short objective or last update note, max one line

Rule:
- connected flows must fit in a horizontal scan without becoming mini dashboards
- if there are more than five, the rail scrolls or collapses into `More` without changing card anatomy

### LiveStrip: exact anatomy
Slots:
- active run count
- pending approval count
- active agent count
- last updated time
- primary action: `Open AI Console`

Rule:
- this strip is informational and navigational, not conversational
- no message feed, no long text, no large cards

### RecentWorkList: exact row anatomy
Each row includes:
- type icon
- item title
- parent context
- last touched timestamp
- single resume action

Optional secondary affordance:
- hover preview or quick context menu

Rule:
- rows must be denser than public cards but calmer than admin tables
- row click and resume action should not conflict

### QuickActionPanel: exact content rule
Only include actions that reduce time-to-next-step.
Preferred actions:
- `Open Preview`
- `Generate Asset`
- `Review Pending Diff`
- `Start Trailer Flow`
- `Create Page`

Rule:
- no more than five visible actions
- no settings, billing or governance actions here unless they unblock current work

### RuntimeSummaryMatrix: exact row anatomy
Each row includes:
- service label
- state icon
- short state text
- optional detail chevron

Rule:
- one row = one service
- no charts
- no duplicated status language already visible in the top bar

## Visual Priority Rules
1. MissionHeaderCard is always strongest
2. ConnectedFlowRail is second
3. RecentWork and QuickActions are third
4. RuntimeSummaryMatrix is fourth

If runtime or health visually overtakes project mission, the page is wrong.

## Entry Scenarios
### First-time user after onboarding
- MissionHeaderCard becomes a guided starter card
- ConnectedFlowRail becomes starter templates or suggested follow-up flows
- QuickActionPanel emphasizes `Create first output`

### Returning active user
- MissionHeaderCard shows exact project and phase
- RecentWork dominates utility area
- Continue CTA restores last useful mode

### User with blocked runtime or provider
- blocker appears inline inside MissionHeaderCard or as one compact blocker card below it
- RuntimeSummaryMatrix reflects the issue but does not become the page hero

## Exact Component Geometry
### StudioTopBar
- height: `64 px`
- left cluster order: workspace switcher -> search -> primary CTA cluster
- right cluster order: utility pills -> team/user menu
- search width target: `320 px` desktop, `240 px` tablet, full row on mobile

### MissionHeaderCard
- min height: `220 px`
- desktop structure: 8/4 split
- left block order: project identity -> objective -> progress/blocker -> connected summary
- right block order: primary CTA -> secondary CTA -> tertiary CTA -> signal stack
- internal padding: `28 px`

### ConnectedFlowRail
- card width: `240-280 px`
- card min height: `132 px`
- rail gap: `12 px`
- horizontal scroll allowed on smaller desktop and tablet; never shrink cards below readability

### LiveStrip
- height target: `56-64 px`
- pills must remain on one line on desktop
- on mobile the strip becomes a stacked compact card with two rows

### RecentWorkList
- row height: `56 px`
- max visible rows before scroll: `6`
- item icon column fixed width: `32 px`

## MissionHeaderCard Detailed Anatomy
### Left block exact order
1. project title
2. primary domain badge + phase badge row
3. single objective sentence
4. blocker or progress line
5. connected summary chips if useful

### Right block exact order
1. primary CTA
2. secondary CTA
3. optional tertiary CTA
4. compact signal stack

### Signal stack rows
- preview state
- AI run state
- latest update timestamp

Opinion:
The right block should feel like an action tower, not a metric panel.
Every line must justify why it deserves to sit next to the primary CTA.

## ConnectedFlowCard Detailed Anatomy
### Exact order
1. flow icon
2. flow title
3. flow type badge
4. last update line
5. current state line
6. open CTA or focus affordance

### Interaction rules
- whole card can be clickable only if it opens the same result as the CTA
- if a flow is updating, the state line changes but the card height cannot grow
- if blocked, the card shows a reason chip and routes to the correct recovery context

### State variants
- default
- active/recent
- updating
- blocked
- no recent output

## LiveStrip Detailed Anatomy
### Pill order
1. active runs
2. pending approvals
3. agent count
4. last output updated
5. open console action

### Behavior rules
- if there are no active runs, replace the runs pill with `No active runs`
- approvals pill outranks agent count when approvals are pending
- `Open AI Console` should carry the currently relevant run in its deep link

## Continue Work Contract
The `Continue Work` action must restore all of the following when available:
- workspace
- project
- selected connected flow if one was last active
- current workbench mode
- selected file, scene, page, or preview target
- expanded AI run if the user was in approval or execution flow
- last open bottom dock tab if relevant

If no recoverable state exists, the contract falls back to:
1. project primary domain default mode
2. most recent meaningful artifact
3. first-value onboarding prompt only if the project is effectively empty

## Desktop / Tablet / Mobile Behavior
### Desktop
- full row model visible
- mission header + connected flow rail above recent work
- live strip remains horizontal

### Tablet
- mission header remains dominant
- connected flow rail becomes horizontally scrollable
- runtime summary may move below recent work

### Mobile
- top bar compresses to workspace + actions row
- mission header becomes stacked single column
- connected flows become vertical list or snap rail
- recent work and quick actions become accordion sections
- runtime summary reduces to 3-4 key rows only

## Cross-Surface Handoff Rules
- `Continue Work` from Studio Home must land inside Workbench without a neutral loading shell when restore data exists
- `New Project` should route to the canonical onboarding/project-creation flow, not a legacy dashboard modal
- clicking a connected flow card from Studio Home must open Workbench with that flow chip selected in header and the most useful mode activated
- clicking a blocker card must open either Status, Settings, or the relevant Workbench recovery drawer; never a dead informational page

## Continue Work Contract
The `Continue Work` action is a restore contract, not a generic navigation CTA.

It must restore, when available:
1. workspace
2. project
3. selected connected flow
4. current Workbench mode
5. active file, page, scene or asset
6. current AI run or pending approval
7. preview target
8. viewport or scroll position where meaningful

Rules:
- if restore context exists, Studio Home must not send the user to a neutral shell
- if restore context is partial, open the nearest useful mode with visible continuity clues
- if no restore context exists, open the primary domain default mode for the active project

## Critical Area Critique
### Mission Header
If this card becomes too metric-heavy, Studio Home regresses into a dashboard.
It must stay action-led.

### Connected Flows Rail
If these cards look like decorative thumbnails, the user will not understand cross-domain continuity.
They must read as live operational contexts.

### Live Strip
If this strip turns into a chat summary, it dilutes the Workbench handoff.
It must remain execution-focused.

### Runtime Summary
If this area grows beyond compact health truth, internal readiness noise comes back into the surface.
It must stay scoped and quiet.
