# 03_CONTACT_SALES
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Public

## Mission
Open a serious sales conversation with enough structured context to route the lead correctly.
This page exists to collect commercial intent, technical constraints and buying context in one pass without turning into a support inbox or architectural essay.

## Critical Opinion
### What this page should be
- a high-signal enterprise intake surface
- a calm and credible handoff from public marketing into commercial conversation
- structured enough that the sales team knows what happens next without re-asking basics

### What this page should not be
- a generic contact form
- a support page in disguise
- a wall of product explanation trying to justify the price
- a page where the side rail becomes more visually interesting than the form

### Current product risk this page must correct
The current product language often over-explains itself.
Contact Sales has to do the opposite:
- ask only for routing-critical information
- show the next step clearly
- preserve momentum into a human conversation

## Primary CTA
- `Send request`

## Secondary CTA
- `Email sales`
- `Back to pricing`

## Benchmark Alignment
### From enterprise contact surfaces used by serious B2B tools
Absorb:
- strong form-first layout
- explicit expectation setting
- fields that map to routing, not vanity enrichment

### What to avoid copying
- giant side illustrations
- multi-step wizard for a simple lead capture
- generic dropdown noise that adds no qualification value

## Layout Grid
- desktop split: 7 columns form, 5 columns supporting rail
- max width: 1200 px
- outer padding: 32 px desktop, 24 px tablet, 16 px mobile
- on tablet and mobile the rail stacks below the form
- form body width constrained so long textarea content stays readable

## Information Hierarchy
1. sales framing header
2. primary form
3. process rail with next-step explanation
4. backup contact and trust note

## Layout Anatomy
### Section 1: Header
Contains:
- eyebrow
- headline
- one-line subheadline
- short note about response path

Why:
The buyer needs to know what kind of conversation this is before filling anything.

### Section 2: Sales Form
Contains exactly the information needed to route the request:
- identity
- company
- team and role
- primary use case
- constraints or blockers

Why:
The form should collect enough context to make the first human reply useful.
That is the threshold. Anything beyond that increases abandonment.

### Section 3: Process Rail
Contains:
- 3-step expectation strip
- trust markers
- direct backup email
- short response SLA statement

Why:
Enterprise buyers want to know what happens after submit.
The rail removes ambiguity without competing with the form.

## Component Tree
### SalesHeader
- Eyebrow
- Headline
- Subheadline
- ResponseExpectationLine

### SalesForm
- IdentitySection
- CompanySection
- TeamSection
- UseCaseSection
- RequirementSection
- ConsentRow if legally required
- SubmitRow

### FieldShell
- Label
- Input or Select or Textarea
- HelperText
- InlineValidation

### ProcessRail
- StepCard x3
- TrustList
- BackupContactCard
- ResponseSLA

### SuccessPanel
- SuccessHeadline
- SummaryPreview
- NextStepList
- EmailFallbackLink

## Detailed Component Specs
### SalesHeader
Exact order:
1. eyebrow
2. headline
3. subheadline
4. response expectation line

Rules:
- headline should speak to commercial or team-level intent, not product philosophy
- subheadline stays under two lines on desktop
- response expectation line uses compact text or pill, not a paragraph

Opinion:
This header should feel like the beginning of a qualified conversation, not a support request.

### SalesForm
Exact field order:
1. full name
2. work email
3. company
4. role
5. team size
6. primary use case
7. timeline or urgency
8. requirements or blockers
9. submit row

Why this order:
- identity first for confidence
- company context second
- qualification fields before the large freeform textarea
- the textarea comes late so the user already has enough structure

Rules:
- every field has persistent label
- helper text stays short and operational
- placeholders are examples, not hidden labels
- inline validation appears under the field, not only on submit
- textarea should autosize within a bounded height and then scroll internally

### IdentitySection
Contains:
- full name input
- work email input

Rules:
- work email clearly prefers business email
- if domain looks personal, helper copy should suggest business email without blocking the user unnecessarily

### CompanySection
Contains:
- company name
- role

Rules:
- role can be free text or compact combobox if taxonomy is stable
- avoid over-taxonomizing titles; buyers often have nuanced roles

### TeamSection
Contains:
- team size selector
- timeline selector or urgency selector

Team size options should be broad enough to support routing:
- solo or 1
- 2-10
- 11-50
- 51-250
- 250+

Timeline options should map to routing urgency without overcomplication.

### UseCaseSection
Contains:
- primary use case selector
- optional secondary use case chips if needed

Good categories:
- product teams building apps or sites
- game or cinematic production
- AI workflow and multi-agent orchestration
- enterprise governance and secure environments
- internal tools and operational systems

Rules:
- categories should reflect Aethel's real strengths
- do not include niche categories that route nowhere

### RequirementSection
Contains:
- large textarea
- optional prompt examples below the label

Good example prompts:
- need preview sandbox and approval gates for a game pipeline
- need secure provider routing, audit logs and SSO for internal operators
- want to use one workspace for product site, trailer and shared assets

Opinion:
This textarea is where the buyer should be able to explain the real blocker.
Keep the prompt examples practical, not marketing-flavored.

### SubmitRow
Contains:
- primary CTA
- privacy or follow-up note
- optional backup email link

Rules:
- CTA is the visual anchor
- the support note stays short and lower-contrast
- do not put multiple equal-weight actions here

### ProcessRail
Three cards only:
1. share context
2. we review fit and constraints
3. we reply with next step

Supporting modules:
- trust list with 3-4 bullets max
- backup contact card
- response SLA line

Opinion:
This rail should reassure the buyer, not become a marketing article.
Every extra sentence increases cognitive drag.

### SuccessPanel
Purpose:
- replace the form after successful submit with a clear next-step state

Contains:
- thank-you headline
- short summary of submitted context
- what happens next in 2-3 bullets
- backup email action
- optional return links to pricing or home

Rules:
- never show an empty thank-you dead end
- preserve submitted context summary so the user trusts the form worked

## Button Inventory
### Primary button
- `Send request`

### Secondary buttons
- `Email sales`
- `Back to pricing`

### Rules
- the primary CTA appears once in the form footer
- `Email sales` should be a backup path, not a competing dominant CTA
- if the form errors, the CTA label may change to `Try again` only if that improves clarity

## Microinteractions
- submission preserves all form content on failure
- invalid fields scroll into view and receive focus in order
- changing team size or use case can update helper text or process notes, but never reshuffle the layout
- textarea examples can collapse after input begins to reduce noise
- success state crossfades or replaces the form shell without jumping the page height abruptly

## Cross-Component Behavior
- use case selection can update requirement helper examples
- team size or urgency may update the response expectation line, but only in copy, not structure
- if the user comes from Pricing, plan context can prefill the subject line or supporting copy
- the rail should mirror the same plan and governance vocabulary used on Pricing to avoid tonal drift

## States
### Empty
- all fields blank
- process rail visible
- helper examples present

### Validation error
- fields preserve input
- inline errors visible
- CTA stays enabled after correction

### Submitting
- CTA shows progress state
- inputs lock to prevent accidental double submit
- page layout remains stable

### Success
- form replaced by success panel
- summary of captured context visible
- next-step expectation explicit

### Failure with preserved content
- top-level error banner above form
- field content preserved
- CTA re-enabled

## Accessibility and Content Rules
- labels never rely on placeholders alone
- required fields clearly marked without excessive visual noise
- error states use icon, text and color together
- process steps should remain readable when zoomed or on small screens
- mobile keyboard behavior must not hide the primary CTA permanently

## Figma Frame Requirements
- Contact Sales desktop default
- Contact Sales desktop with validation errors
- Contact Sales desktop success state
- Contact Sales mobile default
- Contact Sales mobile success state
