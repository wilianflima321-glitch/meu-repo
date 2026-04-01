# 14_DOCS_HELP
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Public and Studio-supporting

## Mission
Help the user learn, recover and deepen usage without overwhelming them.
This surface should act as a task-first guide system connected to onboarding, blocked states, workbench context and governance recovery.

## Critical Opinion
### What this page should be
- task-first
- searchable
- connected to real product states
- useful both as a destination and as contextual support

### What this page should not be
- a wiki dump
- a roadmap page in disguise
- a duplicate of settings, billing or status content
- a place where internal notes leak into user-facing guidance

### Current product risk this page must correct
Aethel already has a very large documentation footprint.
The docs/help experience must reduce that complexity for end users by surfacing only:
- the right task
- the right recovery step
- the right next guide
- the right in-product jump back

## Primary CTA
- `Search docs`

## Secondary CTA
- `Open guide`
- `Open in product`
- `Related guide`

## Benchmark Alignment
### From strong product docs surfaces
Absorb:
- search first
- task-oriented categories
- contextual in-product help links
- article layouts with sticky outline and adjacent next steps

### From Manus-style research experiences
Absorb:
- evidence-aware summaries instead of vague article intros
- clearer transitions from exploration to structured outputs
- stronger support for compare, extract and task decomposition in research-heavy guides

Apply to Aethel docs/help:
- guides about research, AI Console and connected flows should show source-aware examples
- advanced guides should privilege actionable structures such as checklists, comparison tables and output patterns
- help content should bridge directly into Workbench research and preview flows

### What to avoid copying
- giant undifferentiated wiki homepages
- knowledge-base taxonomies that require the user to learn the system before solving a task
- article pages with no way back into the product flow

## Layout Grid
- docs landing max width: 1240 px
- article page content width: 720 px readable column plus right rail
- search and category navigation visible above the fold
- mobile collapses right rail into bottom sheet or inline sections

## Information Hierarchy
1. search and top tasks
2. category access
3. guide cards grouped by user intent
4. article content with outline and related actions
5. in-product help reuse

## Layout Anatomy
### Section 1: Docs Landing Header
Contains:
- search field
- category rail
- one-line framing copy
- top tasks strip

Why:
Users often arrive with a problem, not a documentation taxonomy in mind.
The landing page must orient around intent immediately.

### Section 2: Guide Groups
Contains groups such as:
- Getting started
- Workbench and flows
- AI Console and approvals
- Preview, assets and runtime
- Billing, settings and team
- Recovery and status

Why:
The groups should map to product workflows and moments, not to internal org charts.

### Section 3: Article Page
Contains:
- article title and summary
- article content column
- sticky outline
- related guides panel
- quick actions back into product

Why:
An article should not trap the user. It should teach, orient and hand them back to the right place.

### Section 4: In-Product Help Pattern
Contains:
- compact contextual callout
- exact article deep-link
- recovery or next-step CTA

Why:
The same docs system should support onboarding, blocked states and workbench guidance.
That requires consistent article metadata and section anchors.

## Component Tree
### DocsLandingHeader
- SearchField
- SearchShortcutHint
- CategoryRail
- FramingCopy
- TopTaskPills

### GuideGroup
- GroupHeader
- GuideCard xN
- ViewAllLink if needed

### GuideCard
- TaskTitle
- OneSentenceSummary
- AudienceOrDifficultyChip if useful
- EstimatedTimeChip if useful
- OpenGuideButton

### ArticleLayout
- ArticleHeader
- ArticleMetaRow
- ArticleContent
- StickyOutline
- RelatedGuidesPanel
- ProductActionPanel

### InProductHelpCallout
- ContextLabel
- GuideTitle
- ShortReason
- OpenGuideButton
- OpenInProductButton

## Detailed Component Specs
### DocsLandingHeader
Exact order:
1. search field
2. category rail
3. framing copy
4. top task pills

Rules:
- search must dominate visually over category browsing
- category rail should use plain labels tied to workflows
- framing copy stays under one sentence
- top task pills should represent real user jobs, not internal topics

Opinion:
Search is the homepage of documentation. Category browsing is a fallback, not the star.

### SearchField
Contains:
- input
- search icon
- keyboard hint if applicable
- suggestion panel on focus or input

Suggestion grouping priority:
1. tasks
2. guides
3. product areas

Rules:
- suggestions should not be title-only; each suggestion needs enough context to choose confidently
- failed searches should propose nearby tasks or categories rather than a blank state

### CategoryRail
Good categories:
- Getting started
- Workbench
- AI Console
- Preview and assets
- Team and billing
- Recovery and status

Rules:
- categories should stay stable across docs landing and article navigation
- avoid categories that mirror internal team structure or code modules

### GuideGroup
Each group contains 3-6 guides max on the landing page.
The group header should explain the user intent in one short line.

Opinion:
The landing page should feel curated, not exhaustive.
If every guide appears at once, the page fails its filtering job.

### GuideCard
Contains:
- task title
- one-sentence summary
- audience or difficulty chip only if it helps selection
- estimated time chip only if the estimate is honest
- open guide action

Rules:
- titles must be task-first, for example `Set up your first project`, not `Project initialization overview`
- summaries should explain the result of reading the guide, not the topic area
- cards should remain compact and uniform in height within a row

### ArticleLayout
Structure:
- title
- summary
- metadata row
- content body
- sticky outline right rail
- related guides panel
- product action panel

Research-heavy article rules:
- use comparison tables when contrasting flows, preview types or AI behaviors
- use evidence or source-aware callouts when the guide depends on research workflows
- end advanced articles with clear "apply in Workbench" actions rather than passive reading stops

Metadata may include:
- updated date
- intended audience
- estimated time
- prerequisite state

Rules:
- sticky outline should track headings and stay simple
- product action panel should surface relevant deep links such as `Open Workbench`, `Open Settings`, `Open Billing`
- related guides should be contextual to the current task, not generic docs recommendations

Opinion:
The article page should teach one task cleanly. It should not become a book chapter.

### InProductHelpCallout
Purpose:
- embed docs support inside the product where confusion or failure is likely

Use cases:
- onboarding step with extra explanation
- blocked preview state
- provider configuration issue
- approval workflow confusion

Contains:
- context label
- specific guide title
- one-line reason why this guide matters now
- open guide CTA
- open in product CTA if relevant

Rules:
- callouts must be precise, not generic `Learn more` boxes
- the guide link should deep-link to the exact relevant section whenever possible

## Button Inventory
### Primary buttons
- `Search docs`
- `Open guide`

### Secondary buttons
- `Open in product`
- `Related guide`
- `View all guides`

### Rules
- docs actions should move the user toward task completion
- `Open in product` should only appear when the guide has a concrete product destination
- article pages should not overflow with navigation buttons

## Microinteractions
- search suggestions group by tasks before raw document titles
- selecting a category filters guide groups without a full page jump when possible
- sticky outline highlights the current section while scrolling
- in-product help callouts should preserve return context when opening a guide in a panel or new view
- article links to product areas should be route-aware and precise, not generic home links

## Cross-Component Behavior
- onboarding, status, settings and workbench blocked states should all pull from the same guide metadata system
- article pages should surface related guides from the same workflow family, not from unrelated docs categories
- if the user opens docs from a product surface, `Open in product` should route back into that same context when possible
- search suggestions should be influenced by the current surface when docs are opened in-product

## Content Rules
- task-first titles
- short summaries
- examples over theory
- screenshots and annotated crops where useful
- no duplicate policy text from billing, status or settings pages
- no roadmap promises in docs/help

## States
### Landing default
- search visible
- top tasks visible
- curated guide groups visible

### Search results
- grouped results
- best match highlighted
- fallback suggestions if no exact match

### Article default
- sticky outline visible
- related guides visible
- product actions visible when relevant

### In-product callout
- compact, contextual, and task-specific

## Accessibility and Content Rules
- search suggestions must be fully keyboard navigable
- article outlines should remain useful for screen readers and keyboard users
- link labels must describe the destination task, not just `learn more`
- mobile article layout must preserve hierarchy without overwhelming the viewport

## Figma Frame Requirements
- Docs landing
- Docs search active state
- Docs search no-results fallback
- Article page
- Article page with sticky outline active state
- In-product contextual help block
- Mobile article state
