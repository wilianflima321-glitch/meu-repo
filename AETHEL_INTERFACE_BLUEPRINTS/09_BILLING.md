# 09_BILLING
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Governance

## Mission
Help the user understand plan, usage, invoices and upgrade options without friction.

## Critical Opinion
### What this page should be
- a calm control surface for money and limits
- operational, not promotional
- clear enough that the user can resolve plan and payment questions without support

### What this page should not be
- a marketing page inside the account
- a provider-debug screen
- a wall of billing jargon and backend detail

## Primary CTA
- `Upgrade Plan`

## Layout Anatomy
### Header
- plan name
- renewal state
- one-line summary of usage health
- manage subscription action

### Main grid
#### Left column
- current plan card
- usage meters
- AI usage breakdown
- preview or runtime usage if relevant

#### Right column
- upgrade or downgrade rail
- next bill info
- billing contact

### Secondary section
- invoices table
- payment method
- billing history

## Detailed Component Specs
### CurrentPlanCard
Contains:
- plan name
- renewal date or state
- one-line plan summary
- primary usage metric
- manage action

Opinion:
This card should make the user feel grounded immediately.
It is the page anchor and should answer "what plan am I on and am I safe?" at a glance.

### UsageBarGroup
Contains grouped bars for:
- AI usage
- project/workspace usage if relevant
- preview/runtime usage if billable

Rule:
- warning thresholds should be visible before hard failure
- bars must use labels and numbers, not color alone
- percent and absolute values should both be available when useful

### PlanComparisonRail
Contains:
- current plan emphasis
- next plan option
- enterprise or custom option if relevant
- one CTA per option

Opinion:
This rail should support the current-plan card, not compete with it.
If the upsell section is louder than the current-plan state, the page becomes salesy.

### InvoicesTable
Columns:
- invoice id or period
- amount
- date
- status
- download action

Opinion:
The table must be compact and audit-friendly, not glossy.
It should feel closer to a finance tool than to a marketing card.

### PaymentMethodCard
Contains:
- masked payment method
- billing contact if relevant
- update action
- failure warning only when applicable

### BillingIssueBanner
Contains:
- issue title
- one sentence consequence
- one primary recovery action
- one optional support action

Rule:
- only show when relevant
- this banner belongs above the grid, but below the page header

## Interactions Between Components
- upgrade action should update nearby plan context, not throw the user into a disconnected flow without context
- payment issue banners should point to exactly one next step
- clicking a usage warning should scroll or focus the relevant usage group
- invoice download stays in row context and should not open a detached manager

## Button Inventory
- `Upgrade Plan`
- `Manage Subscription`
- `Download Invoice`
- `Update Payment Method`
- `Contact Sales`

## Microinteractions
- usage bars animate on first load only
- nearing-limit warnings gain emphasis progressively, not suddenly
- failed payment state appears as a focused banner inside billing only
- invoice rows reveal download action on hover but remain keyboard accessible

## States
### Healthy billing
- current plan card leads
- usage stays visible but calm

### Near limit
- usage bars and one compact warning callout rise in emphasis

### Payment issue
- focused issue banner appears first
- next bill card reflects risk state

### Checkout unavailable
- self-serve upgrade CTAs downgrade gracefully to sales/support path

### No invoices yet
- invoices table becomes an empty state with explanation and next milestone

## What To Avoid
- public pricing language duplicated inside account billing
- raw provider or webhook errors as primary content
- making invoices, payment method, and plan state compete equally in the first viewport

## Figma Frame Requirements
- Billing default
- Billing nearing limit warning
- Billing payment issue
- Billing invoices view


## Layout Grid
- max width: `1280 px`
- header full width
- main content split: 8/4 desktop, stacked tablet/mobile
- invoices section full width below the main grid

## Exact Component Geometry
### CurrentPlanCard
- min height: `220 px`
- internal padding: `24 px`
- CTA group pinned to lower-right on desktop

### UsageBarGroup
- each bar block min height: `88 px`
- bar thickness: `10 px`
- warning marker visible at threshold points

### InvoicesTable
- row height: `48-52 px`
- sticky header on desktop if table scrolls

### PaymentMethodCard
- compact card, not hero card
- internal padding: `18-20 px`

## CurrentPlanCard Detailed Order
1. current plan name
2. renewal date/state
3. one-line plan summary
4. primary usage headline
5. support or billing contact line
6. primary action cluster

## UsageBarGroup Behavior
- each usage block shows current value, limit, percentage, and threshold state
- thresholds should use at least two warning levels before hard stop
- clicking the block may reveal detailed breakdown inline or via adjacent panel

## InvoicesTable Detailed Columns
- period or invoice id
- amount
- issue date
- status
- payment state if relevant
- download action

## Payment and Issue Handling
- payment issue banner always appears above the main grid and below header
- update-payment action should return the user to Billing with resolved context visible
- no raw provider/webhook language should leak into the interface copy

## Responsive Rules
### Desktop
- current plan and usage stay on the left as the anchor
- upgrade and payment support stay on the right

### Tablet
- right rail collapses below current plan block
- usage bars remain above invoices

### Mobile
- current plan card first
- usage bars stacked
- invoices convert to cards or simplified list
- issue banner remains first if payment is blocked
