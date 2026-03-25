# 13_ADMIN_MONITORING
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Governance/Admin

## Mission
Give operators one serious place to see health, usage, payments, AI runs and audit evidence.

## Critical Opinion
### What this page should be
- dense
- operational
- audit-friendly
- structurally coherent across monitoring, AI, users, payments and logs

### What this page should not be
- a flashy dashboard
- a split brain between monitoring, AI, payments and audit tools
- a copy of the user-facing billing UI with admin labels on top

## Primary CTA
- context-specific, usually `Inspect`, `Export`, or `Resolve`

## Information Architecture
### System health
- services
- error rates
- latency
- active incidents

### AI monitor
- runs
- agents
- model usage
- costs
- approvals
- failure reasons

### Payments
- subscriptions
- MRR trend
- failed payments
- refunds or disputes if relevant

### Users and workspaces
- user list
- workspace status
- plan
- activity level

### Audit logs
- approvals
- admin actions
- security-sensitive changes

## Detailed Component Specs
### AdminSidebar
Grouped nav only:
- Overview
- Monitoring
- AI Monitor
- Users
- Payments
- Audit Logs

Rule:
- stable ordering
- no whimsical icons or decorative category names
- this nav should feel like an operational console

### MonitoringHeader
Contains:
- environment label
- active alert count
- export/filter actions
- time range control

Opinion:
This header must orient the operator instantly.
It should feel denser and more functional than Studio surfaces.

### MetricRow
Should prioritize:
- label
- current value
- delta or state
- drilldown affordance

Opinion:
Metrics are useful only when tied to action. Pure vanity cards should not exist in admin.

### AIRunTable
Columns:
- run id or title
- project/workspace
- status
- agent summary
- cost
- duration
- action

Rule:
- active and failed runs should be easier to scan than completed runs
- cost and failure visibility matter more than decorative row styling

### CostBreakdownCard
Contains:
- total spend
- model family distribution
- high-cost run highlights
- drilldown action

### UserWorkspaceTable
Columns:
- workspace
- owner
- plan
- health or usage flag
- last active
- inspect action

### AuditLogTimeline
Each row contains:
- actor
- action
- target
- timestamp
- risk or sensitivity badge
- inspect action

Opinion:
Audit logs should feel chronological and factual, not card-heavy and decorative.

### ExportDrawer
Contains:
- export scope
- time range
- file format
- primary export action

## Interactions Between Components
- selecting an alert or metric row should focus the relevant table or timeline below when possible
- replay or inspect actions open contextual drawers, not detached tools, unless full-detail view is necessary
- filters and time range controls persist while moving between admin tabs in one session
- user/workspace drilldowns should preserve the admin context when returning

## Button Inventory
- `Inspect`
- `Export`
- `Resolve`
- `Replay Run`
- `Filter`
- `Open Workspace`

## Microinteractions
- metric rows can drill down without full navigation when appropriate
- filters should be sticky across tabs during one session
- replay or inspect actions open contextual drawers, not separate tools when possible
- alert state changes should be visible but not animated in a distracting way

## States
### Nominal
- overview metrics and tables visible
- no incident banner

### Partial telemetry
- affected sections show scoped warnings, not a full-page failure state

### Missing provider data
- show exactly which provider or feed is missing
- unaffected sections remain usable

### Incident mode
- incident banner appears above the main content
- related tables and logs gain priority

## What To Avoid
- decorative visuals stealing attention from tables and timelines
- splitting related admin tasks across too many pages
- turning admin into a generic analytics dashboard without action paths

## Figma Frame Requirements
- Admin monitoring overview
- Admin AI monitor
- Admin payments
- Admin users/workspaces
- Admin audit logs


## Layout Grid
- max width: `1600 px`
- persistent admin sidebar on desktop
- content area split into header, summary rows, and dense tables/timelines
- tablet may collapse sidebar to icon rail plus overlay nav

## Exact Component Geometry
### AdminSidebar
- width: `248 px`
- grouped nav with compact section labels
- no nested navigation deeper than one expandable level by default

### MonitoringHeader
- height target: `72 px`
- left cluster: environment, title, active alerts
- right cluster: time range, filters, export actions

### AIRunTable
- default row height: `48 px`
- expanded detail row allowed below selected run

### AuditLogTimeline
- each row min height: `44 px`
- chronological list, not oversized cards

## Section-Specific Rules
### Monitoring overview
- summary metrics must point into tables, not terminate the workflow
- no vanity charts without drilldown value

### AI monitor
- failure reason and cost need stronger prominence than decorative run metadata
- active runs should pin above completed runs

### Users/workspaces
- table should prioritize risk and plan context over generic profile fields
- inspect action should open a contextual drawer, not hard-navigate away immediately

### Audit logs
- actor, action, target and timestamp are mandatory first-order fields
- risk badge must be compact but explicit

## Responsive Rules
### Desktop
- sidebar persistent
- tables remain primary
- drawers open over content without full route changes

### Tablet
- sidebar collapses
- summary metrics may wrap into two rows
- dense tables can horizontally scroll only as last resort

### Mobile
- admin is inspection-first, not full-management parity
- only key summary, alerts and scoped table rows should be surfaced
- heavy export and bulk workflows can be deferred to desktop
