# 12_STATUS
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Governance/Public

## Mission
Create trust through clear health, incident and maintenance visibility.
This page should answer: what is healthy, what is degraded, when was it updated, and where do I go for detail?

## Critical Opinion
### What this page should be
- factual
- time-aware
- trustworthy under both calm and incident conditions
- equally readable by prospects and existing users

### What this page should not be
- optimistic marketing with status colors
- a vague uptime scoreboard with no timestamps
- an incident page that hides degraded states behind euphemisms

### Current product risk this page must correct
Aethel talks a lot about readiness. Status must be the place where operational truth lives plainly.
It should not borrow the tone of marketing or dashboard celebration.

## Primary CTA
- `Subscribe to updates`

## Secondary CTA
- `View incident`
- `View history`

## Benchmark Alignment
### From status pages that build trust
Absorb:
- explicit state labels
- timestamps on every meaningful update
- clear difference between ongoing issue and historical incident
- factual summaries before detail prose

### What to avoid copying
- empty `all systems operational` pages with no update time
- hidden maintenance notices
- vague issue language that avoids naming affected systems

## Layout Grid
- max width: 1120 px
- compact header, full-width service matrix, timeline below
- incident detail cards maintain narrow readable text width
- mobile stacks every row into self-contained cards

## Information Hierarchy
1. overall system state
2. service-by-service truth
3. ongoing or recent incidents
4. planned maintenance
5. historical access and subscription action

## Layout Anatomy
### Section 1: Overall Status Header
Contains:
- system state badge
- plain-language summary
- last updated timestamp
- subscribe CTA

Why:
Users need the headline truth immediately. If everything is healthy, they still need to know when that truth was last refreshed.

### Section 2: Service Health Matrix
Services shown:
- API
- AI
- Preview
- Billing
- Deploy
- Collaboration

Why:
These map to user-visible product responsibilities, not internal subsystem names.

### Section 3: Incident Timeline
Contains:
- active incident card if relevant
- recent incidents
- resolved incident summaries

Why:
The page needs one place where the timeline of issues is undeniable and scannable.

### Section 4: Maintenance
Contains:
- planned maintenance windows
- affected domains
- expected impact

Why:
Scheduled work should not be hidden in support channels.

## Component Tree
### OverallStatusHeader
- SystemStateBadge
- SummaryLine
- LastUpdatedLine
- SubscribeButton

### ServiceHealthMatrix
- ServiceHealthRow xN
- ExpandDetailPanel
- LegendRow if needed

### IncidentTimeline
- IncidentCard xN
- IncidentStepList
- IncidentDetailLink

### MaintenanceCard
- MaintenanceWindow
- AffectedDomains
- ExpectedImpact
- DetailLink

## Detailed Component Specs
### OverallStatusHeader
Exact order:
1. state badge
2. summary line
3. last updated line
4. CTA row

Rules:
- summary line should say what is happening in plain language
- last updated line must be visible even when all healthy
- if degraded, the incident CTA should sit adjacent to the summary and not force the user to scroll

Opinion:
This header should feel restrained and operational. It must never sound proud of being healthy.

### ServiceHealthMatrix
Each row contains:
- service name
- current state label
- state icon
- latest update timestamp
- short impact note
- expand affordance

Expanded row contains:
- more specific issue or health explanation
- affected capabilities
- incident link if one exists

Rules:
- rows must remain scannable without expansion
- state labels must be explicit: healthy, degraded, partial outage, major outage
- icons and labels must work without color alone

Opinion:
The matrix is the trust backbone of the page. It has to be simpler and more honest than the rest of the product.

### ServiceHealthRow
Visual rules:
- service name left-aligned and strong
- state label visually anchored in the middle band
- timestamp and expand affordance right-aligned
- expanded panel should not push the whole page too violently; use accordion discipline

### IncidentTimeline
Each incident card contains:
- title
- time range
- current status
- affected domains
- concise summary
- detail link

Optional expanded detail:
- timeline of updates
- mitigation notes
- recovery confirmation

Rules:
- active incident appears first with the strongest frame
- resolved incidents become lighter but still readable
- the timeline must use time progression clearly, not paragraph walls

Opinion:
Incidents should be scannable first, readable second. Long prose is the enemy when someone is checking if the platform is safe to use.

### MaintenanceCard
Contains:
- maintenance title
- date and time window
- affected services
- expected impact level
- learn more link or note

Rules:
- maintenance cards should look different from incidents but use the same language precision
- if no maintenance is scheduled, state that plainly and keep the area compact

## Button Inventory
### Primary button
- `Subscribe to updates`

### Secondary buttons
- `View incident`
- `View history`
- `Read maintenance details`

### Rules
- the page should not have many actions
- actions should route to deeper factual detail, not marketing journeys

## Microinteractions
- service rows expand inline without losing the user's place
- timestamps should support exact values on hover or secondary display if implemented
- incident cards can collapse older update items behind `Show more updates`
- subscribe action should confirm quietly in place, not throw a large modal unless required

## Cross-Component Behavior
- if a service row is degraded and tied to an active incident, expansion should deep-link to that incident card
- overall header summary must reflect the worst active state in the matrix
- maintenance cards should visually coexist with healthy states without being mistaken for incidents
- historical incident access should not displace current active issue visibility

## States
### All healthy
- healthy-coded system badge plus explicit timestamp
- no active incident card
- service matrix still fully visible

### Degraded service
- overall header reflects degradation
- affected service row highlighted
- incident card visible above historical list

### Partial outage
- stronger issue treatment
- multiple affected rows visible
- subscribe CTA still available but subordinate to issue information

### Major outage
- high-contrast alert treatment
- active incident dominates timeline area
- service matrix remains visible for scope clarity

### Planned maintenance only
- overall healthy
- maintenance section visible with scheduled impact

## Accessibility and Content Rules
- state cannot rely on color alone
- timestamps should use clear readable formats and locale-aware language when implemented
- incident summaries should avoid euphemisms like `experiencing some issues`
- the mobile layout must keep service, status and timestamp visible without horizontal scrolling

## Figma Frame Requirements
- Status all healthy
- Status degraded service
- Status major incident
- Status incident detail expanded
- Status planned maintenance state
- Status mobile

## Factual Language Contract
Status communication must stay factual and time-aware.

Rules:
- prefer exact state words: `healthy`, `degraded`, `partial outage`, `major outage`
- never soften operational truth with optimistic marketing language
- every meaningful state must have a timestamp or time range near it
- incident and maintenance language must map clearly to affected services and user impact
