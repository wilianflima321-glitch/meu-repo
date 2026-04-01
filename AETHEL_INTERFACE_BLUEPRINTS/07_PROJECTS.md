# 07_PROJECTS
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Studio

## Mission
Help the user find, create, sort and resume projects without noise.

## Critical Opinion
### What this page should be
- a serious catalog of work units
- a fast entry point into Workbench
- a place to understand domain, phase, connected flows and state at a glance

### What this page should not be
- a gallery of decorative cards
- a reporting table first
- a dumping ground for templates and onboarding copy

## Implementation Reality Check (2026-03-25)
The repo has project-like views spread across dashboard, onboarding, and other studio surfaces, but this page is still not the uncontested canonical catalog of work.

### Current implementation reality
- project access is still partially distributed across dashboard-oriented surfaces
- the stronger restore and context behavior is defined in the blueprints more clearly than in the live project browsing experience
- project cards and project opening behavior still risk feeling like dashboard utilities rather than first-class work containers

### Critical limitation
Until Projects becomes the undisputed portfolio surface, users will continue to discover work through mixed dashboard and contextual routes, which weakens the product hierarchy.

### Non-negotiable page rule
Projects must remain:
- the clean portfolio catalog
- the fastest route to the right Workbench state
- the place where domain, phase, connected flows, preview state, and AI activity are legible at a glance

## Benchmark Alignment
### From VS Code
Absorb:
- "recent/open work" clarity
- quick return into the exact project context
- list-first scan efficiency when many work units exist

### From Replit
Absorb:
- project identity tied to real outputs and active execution
- easy movement from project browser into live build/preview context

### From Genspark
Absorb:
- confidence that one project can contain multiple output types
- stronger sense that docs, slides, apps and research-like artifacts can belong to one workspace

Reject:
- decorative project galleries without operational metadata
- generic AI-workspace cards that hide domain, state and connected flows
- forcing the user to discover projects through dashboard tabs instead of a clear catalog

## Primary CTA
- `New Project`

## Layout Anatomy
### Header
- page title
- search
- filter chips
- sort control
- primary CTA

### Main content
- grid or list toggle
- projects displayed as strong cards or rows
- each project includes:
  - title
  - primary domain
  - connected flows count
  - updated time
  - owner or team info
  - preview state
  - AI activity state
  - open workbench action

### Utility rail on desktop
Optional right rail with:
- pinned projects
- starter templates
- recent assets or flows

## Component Tree
### ProjectsHeader
Subcomponents:
- TitleBlock
- SearchField
- FilterChipRow
- SortMenu
- NewProjectButton

### ProjectCard
Subcomponents:
- ProjectIdentity
- PhaseBadge
- ObjectiveLine
- ContextMetaRow
- ConnectedFlowMiniRow
- QuickActions

### ConnectedFlowMiniRow
Shows small chips such as:
- Trailer
- Launch Site
- Asset Library
- Audio Pack

Opinion:
This row is mandatory whenever connected flows exist.
It is the only thing that visually proves the project is larger than a single output.

### QuickActions
Must support:
- `Open Workbench`
- `Open Preview`
- `Share`
- `Duplicate`
- overflow for archive/delete depending on policy

## Interactions Between Components
- opening a project should restore the best current work mode
- opening preview should preserve project context and choose the last useful preview surface
- filters must affect both grid and list view identically
- connected flow chips inside cards can focus a specific flow on Workbench open
- opening AI-oriented or review-oriented projects should preserve pending run/approval context rather than dropping the user into a neutral chat state

## Microinteractions
- card hover reveals stronger quick action affordance
- list/grid toggle preserves filters and sort state
- search is incremental and should not relayout violently
- connected flow chips open focused context when selected

## Button Inventory
- `New Project`
- `Open Workbench`
- `Open Preview`
- `Duplicate`
- `Archive`
- `Share`

## States
### Empty
- curated templates and create actions dominate

### Search no results
- retain search term and offer clear actions to relax filters or create new

### Archived view
- lower visual weight and remove primary CTAs inside cards

## What To Avoid
- too many micro metrics
- card interiors filled with admin data
- different card layouts per project type

## Layout Grid
- max width: `1440 px`
- header row uses 3 zones: title, filters/search, primary CTA cluster
- grid view uses 3 columns desktop, 2 columns tablet, 1 column mobile
- list view uses full-width rows with fixed action area on desktop

## Detailed Component Specs
### ProjectsHeader
Exact order:
1. title block
2. search field
3. filter chip row
4. sort control
5. view toggle
6. primary CTA

Rules:
- search and filters stay on the same band on desktop
- sort and view toggle must remain visually subordinate to the primary CTA
- filters should represent project-relevant dimensions only: domain, phase, team, status

### ProjectCard
Exact order:
1. title + domain badge
2. phase badge + updated time row
3. objective line
4. meta row with owner/team and preview or AI state
5. connected flow mini row
6. quick action footer

Geometry:
- min height: `260 px`
- internal padding: `22 px`
- footer actions pinned to the bottom edge on desktop

Opinion:
These cards must feel like live work containers, not gallery tiles.
The objective line is critical because it tells the user why the project still matters now.

Preview/research rules:
- preview state in the meta row should distinguish `healthy`, `outdated`, `updating`, `blocked`
- research-heavy projects should surface evidence-readiness or source-linked status rather than generic "AI active"
- if a project's most important output is media or viewport-based, the card should still remain structurally consistent with app/site projects
- the card should imply whether `Open Workbench` or `Open Preview` is the more likely next action

### ProjectListRow
Exact columns:
1. project identity
2. domain + phase
3. connected flows count or chips
4. last updated
5. preview/AI state
6. row actions

Rules:
- list view is for high-volume scanning
- chips must not explode the row height; use count + first key chip if needed
- row action area stays fixed-width so scanning remains stable

### ConnectedFlowMiniRow
Behavior:
- show up to three key chips plus overflow count
- clicking a chip opens Workbench with that flow preselected
- if a flow is blocked, chip includes a compact warning marker
- if a flow is outdated, chip includes a freshness warning marker
- research/reference flows should be labeled clearly enough that users understand they feed downstream production work

### QuickActions Footer
Desktop order:
- `Open Workbench`
- `Open Preview`
- `Share`
- overflow menu

Overflow actions:
- duplicate
- archive
- delete only if policy allows and only in overflow

## Search, Filter and Sort Behavior
- search must be incremental and preserve current filters
- filters affect both grid and list views identically
- sort options should remain short: recently updated, name, domain, phase
- clearing filters must be one obvious action, not five tiny chip removes only

## Responsive Rules
### Desktop
- default to grid when project count is moderate
- utility rail may appear only if it adds live value such as pinned projects

### Tablet
- prefer list view default if cards become too compressed
- filters may wrap to a second line but keep CTA visible

### Mobile
- default to list view
- filters become horizontal chip scroller or bottom sheet
- row actions collapse into one menu plus primary `Open` action

## Cross-Surface Handoff Rules
- `Open Workbench` restores the last useful mode for the selected project
- `Open Preview` restores the last useful preview surface and flow within that project
- if a project card is opened from a filtered context, returning from Workbench should preserve that filter state when possible
- starter templates in empty state should route into canonical onboarding, not legacy dashboard creation flows

## Utility Rail Contract
The optional utility rail is allowed only if it improves action quality.
It may include:
- pinned projects
- starter templates
- recent assets
- recent flows

It must not include:
- large analytics cards
- billing or admin data
- onboarding tours once the user has active projects

Opinion:
If the utility rail becomes visually heavier than the project catalog, the page loses its purpose.

## Empty State Contract
When there are no projects, the page must show:
1. one clear empty-state headline
2. one-line explanation
3. `New Project` CTA
4. 2-4 curated starter options only
5. optional import action

It must not show:
- a generic blank table
- a long onboarding lecture
- more than four starter options

## Exact State Variants
### ProjectCard states
- default
- hover
- selected/focused
- updating
- blocked
- archived

### ProjectListRow states
- default
- hover
- selected
- warning
- archived

### ConnectedFlowChip states
- default
- focused
- blocked
- updating
- overflow summary

## ProjectCard Detailed Microcomponents
### ProjectIdentity block
Contains:
- project title
- primary domain badge
- optional small team or owner marker

### PhaseAndTime row
Contains:
- current phase badge
- relative updated time
- exact timestamp on hover or detail affordance if implemented

### ObjectiveLine
Rules:
- single line preferred, two-line clamp maximum
- should describe the current mission, not the project description from day one

### ContextMetaRow
Contains up to three compact signals:
- preview health
- AI activity
- team or owner context

Rule:
- if more than three signals are needed, the page is overfitting metadata into the card

## ProjectListRow Detailed Behavior
- clicking the identity cell opens Workbench restore path
- clicking preview state can open preview-first restore path
- row action menu contains duplicate, archive, delete if allowed
- row selection, if supported later, must not break the primary open behavior

## View Toggle Contract
- grid view is default for low-to-medium project volume
- list view becomes default when scanability outweighs visual richness
- the product should remember the last chosen view per user/workspace if practical

## Search and Filter Priority
Filter order should be:
1. search text
2. domain
3. phase
4. status
5. team/owner

Clear-all behavior:
- one explicit `Clear filters` control
- visible only when filters are active

## Responsive Geometry
### Desktop grid cards
- 3 columns when card width remains above `320 px`
- drop to 2 columns before cards become cramped

### Tablet list rows
- row action area remains visible or turns into one primary action + overflow
- filter chips may wrap but search stays visible near top

### Mobile list rows
- identity and state stacked vertically
- primary action remains visible
- overflow actions move to bottom sheet or menu

## Figma Frame Additions
- Projects desktop grid default
- Projects desktop list view
- Projects empty state
- Projects blocked/update state
- Projects mobile list view
