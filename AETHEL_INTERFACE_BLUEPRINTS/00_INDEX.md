# AETHEL INTERFACE BLUEPRINTS
Date: 2026-03-25
Status: CANONICAL DESIGN BLUEPRINT SET
Owner: Product + UX + Frontend + AI

## Purpose
This folder is the canonical interface blueprint for Aethel.
It exists to stop interface drift, stop page fragmentation, and force one unified product language across marketing, studio, workbench, and governance.

## Core Product Thesis
Aethel is not:
- a dashboard with tools attached
- a chat product with panels around it
- a clone of VS Code with AI glued on
- a set of separate products for app, game, film, assets, and preview

Aethel is:
- one studio system
- one workbench shell
- one AI operational layer
- one preview engine that adapts by domain
- one connected project model with parallel flows

## Product Layers
1. Public layer
2. Entry layer
3. Studio layer
4. Workbench layer
5. Governance layer

## Canonical Surface Set
1. `01_HOME.md`
2. `02_PRICING.md`
3. `03_CONTACT_SALES.md`
4. `04_AUTH.md`
5. `05_ONBOARDING.md`
6. `06_STUDIO_HOME.md`
7. `07_PROJECTS.md`
8. `08_WORKBENCH.md`
9. `09_BILLING.md`
10. `10_SETTINGS.md`
11. `11_PROFILE_TEAM.md`
12. `12_STATUS.md`
13. `13_ADMIN_MONITORING.md`
14. `14_DOCS_HELP.md`
15. `15_MOBILE_COMPANION.md`

## Critical Product Decisions
### Decision 1: Workbench is the center
Everything else must either:
- get the user into Workbench
- return the user to Workbench
- govern what happens around Workbench

### Decision 2: Chat stays with the work
The AI surface is not a detached chat page.
The AI Console belongs beside the current artifact, preview, editor, scene, page, or run.

### Decision 3: Live is optional
Live or voice expands the same AI Console.
It never becomes a separate product or page family.

### Decision 4: Preview is unified
Aethel has one preview engine with multiple surface types:
- web preview
- 3D viewport
- media preview
- research preview

### Decision 5: Projects have connected flows
A project may have:
- one primary domain
- several connected flows
- one shared asset layer
This avoids creating separate products for game, film, site, and assets.

## Benchmark Principles To Absorb
### VS Code
Absorb:
- predictable shell
- activity rail + sidebar + editor + bottom panel + status bar
- workspace restore behavior
- keyboard-first ergonomics
Use as structure, not as the final category ambition.
Source:
- https://code.visualstudio.com/docs/getstarted/getting-started
- https://code.visualstudio.com/api/extension-capabilities/extending-workbench

### Firebase Studio
Absorb:
- editor and AI in one workspace
- preview in the same environment
- prototyping and coding as one continuous loop
Source:
- https://firebase.google.com/docs/studio/ai-assistance
- https://firebase.google.com/docs/studio/get-started-ai

### Replit Agent
Absorb:
- idea to preview to publish as one flow
- visible execution steps
- deployment and rollback as workflow moments
Source:
- https://docs.replit.com/core-concepts/agent

### Adobe Firefly Boards and Premiere
Absorb:
- canvas and board logic for visual ideation
- filmstrip and variants
- timeline literacy for media work
Source:
- https://helpx.adobe.com/firefly/web/create-mood-boards/firefly-boards/about-firefly-boards.html
- https://helpx.adobe.com/ee/premiere/desktop/get-started/preferences-and-settings/timeline-preferences.html

### Unreal Viewport
Absorb:
- viewport as a primary surface
- toolbar grouped by intent
- game view / scene preview distinction
- preview controls by asset type
Source:
- https://dev.epicgames.com/documentation/en-us/unreal-engine/viewport-toolbar

## Real Codebase Audit: What Already Exists
### Workbench shell candidates
- `cloud-web-app/web/components/ide/ModernIDEShell.tsx`
- `cloud-web-app/web/components/ide/IDELayout.tsx`
- `cloud-web-app/web/components/ide/FullscreenIDE.tsx`

### AI surfaces already present
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`
- `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx`
- `cloud-web-app/web/components/ide/AIChatPanelChrome.tsx`
- `cloud-web-app/web/components/ide/AIChatContextPanels.tsx`
- `cloud-web-app/web/components/ide/InlineAIChat.tsx`
- `cloud-web-app/web/components/nexus/NexusChatMultimodal.tsx`

### Preview surfaces already present
- `cloud-web-app/web/components/preview/CanonicalPreviewSurface.tsx`
- `cloud-web-app/web/components/ide/PreviewPanel.tsx`
- `cloud-web-app/web/components/ide/PreviewRuntimeToolbar.tsx`
- `cloud-web-app/web/components/LivePreview.tsx`
- `cloud-web-app/web/components/VRPreview.tsx`

### Terminal surfaces already present
- `cloud-web-app/web/components/terminal/IntegratedTerminal.tsx`
- `cloud-web-app/web/components/terminal/TerminalWidget.tsx`
- `cloud-web-app/web/components/terminal/XTerminal.tsx`
- `cloud-web-app/web/components/TerminalPro.tsx`

### Studio and dashboard surfaces already present
- `cloud-web-app/web/components/dashboard/DashboardMainContent.tsx`
- `cloud-web-app/web/components/dashboard/DashboardOverviewTab.tsx`
- `cloud-web-app/web/components/dashboard/FirstValueGuide.tsx`
- `cloud-web-app/web/components/studio/StudioGlobalNav.tsx`
- `cloud-web-app/web/components/studio/StudioLayout.tsx`

## Critical Opinion On Current Product Shape
### What is already strong
- there is already enough real product structure to build a serious workbench
- command palette, editor, preview, AI panels and dashboard components are not fake stubs
- there is already a canonical preview direction in code comments

### What is still weak
- too many parallel centers of gravity
- too many shell candidates
- too many preview candidates
- too many chat candidates
- too many route families that feel like separate products

### Product diagnosis
The current repo already has enough pieces for a strong product.
The main problem is not lack of features. It is lack of hard consolidation.

## Canonical Consolidation Decisions
### Workbench shell
Keep as canonical direction:
- `ModernIDEShell.tsx`
- `FullscreenIDE.tsx`

Use as reference but not as the final canonical shell contract:
- `IDELayout.tsx`

### Preview
Keep as canonical preview engine direction:
- `CanonicalPreviewSurface.tsx`
- `PreviewRuntimeToolbar.tsx`

Treat these as specialized or legacy wrappers:
- `PreviewPanel.tsx`
- `LivePreview.tsx`
- `VRPreview.tsx`
- `MiniPreview.tsx`

### AI
Keep as canonical AI workbench family:
- `AIChatPanelContainer.tsx`
- `AIChatPanelChrome.tsx`
- `AIChatContextPanels.tsx`
- `InlineAIChat.tsx`

Treat these as context-specific extensions, not separate product centers:
- `NexusChatMultimodal.tsx`
- other parallel chat surfaces

### Terminal
A single terminal family must survive.
The blueprints assume one integrated bottom dock terminal, not four competing ones.


## Canonical Design System Decisions
### Token source of truth
- CSS variables are the canonical runtime source of truth
- JS token objects are adapters, not the source of truth
- use a single namespace: `--aethel-*`

### Token namespaces to retire from canonical thinking
- generic `--bg-*` as primary system namespace
- generic `--color-*` as primary system namespace
- parallel JS-only palette definitions that diverge from CSS vars

### Token categories that must exist
- `--aethel-surface-*`
- `--aethel-text-*`
- `--aethel-border-*`
- `--aethel-primary-*`
- `--aethel-info-*`
- `--aethel-success-*`
- `--aethel-warning-*`
- `--aethel-error-*`
- `--aethel-space-*`
- `--aethel-radius-*`
- `--aethel-shadow-*`
- `--aethel-motion-*`
- `--aethel-z-*`

### Typography
- display style is reserved for public hero moments and major section headers
- body typography must stay calmer and more neutral in studio/governance surfaces
- code typography is reserved for code, diffs, file paths, logs, commands, and technical labels

### Density tiers
- Public: comfortable
- Studio: medium
- Workbench: dense
- Governance: dense and table-friendly

### Motion
- one canonical duration and easing set only
- motion must reinforce state change, not decorate idle surfaces
- toast, overlay, mode switch and panel open/close should use the same family of motion curves

### Toasts and notifications
- a single toast family must survive as canonical
- toasts must not carry primary workflow information that disappears too quickly
- errors that block work belong inline or in contextual panels, not only in toast


## Shared Navigation Model
### Public nav
- Home
- Pricing
- Docs
- Status
- Contact Sales
- Sign in

### Studio nav
- Studio Home
- Projects
- Workbench
- Billing
- Settings
- Status

### Governance nav
- Monitoring
- AI Monitor
- Users
- Payments
- Audit Logs

## Shared Spatial System
### Desktop frame widths
- 1440 px for standard desktop layouts
- 1600 px for wide workbench layouts
- 1280 px minimum desktop shell

### Core shell columns
- left activity rail: 56 px
- left sidebar: 280 to 320 px
- right rail: 360 to 420 px
- bottom dock closed height: 36 px tab strip
- bottom dock open height: 220 to 320 px
- status bar: 28 to 32 px
- top bar: 56 px

### Page gutters
- public surfaces: 80 px desktop, 24 px mobile
- studio surfaces: 32 px desktop, 20 px tablet, 16 px mobile
- workbench interior padding: 16 px around content, 12 px inside dense panels

## Shared Component Canon
- GlobalTopBar
- WorkspaceSwitcher
- SurfaceHeader
- PrimaryActionCard
- ProjectCard
- AIConsole
- PreviewDeck
- StatusBadge
- UsageBar
- HealthMatrix
- ApprovalCard
- MemoryCapsule
- EmptyState
- LoadingState
- ErrorState

## Shared Button System
### Primary button
- one dominant CTA per surface above the fold
- solid fill
- strongest contrast
- medium or large size only

### Secondary button
- same height as primary
- outline or soft fill
- for the second-most important action only

### Tertiary button
- ghost or low-emphasis
- never competes with primary action

### Destructive button
- only inside danger or approval contexts
- never grouped casually with neutral actions

## Shared Interaction Rules
- hover confirms affordance; it does not create surprise
- selection states must be obvious and persistent
- pressed states must feel faster than hover states
- loading states keep layout stable
- advanced controls live behind drawers, tabs, or disclosure
- modals are reserved for irreversible or high-risk actions
- AI is always contextual to the current artifact or flow

## Shared State Rules
Every surface must define:
- empty state
- loading state
- degraded state
- blocked state
- error state
- healthy state

## Shared Content Rules
- one primary action per page
- maximum two secondary actions in the first screenful
- no technical readiness copy in public surfaces
- no duplicate cards with equal visual weight unless direct comparison is required
- long paragraphs are a failure unless the page is docs by intent
- metrics appear only when they help the user decide or act

## Final Product Rule
Aethel only has one serious production surface: Workbench.
Everything else must behave accordingly.


## Premium Visual System: Figma-Ready Decisions
### Typography
#### Public display
- purpose: category statement, hero, major section headers
- weight: semibold to bold
- tracking: slightly tight
- usage: only public surfaces and major studio mission headers
- never use display style inside dense governance tables or workbench metadata

#### Interface heading
- purpose: page titles, panel titles, section headers
- weight: semibold
- tracking: neutral
- usage: studio, workbench, governance

#### Body
- purpose: descriptions, helper text, list rows
- weight: regular to medium
- line height: relaxed enough for readability, tight enough for dense UIs

#### Mono
- purpose: code, commands, file paths, run ids, logs, port labels, technical metadata
- never use mono as decorative style

### Type Scale
- Display XL: public hero only
- Display L: public section anchors
- Heading L: page titles and mission headers
- Heading M: panel headers and major cards
- Heading S: component section titles
- Body L: public subheadlines only
- Body M: standard product body copy
- Body S: compact explanations, table cells, metadata rows
- Caption: helper text and timestamp labels
- Overline: category labels and tiny UI labels only

### Radii
- public large cards: 24 to 28 px
- studio cards: 20 to 24 px
- workbench panels: 14 to 18 px
- dense controls: 10 to 12 px
- pills and status chips: full rounded

### Shadow and Depth Model
- Level 0: flat surface, no shadow, separator only
- Level 1: card shadow for public and studio overview surfaces
- Level 2: strong modal, drawer, floating palette or overlay
- Level 3: premium hero or dominant preview framing only

Rule:
- do not mix too many shadow languages on the same page
- workbench should rely more on borders, tone separation and layered surfaces than oversized shadows

### Surface Model
- Surface Base: page background
- Surface 1: primary cards and rails
- Surface 2: elevated panels and drawers
- Surface 3: overlays, modals, command palette, context menus
- Accent Surface: selected or critical contextual emphasis, used sparingly

### Density Model
#### Public
- larger spacing
- fewer visible controls
- stronger negative space

#### Studio
- medium density
- visible action hierarchy
- compact but breathable cards

#### Workbench
- high density
- strong alignment to rails, tabs and data-rich panels
- compact metadata rows and chips

#### Governance
- high density with table literacy
- clarity first, ornament second

### Button Geometry
- primary button height: 44 to 48 px on public/studio surfaces
- workbench action buttons: 32 to 40 px depending on prominence
- icon-only buttons must have predictable square hit area
- buttons align by baseline and height within the same action row

### Input Geometry
- standard inputs: 44 px height minimum
- dense filter/search inputs in workbench may be shorter but must keep accessible hit targets
- helper and validation text stays directly below field, never as detached paragraph

### Badge System
#### Status badge
- for health, runtime, sync, billing, approval state
- uses semantic color only as support; text and icon must carry meaning too

#### Domain badge
- app/site, game, film, research, asset

#### Mode badge
- Build, Preview, Canvas, Review, Assets, Live

#### Role badge
- Architect, Engineer, Critic, QA, Research

### Motion System
- fast micro state: 120...160 ms
- standard panel or toast transition: 180...240 ms
- larger layout transitions: 240...320 ms
- no bounce in governance or admin surfaces
- hover transitions should be subtle and fast
- panel resize should feel mechanical, not animated

### Canonical Overlay Rules
- Command Palette is a center overlay anchored to workbench context
- context menus open near trigger, never detach far from source
- drawers slide from an expected edge and preserve main layout behind them
- modals are reserved for irreversible actions, auth interruptions or full-screen focused tasks


## Figma File Structure
The design file should be organized into these pages only:
1. `00 Foundations`
2. `01 Public`
3. `02 Entry`
4. `03 Studio`
5. `04 Workbench`
6. `05 Governance`
7. `06 Components`
8. `07 States`
9. `08 Motion`

## Figma Frame Set
### 00 Foundations
Frames:
- Typography scale
- Color system
- Spacing and density
- Shadow/elevation
- Button system
- Inputs and fields
- Status badges and chips
- Toasts and banners

### 01 Public
Frames:
- Home desktop
- Home tablet
- Home mobile
- Pricing desktop
- Pricing mobile
- Contact Sales desktop
- Contact Sales mobile
- Docs landing desktop
- Status public desktop

### 02 Entry
Frames:
- Auth desktop
- Auth mobile
- Onboarding step 1
- Onboarding step 2
- Onboarding step 3
- Onboarding provider/demo state
- Onboarding success/provisioning

### 03 Studio
Frames:
- Studio Home healthy
- Studio Home first-project empty
- Studio Home blocked
- Projects grid
- Projects list
- Projects empty

### 04 Workbench
Frames:
- Workbench Build mode / app-site
- Workbench Preview mode / app-site
- Workbench Canvas mode / app-site
- Workbench Build mode / game
- Workbench Preview mode / game
- Workbench Canvas mode / game
- Workbench Preview mode / film
- Workbench Canvas mode / film
- Workbench Review mode
- Workbench Assets mode
- Workbench AI Console expanded
- Workbench Live optional state
- Workbench command palette
- Workbench runtime drawer
- Workbench approval state

### 05 Governance
Frames:
- Billing default
- Billing payment issue
- Settings providers and models
- Settings security
- Profile/Team
- Status healthy
- Status degraded
- Admin monitoring
- Admin AI monitor

### 06 Components
Create component sets for:
- PublicHeader
- PublicFooter
- SurfaceHeader
- Buttons
- Inputs
- Cards
- ProjectCard
- FlowCard
- AIConsole sections
- PreviewDeck cards
- Toolbar groups
- Status badges
- Tables
- Empty states
- Error blocks
- Toasts

### 07 States
Document states for:
- empty
- loading
- healthy
- degraded
- blocked
- error
- approval required
- no results
- payment issue
- provider missing

### 08 Motion
Document transitions for:
- page enter
- mode switch
- drawer open/close
- toast enter/exit
- hover emphasis
- rail collapse/expand

## Component Set Rules For Figma
- one component set per canonical product component
- variants organized by purpose, not by page
- state variants inside components, not duplicated as page-specific detours
- do not create separate component sets for public/studio/workbench when the structure is the same and only density/tone changes

## Variant Requirements
Every critical component must define variants for:
- default
- hover
- focus
- active/selected
- disabled
- loading where relevant
- error where relevant

## Annotation Rules
Every major frame must annotate:
- primary action
- hierarchy order
- why a component exists
- what it connects to
- which state is default
- which parts are progressive disclosure

## Canonical Component Mapping
### Public shell
- PublicHeader -> source family: `components/ui/PublicHeader.tsx` -> status: keep and refine
- PublicFooter -> source family: `components/ui/PublicFooter.tsx` -> status: keep and refine
- HeroScreenshot / proof sections -> source family: landing and pricing surfaces -> status: consolidate into reusable public-section patterns

### Entry shell
- AuthFormShell -> source family: `app/(auth)/login/login-v2.tsx`, `app/(auth)/register/register-v2.tsx`, `components/auth/AuthExperiencePanel.tsx` -> status: merge into one auth pattern
- Onboarding step system -> source family: `components/onboarding/*`, `components/dashboard/FirstValueGuide.tsx`, `components/dashboard/NewProjectWizard.tsx` -> status: consolidate into one canonical onboarding family

### Studio shell
- StudioTopBar / StudioGlobalNav -> source family: `components/studio/StudioGlobalNav.tsx`, `components/studio/StudioLayout.tsx` -> status: keep and refine
- MissionHeader / ConnectedFlowRail / LiveStrip -> source family: dashboard overview and first-value surfaces -> status: consolidate into one studio-home family
- Project catalog -> source family: dashboard projects tabs and project dashboards -> status: elevate into one canonical Projects surface

### Workbench shell
- Workbench shell -> source family: `components/ide/ModernIDEShell.tsx`, `components/ide/FullscreenIDE.tsx` -> status: keep and refine
- Mobile Companion shell -> source family: Workbench shell adapted to constrained handheld layout -> status: new canonical variant defined by blueprint, not a separate product family
- AI Console -> source family: `components/ide/AIChatPanelContainer.tsx`, `AIChatPanelChrome.tsx`, `AIChatContextPanels.tsx`, `InlineAIChat.tsx` -> status: merge into one canonical family
- Preview Engine -> source family: `components/preview/CanonicalPreviewSurface.tsx`, `components/ide/PreviewRuntimeToolbar.tsx` -> status: keep and refine
- Command Palette -> source family: `components/ide/CommandPalette.tsx` -> status: keep and refine
- Explorer / Git panels -> source family: `components/ide/FileExplorerPro.tsx`, `GitPanelPro.tsx` -> status: keep and refine
- Terminal family -> source family: multiple terminal components -> status: select one integrated bottom-dock family

### Governance shell
- Billing family -> source family: `components/billing/*` -> status: keep and consolidate page hierarchy
- Settings family -> source family: `components/settings/*`, `components/SettingsEditor.tsx`, `components/engine/ProjectSettings.tsx` -> status: consolidate into one settings architecture
- Status family -> source family: `app/status/page.tsx` + deprecated status bars -> status: keep page, retire deprecated bars
- Admin family -> source family: `components/admin/*` + duplicate dashboard admin widgets -> status: keep admin family, retire duplicates outside admin

## Figma Annotation Requirements Per Frame
Every high-fidelity frame must explicitly mark:
- component names
- canonical source family from the repo
- default state
- alternate states
- primary CTA
- secondary CTA
- interactions to other surfaces or components
- what should be hidden by default

## Canonical Token Table
These values exist to stop Figma and frontend from inventing separate visual systems.
If a surface needs an exception, it must still derive from this table.

### Color Tokens
- `--aethel-surface-canvas`: `#07111F`
- `--aethel-surface-panel`: `#0D1728`
- `--aethel-surface-elevated`: `#122036`
- `--aethel-surface-overlay`: `rgba(4, 10, 19, 0.82)`
- `--aethel-surface-muted`: `#18253B`
- `--aethel-surface-danger-soft`: `#2A1520`
- `--aethel-border-default`: `rgba(154, 176, 211, 0.18)`
- `--aethel-border-strong`: `rgba(154, 176, 211, 0.32)`
- `--aethel-border-active`: `rgba(93, 168, 255, 0.52)`
- `--aethel-text-primary`: `#F5F7FB`
- `--aethel-text-secondary`: `#B5C2D9`
- `--aethel-text-tertiary`: `#7E90AD`
- `--aethel-text-disabled`: `#62718B`
- `--aethel-primary-500`: `#67B2FF`
- `--aethel-primary-600`: `#479EFF`
- `--aethel-primary-700`: `#2A86E8`
- `--aethel-accent-500`: `#8E7CFF`
- `--aethel-success-500`: `#3DDC97`
- `--aethel-warning-500`: `#F2B94B`
- `--aethel-error-500`: `#F36A7F`
- `--aethel-info-500`: `#69C7FF`

### Typography Tokens
- `--aethel-font-display`: `Sora, Space Grotesk, ui-sans-serif, sans-serif`
- `--aethel-font-ui`: `Inter, ui-sans-serif, system-ui, sans-serif`
- `--aethel-font-mono`: `JetBrains Mono, Fira Code, Consolas, monospace`
- `--aethel-type-hero`: `56/60 700`
- `--aethel-type-h1`: `40/44 700`
- `--aethel-type-h2`: `32/36 700`
- `--aethel-type-h3`: `24/30 650`
- `--aethel-type-title`: `18/24 650`
- `--aethel-type-body-lg`: `16/24 500`
- `--aethel-type-body`: `14/22 500`
- `--aethel-type-label`: `12/16 600`
- `--aethel-type-micro`: `11/14 600`

### Spacing Tokens
- `--aethel-space-2`: `8 px`
- `--aethel-space-3`: `12 px`
- `--aethel-space-4`: `16 px`
- `--aethel-space-5`: `20 px`
- `--aethel-space-6`: `24 px`
- `--aethel-space-8`: `32 px`
- `--aethel-space-10`: `40 px`
- `--aethel-space-12`: `48 px`

### Radius Tokens
- `--aethel-radius-sm`: `10 px`
- `--aethel-radius-md`: `14 px`
- `--aethel-radius-lg`: `18 px`
- `--aethel-radius-xl`: `24 px`
- `--aethel-radius-pill`: `999 px`

### Shadow and Depth Tokens
- `--aethel-shadow-1`: `0 8px 24px rgba(3, 7, 14, 0.24)`
- `--aethel-shadow-2`: `0 18px 48px rgba(3, 7, 14, 0.34)`
- `--aethel-shadow-3`: `0 28px 72px rgba(3, 7, 14, 0.44)`

### Motion Tokens
- `--aethel-motion-fast`: `140 ms`
- `--aethel-motion-base`: `200 ms`
- `--aethel-motion-slow`: `280 ms`
- `--aethel-ease-standard`: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- `--aethel-ease-exit`: `cubic-bezier(0.4, 0.0, 1, 1)`

### Layout Constants
- `--aethel-topbar-height`: `64 px`
- `--aethel-statusbar-height`: `28 px`
- `--aethel-activity-rail-width`: `56 px`
- `--aethel-sidebar-width-default`: `300 px`
- `--aethel-right-rail-width-default`: `380 px`
- `--aethel-bottom-dock-height-default`: `260 px`

## Density Tier Map
### Public
- section padding: `48-72 px`
- component spacing: `16-24 px`
- card padding: `24-28 px`

### Entry
- section padding: `32-48 px`
- component spacing: `16-20 px`
- card padding: `20-24 px`

### Studio
- section padding: `24-32 px`
- component spacing: `12-20 px`
- card padding: `20-24 px`

### Workbench
- section padding: `0-24 px`
- component spacing: `8-16 px`
- card padding: `12-20 px`

### Governance
- section padding: `24-32 px`
- component spacing: `12-16 px`
- card padding: `16-20 px`

## Canonical Component Variant Matrix
### Buttons
Sizes:
- Small: `36 px` height
- Medium: `44 px` height
- Large: `52 px` height
Variants:
- primary
- secondary
- tertiary
- danger
States:
- default
- hover
- focus-visible
- active
- disabled
- loading

### Input Fields
Sizes:
- Compact: `40 px`
- Default: `44 px`
- Large: `52 px`
States:
- default
- hover
- focus
- filled
- error
- disabled

### Cards
Variants:
- public feature card
- studio operational card
- workbench dock card
- governance data card
States:
- default
- hover if clickable
- selected
- degraded
- blocked

### Tables and Rows
Row heights:
- compact governance row: `44 px`
- default governance row: `52 px`
- expanded detail row: auto with `16 px` inner padding
States:
- default
- hover
- selected
- warning
- error
- empty

### Badges and Pills
Sizes:
- micro: `20 px`
- default: `24 px`
- strong: `28 px`
Families:
- status
- mode
- domain
- role
- usage warning

## Component Ownership Rules
- one canonical component family per concept
- page-specific styling does not create a new component family
- if a component exists in Public, Studio and Governance, density and tone may change but anatomy should remain recognizable
- Figma component sets must mirror canonical product components, not page names

## Motion Mapping By Component
- hover on buttons/cards: `140 ms` standard ease
- drawer open/close: `200 ms` standard ease
- command palette enter/exit: `200 ms` standard ease with opacity + scale only
- toasts: `180 ms` enter, `140 ms` exit
- mode switches inside Workbench: `220-280 ms` max, no crossfade soup
- rail collapse/expand: mechanical resize, no spring motion

## Cross-Surface Handoff Contract
### Public -> Entry
- Home CTA language should prefer `Open Studio` or `Start` and never imply a different product family
- Pricing CTA should preserve selected plan into auth or checkout context
- Contact Sales should preserve commercial intent source when practical

### Entry -> Studio
- auth success should route into onboarding or directly into Studio based on user state
- onboarding completion must create a project context before entering Studio or Workbench

### Studio -> Workbench
- `Continue Work` restores the strongest recoverable context
- `Open Workbench` with no restore state opens the primary domain default mode
- connected flows selected in Studio must appear selected in Workbench header

### Governance -> Workbench
- blocked billing, settings or status states should return the user to the exact Workbench or Studio context they left after recovery
- governance pages should never feel like dead ends

## CTA Naming Contract
Use these labels consistently across the product:
- `Open Workbench` for explicit entry into the production shell
- `Continue Work` for restore-context entry
- `Open Preview` for preview-first entry within the current project
- `Open AI Console` for AI-first entry within the current project
- `Create Project` for onboarding/project creation final action
- `Save Changes` for settings and profile save actions

## What Must Never Split Into Separate Product Families
- preview
- live voice
- AI console
- assets
- review/approvals
- terminal/runtime

These can be modes, drawers, rails or focused states inside Workbench. They must not be repositioned as separate core products in navigation or messaging.

The same rule applies on mobile: companion behavior must remain a Workbench variant, not a parallel app architecture.


## Global State Contract
Every canonical surface must explicitly support only the states that make sense for its job, but the following meanings must stay consistent across the whole product:

- `empty`: no meaningful user data exists yet; the screen must offer a clear start action
- `loading`: data or session is being restored; preserve layout skeleton and avoid neutral blank shells
- `healthy`: normal working state; no extra banners or noise
- `degraded`: a non-fatal dependency is impaired; the screen stays usable and shows one scoped warning
- `blocked`: the primary task cannot continue; the screen must present one recovery path
- `error`: a scoped failure occurred; explain the failed operation and preserve user input where possible
- `approval required`: a user decision is blocking progress; this outranks passive informational content
- `no results`: search/filter state with no matching entities; preserve the query and offer one corrective action

Rules:
- do not stack multiple banners for the same issue
- degraded state should not visually resemble blocked state
- blocked states must offer a concrete next action, not only explanation
- status language must be factual and consistent across Studio, Workbench, Billing and Mobile Companion

## Mode-to-Rail Default Matrix
### Build Mode
- left sidebar default: Explorer
- right rail default: AI Console
- bottom dock default: collapsed unless terminal/problems were last active

### Preview Mode
- left sidebar default: route/page/scene navigator
- right rail default: AI Console or Approval Details if review is pending
- bottom dock default: Runtime or Logs available, collapsed by default

### Canvas Mode
- left sidebar default: structure/layers
- right rail default: Properties
- bottom dock default: collapsed, filmstrip may replace it contextually

### Review Mode
- left sidebar default: optional/collapsed
- right rail default: Approval Details
- bottom dock default: open when logs/evidence are relevant

### Assets Mode
- left sidebar default: collections/types/tags
- right rail default: Properties or Linked Assets metadata
- bottom dock default: collapsed

### Mobile Build Lite
- dominant surface: AI Composer Lite
- secondary layer: code impact drawer
- support layer: run status sheet

### Mobile Preview
- dominant surface: Preview Surface
- secondary layer: Preview Deck
- support layer: runtime sheet

### Mobile Review
- dominant surface: Approval Card
- support layer: inspect deeper drawer

## Canonical Component Map By Allowed Surface
### PublicHeader
- allowed surfaces: Home, Pricing, Contact Sales, Docs/Help public, Status public

### MissionHeaderCard
- allowed surfaces: Studio Home only

### ProjectCard / ProjectListRow
- allowed surfaces: Projects, Studio Home recent/pinned contexts in reduced form

### AI Console
- allowed surfaces: Workbench, Mobile Companion in constrained form
- not allowed as a detached primary page family

### Preview Engine
- allowed surfaces: Workbench, Mobile Companion in constrained form
- not allowed as a marketing-style standalone product center

### ApprovalCard
- allowed surfaces: Workbench Review mode, Mobile Review mode, contextual approval drawers

### BillingIssueBanner
- allowed surfaces: Billing, relevant checkout fallbacks, scoped settings recovery
- not allowed on public marketing surfaces

### ServiceHealthMatrix
- allowed surfaces: Status, Admin Monitoring, compact Studio summary in reduced form only

### InProductHelpCallout
- allowed surfaces: Onboarding, Workbench blocked states, Settings recovery, Docs/Help embeds

## Connected Flow Data Contract
Connected flows are not loose references. They are part of one shared project model.

Every project may contain:
- one primary domain
- multiple connected flows
- one shared asset layer
- one shared AI scope model
- one shared run lineage

### Shared asset layer rules
- assets belong to the project or workspace layer, not to a single preview surface only
- if an asset changes, every affected flow must receive an explicit freshness change
- affected preview surfaces must move to `outdated`, `updating`, or `degraded` state instead of silently pretending to be current
- no flow may continue to present stale output as healthy when a linked asset has materially changed

### Connected flow visibility rules
- connected flows must remain visible in Studio Home, Projects, Workbench header, AI scope, and Preview Deck
- users must always understand which flows are current, stale, blocked, or updating

## Keyboard-First Contract
Aethel must preserve professional keyboard ergonomics as a first-class product rule.

### Required keyboard-first behaviors
- Command Palette is global inside Workbench
- mode switching must be reachable from keyboard
- flow switching must be reachable from keyboard
- sidebar focus, dock focus, and rail focus must be reachable from keyboard
- approvals must be actionable without pointer-only dependencies

### Keyboard rule
If a high-frequency action exists in Workbench, it must have a discoverable keyboard path or palette command.

## Design Token Enforcement Contract
The `--aethel-*` token family is the only canonical source of visual truth.

Rules:
- new visual surfaces must derive from `--aethel-*` tokens
- no parallel page-local color systems
- no one-off spacing scales per page
- no alternate shadow, radius, or motion systems outside the canonical token family
- Figma foundations and implementation must map to the same token names and meanings

## Canonical Implementation Decisions
These are not suggestions. They are hard architectural decisions for product coherence.

### Shell family
Canonical shell only:
- `FullscreenIDE.tsx`
- `ModernIDEShell.tsx`

Reference-only, not canonical shell contract:
- `IDELayout.tsx`

### Terminal family
Canonical terminal direction:
- `XTerminal.tsx` integrated into the Bottom Dock

Reference-only ideas:
- `IntegratedTerminal.tsx`
- `TerminalWidget.tsx`

Rule:
Product architecture must present one terminal identity, one dock identity, and one command surface for terminal work.

### Token usage rule
- no loose hex colors in product implementation or Figma component decisions when a canonical token exists
- no page-local palette inventions
- no alternative spacing systems outside `--aethel-*`
- visual polish must come from composition, hierarchy and token use, not custom one-off values

## Execution Artifacts
These are synthesis files derived from the canonical blueprints.
They do not replace the per-surface contracts.

- `16_MASTER_FIGMA_PROMPT.md`
