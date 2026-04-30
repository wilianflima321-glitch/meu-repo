# 01_HOME
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Public

## Mission
Make Aethel feel like an AI app immediately while still pointing honestly toward a deeper Studio.
This page must feel closer to Firebase Studio, ChatGPT, Gemini and Manus than to a classic SaaS landing page.

## Critical Opinion
### What this page should be
- mission-first
- app-like
- low-anxiety
- product-led
- impossible to confuse with a generic marketing site

### What this page should not be
- a manifesto wall
- a feature grid explosion
- a collage of unrelated modules
- a hero that explains more than it proves

## Primary User Questions
- What is this product?
- What can I ask it to do?
- How do I start without getting lost?
- When do I go into Studio?

## Primary CTA
- `Start a Mission`

## Secondary CTA
- `Open Studio`
- `See Workflow`

## Layout Grid
- max content width: 1280 px
- hero split: 5 columns text / 7 columns product visual on 12-column grid
- inter-section spacing: 96 px desktop, 72 px tablet, 48 px mobile
- text column width in hero: max 560 px

## Information Hierarchy
1. Mission input
2. Prompt suggestions and domain triage
3. Continue recent work
4. Connected tools
5. Studio proof
6. Lightweight trust proof
7. Footer

## Layout Anatomy
### Section 1: Hero
Dominant center:
- mission input card
- one short headline
- one sentence of support copy maximum
- suggestion chips
- domain triage row

Secondary support zones:
- recent mission continuation
- connected tools rail
- compact Studio proof card

### Section 2: Start points
Six compact domain or mission cards maximum:
- Apps / Sites
- Research
- Cloud / DevOps
- Growth / Ops
- Games
- Films / Media

### Section 3: Continue where you left off
- recent mission cards only
- open state, blocked state, ready-for-review state supported

### Section 4: Connected tools
- compact icons and labels for connected services
- examples:
  - GitHub
  - Vercel
  - Cloudflare
  - Stripe
  - Notion

### Section 5: Studio proof
- one compact card proving there is a deeper environment
- not a huge marketing screenshot

### Section 6: Footer
- Product
- Company
- Resources
- Legal

## Detailed Component Specs
### PublicHeader
Slots:
1. BrandMark
2. `Docs`
3. `Pricing`
4. `Status`
5. `Sign in`
6. `Open Studio`

Rule:
- keep the header short and calm
- do not add category-navigation clutter here
- nav labels stay short and literal

### MissionHero
Contains:
- Headline
- OneSentenceSupport
- MissionInput
- MissionSuggestionChips
- DomainTriageRow
- CTACluster

Rule:
- the mission input is the main object on the page
- support copy must stay shorter than the input affordance
- this must feel like an app surface, not a hero banner

Opinion:
If this block feels like marketing instead of starting work, the page fails.

### MissionInput
Must support:
- one-line natural-language mission
- placeholder that implies action, not chat
- attach/import affordance
- optional connected-account cue

Examples:
- Configure my domain and publish my site
- Fix the failing deployment on Vercel
- Research competitors and create a launch brief
- Build a marketing site and open it in Studio

### DomainTriageRow
Purpose:
- reduce anxiety
- make the user feel understood quickly
- route into the correct starting grammar

Opinion:
These cards should feel like starting modes, not feature tiles.

### RecentMissionRail
Contains:
- MissionCard
- state chip
- progress cue
- reopen action

Rule:
- maximum three visible missions by default
- must favor continuation over browsing

### ConnectedToolsRail
Contains:
- compact connected service pills or cards
- one short line explaining cross-tool execution

Rule:
- no giant logos section
- no fake customer noise here

### StudioProofCard
Contains:
- small Studio crop
- one sentence
- `Open Studio` action

Rule:
- this proves depth without stealing the homepage
- it must not dominate the mission input

## Interactions Between Components
- header `Open Studio` and hero `Open Studio` both open the deeper mode
- `Start a Mission` routes into Mission Control with the task already initialized
- recent mission cards resume the last meaningful task context
- connected tools prime trust that the product can act across services

## Button Inventory
### Header
- `Docs`
- `Pricing`
- `Status`
- `Sign in`
- `Open Studio`

### MissionHero
- `Start a Mission`
- `Open Studio`

### Optional lower-page actions
- `See Workflow`
- `Talk to Sales`

## Microinteractions
- header condenses slightly on scroll
- suggestion chips should feel tappable but calm
- domain cards may raise subtly on hover
- recent mission cards must reveal resume state clearly

## Copy Rules
- one short headline
- one support sentence
- little visible infrastructure language
- no paragraph longer than 20 words in the first fold
- avoid words like orchestration, enterprise, runtime, governance in the hero

## Visual Rules
- input and action surface must dominate more than decorative gradients
- avoid screenshot collage
- public surfaces should feel premium and calm, not noisy or speculative

## States
### Default
- all modules visible and balanced

### Low connectivity or missing dynamic data
- fallback to static visual proof
- never leave the hero empty

## What To Avoid
- long operational explanations
- multiple product narratives competing in the first fold
- banners about blockers, runtime or billing setup
- dense feature matrices on the home screen

## Figma Frame Requirements
- Home desktop hero
- Home desktop mid-scroll with workflow section
- Home mobile
- Home hover states for header and CTA

## Entry and Exit
- Entry: direct visit, campaign, docs referral
- Exit: auth, pricing, docs, contact sales


## Benchmark Alignment
### From premium product-led home pages
Absorb:
- one dominant product image
- one dominant action path
- one clear category statement
- fast scan from claim -> proof -> next step

### From VS Code / Firebase / Replit style product communication
Absorb:
- product-first proof instead of decorative abstraction
- workflow continuity as the main story, not model count or features

### From Genspark
Absorb:
- immediate sense that one workspace can produce many artifact types
- confidence that AI is connected to real deliverables, not only conversation
- directness in showing what the system can output

Reject:
- homepage language that over-centers "ask anything" without proving structural depth
- too many top-level tool promises competing with the core product story
- AI-workspace mystique without a clear production shell visible in the hero

### What to avoid copying
- endless social proof walls
- gradient-heavy noise replacing hierarchy
- multi-hero layouts that force the user to assemble the story themselves
- generic "all-in-one AI" claims with weak visual proof
- shipping a homepage that feels smarter than the actual Workbench

## Exact Component Geometry
### PublicHeader
- height: `72 px`
- max inner width: `1280 px`
- left cluster: brand + nav
- right cluster: utility links + primary CTA
- header condenses to `64 px` on scroll

### HeroStatement
- max text width: `560 px`
- eyebrow spacing above headline: `12 px`
- headline to subheadline gap: `16 px`
- CTA row gap: `12 px`
- trust strip gap from CTA row: `16 px`

### HeroScreenshot
- recommended desktop frame: `920 x 620 px` visible area
- screenshot sits inside one elevated shell, not a collage
- max three callout hotspots and one mode chip only

### WorkflowStepCard
- min width: `280 px`
- min height: `280 px`
- internal padding: `20-24 px`
- step crop ratio target: `16:10`

### DifferenceGrid
- 3 equal columns desktop
- stacked cards tablet/mobile
- icon or visual marker fixed to top-left of each column

### PricingTeaser
- compact 3-card row desktop
- stacked on mobile
- no more than `200 px` visual height per compact plan card before CTA area

## HeroScreenshot Contract
The hero screenshot must prove all of the following in one composition:
- real editor or canvas surface
- real preview surface
- real AI console presence
- evidence of connected or parallel flows

It must not show:
- empty placeholder workspace
- a dashboard-like metrics wall
- a generic chat-first layout
- decorative overlays that hide the actual interface

Recommended composition:
- center-left: editor or canvas
- center-right: preview
- far right or overlay rail: AI console
- bottom band or small strip: preview deck or connected flow cues

Opinion:
The home page lives or dies on this asset. If this image looks ordinary, the page cannot carry the category ambition.

## TrustStrip Rules
Allowed items:
- one product truth statement
- one operational proof statement
- one governance or team-readiness statement

Examples:
- `One workbench for build, preview and review`
- `Parallel AI runs with approval gates`
- `Connected flows for app, game, film and assets`

Rules:
- max three items
- each item under 8 words if possible
- no metric vanity unless it is independently credible and current

## WorkflowStepCard Detailed Anatomy
### Exact order
1. step number or sequence marker
2. step title
3. one-line description
4. product crop
5. small transition cue or next indicator

Step-specific intent:
- card 1 explains how work starts
- card 2 explains how work happens
- card 3 explains how output is validated and shipped

Opinion:
These cards should read like one continuous production loop. If each card markets a different product, the whole home page fractures.

## DifferenceGrid Detailed Anatomy
Column 1 question:
- why not just use a chat window

Column 2 question:
- why not just use an IDE

Column 3 question:
- why not just use a builder

Each column contains:
- compact heading
- one sentence answer
- one supporting phrase or cue

Rules:
- each answer must sound like a product decision, not a slogan
- this section is for disambiguation, not feature inventory

## PricingTeaser Detailed Anatomy
Contains:
- section label
- three compact plan cards
- one transition line
- CTA row

Compact plan card order:
1. plan name
2. one-line fit statement
3. price anchor
4. one short capability line
5. CTA

Rules:
- teaser cards do not repeat the full pricing page structure
- CTA row should prefer `See pricing` plus one direct action if needed

## Responsive Rules
### Desktop
- hero remains split layout
- screenshot stays dominant and full-fidelity
- workflow cards remain 3-up

### Tablet
- hero text and screenshot stay separate but may shift to 6/6 balance
- workflow cards can become stacked 2 + 1 or full row stack depending on width

### Mobile
- headline first
- CTA row second
- screenshot third
- trust strip after screenshot
- workflow cards stacked vertically
- difference grid stacked vertically
- pricing teaser simplified to one primary CTA plus compact cards

## Scroll Story Contract
The user should understand this sequence while scrolling:
1. what Aethel is
2. what the Workbench looks like
3. how the workflow works
4. why it is different from chat/IDE/builder tools
5. how to start

If any section introduces a second narrative, it should be cut.

## Cross-Surface Handoff Rules
- header CTA and hero CTA must route to the same primary path
- `Watch Workflow` should jump to an on-page workflow section or open a concise media/demo state, not a disconnected experience
- `See Pricing` must preserve product vocabulary established in the hero
- docs/status/footer exits should remain clearly secondary to entering the product
