# 01_HOME
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Public

## Mission
Sell the category in one glance.
The page must make Aethel feel like one premium studio for creation, execution, preview and validation with AI.

## Critical Opinion
### What this page should be
- category-defining
- visually confident
- product-led
- impossible to confuse with a generic AI chat or SaaS dashboard

### What this page should not be
- a manifesto wall
- a technical dashboard
- a collage of unrelated modules
- a landing page that depends on long explanation to be understood

## Primary User Questions
- What is this product?
- Why is it better than a chat tool or builder?
- What can I do first?
- Where do I start?

## Primary CTA
- `Open Studio`

## Secondary CTA
- `Watch Workflow`
- `See Pricing`

## Layout Grid
- max content width: 1280 px
- hero split: 5 columns text / 7 columns product visual on 12-column grid
- inter-section spacing: 96 px desktop, 72 px tablet, 48 px mobile
- text column width in hero: max 560 px

## Information Hierarchy
1. Category and headline
2. Product visual proof
3. Primary CTA
4. Workflow proof
5. Differentiation
6. Pricing teaser
7. Footer

## Layout Anatomy
### Section 1: Hero
Left side:
- eyebrow or category badge
- headline
- one short subheadline
- CTA row
- one compact trust row

Right side:
- dominant screenshot of the Workbench
- screenshot must show editor, preview, AI console and preview deck at once
- optional callout hotspots on top of screenshot, maximum three

### Section 2: Three-step workflow
Three cards only:
- Start with a project mission
- Build inside the Workbench
- Validate and publish
Each card includes:
- title
- one-line explanation
- small real product crop
- tiny directional arrow or sequence marker

### Section 3: Product proof strip
Three proof chips only.
Examples:
- Unified Workbench
- Context-aware AI
- Web, 3D and media preview

### Section 4: Why it is different
Three columns only.
Each column includes:
- short heading
- one sentence
- one visual cue or compact icon

### Section 5: Pricing teaser
- three compact pricing cards
- one shared CTA row below if needed

### Section 6: Footer
- Product
- Company
- Resources
- Legal

## Detailed Component Specs
### PublicHeader
Slots:
1. BrandMark
2. NavGroup
3. `Docs`
4. `Pricing`
5. `Status`
6. `Sign in`
7. `Open Studio`

Rule:
- only one strong entry CTA in the header
- the header must remain calm; do not add product-category dropdowns here
- nav labels stay short and literal

### HeroStatement
Contains:
- EyebrowBadge
- Headline
- Subheadline
- CTACluster
- TrustStrip

Rule:
- headline is the only large text block in the hero
- subheadline must be one sentence, not a paragraph
- trust strip must be factual and short

Opinion:
This block must feel decisive.
If the headline sounds like an internal strategy memo, the whole page fails.

### HeroScreenshot
Must visibly contain:
- editor area
- preview area
- AI console area
- preview deck or connected-flow cue

Optional overlays:
- three hotspots maximum
- one mode chip maximum

Opinion:
If the hero visual looks like a generic dashboard, the entire home page fails.
The screenshot must prove the product category visually.

### WorkflowStepCard
Contains:
- StepNumber
- StepTitle
- StepDescription
- StepCrop

Rule:
- each card explains one stage only
- cards must visually connect in sequence
- product crops must look like the same system, not three unrelated screens

### DifferenceGrid
Each column must answer one sharp question:
- why not a plain AI chat
- why not a plain IDE
- why not a plain no-code builder

Rule:
- no column should exceed one sentence plus one supporting phrase
- avoid long checklists here

### PricingTeaser
Contains:
- compact plan cards
- one short transition line
- CTA cluster

Rule:
- teaser creates confidence and momentum
- it does not replace the pricing page

## Interactions Between Components
- header CTA and hero CTA both point to the same primary path
- workflow step cards should reinforce the same product story as the hero screenshot
- pricing teaser should reinforce the decision, not introduce a new narrative
- footer should help exit to docs, status or sales without pulling attention above the CTA sections

## Button Inventory
### Header
- `Open Studio`
- `Pricing`
- `Docs`
- `Status`
- `Sign in`

### Hero
- `Open Studio`
- `Watch Workflow`

### Pricing teaser
- `Choose Plan`
- `Talk to Sales`

## Microinteractions
- header condenses slightly on scroll
- hero screenshot hotspots highlight on hover
- workflow cards raise subtly on hover, but do not animate excessively
- CTA hover should feel precise and fast, not playful

## Copy Rules
- headline describes the category, not the technology stack
- subheadline explains the value in one sentence
- avoid internal words like readiness, blockers, orchestration, enterprise in the hero
- no paragraph longer than 24 words in the first fold

## Visual Rules
- product visual must dominate more than decorative gradients
- use one dominant screenshot, not a collage of tiny UI fragments
- public surfaces should feel premium and calm, not dark-noisy or sci-fi cluttered

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

### What to avoid copying
- endless social proof walls
- gradient-heavy noise replacing hierarchy
- multi-hero layouts that force the user to assemble the story themselves

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
