# 10_SETTINGS
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Governance

## Mission
Give the user control over providers, models, security and workspace preferences without becoming a technical maze.

## Primary CTA
- `Save Changes`

## Critical Opinion
### What this page should be
- structured
- grouped by mental model
- safe for advanced control

### What this page should not be
- a random stack of technical forms
- a second onboarding flow

## Section Model
### Providers
- provider cards
- connected status
- test connection action
- last successful check

### Models
- default routing by task type
- best / balanced / budget lanes
- advanced overrides hidden by disclosure

### Security
- API keys
- sessions
- auth providers
- revocation tools

### Workspace Preferences
- preview defaults
- editor defaults
- AI behavior defaults
- notifications and alerts

### Danger Zone
- irreversible actions with strong separation

## Component Tree
- SettingsSection
- ProviderCard
- ModelRoutingTable
- SecurityPanel
- PreferenceGroup
- DangerZoneCard

## Button Inventory
- `Save Changes`
- `Test Connection`
- `Add Provider`
- `Rotate Key`
- `Delete Workspace`

## Microinteractions
- save bar appears only when there are unsaved changes
- provider test results appear inline in the relevant card
- danger actions require typed confirmation, not simple modal confirms

## States
- default loaded
- provider error
- partial configuration
- save success
- save error

## What To Avoid
- onboarding-style wizard in settings
- raw env var names as primary UX labels

## Detailed Component Specs
### Providers section
Card anatomy:
- provider identity
- connection state
- last check
- primary action
- advanced disclosure

Rule:
- provider errors stay local to the card
- successful connection tests should not create noisy global toasts unless necessary

### ProviderCard
Contains:
- provider name
- connected state
- last test result
- primary action
- advanced disclosure

Opinion:
Provider cards should feel trustworthy and diagnostic, but not like raw infrastructure panels.

### Models section
Rows map task families to default models.
Minimum task families:
- chat
- inline edit
- agent run
- review
- background or budget tasks

### ModelRoutingTable
Opinion:
This table is where power users feel control.
It must be structured and legible, not like raw config.

### SecurityPanel
Contains:
- auth providers
- API key status
- session controls
- revoke actions

Rule:
- dangerous actions require explicit confirmation
- session and key management should feel more serious than general preferences

### PreferenceGroup
Contains:
- section title
- concise explanation
- compact form rows
- reset-to-default action only where justified

Opinion:
Preferences should be grouped by user goal, not backend subsystem.

### DangerZoneCard
Contains:
- risk label
- action description
- irreversible warning
- typed confirmation if needed

Opinion:
This card must feel visually isolated from normal preferences.

## Interactions Between Components
- testing a provider updates only that card
- saving settings should not reset hidden advanced panels unexpectedly
- danger zone actions must stay visually and spatially separated from normal save actions
- changing model routing should preview impact on task families before save if possible

## Figma Frame Requirements
- Settings default with providers
- Settings models routing
- Settings security
- Settings danger zone

## Layout Grid
- max width: `1320 px`
- section stack with persistent save bar pattern
- two-column layout allowed only inside sections where comparison helps, not as a page-wide split by default

## Save Bar Contract
- appears only when there are unsaved changes
- pinned bottom or top depending on viewport, but always visible
- contains: unsaved changes label, `Discard`, `Save Changes`
- save success should confirm locally and then clear the bar without large celebratory toast

## Providers Section Detailed Anatomy
### ProviderCard exact order
1. provider identity row
2. connection state and last check line
3. primary action row
4. advanced disclosure
5. scoped error or test result area

Rules:
- errors stay inside the card
- success checks appear inline and fade to a quiet state
- advanced disclosure should not push other cards erratically when opened

## Models Section Detailed Anatomy
### ModelRoutingTable columns
- task family
- default model
- rationale or lane label
- override status
- edit action

Task families minimum:
- chat
- inline edit
- agent run
- review
- background or budget tasks

## Security Section Detailed Anatomy
- auth providers block
- API key state block
- active sessions block
- revocation actions block

Rules:
- dangerous actions require typed confirmation or an explicit second step
- session controls should display device/time context where possible

## Responsive Rules
### Desktop
- provider cards can sit in two-column layout
- model table remains tabular

### Tablet
- provider cards collapse to single column
- model table may become stacked rows if width is tight

### Mobile
- section navigation can become anchored chips or accordion
- save bar remains sticky
- danger zone stays visually isolated at the bottom
