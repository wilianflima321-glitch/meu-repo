# 66_AI_OPERATIONAL_EXPERIENCE_BLUEPRINT_2026-03-24
Date: 2026-03-24
Status: ACTIVE
Scope: Canonical blueprint for AI operational UX, multi-agent orchestration, memory/context UX, and surface-by-surface interaction design.

Companion document:
- `docs/master/65_STUDIO_PRODUCT_BLUEPRINT_2026-03-24.md`

## 1. Product Thesis

The Aethel AI layer must stop behaving like a side chat and start behaving like an operational system.

The user should perceive:
- intent -> plan -> execution -> validation -> approval -> deploy
- visible state instead of opaque "thinking"
- multiple agents as a coordinated crew, not duplicated chat threads
- cost and confidence as operating signals, not buried metadata
- memory as reusable project intelligence, not hidden prompt stuffing

The product category is:
- software studio with AI
- operational workbench
- continuous environment for briefing, research, implementation, preview, validation, and governance

It is not:
- generic SaaS dashboard
- sidebar copilot
- prompt box with tabs
- ops console pretending to be product UX

## 2. Core UX Failures To Eliminate

Current risks the blueprint must eliminate:
- AI appears as "just another panel"
- agent state is not visible enough
- preview still exposes runtime complexity too early
- dashboard, IDE, preview, billing, and admin do not yet feel like a single operating system
- too much explanatory text compensates for weak hierarchy
- memory/context is present in code but not yet tangible in the product
- approvals and trust are not framed as first-class operating moments

## 3. Canonical Experience Layers

### 3.1 Builder Layer

Purpose:
- first win
- low anxiety
- guided creation
- opinionated defaults

Characteristics:
- one primary action per screen
- minimal visible controls
- no raw infrastructure concepts
- strong empty-state guidance
- visual momentum

Entry surfaces:
- landing
- login/register
- onboarding
- dashboard overview
- first project flow

### 3.2 Operator Layer

Purpose:
- sustained production work
- context-rich control
- auditability
- iterative execution

Characteristics:
- visible system state
- command palette as central spine
- AI status and output structured by task
- approvals and rollback explicit
- preview integrated into the workbench

Entry surfaces:
- projects
- AI task console
- IDE shell
- preview
- billing/usage for serious users

### 3.3 Governance Layer

Purpose:
- trust
- enterprise readiness
- compliance
- runtime truth

Characteristics:
- never blocks the primary flow unless risk demands it
- uses compact badges, ledgers, timelines, and evidence cards
- avoids taking over the visual hierarchy of builder/operator surfaces

Entry surfaces:
- status
- monitoring
- AI monitor
- admin
- billing readiness

### 3.4 Live / Agentic Layer

Purpose:
- persistent assistance
- multi-agent execution
- future voice/operator modes
- continuity between sessions and tasks

Characteristics:
- always present but never noisy
- rendered as live state, not decorative chrome
- interruptible
- approval-aware
- recoverable

Entry surfaces:
- global AI rail
- AI chat / task panel
- IDE
- preview
- future voice/operator dock

## 4. Canonical AI UX Objects

These objects must exist visually and structurally across the product.

### 4.1 Mission Card

Represents:
- what the user is trying to achieve now
- success definition
- scope
- current stage

Required fields:
- title
- desired outcome
- current stage
- blockers
- recommended next action

### 4.2 Run Card

Represents:
- one AI execution unit
- status and risk
- output destination

Required fields:
- run id
- mode
- initiating surface
- started at
- status
- estimated cost
- approval requirement
- affected files or systems

### 4.3 Agent Card

Represents:
- one active role in a multi-agent run

Required fields:
- role name
- current task
- dependency
- confidence
- cost share
- progress
- waiting/running/blocked/done

Mandatory roles when multi-agent is active:
- Architect
- Engineer
- Critic

Optional roles:
- Researcher
- QA
- Runtime Operator
- Design Translator

### 4.4 Approval Card

Represents:
- a decision gate before irreversible change

Required fields:
- requested action
- risk level
- diff or impact summary
- expected result
- rollback condition
- approve / revise / reject

### 4.5 Memory Capsule

Represents:
- durable project knowledge

Required fields:
- scope: workspace / project / task / session
- source
- last updated
- reliability
- editable summary

### 4.6 Cost Capsule

Represents:
- spend at the right decision point

Required fields:
- current model
- estimated request cost
- cumulative session cost
- plan impact
- multi-agent multiplier if any

### 4.7 Confidence Band

Represents:
- how trustworthy the current answer or action is

Required fields:
- confidence level
- why
- missing context
- recommended validation

## 5. Global Information Architecture

The AI experience must be distributed, not trapped in one chat.

### 5.1 Global Navigation

Primary:
- Home
- Studio
- Projects
- Workbench
- Pricing
- Docs

Secondary:
- Status
- Billing
- Settings
- Profile

Administrative:
- Monitoring
- AI Monitor
- Payments
- Security

Rule:
- "AI" is not a top-level destination in public navigation
- AI is a capability layer inside Studio and Workbench

### 5.2 Global Persistent Elements

Every authenticated surface must have:
- global studio nav
- mission/status strip
- AI presence indicator
- universal command palette trigger
- lightweight context breadcrumb

The AI presence indicator must show:
- idle / active / waiting approval / degraded
- active run count
- current project context

## 6. Surface Blueprint

### 6.1 Landing

Primary goal:
- communicate category instantly
- show real workflow without long explanation

Hierarchy:
- headline
- subheadline
- single primary CTA
- one secondary CTA
- visual proof
- trust strip

AI presence:
- not a chat box
- show AI as coordinated studio layer

Must show:
- mission -> plan -> code -> preview -> validate
- anti-fake-success as trust signal
- screenshot/video of real workbench

Must not show:
- too many feature cards
- verbose product philosophy
- admin-like metrics

### 6.2 Login / Register

Primary goal:
- re-enter the system with continuity

Hierarchy:
- auth form
- what happens next
- real product visual

AI presence:
- present as continuity promise, not feature marketing

Must show:
- next surface after auth
- mission continuity
- first-value expectation

### 6.3 Onboarding

Primary goal:
- establish mission, context, preferred mode, first artifact

Flow:
1. What are you building?
2. How do you want to start?
3. Which mode should guide you?
4. Start with a generated mission

AI presence:
- appears as guided planner

Must show:
- mission setup
- domain selection
- builder/operator choice
- provider/demo state

### 6.4 Dashboard / Studio Home

Primary goal:
- orient the user instantly and route them to the next meaningful action

This is not a dashboard in the SaaS sense.
This is the control room.

Layout:
- top mission strip
- left navigation
- center action column
- right live system rail

Center action column blocks:
- active mission
- recommended next action
- recent project(s)
- resume last run
- start new run

Right live system rail:
- AI status capsule
- preview/runtime status
- billing/usage capsule
- readiness capsule

Must remove:
- redundant KPI cards
- explanation-heavy empty states
- equal visual weight for minor modules

### 6.5 Projects

Primary goal:
- choose or resume a workstream

Layout:
- filters
- project cards/list
- right project summary drawer

Each project card must show:
- state
- last active task
- live preview state
- AI run state
- owner/context
- next action

### 6.6 AI Task Console

This replaces the idea of "chat panel".

Primary goal:
- coordinate intent, execution, context, and approvals

Layout:
- header with mode + model + cost
- left thread/task stream
- center conversation or run detail
- right context/memory/approvals

Modes:
- Ask
- Plan
- Execute
- Review
- Live

Each mode changes composer and surrounding UI.

Composer must support:
- plain prompt
- mentions
- attachments
- quick action insertion
- mode-specific affordances

### 6.7 IDE Shell

Primary goal:
- make the editor feel like the command center for real implementation

Structure:
- top bar
- activity strip
- file tree
- editor
- preview pane
- AI task console
- bottom runtime/output area

Top bar must show:
- current mission
- project
- branch
- active run state
- current mode

File tree must show:
- git status
- AI touched files
- approval-required markers
- search at source, not buried

### 6.8 Preview

Primary goal:
- validate outcomes, not expose infrastructure

Preview must feel like:
- outcome surface
- QA surface
- validation surface

Must show:
- health
- latest AI action impact
- visual diff trigger
- issue capture
- approve/reject path

Must hide by default:
- raw provisioning language
- runtime technical detail unless user expands

### 6.9 Runtime Toolbar

Primary goal:
- compact operational control

Default visible:
- provider badge
- health
- restart
- open external
- current action

Expanded panel:
- runtime host
- provisioning history
- sync state
- degraded reason

### 6.10 Billing

Primary goal:
- communicate capacity and upgrade logic inside the workflow

Must show:
- current plan
- usage left
- next limit
- why upgrade matters
- invoice/portal entry

Must not feel:
- separate finance mini-product

### 6.11 Settings

Primary goal:
- configure the studio, not dump technical forms

Sections:
- profile
- AI providers
- runtime
- integrations
- notifications
- security

### 6.12 Status / Monitoring / AI Monitor / Admin

Primary goal:
- make trust and enterprise signals explicit without polluting the main builder/operator flow

Design language:
- denser
- more compact
- evidence-led
- ledger/timeline/table driven

## 7. Multi-Agent UX Architecture

### 7.1 Interaction Model

Multi-agent is not multiple chats.

It is one run with multiple accountable roles.

The canonical container is:
- one Run Header
- one Agent Board
- one Shared Timeline
- one Output Summary
- one Approval Stack

### 7.2 Agent Board

Desktop:
- horizontal role board or 2x2 grid

Mobile:
- stacked cards with segmented switcher

Each agent card shows:
- role
- current task
- input dependency
- progress
- output fragment
- confidence
- cost

### 7.3 Shared Timeline

Timeline states:
- received mission
- research in progress
- plan drafted
- implementation started
- validation running
- approval pending
- applied
- rolled back

This timeline must exist in:
- AI task console
- IDE side panel
- AI monitor

## 8. Cost UX

Cost must be local, contextual, and calm.

Never hide cost in settings.
Never dump raw accounting into the main flow.

Visible levels:
- request cost estimate near composer
- session cost in AI header
- project monthly trend in billing
- run-level cost split in multi-agent mode

Color logic:
- neutral under budget
- amber when mode/model cost meaningfully rises
- red only when approval or hard plan limit matters

## 9. Confidence UX

Confidence is not decoration.
It must guide behavior.

Three levels:
- High: user can likely apply after quick review
- Medium: validate preview or diff
- Low: research or human check required

Every low-confidence output must include:
- why confidence is low
- what context is missing
- what validation should happen next

## 10. Approvals UX

Approvals must appear where the risk materializes.

Required approval triggers:
- write to project files above threshold
- deploy
- billing-impacting actions
- destructive deletes
- external side effects

Approval UI states:
- pending
- approved
- revised
- rejected
- expired

Approval card must include:
- scope
- impact summary
- cost
- diff preview
- rollback path

## 11. Memory / Context UX

### 11.1 Context Layers

The system must separate:
- session context
- task context
- project memory
- workspace memory
- external references

### 11.2 User-Facing Memory UI

Memory should appear as:
- pinned context capsules
- project memory panel
- recent decisions ledger
- "what the AI currently knows" summary

Each memory item must be:
- visible
- removable
- editable when appropriate
- scoped

### 11.3 Context Panel In AI Task Console

Sections:
- selected files
- mentions
- project memory
- run dependencies
- recent approvals
- missing context

## 12. Live / Voice / Operator Future Layer

The UX must reserve canonical space now, even if runtime is partial.

Future persistent dock:
- voice state
- screen state
- browser operator state
- background tasks

It must live:
- bottom right on desktop
- lower action tray on mobile

States:
- off
- listening
- responding
- acting
- waiting approval
- background

## 13. Visual System For Figma

### 13.1 Typography

Three-tier system:
- Display: high-contrast editorial for landing and hero moments
- Interface: compact, highly legible sans for dashboards and workbench
- Mono: code, logs, run ids, diff, status

Recommended pairings for exploration:
- Display: Geist / Sora / Instrument Serif / General Sans
- Interface: Geist / SF Pro / Suisse Int'l class
- Mono: Berkeley Mono / Geist Mono / JetBrains Mono

### 13.2 Spacing

Use a dense-but-premium rhythm:
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48
- 64

### 13.3 Radius

System:
- 10 for small controls
- 16 for cards
- 24 for premium hero surfaces

### 13.4 Surface Types

Must define in Figma:
- base canvas
- elevated panel
- premium spotlight panel
- operational rail
- overlay / command / picker
- approval card
- memory capsule
- agent card

### 13.5 Color Logic

Base direction:
- graphite / ink / steel / petrol / subtle cyan
- no generic purple SaaS bias
- success and warning reserved for operational meaning

## 14. Figma Blueprint Structure

Create one Figma file with these pages:

1. `00 Foundations`
- color tokens
- type scale
- spacing
- radius
- shadows
- motion
- icons

2. `01 Core Components`
- buttons
- inputs
- command palette
- chips
- tabs
- nav items
- cards
- drawers
- toasts
- tables
- skeletons

3. `02 AI Components`
- mission card
- run card
- agent card
- approval card
- memory capsule
- cost capsule
- confidence band
- context panel
- timeline

4. `03 Public Surfaces`
- home
- pricing
- contact sales
- docs entry

5. `04 Entry Surfaces`
- login
- register
- onboarding

6. `05 Studio`
- dashboard home
- projects
- AI task console

7. `06 Workbench`
- IDE shell
- file tree
- editor chrome
- command palette
- preview
- runtime toolbar

8. `07 Governance`
- billing
- settings
- status
- monitoring
- AI monitor
- admin

9. `08 Mobile`
- mobile home
- mobile onboarding
- mobile studio
- mobile AI console
- mobile preview

## 15. Required Frames

Create these frames exactly:

1. `Home / Hero + Proof`
2. `Home / Workflow Narrative`
3. `Pricing / Comparison + Upgrade Logic`
4. `Login / Return To Studio`
5. `Register / Mission First`
6. `Onboarding / Step 1 Mission`
7. `Onboarding / Step 2 Starting Mode`
8. `Onboarding / Step 3 Provider + Demo`
9. `Studio / Home`
10. `Studio / Projects`
11. `Studio / AI Task Console`
12. `Workbench / IDE`
13. `Workbench / Preview Validation`
14. `Workbench / Approval Flow`
15. `Workbench / Multi-Agent Run`
16. `Billing / Current Plan + Usage`
17. `Settings / AI + Runtime`
18. `Status / Public`
19. `Monitoring / Ops`
20. `AI Monitor / Production Evidence`
21. `Admin / Control Surface`
22. `Mobile / Studio`
23. `Mobile / Workbench`

## 16. What To Remove From Current UX

Remove or downgrade:
- explanatory paragraphs used instead of hierarchy
- duplicate sidebars and parallel navigation schemes
- metrics without action value
- preview controls that expose infra too early
- equal prominence for secondary/lab areas
- chat-like duplication of agent activity
- cards that exist only to repeat text already visible elsewhere

## 17. What To Preserve

Preserve and elevate:
- anti-fake-success truth model
- command palette as a central operating primitive
- preview as validation core
- multi-agent role framing
- billing/runtime/readiness as explicit trust layer
- dashboard -> IDE continuity
- command and operator mindset

## 18. Execution Order

### Phase 1
- foundations
- AI objects
- navigation
- dashboard home
- AI task console
- IDE shell

### Phase 2
- preview validation
- onboarding
- billing
- settings
- status/monitoring

### Phase 3
- landing/pricing/public polish
- mobile surfaces
- live/operator future dock

## 19. Definition Of Done

The blueprint is only complete when:
- every surface has one dominant intent
- AI is visible as system state, not just messages
- approvals are first-class
- cost and confidence are contextual
- memory is explicit and editable
- preview feels like validation, not infrastructure
- dashboard and IDE feel like one operating system
- governance is mature but not intrusive
- the Figma file can be implemented frame by frame without gaps
