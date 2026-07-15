# 11_PROFILE_TEAM
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Governance

## Mission
Make identity, collaboration and permissions clear for individuals and teams.
This surface should tell the user who is in the workspace, what they can do, what seats are in use, and what collaboration actions are blocked or available.

## Critical Opinion
### What this page should be
- the people and roles surface
- a clear bridge between personal identity and workspace collaboration
- a place where role changes feel controlled and auditable

### What this page should not be
- hidden as an afterthought inside generic settings tabs
- mixed with billing operations, usage analytics or telemetry noise
- an admin spreadsheet without identity context

### Current product risk this page must correct
The repo currently spreads identity, settings and workspace management concerns across multiple areas.
This page must consolidate the human side of governance:
- who people are
- what access they have
- what seat or invite state they are in
- what they touched recently

## Primary CTA
- `Invite member`
- `Save profile`

## Secondary CTA
- `Change role`
- `Resend invite`
- `Remove member`

## Layout Grid
- max width: 1280 px
- top identity area: 2-column layout on desktop, stacked on tablet/mobile
- team and permissions area: 8/4 split on desktop
- activity area below in full-width section

## Information Hierarchy
1. personal or workspace identity summary
2. member list and invite flow
3. role and permission model
4. recent activity and contribution trail

## Layout Anatomy
### Section 1: Identity Header
Contains:
- avatar
- display name
- workspace name or team label
- current role badge
- linked account indicators
- primary action cluster

Why:
The page should immediately answer whether the user is looking at personal profile settings or team-level membership management.

### Section 2: Team Management
Contains:
- seat summary
- member table
- pending invites
- inline invite panel

Why:
Membership operations belong together. The user should not bounce between separate pages for invites, active members and seat awareness.

### Section 3: Permissions
Contains:
- role matrix or permission summary
- scoped access explanations
- warning treatment for sensitive roles

Why:
Role changes are high-trust actions. They need visible consequences before confirmation.

### Section 4: Activity
Contains:
- recent contributions
- approvals handled
- projects involved
- last active signals

Why:
This gives role decisions operational context. A row of names without activity context is not enough for real team management.

## Component Tree
### IdentityHeader
- AvatarBlock
- IdentityTextGroup
- RoleBadge
- LinkedAccountsRow
- PrimaryActionGroup

### TeamSummaryBar
- SeatsUsedStat
- SeatsAvailableStat
- PendingInvitesStat
- RoleDistributionStat

### MemberTable
- MemberRow
- MemberIdentityCell
- RoleCell
- SeatCell
- LastActiveCell
- AccessScopeCell
- RowActionMenu

### InvitePanel
- EmailInput
- RoleSelector
- ScopeSelector if needed
- InviteButton
- PendingInviteList

### RoleMatrix
- RoleColumn
- PermissionRow
- ScopeNote
- SensitiveActionNote

### ActivityPanel
- ActivityList
- ContributionCard
- ApprovalHistoryList
- ProjectPillRow

## Detailed Component Specs
### IdentityHeader
Exact order:
1. avatar block
2. display name and handle line
3. workspace and role line
4. linked accounts row
5. primary actions

Rules:
- avatar and name must feel personal, not purely tabular
- role badge should be explicit and visually distinct from plan or seat labels
- linked accounts are a support signal, not the headline

Opinion:
The user should feel this page is about people first, control second. If it opens like a permissions spreadsheet, trust drops.

### TeamSummaryBar
Contains compact stats:
- seats used
- seats remaining
- pending invites
- admins or elevated roles count

Rules:
- one-line stat cards or chips, not giant dashboard widgets
- this bar should support the member table, not dominate the page
- warnings such as `seat limit reached` should anchor here first

### MemberTable
Columns:
- member identity
- role
- seat type or plan relevance if useful
- access scope
- last active
- row actions

Row behavior:
- avatar + name + email grouped in one identity cell
- row hover reveals actions but actions remain keyboard accessible at all times
- clicking the row can open a side sheet with richer detail if implemented later

Opinion:
This table should feel like a high-trust admin surface, not a CRM.
Names and roles are the anchors. Metrics stay secondary.

### MemberRow
Subcomponents:
- Avatar
- Name
- Email
- RoleBadge
- SeatBadge
- ScopePills
- LastActiveTimestamp
- ActionMenuButton

Micro rules:
- role badge color and icon cannot be confused with seat or status badges
- last active should be relative plus exact-on-hover pattern if implemented
- destructive actions live in the menu with confirmation, never inline as equal CTAs

### InvitePanel
Contains:
- email input
- role selector
- optional access scope selector
- invite CTA
- pending invite list under the form

Rules:
- this panel should sit adjacent to the member table, not hidden behind a modal by default
- the role selector must surface consequences in short helper copy
- pending invites should be visible where new invites are created so the user does not lose track

Opinion:
Invite and membership actions should feel like one continuous system. Splitting them into separate pages is needless friction.

### RoleMatrix
Purpose:
- show what each role can do before changes are made

Rows should cover:
- workbench editing
- approvals
- deploy or publish
- billing access
- provider management
- admin operations
- audit visibility

Rules:
- keep the matrix concise and scannable
- group permissions by workflow area rather than long alphabetic lists
- sensitive permissions should carry a short note, not a buried tooltip only

### ActivityPanel
Contains:
- recent contribution list
- approvals handled
- projects involved
- optional short trend note if useful

Rules:
- this panel should help answer whether a member is active and in which projects
- avoid vanity stats with no action value
- recent activity must remain secondary to membership management itself

## Button Inventory
### Primary buttons
- `Save profile`
- `Invite member`

### Secondary buttons
- `Change role`
- `Resend invite`
- `Remove member`
- `Copy invite link` if relevant later

### Rules
- `Invite member` dominates in team context
- `Save profile` dominates in solo or personal context
- role changes and destructive actions must be visually subordinate and confirmed

## Microinteractions
- member row actions appear on hover but remain reachable by keyboard focus
- invite form validates email inline before submit
- selecting a role updates helper text immediately with scope impact
- role change confirmation modal or drawer must summarize resulting capabilities before final confirm
- seat-limit warning should appear inline near invite CTA before the user hits a hard error

## Cross-Component Behavior
- changing a role updates the role matrix emphasis and the member row badge simultaneously
- invite creation inserts the pending invite directly below without page reload
- seat summary and invite panel must stay in sync after invite, cancel or remove actions
- activity panel can filter to the selected member if the table supports row selection later

## States
### Solo user
- profile-first layout
- team table minimized or absent
- collaboration language reduced

### Team workspace
- full member table visible
- invite panel visible
- role matrix visible

### Invite pending
- pending invite list visible
- resend and revoke actions available

### Seat limit reached
- warning in TeamSummaryBar and InvitePanel
- invite CTA replaced or disabled with clear next step

### Sensitive role change
- confirmation state shows impact summary
- optional audit note visible

## Accessibility and Content Rules
- member identity must not rely on avatar alone
- role differences cannot rely on color only
- action menus need clear labels for assistive tech
- destructive operations require clear confirmation copy and focus management
- on mobile, row actions should convert to a bottom sheet instead of cramped inline buttons

## Figma Frame Requirements
- Profile solo mode
- Team mode with member table
- Invite member state
- Seat limit warning state
- Role change confirmation state
- Mobile team management state
