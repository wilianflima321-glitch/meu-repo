# 02_PRICING
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Public

## Mission
Make the plan decision fast, legible and low-anxiety.
This page exists to answer one question: what is the right path for this buyer right now?
It is not allowed to become a manifesto, a technical billing explainer, or a second marketing home page.

## Critical Opinion
### What this page should be
- a decision surface
- calm, high-contrast, and low-noise
- explicit about what each plan unlocks in the actual Aethel workflow
- honest about self-serve vs enterprise boundaries

### What this page should not be
- a card wall with every plan screaming at the same volume
- a token-cost lecture
- a feature dump with 40 rows of low-signal comparison data
- a place where enterprise copy overpowers self-serve selection

### Current product risk this page must correct
The repo already communicates too much in long-form text. Pricing has to reverse that pattern.
The buyer should not need to interpret platform architecture to choose a plan.
The page must explain purchase impact in the language of outcomes:
- how many projects or teams can I run
- how much AI and preview capacity do I get
- when do I need enterprise governance

## Primary CTA
- `Start with Free`
- `Choose Pro`
- `Choose Studio`

## Secondary CTA
- `Talk to Sales`
- `Compare plans`

## Benchmark Alignment
### From Stripe- and Linear-style pricing surfaces
Absorb:
- immediate readability
- one recommended tier
- low-friction monthly/yearly toggle
- strong plan boundaries

### From product-led tools like Replit and Vercel
Absorb:
- language tied to workflow and usage, not only feature bullets
- clear boundary between self-serve and enterprise

### What to avoid copying
- over-animated card treatments
- fake urgency
- long FAQ stacks before the plan decision

## Layout Grid
- desktop max width: 1280 px
- outer padding: 32 px desktop, 24 px tablet, 16 px mobile
- hero width constrained to 720 px for headline + supporting line
- plan cards: 3-up on desktop, 2-up on tablet if spacing allows, single column on mobile
- enterprise rail: full-width band below self-serve cards on desktop and mobile
- comparison table: own section with full-width scroll container

## Information Hierarchy
1. pricing frame and billing period
2. three self-serve plans
3. recommended-plan emphasis and enterprise handoff
4. comparison table with only decision-driving rows
5. short FAQ
6. enterprise rail

## Layout Anatomy
### Section 1: Pricing Header
Contains:
- eyebrow or short frame label
- pricing headline
- one-line subheadline
- billing cycle toggle
- one support sentence only

Why:
The buyer should understand the commercial model before seeing the cards.
This section frames the decision; it does not sell the whole product again.

### Section 2: Plan Card Grid
Contains exactly three visible self-serve cards:
- Free
- Pro
- Studio

Why:
Three self-serve choices are the upper bound before decision quality drops.
Anything beyond that belongs in enterprise conversation, not in the main card grid.

### Section 3: Enterprise Rail
Contains:
- short enterprise headline
- governance and procurement framing
- CTA to contact sales
- proof points: SSO, auditability, custom limits, support

Why:
Enterprise should be discoverable without disrupting the self-serve decision path.

### Section 4: Comparison Table
Contains:
- sticky feature name column on desktop
- the three self-serve plans plus Enterprise summary column
- only rows that materially affect buying decisions

Why:
The table exists to reduce uncertainty after a card catches interest.
It is not the first thing the eye should land on.

### Section 5: FAQ
Contains 4-6 short Q and A items only.
Topics:
- billing cycle change
- AI usage limits
- preview/runtime availability
- enterprise onboarding
- cancellation or downgrade

Why:
FAQ is for resolving purchase blockers, not for adding a second product story.

## Component Tree
### PricingHeader
- PricingEyebrow
- PricingHeadline
- PricingSubheadline
- BillingCycleToggle
- SavingsPill
- BillingNote

### PlanCard
- AudienceLabel
- RecommendedBadge
- PlanName
- PriceBlock
- BillingCadenceLine
- PromiseLine
- CapabilityList
- LimitList
- SupportLine
- CTAButton
- SecondaryTextLink

### ComparisonTable
- TableHeaderRow
- DecisionRowGroup
- ExpandMoreRowsButton
- TableFootnote

### EnterpriseRail
- EnterpriseIcon
- EnterpriseHeadline
- EnterpriseSupportingLine
- EnterpriseCapabilitiesList
- EnterpriseCTAGroup

### FAQAccordion
- FAQItem
- FAQTrigger
- FAQBody

## Detailed Component Specs
### PricingHeader
Visual role:
- sets confidence and pricing frame
- gives the user one calm entry into the page

Exact order:
1. eyebrow
2. headline
3. subheadline
4. toggle row
5. billing note

Interaction rules:
- billing cycle toggle must update numbers instantly with no card height jump
- any annual savings message updates inline, not through a toast
- the billing note should remain fixed height across monthly/yearly states

Opinion:
If the header becomes too explanatory, the page loses commercial sharpness.
The correct tone is clear and restrained.

### BillingCycleToggle
Structure:
- monthly option
- yearly option
- savings pill attached to yearly when relevant

Behavior:
- segmented control, not dropdown
- updates all prices in place
- the selected segment must have obvious focus, hover and keyboard states
- URL or local state should preserve the choice during navigation when practical

Opinion:
This is a high-frequency comparison control. It has to feel instant and boring in the best way.

### PlanCard
Exact content order:
1. audience label
2. recommended badge if applicable
3. plan name
4. price block
5. billing cadence line
6. promise sentence
7. capability list
8. limits line group
9. support line
10. CTA
11. secondary note if needed

Visual rules:
- identical vertical structure across all cards
- CTA row aligned to the same baseline in every card
- card heights normalized on desktop
- recommended card gets stronger border, elevation and subtle glow, not novelty motion

Interaction rules:
- hover elevates the whole card slightly
- focusing a CTA also draws a subdued focus treatment around the card shell
- clicking anywhere in the card should not trigger selection unless explicitly intended; CTA stays primary

Opinion:
The card must communicate who the plan is for before it explains what is included.
Buyers map themselves to audience labels faster than they parse dense feature lists.

### PriceBlock
Contains:
- main numeric price
- currency symbol
- cadence label
- optional crossed previous price only when real, not fabricated

Rules:
- numeric price is the optical anchor of the card
- cadence line stays directly below, never off to the side
- avoid microcopy like `best value` near the price itself; that belongs in recommendation treatment

### CapabilityList
Use 4-6 bullets max.
Bullets must describe workflow benefits, not implementation trivia.
Good examples:
- build and validate production flows in one workbench
- parallel AI runs with approval gates
- advanced preview and runtime controls
Bad examples:
- 25 model routers
- websocket support
- css variables

### LimitList
Contains concise limit statements grouped by category:
- projects/workspaces
- AI usage
- preview/runtime capacity
- collaboration/governance

Rules:
- use compact rows or chips, not prose blocks
- if a limit is soft or contact-based, say so clearly
- never hide the practical ceiling behind vague words like `generous`

### ComparisonTable
Rows allowed:
- projects/workspaces
- AI runs or usage envelope
- preview/runtime access
- deployment and exports
- collaboration and roles
- governance/security
- support

Rows to avoid:
- vanity brand differentiators
- deeply technical backend features
- restatements already obvious from card bullets

Interaction rules:
- table opens collapsed to `key differences` rows
- `Expand more rows` reveals secondary details inline
- sticky first column on desktop; simple stacked comparison cards on mobile

Opinion:
The comparison table should resolve edge-case doubts, not drive the primary choice.
If users need the table to understand the plans at all, the cards have failed.

### EnterpriseRail
Visual role:
- separate lane for complex buying conversations
- lower visual aggression than the recommended self-serve card, but higher credibility than a footer CTA

Contains:
- compact enterprise icon or emblem
- enterprise headline
- one supporting sentence
- 4-item capability strip
- `Talk to sales` CTA
- optional `Download security overview` if that asset exists later

Rules:
- keep it in one band
- do not convert enterprise into a fourth equal card
- do not add a full form here; this CTA should route to Contact Sales

### FAQAccordion
Rules:
- max 6 items
- each answer under 90 words
- answers must resolve a buying decision, not teach the product
- accordion default closed except maybe first item if analytics support that

## Button Inventory
### Primary buttons
- `Start with Free`
- `Choose Pro`
- `Choose Studio`

### Secondary buttons
- `Talk to Sales`
- `Compare plans`
- `Expand more rows`

### Button rules
- only one dominant button treatment per card
- secondary links stay visually subordinate to the main purchase path
- enterprise CTA cannot visually outrank the recommended self-serve CTA unless the whole page is entered from enterprise intent

## Microinteractions
- billing cycle toggle updates price, cadence line and savings pill with no layout reflow beyond text swap
- recommended card has slightly stronger hover lift than the others, but no bouncing or glow pulse
- comparison table row hover highlights the active row across columns for scanability
- on mobile, the plan cards can snap horizontally if needed, but the default should still prefer vertical reading clarity
- if checkout is unavailable, the affected CTA swaps to a clear fallback label rather than failing after click

## Cross-Component Behavior
- the billing cycle toggle drives both plan cards and comparison table in one state model
- selecting a plan card CTA should preserve the current billing cycle into checkout
- if checkout is unavailable for a plan, the card CTA becomes a fallback route while the rest of the page stays stable
- enterprise rail should reflect the same product vocabulary as the plan cards; governance wording must not suddenly shift tone

## States
### Normal pricing
- all plans available
- one recommended tier
- comparison collapsed to key rows

### Checkout unavailable
- self-serve CTA becomes `Talk to Sales` or `Request access`
- clear reason line under CTA
- no broken optimistic flow

### Annual discount view
- yearly toggle active
- prices and savings update in place
- note clarifies billing cadence

### Near-enterprise intent
- optional page variant where enterprise rail is promoted higher due to source context
- self-serve cards remain available but visually secondary

## Accessibility and Content Rules
- prices, plan names and CTA labels must remain readable at 200 percent zoom without clipping
- recommendation cannot rely on color only; use badge, border weight and label
- annual savings language must not be deceptive; if there is no true savings calculation, omit the pill
- all comparison data needs equivalent mobile representation

## Figma Frame Requirements
- Pricing desktop monthly default
- Pricing desktop yearly default
- Pricing desktop with checkout unavailable on one plan
- Pricing mobile stacked cards
- Pricing mobile comparison state
- Pricing enterprise-intent variant
